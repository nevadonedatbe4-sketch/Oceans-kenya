import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Settings, Palette, Type, Layout, Image, Search, Globe, Monitor,
  Grid3X3, CreditCard, Play, Building2, Shield, Home, Layers, ChevronRight,
  Phone, Share2, MapPin, DollarSign, Menu, Bell, SlidersHorizontal,
  Hand, LayoutGrid, MoveHorizontal, Users, Info, ClipboardList, Building, X,
} from 'lucide-react';

const MIDDLE_ICON_MAP: Record<string, any> = {
  'Global Design System': Palette,
  'Component Settings': Settings,
  'Page Builder': Layout,
  'Navigation Settings': Globe,
  'Design System Hub': Monitor,
  'Colour Palette': Palette,
  'Typography System': Type,
  'Spacing & Sizes': MoveHorizontal,
  'Card Box System': Grid3X3,
  'Button System': Hand,
  'Card v7 (Content/Style/Adv...)': CreditCard,
  'Carousel + Dots System': Play,
  'Global Page Control': Layout,
  'Responsive Control': Monitor,
  'General': Settings,
  'Logos & Branding': Image,
  'Typography': Type,
  'Price & Currency': DollarSign,
  'Property Settings': Grid3X3,
  'Property Details': Layers,
  'Listings Pages': Building2,
  'Search & Filters': Search,
  'Required Fields': Shield,
  'Form Layout Manager': ClipboardList,
  'Property Detail Layout': Layout,
  'Homepage Controls': Layers,
  'Hero Section': Home,
  'Neighbourhoods (Homepage)': MapPin,
  'Breadcrumbs': ChevronRight,
  'Dashboard Menu': Menu,
  'Landlords Page': Users,
  'Landlords — Images & Text': Image,
  'New Developments Page': Building,
  'About Us Page': Info,
  'Contact Page': Phone,
  'Neighbourhoods Page': MapPin,
  'Contact & Company': Phone,
  'Social Media Links': Share2,
  'Maps & Location': MapPin,
  'Property Cards': Image,
  'Cards & Carousel': Play,
  'Save / Sync / Cache': Bell,
};

