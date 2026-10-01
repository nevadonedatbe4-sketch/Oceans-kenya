import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Typer {
  userId: string;
  name: string;
}

/**
 * Ephemeral "X is typing…" signals for a single conversation, carried over a
 * Realtime broadcast channel. No database writes — presence of a typer expires
 * automatically a few seconds after their last keystroke.
 */
export function useTypingIndicator(
  convId: string | null,
  user: { id: string; name: string } | null,
): { typers: Typer[]; notifyTyping: () => void } {
  const [typers, setTypers] = useState<Typer[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSent = useRef(0);
  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const userId = user?.id;
  const userName = user?.name;

  useEffect(() => {
    if (!convId || !userId) { setTypers([]); return; }
    // Ordinary (public) broadcast channel — the same mode this app's working
    // realtime uses. A `private: true` channel is silently refused unless
    // Realtime Authorization is fully wired, which would kill the typing dots.
    const channel = supabase.channel(`og-typing-${convId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const p = payload as { user_id?: string; name?: string } | null;
      if (!p?.user_id || p.user_id === userId) return;
      const uid = p.user_id;
      const nm = p.name || 'Someone';
      setTypers((prev) => (prev.some((t) => t.userId === uid) ? prev : [...prev, { userId: uid, name: nm }]));
      if (timeouts.current[uid]) clearTimeout(timeouts.current[uid]);
      timeouts.current[uid] = setTimeout(() => {
        setTypers((prev) => prev.filter((t) => t.userId !== uid));
      }, 4000);
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      Object.values(timeouts.current).forEach(clearTimeout);
      timeouts.current = {};
      channelRef.current = null;
      setTypers([]);
    };
  }, [convId, userId]);

  const notifyTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;
    const now = Date.now();
    if (now - lastSent.current < 1800) return;
    lastSent.current = now;
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: userId, name: userName || 'Someone' },
    });
  }, [userId, userName]);

  return { typers, notifyTyping };
}