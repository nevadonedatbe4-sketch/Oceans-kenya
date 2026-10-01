import { useState, useEffect, useCallback } from 'react';
import { supabase, supabaseUrl, supabaseKey } from '@/lib/supabase';

export interface ManagedAgent {
  agentId: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string | null;
  /** profile status: pending | active | rejected | suspended | deletion_* */
  accountStatus: string;
  /** profile role: agent | admin | super_admin */
  role: string;
  listings: number;
  published: number;
  pending: number;
  leads: number;
  enquiries: number;
  deals: number;
  dealsWon: number;
  lastActivity: string | null;
}

interface AgentRow {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string | null;
}

const DEAL_WON = ['won', 'closed_won', 'closed'];
const DEAL_LOST = ['lost', 'closed_lost'];

function dealsValue(r: { price: number | null; commission: number | null }): number {
  if (r.price && r.price > 0) return Number(r.price);
  if (r.commission && r.commission > 0) return Number(r.commission);
  return 0;
}

/**
 * Admin-side agent management. Fetches every agent from the `agents` table
 * plus their authoritative profile status and OWN scoped operational counts.
 * All counts are scoped to each agent — never global.
 */
export function useAgentManagement(search: string, filter: string) {
  const [agents, setAgents] = useState<ManagedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: agentRows, error: agentErr } = await supabase
        .from('agents')
        .select('id, user_id, name, email, phone, title, avatar_url, is_active, created_at')
        .order('name', { ascending: true });

      if (agentErr) throw new Error(agentErr.message);
      const rows = (agentRows || []) as AgentRow[];
      const ids = rows.map((r) => r.id);

      // Profile status + role (authoritative account state)
      let statusMap = new Map<string, string>();
      let roleMap = new Map<string, string>();
      const userIds = rows.map((r) => r.user_id).filter(Boolean) as string[];
      if (userIds.length > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('user_id, status, role')
          .in('user_id', userIds);
        (profileRows || []).forEach((p) => {
          statusMap.set(p.user_id, p.status);
          if (p.role) roleMap.set(p.user_id, p.role);
        });
      }

      if (ids.length === 0) {
        setAgents([]);
        setLoading(false);
        return;
      }

      const [listingRes, leadRes, enquiryRes, dealRes] = await Promise.all([
        supabase.from('listings').select('agent_id, is_published, is_pending').in('agent_id', ids),
        supabase.from('leads').select('agent_id').in('agent_id', ids),
        supabase.from('enquiries').select('agent_id, created_at').in('agent_id', ids),
        supabase.from('deals').select('agent_id, price, commission, status').in('agent_id', ids),
      ]);

      const listingRows = (listingRes.data || []) as { agent_id: string | null; is_published: boolean | null; is_pending: boolean | null }[];
      const leadRows = (leadRes.data || []) as { agent_id: string | null }[];
      const enquiryRows = (enquiryRes.data || []) as { agent_id: string | null; created_at: string | null }[];
      const dealRows = (dealRes.data || []) as { agent_id: string | null; price: number | null; commission: number | null; status: string | null }[];

      const decorated: ManagedAgent[] = rows.map((a) => {
        const myListings = listingRows.filter((l) => l.agent_id === a.id);
        const myLeads = leadRows.filter((l) => l.agent_id === a.id);
        const myEnquiries = enquiryRows.filter((e) => e.agent_id === a.id);
        const myDeals = dealRows.filter((d) => d.agent_id === a.id);

        const latestActivity = myEnquiries
          .map((e) => e.created_at)
          .filter(Boolean)
          .sort()
          .at(-1) || null;

        return {
          agentId: a.id,
          userId: a.user_id,
          name: a.name,
          email: a.email,
          phone: a.phone,
          title: a.title,
          avatar_url: a.avatar_url,
          is_active: a.is_active,
          created_at: a.created_at,
          accountStatus: a.user_id ? statusMap.get(a.user_id) || 'unknown' : 'no_account',
          role: a.user_id ? roleMap.get(a.user_id) || 'agent' : 'agent',
          listings: myListings.length,
          published: myListings.filter((l) => l.is_published === true).length,
          pending: myListings.filter((l) => l.is_pending === true).length,
          leads: myLeads.length,
          enquiries: myEnquiries.length,
          deals: myDeals.length,
          dealsWon: myDeals.filter((d) => DEAL_WON.includes((d.status || '').toLowerCase())).length,
          lastActivity: latestActivity,
        };
      });

      // Filter
      let result = decorated;
      const t = search.trim().toLowerCase();
      if (t) {
        result = result.filter((a) => [a.name, a.email, a.phone, a.title, a.accountStatus].filter(Boolean).some((v) => String(v).toLowerCase().includes(t)));
      }
      if (filter !== 'all') {
        if (filter === 'active') result = result.filter((a) => a.accountStatus === 'active');
        else if (filter === 'pending') result = result.filter((a) => a.accountStatus === 'pending');
        else if (filter === 'suspended') result = result.filter((a) => a.accountStatus === 'suspended' || a.accountStatus === 'rejected');
        else if (filter === 'deletion') result = result.filter((a) => a.accountStatus.startsWith('deletion'));
      }

      setAgents(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const setStatus = useCallback(async (userId: string, action: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${supabaseUrl}/functions/v1/set-agent-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetUserId: userId, action }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
    return json;
  }, []);

  // Server-authorised role change. Only a super_admin may change an account's
  // role — the backend enforces this. The agent's profile record is updated to
  // agent / admin / super_admin, which the auth layer uses to grant access.
  const setRole = useCallback(async (userId: string, role: string, name?: string | null) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${supabaseUrl}/functions/v1/set-agent-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetUserId: userId, role, name }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
    return json;
  }, []);

  // Server-authorised PERMANENT deletion. Only a super_admin may delete — the
  // backend enforces this. Removes the agent record, profile and auth login,
  // while detaching any listings/leads/deals so no data is lost.
  const deleteAgent = useCallback(async (agentId: string, userId: string | null) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${supabaseUrl}/functions/v1/delete-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ agentId, targetUserId: userId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
    return json;
  }, []);

  return { agents, loading, error, fetchAll, setStatus, setRole, deleteAgent };
}