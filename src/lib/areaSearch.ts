/**
 * areaSearch - THE reusable "area-to-property-search" resolver.
 *
 * Every Area Guide / Neighbourhood property CTA (Browse Properties, View
 * Properties, Explore Properties, "X Properties", Similar Areas, Related
 * Areas...) must route through this module. It turns a human area label into a
 * real, filtered property search instead of a generic unfiltered page.
 *
 * WHY ONE RESOLVER (not per-link patches)
 * ---------------------------------------
 * A guide can name one area ("Karen"), a spelling variant ("Karen Nairobi") or
 * a combined group ("South B & South C", "City Centre & Upper Hill"). Hard-coded
 * links handled none of those consistently and sent users to empty pages. Here:
 *
 *   1. The label is split on & / + / , / "and".
 *   2. Each token is resolved against the canonical location registry
 *      (case- and alias-aware), so "Karen Nairobi" and "Karen" both become Karen,
 *      and "South B & South C" becomes TWO areas OR-ed together.
 *   3. A free-text query the shared search engine already understands is produced
 *      ("South B or South C"), so the destination page applies a real filter.
 *   4. buildAreaFallbackTiers() encodes the "never show an empty page" hierarchy:
 *        exact area(s) → nearby/related areas → broader (all published property).
 *
 * The resolver is intentionally PURE: it never queries the database. The
 * dedicated Area Results view performs the live inventory check that picks the
 * first tier with real listings, so this module is safe to use anywhere (cards,
 * guides, menus) with no side effects.
 */

import { resolveLocation, allAreas } from '@/lib/locationRegistry';
import { haversineDistance } from '@/lib/distance';

export type AreaSearchLevel = 'area' | 'city' | 'unknown';
export type AreaSearchPurpose = 'sale' | 'rent';

export interface ResolvedAreaSearch {
  /** Canonical area names found, in the order they appear in the label. */
  areas: string[];
  /** 'area' = concrete neighbourhood(s), 'city' = a city parent, 'unknown'. */
  level: AreaSearchLevel;
  /** City parent (e.g. "Nairobi") when known. */
  city: string | null;
  /** URL-safe identifier for the search, e.g. "south-b-and-south-c". */
  slug: string;
  /** Human label for the search, e.g. "South B + South C". */
  label: string;
  /** Free-text query the shared search engine parses, e.g. "South B or South C". */
  query: string;
}

export interface AreaSearchOptions {
  /** Buy/Rent intent carried into the destination. */
  purpose?: AreaSearchPurpose;
  /** Optional canonical property-type filter carried into the destination. */
  type?: string;
}

/** Splits a combined label into individual area tokens. */
const COMBINE_SPLIT = /\s*(?:&|\+|\/|,|\band\b)\s*/i;

