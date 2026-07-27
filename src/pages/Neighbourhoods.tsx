import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNeighbourhoods } from '@/hooks/useNeighbourhoods';
import type { DBNeighbourhood } from '@/hooks/useNeighbourhoods';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import { supabase } from '@/lib/supabase';

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
          className={`w-5 h-1.5 rounded-full transition-colors ${
            i < rating ? 'bg-primary' : 'bg-stone-200'
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
    <div className={`flex-1 min-w-0 ${isWinner ? 'ring-2 ring-primary/30 rounded-lg' : ''}`}>
      {isWinner && winnerLabel && (
        <div className="bg-primary/10 text-primary text-sm font-roboto font-semibold uppercase tracking-wider text-center py-1.5 rounded-t-lg">
          {winnerLabel}
        </div>
      )}
      <div className="bg-white border-2 border-stone-200 rounded-lg p-4 md:p-5 h-full">
        <div className="mb-4">
          <h3 className="text-lg font-roboto font-medium text-primary mb-0.5">{data.name}</h3>
          <p className="font-roboto text-stone-400 text-base leading-relaxed">{data.tagline}</p>
        </div>

        {/* Price */}
        <div className="mb-4 pb-4 border-b border-stone-100">
          <p className="font-roboto text-stone-400 text-sm uppercase tracking-wider mb-1">Price Range</p>
          <p className="font-roboto text-sm font-semibold text-primary">{data.priceRange}</p>
          <p className="font-roboto text-sm text-stone-500 mt-0.5">Rent: {data.rentalRange}</p>
          <p className="font-roboto text-sm text-stone-400">1BR: {data.typicalRent1BR}</p>
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
                  <p className="font-roboto text-sm font-medium text-stone-600">{label}</p>
                  <RatingBar rating={dim.rating} />
                </div>
                <p className="font-roboto text-sm text-stone-400 leading-relaxed">{dim.description}</p>
                {dim.note && (
                  <p className="font-roboto text-sm text-primary/80 font-medium mt-0.5">{dim.note}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Best For */}
        <div className="mt-4 pt-4 border-t border-stone-100">
          <p className="font-roboto text-stone-400 text-sm uppercase tracking-wider mb-1.5">Best For</p>
          <div className="flex flex-wrap gap-1">
            {data.bestFor.slice(0, 5).map((b) => (
              <span key={b} className="px-2 py-0.5 bg-stone-50 text-sm font-roboto text-stone-500 rounded-full border-2 border-stone-200">
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Pros & Cons */}
        <div className="mt-4 pt-4 border-t border-stone-100">
          <div className="mb-3">
            <p className="font-roboto text-emerald-600 text-sm uppercase tracking-wider mb-1 font-medium">Pros</p>
            <ul className="space-y-0.5">
              {data.pros.map((p) => (
                <li key={p} className="flex items-start gap-1.5">
                  <i className="ri-check-line text-emerald-500 text-xs mt-0.5 shrink-0"></i>
                  <span className="font-roboto text-sm text-stone-500 leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-roboto text-rose-500 text-sm uppercase tracking-wider mb-1 font-medium">Cons</p>
            <ul className="space-y-0.5">
              {data.cons.map((c) => (
                <li key={c} className="flex items-start gap-1.5">
                  <i className="ri-close-line text-rose-400 text-xs mt-0.5 shrink-0"></i>
                  <span className="font-roboto text-sm text-stone-500 leading-relaxed">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Verdict */}
        <div className="mt-4 pt-4 border-t border-stone-100">
          <p className="font-roboto text-stone-400 text-sm uppercase tracking-wider mb-1">Verdict</p>
          <p className="font-roboto text-sm text-stone-500 leading-relaxed">{data.verdict}</p>
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

      {/* Hero */}
      <section className="relative pt-36 md:pt-44 pb-20 md:pb-28">
        <div className="absolute inset-0">
          <img
            alt="Nairobi skyline"
            className="w-full h-full object-cover object-top"
            src="https://readdy.ai/api/search-image?query=Aerial%20panoramic%20view%20of%20Nairobi%20Kenya%20skyline%20at%20golden%20hour%20with%20modern%20high-rise%20buildings%20green%20urban%20canopy%20and%20Ngong%20Hills%20in%20the%20distance%20warm%20sunset%20lighting%20professional%20cityscape%20photography&width=1920&height=600&seq=177800101&orientation=landscape"
          />
          <div className="absolute inset-0 bg-primary/80"></div>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 text-center">
          <p className="text-golden text-sm md:text-base font-roboto font-semibold uppercase tracking-[0.35em] mb-3">
            Explore the City
          </p>
          <h1 className="font-roboto font-bold text-4xl md:text-6xl text-white mb-4 leading-tight">
            Neighbourhoods &amp; Guides
          </h1>
          <p className="font-roboto text-white/80 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Discover Nairobi&apos;s most desirable residential enclaves. From the diplomatic grandeur
            of Runda to the urban energy of Kilimani, each neighbourhood offers a distinct lifestyle
            and investment opportunity.
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <Reveal>
        <section className="border-b border-stone-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="text-center border-r border-stone-200/70 even:border-r-0 md:even:border-r md:last:border-r-0">
                <p className="font-roboto font-bold text-2xl md:text-3xl text-foreground-950">{supabaseStats.totalNeighbourhoods}</p>
                <p className="font-roboto text-foreground-950 text-sm md:text-sm uppercase tracking-wider">Neighbourhoods</p>
              </div>
              <div className="text-center border-r border-stone-200/70 even:border-r-0 md:even:border-r md:last:border-r-0">
                <p className="font-roboto font-bold text-2xl md:text-3xl text-foreground-950">{supabaseStats.totalListings}</p>
                <p className="font-roboto text-foreground-950 text-sm md:text-sm uppercase tracking-wider">Active Listings</p>
              </div>
              <div className="text-center border-r border-stone-200/70 even:border-r-0 md:even:border-r md:last:border-r-0">
                <p className="font-roboto font-bold text-2xl md:text-3xl text-foreground-950">{supabaseStats.forSale}</p>
                <p className="font-roboto text-foreground-950 text-sm md:text-sm uppercase tracking-wider">For Sale</p>
              </div>
              <div className="text-center border-r border-stone-200/70 even:border-r-0 md:even:border-r md:last:border-r-0">
                <p className="font-roboto font-bold text-2xl md:text-3xl text-foreground-950">{supabaseStats.forRent}</p>
                <p className="font-roboto text-foreground-950 text-sm md:text-sm uppercase tracking-wider">To Let</p>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <main className="py-10 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6 md:mb-8">
            <ol className="flex items-center gap-2 text-sm font-roboto text-stone-400">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              </li>
              <li>
                <i className="ri-arrow-right-s-line text-stone-300"></i>
              </li>
              <li className="text-primary font-medium">Neighbourhoods</li>
            </ol>
          </nav>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-stone-100 mb-6 md:mb-8 overflow-x-auto">
            {[
              { key: 'neighbourhoods' as TabKey, label: 'Neighbourhoods', icon: 'ri-map-pin-2-line' },
              { key: 'guides' as TabKey, label: 'Area Guides', icon: 'ri-book-open-line' },
              { key: 'blog' as TabKey, label: 'Blog', icon: 'ri-article-line' },
              { key: 'compare' as TabKey, label: 'Compare', icon: 'ri-scales-line' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm md:text-base font-roboto transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Neighbourhoods */}
          {activeTab === 'neighbourhoods' && (
            <div className="space-y-6 md:space-y-8">
              {/* Search & Filters */}
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="relative flex-1 max-w-md">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-base"></i>
                  <input
                    type="text"
                    placeholder="Search neighbourhoods..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-lg text-base font-roboto focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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
                      className={`px-3 py-1.5 rounded-full text-sm font-roboto font-medium transition-all cursor-pointer whitespace-nowrap ${
                        activeFilter === f.key
                          ? 'bg-primary text-white'
                          : 'bg-stone-50 text-stone-500 hover:bg-stone-100 border border-stone-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Decision Guide */}
              <Reveal>
                <div className="bg-stone-50 border-2 border-stone-200 rounded-lg p-5 md:p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full shrink-0">
                      <i className="ri-guide-line text-primary"></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-roboto font-medium text-primary mb-1">Quick Decision Guide</h3>
                        {guideFilter.length > 0 && (
                          <button
                            onClick={() => setGuideFilter([])}
                            className="text-sm font-roboto text-stone-500 hover:text-primary transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                          >
                            <i className="ri-close-line"></i>
                            Clear Filter
                          </button>
                        )}
                      </div>
                      <p className="font-roboto text-stone-500 text-sm">
                        {guideFilter.length > 0
                          ? `Showing: ${guideFilter.join(', ')}`
                          : 'Not sure where to start? Click a card to filter below.'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                            className={`text-left p-3 rounded-md border transition-all cursor-pointer w-full h-full ${
                              isActive
                                ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                                : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <i className={`${item.icon} ${isActive ? 'text-primary' : 'text-primary/70'} text-sm`}></i>
                              <p className="font-roboto text-stone-400 text-sm uppercase tracking-wider">{item.who}</p>
                            </div>
                            <p className={`font-roboto text-sm font-semibold ${isActive ? 'text-primary' : 'text-primary/80'}`}>{item.pick}</p>
                          </button>
                        </Reveal>
                      );
                    })}
                  </div>
                  <p className="font-roboto text-stone-400 text-sm mt-3">
                    <i className="ri-information-line text-stone-400 mr-1"></i>
                    Safety tip: Stick to well-known areas, use Uber/Bolt (reliable), gated compounds/hotels, and avoid walking alone at night in unfamiliar spots. Most tourist zones feel secure during the day.
                  </p>
                </div>
              </Reveal>

              {/* Error State */}
              {error && !loading && (
                <div className="text-center py-12 bg-red-50 rounded-lg border border-red-100">
                  <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-full mx-auto mb-3">
                    <i className="ri-error-warning-line text-red-400 text-xl"></i>
                  </div>
                  <p className="font-roboto font-bold text-lg text-red-700 mb-1">Something went wrong</p>
                  <p className="font-roboto text-red-500 text-sm mb-4">{error}</p>
                  <button
                    onClick={refetch}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-roboto font-medium rounded-lg hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-refresh-line"></i>
                    Try Again
                  </button>
                </div>
              )}

              {/* Cards Grid */}
              {!error && (
                <div className="flex flex-col lg:flex-row gap-5 lg:gap-6">
                  <div className="flex-1 min-w-0">
                    {loading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="bg-stone-50 rounded-lg aspect-[4/3] animate-pulse" />
                        ))}
                      </div>
                    ) : filteredHoods.length === 0 ? (
                      <div className="text-center py-16 bg-stone-50 rounded-lg border-2 border-stone-200">
                        <div className="w-12 h-12 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-3">
                          <i className="ri-map-pin-line text-stone-400 text-xl"></i>
                        </div>
                        <p className="font-roboto font-bold text-lg text-primary mb-1">No Neighbourhoods Found</p>
                        <p className="font-roboto text-stone-400 text-sm">Try adjusting your search or filters.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {filteredHoods.map((n, i) => (
                          <Reveal key={n.id} delay={i * 80}>
                            <Link
                              to={`/neighbourhood/${n.slug}`}
                              className="group cursor-pointer block bg-white rounded-lg overflow-hidden border-2 border-stone-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-stone-200/60 transition-all duration-500"
                            >
                              <div className="relative aspect-[16/10] overflow-hidden">
                                <img
                                  alt={n.name}
                                  className="w-full h-full object-cover object-top transition-transform duration-1000 ease-out group-hover:scale-110"
                                  src={n.hero_image || ''}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                  {n.tags &&
                                    n.tags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-sm font-roboto font-medium text-stone-600 rounded-full"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                </div>
                                <div className="absolute bottom-3 left-3 right-3">
                                  <p className="text-white/80 text-sm font-roboto font-medium tracking-wide">
                                    {n.propertyCount} Properties
                                  </p>
                                  <h3 className="text-xl font-roboto font-medium text-white leading-tight drop-shadow-sm mt-0.5">
                                    {n.name}
                                  </h3>
                                </div>
                              </div>
                              <div className="p-4">
                                <p className="font-roboto text-stone-500 text-base leading-relaxed line-clamp-2">
                                  {n.summary || n.description || ''}
                                </p>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                                  <span className="font-roboto text-sm text-stone-400 uppercase tracking-wider">
                                    {n.city}, {n.country}
                                  </span>
                                  <span className="flex items-center gap-1 text-sm font-roboto font-medium text-primary group-hover:text-primary/80 transition-colors">
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

                  {/* Other Notable Areas Sidebar */}
                  {!loading && (
                    <Reveal delay={200}>
                      <aside className="w-full lg:w-72 shrink-0">
                        <div className="bg-stone-50 border-2 border-stone-200 rounded-lg p-5 sticky top-28">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 flex items-center justify-center bg-accent-100 rounded-full shrink-0">
                              <i className="ri-compass-3-line text-accent-600 text-sm"></i>
                            </div>
                            <h3 className="font-roboto font-bold text-base text-primary">Other Notable Areas</h3>
                          </div>
                          <p className="font-roboto text-stone-400 text-base leading-relaxed mb-4">
                            Beyond the main areas, Nairobi has several other neighbourhoods worth knowing — each with its own character and value proposition.
                          </p>
                          <div className="space-y-3">
                            <div className="bg-white p-3 rounded-md border-2 border-stone-200">
                              <h4 className="font-roboto font-bold text-sm text-primary mb-1">South B &amp; South C</h4>
                              <p className="font-roboto text-stone-500 text-base leading-relaxed mb-2">
                                More local, affordable, and close to Nairobi National Park — ideal for experienced residents and budget-conscious travellers who want space without the Karen price tag. Strong community feel with markets, local eateries, and easy access to the CBD.
                              </p>
                              <Link
                                to="/all-properties"
                                className="inline-flex items-center gap-1 text-sm font-roboto font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
                              >
                                Browse Properties
                                <i className="ri-arrow-right-line text-xs"></i>
                              </Link>
                            </div>
                            <div className="bg-white p-3 rounded-md border-2 border-stone-200">
                              <h4 className="font-roboto font-bold text-sm text-primary mb-1">City Centre &amp; Upper Hill</h4>
                              <p className="font-roboto text-stone-500 text-base leading-relaxed mb-2">
                                Busy, central, and all business — ideal for short stays and professionals who need to be in the thick of it. Upper Hill hosts major corporate HQs and hotels. The CBD offers unmatched convenience but can be hectic.
                              </p>
                              <Link
                                to="/all-properties"
                                className="inline-flex items-center gap-1 text-sm font-roboto font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
                              >
                                Browse Properties
                                <i className="ri-arrow-right-line text-xs"></i>
                              </Link>
                            </div>
                            <div className="bg-white p-3 rounded-md border-2 border-stone-200">
                              <h4 className="font-roboto font-bold text-sm text-primary mb-1">Langata</h4>
                              <p className="font-roboto text-stone-500 text-base leading-relaxed mb-2">
                                Nature-focused living on a budget — bordering Nairobi National Park and close to the Giraffe Centre and Elephant Orphanage. More affordable than neighbouring Karen while sharing the same green, relaxed atmosphere. Popular with families seeking space.
                              </p>
                              <Link
                                to="/all-properties"
                                className="inline-flex items-center gap-1 text-sm font-roboto font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
                              >
                                Browse Properties
                                <i className="ri-arrow-right-line text-xs"></i>
                              </Link>
                            </div>
                            <div className="bg-white p-3 rounded-md border-2 border-stone-200">
                              <h4 className="font-roboto font-bold text-sm text-primary mb-1">Ruaka</h4>
                              <p className="font-roboto text-stone-500 text-base leading-relaxed mb-2">
                                A fast-growing satellite suburb north of the city — significantly cheaper rents than Gigiri or Runda but only 15–20 minutes from the UN and diplomatic quarter. Popular with young professionals and families priced out of the core northern suburbs.
                              </p>
                              <Link
                                to="/all-properties"
                                className="inline-flex items-center gap-1 text-sm font-roboto font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
                              >
                                Browse Properties
                                <i className="ri-arrow-right-line text-xs"></i>
                              </Link>
                            </div>
                          </div>
                          <p className="font-roboto text-stone-400 text-sm mt-4 pt-3 border-t border-stone-200 leading-relaxed">
                            These areas are not yet covered by full Area Guides but have active property listings. Our agents can provide detailed local knowledge on any of them.
                          </p>
                        </div>
                      </aside>
                    </Reveal>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab: Area Guides */}
          {activeTab === 'guides' && (
            <div className="space-y-6">
              {error && !loading ? (
                <div className="text-center py-12 bg-red-50 rounded-lg border border-red-100">
                  <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-full mx-auto mb-3">
                    <i className="ri-error-warning-line text-red-400 text-xl"></i>
                  </div>
                  <p className="font-roboto font-bold text-lg text-red-700 mb-1">Something went wrong</p>
                  <p className="font-roboto text-red-500 text-sm mb-4">{error}</p>
                  <button
                    onClick={refetch}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-roboto font-medium rounded-lg hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-refresh-line"></i>
                    Try Again
                  </button>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-stone-50 rounded-lg h-48 animate-pulse" />
                  ))}
                </div>
              ) : guideHoods.length === 0 ? (
                <div className="text-center py-16 bg-stone-50 rounded-lg border-2 border-stone-200">
                  <div className="w-12 h-12 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-3">
                    <i className="ri-book-open-line text-stone-400 text-xl"></i>
                  </div>
                  <p className="font-roboto font-bold text-lg text-primary mb-1">No Guides Yet</p>
                  <p className="font-roboto text-stone-400 text-sm">Area guides are coming soon.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {guideHoods.map((h, i) => (
                    <Reveal key={h.id} delay={i * 100}>
                      <Link
                        to={`/neighbourhood/${h.slug}`}
                        className="group cursor-pointer flex flex-col sm:flex-row bg-white rounded-lg overflow-hidden border-2 border-stone-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-stone-200/60 transition-all duration-500"
                      >
                        <div className="sm:w-48 h-40 sm:h-auto shrink-0 relative overflow-hidden bg-stone-100">
                          {h.hero_image ? (
                            <img
                              alt={h.name}
                              className="w-full h-full object-cover object-top transition-transform duration-1000 ease-out group-hover:scale-110"
                              src={h.hero_image}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <i className="ri-image-line text-stone-300 text-2xl" />
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex flex-col justify-between flex-1">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {h.tags &&
                                h.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 bg-stone-50 text-sm font-roboto font-medium text-stone-500 rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                            </div>
                            <h3 className="text-lg font-roboto font-medium text-primary mb-1">{h.name} Guide</h3>
                            <p className="font-roboto text-stone-500 text-base leading-relaxed line-clamp-3">
                              {h.summary || h.description || ''}
                            </p>
                          </div>
                          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                            <span className="font-roboto text-sm text-stone-400 uppercase tracking-wider">
                              {h.city}
                            </span>
                            <span className="flex items-center gap-1 text-sm font-roboto font-medium text-primary group-hover:text-primary/80 transition-colors">
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
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {blogCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setBlogCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-roboto font-medium transition-all cursor-pointer whitespace-nowrap ${
                      blogCategory === cat
                        ? 'bg-primary text-white'
                        : 'bg-stone-50 text-stone-500 hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    {cat === 'all' ? 'All Posts' : cat}
                  </button>
                ))}
              </div>
              {error && !loading ? (
                <div className="text-center py-12 bg-red-50 rounded-lg border border-red-100">
                  <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-full mx-auto mb-3">
                    <i className="ri-error-warning-line text-red-400 text-xl"></i>
                  </div>
                  <p className="font-roboto font-bold text-lg text-red-700 mb-1">Something went wrong</p>
                  <p className="font-roboto text-red-500 text-sm mb-4">{error}</p>
                  <button
                    onClick={refetch}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-roboto font-medium rounded-lg hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-refresh-line"></i>
                    Try Again
                  </button>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-stone-50 rounded-lg h-56 animate-pulse" />
                  ))}
                </div>
              ) : filteredBlogPosts.length === 0 ? (
                <div className="text-center py-16 bg-stone-50 rounded-lg border-2 border-stone-200">
                  <div className="w-12 h-12 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-3">
                    <i className="ri-article-line text-stone-400 text-xl"></i>
                  </div>
                  <p className="font-roboto font-bold text-lg text-primary mb-1">No Blog Posts Yet</p>
                  <p className="font-roboto text-stone-400 text-sm">Check back soon for neighbourhood insights.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredBlogPosts.map((post, i) => (
                    <Reveal key={post.id} delay={i * 90}>
                      <Link
                        to={`/blog/${post.slug}`}
                        className="group cursor-pointer block bg-white rounded-lg overflow-hidden border-2 border-stone-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-stone-200/60 transition-all duration-500"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <img
                            alt={post.title}
                            className="w-full h-full object-cover object-top transition-transform duration-1000 ease-out group-hover:scale-110"
                            src={post.featured_image || ''}
                          />
                          {post.category && (
                            <div className="absolute top-3 left-3">
                              <span className="px-2 py-0.5 bg-primary/90 text-white text-sm font-roboto font-medium rounded-full">
                                {post.categoryTag || post.category}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-roboto font-bold text-base text-primary leading-snug mb-2 line-clamp-2 group-hover:text-primary/80 transition-colors">
                            {post.title}
                          </h3>
                          <p className="font-roboto text-stone-500 text-base leading-relaxed line-clamp-2 mb-3">
                            {post.excerpt || ''}
                          </p>
                          <div className="flex items-center gap-2 text-sm font-roboto text-stone-400">
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
                <div className="bg-stone-50 border-2 border-stone-200 rounded-lg p-5 md:p-6">
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full shrink-0">
                      <i className="ri-scales-line text-primary"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-roboto font-medium text-primary mb-1">Compare Neighbourhoods</h3>
                      <p className="font-roboto text-stone-500 text-sm">
                        Pick two neighbourhoods to see how they stack up across safety, lifestyle, schools, value, and more.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                      <label className="font-roboto text-sm text-stone-400 uppercase tracking-wider block mb-1.5">First Neighbourhood</label>
                      <div className="relative">
                        <select
                          value={compareA}
                          onChange={(e) => setCompareA(e.target.value)}
                          className="w-full appearance-none pl-3 pr-8 py-2.5 border border-stone-200 rounded-lg text-base font-roboto text-primary bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer"
                        >
                          <option value="">Select a neighbourhood...</option>
                          {comparisonData.map((c) => (
                            <option key={c.slug} value={c.slug} disabled={c.slug === compareB}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-base pointer-events-none"></i>
                      </div>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-stone-200 shrink-0 mt-5 sm:mt-0">
                      <span className="font-roboto font-bold text-stone-400 text-sm">vs</span>
                    </div>
                    <div className="flex-1 w-full">
                      <label className="font-roboto text-sm text-stone-400 uppercase tracking-wider block mb-1.5">Second Neighbourhood</label>
                      <div className="relative">
                        <select
                          value={compareB}
                          onChange={(e) => setCompareB(e.target.value)}
                          className="w-full appearance-none pl-3 pr-8 py-2.5 border border-stone-200 rounded-lg text-base font-roboto text-primary bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer"
                        >
                          <option value="">Select a neighbourhood...</option>
                          {comparisonData.map((c) => (
                            <option key={c.slug} value={c.slug} disabled={c.slug === compareA}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none"></i>
                      </div>
                    </div>
                  </div>
                  {/* Quick suggestions */}
                  <div className="mt-4 pt-4 border-t border-stone-200">
                    <p className="font-roboto text-stone-400 text-sm uppercase tracking-wider mb-2">Popular Comparisons</p>
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
                          className={`px-3 py-1.5 rounded-full text-sm font-roboto font-medium transition-all cursor-pointer whitespace-nowrap ${
                            compareA === pair.a && compareB === pair.b
                              ? 'bg-primary text-white'
                              : 'bg-white text-stone-500 border border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                          }`}
                        >
                          {pair.label}
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
                        <div className="bg-stone-50 border-2 border-stone-200 rounded-lg p-4 md:p-5">
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <div className="text-center">
                              <p className="text-lg font-roboto font-medium text-primary">{dataA.name}</p>
                              <p className="font-roboto text-sm text-stone-400 mt-0.5">Wins {aWins.length} of 8 categories</p>
                            </div>
                            <div className="text-center">
                              <p className="font-roboto font-bold text-stone-400 text-sm">HEAD-TO-HEAD</p>
                              <div className="flex items-center justify-center gap-3 mt-2">
                                {winnerA && (
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-sm font-roboto font-semibold rounded-full">Winner</span>
                                )}
                                {!winnerA && !winnerB && (
                                  <span className="px-2 py-0.5 bg-stone-100 text-stone-500 text-sm font-roboto font-medium rounded-full">Tie</span>
                                )}
                                {winnerB && (
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-sm font-roboto font-semibold rounded-full">Winner</span>
                                )}
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-roboto font-medium text-primary">{dataB.name}</p>
                              <p className="font-roboto text-sm text-stone-400 mt-0.5">Wins {bWins.length} of 8 categories</p>
                            </div>
                          </div>
                        </div>
                      </Reveal>

                      {/* Top-line comparison: Safety, Price, Best For, Vibe */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                        <Reveal delay={80}>
                          <div className="bg-stone-50 border-2 border-stone-200 rounded-lg p-4">
                            <p className="font-roboto text-stone-400 text-sm uppercase tracking-wider mb-2">Safety</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="font-roboto text-sm font-medium text-stone-600 mb-1">{dataA.name}</p>
                                <RatingBar rating={dataA.safety.rating} />
                              </div>
                              <span className="text-sm font-roboto text-stone-400">vs</span>
                              <div className="flex-1">
                                <p className="font-roboto text-sm font-medium text-stone-600 mb-1">{dataB.name}</p>
                                <RatingBar rating={dataB.safety.rating} />
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-stone-200 space-y-1.5">
                              <p className="font-roboto text-sm text-stone-500 leading-relaxed"><span className="font-medium">{dataA.name}:</span> {dataA.safety.description}</p>
                              <p className="font-roboto text-sm text-stone-500 leading-relaxed"><span className="font-medium">{dataB.name}:</span> {dataB.safety.description}</p>
                            </div>
                          </div>
                        </Reveal>
                        <Reveal delay={160}>
                          <div className="bg-stone-50 border-2 border-stone-200 rounded-lg p-4">
                            <p className="font-roboto text-stone-400 text-sm uppercase tracking-wider mb-2">Price &amp; Value</p>
                            <div className="space-y-2">
                              <div>
                                <p className="font-roboto text-sm font-medium text-stone-600">{dataA.name}</p>
                                <p className="font-roboto text-sm font-semibold text-primary">{dataA.priceRange}</p>
                                <p className="font-roboto text-sm text-stone-400">1BR Rent: {dataA.typicalRent1BR}</p>
                              </div>
                              <div className="border-t border-stone-200 pt-2">
                                <p className="font-roboto text-sm font-medium text-stone-600">{dataB.name}</p>
                                <p className="font-roboto text-sm font-semibold text-primary">{dataB.priceRange}</p>
                                <p className="font-roboto text-sm text-stone-400">1BR Rent: {dataB.typicalRent1BR}</p>
                              </div>
                            </div>
                          </div>
                        </Reveal>
                      </div>

                      {/* Vibe & Best For */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                        <Reveal delay={80}>
                          <div className="bg-stone-50 border-2 border-stone-200 rounded-lg p-4">
                            <p className="font-roboto text-stone-400 text-sm uppercase tracking-wider mb-2">Vibe</p>
                            <div className="space-y-3">
                              <div>
                                <p className="font-roboto text-sm font-medium text-stone-600 mb-0.5">{dataA.name}</p>
                                <p className="font-roboto text-sm text-stone-500 leading-relaxed">{dataA.vibe}</p>
                              </div>
                              <div className="border-t border-stone-200 pt-3">
                                <p className="font-roboto text-sm font-medium text-stone-600 mb-0.5">{dataB.name}</p>
                                <p className="font-roboto text-sm text-stone-500 leading-relaxed">{dataB.vibe}</p>
                              </div>
                            </div>
                          </div>
                        </Reveal>
                        <Reveal delay={160}>
                          <div className="bg-stone-50 border-2 border-stone-200 rounded-lg p-4">
                            <p className="font-roboto text-stone-400 text-sm uppercase tracking-wider mb-2">Best For</p>
                            <div className="space-y-3">
                              <div>
                                <p className="font-roboto text-sm font-medium text-stone-600 mb-1">{dataA.name}</p>
                                <div className="flex flex-wrap gap-1">
                                  {dataA.bestFor.slice(0, 4).map((b) => (
                                    <span key={b} className="px-2 py-0.5 bg-white text-sm font-roboto text-stone-500 rounded-full border-2 border-stone-200">{b}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="border-t border-stone-200 pt-3">
                                <p className="font-roboto text-sm font-medium text-stone-600 mb-1">{dataB.name}</p>
                                <div className="flex flex-wrap gap-1">
                                  {dataB.bestFor.slice(0, 4).map((b) => (
                                    <span key={b} className="px-2 py-0.5 bg-white text-sm font-roboto text-stone-500 rounded-full border-2 border-stone-200">{b}</span>
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
                        <div className="overflow-x-auto bg-white border-2 border-stone-200 rounded-lg">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-stone-100">
                                <th className="py-3 px-4 font-roboto text-sm text-stone-400 uppercase tracking-wider">Dimension</th>
                                <th className="py-3 px-4 font-roboto text-sm text-primary font-medium text-center">{dataA.name}</th>
                                <th className="py-3 px-4 font-roboto text-sm text-primary font-medium text-center">{dataB.name}</th>
                                <th className="py-3 px-4 font-roboto text-sm text-stone-400 uppercase tracking-wider text-center">Edge</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dims.map((dim, idx) => {
                                const rA = dataA[dim.key].rating;
                                const rB = dataB[dim.key].rating;
                                const edge = rA > rB ? dataA.name : rB > rA ? dataB.name : 'Tie';
                                return (
                                  <tr key={dim.key} className={`border-b border-stone-50 ${idx % 2 === 0 ? 'bg-stone-50/50' : ''}`}>
                                    <td className="py-2.5 px-4 font-roboto text-sm font-medium text-stone-600">{dim.label}</td>
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
                                        edge === dataA.name ? 'text-primary' : edge === dataB.name ? 'text-primary' : 'text-stone-400'
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
                <div className="text-center py-16 bg-stone-50 rounded-lg border-2 border-stone-200">
                  <div className="w-12 h-12 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-3">
                    <i className="ri-scales-line text-stone-400 text-xl"></i>
                  </div>
                  <p className="font-roboto font-bold text-lg text-primary mb-1">Select Two Neighbourhoods</p>
                  <p className="font-roboto text-stone-400 text-sm max-w-sm mx-auto">
                    Pick any two neighbourhoods from the dropdowns above to see a detailed side-by-side comparison across safety, lifestyle, schools, value, and more.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Area Guides & Insights Section */}
          {activeTab === 'neighbourhoods' && !loading && filteredHoods.length > 0 && (
            <div className="mt-16 md:mt-24">
              <Reveal>
                <div className="text-center mb-8 md:mb-10">
                  <p className="text-golden text-sm font-roboto font-semibold uppercase tracking-[0.35em] mb-2">
                    Insights
                  </p>
                  <h2 className="font-roboto font-bold text-3xl md:text-4xl text-primary mb-3">
                    Area Guides &amp; Insights
                  </h2>
                  <p className="font-roboto text-stone-500 text-base max-w-2xl mx-auto">
                    In-depth guides to help you understand each neighbourhood&apos;s unique character, property market, and lifestyle.
                  </p>
                </div>
              </Reveal>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredHoods.slice(0, 3).map((n, i) => (
                  <Reveal key={n.id} delay={i * 100}>
                    <Link
                      to={`/neighbourhood/${n.slug}`}
                      className="group cursor-pointer bg-stone-50 rounded-lg p-5 md:p-6 border-2 border-stone-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-stone-200/60 transition-all duration-500"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full shrink-0">
                          <i className="ri-map-pin-2-line text-primary text-lg"></i>
                        </div>
                        <div>
                          <h4 className="text-lg font-roboto font-medium text-primary mb-1">{n.name} Guide</h4>
                          <p className="font-roboto text-stone-500 text-base leading-relaxed line-clamp-2">
                            {n.summary || n.description || ''}
                          </p>
                          <span className="flex items-center gap-1 text-sm font-roboto font-medium text-primary mt-2 group-hover:text-primary/80 transition-colors">
                            Read more
                            <i className="ri-arrow-right-line"></i>
                          </span>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <Reveal>
            <div className="mt-16 md:mt-24 text-center bg-stone-50 py-12 md:py-16 px-4 md:px-6 rounded-lg mx-3 md:mx-6 max-w-6xl mx-auto">
              <h3 className="font-roboto font-bold text-2xl md:text-3xl text-primary mb-3">
                Let Our Agents Guide You
              </h3>
              <p className="font-roboto text-stone-500 text-base max-w-xl mx-auto mb-6">
                Not sure which neighbourhood fits your lifestyle and budget? Our experienced agents have deep local knowledge of every Nairobi enclave. Tell us your priorities and we will match you with the perfect area.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-base font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                Speak to an Agent
                <i className="ri-arrow-right-line text-xs"></i>
              </Link>
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