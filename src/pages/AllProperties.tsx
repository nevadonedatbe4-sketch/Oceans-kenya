import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import QuickViewModal from '@/components/feature/QuickViewModal';
import PropertyBadge from '@/components/feature/PropertyBadge';
import PropertyMetaBadges from '@/components/feature/PropertyMetaBadges';
import CompareToolbar from '@/components/feature/CompareToolbar';
import CompareModal from '@/components/feature/CompareModal';
import PageLoader from '@/components/feature/PageLoader';
import { useCompareToolbar, type CompareProperty } from '@/hooks/useCompareToolbar';
import { supabase } from '@/lib/supabase';
import { getPropertySpecs } from '@/lib/propertySpecs';
import { useCurrency } from '@/hooks/useCurrency';
import { formatTimeAgo } from '@/lib/timeAgo';
import { formatLocation, formatLocationParts, formatAreaName, smartTitleCase } from '@/lib/location';
import LocationSearch, { type LocationSuggestion } from '@/components/feature/LocationSearch';
import Pagination from '@/components/feature/Pagination';

interface Property {
  id: string;
  slug: string;
  title: string;
  location: string;
  locationLine1?: string;
  locationLine2?: string;
  area?: string;
  type: 'sale' | 'rent';
  category: string;
  propertyType: string;
  beds: number;
  baths: number;
  parking: number;
  sqft: number;
  landSize: number;
  acreage: number;
  landUnit?: string;
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
  featured: boolean;
  justListed?: boolean;
  newHome?: boolean;
  reduced?: boolean;
  refurbished?: boolean;
  backOnMarket?: boolean;
  propertyOfTheWeek?: boolean;
  isNewDevelopment?: boolean;
  propertyCategory?: string;
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
  const title = smartTitleCase(String(row.title || 'Untitled Property'));
  const slug = String(row.slug || buildSlug(String(row.id), title));
  const mainImg = String(row.main_image || '');
  const images = (row.images as string[] | null) || [];
  const fallbackImg = 'https://readdy.ai/api/search-image?query=Modern%20luxury%20real%20estate%20property%20exterior%20with%20clean%20white%20walls%20large%20windows%20bright%20daylight%20architectural%20photography%20high%20quality%20warm%20neutral%20background&width=800&height=600&seq=ap-fallback-v2&orientation=landscape';

  const priceNum = Number(row.price || 0);
  const currency = String(row.currency || 'KES');

  const created = new Date(String(row.created_at || Date.now()));
  const listedDays = Math.floor((Date.now() - created.getTime()) / 86400000);

  const locationParts = formatLocationParts({
    address: row.address as string | null,
    neighbourhood: row.neighbourhood as string | null,
    location: String(row.location || ''),
    city: row.city as string | null,
    state_region: row.state_region as string | null,
    country: row.country as string | null,
  });

  return {
    id: String(row.id),
    slug,
    title,
    location: formatLocation({
      address: row.address as string | null,
      neighbourhood: row.neighbourhood as string | null,
      location: String(row.location || ''),
      city: row.city as string | null,
      state_region: row.state_region as string | null,
    }),
    locationLine1: locationParts.line1,
    locationLine2: locationParts.line2,
    area: formatAreaName({
      address: row.address as string | null,
      neighbourhood: row.neighbourhood as string | null,
      location: String(row.location || ''),
      city: row.city as string | null,
    }),
    type: String(row.purpose || 'sale') === 'rent' ? 'rent' : 'sale',
    category: toCategoryLabel(String(row.property_type || 'house')),
    propertyType: String(row.property_type || ''),
    beds: Number(row.bedrooms ?? 0),
    baths: Number(row.bathrooms ?? 0),
    parking: Number(row.parking ?? 0),
    sqft: Number(row.sqft ?? 0),
    landSize: Number(row.land_size ?? 0),
    acreage: Number(row.acreage ?? 0),
    landUnit: row.land_unit ? String(row.land_unit) : undefined,
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
    featured: Boolean(row.is_featured),
    justListed: listedDays <= 3,
    newHome: Boolean(row.new_home),
    reduced: Boolean(row.reduced_price),
    refurbished: Boolean(row.refurbished),
    backOnMarket: Boolean(row.back_on_market),
    propertyOfTheWeek: Boolean(row.property_of_the_week),
    isNewDevelopment: Boolean(row.is_new_development),
    propertyCategory: String(row.property_category || ''),
  };
}

