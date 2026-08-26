import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';

export interface CrmCounters {
  inboxUnread: number;
  leadsUnread: number;
  enquiriesUnread: number;
  notificationsUnread: number;
}

const EMPTY: CrmCounters = {
  inboxUnread: 0,
  leadsUnread: 0,
  enquiriesUnread: 0,
  notificationsUnread: 0,
};

/**
 * Central unread counters for the CRM sidebar/header.
 * Pulls real counts from the database and polls so badges stay live without a manual refresh.
 */
export function useCrmCounters() {
  const { user } = useAuth();
  const { agentId } = useAgentProfile();
  const isAgent = user?.role === 'agent';
  const [counters, setCounters] = useState<CrmCounters>(EMPTY);

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    const uid = user.id;

    let enquiriesQ = supabase
      .from('enquiries')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('status', 'archived');

    let leadsQ = supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('is_archived', false)
      .eq('is_spam', false);

    if (isAgent && agentId) {
      enquiriesQ = enquiriesQ.eq('agent_id', agentId);
      leadsQ = leadsQ.eq('agent_id', agentId);
    }

    // Admins see all unread; agents see ONLY notifications addressed to them.
    // (No "general queue" fallback — an agent with nothing assigned sees zero.)
    let notifQ = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    if (isAgent) {
      notifQ = notifQ.eq('recipient_id', uid);
    }

    const [enqRes, leadsRes, notifRes] = await Promise.all([enquiriesQ, leadsQ, notifQ]);

    setCounters({
      inboxUnread: enqRes.count ?? 0,
      enquiriesUnread: enqRes.count ?? 0,
      leadsUnread: leadsRes.count ?? 0,
      notificationsUnread: notifRes.count ?? 0,
    });
  }, [user, isAgent, agentId]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 20000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  return { counters, refresh: fetchCounts };
}