/** Lowercase-dash slug for a free string. */
function slugify(value: string): string {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Resolve a free-text area label (single, combined or alias) into canonical
 * areas plus the query the search engine should run.
 */
export function resolveAreaSearch(label: string): ResolvedAreaSearch {
  const raw = (label || '').trim();
  const tokens = raw
    .split(COMBINE_SPLIT)
    .map((t) => t.trim())
    .filter(Boolean);

  const areas: string[] = [];
  let city: string | null = null;

  const addArea = (name: string) => {
    if (!areas.some((a) => a.toLowerCase() === name.toLowerCase())) areas.push(name);
  };

  const tryResolve = (token: string): boolean => {
    const resolved = resolveLocation(token);
    if (resolved?.area) {
      addArea(resolved.name);
      return true;
    }
    if (resolved?.cityOnly) {
      if (!city) city = resolved.city;
      return true;
    }
    return false;
  };

  tokens.forEach((token) => tryResolve(token));

  // Whole-label fallback: a single token, or a combined label the splitter
  // could not resolve token-by-token (e.g. an alias spanning the separator).
  if (areas.length === 0) tryResolve(raw);

  let level: AreaSearchLevel;
  let query: string;
  let display: string;
  let slugText: string;

  if (areas.length > 0) {
    level = 'area';
    query = areas.join(' or ');
    display = areas.join(' + ');
    slugText = areas.map(slugify).join('-and-');
  } else if (city) {
    level = 'city';
    query = city;
    display = city;
    slugText = slugify(city);
  } else {
    level = 'unknown';
    query = raw;
    display = raw || 'All Areas';
    slugText = slugify(raw) || 'all';
  }

  return { areas, level, city, slug: slugText, label: display, query };
}

/**
 * Build the canonical destination URL for an area CTA. Always points at the
 * dedicated Area Results view, which owns the fallback hierarchy.
 */
export function areaSearchHref(label: string, opts: AreaSearchOptions = {}): string {
  const resolved = resolveAreaSearch(label);
  const params = new URLSearchParams();
  if (label) params.set('place', label);
  if (opts.purpose) params.set('purpose', opts.purpose);
  if (opts.type) params.set('type', opts.type);
  const qs = params.toString();
  return `/area/${resolved.slug}${qs ? `?${qs}` : ''}`;
}

/**
 * Recover a readable label from an area slug when the ?place= param is absent
 * (e.g. a directly-typed URL). Best-effort - the registry then re-resolves it.
 */
export function labelFromAreaSlug(slug: string): string {
  return (slug || '')
    .split('-and-')
    .map((segment) =>
      segment
        .split('-')
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
        .join(' ')
    )
    .join(' & ');
}

/**
 * Nearby / related areas for a set of areas, used by the fallback hierarchy.
 * Prefers true geographic neighbours (haversine on the registry coordinates)
 * and falls back to other areas in the same city when coordinates are missing.
 */
export function nearbyAreaNames(
  areas: string[],
  city: string | null,
  limit = 6
): string[] {
  if (areas.length === 0) return [];
  const inSameCity = (areaCity: string) =>
    !city || areaCity.toLowerCase() === city.toLowerCase();

  const pool = allAreas().filter(
    (a) =>
      inSameCity(a.city) &&
      !areas.some((x) => x.toLowerCase() === a.name.toLowerCase())
  );

  const primary = allAreas().find(
    (a) => a.name.toLowerCase() === areas[0].toLowerCase()
  );
  const lat = primary?.latitude;
  const lng = primary?.longitude;

  if (typeof lat === 'number' && typeof lng === 'number') {
    return pool
      .map((a) => ({
        name: a.name,
        distance:
          typeof a.latitude === 'number' && typeof a.longitude === 'number'
            ? haversineDistance(lat, lng, a.latitude, a.longitude)
            : Number.POSITIVE_INFINITY,
      }))
      .sort((x, y) => x.distance - y.distance)
      .slice(0, limit)
      .map((x) => x.name);
  }

  return pool.slice(0, limit).map((a) => a.name);
}

export type AreaFallbackTierKey = 'exact' | 'nearby' | 'broad';

export interface AreaFallbackTier {
  key: AreaFallbackTierKey;
  /** Free-text query fed to the shared search engine ('' = browse all). */
  query: string;
  /** Human label describing the tier. */
  label: string;
}

/**
 * The fallback hierarchy for an area search:
 *   0. exact   - the named area(s)                     ("South B or South C")
 *   1. nearby  - related/nearby areas                  ("Langata or Lavington...")
 *   2. broad   - every published property              (no location constraint)
 *
 * The dedicated Area Results view runs a live count for each tier in order and
 * lands on the first one with real inventory - so a CTA never opens empty.
 */
export function buildAreaFallbackTiers(resolved: ResolvedAreaSearch): AreaFallbackTier[] {
  const tiers: AreaFallbackTier[] = [
    { key: 'exact', query: resolved.query, label: resolved.label },
  ];

  if (resolved.level === 'area' && resolved.areas.length > 0) {
    const nearby = nearbyAreaNames(resolved.areas, resolved.city);
    if (nearby.length > 0) {
      tiers.push({
        key: 'nearby',
        query: nearby.join(' or '),
        label: nearby.slice(0, 4).join(' + '),
      });
    }
  }

  tiers.push({ key: 'broad', query: '', label: 'all published property' });
  return tiers;
}