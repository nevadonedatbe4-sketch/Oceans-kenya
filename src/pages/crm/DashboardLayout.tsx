import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { supabase } from '@/lib/supabase';
import { useSyncSettings } from '@/hooks/useSyncSettings';
import { CRMToastContainer } from './components/CRMToast';
import NotificationsDropdown from './components/NotificationsDropdown';
import {
  LayoutDashboard, Building2, Users, Handshake, Mail, Menu, X, LogOut,
  ChevronRight, UserRound, Image, BarChart3, History, MapPin, FileText,
  Grid3X3, Settings, Shield, Sliders, Star, Search, Globe, Share2, DollarSign,
  Phone, Home, Bell, Calendar, Tag, Bookmark, MessageSquare, ChevronDown,
  ChevronUp, HelpCircle, ExternalLink, Plus, Layers, Inbox,
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Building2, Users, Handshake, Mail,
  UserRound, Image, BarChart3, History, MapPin, FileText,
  Grid3X3, Settings, Shield, Sliders, Star, Search,
  Globe, Share2, DollarSign, Phone, Home, Bell,
  Calendar, Tag, Bookmark, MessageSquare,
  ChevronDown, ChevronUp, HelpCircle, ExternalLink, Plus, Layers, Inbox,
};

interface MenuItem {
  id: string;
  name: string;
  label: string;
  icon: string;
  module: string;
  path: string;
  visible: boolean;
  sort_order: number;
  allowed_roles: string[];
}

function hasPermission(role: string, allowedRoles: string[]): boolean {
  if (allowedRoles.includes('*')) return true;
  if (allowedRoles.includes('all')) return true;
  return allowedRoles.includes(role);
}

