import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import QuickViewModal from '@/components/feature/QuickViewModal';
import { supabase } from '@/lib/supabase';

interface Property {
  id: string;
  slug: string;
  title: string;
  location: string;
  type: 'sale' | 'rent';
  category: string;
  beds: number;
  baths: number;
  parking: number;
  price: string;
  priceUnit?: string;
  priceRaw: number;
  image: string;
  images: string[];
  listedDays: number;
  agentPhone?: string;
  agentEmail?: string;
}

interface NeighbourhoodTab {
  name: string;
  count: number;
}

const PAGE_SIZE = 12;

function toCategoryLabel(cat: string): string {
  return cat.toLowerCase().split(/[_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function buildSlug(id: string, title: string): string {
  if (!title) return id;
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
}

function formatPrice(priceNum: number, currency: string): string {
  const symbol = currency === 'USD' ? '$' : currency === 'KES' ? 'KSh' : currency === 'UGX' ? 'UGX' : currency === 'GBP' ? '£' : '€';
  if (priceNum >= 1_000_000_000) return `${symbol} ${(priceNum / 1_000_000_000).toFixed(1)}B`;
  if (priceNum >= 1_000_000) return `${symbol} ${(priceNum / 1_000_000).toFixed(priceNum % 1_000_000 === 0 ? 0 : 1)}M`;
  if (priceNum >= 1_000) return `${symbol} ${(priceNum / 1_000).toFixed(0)}K`;
  return `${symbol} ${priceNum.toLocaleString()}`;
}

function formatListedDate(listedDays: number): string {
  if (listedDays === 0) return 'Listed today';
  if (listedDays === 1) return 'Listed yesterday';
  if (listedDays < 7) return `Listed ${listedDays} days ago`;
  if (listedDays < 30) return `Listed ${Math.floor(listedDays / 7)} weeks ago`;
  if (listedDays < 365) return `Listed ${Math.floor(listedDays / 30)} months ago`;
  return `Listed ${Math.floor(listedDays / 365)} years ago`;
}

function mapRow(row: Record<string, unknown>): Property {
  const title = String(row.title || 'Untitled Property');
  const slug = String(row.slug || buildSlug(String(row.id), title));
  const mainImg = String(row.main_image || '');
  const images = (row.images as string[] | null) || [];
  const fallbackImg = 'https://readdy.ai/api/search-image?query=Modern%20luxury%20real%20estate%20property%20exterior%20with%20clean%20white%20walls%20large%20windows%20bright%20daylight%20architectural%20photography%20high%20quality%20warm%20neutral%20background&width=800&height=600&seq=ap-fallback-v2&orientation=landscape';

  const priceNum = Number(row.price || 0);
  const currency = String(row.currency || 'KES');

  const created = new Date(String(row.created_at || Date.now()));
  const listedDays = Math.floor((Date.now() - created.getTime()) / 86400000);

  return {
    id: String(row.id),
    slug,
    title,
    location: String(row.location || 'Nairobi'),
    type: String(row.purpose || 'sale') === 'rent' ? 'rent' : 'sale',
    category: toCategoryLabel(String(row.property_type || 'house')),
    beds: Number(row.bedrooms ?? 0),
    baths: Number(row.bathrooms ?? 0),
    parking: Number(row.parking ?? 0),
    price: formatPrice(priceNum, currency),
    priceUnit: String(row.purpose || 'sale') === 'rent' ? 'pcm' : undefined,
    priceRaw: priceNum,
    image: mainImg || (images.length > 0 ? images[0] : fallbackImg),
    images: mainImg ? [mainImg, ...images] : images.length > 0 ? images : [fallbackImg],
    listedDays,
    agentPhone: String(row.owner_phone || ''),
    agentEmail: String(row.owner_email || ''),
  };
}

export default function AllProperties() {
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'rent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [listings, setListings] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [neighbourhoods, setNeighbourhoods] = useState<NeighbourhoodTab[]>([]);
  const [selectedNeighbourhood, setSelectedNeighbourhood] = useState<string | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<Property[]>([]);
  const [quickViewProperty, setQuickViewProperty] = useState<Property | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('saved_properties');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });

  // Load recently viewed from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recently_viewed_properties');
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        if (ids.length > 0) {
          supabase
            .from('listings')
            .select('id,title,location,price,property_type,bedrooms,bathrooms,parking,slug,created_at,main_image,images,purpose,currency,owner_phone,owner_email')
            .in('id', ids.slice(0, 8))
            .then(({ data }) => {
              if (data) setRecentlyViewed(((data || []) as Record<string, unknown>[]).map(mapRow));
            })
            .catch(() => {});
        }
      }
    } catch { /* ignore */ }
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('saved_properties', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const clearRecentlyViewed = () => {
    localStorage.removeItem('recently_viewed_properties');
    setRecentlyViewed([]);
  };

  // Fetch neighbourhoods — show all, not limited to 12
  useEffect(() => {
    supabase
      .from('listings')
      .select('neighbourhood')
      .eq('is_published', true)
      .neq('title', '')
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        (data as Array<{ neighbourhood: string | null }>).forEach((row) => {
          const n = row.neighbourhood;
          if (n) counts[n] = (counts[n] || 0) + 1;
        });
        const sorted = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .map(([name, count]) => ({ name, count }));
        setNeighbourhoods(sorted);
      })
      .catch(() => {});
  }, []);

  const fetchListings = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (reset) {
      setLoading(true);
      setError('');
    }

    try {
      let query = supabase
        .from('listings')
        .select('id,title,location,price,property_type,bedrooms,bathrooms,parking,slug,created_at,main_image,images,purpose,currency,owner_phone,owner_email', { count: 'exact' })
        .eq('is_published', true)
        .neq('title', '')
        .gt('price', 0)
        .in('status', ['available', 'under_contract']);

      if (filterType !== 'all') {
        query = query.eq('purpose', filterType);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%`);
      }

      if (selectedNeighbourhood) {
        query = query.eq('neighbourhood', selectedNeighbourhood);
      }

      switch (sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      query = query.range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      const { data, error: dbError, count } = await query;
      if (dbError) throw dbError;

      const mapped = ((data || []) as Record<string, unknown>[]).map(mapRow);

      if (reset) {
        setListings(mapped);
        setPage(0);
      } else {
        setListings((prev) => [...prev, ...mapped]);
      }

      const total = count || 0;
      setTotalCount(total);
      setHasMore((currentPage + 1) * PAGE_SIZE < total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load properties');
      if (reset) setListings([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, searchQuery, selectedNeighbourhood, sortBy, page]);

  useEffect(() => {
    fetchListings(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, searchQuery, selectedNeighbourhood, sortBy]);

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  useEffect(() => {
    if (page > 0) fetchListings(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    setPage(0);
    setListings([]);
    setHasMore(true);
    fetchListings(true);
  };

  const headingText = filterType === 'rent'
    ? 'Luxury Homes for Rent in Nairobi, Kenya'
    : filterType === 'sale'
      ? 'Luxury Homes for Sale in Nairobi, Kenya'
      : 'Luxury Homes in Nairobi, Kenya';

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col pt-[88px] md:pt-[96px]">
      <Header />

      {/* === BREADCRUMBS === */}
      <div className="bg-white border-b border-stone-100">
        <div className="px-5 md:px-10 max-w-7xl mx-auto">
          <nav className="flex items-center gap-1.5 py-3 text-xs font-roboto text-stone-400">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="w-3 h-3 flex items-center justify-center">
              <i className="ri-arrow-right-s-line text-stone-300"></i>
            </span>
            <span className="text-stone-500">Properties</span>
            {selectedNeighbourhood && (
              <>
                <span className="w-3 h-3 flex items-center justify-center">
                  <i className="ri-arrow-right-s-line text-stone-300"></i>
                </span>
                <span className="text-stone-500">{selectedNeighbourhood}</span>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* === EDITORIAL HEADER === */}
      <div className="bg-white border-b border-stone-100">
        <div className="px-5 md:px-10 py-6 md:py-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="font-roboto font-bold text-2xl md:text-3xl lg:text-4xl text-primary leading-tight">
                {headingText}
              </h1>
            </div>
            <div className="flex items-center gap-5 shrink-0">
              <span className="text-sm font-roboto text-stone-500">
                {loading && listings.length === 0 ? (
                  <span className="inline-block w-16 h-4 bg-stone-200 rounded animate-pulse"></span>
                ) : (
                  <><span className="text-primary font-semibold">{totalCount}</span> listings</>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400 font-roboto hidden sm:inline">Sort:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
                    className="appearance-none border border-stone-200 rounded-sm pl-3 pr-8 py-2 text-xs font-roboto font-medium text-stone-700 focus:outline-none focus:border-primary cursor-pointer bg-white hover:border-stone-300 transition-colors"
                  >
                    <option value="newest">Newest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs pointer-events-none"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === SEARCH + FILTER BAR === */}
      <div className="bg-white border-b border-stone-100">
        <div className="px-5 md:px-10 py-3 max-w-7xl mx-auto">
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1 min-w-0 flex items-center gap-2.5 px-4 bg-white border border-stone-200 rounded-[4px] h-11 hover:border-stone-300 transition-colors">
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <i className="ri-search-line text-stone-400 text-sm"></i>
              </span>
              <input
                placeholder='e.g. "Kilimani", "Runda", or "4 bed villa"'
                className="flex-1 min-w-0 text-sm font-roboto text-stone-700 placeholder:text-stone-400 focus:outline-none bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-stone-600 cursor-pointer">
                  <i className="ri-close-line text-sm"></i>
                </button>
              )}
            </div>
            <div className="hidden sm:block relative h-11">
              <select
                className="h-full appearance-none pl-4 pr-9 text-sm font-roboto text-stone-700 bg-white border border-stone-200 rounded-[4px] focus:outline-none focus:border-primary cursor-pointer hover:border-stone-300 transition-colors"
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value as 'all' | 'sale' | 'rent'); setPage(0); }}
              >
                <option value="all">All Properties</option>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
              <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none"></i>
            </div>
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 h-11 px-5 bg-primary text-white text-sm font-roboto font-semibold rounded-[4px] hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-search-line text-sm"></i>
              </span>
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* === FILTER TABS === */}
      <div className="bg-white border-b border-stone-100">
        <div className="px-5 md:px-10 max-w-7xl mx-auto">
          <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
            {(['all', 'sale', 'rent'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setFilterType(tab); setPage(0); }}
                className={`px-5 py-3.5 text-xs font-roboto font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap border-b-2 -mb-px ${filterType === tab ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-600 hover:border-stone-200'}`}
              >
                {tab === 'all' ? 'All' : tab === 'sale' ? 'For Sale' : 'For Rent'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* === NEIGHBOURHOOD TABS === */}
      {neighbourhoods.length > 0 && (
        <div className="bg-white border-b border-stone-100">
          <div className="px-5 md:px-10 max-w-7xl mx-auto">
            <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedNeighbourhood(null)}
                className={`px-4 py-3 text-xs font-roboto font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap border-b-2 -mb-px ${!selectedNeighbourhood ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-600 hover:border-stone-200'}`}
              >
                All Areas
              </button>
              {neighbourhoods.map((n) => (
                <button
                  key={n.name}
                  onClick={() => setSelectedNeighbourhood(selectedNeighbourhood === n.name ? null : n.name)}
                  className={`px-4 py-3 text-xs font-roboto font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap border-b-2 -mb-px ${selectedNeighbourhood === n.name ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-600 hover:border-stone-200'}`}
                >
                  {n.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === MAIN CONTENT === */}
      <main className="flex-1 px-5 md:px-10 py-8 pb-12 max-w-7xl mx-auto w-full">
        {error && !loading && (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center bg-red-50 rounded-full">
              <i className="ri-error-warning-line text-xl text-red-400"></i>
            </div>
            <p className="text-sm text-stone-500 mb-4">{error}</p>
            <button onClick={() => fetchListings(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
              <i className="ri-refresh-line"></i>Try Again
            </button>
          </div>
        )}

        {!error && listings.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-stone-100 rounded-full">
              <i className="ri-search-line text-2xl text-stone-400"></i>
            </div>
            <p className="font-roboto font-bold text-primary text-xl mb-2">No properties found</p>
            <p className="text-sm font-roboto text-stone-400">Try adjusting your filters or search query</p>
          </div>
        )}

        {/* Property Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && listings.length === 0
            ? Array.from({ length: 9 }).map((_, n) => <PropertyCardSkeleton key={n} />)
            : listings.map((p) => (
                <PropertyCard key={p.id} property={p} isSaved={savedIds.has(p.id)} onToggleSave={toggleSave} onQuickView={setQuickViewProperty} />
              ))}
        </div>

        {/* Inline loading spinner for load more */}
        {loading && listings.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-8">
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-loader-4-line animate-spin text-primary"></i>
            </span>
            <span className="text-sm font-roboto text-stone-400">Loading more properties...</span>
          </div>
        )}

        {/* Load More */}
        {hasMore && listings.length > 0 && !loading && (
          <div className="text-center mt-10">
            <button
              onClick={loadMore}
              className="inline-flex items-center gap-2 px-14 py-3 border border-primary text-primary text-xs font-roboto font-semibold uppercase tracking-widest hover:bg-primary hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Load More Properties
            </button>
          </div>
        )}

        {/* End of results */}
        {!hasMore && listings.length > 0 && !loading && (
          <div className="text-center mt-10">
            <p className="text-xs font-roboto text-stone-400">Showing all {totalCount} properties</p>
          </div>
        )}
      </main>

      {/* === RECENTLY VIEWED === */}
      {recentlyViewed.length > 0 && (
        <section className="bg-[#f8f6f2] border-t border-stone-200 py-10 md:py-14">
          <div className="max-w-7xl mx-auto px-5 md:px-10">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs font-roboto font-semibold uppercase tracking-[0.2em] text-golden mb-1.5">Your History</p>
                <h3 className="font-roboto font-bold text-xl md:text-2xl text-primary">Recently Viewed</h3>
              </div>
              <button
                onClick={clearRecentlyViewed}
                className="text-sm font-roboto text-stone-400 hover:text-stone-600 underline underline-offset-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                Clear all
              </button>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-2 no-scrollbar">
              {recentlyViewed.map((p) => (
                <Link
                  key={p.id}
                  to={`/property/${p.slug}`}
                  className="flex-shrink-0 w-64 bg-white overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-cover object-top group-hover:scale-[1.06] transition-transform duration-600"
                    />
                    <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                      <i className="ri-time-line text-white text-xs"></i>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-roboto font-semibold uppercase tracking-widest text-[#1f1f1f] mb-1.5">
                      {p.category}
                    </p>
                    <h4 className="text-base font-roboto font-medium text-[#011328] leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
                      {p.title}
                    </h4>
                    <p className="flex items-center gap-1 text-sm font-roboto text-[#636363] mb-3">
                      <span className="w-3 h-3 flex items-center justify-center">
                        <i className="ri-map-pin-line text-golden text-[10px]"></i>
                      </span>
                      {p.location}
                    </p>
                    <p className="text-lg font-roboto font-medium text-[#002349] mb-2">{p.price}</p>
                    <div className="flex items-center gap-3 text-sm font-roboto text-[#363535]">
                      <span className="flex items-center gap-1"><i className="ri-hotel-bed-line text-[#636363] text-xs"></i>{p.beds}</span>
                      <span className="flex items-center gap-1"><i className="ri-drop-line text-[#636363] text-xs"></i>{p.baths}</span>
                      <span className="flex items-center gap-1"><i className="ri-car-line text-[#636363] text-xs"></i>{p.parking}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <PageContactSection />
      <Footer />
      <BackToTop />
      <QuickViewModal
        isOpen={quickViewProperty !== null}
        onClose={() => setQuickViewProperty(null)}
        property={quickViewProperty ? {
          id: quickViewProperty.id,
          slug: quickViewProperty.slug,
          title: quickViewProperty.title,
          price: quickViewProperty.price,
          priceUnit: quickViewProperty.priceUnit,
          location: quickViewProperty.location,
          category: quickViewProperty.category,
          beds: quickViewProperty.beds,
          baths: quickViewProperty.baths,
          parking: quickViewProperty.parking,
          description: '',
          images: quickViewProperty.images,
          type: quickViewProperty.type,
          agentPhone: quickViewProperty.agentPhone,
          agentEmail: quickViewProperty.agentEmail,
        } : null}
      />
    </div>
  );
}

/* ── Property Card Skeleton ── */
function PropertyCardSkeleton() {
  return (
    <div className="bg-white overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-stone-200"></div>
      <div className="p-4 space-y-3">
        <div className="h-3 bg-stone-200 rounded w-1/3"></div>
        <div className="h-4 bg-stone-200 rounded w-4/5"></div>
        <div className="h-3 bg-stone-200 rounded w-2/3"></div>
        <div className="h-3 bg-stone-200 rounded w-1/2"></div>
        <div className="h-5 bg-stone-200 rounded w-1/3 mt-2"></div>
        <div className="flex justify-between gap-3 pt-2 border-t border-stone-100">
          <div className="flex gap-3">
            <div className="h-4 bg-stone-200 rounded w-16"></div>
            <div className="h-4 bg-stone-200 rounded w-16"></div>
          </div>
          <div className="h-3 bg-stone-200 rounded w-24"></div>
        </div>
      </div>
    </div>
  );
}

/* ── Luxury Property Card ── */
function PropertyCard({
  property,
  isSaved,
  onToggleSave,
  onQuickView,
}: {
  property: Property;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onQuickView: (p: Property) => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const [showPhotosOverlay, setShowPhotosOverlay] = useState(false);
  const totalImages = property.images.length;

  const nextImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (totalImages > 1) setImgIdx((prev) => (prev + 1) % totalImages);
  };

  const prevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (totalImages > 1) setImgIdx((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const handleCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const phone = property.agentPhone || '+254700000000';
    window.open(`tel:${phone}`, '_self');
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const email = property.agentEmail || 'info@example.com';
    window.open(`mailto:${email}?subject=Inquiry about ${encodeURIComponent(property.title)}`, '_self');
  };

  return (
    <div className="group bg-white overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Image Area */}
      <Link to={`/property/${property.slug}`} className="block relative aspect-[4/3] overflow-hidden group">
        <img
          src={property.images[imgIdx] || property.image}
          alt={property.title}
          className="w-full h-full object-cover object-top group-hover:scale-[1.06] transition-transform duration-600"
        />

        {/* Dark gradient at bottom for text overlays */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>

        {/* Save / Heart button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(property.id);
          }}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
          aria-label={isSaved ? 'Remove from saved' : 'Save property'}
        >
          <i className={`${isSaved ? 'ri-heart-fill text-red-500' : 'ri-heart-line text-stone-600'} text-sm`}></i>
        </button>

        {/* Status badge — top-left */}
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-block text-[10px] font-roboto font-bold uppercase tracking-wider px-2.5 py-1 text-white bg-[#088135]">
            {property.type === 'sale' ? 'For Sale' : 'For Rent'}
          </span>
        </div>

        {/* Image counter badge */}
        {totalImages > 1 && (
          <div className="absolute bottom-3 left-3 z-10 bg-black/60 backdrop-blur-sm text-white text-xs font-roboto font-medium px-2 py-1 rounded-sm">
            {imgIdx + 1}/{totalImages}
          </div>
        )}

        {/* Preview badge */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQuickView(property);
          }}
          className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <span className="flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 rounded-sm cursor-pointer hover:bg-black/80 transition-colors">
            <span className="w-3.5 h-3.5 flex items-center justify-center">
              <i className="ri-expand-diagonal-line text-xs"></i>
            </span>
            Preview
          </span>
        </button>

        {/* "View X photos" overlay on hover */}
        {totalImages > 1 && (
          <div
            className={`absolute inset-x-0 bottom-0 z-10 flex items-end justify-center pb-3 transition-opacity duration-200 ${showPhotosOverlay ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onMouseEnter={() => setShowPhotosOverlay(true)}
            onMouseLeave={() => setShowPhotosOverlay(false)}
          >
            <span className="bg-black/70 backdrop-blur-sm text-white text-xs font-roboto font-medium px-3 py-1.5 rounded-sm cursor-pointer hover:bg-black/80 transition-colors">
              View {totalImages} photos
            </span>
          </div>
        )}

        {/* Nav arrows — appear on hover */}
        {totalImages > 1 && (
          <>
            <button
              onClick={prevImg}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-stone-700 rounded-full cursor-pointer transition-all opacity-0 group-hover:opacity-100 shadow-sm"
              aria-label="Previous image"
            >
              <i className="ri-arrow-left-s-line text-base"></i>
            </button>
            <button
              onClick={nextImg}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-stone-700 rounded-full cursor-pointer transition-all opacity-0 group-hover:opacity-100 shadow-sm"
              aria-label="Next image"
            >
              <i className="ri-arrow-right-s-line text-base"></i>
            </button>
          </>
        )}
      </Link>

      {/* Content */}
      <div className="p-5">
        {/* Category */}
        <p className="text-xs font-roboto font-semibold uppercase tracking-widest text-[#1f1f1f] mb-2">
          {property.category}
        </p>

        {/* Title */}
        <Link to={`/property/${property.slug}`} className="block">
          <h3 className="text-base font-roboto font-medium text-[#011328] leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
            {property.title}
          </h3>
        </Link>

        {/* Location */}
        <p className="flex items-center gap-1 text-sm font-roboto text-stone-400 mb-2">
          <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
            <i className="ri-map-pin-line text-stone-300 text-xs"></i>
          </span>
          {property.location}
        </p>

        {/* Specs row — clean inline */}
        <div className="flex items-center gap-4 mb-3 text-sm font-roboto text-stone-500">
          {property.beds > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-hotel-bed-line text-stone-400 text-xs"></i>
              </span>
              {property.beds} Beds
            </span>
          )}
          {property.baths > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-drop-line text-stone-400 text-xs"></i>
              </span>
              {property.baths} Baths
            </span>
          )}
          {property.parking > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-car-line text-stone-400 text-xs"></i>
              </span>
              {property.parking} Parking
            </span>
          )}
        </div>

        {/* Price */}
        <p className="text-lg font-roboto font-bold text-primary mb-3">
          {property.price}
          {property.priceUnit && <span className="text-xs text-stone-400 font-roboto ml-1">{property.priceUnit}</span>}
        </p>

        {/* Call + Email + Listed date — all in one row */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCall}
              className="flex items-center gap-1.5 text-sm font-roboto font-medium text-stone-700 hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-phone-line text-sm"></i>
              </span>
              <span className="underline underline-offset-2">Call</span>
            </button>
            <button
              onClick={handleEmail}
              className="flex items-center gap-1.5 text-sm font-roboto font-medium text-stone-700 hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-mail-line text-sm"></i>
              </span>
              <span className="underline underline-offset-2">Email</span>
            </button>
          </div>
          <p className="text-sm font-roboto font-medium text-[#005733] capitalize whitespace-nowrap ml-2">
            {formatListedDate(property.listedDays)}
          </p>
        </div>
      </div>
    </div>
  );
}