import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AgentCountsProvider, useAgentCounts } from '@/hooks/useAgentCounts';
import { useMessengerUnread } from '@/hooks/useMessengerUnread';
import { useCompanyCalendarAccess } from '@/hooks/useCompanyCalendarAccess';
import CountBadge from '@/pages/agent/components/CountBadge';
import { useNotifications } from '@/pages/agent/ogroup/useNotifications';
import PortalHeaderPills from '@/components/feature/PortalHeaderPills';
import InlineBackLink from '@/components/feature/InlineBackLink';
import { formatTimeAgo } from '@/lib/timeAgo';
import {
  LayoutDashboard, Building2, Plus, Users, Inbox, BarChart3,
  UserRound, HelpCircle, LogOut, Menu, X, Home, Contact,
  MessageSquareText, Fingerprint, CalendarDays, CalendarCheck, CalendarRange, Bell, Landmark, Handshake, Clock,
} from 'lucide-react';
import Chevron from '@/components/base/Chevron';
import NavSubmenu from '@/components/feature/NavSubmenu';
import { QuickSetHeaderButton } from '@/pages/agent/ogroup/components/QuickSetButton';
import IdleSignOutGuard from '@/pages/agent/components/IdleSignOutGuard';

interface NavEntry {
  label: string;
  icon: React.ReactNode;
  path: string;
  match: string;
  /** Require this query fragment to be present for the item to read as active. */
  matchSearch?: string;
  /** Do not mark active when this query fragment is present (siblings of same-path items). */
  excludeSearch?: string;
  /** Sub-paths that should NOT mark this item active (avoids overlap with a sibling shortcut). */
  excludePrefixes?: string[];
  /** Render this entry in the teal accent so it stands out as the primary call-to-action. */
  accent?: boolean;
  /** Keep this entry's own page reachable while its children open in the attached submenu. */
  parentLink?: boolean;
  /** Nested sub-navigation items, rendered in the side/inline submenu drawer. */
  children?: NavEntry[];
}

/**
 * AGENT PORTAL SHELL — distinct from the admin portal, but on the same
 * dark-navy canvas (mirrors the admin dashboard): navy shell + white cards.
 * Only items an approved agent actually needs. No admin/content/global
 * management. Collapses to a drawer on mobile with an explicit close button.
 */
