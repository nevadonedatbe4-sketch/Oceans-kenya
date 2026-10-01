import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { smartTitleCase } from '@/lib/location';
import {
  SORTED_CATEGORIES,
  SUBCATEGORIES,
  type SubcategoryMeta,
} from '@/lib/amenities';

// A user-created category that isn't one of the built-in taxonomy keys.
export interface CustomCategory {
  /** Slug key stored in the DB and used as the amenity's `category` value. */
  key: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  subcategories: SubcategoryMeta[];
  /** Optional media shown for the category (image / alt text / gallery). */
  image?: string | null;
  alt_text?: string | null;
  gallery?: string[];
}

// ─────────────────────────────────────────────────────────────
// Storage: site_settings table, key = `amenity_custom_category_<slug>`
// value = JSON { label, icon, color, description, subcategories }
// ─────────────────────────────────────────────────────────────
type CustomRow = { key: string; value: string };

let cache: Record<string, string> = {};
let lastFetch = 0;
let inflight: Promise<Record<string, string>> | null = null;
const CACHE_TTL = 120000;

const PREFIX = 'amenity_custom_category_';

function parseCategory(key: string, value: string): CustomCategory | null {
  try {
    const raw = JSON.parse(value) as Partial<CustomCategory> & { subcategories?: SubcategoryMeta[] };
    if (!raw.label) return null;
    return {
      key: key.replace(PREFIX, ''),
      label: smartTitleCase(raw.label || '') || raw.label || '',
      icon: raw.icon || 'ri-list-settings-line',
      color: raw.color || '#6B4423',
      description: raw.description || '',
      subcategories: Array.isArray(raw.subcategories)
        ? raw.subcategories.map((s) => ({ ...s, label: smartTitleCase(s.label) || s.label }))
        : [],
      image: raw.image || null,
      alt_text: raw.alt_text || null,
      gallery: Array.isArray(raw.gallery) ? raw.gallery : [],
    };
  } catch {
    return null;
  }
}

function loadSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now - lastFetch < CACHE_TTL && Object.keys(cache).length > 0) {
    return Promise.resolve(cache);
  }
  if (inflight) return inflight;

  inflight = supabase
    .from('site_settings')
    .select('key, value')
    .like('key', `${PREFIX}%`)
    .then(({ data }) => {
      cache = {};
      (data as CustomRow[] | null)?.forEach((r) => {
        if (r.value) cache[r.key] = r.value;
      });
      lastFetch = Date.now();
      inflight = null;
      return cache;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });

  return inflight;
}

/** Slugs must be stable & URL-safe to work across every consumer. */
export function slugForLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'custom';
}

export function useCustomCategories() {
  const [raw, setRaw] = useState<Record<string, string>>(cache);

  useEffect(() => {
    loadSettings().then(setRaw).catch(() => {});
  }, []);

  const refresh = useCallback(() => {
    lastFetch = 0;
    cache = {};
    loadSettings().then(setRaw).catch(() => {});
  }, []);

  const categories = Object.keys(raw)
    .filter((k) => k.startsWith(PREFIX))
    .map((k) => parseCategory(k, raw[k]))
    .filter((c): c is CustomCategory => c !== null)
    .sort((a, b) => a.label.localeCompare(b.label));

  const allCategories: CustomCategory[] = [
    ...SORTED_CATEGORIES.map(
      (c) => ({ ...c, subcategories: SUBCATEGORIES[c.key] || [] }) as CustomCategory,
    ),
    ...categories,
  ].sort((a, b) => a.label.localeCompare(b.label));

  /** All subcategories (built-in + custom) keyed by category key. */
  const allSubcategories: Record<string, SubcategoryMeta[]> = {
    ...SUBCATEGORIES,
    ...categories.reduce<Record<string, SubcategoryMeta[]>>((acc, c) => {
      acc[c.key] = c.subcategories;
      return acc;
    }, {}),
  };

  const addCategory = useCallback(
    async (
      input: {
        label: string;
        icon: string;
        color: string;
        description: string;
        subcategories: SubcategoryMeta[];
        image?: string | null;
        alt_text?: string | null;
        gallery?: string[];
      },
    ) => {
      const key = slugForLabel(input.label);
      const value = JSON.stringify({
        label: input.label,
        icon: input.icon,
        color: input.color,
        description: input.description,
        subcategories: input.subcategories,
        image: input.image || null,
        alt_text: input.alt_text || null,
        gallery: input.gallery || [],
      });
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: `${PREFIX}${key}`, value }, { onConflict: 'key' });
      if (error) throw error;
      await refresh();
      return key;
    },
    [refresh],
  );

  const updateCategory = useCallback(
    async (
      key: string,
      input: {
        label: string;
        icon: string;
        color: string;
        description: string;
        subcategories: SubcategoryMeta[];
        image?: string | null;
        alt_text?: string | null;
        gallery?: string[];
      },
    ) => {
      const value = JSON.stringify(input);
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: `${PREFIX}${key}`, value }, { onConflict: 'key' });
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const deleteCategory = useCallback(
    async (key: string) => {
      const { error } = await supabase.from('site_settings').delete().eq('key', `${PREFIX}${key}`);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  return {
    categories,
    allCategories,
    allSubcategories,
    addCategory,
    updateCategory,
    deleteCategory,
    refresh,
  };
}