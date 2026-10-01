import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPublicAmenities } from '@/lib/publicAmenities';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import type { Amenity } from '@/lib/amenities';

export interface AmenityFilters {
  type?: string;
  category?: string;
  neighbourhoodId?: string;
  neighbourhoodName?: string;
}

export interface UseAmenitiesReturn {
  amenities: Amenity[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch published amenities for a PUBLIC surface.
 *
 * This is the single reader behind every public directory surface (Directory,
 * category pages, Schools, Night Life, Neighbourhood "Around Here" and "Life
 * Around Here"). It delegates all visibility rules to `@/lib/publicAmenities`
 * so a place that is drafted, unpublished, recycled or archived in the
 * Amenities console can never appear on the public site.
 *
 * It also subscribes to live changes on the `amenities` table (and refreshes
 * when the tab regains focus), so replacing an image or editing a description
 * in the back-office is reflected here without a manual reload.
 */
export function useAmenities(filters?: AmenityFilters): UseAmenitiesReturn {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable per-instance channel name so multiple hooks on a page never collide.
  const channelName = useRef(`public-amenities-${Math.random().toString(36).slice(2)}`);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchPublicAmenities({
        type: filters?.type,
        category: filters?.category,
        neighbourhoodId: filters?.neighbourhoodId,
        neighbourhoodName: filters?.neighbourhoodName,
      });
      setAmenities(all);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load amenities';
      setError(message);
      setAmenities([]);
    } finally {
      setLoading(false);
    }
  }, [filters?.type, filters?.category, filters?.neighbourhoodId, filters?.neighbourhoodName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keep the directory live: any change to the amenities table re-runs the
  // scoped public query (so it can never surface a non-public row).
  useRealtimeRefresh({
    channelName: channelName.current,
    tables: ['amenities'],
    onChange: fetchData,
  });

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { amenities, loading, error, refetch };
}