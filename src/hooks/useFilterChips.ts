import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/** The roles a chip can be shown to. 'public' = a signed-out visitor. */
export const CHIP_ROLES = ['public', 'agent', 'admin', 'super_admin'] as const;
export type ChipRole = (typeof CHIP_ROLES)[number];

export const CHIP_PAGES = ['buy', 'rent'] as const;
export type ChipPage = (typeof CHIP_PAGES)[number];

export interface FilterChip {
  id: string;
  /** Displayed label (independent of the internal filter key). */
  label: string;
  /** Internal filter, e.g. "beds=Studio", "type=Apartment", "search=furnished". */
  filterKey: string;
  /** Optional destination URL — when set, clicking navigates instead of filtering. */
  link: string;
  /** Roles that can see this chip. Empty = all roles. */
  roles: string[];
  /** Pages this chip appears on. */
  pages: string[];
  order: number;
  active: boolean;
  /** Optional Remix Icon class, e.g. "ri-home-line". */
  icon: string;
  /** Optional tooltip / help text. */
  tooltip: string;
}

const CONFIG_KEY = 'filter_chips_config';

// Seed values mirror the chips that ship with the listing pages. The database
// is the single source of truth once the Filter Chips editor is saved.
export const DEFAULT_FILTER_CHIPS: FilterChip[] = [
  { id: 'studio', label: 'Studio', filterKey: 'beds=Studio', link: '', roles: [...CHIP_ROLES], pages: [...CHIP_PAGES], order: 1, active: true, icon: '', tooltip: '' },
  { id: '1bed', label: '1 Bed', filterKey: 'beds=1+', link: '', roles: [...CHIP_ROLES], pages: [...CHIP_PAGES], order: 2, active: true, icon: '', tooltip: '' },
  { id: '2bed', label: '2 Bed', filterKey: 'beds=2+', link: '', roles: [...CHIP_ROLES], pages: [...CHIP_PAGES], order: 3, active: true, icon: '', tooltip: '' },
  { id: '3bed', label: '3 Bed', filterKey: 'beds=3+', link: '', roles: [...CHIP_ROLES], pages: [...CHIP_PAGES], order: 4, active: true, icon: '', tooltip: '' },
  { id: 'furnished', label: 'Furnished', filterKey: 'search=furnished', link: '', roles: [...CHIP_ROLES], pages: [...CHIP_PAGES], order: 5, active: true, icon: '', tooltip: '' },
  { id: 'petfriendly', label: 'Pet Friendly', filterKey: 'search=pet friendly', link: '', roles: [...CHIP_ROLES], pages: [...CHIP_PAGES], order: 6, active: true, icon: '', tooltip: '' },
  { id: 'parking', label: 'Parking', filterKey: 'search=parking', link: '', roles: [...CHIP_ROLES], pages: [...CHIP_PAGES], order: 7, active: true, icon: '', tooltip: '' },
];

let cache: FilterChip[] | null = null;
let inflight: Promise<FilterChip[]> | null = null;

function normaliseChip(raw: unknown, index: number): FilterChip | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const label = String(c.label || '').trim();
  const filterKey = String(c.filterKey || '').trim();
  const link = String(c.link || '').trim();
  if (!label && !filterKey && !link) return null;
  return {
    id: String(c.id || `chip_${index + 1}`),
    label,
    filterKey,
    link,
    roles: Array.isArray(c.roles) ? c.roles.map((r) => String(r)) : [...CHIP_ROLES],
    pages: Array.isArray(c.pages) ? c.pages.map((p) => String(p)) : [...CHIP_PAGES],
    order: Number.isFinite(Number(c.order)) ? Number(c.order) : index + 1,
    active: c.active !== false,
    icon: String(c.icon || '').trim(),
    tooltip: String(c.tooltip || '').trim(),
  };
}

async function loadChips(): Promise<FilterChip[]> {
  const { data } = await supabase.from('site_settings').select('value').eq('key', CONFIG_KEY).maybeSingle();
  const raw = (data as { value?: string } | null)?.value;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const chips = parsed.map(normaliseChip).filter((c): c is FilterChip => c !== null);
        if (chips.length) return chips;
      }
    } catch { /* keep defaults */ }
  }
  return DEFAULT_FILTER_CHIPS.map((c) => ({ ...c, roles: [...c.roles], pages: [...c.pages] }));
}

export function useFilterChips() {
  const [chips, setChips] = useState<FilterChip[]>(cache || DEFAULT_FILTER_CHIPS);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) { setChips(cache); setLoading(false); return; }
    if (!inflight) inflight = loadChips();
    inflight
      .then((result) => {
        cache = result;
        if (active) { setChips(result); setLoading(false); }
      })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { chips, loading };
}

export function invalidateFilterChipsCache() {
  cache = null;
  inflight = null;
}