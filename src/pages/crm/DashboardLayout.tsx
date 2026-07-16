import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useSyncSettings } from '@/hooks/useSyncSettings';
import { CRMToastContainer } from './components/CRMToast';
import {
  LayoutDashboard, Building2, Users, Handshake, Mail, Menu, X, LogOut,
  ChevronRight, UserRound, Image, BarChart3, History, MapPin, FileText,
  Grid3X3, Settings, Shield, Sliders, Star, Search, Globe, Share2, DollarSign,
  Phone, Home, Bell, Calendar, Tag, Bookmark, MessageSquare, ChevronDown,
  ChevronUp, HelpCircle, ExternalLink, Plus, Layers,
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Building2, Users, Handshake, Mail,
  UserRound, Image, BarChart3, History, MapPin, FileText,
  Grid3X3, Settings, Shield, Sliders, Star, Search,
  Globe, Share2, DollarSign, Phone, Home, Bell,
  Calendar, Tag, Bookmark, MessageSquare, ChevronRight,
  ChevronDown, ChevronUp, HelpCircle, ExternalLink, Plus, Layers,
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
      { name: 'deals', label: 'Deals', icon: 'Handshake', path: '/crm/deals' },
      { name: 'leads', label: 'Leads', icon: 'Users', path: '/crm/leads' },
      { name: 'contacts', label: 'Inquiries', icon: 'MessageSquare', path: '/crm/contacts' },
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
  const navRef = useRef<HTMLElement>(null);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { syncCount } = useSyncSettings();

  const isManagementRoute = location.pathname.startsWith('/crm/management');

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

  const renderIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName] || LayoutDashboard;
    return <Icon size={16} />;
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const pageTitle = useMemo(() => {
    const item = visibleItems.find((n) =>
      location.pathname === n.path || location.pathname.startsWith(`${n.path}/`)
    );
    return item?.label || 'Admin';
  }, [location.pathname, visibleItems]);

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
          <span className="text-white font-roboto font-bold text-base leading-tight">Oceans</span>
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
            {NAV_GROUPS.map((group) => {
              const availableItems = group.items.filter((item) => isItemAvailable(item.name));
              if (availableItems.length === 0) return null;
              return (
                <div key={group.label} className="mb-5">
                  <div className="px-3 mb-1.5">
                    <span className="text-[10px] font-medium text-white/35 uppercase tracking-widest font-roboto">
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
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-roboto transition-all cursor-pointer relative ${
                          isActive
                            ? 'text-golden font-medium'
                            : 'text-white/65 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-golden rounded-r-full" />
                        )}
                        <span className={isActive ? 'text-golden' : 'text-white/50'}>
                          {renderIcon(item.icon)}
                        </span>
                        <span>{menuItem?.label || item.label}</span>
                        {isActive && <ChevronRight size={12} className="ml-auto text-golden" />}
                      </Link>
                    );
                  })}
                </div>
              );
            })}

            {/* Management Options */}
            {isItemAvailable('management') && (
              <div className="mb-5">
                <div className="px-3 mb-1.5">
                  <span className="text-[10px] font-medium text-white/35 uppercase tracking-widest font-roboto">
                    MANAGEMENT
                  </span>
                </div>
                <div className="relative">
                  <Link
                    to={MANAGEMENT_PARENT.path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-roboto transition-all cursor-pointer relative ${
                      isManagementRoute
                        ? 'text-golden font-medium'
                        : 'text-white/65 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {isManagementRoute && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-golden rounded-r-full" />
                    )}
                    <span className={isManagementRoute ? 'text-golden' : 'text-white/50'}>
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
                        <ChevronUp size={12} className={isManagementRoute ? 'text-golden' : 'text-white/40'} />
                      ) : (
                        <ChevronDown size={12} className={isManagementRoute ? 'text-golden' : 'text-white/40'} />
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
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-roboto transition-all cursor-pointer ${
                              isSubActive
                                ? 'text-golden font-medium bg-golden/10'
                                : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                            }`}
                          >
                            <span className={isSubActive ? 'text-golden' : 'text-white/40'}>
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
                className="flex items-center gap-2.5 py-2 text-[13px] font-roboto text-white/50 hover:text-white transition-all cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>View Public Site</span>
              </a>
            </div>

            {/* ACCOUNT */}
            <div className="px-3 mb-2">
              <span className="text-[10px] font-medium text-white/35 uppercase tracking-widest font-roboto">
                ACCOUNT
              </span>
            </div>
            <div className="px-3 mb-1">
              <Link
                to="/crm/profile"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-roboto transition-all cursor-pointer ${
                  location.pathname === '/crm/profile'
                    ? 'text-golden font-medium'
                    : 'text-white/65 hover:bg-white/5 hover:text-white'
                }`}
              >
                <UserRound size={16} />
                <span>My Profile</span>
              </Link>
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
              background: 'linear-gradient(to bottom, transparent 0%, rgba(3,0,46,0.85) 50%, rgba(3,0,46,1) 100%)',
            }}
          />
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-golden/20 flex items-center justify-center flex-shrink-0">
            <span className="text-golden text-xs font-semibold">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-roboto truncate">{user?.name || 'Admin'}</p>
            <p className="text-white/50 text-[11px] font-roboto truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-white/50 hover:text-white hover:bg-white/5 rounded-md text-xs font-roboto transition-all cursor-pointer"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f4f3ee] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#03002E] h-screen fixed left-0 top-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-screen w-64 bg-[#03002E] flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-md cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-roboto font-bold text-lg text-[#1a1a2e] leading-tight">
                {pageTitle}
              </h1>
              <p className="text-xs text-gray-400 font-roboto mt-0.5">{dateString}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-md cursor-pointer text-gray-500 relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-md cursor-pointer text-gray-500">
              <HelpCircle size={18} />
            </button>
            <div className="hidden sm:flex items-center gap-3 ml-2">
              <div className="w-8 h-8 rounded-full bg-[#03002E] flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className={isManagementRoute ? 'flex-1 overflow-hidden' : 'p-6'}
          style={isManagementRoute ? { height: 'calc(100vh - 65px)' } : {}}
        >
          <Outlet />
        </main>
        <CRMToastContainer />
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.35); border-radius: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(212,175,55,0.55); }
        .custom-scroll { scrollbar-width: thin; scrollbar-color: rgba(212,175,55,0.35) rgba(255,255,255,0.04); }
      `}</style>
    </div>
  );
}