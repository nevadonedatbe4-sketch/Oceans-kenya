import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, uploadFileViaEdgeFunction } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { fetchStaffDirectory } from './staffDirectory';
import type { StatusGroup, StatusItem } from './types';

/** Ready-made backgrounds for text statuses (Oceans palette, no blue/purple). */
export const STATUS_BACKGROUNDS = [
  'linear-gradient(135deg,#0d5959,#001731)',
  'linear-gradient(135deg,#7a5c2e,#3f2d16)',
  'linear-gradient(135deg,#0e7490,#082f49)',
  'linear-gradient(135deg,#7c2d12,#3f1d0b)',
  'linear-gradient(135deg,#1f2937,#0b1220)',
  'linear-gradient(135deg,#065f46,#022c22)',
];

interface PersonInfo {
  name: string;
  avatar?: string;
  country?: string;
  department?: string;
}

export async function fetchActiveStatuses(): Promise<StatusItem[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('og_status')
    .select('id, user_id, kind, body, image_url, background, created_at, expires_at')
    .gt('expires_at', now)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as StatusItem[];
}

async function fetchViewedIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('og_status_views').select('status_id');
  if (error) return new Set();
  return new Set((data || []).map((r: { status_id: string }) => r.status_id));
}

/** Who has seen one of my statuses (used in the viewer for my own updates). */
export async function fetchStatusViewers(statusId: string): Promise<{ user_id: string; viewed_at: string }[]> {
  const { data, error } = await supabase
    .from('og_status_views')
    .select('user_id, viewed_at')
    .eq('status_id', statusId)
    .order('viewed_at', { ascending: true });
  if (error) return [];
  return (data || []) as { user_id: string; viewed_at: string }[];
}

export async function markStatusViewed(statusId: string, viewerId: string): Promise<void> {
  await supabase
    .from('og_status_views')
    .upsert({ status_id: statusId, viewer_id: viewerId, viewed_at: new Date().toISOString() }, { onConflict: 'status_id,viewer_id' });
}

export async function deleteStatus(statusId: string): Promise<void> {
  const { error } = await supabase.from('og_status').delete().eq('id', statusId);
  if (error) throw error;
}

export async function postTextStatus(userId: string, body: string, background: string): Promise<void> {
  const { error } = await supabase.from('og_status').insert({
    user_id: userId,
    kind: 'text',
    body: body.trim(),
    background,
  });
  if (error) throw error;
}

export async function postImageStatus(userId: string, file: File, caption: string): Promise<void> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const res = await uploadFileViaEdgeFunction(
    file,
    `ogroup/status/${userId}/${Date.now()}.${ext}`,
    'media-library',
  );
  const { error } = await supabase.from('og_status').insert({
    user_id: userId,
    kind: 'image',
    body: caption.trim() || null,
    image_url: res.url,
  });
  if (error) throw error;
}

interface StatusFeed {
  groups: StatusGroup[];
  others: StatusGroup[];
  mine: StatusGroup | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Live feed of the team's active statuses (24h window), grouped by author and
 * ranked so unseen updates float to the top. Real-time streamed so a new
 * status appears without a refresh, and scoped to authorized staff by RLS.
 */
export function useStatusFeed(): StatusFeed {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [viewed, setViewed] = useState<Set<string>>(new Set());
  const [people, setPeople] = useState<Record<string, PersonInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const peopleRef = useRef(people);
  peopleRef.current = people;

  const loadPeople = useCallback(async () => {
    try {
      const rows = await fetchStaffDirectory();
      const map: Record<string, PersonInfo> = {};
      rows.forEach((p) => {
        map[p.user_id] = {
          name: p.name || 'Team member',
          avatar: p.avatar_url || undefined,
          country: p.country || undefined,
          department: p.department || undefined,
        };
      });
      setPeople(map);
    } catch {
      // Names are best-effort; rows still render with a generic label.
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [items, viewedIds] = await Promise.all([fetchActiveStatuses(), fetchViewedIds()]);
      setStatuses(items);
      setViewed(viewedIds);
    } catch (e) {
      setError((e as Error)?.message || 'Could not load statuses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPeople(); }, [loadPeople]);
  useEffect(() => { refresh(); }, [refresh]);

  // Live updates: a new/removed status anywhere in the org refreshes the feed.
  useEffect(() => {
    const channel = supabase
      .channel('og-status-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'og_status' }, () => { refresh(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  const groups = useMemo<StatusGroup[]>(() => {
    const byUser = new Map<string, StatusItem[]>();
    statuses.forEach((s) => {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
      byUser.get(s.user_id)!.push(s);
    });
    const out: StatusGroup[] = [];
    byUser.forEach((items, userId) => {
      const sorted = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const p = people[userId];
      out.push({
        user_id: userId,
        name: p?.name || 'Team member',
        avatar_url: p?.avatar,
        country: p?.country,
        department: p?.department,
        items: sorted,
        latestAt: sorted[sorted.length - 1].created_at,
        unseenCount: sorted.filter((s) => !viewed.has(s.id)).length,
      });
    });
    return out;
  }, [statuses, viewed, people]);

  const mine = groups.find((g) => g.user_id === user?.id) || null;
  const others = groups
    .filter((g) => g.user_id !== user?.id)
    .sort((a, b) => {
      if ((a.unseenCount > 0) !== (b.unseenCount > 0)) return a.unseenCount > 0 ? -1 : 1;
      return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
    });

  return { groups, others, mine, loading, error, refresh };
}