import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAgentManagement, type ManagedAgent } from '@/hooks/useAgentManagement';
import {
  CheckCircle2, XCircle, ShieldAlert,
  RefreshCw, UserRound, Eye, Ban, ShieldCheck, Crown, Trash2,
} from 'lucide-react';

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusBadge(status: string, isActive: boolean) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-800' },
    active: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-800' },
    approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-800' },
    rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
    suspended: { label: 'Suspended', cls: 'bg-gray-200 text-gray-700' },
    deletion_requested: { label: 'Deletion requested', cls: 'bg-amber-100 text-amber-800' },
    deletion_rejected: { label: 'Deletion rejected', cls: 'bg-red-100 text-red-700' },
    deletion_approved: { label: 'Deletion approved', cls: 'bg-blue-100 text-blue-800' },
    deleted: { label: 'Deleted', cls: 'bg-gray-200 text-gray-600' },
    no_account: { label: 'No login', cls: 'bg-slate-100 text-slate-600' },
    unknown: { label: isActive ? 'Active' : 'Inactive', cls: isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700' },
  };
  const entry = map[status] || map.unknown;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-roboto font-semibold whitespace-nowrap ${entry.cls}`}>
      {entry.label}
    </span>
  );
}

function roleBadge(role: string) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    super_admin: { label: 'Super Admin', cls: 'bg-amber-100 text-amber-800', Icon: Crown },
    admin: { label: 'Admin', cls: 'bg-teal-100 text-teal-800', Icon: ShieldCheck },
    agent: { label: 'Agent', cls: 'bg-slate-100 text-slate-600', Icon: UserRound },
  };
  const entry = map[role] || map.agent;
  const { Icon } = entry;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-roboto font-semibold whitespace-nowrap ${entry.cls}`}>
      <Icon size={11} />
      {entry.label}
    </span>
  );
}

type ConfirmState = { agent: ManagedAgent; action: 'approve' | 'reject' | 'suspend' | 'delete' } | null;

type RoleChangeState = { agent: ManagedAgent; role: 'agent' | 'admin' | 'super_admin' } | null;

