import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { NotificationItem } from './types';

// ─────────────────────────────────────────────────────────────
// Central notification source for the OGroup suite. The recipient_id is
// always the authenticated user (never supplied by the caller) and RLS
// (notifications_own) scopes reads/inserts to auth.uid(). Admins may also
// write via the notifications_admin_all policy for team-wide announcements.
// ─────────────────────────────────────────────────────────────

export function pushNotification(input: {
  recipient_id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  lead_id?: string | null;
  enquiry_id?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
}): Promise<void> {
  // Postgrest builders are thenables, not Promises, so wrap to get a real
  // Promise with .catch. Best-effort; never block the primary action.
  return Promise.resolve(
    supabase.from('notifications').insert({ ...input })
  ).then(() => undefined, () => undefined);
}

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const refresh = useCallback(async () => {
    if (!userIdRef.current) { setItems([]); setLoading(false); return; }
    try {
      setError(null);
      const { data, error: e } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userIdRef.current)
        .order('created_at', { ascending: false })
        .limit(50);
      if (e) throw e;
      setItems((data || []) as NotificationItem[]);
    } catch (err) {
      setError((err as Error).message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Realtime: new notifications for this user appear live.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel('og-notifications');
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => { void refresh(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, refresh]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const unread = items.filter((n) => !n.is_read).map((n) => n.id);
    if (!unread.length) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).in('id', unread);
  }, [userId, items]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }, []);

  const unreadCount = items.filter((n) => !n.is_read).length;

  return { items, loading, error, refresh, unreadCount, markRead, markAllRead };
}