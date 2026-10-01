/**
 * locationRegistry - canonical Nairobi-area model & single source of truth.
 *
 * The whole platform now derives its searchable locations from ONE registry
 * rather than a hard-coded "Nairobi County" list. The registry:
 *
 *   1. Seeds a curated base of verified Nairobi areas + their aliases
 *      (Karen / Karen Nairobi / Karen area all resolve to the same area).
 *   2. Dynamically merges every currently-published `neighbourhoods` row from
 *      the database, so a newly added neighbourhood becomes searchable with
 *      no code change (see useCanonicalAreas).
 *   3. Keeps the county/city/area hierarchy correct:
 *          Kenya → Nairobi (city) → Featured Areas → individual area
 *      "Nairobi County" stays as an internal administrative parent ONLY -
 *      it is never offered to users as a neighbourhood option.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface NairobiArea {
  id: string;
  /** Canonical display name, e.g. "Karen". */
  name: string;
  /** URL slug, e.g. "karen". */
  slug: string;
  /** City parent - Nairobi for all searchable areas. */
  city: string;
  /** Administrative parent only (never user-facing as a neighbourhood). */
  county: string;
  /** Country. */
  country: string;
  /** Whether this area is promoted on the Neighbourhoods page. */
  featured: boolean;
  /** Whether the row came from the database. */
  db: boolean;
  /** Alternate strings that resolve to the same area. */
  aliases: string[];
  /** Optional coordinates, so selecting an area can power radius/geocoding. */
  latitude?: number | null;
  longitude?: number | null;
}