export default function AllProperties() {
  const { format } = useCurrency();
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'rent'>(() => {
    try { return (localStorage.getItem('ap_filter_type') as 'all' | 'sale' | 'rent') || 'all'; } catch { return 'all'; }
  });
  const [filterCategory, setFilterCategory] = useState<'all' | 'residential' | 'commercial' | 'land' | 'joint_venture' | 'new_development'>(() => {
    try { return (localStorage.getItem('ap_filter_category') as 'all' | 'residential' | 'commercial' | 'land' | 'joint_venture' | 'new_development') || 'all'; } catch { return 'all'; }
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    try { return localStorage.getItem('ap_search_query') || ''; } catch { return ''; }
  });
  const handleLocationChange = (value: string) => {
    setSearchQuery(value);
  };

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
  const areaScrollRef = useRef<HTMLDivElement>(null);
  const scrollAreas = useCallback((dir: 'left' | 'right') => {
    const el = areaScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -480 : 480, behavior: 'smooth' });
  }, []);

  // Persist search filters to localStorage
  useEffect(() => {
    try { localStorage.setItem('ap_filter_type', filterType); } catch { /* ignore */ }
    try { localStorage.setItem('ap_filter_category', filterCategory); } catch { /* ignore */ }
    try { localStorage.setItem('ap_search_query', searchQuery); } catch { /* ignore */ }
    try { localStorage.setItem('ap_sort_by', sortBy); } catch { /* ignore */ }
    try { localStorage.setItem('ap_neighbourhood', selectedNeighbourhood); } catch { /* ignore */ }
  }, [filterType, filterCategory, searchQuery, sortBy, selectedNeighbourhood]);

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
            location: String(obj.location || ''),
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
            featured: false,
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
            .select('id,title,location,address,neighbourhood,city,state_region,is_featured,country,price,property_type,sub_type,bedrooms,bathrooms,parking,sqft,land_size,acreage,land_unit,slug,created_at,main_image,images,purpose,currency,owner_phone,owner_email,property_of_the_week,new_home,refurbished,reduced_price,back_on_market')
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

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('listings')
        .select('id,title,location,address,neighbourhood,city,state_region,is_featured,country,price,property_type,sub_type,bedrooms,bathrooms,parking,sqft,land_size,acreage,land_unit,slug,created_at,main_image,images,purpose,currency,owner_phone,owner_email,is_new_development,property_category,property_of_the_week,new_home,refurbished,reduced_price,back_on_market', { count: 'exact' })
        .eq('is_published', true)
        .neq('title', '')
        .gt('price', 0)
        .in('status', ['available', 'under_contract']);

      if (filterType !== 'all') {
        query = query.eq('purpose', filterType);
      }

      if (filterCategory === 'new_development') {
        query = query.eq('is_new_development', true);
      } else if (filterCategory !== 'all') {
        query = query.eq('property_category', filterCategory).neq('is_new_development', true);
      }

      if (selectedNeighbourhood !== 'All') {
        query = query.eq('neighbourhood', selectedNeighbourhood);
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

      query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data, error: dbError, count } = await query;
      if (dbError) throw dbError;

      const mapped = ((data || []) as Record<string, unknown>[]).map(mapRow);
      setListings(mapped);

      const total = count || 0;
      setTotalCount(total);
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load properties');
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterCategory, searchQuery, sortBy, page, selectedNeighbourhood]);

  useEffect(() => {
    fetchListings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchListings]);

  const handleSearch = () => {
    setPage(1);
  };

  const headingText = filterCategory === 'commercial'
    ? 'Commercial Properties'
    : filterCategory === 'land'
      ? 'Land & Plots'
      : filterCategory === 'joint_venture'
        ? 'Joint Venture Opportunities'
        : filterCategory === 'new_development'
          ? 'New Developments'
          : filterType === 'rent'
            ? 'Luxury Homes for Rent'
            : filterType === 'sale'
              ? 'Luxury Homes for Sale'
              : 'Luxury Homes';

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col pt-[88px] md:pt-[96px] pb-16 md:pb-0">
      <Header />

      {/* === BREADCRUMBS === */}
      <div className="bg-white border-b border-stone-100">
        <div className="px-5 md:px-10 max-w-7xl mx-auto">
          <nav className="flex items-center gap-1.5 py-3 text-xs font-roboto text-primary/50">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="w-3 h-3 flex items-center justify-center">
              <i className="ri-arrow-right-s-line text-stone-300"></i>
            </span>
            <span className="text-primary/70">Properties</span>
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
              <span className="text-sm font-roboto text-primary/70">
                {loading && listings.length === 0 ? (
                  <span className="inline-block w-16 h-4 bg-stone-200 rounded animate-pulse"></span>
                ) : (
                  <><span className="text-primary font-semibold">{totalCount}</span> listings</>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary/50 font-roboto hidden sm:inline">Sort:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                    className="appearance-none border border-primary/50 rounded-sm pl-3 pr-8 py-2 text-xs font-roboto font-medium text-primary focus:outline-none focus:border-primary cursor-pointer bg-white hover:border-primary transition-colors"
                  >
                    <option value="newest">Newest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-primary/60 text-xs pointer-events-none"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === SEARCH + FILTER BAR === */}
      <div className="bg-white border-b border-stone-100">
        <div className="px-5 md:px-10 py-3 max-w-7xl mx-auto">
          <div className="flex items-stretch gap-[2px]">
            <LocationSearch
              value={searchQuery}
              onChange={handleLocationChange}
              className="flex-1 min-w-0"
              placeholderCycle={[
                "Looking for your dream property...",
                "Looking for your dream property...",
                "Looking for an investment opportunity...",
                "Looking for a luxury residence...",
              ]}
            />
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 h-11 px-5 bg-primary text-white border-2 border-primary text-sm font-roboto font-semibold rounded-[4px] hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-search-line text-sm"></i>
              </span>
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          {/* Filter tabs — All / Sale / Rent */}
          <div className="mt-3 md:mt-4">
            <div className="flex items-center gap-1 sm:gap-2">
              {(['all', 'sale', 'rent'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => { setFilterType(type); setPage(1); }}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-roboto font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer border-2 ${
                    filterType === type
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-primary border-primary/30 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  {type === 'all' ? 'All Properties' : type === 'sale' ? 'For Sale' : 'For Rent'}
                </button>
              ))}
            </div>
            {/* Category filter tabs — universal search */}
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap mt-2">
              {([
                { key: 'all', label: 'All Categories' },
                { key: 'residential', label: 'Residential' },
                { key: 'commercial', label: 'Commercial' },
                { key: 'land', label: 'Land' },
                { key: 'joint_venture', label: 'Joint Ventures' },
                { key: 'new_development', label: 'New Developments' },
              ] as const).map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => { setFilterCategory(cat.key); setPage(1); }}
                  className={`px-4 py-2 text-xs sm:text-sm font-roboto font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer rounded-full border ${
                    filterCategory === cat.key
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-primary border-primary/30 hover:border-accent hover:text-accent'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* === MAIN CONTENT === */}
      <main className="flex-1 px-5 md:px-10 py-8 pb-24 max-w-7xl mx-auto w-full">
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Listings column */}
          <div className="lg:w-[75%] xl:w-[78%] min-w-0">
        {/* Neighbourhood Tabs — slideable to show all areas */}
        <div className="mb-8">
          <div className="flex items-stretch gap-1">
            <button
              onClick={() => scrollAreas('left')}
              className="self-center flex-shrink-0 w-8 h-8 flex items-center justify-center border-2 border-primary/30 text-primary hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
              aria-label="Previous areas"
            >
              <i className="ri-arrow-left-s-line text-base"></i>
            </button>
            <div ref={areaScrollRef} className="flex-1 min-w-0 overflow-x-auto no-scrollbar border-b-2 border-stone-300">
              <div className="flex items-center gap-0 min-w-max">
                {['All', ...neighbourhoodNames].map((area) => (
                  <button
                    key={area}
                    onClick={() => { setSelectedNeighbourhood(area); setPage(1); }}
                    className={`px-5 py-3.5 text-xs font-roboto font-semibold uppercase tracking-widest whitespace-nowrap transition-all cursor-pointer border-b-2 -mb-px ${
                      selectedNeighbourhood === area
                        ? 'border-primary text-primary'
                        : 'border-transparent text-primary/50 hover:text-primary hover:border-gray-300'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => scrollAreas('right')}
              className="self-center flex-shrink-0 w-8 h-8 flex items-center justify-center border-2 border-primary/30 text-primary hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
              aria-label="Next areas"
            >
              <i className="ri-arrow-right-s-line text-base"></i>
            </button>
          </div>
        </div>

        {error && !loading && (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center bg-red-50 rounded-full">
              <i className="ri-error-warning-line text-xl text-red-400"></i>
            </div>
            <p className="text-sm text-primary/70 mb-4">{error}</p>
            <button onClick={() => fetchListings(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
              <i className="ri-refresh-line"></i>Try Again
            </button>
          </div>
        )}

        {!error && listings.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-stone-100 rounded-full">
              <i className="ri-search-line text-2xl text-primary/50"></i>
            </div>
            <p className="font-roboto font-bold text-primary text-xl mb-2">No properties found</p>
            <p className="text-sm font-roboto text-primary/50">Try adjusting your filters or search query</p>
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
            <PageLoader size={24} />
            <span className="text-sm font-roboto text-primary/50">Loading properties...</span>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block lg:w-[25%] xl:w-[22%]">
            <div className="sticky top-[140px] space-y-3">
              {recentlyViewed.length > 0 && (
                <div className="bg-white border border-primary/12 rounded-lg overflow-hidden">
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
                              className="w-full h-full object-cover object-center"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-roboto font-semibold text-primary group-hover:text-primary transition-colors truncate">
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
                            className={`inline-flex items-center gap-1.5 text-[10px] font-roboto font-bold uppercase tracking-wide whitespace-nowrap underline underline-offset-2 decoration-2 transition-colors cursor-pointer ${
                              compare.isSelected(p.id)
                                ? 'text-accent decoration-accent'
                                : 'text-accent/80 decoration-accent/50 hover:text-accent hover:decoration-accent'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 flex items-center justify-center">
                              <i className={`${compare.isSelected(p.id) ? 'ri-scales-fill' : 'ri-scales-line'} text-sm`}></i>
                            </span>
                            {compare.isSelected(p.id) ? 'Added' : 'Compare'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-primary/12 rounded-lg overflow-hidden">
                <div className="px-3 py-2.5">
                  <p className="text-[10px] font-roboto text-gray-400 uppercase tracking-wider mb-0.5">Search Filters Saved</p>
                  <p className="text-xs font-roboto text-gray-600 leading-relaxed">
                    Your filters are remembered. Return anytime to pick up where you left off.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-primary/12 rounded-lg overflow-hidden">
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
    <div className="bg-white rounded-lg overflow-hidden animate-pulse">
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
  const touchStartRef = useRef(0);
  const touchEndRef = useRef(0);
  const totalImages = property.images.length;

  const nextImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (totalImages > 1) setImgIdx((prev) => (prev + 1) % totalImages);
  };

  const prevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (totalImages > 1) setImgIdx((prev) => (prev - 1 + totalImages) % totalImages);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (totalImages <= 1) return;
    const diff = touchStartRef.current - touchEndRef.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) setImgIdx((prev) => (prev + 1) % totalImages);
      else setImgIdx((prev) => (prev - 1 + totalImages) % totalImages);
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const phone = property.agentPhone || '+2547111393806';
    window.open(`tel:${phone}`, '_self');
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const email = property.agentEmail || 'ask@oceanske.com';
    window.open(`mailto:${email}?subject=Inquiry about ${encodeURIComponent(property.title)}`, '_self');
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] hover:shadow-md transition-all duration-200 group">
      {/* ── Image — Zoopla 645×430 ratio ── */}
      <div
        className="relative aspect-[645/430] w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Link
          to={`/property/${property.slug}`}
          className="flex h-full transition-transform duration-200 ease-out will-change-transform"
          style={{ transform: `translateX(-${imgIdx * 100}%)` }}
        >
          {(property.images.length > 0 ? property.images : [property.image]).map((src, i) => (
            <img
              key={i}
              src={src}
              alt={property.title}
              draggable={false}
              loading={i === 0 ? undefined : "lazy"}
              className="w-full h-full object-cover object-center flex-shrink-0 transition-transform duration-700 group-hover:scale-105 pointer-events-none select-none"
            />
          ))}
        </Link>

        {/* Nav arrows */}
        {totalImages > 1 && (
          <>
            <button
              onClick={prevImg}
              className="absolute left-1.5 md:left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-white/90 text-[#002349] hover:bg-white transition-all duration-150 cursor-pointer whitespace-nowrap opacity-100 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Previous image"
            >
              <i className="ri-arrow-left-s-line text-base md:text-lg"></i>
            </button>
            <button
              onClick={nextImg}
              className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-white/90 text-[#002349] hover:bg-white transition-all duration-150 cursor-pointer whitespace-nowrap opacity-100 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Next image"
            >
              <i className="ri-arrow-right-s-line text-base md:text-lg"></i>
            </button>
          </>
        )}

        {/* Status badge — category first, status second */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          <PropertyBadge variant={property.isNewDevelopment ? 'new-development' : property.type === 'sale' ? 'sale' : 'rent'} />
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
        <PropertyMetaBadges
          featured={property.featured}
          jointVenture={property.isJointVenture}
          justListed={property.justListed}
          newHome={property.newHome}
          reduced={property.reduced}
          refurbished={property.refurbished}
          backOnMarket={property.backOnMarket}
          propertyOfTheWeek={property.propertyOfTheWeek}
          className="mb-2"
        />
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
        </div>

        {/* Location */}
        <p className="flex items-start gap-1.5 mb-1.5">
          <span className="w-3 h-3 flex items-center justify-center mt-0.5">
            <i className="ri-map-pin-line text-golden text-[10px]"></i>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-roboto font-semibold text-[#011328] leading-snug">
              {property.area || property.location}
            </span>
          </span>
        </p>

        {/* Title */}
        <Link to={`/property/${property.slug}`} className="block hover:underline mb-2">
          <h3 className="text-sm md:text-base font-roboto font-semibold text-[#011328] leading-snug line-clamp-2">
            {property.title}
          </h3>
        </Link>

        {/* Beds | Baths | Parking */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm font-roboto text-[#363535] mb-3">
          {getPropertySpecs(property.propertyType, {
            beds: property.beds,
            baths: property.baths,
            parking: property.parking,
            sqft: property.sqft,
            acreage: property.acreage,
            landSize: property.landSize,
            landUnit: property.landUnit,
          }).map((spec) => (
            <span key={spec.key} className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 flex items-center justify-center"><i className={`${spec.icon} text-xs`}></i></span>
              {spec.label}
            </span>
          ))}
        </div>

        {/* Footer: actions + date */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-primary/12 mt-auto">
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