export default function AgentsTab() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const { agents, loading, error, fetchAll, setStatus, setRole, deleteAgent } = useAgentManagement(search, filter);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [roleChange, setRoleChange] = useState<RoleChangeState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyMsg, setBusyMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!successMsg) return undefined;
    const t = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const totals = useMemo(() => ({
    agents: agents.length,
    approved: agents.filter((a) => a.accountStatus === 'active').length,
    pending: agents.filter((a) => a.accountStatus === 'pending').length,
    suspended: agents.filter((a) => ['suspended', 'rejected'].includes(a.accountStatus)).length,
  }), [agents]);

  const runAction = async (agent: ManagedAgent, action: 'approve' | 'reject' | 'suspend' | 'delete') => {
    if (action !== 'delete' && !agent.userId) {
      setBusyMsg('This agent has no login account.');
      setConfirm(null);
      return;
    }
    setBusyId(agent.agentId);
    setBusyMsg(null);
    setSuccessMsg(null);
    try {
      if (action === 'delete') {
        await deleteAgent(agent.agentId, agent.userId);
        setSuccessMsg(`${agent.name} was permanently deleted.`);
      } else {
        await setStatus(agent.userId!, action);
        setSuccessMsg(
          action === 'approve'
            ? `${agent.name} was approved.`
            : action === 'suspend'
              ? `${agent.name} was suspended.`
              : `${agent.name} was disapproved.`
        );
      }
      setConfirm(null);
      await fetchAll();
    } catch (e: any) {
      setBusyMsg(e?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const runResend = async (agent: ManagedAgent) => {
    if (!agent.userId) {
      setBusyMsg('This agent has no login account.');
      return;
    }
    setBusyId(agent.agentId);
    setBusyMsg(null);
    setSuccessMsg(null);
    try {
      await setStatus(agent.userId, 'resend_verification');
      setSuccessMsg(`Verification email sent to ${agent.email}.`);
    } catch (e: any) {
      setBusyMsg(e?.message || 'Could not send the verification email');
    } finally {
      setBusyId(null);
    }
  };

  const actionLabel = (a: ManagedAgent) => {
    if (a.accountStatus === 'pending') return 'approve';
    if (a.accountStatus === 'active') return 'suspend';
    if (a.accountStatus === 'suspended' || a.accountStatus === 'rejected') return 'approve';
    return 'approve';
  };

  const runRoleChange = async (agent: ManagedAgent, role: 'agent' | 'admin' | 'super_admin') => {
    if (!agent.userId) {
      setBusyMsg('This agent has no login account.');
      setRoleChange(null);
      return;
    }
    setBusyId(agent.agentId);
    setBusyMsg(null);
    try {
      await setRole(agent.userId, role, agent.name);
      setRoleChange(null);
      await fetchAll();
    } catch (e: any) {
      setBusyMsg(e?.message || 'Role change failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Agents', value: totals.agents, color: 'text-white' },
          { label: 'Approved', value: totals.approved, color: 'text-green-400' },
          { label: 'Pending', value: totals.pending, color: 'text-amber-400' },
          { label: 'Suspended / Rejected', value: totals.suspended, color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-[#2A3142] rounded-lg p-4 border border-white/[0.07]">
            <p className={`text-2xl font-jost font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
            <p className="text-[10px] text-[#8b98ab] font-roboto mt-0.5 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="relative flex-1 w-full sm:max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#8b98ab] text-sm" />
          <input
            type="text"
            placeholder="Search agents by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-white/[0.08] bg-white/[0.04] rounded-lg text-sm font-roboto text-white placeholder:text-[#8b98ab] focus:outline-none focus:border-teal/40"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.07] rounded-lg p-1">
          {(['all', 'pending', 'active', 'suspended', 'deletion'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-roboto font-medium transition-all cursor-pointer whitespace-nowrap capitalize ${
                filter === s ? 'bg-teal text-[#001731]' : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {busyMsg && (
        <div className="bg-red-500/10 border border-red-400/30 text-red-200 text-sm px-4 py-3 rounded-lg font-roboto">
          {busyMsg}
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 text-sm px-4 py-3 rounded-lg font-roboto">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#2A3142] border border-white/[0.07] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 px-6">
            <p className="text-sm text-red-400 font-roboto">{error}</p>
            <button onClick={fetchAll} className="mt-3 px-4 py-2 bg-teal text-[#001731] rounded-lg text-sm cursor-pointer">Retry</button>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-14 h-14 rounded-xl bg-teal/10 flex items-center justify-center mx-auto mb-3">
              <i className="ri-user-settings-line text-teal text-xl" />
            </div>
            <p className="text-sm text-[#9ca3af] font-roboto font-medium">No agents match</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#8b98ab] uppercase tracking-wider">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#8b98ab] uppercase tracking-wider hidden md:table-cell">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#8b98ab] uppercase tracking-wider hidden lg:table-cell">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#8b98ab] uppercase tracking-wider hidden lg:table-cell">Listings</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#8b98ab] uppercase tracking-wider hidden lg:table-cell">Leads</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#8b98ab] uppercase tracking-wider hidden sm:table-cell">Last activity</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#8b98ab] uppercase tracking-wider hidden sm:table-cell">Joined</th>
                  <th className="px-4 py-3 text-right text-xs font-roboto text-[#8b98ab] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {agents.map((a) => {
                  const act = actionLabel(a);
                  const isBusy = busyId === a.agentId;
                  return (
                    <tr key={a.agentId} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {a.avatar_url ? (
                            <img src={a.avatar_url} alt={a.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-teal/15 flex items-center justify-center flex-shrink-0">
                              <span className="text-teal text-xs font-bold">{a.name.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-roboto text-white font-medium truncate">{a.name}</p>
                            <p className="text-xs font-roboto text-[#8b98ab] truncate">{a.email}</p>
                            {a.title && <p className="text-[10px] font-roboto text-teal/80 truncate">{a.title}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-col items-start gap-1">
                          {statusBadge(a.accountStatus, a.is_active)}
                          {a.dealsWon > 0 && (
                            <span className="text-[10px] font-roboto text-green-400/80">{a.dealsWon} deal{a.dealsWon !== 1 ? 's' : ''} won</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {roleBadge(a.role)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-sm font-jost text-white">{a.listings}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-sm font-jost text-[#c8a45c]">{a.leads}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs font-roboto text-[#8b98ab]">{timeAgo(a.lastActivity)}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs font-roboto text-[#8b98ab]">{fmtDate(a.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Link
                            to={`/admin/agents/${a.agentId}/preview`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-roboto font-semibold bg-teal/15 text-teal hover:bg-teal/25 transition-all cursor-pointer whitespace-nowrap"
                            title="Preview this agent's dashboard (as they see it) and manage their data"
                          >
                            <Eye size={14} /> Preview
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => setRoleChange({ agent: a, role: a.role as 'agent' | 'admin' | 'super_admin' || 'agent' })}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-roboto font-semibold border border-[#c8a45c]/40 text-[#c8a45c] hover:bg-[#c8a45c]/10 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                              title="Change this account's role"
                            >
                              <Crown size={14} /> Role
                            </button>
                          )}
                          {a.accountStatus === 'active' ? (
                            <button
                              onClick={() => setConfirm({ agent: a, action: 'suspend' })}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-roboto font-semibold border border-red-400/30 text-red-300 hover:bg-red-500/10 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                              title="Suspend this agent"
                            >
                              <Ban size={14} /> Suspend
                            </button>
                          ) : (
                            <>
                              {a.accountStatus === 'pending' && (
                                <button
                                  onClick={() => runResend(a)}
                                  disabled={isBusy}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-roboto font-semibold border border-white/[0.12] text-[#c8d0dc] hover:bg-white/5 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                                  title="Resend the account verification email"
                                >
                                  <i className="ri-mail-send-line" /> Resend
                                </button>
                              )}
                              <button
                                onClick={() => setConfirm({ agent: a, action: 'approve' })}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-roboto font-semibold bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                                title={a.accountStatus === 'pending' ? 'Approve this agent' : 'Re-activate this agent'}
                              >
                                {isBusy ? <i className="ri-loader-4-line animate-spin text-sm" /> : <CheckCircle2 size={14} />}
                                {a.accountStatus === 'pending' ? 'Approve' : 'Activate'}
                              </button>
                            </>
                          )}
                          {act === 'approve' && a.accountStatus === 'active' && (
                            <button
                              onClick={() => setConfirm({ agent: a, action: 'reject' })}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-roboto font-semibold text-[#8b98ab] hover:bg-white/5 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                              title="Disapprove / reject this agent"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button
                              onClick={() => setConfirm({ agent: a, action: 'delete' })}
                              disabled={isBusy}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs border border-red-400/30 text-red-300 hover:bg-red-500/10 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                              title="Permanently delete this agent"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
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

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirm(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-md shadow-xl p-6">
            <button
              onClick={() => setConfirm(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all cursor-pointer"
              aria-label="Close dialog"
              title="Close"
            >
              <i className="ri-close-line text-lg" />
            </button>
            <div className="flex items-start gap-3 mb-4 pr-8">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${confirm.action === 'approve' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {confirm.action === 'approve'
                  ? <CheckCircle2 size={20} className="text-emerald-600" />
                  : <ShieldAlert size={20} className="text-red-600" />}
              </div>
              <div>
                <h3 className="font-roboto font-bold text-[#1a1a2e]">
                  {confirm.action === 'approve' ? 'Approve agent?' : confirm.action === 'suspend' ? 'Suspend agent?' : confirm.action === 'delete' ? 'Delete agent permanently?' : 'Disapprove agent?'}
                </h3>
                <p className="text-sm text-gray-500 font-roboto mt-1 leading-relaxed">
                  {confirm.action === 'approve'
                    ? `${confirm.agent.name} will be granted access to the Agent Portal.`
                    : confirm.action === 'suspend'
                      ? `This will prevent ${confirm.agent.name} from accessing their Agent Portal until re-activated. No data is deleted.`
                      : confirm.action === 'delete'
                        ? `This permanently removes ${confirm.agent.name}'s login, profile and agent record. Their listings, leads and deals are kept but unassigned. This cannot be undone.`
                        : `This will prevent ${confirm.agent.name} from accessing their Agent Portal. No data is deleted.`}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm font-roboto text-[#374151] space-y-1 mb-5">
              <p><span className="font-semibold">Agent:</span> {confirm.agent.name}</p>
              <p><span className="font-semibold">Email:</span> {confirm.agent.email}</p>
              <p><span className="font-semibold">Listings / Leads:</span> {confirm.agent.listings} / {confirm.agent.leads}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto font-semibold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer">Cancel</button>
              <button
                onClick={() => runAction(confirm.agent, confirm.action)}
                disabled={busyId === confirm.agent.agentId}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-roboto font-semibold text-white transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap ${confirm.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {busyId === confirm.agent.agentId ? 'Saving…' : confirm.action === 'approve' ? 'Approve Agent' : confirm.action === 'suspend' ? 'Suspend Agent' : confirm.action === 'delete' ? 'Delete Permanently' : 'Disapprove Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role change modal */}
      {roleChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setRoleChange(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-md shadow-xl p-6">
            <button
              onClick={() => setRoleChange(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all cursor-pointer"
              aria-label="Close dialog"
              title="Close"
            >
              <i className="ri-close-line text-lg" />
            </button>
            <div className="flex items-start gap-3 mb-4 pr-8">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Crown size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-roboto font-bold text-[#1a1a2e]">Change role</h3>
                <p className="text-sm text-gray-500 font-roboto mt-1 leading-relaxed">
                  Choose the permissions this account should hold. This grants or revokes dashboard access based on the selected role.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm font-roboto text-[#374151] space-y-1 mb-5">
              <p><span className="font-semibold">Agent:</span> {roleChange.agent.name}</p>
              <p><span className="font-semibold">Email:</span> {roleChange.agent.email}</p>
              <p><span className="font-semibold">Current role:</span> {roleChange.agent.role}</p>
            </div>
            <div className="space-y-2 mb-5">
              {([
                { value: 'agent', label: 'Agent', desc: 'Agent Portal only — access to their own listings, leads and dashboard.', Icon: UserRound },
                { value: 'admin', label: 'Admin', desc: 'Admin Portal — team, listings, leads, deals and site management.', Icon: ShieldCheck },
                { value: 'super_admin', label: 'Super Admin', desc: 'Full Admin Portal including user roles and account controls.', Icon: Crown },
              ] as const).map((r) => {
                const active = roleChange.role === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => setRoleChange({ agent: roleChange.agent, role: r.value })}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      active ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${active ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      <r.Icon size={16} className={active ? 'text-emerald-600' : 'text-gray-500'} />
                    </div>
                    <div>
                      <p className="text-sm font-roboto font-semibold text-[#1a1a2e]">{r.label}</p>
                      <p className="text-xs font-roboto text-gray-500 mt-0.5">{r.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setRoleChange(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto font-semibold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer">Cancel</button>
              <button
                onClick={() => runRoleChange(roleChange.agent, roleChange.role)}
                disabled={busyId === roleChange.agent.agentId || roleChange.role === roleChange.agent.role}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-roboto font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                {busyId === roleChange.agent.agentId ? 'Saving…' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}