export default function AgentPortalLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { inboxUnread, leadsUnread } = useAgentCounts();
  const { total: messengerUnread } = useMessengerUnread();
  const { items: notifItems, unreadCount: notifUnread, markAllRead: markNotifsRead } = useNotifications();
  const { allowed: canViewCompanyCalendar } = useCompanyCalendarAccess();
  const location = useLocation();
  const navigate = useNavigate();

  // OGroup notification types → feed icons (falls back to a bell).
  const notifIcon: Record<string, string> = {
    new_enquiry: 'ri-mail-add-line',
    lead_created: 'ri-user-add-line',
    lead_assigned: 'ri-user-received-line',
    message: 'ri-chat-3-line',
    follow_up: 'ri-calendar-line',
    deal_updated: 'ri-briefcase-3-line',
  };

  const headerFeed = notifItems.slice(0, 12).map((n) => ({
    id: n.id,
    icon: notifIcon[n.type] || 'ri-notification-3-line',
    title: n.title || 'Notification',
    subtitle: n.body || undefined,
    meta: formatTimeAgo(n.created_at).replace('Added ', ''),
    href: n.link || '/agent/notifications',
  }));

  const navGroups: { title: string; items: NavEntry[] }[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/agent/dashboard', match: '/agent/dashboard' },
        { label: 'OGroup Messenger', icon: <MessageSquareText size={18} />, path: '/agent/messenger', match: '/agent/messenger' },
      ],
    },
    {
      title: 'Properties',
      items: [
        {
          label: 'Add Listing',
          path: '/agent/listings/new',
          match: '/agent/listings/new',
          accent: true,
          icon: (
            <span className="relative inline-flex items-center justify-center">
              <Building2 size={18} />
              <Plus size={11} strokeWidth={3} className="absolute -bottom-1 -right-1.5" />
            </span>
          ),
        },
        {
          label: 'All My Properties',
          icon: <Building2 size={18} />,
          path: '/agent/listings',
          match: '/agent/listings',
          parentLink: true,
          children: [
            { label: 'New Developments', icon: <Landmark size={18} />, path: '/agent/developments', match: '/agent/developments' },
            { label: 'Land Listings', icon: <Landmark size={18} />, path: '/agent/land-listings', match: '/agent/land-listings' },
            { label: 'JV Desk', icon: <Handshake size={18} />, path: '/agent/jv-desk', match: '/agent/jv-desk' },
          ],
        },
      ],
    },
    {
      title: 'CRM',
      items: [
        { label: 'Leads', icon: <Users size={18} />, path: '/agent/leads', match: '/agent/leads' },
        { label: 'Inbox', icon: <Inbox size={18} />, path: '/agent/enquiries', match: '/agent/enquiries' },
        { label: 'My Contact Book', icon: <Contact size={18} />, path: '/agent/contacts', match: '/agent/contacts' },
        { label: 'Performance', icon: <BarChart3 size={18} />, path: '/agent/performance', match: '/agent/performance' },
      ],
    },
    {
      title: 'Team & Time',
      items: [
        { label: 'Punch Clock In/Out', icon: <Fingerprint size={18} />, path: '/agent/check-in', match: '/agent/check-in' },
        {
          label: 'Calendar',
          icon: <CalendarDays size={18} />,
          path: '/agent/calendar',
          match: '/agent/calendar',
          parentLink: true,
          excludeSearch: 'tab=availability',
          children: [
            {
              label: 'My Calendar',
              icon: <CalendarDays size={18} />,
              path: '/agent/calendar',
              match: '/agent/calendar',
              excludeSearch: 'tab=availability scope=company',
            },
            { label: 'My Appointments', icon: <CalendarCheck size={18} />, path: '/agent/appointments', match: '/agent/appointments' },
            {
              label: 'Schedule',
              icon: <Clock size={18} />,
              path: '/agent/calendar?tab=availability',
              match: '/agent/calendar',
              matchSearch: 'tab=availability',
            },
            ...(canViewCompanyCalendar
              ? [{
                  label: 'Company Calendar',
                  icon: <CalendarRange size={18} />,
                  path: '/agent/calendar?scope=company',
                  match: '/agent/calendar',
                  matchSearch: 'scope=company',
                } as NavEntry]
              : []),
          ],
        },
        { label: 'My Timesheet', icon: <Clock size={18} />, path: '/agent/timesheet', match: '/agent/timesheet' },
        { label: 'Notifications', icon: <Bell size={18} />, path: '/agent/notifications', match: '/agent/notifications' },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'My Profile', icon: <UserRound size={18} />, path: '/agent/profile', match: '/agent/profile' },
        { label: 'Help / Support', icon: <HelpCircle size={18} />, path: '/agent/help', match: '/agent/help' },
      ],
    },
  ];

  // Flat list (parents + nested children) used for breadcrumbs and the page title.
  const navFlat: NavEntry[] = navGroups.flatMap((g) => g.items.flatMap((i) => (i.children ? [i, ...i.children] : [i])));

  const isActive = (m: string, matchSearch?: string, excludeSearch?: string, excludePrefixes?: string[]) => {
    if (excludePrefixes?.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))) return false;
    const pathMatch = location.pathname === m || (m !== '/agent/dashboard' && location.pathname.startsWith(m));
    if (!pathMatch) return false;
    if (matchSearch) return location.search.includes(matchSearch);
    if (excludeSearch && excludeSearch.split(' ').some((f) => f && location.search.includes(f))) return false;
    return true;
  };

  // Adapter so the shared submenu (which may pass an optional noQuery flag) uses the agent matcher.
  const submenuIsActive = (m: string, matchSearch?: string) => isActive(m, matchSearch);

  // Richer per-child matcher so query-scoped children (My Calendar vs Schedule
  // vs Company Calendar) never light up at the same time.
  const submenuChildActive = (item: NavEntry) =>
    isActive(item.match, item.matchSearch, item.excludeSearch, item.excludePrefixes);

  const breadcrumbs = (() => {
    const parts = location.pathname.split('/').filter(Boolean).slice(1);
    const crumbs: { label: string; path: string }[] = [{ label: 'Agent Dashboard', path: '/agent/dashboard' }];
    let acc = '/agent';
    for (const p of parts) {
      acc += `/${p}`;
      const match = navFlat.find((n) => n.match === acc);
      crumbs.push({ label: match ? match.label : p.replace(/-/g, ' '), path: acc });
    }
    return crumbs;
  })();

  const handleSignOut = async () => {
    await signOut();
    navigate('/agent/login');
  };

  const SidebarContent = () => (
    <>
      <div className="px-5 py-5 border-b border-white/10 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-[#0d5959] flex items-center justify-center flex-shrink-0">
          <i className="ri-user-star-line text-[#5eead4] text-lg" />
        </div>
        <div className="min-w-0">
          <p className="font-roboto font-bold text-white text-base leading-tight">Agent Portal</p>
          <p className="text-[11px] text-white/50 font-roboto truncate">{user?.email}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 py-1.5 text-[11px] font-roboto font-semibold uppercase tracking-widest text-white/40">{group.title}</p>
            {group.items.map((item) => {
              if (item.children && item.children.length > 0) {
                return (
                  <NavSubmenu
                    key={item.path}
                    label={item.label}
                    icon={item.icon}
                    items={item.children}
                    isActive={submenuIsActive}
                    isChildActive={submenuChildActive}
                    onNavigate={() => setSidebarOpen(false)}
                    path={item.parentLink ? item.path : undefined}
                    match={item.parentLink ? item.match : undefined}
                    activeColor="#5eead4"
                    activeBg="#0d5959"
                  />
                );
              }
              const active = isActive(item.match, item.matchSearch, item.excludeSearch, item.excludePrefixes);
              const linkClass = item.accent
                ? (active
                    ? 'bg-[#0d5959] text-[#5eead4] font-semibold border border-[#5eead4]/50'
                    : 'bg-[#5eead4]/10 text-[#5eead4] border border-[#5eead4]/30 hover:bg-[#5eead4]/20 hover:text-white')
                : (active ? 'bg-white/10 text-[#5eead4]' : 'text-white/80 hover:bg-white/5 hover:text-white');
              const iconClass = item.accent
                ? 'text-[#5eead4] group-hover:text-white'
                : (active ? 'text-[#5eead4]' : 'text-white/60');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-roboto font-medium transition-all cursor-pointer whitespace-nowrap ${linkClass}`}
                >
                  <span className={`flex-shrink-0 ${iconClass}`}>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.match === '/agent/leads' && <CountBadge count={leadsUnread} label="new leads" />}
                  {item.match === '/agent/enquiries' && <CountBadge count={inboxUnread} label="unread" />}
                  {item.match === '/agent/messenger' && <CountBadge count={messengerUnread} label="unread messages" />}
                  {active && <Chevron className={`flex-shrink-0 ${item.accent ? 'text-[#5eead4] group-hover:text-white' : 'text-[#5eead4]'}`} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        <p className="px-3 py-2 text-[11px] font-roboto font-semibold uppercase tracking-widest text-white/40">Quick links</p>
        <Link
          to="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-roboto font-medium text-white/80 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
        >
          <Home size={18} className="text-white/60" />
          View public site
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-roboto font-medium text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </>
  );

  const pageTitle = () => {
    const withQuery = navFlat.find((n) => isActive(n.match, n.matchSearch, n.excludeSearch));
    return withQuery?.label || 'Agent Dashboard';
  };

  return (
    <AgentCountsProvider>
    <div className="min-h-screen flex bg-[#001731]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#001731] border-r border-[#0d2340] h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${sidebarOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
        <aside className={`absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-[#001731] flex flex-col shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 cursor-pointer">
            <X size={20} />
          </button>
          <SidebarContent />
        </aside>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-[#012144] border-b border-[#1c3a5e] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-md hover:bg-white/10 cursor-pointer text-white">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-roboto font-semibold text-lg md:text-xl text-white leading-tight">{pageTitle()}</h1>
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-1.5 text-xs text-white/50 font-roboto mt-0.5 flex-wrap">
                <InlineBackLink
                  tone="dark"
                  parent={{ to: '/agent/dashboard', label: 'Dashboard' }}
                />
                <span className="text-white/25" aria-hidden="true">·</span>
                {breadcrumbs.map((c, i) => (
                  <span key={c.path} className="flex items-center gap-1">
                    {i > 0 && <Chevron />}
                    <Link to={c.path} className="hover:text-[#5eead4] transition-colors">{c.label}</Link>
                  </span>
                ))}
              </nav>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <QuickSetHeaderButton />
            {/* Messages + Notifications — mirrors the admin portal header group. */}
            <PortalHeaderPills
              messagesHref="/agent/messenger"
              messengerUnread={messengerUnread}
              notificationsCount={notifUnread}
              feed={headerFeed}
              onMarkAllRead={markNotifsRead}
              viewAllHref="/agent/notifications"
              viewAllLabel="View all notifications"
              emptyText="No notifications yet."
            />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#5eead4]/10 text-[#5eead4] text-xs font-roboto font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5eead4]" />
              Approved Agent
            </div>
            <Link
              to="/agent/profile"
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center overflow-hidden hover:bg-white/20 transition-all cursor-pointer"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name || 'Agent'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#5eead4] text-sm font-bold">{user?.name?.charAt(0).toUpperCase() || 'A'}</span>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 text-[#1f2937] bg-[#001731]">
          <Outlet />
        </main>
      </div>

      {/* Shared-computer protection: idle agents are warned, then signed out. */}
      <IdleSignOutGuard />
    </div>
    </AgentCountsProvider>
  );
}