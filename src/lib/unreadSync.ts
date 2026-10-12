/**
 * Cross-tab / cross-component read-state synchronisation bus.
 *
 * When any part of the app persists a read operation (notifications or
 * messages) it calls `broadcastReadSync(scope)`. Every hook that owns an unread
 * badge subscribes to the relevant scope and re-reads the authoritative count
 * from the backend, so a badge cleared in one tab/panel clears everywhere —
 * without any locally-stored counter drifting out of sync with the database.
 *
 * Two delivery paths are used on purpose:
 *  - BroadcastChannel  → other browser tabs of the same origin.
 *  - window CustomEvent → other components inside THIS tab (BroadcastChannel
 *    does not echo back to the sender).
 */
export type ReadSyncScope = 'notifications' | 'messages';

const CHANNEL_NAME = 'readdy-unread-sync';
const LOCAL_EVENT = 'readdy-read-sync';

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

/** Notify every listener (this tab + other tabs) that a read op was persisted. */
export function broadcastReadSync(scope: ReadSyncScope): void {
  try {
    getChannel()?.postMessage({ scope, at: Date.now() });
  } catch {
    // best effort — cross-tab sync is a nicety, never a blocker
  }
  try {
    window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: { scope } }));
  } catch {
    // ignore
  }
}

/**
 * Subscribe to read-state changes for a scope. Returns an unsubscribe fn.
 * The handler is called for both in-tab and cross-tab events.
 */
export function subscribeReadSync(scope: ReadSyncScope, handler: () => void): () => void {
  const ch = getChannel();
  const onMessage = (e: MessageEvent) => {
    if (e.data && e.data.scope === scope) handler();
  };
  const onLocal = (e: Event) => {
    const detail = (e as CustomEvent<{ scope?: ReadSyncScope }>).detail;
    if (detail && detail.scope === scope) handler();
  };
  if (ch) ch.addEventListener('message', onMessage);
  if (typeof window !== 'undefined') window.addEventListener(LOCAL_EVENT, onLocal);
  return () => {
    if (ch) ch.removeEventListener('message', onMessage);
    if (typeof window !== 'undefined') window.removeEventListener(LOCAL_EVENT, onLocal);
  };
}