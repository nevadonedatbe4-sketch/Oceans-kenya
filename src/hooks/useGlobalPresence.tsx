import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  startOceansPresence,
  stopOceansPresence,
  subscribeOceansPresence,
  type OceansConnection,
  type OceansPresenceSnapshot,
} from '@/lib/oceansPresence';
import type { PresenceUser } from '@/pages/agent/ogroup/types';

/**
 * THE GLOBAL OCEANS PRESENCE PROVIDER.
 *
 * This is the single seam between the authenticated application session and the
 * presence service (which reads the authoritative auth session store). It lives
 * at the very top of the app (above all routes), so:
 *
 *   • Presence starts the moment a user is authenticated — no portal page, no
 *     Chat, no refresh required.
 *   • Navigating between pages has ZERO effect on presence (the provider never
 *     unmounts).
 *   • Signing out stops presence, so teammates see the user go offline.
 *
 * Everything in the app (Chat, Team directory, headers, pickers, CRM selectors)
 * reads the same store via `useGlobalPresence()`. Nothing else owns presence.
 */

interface GlobalPresenceValue {
  /** Live online members, keyed by authenticated user id. */
  presence: Record<string, PresenceUser>;
  /** Presence feed health (drives the "Reconnecting…" banner). */
  connection: OceansConnection;
  /** True once the first presence sync has been received. */
  synced: boolean;
}

const GlobalPresenceContext = createContext<GlobalPresenceValue>({
  presence: {},
  connection: 'connecting',
  synced: false,
});

export function GlobalPresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [snap, setSnap] = useState<OceansPresenceSnapshot>({
    state: {},
    synced: false,
    connection: 'connecting',
  });

  // Own the presence lifecycle strictly by the authenticated session. There is
  // deliberately NO cleanup here: a route change or StrictMode remount must not
  // tear presence down. Only a real sign-out (userId → undefined) stops it.
  useEffect(() => {
    if (userId) {
      startOceansPresence(userId);
    } else {
      stopOceansPresence();
    }
  }, [userId]);

  useEffect(() => subscribeOceansPresence(setSnap), []);

  const value = useMemo<GlobalPresenceValue>(() => {
    const presence: Record<string, PresenceUser> = {};
    Object.keys(snap.state).forEach((uid) => {
      const meta = snap.state[uid];
      presence[uid] = { user_id: uid, state: meta.state };
    });
    return { presence, connection: snap.connection, synced: snap.synced };
  }, [snap]);

  return <GlobalPresenceContext.Provider value={value}>{children}</GlobalPresenceContext.Provider>;
}

/** The one global team presence store. */
export function useGlobalPresence(): Record<string, PresenceUser> {
  return useContext(GlobalPresenceContext).presence;
}

/** Live health of the presence feed. */
export function usePresenceConnection(): OceansConnection {
  return useContext(GlobalPresenceContext).connection;
}