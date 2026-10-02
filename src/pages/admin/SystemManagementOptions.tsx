import { useSearchParams } from 'react-router-dom';
import { Settings, SlidersHorizontal, Map, Sparkles, Newspaper, Wand2, LayoutGrid } from 'lucide-react';
import PageEditorsHub from '@/pages/admin/PageEditorsHub';
import SiteSettings from '@/pages/crm/SiteSettings';
import ManagementOptions from '@/pages/crm/ManagementOptions';
import NeighbourhoodsAdmin from '@/pages/crm/Neighbourhoods';
import AmenitiesAdmin from '@/pages/crm/Amenities';
import BlogAdmin from '@/pages/crm/BlogAdmin';
import TidyNamesPanel from '@/pages/crm/components/TidyNamesPanel';

const TABS = [
  { key: 'settings', label: 'Settings', icon: Settings, desc: 'Global site configuration — branding, social, SEO, currency & footer' },
  { key: 'system', label: 'System', icon: LayoutGrid, desc: 'Edit every page on the public site — one hub for all page editors' },
  { key: 'management', label: 'Management Options', icon: SlidersHorizontal, desc: 'Global controls that affect the frontend experience' },
  { key: 'neighbourhoods', label: 'Neighbourhoods', icon: Map, desc: 'Manage neighbourhoods, life guides & directory data' },
  { key: 'amenities', label: 'Amenities', icon: Sparkles, desc: 'Manage amenities, categories & reviews' },
  { key: 'blog', label: 'Blog', icon: Newspaper, desc: 'Create & manage blog posts' },
  { key: 'names', label: 'Data & Names', icon: Wand2, desc: 'Tidy shouty names & titles across the whole site at the source' },
] as const;

/**
 * MERGED ADMIN HUB — Settings, System and Management Options combined into a single page.
 * One sidebar entry ("System & Management") that hosts all three as tabs.
 */
export default function SystemManagementOptions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get('tab') || 'settings';

  const setTab = (key: string) => {
    setSearchParams({ tab: key });
  };

  const current = TABS.find((t) => t.key === active) ?? TABS[0];

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="bg-white rounded-lg border border-stone-100 p-1.5 inline-flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === current.key;
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[15px] font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active tab description */}
      <p className="text-[15px] text-white/70 font-roboto -mt-1">{current.desc}</p>

      {/* Content */}
      {current.key === 'system' ? <PageEditorsHub /> : current.key === 'names' ? <TidyNamesPanel /> : current.key === 'management' ? <ManagementOptions /> : current.key === 'neighbourhoods' ? <NeighbourhoodsAdmin /> : current.key === 'amenities' ? <AmenitiesAdmin /> : current.key === 'blog' ? <BlogAdmin /> : <SiteSettings />}
    </div>
  );
}