import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface AdminActivityEntry {
  id: string;
  user_name: string | null;
  action: string | null;
  module: string | null;
  record_title: string | null;
  created_at: string;
}

export interface AdminCounts {
  /** Unread notifications (all recipients — admin-wide). */
  notificationsUnread: number;
  /** Unread, non-archived enquiries (admin-wide). */
  inboxUnread: number;
  /** New/unread, non-archived/non-spam leads (admin-wide). */
  leadsUnread: number;
  /** Count of activity-log events newer than the last "seen" timestamp. */
  alertsCount: number;
  /** Most recent activity-log entries for the Alerts dropdown feed. */
  recentActivity: AdminActivityEntry[];
  loading: boolean;
  /** Record the current time as the Alerts "seen" boundary and refresh counts. */
  markAlertsSeen: () => void;
  refresh: () => Promise<void>;
}

const EMPTY: AdminCounts = {
  notificationsUnread: 0,
  inboxUnread: 0,
  leadsUnread: 0,
  alertsCount: 0,
  recentActivity: [],
  loading: true,
  markAlertsSeen: () => {},
  refresh: async () => {},
};

const LAST_SEEN_KEY = 'admin-alerts-last-seen';
// Default "seen" boundary: 24h ago on first visit so the badge shows a useful
// starting status glance instead of being empty.
const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

function readLastSeen(): number {
  const raw = localStorage.getItem(LAST_SEEN_KEY);
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return Date.now() - DEFAULT_WINDOW_MS;
}

/**
 * Admin-wide live counters + the Alerts activity feed for the admin portal
 * header pills. Admins see every unread notification/enquiry/lead (no agent
 * scoping). Polls every 20s so badges stay live without a manual refresh.
 *
 * The Alerts badge reflects the activity-log feed: it counts entries newer than
 * the last-seen boundary ("mark all as seen"). This keeps the audit trail
 * immutable — we never mutate activity_logs, just advance a local marker.
 */
export function useAdminCounts(): AdminCounts {
  const [counts, setCounts] = useState<Omit<AdminCounts, 'loading' | 'markAlertsSeen' | 'refresh'>>({
    notificationsUnread: 0,
    inboxUnread: 0,
    leadsUnread: 0,
    alertsCount: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const lastSeenRef = useRef<number>(readLastSeen());
  const inFlight = useRef(false);

  const fetchCounts = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const [notifRes, enqRes, leadsRes, actRes] = await Promise.all([
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false),
        supabase
          .from('enquiries')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)
          .neq('status', 'archived'),
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)
          .eq('is_archived', false)
          .eq('is_spam', false),
        supabase
          .from('activity_logs')
          .select('id, user_name, action, module, record_title, created_at')
          .order('created_at', { ascending: false })
          .limit(12),
      ]);

      const activity = (actRes.data ?? []) as AdminActivityEntry[];
      const boundary = lastSeenRef.current;
      const unread = activity.filter((a) => new Date(a.created_at).getTime() > boundary);

      setCounts({
        notificationsUnread: notifRes.count ?? 0,
        inboxUnread: enqRes.count ?? 0,
        leadsUnread: leadsRes.count ?? 0,
        alertsCount: unread.length,
        recentActivity: activity,
      });
    } catch (e) {
      // Non-fatal — keep last good counts on a transient failure.
      console.error('admin counts failed:', e);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 20000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  const markAlertsSeen = useCallback(() => {
    const now = Date.now();
    lastSeenRef.current = now;
    try {
      localStorage.setItem(LAST_SEEN_KEY, String(now));
    } catch {
      // best effort; falls back to in-memory marker
    }
    setCounts((prev) => ({ ...prev, alertsCount: 0 }));
  }, []);

  return { ...counts, loading, markAlertsSeen, refresh: fetchCounts };
}

/** Fallback for components rendered outside a provider context. */
export const EMPTY_ADMIN_COUNTS = EMPTY;