import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, uploadFileViaEdgeFunction } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTypingIndicator } from './useTyping';
import { useGlobalPresence, usePresenceConnection } from '@/hooks/useGlobalPresence';
import {
  useConversationList, fetchConversationMessages, fetchConversationRoster,
  markConversationRead, markAllConversationsRead, sendMessage, subscribeToConversation,
  fetchMessageReceipts, friendlyMessengerError, messagePreviewText,
} from './messengerData';
import { fetchTeamDirectory, findOrCreateDirectConversation, createGroupConversation, updateMembership } from './teamDirectory';
import { ConversationList } from './components/ConversationList';
import { MessageBubble } from './components/MessageBubble';
import { Composer } from './components/Composer';
import { InfoPanel } from './components/InfoPanel';
import { StartChatPanel } from './components/StartChatPanel';
import { GlobalSearch } from './components/GlobalSearch';
import { Avatar, presenceOf, PresenceText } from './components/Avatar';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { FALLBACK_CHAT_LOGO } from '@/lib/brandDefaults';
import { setActiveChatConversation, OPEN_CONVERSATION_EVENT, takePendingOpenConversation } from './chatNotify';
import { NewChatModal, GroupModal, SharePickerModal } from './components/Modals';
import { AddContactModal } from './components/AddContactModal';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { StatusPanel } from './components/StatusPanel';
import { TeamDirectoryPanel } from './components/TeamDirectoryPanel';
import type { ConversationSummary, MessageItem, OutgoingAttachment, PresenceUser, ShareObject, TeamMember } from './types';

const CHAT_WALLPAPER = {
  backgroundColor: '#0b141a',
  backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
  backgroundSize: '22px 22px',
};

/** Compact timestamp for the unread-messages dropdown (today → time, else date). */
function notifyTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const TABS: { key: 'chats' | 'status' | 'team'; label: string; icon: string }[] = [
  { key: 'chats', label: 'Chats', icon: 'ri-chat-3-line' },
  { key: 'status', label: 'Status', icon: 'ri-emotion-line' },
  { key: 'team', label: 'Team', icon: 'ri-team-line' },
];

