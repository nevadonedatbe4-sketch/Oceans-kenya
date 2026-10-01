import type { PresenceState } from '../types';
import { PresenceBadge } from './Presence';

// Re-export the single presence vocabulary so every existing importer keeps a
// stable entry point. All presence rendering lives in ./Presence.
export {
  presenceStateOf as presenceOf,
  PresenceText,
  PresenceMark,
  StatusPill,
  presenceLabel,
  presenceRank,
} from './Presence';
export type { PresenceState } from '../types';

const AVATAR_PALETTE = ['#0d5959', '#001731', '#7a5c2e', '#3f3f46', '#0e7490', '#7c2d12'];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join('') || name[0]).toUpperCase();
}

export function avatarColor(id?: string | null): string {
  return AVATAR_PALETTE[hash(id || 'x') % AVATAR_PALETTE.length];
}

interface AvatarProps {
  name?: string | null;
  avatar_url?: string | null;
  userId?: string;
  size?: number;
  /** Live presence from the one global store — online / away / offline. */
  state?: PresenceState;
  showBadge?: boolean;
  square?: boolean;
}

/**
 * Avatar with the shared presence badge: green when online, blue-steel clock
 * when away, grey when offline. Presence always comes from the same global
 * source, so it is identical everywhere this avatar appears.
 */
export function Avatar({ name, avatar_url, userId, size = 40, state, showBadge, square }: AvatarProps) {
  const radius = square ? 'rounded-lg' : 'rounded-full';
  return (
    <div className="relative inline-flex flex-shrink-0" style={{ width: size, height: size }}>
      {avatar_url ? (
        <img
          src={avatar_url}
          alt={name || 'avatar'}
          className={`w-full h-full object-cover ${radius}`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-semibold text-white ${radius}`}
          style={{ backgroundColor: avatarColor(userId || name), fontSize: size * 0.38 }}
        >
          {initials(name)}
        </div>
      )}
      {showBadge && state != null && <PresenceBadge state={state} size={size} />}
    </div>
  );
}