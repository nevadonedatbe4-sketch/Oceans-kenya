import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Total unread internal-messenger messages for the signed-in user, across all
 * of their non-archived, non-muted conversations. Feeds the sidebar badge on
 * both the admin portal (Team Messenger) and the agent portal (OGroup Messenger).
 *
 * Deliberately lightweight: aggregate count only, polls every 30s and refreshes
 * on any new message via Realtime. Degrades to the last good value on failure.
 */
export function useMessengerUnread(): { total: number; refresh: () => Promise<void> } {
  const { user } = useAuth();
  const [total, setTotal] = useState(0);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) { setTotal(0); return; }
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const { data: members, error } = await supabase
        .from('og_conversation_members')
        .select('conversation_id, last_read_at, muted_until, archived_at')
        .eq('user_id', user.id);
      if (error) throw error;

      const now = Date.now();
      const active = (members || []).filter(
        (m) => !m.archived_at && !(m.muted_until && new Date(m.muted_until).getTime() > now),
      );
      if (active.length === 0) { setTotal(0); return; }

      const counts = await Promise.all(
        active.map(async (m) => {
          const { count } = await supabase
            .from('og_messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', m.conversation_id)
            .is('deleted_at', null)
            .neq('sender_id', user.id)
            .gt('created_at', m.last_read_at ?? new Date(0).toISOString());
          return count || 0;
        }),
      );
      setTotal(counts.reduce((a, b) => a + b, 0));
    } catch {
      // Keep last good value on a transient failure.
    } finally {
      inFlight.current = false;
    }
  }, [user]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('og-unread-global');
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'og_messages' }, () => refresh())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'og_messages' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refresh]);

  return { total, refresh };
}