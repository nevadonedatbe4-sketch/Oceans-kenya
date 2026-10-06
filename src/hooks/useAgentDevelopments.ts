import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAgentProfile } from '@/hooks/useAgentProfile';

/**
 * A single row of the authenticated agent's OWN New Developments.
 * Deliberately narrow: only real, owner-scoped columns are selected.
 */
export interface AgentDevelopmentRow {
  id: string;
  title: string;
  slug: string;
  location: string;
  developer_name: string;
  development_status: string;
  price: number;
  currency: string;
  total_units: number;
  is_published: boolean;
  is_featured: boolean;
  main_image: string;
  cover_image: string;
  created_at: string;
  unitTypes: { name: string; bedrooms: number }[];
}

export interface AgentDevelopmentStats {
  total: number;
  published: number;
  draft: number;
  featured: number;
}

const SELECT =
  'id, title, slug, location, developer_name, development_status, price, currency, ' +
  'total_units, is_published, is_featured, main_image, cover_image, created_at, ' +
  'unit_types(name, bedrooms)';

const EMPTY_STATS: AgentDevelopmentStats = { total: 0, published: 0, draft: 0, featured: 0 };

export interface UseAgentDevelopmentsReturn {
  developments: AgentDevelopmentRow[];
  stats: AgentDevelopmentStats;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches ONLY the authenticated agent's own New Developments.
 *
 * The agent identity comes from the profile lookup (never from the client),
 * and the ownership filter is applied at the QUERY level (`agent_id = ?`), so
 * unauthorised developments are never returned to the agent client — even
 * published records that belong to another agent. This is backed by the
 * `developments_agent_own` RLS policy as a second line of defence.
 */
export function useAgentDevelopments(): UseAgentDevelopmentsReturn {
  const { agentId } = useAgentProfile();
  const [developments, setDevelopments] = useState<AgentDevelopmentRow[]>([]);
  const [stats, setStats] = useState<AgentDevelopmentStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevelopments = useCallback(async () => {
    if (!agentId) {
      setDevelopments([]);
      setStats(EMPTY_STATS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('developments')
        .select(SELECT)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      const rows: AgentDevelopmentRow[] = ((data || []) as unknown as Record<string, unknown>[]).map((r) => ({
        id: String(r.id),
        title: String(r.title || ''),
        slug: String(r.slug || ''),
        location: String(r.location || ''),
        developer_name: String(r.developer_name || ''),
        development_status: String(r.development_status || ''),
        price: Number(r.price) || 0,
        currency: String(r.currency || 'KES'),
        total_units: Number(r.total_units) || 0,
        is_published: Boolean(r.is_published),
        is_featured: Boolean(r.is_featured),
        main_image: String(r.main_image || ''),
        cover_image: String(r.cover_image || ''),
        created_at: String(r.created_at || ''),
        unitTypes: Array.isArray(r.unit_types)
          ? (r.unit_types as { name?: unknown; bedrooms?: unknown }[]).map((u) => ({
              name: String(u.name || ''),
              bedrooms: Number(u.bedrooms) || 0,
            }))
          : [],
      }));

      setDevelopments(rows);
      setStats({
        total: rows.length,
        published: rows.filter((r) => r.is_published).length,
        draft: rows.filter((r) => !r.is_published).length,
        featured: rows.filter((r) => r.is_featured).length,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load your developments';
      setError(message);
      setDevelopments([]);
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchDevelopments();
  }, [fetchDevelopments]);

  return { developments, stats, loading, error, refetch: fetchDevelopments };
}