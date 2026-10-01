import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAgentProfile } from '@/hooks/useAgentProfile';

export interface AgentPerformanceData {
  totalListings: number;
  publishedListings: number;
  pendingListings: number;
  draftListings: number;
  totalLeads: number;
  newLeadsInRange: number;
  unreadLeads: number;
  totalEnquiries: number;
  unreadEnquiries: number;
  pipelineValue: number;
  activeDeals: number;
  dealsWon: number;
  dealsLost: number;
  leadSources: { source: string; count: number }[];
  leadStages: { stage: string; count: number }[];
  topListings: { id: string; title: string; views: number }[];
}

const EMPTY: AgentPerformanceData = {
  totalListings: 0,
  publishedListings: 0,
  pendingListings: 0,
  draftListings: 0,
  totalLeads: 0,
  newLeadsInRange: 0,
  unreadLeads: 0,
  totalEnquiries: 0,
  unreadEnquiries: 0,
  pipelineValue: 0,
  activeDeals: 0,
  dealsWon: 0,
  dealsLost: 0,
  leadSources: [],
  leadStages: [],
  topListings: [],
};

/**
 * Agent-scoped performance analytics.
 * Every query is scoped by agent_id — an agent can NEVER see global stats.
 * Views are counted only for listings owned by this agent.
 */
export function useAgentPerformance(from: string, to: string) {
  const { agentId } = useAgentProfile();
  const [data, setData] = useState<AgentPerformanceData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!agentId) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rangeFrom = `${from}T00:00:00`;
      const rangeTo = `${to}T23:59:59`;

      // ── Agent's listings (scoped) ──────────────────────────────
      const { data: listingRows } = await supabase
        .from('listings')
        .select('id,title,is_published,is_pending,is_featured')
        .eq('agent_id', agentId);

      const listingIds = (listingRows || []).map((l) => l.id);

      // ── Agent's leads (scoped, date-filtered) ──────────────────
      const { data: leadsData } = await supabase
        .from('leads')
        .select('created_at,status,source,is_read')
        .eq('agent_id', agentId)
        .gte('created_at', rangeFrom)
        .lte('created_at', rangeTo);

      // ── Lead counts (all-time, scoped) ─────────────────────────
      const leadCountQ = supabase
        .from('leads')
        .select('id,is_read', { count: 'exact', head: false })
        .eq('agent_id', agentId);

      // ── Agent's enquiries (scoped, date-filtered) ──────────────
      const enquiriesQ = supabase
        .from('enquiries')
        .select('id,is_read', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      // ── Agent's deals (scoped) ─────────────────────────────────
      const { data: dealsData } = await supabase
        .from('deals')
        .select('created_at,status,price')
        .eq('agent_id', agentId);

      const activeDealStatuses = ['prospect', 'negotiation', 'offer', 'due_diligence'];
      const agentDeals = dealsData || [];
      const pipelineValue = agentDeals
        .filter((d) => activeDealStatuses.includes(d.status))
        .reduce((sum, d) => sum + (Number(d.price) || 0), 0);
      const dealsWon = agentDeals.filter((d) => d.status === 'closed_won').length;
      const dealsLost = agentDeals.filter((d) => d.status === 'closed_lost').length;

      // ── Lead sources (agent's leads) ────────────────────────────
      const sourceMap = new Map<string, number>();
      (leadsData || []).forEach((l) => {
        const src = l.source || 'Unknown';
        sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
      });
      const leadSources = Array.from(sourceMap.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      // ── Lead stages (agent's leads) ─────────────────────────────
      const leadStages = (leadsData || []).reduce((acc, l) => {
        acc.set(l.status, (acc.get(l.status) || 0) + 1);
        return acc;
      }, new Map<string, number>());
      const leadStageArr = Array.from(leadStages.entries())
        .map(([stage, count]) => ({ stage, count }))
        .sort((a, b) => b.count - a.count);

      // ── Top listings by views (agent's listings only) ──────────
      let topListings: { id: string; title: string; views: number }[] = [];
      if (listingIds.length > 0) {
        const { data: viewEvents } = await supabase
          .from('analytics_events')
          .select('property_id,listing_id')
          .in('listing_id', listingIds)
          .gte('created_at', rangeFrom)
          .lte('created_at', rangeTo);

        const viewCounts = new Map<string, number>();
        (viewEvents || []).forEach((e) => {
          const id = e.listing_id || e.property_id;
          if (id) viewCounts.set(id, (viewCounts.get(id) || 0) + 1);
        });

        const sorted = Array.from(viewCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const allListingIds = Array.from(viewCounts.keys());
        if (sorted.length > 0) {
          const { data: titles } = await supabase
            .from('listings')
            .select('id,title')
            .eq('agent_id', agentId)
            .in('id', allListingIds);
          const titleMap = new Map((titles || []).map((l) => [l.id, l.title]));
          topListings = sorted.map(([id, views]) => ({
            id,
            title: titleMap.get(id) || 'Listing',
            views,
          }));
        }
      }

      // Enquiries counts
      const { count: totalEnquiries } = await enquiriesQ;

      setData({
        totalListings: (listingRows || []).length,
        publishedListings: (listingRows || []).filter((l) => l.is_published).length,
        pendingListings: (listingRows || []).filter((l) => !l.is_published && l.is_pending).length,
        draftListings: (listingRows || []).filter((l) => !l.is_published && !l.is_pending).length,
        totalLeads: (leadsData || []).length,
        newLeadsInRange: (leadsData || []).length,
        unreadLeads: (leadsData || []).filter((l) => !l.is_read).length,
        totalEnquiries: totalEnquiries ?? 0,
        unreadEnquiries: 0,
        pipelineValue,
        activeDeals: agentDeals.filter((d) => activeDealStatuses.includes(d.status)).length,
        dealsWon,
        dealsLost,
        leadSources,
        leadStages: leadStageArr,
        topListings,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load your performance data';
      setError(message);
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [agentId, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}