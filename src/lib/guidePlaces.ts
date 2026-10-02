/**
 * guidePlaces - the editorial layer for "Things to Do" guides.
 *
 * It is the sibling of guideVenues (dining) but works across every curated
 * directory category - wildlife and nature, museums and galleries, shopping,
 * nightlife - so a "Top Things to Do in Nairobi" guide is built from the SAME
 * real records the directory is built from, grouped by theme and by area.
 *
 * Like guideVenues it never invents data: every field is optional and a missing
 * field is omitted from the UI rather than faked. All content lives in the
 * `amenities` table (is_guide_curated = true) and is editable from the CMS.
 */

import type { Amenity } from '@/lib/amenities';
import { categoryLabel, subcategoryLabel, normalizeUrl } from '@/lib/amenities';
import {
  toGuideVenue,
  type GuideVenue,
} from '@/lib/guideVenues';

export interface GuidePlace extends GuideVenue {
  /** Broad directory category slug (recreation, art, shopping_centres...). */
  category: string | null;
  /** Human display label for the category ("Nature & Outdoors"). */
  categoryLabel: string;
  /** Raw subcategory key (cafe, gym, restaurant...) for precise matching. */
  subcategory: string | null;
  /** Resolved icon (explicit > subcategory > category). */
  icon: string;
  /** Subcategory label when present ("Art Gallery", "Museum"). */
  subcategoryLabel: string | null;
}

/** Map a raw amenity row into the shape the things-to-do components render. */
export function toGuidePlace(a: Amenity): GuidePlace {
  const base = toGuideVenue(a);
  return {
    ...base,
    category: a.category,
    categoryLabel: categoryLabel(a.category),
    subcategory: a.subcategory || null,
    icon: a.icon || '',
    subcategoryLabel: a.subcategory ? subcategoryLabel(a.subcategory) : null,
  };
}

// ─────────────────────────────────────────────────────────────
// Themes - the reader's questions ("wildlife?", "culture?", "with kids?"),
// each backed by the real best_for tags already stored on every record.
// ─────────────────────────────────────────────────────────────
export interface GuideTheme {
  key: string;
  label: string;
  short: string;
  icon: string;
  match: (p: GuidePlace) => boolean;
}

const hasTag = (p: GuidePlace, tag: string): boolean =>
  p.bestFor.some((b) => b.toLowerCase() === tag);

export const GUIDE_THEMES: GuideTheme[] = [
  {
    key: 'wildlife',
    label: 'Wildlife & Safari',
    short: 'Wildlife',
    icon: 'ri-footprint-line',
    match: (p) => hasTag(p, 'wildlife'),
  },
  {
    key: 'culture',
    label: 'Culture & History',
    short: 'Culture',
    icon: 'ri-book-2-line',
    match: (p) => hasTag(p, 'culture') || hasTag(p, 'history'),
  },
  {
    key: 'nature',
    label: 'Nature & Outdoors',
    short: 'Nature',
    icon: 'ri-leaf-line',
    match: (p) => hasTag(p, 'nature') || hasTag(p, 'outdoors') || hasTag(p, 'outdoor'),
  },
  {
    key: 'art',
    label: 'Art & Galleries',
    short: 'Art',
    icon: 'ri-palette-line',
    match: (p) => hasTag(p, 'art') || hasTag(p, 'galleries'),
  },
  {
    key: 'family',
    label: 'Best for Families',
    short: 'Family',
    icon: 'ri-group-line',
    match: (p) => hasTag(p, 'family'),
  },
  {
    key: 'shopping',
    label: 'Shopping & Rainy Days',
    short: 'Shopping',
    icon: 'ri-shopping-bag-line',
    match: (p) => hasTag(p, 'shopping') || hasTag(p, 'rainy-day'),
  },
  {
    key: 'nightlife',
    label: 'Nightlife & Drinks',
    short: 'Nightlife',
    icon: 'ri-moon-clear-line',
    match: (p) => hasTag(p, 'nightlife') || hasTag(p, 'drinks') || hasTag(p, 'cocktails'),
  },
];

export interface ThemeGroup extends GuideTheme {
  places: GuidePlace[];
}

function sortPlaces(list: GuidePlace[]): GuidePlace[] {
  return [...list].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** Theme groups that actually contain places - empty themes are dropped. */
export function groupPlacesByTheme(places: GuidePlace[]): ThemeGroup[] {
  return GUIDE_THEMES.map((t) => ({ ...t, places: sortPlaces(places.filter(t.match)) })).filter(
    (g) => g.places.length > 0,
  );
}

/** URLs are already normalised upstream; re-exported for component parity. */
export const placeWebsite = (p: GuidePlace): string | null => normalizeUrl(p.website);