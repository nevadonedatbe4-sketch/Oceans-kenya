import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, presenceOf, PresenceText, presenceRank } from './Avatar';
import type { PresenceUser, ShareObject, TeamMember } from '../types';

const MODAL_CLS = 'fixed inset-0 z-50 flex items-center justify-center p-4';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
export function ModalShell({ title, onClose, children, footer }: ModalProps) {
  return (
    <div className={MODAL_CLS}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#111b21] rounded-2xl border border-[#2a3942] flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3942]">
          <h2 className="text-lg font-medium text-[#e9edef]">{title}</h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] cursor-pointer p-1"><i className="ri-close-line text-xl" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-[#2a3942] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// New chat (pick a teammate → 1:1)
// ─────────────────────────────────────────────
interface NewChatProps {
  directory: TeamMember[];
  presence: Record<string, PresenceUser>;
  onSelect: (userId: string) => void;
  onNewGroup?: () => void;
  onAddContact?: () => void;
  onClose: () => void;
}
export function NewChatModal({ directory, presence, onSelect, onNewGroup, onAddContact, onClose }: NewChatProps) {
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
  const onlineCount = directory.filter((m) => presenceOf(m.user_id, presence) === 'online').length;

  return (
    <ModalShell title="New chat" onClose={onClose}>
      {onNewGroup && (
        <button onClick={onNewGroup} className="w-full flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-[#202c33] hover:bg-[#2a3942] cursor-pointer text-left transition-colors">
          <span className="w-11 h-11 rounded-full bg-[#00a884] text-[#0b141a] flex items-center justify-center flex-shrink-0">
            <i className="ri-group-line text-xl" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[#e9edef]">New group</span>
            <span className="block text-xs text-[#8696a0]">Chat with several teammates at once</span>
          </span>
          <i className="ri-arrow-right-s-line text-[#8696a0] ml-auto text-lg" />
        </button>
      )}
      {onAddContact && (
        <button onClick={onAddContact} className="w-full flex items-center gap-3 px-3 py-3 mb-3 rounded-xl bg-[#202c33] hover:bg-[#2a3942] cursor-pointer text-left transition-colors">
          <span className="w-11 h-11 rounded-full bg-[#2a3942] text-[#00a884] flex items-center justify-center flex-shrink-0">
            <i className="ri-user-add-line text-xl" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[#e9edef]">Add contact</span>
            <span className="block text-xs text-[#8696a0]">Save a teammate or client by name, email or phone</span>
          </span>
          <i className="ri-arrow-right-s-line text-[#8696a0] ml-auto text-lg" />
        </button>
      )}

      <div className="relative mb-2">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8696a0]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teammates" className="w-full pl-9 pr-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]" />
      </div>

      {!query && (
        <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8696a0]">
          Teammates · {onlineCount} online
        </p>
      )}

      <div className="space-y-0.5">
        {list.length === 0 && <p className="text-xs text-[#8696a0] text-center py-8">No teammates found</p>}
        {list.map((m) => {
          const st = presenceOf(m.user_id, presence);
          if (m.external) {
            return (
              <div key={m.user_id} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg opacity-70">
                <Avatar name={m.name} userId={m.user_id} size={42} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#e9edef] truncate">{m.name}</p>
                  <p className="text-xs text-[#8696a0] truncate">{m.email || m.phone || 'Saved contact'}</p>
                </div>
                <span className="text-[10px] text-[#8696a0] whitespace-nowrap">Not on platform</span>
              </div>
            );
          }
          return (
            <button key={m.user_id} onClick={() => onSelect(m.user_id)} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#202c33] cursor-pointer text-left">
              <Avatar name={m.name} avatar_url={m.avatar_url} userId={m.user_id} size={42} showBadge state={st} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#e9edef] truncate">{m.name}</p>
                <p className="text-xs text-[#8696a0] truncate">
                  {st !== 'offline'
                    ? <PresenceText state={st} className="font-medium" />
                    : (m.title || (m.role === 'admin' ? 'Admin' : m.role === 'super_admin' ? 'Super Admin' : 'Agent'))}
                </p>
              </div>
              <span className="w-8 h-8 rounded-full bg-[#2a3942] text-[#00a884] flex items-center justify-center flex-shrink-0">
                <i className="ri-chat-new-line" />
              </span>
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────
// Group — create + manage (rename, members, admins)
// Submitting awaits the real work and only closes on success, surfacing any
// failure inline so the save flow can never silently no-op.
// ─────────────────────────────────────────────
interface GroupProps {
  mode: 'create' | 'edit';
  directory: TeamMember[];
  presence: Record<string, PresenceUser>;
  existingMembers?: TeamMember[];
  existingName?: string;
  existingDescription?: string;
  onCreate?: (name: string, desc: string, memberIds: string[]) => Promise<void>;
  onSave?: (name: string, desc: string, addIds: string[], removeIds: string[], adminIds: string[]) => Promise<void>;
  onClose: () => void;
  busy?: boolean;
}
export function GroupModal({ mode, directory, presence, existingMembers = [], existingName = '', existingDescription = '', onCreate, onSave, onClose, busy }: GroupProps) {
  const [name, setName] = useState(existingName);
  const [desc, setDesc] = useState(existingDescription);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set(existingMembers.filter((m) => m.role === 'admin').map((m) => m.user_id)));
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedDir = useMemo(() => [...directory].filter((m) => !m.external).sort((a, b) => a.name.localeCompare(b.name)), [directory]);
  const hasSearch = q.trim().length > 0;

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const toggleMember = (id: string) => {
    if (mode === 'create') toggleSet(setSelected, id);
    else toggleSet(setAdded, id);
  };

  const memberCount = mode === 'create'
    ? selected.size
    : existingMembers.filter((m) => !removed.has(m.user_id)).length + added.size;

  const canSubmit = mode === 'create'
    ? (name.trim().length > 0 || selected.size > 0)
    : name.trim().length > 0;

  const autoName = () => {
    const chosen = directory.filter((m) => selected.has(m.user_id)).map((m) => m.name.split(' ')[0]);
    if (chosen.length === 0) return 'New group';
    if (chosen.length === 1) return chosen[0];
    if (chosen.length === 2) return `${chosen[0]} & ${chosen[1]}`;
    return `${chosen[0]} & ${chosen.length - 1} others`;
  };

  const submit = async () => {
    setError(null);
    if (!canSubmit) {
      setError(mode === 'create'
        ? 'Pick at least one teammate or give the group a name.'
        : 'Give the group a name before saving.');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'create') {
        await onCreate?.(name.trim() || autoName(), desc.trim(), Array.from(selected));
      } else {
        await onSave?.(name.trim(), desc.trim(), Array.from(added), Array.from(removed), Array.from(adminIds));
      }
      onClose();
    } catch (e) {
      setError((e as Error)?.message || 'Something went wrong saving this group. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const working = busy || saving;

  return (
    <ModalShell
      title={mode === 'create' ? 'New group' : 'Manage group'}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[#8696a0] hover:bg-[#202c33] cursor-pointer whitespace-nowrap">Cancel</button>
          <button
            onClick={submit}
            disabled={working || !canSubmit}
            className="px-4 py-2 rounded-lg bg-[#00a884] text-[#0b141a] text-sm font-medium hover:bg-[#06cf9c] cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            {working ? <span className="inline-flex items-center gap-1.5"><i className="ri-loader-4-line animate-spin" /> Saving...</span> : mode === 'create' ? 'Create group' : 'Save changes'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00a884] bg-[#202c33] px-2.5 py-1 rounded-full">
            <i className="ri-group-line" /> {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
          {mode === 'create' && (
            <span className="text-[11px] text-[#8696a0]">Members added to the group get a notification</span>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-300">
            <i className="ri-error-warning-line text-sm mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-[#8696a0]">Group name{mode === 'create' && <span className="font-normal text-[#667781]"> · optional</span>}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === 'create' ? 'Leave blank to auto-name from members' : 'e.g. Sales Team'} maxLength={80} className="mt-1 w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#8696a0]">Description</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} maxLength={200} placeholder="What is this group about?" className="mt-1 w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] resize-none" />
        </div>

        {/* edit: current members */}
        {mode === 'edit' && (
          <div>
            <label className="text-xs font-semibold text-[#8696a0]">Members</label>
            <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
              {existingMembers.length === 0 && <p className="text-xs text-[#8696a0] py-1">No members yet</p>}
              {existingMembers.map((m) => {
                const isRemoved = removed.has(m.user_id);
                const isAdmin = adminIds.has(m.user_id);
                return (
                  <div key={m.user_id} className={`flex items-center gap-2 px-2 py-1.5 rounded ${isRemoved ? 'opacity-40 line-through' : ''}`}>
                    <Avatar name={m.name} avatar_url={m.avatar_url} userId={m.user_id} size={30} />
                    <span className="flex-1 text-sm text-[#d1d7db] truncate">{m.name}</span>
                    <button
                      onClick={() => toggleSet(setAdminIds, m.user_id)}
                      className={`text-[10px] px-2 py-1 rounded-full cursor-pointer whitespace-nowrap ${isAdmin ? 'bg-[#005c4b] text-[#d1fae5]' : 'bg-[#202c33] text-[#8696a0]'}`}
                    >
                      admin
                    </button>
                    <button onClick={() => toggleSet(setRemoved, m.user_id)} className="text-red-400 hover:text-red-300 cursor-pointer" title={isRemoved ? 'Keep member' : 'Remove member'}>
                      <i className={isRemoved ? 'ri-user-add-line' : 'ri-user-unfollow-line'} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-[#8696a0]">{mode === 'edit' ? 'Add members' : 'Add teammates'}</label>
          <div className="relative mt-1">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8696a0]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={mode === 'edit' ? 'Search to add...' : 'Search teammates...'} className="w-full pl-9 pr-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]" />
          </div>
          <div className="mt-1.5 space-y-0.5 max-h-40 overflow-y-auto">
            {sortedDir.map((m) => {
              const checked = mode === 'create' ? selected.has(m.user_id) : added.has(m.user_id);
              const alreadyIn = mode === 'edit' && existingMembers.some((em) => em.user_id === m.user_id) && !removed.has(m.user_id);
              if (alreadyIn && !hasSearch) return null;
              return (
                <button key={m.user_id} onClick={() => toggleMember(m.user_id)} disabled={alreadyIn && !hasSearch} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-[#202c33] cursor-pointer disabled:cursor-default ${checked ? 'bg-[#202c33]' : ''}`}>
                  <input type="checkbox" readOnly checked={checked} className="accent-[#00a884]" />
                  <Avatar name={m.name} avatar_url={m.avatar_url} userId={m.user_id} size={28} showBadge state={presenceOf(m.user_id, presence)} />
                  <span className="flex-1 text-sm text-[#d1d7db] truncate">{m.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────
// Share CRM context picker
// ─────────────────────────────────────────────
const SHARE_TYPES: { key: ShareObject['type']; label: string; icon: string }[] = [
  { key: 'property', label: 'Property', icon: 'ri-home-4-line' },
  { key: 'listing', label: 'Listing', icon: 'ri-building-2-line' },
  { key: 'lead', label: 'Lead', icon: 'ri-user-follow-line' },
  { key: 'client', label: 'Client', icon: 'ri-user-star-line' },
  { key: 'viewing', label: 'Viewing', icon: 'ri-eye-line' },
  { key: 'deal', label: 'Deal', icon: 'ri-hand-coin-line' },
];

interface SharePickerProps {
  onShare: (share: ShareObject) => void;
  onClose: () => void;
}
export function SharePickerModal({ onShare, onClose }: SharePickerProps) {
  const [type, setType] = useState<ShareObject['type']>('property');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = async () => {
    setLoading(true);
    try {
      let rows: any[] = [];
      if (type === 'property' || type === 'listing') {
        const { data } = await supabase.from('listings').select('id,title,price,slug').ilike('title', `%${q}%`).limit(10);
        rows = (data || []).map((r) => ({ id: r.id, title: r.title, subtitle: `KSh ${Number(r.price || 0).toLocaleString()}`, href: '/agent/listings' }));
      } else if (type === 'lead') {
        const { data } = await supabase.from('leads').select('id,first_name,last_name,status').ilike('first_name', `%${q}%`).limit(10);
        rows = (data || []).map((r) => ({ id: r.id, title: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Lead', subtitle: r.status || 'New lead', href: '/agent/leads' }));
      } else if (type === 'client' || type === 'contact') {
        const { data } = await supabase.from('contacts').select('id,name,email').ilike('name', `%${q}%`).limit(10);
        rows = (data || []).map((r) => ({ id: r.id, title: r.name || 'Contact', subtitle: r.email || '', href: '/agent/contacts' }));
      } else if (type === 'viewing') {
        const { data } = await supabase.from('og_appointments').select('id,title,status').eq('kind', 'viewing').ilike('title', `%${q}%`).limit(10);
        rows = (data || []).map((r) => ({ id: r.id, title: r.title, subtitle: `Viewing · ${r.status || 'scheduled'}`, href: undefined }));
      } else if (type === 'deal') {
        const { data } = await supabase.from('deals').select('id,title,status').ilike('title', `%${q}%`).limit(10);
        rows = (data || []).map((r) => ({ id: r.id, title: r.title || 'Deal', subtitle: r.status || '', href: '/agent/leads' }));
      }
      setResults(rows);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (q.trim().length >= 2) runSearch(); else setResults([]);   }, [type]);

  return (
    <ModalShell title="Share from CRM" onClose={onClose}>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {SHARE_TYPES.map((t) => (
          <button key={t.key} onClick={() => { setType(t.key); runSearch(); }} className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap ${type === t.key ? 'bg-[#00a884] text-[#0b141a]' : 'bg-[#202c33] text-[#aebac1] hover:bg-[#2a3942]'}`}>
            <i className={`${t.icon} mr-1`} /> {t.label}
          </button>
        ))}
      </div>
      <div className="relative mb-3">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8696a0]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runSearch()} placeholder="Search to attach a record..." className="w-full pl-9 pr-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]" />
      </div>
      <div className="space-y-1">
        {loading && <p className="text-xs text-[#8696a0] text-center py-4">Searching...</p>}
        {!loading && q.trim().length < 2 && <p className="text-xs text-[#8696a0] text-center py-4">Type at least 2 characters to search</p>}
        {!loading && q.trim().length >= 2 && results.length === 0 && <p className="text-xs text-[#8696a0] text-center py-4">No records found</p>}
        {results.map((r) => (
          <button key={r.id} onClick={() => onShare({ type, id: r.id, title: r.title, subtitle: r.subtitle, href: r.href })} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#202c33] cursor-pointer text-left">
            <div className="h-9 w-9 rounded-lg bg-[#202c33] text-[#00a884] flex items-center justify-center"><i className={`${SHARE_TYPES.find((t) => t.key === type)?.icon || 'ri-share-line'} text-base`} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#e9edef] truncate">{r.title}</p>
              <p className="text-xs text-[#8696a0] truncate">{r.subtitle}</p>
            </div>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}