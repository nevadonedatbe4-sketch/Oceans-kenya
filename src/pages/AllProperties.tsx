import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import QuickViewModal from '@/components/feature/QuickViewModal';
import CompareToolbar from '@/components/feature/CompareToolbar';
import CompareModal from '@/components/feature/CompareModal';
import { useCompareToolbar, type CompareProperty } from '@/hooks/useCompareToolbar';
import { supabase } from '@/lib/supabase';
import { useCurrency } from '@/hooks/useCurrency';
import { formatTimeAgo } from '@/lib/timeAgo';

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
  currency: string;
  image: string;
  images: string[];
  listedDays: number;
  createdAt: string;
  agentPhone?: string;
  agentEmail?: string;
  isLand: boolean;
  isJointVenture: boolean;
}

const PAGE_SIZE = 12;

function toCategoryLabel(cat: string): string {
  return cat.toLowerCase().split(/[_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function buildSlug(id: string, title: string): string {
  if (!title) return id;
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
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
    price: '',
    priceUnit: String(row.purpose || 'sale') === 'rent' ? 'pm' : undefined,
    priceRaw: priceNum,
    currency,
    image: mainImg || (images.length > 0 ? images[0] : fallbackImg),
    images: mainImg ? [mainImg, ...images] : images.length > 0 ? images : [fallbackImg],
    listedDays,
    createdAt: String(row.created_at || new Date().toISOString()),
    agentPhone: String(row.owner_phone || ''),
    agentEmail: String(row.owner_email || ''),
    isLand: (String(row.property_type || '')).toLowerCase() === 'land',
    isJointVenture: (String(row.sub_type || '')).toLowerCase() === 'joint_venture',
  };
}

export default function AllProperties() {
  const { format } = useCurrency();
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'rent'>(() => {
    try { return (localStorage.getItem('ap_filter_type') as 'all' | 'sale' | 'rent') || 'all'; } catch { return 'all'; }
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    try { return localStorage.getItem('ap_search_query') || ''; } catch { return ''; }
  });
  const [sortBy, setSortBy] = useState(() => {
    try { return localStorage.getItem('ap_sort_by') || 'newest'; } catch { return 'newest'; }
  });
  const [selectedNeighbourhood, setSelectedNeighbourhood] = useState(() => {
    try { return localStorage.getItem('ap_neighbourhood') || 'All'; } catch { return 'All'; }
  });
  const [neighbourhoodNames, setNeighbourhoodNames] = useState<string[]>([]);
  const [listings, setListings] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [recentlyViewed, setRecentlyViewed] = useState<Property[]>([]);
  const [quickViewProperty, setQuickViewProperty] = useState<Property | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('saved_properties');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });
  const compare = useCompareToolbar();
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Persist search filters to localStorage
  useEffect(() => {
    try { localStorage.setItem('ap_filter_type', filterType); } catch { /* ignore */ }
    try { localStorage.setItem('ap_search_query', searchQuery); } catch { /* ignore */ }
    try { localStorage.setItem('ap_sort_by', sortBy); } catch { /* ignore */ }
    try { localStorage.setItem('ap_neighbourhood', selectedNeighbourhood); } catch { /* ignore */ }
  }, [filterType, searchQuery, sortBy, selectedNeighbourhood]);

  // Load recently viewed from localStorage — try stored objects first, then Supabase for real listings
  useEffect(() => {
    let cancelled = false;

    // First try: stored full-object entries (recently_viewed_devs) — instant, no network needed
    try {
      const devsRaw = localStorage.getItem('recently_viewed_devs');
      if (devsRaw) {
        const devs: Record<string, unknown>[] = JSON.parse(devsRaw);
        if (devs.length > 0) {
          const mapped = devs.slice(0, 8).map((obj) => ({
            id: String(obj.id || ''),
            slug: String(obj.slug || ''),
            title: String(obj.name || obj.title || ''),
            location: String(obj.location || 'Nairobi'),
            type: 'sale' as const,
            category: '',
            beds: 0,
            baths: 0,
            parking: 0,
            price: '',
            priceUnit: undefined,
            priceRaw: Number(obj.priceRaw ?? obj.price ?? 0),
            currency: String(obj.currency || 'KES'),
            image: String(obj.image || ''),
            images: obj.image ? [String(obj.image)] : [],
            listedDays: 0,
            createdAt: String(obj.timestamp || ''),
            agentPhone: '',
            agentEmail: '',
            isLand: false,
            isJointVenture: false,
          }));
          if (!cancelled) setRecentlyViewed(mapped);
        }
      }
    } catch { /* ignore */ }

    // Second try: enrich with full Supabase data for real listings
    try {
      const stored = localStorage.getItem('recently_viewed_properties');
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        const realIds = ids.filter((id) => !id.startsWith('mock-')).slice(0, 8);
        if (realIds.length > 0) {
          supabase
            .from('listings')
            .select('id,title,location,price,property_type,bedrooms,bathrooms,parking,slug,created_at,main_image,images,purpose,currency,owner_phone,owner_email')
            .in('id', realIds)
            .then(({ data }) => {
              if (!cancelled && data) setRecentlyViewed(((data || []) as Record<string, unknown>[]).map(mapRow));
            })
            .catch(() => {});
        }
      }
    } catch { /* ignore */ }

    return () => { cancelled = true; };
  }, []);

  // Load neighbourhood names from DB for filter tabs
  useEffect(() => {
    supabase
      .from('neighbourhoods')
      .select('name')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setNeighbourhoodNames((data as { name: string }[]).map((n) => n.name));
        }
      })
      .catch(() => {});
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
    localStorage.removeItem('recently_viewed_devs');
    setRecentlyViewed([]);
  };

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

      if (selectedNeighbourhood !== 'All') {
        query = query.ilike('location', `%${selectedNeighbourhood}%`);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%`);
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
  }, [filterType, searchQuery, sortBy, page, selectedNeighbourhood]);

  useEffect(() => {
    fetchListings(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, searchQuery, sortBy, selectedNeighbourhood]);

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

      {/* === MAIN CONTENT === */}
      <main className="flex-1 px-5 md:px-10 py-8 pb-24 max-w-7xl mx-auto w-full">
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Listings column */}
          <div className="lg:w-[75%] xl:w-[78%] min-w-0">
        {/* Neighbourhood Tabs */}
        <div className="mb-8 overflow-x-auto no-scrollbar border-b-2 border-stone-300">
          <div className="flex items-center gap-0 min-w-max">
            {['All', ...neighbourhoodNames].map((area) => (
              <button
                key={area}
                onClick={() => { setSelectedNeighbourhood(area); setPage(0); }}
                className={`px-5 py-3.5 text-xs font-roboto font-semibold uppercase tracking-widest whitespace-nowrap transition-all cursor-pointer border-b-2 -mb-px ${
                  selectedNeighbourhood === area
                    ? 'border-primary text-primary'
                    : 'border-transparent text-stone-400 hover:text-primary hover:border-gray-300'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

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

        {/* Property Cards — grid matching Zoopla development card proportions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block lg:w-[25%] xl:w-[22%]">
            <div className="sticky top-[140px] space-y-3">
              {recentlyViewed.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-xs font-roboto font-semibold text-primary flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-time-line text-[10px]"></i>
                      </span>
                      Recently Viewed
                    </h3>
                    <button
                      onClick={clearRecentlyViewed}
                      className="text-[10px] font-roboto text-gray-400 hover:text-gray-600 cursor-pointer whitespace-nowrap"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="px-3 py-2 space-y-2">
                    {recentlyViewed.slice(0, 4).map((p) => (
                      <div key={p.id} className="group">
                        <Link
                          to={`/property/${p.slug}`}
                          className="flex items-center gap-2.5 cursor-pointer"
                        >
                          <div className="w-14 h-10 flex-shrink-0 overflow-hidden rounded">
                            <img
                              src={p.image}
                              alt={p.title}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-roboto font-semibold text-[#002349] group-hover:text-primary transition-colors truncate">
                              {format(p.priceRaw, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                            </p>
                            <p className="text-[10px] font-roboto text-gray-500 truncate">{p.title}</p>
                          </div>
                        </Link>
                        <div className="flex items-center justify-between mt-1 pl-[66px]">
                          <button
                            onClick={() => {
                              const cp: CompareProperty = {
                                id: p.id, slug: p.slug, title: p.title,
                                location: p.location, type: p.type, category: p.category,
                                beds: p.beds, baths: p.baths, parking: p.parking,
                                rawPrice: p.priceRaw, currency: p.currency, image: p.image,
                              };
                              compare.toggleCompare(cp);
                            }}
                            className={`text-[10px] font-roboto cursor-pointer whitespace-nowrap transition-colors ${
                              compare.isSelected(p.id)
                                ? 'text-primary font-semibold'
                                : 'text-gray-400 hover:text-primary'
                            }`}
                          >
                            <span className="w-3 h-3 inline-flex items-center justify-center mr-0.5">
                              <i className={`${compare.isSelected(p.id) ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'} text-[10px]`}></i>
                            </span>
                            {compare.isSelected(p.id) ? 'Added' : 'Compare'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2.5">
                  <p className="text-[10px] font-roboto text-gray-400 uppercase tracking-wider mb-0.5">Search Filters Saved</p>
                  <p className="text-xs font-roboto text-gray-600 leading-relaxed">
                    Your filters are remembered. Return anytime to pick up where you left off.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2.5 border-b border-gray-100">
                  <h3 className="text-xs font-roboto font-semibold text-primary">Quick Links</h3>
                </div>
                <div className="px-3 py-2 space-y-1.5">
                  <Link to="/buy" className="flex items-center gap-2 text-xs font-roboto text-gray-600 hover:text-primary transition-colors cursor-pointer">
                    <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-home-line text-[10px]"></i></span>
                    Properties for Sale
                  </Link>
                  <Link to="/rent" className="flex items-center gap-2 text-xs font-roboto text-gray-600 hover:text-primary transition-colors cursor-pointer">
                    <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-key-line text-[10px]"></i></span>
                    Properties for Rent
                  </Link>
                  <Link to="/new-developments" className="flex items-center gap-2 text-xs font-roboto text-gray-600 hover:text-primary transition-colors cursor-pointer">
                    <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-building-4-line text-[10px]"></i></span>
                    New Developments
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CompareToolbar
        selected={compare.selected}
        onRemove={compare.removeFromCompare}
        onClearAll={compare.clearAll}
        onCompare={() => setShowCompareModal(true)}
      />

      <CompareModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        properties={compare.selected}
        onRemove={compare.removeFromCompare}
      />

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
          rawPrice: quickViewProperty.priceRaw,
          currency: quickViewProperty.currency,
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

/* ── Property Card Skeleton — Zoopla dev-card proportions ── */
function PropertyCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      <div className="aspect-[645/430] w-full bg-stone-200"></div>
      <div className="p-4 space-y-3">
        <div className="h-5 w-2/3 bg-stone-200 rounded"></div>
        <div className="h-4 w-1/2 bg-stone-200 rounded"></div>
        <div className="h-4 w-3/4 bg-stone-200 rounded"></div>
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-16 bg-stone-200 rounded-full"></div>
          <div className="h-6 w-20 bg-stone-200 rounded-full"></div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-stone-100">
          <div className="h-4 w-14 bg-stone-200 rounded"></div>
          <div className="h-4 w-20 bg-stone-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

/* ── Luxury Property Card — Zoopla dev-card vertical style ── */
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
  const { format } = useCurrency();
  const [imgIdx, setImgIdx] = useState(0);
  const totalImages = property.images.length;
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToImg = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = (idx + totalImages) % totalImages;
    el.scrollTo({ left: el.clientWidth * clamped, behavior: 'smooth' });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== imgIdx) setImgIdx(idx);
  };

  const nextImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (totalImages > 1) scrollToImg(imgIdx + 1);
  };

  const prevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (totalImages > 1) scrollToImg(imgIdx - 1);
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
    <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200 group">
      {/* ── Image — Zoopla 645×430 ratio ── */}
      <div className="relative aspect-[645/430] w-full overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
        >
          {(property.images.length > 0 ? property.images : [property.image]).map((src, i) => (
            <Link
              key={i}
              to={`/property/${property.slug}`}
              className="block w-full h-full flex-shrink-0 snap-center snap-always"
              draggable={false}
            >
              <img
                src={src}
                alt={property.title}
                draggable={false}
                className="w-full h-full object-cover object-top pointer-events-none select-none"
              />
            </Link>
          ))}
        </div>

        {/* Nav arrows */}
        {totalImages > 1 && (
          <>
            <button
              onClick={prevImg}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/85 hover:bg-white text-primary rounded-sm cursor-pointer transition-all duration-150 shadow-sm active:scale-90 opacity-0 group-hover:opacity-100"
            >
              <i className="ri-arrow-left-s-line text-base"></i>
            </button>
            <button
              onClick={nextImg}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/85 hover:bg-white text-primary rounded-sm cursor-pointer transition-all duration-150 shadow-sm active:scale-90 opacity-0 group-hover:opacity-100"
            >
              <i className="ri-arrow-right-s-line text-base"></i>
            </button>
          </>
        )}

        {/* Dot indicators */}
        {totalImages > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
            {property.images.slice(0, 6).map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollToImg(i); }}
                className={`rounded-full transition-all duration-200 cursor-pointer ${
                  i === imgIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/90'
                }`}
                aria-label={`Image ${i + 1}`}
              ></button>
            ))}
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          <span className="inline-block text-[10px] font-roboto font-semibold uppercase tracking-wider px-2.5 py-1 text-white bg-[#088135]">
            {property.type === 'sale' ? 'For Sale' : 'For Rent'}
          </span>
          {property.isJointVenture && (
            <span className="inline-block text-[10px] font-roboto font-semibold uppercase tracking-wider px-2.5 py-1 text-white bg-[#2B5B3C]">
              Joint Venture
            </span>
          )}
        </div>

        {/* Save / Heart button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(property.id);
          }}
          className={`absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-colors ${isSaved ? 'bg-primary text-white' : 'bg-black/40 hover:bg-black/60 text-white'}`}
          aria-label={isSaved ? 'Remove from saved' : 'Save property'}
        >
          <i className={`${isSaved ? 'ri-heart-fill' : 'ri-heart-line'} text-sm`}></i>
        </button>

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
      </div>

      {/* ── Content — Zoopla dev-card content style ── */}
      <div className="p-4 md:p-5 flex flex-col">
        {/* Price */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm md:text-base font-roboto font-semibold text-[#011328]">
              {format(property.priceRaw, property.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
            </span>
            {property.type === 'rent' ? (
              <span className="text-sm md:text-base font-roboto font-semibold text-[#011328]">pcm</span>
            ) : (
              <span className="text-xs font-roboto text-[#636363]">Guide Price</span>
            )}
          </div>
          <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-roboto font-semibold uppercase tracking-wider bg-[#f0f4e8] text-[#4a6b2a] rounded-full">
            {property.category}
          </span>
        </div>

        {/* Location */}
        <p className="text-xs font-roboto text-[#636363] mb-1.5 flex items-center gap-1">
          <span className="w-3 h-3 flex items-center justify-center">
            <i className="ri-map-pin-line text-golden text-[10px]"></i>
          </span>
          {property.location}
        </p>

        {/* Title */}
        <Link to={`/property/${property.slug}`} className="block hover:underline mb-2">
          <h3 className="text-sm md:text-base font-roboto font-semibold text-[#011328] leading-snug line-clamp-2">
            {property.title}
          </h3>
        </Link>

        {/* Beds | Baths | Parking */}
        <p className="text-xs md:text-sm font-roboto text-[#363535] mb-3">
          {property.beds > 0 && <>{property.beds} {property.beds === 1 ? 'bed' : 'beds'}</>}
          {property.baths > 0 && <> | {property.baths} {property.baths === 1 ? 'bath' : 'baths'}</>}
          {property.parking > 0 && <> | <span className="w-3.5 h-3.5 inline-flex items-center justify-center align-middle"><i className="ri-car-line text-xs"></i></span> {property.parking} {property.parking === 1 ? 'parking space' : 'parking spaces'}</>}
        </p>

        {/* Footer: actions + date */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-gray-200 mt-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCall}
              className="flex items-center gap-1.5 text-xs font-roboto font-medium text-gray-600 hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-phone-line text-sm"></i>
              </span>
              <span className="underline underline-offset-2">Call</span>
            </button>
            <button
              onClick={handleEmail}
              className="flex items-center gap-1.5 text-xs font-roboto font-medium text-gray-600 hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-mail-line text-sm"></i>
              </span>
              <span className="underline underline-offset-2">Email</span>
            </button>
          </div>
          <p className="text-xs font-roboto font-semibold text-[#00703c] whitespace-nowrap">
            {formatTimeAgo(property.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}