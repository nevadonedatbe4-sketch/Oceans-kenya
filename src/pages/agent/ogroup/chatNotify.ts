// ─────────────────────────────────────────────────────────────
// Oceans Chat — shared notification bus (framework-free module).
//
// Holds the small amount of cross-component state that the global
// notification centre and the Messenger need to agree on: the user's
// notification preferences, which conversation is currently open, and a
// one-shot "open this conversation" signal used when a toast / browser
// notification is clicked. Also home to the tiny WebAudio chime so we never
// ship a binary sound asset.
// ─────────────────────────────────────────────────────────────

export interface ChatNotifyPrefs {
  /** Play a chime for incoming messages. */
  sound: boolean;
  /** Mirror new messages to a native OS/browser notification. */
  desktop: boolean;
}

const PREFS_KEY = 'oceans_chat_notify_prefs';
const DEFAULT_PREFS: ChatNotifyPrefs = { sound: true, desktop: false };

export function getChatNotifyPrefs(): ChatNotifyPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<ChatNotifyPrefs>;
    return {
      sound: parsed.sound !== false,
      desktop: parsed.desktop === true,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setChatNotifyPrefs(patch: Partial<ChatNotifyPrefs>): ChatNotifyPrefs {
  const next = { ...getChatNotifyPrefs(), ...patch };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* storage may be unavailable */ }
  return next;
}

// ── Which conversation is currently open (so we don't double-notify) ──
let activeConversationId: string | null = null;

export function setActiveChatConversation(id: string | null): void {
  activeConversationId = id;
}

export function getActiveChatConversation(): string | null {
  return activeConversationId;
}

// ── One-shot signal to open a conversation from a notification ──
export const OPEN_CONVERSATION_EVENT = 'oceans-chat-open-conversation';
let pendingOpenConversation: string | null = null;

/** Ask the Messenger to open a conversation, whether or not it is mounted yet. */
export function openChatConversation(convId: string): void {
  pendingOpenConversation = convId;
  try {
    window.dispatchEvent(new CustomEvent(OPEN_CONVERSATION_EVENT, { detail: convId }));
  } catch {
    // Non-browser environment; the pending value still covers cross-page nav.
  }
}

/** Consume the pending conversation (called when the Messenger mounts). */
export function takePendingOpenConversation(): string | null {
  const value = pendingOpenConversation;
  pendingOpenConversation = null;
  return value;
}

// ── A short, pleasant two-tone chime via WebAudio (no asset needed) ──
let audioCtx: AudioContext | null = null;

export function playChatChime(): void {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    const tones: Array<[number, number]> = [[880, 0], [1174.7, 0.13]];
    tones.forEach(([freq, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.16, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.24);
    });
  } catch {
    // Audio is a best-effort nicety; never let it throw into message handling.
  }
}

// ── Native (browser / OS) notifications ──
export type DesktopPermission = 'default' | 'granted' | 'denied';

export function desktopNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function desktopPermission(): DesktopPermission {
  if (!desktopNotificationsSupported()) return 'denied';
  return Notification.permission as DesktopPermission;
}

export async function requestDesktopPermission(): Promise<DesktopPermission> {
  if (!desktopNotificationsSupported()) return 'denied';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return Notification.permission as DesktopPermission;
  try {
    return (await Notification.requestPermission()) as DesktopPermission;
  } catch {
    return 'denied';
  }
}

const BROWSER_TAG = 'oceans-chat-message';

/** Show a native notification for an incoming message. Clicking focuses + opens it. */
export function showDesktopNotification(title: string, body: string, onClick: () => void): void {
  if (!desktopNotificationsSupported() || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, tag: BROWSER_TAG, icon: undefined });
    n.onclick = () => {
      try { window.focus(); } catch { /* ignore */ }
      onClick();
      n.close();
    };
  } catch {
    // Some environments forbid constructing notifications; in-app toast still covers it.
  }
}

/** A short, friendly preview of any message row — used by toasts & notifications. */
export function rawMessagePreview(msg: {
  message_type?: string | null;
  body?: string | null;
  attachment_name?: string | null;
}): string {
  if (msg.body && msg.body.trim()) return msg.body.trim();
  switch (msg.message_type) {
    case 'image': return '📷 Photo';
    case 'video': return '🎥 Video';
    case 'voice': return '🎤 Voice message';
    case 'file': return msg.attachment_name ? `📎 ${msg.attachment_name}` : '📎 File';
    case 'share': return 'Shared an item';
    default: return 'New message';
  }
}