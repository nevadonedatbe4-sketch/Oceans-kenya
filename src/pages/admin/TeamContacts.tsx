import { useMemo, useState } from 'react';
import {
  useTeamMembers,
  MEMBER_STATUSES,
  type TeamMember,
  type TeamMemberInput,
} from '@/hooks/useTeamMembers';
import TeamMemberModal from '@/pages/admin/components/TeamMemberModal';
import { addToast } from '@/pages/crm/components/CRMToast';

// ─────────────────────────────────────────────────────────────
// ADMIN TEAM CONTACTS — the INTERNAL STAFF DIRECTORY.
//
// "Strictly team, separate from site contacts": this lists the people
// who make up the org (with their team/department and role) — NOT the
// site's CRM clients, enquiries, buyers, sellers or newsletter signups.
// Backed by its own `team_members` table (admin-only RLS), so nothing
// here can ever leak in from, or bleed into, the client `contacts` list.
// ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-600' },
  on_leave: { label: 'On leave', className: 'bg-amber-50 text-amber-600' },
  inactive: { label: 'Inactive', className: 'bg-neutral-100 text-neutral-500' },
};

const AVATAR_COLORS = ['#0d5959', '#088135', '#f58300', '#ec4899', '#7c3aed', '#0ea5e9', '#6b7280'];

function colorFor(seed?: string | null) {
  if (!seed) return AVATAR_COLORS[6];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return AVATAR_COLORS[hash % (AVATAR_COLORS.length - 1)];
}

function initials(name: string) {
  const parts = (name || '').trim().split(/\s+/);
  return `${parts[0]?.charAt(0) || ''}${parts[1]?.charAt(0) || ''}`.toUpperCase() || '?';
}

function statusMeta(status: string) {
  return STATUS_META[status] || STATUS_META.active;
}

