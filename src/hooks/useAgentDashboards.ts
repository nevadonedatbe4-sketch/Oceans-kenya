import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface AgentDashboardRecord {
  agentId: string;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string | null;
  listings: number;
  published: number;
  pending: number;
  leads: number;
  enquiries: number;
  deals: number;
  dealsWon: number;
  dealsLost: number;
  pipelineValue: number;
  closedValue: number;
  lastActivity: string | null;
}

interface AgentRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string | null;
}

interface DealsRow {
  agent_id: string | null;
  status: string | null;
  price: number | null;
  commission: number | null;
}

const DEAL_WON = ['won', 'closed_won', 'closed'];
const DEAL_LOST = ['lost', 'closed_lost'];

function dealsValue(r: DealsRow): number {
  if (r.price && r.price > 0) return Number(r.price);
  if (r.commission && r.commission > 0) return Number(r.commission);
  return 0;
}

/**
 * Admin-side agent overview. Returns every agent registered in the `agents`
 * table together with their own scoped stats (never global), so the Super
 * Admin can inspect individual agent performance from inside the Admin portal.
 */
export function useAgentDashboards() {
  const [agents, setAgents] = useState<AgentDashboardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: agentRows, error: agentErr } = await supabase
        .from('agents')
        .select('id, name, email, phone, title, avatar_url, is_active, created_at')
        .order('name', { ascending: true });

      if (agentErr) throw new Error(agentErr.message);
      const rows = (agentRows || []) as AgentRow[];
      const ids = rows.map((r) => r.id);

      if (ids.length === 0) {
        setAgents([]);
        setLoading(false);
        return;
      }

      // Fetch each agent-scoped table in parallel (only the columns needed).
      const [listingRes, leadRes, enquiryRes, dealRes] = await Promise.all([
        supabase.from('listings').select('agent_id, is_published, is_pending').in('agent_id', ids),
        supabase.from('leads').select('agent_id').in('agent_id', ids),
        supabase.from('enquiries').select('agent_id, created_at').in('agent_id', ids),
        supabase.from('deals').select('agent_id, price, commission, status').in('agent_id', ids),
      ]);

      const listingRows = (listingRes.data || []) as { agent_id: string | null; is_published: boolean | null; is_pending: boolean | null }[];
      const leadRows = (leadRes.data || []) as { agent_id: string | null }[];
      const enquiryRows = (enquiryRes.data || []) as { agent_id: string | null; created_at: string | null }[];
      const dealRows = (dealRes.data || []) as DealsRow[];

      const count = <T,>(arr: T[], fn: (x: T) => boolean) => arr.filter(fn).length;

      const decorated: AgentDashboardRecord[] = rows.map((a) => {
        const myListings = listingRows.filter((l) => l.agent_id === a.id);
        const myLeads = leadRows.filter((l) => l.agent_id === a.id);
        const myEnquiries = enquiryRows.filter((e) => e.agent_id === a.id);
        const myDeals = dealRows.filter((d) => d.agent_id === a.id);

        const pipelineValue = myDeals
          .filter((d) => !DEAL_WON.includes((d.status || '').toLowerCase()) && !DEAL_LOST.includes((d.status || '').toLowerCase()))
          .reduce((sum, d) => sum + dealsValue(d), 0);
        const closedValue = myDeals
          .filter((d) => DEAL_WON.includes((d.status || '').toLowerCase()))
          .reduce((sum, d) => sum + dealsValue(d), 0);

        const latestActivity = myEnquiries
          .map((e) => e.created_at)
          .filter(Boolean)
          .sort()
          .at(-1) || null;

        return {
          agentId: a.id,
          name: a.name,
          email: a.email,
          phone: a.phone,
          title: a.title,
          avatar_url: a.avatar_url,
          is_active: a.is_active,
          created_at: a.created_at,
          listings: myListings.length,
          published: count(myListings, (l) => l.is_published === true),
          pending: count(myListings, (l) => l.is_pending === true),
          leads: myLeads.length,
          enquiries: myEnquiries.length,
          deals: myDeals.length,
          dealsWon: count(myDeals, (d) => DEAL_WON.includes((d.status || '').toLowerCase())),
          dealsLost: count(myDeals, (d) => DEAL_LOST.includes((d.status || '').toLowerCase())),
          pipelineValue,
          closedValue,
          lastActivity: latestActivity,
        };
      });

      setAgents(decorated);
    } catch (e: any) {
      setError(e?.message || 'Failed to load agent dashboards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { agents, loading, error, fetchAll };
}