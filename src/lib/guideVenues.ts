/**
 * guideVenues - the editorial layer on top of the real `amenities` directory.
 *
 * A "guide venue" is a curated dining record (is_guide_curated = true) enriched
 * with a verified cuisine, an editorial description that explains WHY it belongs
 * in a guide, occasion tags, a price level, a source and a last-verified date.
 *
 * This module only shapes data - it never invents it. Every field is optional
 * and a missing field is simply omitted from the UI rather than faked. All the
 * content lives in the database and is editable from the Amenities console.
 */

import type { Amenity } from '@/lib/amenities';
import { amenityImage, amenityMapsUrl, normalizeUrl } from '@/lib/amenities';
import { areaNameBelongsTo } from '@/lib/locationRegistry';

export interface GuideVenue {
  id: string;
  name: string;
  slug: string;
  area: string;
  cuisine: string | null;
  description: string | null;
  bestFor: string[];
  priceTier: string | null;
  openingHours: string | null;
  website: string | null;
  mapsUrl: string | null;
  image: string;
  source: string | null;
  sourceUrl: string | null;
  lastVerified: string | null;
  featured: boolean;
}

/** Map a raw amenity row into the shape the guide components render. */
export function toGuideVenue(a: Amenity): GuideVenue {
  return {
    id: a.id,
    name: a.name,
    slug: a.slug || a.id,
    area: a.neighbourhood_name || '',
    cuisine: a.cuisine || null,
    description: a.description || null,
    bestFor: Array.isArray(a.best_for) ? a.best_for.filter(Boolean) : [],
    priceTier: a.price_tier || null,
    openingHours: a.opening_hours || null,
    website: normalizeUrl(a.website),
    mapsUrl: amenityMapsUrl(a),
    image: amenityImage(a),
    source: a.source || null,
    sourceUrl: normalizeUrl(a.source_url),
    lastVerified: formatVerifiedDate(a.last_verified),
    featured: !!a.is_featured,
  };
}

/** "2026-10-02" / ISO → "Oct 2026" (or '' when absent/invalid). */
export function formatVerifiedDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** URL-safe fragment for a heading id. */
export function fragmentId(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}

// ─────────────────────────────────────────────────────────────
// Occasions - reuse the SAME venue records, surfaced a different way.
// ─────────────────────────────────────────────────────────────
export interface Occasion {
  key: string;
  label: string;
  icon: string;
  match: (v: GuideVenue) => boolean;
}

const hasBest = (v: GuideVenue, tag: string): boolean =>
  v.bestFor.some((b) => b.toLowerCase() === tag);

const cuisineHas = (v: GuideVenue, re: RegExp): boolean => !!v.cuisine && re.test(v.cuisine);

export const OCCASIONS: Occasion[] = [
  {
    key: 'kenyan',
    label: 'Best for Kenyan & African food',
    icon: 'ri-restaurant-line',
    match: (v) =>
      hasBest(v, 'kenyan food') ||
      hasBest(v, 'swahili') ||
      hasBest(v, 'african') ||
      cuisineHas(v, /kenyan|swahili|coastal|african/i),
  },
  {
    key: 'brunch',
    label: 'Best for brunch & breakfast',
    icon: 'ri-bread-line',
    match: (v) =>
      hasBest(v, 'brunch') || hasBest(v, 'breakfast') || cuisineHas(v, /brunch|bakery|caf[eé]/i),
  },
  {
    key: 'family',
    label: 'Best for families',
    icon: 'ri-group-line',
    match: (v) => hasBest(v, 'family'),
  },
  {
    key: 'date',
    label: 'Best for date night',
    icon: 'ri-heart-line',
    match: (v) => hasBest(v, 'date night'),
  },
  {
    key: 'business',
    label: 'Best for business meals',
    icon: 'ri-briefcase-line',
    match: (v) => hasBest(v, 'business lunch'),
  },
  {
    key: 'budget',
    label: 'Best affordable options',
    icon: 'ri-coin-line',
    match: (v) => v.priceTier === 'Budget',
  },
  {
    key: 'garden',
    label: 'Best garden & outdoor dining',
    icon: 'ri-leaf-line',
    match: (v) => hasBest(v, 'garden dining') || hasBest(v, 'outdoor'),
  },
  {
    key: 'seafood',
    label: 'Best seafood',
    icon: 'ri-anchor-line',
    match: (v) => hasBest(v, 'seafood') || cuisineHas(v, /seafood/i),
  },
  {
    key: 'indian',
    label: 'Best Indian',
    icon: 'ri-restaurant-2-line',
    match: (v) => hasBest(v, 'indian') || cuisineHas(v, /indian/i),
  },
  {
    key: 'ethiopian',
    label: 'Best Ethiopian & Eritrean',
    icon: 'ri-restaurant-line',
    match: (v) => hasBest(v, 'ethiopian') || cuisineHas(v, /ethiopian|eritrean/i),
  },
  {
    key: 'asian',
    label: 'Best Asian & Japanese',
    icon: 'ri-restaurant-line',
    match: (v) =>
      hasBest(v, 'asian') || hasBest(v, 'japanese') || cuisineHas(v, /asian|japanese|nikkei|chinese|thai/i),
  },
  {
    key: 'fine',
    label: 'Best for fine dining',
    icon: 'ri-cup-line',
    match: (v) => hasBest(v, 'fine dining') || cuisineHas(v, /fine dining/i),
  },
];

export interface AreaGroup {
  name: string;
  venues: GuideVenue[];
}

/** True when a venue belongs to the named area (tolerant of spelling variants). */
export function venueInArea(venue: GuideVenue, areaName: string): boolean {
  if (!areaName) return false;
  return areaNameBelongsTo(venue.area, areaName) || venue.area.toLowerCase() === areaName.toLowerCase();
}

function sortVenues(list: GuideVenue[]): GuideVenue[] {
  return [...list].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Group venues by area. When `areaNames` is supplied (the guide's related
 * neighbourhoods) only those areas appear, in the guide's order. When it is
 * empty the areas are derived from the venues themselves so the section never
 * renders empty.
 */
export function groupVenuesByArea(venues: GuideVenue[], areaNames: string[] = []): AreaGroup[] {
  if (areaNames.length > 0) {
    return areaNames
      .map((name) => ({ name, venues: sortVenues(venues.filter((v) => venueInArea(v, name))) }))
      .filter((g) => g.venues.length > 0);
  }
  const derived: string[] = [];
  venues.forEach((v) => {
    if (v.area && !derived.some((a) => a.toLowerCase() === v.area.toLowerCase())) derived.push(v.area);
  });
  return derived
    .map((name) => ({ name, venues: sortVenues(venues.filter((v) => venueInArea(v, name))) }))
    .filter((g) => g.venues.length > 0);
}

export interface OccasionGroup extends Occasion {
  venues: GuideVenue[];
}

/** Build the occasion groups (only occasions that actually have venues). */
export function groupVenuesByOccasion(venues: GuideVenue[]): OccasionGroup[] {
  return OCCASIONS.map((o) => ({ ...o, venues: sortVenues(venues.filter(o.match)) })).filter(
    (g) => g.venues.length > 0,
  );
}

/** Keep only the venues that belong to at least one of the given areas. */
export function scopeVenuesToAreas(venues: GuideVenue[], areaNames: string[]): GuideVenue[] {
  if (areaNames.length === 0) return venues;
  return venues.filter((v) => areaNames.some((name) => venueInArea(v, name)));
}