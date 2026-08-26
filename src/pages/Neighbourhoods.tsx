import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNeighbourhoods } from '@/hooks/useNeighbourhoods';
import type { DBNeighbourhood } from '@/hooks/useNeighbourhoods';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import { supabase } from '@/lib/supabase';

// Plascon "Land + Sea" inspired earthy & coastal badge palette
const TAG_COLOR_HEX: Record<string, string> = {
  gold: '#A9842A', // muted gold — affluence
  chocolate: '#6B4423', // African-mud chocolate
  rust: '#9C4A2E', // warm rust / terracotta
  olive: '#5F6E2E', // olive green
  moss: '#2F6E5A', // frog-pond moss
  teal: '#1F7A6E', // sea teal
  lime: '#7A8A1F', // sparkling lemon-lime
  red: '#B04A3A', // brick red
  steel: '#3E6B8A', // weathered steel blue
  navy: '#34495E', // deep evening blue
  blue: '#4A7BA6', // bashful blue
};

// Semantic tag -> Land + Sea palette background colour (all pills use white text)
interface TagColorOverrides {
  green: string;
  luxury: string;
  wealthy: string;
  family: string;
  young: string;
  gated: string;
  modern: string;
  default: string;
}

const DEFAULT_TAG_COLORS: TagColorOverrides = {
  green: '#2C5E1A',
  luxury: '#E55B13',
  wealthy: '#F6A21E',
  family: '#1F7A6E',
  young: '#7A871E',
  gated: '#3E6B8A',
  modern: '#32CD30',
  default: '#6B4423',
};

function getTagColorHex(tag: string, colors: TagColorOverrides = DEFAULT_TAG_COLORS): string {
  const t = tag.toLowerCase();
  // Green / nature / views -> forest green
  if (/(green|leafy|park|garden|arboretum|plant|nature|tree|view|scenic|panoramic|hill|ridge)/.test(t)) return colors.green;
  // Luxury / exclusive / prestige / historic -> red-orange terracotta
  if (/(luxury|prestigious|premium|ultra|exclusive|private|elite|historic|heritage|established|old|colonial)/.test(t)) return colors.luxury;
  // Wealthy / investment / nightlife / social -> vibrant orange
  if (/(wealthy|upscale|investment|affluent|prime|nightlife|entertainment|bar|club|social)/.test(t)) return colors.wealthy;
  // Family / schools / diplomatic / international -> sea teal
  if (/(family|school|kid|child|nursery|education|diplomatic|international|expat|embassy|\bun\b|consulate)/.test(t)) return colors.family;
  // Young professionals / value / emerging -> olive lime
  if (/(young|professional|starter|value|emerging|affordable|budget)/.test(t)) return colors.young;
  // Gated / secure / corporate / urban / hospitals -> weathered steel blue
  if (/(gated|secure|safety|safe|compound|corporate|business|bank|executive|office|commercial|central|urban|city|downtown|cbd|metro|northern|suburban|residential|quiet|peaceful|hospital|medical|health|clinic)/.test(t)) return colors.gated;
  // Modern / new / development -> bright lime
  if (/(modern|contemporary|new|development)/.test(t)) return colors.modern;
  // Default -> chocolate
  return colors.default;
}

const BLOG_CATEGORY_SLOTS: Record<string, keyof TagColorOverrides> = {
  'Area Guides': 'wealthy',
  'Market Trends': 'gated',
  'Schools & Family': 'family',
  'Lifestyle & Dining': 'default',
};

function getBlogCategoryColorHex(category: string | null, colors: TagColorOverrides): string {
  if (category && BLOG_CATEGORY_SLOTS[category]) return colors[BLOG_CATEGORY_SLOTS[category]];
  return getTagColorHex(category || '', colors);
}

interface NeighbourhoodComparison {
  slug: string;
  name: string;
  tagline: string;
  safety: { rating: number; description: string; note?: string };
  vibe: string;
  bestFor: string[];
  pros: string[];
  cons: string[];
  priceRange: string;
  rentalRange: string;
  typicalRent1BR: string;
  walkability: { rating: number; description: string; note?: string };
  nightlife: { rating: number; description: string; note?: string };
  familyFriendliness: { rating: number; description: string; note?: string };
  greenSpace: { rating: number; description: string; note?: string };
  valueForMoney: { rating: number; description: string; note?: string };
  prestige: { rating: number; description: string; note?: string };
  accessibility: { rating: number; description: string; note?: string };
  rentalYield: { rating: number; description: string; note?: string };
  schoolAccess: { rating: number; description: string; note?: string };
  healthAccess: { rating: number; description: string; note?: string };
  verdict: string;
}

type TabKey = 'neighbourhoods' | 'guides' | 'blog' | 'compare';
type FilterKey = 'all' | 'sale' | 'rent' | 'luxury' | 'family';
type BlogCategoryKey = 'all' | 'Area Guides' | 'Market Trends' | 'Schools & Family' | 'Lifestyle & Dining';

