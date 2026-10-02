import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Home, Building2, MapPin, Newspaper, Megaphone, ShieldCheck,
  Palette, Search, ArrowRight, Layers, Info, Phone, Briefcase,
  School, Moon, Compass, LayoutGrid, Building, Users, DollarSign,
  BookOpen, Menu as MenuIcon, Image as ImageIcon, SlidersHorizontal, Clock,
} from 'lucide-react';

interface EditorItem {
  label: string;
  description: string;
  path: string;
  icon: React.ReactNode;
}

interface EditorGroup {
  label: string;
  icon: React.ReactNode;
  items: EditorItem[];
}

/**
 * PAGE EDITORS HUB — one discoverable landing screen that points to every
 * existing public-page editor. It links out to the editors that already exist
 * under /admin/management/* and /admin/blog — it does NOT rebuild any editor.
 */
const EDITOR_GROUPS: EditorGroup[] = [
  {
    label: 'Core Pages',
    icon: <Home size={16} />,
    items: [
      { label: 'Home Page', description: 'Hero, sections and homepage content', path: '/admin/management/home-page', icon: <Home size={17} /> },
      { label: 'Home Sections', description: 'Reorder & edit homepage blocks', path: '/admin/home-sections', icon: <Layers size={17} /> },
      { label: 'About Us', description: 'Story, team and mission copy', path: '/admin/management/about-page', icon: <Info size={17} /> },
      { label: "Let's Talk (Contact)", description: 'Contact page copy and details', path: '/admin/management/contact-page', icon: <Phone size={17} /> },
      { label: 'Joint Ventures', description: 'JV landing page content', path: '/admin/management/joint-ventures-page', icon: <Briefcase size={17} /> },
      { label: 'Valuation', description: 'Hero, process, why-us, FAQ, CTA', path: '/admin/management/valuation-page', icon: <DollarSign size={17} /> },
      { label: 'Check-In & Breaks', description: 'Punch clock, break picker & location copy', path: '/admin/management/checkin-breaks', icon: <Clock size={17} /> },
    ],
  },
  {
    label: 'Property Pages',
    icon: <Building2 size={16} />,
    items: [
      { label: 'Listing Pages', description: 'Buy / rent listings page copy', path: '/admin/management/listing-pages', icon: <Building2 size={17} /> },
      { label: 'Search Filter Chips', description: 'Filter chip labels & order', path: '/admin/management/filter-chips', icon: <SlidersHorizontal size={17} /> },
      { label: 'New Developments', description: 'Developments page content', path: '/admin/management/new-developments-page', icon: <Building size={17} /> },
      { label: 'Landlords Page', description: 'Landlords page content', path: '/admin/management/landlords-page', icon: <Users size={17} /> },
      { label: 'Landlords — Images & Text', description: 'Landlords media and copy', path: '/admin/management/landlords-images', icon: <ImageIcon size={17} /> },
      { label: 'Property Detail Templates', description: 'Detail page labels & SEO content', path: '/admin/management/dynamic-templates', icon: <Search size={17} /> },
      { label: 'Property Detail Layout', description: 'Section order & visibility', path: '/admin/management/property-detail-layout', icon: <LayoutGrid size={17} /> },
    ],
  },
  {
    label: 'Neighbourhood & Area Pages',
    icon: <MapPin size={16} />,
    items: [
      { label: 'Neighbourhoods Page', description: 'Area grid styling & content', path: '/admin/management/neighbourhoods-page', icon: <MapPin size={17} /> },
      { label: 'Neighbourhoods — Page Copy', description: 'Hero, labels, guides & CTAs', path: '/admin/management/neighbourhoods-content', icon: <Info size={17} /> },
      { label: 'Neighbourhood & Guide Pages', description: 'Living Nairobi, Schools, Area Guides, Night Life & more', path: '/admin/management/explore-pages', icon: <Compass size={17} /> },
      { label: 'Directory Pages', description: 'Directory landing & category template', path: '/admin/management/directory-pages', icon: <LayoutGrid size={17} /> },
      { label: 'SEO & Dynamic Templates', description: 'Area results, SEO listing & place templates', path: '/admin/management/dynamic-templates', icon: <Search size={17} /> },
    ],
  },
  {
    label: 'Content & Blog',
    icon: <Newspaper size={16} />,
    items: [
      { label: 'Blog', description: 'Create & edit blog posts', path: '/admin/blog', icon: <BookOpen size={17} /> },
      { label: 'Homepage Controls', description: 'Homepage section visibility', path: '/admin/management/homepage', icon: <Home size={17} /> },
      { label: 'Hero Section', description: 'Hero background, buttons & overlay', path: '/admin/management/hero', icon: <ImageIcon size={17} /> },
      { label: 'Neighbourhoods (Homepage)', description: 'Homepage neighbourhood block', path: '/admin/management/neighbourhoods-homepage', icon: <MapPin size={17} /> },
      { label: 'Breadcrumbs', description: 'Breadcrumb trails & separators', path: '/admin/management/breadcrumbs', icon: <Compass size={17} /> },
      { label: 'Dashboard Menu', description: 'Admin navigation menu', path: '/admin/management/dashboard-menu', icon: <MenuIcon size={17} /> },
    ],
  },
  {
    label: 'Commercial',
    icon: <Megaphone size={16} />,
    items: [
      { label: 'Commercial Property Page', description: 'Commercial listings page copy', path: '/admin/management/commercial-property-page', icon: <Building2 size={17} /> },
      { label: 'Commercial Advertising Page', description: 'Advertising marketing page content', path: '/admin/management/commercial-advertising-page', icon: <Megaphone size={17} /> },
    ],
  },
  {
    label: 'Legal & Information',
    icon: <ShieldCheck size={16} />,
    items: [
      { label: 'Legal & Support Pages', description: 'Privacy, terms, cookies, help & more', path: '/admin/management/legal-pages', icon: <ShieldCheck size={17} /> },
      { label: 'Local & Utility Pages', description: 'Commute Time, Schools, Estate Agent & place pages', path: '/admin/management/local-pages', icon: <School size={17} /> },
      { label: 'Night Life & Places', description: 'Night life listings & place details', path: '/admin/management/explore-pages', icon: <Moon size={17} /> },
    ],
  },
  {
    label: 'Design & Layout',
    icon: <Palette size={16} />,
    items: [
      { label: 'Global Design System', description: 'Colours, spacing, cards & buttons', path: '/admin/management/global-design', icon: <Palette size={17} /> },
      { label: 'Design System Hub', description: 'Central styling controls', path: '/admin/management/design-system-hub', icon: <Palette size={17} /> },
      { label: 'Property Cards', description: 'Card styling & badges', path: '/admin/management/styling-cards', icon: <LayoutGrid size={17} /> },
      { label: 'Card Box System', description: 'Shared card box styling', path: '/admin/management/card-box', icon: <LayoutGrid size={17} /> },
    ],
  },
];

