import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { addToast } from '@/pages/crm/components/CRMToast';
import RecentLeads from './components/RecentLeads';
import RecentDeals from './components/RecentDeals';
import RecentProperties from './components/RecentProperties';
import AgentDashboard from './AgentDashboard';

interface DashboardStats {
  totalProperties: number;
  activeProperties: number;
  featuredProperties: number;
  publishedProperties: number;
  draftProperties: number;
  totalLeads: number;
  newLeadsWeek: number;
  openLeads: number;
  pendingFollowUps: number;
  totalDeals: number;
  dealsInPipeline: number;
  pipelineValue: number;
  wonDeals: number;
  winRate: number;
  totalAgents: number;
}

interface RecentLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  source: string | null;
  created_at: string;
}

interface RecentDeal {
  id: string;
  title: string;
  status: string;
  price: number | null;
  created_at: string;
}

interface RecentProperty {
  id: string;
  title: string;
  location: string | null;
  price: number | null;
  status: string;
  property_type: string | null;
  is_published: boolean;
  created_at: string;
}

interface PipelineStage {
  name: string;
  count: number;
  value: number;
}

const emptyStats: DashboardStats = {
  totalProperties: 0,
  activeProperties: 0,
  featuredProperties: 0,
  publishedProperties: 0,
  draftProperties: 0,
  totalLeads: 0,
  newLeadsWeek: 0,
  openLeads: 0,
  pendingFollowUps: 0,
  totalDeals: 0,
  dealsInPipeline: 0,
  pipelineValue: 0,
  wonDeals: 0,
  winRate: 0,
  totalAgents: 0,
};

