/**
 * ecosystemBlocks - the per-article "ecosystem" layer.
 *
 * A guide no longer has to be a dead-end read. Editors attach one or more live
 * blocks (featured listings, featured developments, trusted service providers)
 * and each block renders REAL data from the same tables the rest of the site
 * uses - `listings`, grouped developments and the `amenities` directory.
 *
 * Config lives on `blog_posts.eco_blocks` as an ordered jsonb array, so a new
 * block type is one entry away and nothing is ever hard-coded per article.
 */

import { AMENITY_CATEGORIES } from '@/lib/amenities';

export type EcoBlockType = 'listings' | 'developments' | 'services';

export interface EcoBlockBase {
  type: EcoBlockType;
  enabled: boolean;
  heading: string;
  subheading: string;
}

export interface ListingsEcoBlock extends EcoBlockBase {
  type: 'listings';
  /** Areas to pull live sale listings from (empty = use the guide's areas). */
  areas: string[];
}

export interface DevelopmentsEcoBlock extends EcoBlockBase {
  type: 'developments';
  /** Areas to filter developments by (empty = use the guide's areas). */
  areas: string[];
  limit: number;
}

export interface ServicesEcoBlock extends EcoBlockBase {
  type: 'services';
  /** Amenity category slugs to draw providers from. */
  categories: string[];
  /** Optional finer filter - amenity subcategory keys. */
  subcategories: string[];
  /** Optional area filter (empty = every area). */
  areas: string[];
  limit: number;
}

export type EcoBlock = ListingsEcoBlock | DevelopmentsEcoBlock | ServicesEcoBlock;

export const ECO_BLOCK_TYPES: { type: EcoBlockType; label: string; description: string; icon: string }[] = [
  { type: 'listings', label: 'Featured listings', description: 'Live homes for sale in the areas you choose.', icon: 'ri-home-4-line' },
  { type: 'developments', label: 'Featured developments', description: 'New and off-plan projects worth a look.', icon: 'ri-building-2-line' },
  { type: 'services', label: 'Service providers', description: 'Vetted services - moving, legal, schools, health, banking.', icon: 'ri-customer-service-2-line' },
];

export const DEFAULT_BLOCK_HEADINGS: Record<EcoBlockType, { heading: string; subheading: string }> = {
  listings: {
    heading: 'Featured homes for sale',
    subheading: 'Live, verified listings in the areas this guide covers.',
  },
  developments: {
    heading: 'Featured new developments',
    subheading: 'Off-plan and newly built projects worth a closer look.',
  },
  services: {
    heading: 'Trusted local services',
    subheading: 'Vetted providers for moving, legal, schooling, banking and settling in.',
  },
};

/**
 * When a services block is enabled but no categories are picked, fall back to
 * this solid "settling in" set so the block is never silently empty.
 */
export const DEFAULT_SERVICE_CATEGORIES: string[] = [
  'services',
  'business',
  'education',
  'health',
  'financial',
  'insurance',
  'utilities',
];

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((s) => String(s ?? '').trim()).filter(Boolean);
}

function toNum(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Build a fresh block of the given type with sensible defaults. */
export function createEcoBlock(type: EcoBlockType): EcoBlock {
  const d = DEFAULT_BLOCK_HEADINGS[type];
  if (type === 'listings') {
    return { type, enabled: true, heading: d.heading, subheading: d.subheading, areas: [] };
  }
  if (type === 'developments') {
    return { type, enabled: true, heading: d.heading, subheading: d.subheading, areas: [], limit: 3 };
  }
  return {
    type,
    enabled: true,
    heading: d.heading,
    subheading: d.subheading,
    categories: [],
    subcategories: [],
    areas: [],
    limit: 6,
  };
}

/**
 * Normalise whatever is stored in `blog_posts.eco_blocks` into a safe, typed
 * array. Unknown/malformed entries are dropped rather than crashing the page,
 * and every field falls back to its default.
 */
export function normalizeEcoBlocks(raw: unknown): EcoBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: EcoBlock[] = [];
  const seen = new Set<EcoBlockType>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const type = r.type as EcoBlockType;
    if (type !== 'listings' && type !== 'developments' && type !== 'services') continue;
    // One block of each type - keep the first occurrence.
    if (seen.has(type)) continue;
    seen.add(type);

    const d = DEFAULT_BLOCK_HEADINGS[type];
    const base = {
      type,
      enabled: r.enabled !== false,
      heading: typeof r.heading === 'string' && r.heading.trim() ? r.heading : d.heading,
      subheading: typeof r.subheading === 'string' && r.subheading.trim() ? r.subheading : d.subheading,
    };

    if (type === 'listings') {
      out.push({ ...base, type, areas: toStringArray(r.areas) });
    } else if (type === 'developments') {
      out.push({ ...base, type, areas: toStringArray(r.areas), limit: toNum(r.limit, 3) });
    } else {
      out.push({
        ...base,
        type,
        categories: toStringArray(r.categories),
        subcategories: toStringArray(r.subcategories),
        areas: toStringArray(r.areas),
        limit: toNum(r.limit, 6),
      });
    }
  }
  return out;
}

/** Curated "service provider" presets surfaced as quick-add chips in the editor. */
export const SERVICE_PROVIDER_PRESETS: { label: string; description: string; categories: string[] }[] = [
  { label: 'Relocation & Home Services', description: 'Moving, storage, cleaning, security, maintenance', categories: ['services'] },
  { label: 'Legal, Accounting & HR', description: 'Lawyers, accountants, recruitment, consulting', categories: ['business'] },
  { label: 'Government & Immigration', description: 'Immigration, licensing, county offices', categories: ['utilities'] },
  { label: 'Schools & Education', description: 'International schools, nurseries, tutoring', categories: ['education'] },
  { label: 'Healthcare', description: 'Hospitals, clinics, pharmacies, diagnostics', categories: ['health'] },
  { label: 'Banking & Forex', description: 'Banks, ATMs, forex, money transfer', categories: ['financial'] },
  { label: 'Insurance', description: 'Health, home, motor and life cover', categories: ['insurance'] },
];

/** The amenity categories offered as toggles in the services block editor. */
export const SERVICE_CATEGORY_OPTIONS = AMENITY_CATEGORIES.map((c) => ({
  key: c.key as string,
  label: c.label,
  icon: c.icon,
}));