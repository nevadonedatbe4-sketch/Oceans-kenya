import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { applyPublicAmenityVisibility, normalizeAmenityRow } from '@/lib/publicAmenities';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import type { Amenity } from '@/lib/amenities';

export interface UseCuratedPlacesReturn {
  places: Amenity[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch EVERY guide-curated, published place across all directory categories.
 *
 * This is the one live source behind the micro-guides ("Best Cafés in
 * Kilimani", "Best Restaurants in Nairobi"...). Visibility comes from the SAME
 * shared rule the public directory uses (`applyPublicAmenityVisibility`), so a
 * drafted, recycled or archived record can never leak into a guide. The query
 * is live: curating a record in the Amenities console updates every guide.
 */
export function useCuratedPlaces(): UseCuratedPlacesReturn {
  const [places, setPlaces] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelName = useRef(`curated-places-${Math.random().toString(36).slice(2)}`);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = applyPublicAmenityVisibility(
        supabase.from('amenities').select('*').eq('is_guide_curated', true),
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