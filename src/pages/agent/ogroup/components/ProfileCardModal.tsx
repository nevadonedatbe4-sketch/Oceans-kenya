import { Avatar, presenceOf, PresenceText } from './Avatar';
import type { PresenceUser, TeamMember } from '../types';

interface ProfileCardModalProps {
  member: TeamMember;
  presence: Record<string, PresenceUser>;
  onMessage: (userId: string) => void;
  onClose: () => void;
}

const DEFAULT_ABOUT = "Hey there! I'm on the Oceans team.";

function roleLabel(m: TeamMember): string {
  if (m.external) return 'Saved contact';
  if (m.department) return m.department;
  if (m.title) return m.title;
  if (m.role === 'super_admin') return 'Super Admin';
  if (m.role === 'admin') return 'Admin';
  return 'Team member';
}

/**
 * Teammate profile card (WhatsApp-style "contact info"). Opens when you click
 * someone's name/photo in Oceans Chat, showing their photo, live presence and
 * organization details, with a one-tap "Message" action.
 */
export function ProfileCardModal({ member, presence, onMessage, onClose }: ProfileCardModalProps) {
  const state = presenceOf(member.user_id, presence);
  const location = [member.country, member.office].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 z-[66] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#111b21] rounded-2xl border border-[#2a3942] overflow-hidden">
        <div className="flex justify-end p-2">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8696a0] hover:bg-[#202c33] cursor-pointer"><i className="ri-close-line text-lg" /></button>
        </div>

        <div className="px-5 pb-5 -mt-4 flex flex-col items-center text-center">
          <Avatar
            name={member.name}
            avatar_url={member.avatar_url}
            userId={member.user_id}
            size={96}
            showBadge={!member.external}
            state={state}
          />
          <h3 className="mt-3 text-lg font-semibold text-[#e9edef]">{member.name}</h3>
          {!member.external && (
            <div className="mt-1 text-xs">
              <PresenceText state={state} className="justify-center" />
            </div>
          )}
          <p className="text-xs text-[#00a884] font-medium mt-1">{roleLabel(member)}</p>
          {location && <p className="text-xs text-[#8696a0] mt-0.5">{location}</p>}
          {member.external && <p className="text-xs text-[#8696a0] mt-1">Not on the platform yet</p>}

          <div className="w-full mt-4 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8696a0] mb-1">About</p>
            <p className="text-sm text-[#d1d7db] leading-relaxed whitespace-pre-wrap">{member.about || DEFAULT_ABOUT}</p>
          </div>

          {(member.phone || member.email) && (
            <div className="w-full mt-4 space-y-2 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8696a0]">Contact</p>
              {member.phone && (
                <a href={`tel:${member.phone}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#202c33] hover:bg-[#2a3942] cursor-pointer">
                  <span className="w-8 h-8 rounded-full bg-[#005c4b] text-[#d1fae5] flex items-center justify-center flex-shrink-0"><i className="ri-phone-line text-sm" /></span>
                  <span className="text-sm text-[#e9edef] truncate">{member.phone}</span>
                </a>
              )}
              {member.email && (
                <a href={`mailto:${member.email}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#202c33] hover:bg-[#2a3942] cursor-pointer">
                  <span className="w-8 h-8 rounded-full bg-[#2a3942] text-[#aebac1] flex items-center justify-center flex-shrink-0"><i className="ri-mail-line text-sm" /></span>
                  <span className="text-sm text-[#e9edef] truncate">{member.email}</span>
                </a>
              )}
            </div>
          )}

          {!member.external && (
            <button
              onClick={() => onMessage(member.user_id)}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#00a884] text-[#0b141a] text-sm font-semibold hover:bg-[#06cf9c] cursor-pointer whitespace-nowrap"
            >
              <i className="ri-chat-new-line" /> Message
            </button>
          )}
        </div>
      </div>
    </div>
  );
}