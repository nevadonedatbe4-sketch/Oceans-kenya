import { useMemo, useRef, useState } from 'react';
import { Avatar, presenceOf } from './Avatar';
import type { ConversationSummary, PresenceUser } from '../types';

interface ConversationListProps {
  conversations: ConversationSummary[];
  presence: Record<string, PresenceUser>;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onAddContact: () => void;
  onOpenSearch: () => void;
  onMarkAllRead: () => void;
  unreadTotal: number;
  onUpdateMembership: (id: string, patch: { is_pinned?: boolean; muted_until?: string | null; archived_at?: string | null }) => void;
  showArchived: boolean;
  onToggleArchived: () => void;
  onOpenProfile: () => void;
  meName?: string;
  meAvatar?: string | null;
}

function relTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function ConversationList({
  conversations, presence, activeId, onSelect, onNewChat, onNewGroup, onAddContact,
  onOpenSearch, onMarkAllRead, unreadTotal, onUpdateMembership, showArchived, onToggleArchived,
  onOpenProfile, meName, meAvatar,
}: ConversationListProps) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const visible = conversations.filter((c) => (showArchived ? !!c.archived_at : !c.archived_at));

  const unreadConversations = useMemo(
    () => visible.filter((c) => c.unreadCount > 0 && !(c.muted_until && new Date(c.muted_until) > new Date())),
    [visible],
  );

  const titleFor = (c: ConversationSummary) =>
    c.type === 'group' ? c.name || 'Group' : (c.members?.[0]?.name || c.name || 'Conversation');

  const jumpToUnread = () => {
    const first = unreadConversations[0];
    if (!first) return;
    onSelect(first.id);
    rowRefs.current[first.id]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#111b21]">
      {/* Bold header */}
      <div className="bg-[#202c33] px-4 pt-4 pb-3 text-white border-b border-[#2a3942]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight leading-tight text-[#e9edef]">{showArchived ? 'Archived' : 'Oceans Chat'}</h2>
            <p className="text-[11px] text-[#8696a0] mt-0.5">
              {showArchived ? 'Hidden conversations' : 'Your organization-wide team inbox'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onOpenProfile} className="cursor-pointer" title="My profile">
              <Avatar name={meName} avatar_url={meAvatar} userId="me" size={36} />
            </button>
            <button onClick={onAddContact} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[#aebac1] cursor-pointer" title="Add contact">
              <i className="ri-user-add-line text-lg" />
            </button>
            <button onClick={onNewGroup} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[#aebac1] cursor-pointer" title="New group">
              <i className="ri-group-line text-lg" />
            </button>
            <button onClick={onNewChat} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#00a884] text-[#0b141a] hover:bg-[#06cf9c] cursor-pointer" title="New chat">
              <i className="ri-chat-new-line text-lg" />
            </button>
          </div>
        </div>

        {/* Search → opens global search */}
        <button
          onClick={onOpenSearch}
          className="mt-3 w-full flex items-center gap-2 pl-3 pr-2 py-2 bg-[#2a3942] hover:bg-[#324650] rounded-xl text-left cursor-pointer transition-colors"
        >
          <i className="ri-search-line text-sm text-[#8696a0]" />
          <span className="text-sm text-[#8696a0]">Search chats &amp; messages</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[#8696a0]">⌘K</kbd>
        </button>
      </div>

      {/* Unread controls */}
      {!showArchived && (unreadTotal > 0 || unreadConversations.length > 0) && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a3942] bg-[#111b21]">
          <button
            onClick={jumpToUnread}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#00a884] text-[#0b141a] text-xs font-semibold hover:bg-[#06cf9c] cursor-pointer whitespace-nowrap"
          >
            <i className="ri-arrow-down-line" /> {unreadTotal} unread
          </button>
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#2a3942] text-[#aebac1] text-xs font-semibold hover:bg-[#324650] cursor-pointer whitespace-nowrap ml-auto"
          >
            <i className="ri-check-double-line" /> Mark all read
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#202c33] flex items-center justify-center mb-3">
              <i className="ri-chat-smile-2-line text-[#00a884] text-xl" />
            </div>
            <p className="text-sm text-[#8696a0]">{showArchived ? 'No archived chats' : 'No conversations yet'}</p>
            {!showArchived && <p className="text-xs text-[#667781] mt-1">Tap the pencil to start a chat</p>}
          </div>
        ) : (
          visible.map((c) => {
            const active = activeId === c.id;
            const muted = c.muted_until && new Date(c.muted_until) > new Date();
            const isDirect = c.type !== 'group';
            const peer = isDirect ? c.members?.[0] : undefined;
            const peerState = peer ? presenceOf(peer.user_id, presence) : undefined;
            const hasUnread = c.unreadCount > 0 && !muted;
            return (
              <div
                key={c.id}
                ref={(el) => { rowRefs.current[c.id] = el; }}
                className="relative mb-2 last:mb-0"
              >
                <button
                  onClick={() => onSelect(c.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors rounded-xl border ${active ? 'bg-[#2a3942] border-[#2a3942]' : 'bg-[#202c33] border-[#2a3942]/60 hover:bg-[#2a3942] hover:border-[#2a3942]'}`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar
                      name={titleFor(c)}
                      avatar_url={isDirect ? peer?.avatar_url : c.avatar_url}
                      userId={isDirect ? (peer?.user_id || c.id) : c.id}
                      size={50}
                      showBadge={isDirect}
                      state={peerState}
                    />
                    {c.type === 'group' && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#2a3942] text-[#8696a0] flex items-center justify-center border-2 border-[#202c33]">
                        <i className="ri-group-fill text-[10px]" />
                      </span>
                    )}
                    {muted && <i className="ri-volume-mute-line absolute -top-0.5 -right-0.5 text-[#8696a0] text-xs bg-[#202c33] rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[15px] truncate ${hasUnread || active ? 'font-bold text-[#e9edef]' : 'font-semibold text-[#d1d7db]'}`}>{titleFor(c)}</p>
                      <span className={`text-[10px] flex-shrink-0 ${hasUnread ? 'text-[#00a884] font-bold' : 'text-[#8696a0]'}`}>
                        {c.is_pinned ? <i className="ri-pushpin-2-fill" /> : relTime(c.preview_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-xs truncate ${hasUnread ? 'font-medium text-[#8696a0]' : 'text-[#667781]'}`}>
                        {c.type === 'group' && c.sender_name ? <span className="font-semibold text-[#8696a0]">{c.sender_name}: </span> : ''}
                        {c.preview || 'No messages yet'}
                      </p>
                      {hasUnread && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#00a884] text-[#0b141a] text-[10px] font-bold flex items-center justify-center flex-shrink-0">{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === c.id ? null : c.id); }}
                  className="absolute top-3.5 right-3.5 p-1 text-[#8696a0] hover:text-[#e9edef] cursor-pointer"
                >
                  <i className="ri-more-2-fill text-base" />
                </button>
                {menuFor === c.id && (
                  <div className="absolute right-3.5 top-11 z-30 bg-[#233138] border border-[#2a3942] rounded-lg min-w-[160px] py-1">
                    <button onClick={() => { onUpdateMembership(c.id, { is_pinned: !c.is_pinned }); setMenuFor(null); }} className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-[#182229] cursor-pointer text-[#d1d7db]">
                      <i className="ri-pushpin-2-line" /> {c.is_pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button onClick={() => { onUpdateMembership(c.id, { muted_until: muted ? null : new Date(Date.now() + 30 * 86400000).toISOString() }); setMenuFor(null); }} className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-[#182229] cursor-pointer text-[#d1d7db]">
                      <i className="ri-volume-mute-line" /> {muted ? 'Unmute' : 'Mute'}
                    </button>
                    <button onClick={() => { onUpdateMembership(c.id, { archived_at: c.archived_at ? null : new Date().toISOString() }); setMenuFor(null); }} className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-[#182229] cursor-pointer text-[#d1d7db]">
                      <i className="ri-archive-line" /> {c.archived_at ? 'Unarchive' : 'Archive'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t border-[#2a3942]">
        <button onClick={onToggleArchived} className="w-full text-xs text-[#8696a0] hover:text-[#e9edef] py-1.5 cursor-pointer">
          <i className="ri-inbox-archive-line mr-1.5" /> {showArchived ? 'Back to chats' : 'Archived'}
        </button>
      </div>
    </div>
  );
}