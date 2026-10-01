import type { PresenceState, PresenceUser, TeamMember } from '../types';

export type { PresenceState } from '../types';

/**
 * ─────────────────────────────────────────────────────────────
 * THE ONE PRESENCE COMPONENT.
 *
 * Every surface in the app (Directory, member card, member profile,
 * conversation list, conversation header, new-chat / group pickers, message
 * surfaces) renders presence through the helpers in this file, reading the ONE
 * global store. No surface computes presence on its own.
 *
 * Exactly three states:
 *   🟢 Online  — bright green
 *   🔵 Away    — dark blue-steel with a clock / away icon
 *   ⚫ Offline — neutral dark grey
 * ─────────────────────────────────────────────────────────────
 */

const ONLINE_DOT = 'bg-emerald-500';
const OFFLINE_DOT = 'bg-[#8696a0]';
/** Dark blue-steel used for the Away state. */
const AWAY_STEEL = '#3f5c78';

export const PRESENCE_META: Record<PresenceState, { label: string; text: string }> = {
  online: { label: 'Online', text: 'text-emerald-400' },
  away: { label: 'Away', text: 'text-[#8fb0cf]' },
  offline: { label: 'Offline', text: 'text-[#8696a0]' },
};

/** Sort weight — online first, then away, then offline. */
const PRESENCE_RANK: Record<PresenceState, number> = { online: 0, away: 1, offline: 2 };

/** The single resolver: a member id → one live state, always. */
export function presenceStateOf(userId: string, presence: Record<string, PresenceUser>): PresenceState {
  const s = presence[userId]?.state;
  return s === 'online' ? 'online' : s === 'away' ? 'away' : 'offline';
}

export function presenceRank(state: PresenceState): number {
  return PRESENCE_RANK[state];
}

export function presenceLabel(state: PresenceState): string {
  return PRESENCE_META[state].label;
}

/**
 * The canonical presence marker: a bright green dot (online), a dark
 * blue-steel clock (away) or a neutral grey dot (offline).
 */
export function PresenceMark({ state, size = 10 }: { state: PresenceState; size?: number }) {
  if (state === 'away') {
    const d = size + 4;
    return (
      <span
        className="inline-flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: d, height: d, backgroundColor: AWAY_STEEL }}
      >
        <i className="ri-time-line text-white leading-none" style={{ fontSize: Math.max(7, size - 2) }} />
      </span>
    );
  }
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${state === 'online' ? `${ONLINE_DOT} ring-2 ring-emerald-500/25` : OFFLINE_DOT}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Marker + word: "🟢 Online" / "🔵🕐 Away" / "⚫ Offline". */
export function PresenceText({ state, className = '' }: { state: PresenceState; className?: string }) {
  const meta = PRESENCE_META[state];
  return (
    <span className={`inline-flex items-center gap-1.5 ${meta.text} ${className}`}>
      <PresenceMark state={state} />
      {meta.label}
    </span>
  );
}

/** Convenience wrapper for a directory member. */
export function StatusPill({ member, presence }: { member: TeamMember; presence: Record<string, PresenceUser> }) {
  return <PresenceText state={presenceStateOf(member.user_id, presence)} className="text-[11px]" />;
}

/**
 * The corner badge drawn on an avatar — same three states, same source.
 * Online is a bright green dot, Away is a dark blue-steel clock, Offline is a
 * neutral grey dot.
 */
export function PresenceBadge({ state, size }: { state: PresenceState; size: number }) {
  const d = Math.max(12, size * 0.31);
  if (state === 'away') {
    return (
      <span
        className="absolute bottom-0 right-0 rounded-full border-2 border-[#202c33] flex items-center justify-center"
        style={{ width: d, height: d, backgroundColor: AWAY_STEEL }}
      >
        <i className="ri-time-line text-white leading-none" style={{ fontSize: Math.max(7, d - 5) }} />
      </span>
    );
  }
  return (
    <span
      className={`absolute bottom-0 right-0 rounded-full border-2 border-[#202c33] ${state === 'online' ? `${ONLINE_DOT} ring-2 ring-emerald-500/25` : OFFLINE_DOT}`}
      style={{ width: d, height: d }}
    />
  );
}