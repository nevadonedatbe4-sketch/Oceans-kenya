import { createContext, useContext, useEffect, useCallback, useState, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface AgentCounts {
  /** Unread, non-archived/non-spam/non-trashed enquiries assigned to the agent. */
  inboxUnread: number;
  /** New/unread, non-archived/non-spam/non-trashed leads assigned to the agent. */
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
 * OGroup Agent Counts — the ONE authoritative Inbox/Leads badge source for the
 * Agent Portal (sidebar + header + dashboard). Counts come from the secured
 * `og-agent-counts` Edge Function which derives the agent purely from the
 * authenticated JWT — the client never sends an `agent_id`, so no cross-agent
 * leakage is possible. Realtime + a light polling fallback keep badges live
 * without a manual refresh, and the realtime stream is RLS-scoped so a user
 * only receives events for records they are permitted to see.
 */
export function AgentCountsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [inboxUnread, setInboxUnread] = useState(0);
  const [leadsUnread, setLeadsUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  const fetchCounts = useCallback(async () => {
    // Only fetch for an authenticated approved agent. Admins don't use the
    // agent portal badge system.
    if (!user || user.role !== 'agent') {
      setInboxUnread(0);
      setLeadsUnread(0);
      setLoading(false);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const { data, error } = await supabase.functions.invoke('og-agent-counts');
      if (error) throw error;
      const payload = (data ?? {}) as { inboxUnread?: number; leadsUnread?: number };
      setInboxUnread(payload.inboxUnread ?? 0);
      setLeadsUnread(payload.leadsUnread ?? 0);
    } catch (e) {
      // Non-fatal — keep last good counts on a transient failure.
      console.error('og-agent-counts failed:', e);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Realtime: refetch when a relevant row the agent can see changes. RLS gates
  // the stream, and the recount comes from the server-authoritative function.
  useEffect(() => {
    if (!user || user.role !== 'agent') return;
    const channel = supabase
      .channel('agent-counts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, () => { fetchCounts(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => { fetchCounts(); })
      .subscribe();

    // Light polling fallback so badges stay accurate even if a change is missed.
    const interval = setInterval(fetchCounts, 25000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, fetchCounts]);

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