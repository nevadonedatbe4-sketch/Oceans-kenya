import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/authz';
import { broadcastReadSync, subscribeReadSync } from '@/lib/unreadSync';

/**
 * THE authoritative notification source for the header bell (admin + agent) and
 * the notifications page.
 *
 * Design contract (so badges can never drift):
 *  - The DATABASE is the single source of truth. `unreadCount` always comes from
 *    a `count(*) where is_read = false` query — never from a locally incremented
 *    counter or a derived slice of the visible feed.
 *  - Scoping follows the site's existing intended model: admins see every unread
 *    notification (admin-wide, gated by the `notifications_admin_all` policy);
 *    everyone else sees ONLY rows addressed to them (`recipient_id = auth.uid()`,
 *    enforced both by the query and by the `notifications_own` RLS policy).
 *  - Reads are IDEMPOTENT: updates always carry `.eq('is_read', false)` so a
 *    repeated click can never inflate or corrupt a count.
 *  - Optimistic updates are rolled back to the last authoritative snapshot if the
 *    backend rejects the write, so a failed request can never show a false zero.
 *  - Realtime + 30s polling + window focus + cross-tab BroadcastChannel keep every
 *    session/tab/device converged.
 */
export interface NotificationRecord {
  id: string;
  recipient_id: string | null;
  type: string | null;
  title: string | null;
  body: string | null;
  lead_id: string | null;
  enquiry_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationCenter {
  items: NotificationRecord[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Mark one notification read (idempotent). */
  markRead: (id: string) => Promise<void>;
  /** Mark a specific set of notifications read (used when a panel opens). */
  markManyRead: (ids: string[]) => Promise<void>;
  /** Mark every currently-displayed unread notification read. */
  markDisplayedRead: () => Promise<void>;
  /** Mark ALL unread notifications read (bulk, scoped). */
  markAllRead: () => Promise<void>;
}

const FEED_LIMIT = 25;

export function useNotificationCenter(): NotificationCenter {
  const { user } = useAuth();
  const isStaffAdmin = isAdminRole(user?.role);
  const uid = user?.id ?? null;

  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef(false);
  const itemsRef = useRef<NotificationRecord[]>(items);
  const countRef = useRef<number>(unreadCount);
  itemsRef.current = items;
  countRef.current = unreadCount;

  const refresh = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      let feedQ = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(FEED_LIMIT);
      let countQ = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);
      if (!isStaffAdmin) {
        feedQ = feedQ.eq('recipient_id', uid);
        countQ = countQ.eq('recipient_id', uid);
      }
      const [feedRes, countRes] = await Promise.all([feedQ, countQ]);
      if (feedRes.error) throw feedRes.error;
      if (countRes.error) throw countRes.error;
      setItems((feedRes.data || []) as NotificationRecord[]);
      setUnreadCount(countRes.count ?? 0);
      setError(null);
    } catch {
      // Never zero the badge on a transient failure — keep the last good value
      // and surface a retryable error instead.
      setError('We could not load your notifications just now.');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [uid, isStaffAdmin]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Realtime: any change to a notification the user can see (RLS-scoped stream)
  // triggers an authoritative recount so the badge updates exactly once.
  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel('notification-center-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => { void refresh(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, () => { void refresh(); })
      .subscribe();
    const interval = window.setInterval(() => { void refresh(); }, 30000);
    const onFocus = () => { void refresh(); };
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      supabase.removeChannel(ch);
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [uid, refresh]);

  // Cross-tab / cross-panel sync from the shared read bus.
  useEffect(() => subscribeReadSync('notifications', () => { void refresh(); }), [refresh]);

  /** Persist a read for a set of ids with idempotent + scoped updates. */
  const persistRead = useCallback(async (ids: string[]): Promise<boolean> => {
    if (!uid || ids.length === 0) return true;
    let q = supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids)
      .eq('is_read', false); // idempotent guard — repeat clicks update 0 rows
    if (!isStaffAdmin) q = q.eq('recipient_id', uid);
    const { error: e } = await q;
    return !e;
  }, [uid, isStaffAdmin]);

  const markManyRead = useCallback(async (ids: string[]) => {
    if (!uid || ids.length === 0) return;
    const unreadIds = itemsRef.current
      .filter((n) => ids.includes(n.id) && !n.is_read)
      .map((n) => n.id);
    if (unreadIds.length === 0) return; // already read → no-op

    const prevItems = itemsRef.current;
    const prevCount = countRef.current;
    setItems((prev) => prev.map((n) => (unreadIds.includes(n.id) ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - unreadIds.length));

    const ok = await persistRead(unreadIds);
    if (!ok) {
      // Restore the accurate server snapshot rather than showing a false zero.
      setItems(prevItems);
      setUnreadCount(prevCount);
      setError('We could not update your notifications. Please try again.');
      await refresh();
      return;
    }
    broadcastReadSync('notifications');
    await refresh();
  }, [uid, persistRead, refresh]);

  const markRead = useCallback((id: string) => markManyRead([id]), [markManyRead]);

  const markDisplayedRead = useCallback(
    () => markManyRead(itemsRef.current.map((n) => n.id)),
    [markManyRead],
  );

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    const prevItems = itemsRef.current;
    const prevCount = countRef.current;
    if (prevCount === 0) return;
    setItems((prev) => prev.map((n) => (n.is_read ? n : { ...n, is_read: true })));
    setUnreadCount(0);

    let q = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);
    if (!isStaffAdmin) q = q.eq('recipient_id', uid);
    const { error: e } = await q;
    if (e) {
      setItems(prevItems);
      setUnreadCount(prevCount);
      setError('We could not update your notifications. Please try again.');
      await refresh();
      return;
    }
    broadcastReadSync('notifications');
    await refresh();
  }, [uid, isStaffAdmin, refresh]);

  return { items, unreadCount, loading, error, refresh, markRead, markManyRead, markDisplayedRead, markAllRead };
}