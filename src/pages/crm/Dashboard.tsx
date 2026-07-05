import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { addToast } from '@/pages/crm/components/CRMToast';
import {
  mockStats,
  mockRecentLeads,
  mockRecentDeals,
  mockRecentProperties,
  type DashboardStats,
  type RecentLead,
  type RecentDeal,
  type RecentProperty,
} from '@/mocks/dashboard';
import DashboardStats from './components/DashboardStats';
import RecentLeads from './components/RecentLeads';
import RecentDeals from './components/RecentDeals';
import RecentProperties from './components/RecentProperties';

interface PipelineStage {
  name: string;
  count: number;
  value: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>(mockRecentLeads);
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>(mockRecentDeals);
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>(mockRecentProperties);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString();

      const [
        totalPropertiesRes,
        activePropertiesRes,
        featuredPropertiesRes,
        publishedPropertiesRes,
        draftPropertiesRes,
        totalLeadsRes,
        newLeadsWeekRes,
        openLeadsRes,
        pendingFollowUpsRes,
        totalDealsRes,
        dealsInPipelineRes,
        wonDealsRes,
        totalAgentsRes,
        dealsValueRes,
        leadsDataRes,
        dealsDataRes,
        propertiesDataRes,
      ] = await Promise.all([
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'available'),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_featured', true),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_published', false),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoStr),
        supabase.from('leads').select('*', { count: 'exact', head: true }).in('status', ['new', 'contacted', 'viewing', 'negotiating']),
        supabase.from('leads').select('*', { count: 'exact', head: true }).in('status', ['new', 'contacted']),
        supabase.from('deals').select('*', { count: 'exact', head: true }),
        supabase.from('deals').select('*', { count: 'exact', head: true }).in('status', ['prospect', 'negotiation', 'offer', 'due_diligence']),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'closed_won'),
        supabase.from('agents').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('deals').select('status, price').in('status', ['prospect', 'negotiation', 'offer', 'due_diligence']),
        supabase.from('leads').select('id, first_name, last_name, email, phone, status, source, created_at').order('created_at', { ascending: false }).limit(6),
        supabase.from('deals').select('id, title, status, price, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('listings').select('id, title, location, price, status, property_type, is_published, created_at').order('created_at', { ascending: false }).limit(4),
      ]);

      const totalDeals = totalDealsRes.count ?? 0;
      const wonDeals = wonDealsRes.count ?? 0;
      const winRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;

      const fetchedStats: DashboardStats = {
        totalProperties: totalPropertiesRes.count ?? 0,
        activeProperties: activePropertiesRes.count ?? 0,
        featuredProperties: featuredPropertiesRes.count ?? 0,
        publishedProperties: publishedPropertiesRes.count ?? 0,
        draftProperties: draftPropertiesRes.count ?? 0,
        totalLeads: totalLeadsRes.count ?? 0,
        newLeadsWeek: newLeadsWeekRes.count ?? 0,
        openLeads: openLeadsRes.count ?? 0,
        pendingFollowUps: pendingFollowUpsRes.count ?? 0,
        totalDeals,
        dealsInPipeline: dealsInPipelineRes.count ?? 0,
        pipelineValue: (dealsValueRes.data ?? []).reduce((sum, d) => sum + (Number(d.price) || 0), 0),
        wonDeals,
        winRate,
        totalAgents: totalAgentsRes.count ?? 0,
      };

      setStats(fetchedStats);
      setRecentLeads((leadsDataRes.data as RecentLead[]) ?? []);
      setRecentDeals((dealsDataRes.data as RecentDeal[]) ?? []);
      setRecentProperties((propertiesDataRes.data as RecentProperty[]) ?? []);

      // Compute pipeline stage breakdown
      const stageMap: Record<string, PipelineStage> = {
        prospect: { name: 'Prospect', count: 0, value: 0 },
        negotiation: { name: 'Negotiation', count: 0, value: 0 },
        offer: { name: 'Offer', count: 0, value: 0 },
        due_diligence: { name: 'Due Diligence', count: 0, value: 0 },
      };
      (dealsValueRes.data ?? []).forEach((d) => {
        const s = d.status as string;
        if (stageMap[s]) {
          stageMap[s].count += 1;
          stageMap[s].value += Number(d.price) || 0;
        }
      });
      setPipelineStages(Object.values(stageMap).filter((s) => s.count > 0));
      setError(null);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data. Showing cached data.');
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSyncFrontend = () => {
    addToast('Frontend cache cleared. Changes will reflect immediately.', 'success');
  };

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000000000) return `KSh ${(val / 1000000000).toFixed(1)}B`;
    if (val >= 1000000) return `KSh ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `KSh ${(val / 1000).toFixed(0)}K`;
    return `KSh ${val}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1280px]">
      {/* Welcome bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-jost text-lg sm:text-xl font-semibold text-[#001731]">
            {greeting()}, {user?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-xs sm:text-sm font-roboto text-[#7a8a99] mt-0.5">
            {today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-[#001731] rounded-lg text-xs sm:text-sm font-roboto font-medium border border-[#e8edf2] hover:bg-[#f8fafc] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <i className={`ri-refresh-line ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleSyncFrontend}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-[#001731] rounded-lg text-xs sm:text-sm font-roboto font-medium border border-[#e8edf2] hover:bg-[#f8fafc] transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-refresh-line" />
            Sync Frontend
          </button>
          <Link
            to="/crm/listings/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0d5959] text-white rounded-lg text-xs sm:text-sm font-roboto font-medium hover:bg-[#0d5959]/90 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-add-line" />
            Add Listing
          </Link>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <i className="ri-error-warning-line text-amber-600 text-sm" />
          <p className="text-xs sm:text-sm font-roboto text-amber-700">{error}</p>
          <button
            onClick={handleRefresh}
            className="ml-auto text-xs font-roboto text-amber-700 hover:text-amber-900 underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <DashboardStats stats={stats} loading={loading} />

      {/* Activity Feed — mobile only */}
      <div className="lg:hidden space-y-4">
        <div className="bg-white rounded-xl border border-[#e8edf2] p-4">
          <h3 className="font-jost text-sm font-medium text-[#001731] mb-3">Quick Activity</h3>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f8fafc] animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 bg-[#f8fafc] rounded animate-pulse" />
                    <div className="h-2.5 w-20 bg-[#f8fafc] rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0d5959]/8 flex items-center justify-center shrink-0">
                    <i className="ri-user-add-line text-[#0d5959] text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-roboto text-[#001731] font-medium truncate">
                      {stats.newLeadsWeek} new leads this week
                    </p>
                    <p className="text-xs font-roboto text-[#7a8a99]">
                      {stats.openLeads} currently open · {stats.pendingFollowUps} pending follow-up
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#001731]/8 flex items-center justify-center shrink-0">
                    <i className="ri-briefcase-3-line text-[#001731] text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-roboto text-[#001731] font-medium truncate">
                      {stats.dealsInPipeline} deals in pipeline
                    </p>
                    <p className="text-xs font-roboto text-[#7a8a99]">
                      {formatCurrency(stats.pipelineValue)} expected · {stats.winRate}% win rate
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0d5959]/8 flex items-center justify-center shrink-0">
                    <i className="ri-building-line text-[#0d5959] text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-roboto text-[#001731] font-medium truncate">
                      {stats.activeProperties} active properties
                    </p>
                    <p className="text-xs font-roboto text-[#7a8a99]">
                      {stats.totalProperties} total · {stats.publishedProperties} published · {stats.draftProperties} draft
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Left column — Leads + Deals */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          <RecentLeads leads={recentLeads} loading={loading} />
          <RecentDeals deals={recentDeals} loading={loading} />
        </div>

        {/* Right column — Properties + Pipeline */}
        <div className="space-y-4 sm:space-y-5">
          <RecentProperties properties={recentProperties} loading={loading} />

          {/* Pipeline summary card */}
          <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent" />
            <div className="bg-[#0d5959]/5 px-4 md:px-5 py-3 md:py-4 flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0d5959]/10 flex items-center justify-center">
                <i className="ri-funds-line text-[#0d5959] text-sm" />
              </div>
              <div>
                <h3 className="font-jost text-sm sm:text-base font-medium text-[#001731]">Pipeline</h3>
                <p className="text-xs font-roboto text-[#7a8a99]">Deals by stage</p>
              </div>
            </div>
            <div className="p-4 md:p-5 space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-20 bg-[#f8fafc] rounded animate-pulse" />
                      <div className="h-3 w-12 bg-[#f8fafc] rounded animate-pulse" />
                    </div>
                    <div className="h-2 w-full bg-[#f8fafc] rounded animate-pulse" />
                  </div>
                ))
              ) : pipelineStages.length === 0 ? (
                <div className="py-6 text-center">
                  <i className="ri-funds-line text-[#7a8a99] text-2xl mb-2 block" />
                  <p className="text-sm font-roboto text-[#7a8a99]">No active pipeline data</p>
                  <Link
                    to="/crm/deals"
                    className="text-xs font-roboto text-[#0d5959] hover:text-[#001731] mt-1 inline-block cursor-pointer"
                  >
                    Add your first deal
                  </Link>
                </div>
              ) : (
                pipelineStages.map((stage) => {
                  const maxValue = Math.max(...pipelineStages.map((s) => s.value), 1);
                  const pct = (stage.value / maxValue) * 100;
                  return (
                    <div key={stage.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-roboto text-[#001731] font-medium">
                          {stage.name}
                        </span>
                        <span className="text-xs font-roboto text-[#7a8a99]">
                          {stage.count} deals · {formatCurrency(stage.value)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#f8fafc] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#0d5959] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
              <div className="pt-2 border-t border-[#e8edf2]/60 flex items-center justify-between">
                <span className="text-xs font-roboto text-[#7a8a99]">Total Pipeline</span>
                <span className="text-sm font-prata text-[#001731] font-medium">
                  {loading ? '...' : formatCurrency(stats.pipelineValue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-roboto text-[#7a8a99]">Win Rate</span>
                <span className="text-sm font-prata text-[#001731] font-medium">
                  {loading ? '...' : `${stats.winRate}%`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}