import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { broadcastSync } from '@/lib/syncEngine';
import { useSyncSettings } from '@/hooks/useSyncSettings';
import {
  LayoutDashboard,
  Building2,
  Users,
  Handshake,
  Mail,
  Menu,
  X,
  LogOut,
  ChevronRight,
  UserRound,
  Image,
  BarChart3,
  History,
  MapPin,
  FileText,
  Grid3X3,
  Settings,
  Shield,
  Sliders,
  Star,
  Search,
  Globe,
  Share2,
  DollarSign,
  Phone,
  Home,
  Bell,
  Calendar,
  Tag,
  Bookmark,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CRMToastContainer } from './components/CRMToast';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Building2, Users, Handshake, Mail,
  UserRound, Image, BarChart3, History, MapPin, FileText,
  Grid3X3, Settings, Shield, Sliders, Star, Search,
  Globe, Share2, DollarSign, Phone, Home, Bell,
  Calendar, Tag, Bookmark, MessageSquare, ChevronRight,
  ChevronDown, ChevronUp,
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

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { syncCount } = useSyncSettings();

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
        // Fallback to hardcoded if DB fails
        setMenuItems([]);
      }
      setMenuLoading(false);
    };
    fetchMenu();
  }, [syncCount]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/crm/login');
  };

  const navItems = menuItems.filter((item) =>
    hasPermission(user?.role || 'admin', item.allowed_roles)
  );

  const renderIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName] || LayoutDashboard;
    return <Icon size={18} />;
  };

  return (
    <div className="min-h-screen bg-[#f4f3ee] flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#03002E] min-h-screen fixed left-0 top-0 z-40">
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <img
              src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/b5c367b8-0348-44ab-b81a-83abfed5503c_favicaon-1-1024x887.png?v=5d2f68fc83a460dece14c00261f8d058"
              alt="Oceans"
              className="w-8 h-8 object-contain"
            />
            <span className="text-white font-prata text-lg">Oceans estate agents Nairobi</span>
          </Link>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            navItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-roboto transition-all cursor-pointer ${
                    isActive
                      ? 'bg-golden/20 text-golden'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {renderIcon(item.icon)}
                  {item.label}
                  {isActive && <ChevronRight size={14} className="ml-auto" />}
                </Link>
              );
            })
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-golden/20 flex items-center justify-center">
              <span className="text-golden text-sm font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-roboto truncate">{user?.name || 'Admin'}</p>
              <p className="text-white/50 text-xs font-roboto truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-white/40 font-roboto uppercase">{user?.role}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-md text-sm font-roboto transition-all cursor-pointer"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#03002E] flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 cursor-pointer">
                <img
                  src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/b5c367b8-0348-44ab-b81a-83abfed5503c_favicaon-1-1024x887.png?v=5d2f68fc83a460dece14c00261f8d058"
                  alt="Oceans"
                  className="w-8 h-8 object-contain"
                />
                <span className="text-white font-prata text-lg">Oceans estate agents Nairobi</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-roboto transition-all cursor-pointer ${
                      isActive
                        ? 'bg-golden/20 text-golden'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {renderIcon(item.icon)}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-md text-sm font-roboto transition-all cursor-pointer"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 min-h-screen">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-md cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-prata text-xl text-[#1a1a2e]">
              {navItems.find((n) => location.pathname === n.path || location.pathname.startsWith(`${n.path}/`))?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <span className="text-sm text-gray-500 font-roboto">{user?.email}</span>
            <div className="w-8 h-8 rounded-full bg-[#03002E] flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
        <CRMToastContainer />
      </div>
    </div>
  );
}