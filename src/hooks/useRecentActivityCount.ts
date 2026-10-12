import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { applyPublicVisibility } from '@/lib/publicListings';
import { windowLabelForHours, type RecentWindowOption } from '@/lib/recentWindow';

export type RecentSource = 'listings' | 'developments';

export interface RecentActivityResult {
  /** Records added within the requested window. */
  count: number;
  loading: boolean;
  /** created_at of the newest matching record (null when there are none). */
  closestAt: string | null;
  /** How many records fall inside the covering window around `closestAt`. */
  closestCount: number;
  /** The smallest window that actually contains inventory (null when none fits). */
  coveringWindow: RecentWindowOption | null;
}

/**
 * Reports how many real, publicly-visible records were added in a given window,
 * and - when that window is empty - the closest window that DOES contain
 * inventory. Shared by every property-results page so the "what changed
 * recently" note reports the same, honest numbers everywhere, for the exact
 * window the visitor searched.
 *
 * - source 'listings'      → the public all_listings directory (Buy / Rent /
 *                            Commercial / All Properties / SEO pages).
 * - source 'developments'  → published new-development projects.
 *
 * `windowHours` may be null when the visitor has not restricted the time window
 * ('Anytime'); in that case the hook reports nothing and the note stays hidden.
 *
 * When `location` is provided the count is scoped to that area (matched across
 * the whole location hierarchy) so the note reflects the visitor's own search.
 */
export function useRecentActivityCount(
  location: string | undefined,
  source: RecentSource,
  windowHours: number | null,
  enabled = true,
): RecentActivityResult {
  const [count, setCount] = useState(0);
  const [closestAt, setClosestAt] = useState<string | null>(null);
  const [closestCount, setClosestCount] = useState(0);
  const [coveringWindow, setCoveringWindow] = useState<RecentWindowOption | null>(null);
  const [loading, setLoading] = useState(enabled && windowHours != null);

  useEffect(() => {
    if (!enabled || windowHours == null) {
      setLoading(false);
      setCount(0);
      setClosestAt(null);
      setClosestCount(0);
      setCoveringWindow(null);
      return;
    }
    let active = true;
    setLoading(true);

    (async () => {
      try {
        const table = source === 'developments' ? 'listings' : 'all_listings';

        // Apply the visibility + location filters on top of a fresh query. Built
        // separately each call because PostgREST query builders are single-use.
        const applyFilters = (query: any) => {
          let q = query.neq('title', '');
          if (source === 'developments') {
            q = q.eq('is_new_development', true).eq('is_published', true);
          } else {
            q = applyPublicVisibility(q, 'active');
          }
          const loc = (location || '').replace(/[%,()]/g, ' ').trim();
          if (loc) {
            q = q.or(
              `neighbourhood.ilike.%${loc}%,location.ilike.%${loc}%,address.ilike.%${loc}%,city.ilike.%${loc}%`,
            );
          }
          return q;
        };

        const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();

        const [windowRes, newestRes] = await Promise.all([
          applyFilters(supabase.from(table).select('id', { count: 'exact', head: true })).gte('created_at', since),
          applyFilters(supabase.from(table).select('created_at')).order('created_at', { ascending: false }).limit(1),
        ]);
        if (!active) return;

        const windowCount = windowRes.error ? 0 : (windowRes.count ?? 0);
        const newest = !newestRes.error ? ((newestRes.data?.[0] as { created_at?: string } | undefined)?.created_at ?? null) : null;

        setCount(windowCount);
        setClosestAt(newest);

        // Empty window → work out the nearest window that DOES contain records
        // and count them, so the note can suggest the closest period.
        if (windowCount === 0 && newest) {
          const hoursAgo = (Date.now() - new Date(newest).getTime()) / 3_600_000;
          const covering = windowLabelForHours(hoursAgo);
          if (covering) {
            const coveringSince = new Date(Date.now() - covering.hours * 3_600_000).toISOString();
            const { count: coveringCount, error: coveringError } = await applyFilters(
              supabase.from(table).select('id', { count: 'exact', head: true }),
            ).gte('created_at', coveringSince);
            if (!active) return;
            setCoveringWindow(covering);
            setClosestCount(coveringError ? 0 : (coveringCount ?? 0));
          } else {
            setCoveringWindow(null);
            setClosestCount(0);
          }
        } else {
          setCoveringWindow(null);
          setClosestCount(0);
        }
      } catch {
        if (active) {
          setCount(0);
          setClosestAt(null);
          setClosestCount(0);
          setCoveringWindow(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [location, source, windowHours, enabled]);

  return { count, loading, closestAt, closestCount, coveringWindow };
}