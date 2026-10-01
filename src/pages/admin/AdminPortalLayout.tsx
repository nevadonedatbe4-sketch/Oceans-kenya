import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import PortalHeaderPills from '@/components/feature/PortalHeaderPills';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin, isAdminRole } from '@/lib/authz';
import { useAdminCounts } from '@/hooks/useAdminCounts';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { FALLBACK_LOGO } from '@/lib/brandDefaults';
import { formatTimeAgo } from '@/lib/timeAgo';
import CountBadge from '@/pages/agent/components/CountBadge';
import { CRMToastContainer } from '@/pages/crm/components/CRMToast';
import NavSubmenu from '@/components/feature/NavSubmenu';
import Chevron from '@/components/base/Chevron';
import { QuickSetHeaderButton } from '@/pages/agent/ogroup/components/QuickSetButton';
import {
  LayoutDashboard, Building2, Users, Inbox, Handshake,
  Settings, LogOut, Menu, X, Home, CheckSquare, BarChart3,
  CalendarDays, UserRound, Fingerprint, Activity, MessageSquareText, Plus, Clock,
} from 'lucide-react';
import { useMessengerUnread } from '@/hooks/useMessengerUnread';

interface NavEntry {
  label: string;
  icon: React.ReactNode;
  path: string;
  match: string;
  /** Optional query-string marker to differentiate same-path nav items (e.g. tab=listings). */
  matchSearch?: string;
  /** Require the query string to be empty (used for the parent item of tabbed same-path items). */
  noQuery?: boolean;
  /** Sub-paths that should NOT mark this item active (used to avoid overlap with a sibling shortcut). */
  excludePrefixes?: string[];
  /** Render this entry with the teal highlight accent to make it stand out from plain links. */
  highlight?: boolean;
  /** Render this entry in the cyan-blue accent so it pops against the navy sidebar. */
  cyan?: boolean;
  /** Active state uses a navy fill with plain white text (no colored highlight). */
  whiteActive?: boolean;
  superOnly?: boolean;
  /**
   * Admin-only entries are hidden from agent-role users. This is defense-in-depth:
   * agents are already blocked from the admin portal entirely by PortalGuard, but
   * keeping team-management items admin-only makes the boundary explicit.
   */
  adminOnly?: boolean;
  /**
   * When true, this entry's own page opens from a clickable parent row, while its
   * children open in the attached submenu (used for Agent Dashboards + Approvals).
   */
  parentLink?: boolean;
  /** Optional nested sub-navigation items, rendered as an indented drawer under this entry. */
  children?: NavEntry[];
}

/**
 * ADMIN PORTAL SHELL — private, visibly distinct from the agent portal.
 * Includes global/operational navigation, approvals, content and settings.
 */
