// ─────────────────────────────────────────────────────────────
// OGROUP — shared internal types (Messenger / Calendar / Check-In)
// All "user" references here are auth.uid() (the authenticated identity),
// which is exactly what the RLS-layer uses. Never pass user_id from the client.
// ─────────────────────────────────────────────────────────────

export type MemberRole = 'member' | 'admin';

export interface TeamMember {
  user_id: string;
  name: string;
  email?: string;
  title?: string;
  avatar_url?: string;
  role?: string;
  /** Short WhatsApp-style status line ("Available", "In a meeting", …). */
  about?: string;
  /** Account status when known (active / pending / …). */
  status?: string;
  /** Organization metadata (no country is a security boundary — just a label). */
  country?: string;
  department?: string;
  office?: string;
  /** Saved-contact linkage: set for entries coming from the personal contact book. */
  contact_id?: string;
  phone?: string;
  /** True when this is a saved contact with no registered account (can't be chatted with yet). */
  external?: boolean;
}

export interface ConversationSummary {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // membership-only fields (joined for this user)
  last_read_at: string | null;
  muted_until: string | null;
  archived_at: string | null;
  is_pinned: boolean;
  pinned_at: string | null;
  member_role: MemberRole;
  member_count: number;
  // computed
  lastMessage?: MessageItem | null;
  unreadCount: number;
  preview?: string | null;
  preview_at?: string | null;
  sender_name?: string | null;
  members?: TeamMember[];
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  message_type: 'text' | 'image' | 'file' | 'video' | 'voice' | 'system' | 'share';
  body: string | null;
  attachment_url: string | null;
  /** Original file name (for file cards / downloads). */
  attachment_name?: string | null;
  /** Size in bytes (for file cards). */
  attachment_size?: number | null;
  /** MIME type (drives the icon + player used in the bubble). */
  attachment_mime?: string | null;
  /** Clip length in seconds (voice notes / videos). */
  duration_seconds?: number | null;
  reply_to_message_id: string | null;
  reply_preview?: string | null;
  shared_object_type: string | null;
  shared_object_id: string | null;
  shared_object_title: string | null;
  shared_object_subtitle: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  sender_name?: string | null;
  sender_avatar?: string | null;
  reactions: { user_id: string; reaction: string }[];
  /** How many recipients have received this message on an active session. */
  delivered_count?: number;
  read_count?: number;
  /** Client-only: optimistic message still being sent. */
  pending?: boolean;
  /** Client-only: optimistic message that failed to send. */
  failed?: boolean;
}

/** A rich attachment queued in the composer / carried by a message. */
export interface OutgoingAttachment {
  kind: 'image' | 'video' | 'file' | 'voice';
  url: string;
  name?: string;
  size?: number;
  mime?: string;
  duration?: number;
}

export interface MessageSearchHit {
  id: string;
  conversation_id: string;
  body: string | null;
  message_type: string;
  sender_name: string | null;
  created_at: string;
}

export type ShareObjectType =
  | 'property'
  | 'listing'
  | 'lead'
  | 'client'
  | 'contact'
  | 'viewing'
  | 'appointment'
  | 'deal';

export interface ShareObject {
  type: ShareObjectType;
  id: string;
  title: string;
  subtitle: string;
  href?: string;
}

/**
 * Live team presence — EXACTLY three states, resolved once from the
 * authenticated session (plus this member's own activity) and consumed by every
 * surface in the app. There is no per-surface presence logic anywhere.
 *
 *   online  — holds a valid session and is active
 *   away    — holds a valid session but has gone idle (tab hidden / no activity)
 *   offline — holds no valid session
 */
export type PresenceState = 'online' | 'away' | 'offline';

export interface PresenceUser {
  user_id: string;
  state: PresenceState;
}

export interface NotificationItem {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

/** A single Status update (WhatsApp-style, expires after 24 hours). */
export interface StatusItem {
  id: string;
  user_id: string;
  kind: 'text' | 'image';
  body: string | null;
  image_url: string | null;
  background: string | null;
  created_at: string;
  expires_at: string;
}

/** One author's bundle of active statuses, plus how many are unseen. */
export interface StatusGroup {
  user_id: string;
  name: string;
  avatar_url?: string;
  country?: string;
  department?: string;
  items: StatusItem[];
  latestAt: string;
  unseenCount: number;
}