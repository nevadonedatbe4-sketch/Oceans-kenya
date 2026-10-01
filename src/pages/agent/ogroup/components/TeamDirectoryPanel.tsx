import { useMemo, useState } from 'react';
import { Avatar, presenceOf, PresenceText, presenceRank } from './Avatar';
import { ProfileCardModal } from './ProfileCardModal';
import type { PresenceUser, TeamMember } from '../types';

interface TeamDirectoryPanelProps {
  directory: TeamMember[];
  presence: Record<string, PresenceUser>;
  loading?: boolean;
  onMessage: (userId: string) => void;
  onAddContact: () => void;
}

function locLine(m: TeamMember): string {
  const parts = [m.country, m.department || m.title].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  if (m.role === 'super_admin') return 'Super Admin';
  if (m.role === 'admin') return 'Admin';
  return 'Team member';
}

/**
 * The Team tab — a searchable directory of everyone in the Oceans
 * organization. You can search by name, email, country, office, department or
 * role, and tapping anyone opens their profile card. Presence dots make it
 * obvious who is online right now.
 */
export function TeamDirectoryPanel({ directory, presence, loading, onMessage, onAddContact }: TeamDirectoryPanelProps) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [scope, setScope] = useState<'all' | 'online'>('all');

  const members = useMemo(() => directory.filter((m) => !m.external), [directory]);

  const onlineCount = useMemo(
    () => members.filter((m) => presenceOf(m.user_id, presence) === 'online').length,
    [members, presence],
  );
  const awayCount = useMemo(
    () => members.filter((m) => presenceOf(m.user_id, presence) === 'away').length,
    [members, presence],
  );

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    let filtered = !query
      ? members
      : members.filter((m) =>
          [m.name, m.email, m.country, m.office, m.department, m.title, m.role]
            .filter(Boolean)
            .some((v) => (v as string).toLowerCase().includes(query)),
        );
    if (scope === 'online') filtered = filtered.filter((m) => presenceOf(m.user_id, presence) !== 'offline');
    return [...filtered].sort((a, b) => {
      const ao = presenceRank(presenceOf(a.user_id, presence));
      const bo = presenceRank(presenceOf(b.user_id, presence));
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });
  }, [members, presence, q, scope]);

  const query = q.trim();

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#111b21] w-full">
      <div className="px-4 pt-4 pb-3 border-b border-[#2a3942] bg-[#202c33]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-[#e9edef]">Oceans Team</h2>
            <p className="text-[11px] text-[#8696a0] mt-0.5">
              {members.length} {members.length === 1 ? 'member' : 'members'} · <span className="text-emerald-400 font-medium">{onlineCount} online</span>
              {awayCount > 0 && <> · <span className="text-[#8fb0cf] font-medium">{awayCount} away</span></>}
            </p>
          </div>
          <button onClick={onAddContact} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2a3942] text-[#00a884] text-xs font-semibold hover:bg-[#324650] cursor-pointer whitespace-nowrap flex-shrink-0">
            <i className="ri-user-add-line" /> Add contact
          </button>
        </div>
        <div className="relative mt-3">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8696a0]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, country, team…"
            className="w-full pl-9 pr-3 py-2 bg-[#2a3942] border border-transparent rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
          />
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          {([['all', 'All'], ['online', 'Online Now']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setScope(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${scope === key ? 'bg-[#00a884] text-[#0b141a]' : 'bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef]'}`}
            >
              {key === 'online' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-12"><i className="ri-loader-4-line animate-spin text-[#8696a0] text-2xl" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#202c33] flex items-center justify-center mb-3">
              <i className="ri-team-line text-[#00a884] text-xl" />
            </div>
            <p className="text-sm text-[#8696a0]">{query ? 'No teammates match that search' : scope === 'online' ? 'No one is online right now' : 'No team members yet'}</p>
          </div>
        ) : (
          list.map((m) => {
            const st = presenceOf(m.user_id, presence);
            return (
              <button
                key={m.user_id}
                onClick={() => setSelected(m)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#202c33] cursor-pointer text-left transition-colors"
              >
                <Avatar
                  name={m.name}
                  avatar_url={m.avatar_url}
                  userId={m.user_id}
                  size={48}
                  showBadge
                  state={st}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#e9edef] truncate">{m.name}</p>
                  <p className="text-xs text-[#8696a0] truncate">{locLine(m)}</p>
                </div>
                <PresenceText state={st} className="text-[11px] flex-shrink-0" />
              </button>
            );
          })
        )}
      </div>

      {selected && (
        <ProfileCardModal
          member={selected}
          presence={presence}
          onMessage={(id) => { setSelected(null); onMessage(id); }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}