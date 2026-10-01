import { useMemo, useState } from 'react';
import { Avatar, presenceOf, PresenceText, presenceRank } from './Avatar';
import type { PresenceUser, TeamMember } from '../types';

interface StartChatPanelProps {
  directory: TeamMember[];
  presence: Record<string, PresenceUser>;
  onSelect: (userId: string) => void;
  onNewGroup: () => void;
  onAddContact: () => void;
}

/**
 * WhatsApp-style "start a conversation" landing panel. Shown in the chat pane
 * when no conversation is open, so picking a 1:1 chat is the obvious next step
 * instead of a hidden action.
 */
export function StartChatPanel({ directory, presence, onSelect, onNewGroup, onAddContact }: StartChatPanelProps) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const sorted = useMemo(
    () => [...directory].sort((a, b) => {
      if (!!a.external !== !!b.external) return a.external ? 1 : -1;
      const ao = presenceRank(presenceOf(a.user_id, presence));
      const bo = presenceRank(presenceOf(b.user_id, presence));
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    }),
    [directory, presence],
  );
  const list = sorted.filter((m) => !query || (m.name || '').toLowerCase().includes(query) || (m.email || '').toLowerCase().includes(query));
  const active = list.filter((m) => presenceOf(m.user_id, presence) !== 'offline');

  const Row = ({ m }: { m: TeamMember }) => {
    const st = presenceOf(m.user_id, presence);
    if (m.external) {
      return (
        <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-70">
          <Avatar name={m.name} userId={m.user_id} size={46} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#e9edef] truncate">{m.name}</p>
            <p className="text-xs text-[#8696a0] truncate">{m.email || m.phone || 'Saved contact'}</p>
          </div>
          <span className="text-[10px] text-[#8696a0] whitespace-nowrap">Not on platform</span>
        </div>
      );
    }
    return (
      <button onClick={() => onSelect(m.user_id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#202c33] cursor-pointer text-left transition-colors">
        <Avatar name={m.name} avatar_url={m.avatar_url} userId={m.user_id} size={46} showBadge state={st} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#e9edef] truncate">{m.name}</p>
          <p className="text-xs truncate">
            {st !== 'offline'
              ? <PresenceText state={st} className="font-medium" />
              : <span className="text-[#8696a0]">{m.title || (m.role === 'admin' ? 'Admin' : m.role === 'super_admin' ? 'Super Admin' : m.role === 'contact' ? 'Saved contact' : 'Agent')}</span>}
          </p>
        </div>
        <span className="w-9 h-9 rounded-full bg-[#2a3942] text-[#00a884] flex items-center justify-center flex-shrink-0">
          <i className="ri-chat-new-line" />
        </span>
      </button>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[#0b141a] p-6">
      <div className="w-full max-w-md bg-[#111b21] rounded-2xl border border-[#2a3942] overflow-hidden flex flex-col max-h-full">
        <div className="px-5 pt-6 pb-4 text-center border-b border-[#2a3942]">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#00a884] text-[#0b141a] flex items-center justify-center mb-3">
            <i className="ri-chat-smile-2-line text-2xl" />
          </div>
          <h3 className="text-base font-semibold text-[#e9edef]">Start a conversation</h3>
          <p className="text-xs text-[#8696a0] mt-1">Pick a teammate for a 1:1 chat, or spin up a group</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button onClick={onAddContact} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2a3942] text-[#00a884] text-xs font-semibold hover:bg-[#324650] cursor-pointer whitespace-nowrap">
              <i className="ri-user-add-line" /> Add contact
            </button>
            <button onClick={onNewGroup} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2a3942] text-[#00a884] text-xs font-semibold hover:bg-[#324650] cursor-pointer whitespace-nowrap">
              <i className="ri-group-line" /> New group
            </button>
          </div>
        </div>

        <div className="px-4 pt-3">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8696a0]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teammates" className="w-full pl-9 pr-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {list.length === 0 && <p className="text-xs text-[#8696a0] text-center py-8">No teammates found</p>}
          {!query && active.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8696a0]">Active now</p>
              {active.map((m) => <Row key={m.user_id} m={m} />)}
            </>
          )}
          {list.length > 0 && (
            <>
              {!query && active.length > 0 && <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8696a0]">All teammates</p>}
              {list.map((m) => <Row key={m.user_id} m={m} />)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}