import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { applyPublicAmenityVisibility, normalizeAmenityRow } from '@/lib/publicAmenities';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import type { Amenity } from '@/lib/amenities';

/** Directory categories that feed the editorial "Things to Do" guides. */
export const GUIDE_PLACE_CATEGORIES = [
  'recreation',
  'art',
  'night_life',
  'shopping_centres',
  'community',
  'fitness',
];

export interface UseGuidePlacesReturn {
  places: Amenity[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch the curated places that power the editorial "Things to Do" guides.
 *
 * Only guide-curated, published records are returned, and visibility is derived
 * from the SAME shared rule the public directory uses (a drafted, recycled or
 * archived place can never leak into a guide). The query is live: editing a
 * place in the Amenities console updates every guide on the site.
 */
export function useGuidePlaces(): UseGuidePlacesReturn {
  const [places, setPlaces] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelName = useRef(`guide-places-${Math.random().toString(36).slice(2)}`);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = applyPublicAmenityVisibility(
        supabase
          .from('amenities')
          .select('*')
          .in('category', GUIDE_PLACE_CATEGORIES)
          .eq('is_guide_curated', true),
      )
        .order('is_featured', { ascending: false })
        .order('name', { ascending: true });

      const { data, error: err } = await query;
      if (err) throw err;
      setPlaces(((data || []) as Amenity[]).map(normalizeAmenityRow));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load places');
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeRefresh({
    channelName: channelName.current,
    tables: ['amenities'],
    onChange: fetchData,
  });

  return { places, loading, error, refetch: fetchData };
}