const NAV_GROUPS = [
  {
    label: 'OVERVIEW',
    items: [
      { name: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/crm/dashboard' },
      { name: 'activities', label: 'Activities', icon: 'History', path: '/crm/activities' },
      { name: 'insights', label: 'Insights', icon: 'BarChart3', path: '/crm/insights' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { name: 'inbox', label: 'Inbox', icon: 'Mail', path: '/crm/inbox' },
      { name: 'deals', label: 'Deals', icon: 'Handshake', path: '/crm/deals' },
      { name: 'leads', label: 'Leads', icon: 'Users', path: '/crm/leads' },
      { name: 'contacts', label: 'Inquiries', icon: 'MessageSquare', path: '/crm/contacts' },
      { name: 'enquiries', label: 'Enquiries', icon: 'Inbox', path: '/crm/enquiries' },
    ],
  },
  {
    label: 'PROPERTIES',
    items: [
      { name: 'listings', label: 'Properties', icon: 'Building2', path: '/crm/listings' },
      { name: 'add-property', label: 'Add Property', icon: 'Plus', path: '/crm/listings/new' },
      { name: 'joint-ventures', label: 'JV Desk', icon: 'Handshake', path: '/crm/joint-ventures' },
    ],
  },
  {
    label: 'CONTENT',
    items: [
      { name: 'neighbourhoods', label: 'Neighborhoods', icon: 'MapPin', path: '/crm/neighbourhoods' },
      { name: 'agents', label: 'Agents', icon: 'UserRound', path: '/crm/agents' },
      { name: 'home-sections', label: 'Homepage', icon: 'Grid3X3', path: '/crm/home-sections' },
      { name: 'testimonials', label: 'Testimonials', icon: 'Star', path: '/crm/testimonials' },
      { name: 'blog', label: 'Blog / Insights', icon: 'FileText', path: '/crm/blog' },
      { name: 'media', label: 'Media Library', icon: 'Image', path: '/crm/media' },
    ],
  },
  {
    label: 'CONFIG',
    items: [
      { name: 'site-settings', label: 'Settings', icon: 'Settings', path: '/crm/site-settings' },
      { name: 'users', label: 'Users & Roles', icon: 'Shield', path: '/crm/users' },
      { name: 'nav_links', label: 'Nav Links', icon: 'Globe', path: '/crm/nav-links' },
      { name: 'contact_sections', label: 'Contact Sections', icon: 'Phone', path: '/crm/contact-sections' },
    ],
  },
];

const MANAGEMENT_PARENT = { name: 'management', label: 'Management Options', icon: 'Sliders', path: '/crm/management/general' };

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [mgmtExpanded, setMgmtExpanded] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navRef = useRef<HTMLElement>(null);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { syncCount } = useSyncSettings();
  const { agentId } = useAgentProfile();
  const isAgent = user?.role === 'agent';

  const isManagementRoute = location.pathname.startsWith('/crm/management');
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const isAgentDashboard = location.pathname === '/agent-dashboard';

  const fetchUnreadCount = useCallback(async () => {
    let q = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('is_read', false);
    if (isAgent && agentId) q = q.eq('agent_id', agentId);
    const { count } = await q;
    setUnreadCount(count ?? 0);
  }, [isAgent, agentId]);

  // Fetch unread enquiries count for inbox badge
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Persisted "preview as agent" mode for super admins. Persisting it (instead of
  // tying it only to the /agent-dashboard path) means the ENTIRE sidebar switches
  // to the agent view on every CRM page while previewing, so the change is visible.
  const [previewAgent, setPreviewAgent] = useState(
    () => sessionStorage.getItem('previewAgent') === '1'
  );

  // Turn preview ON when landing on the agent dashboard, OFF on the admin dashboard.
  useEffect(() => {
    if (!isSuperAdmin) return;
    if (location.pathname === '/agent-dashboard') {
      setPreviewAgent(true);
      sessionStorage.setItem('previewAgent', '1');
    } else if (location.pathname === '/admin-dashboard') {
      setPreviewAgent(false);
      sessionStorage.removeItem('previewAgent');
    }
  }, [location.pathname, isSuperAdmin]);

  const isPreviewingAgent = isSuperAdmin && previewAgent;
  // Effective admin flag drives the whole sidebar: while previewing as agent, a
  // super admin is treated exactly like an agent (no CONTENT/CONFIG/MANAGEMENT).
  const effectiveIsAdmin = isAdmin && !isPreviewingAgent;
  const dashboardPath = effectiveIsAdmin ? '/admin-dashboard' : '/agent-dashboard';
  const isDashboardPage = location.pathname === '/admin-dashboard' || location.pathname === '/agent-dashboard' || location.pathname === '/crm/dashboard';

  useEffect(() => {
    if (isManagementRoute) setMgmtExpanded(true);
  }, [isManagementRoute]);

  const checkScrollBottom = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const threshold = 20;
    setScrolledToBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    checkScrollBottom();
    el.addEventListener('scroll', checkScrollBottom, { passive: true });
    return () => el.removeEventListener('scroll', checkScrollBottom);
  }, [checkScrollBottom, menuLoading]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchMenu = async () => {
      setMenuLoading(true);
      const { data, error } = await supabase
        .from('menu_settings')
        .select('*')
        .eq('visible', true)
        .order('sort_order', { ascending: true });
      if (!error && data) {
        setMenuItems(data);
      } else {
        setMenuItems([]);
      }
      setMenuLoading(false);
    };
    fetchMenu();
  }, [syncCount]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/crm/login');
  };

  const visibleItems = menuItems.filter((item) =>
    hasPermission(user?.role || 'admin', item.allowed_roles)
  );

  const mgmtSubItems = useMemo(() => {
    return visibleItems
      .filter((item) => item.module === 'management' && item.path.startsWith('/crm/management/'))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [visibleItems]);

  const isItemAvailable = (name: string) => visibleItems.some((item) => item.name === name);
  const getMenuItem = (name: string) => visibleItems.find((item) => item.name === name);

  const NavGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.name === 'dashboard') {
          return { ...item, path: dashboardPath };
        }
        if (item.name === 'listings') {
          return { ...item, label: effectiveIsAdmin ? 'All Properties' : 'My Listings' };
        }
        return item;
      }),
    }));
  }, [dashboardPath, effectiveIsAdmin]);

  const renderIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName] || LayoutDashboard;
    return <Icon size={18} />;
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const pageTitle = useMemo(() => {
    if (isDashboardPage) {
      if (isPreviewingAgent) return 'Agent Dashboard (Preview)';
      return isAdmin ? 'Admin Dashboard' : 'Agent Dashboard';
    }
    const item = visibleItems.find((n) =>
      location.pathname === n.path || location.pathname.startsWith(`${n.path}/`)
    );
    return item?.label || (isAdmin ? 'Admin' : 'Agent');
  }, [location.pathname, visibleItems, isDashboardPage, isAdmin, isPreviewingAgent]);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-white/10 flex-shrink-0">
        <Link to="/" className="flex items-center gap-2.5 cursor-pointer">
          <img
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/b5c367b8-0348-44ab-b81a-83abfed5503c_favicaon-1-1024x887.png?v=5d2f68fc83a460dece14c00261f8d058"
            alt="Oceans"
            className="w-7 h-7 object-contain"
          />
          <span className="text-white font-spaceGrotesk font-bold text-base leading-tight tracking-tight">Oceans</span>
        </Link>
      </div>

      {/* Scrollable Nav */}
      <nav ref={navRef} className="flex-1 overflow-y-auto custom-scroll py-4 px-2.5 relative">
        {menuLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Groups */}
            {NavGroups.map((group) => {
              // Hide CONFIG section entirely for non-admin users (and while a super admin previews as agent)
              if (group.label === 'CONFIG' && !effectiveIsAdmin) return null;
              // Hide CONTENT section entirely for non-admin users (site content management is admin-only)
              if (group.label === 'CONTENT' && !effectiveIsAdmin) return null;
              const availableItems = group.items.filter((item) => isItemAvailable(item.name));
              if (availableItems.length === 0) return null;
              return (
                <div key={group.label} className="mb-5">
                  <div className="px-3 mb-1.5">
                    <span className="text-xs font-medium text-white/35 uppercase tracking-widest">
                      {group.label}
                    </span>
                  </div>
                  {availableItems.map((item) => {
                    const menuItem = getMenuItem(item.name);
                    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all cursor-pointer relative ${
                          isActive
                            ? 'text-golden font-semibold'
                            : 'text-white/85 font-medium hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-golden rounded-r-full" />
                        )}
                        <span className={isActive ? 'text-golden' : 'text-white/70'}>
                          {renderIcon(item.icon)}
                        </span>
                        <span>{(item.name === 'listings' ? item.label : menuItem?.label) || item.label}</span>
                        {isActive && <ChevronRight size={14} className="ml-auto text-golden" />}
                      </Link>
                    );
                  })}
                  {group.label === 'PROPERTIES' && (
                    <Link
                      to="/crm/listings/new"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all cursor-pointer relative mt-1 bg-[#0d5959]/15 text-[#5eead4] font-semibold hover:bg-[#0d5959]/25"
                    >
                      <span className="text-[#5eead4]">
                        <Plus size={18} />
                      </span>
                      <span>Add Property</span>
                      <ChevronRight size={14} className="ml-auto text-[#5eead4]" />
                    </Link>
                  )}
                </div>
              );
            })}

            {/* Management Options - admin only */}
            {effectiveIsAdmin && isItemAvailable('management') && (
              <div className="mb-5">
                <div className="px-3 mb-1.5">
                  <span className="text-xs font-medium text-white/35 uppercase tracking-widest">
                    MANAGEMENT
                  </span>
                </div>
                <div className="relative">
                  <Link
                    to={MANAGEMENT_PARENT.path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all cursor-pointer relative ${
                      isManagementRoute
                        ? 'text-golden font-semibold'
                        : 'text-white/85 font-medium hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {isManagementRoute && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-golden rounded-r-full" />
                    )}
                    <span className={isManagementRoute ? 'text-golden' : 'text-white/70'}>
                      {renderIcon(MANAGEMENT_PARENT.icon)}
                    </span>
                    <span className="flex-1">{MANAGEMENT_PARENT.label}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMgmtExpanded(!mgmtExpanded);
                      }}
                      className="p-0.5 rounded hover:bg-white/10 cursor-pointer"
                    >
                      {mgmtExpanded ? (
                        <ChevronUp size={14} className={isManagementRoute ? 'text-golden' : 'text-white/60'} />
                      ) : (
                        <ChevronDown size={14} className={isManagementRoute ? 'text-golden' : 'text-white/60'} />
                      )}
                    </button>
                  </Link>

                  {/* Management Sub-items */}
                  {mgmtExpanded && mgmtSubItems.length > 0 && (
                    <div className="ml-4 mt-0.5 space-y-0.5">
                      {mgmtSubItems.map((item) => {
                        const isSubActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all cursor-pointer ${
                              isSubActive
                                ? 'text-golden font-semibold bg-golden/10'
                                : 'text-white/70 font-medium hover:bg-white/5 hover:text-white/90'
                            }`}
                          >
                            <span className={isSubActive ? 'text-golden' : 'text-white/60'}>
                              {renderIcon(item.icon)}
                            </span>
                            <span>{item.label}</span>
                            {isSubActive && <ChevronRight size={10} className="ml-auto text-golden" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* View Public Site */}
            <div className="mb-5 px-3">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 py-2 text-sm text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>View Public Site</span>
              </a>
            </div>
          </>
        )}

        {/* Bottom scroll fade indicator */}
        {!menuLoading && (
          <div
            className={`absolute bottom-0 left-0 right-0 h-16 pointer-events-none transition-opacity duration-300 ${
              scrolledToBottom ? 'opacity-0' : 'opacity-100'
            }`}
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, rgba(0,23,49,0.85) 50%, rgba(0,23,49,1) 100%)',
            }}
          />
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-golden/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name || 'User'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-golden text-xs font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white text-sm font-semibold truncate">{user?.name || 'Admin'}</p>
              <span
                className={`inline-flex items-center px-1.5 py-px rounded text-xs font-medium leading-snug flex-shrink-0 ${
                  isPreviewingAgent
                    ? 'bg-[#f58300]/15 text-[#f58300]'
                    : isAdmin
                      ? 'bg-golden/15 text-golden'
                      : 'bg-white/10 text-white/60'
                }`}
              >
                {isPreviewingAgent ? 'Previewing' : user?.role === 'super_admin' ? 'Super Admin' : isAdmin ? 'Admin' : 'Agent'}
              </span>
            </div>
            <p className="text-white/70 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <Link
          to="/crm/profile"
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all cursor-pointer mb-1 ${
            location.pathname === '/crm/profile'
              ? 'text-golden font-semibold bg-golden/10'
              : 'text-white/70 font-medium hover:text-white hover:bg-white/5'
          }`}
        >
          <UserRound size={16} />
          My Profile
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-white/70 font-medium hover:text-white hover:bg-white/5 rounded-md text-sm transition-all cursor-pointer"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#001731] max-w-full overflow-x-hidden crm-dashboard">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#001731] h-screen fixed left-0 top-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar — animated slide-in drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${sidebarOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}
      >
        <div
          className="absolute inset-0 bg-black/60 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-screen w-[280px] max-w-[85vw] bg-[#001731] flex flex-col shadow-2xl transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <SidebarContent />
        </aside>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col max-w-full overflow-x-hidden">
        {/* Top Bar */}
        <header className="border-b px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 bg-[#012144] border-[#1c3a5e]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md cursor-pointer hover:bg-white/5 text-[#9ca3af]"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-spaceGrotesk font-semibold text-lg md:text-[22px] leading-tight text-white">
                {pageTitle}
              </h1>
              <p className="text-sm mt-0.5 text-[#6b7280] ">{dateString}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <Link
                to={isPreviewingAgent ? '/admin-dashboard' : '/agent-dashboard'}
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all whitespace-nowrap cursor-pointer ${
                  isPreviewingAgent
                    ? 'bg-[#f58300]/8 text-[#f58300] border-[#f58300]/20 hover:bg-[#f58300]/15'
                    : 'bg-[#0d5959]/8 text-[#0d5959] border-[#0d5959]/20 hover:bg-[#0d5959]/15'
                }`}
              >
                <i className={`${isPreviewingAgent ? 'ri-admin-line' : 'ri-eye-line'} text-base`} />
                {isPreviewingAgent ? 'Back to Admin' : 'Preview as Agent'}
              </Link>
            )}
            <NotificationsDropdown />
            <button
              onClick={() => navigate('/crm/enquiries')}
              className="p-2 rounded-md cursor-pointer relative hover:bg-white/5 text-gray-400 font-semibold"
              title="Enquiries"
            >
              <Inbox size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#dc2626] text-white text-[10px] font-bold rounded-full px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-3 ml-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className={isManagementRoute ? 'crm-content flex-1 overflow-hidden text-base bg-[#001731]' : 'crm-content p-4 md:p-6 text-base bg-[#001731]'}
          style={isManagementRoute ? { height: 'calc(100vh - 65px)' } : {}}
        >
          <Outlet />
        </main>
        <CRMToastContainer />
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.35); border-radius: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(201,168,76,0.55); }
        .custom-scroll { scrollbar-width: thin; scrollbar-color: rgba(201,168,76,0.35) rgba(255,255,255,0.04); }
      `}</style>
    </div>
  );
}