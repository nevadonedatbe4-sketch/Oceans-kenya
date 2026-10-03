import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatAreaName, smartTitleCase } from '@/lib/location';
import {
  buildDevelopment,
  groupRowsByProject,
  DEVELOPMENT_COLUMNS,
  type Development,
  type ListingRow,
} from '@/lib/developmentModel';

export type { Development, DevelopmentUnit, DevelopmentBrochure } from '@/lib/developmentModel';

/**
 * Fetch published New Developments straight from `listings`, then group the
 * returned records into real Development projects.
 *
 * The development model itself lives in `@/lib/developmentModel` so the index
 * page and the detail page derive exactly the same structure.
 *
 * A failed query is reported as an error - it is never converted into
 * "0 results".
 */
export function useNewDevelopments() {
  const [developments, setDevelopments] = useState<Development[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchListings = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('listings')
        .select(DEVELOPMENT_COLUMNS)
        .eq('is_new_development', true)
        .eq('is_published', true)
        .order('title', { ascending: true });

      if (dbError) {
        console.error('[NewDevelopments] query failed:', dbError);
        setError(dbError.message || 'Failed to load developments.');
        setDevelopments([]);
        return;
      }

      const rows = (data || []) as ListingRow[];
      const groups = groupRowsByProject(rows);

      const mapped: Development[] = Array.from(groups.values()).map((groupRows) =>
        buildDevelopment(groupRows, { smartTitleCase, formatAreaName })
      );

      setDevelopments(
        mapped.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred loading developments.';
      console.error('[NewDevelopments] unexpected error:', err);
      setError(message);
      setDevelopments([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchListings]);

  return { developments, loading, error, refetch: fetchListings };
}