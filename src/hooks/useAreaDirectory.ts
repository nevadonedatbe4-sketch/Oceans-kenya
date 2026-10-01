import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { AMENITY_CATEGORIES, type Amenity } from '@/lib/amenities';
import { normalizeAmenityRow } from '@/lib/publicAmenities';
import { haversineDistance } from '@/lib/distance';

/**
 * useAreaDirectory - the shared live-directory layer that powers every
 * neighbourhood-facing surface (Area Guides, neighbourhood detail, the
 * neighbourhood editor's "Life Around Here" tab, etc.).
 *
 * It is the SINGLE source of truth for "what lives in this area". Given a
 * canonical neighbourhood (id + name) it returns the real published
 * `amenities` records for that area and computes every per-category count
 * directly from the database - never hard-coded, never re-fetched per surface.
 *
 * Resolution strategy (canonical first):
 *   1. `neighbourhood_id` exact match (the FK - strongest signal).
 *   2. `neighbourhood_name` case-insensitive match (legacy records that only
 *      carry a name). This is how we avoid "0 results because the slug/name
 *      didn't line up".
 *
 * Optional proximity layer:
 *   When a centre point is supplied (latitude/longitude) the hook ALSO resolves
 *   every published directory place physically within `radiusMeters` of the area
 *   that is not already area-matched, and exposes the combined set as
 *   `areaDirectory`. This keeps the "nearby within X km" rule in one place
 *   instead of being duplicated by every caller.
 *
 * Records are deduplicated by id so the same business never appears twice even
 * when it is matched by both id and name.
 */

export interface AreaDirectoryResult {
  /** Area-matched live records (FK id or legacy name match), deduplicated. */
  amenities: Amenity[];
  /** The full published directory, unfiltered (useful for proximity checks). */
  directoryAmenities: Amenity[];
  /** Published places within the radius that are NOT area-matched. */
  nearby: Amenity[];
  /** Everything relevant to the area: matched + nearby, deduplicated. */
  areaDirectory: Amenity[];
  /** Per-category counts over the area-matched set, keyed by category key. */
  categoryCounts: Record<string, number>;
  /** Per-category counts over the full combined area set. */
  areaCategoryCounts: Record<string, number>;
  /** Total area-matched records. */
  total: number;
  /** Total combined area records (matched + nearby). */
  areaTotal: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseAreaDirectoryParams {
  /** Canonical neighbourhood database id. */
  neighbourhoodId?: string | null;
  /** Canonical neighbourhood name (used for the legacy name match). */
  neighbourhoodName?: string | null;
  /** Optional area centre latitude - enables the proximity ("nearby") layer. */
  latitude?: number | null;
  /** Optional area centre longitude - enables the proximity ("nearby") layer. */
  longitude?: number | null;
  /** Proximity radius in metres. Defaults to 5000 (5 km). */
  radiusMeters?: number;
}

/** Map a list of places onto a per-category count record. */
function buildCounts(all: Amenity[]): Record<string, number> {
  const map: Record<string, number> = {};
  all.forEach((a) => {
    // Skip places with no category so counts match a strict
    // `category === key` filter (the same rule the neighbourhood editor uses).
    if (!a.category) return;
    map[a.category] = (map[a.category] || 0) + 1;
  });
  return map;
}

/**
 * Fetch EVERY published, non-deleted place in the directory.
 *
 * A single `select('*')` is silently truncated by the API's default row cap
 * (1000 rows). With a directory larger than that, every consumer of this layer
 * - count tiles included - would only ever "see" an arbitrary first slice of
 * the data and report wrong totals. We page through in fixed windows so the
 * whole directory is always loaded, however large it grows.
 */
const DIRECTORY_PAGE_SIZE = 1000;

async function fetchAllPublishedAmenities(): Promise<Amenity[]> {
  const all: Amenity[] = [];
  for (let from = 0; ; from += DIRECTORY_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('amenities')
      .select('*')
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('is_featured', { ascending: false })
      .order('name', { ascending: true })
      .range(from, from + DIRECTORY_PAGE_SIZE - 1);

    if (error) throw error;
    const rows = (data || []) as Amenity[];
    all.push(...rows.map(normalizeAmenityRow));
    if (rows.length < DIRECTORY_PAGE_SIZE) break;
  }
  return all;
}

export function useAreaDirectory({
  neighbourhoodId,
  neighbourhoodName,
  latitude,
  longitude,
  radiusMeters = 5000,
}: UseAreaDirectoryParams): AreaDirectoryResult {
  const [directory, setDirectory] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllPublishedAmenities();
      setDirectory(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load directory';
      setError(message);
      setDirectory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Area-matched records: FK id first, then tolerant legacy name match.
  const amenities = useMemo(() => {
    const hasId = !!neighbourhoodId;
    const hasName = !!(neighbourhoodName && String(neighbourhoodName).trim());
    const idSet = new Set<string>();
    const out: Amenity[] = [];
    for (const a of directory) {
      if (idSet.has(a.id)) continue;
      let matched = false;
      if (hasId && a.neighbourhood_id === neighbourhoodId) matched = true;
      if (!matched && hasName && a.neighbourhood_name && a.neighbourhood_name.toLowerCase() === String(neighbourhoodName).toLowerCase()) {
        matched = true;
      }
      if (matched) {
        idSet.add(a.id);
        out.push(a);
      }
    }
    return out;
  }, [directory, neighbourhoodId, neighbourhoodName]);

  // Proximity layer: published places within the radius that aren't area-matched.
  const nearby = useMemo(() => {
    if (latitude == null || longitude == null) return [];
    const matchedIds = new Set(amenities.map((a) => a.id));
    return directory.filter(
      (a) =>
        !matchedIds.has(a.id) &&
        a.latitude != null &&
        a.longitude != null &&
        haversineDistance(latitude, longitude, a.latitude, a.longitude) <= radiusMeters,
    );
  }, [directory, amenities, latitude, longitude, radiusMeters]);

  const areaDirectory = useMemo(() => {
    const seen = new Set(amenities.map((a) => a.id));
    return [...amenities, ...nearby.filter((a) => !seen.has(a.id))];
  }, [amenities, nearby]);

  const categoryCounts = useMemo(() => buildCounts(amenities), [amenities]);
  const areaCategoryCounts = useMemo(() => buildCounts(areaDirectory), [areaDirectory]);

  return {
    amenities,
    directoryAmenities: directory,
    nearby,
    areaDirectory,
    categoryCounts,
    areaCategoryCounts,
    total: amenities.length,
    areaTotal: areaDirectory.length,
    loading,
    error,
    refetch,
  };
}

/** Ordered list of { key, label, icon, color, count } for rendering count tiles. */
export function useAreaCategoryCounts(counts: Record<string, number>): Array<{
  key: string;
  label: string;
  icon: string;
  color: string;
  count: number;
}> {
  return useMemo(
    () =>
      AMENITY_CATEGORIES.map((c) => ({
        key: c.key,
        label: c.label,
        icon: c.icon,
        color: c.color,
        count: counts[c.key] || 0,
      })),
    [counts],
  );
}