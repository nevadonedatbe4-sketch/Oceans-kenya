import { useState, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { useAgentDashboards, type AgentDashboardRecord } from '@/hooks/useAgentDashboards';
import {
  Building2, Users, Inbox, Handshake, TrendingUp, CheckCircle2, XCircle,
  Wallet, RefreshCw, UserRound,
} from 'lucide-react';
import Chevron from '@/components/base/Chevron';

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

function AgentStatBlock({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: string }) {
  return (
    <div className="bg-[#012144] rounded-lg p-4">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="w-8 h-8 rounded-md flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: tone }}>
          {icon}
        </span>
        <p className="text-[10px] font-roboto text-[#8b98ab] uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-xl font-jost font-bold text-white leading-tight">{value}</p>
    </div>
  );
}

function AgentDetail({ agent }: { agent: AgentDashboardRecord }) {
  const { convert, symbol } = useCurrency();
  const draftCount = Math.max(0, agent.listings - agent.published - agent.pending);

  // Internal CRM figures (pipeline / closed value) must always show a number,
  // never the "Price on Request" listing label, so they bypass the shared
  // price formatter.
  const money = (n: number): string =>
    `${symbol} ${Math.round(convert(n || 0) || 0).toLocaleString('en-US')}`;

  return (
    <div className="space-y-4">
      {/* Agent identity */}
      <div className="bg-[#012144] rounded-xl p-5 border border-[#1c3a5e] flex items-center gap-4">
        {agent.avatar_url ? (
          <img src={agent.avatar_url} alt={agent.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[#0d5959]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[#5eead4] text-xl font-bold">{agent.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-jost text-lg text-white font-semibold truncate">{agent.name}</h3>
          <p className="text-xs font-roboto text-[#8b98ab] truncate">{agent.title || 'Agent'} · {agent.email}</p>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${agent.is_active ? 'bg-green-400/15 text-green-400' : 'bg-[#8b98ab]/15 text-[#8b98ab]'}`}>
              {agent.is_active ? 'Active' : 'Inactive'}
            </span>
            {agent.pending > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 text-[10px] font-semibold">Pending review</span>}
            <span className="text-[10px] font-roboto text-[#8b98ab]">Joined {timeAgo(agent.created_at)}</span>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <AgentStatBlock icon={<Building2 size={16} />} label="Listings" value={agent.listings} tone="#0d5959" />
        <AgentStatBlock icon={<TrendingUp size={16} />} label="Published" value={agent.published} tone="#088135" />
        <AgentStatBlock icon={<Users size={16} />} label="Leads" value={agent.leads} tone="#b08d2a" />
        <AgentStatBlock icon={<Inbox size={16} />} label="Enquiries" value={agent.enquiries} tone="#0d5959" />
        <AgentStatBlock icon={<Handshake size={16} />} label="Deals" value={agent.deals} tone="#001731" />
        <AgentStatBlock icon={<CheckCircle2 size={16} />} label="Won" value={agent.dealsWon} tone="#088135" />
        <AgentStatBlock icon={<XCircle size={16} />} label="Lost" value={agent.dealsLost} tone="#b91c1c" />
        <AgentStatBlock icon={<Wallet size={16} />} label="Pipeline" value={money(agent.pipelineValue)} tone="#c8a45c" />
      </div>

      {/* Listing status strip */}
      <div className="bg-[#012144] rounded-xl p-5 border border-[#1c3a5e]">
        <h4 className="text-xs font-roboto text-[#8b98ab] uppercase tracking-wider mb-2">Listing status</h4>
        <div className="space-y-2.5">
          {[
            { label: 'Published', value: agent.published, bar: '#088135' },
            { label: 'Pending review', value: agent.pending, bar: '#f58300' },
            { label: 'Draft', value: draftCount, bar: '#4b5563' },
          ].map((row) => {
            const max = Math.max(1, agent.listings);
            return (
              <div key={row.label}>
                <div className="flex items-center justify-between text-xs font-roboto font-medium text-[#c6d0dc] mb-1">
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
                <div className="h-2 rounded-full bg-[#0d2340] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (row.value / max) * 100)}%`, backgroundColor: row.bar }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sales summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#012144] rounded-xl p-5 border border-[#1c3a5e]">
          <p className="text-xs font-roboto text-[#8b98ab] uppercase tracking-wider mb-1">Closed value (won)</p>
          <p className="text-2xl font-jost font-bold text-green-400">{money(agent.closedValue)}</p>
          <p className="text-[11px] font-roboto text-[#8b98ab] mt-1">{agent.dealsWon} won deal{agent.dealsWon === 1 ? '' : 's'}</p>
        </div>
        <div className="bg-[#012144] rounded-xl p-5 border border-[#1c3a5e]">
          <p className="text-xs font-roboto text-[#8b98ab] uppercase tracking-wider mb-1">Open pipeline</p>
          <p className="text-2xl font-jost font-bold text-[#c8a45c]">{money(agent.pipelineValue)}</p>
          <p className="text-[11px] font-roboto text-[#8b98ab] mt-1">
            {agent.deals - agent.dealsWon - agent.dealsLost} open deal{agent.deals - agent.dealsWon - agent.dealsLost === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <p className="text-[11px] font-roboto text-[#8b98ab]">Last enquiry activity: {timeAgo(agent.lastActivity)}</p>
    </div>
  );
}

export default function AgentDashboards() {
  const { agents, loading, error, fetchAll } = useAgentDashboards();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selected, setSelected] = useState<AgentDashboardRecord | null>(null);

  const filtered = useMemo(() => {
    let list = agents;
    if (statusFilter === 'active') list = list.filter((a) => a.is_active);
    if (statusFilter === 'inactive') list = list.filter((a) => !a.is_active);
    if (search.trim()) {
      const t = search.trim().toLowerCase();
      list = list.filter((a) => [a.name, a.email, a.title, a.phone].filter(Boolean).some((v) => String(v).toLowerCase().includes(t)));
    }
    return list;
  }, [agents, search, statusFilter]);

  const totals = useMemo(() => {
    return {
      agents: agents.length,
      active: agents.filter((a) => a.is_active).length,
      listings: agents.reduce((s, a) => s + a.listings, 0),
      leads: agents.reduce((s, a) => s + a.leads, 0),
      deals: agents.reduce((s, a) => s + a.deals, 0),
      won: agents.reduce((s, a) => s + a.dealsWon, 0),
    };
  }, [agents]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-jost text-lg text-white">Agent Dashboards</h2>
          <p className="text-xs text-[#8b98ab] font-roboto mt-0.5">
            Inspect every agent's personal workspace — listings, leads, enquiries, deals & pipeline — scoped to each agent only.
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-roboto font-semibold bg-transparent text-white border border-white/40 hover:border-white hover:bg-white/5 transition-all cursor-pointer whitespace-nowrap"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Agents', value: totals.agents, color: 'text-white' },
          { label: 'Active', value: totals.active, color: 'text-green-400' },
          { label: 'Listings', value: totals.listings, color: 'text-[#5eead4]' },
          { label: 'Leads', value: totals.leads, color: 'text-[#c8a45c]' },
          { label: 'Deals', value: totals.deals, color: 'text-amber-400' },
          { label: 'Won', value: totals.won, color: 'text-green-400' },
        ].map((s) => (
          <div key={s.label} className="bg-[#012144] rounded-lg p-3.5">
            <p className={`text-2xl font-jost ${s.color}`}>{loading ? '—' : s.value}</p>
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
            className="w-full pl-9 pr-4 py-2.5 border border-[#1c3a5e] bg-[#012144] rounded-lg text-sm font-roboto text-white placeholder:text-[#8b98ab] focus:outline-none focus:border-[#5eead4]"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-[#012144] border border-[#1c3a5e] rounded-lg p-1">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-roboto font-medium transition-all cursor-pointer capitalize whitespace-nowrap ${
                statusFilter === s ? 'bg-[#0d5959] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#012144] border border-[#1c3a5e] rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#0d5959] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16 px-6">
              <p className="text-sm text-red-400 font-roboto">{error}</p>
              <button onClick={fetchAll} className="mt-3 px-4 py-2 bg-[#0d5959] text-white rounded-lg text-sm cursor-pointer">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-14 h-14 rounded-xl bg-[#0d5959]/20 flex items-center justify-center mx-auto mb-3">
                <i className="ri-user-settings-line text-[#5eead4] text-xl" />
              </div>
              <p className="text-sm text-[#9ca3af] font-roboto font-medium">
                {agents.length === 0 ? 'No agents registered yet' : 'No agents match your filters'}
              </p>
              <p className="text-xs text-[#8b98ab] font-roboto mt-1">
                {agents.length === 0 ? 'Agents appear here once they register and are approved.' : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1c3a5e]">
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#8b98ab] uppercase tracking-wider">Agent</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#8b98ab] uppercase tracking-wider hidden sm:table-cell">Listings</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#8b98ab] uppercase tracking-wider hidden md:table-cell">Leads</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#8b98ab] uppercase tracking-wider hidden md:table-cell">Enquiries</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#8b98ab] uppercase tracking-wider">Deals</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#8b98ab] uppercase tracking-wider hidden sm:table-cell">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a5688]">
                  {filtered.map((a) => (
                    <tr key={a.agentId} onClick={() => setSelected(a)} className={`cursor-pointer transition-colors ${selected?.agentId === a.agentId ? 'bg-[#0d5959]/10' : 'hover:bg-white/5'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {a.avatar_url ? (
                            <img src={a.avatar_url} alt={a.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#0d5959]/25 flex items-center justify-center flex-shrink-0">
                              <span className="text-[#5eead4] text-xs font-bold">{a.name.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-roboto text-white font-medium truncate">{a.name}</p>
                            <p className="text-xs font-roboto text-[#8b98ab] truncate">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-sm font-jost text-white">{a.listings}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-sm font-jost text-[#c8a45c]">{a.leads}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-sm font-jost text-[#5eead4]">{a.enquiries}</td>
                      <td className="px-4 py-3 text-sm font-jost text-amber-400">{a.deals}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${a.is_active ? 'bg-green-400/15 text-green-400' : 'bg-[#8b98ab]/15 text-[#8b98ab]'}`}>
                          {a.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:sticky lg:top-20 h-fit max-h-[calc(100vh-120px)] overflow-y-auto">
          {selected ? (
            <AgentDetail agent={selected} />
          ) : (
            <div className="bg-white rounded-xl text-center py-16 px-6 border border-[#1c3a5e]">
              <div className="w-12 h-12 rounded-xl bg-[#0d5959]/8 flex items-center justify-center mx-auto mb-3">
                <UserRound size={22} className="text-[#0d5959]" />
              </div>
              <p className="text-sm font-roboto text-[#9ca3af]">Select an agent to view their dashboard</p>
              <p className="text-xs font-roboto text-[#cbd5e1] mt-1 flex items-center justify-center gap-1">
                <Chevron /> Click a row on the left to inspect
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}