export default function TeamContacts() {
  const { members, teams, loading, error, reload, addMember, updateMember, removeMember } = useTeamMembers();
  const [query, setQuery] = useState('');
  const [activeTeam, setActiveTeam] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null);

  const teamCounts = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach((m) => {
      const key = (m.team || '').trim() || 'Unassigned';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const team = (m.team || '').trim() || 'Unassigned';
      if (activeTeam !== 'all' && team !== activeTeam) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (q) {
        const hay = `${m.name} ${m.role || ''} ${m.team || ''} ${m.email || ''} ${m.phone || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [members, activeTeam, statusFilter, query]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditing(m);
    setModalOpen(true);
  };

  const handleSubmit = async (input: TeamMemberInput) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateMember(editing.id, input);
        addToast('Team member updated', 'success');
      } else {
        await addMember(input);
        addToast('Team member added', 'success');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (e) {
      addToast((e as Error).message || 'Failed to save team member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await removeMember(confirmDelete.id);
      if (selected?.id === confirmDelete.id) setSelected(null);
      addToast('Team member removed', 'success');
    } catch (e) {
      addToast((e as Error).message || 'Failed to remove team member', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-medium text-white">Team Contacts</h1>
          <p className="text-lg font-medium text-neutral-300 mt-1">
            Internal team &amp; staff directory · {members.length} {members.length === 1 ? 'member' : 'members'} · {teams.length} {teams.length === 1 ? 'team' : 'teams'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/20 text-lg font-medium text-neutral-200 hover:bg-white/10 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-refresh-line" /> Refresh
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00ddb4] hover:bg-[#00c9a4] text-[#001731] text-lg font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-user-add-line" /> Add Team Member
          </button>
        </div>
      </div>

      {/* Team tabs (scrollable, mobile-safe) */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setActiveTeam('all')}
          className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-all ${
            activeTeam === 'all' ? 'bg-[#00ddb4] text-[#001731]' : 'bg-white/10 text-neutral-300 hover:bg-white/20'
          }`}
        >
          All
          <span className="ml-1.5 text-[10px] opacity-70">{members.length}</span>
        </button>
        {teams.map((team) => (
          <button
            key={team}
            onClick={() => setActiveTeam(team)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-all ${
              activeTeam === team ? 'bg-[#00ddb4] text-[#001731]' : 'bg-white/10 text-neutral-300 hover:bg-white/20'
            }`}
          >
            <i className="ri-team-line text-sm" style={{ color: activeTeam === team ? '#001731' : '#00ddb4' }} />
            {team}
            <span className="text-[10px] opacity-70">{teamCounts.get(team) || 0}</span>
          </button>
        ))}
        {teamCounts.get('Unassigned') ? (
          <button
            onClick={() => setActiveTeam('Unassigned')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-all ${
              activeTeam === 'Unassigned' ? 'bg-[#00ddb4] text-[#001731]' : 'bg-white/10 text-neutral-300 hover:bg-white/20'
            }`}
          >
            <i className="ri-question-line text-sm" style={{ color: activeTeam === 'Unassigned' ? '#001731' : '#00ddb4' }} />
            Unassigned
            <span className="text-[10px] opacity-70">{teamCounts.get('Unassigned')}</span>
          </button>
        ) : null}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, role, team, email…"
            className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:border-[#00ddb4] focus:ring-1 focus:ring-[#00ddb4]/40 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Status"
          className="px-3 py-2.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-600 bg-white focus:outline-none focus:border-neutral-400 cursor-pointer"
        >
          <option value="all">All statuses</option>
          {MEMBER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600 flex items-center justify-between">
          <span>Couldn't load team members: {error}</span>
          <button onClick={reload} className="text-xs font-semibold underline cursor-pointer">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-start">
        {/* List */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-neutral-400">
              <i className="ri-loader-4-line animate-spin text-xl" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-300">
              <i className="ri-team-line text-4xl" />
              <p className="text-sm text-neutral-400 mt-2">
                {members.length === 0 ? 'No team members yet' : 'No team members match your filters'}
              </p>
              {members.length === 0 && (
                <button
                  onClick={openAdd}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00ddb4] hover:bg-[#00c9a4] text-[#001731] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-user-add-line" /> Add your first team member
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead className="bg-neutral-50 text-[11px] text-neutral-400 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Member</th>
                    <th className="text-left px-4 py-3 font-semibold">Team</th>
                    <th className="text-left px-4 py-3 font-semibold">Role</th>
                    <th className="text-left px-4 py-3 font-semibold">Contact</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {filtered.map((m) => {
                    const meta = statusMeta(m.status);
                    const team = (m.team || '').trim() || 'Unassigned';
                    return (
                      <tr
                        key={m.id}
                        onClick={() => setSelected(m)}
                        className={`hover:bg-neutral-50/60 cursor-pointer transition-colors ${selected?.id === m.id ? 'bg-neutral-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ backgroundColor: colorFor(team) }}
                            >
                              {initials(m.name)}
                            </div>
                            <p className="font-medium text-neutral-800 truncate">{m.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00ddb4]/12 text-[#0d5959]">
                            <i className="ri-team-line text-[10px]" /> {team}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-neutral-600">{m.role || <span className="text-neutral-300 italic">No role set</span>}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            {m.email ? (
                              <a
                                href={`mailto:${m.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="block text-neutral-600 truncate max-w-[200px] hover:text-[#0d5959] cursor-pointer"
                              >
                                {m.email}
                              </a>
                            ) : (
                              <span className="text-neutral-300">—</span>
                            )}
                            {m.phone && <p className="text-[11px] text-neutral-400">{m.phone}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${meta.className}`}>{meta.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(m);
                              }}
                              aria-label="Edit member"
                              title="Edit"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-[#0d5959] hover:bg-neutral-100 transition-colors cursor-pointer"
                            >
                              <i className="ri-pencil-line" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete(m);
                              }}
                              aria-label="Remove member"
                              title="Remove"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <i className="ri-delete-bin-6-line" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <DetailPanel member={selected} onClose={() => setSelected(null)} onEdit={openEdit} onDelete={setConfirmDelete} />
      </div>

      <TeamMemberModal
        open={modalOpen}
        member={editing}
        teams={teams}
        submitting={submitting}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001731]/70" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-neutral-800 mb-2">Remove team member?</h3>
            <p className="text-sm text-neutral-500 mb-5">
              <span className="font-semibold text-neutral-700">{confirmDelete.name}</span> will be removed from the
              team directory. This cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailPanel({
  member,
  onClose,
  onEdit,
  onDelete,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onEdit: (m: TeamMember) => void;
  onDelete: (m: TeamMember) => void;
}) {
  if (!member) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 p-5 text-center text-neutral-300 hidden xl:block">
        <i className="ri-team-line text-3xl" />
        <p className="text-sm text-neutral-400 mt-2">Select a team member to view their details</p>
      </div>
    );
  }
  const meta = statusMeta(member.status);
  const team = (member.team || '').trim() || 'Unassigned';

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white"
              style={{ backgroundColor: colorFor(team) }}
            >
              {initials(member.name)}
            </div>
            <div>
              <h3 className="text-base font-medium text-neutral-800">{member.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {member.role && <span className="text-xs text-neutral-500">{member.role}</span>}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${meta.className}`}>{meta.label}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-300 hover:text-neutral-500 cursor-pointer" aria-label="Close">
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <i className="ri-team-line text-neutral-400 text-sm" />
            <span className="text-xs text-neutral-400 w-[68px] shrink-0">Team</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00ddb4]/12 text-[#0d5959]">
              {team}
            </span>
          </div>
          {member.email && <ContactRow icon="ri-mail-line" label="Email" value={member.email} href={`mailto:${member.email}`} />}
          {member.phone && <ContactRow icon="ri-phone-line" label="Phone" value={member.phone} href={`tel:${member.phone}`} />}
        </div>

        {member.notes && (
          <div className="mt-4 border-t border-neutral-50 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">Notes</p>
            <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-wrap bg-neutral-50 rounded-lg p-3">{member.notes}</p>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={() => onEdit(member)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-pencil-line" /> Edit
          </button>
          <button
            onClick={() => onDelete(member)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-100 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-delete-bin-6-line" /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ icon, label, value, href }: { icon: string; label: string; value: string; href?: string }) {
  const content = (
    <>
      <i className={`${icon} text-neutral-400 text-sm`} />
      <span className="text-xs text-neutral-400 w-[68px] shrink-0">{label}</span>
      <span className="text-neutral-700 font-medium truncate">{value}</span>
    </>
  );
  return (
    <div className="flex items-center gap-2 min-w-0">
      {href ? (
        <a href={href} className="flex items-center gap-2 min-w-0 hover:text-[#0d5959] cursor-pointer">{content}</a>
      ) : (
        content
      )}
    </div>
  );
}