const MIDDLE_RAIL_GROUPS = [
  {
    label: 'DESIGN SYSTEM',
    items: [
      { label: 'Global Design System', path: '/crm/management/global-design' },
      { label: 'Component Settings', path: '/crm/management/component-settings' },
      { label: 'Page Builder', path: '/crm/management/page-builder' },
      { label: 'Navigation Settings', path: '/crm/management/dashboard-menu' },
    ],
  },
  {
    label: 'FRONTEND CONTROL',
    items: [
      { label: 'Design System Hub', path: '/crm/management/design-system-hub' },
      { label: 'Colour Palette', path: '/crm/management/colour-palette' },
      { label: 'Typography System', path: '/crm/management/typography' },
      { label: 'Spacing & Sizes', path: '/crm/management/spacing-sizes' },
      { label: 'Card Box System', path: '/crm/management/card-box' },
      { label: 'Button System', path: '/crm/management/button-system' },
      { label: 'Card v7 (Content/Style/Adv...)', path: '/crm/management/card-v7' },
      { label: 'Carousel + Dots System', path: '/crm/management/carousel' },
      { label: 'Global Page Control', path: '/crm/management/global-page-control' },
      { label: 'Responsive Control', path: '/crm/management/responsive' },
    ],
  },
  {
    label: 'SITE IDENTITY',
    items: [
      { label: 'General', path: '/crm/management/general' },
      { label: 'Logos & Branding', path: '/crm/management/branding' },
      { label: 'Typography', path: '/crm/management/typography' },
    ],
  },
  {
    label: 'LISTINGS & SEARCH',
    items: [
      { label: 'Price & Currency', path: '/crm/management/currency' },
      { label: 'Property Settings', path: '/crm/management/property' },
      { label: 'Property Details', path: '/crm/management/property-details' },
      { label: 'Listings Pages', path: '/crm/management/listings-pages' },
      { label: 'Search & Filters', path: '/crm/management/search' },
      { label: 'Required Fields', path: '/crm/management/required' },
      { label: 'Form Layout Manager', path: '/crm/management/form-layout' },
      { label: 'Property Detail Layout', path: '/crm/management/property-detail-layout' },
    ],
  },
  {
    label: 'CONTENT & PAGES',
    items: [
      { label: 'Homepage Controls', path: '/crm/management/homepage' },
      { label: 'Hero Section', path: '/crm/management/hero' },
      { label: 'Neighbourhoods (Homepage)', path: '/crm/management/neighbourhoods-homepage' },
      { label: 'Breadcrumbs', path: '/crm/management/breadcrumbs' },
      { label: 'Dashboard Menu', path: '/crm/management/dashboard-menu' },
    ],
  },
  {
    label: 'PAGE MANAGEMENT',
    items: [
      { label: 'Landlords Page', path: '/crm/management/landlords-page' },
      { label: 'Landlords — Images & Text', path: '/crm/management/landlords-images' },
      { label: 'New Developments Page', path: '/crm/management/new-developments-page' },
      { label: 'About Us Page', path: '/crm/management/about-page' },
      { label: 'Contact Page', path: '/crm/management/contact-page' },
      { label: 'Neighbourhoods Page', path: '/crm/management/neighbourhoods-page' },
    ],
  },
  {
    label: 'COMPANY INFO',
    items: [
      { label: 'Contact & Company', path: '/crm/management/contact' },
      { label: 'Social Media Links', path: '/crm/management/social' },
      { label: 'Maps & Location', path: '/crm/management/maps' },
    ],
  },
  {
    label: 'STYLING',
    items: [
      { label: 'Property Cards', path: '/crm/management/styling-cards' },
      { label: 'Property Details', path: '/crm/management/styling-details' },
      { label: 'Cards & Carousel', path: '/crm/management/cards-carousel' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Save / Sync / Cache', path: '/crm/management/cache' },
    ],
  },
];

function renderMiddleIcon(label: string) {
  const Icon = MIDDLE_ICON_MAP[label] || Settings;
  return <Icon size={15} />;
}

interface ManagementLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function ManagementLayout({ children, title, description, icon }: ManagementLayoutProps) {
  const location = useLocation();
  const [railOpen, setRailOpen] = useState(false);

  return (
    <div className="flex h-full min-h-0 relative" style={{ height: '100%' }}>
      {/* Mobile rail toggle */}
      <button
        onClick={() => setRailOpen(true)}
        className="md:hidden absolute top-3 left-3 z-30 flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-600 shadow-sm cursor-pointer whitespace-nowrap"
      >
        <Menu size={14} /> Options
      </button>

      {/* Mobile rail overlay */}
      {railOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRailOpen(false)} />
        </div>
      )}

      {/* Middle Rail — fixed drawer on mobile, static column on md+ */}
      <aside className={`bg-white border-r border-stone-100 flex flex-col flex-shrink-0 overflow-hidden z-40 transition-transform duration-300 md:transition-none w-[280px] md:w-[260px] fixed md:static top-0 left-0 h-full md:h-auto ${railOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Mobile close button */}
        <div className="md:hidden flex justify-end px-3 pt-3">
          <button onClick={() => setRailOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer">
            <X size={16} />
          </button>
        </div>
        {/* Rail Header */}
        <div className="px-4 pt-5 pb-4 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-50 flex items-center justify-center shrink-0">
              <SlidersHorizontal size={17} className="text-stone-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-prata text-stone-800 tracking-tight">Management</h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Options &amp; Controls</p>
            </div>
          </div>
        </div>

        {/* Rail Groups */}
        <nav className="flex-1 overflow-y-auto custom-rail-scroll py-2 px-3">
          {MIDDLE_RAIL_GROUPS.map((group) => (
            <div key={group.label} className="mb-5 last:mb-2">
              <div className="px-2 mb-2">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-[0.12em]">
                  {group.label}
                </span>
              </div>
              <div className="space-y-px">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={`${group.label}-${item.label}`}
                      to={item.path}
                      onClick={() => setRailOpen(false)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer relative group ${
                        isActive
                          ? 'text-stone-900 bg-stone-100'
                          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] bg-[#1B4332] rounded-r-full" />
                      )}
                      <span className={`shrink-0 transition-colors duration-150 ${isActive ? 'text-[#1B4332]' : 'text-stone-400 group-hover:text-stone-500'}`}>
                        {renderMiddleIcon(item.label)}
                      </span>
                      <span className="truncate leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Right Content Pane */}
      <div className="flex-1 overflow-y-auto custom-rail-scroll bg-stone-50">
        {/* Page Header */}
        {(title || description) && (
          <div className="px-6 pt-16 md:pt-6 pb-6">
            <div className="max-w-[960px] space-y-5">
              <div className="flex items-start gap-4 pb-6 border-b border-stone-100">
                {icon && (
                  <div className="w-10 h-10 rounded-lg bg-[#1B4332]/10 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-prata text-stone-800 tracking-tight">{title}</h2>
                  </div>
                  {description && (
                    <p className="text-base text-stone-500 mt-1 leading-relaxed">{description}</p>
                  )}
                </div>
              </div>
              <div className="px-0">
                {children}
              </div>
            </div>
          </div>
        )}
        {(!title && !description) && (
          <div className="px-6 pt-16 md:pt-6 pb-6">
            <div className="max-w-[960px]">
              {children}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-rail-scroll::-webkit-scrollbar { width: 5px; }
        .custom-rail-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-rail-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.06); border-radius: 3px; }
        .custom-rail-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.12); }
      `}</style>
    </div>
  );
}