import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAgentCounts } from '@/hooks/useAgentCounts';
import OGroupToday from '@/pages/agent/ogroup/OGroupToday';
import { Building2, PlusCircle, Users, Inbox, BarChart3, UserRound } from 'lucide-react';

interface Summary {
  listings: number;
  leads: number;
  enquiries: number;
  published: number;
  pending: number;
}

interface AgentDashboardViewProps {
  /** The agent whose scoped data should be shown (agents.id). Null renders zeros. */
  agentId: string | null;
  /** The agent's auth user id — used to scope the OGroup Today widget. */
  agentUserId?: string | null;
  /** Display name shown in the welcome banner. */
  displayName: string;
  /** Preview mode re-points every action at the matching Admin editor. */
  preview?: boolean;
  /** Admin preview supplies the agent's real unread counts. */
  countsOverride?: { inboxUnread: number; leadsUnread: number };
  /** Preview-only: opens the agent profile editor. */
  onEditProfile?: () => void;
}

/**
 * The agent's personal workspace, rendered from data scoped to a single agent
 * id. Used verbatim by the Agent Portal dashboard AND by the Super Admin
 * read-only preview, so both always show the exact same UI. In preview mode
 * all in-page actions are re-pointed at the Admin editors for that agent.
 */
export default function AgentDashboardView({
  agentId,
  agentUserId,
  displayName,
  preview = false,
  countsOverride,
  onEditProfile,
}: AgentDashboardViewProps) {
  const navigate = useNavigate();
  const liveCounts = useAgentCounts();
  const inboxUnread = countsOverride ? countsOverride.inboxUnread : liveCounts.inboxUnread;
  const leadsUnread = countsOverride ? countsOverride.leadsUnread : liveCounts.leadsUnread;

  const [summary, setSummary] = useState<Summary>({ listings: 0, leads: 0, enquiries: 0, published: 0, pending: 0 });
  const [todayStats, setTodayStats] = useState({ appointments: 0, tasks: 0 });
  const [loading, setLoading] = useState(true);

  // Preview mode re-points each agent action at the equivalent Admin editor,
  // scoped to the agent being previewed. Live mode keeps the agent routes.
  const href = (agentPath: string): string => {
    if (!preview) return agentPath;
    const q = agentId ? `?agent=${agentId}` : '';
    const map: Record<string, string> = {
      '/agent/listings/new': '/admin/listings/new',
      '/agent/listings': `/admin/listings${q}`,
      '/agent/leads': `/admin/leads${q}`,
      '/agent/enquiries': '/admin/inbox',
      '/agent/performance': '/admin/agent-dashboards',
      '/agent/check-in': '/admin/check-in',
      '/agent/messenger': '/admin/messenger',
      '/agent/profile': '/admin/agents',
    };
    return map[agentPath] || agentPath;
  };

  // CORE COUNTS — listings / leads / enquiries scoped to this agent only.
  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      const [listingCount, leadsCount, enquiriesCount, publishedQuery, pendingQuery] = await Promise.all([
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
        supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('agent_id', agentId).eq('is_published', true),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('agent_id', agentId).eq('is_pending', true),
      ]);
      if (!active) return;
      setSummary({
        listings: listingCount.count ?? 0,
        leads: leadsCount.count ?? 0,
        enquiries: enquiriesCount.count ?? 0,
        published: publishedQuery.count ?? 0,
        pending: pendingQuery.count ?? 0,
      });
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [agentId]);

  // TODAY STATS — appointments later today + outstanding follow-up tasks.
  useEffect(() => {
    if (!agentId) return;
    let active = true;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    const load = async () => {
      const [apptQ, taskQ] = await Promise.all([
        supabase
          .from('og_appointments')
          .select('id', { count: 'exact', head: true })
          .eq('organizer_id', agentId)
          .neq('status', 'cancelled')
          .gte('start_time', start.toISOString())
          .lt('start_time', end.toISOString()),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agentId)
          .eq('is_archived', false)
          .eq('is_spam', false)
          .eq('is_trashed', false)
          .lte('next_follow_up_at', end.toISOString()),
      ]);
      if (active) setTodayStats({ appointments: apptQ.count ?? 0, tasks: taskQ.count ?? 0 });
    };
    load();
    return () => { active = false; };
  }, [agentId]);

  const cards = [
    { label: 'My Listings', value: summary.listings, icon: <Building2 size={20} />, color: '#0d5959', path: '/agent/listings' },
    { label: 'My Leads', value: summary.leads, icon: <Users size={20} />, color: '#b08d2a', path: '/agent/leads' },
    { label: 'Enquiries', value: summary.enquiries, icon: <Inbox size={20} />, color: '#088135', path: '/agent/enquiries' },
    { label: 'Performance', value: summary.published, icon: <BarChart3 size={20} />, color: '#001731', path: '/agent/performance' },
  ];

  const quickActions = [
    { label: 'Add a new listing', icon: <PlusCircle size={16} />, path: '/agent/listings/new' },
    { label: 'View my listings', icon: <Building2 size={16} />, path: '/agent/listings' },
    { label: 'Review my leads', icon: <Users size={16} />, path: '/agent/leads' },
    { label: 'Update my profile', icon: <UserRound size={16} />, path: '/agent/profile' },
  ];

  const runQuickAction = (path: string) => {
    if (preview && path === '/agent/profile') {
      onEditProfile?.();
      return;
    }
    navigate(href(path));
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="bg-gradient-to-br from-[#0d5959] to-[#0a4a4a] rounded-xl p-6 md:p-8 text-white">
        <p className="text-sm font-roboto font-medium text-white/70 mb-1">Welcome back</p>
        <h2 className="font-roboto text-2xl md:text-3xl font-bold mb-2">{displayName} 👋</h2>
        <p className="text-sm text-white/80 font-roboto max-w-xl leading-relaxed">
          Here&apos;s your personal workspace. Everything you see is scoped to you — you can only view and manage your own listings, leads and enquiries.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to={href('/agent/listings/new')}
            className="inline-flex items-center gap-2 bg-white text-[#0d5959] px-4 py-2.5 rounded-md text-sm font-roboto font-semibold transition-all hover:bg-white/90 cursor-pointer whitespace-nowrap"
          >
            <PlusCircle size={16} />
            Add a listing
          </Link>
          <Link
            to={href('/agent/listings')}
            className="inline-flex items-center gap-2 border border-white/40 px-4 py-2.5 rounded-md text-sm font-roboto font-semibold transition-all hover:bg-white/10 cursor-pointer whitespace-nowrap"
          >
            <Building2 size={16} />
            My listings
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e4e9e6] p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-roboto font-semibold text-[#1a1a2e]">My Workspace</h3>
          <span className="text-xs text-gray-400 font-roboto">Live</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            to={href('/agent/enquiries')}
            className="group flex items-center gap-3 p-3 rounded-lg bg-[#f6f8f7] hover:bg-[#eef2f0] border border-transparent hover:border-[#c9d4d0] transition-all cursor-pointer"
          >
            <span className="w-10 h-10 rounded-lg bg-[#088135]/10 text-[#088135] flex items-center justify-center flex-shrink-0">
              <i className="ri-mail-line text-lg" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-roboto font-bold text-[#1a1a2e] leading-tight">
                {inboxUnread} <span className="text-xs font-medium text-gray-500">unread</span>
              </p>
              <p className="text-xs font-roboto font-medium text-gray-500">Inbox</p>
            </div>
          </Link>
          <Link
            to={href('/agent/leads')}
            className="group flex items-center gap-3 p-3 rounded-lg bg-[#f6f8f7] hover:bg-[#eef2f0] border border-transparent hover:border-[#c9d4d0] transition-all cursor-pointer"
          >
            <span className="w-10 h-10 rounded-lg bg-[#b08d2a]/10 text-[#b08d2a] flex items-center justify-center flex-shrink-0">
              <i className="ri-user-star-line text-lg" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-roboto font-bold text-[#1a1a2e] leading-tight">
                {leadsUnread} <span className="text-xs font-medium text-gray-500">new</span>
              </p>
              <p className="text-xs font-roboto font-medium text-gray-500">Leads</p>
            </div>
          </Link>
          <Link
            to={href('/agent/check-in')}
            className="group flex items-center gap-3 p-3 rounded-lg bg-[#f6f8f7] hover:bg-[#eef2f0] border border-transparent hover:border-[#c9d4d0] transition-all cursor-pointer"
          >
            <span className="w-10 h-10 rounded-lg bg-[#0d5959]/10 text-[#0d5959] flex items-center justify-center flex-shrink-0">
              <i className="ri-calendar-check-line text-lg" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-roboto font-bold text-[#1a1a2e] leading-tight">
                {todayStats.appointments} <span className="text-xs font-medium text-gray-500">today</span>
              </p>
              <p className="text-xs font-roboto font-medium text-gray-500">Appointments</p>
            </div>
          </Link>
          <Link
            to={href('/agent/leads')}
            className="group flex items-center gap-3 p-3 rounded-lg bg-[#f6f8f7] hover:bg-[#eef2f0] border border-transparent hover:border-[#c9d4d0] transition-all cursor-pointer"
          >
            <span className="w-10 h-10 rounded-lg bg-[#001731]/10 text-[#001731] flex items-center justify-center flex-shrink-0">
              <i className="ri-todo-line text-lg" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-roboto font-bold text-[#1a1a2e] leading-tight">
                {todayStats.tasks} <span className="text-xs font-medium text-gray-500">outstanding</span>
              </p>
              <p className="text-xs font-roboto font-medium text-gray-500">Tasks</p>
            </div>
          </Link>
        </div>
      </div>

      <OGroupToday userIdOverride={agentUserId ?? null} resolveHref={preview ? href : undefined} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => navigate(href(c.path))}
            className="bg-white rounded-xl p-5 text-left border border-[#e4e9e6] hover:border-[#c9d4d0] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: c.color }}>
                {c.icon}
              </span>
              <i className="ri-arrow-right-up-line text-gray-300" />
            </div>
            <p className="text-2xl font-roboto font-bold text-[#1a1a2e]">{loading ? '—' : c.value}</p>
            <p className="text-xs font-roboto font-medium text-gray-500 mt-1">{c.label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-[#e4e9e6]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-roboto font-semibold text-[#1a1a2e]">Your listing status</h3>
            <span className="text-xs text-gray-400 font-roboto">Live</span>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Published', value: summary.published, bar: '#088135', max: Math.max(1, summary.listings) },
              { label: 'Pending review', value: summary.pending, bar: '#f58300', max: Math.max(1, summary.listings) },
              { label: 'Draft', value: Math.max(0, summary.listings - summary.published - summary.pending), bar: '#9ca3af', max: Math.max(1, summary.listings) },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-xs font-roboto font-medium text-[#374151] mb-1">
                  <span>{row.label}</span>
                  <span>{loading ? '—' : row.value}</span>
                </div>
                <div className="h-2 rounded-full bg-[#f0f2f1] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (row.value / row.max) * 100)}%`, backgroundColor: row.bar }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#e4e9e6]">
          <h3 className="font-roboto font-semibold text-[#1a1a2e] mb-3">Quick actions</h3>
          <div className="space-y-2">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={() => runQuickAction(a.path)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md bg-[#f6f8f7] hover:bg-[#eef2f0] text-sm font-roboto font-medium text-[#374151] transition-all cursor-pointer"
              >
                <span className="text-accent">{a.icon}</span>
                {a.label}
                <i className="ri-arrow-right-s-line ml-auto text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}