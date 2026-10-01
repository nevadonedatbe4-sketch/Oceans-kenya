import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { fetchStaffDirectory, type StaffRow } from './staffDirectory';
import type { ConversationSummary, MessageItem, MessageSearchHit, TeamMember } from './types';

/**
 * Translate raw backend/postgres errors into clear, actionable, non-technical
 * messages. The raw error is never shown to the user; callers log it instead.
 */
export function friendlyMessengerError(e: unknown, fallback: string): string {
  const raw = ((e as { message?: string })?.message || '').toLowerCase();
  if (!raw) return fallback;
  if (raw.includes('session_expired')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (raw.includes('not_authorized')) {
    return 'You do not have permission to do that. Please check your team access and try again.';
  }
  if (raw.includes('unknown_participant')) {
    return 'One of the selected people is no longer available. Please refresh and try again.';
  }
  if (raw.includes('invalid_group')) {
    return 'Please add at least one other member to create this group.';
  }
  if (raw.includes('row-level security') || raw.includes('policy') || raw.includes('permission denied') || raw.includes('not allowed')) {
    return 'You do not have permission to do that. Please check your team access and try again.';
  }
  if (raw.includes('jwt') || raw.includes('session') || raw.includes('token') || raw.includes('refresh')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (raw.includes('duplicate') || raw.includes('unique constraint')) {
    return 'That already exists — refreshing your list.';
  }
  if (raw.includes('failed to fetch') || raw.includes('network') || raw.includes('timeout')) {
    return 'Connection problem. Please check your internet and try again.';
  }
  if (raw.includes('payload too large') || raw.includes('too large') || raw.includes('entity too large')) {
    return 'That file is too large. Please pick a smaller one.';
  }
  return fallback;
}

/** True when an attachment URL points at an audio clip (voice note). */
export function isAudioAttachment(url?: string | null): boolean {
  if (!url) return false;
  return /\.(webm|mp3|m4a|ogg|wav|aac|opus)(\?|$)/i.test(url) || url.includes('voice-notes');
}

/** A short, human label for any message — used for reply quotes & previews. */
export function messagePreviewText(m: MessageItem): string {
  if (m.body) return m.body;
  switch (m.message_type) {
    case 'image': return '📷 Photo';
    case 'video': return '🎥 Video';
    case 'voice': return '🎤 Voice message';
    case 'file': return m.attachment_name ? `📎 ${m.attachment_name}` : '📎 File';
    case 'share': return 'Shared an item';
    case 'system': return 'System message';
    default: return isAudioAttachment(m.attachment_url) ? '🎤 Voice message' : 'Attachment';
  }
}

/** Resolve sender display info (name + avatar) for a set of sender ids. */
async function resolveSenderMap(senderIds: Array<string | null | undefined>): Promise<Map<string, { name: string | null; avatar: string | null }>> {
  const unique = new Set(senderIds.filter((id): id is string => !!id));
  const map = new Map<string, { name: string | null; avatar: string | null }>();
  if (unique.size === 0) return map;
  const rows = await fetchStaffDirectory();
  rows.forEach((p) => {
    if (unique.has(p.user_id)) map.set(p.user_id, { name: p.name || null, avatar: p.avatar_url || null });
  });
  return map;
}

interface MessengerState {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const POSTGRES_REALTIME = 'postgres_changes';

export function useConversationList(activeConvId: string | null): MessengerState {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(activeConvId);
  activeRef.current = activeConvId;

  const refresh = useCallback(async () => {
    if (!user) { setConversations([]); setLoading(false); return; }
    try {
      setError(null);
      const { data: memberRows, error: mErr } = await supabase
        .from('og_conversation_members')
        .select('conversation_id, role, last_read_at, muted_until, archived_at, is_pinned, pinned_at')
        .eq('user_id', user.id);
      if (mErr) throw mErr;

      const convIds = (memberRows || []).map((m) => m.conversation_id);
      const displayed = (memberRows || []).filter((m) => !m.archived_at);

      if (convIds.length === 0) { setConversations([]); setLoading(false); return; }

      const { data: convRows, error: cErr } = await supabase
        .from('og_conversations')
        .select('*')
        .in('id', convIds);
      if (cErr) throw cErr;

      // member rows — roster size + the counterpart for direct chats
      const { data: countRows, error: cntErr } = await supabase
        .from('og_conversation_members')
        .select('conversation_id, user_id')
        .in('conversation_id', convIds);
      if (cntErr) throw cntErr;
      const countMap: Record<string, number> = {};
      const membersByConv: Record<string, string[]> = {};
      (countRows || []).forEach((r) => {
        countMap[r.conversation_id] = (countMap[r.conversation_id] || 0) + 1;
        if (!membersByConv[r.conversation_id]) membersByConv[r.conversation_id] = [];
        membersByConv[r.conversation_id].push(r.user_id);
      });

      // Resolve display info (name + avatar) for everyone referenced in these
      // conversations — the direct-chat counterpart and the last sender of each
      // row. Goes through the staff directory so it works for every role.
      const directory = await fetchStaffDirectory().catch(() => []);
      const profileMap = new Map<string, StaffRow>();
      directory.forEach((p) => profileMap.set(p.user_id, p));

      const memberMeta = new Map(memberRows!.map((m) => [m.conversation_id, m]));

      const list = await Promise.all(
        (convRows || []).map(async (conv) => {
          const meta = memberMeta.get(conv.id)!;
          const { data: last } = await supabase
            .from('og_messages')
            .select('id, message_type, body, sender_id, created_at, attachment_url')
            .eq('conversation_id', conv.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count: unreadCount } = await supabase
            .from('og_messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .is('deleted_at', null)
            .gt('created_at', meta.last_read_at ?? new Date(0).toISOString())
            .neq('sender_id', user.id);

          let preview: string | null = null;
          let sender_name: string | null = null;
          let lastSenderName: string | null = null;
          if (last?.sender_id) {
            lastSenderName = profileMap.get(last.sender_id)?.name || null;
          }
          if (last) {
            sender_name = conv.type === 'group' ? (lastSenderName || '') : null;
            preview = last.message_type === 'share'
              ? (last.body || 'Shared an item')
              : last.message_type === 'text'
                ? (last.body || '')
                : last.message_type === 'image'
                  ? '📷 Photo'
                  : last.message_type === 'video'
                    ? '🎥 Video'
                    : last.message_type === 'voice' || isAudioAttachment(last.attachment_url)
                      ? '🎤 Voice message'
                      : last.message_type === 'file'
                        ? '📎 File'
                        : last.message_type === 'system'
                          ? 'System'
                          : 'Attachment';
          }

          const otherId = conv.type === 'direct'
            ? (membersByConv[conv.id] || []).find((id) => id !== user.id)
            : undefined;
          const otherProf = otherId ? profileMap.get(otherId) : undefined;

          return {
            ...conv,
            last_read_at: meta.last_read_at,
            muted_until: meta.muted_until,
            archived_at: meta.archived_at,
            is_pinned: meta.is_pinned,
            pinned_at: meta.pinned_at,
            member_role: meta.role,
            member_count: countMap[conv.id] || 1,
            unreadCount: unreadCount || 0,
            preview,
            preview_at: last?.created_at ?? null,
            sender_name,
            members: otherId
              ? [{
                  user_id: otherId,
                  name: otherProf?.name || 'Teammate',
                  avatar_url: otherProf?.avatar_url || undefined,
                  title: otherProf?.title || undefined,
                  about: otherProf?.about || undefined,
                  phone: otherProf?.phone || undefined,
                  country: otherProf?.country || undefined,
                  department: otherProf?.department || undefined,
                  office: otherProf?.office || undefined,
                }]
              : undefined,
          } as ConversationSummary;
        }),
      );

      list.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.preview_at || b.updated_at).getTime() - new Date(a.preview_at || a.updated_at).getTime();
      });
      setConversations(list);
    } catch (e) {
      setError((e as Error).message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: react to new messages / membership changes across my chats.
  // RLS scopes these events to conversations the authenticated user can read.
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('og-conv-list');

    channel
      .on(POSTGRES_REALTIME, { event: 'INSERT', schema: 'public', table: 'og_messages' }, () => { refresh(); })
      .on(POSTGRES_REALTIME, { event: 'UPDATE', schema: 'public', table: 'og_messages' }, () => { refresh(); })
      .on(POSTGRES_REALTIME, { event: 'INSERT', schema: 'public', table: 'og_conversation_members' }, () => { refresh(); })
      .on(POSTGRES_REALTIME, { event: 'UPDATE', schema: 'public', table: 'og_conversation_members' }, () => { if (!activeRef.current) refresh(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, refresh]);

  return { conversations, loading, error, refresh };
}

export async function fetchConversationMessages(convId: string): Promise<MessageItem[]> {
  const { data, error } = await supabase
    .from('og_messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) throw error;
  const msgs = (data || []) as MessageItem[];
  const senderMap = await resolveSenderMap(msgs.map((m) => m.sender_id));
  return msgs.map((m) => ({
    ...m,
    sender_name: senderMap.get(m.sender_id || '')?.name || null,
    sender_avatar: senderMap.get(m.sender_id || '')?.avatar || null,
  }));
}

/**
 * Delivery + read receipt counts keyed by message id. Used to render the
 * delivery ticks on the sender's own bubbles:
 *   ✓ sent · ✓✓ grey delivered · ✓✓ blue read.
 * A message counts as delivered when a recipient's active session received it
 * (og_message_deliveries) or has since read it (og_message_reads).
 */
export interface MessageReceipts {
  delivered: number;
  read: number;
}

export async function fetchMessageReceipts(messageIds: string[]): Promise<Record<string, MessageReceipts>> {
  if (messageIds.length === 0) return {};
  const map: Record<string, MessageReceipts> = {};
  const ensure = (id: string): MessageReceipts => {
    map[id] = map[id] || { delivered: 0, read: 0 };
    return map[id];
  };
  try {
    const [deliv, reads] = await Promise.all([
      supabase.from('og_message_deliveries').select('message_id').in('message_id', messageIds),
      supabase.from('og_message_reads').select('message_id').in('message_id', messageIds),
    ]);
    (deliv.data || []).forEach((r: { message_id: string }) => { ensure(r.message_id).delivered += 1; });
    (reads.data || []).forEach((r: { message_id: string }) => {
      const entry = ensure(r.message_id);
      entry.read += 1;
      // A read message was necessarily delivered. Ensure delivered >= read.
      entry.delivered = Math.max(entry.delivered, entry.read);
    });
    return map;
  } catch {
    return {};
  }
}

/**
 * Record that a message reached this recipient's active session. Best-effort
 * and idempotent (primary key is message_id + user_id), so it is safe to call
 * on every realtime delivery without creating duplicates.
 */
export async function markMessageDelivered(messageId: string, userId: string): Promise<void> {
  try {
    await supabase
      .from('og_message_deliveries')
      .upsert({ message_id: messageId, user_id: userId, delivered_at: new Date().toISOString() }, { onConflict: 'message_id,user_id' });
  } catch {
    // Delivery tracking is best-effort; a miss just means a message lingers on "Sent".
  }
}

export async function fetchConversationRoster(convId: string): Promise<TeamMember[]> {
  const { data: rows, error } = await supabase
    .from('og_conversation_members')
    .select('user_id, role, joined_at')
    .eq('conversation_id', convId);
  if (error) throw error;
  const ids = new Set((rows || []).map((r) => r.user_id));
  const directory = await fetchStaffDirectory();
  const pMap = new Map(directory.filter((p) => ids.has(p.user_id)).map((p) => [p.user_id, p]));
  return (rows || []).map((r) => {
    const p = pMap.get(r.user_id);
    return {
      user_id: r.user_id,
      role: r.role,
      name: p?.name || 'Agent',
      avatar_url: p?.avatar_url || undefined,
      title: p?.title || undefined,
      about: p?.about || undefined,
      phone: p?.phone || undefined,
      country: p?.country || undefined,
      department: p?.department || undefined,
      office: p?.office || undefined,
    };
  });
}

export async function markConversationRead(convId: string, userId: string): Promise<void> {
  try {
    await supabase
      .from('og_conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .eq('user_id', userId);

    // Upsert read receipts on messages not sent by me.
    const { data: msgs } = await supabase
      .from('og_messages')
      .select('id')
      .eq('conversation_id', convId)
      .neq('sender_id', userId)
      .is('deleted_at', null)
      .limit(200);
    if (msgs?.length) {
      const rows = msgs.map((m) => ({ message_id: m.id, user_id: userId, read_at: new Date().toISOString() }));
      await supabase.from('og_message_reads').upsert(rows, { onConflict: 'message_id,user_id' });
    }
  } catch {
    // Non-fatal: read receipts are best-effort.
  }
}

/**
 * Mark every conversation the user belongs to as read by stamping
 * last_read_at on their membership rows. RLS scopes the update to the
 * caller's own rows, so this can never touch another user's read state.
 */
export async function markAllConversationsRead(userId: string): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('og_conversation_members')
    .update({ last_read_at: now })
    .eq('user_id', userId)
    .select('conversation_id');
  if (error) throw error;
  return (data || []).length;
}

/**
 * Global search across every message body the signed-in user is allowed to
 * read (RLS scopes og_messages to the user's own conversations). Returns the
 * most recent matches so the UI can jump straight to them.
 */
export async function searchMessages(query: string, limit = 40): Promise<MessageSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('og_messages')
    .select('id, conversation_id, body, message_type, sender_id, created_at')
    .ilike('body', `%${q}%`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const hits = (data || []) as Array<{ id: string; conversation_id: string; body: string | null; message_type: string; sender_id: string | null; created_at: string }>;
  const senderMap = await resolveSenderMap(hits.map((h) => h.sender_id));
  return hits.map((h) => ({ ...h, sender_name: senderMap.get(h.sender_id || '')?.name || null })) as MessageSearchHit[];
}

export async function sendMessage(
  convId: string,
  userId: string,
  payload: Partial<MessageItem>,
): Promise<MessageItem> {
  const { data, error } = await supabase
    .from('og_messages')
    .insert({
      conversation_id: convId,
      sender_id: userId,
      message_type: payload.message_type || 'text',
      body: payload.body ?? null,
      attachment_url: payload.attachment_url ?? null,
      attachment_name: payload.attachment_name ?? null,
      attachment_size: payload.attachment_size ?? null,
      attachment_mime: payload.attachment_mime ?? null,
      duration_seconds: payload.duration_seconds ?? null,
      reply_to_message_id: payload.reply_to_message_id ?? null,
      shared_object_type: payload.shared_object_type ?? null,
      shared_object_id: payload.shared_object_id ?? null,
      shared_object_title: payload.shared_object_title ?? null,
      shared_object_subtitle: payload.shared_object_subtitle ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  const senderMap = await resolveSenderMap([userId]);
  const sender = senderMap.get(userId);
  return { ...(data as MessageItem), sender_name: sender?.name || null, sender_avatar: sender?.avatar || null } as MessageItem;
}

export async function sendSystemMessage(convId: string, body: string): Promise<void> {
  // 'system' messages carry no sender; they are informational (e.g. group created).
  const { data: conv } = await supabase.from('og_conversations').select('type').eq('id', convId).maybeSingle();
  if (!conv) return;
  const { data, error } = await supabase
    .from('og_messages')
    .insert({ conversation_id: convId, message_type: 'system', body })
    .select('sender_id, message_type, body, created_at')
    .single();
  if (error) console.error('system message failed', error);
  void data;
}

export function subscribeToConversation(
  convId: string,
  onEvent: (event: 'INSERT' | 'UPDATE', msg: MessageItem) => void,
): Promise<ReturnType<typeof supabase.channel>> {
  return new Promise((resolve) => {
    const channel = supabase.channel(`og-conv-${convId}`);
    channel
      .on(
        POSTGRES_REALTIME,
        { event: 'INSERT', schema: 'public', table: 'og_messages', filter: `conversation_id=eq.${convId}` },
        (payload) => onEvent('INSERT', payload.new as MessageItem),
      )
      .on(
        POSTGRES_REALTIME,
        { event: 'UPDATE', schema: 'public', table: 'og_messages', filter: `conversation_id=eq.${convId}` },
        (payload) => onEvent('UPDATE', payload.new as MessageItem),
      )
      .subscribe(() => resolve(channel));
  });
}