/** Curated base registry - verified Nairobi areas + their aliases. */
export const BASE_AREAS: NairobiArea[] = [
  { id: 'base-karen', name: 'Karen', slug: 'karen', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: true, db: false, aliases: ['Karen Nairobi', 'Karen area', 'Karen suburb', 'Karen Estate', 'Karen Close', 'Karen Homes'] },
  { id: 'base-runda', name: 'Runda', slug: 'runda', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: true, db: false, aliases: ['Runda Nairobi', 'Runda Estate', 'Runda area', 'Runda Homes', 'Runda Gardens'] },
  { id: 'base-kileleshwa', name: 'Kileleshwa', slug: 'kileleshwa', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Kileleshwa Nairobi', 'Kileleshwa area', 'Kileleshwa Estate'] },
  { id: 'base-westlands', name: 'Westlands', slug: 'westlands', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Westlands Nairobi', 'Westlands area', 'Westlands Estate', 'Westlands Business District'] },
  { id: 'base-lavington', name: 'Lavington', slug: 'lavington', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Lavington Nairobi', 'Lavington area', 'Lavington Estate'] },
  { id: 'base-muthaiga', name: 'Muthaiga', slug: 'muthaiga', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: true, db: false, aliases: ['Muthaiga Nairobi', 'Muthaiga area', 'Muthaiga Estate', 'Muthaiga Golf Course'] },
  { id: 'base-kilimani', name: 'Kilimani', slug: 'kilimani', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Kilimani Nairobi', 'Kilimani area', 'Kilimani Estate'] },
  { id: 'base-gigiri', name: 'Gigiri', slug: 'gigiri', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: true, db: false, aliases: ['Gigiri Nairobi', 'Gigiri area', 'Gigiri Estate', 'UN Gigiri'] },
  { id: 'base-kitisuru', name: 'Kitisuru', slug: 'kitisuru', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Kitisuru Nairobi', 'Kitisuru area', 'Old Kitisuru', 'Kitisuru Estate'] },
  { id: 'base-lower-kabete', name: 'Lower Kabete', slug: 'lower-kabete', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Lower Kabete Nairobi', 'Lower Kabete area', 'Kabete'] },
  { id: 'base-riverside', name: 'Riverside', slug: 'riverside', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Riverside Nairobi', 'Riverside Drive', 'Riverside area', 'Riverside Estate'] },
  { id: 'base-spring-valley', name: 'Spring Valley', slug: 'spring-valley', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Spring Valley Nairobi', 'Spring Valley area', 'Spring Valley Estate'] },
  { id: 'base-rosslyn', name: 'Rosslyn', slug: 'rosslyn', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Rosslyn Nairobi', 'Rosslyn area', 'Rosslyn Estate'] },
  { id: 'base-arboretum', name: 'Arboretum', slug: 'arboretum', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Arboretum Nairobi', 'Arboretum area'] },
  { id: 'base-nyari', name: 'Nyari', slug: 'nyari', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Nyari Nairobi', 'Nyari area', 'Nyari Estate'] },
  { id: 'base-loresho', name: 'Loresho', slug: 'loresho', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Loresho Nairobi', 'Loresho area', 'Loresho Estate'] },
  { id: 'base-parklands', name: 'Parklands', slug: 'parklands', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Parklands Nairobi', 'Parklands area', 'Parklands Estate'] },
  { id: 'base-ridgeways', name: 'Ridgeways', slug: 'ridgeways', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Ridgeways Nairobi', 'Ridgeways area', 'Ridgeways Estate'] },
  { id: 'base-upper-hill', name: 'Upper Hill', slug: 'upper-hill', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Upper Hill Nairobi', 'Upper Hill area', 'Upphill', 'Uphill', 'Upperhill'] },
  { id: 'base-industrial-area', name: 'Industrial Area', slug: 'industrial-area', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Industrial Area Nairobi', 'Industrial Area area', 'Industrial area'] },
  // Real areas found on listings but not (yet) in the neighbourhood table:
  { id: 'base-enaki-town', name: 'Enaki Town', slug: 'enaki-town', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Enaki Town Nairobi', 'Enaki'] },
  { id: 'base-nairobi-west', name: 'Nairobi West', slug: 'nairobi-west', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Nairobi West area'] },
  { id: 'base-south-c', name: 'South C', slug: 'south-c', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['South C Nairobi'] },
  { id: 'base-south-b', name: 'South B', slug: 'south-b', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['South B Nairobi'] },
  { id: 'base-langata', name: 'Langata', slug: 'langata', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Langata Nairobi', 'Langata area', 'Langata Estate'] },
  { id: 'base-embakasi', name: 'Embakasi', slug: 'embakasi', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Embakasi Nairobi', 'Embakasi area'] },
  { id: 'base-kasarani', name: 'Kasarani', slug: 'kasarani', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Kasarani Nairobi', 'Kasarani area'] },
  { id: 'base-ruaka', name: 'Ruaka', slug: 'ruaka', city: 'Nairobi', county: 'Nairobi County', country: 'Kenya', featured: false, db: false, aliases: ['Ruaka Nairobi', 'Ruaka area', 'Ruaka Estate'] },
  { id: 'base-thika', name: 'Thika', slug: 'thika', city: 'Nairobi', county: 'Kiambu County', country: 'Kenya', featured: false, db: false, aliases: ['Thika Nairobi', 'Thika Road', 'Thika area'] },
  { id: 'base-kitengela', name: 'Kitengela', slug: 'kitengela', city: 'Kitengela', county: 'Kajiado County', country: 'Kenya', featured: false, db: false, aliases: ['Kitengela Nairobi', 'Kitengela area', 'Kitengela Estate'] },
  { id: 'base-athi-river', name: 'Athi River', slug: 'athi-river', city: 'Athi River', county: 'Machakos County', country: 'Kenya', featured: false, db: false, aliases: ['Athi River Nairobi', 'Athi River area'] },
  { id: 'base-syokimau', name: 'Syokimau', slug: 'syokimau', city: 'Syokimau', county: 'Machakos County', country: 'Kenya', featured: false, db: false, aliases: ['Syokimau Nairobi', 'Syokimau area'] },
  { id: 'base-ngong', name: 'Ngong', slug: 'ngong', city: 'Ngong', county: 'Kajiado County', country: 'Kenya', featured: false, db: false, aliases: ['Ngong Nairobi', 'Ngong road', 'Ngong area'] },
  { id: 'base-rongai', name: 'Ongata Rongai', slug: 'ongata-rongai', city: 'Ongata Rongai', county: 'Kajiado County', country: 'Kenya', featured: false, db: false, aliases: ['Ongata Rongai', 'Rongai', 'Ongata Rongai Nairobi'] },
  { id: 'base-kiserian', name: 'Kiserian', slug: 'kiserian', city: 'Kiserian', county: 'Kajiado County', country: 'Kenya', featured: false, db: false, aliases: ['Kiserian Nairobi', 'Kiserian area'] },
  { id: 'base-mombasa', name: 'Mombasa', slug: 'mombasa', city: 'Mombasa', county: 'Mombasa County', country: 'Kenya', featured: false, db: false, aliases: ['Mombasa area', 'Mombasa County'] },
  { id: 'base-nyali', name: 'Nyali', slug: 'nyali', city: 'Mombasa', county: 'Mombasa County', country: 'Kenya', featured: false, db: false, aliases: ['Nyali Mombasa', 'Nyali area', 'Nyali Beach'] },
  { id: 'base-diani', name: 'Diani', slug: 'diani', city: 'Diani', county: 'Kwale County', country: 'Kenya', featured: false, db: false, aliases: ['Diani Beach', 'Diani Nairobi', 'Diani area'] },
  { id: 'base-kisumu', name: 'Kisumu', slug: 'kisumu', city: 'Kisumu', county: 'Kisumu County', country: 'Kenya', featured: false, db: false, aliases: ['Kisumu city', 'Kisumu Milimani', 'Kisumu area'] },
  { id: 'base-nakuru', name: 'Nakuru', slug: 'nakuru', city: 'Nakuru', county: 'Nakuru County', country: 'Kenya', featured: false, db: false, aliases: ['Nakuru city', 'Nakuru area'] },
  { id: 'base-eldoret', name: 'Eldoret', slug: 'eldoret', city: 'Eldoret', county: 'Uasin Gishu County', country: 'Kenya', featured: false, db: false, aliases: ['Eldoret city', 'Eldoret area'] },
  { id: 'base-kiambu', name: 'Kiambu', slug: 'kiambu', city: 'Kiambu', county: 'Kiambu County', country: 'Kenya', featured: false, db: false, aliases: ['Kiambu Nairobi', 'Kiambu town', 'Kiambu area'] },
];

/** Convenience: flatten all alias strings → area name for fast lookup. */
const ALIAS_INDEX: Record<string, NairobiArea> = (() => {
  const idx: Record<string, NairobiArea> = {};
  for (const area of BASE_AREAS) {
    idx[area.name.toLowerCase()] = area;
    for (const alias of area.aliases) idx[alias.toLowerCase()] = area;
  }
  return idx;
})();

/**
 * Runtime registry of areas merged from the database. `useCanonicalAreas`
 * populates this so the sync parser and autocomplete see newly-added
 * neighbourhoods without any code change.
 */
let dynamicAreas: NairobiArea[] = [];

/** Register an additional set of known areas (from the DB) into the registry. */
export function registerAreas(areas: NairobiArea[]): void {
  dynamicAreas = areas || [];
}

/** All known areas (curated base + db-registered). */
export function allAreas(): NairobiArea[] {
  return [...BASE_AREAS, ...dynamicAreas];
}

/** Rebuild the alias index including dynamically-registered areas. */
function aliasIndexOf(): Record<string, NairobiArea> {
  const idx: Record<string, NairobiArea> = {};
  for (const area of allAreas()) {
    idx[area.name.toLowerCase()] = area;
    for (const alias of area.aliases) idx[alias.toLowerCase()] = area;
  }
  return idx;
}

export interface ResolvedLocation {
  /** Canonical area name (e.g. "Karen"), or the city name when cityOnly. */
  name: string;
  slug: string;
  city: string;
  county: string;
  country: string;
  /** True when this is a city parent (e.g. Nairobi) rather than a single area. */
  cityOnly: boolean;
  /** True when the string resolved to a specific searchable area. */
  area: boolean;
}

/**
 * Resolve a free-text location to either a specific area or a city parent.
 * Aliases are normalised so "Karen Nairobi" and "Karen area" collapse to the
 * same area. Nairobi resolves to `cityOnly: true` (the city parent), never a
 * literal "Nairobi County" field.
 */
export function resolveLocation(raw: string): ResolvedLocation | null {
  const q = (raw || '').toLowerCase().replace(/[.,;!?()"']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return null;

  // Exact / alias match on an area first.
  const direct = aliasIndexOf()[q];
  if (direct) {
    return {
      name: direct.name,
      slug: direct.slug,
      city: direct.city,
      county: direct.county,
      country: direct.country,
      cityOnly: false,
      area: true,
    };
  }

  // Token match: the query contains an area name (longest first).
  const sorted = allAreas().sort((a, b) => b.name.length - a.name.length);
  for (const area of sorted) {
    if (q.includes(area.name.toLowerCase())) {
      return {
        name: area.name,
        slug: area.slug,
        city: area.city,
        county: area.county,
        country: area.country,
        cityOnly: false,
        area: true,
      };
    }
  }

  // City parents: "Nairobi" is the city, not an area.
  const cityNames = ['nairobi', 'naoirobi', 'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret'];
  for (const cityName of cityNames) {
    if (q.includes(cityName)) {
      const city = cityName === 'naoirobi' || cityName === 'nairobi' ? 'Nairobi' : cityName.charAt(0).toUpperCase() + cityName.slice(1);
      return { name: city, slug: city.toLowerCase(), city, county: `${city} County`, country: 'Kenya', cityOnly: true, area: false };
    }
  }

  return null;
}

/**
 * Resolve any free-text area label (an amenity's stored `neighbourhood_name`)
 * to its canonical slug, e.g. "Runda Estate" → "runda". Returns null when the
 * string can't be confidently mapped to a known area.
 */
export function slugForAreaName(raw: string | null | undefined): string | null {
  const q = (raw || '').trim();
  if (!q) return null;
  const lower = q.toLowerCase();
  const area = allAreas().find(
    (a) => a.name.toLowerCase() === lower || a.aliases.some((al) => al.toLowerCase() === lower)
  );
  if (area) return area.slug;
  const resolved = resolveLocation(q);
  return resolved && resolved.area ? resolved.slug : null;
}

/**
 * Tolerant canonical-area matcher. Decides whether a free-text area label
 * belongs to the given canonical neighbourhood name, normalising aliases
 * ("Runda Estate" → Runda), case and surrounding punctuation. Falls back to an
 * exact normalised-name comparison when neither side maps to a known slug,
 * so custom DB-only neighbourhoods still match their own records.
 */
export function areaNameBelongsTo(
  raw: string | null | undefined,
  canonicalName: string | null | undefined
): boolean {
  const rawSlug = slugForAreaName(raw);
  const targetSlug = slugForAreaName(canonicalName);

  if (rawSlug && targetSlug) return rawSlug === targetSlug;

  if (!rawSlug && !targetSlug) {
    const normalize = (s: string | null | undefined) =>
      (s || '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const r = normalize(raw);
    const t = normalize(canonicalName);
    return !!r && r === t;
  }

  return false;
}

/** Return every area in the curated registry (used for autocomplete + parser fallback). */
export function getAllAreas(): NairobiArea[] {
  return BASE_AREAS;
}

/** Return the display names of all curated areas (sorted alphabetically). */
export function getAllAreaNames(): string[] {
  return [...BASE_AREAS].map((a) => a.name).sort((a, b) => a.localeCompare(b));
}

/** Autocomplete filter over area names/aliases/city, matching a query prefix. */
export function autocompleteAreas(query: string): NairobiArea[] {
  const q = (query || '').toLowerCase().trim();
  if (!q) return [];
  const matches = BASE_AREAS.filter(
    (a) =>
      a.name.toLowerCase().startsWith(q) ||
      a.aliases.some((al) => al.toLowerCase().startsWith(q)) ||
      a.city.toLowerCase().startsWith(q)
  );
  const exactName = matches.sort((a, b) => a.name.length - b.name.length);
  return exactName.slice(0, 8);
}

/**
 * Build a PostgREST `.or()` clause for a city-level search ("Nairobi"). It
 * matches the `city` field directly AND every known area within that city, so
 * records that store only a neighbourhood still surface. Returns null when the
 * city is unknown.
 */
export function buildCityOrClause(city: string): string | null {
  const c = (city || '').trim();
  if (!c) return null;
  const conds: string[] = [`city.ilike.%${c}%`];
  for (const area of allAreas()) {
    if (area.city.toLowerCase() === c.toLowerCase()) {
      conds.push(`neighbourhood.ilike.%${area.name}%`);
    }
  }
  return conds.join(',');
}

// ── Dynamic hook: merge DB neighbourhoods into the registry ─────────────
export interface UseAreasReturn {
  /** All known/registries areas (DB + curated), sorted by name. */
  areas: NairobiArea[];
  /** Nairobi-only featured/searchable areas. */
  nairobiAreas: NairobiArea[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function mergeAreas(db: { id: string; name: string; slug: string; city: string | null; country: string | null; is_featured: boolean; latitude?: number | null; longitude?: number | null }[]): NairobiArea[] {
  const merged: NairobiArea[] = [...BASE_AREAS];
  for (const row of db) {
    const name = (row.name || '').trim();
    if (!name) continue;
    const slug = (row.slug || name.toLowerCase().replace(/\s+/g, '-'));
    const city = (row.city || 'Nairobi').trim();
    const country = (row.country || 'Kenya').trim();
    const featured = Boolean(row.is_featured);
    const exists = merged.find((a) => a.name.toLowerCase() === name.toLowerCase() || a.slug.toLowerCase() === slug.toLowerCase());
    if (exists) {
      exists.db = true;
      exists.id = row.id;
      exists.featured = featured || exists.featured;
      if (row.latitude != null) exists.latitude = row.latitude;
      if (row.longitude != null) exists.longitude = row.longitude;
    } else {
      merged.push({
        id: row.id,
        name,
        slug,
        city,
        county: `${city} County`,
        country,
        featured,
        db: true,
        aliases: [name, `${name} ${city}`, `${name} area`],
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
      });
    }
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

const NAIROBI_CITY = 'Nairobi';

/**
 * Fetch every published neighbourhood and merge it into the canonical registry.
 * A newly-added neighbourhood is therefore automatically searchable - no code
 * change required.
 */
export function useCanonicalAreas(): UseAreasReturn {
  const [areas, setAreas] = useState<NairobiArea[]>(BASE_AREAS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAreas = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('neighbourhoods')
        .select('id, name, slug, city, country, is_featured, is_published, latitude, longitude')
        .eq('is_published', true)
        .order('name', { ascending: true });
      if (err) throw err;
      if (controller.signal.aborted) return;
      const merged = mergeAreas((data || []) as { id: string; name: string; slug: string; city: string | null; country: string | null; is_featured: boolean; latitude?: number | null; longitude?: number | null }[]);
      registerAreas(merged);
      setAreas(merged);
    } catch (e: unknown) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load areas');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAreas();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchAreas]);

  const refetch = useCallback(() => {
    fetchAreas();
  }, [fetchAreas]);

  const nairobiAreas = areas.filter((a) => a.city.toLowerCase() === NAIROBI_CITY.toLowerCase());

  return { areas, nairobiAreas, loading, error, refetch };
}