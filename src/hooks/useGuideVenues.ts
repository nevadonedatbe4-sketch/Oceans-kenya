import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { applyPublicAmenityVisibility, normalizeAmenityRow } from '@/lib/publicAmenities';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import type { Amenity } from '@/lib/amenities';

export interface UseGuideVenuesReturn {
  venues: Amenity[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch the curated dining venues that power the editorial guides.
 *
 * Only guide-curated, published dining records are returned, and visibility is
 * derived from the SAME shared rule the public directory uses (a drafted,
 * recycled or archived place can never leak into a guide). The query is live:
 * editing a venue in the Amenities console updates every guide on the site.
 */
export function useGuideVenues(): UseGuideVenuesReturn {
  const [venues, setVenues] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelName = useRef(`guide-venues-${Math.random().toString(36).slice(2)}`);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = applyPublicAmenityVisibility(
        supabase.from('amenities').select('*').eq('category', 'dining').eq('is_guide_curated', true),
      )
        .order('is_featured', { ascending: false })
        .order('name', { ascending: true });

      const { data, error: err } = await query;
      if (err) throw err;
      setVenues(((data || []) as Amenity[]).map(normalizeAmenityRow));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load venues');
      setVenues([]);
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

  return { venues, loading, error, refetch: fetchData };
}