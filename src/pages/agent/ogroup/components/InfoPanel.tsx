import { Avatar, StatusPill, presenceOf, PresenceText } from './Avatar';
import { fileIconKind, fileIconMeta } from '../mediaUtils';
import type { ConversationSummary, MessageItem, PresenceUser, TeamMember } from '../types';

interface InfoPanelProps {
  conversation: ConversationSummary | null;
  messages: MessageItem[];
  members: TeamMember[];
  presence: Record<string, PresenceUser>;
  isGroupAdmin: boolean;
  onClose: () => void;
  onUpdateMembership: (patch: { muted_until?: string | null; archived_at?: string | null }) => void;
  onEditGroup: () => void;
}

const DEFAULT_ABOUT = "Hey there! I'm using the team Messenger.";

export function InfoPanel({
  conversation, messages, members, presence, isGroupAdmin,
  onClose, onUpdateMembership, onEditGroup,
}: InfoPanelProps) {
  if (!conversation) return null;

  const isGroup = conversation.type === 'group';
  const peer = isGroup ? undefined : conversation.members?.[0];
  const peerState = peer ? presenceOf(peer.user_id, presence) : 'offline';

  const sharedFiles = messages.filter((m) => m.attachment_url && !m.deleted_at);

  const heroName = isGroup ? conversation.name || 'Group' : peer?.name || 'Direct conversation';
  const heroAvatar = isGroup ? conversation.avatar_url : peer?.avatar_url;
  const heroId = isGroup ? conversation.id : (peer?.user_id || conversation.id);

  return (
    <aside className="w-full lg:w-[320px] border-l border-[#2a3942] bg-[#111b21] flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3942]">
        <span className="text-sm font-semibold text-[#e9edef]">Details</span>
        <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] cursor-pointer p-1"><i className="ri-close-line text-lg" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* header */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20">
            <Avatar name={heroName} avatar_url={heroAvatar} userId={heroId} size={80} showBadge={!isGroup} state={peerState} />
          </div>
          <h3 className="mt-2 text-base font-medium text-[#e9edef]">{heroName}</h3>
          {!isGroup && peer?.title && <p className="text-xs text-[#00a884] font-medium mt-0.5">{peer.title}</p>}
          {!isGroup && (peer?.country || peer?.office || peer?.department) && (
            <p className="text-[11px] text-[#8696a0] mt-0.5">{[peer?.country, peer?.office, peer?.department].filter(Boolean).join(' · ')}</p>
          )}
          <div className="text-[11px] mt-1">
            {isGroup
              ? <span className="text-[#8696a0]">{conversation.member_count} member{conversation.member_count !== 1 ? 's' : ''}</span>
              : <PresenceText state={peerState} className="justify-center" />}
          </div>
          {isGroup && conversation.description && <p className="text-xs text-[#8696a0] mt-1">{conversation.description}</p>}
        </div>

        {/* direct: about */}
        {!isGroup && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8696a0] mb-1">About</p>
            <p className="text-xs text-[#d1d7db] leading-relaxed whitespace-pre-wrap">{peer?.about || DEFAULT_ABOUT}</p>
          </div>
        )}

        {/* direct: contact details */}
        {!isGroup && (peer?.phone || peer?.email) && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8696a0]">Contact</p>
            {peer?.phone && (
              <a href={`tel:${peer.phone}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#202c33] hover:bg-[#2a3942] cursor-pointer">
                <span className="w-9 h-9 rounded-full bg-[#005c4b] text-[#d1fae5] flex items-center justify-center flex-shrink-0"><i className="ri-phone-line" /></span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-[#8696a0]">Phone</span>
                  <span className="block text-sm text-[#e9edef] truncate">{peer.phone}</span>
                </span>
              </a>
            )}
            {peer?.email && (
              <a href={`mailto:${peer.email}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#202c33] hover:bg-[#2a3942] cursor-pointer">
                <span className="w-9 h-9 rounded-full bg-[#2a3942] text-[#aebac1] flex items-center justify-center flex-shrink-0"><i className="ri-mail-line" /></span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-[#8696a0]">Email</span>
                  <span className="block text-sm text-[#e9edef] truncate">{peer.email}</span>
                </span>
              </a>
            )}
          </div>
        )}

        {isGroup && isGroupAdmin && (
          <button onClick={onEditGroup} className="w-full py-1.5 rounded-lg text-xs font-medium text-[#00a884] bg-[#202c33] hover:bg-[#2a3942] cursor-pointer whitespace-nowrap">
            <i className="ri-settings-3-line mr-1" /> Manage group
          </button>
        )}

        {/* members */}
        {isGroup && members.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8696a0]">Members</p>
            {members.map((m) => {
              const st = presenceOf(m.user_id, presence);
              return (
                <div key={m.user_id} className="flex items-center gap-2.5">
                  <Avatar
                    name={m.name}
                    avatar_url={m.avatar_url}
                    userId={m.user_id}
                    size={36}
                    showBadge
                    state={st}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#d1d7db] truncate">
                      {m.name} {m.role === 'admin' && <span className="text-[10px] text-[#00a884] font-normal">· admin</span>}
                    </p>
                    {m.title && <p className="text-[10px] text-[#667781] truncate">{m.title}</p>}
                    <StatusPill member={m} presence={presence} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* shared files */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8696a0]">Shared files</p>
          {sharedFiles.length === 0 ? (
            <p className="text-xs text-[#8696a0]">No shared files yet</p>
          ) : (
            sharedFiles.slice(0, 10).map((m) => {
              const kind = fileIconKind(m.attachment_mime, m.attachment_name);
              const meta = fileIconMeta(kind);
              const label = m.attachment_name
                || (kind === 'image' ? 'Photo' : kind === 'video' ? 'Video' : kind === 'audio' ? 'Voice message' : (m.body || 'File'));
              return (
                <a key={m.id} href={m.attachment_url!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#e9edef] hover:text-[#00a884] font-medium">
                  <span className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.fg}`}>
                    <i className={`${meta.icon} text-sm`} />
                  </span>
                  <span className="truncate">{label}</span>
                  <span className="text-[#8696a0] ml-auto text-[10px] flex-shrink-0">{new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </a>
              );
            })
          )}
        </div>

        {/* actions */}
        <div className="space-y-1.5 pt-2 border-t border-[#2a3942]">
          <button onClick={() => onUpdateMembership({ muted_until: conversation.muted_until ? null : new Date(Date.now() + 30 * 86400000).toISOString() })} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#aebac1] hover:bg-[#202c33] cursor-pointer">
            <i className="ri-volume-mute-line" /> {conversation.muted_until ? 'Unmute' : 'Mute notifications'}
          </button>
          <button onClick={() => onUpdateMembership({ archived_at: conversation.archived_at ? null : new Date().toISOString() })} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#aebac1] hover:bg-[#202c33] cursor-pointer">
            <i className="ri-archive-line" /> {conversation.archived_at ? 'Unarchive' : 'Archive chat'}
          </button>
        </div>
      </div>
    </aside>
  );
}