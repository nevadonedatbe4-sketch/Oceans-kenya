import { useState } from 'react';
import { useAgentPerformance } from '@/hooks/useAgentPerformance';
import { Building2, Users, Mail, TrendingUp } from 'lucide-react';

const RANGES: { key: string; label: string; from: string; to: string }[] = [
  { key: '7', label: '7 Days', from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
  { key: '30', label: '30 Days', from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
  { key: '90', label: '90 Days', from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
  { key: 'all', label: 'All Time', from: '2020-01-01', to: new Date().toISOString().split('T')[0] },
];

function formatCurrency(val: number) {
  if (val >= 1000000000) return `KES ${(val / 1000000000).toFixed(1)}B`;
  if (val >= 1000000) return `KES ${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `KES ${(val / 1000).toFixed(0)}K`;
  return `KES ${val}`;
}

function maxBar(items: { count: number }[]) {
  return Math.max(...items.map((i) => i.count), 1);
}

function BarRow({ label, value, count, color }: { label: string; value: number; count: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-roboto text-[#1a1a2e] capitalize">{label}</span>
        <span className="text-xs font-roboto text-[#6b7280]">{count}</span>
      </div>
      <div className="h-2.5 w-full bg-[#f0f2f1] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function AgentPerformance() {
  const [rangeKey, setRangeKey] = useState('30');
  const current = RANGES.find((r) => r.key === rangeKey) || RANGES[1];
  const { data, loading, error, refetch } = useAgentPerformance(current.from, current.to);

  const kpis = [
    { label: 'My Listings', value: data.totalListings, sub: `${data.publishedListings} published`, icon: <Building2 size={20} />, color: '#0d5959' },
    { label: 'Leads', value: data.totalLeads, sub: `${data.unreadLeads} unread`, icon: <Users size={20} />, color: '#b08d2a' },
    { label: 'Enquiries', value: data.totalEnquiries, sub: 'received', icon: <Mail size={20} />, color: '#088135' },
    { label: 'Pipeline value', value: formatCurrency(data.pipelineValue), sub: `${data.activeDeals} active deals`, icon: <TrendingUp size={20} />, color: '#001731' },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-roboto text-xl md:text-2xl font-bold text-white">My Performance</h2>
          <p className="text-sm font-roboto text-[#8b98ab] mt-0.5">Analytics from your own listings, leads and deals — never global data.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#012144] border border-[#1c3a5e] p-1 rounded-full">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap ${
                rangeKey === r.key ? 'bg-[#0d5959] text-white' : 'text-[#8b98ab] hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <i className="ri-error-warning-line text-red-500" />
          <p className="text-sm font-roboto text-red-700 flex-1">{error}</p>
          <button onClick={refetch} className="text-sm font-roboto font-semibold text-red-700 hover:underline cursor-pointer whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl p-5 border border-[#e4e9e6]">
            <div className="flex items-center justify-between mb-3">
              <span className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: k.color }}>
                {k.icon}
              </span>
            </div>
            <p className="text-2xl font-roboto font-bold text-[#1a1a2e]">{loading ? '—' : k.value}</p>
            <p className="text-xs font-roboto font-medium text-gray-500 mt-1">{k.label} · {k.sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary status strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending review', value: data.pendingListings, color: '#f58300' },
          { label: 'Draft listings', value: data.draftListings, color: '#6b7280' },
          { label: 'Deals won', value: data.dealsWon, color: '#088135' },
          { label: 'Deals lost', value: data.dealsLost, color: '#dc2626' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-[#e4e9e6]">
            <p className="text-xl font-roboto font-bold" style={{ color: s.color }}>{loading ? '—' : s.value}</p>
            <p className="text-xs font-roboto text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead sources */}
        <div className="bg-white rounded-xl p-5 border border-[#e4e9e6]">
          <h3 className="font-roboto font-semibold text-[#1a1a2e] mb-4">Lead sources</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 bg-[#f0f2f1] rounded animate-pulse" />
              ))}
            </div>
          ) : data.leadSources.length === 0 ? (
            <EmptyState msg="No lead source data in this period." />
          ) : (
            <div className="space-y-3">
              {data.leadSources.map((s) => (
                <BarRow key={s.source} label={s.source} count={s.count} value={(s.count / maxBar(data.leadSources)) * 100} color="#0d5959" />
              ))}
            </div>
          )}
        </div>

        {/* Lead stages */}
        <div className="bg-white rounded-xl p-5 border border-[#e4e9e6]">
          <h3 className="font-roboto font-semibold text-[#1a1a2e] mb-4">Lead stages</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 bg-[#f0f2f1] rounded animate-pulse" />
              ))}
            </div>
          ) : data.leadStages.length === 0 ? (
            <EmptyState msg="No lead stage data in this period." />
          ) : (
            <div className="space-y-3">
              {data.leadStages.map((s) => (
                <BarRow key={s.stage} label={s.stage.replace(/_/g, ' ')} count={s.count} value={(s.count / maxBar(data.leadStages)) * 100} color="#b08d2a" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top listings */}
      <div className="bg-white rounded-xl p-5 border border-[#e4e9e6]">
        <h3 className="font-roboto font-semibold text-[#1a1a2e] mb-4">Top listings by views</h3>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 bg-[#f0f2f1] rounded animate-pulse" />
            ))}
          </div>
        ) : data.topListings.length === 0 ? (
          <EmptyState msg="No property views in this period yet." />
        ) : (
          <div className="space-y-3">
            {data.topListings.map((p) => (
              <BarRow key={p.id} label={p.title} count={p.views} value={(p.views / maxBar(data.topListings.map((t) => ({ count: t.views })))) * 100} color="#088135" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="w-10 h-10 rounded-full bg-[#f6f8f7] flex items-center justify-center mb-2">
        <i className="ri-bar-chart-line text-[#9ca3af]" />
      </div>
      <p className="text-sm font-roboto text-[#6b7280]">{msg}</p>
    </div>
  );
}