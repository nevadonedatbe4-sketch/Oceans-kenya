import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface UseRealtimeRefreshOptions {
  /** Unique channel name so multiple page subscriptions never collide. */
  channelName: string;
  /** Tables to watch. Any insert/update/delete on these re-triggers `onChange`. */
  tables: string[];
  /** Called (debounced) whenever a watched table changes or the tab regains focus. */
  onChange: () => void;
  /** Set false to temporarily disable (e.g. while an ownership id is still resolving). */
  enabled?: boolean;
  /** Coalesce bursts of events into a single refresh. */
  debounceMs?: number;
  /** Also refresh when the browser tab becomes visible again (stale-data guard). */
  refreshOnFocus?: boolean;
}

/**
 * Keeps a CRM view live without a manual refresh.
 *
 * Subscribes to Postgres changes on the given tables (RLS-scoped, so a user only
 * receives events for rows they are allowed to see) and calls `onChange` after a
 * short debounce so a burst of writes becomes one reload. It also refreshes when
 * the tab regains focus, so data is never left stale after switching away and back.
 *
 * The refresh itself always re-runs the caller's own scoped query, so even an
 * unexpected event can never surface a row outside the caller's permissions.
 */
export function useRealtimeRefresh({
  channelName,
  tables,
  onChange,
  enabled = true,
  debounceMs = 600,
  refreshOnFocus = true,
}: UseRealtimeRefreshOptions): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable dependency: re-subscribe only when the actual table set changes.
  const tablesKey = tables.join(',');

  useEffect(() => {
    if (!enabled || !tablesKey) return undefined;

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChangeRef.current(), debounceMs);
    };

    const channel = supabase.channel(channelName);
    tablesKey.split(',').forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, schedule);
    });
    channel.subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [channelName, tablesKey, enabled, debounceMs]);

  useEffect(() => {
    if (!enabled || !refreshOnFocus) return undefined;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') onChangeRef.current();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, refreshOnFocus]);
}