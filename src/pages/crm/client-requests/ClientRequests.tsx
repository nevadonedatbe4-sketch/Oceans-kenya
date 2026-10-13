import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClientRequestsList, useAgentDirectory } from '@/hooks/useClientRequests';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { isAdminRole } from '@/lib/authz';
import {
  statusMeta, priorityMeta, transactionLabel, isOverdue, hasNoMatches, OPEN_STATUSES,
  REQUEST_STATUSES, PRIORITIES, TRANSACTION_TYPES,
} from '@/lib/clientRequests';
import RequestFormModal from '@/pages/crm/client-requests/components/RequestFormModal';
import { format } from '@/pages/crm/client-requests/format';

type QuickFilter = 'all' | 'open' | 'unassigned' | 'overdue' | 'urgent' | 'no_matches';

export default function ClientRequests() {
  const { user } = useAuth();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/agent') ? '/agent' : '/admin';
  const isAdmin = isAdminRole(user?.role);
  const { requests, loading, error, refresh } = useClientRequestsList();
  const { agentId } = useAgentProfile();
  const agents = useAgentDirectory();
  const agentName = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a.name])), [agents]);

  const [search, setSearch] = useState('');
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || '');
  const [priority, setPriority] = useState('');
  const [transaction, setTransaction] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [quick, setQuick] = useState<QuickFilter>((params.get('quick') as QuickFilter) || 'all');
  const [formOpen, setFormOpen] = useState(false);

  // Keep the view in sync with the URL so dashboard tiles (and any deep link)
  // always open the exact filtered list, even when navigating within the app.
  useEffect(() => {
    const nextQuick = params.get('quick') as QuickFilter | null;
    const nextStatus = params.get('status');
    setQuick(nextQuick || 'all');
    setStatus(nextStatus || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  const stats = useMemo(() => ({
    open: requests.filter((r) => OPEN_STATUSES.includes((r.status || 'new') as never)).length,
    unassigned: requests.filter((r) => !r.assigned_agent_id).length,
    overdue: requests.filter((r) => isOverdue(r.next_follow_up_at, r.status)).length,
    urgent: requests.filter((r) => r.priority === 'urgent' || r.priority === 'high').length,
    no_matches: requests.filter((r) => hasNoMatches(r)).length,
    total: requests.length,
  }), [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (quick === 'open' && !OPEN_STATUSES.includes((r.status || 'new') as never)) return false;
      if (quick === 'unassigned' && r.assigned_agent_id) return false;
      if (quick === 'overdue' && !isOverdue(r.next_follow_up_at, r.status)) return false;
      if (quick === 'urgent' && r.priority !== 'urgent' && r.priority !== 'high') return false;
      if (quick === 'no_matches' && !hasNoMatches(r)) return false;
      if (status && r.status !== status) return false;
      if (priority && r.priority !== priority) return false;
      if (transaction && r.transaction_type !== transaction) return false;
      if (agentFilter && r.assigned_agent_id !== agentFilter) return false;
      if (q) {
        const hay = [
          r.reference, r.title, r.client_name, r.client_email, r.client_phone,
          (r.locations || []).join(' '), r.property_category, r.property_subtype,
          (r.property_subtypes || []).join(' '),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requests, quick, status, priority, transaction, agentFilter, search]);

  const statCards: { key: QuickFilter; label: string; value: number; icon: string; tone: string }[] = [
    { key: 'open', label: 'Open requests', value: stats.open, icon: 'ri-folder-open-line', tone: 'text-[#0f766e] bg-[#0f766e]/10' },
    { key: 'unassigned', label: 'Unassigned', value: stats.unassigned, icon: 'ri-user-unfollow-line', tone: 'text-amber-700 bg-amber-100' },
    { key: 'no_matches', label: 'Without matches', value: stats.no_matches, icon: 'ri-search-eye-line', tone: 'text-rose-700 bg-rose-100' },
    { key: 'overdue', label: 'Overdue follow-ups', value: stats.overdue, icon: 'ri-time-line', tone: 'text-red-700 bg-red-100' },
    { key: 'urgent', label: 'High / urgent', value: stats.urgent, icon: 'ri-alarm-warning-line', tone: 'text-orange-700 bg-orange-100' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-semibold text-stone-900">Client Requests</h1>
          <p className="text-sm text-stone-500">
            Record what clients want, match it to live inventory, and track each request to completion.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d5f59] cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" /> New Request
        </button>
      </div>

      {/* Team overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <button
            key={s.key}
            onClick={() => setQuick(quick === s.key ? 'all' : s.key)}
            className={`text-left rounded-lg border p-4 transition-all cursor-pointer bg-white ${
              quick === s.key ? 'border-[#0f766e] ring-1 ring-[#0f766e]/30' : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">{s.label}</span>
              <span className={`w-8 h-8 rounded-md flex items-center justify-center ${s.tone}`}>
                <i className={`${s.icon} text-base`} />
              </span>
            </div>
            <div className="text-2xl font-bold text-stone-900 mt-1">{s.value}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-stone-200 p-3 space-y-3">
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, client, location, type…"
              className="w-full pl-9 pr-3 py-2.5 border-2 border-stone-300 rounded-md text-sm font-medium text-stone-800 focus:border-[#0f766e] focus:outline-none"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2.5 border-2 border-stone-300 rounded-md text-sm font-medium text-stone-700 cursor-pointer">
            <option value="">All statuses</option>
            {REQUEST_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={transaction} onChange={(e) => setTransaction(e.target.value)} className="px-3 py-2.5 border-2 border-stone-300 rounded-md text-sm font-medium text-stone-700 cursor-pointer">
            <option value="">All transactions</option>
            {TRANSACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="px-3 py-2.5 border-2 border-stone-300 rounded-md text-sm font-medium text-stone-700 cursor-pointer">
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {isAdmin && (
            <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="px-3 py-2.5 border-2 border-stone-300 rounded-md text-sm font-medium text-stone-700 cursor-pointer">
              <option value="">All agents</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
        </div>
        {(search || status || priority || transaction || agentFilter || quick !== 'all') && (
          <button
            onClick={() => { setSearch(''); setStatus(''); setPriority(''); setTransaction(''); setAgentFilter(''); setQuick('all'); }}
            className="text-xs font-medium text-[#0f766e] hover:underline cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        {error ? (
          <div className="p-8 text-center">
            <i className="ri-error-warning-line text-3xl text-red-500" />
            <p className="text-sm text-stone-600 mt-2">{error}</p>
            <button onClick={refresh} className="mt-3 px-4 py-2 rounded-md bg-stone-800 text-white text-sm cursor-pointer">Try again</button>
          </div>
        ) : loading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-md bg-stone-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <i className="ri-inbox-archive-line text-4xl text-stone-300" />
            <p className="text-sm text-stone-500 mt-2">
              {requests.length === 0 ? 'No client requests yet. Create the first one to start matching.' : 'No requests match the current filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-3 font-semibold">Request</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Requirement</th>
                  <th className="px-4 py-3 font-semibold">Budget</th>
                  <th className="px-4 py-3 font-semibold">Assigned</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Follow-up</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const sm = statusMeta(r.status);
                  const pm = priorityMeta(r.priority);
                  const overdue = isOverdue(r.next_follow_up_at, r.status);
                  return (
                    <tr key={r.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                      <td className="px-4 py-3">
                        <Link to={`${basePath}/client-requests/${r.id}`} className="font-semibold text-stone-900 hover:text-[#0f766e] cursor-pointer">
                          {r.reference || 'CR-—'}
                        </Link>
                        <p className="text-xs text-stone-500 truncate max-w-[200px]">{r.title || 'Untitled request'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-stone-800 font-medium">{r.client_name || '—'}</p>
                        <p className="text-xs text-stone-500">{r.client_phone || r.client_email || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-stone-700">{transactionLabel(r.transaction_type)} · {r.property_category || '—'}</p>
                        <p className="text-xs text-stone-500 truncate max-w-[200px]">
                          {(r.locations || []).length ? r.locations!.join(', ') : 'Any location'}
                          {r.bedrooms_min ? ` · ${r.bedrooms_min}+ bed` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-stone-700 whitespace-nowrap">
                        {r.budget_max ? `${r.currency || ''} ${Number(r.budget_max).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-stone-700">{r.assigned_agent_id ? (agentName[r.assigned_agent_id] || 'Agent') : <span className="text-amber-700 font-medium">Unassigned</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${sm.className}`}>{sm.label}</span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${pm.className}`}>{pm.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.next_follow_up_at ? (
                          <span className={overdue ? 'text-red-600 font-semibold' : 'text-stone-600'}>
                            {format(r.next_follow_up_at)}
                            {overdue && <i className="ri-alert-line ml-1" />}
                          </span>
                        ) : <span className="text-stone-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`${basePath}/client-requests/${r.id}`} className="inline-flex items-center gap-1 text-[#0f766e] font-medium hover:underline cursor-pointer whitespace-nowrap">
                          Open <i className="ri-arrow-right-line" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RequestFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
        isAdmin={isAdmin}
        currentAgentId={agentId}
        currentUserId={user?.id ?? null}
        currentUserName={user?.name || user?.email || 'User'}
      />
    </div>
  );
}