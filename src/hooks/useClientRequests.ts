import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  fetchRequests,
  fetchRequest,
  fetchMatches,
  fetchActivity,
  computeMatches,
  resetAndRecomputeMatches,
  saveRequest,
  logActivity,
  type ClientRequest,
  type ClientMatch,
  type RequestActivity,
} from '@/lib/clientRequestsApi';

/** Lightweight agent directory for assignment dropdowns. */
export interface AgentLite {
  id: string;
  name: string;
}

export function useAgentDirectory() {
  const [agents, setAgents] = useState<AgentLite[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('agents')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        setAgents((data || []) as AgentLite[]);
      } catch {
        setAgents([]);
      }
    })();
  }, []);
  return agents;
}

/** The full request list (admin sees all; an agent sees only their own via RLS). */
export function useClientRequestsList() {
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRequests();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load client requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { requests, loading, error, refresh: load };
}

/**
 * A single request workspace: the request, its stored matches and its activity.
 * Optionally recomputes matches on open (data-refresh fallback for the
 * event-driven recalculation).
 */
export function useClientRequest(id: string | undefined, opts?: { autoCompute?: boolean }) {
  const [request, setRequest] = useState<ClientRequest | null>(null);
  const [matches, setMatches] = useState<ClientMatch[]>([]);
  const [activity, setActivity] = useState<RequestActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const req = await fetchRequest(id);
      if (!req) {
        setError('This client request could not be found or you do not have access to it.');
        setRequest(null);
        return;
      }
      setRequest(req);
      const [m, a] = await Promise.all([fetchMatches(id), fetchActivity(id)]);
      setMatches(m);
      setActivity(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this client request.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const recompute = useCallback(async () => {
    if (!id) return;
    setComputing(true);
    try {
      const fresh = await fetchRequest(id);
      if (!fresh) return;
      const updated = await computeMatches(fresh);
      setMatches(updated);
      setRequest((prev) => (prev ? { ...prev, last_activity_at: new Date().toISOString(), matches_stale: false } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh matches.');
    } finally {
      setComputing(false);
    }
  }, [id]);

  // Optimistic, in-place patch of a single stored match — lets the UI mark
  // shortlist / shared instantly without reloading the whole match list.
  const patchMatch = useCallback((matchId: string, patch: Partial<ClientMatch>) => {
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, ...patch } : m)));
  }, []);

  // Hard reset: wipe stored matches (incl. shortlists/shares/feedback) and
  // recompute a completely fresh result set from the live inventory.
  const hardReset = useCallback(async () => {
    if (!id) return;
    setComputing(true);
    try {
      const fresh = await fetchRequest(id);
      if (!fresh) return;
      const updated = await resetAndRecomputeMatches(fresh);
      setMatches(updated);
      setRequest((prev) => (prev ? { ...prev, last_activity_at: new Date().toISOString(), matches_stale: false } : prev));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset matches.');
      throw err;
    } finally {
      setComputing(false);
    }
  }, [id]);

  // Refresh matches automatically when a request opens with no stored results,
  // or when inventory changes flagged the stored matches as stale.
  useEffect(() => {
    if (!opts?.autoCompute || !id || loading || !request) return;
    const needs = matches.length === 0 || request.matches_stale === true;
    if (needs && !computing) {
      void recompute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, request?.id, request?.matches_stale, matches.length]);

  return { request, matches, activity, loading, computing, error, refresh: load, recompute, hardReset, patchMatch };
}

/** Re-export for pages that save a request then log activity. */
export { saveRequest, logActivity };