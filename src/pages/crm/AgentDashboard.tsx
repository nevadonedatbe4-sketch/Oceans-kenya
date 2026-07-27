import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { addToast } from '@/pages/crm/components/CRMToast';
import {
  Building2,
  Users,
  Handshake,
  ArrowUpRight,
  Target,
  Calendar,
  Loader2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

interface PipelineStage {
  name: string;
  count: number;
  value: number;
  color: string;
}

interface AgentStats {
  totalProperties: number;
  activeListings: number;
  totalLeads: number;
  newLeadsWeek: number;
  openLeads: number;
  totalDeals: number;
  dealsInPipeline: number;
  wonDeals: number;
  pipelineValue: number;
  winRate: number;
}

interface RecentItem {
  id: string;
  title: string;
  status: string;
  value: number | null;
  created_at: string;
  type: 'lead' | 'deal' | 'property';
}

const PIPELINE_STAGES = [
  { key: 'prospect', name: 'Prospect', color: '#f59e0b' },
  { key: 'negotiation', name: 'Negotiation', color: '#3b82f6' },
  { key: 'offer', name: 'Offer', color: '#8b5cf6' },
  { key: 'due_diligence', name: 'Due Diligence', color: '#ec4899' },
  { key: 'closed_won', name: 'Closed Won', color: '#10b981' },
];

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-teal-100 text-teal-700',
  contacted: 'bg-blue-100 text-blue-700',
  viewing: 'bg-purple-100 text-purple-700',
  negotiating: 'bg-pink-100 text-pink-700',
  closed_won: 'bg-emerald-100 text-emerald-700',
  closed_lost: 'bg-red-100 text-red-700',
  prospect: 'bg-amber-100 text-amber-700',
  offer: 'bg-violet-100 text-violet-700',
  due_diligence: 'bg-rose-100 text-rose-700',
  available: 'bg-emerald-100 text-emerald-700',
  sold: 'bg-blue-100 text-blue-700',
  rented: 'bg-sky-100 text-sky-700',
};