function RatingBar({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-5 h-1.5 rounded-sm transition-colors ${
            i < rating ? 'bg-primary' : 'bg-[#1a1a1a]/10'
          }`}
        />
      ))}
    </div>
  );
}

function ComparisonCard({
  data,
  isWinner,
  winnerLabel,
}: {
  data: NeighbourhoodComparison;
  isWinner?: boolean;
  winnerLabel?: string;
}) {
  return (
    <div className={`flex-1 min-w-0 ${isWinner ? 'ring-1 ring-[#0D5959]/40' : ''}`}>
      {isWinner && winnerLabel && (
        <div className="bg-[#0D5959]/10 text-[#0D5959] text-xs font-jost font-semibold uppercase tracking-[0.1em] text-center py-2">
          {winnerLabel}
        </div>
      )}
      <div className="bg-white border-2 border-[#1a1a1a]/10 p-5 md:p-6 h-full">
        <div className="mb-4">
          <h3 className="font-prata font-semibold text-primary text-[23px] mb-0.5">{data.name}</h3>
          <p className="font-roboto text-[15px] text-[#636363] leading-relaxed">{data.tagline}</p>
        </div>

        {/* Price */}
        <div className="mb-4 pb-4 border-b-2 border-[#1a1a1a]/10">
          <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-1">Price Range</p>
          <p className="font-roboto text-sm font-semibold text-[#1a1a1a]">{data.priceRange}</p>
          <p className="font-roboto text-sm text-[#636363] mt-0.5">Rent: {data.rentalRange}</p>
          <p className="font-roboto text-sm text-[#636363]">1BR: {data.typicalRent1BR}</p>
        </div>

        {/* Dimensions */}
        <div className="space-y-3">
          {[
            { key: 'safety' as const, label: 'Safety' },
            { key: 'walkability' as const, label: 'Walkability' },
            { key: 'nightlife' as const, label: 'Nightlife' },
            { key: 'familyFriendliness' as const, label: 'Family-Friendly' },
            { key: 'greenSpace' as const, label: 'Green Space' },
            { key: 'valueForMoney' as const, label: 'Value for Money' },
            { key: 'prestige' as const, label: 'Prestige' },
            { key: 'accessibility' as const, label: 'Accessibility' },
            { key: 'rentalYield' as const, label: 'Rental Yield' },
            { key: 'schoolAccess' as const, label: 'Schools' },
            { key: 'healthAccess' as const, label: 'Healthcare' },
          ].map(({ key, label }) => {
            const dim = data[key];
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-roboto text-sm font-medium text-[#1a1a1a]">{label}</p>
                  <RatingBar rating={dim.rating} />
                </div>
                <p className="font-roboto text-sm text-[#636363] leading-relaxed">{dim.description}</p>
                {dim.note && (
                  <p className="font-roboto text-sm text-[#1a1a1a] font-medium mt-0.5">{dim.note}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Best For */}
        <div className="mt-4 pt-4 border-t-2 border-[#1a1a1a]/10">
          <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-1.5">Best For</p>
          <div className="flex flex-wrap gap-1">
            {data.bestFor.slice(0, 5).map((b) => (
              <span key={b} className="px-2 py-0.5 bg-[#F5F5F5] text-[11px] font-jost text-[#1a1a1a] uppercase tracking-[0.08em] border-2 border-[#1a1a1a]/10">
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Pros & Cons */}
        <div className="mt-4 pt-4 border-t-2 border-[#1a1a1a]/10">
          <div className="mb-3">
            <p className="font-jost text-[#088135] text-xs uppercase tracking-[0.1em] mb-1 font-semibold">Pros</p>
            <ul className="space-y-0.5">
              {data.pros.map((p) => (
                <li key={p} className="flex items-start gap-1.5">
                  <i className="ri-check-line text-[#088135] text-xs mt-0.5 shrink-0"></i>
                  <span className="font-roboto text-sm text-[#636363] leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-jost text-rose-500 text-xs uppercase tracking-[0.1em] mb-1 font-semibold">Cons</p>
            <ul className="space-y-0.5">
              {data.cons.map((c) => (
                <li key={c} className="flex items-start gap-1.5">
                  <i className="ri-close-line text-rose-400 text-xs mt-0.5 shrink-0"></i>
                  <span className="font-roboto text-sm text-[#636363] leading-relaxed">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Verdict */}
        <div className="mt-4 pt-4 border-t-2 border-[#1a1a1a]/10">
          <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-1">Verdict</p>
          <p className="font-roboto text-sm text-[#636363] leading-relaxed">{data.verdict}</p>
        </div>
      </div>
    </div>
  );
}

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${className} reveal-up ${isVisible ? 'revealed' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function Neighbourhoods() {
  const [activeTab, setActiveTab] = useState<TabKey>('neighbourhoods');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [blogCategory, setBlogCategory] = useState<BlogCategoryKey>('all');
  const [guideFilter, setGuideFilter] = useState<string[]>([]);
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<NeighbourhoodComparison[]>([]);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [tagColors, setTagColors] = useState<TagColorOverrides>(DEFAULT_TAG_COLORS);

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('key, value')
      .like('key', 'page_neighbourhoods_tag_%')
      .then(({ data }) => {
        if (data && data.length) {
          setTagColors((prev) => {
            const overrides = { ...prev };
            (data as any[]).forEach((r) => {
              const field = r.key.replace('page_neighbourhoods_tag_', '');
              if (field in overrides && r.value) (overrides as any)[field] = r.value;
            });
            return overrides;
          });
        }
      });
  }, []);

  useEffect(() => {
    supabase
      .from('neighbourhood_comparisons')
      .select('*')
      .eq('is_published', true)
      .then(({ data }) => {
        if (data) {
          const parsed = (data as any[]).map((d: any) => ({
            ...d.data,
            slug: d.slug,
            name: d.name,
            tagline: d.tagline,
          })) as NeighbourhoodComparison[];
          setComparisonData(parsed);
        }
      });
  }, []);

  const {
    neighbourhoods: hoods,
    blogPosts: supabaseBlogPosts,
    stats: supabaseStats,
    loading,
    error,
    refetch,
  } = useNeighbourhoods();

  const displayBlogPosts = useMemo(() => supabaseBlogPosts, [supabaseBlogPosts]);

  const filteredBlogPosts = useMemo(() => {
    if (blogCategory === 'all') return displayBlogPosts;
    return displayBlogPosts.filter((bp) => bp.category === blogCategory);
  }, [displayBlogPosts, blogCategory]);

  const blogCategories: BlogCategoryKey[] = ['all', 'Area Guides', 'Market Trends', 'Schools & Family', 'Lifestyle & Dining'];

  const filteredHoods = useMemo(() => {
    let result = [...hoods];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          (h.summary && h.summary.toLowerCase().includes(q)) ||
          (h.description && h.description.toLowerCase().includes(q)) ||
          (h.tags && h.tags.some((t) => t.toLowerCase().includes(q))) ||
          h.city.toLowerCase().includes(q)
      );
    }

    if (activeFilter === 'luxury') {
      result = result.filter(
        (h) =>
          h.tags &&
          h.tags.some((t) => ['luxury', 'ultra-exclusive', 'prestigious'].includes(t.toLowerCase()))
      );
    } else if (activeFilter === 'family') {
      result = result.filter(
        (h) =>
          h.tags && h.tags.some((t) => ['family', 'family-friendly', 'gated'].includes(t.toLowerCase()))
      );
    } else if (activeFilter === 'sale') {
      result = result.filter((h) => h.propertyCount > 0);
    } else if (activeFilter === 'rent') {
      result = result.filter((h) => h.propertyCount > 0);
    }

    if (guideFilter.length > 0) {
      result = result.filter((h) =>
        guideFilter.some((name) => h.name.toLowerCase() === name.toLowerCase())
      );
    }

    return result;
  }, [hoods, searchQuery, activeFilter, guideFilter]);

  const guideHoods = useMemo(() => hoods, [hoods]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Masthead */}
      <div className="mt-24 md:mt-36 lg:mt-40 bg-primary border-t-2 border-white/20 border-b-2 border-white/10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div>
            <span className="font-prata font-bold text-golden text-[31px] md:text-[33px] uppercase tracking-[0.04em]">
              THE LOCAL
            </span>
            <span className="block font-roboto text-white/60 text-xs uppercase tracking-[0.12em] mt-0.5">
              Oceans Kenya&apos;s Guide to the City
            </span>
          </div>
          <span className="font-roboto text-white/60 text-xs uppercase tracking-[0.12em] hidden sm:block">
            ISSUE — NAIROBI 2026
          </span>
        </div>
      </div>

      {/* Hero — editorial magazine block on solid dark blue */}
      <section className="bg-primary pb-20 md:pb-28">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pt-10 md:pt-14">
            <div className="lg:col-span-8">
              <p className="font-jost text-golden text-xs uppercase tracking-[0.18em] mb-4">
                Explore the City
              </p>
              <h1 className="font-prata font-bold text-white text-[47px] md:text-[61px] leading-[1.05] mb-6">
                Neighbourhoods &amp; Guides
              </h1>
              <p className="font-roboto text-white/85 text-[17px] leading-[1.7] max-w-[60ch]">
                Discover Nairobi&apos;s most desirable residential enclaves. From the diplomatic grandeur
                of Runda to the urban energy of Kilimani, each neighbourhood offers a distinct lifestyle
                and investment opportunity.
              </p>
            </div>
            <div className="lg:col-span-4 flex items-end">
              <p className="font-roboto text-white/60 text-[15px] leading-relaxed border-l-4 border-golden pl-4">
                A curated field guide to Nairobi&apos;s residential enclaves — safety, lifestyle,
                schools, and value, area by area.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <Reveal>
        <section className="bg-white border-y-2 border-[#1a1a1a]/10">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4">
              <div className="px-4 py-4 md:py-5 text-center border-r-2 border-b-2 md:border-b-0 border-[#1a1a1a]/10">
                <p className="font-prata text-primary text-[36px] md:text-[40px] leading-none">{supabaseStats.totalNeighbourhoods}</p>
                <p className="font-jost text-golden text-xs font-bold uppercase tracking-[0.14em] mt-2">Neighbourhoods</p>
              </div>
              <div className="px-4 py-4 md:py-5 text-center border-b-2 md:border-b-0 md:border-r-2 border-[#1a1a1a]/10">
                <p className="font-prata text-primary text-[36px] md:text-[40px] leading-none">{supabaseStats.totalListings}</p>
                <p className="font-jost text-golden text-xs font-bold uppercase tracking-[0.14em] mt-2">Active Listings</p>
              </div>
              <div className="px-4 py-4 md:py-5 text-center border-r-2 border-[#1a1a1a]/10">
                <p className="font-prata text-primary text-[36px] md:text-[40px] leading-none">{supabaseStats.forSale}</p>
                <p className="font-jost text-golden text-xs font-bold uppercase tracking-[0.14em] mt-2">For Sale</p>
              </div>
              <div className="px-4 py-4 md:py-5 text-center">
                <p className="font-prata text-primary text-[36px] md:text-[40px] leading-none">{supabaseStats.forRent}</p>
                <p className="font-jost text-golden text-xs font-bold uppercase tracking-[0.14em] mt-2">To Let</p>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <main className="py-10 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8 md:mb-10">
            <ol className="flex items-center gap-2 font-roboto text-[#636363] text-sm">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              </li>
              <li>
                <i className="ri-arrow-right-s-line text-[#636363]/40"></i>
              </li>
              <li className="text-[#1a1a1a] font-medium">Neighbourhoods</li>
            </ol>
          </nav>

          {/* Tabs */}
          <div className="flex items-center gap-0 border-b-2 border-[#1a1a1a]/10 mb-8 md:mb-10 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {[
              { key: 'neighbourhoods' as TabKey, label: 'Neighbourhoods', icon: 'ri-map-pin-2-line' },
              { key: 'guides' as TabKey, label: 'Area Guides', icon: 'ri-book-open-line' },
              { key: 'blog' as TabKey, label: 'Blog', icon: 'ri-article-line' },
              { key: 'compare' as TabKey, label: 'Compare', icon: 'ri-scales-line' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 md:px-5 py-3 md:py-4 font-jost text-[18px] font-semibold uppercase tracking-[0.06em] transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                  activeTab === tab.key
                    ? 'border-golden text-primary'
                    : 'border-transparent text-primary/60 hover:text-primary'
                }`}
              >
                <i className={`${tab.icon} text-lg`}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Neighbourhoods */}
          {activeTab === 'neighbourhoods' && (
            <div className="space-y-6 md:space-y-8">
              {/* Search & Filters */}
              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div className="relative flex-1 max-w-md">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#636363] text-base"></i>
                  <input
                    type="text"
                    placeholder="Looking for"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 border-[3px] border-[#1a1a1a]/30 rounded-sm text-[15px] font-roboto text-[#1a1a1a] placeholder:text-[#636363] focus:outline-none focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a]/15 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { key: 'all' as FilterKey, label: 'All Areas' },
                    { key: 'sale' as FilterKey, label: 'For Sale' },
                    { key: 'rent' as FilterKey, label: 'For Rent' },
                    { key: 'luxury' as FilterKey, label: 'Luxury' },
                    { key: 'family' as FilterKey, label: 'Family' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setActiveFilter(f.key)}
                      className={`px-4 py-2 rounded-full text-[13px] font-jost font-semibold uppercase tracking-[0.08em] transition-all cursor-pointer whitespace-nowrap border ${
                        activeFilter === f.key
                          ? 'bg-primary text-white border-primary'
                          : 'border-primary text-primary hover:bg-primary hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Decision Guide — Collapsible */}
              <div className="bg-primary border-2 border-white/10 -mx-4 md:-mx-6 lg:-mx-8">
                {!guideExpanded && (
                  <button
                    onClick={() => setGuideExpanded(true)}
                    className="w-full flex items-center justify-between px-4 md:px-6 lg:px-8 py-3.5 cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <i className="ri-compass-3-line text-golden text-base"></i>
                      <span className="font-jost text-white text-[13px] uppercase tracking-[0.12em] font-semibold">
                        Quick Decision Guide
                      </span>
                      <span className="font-roboto text-white/60 text-[13px] hidden sm:inline">
                        — Not sure where to start?
                      </span>
                    </div>
                    <i className="ri-arrow-down-s-line text-white/60 text-lg group-hover:text-white transition-colors"></i>
                  </button>
                )}
                {guideExpanded && (
                  <div className="px-4 md:px-6 lg:px-8 py-5 md:py-6">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center bg-white/10 shrink-0">
                          <i className="ri-guide-line text-golden"></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-jost text-white text-[12px] uppercase tracking-[0.15em] font-semibold">
                              Quick Decision Guide
                            </span>
                            {guideFilter.length > 0 && (
                              <button
                                onClick={() => setGuideFilter([])}
                                className="text-[12px] font-jost text-white/60 hover:text-white transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                              >
                                <i className="ri-close-line"></i>
                                Clear
                              </button>
                            )}
                          </div>
                          <p className="font-roboto text-[14px] text-white/60 mt-0.5">
                            {guideFilter.length > 0
                              ? `Showing: ${guideFilter.join(', ')}`
                              : 'Click a profile to filter neighbourhoods below'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setGuideExpanded(false)}
                        className="text-white/60 hover:text-white transition-colors cursor-pointer shrink-0"
                      >
                        <i className="ri-arrow-up-s-line text-xl"></i>
                      </button>
                    </div>
                    <div className="divide-y divide-white/10">
                      {[
                        { who: 'First-Time Visitors', pick: 'Westlands or Kilimani', icon: 'ri-plane-line', matches: ['Westlands', 'Kilimani'] },
                        { who: 'Nightlife & Social', pick: 'Westlands', icon: 'ri-moon-line', matches: ['Westlands'] },
                        { who: 'Families & Nature', pick: 'Karen or Lavington', icon: 'ri-leaf-line', matches: ['Karen', 'Lavington'] },
                        { who: 'Business & Work', pick: 'Westlands, Upper Hill, or Kilimani', icon: 'ri-briefcase-line', matches: ['Westlands', 'Kilimani'] },
                        { who: 'Diplomats & Expats', pick: 'Gigiri, Runda, or Muthaiga', icon: 'ri-global-line', matches: ['Gigiri', 'Runda', 'Muthaiga'] },
                        { who: 'Ultimate Privacy', pick: 'Rosslyn or Spring Valley', icon: 'ri-eye-off-line', matches: ['Rosslyn', 'Spring Valley'] },
                        { who: 'Budget-Conscious', pick: 'Parklands or Kileleshwa', icon: 'ri-money-dollar-circle-line', matches: ['Parklands', 'Kileleshwa'] },
                        { who: 'Best Value & Space', pick: 'Lower Kabete', icon: 'ri-home-smile-line', matches: ['Lower Kabete'] },
                        { who: 'Young Professionals', pick: 'Kilimani or Kileleshwa', icon: 'ri-user-star-line', matches: ['Kilimani', 'Kileleshwa'] },
                        { who: 'Maximum Security', pick: 'Runda or Gigiri', icon: 'ri-shield-check-line', matches: ['Runda', 'Gigiri'] },
                        { who: 'Green & Exclusive', pick: 'Riverside', icon: 'ri-plant-line', matches: ['Riverside'] },
                      ].map((item, idx) => {
                        const num = String(idx + 1).padStart(2, '0');
                        const isActive = guideFilter.length > 0 && item.matches.every((m) => guideFilter.includes(m)) && guideFilter.every((g) => item.matches.includes(g));
                        return (
                          <Reveal key={item.who} delay={idx * 60}>
                            <button
                              onClick={() => {
                                if (isActive) {
                                  setGuideFilter([]);
                                } else {
                                  setGuideFilter(item.matches);
                                  setSearchQuery('');
                                }
                              }}
                              className="w-full text-left py-4 flex items-start gap-4 group cursor-pointer"
                            >
                              <span className="font-prata text-golden text-[34px] leading-none shrink-0 w-10">{num}</span>
                              <div className="flex-1">
                                <p className={`font-prata text-lg mb-1 ${isActive ? 'text-golden' : 'text-white'}`}>{item.who}</p>
                                <div className="flex flex-wrap gap-2">
                                  {item.matches.map((m) => (
                                    <span
                                      key={m}
                                      className={`px-2 py-0.5 text-[11px] font-jost font-semibold uppercase tracking-[0.08em] ${
                                        isActive
                                          ? 'bg-golden/20 text-golden'
                                          : 'bg-white/10 text-white/70'
                                      }`}
                                    >
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </button>
                          </Reveal>
                        );
                      })}
                    </div>
                    <div className="mt-5 bg-white/5 border-l-4 border-golden p-4 flex items-start gap-3">
                      <i className="ri-information-line text-golden text-lg shrink-0"></i>
                      <p className="font-roboto text-[15px] text-white/85 leading-relaxed">
                        Safety tip: Stick to well-known areas, use Uber/Bolt (reliable), gated compounds/hotels, and avoid walking alone at night in unfamiliar spots. Most tourist zones feel secure during the day.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error State */}
              {error && !loading && (
                <div className="text-center py-12 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                  <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                    <i className="ri-error-warning-line text-white text-xl"></i>
                  </div>
                  <p className="font-prata font-semibold text-primary text-[23px] mb-1">Something went wrong</p>
                  <p className="font-roboto text-[15px] text-[#636363] mb-4">{error}</p>
                  <button
                    onClick={refetch}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-[13px] font-jost font-semibold uppercase tracking-[0.08em] hover:bg-[#002349] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-refresh-line"></i>
                    Try Again
                  </button>
                </div>
              )}

              {/* Cards Grid */}
              {!error && (
                <div>
                  <div className="flex-1 min-w-0">
                    {loading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="bg-[#F5F5F5] aspect-[4/5] animate-pulse" />
                        ))}
                      </div>
                    ) : filteredHoods.length === 0 ? (
                      <div className="text-center py-16 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                        <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                          <i className="ri-map-pin-line text-white text-xl"></i>
                        </div>
                        <p className="font-prata font-semibold text-primary text-[23px] mb-1">No Neighbourhoods Found</p>
                        <p className="font-roboto text-[15px] text-[#636363]">Try adjusting your search or filters.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredHoods.map((n, i) => (
                          <Reveal key={n.id} delay={i * 80}>
                            <Link
                              to={`/neighbourhood/${n.slug}`}
                              className="group cursor-pointer block bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] hover:shadow-[0_2px_4px_rgba(0,23,49,0.06),0_8px_24px_rgba(0,23,49,0.10),0_24px_64px_rgba(0,23,49,0.12)] transition-shadow duration-300"
                            >
                              <div className="relative aspect-[4/5] overflow-hidden">
                                <img
                                  alt={n.name}
                                  className="w-full h-full object-cover object-top transition-transform duration-1000 ease-out group-hover:scale-110"
                                  src={n.hero_image || ''}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent"></div>
                                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                                  {n.tags &&
                                    n.tags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="px-2 py-0.5 text-white text-[11px] font-jost font-semibold uppercase tracking-[0.06em]"
                                        style={{ backgroundColor: getTagColorHex(tag, tagColors) }}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                </div>
                                <div className="absolute bottom-3 left-3 right-3">
                                  <h3 className="font-prata font-semibold text-white text-[25px] leading-tight">{n.name}</h3>
                                </div>
                              </div>
                              <div className="p-4">
                                <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-2">
                                  {n.summary || n.description || ''}
                                </p>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-[#1a1a1a]/10">
                                  <span className="font-jost text-golden text-[13px] font-semibold uppercase tracking-[0.08em]">
                                    {n.propertyCount} Properties
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-[12px] font-jost font-semibold uppercase tracking-[0.08em] whitespace-nowrap transition-colors hover:bg-[#002349]">
                                    Explore
                                    <i className="ri-arrow-right-line"></i>
                                  </span>
                                </div>
                              </div>
                            </Link>
                          </Reveal>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Other Notable Areas */}
              {!loading && (
                <Reveal delay={200}>
                  <div className="mt-12 md:mt-16 bg-[#FAFAF8] border-y-2 border-[#1a1a1a]/10 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-8 md:py-10">
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-5 bg-golden"></div>
                        <span className="font-jost text-golden text-[12px] uppercase tracking-[0.15em] font-semibold">
                          Also Worth Knowing
                        </span>
                      </div>
                      <h3 className="font-prata font-bold text-primary text-[31px] md:text-[35px]">Other Notable Areas</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-0">
                      <div className="py-6 border-b-2 border-[#1a1a1a]/10">
                        <h4 className="font-prata font-semibold text-primary text-[23px] mb-2">South B &amp; South C</h4>
                        <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-3 mb-3">
                          More local, affordable, and close to Nairobi National Park — ideal for experienced residents and budget-conscious travellers who want space without the Karen price tag. Strong community feel with markets, local eateries, and easy access to the CBD.
                        </p>
                        <Link
                          to="/all-properties"
                          className="inline-flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-golden hover:text-[#8a6d1f] transition-colors"
                        >
                          Browse Properties
                          <i className="ri-arrow-right-line"></i>
                        </Link>
                      </div>
                      <div className="py-6 border-b-2 border-[#1a1a1a]/10 md:pl-8">
                        <h4 className="font-prata font-semibold text-primary text-[23px] mb-2">City Centre &amp; Upper Hill</h4>
                        <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-3 mb-3">
                          Busy, central, and all business — ideal for short stays and professionals who need to be in the thick of it. Upper Hill hosts major corporate HQs and hotels. The CBD offers unmatched convenience but can be hectic.
                        </p>
                        <Link
                          to="/all-properties"
                          className="inline-flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-golden hover:text-[#8a6d1f] transition-colors"
                        >
                          Browse Properties
                          <i className="ri-arrow-right-line"></i>
                        </Link>
                      </div>
                      <div className="py-6 border-b-2 border-[#1a1a1a]/10">
                        <h4 className="font-prata font-semibold text-primary text-[23px] mb-2">Langata</h4>
                        <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-3 mb-3">
                          Nature-focused living on a budget — bordering Nairobi National Park and close to the Giraffe Centre and Elephant Orphanage. More affordable than neighbouring Karen while sharing the same green, relaxed atmosphere. Popular with families seeking space.
                        </p>
                        <Link
                          to="/all-properties"
                          className="inline-flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-golden hover:text-[#8a6d1f] transition-colors"
                        >
                          Browse Properties
                          <i className="ri-arrow-right-line"></i>
                        </Link>
                      </div>
                      <div className="py-6 border-b-2 border-[#1a1a1a]/10 md:pl-8">
                        <h4 className="font-prata font-semibold text-primary text-[23px] mb-2">Ruaka</h4>
                        <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-3 mb-3">
                          A fast-growing satellite suburb north of the city — significantly cheaper rents than Gigiri or Runda but only 15–20 minutes from the UN and diplomatic quarter. Popular with young professionals and families priced out of the core northern suburbs.
                        </p>
                        <Link
                          to="/all-properties"
                          className="inline-flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-golden hover:text-[#8a6d1f] transition-colors"
                        >
                          Browse Properties
                          <i className="ri-arrow-right-line"></i>
                        </Link>
                      </div>
                    </div>
                    <p className="font-roboto text-[15px] text-[#636363] mt-6 pt-4 border-t-2 border-[#1a1a1a]/10 leading-relaxed">
                      These areas are not yet covered by full Area Guides but have active property listings. Our agents can provide detailed local knowledge on any of them.
                    </p>
                  </div>
                </Reveal>
              )}
            </div>
          )}

          {/* Tab: Area Guides */}
          {activeTab === 'guides' && (
            <div className="space-y-6">
              {error && !loading ? (
                <div className="text-center py-12 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                  <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                    <i className="ri-error-warning-line text-white text-xl"></i>
                  </div>
                  <p className="font-prata font-semibold text-primary text-[23px] mb-1">Something went wrong</p>
                  <p className="font-roboto text-[15px] text-[#636363] mb-4">{error}</p>
                  <button
                    onClick={refetch}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-[13px] font-jost font-semibold uppercase tracking-[0.08em] hover:bg-[#002349] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-refresh-line"></i>
                    Try Again
                  </button>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-[#F5F5F5] h-48 animate-pulse" />
                  ))}
                </div>
              ) : guideHoods.length === 0 ? (
                <div className="text-center py-16 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                  <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                    <i className="ri-book-open-line text-white text-xl"></i>
                  </div>
                  <p className="font-prata font-semibold text-primary text-[23px] mb-1">No Guides Yet</p>
                  <p className="font-roboto text-[15px] text-[#636363]">Area guides are coming soon.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {guideHoods.map((h, i) => (
                    <Reveal key={h.id} delay={i * 100}>
                      <Link
                        to={`/neighbourhood/${h.slug}`}
                        className="group flex flex-col sm:flex-row bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] hover:shadow-[0_2px_4px_rgba(0,23,49,0.06),0_8px_24px_rgba(0,23,49,0.10),0_24px_64px_rgba(0,23,49,0.12)] transition-shadow duration-300"
                      >
                        <div className="sm:w-44 md:w-52 h-40 sm:h-auto shrink-0 relative overflow-hidden bg-[#F5F5F5]">
                          {h.hero_image ? (
                            <img
                              alt={h.name}
                              className="w-full h-full object-cover object-top transition-transform duration-1000 ease-out group-hover:scale-105"
                              src={h.hero_image}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <i className="ri-image-line text-[#636363] text-2xl" />
                            </div>
                          )}
                        </div>
                        <div className="p-5 flex flex-col justify-between flex-1">
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              {h.tags &&
                                h.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 text-white text-[11px] font-jost font-semibold uppercase tracking-[0.08em]"
                                    style={{ backgroundColor: getTagColorHex(tag, tagColors) }}
                                  >
                                    {tag}
                                  </span>
                                ))}
                            </div>
                            <h3 className="font-prata font-semibold text-primary text-[23px] mb-1">{h.name} Guide</h3>
                            <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-3">
                              {h.summary || h.description || ''}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t-2 border-[#1a1a1a]/10 flex items-center justify-between">
                            <span className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em]">
                              {h.name}, {h.city}
                            </span>
                            <span className="flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-[#1a1a1a] group-hover:text-[#0D5959] transition-colors">
                              Read Guide
                              <i className="ri-arrow-right-line"></i>
                            </span>
                          </div>
                        </div>
                      </Link>
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Blog */}
          {activeTab === 'blog' && (
            <div className="space-y-6">
              {/* Blog Category Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {blogCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setBlogCategory(cat)}
                    className={`px-4 py-2 rounded-full text-[13px] font-jost font-semibold uppercase tracking-[0.08em] transition-all cursor-pointer whitespace-nowrap border ${
                      blogCategory === cat
                        ? 'bg-primary text-white border-primary'
                        : 'border-primary text-primary hover:bg-primary hover:text-white'
                    }`}
                  >
                    {cat === 'all' ? 'All Posts' : cat}
                  </button>
                ))}
              </div>
              {error && !loading ? (
                <div className="text-center py-12 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                  <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                    <i className="ri-error-warning-line text-white text-xl"></i>
                  </div>
                  <p className="font-prata font-semibold text-primary text-[23px] mb-1">Something went wrong</p>
                  <p className="font-roboto text-[15px] text-[#636363] mb-4">{error}</p>
                  <button
                    onClick={refetch}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-[13px] font-jost font-semibold uppercase tracking-[0.08em] hover:bg-[#002349] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-refresh-line"></i>
                    Try Again
                  </button>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-[#F5F5F5] h-56 animate-pulse" />
                  ))}
                </div>
              ) : filteredBlogPosts.length === 0 ? (
                <div className="text-center py-16 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                  <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                    <i className="ri-article-line text-white text-xl"></i>
                  </div>
                  <p className="font-prata font-semibold text-primary text-[23px] mb-1">No Blog Posts Yet</p>
                  <p className="font-roboto text-[15px] text-[#636363]">Check back soon for neighbourhood insights.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBlogPosts.map((post, i) => (
                    <Reveal key={post.id} delay={i * 90}>
                      <Link
                        to={`/blog/${post.slug}`}
                        className="group block bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] hover:shadow-[0_2px_4px_rgba(0,23,49,0.06),0_8px_24px_rgba(0,23,49,0.10),0_24px_64px_rgba(0,23,49,0.12)] transition-shadow duration-300"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <img
                            alt={post.title}
                            className="w-full h-full object-cover object-top transition-transform duration-1000 ease-out group-hover:scale-110"
                            src={post.featured_image || ''}
                          />
                          {post.category && (
                            <div className="absolute top-3 left-3">
                              <span
                                className="px-2 py-0.5 text-white text-[12px] font-jost font-medium uppercase tracking-[0.06em]"
                                style={{ backgroundColor: getBlogCategoryColorHex(post.category, tagColors) }}
                              >
                                {post.category}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="font-prata font-semibold text-primary text-[21px] leading-snug mb-2 line-clamp-2 group-hover:text-[#0D5959] transition-colors">
                            {post.title}
                          </h3>
                          <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-2 mb-3">
                            {post.excerpt || ''}
                          </p>
                          <div className="flex items-center gap-2 font-jost text-[#636363] text-xs uppercase tracking-[0.1em]">
                            {post.author && <span>{post.author}</span>}
                            {post.author && post.published_at && <span>&middot;</span>}
                            {post.readTime && <span>{post.readTime}</span>}
                          </div>
                        </div>
                      </Link>
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Compare */}
          {activeTab === 'compare' && (
            <div className="space-y-6 md:space-y-8">
              {/* Selector Panel */}
              <Reveal>
                <div className="bg-white border-2 border-[#1a1a1a]/10 p-6 md:p-8">
                  <div className="flex items-start gap-3 mb-6">
                    <div className="w-8 h-8 flex items-center justify-center bg-primary text-white shrink-0">
                      <i className="ri-scales-line text-white"></i>
                    </div>
                    <div>
                      <h3 className="font-prata font-semibold text-primary text-[25px] mb-1">Compare Neighbourhoods</h3>
                      <p className="font-roboto text-[15px] text-[#636363] leading-relaxed">
                        Pick two neighbourhoods to see how they stack up across safety, lifestyle, schools, value, and more.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                      <label className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] block mb-1.5">First Neighbourhood</label>
                      <div className="relative">
                        <select
                          value={compareA}
                          onChange={(e) => setCompareA(e.target.value)}
                          className="w-full appearance-none pl-3 pr-8 py-2.5 border-[3px] border-[#1a1a1a]/20 rounded-sm text-[15px] font-roboto text-[#1a1a1a] bg-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 cursor-pointer"
                        >
                          <option value="">Select a neighbourhood...</option>
                          {comparisonData.map((c) => (
                            <option key={c.slug} value={c.slug} disabled={c.slug === compareB}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-[#636363] text-base pointer-events-none"></i>
                      </div>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 bg-primary border border-primary shrink-0">
                      <span className="font-jost font-bold text-white text-sm">vs</span>
                    </div>
                    <div className="flex-1 w-full">
                      <label className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] block mb-1.5">Second Neighbourhood</label>
                      <div className="relative">
                        <select
                          value={compareB}
                          onChange={(e) => setCompareB(e.target.value)}
                          className="w-full appearance-none pl-3 pr-8 py-2.5 border-[3px] border-[#1a1a1a]/20 rounded-sm text-[15px] font-roboto text-[#1a1a1a] bg-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 cursor-pointer"
                        >
                          <option value="">Select a neighbourhood...</option>
                          {comparisonData.map((c) => (
                            <option key={c.slug} value={c.slug} disabled={c.slug === compareA}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-[#636363] text-sm pointer-events-none"></i>
                      </div>
                    </div>
                  </div>
                  {/* Quick suggestions */}
                  <div className="mt-6 pt-6 border-t-2 border-[#1a1a1a]/10">
                    <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-3">Popular Comparisons</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { a: 'karen', b: 'westlands', label: 'Karen vs Westlands' },
                        { a: 'kilimani', b: 'westlands', label: 'Kilimani vs Westlands' },
                        { a: 'karen', b: 'runda', label: 'Karen vs Runda' },
                        { a: 'lavington', b: 'kilimani', label: 'Lavington vs Kilimani' },
                        { a: 'gigiri', b: 'muthaiga', label: 'Gigiri vs Muthaiga' },
                        { a: 'kileleshwa', b: 'parklands', label: 'Kileleshwa vs Parklands' },
                        { a: 'spring-valley', b: 'lavington', label: 'Spring Valley vs Lavington' },
                        { a: 'rosslyn', b: 'runda', label: 'Rosslyn vs Runda' },
                        { a: 'lower-kabete', b: 'spring-valley', label: 'Lower Kabete vs Spring Valley' },
                      ].map((pair) => (
                        <button
                          key={pair.label}
                          onClick={() => { setCompareA(pair.a); setCompareB(pair.b); }}
                          className={`px-3 py-1.5 text-[13px] font-jost uppercase tracking-[0.08em] transition-all cursor-pointer whitespace-nowrap border ${
                            compareA === pair.a && compareB === pair.b
                              ? 'border-primary text-primary bg-primary/5'
                              : 'border-primary/30 text-primary hover:bg-primary/5'
                          }`}
                        >
                          <span className="font-semibold">{pair.label.split(' vs ')[0]}</span>
                          <span className="text-golden font-semibold mx-1">vs</span>
                          <span className="font-semibold">{pair.label.split(' vs ')[1]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Comparison Results */}
              {compareA && compareB ? (
                (() => {
                  const dataA = comparisonData.find((c) => c.slug === compareA);
                  const dataB = comparisonData.find((c) => c.slug === compareB);
                  if (!dataA || !dataB) return null;

                  // Determine winners for key dimensions
                  const dims = [
                    { key: 'safety' as const, label: 'Safety', higherIsBetter: true },
                    { key: 'familyFriendliness' as const, label: 'Family-Friendly', higherIsBetter: true },
                    { key: 'valueForMoney' as const, label: 'Value', higherIsBetter: true },
                    { key: 'accessibility' as const, label: 'Accessibility', higherIsBetter: true },
                    { key: 'greenSpace' as const, label: 'Green Space', higherIsBetter: true },
                    { key: 'walkability' as const, label: 'Walkability', higherIsBetter: true },
                    { key: 'nightlife' as const, label: 'Nightlife', higherIsBetter: true },
                    { key: 'rentalYield' as const, label: 'Rental Yield', higherIsBetter: true },
                  ];

                  const aWins = dims.filter((d) => dataA[d.key].rating > dataB[d.key].rating);
                  const bWins = dims.filter((d) => dataB[d.key].rating > dataA[d.key].rating);

                  let winnerA = false;
                  let winnerB = false;
                  if (aWins.length > bWins.length) winnerA = true;
                  if (bWins.length > aWins.length) winnerB = true;

                  return (
                    <div className="space-y-6">
                      {/* Scoreboard */}
                      <Reveal>
                        <div className="bg-white border-2 border-[#1a1a1a]/10 p-4 md:p-5">
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <div className="text-center">
                              <p className="font-prata font-semibold text-primary text-[25px]">{dataA.name}</p>
                              <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mt-1">Wins {aWins.length} of 8</p>
                            </div>
                            <div className="text-center">
                              <p className="font-jost font-bold text-[#636363] text-xs uppercase tracking-[0.1em]">HEAD-TO-HEAD</p>
                              <div className="flex items-center justify-center gap-3 mt-2">
                                {winnerA && (
                                  <span className="px-2 py-0.5 bg-[#0D5959]/10 text-[#0D5959] text-xs font-jost font-semibold uppercase tracking-[0.08em]">Winner</span>
                                )}
                                {!winnerA && !winnerB && (
                                  <span className="px-2 py-0.5 bg-[#F5F5F5] text-[#636363] text-xs font-jost font-medium uppercase tracking-[0.08em]">Tie</span>
                                )}
                                {winnerB && (
                                  <span className="px-2 py-0.5 bg-[#0D5959]/10 text-[#0D5959] text-xs font-jost font-semibold uppercase tracking-[0.08em]">Winner</span>
                                )}
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="font-prata font-semibold text-primary text-[25px]">{dataB.name}</p>
                              <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mt-1">Wins {bWins.length} of 8</p>
                            </div>
                          </div>
                        </div>
                      </Reveal>

                      {/* Top-line comparison: Safety, Price, Best For, Vibe */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                        <Reveal delay={80}>
                          <div className="bg-white border-2 border-[#1a1a1a]/10 p-4">
                            <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-2">Safety</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a] mb-1">{dataA.name}</p>
                                <RatingBar rating={dataA.safety.rating} />
                              </div>
                              <span className="text-sm font-roboto text-[#636363]">vs</span>
                              <div className="flex-1">
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a] mb-1">{dataB.name}</p>
                                <RatingBar rating={dataB.safety.rating} />
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t-2 border-[#1a1a1a]/10 space-y-1.5">
                              <p className="font-roboto text-sm text-[#636363] leading-relaxed"><span className="font-medium">{dataA.name}:</span> {dataA.safety.description}</p>
                              <p className="font-roboto text-sm text-[#636363] leading-relaxed"><span className="font-medium">{dataB.name}:</span> {dataB.safety.description}</p>
                            </div>
                          </div>
                        </Reveal>
                        <Reveal delay={160}>
                          <div className="bg-white border-2 border-[#1a1a1a]/10 p-4">
                            <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-2">Price &amp; Value</p>
                            <div className="space-y-2">
                              <div>
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a]">{dataA.name}</p>
                                <p className="font-roboto text-sm font-semibold text-[#1a1a1a]">{dataA.priceRange}</p>
                                <p className="font-roboto text-sm text-[#636363]">1BR Rent: {dataA.typicalRent1BR}</p>
                              </div>
                              <div className="border-t-2 border-[#1a1a1a]/10 pt-2">
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a]">{dataB.name}</p>
                                <p className="font-roboto text-sm font-semibold text-[#1a1a1a]">{dataB.priceRange}</p>
                                <p className="font-roboto text-sm text-[#636363]">1BR Rent: {dataB.typicalRent1BR}</p>
                              </div>
                            </div>
                          </div>
                        </Reveal>
                      </div>

                      {/* Vibe & Best For */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                        <Reveal delay={80}>
                          <div className="bg-white border-2 border-[#1a1a1a]/10 p-4">
                            <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-2">Vibe</p>
                            <div className="space-y-3">
                              <div>
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a] mb-0.5">{dataA.name}</p>
                                <p className="font-roboto text-sm text-[#636363] leading-relaxed">{dataA.vibe}</p>
                              </div>
                              <div className="border-t-2 border-[#1a1a1a]/10 pt-3">
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a] mb-0.5">{dataB.name}</p>
                                <p className="font-roboto text-sm text-[#636363] leading-relaxed">{dataB.vibe}</p>
                              </div>
                            </div>
                          </div>
                        </Reveal>
                        <Reveal delay={160}>
                          <div className="bg-white border-2 border-[#1a1a1a]/10 p-4">
                            <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-2">Best For</p>
                            <div className="space-y-3">
                              <div>
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a] mb-1">{dataA.name}</p>
                                <div className="flex flex-wrap gap-1">
                                  {dataA.bestFor.slice(0, 4).map((b) => (
                                    <span key={b} className="px-2 py-0.5 bg-[#F5F5F5] text-[11px] font-jost text-[#1a1a1a] uppercase tracking-[0.08em] border-2 border-[#1a1a1a]/10">{b}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="border-t-2 border-[#1a1a1a]/10 pt-3">
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a] mb-1">{dataB.name}</p>
                                <div className="flex flex-wrap gap-1">
                                  {dataB.bestFor.slice(0, 4).map((b) => (
                                    <span key={b} className="px-2 py-0.5 bg-[#F5F5F5] text-[11px] font-jost text-[#1a1a1a] uppercase tracking-[0.08em] border-2 border-[#1a1a1a]/10">{b}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Reveal>
                      </div>

                      {/* Full side-by-side cards */}
                      <div className="flex flex-col md:flex-row gap-5">
                        <Reveal className="flex-1" delay={80}>
                          <ComparisonCard data={dataA} isWinner={winnerA} winnerLabel={winnerA ? 'Best Overall' : undefined} />
                        </Reveal>
                        <Reveal className="flex-1" delay={160}>
                          <ComparisonCard data={dataB} isWinner={winnerB} winnerLabel={winnerB ? 'Best Overall' : undefined} />
                        </Reveal>
                      </div>

                      {/* Dimension-by-dimension comparison table */}
                      <Reveal>
                        <div className="overflow-x-auto bg-white border-2 border-[#1a1a1a]/10">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b-2 border-[#1a1a1a]/10">
                                <th className="py-3 px-4 font-jost text-xs text-[#636363] uppercase tracking-[0.1em]">Dimension</th>
                                <th className="py-3 px-4 font-prata text-sm text-primary font-medium text-center">{dataA.name}</th>
                                <th className="py-3 px-4 font-prata text-sm text-primary font-medium text-center">{dataB.name}</th>
                                <th className="py-3 px-4 font-jost text-xs text-[#636363] uppercase tracking-[0.1em] text-center">Edge</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dims.map((dim, idx) => {
                                const rA = dataA[dim.key].rating;
                                const rB = dataB[dim.key].rating;
                                const edge = rA > rB ? dataA.name : rB > rA ? dataB.name : 'Tie';
                                return (
                                  <tr key={dim.key} className={`border-b border-[#1a1a1a]/5 ${idx % 2 === 0 ? 'bg-[#F5F5F5]/50' : ''}`}>
                                    <td className="py-2.5 px-4 font-roboto text-sm font-medium text-[#1a1a1a]">{dim.label}</td>
                                    <td className="py-2.5 px-4">
                                      <div className="flex justify-center">
                                        <RatingBar rating={rA} />
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-4">
                                      <div className="flex justify-center">
                                        <RatingBar rating={rB} />
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                      <span className={`text-sm font-roboto font-medium ${
                                        edge === dataA.name ? 'text-primary' : edge === dataB.name ? 'text-primary' : 'text-[#636363]'
                                      }`}>
                                        {edge}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </Reveal>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-16 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                  <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                    <i className="ri-scales-line text-white text-xl"></i>
                  </div>
                  <p className="font-prata font-semibold text-primary text-[23px] mb-1">Select Two Neighbourhoods</p>
                  <p className="font-roboto text-[15px] text-[#636363] max-w-sm mx-auto">
                    Pick any two neighbourhoods from the dropdowns above to see a detailed side-by-side comparison across safety, lifestyle, schools, value, and more.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Area Guides & Insights Section */}
          {activeTab === 'neighbourhoods' && !loading && filteredHoods.length > 0 && (
            <div className="mt-16 md:mt-24 bg-[#F7F9F9]">
              <Reveal>
                <div className="mb-8 md:mb-10 px-4 md:px-6 lg:px-8 pt-8 md:pt-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-5 bg-[#0D5959]"></div>
                    <span className="font-jost text-[#0D5959] text-[12px] uppercase tracking-[0.15em] font-semibold">
                      Featured This Issue
                    </span>
                  </div>
                  <h2 className="font-prata font-bold text-primary text-[31px] md:text-[35px]">
                    Area Guides &amp; Insights
                  </h2>
                  <p className="font-roboto text-[15px] text-[#636363] max-w-2xl mt-2 leading-relaxed">
                    In-depth guides to help you understand each neighbourhood&apos;s unique character, property market, and lifestyle.
                  </p>
                </div>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 md:px-6 lg:px-8 pb-8 md:pb-10 -mx-4 md:-mx-6 lg:-mx-8">
                {filteredHoods.slice(0, 3).map((n, i) => (
                  <Reveal key={n.id} delay={i * 100}>
                    <Link
                      to={`/neighbourhood/${n.slug}`}
                      className="group flex gap-4 cursor-pointer"
                    >
                      <div className="w-20 h-20 shrink-0 overflow-hidden bg-[#F5F5F5]">
                        {n.hero_image ? (
                          <img
                            alt={n.name}
                            className="w-full h-full object-cover object-top"
                            src={n.hero_image}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <i className="ri-image-line text-[#636363]"></i>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-prata font-semibold text-primary text-[21px] mb-1 group-hover:text-[#0D5959] transition-colors">
                          {n.name} Guide
                        </h4>
                        <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-2">
                          {n.summary || n.description || ''}
                        </p>
                        <span className="inline-flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0D5959] mt-2 group-hover:text-[#084242] transition-colors">
                          Read more
                          <i className="ri-arrow-right-line"></i>
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <Reveal>
            <div className="mt-16 md:mt-24 bg-primary py-14 md:py-20 px-4 md:px-6 text-center -mx-4 md:-mx-6 lg:-mx-8">
              <h3 className="font-prata font-semibold text-white text-[33px] mb-4">Let Our Agents Guide You</h3>
              <p className="font-roboto text-white/80 text-[17px] max-w-xl mx-auto leading-relaxed">
                Not sure which neighbourhood fits your lifestyle and budget? Our experienced agents have deep local knowledge of every Nairobi enclave. Tell us your priorities and we will match you with the perfect area.
              </p>
            </div>
          </Reveal>
        </div>
      </main>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}