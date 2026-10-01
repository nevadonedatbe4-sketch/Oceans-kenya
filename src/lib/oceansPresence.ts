import { supabase } from '@/lib/supabase';

/**
 * OCEANS ORGANIZATION-WIDE PRESENCE — the ONE source of truth.
 *
 * ── ARCHITECTURE (rebuilt from the authenticated session, plus activity) ──
 *
 *   Authenticated session (Supabase Auth)  +  this user's own activity
 *          ↓                                        ↓
 *   auth.sessions                          public.og_presence_activity
 *          ↓                                        ↓
 *   public.oceans_team_presence()   (SECURITY DEFINER reader)
 *          ↓
 *   this service  →  useGlobalPresence()  →  Chat · Team · headers · dialogs
 *
 * A member is:
 *   • ONLINE  — holds a valid session AND is actively using the app
 *   • AWAY    — holds a valid session but has gone idle (tab hidden, or no
 *               clicks / keyboard / pointer activity for a few minutes)
 *   • OFFLINE — holds no valid session
 *
 * The "away" state is first-class: avatars, labels, directory filters, headers,
 * pickers and message surfaces all render the SAME three states from this one
 * source. Nothing decides presence on its own.
 *
 * Reality this design accepts: Supabase Realtime *Presence/Broadcast* is
 * silently refused on this project, so presence is read from durable records
 * (sessions + activity) rather than a realtime channel.
 *
 * Deliberately absent (do not reintroduce):
 *   • no realtime presence/broadcast channel
 *   • no `og_presence` table, no `last_seen`
 *   • no fallback that guesses someone is offline
 *
 * Activity is written ONLY for the signed-in user, and only:
 *   • on real interaction (throttled),
 *   • when the tab is hidden (mark idle) / shown (mark active).
 * It never runs on a heartbeat that decides anyone else's state.
 */

export type OceansConnection = 'connecting' | 'online' | 'reconnecting';

export interface PresenceMeta {
  /** The authenticated user id — the ONLY thing the UI keys off. */
  user_id: string;
  /** Live presence — one of exactly three states. */
  state: 'online' | 'away' | 'offline';
}

export interface OceansPresenceSnapshot {
  /** Live presence keyed by authenticated user id. */
  state: Record<string, PresenceMeta>;
  /** True once the first read of the session store has completed. */
  synced: boolean;
  /** Health of the presence feed. */
  connection: OceansConnection;
}

type Listener = (snapshot: OceansPresenceSnapshot) => void;

/** How often we re-read the presence records (refresh only — never decides state). */
const REFRESH_MS = 5000;
/** Minimum gap between two activity writes for the signed-in user. */
const ACTIVITY_WRITE_MS = 30000;
/** Events that count as "the user is here". */
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

let currentUserId: string | null = null;
let state: Record<string, PresenceMeta> = {};
let synced = false;
let connection: OceansConnection = 'connecting';
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;
let lastActivityWrite = 0;
const listeners = new Set<Listener>();

function snapshot(): OceansPresenceSnapshot {
  return { state, synced, connection };
}

function emit() {
  const snap = snapshot();
  listeners.forEach((l) => {
    try {
      l(snap);
    } catch {
      // A broken listener must never take down the presence bus.
    }
  });
}

function setConnection(next: OceansConnection) {
  if (connection === next) return;
  connection = next;
  emit();
}

/**
 * Read the authoritative presence set (session + activity) and rebuild the map.
 * Never used to guess — the records are the truth.
 */
async function refreshPresence() {
  if (inFlight) return;
  inFlight = true;
  try {
    const { data, error } = await supabase.rpc('oceans_team_presence');
    if (error) throw error;

    const next: Record<string, PresenceMeta> = {};
    (data || []).forEach((row: { user_id?: unknown; state?: unknown }) => {
      const uid = String(row.user_id || '');
      if (!uid) return;
      const raw = String(row.state || '');
      if (raw === 'online') next[uid] = { user_id: uid, state: 'online' };
      else if (raw === 'away') next[uid] = { user_id: uid, state: 'away' };
      else next[uid] = { user_id: uid, state: 'offline' };
    });

    // The signed-in user ALWAYS holds a valid session, so they never vanish.
    if (currentUserId && !next[currentUserId]) {
      next[currentUserId] = { user_id: currentUserId, state: 'online' };
    }

    state = next;
    synced = true;
    setConnection('online');
    emit();
  } catch {
    // Keep the last known state; just signal the feed is having trouble.
    setConnection('reconnecting');
  } finally {
    inFlight = false;
  }
}

/** Write this user's own activity record (best effort — never blocks the UI). */
function writeActivity(patch: { last_active_at?: string; is_idle?: boolean }) {
  const uid = currentUserId;
  if (!uid) return;
  void supabase
    .from('og_presence_activity')
    .upsert({ user_id: uid, ...patch }, { onConflict: 'user_id' })
    .then(() => {}, () => {});
}

/** Mark the signed-in user as actively present (throttled unless forced). */
function markActive(force = false) {
  const now = Date.now();
  if (!force && now - lastActivityWrite < ACTIVITY_WRITE_MS) return;
  lastActivityWrite = now;
  writeActivity({ last_active_at: new Date(now).toISOString(), is_idle: false });
}

/** Mark the signed-in user as idle (e.g. tab hidden). */
function markIdle() {
  writeActivity({ is_idle: true });
}

function handleActivity() {
  markActive();
}

function handleVisibility() {
  if (document.visibilityState === 'visible') {
    markActive(true);
    void refreshPresence();
  } else {
    markIdle();
  }
}

/** Closing / navigating away from the tab means this member is no longer active. */
function handlePageHide() {
  markIdle();
}

function attachListeners() {
  ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
  window.addEventListener('focus', handleActivity);
  window.addEventListener('pagehide', handlePageHide);
  document.addEventListener('visibilitychange', handleVisibility);
}

function detachListeners() {
  ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, handleActivity));
  window.removeEventListener('focus', handleActivity);
  window.removeEventListener('pagehide', handlePageHide);
  document.removeEventListener('visibilitychange', handleVisibility);
}

/**
 * Begin presence for the authenticated user. Idempotent: calling it again for
 * the same user is a no-op, so every layer can safely ensure presence.
 */
export function startOceansPresence(userId: string) {
  if (currentUserId === userId && refreshTimer) return;
  stopOceansPresence();
  currentUserId = userId;
  synced = false;
  lastActivityWrite = 0;
  setConnection('connecting');

  // Online immediately — a valid session exists the moment auth succeeds.
  state = { [userId]: { user_id: userId, state: 'online' } };
  emit();

  markActive(true);
  void refreshPresence();
  refreshTimer = setInterval(() => { void refreshPresence(); }, REFRESH_MS);
  attachListeners();
}

/** End presence for the current user (explicit sign-out, or no session). */
export function stopOceansPresence() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  detachListeners();
  currentUserId = null;
  state = {};
  synced = false;
  connection = 'connecting';
  emit();
}

/** Subscribe to live presence. Returns an unsubscribe function. */
export function subscribeOceansPresence(cb: Listener): () => void {
  listeners.add(cb);
  cb(snapshot());
  return () => {
    listeners.delete(cb);
  };
}