const formatCurrency = (val: number) => {
  if (val >= 1000000000) return `KSh ${(val / 1000000000).toFixed(1)}B`;
  if (val >= 1000000) return `KSh ${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `KSh ${(val / 1000).toFixed(0)}K`;
  return `KSh ${val}`;
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export default function AgentDashboard() {
  const { user } = useAuth();
  const { agentId } = useAgentProfile();
  const [stats, setStats] = useState<AgentStats>({
    totalProperties: 0,
    activeListings: 0,
    totalLeads: 0,
    newLeadsWeek: 0,
    openLeads: 0,
    totalDeals: 0,
    dealsInPipeline: 0,
    wonDeals: 0,
    pipelineValue: 0,
    winRate: 0,
  });
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString();

      const agentFilter = agentId ? { agent_id: agentId } : null;
      if (!agentFilter) {
        setLoading(false);
        return;
      }

      const [
        totalPropertiesRes,
        activeListingsRes,
        totalLeadsRes,
        newLeadsWeekRes,
        openLeadsRes,
        totalDealsRes,
        pipelineDealsRes,
        wonDealsRes,
        pipelineDataRes,
        leadsRecentRes,
        dealsRecentRes,
        propsRecentRes,
      ] = await Promise.all([
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).eq('status', 'available'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).gte('created_at', weekAgoStr),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).in('status', ['new', 'contacted', 'viewing', 'negotiating']),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).in('status', ['prospect', 'negotiation', 'offer', 'due_diligence']),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).eq('status', 'closed_won'),
        supabase.from('deals').select('status, price').eq('agent_id', agentFilter.agent_id).in('status', ['prospect', 'negotiation', 'offer', 'due_diligence', 'closed_won']),
        supabase.from('leads').select('id, first_name, last_name, status, created_at').eq('agent_id', agentFilter.agent_id).order('created_at', { ascending: false }).limit(4),
        supabase.from('deals').select('id, title, status, price, created_at').eq('agent_id', agentFilter.agent_id).order('created_at', { ascending: false }).limit(4),
        supabase.from('listings').select('id, title, status, price, created_at').eq('agent_id', agentFilter.agent_id).order('created_at', { ascending: false }).limit(4),
      ]);

      const totalDeals = totalDealsRes.count ?? 0;
      const wonDeals = wonDealsRes.count ?? 0;
      const winRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;
      const pipelineValue = (pipelineDataRes.data ?? []).reduce((sum, d) => sum + (Number(d.price) || 0), 0);

      setStats({
        totalProperties: totalPropertiesRes.count ?? 0,
        activeListings: activeListingsRes.count ?? 0,
        totalLeads: totalLeadsRes.count ?? 0,
        newLeadsWeek: newLeadsWeekRes.count ?? 0,
        openLeads: openLeadsRes.count ?? 0,
        totalDeals,
        dealsInPipeline: pipelineDealsRes.count ?? 0,
        wonDeals,
        pipelineValue,
        winRate,
      });

      const stageMap: Record<string, PipelineStage> = {};
      PIPELINE_STAGES.forEach((s) => {
        stageMap[s.key] = { name: s.name, count: 0, value: 0, color: s.color };
      });
      (pipelineDataRes.data ?? []).forEach((d) => {
        const s = d.status as string;
        if (stageMap[s]) {
          stageMap[s].count += 1;
          stageMap[s].value += Number(d.price) || 0;
        }
      });
      setPipeline(Object.values(stageMap));

      const activity: RecentItem[] = [];
      (leadsRecentRes.data ?? []).forEach((l: any) =>
        activity.push({
          id: l.id,
          title: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'New Lead',
          status: l.status,
          value: null,
          created_at: l.created_at,
          type: 'lead',
        })
      );
      (dealsRecentRes.data ?? []).forEach((d: any) =>
        activity.push({
          id: d.id,
          title: d.title,
          status: d.status,
          value: d.price,
          created_at: d.created_at,
          type: 'deal',
        })
      );
      (propsRecentRes.data ?? []).forEach((p: any) =>
        activity.push({
          id: p.id,
          title: p.title,
          status: p.status,
          value: p.price,
          created_at: p.created_at,
          type: 'property',
        })
      );
      activity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentActivity(activity.slice(0, 6));
    } catch (err) {
      console.error('Agent dashboard fetch error:', err);
      addToast('Failed to load agent dashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const maxPipelineCount = useMemo(() => {
    return Math.max(...pipeline.map((s) => s.count), 1);
  }, [pipeline]);

  const kpiCards = [
    {
      label: 'My Properties',
      value: stats.totalProperties,
      sub: `${stats.activeListings} active listings`,
      icon: Building2,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      link: '/crm/listings',
    },
    {
      label: 'My Leads',
      value: stats.totalLeads,
      sub: `${stats.newLeadsWeek} new this week`,
      icon: Users,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      link: '/crm/leads',
    },
    {
      label: 'My Deals',
      value: stats.totalDeals,
      sub: `${stats.wonDeals} won · ${stats.winRate}% win rate`,
      icon: Handshake,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      link: '/crm/deals',
    },
  ];

  return (
    <div className="space-y-5 max-w-[1280px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-inter text-[28px] md:text-[32px] font-bold text-white leading-tight">
              {greeting()}, {user?.name?.split(' ')[0] || 'Agent'}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-inter font-semibold uppercase tracking-wider bg-[#0d5959]/20 text-[#5eead4]">
              Agent
            </span>
          </div>
          <p className="text-sm font-inter text-[#6b7280] flex items-center gap-1.5">
            <Calendar size={14} />
            {today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#012a52] text-[#e5e7eb] rounded-lg text-sm font-inter font-semibold border border-[#1c3a5e] hover:bg-[#0a3560] hover:border-[#2a4a6e] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-40"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link
            to="/crm/listings/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0d5959] text-white rounded-lg text-sm font-inter font-semibold hover:bg-[#0b4a4a] transition-colors whitespace-nowrap cursor-pointer"
          >
            <ArrowUpRight size={14} />
            Add Listing
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <card.icon size={20} className={card.iconColor} />
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-teal-600 transition-colors" />
            </div>
            <p className="font-inter font-extrabold text-[32px] md:text-[36px] text-gray-900 mb-1 leading-none tracking-tight">
              {loading ? (
                <span className="inline-block w-16 h-8 bg-gray-200 rounded animate-pulse" />
              ) : (
                card.value
              )}
            </p>
            <p className="text-sm font-inter font-medium text-gray-600">{card.label}</p>
            <p className="text-xs font-inter text-gray-500 mt-1">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Pipeline Funnel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                  <Target size={18} className="text-teal-600" />
                </div>
                <div>
                  <h3 className="font-inter text-base font-bold text-gray-900">My Pipeline</h3>
                  <p className="text-xs font-inter text-gray-500">
                    {loading ? '...' : `${stats.dealsInPipeline} active · ${stats.wonDeals} won · ${formatCurrency(stats.pipelineValue)} total`}
                  </p>
                </div>
              </div>
              <Link
                to="/crm/deals"
                className="text-sm font-inter font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                View All <ChevronRight size={14} />
              </Link>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                      </div>
                      <div className="h-3 w-full bg-gray-200 rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : pipeline.length === 0 || pipeline.every((s) => s.count === 0) ? (
                <div className="py-10 text-center">
                  <Target size={32} className="text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-inter text-gray-500">No deals in your pipeline yet</p>
                  <Link
                    to="/crm/deals"
                    className="text-sm font-inter font-semibold text-teal-600 hover:text-teal-700 mt-2 inline-block cursor-pointer transition-colors"
                  >
                    Start tracking deals
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {pipeline.map((stage) => {
                    const pct = (stage.count / maxPipelineCount) * 100;
                    return (
                      <div key={stage.name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className="text-sm font-inter font-semibold text-gray-700">
                              {stage.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-inter text-gray-500">
                              {stage.count} deals
                            </span>
                            <span className="text-xs font-inter font-semibold text-gray-800">
                              {formatCurrency(stage.value)}
                            </span>
                          </div>
                        </div>
                        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: stage.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Win Rate Summary */}
          <div className="mt-5 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-inter text-base font-bold text-gray-900">Performance</h3>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                      style={{ width: `${Math.min(stats.winRate, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-inter">
                    <span className="text-gray-500">Win Rate</span>
                    <span className="text-gray-900 font-semibold">{stats.winRate}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-xl font-inter font-bold text-gray-900">{stats.wonDeals}</p>
                      <p className="text-xs font-inter text-gray-500 mt-0.5">Closed Won</p>
                    </div>
                    <div className="text-center border-l border-gray-200">
                      <p className="text-xl font-inter font-bold text-gray-900">{stats.dealsInPipeline}</p>
                      <p className="text-xs font-inter text-gray-500 mt-0.5">In Pipeline</p>
                    </div>
                    <div className="text-center border-l border-gray-200">
                      <p className="text-xl font-inter font-bold text-gray-900">
                        {formatCurrency(stats.pipelineValue)}
                      </p>
                      <p className="text-xs font-inter text-gray-500 mt-0.5">Pipeline Value</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-inter text-base font-bold text-gray-900">Recent Activity</h3>
              <span className="text-xs font-inter text-gray-500">Latest</span>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-200 animate-pulse" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-32 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="py-8 text-center">
                  <Loader2 size={28} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-inter text-gray-500">No recent activity yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((item) => {
                    const typeConfig = {
                      lead: { icon: Users, iconBg: 'bg-teal-50', iconColor: 'text-teal-600', label: 'Lead' },
                      deal: { icon: Handshake, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', label: 'Deal' },
                      property: { icon: Building2, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', label: 'Property' },
                    };
                    const tc = typeConfig[item.type];
                    return (
                      <div key={`${item.type}-${item.id}`} className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl ${tc.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <tc.icon size={16} className={tc.iconColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-inter font-semibold text-gray-800 truncate">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`inline-flex items-center px-1.5 py-px rounded text-[10px] font-inter font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                              {item.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-inter text-gray-500">{tc.label}</span>
                            {item.value !== null && (
                              <span className="text-xs font-inter font-semibold text-gray-800">
                                {formatCurrency(item.value)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-inter text-gray-500 mt-0.5">{formatDate(item.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-inter text-base font-bold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-5 space-y-2">
              <Link
                to="/crm/listings/new"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-gray-700 transition-colors cursor-pointer group"
              >
                <Building2 size={18} className="text-teal-600" />
                <span className="text-sm font-inter font-semibold">Add New Property</span>
                <ArrowUpRight size={14} className="ml-auto text-gray-400 group-hover:text-teal-600 transition-colors" />
              </Link>
              <Link
                to="/crm/leads"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer group"
              >
                <Users size={18} className="text-blue-600" />
                <span className="text-sm font-inter font-semibold">View My Leads</span>
                <ArrowUpRight size={14} className="ml-auto text-gray-400 group-hover:text-blue-600 transition-colors" />
              </Link>
              <Link
                to="/crm/deals"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-gray-700 transition-colors cursor-pointer group"
              >
                <Handshake size={18} className="text-amber-600" />
                <span className="text-sm font-inter font-semibold">Manage Deals</span>
                <ArrowUpRight size={14} className="ml-auto text-gray-400 group-hover:text-amber-600 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}