export default function AdminPortalLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { alertsCount, recentActivity, markAlertsSeen } = useAdminCounts();
  const { total: messengerUnread } = useMessengerUnread();
  const { site, getBrand } = useSiteSettings();
  const logoUrl = site.logo_url || getBrand('main_logo') || FALLBACK_LOGO;

  // Only this route should render on a white canvas — the rest of the admin stays dark navy.
  const isWhiteBgPage = location.pathname === '/admin/jv-opportunities/new'
    || location.pathname.startsWith('/admin/contacts')
    || /^\/admin\/land-listings\/(new|edit\/)/.test(location.pathname);

  const headerFeed = recentActivity.map((entry) => ({
    id: entry.id,
    icon: 'ri-arrow-right-up-line',
    title: entry.action ? entry.action.charAt(0).toUpperCase() + entry.action.slice(1) : 'Action',
    titleMuted: entry.module ? `\u00b7 ${entry.module}` : undefined,
    subtitle: `${entry.record_title || entry.user_name || 'Record'}${entry.user_name ? ` by ${entry.user_name}` : ''}`,
    meta: formatTimeAgo(entry.created_at).replace('Added ', ''),
    href: '/admin/activities',
  }));

  const navGroups: { title: string; items: NavEntry[] }[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/admin/dashboard', match: '/admin/dashboard' },
        { label: 'Oceans Chat', icon: <MessageSquareText size={18} />, path: '/admin/messenger', match: '/admin/messenger' },
        {
          label: 'Ogroup Team',
          icon: <Users size={18} />,
          path: '/admin/team',
          match: '/admin/team',
          children: [
            { label: 'Team Overview', icon: <Users size={18} />, path: '/admin/team', match: '/admin/team', adminOnly: true },
            { label: 'Team Calendar', icon: <CalendarDays size={18} />, path: '/admin/team-calendar', match: '/admin/team-calendar', adminOnly: true },
            { label: 'Team Contacts', icon: <Home size={18} />, path: '/admin/team-contacts', match: '/admin/team-contacts', adminOnly: true },
            { label: 'Attendance', icon: <Fingerprint size={18} />, path: '/admin/attendance', match: '/admin/attendance', adminOnly: true },
          ],
        },
        { label: 'Punch Clock', icon: <Clock size={18} />, path: '/admin/check-in', match: '/admin/check-in' },
      ],
    },
    {
      title: 'CRM',
      items: [
        { label: 'Leads', icon: <Users size={18} />, path: '/admin/leads', match: '/admin/leads' },
        { label: 'Inbox ', icon: <Inbox size={18} />, path: '/admin/inbox', match: '/admin/inbox' },
        { label: 'Deals', icon: <Handshake size={18} />, path: '/admin/deals', match: '/admin/deals' },
        { label: 'Contacts', icon: <Home size={18} />, path: '/admin/contacts', match: '/admin/contacts' },
      ],
    },
    {
      title: 'Properties',
      items: [
        {
          label: 'Add Property',
          path: '/admin/listings/new',
          match: '/admin/listings/new',
          cyan: true,
          icon: (
            <span className="relative inline-flex items-center justify-center">
              <Building2 size={18} />
              <Plus size={11} strokeWidth={3} className="absolute -bottom-1 -right-1.5" />
            </span>
          ),
        },
        {
          label: 'All Properties',
          icon: <Building2 size={18} />,
          path: '/admin/listings',
          match: '/admin/listings',
          parentLink: true,
          children: [
            { label: 'New Developments', icon: <Building2 size={18} />, path: '/admin/developments', match: '/admin/developments' },
            { label: 'Land Listings', icon: <Building2 size={18} />, path: '/admin/land-listings', match: '/admin/land-listings' },
            { label: 'JV & Capital Desk', icon: <Handshake size={18} />, path: '/admin/joint-ventures', match: '/admin/joint-ventures', noQuery: true },
          ],
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        { label: 'Activity / Audit Log', icon: <Activity size={18} />, path: '/admin/activities', match: '/admin/activities' },
        {
          label: 'Agents & Access',
          icon: <UserRound size={18} />,
          path: '/admin/agents',
          match: '/admin/agents',
          parentLink: true,
          children: [
            { label: 'Agent Dashboards', icon: <BarChart3 size={18} />, path: '/admin/agent-dashboards', match: '/admin/agent-dashboards' },
            { label: 'Approvals', icon: <CheckSquare size={18} />, path: '/admin/approvals', match: '/admin/approvals' },
          ],
        },
      ],
    },
  ];

  const isActive = (m: string, matchSearch?: string, noQuery?: boolean, excludePrefixes?: string[]) => {
    if (excludePrefixes?.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))) return false;
    const pathMatch =
      location.pathname === m || (location.pathname.startsWith(`${m}/`) && m !== '/admin/dashboard');
    if (!pathMatch) return false;
    // When a nav item is differentiated by a query fragment (e.g. tab=listings),
    // require that fragment to be present for the item to read as active.
    if (matchSearch) {
      return location.search.includes(matchSearch);
    }
    // Parent item of same-path tabbed entries (e.g. Users) is active only when
    // no tab query is present, so it doesn't overlap with its child items.
    if (noQuery) {
      return !location.search.includes('tab=');
    }
    return true;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const SidebarContent = () => (
    <>
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-center">
        <img src={logoUrl} alt="Oceans Kenya" className="w-full h-14 object-contain" />
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navGroups.map((group) => {
          const items = group.items.filter((i) => !i.superOnly || isSuperAdmin(user?.role));
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              <p className="px-3 py-1.5 text-xs font-roboto font-semibold uppercase tracking-widest text-white/40">{group.title}</p>
              {items.map((item) => {
                if (item.children && item.children.length > 0) {
                  // Hide admin-only children (e.g. the team Attendance / management views)
                  // from agent-role users. Personal items like Punch Clock stay visible.
                  const childItems = item.children.filter((child) => !child.adminOnly || isAdminRole(user?.role));
                  if (childItems.length === 0) return null;
                  return (
                    <NavSubmenu
                      key={item.path}
                      label={item.label}
                      icon={item.icon}
                      items={childItems}
                      isActive={isActive}
                      onNavigate={() => setSidebarOpen(false)}
                      path={item.parentLink ? item.path : undefined}
                      match={item.parentLink ? item.match : undefined}
                    />
                  );
                }
                const active = isActive(item.match, item.matchSearch, item.noQuery, item.excludePrefixes);
                const linkClass = item.cyan
                  ? (active
                      ? 'bg-[#012144] text-[#22d3ee] font-semibold border border-[#22d3ee]/50 px-3 py-2.5 text-base hover:text-white'
                      : 'bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30 hover:bg-[#22d3ee]/20 hover:text-white px-3 py-2.5 text-base')
                  : item.whiteActive
                  ? (active
                      ? 'bg-[#012144] text-white font-semibold px-3 py-2.5 text-base'
                      : 'text-white/80 hover:bg-white/5 hover:text-white px-3 py-2.5 text-base')
                  : item.highlight
                  ? (active
                      ? 'bg-[#00ddb4] text-[#001731] font-semibold px-3 py-1.5 text-sm hover:text-white'
                      : 'bg-[#00ddb4]/10 text-[#00ddb4] border border-[#00ddb4]/30 hover:bg-[#00ddb4]/20 hover:text-white px-3 py-1.5 text-sm')
                  : (active
                      ? 'bg-[#012144] text-[#00ddb4] font-semibold px-3 py-2.5 text-base hover:text-white'
                      : 'text-white/80 hover:bg-white/5 hover:text-white px-3 py-2.5 text-base');
                const iconClass = item.cyan
                  ? (active ? 'text-[#22d3ee] group-hover:text-white' : 'text-[#22d3ee] group-hover:text-white')
                  : item.whiteActive
                  ? (active ? 'text-white group-hover:text-white' : 'text-white/60 group-hover:text-white')
                  : item.highlight
                  ? (active ? 'text-[#001731] group-hover:text-white' : 'text-[#00ddb4] group-hover:text-white')
                  : (active ? 'text-[#00ddb4] group-hover:text-white' : 'text-white/60 group-hover:text-white');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center gap-3 rounded-md font-roboto font-medium transition-all cursor-pointer whitespace-nowrap ${linkClass}`}
                  >
                    <span className={`flex-shrink-0 ${iconClass}`}>{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.match === '/admin/messenger' && <CountBadge count={messengerUnread} label="unread messages" />}
                    {item.superOnly && <span className="text-[10px] font-roboto font-semibold uppercase bg-[#00ddb4]/20 text-[#00ddb4] px-1.5 py-0.5 rounded">Super</span>}
                    {active && <Chevron className={`flex-shrink-0 group-hover:text-white ${item.cyan ? 'text-[#22d3ee]' : item.whiteActive ? 'text-white' : item.highlight ? 'text-[#001731]' : 'text-[#00ddb4]'}`} />}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        <Link
          to="/admin/system-management"
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-roboto font-medium transition-all cursor-pointer ${location.pathname === '/admin/system-management' ? 'bg-[#012144] text-[#00ddb4] font-semibold' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}
        >
          <Settings size={18} className={location.pathname === '/admin/system-management' ? 'text-[#00ddb4]' : 'text-white/60'} />
          <span className="flex-1">System Settings</span>
          {location.pathname === '/admin/system-management' && <Chevron className="text-[#00ddb4] flex-shrink-0" />}
        </Link>
        <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-roboto font-medium text-white/80 hover:bg-white/5 transition-all cursor-pointer">
          <Home size={18} className="text-white/60" />
          View public site
        </Link>
        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-roboto font-medium text-red-300 hover:bg-red-500/10 transition-all cursor-pointer">
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </>
  );

  // Global breadcrumb label — prefer a known nav label, otherwise prettify the
  // first admin path segment.
  const flatNav: { label: string; match: string }[] = [];
  navGroups.forEach((group) => group.items.forEach((item) => {
    flatNav.push({ label: item.label, match: item.match });
    item.children?.forEach((child) => flatNav.push({ label: child.label, match: child.match }));
  }));
  const navMatch = flatNav
    .filter((n) => location.pathname === n.match || location.pathname.startsWith(`${n.match}/`))
    .sort((a, b) => b.match.length - a.match.length)[0];
  const seg = location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
  const prettySeg = seg ? seg.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()) : 'Dashboard';
  const crumbLabel = navMatch?.label || (location.pathname === '/admin/system-management' ? 'System Settings' : prettySeg);
  const isDashboardRoute = location.pathname === '/admin' || location.pathname === '/admin/dashboard';

  return (
    <div className="crm-dashboard min-h-screen flex bg-[#001731]">
      <CRMToastContainer />
      <aside className="hidden lg:flex flex-col w-64 bg-[#001731] border-r border-[#1b3a61] h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </aside>

      <div className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${sidebarOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
        <aside className={`absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-[#001731] flex flex-col shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 cursor-pointer">
            <X size={20} />
          </button>
          <SidebarContent />
        </aside>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-[#012144] border-b border-[#2a5688] px-4 md:px-6 py-3.5 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-md hover:bg-white/10 cursor-pointer text-white flex-shrink-0">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="font-roboto font-semibold text-lg md:text-xl text-white leading-tight">Admin Portal</h1>
              <p className="text-xs text-white/50 font-roboto truncate">{user?.role === 'super_admin' ? 'Super Admin' : 'Administrator'} · {user?.email}</p>
            </div>
          </div>
          <PortalHeaderPills
            messagesHref="/admin/messenger"
            messengerUnread={messengerUnread}
            notificationsCount={alertsCount}
            feed={headerFeed}
            onMarkAllRead={markAlertsSeen}
            viewAllHref="/admin/activities"
            viewAllLabel="View all activity"
            emptyText="Nothing new — you're all caught up."
          />
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <QuickSetHeaderButton />
            <Link
              to="/admin/profile"
              className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden hover:bg-white/20 transition-all cursor-pointer flex-shrink-0"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name || 'Admin'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-sm font-bold">{user?.name?.charAt(0).toUpperCase() || 'A'}</span>
              )}
            </Link>
          </div>
        </header>

        {/* Global breadcrumb — every admin page gets a consistent trail + a way back. */}
        <div className="bg-[#012144] border-b border-[#2a5688] px-4 md:px-6 py-2 flex items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 text-xs font-roboto">
            <Link to="/admin/dashboard" className="inline-flex items-center gap-1 text-white/55 hover:text-white transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-dashboard-3-line text-sm" /> Admin
            </Link>
            <i className="ri-arrow-right-s-line text-white/35" />
            <span className="text-white/90 font-semibold truncate">{crumbLabel}</span>
          </nav>
          {!isDashboardRoute && (
            <Link to="/admin/dashboard" className="inline-flex items-center gap-1.5 text-xs font-roboto font-semibold text-[#5eead4] hover:text-white transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-arrow-left-line" /> Back to Dashboard
            </Link>
          )}
        </div>

        <main className={`flex-1 p-4 md:p-6 text-[#1f2937] ${isWhiteBgPage ? 'bg-white' : 'bg-[#001731]'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}