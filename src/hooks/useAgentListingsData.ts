import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAgentProfile } from '@/hooks/useAgentProfile';

export interface AgentListing {
  id: string;
  title: string;
  location: string | null;
  neighbourhood: string | null;
  property_type: string | null;
  purpose: string | null;
  price: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  is_published: boolean;
  is_pending: boolean;
  is_featured: boolean;
  status: string | null;
  created_at: string;
  main_image: string | null;
  images: string[] | null;
  slug: string | null;
  agent_id: string | null;
}

export interface AgentListingStats {
  total: number;
  published: number;
  pending: number;
  draft: number;
  featured: number;
}

const SELECT = 'id,title,location,neighbourhood,property_type,purpose,price,currency,bedrooms,bathrooms,is_published,is_pending,is_featured,status,created_at,main_image,images,slug,agent_id';

const EMPTY_STATS: AgentListingStats = { total: 0, published: 0, pending: 0, draft: 0, featured: 0 };

export interface UseAgentListingsReturn {
  listings: AgentListing[];
  stats: AgentListingStats;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches ONLY the authenticated agent's listings (scoped by agent_id).
 * The ownership id comes from the profile lookup, never from the client.
 */
export function useAgentListingsData(): UseAgentListingsReturn {
  const { agentId } = useAgentProfile();
  const [listings, setListings] = useState<AgentListing[]>([]);
  const [stats, setStats] = useState<AgentListingStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    if (!agentId) {
      setListings([]);
      setStats(EMPTY_STATS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('listings')
        .select(SELECT)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const rows = (data || []) as AgentListing[];
      setListings(rows);
      setStats({
        total: rows.length,
        published: rows.filter((r) => r.is_published).length,
        pending: rows.filter((r) => !r.is_published && r.is_pending).length,
        draft: rows.filter((r) => !r.is_published && !r.is_pending).length,
        featured: rows.filter((r) => r.is_featured).length,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load your listings';
      setError(message);
      setListings([]);
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return { listings, stats, loading, error, refetch: fetchListings };
}