export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const { agentId } = useAgentProfile();
  const isAgentView = user?.role === 'agent' || location.pathname === '/agent-dashboard';
  const isPreviewing = user?.role === 'super_admin' && location.pathname === '/agent-dashboard';

  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>([]);
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const showWelcome = searchParams.get('welcome') === '1';

  const dismissWelcome = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('welcome');
    setSearchParams(next, { replace: true });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString();

      const agentFilter = isAgentView && agentId ? { agent_id: agentId } : null;

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
        agentFilter
          ? supabase.from('listings').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id)
          : supabase.from('listings').select('*', { count: 'exact', head: true }),
        agentFilter
          ? supabase.from('listings').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).eq('status', 'available')
          : supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'available'),
        agentFilter
          ? supabase.from('listings').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).eq('is_featured', true)
          : supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_featured', true),
        agentFilter
          ? supabase.from('listings').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).eq('is_published', true)
          : supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_published', true),
        agentFilter
          ? supabase.from('listings').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).eq('is_published', false)
          : supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_published', false),
        agentFilter
          ? supabase.from('leads').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id)
          : supabase.from('leads').select('*', { count: 'exact', head: true }),
        agentFilter
          ? supabase.from('leads').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).gte('created_at', weekAgoStr)
          : supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoStr),
        agentFilter
          ? supabase.from('leads').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).in('status', ['new', 'contacted', 'viewing', 'negotiating'])
          : supabase.from('leads').select('*', { count: 'exact', head: true }).in('status', ['new', 'contacted', 'viewing', 'negotiating']),
        agentFilter
          ? supabase.from('leads').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).in('status', ['new', 'contacted'])
          : supabase.from('leads').select('*', { count: 'exact', head: true }).in('status', ['new', 'contacted']),
        agentFilter
          ? supabase.from('deals').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id)
          : supabase.from('deals').select('*', { count: 'exact', head: true }),
        agentFilter
          ? supabase.from('deals').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).in('status', ['prospect', 'negotiation', 'offer', 'due_diligence'])
          : supabase.from('deals').select('*', { count: 'exact', head: true }).in('status', ['prospect', 'negotiation', 'offer', 'due_diligence']),
        agentFilter
          ? supabase.from('deals').select('*', { count: 'exact', head: true }).eq('agent_id', agentFilter.agent_id).eq('status', 'closed_won')
          : supabase.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'closed_won'),
        supabase.from('agents').select('*', { count: 'exact', head: true }).eq('is_active', true),
        agentFilter
          ? supabase.from('deals').select('status, price').eq('agent_id', agentFilter.agent_id).in('status', ['prospect', 'negotiation', 'offer', 'due_diligence'])
          : supabase.from('deals').select('status, price').in('status', ['prospect', 'negotiation', 'offer', 'due_diligence']),
        agentFilter
          ? supabase.from('leads').select('id, first_name, last_name, email, phone, status, source, created_at').eq('agent_id', agentFilter.agent_id).order('created_at', { ascending: false }).limit(6)
          : supabase.from('leads').select('id, first_name, last_name, email, phone, status, source, created_at').order('created_at', { ascending: false }).limit(6),
        agentFilter
          ? supabase.from('deals').select('id, title, status, price, created_at').eq('agent_id', agentFilter.agent_id).order('created_at', { ascending: false }).limit(5)
          : supabase.from('deals').select('id, title, status, price, created_at').order('created_at', { ascending: false }).limit(5),
        agentFilter
          ? supabase.from('listings').select('id, title, location, price, status, property_type, is_published, created_at').eq('agent_id', agentFilter.agent_id).order('created_at', { ascending: false }).limit(4)
          : supabase.from('listings').select('id, title, location, price, status, property_type, is_published, created_at').order('created_at', { ascending: false }).limit(4),
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
  }, [isAgentView, agentId]);

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
      {/* Preview banner for super admins */}
      {isPreviewing && (
        <div className="bg-[#fff5e6] border border-[#f58300]/20 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <i className="ri-eye-line text-[#f58300] text-base" />
            <div>
              <p className="text-sm font-inter font-medium text-[#f58300]">Preview Mode</p>
              <p className="text-xs font-inter text-[#f58300]/70">You&apos;re viewing the agent dashboard layout. Data shown is unfiltered (all agents).</p>
            </div>
          </div>
          <Link
            to="/admin-dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f58300] text-white rounded-lg text-xs font-inter font-medium hover:bg-[#f58300]/90 transition-colors whitespace-nowrap cursor-pointer shrink-0"
          >
            <i className="ri-arrow-go-back-line text-sm" />
            Back to Admin
          </Link>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-[#fff5e6] border border-[#f58300]/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <i className="ri-error-warning-line text-[#f58300] text-sm" />
          <p className="text-xs sm:text-sm font-inter text-[#f58300]">{error}</p>
          <button
            onClick={handleRefresh}
            className="ml-auto text-xs font-inter text-[#f58300] hover:text-amber-900 underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Welcome onboarding banner */}
      {showWelcome && (
        <div className="bg-gradient-to-r from-[#0d5959] to-[#0a4a4a] rounded-xl overflow-hidden animate-fade-in">
          <div className="relative px-5 py-5 sm:px-6 sm:py-6">
            <button
              onClick={dismissWelcome}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Dismiss welcome message"
            >
              <i className="ri-close-line text-white text-sm" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <i className="ri-hand-heart-line text-white text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <h2 className="font-inter text-base sm:text-lg font-semibold text-white">
                    Welcome aboard{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
                  </h2>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-inter font-semibold uppercase tracking-wider bg-white/15 text-white`}>
                    {isAgentView ? 'Agent' : user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </span>
                </div>
                <p className="text-sm text-white/80 font-inter leading-relaxed">
                  {isAgentView
                    ? 'Your account is all set. Start by checking your assigned listings and leads — everything is ready for you to hit the ground running.'
                    : 'Your admin account is ready to go. You can add your first listing, invite team members, or customise the site — it\'s all yours.'}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {isAgentView ? (
                    <>
                      <Link
                        to="/crm/listings"
                        onClick={dismissWelcome}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0d5959] rounded-lg text-xs font-inter font-semibold hover:bg-white/90 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <i className="ri-building-line text-sm" />
                        View Listings
                      </Link>
                      <Link
                        to="/crm/leads"
                        onClick={dismissWelcome}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-inter font-medium hover:bg-white/20 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <i className="ri-user-star-line text-sm" />
                        Check Leads
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/crm/listings/new"
                        onClick={dismissWelcome}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0d5959] rounded-lg text-xs font-inter font-semibold hover:bg-white/90 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <i className="ri-add-line text-sm" />
                        Add First Listing
                      </Link>
                      <Link
                        to="/crm/users"
                        onClick={dismissWelcome}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-inter font-medium hover:bg-white/20 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <i className="ri-team-line text-sm" />
                        Invite Team
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Activity Feed — mobile only */}
      <div className="lg:hidden space-y-4">
        <div className="bg-[#012144] border border-[#1c3a5e] rounded-xl p-4">
          <h3 className="font-inter text-sm font-medium text-white mb-3">Quick Activity</h3>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#012a52] animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 bg-[#012a52] rounded animate-pulse" />
                    <div className="h-2.5 w-20 bg-[#012a52] rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0d5959]/20 flex items-center justify-center shrink-0">
                    <i className="ri-user-add-line text-[#5eead4] text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-inter text-white font-semibold truncate">
                      {stats.newLeadsWeek} new leads this week
                    </p>
                    <p className="text-xs font-inter text-[#6b7280]">
                      {stats.openLeads} currently open · {stats.pendingFollowUps} pending follow-up
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#001731]/40 flex items-center justify-center shrink-0">
                    <i className="ri-briefcase-3-line text-[#5eead4] text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-inter text-white font-semibold truncate">
                      {stats.dealsInPipeline} deals in pipeline
                    </p>
                    <p className="text-xs font-inter text-[#6b7280]">
                      {formatCurrency(stats.pipelineValue)} expected · {stats.winRate}% win rate
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0d5959]/20 flex items-center justify-center shrink-0">
                    <i className="ri-building-line text-[#5eead4] text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-inter text-white font-semibold truncate">
                      {stats.activeProperties} active properties
                    </p>
                    <p className="text-xs font-inter text-[#6b7280]">
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
      {isAgentView ? (
        <AgentDashboard />
      ) : (
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
            <div className="relative bg-white rounded-xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent" />
              <div className="bg-[#0d5959]/5 px-4 md:px-5 py-3 md:py-4 flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0d5959]/10 flex items-center justify-center">
                  <i className="ri-funds-line text-[#0d5959] text-sm" />
                </div>
                <div>
                  <h3 className="font-inter text-sm sm:text-base font-medium text-[#001731]">Pipeline</h3>
                  <p className="text-xs font-inter text-[#636363]">Deals by stage</p>
                </div>
              </div>
              <div className="p-4 md:p-5 space-y-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                        <div className="h-3 w-12 bg-[#f7f8fa] rounded animate-pulse" />
                      </div>
                      <div className="h-2 w-full bg-[#f7f8fa] rounded animate-pulse" />
                    </div>
                  ))
                ) : pipelineStages.length === 0 ? (
                  <div className="py-6 text-center">
                    <i className="ri-funds-line text-[#636363] text-2xl mb-2 block" />
                    <p className="text-sm font-inter text-[#636363]">No active pipeline data</p>
                    <Link
                      to="/crm/deals"
                      className="text-xs font-inter text-[#0d5959] hover:text-[#001731] mt-1 inline-block cursor-pointer"
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
                          <span className="text-xs sm:text-sm font-inter text-[#001731] font-semibold">
                            {stage.name}
                          </span>
                          <span className="text-xs font-inter text-[#636363]">
                            {stage.count} deals · {formatCurrency(stage.value)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#f7f8fa] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#0d5959] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
                <div className="pt-2 border-t border-[#f0f0f0]/60 flex items-center justify-between">
                  <span className="text-xs font-inter text-[#636363]">Total Pipeline</span>
                  <span className="text-sm font-inter font-bold text-[#001731] font-medium">
                    {loading ? '...' : formatCurrency(stats.pipelineValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-inter text-[#636363]">Win Rate</span>
                  <span className="text-sm font-inter font-bold text-[#001731] font-medium">
                    {loading ? '...' : `${stats.winRate}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}