export default function PageEditorsHub() {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EDITOR_GROUPS;
    return EDITOR_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            group.label.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [query]);

  const total = EDITOR_GROUPS.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-roboto text-xl md:text-2xl font-semibold text-white">Page Editors</h2>
          <p className="text-sm text-white/60 font-roboto mt-1">
            Edit any page on the public site. {total} editors available — pick a page to open its editor.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-base" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/40 font-roboto focus:outline-none focus:border-[#00ddb4]/60"
          />
        </div>
      </div>

      {groups.length === 0 && (
        <div className="bg-white rounded-lg border border-stone-100 p-10 text-center">
          <Search size={26} className="text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500 font-roboto">No page editors match “{query}”.</p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.label}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-md flex items-center justify-center bg-[#00ddb4]/15 text-[#00ddb4]">
              {group.icon}
            </span>
            <h3 className="font-roboto text-sm font-semibold uppercase tracking-[0.12em] text-[#5eead4]">
              {group.label}
            </h3>
            <span className="text-xs text-white/40 font-roboto">{group.items.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {group.items.map((item) => (
              <Link
                key={`${group.label}-${item.label}`}
                to={item.path}
                className="group flex items-start gap-3 bg-white rounded-lg border border-stone-100 p-4 hover:border-[#1B4332]/40 hover:bg-stone-50 transition-all cursor-pointer"
              >
                <span className="w-9 h-9 rounded-lg bg-[#1B4332]/10 flex items-center justify-center text-[#1B4332] flex-shrink-0">
                  {item.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="font-roboto font-semibold text-sm text-[#1a1a2e] truncate">{item.label}</span>
                    <ArrowRight size={14} className="text-stone-300 group-hover:text-[#1B4332] transition-colors flex-shrink-0" />
                  </span>
                  <span className="block text-xs text-stone-500 font-roboto mt-0.5 leading-relaxed">{item.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}