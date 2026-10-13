import { createContext, useContext, useEffect, useCallback, useState, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/authz';

export interface AgentCounts {
  /** Unread incoming enquiries for the current user (agent = own, admin = all). */
  inboxUnread: number;
  /** Unread leads for the current user (agent = own, admin = all). */
  leadsUnread: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

const EMPTY: Omit<AgentCounts, 'loading' | 'refresh'> = {
  inboxUnread: 0,
  leadsUnread: 0,
};

const AgentCountsContext = createContext<AgentCounts | undefined>(undefined);

/**
 * Inbox + Leads badge counts — ONE authoritative source for both the Agent and
 * the Admin portals.
 *
 * Counts come from the secured `og_unread_badges` RPC, which:
 *  - derives the caller from `auth.uid()` (the client can never ask for someone
 *    else's counts), and
 *  - resolves scope server-side: an agent sees only their OWN records; an
 *    admin/super_admin sees the whole team's records. RLS backs this up.
 *
 * Read state is tracked PER RECIPIENT via `lead_reads` / `enquiry_reads`, so an
 * admin opening a lead never clears the assigned agent's unread (and vice-versa).
 * Realtime + a light polling fallback keep badges live without a manual refresh.
 */
export function AgentCountsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [inboxUnread, setInboxUnread] = useState(0);
  const [leadsUnread, setLeadsUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  const eligible = !!user && !!(user.role === 'agent' || isAdminRole(user.role));

  const fetchCounts = useCallback(async () => {
    // Only fetch for an authenticated agent or admin. Everyone else sees zero.
    if (!eligible) {
      setInboxUnread(0);
      setLeadsUnread(0);
      setLoading(false);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const { data, error } = await supabase.rpc('og_unread_badges');
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as
        | { inbox_unread?: number | string; leads_unread?: number | string }
        | null;
      setInboxUnread(Number(row?.inbox_unread ?? 0));
      setLeadsUnread(Number(row?.leads_unread ?? 0));
    } catch (e) {
      // Non-fatal — keep last good counts on a transient failure.
      console.error('og_unread_badges failed:', e);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [eligible]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Realtime: refetch when a relevant row changes. RLS gates the stream so a
  // recipient only receives events for records they are permitted to see. We
  // also watch the per-recipient read tables so a read persisted on another
  // device/tab (which may not change is_read) still reconciles this badge.
  useEffect(() => {
    if (!eligible) return;
    const channel = supabase
      .channel('agent-counts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, () => { fetchCounts(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => { fetchCounts(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiry_reads' }, () => { fetchCounts(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_reads' }, () => { fetchCounts(); })
      .subscribe();

    // Light polling fallback so badges stay accurate even if a change is missed.
    const interval = setInterval(fetchCounts, 25000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [eligible, fetchCounts]);

  return (
    <AgentCountsContext.Provider value={{ inboxUnread, leadsUnread, loading, refresh: fetchCounts }}>
      {children}
    </AgentCountsContext.Provider>
  );
}

export function useAgentCounts(): AgentCounts {
  const ctx = useContext(AgentCountsContext);
  if (!ctx) {
    // Fallback for components rendered outside the provider: static zero state.
    return { ...EMPTY, loading: false, refresh: async () => {} };
  }
  return ctx;
}