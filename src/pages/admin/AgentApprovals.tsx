import { useCallback, useEffect, useState } from 'react';
import { supabase, supabaseUrl, supabaseKey } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { RefreshCw, CheckCircle2, XCircle, UserCheck, Trash2, ShieldAlert, Mail } from 'lucide-react';

interface ApprovalRow {
  user_id: string;
  name: string | null;
  email: string | null;
  status: string;
  created_at: string | null;
  listings: number;
  leads: number;
}

interface DeletionRow {
  user_id: string;
  name: string | null;
  email: string | null;
  status: string;
  requested_at: string | null;
  listings: number;
  leads: number;
}

/**
 * Agent approval + deletion-request review, in the Admin portal.
 * - Approve / Reject a pending agent (writes profiles.status).
 * - Super Admin only: approve (controlled deletion) or reject a deletion request.
 */
export default function AgentApprovals() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [tab, setTab] = useState<'approvals' | 'deletions'>('approvals');
  const [pending, setPending] = useState<ApprovalRow[]>([]);
  const [deletions, setDeletions] = useState<DeletionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<DeletionRow | null>(null);

  useEffect(() => {
    if (!successMsg) return undefined;
    const t = setTimeout(() => setSuccessMsg(''), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('user_id, name, email, status, created_at')
      .eq('role', 'agent');

    if (pErr) {
      setError(pErr.message || 'Failed to load agents.');
      setPending([]);
      setDeletions([]);
      setLoading(false);
      return;
    }

    const rows = (profiles || []) as { user_id: string; name: string | null; email: string | null; status: string; created_at: string | null }[];
    const userToAgent = new Map<string, string>();
    const { data: agentRows } = await supabase
      .from('agents')
      .select('id, user_id')
      .in('user_id', rows.map((r) => r.user_id));
    (agentRows || []).forEach((a) => userToAgent.set(a.user_id, a.id));

    const countsFor = async (agentId?: string) => {
      if (!agentId) return { listings: 0, leads: 0 };
      const [l, ld] = await Promise.all([
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
      ]);
      return { listings: l.count ?? 0, leads: ld.count ?? 0 };
    };

    const hydrated = await Promise.all(
      rows.map(async (r): Promise<ApprovalRow> => {
        const c = await countsFor(userToAgent.get(r.user_id));
        return { user_id: r.user_id, name: r.name, email: r.email, status: r.status, created_at: r.created_at, ...c };
      }),
    );

    setPending(hydrated.filter((r) => r.status === 'pending'));
    setDeletions(
      hydrated
        .filter((r) => ['deletion_requested', 'deletion_approved', 'deletion_rejected'].includes(r.status))
        .map((r) => ({ ...r, requested_at: r.created_at })),
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const callAgentStatus = async (userId: string, action: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${supabaseUrl}/functions/v1/set-agent-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetUserId: userId, action }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
    return json;
  };

  const setStatus = async (userId: string, status: string, label: string) => {
    setBusyId(userId);
    setError('');
    const { error: e } = await supabase
      .from('profiles')
      .update({ status })
      .eq('user_id', userId);
    if (e) setError(e.message || `Failed to ${label}.`);
    else await load();
    setBusyId(null);
  };

  // Approve / reject go through the server function so the change is authorised
  // and audited server-side and the account-activation email is sent.
  const approveAgent = async (userId: string) => {
    setBusyId(userId);
    setError('');
    try {
      await callAgentStatus(userId, 'approve');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to approve agent.');
    }
    setBusyId(null);
  };

  const rejectAgent = async (userId: string) => {
    setBusyId(userId);
    setError('');
    try {
      await callAgentStatus(userId, 'reject');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to reject agent.');
    }
    setBusyId(null);
  };

  // Issue a fresh verification code + email via the same server function the
  // Agents tab uses, so both admin screens behave identically.
  const resendVerification = async (userId: string, email: string | null) => {
    setBusyId(userId);
    setError('');
    setSuccessMsg('');
    try {
      await callAgentStatus(userId, 'resend_verification');
      setSuccessMsg(`Verification email sent to ${email || 'the applicant'}.`);
    } catch (e: any) {
      setError(e?.message || 'Could not send the verification email.');
    }
    setBusyId(null);
  };

  const rejectDeletion = (userId: string) => setStatus(userId, 'deletion_rejected', 'reject deletion');

  // Controlled permanent deletion: the agent cannot log in (profile.status =
  // 'deleted'), their public agent profile is deactivated, and business records
  // (listings/leads/enquiries) are DETACHED — not cascade-dropped — so no
  // unrelated agency data is destroyed. This is a Super Admin-only action.
  const confirmPermanentDeletion = async (row: DeletionRow) => {
    setBusyId(row.user_id);
    setError('');
    const { error: profErr } = await supabase
      .from('profiles')
      .update({ status: 'deleted' })
      .eq('user_id', row.user_id);
    if (profErr) {
      setError(profErr.message || 'Failed to delete account.');
      setBusyId(null);
      return;
    }
    await supabase.from('agents').update({ is_active: false }).eq('user_id', row.user_id);
    await load();
    setConfirmDelete(null);
    setBusyId(null);
  };

  const fmt = (s?: string | null) =>
    s ? new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800',
      active: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
      suspended: 'bg-gray-100 text-gray-700',
      deletion_requested: 'bg-amber-100 text-amber-800',
      deletion_rejected: 'bg-red-100 text-red-800',
      deletion_approved: 'bg-blue-100 text-blue-800',
      deleted: 'bg-gray-200 text-gray-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const pendingCard = (
    <div className="space-y-4">
      {pending.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-10 text-center">
          <UserCheck size={36} className="text-white/30 mx-auto mb-3" />
          <p className="text-white/70 font-roboto">No agents awaiting approval.</p>
          <p className="text-white/40 text-sm mt-1">New agent applications will appear here.</p>
        </div>
      ) : (
        pending.map((r) => (
          <div key={r.user_id} className="bg-white rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[#0a4b4b] text-white flex items-center justify-center font-roboto font-bold flex-shrink-0">
                {(r.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-roboto font-semibold text-[#1a1a2e] truncate">{r.name || 'Unnamed'}</p>
                <p className="text-sm text-gray-500 font-roboto truncate">{r.email}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 font-roboto">
                  <span>{r.listings} listings</span>
                  <span>·</span>
                  <span>{r.leads} leads</span>
                  <span>·</span>
                  <span>Applied {fmt(r.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-roboto font-semibold ${statusBadge(r.status)}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" /> {r.status.replace(/_/g, ' ')}
              </span>
              <button
                onClick={() => approveAgent(r.user_id)}
                disabled={busyId === r.user_id}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-roboto font-semibold transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 size={16} /> {busyId === r.user_id ? 'Saving…' : 'Approve'}
              </button>
              <button
                onClick={() => resendVerification(r.user_id, r.email)}
                disabled={busyId === r.user_id}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-roboto font-semibold transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
                title="Resend the account verification email"
              >
                <Mail size={16} /> Resend
              </button>
              <button
                onClick={() => rejectAgent(r.user_id)}
                disabled={busyId === r.user_id}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-roboto font-semibold transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                <XCircle size={16} /> Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const deletionCard = (
    <div className="space-y-4">
      {deletions.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-10 text-center">
          <Trash2 size={36} className="text-white/30 mx-auto mb-3" />
          <p className="text-white/70 font-roboto">No account deletion requests.</p>
          <p className="text-white/40 text-sm mt-1">Agent deletion requests will appear here for Super Admin review.</p>
        </div>
      ) : (
        deletions.map((r) => (
          <div key={r.user_id} className="bg-white rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[#a32020] text-white flex items-center justify-center font-roboto font-bold flex-shrink-0">
                {(r.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-roboto font-semibold text-[#1a1a2e] truncate">{r.name || 'Unnamed'}</p>
                <p className="text-sm text-gray-500 font-roboto truncate">{r.email}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 font-roboto">
                  <span>{r.listings} listings</span>
                  <span>·</span>
                  <span>{r.leads} leads</span>
                  <span>·</span>
                  <span>Requested {fmt(r.requested_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-roboto font-semibold bg-amber-100 text-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-current" /> {r.status.replace(/_/g, ' ')}
              </span>
              <button
                onClick={() => rejectDeletion(r.user_id)}
                disabled={!isSuperAdmin || busyId === r.user_id}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-roboto font-semibold transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                title={isSuperAdmin ? '' : 'Super Admin only'}
              >
                <XCircle size={16} /> Reject
              </button>
              <button
                onClick={() => setConfirmDelete(r)}
                disabled={!isSuperAdmin || busyId === r.user_id}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-roboto font-semibold transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                title={isSuperAdmin ? '' : 'Super Admin only'}
              >
                <Trash2 size={16} /> Delete permanently
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-roboto font-bold text-xl text-white">Agent approvals</h2>
          <p className="text-white/50 text-sm mt-0.5">
            {isSuperAdmin ? 'Super Admin view — you can also approve account deletions.' : 'Review, approve or reject agent applications.'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-roboto transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white/10">
        <button
          onClick={() => setTab('approvals')}
          className={`px-4 py-1.5 rounded-md text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap ${tab === 'approvals' ? 'bg-white text-[#001731]' : 'text-white/70 hover:text-white'}`}
        >
          <span className="inline-flex items-center gap-1.5"><UserCheck size={15} /> Approvals ({pending.length})</span>
        </button>
        <button
          onClick={() => setTab('deletions')}
          className={`px-4 py-1.5 rounded-md text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap ${tab === 'deletions' ? 'bg-white text-[#001731]' : 'text-white/70 hover:text-white'}`}
        >
          <span className="inline-flex items-center gap-1.5"><Trash2 size={15} /> Deletion requests ({deletions.length})</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-400/30 text-red-200 text-sm px-4 py-3 rounded-lg font-roboto">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 text-sm px-4 py-3 rounded-lg font-roboto">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {tab === 'approvals' ? pendingCard : deletionCard}

      {/* Super Admin confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-md shadow-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-roboto font-bold text-[#1a1a2e]">Permanently delete this agent account?</h3>
                <p className="text-sm text-gray-500 font-roboto mt-1 leading-relaxed">
                  This action cannot be undone. The agent will lose all access, their public profile is deactivated, and their
                  listings / leads / enquiries will be detached (not destroyed) so unrelated agency data is preserved.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm font-roboto text-[#374151] space-y-1 mb-5">
              <p><span className="font-semibold">Agent:</span> {confirmDelete.name || '—'}</p>
              <p><span className="font-semibold">Email:</span> {confirmDelete.email || '—'}</p>
              <p><span className="font-semibold">Listings:</span> {confirmDelete.listings}</p>
              <p><span className="font-semibold">Leads:</span> {confirmDelete.leads}</p>
              <p><span className="font-semibold">Requested:</span> {fmt(confirmDelete.requested_at)}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto font-semibold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => confirmPermanentDeletion(confirmDelete)}
                disabled={busyId === confirmDelete.user_id}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-roboto font-semibold transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                {busyId === confirmDelete.user_id ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}