export default function OGroupMessenger() {
  const { user } = useAuth();
  const { getSite } = useSiteSettings();
  const chatLogo = getSite('chat_logo_url') || FALLBACK_CHAT_LOGO;
  const presence = useGlobalPresence();
  const connection = usePresenceConnection();
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'info'>('list');
  const [tab, setTab] = useState<'chats' | 'status' | 'team'>('chats');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [roster, setRoster] = useState<TeamMember[]>([]);
  const [replyTo, setReplyTo] = useState<MessageItem | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightMsgId, setHighlightMsgId] = useState<string | null>(null);
  const [modal, setModal] = useState<'none' | 'newchat' | 'newgroup' | 'share' | 'manage' | 'addcontact' | 'profile'>('none');
  const [directory, setDirectory] = useState<TeamMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showNotify, setShowNotify] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const notifyRef = useRef<HTMLDivElement>(null);
  const messagesSeq = useRef(0);

  const { conversations, refresh } = useConversationList(activeId);
  const { typers, notifyTyping } = useTypingIndicator(
    activeId,
    user ? { id: user.id, name: user.name || user.email || 'Agent' } : null,
  );

  const unreadTotal = conversations
    .filter((c) => !c.archived_at && !(c.muted_until && new Date(c.muted_until) > new Date()))
    .reduce((sum, c) => sum + c.unreadCount, 0);

  // Unread conversations for the in-app notification centre (newest first).
  const unreadConversations = conversations
    .filter((c) => !c.archived_at && c.unreadCount > 0 && !(c.muted_until && new Date(c.muted_until) > new Date()))
    .sort((a, b) => new Date(b.preview_at || b.updated_at).getTime() - new Date(a.preview_at || a.updated_at).getTime());

  const activeConv = conversations.find((c) => c.id === activeId) || null;
  const allMessages = useCallback(async () => {
    setMessagesLoading(true);
    const seq = ++messagesSeq.current;
    try {
      const msgs = await fetchConversationMessages(activeId!);
      if (seq === messagesSeq.current) {
        const ids = msgs.map((m) => m.id);
        const [reactionsRes, receiptsMap] = await Promise.all([
          ids.length
            ? supabase.from('og_message_reactions').select('message_id,user_id,reaction').in('message_id', ids)
            : Promise.resolve({ data: [] as { message_id: string; user_id: string; reaction: string }[] }),
          fetchMessageReceipts(ids),
        ]);
        const byMsg: Record<string, MessageItem['reactions']> = {};
        (reactionsRes.data || []).forEach((r) => {
          byMsg[r.message_id] = byMsg[r.message_id] || [];
          byMsg[r.message_id].push({ user_id: r.user_id, reaction: r.reaction });
        });
        setMessages(msgs.map((m) => ({
          ...m,
          reactions: byMsg[m.id] || [],
          delivered_count: receiptsMap[m.id]?.delivered || 0,
          read_count: receiptsMap[m.id]?.read || 0,
        })));
      }
    } catch {
      if (seq === messagesSeq.current) setMessages([]);
    } finally {
      if (seq === messagesSeq.current) setMessagesLoading(false);
    }
  }, [activeId]);

  const loadDirectory = useCallback(() => {
    if (!user) { setDirectory([]); return; }
    fetchTeamDirectory(user.id).then(setDirectory).catch(() => setDirectory([]));
  }, [user]);

  // load directory (regenerated whenever contacts change)
  useEffect(() => { loadDirectory(); }, [loadDirectory]);

  // ⌘K / Ctrl+K opens global search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the unread-messages dropdown on outside click.
  useEffect(() => {
    if (!showNotify) return;
    const onClick = (e: MouseEvent) => {
      if (notifyRef.current && !notifyRef.current.contains(e.target as Node)) setShowNotify(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showNotify]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    allMessages();
    markConversationRead(activeId, user?.id || '');
    fetchConversationRoster(activeId).then(setRoster).catch(() => setRoster([]));
    setShowInfo(false);
    setReplyTo(null);
    setMobileView('chat');
  }, [activeId, user, allMessages]);

  // realtime subscription for the active conversation
  useEffect(() => {
    if (!activeId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    subscribeToConversation(activeId, (event, msg) => {
      if (event === 'UPDATE') {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
      } else {
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      }
      if (msg.sender_id !== user?.id) markConversationRead(activeId, user?.id || '');
      refresh();
    }).then((ch) => { channel = ch; });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [activeId, user, refresh]);

  // refresh delivery ticks when anyone reads or receives a message in this conversation
  useEffect(() => {
    if (!activeId) return;
    const ch = supabase.channel(`og-receipts-${activeId}`);
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'og_message_reads' }, () => { allMessages(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'og_message_deliveries' }, () => { allMessages(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId, allMessages]);

  // Keep the global notification centre aware of the open conversation, and
  // honour "open this conversation" signals from toasts / browser notifications.
  useEffect(() => {
    setActiveChatConversation(activeId);
    return () => setActiveChatConversation(null);
  }, [activeId]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent).detail;
      if (typeof id === 'string' && id) { setTab('chats'); setActiveId(id); setMobileView('chat'); }
    };
    window.addEventListener(OPEN_CONVERSATION_EVENT, onOpen);
    const pending = takePendingOpenConversation();
    if (pending) { setTab('chats'); setActiveId(pending); setMobileView('chat'); }
    return () => window.removeEventListener(OPEN_CONVERSATION_EVENT, onOpen);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typers.length]);

  // Jump-to-message: scroll the highlighted message into view, then fade the highlight.
  useEffect(() => {
    if (!highlightMsgId || messages.length === 0) return;
    const el = document.getElementById(`msg-${highlightMsgId}`);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(() => setHighlightMsgId(null), 2600);
    return () => clearTimeout(t);
  }, [highlightMsgId, messages.length]);

  const handleSelect = (id: string) => { setActiveId(id); setShowArchived(false); setHighlightMsgId(null); };

  const openNewChat = (userId: string) => {
    (async () => {
      setBusy(true);
      setActionError(null);
      try {
        const id = await findOrCreateDirectConversation(user?.id || '', userId);
        if (!id) throw new Error('Could not start this chat. Please try again.');
        setModal('none');
        setActiveId(id);
        setMobileView('chat');
        refresh();
      } catch (e) {
        console.error('[messenger] open chat failed', e);
        setActionError(friendlyMessengerError(e, 'Could not start this chat. Please try again.'));
      } finally {
        setBusy(false);
      }
    })();
  };

  /** Open a 1:1 chat from the Team directory (jump back to the Chats tab). */
  const openFromDirectory = (userId: string) => {
    setTab('chats');
    openNewChat(userId);
  };

  const createGroup = async (name: string, desc: string, ids: string[]) => {
    if (!user) throw new Error('Your session has expired. Please sign in again.');
    setBusy(true);
    try {
      const id = await createGroupConversation(user.id, name, desc, ids);
      setActiveId(id);
      setMobileView('chat');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const saveGroup = async (name: string, desc: string, addIds: string[], removeIds: string[], adminIds: string[]) => {
    if (!activeConv) return;
    const convId = activeConv.id;
    setBusy(true);
    try {
      const { error: metaErr } = await supabase
        .from('og_conversations')
        .update({ name, description: desc })
        .eq('id', convId);
      if (metaErr) throw metaErr;

      if (addIds.length) {
        const { error } = await supabase.from('og_conversation_members').insert(
          addIds.map((uid) => ({ conversation_id: convId, user_id: uid, role: adminIds.includes(uid) ? 'admin' : 'member' })),
        );
        if (error) throw error;
      }
      if (removeIds.length) {
        const { error } = await supabase.from('og_conversation_members')
          .delete().eq('conversation_id', convId).in('user_id', removeIds);
        if (error) throw error;
      }
      const remaining = roster.filter((m) => !removeIds.includes(m.user_id));
      for (const m of remaining) {
        const wantAdmin = adminIds.includes(m.user_id);
        if ((m.role === 'admin') !== wantAdmin) {
          const { error } = await supabase.from('og_conversation_members')
            .update({ role: wantAdmin ? 'admin' : 'member' })
            .eq('conversation_id', convId).eq('user_id', m.user_id);
          if (error) throw error;
        }
      }
      const freshRoster = await fetchConversationRoster(convId);
      setRoster(freshRoster);
      await refresh();
    } catch (e) {
      console.error('[messenger] save group failed', e);
      throw new Error(friendlyMessengerError(e, 'Unable to save this group. Please verify the selected members and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    try {
      await markAllConversationsRead(user.id);
      await refresh();
    } catch (e) {
      console.error('[messenger] mark all read failed', e);
      setActionError('Could not mark everything as read. Please try again.');
    }
  };

  /** Send a message optimistically: shows a "Sending…" state, then reconciles. */
  const sendOptimistic = useCallback(async (payload: Partial<MessageItem>) => {
    if (!activeId || !user) return;
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic: MessageItem = {
      id: tempId,
      conversation_id: activeId,
      sender_id: user.id,
      message_type: 'text',
      body: null,
      attachment_url: null,
      reply_to_message_id: null,
      shared_object_type: null,
      shared_object_id: null,
      shared_object_title: null,
      shared_object_subtitle: null,
      edited_at: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      sender_name: user.name,
      reactions: [],
      ...payload,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const msg = await sendMessage(activeId, user.id, payload);
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempId && m.id !== msg.id);
        return [...filtered, { ...msg, reactions: [] }];
      });
    } catch (e) {
      console.error('[messenger] send failed', e);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
      setActionError(friendlyMessengerError(e, 'Message could not be sent. Please try again.'));
    }
    setReplyTo(null);
    refresh();
  }, [activeId, user, refresh]);

  const handleSend = (text: string, attachment?: OutgoingAttachment) => {
    sendOptimistic({
      message_type: attachment?.kind || 'text',
      body: text || null,
      attachment_url: attachment?.url || null,
      attachment_name: attachment?.name || null,
      attachment_size: attachment?.size || null,
      attachment_mime: attachment?.mime || null,
      duration_seconds: attachment?.duration ? Math.round(attachment.duration) : null,
      reply_to_message_id: replyTo?.id || null,
    });
  };

  const handleUpload = async (
    file: File,
    kind: 'image' | 'video' | 'file',
    onProgress?: (percent: number) => void,
  ): Promise<string> => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
    const res = await uploadFileViaEdgeFunction(
      file,
      `ogroup/${activeId || 'general'}/${Date.now()}-${safeName}`,
      undefined,
      onProgress,
    );
    void kind;
    return res.url;
  };

  const handleSendVoice = async (blob: Blob, seconds: number, extension: string) => {
    if (!activeId || !user) return;
    const type = blob.type || 'audio/webm';
    const file = new File([blob], `voice-${Date.now()}.${extension}`, { type });
    const res = await uploadFileViaEdgeFunction(file, `ogroup/${activeId}/voice/${Date.now()}.${extension}`, 'voice-notes');
    await sendOptimistic({
      message_type: 'voice',
      attachment_url: res.url,
      attachment_name: file.name,
      attachment_size: file.size,
      attachment_mime: type,
      duration_seconds: Math.max(1, Math.round(seconds)),
      body: null,
      reply_to_message_id: replyTo?.id || null,
    });
  };

  const handleReact = async (msgId: string, reaction: string) => {
    if (!user || msgId.startsWith('local-')) return;
    const mine = messages.find((m) => m.id === msgId)?.reactions?.some((r) => r.reaction === reaction && r.user_id === user.id);
    if (mine) {
      await supabase.from('og_message_reactions').delete().eq('message_id', msgId).eq('user_id', user.id).eq('reaction', reaction);
    } else {
      await supabase.from('og_message_reactions').insert({ message_id: msgId, user_id: user.id, reaction });
    }
    allMessages();
  };

  const handleDelete = async (msg: MessageItem) => {
    if (!user || msg.id.startsWith('local-')) return;
    await supabase.from('og_messages').update({ deleted_at: new Date().toISOString() }).eq('id', msg.id).eq('sender_id', user.id);
    allMessages();
  };

  const handleShare = async (share: ShareObject) => {
    if (!activeId || !user) return;
    setModal('none');
    await sendOptimistic({
      message_type: 'share',
      body: null,
      shared_object_type: share.type,
      shared_object_id: share.id,
      shared_object_title: share.title,
      shared_object_subtitle: share.subtitle,
    });
  };

  const handleMembership = (id: string, patch: { is_pinned?: boolean; muted_until?: string | null; archived_at?: string | null }) => {
    if (!user) return;
    updateMembership(id, user.id, patch).then(refresh);
  };

  const convName = activeConv?.type === 'group'
    ? activeConv.name || 'Group'
    : (roster.find((m) => m.user_id !== user?.id)?.name || activeConv?.name || 'Conversation');

  const otherMember = activeConv?.type === 'group' ? null : roster.find((m) => m.user_id !== user?.id);
  const otherState: PresenceUser['state'] = otherMember ? presenceOf(otherMember.user_id, presence) : 'offline';

  const typingLabel = typers.length === 0
    ? null
    : typers.length === 1
      ? `${typers[0].name} is typing…`
      : `${typers.length} people are typing…`;

  const activeMembers: TeamMember[] = activeConv && activeConv.type === 'group' ? roster : [];

  const headerStatus = () => {
    const presenceEl = activeConv?.type === 'group'
      ? <span className="text-[#8696a0]">{activeConv.member_count} members</span>
      : otherMember
        ? <PresenceText state={otherState} className="font-semibold" />
        : <span className="text-[#8696a0]" />;

    return (
      <span className="inline-flex items-center gap-2 min-w-0 max-w-full">
        {presenceEl}
        {typingLabel && (
          <span className="inline-flex items-center gap-1.5 text-[#00a884] font-semibold min-w-0">
            <span aria-hidden="true" className="font-normal text-[#54656f]">·</span>
            <span aria-hidden="true" className="inline-flex items-end gap-[2px] flex-shrink-0">
              <span className="w-1 h-1 rounded-full bg-[#00a884] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-[#00a884] animate-bounce" style={{ animationDelay: '120ms' }} />
              <span className="w-1 h-1 rounded-full bg-[#00a884] animate-bounce" style={{ animationDelay: '240ms' }} />
            </span>
            <span className="truncate">{typingLabel}</span>
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="relative bg-[#0b141a] rounded-2xl overflow-hidden border border-[#1f2c34] h-[calc(100vh-65px-64px)] flex flex-col">
      {actionError && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-3.5 py-2 text-sm text-red-300">
          <i className="ri-error-warning-line text-base flex-shrink-0" />
          <span className="whitespace-nowrap">{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-1 text-red-300/70 hover:text-red-200 cursor-pointer"><i className="ri-close-line" /></button>
        </div>
      )}

      {/* top bar — OCEANS CHAT brand + Chats / Status / Team */}
      <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 h-14 border-b border-[#2a3942] bg-[#202c33] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 overflow-hidden"><img src={chatLogo} alt="Oceans Chat" className="w-full h-full object-cover" /></span>
          <span className="hidden sm:block text-sm font-extrabold tracking-tight text-[#e9edef] whitespace-nowrap">OCEANS <span className="text-[#00a884]">CHAT</span></span>
        </div>
        <div className="flex-1 flex justify-center min-w-0">
          <div className="flex items-center gap-1 bg-[#111b21] rounded-full p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${tab === t.key ? 'bg-[#00a884] text-[#0b141a]' : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33]'}`}
              >
                <i className={t.icon} /> {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative flex-shrink-0" ref={notifyRef}>
          <button
            onClick={() => setShowNotify((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[#aebac1] hover:bg-white/10 cursor-pointer"
            title="Unread messages"
            aria-label={`${unreadTotal} unread messages`}
          >
            <i className="ri-notification-3-line text-lg" />
            {unreadTotal > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#e11d48] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
          </button>
          {showNotify && (
            <div className="absolute right-0 top-12 z-50 w-[340px] max-w-[86vw] bg-[#202c33] border border-[#2a3942] rounded-xl overflow-hidden shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3942]">
                <p className="text-sm font-semibold text-[#e9edef]">Unread messages</p>
                {unreadTotal > 0 && (
                  <button
                    onClick={() => { markAllRead(); setShowNotify(false); }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00a884] hover:text-[#06cf9c] cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-check-double-line" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[340px] overflow-y-auto">
                {unreadConversations.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <i className="ri-notification-off-line text-2xl text-[#54656f]" />
                    <p className="text-xs text-[#8696a0] mt-2">You&apos;re all caught up.</p>
                  </div>
                ) : (
                  unreadConversations.map((c) => {
                    const isDirect = c.type !== 'group';
                    const peer = isDirect ? c.members?.[0] : undefined;
                    const name = isDirect ? (peer?.name || c.name || 'Conversation') : (c.name || 'Group');
                    return (
                      <button
                        key={c.id}
                        onClick={() => { handleSelect(c.id); setShowNotify(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#2a3942] cursor-pointer border-b border-[#2a3942]/50 last:border-0"
                      >
                        <Avatar
                          name={name}
                          avatar_url={isDirect ? peer?.avatar_url : c.avatar_url}
                          userId={isDirect ? (peer?.user_id || c.id) : c.id}
                          size={40}
                          showBadge={isDirect}
                          state={isDirect && peer ? presenceOf(peer.user_id, presence) : undefined}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[#e9edef] truncate">{name}</p>
                            <span className="text-[10px] text-[#8696a0] flex-shrink-0">{notifyTime(c.preview_at)}</span>
                          </div>
                          <p className="text-xs text-[#8696a0] truncate mt-0.5">{c.preview || 'New message'}</p>
                        </div>
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#00a884] text-[#0b141a] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {c.unreadCount > 99 ? '99+' : c.unreadCount}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        <button onClick={() => setModal('profile')} className="cursor-pointer flex-shrink-0" title="My profile">
          <Avatar name={user?.name} avatar_url={user?.avatar || null} userId={user?.id || 'me'} size={36} />
        </button>
      </div>

      {/* realtime health — appears only while the presence channel is dropped */}
      {connection === 'reconnecting' && (
        <div className="flex items-center justify-center gap-2 h-7 bg-amber-500/15 border-b border-amber-500/25 text-amber-300 text-xs font-medium flex-shrink-0">
          <i className="ri-loader-4-line animate-spin text-sm" />
          <span>Reconnecting…</span>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
      <div className={tab === 'chats' ? 'contents' : 'hidden'}>

      {/* list */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex flex-col h-full min-h-0 flex-1 md:flex-none md:w-[340px] border-r border-[#2a3942] ${showInfo ? 'hidden' : ''}`}>
        <ConversationList
          conversations={conversations}
          presence={presence}
          activeId={activeId}
          onSelect={handleSelect}
          onNewChat={() => setModal('newchat')}
          onNewGroup={() => setModal('newgroup')}
          onAddContact={() => setModal('addcontact')}
          onOpenSearch={() => setShowSearch(true)}
          onMarkAllRead={markAllRead}
          unreadTotal={unreadTotal}
          onUpdateMembership={handleMembership}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived((v) => !v)}
          onOpenProfile={() => setModal('profile')}
          meName={user?.name}
          meAvatar={user?.avatar || null}
        />
      </div>

      {/* chat view */}
      <div className={`${activeId && mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0 min-h-0 ${showInfo ? 'hidden' : ''}`}>
        {activeId ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a3942] bg-[#202c33] flex-shrink-0">
              <button onClick={() => setMobileView('list')} className="md:hidden text-[#aebac1] hover:text-[#e9edef] cursor-pointer"><i className="ri-arrow-left-line text-lg" /></button>
              <Avatar
                name={convName}
                avatar_url={activeConv?.type === 'group' ? activeConv.avatar_url : otherMember?.avatar_url}
                userId={activeConv?.id}
                size={42}
                showBadge={activeConv?.type !== 'group'}
                state={otherState}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] md:text-base font-bold text-[#e9edef] truncate leading-tight">{convName}</p>
                <p className="text-[11px] truncate mt-0.5">{headerStatus()}</p>
              </div>
              <button onClick={() => setShowSearch(true)} className="w-9 h-9 flex items-center justify-center rounded-lg text-[#aebac1] hover:bg-white/10 cursor-pointer" title="Search">
                <i className="ri-search-line text-lg" />
              </button>
              <button onClick={() => setShowInfo(true)} className="w-9 h-9 flex items-center justify-center rounded-lg text-[#aebac1] hover:bg-white/10 cursor-pointer">
                <i className="ri-information-line text-lg" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto py-3" style={CHAT_WALLPAPER}>
              {messagesLoading && messages.length === 0 ? (
                <div className="flex items-center justify-center py-12"><i className="ri-loader-4-line animate-spin text-[#8696a0] text-2xl" /></div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#202c33] flex items-center justify-center mb-3 border border-[#2a3942]"><i className="ri-chat-smile-2-line text-[#00a884] text-2xl" /></div>
                  <p className="text-sm text-[#8696a0]">No messages yet</p>
                  <p className="text-xs text-[#667781] mt-1">Say hello and start the conversation</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} id={`msg-${m.id}`}>
                    <MessageBubble
                      message={{ ...m, reply_preview: m.reply_to_message_id ? (() => { const parent = messages.find((x) => x.id === m.reply_to_message_id); return parent ? messagePreviewText(parent) : 'attachment'; })() : null }}
                      isOwn={m.sender_id === user?.id}
                      isGroup={activeConv?.type === 'group'}
                      presence={presence}
                      highlight={highlightMsgId === m.id}
                      onReply={(msg) => setReplyTo(msg)}
                      onReact={handleReact}
                      onDelete={handleDelete}
                    />
                  </div>
                ))
              )}

              {typers.length > 0 && (
                <div className="flex justify-start px-3 md:px-4 my-1">
                  <div className="flex items-center gap-1.5 px-4 py-3 bg-[#202c33] rounded-2xl rounded-bl-md border border-[#2a3942]">
                    <span className="w-2 h-2 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            <Composer
              onSend={handleSend}
              onUpload={handleUpload}
              onSendVoice={handleSendVoice}
              onTyping={notifyTyping}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onOpenShare={() => setModal('share')}
            />
          </>
        ) : (
          <StartChatPanel
            directory={directory}
            presence={presence}
            onSelect={openNewChat}
            onNewGroup={() => setModal('newgroup')}
            onAddContact={() => setModal('addcontact')}
          />
        )}
      </div>

      {/* info panel */}
      {showInfo && activeConv && (
        <div className={`${mobileView === 'info' ? 'flex' : 'hidden'} md:flex`}>
          <InfoPanel
            conversation={activeConv}
            messages={messages}
            members={activeMembers}
            presence={presence}
            isGroupAdmin={activeConv.member_role === 'admin'}
            onClose={() => setShowInfo(false)}
            onUpdateMembership={(patch) => handleMembership(activeConv.id, patch)}
            onEditGroup={() => setModal('manage')}
          />
        </div>
      )}

      </div>

      <div className={tab === 'status' ? 'flex-1 min-h-0 flex' : 'hidden'}><StatusPanel /></div>
      <div className={tab === 'team' ? 'flex-1 min-h-0 flex' : 'hidden'}>
        <TeamDirectoryPanel
          directory={directory}
          presence={presence}
          onMessage={openFromDirectory}
          onAddContact={() => setModal('addcontact')}
        />
      </div>
      </div>

      {/* global search */}
      {showSearch && (
        <GlobalSearch
          conversations={conversations}
          onPickChat={(id) => { setActiveId(id); setShowArchived(false); setMobileView('chat'); }}
          onPickMessage={(convId, msgId) => { setActiveId(convId); setShowArchived(false); setMobileView('chat'); setHighlightMsgId(msgId); }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* modals */}
      {modal === 'newchat' && user && (
        <NewChatModal
          directory={directory}
          presence={presence}
          onSelect={openNewChat}
          onNewGroup={() => setModal('newgroup')}
          onAddContact={() => setModal('addcontact')}
          onClose={() => setModal('none')}
        />
      )}
      {modal === 'newgroup' && <GroupModal mode="create" directory={directory} presence={presence} onCreate={createGroup} onClose={() => setModal('none')} busy={busy} />}
      {modal === 'manage' && activeConv && (
        <GroupModal
          mode="edit" directory={directory} presence={presence}
          existingMembers={roster} existingName={activeConv.name || ''} existingDescription={activeConv.description || ''}
          onSave={saveGroup} onClose={() => setModal('none')} busy={busy}
        />
      )}
      {modal === 'share' && <SharePickerModal onShare={handleShare} onClose={() => setModal('none')} />}
      {modal === 'addcontact' && (
        <AddContactModal
          onClose={() => setModal('none')}
          onStartChat={(userId) => { setModal('none'); openNewChat(userId); }}
          onSaved={loadDirectory}
        />
      )}
      {modal === 'profile' && (
        <ProfileSettingsModal
          onClose={() => setModal('none')}
          onSaved={() => { loadDirectory(); refresh(); }}
        />
      )}
    </div>
  );
}