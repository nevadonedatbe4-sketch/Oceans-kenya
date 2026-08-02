import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import ContactAgentModal from '@/components/feature/ContactAgentModal';
import QuickViewModal from '@/components/feature/QuickViewModal';
import CompareToolbar from '@/components/feature/CompareToolbar';
import CompareModal from '@/components/feature/CompareModal';
import { useCompareToolbar, type CompareProperty } from '@/hooks/useCompareToolbar';
import { useListings, type MappedListing, type ListingFilters } from '@/hooks/useListings';
import AdvancedFilters, { defaultFilters, FilterState } from '@/pages/Rent/components/AdvancedFilters';
import { usePropertyPageSettings } from '@/hooks/usePropertyPageSettings';
import ListingHero from '@/components/feature/ListingHero';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/lib/supabase';
import { formatTimeAgo } from '@/lib/timeAgo';

const ITEMS_PER_PAGE = 10;

// KES base ranges used for DB filtering — labels generated dynamically per currency
const KES_SALE_RANGES: { key: string; min?: number; max?: number }[] = [
  { key: 'any' },
  { key: 'under_10m', max: 10_000_000 },
  { key: '10m_30m', min: 10_000_000, max: 30_000_000 },
  { key: '30m_50m', min: 30_000_000, max: 50_000_000 },
  { key: '50m_100m', min: 50_000_000, max: 100_000_000 },
  { key: '100m_200m', min: 100_000_000, max: 200_000_000 },
  { key: 'over_200m', min: 200_000_000 },
];

function fmtPriceKes(kes: number, curr: string, rates: Record<string, number>): string {
  const SYMS: Record<string, string> = { KES: 'KES', USD: '$', GBP: '£', EUR: '€', UGX: 'UGX', AED: 'AED', ZAR: 'R' };
  const sym = SYMS[curr] || curr;
  const rate = curr === 'KES' ? 1 : (rates[curr] || 0.0077);
  const val = curr === 'KES' ? kes : Math.round(kes * rate);
  if (val >= 1_000_000) { const m = val / 1_000_000; return `${sym} ${m >= 100 ? Math.round(m) : (Number.isInteger(m) ? m : m.toFixed(1))}M`; }
  if (val >= 1_000) return `${sym} ${Math.round(val / 1_000)}K`;
  return `${sym} ${val.toLocaleString()}`;
}
const bedOptions = ['Any beds', 'Studio', '1+', '2+', '3+', '4+', '5+'];
const propTypeOptions = ['Any type', 'House', 'Flat / Apartment', 'Bungalow', 'Studio', 'Maisonette', 'Villa', 'Townhouse', 'Penthouse', 'Detached', 'Semi-detached', 'Terraced', 'Land'];
const addedOptions = ['Anytime', 'Last 24 hours', 'Last 3 days', 'Last 7 days', 'Last 14 days'];
const sortOptions = ['Most recent', 'Highest price', 'Lowest price', 'Most reduced', 'Most popular'];
const radiusOptions = ['This area only', '½ mile', '1 mile', '3 miles', '5 miles', '10 miles', '15 miles', '20 miles', '30 miles', '40 miles'];

const nearbyAreas = [
  'Karen', 'Runda', 'Lavington', 'Kilimani', 'Westlands', 'Kileleshwa',
  'Muthaiga', 'Parklands', 'Riverside', 'Gigiri', 'Spring Valley', 'Nyari',
  'Langata', 'Kiserian', 'Ongata Rongai', 'Ngong', 'Kitengela', 'Athi River',
];

const relatedSearches = [
  'New homes for sale in Nairobi',
  'Properties for sale in Nairobi',
  'Explore house prices in Nairobi',
  'Find estate agents in Nairobi',
  'Commercial properties for sale in Nairobi',
  'Studios for sale in Nairobi',
  'Houses for sale in Nairobi',
  'Furnished apartments for sale in Nairobi',
];

export default function Buy() {
  const { hero } = usePropertyPageSettings('buy');
  const { getSite } = useSiteSettings();
  const sitePhone = getSite('contact_phone') || '+254712345678';
  const telHref = `tel:${sitePhone.replace(/[^+\d]/g, '')}`;
  const [searchQuery, setSearchQuery] = useState(() => { try { return localStorage.getItem('buy_search') || 'Nairobi'; } catch { return 'Nairobi'; } });
  const [debouncedSearch, setDebouncedSearch] = useState(() => { try { return localStorage.getItem('buy_search') || 'Nairobi'; } catch { return 'Nairobi'; } });
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  };

  const [selectedRadius, setSelectedRadius] = useState(() => { try { return localStorage.getItem('buy_radius') || 'This area only'; } catch { return 'This area only'; } });
  const [selectedPrice, setSelectedPrice] = useState(() => { try { return localStorage.getItem('buy_price') || 'Any price'; } catch { return 'Any price'; } });
  const [selectedBeds, setSelectedBeds] = useState(() => { try { return localStorage.getItem('buy_beds') || 'Any beds'; } catch { return 'Any beds'; } });
  const [selectedType, setSelectedType] = useState(() => { try { return localStorage.getItem('buy_type') || 'Any type'; } catch { return 'Any type'; } });
  const [selectedAdded, setSelectedAdded] = useState(() => { try { return localStorage.getItem('buy_added') || 'Anytime'; } catch { return 'Anytime'; } });
  const [sortBy, setSortBy] = useState(() => { try { return localStorage.getItem('buy_sort') || 'Most recent'; } catch { return 'Most recent'; } });
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({ ...defaultFilters });
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [activeMapMarker, setActiveMapMarker] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const alertFormRef = useRef<HTMLDivElement>(null);
  const [savedSearch, setSavedSearch] = useState(false);
  const [searchBookmarked, setSearchBookmarked] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [contactModalProperty, setContactModalProperty] = useState<MappedListing | null>(null);
  const [quickViewProperty, setQuickViewProperty] = useState<MappedListing | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<MappedListing[]>([]);
  const compare = useCompareToolbar();
  const [showCompareModal, setShowCompareModal] = useState(false);
  const { status: alertStatus, error: alertError, submitToContacts, reset: resetAlert } = useFormSubmit();
  const { format, currency, rates } = useCurrency();

  // Dynamic price labels — auto-convert KES ranges to selected currency
  const priceOptions = useMemo(() => [
    'Any price',
    `Under ${fmtPriceKes(10_000_000, currency, rates)}`,
    `${fmtPriceKes(10_000_000, currency, rates)} – ${fmtPriceKes(30_000_000, currency, rates)}`,
    `${fmtPriceKes(30_000_000, currency, rates)} – ${fmtPriceKes(50_000_000, currency, rates)}`,
    `${fmtPriceKes(50_000_000, currency, rates)} – ${fmtPriceKes(100_000_000, currency, rates)}`,
    `${fmtPriceKes(100_000_000, currency, rates)} – ${fmtPriceKes(200_000_000, currency, rates)}`,
    `Over ${fmtPriceKes(200_000_000, currency, rates)}`,
  ], [currency, rates]);

  // Reset price filter when currency changes so old label doesn’t mismatch
  const prevCurrencyRef = useRef(currency);
  useEffect(() => {
    if (prevCurrencyRef.current !== currency) {
      setSelectedPrice('Any price');
      prevCurrencyRef.current = currency;
    }
  }, [currency]);

  // Persist search filters to localStorage
  useEffect(() => {
    try { localStorage.setItem('buy_search', searchQuery); } catch { /* ignore */ }
    try { localStorage.setItem('buy_radius', selectedRadius); } catch { /* ignore */ }
    try { localStorage.setItem('buy_price', selectedPrice); } catch { /* ignore */ }
    try { localStorage.setItem('buy_beds', selectedBeds); } catch { /* ignore */ }
    try { localStorage.setItem('buy_type', selectedType); } catch { /* ignore */ }
    try { localStorage.setItem('buy_added', selectedAdded); } catch { /* ignore */ }
    try { localStorage.setItem('buy_sort', sortBy); } catch { /* ignore */ }
  }, [searchQuery, selectedRadius, selectedPrice, selectedBeds, selectedType, selectedAdded, sortBy]);

  // ── Derive numeric filters from dropdown strings ──────────
  const buildFilters = (): ListingFilters => {
    const filters: ListingFilters = {
      purpose: 'sale',
      search: debouncedSearch,
      propertyType: selectedType,
      addedSince: selectedAdded,
      sortBy,
      statusFilter: 'active',
    };
    // Price — map the selected dynamic label back to its KES range via index
    const priceIdx = priceOptions.indexOf(selectedPrice);
    const selectedRange = priceIdx > 0 ? KES_SALE_RANGES[priceIdx] : null;
    if (selectedRange?.min !== undefined) filters.priceMin = selectedRange.min;
    if (selectedRange?.max !== undefined) filters.priceMax = selectedRange.max;
    // Beds
    if (selectedBeds === 'Studio') { filters.bedsMin = 0; filters.bedsMax = 0; }
    else if (selectedBeds === '1+') { filters.bedsMin = 1; }
    else if (selectedBeds === '2+') { filters.bedsMin = 2; }
    else if (selectedBeds === '3+') { filters.bedsMin = 3; }
    else if (selectedBeds === '4+') { filters.bedsMin = 4; }
    else if (selectedBeds === '5+') { filters.bedsMin = 5; }
    return filters;
  };

  const { listings, totalCount, loading, error, refetch } = useListings(buildFilters(), currentPage);
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  // (listings are already paginated by the hook — use them directly)
  const paginated = listings;

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const nextImage = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const prop = listings.find((p) => p.id === id);
    if (!prop) return;
    setImageIndexes((prev) => {
      const current = prev[id] || 0;
      const next = (current + 1) % prop.images.length;
      return { ...prev, [id]: next };
    });
  };

  const prevImage = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const prop = listings.find((p) => p.id === id);
    if (!prop) return;
    setImageIndexes((prev) => {
      const current = prev[id] || 0;
      const next = current === 0 ? prop.images.length - 1 : current - 1;
      return { ...prev, [id]: next };
    });
  };

  const handleEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    // Anti-spam honeypot
    const honeypot = (formData.get('company_alt') as string || '').trim();
    if (honeypot) {
      form.reset();
      return;
    }

    const fullName = (formData.get('full_name') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const phone = (formData.get('phone') as string || '').trim();

    const success = await submitToContacts({
      name: fullName,
      email,
      phone: phone || undefined,
      type: 'buy_alert',
      notes: 'Enquiry for new properties that match their criteria.',
      tags: ['buy_page'],
    });

    if (success) {
      form.reset();
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPrice, selectedBeds, selectedType, selectedAdded, sortBy, advancedFilters]);

  // Load recently viewed from localStorage — try Supabase first, then fall back to stored objects
  useEffect(() => {
    // Helper: convert stored dev objects into MappedListing shape
    const mapStoredObj = (obj: Record<string, unknown>): MappedListing => ({
      id: String(obj.id || ''),
      slug: String(obj.slug || ''),
      title: String(obj.name || obj.title || ''),
      location: String(obj.location || ''),
      type: 'sale',
      category: '',
      beds: 0,
      baths: 0,
      parking: 0,
      receptions: 0,
      sqft: 0,
      sqm: 0,
      price: '',
      rawPrice: Number(obj.priceRaw ?? obj.price ?? 0),
      currency: String(obj.currency || 'KES'),
      image: String(obj.image || ''),
      featured: false,
      listedDays: 0,
      badges: [],
      createdAt: String(obj.timestamp || ''),
      description: '',
      agent: '',
      images: obj.image ? [String(obj.image)] : [],
      agentPhone: '',
      agentEmail: '',
    });

    let cancelled = false;

    // First try: stored full-object entries (recently_viewed_devs) — instant, no network needed
    try {
      const devsRaw = localStorage.getItem('recently_viewed_devs');
      if (devsRaw) {
        const devs: Record<string, unknown>[] = JSON.parse(devsRaw);
        if (devs.length > 0) {
          const mapped = devs.slice(0, 6).map(mapStoredObj);
          if (!cancelled) setRecentlyViewed(mapped);
        }
      }
    } catch { /* ignore */ }

    // Second try: enrich with full Supabase data for real listings
    try {
      const idsRaw = localStorage.getItem('recently_viewed_properties');
      if (idsRaw) {
        const ids: string[] = JSON.parse(idsRaw);
        // Filter out mock IDs — Supabase can't resolve those
        const realIds = ids.filter((id) => !id.startsWith('mock-')).slice(0, 6);
        if (realIds.length > 0) {
          supabase
            .from('listings')
            .select('id,title,location,price,property_type,bedrooms,bathrooms,parking,slug,created_at,main_image,images,purpose,currency,owner_phone,owner_email')
            .in('id', realIds)
            .then(({ data }) => {
              if (!cancelled && data && data.length > 0) {
                const mapped = ((data || []) as Record<string, unknown>[]).map((row): MappedListing => ({
                  id: String(row.id),
                  slug: String(row.slug || ''),
                  title: String(row.title || ''),
                  location: String(row.location || ''),
                  type: String(row.purpose || 'sale') === 'rent' ? 'rent' : 'sale',
                  category: String(row.property_type || ''),
                  beds: Number(row.bedrooms ?? 0),
                  baths: Number(row.bathrooms ?? 0),
                  parking: Number(row.parking ?? 0),
                  receptions: 0,
                  sqft: 0,
                  sqm: 0,
                  price: '',
                  rawPrice: Number(row.price || 0),
                  currency: String(row.currency || 'KES'),
                  image: String(row.main_image || ''),
                  featured: false,
                  listedDays: 0,
                  badges: [],
                  createdAt: String(row.created_at || ''),
                  description: '',
                  agent: String(row.owner_phone || ''),
                  images: (row.images as string[] | null) || (row.main_image ? [String(row.main_image)] : []),
                  agentPhone: String(row.owner_phone || ''),
                  agentEmail: String(row.owner_email || ''),
                }));
                setRecentlyViewed(mapped);
              }
            })
            .catch(() => {});
        }
      }
    } catch { /* ignore */ }

    return () => { cancelled = true; };
  }, []);

  const activeCount = totalCount;
  const agentCount = 8;

  const handleSearch = () => {
    refetch();
  };

  const scrollToAlertForm = () => {
    alertFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleShare = async (p: MappedListing) => {
    const url = `${window.location.origin}/property/${p.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: p.title, text: `${format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')} - ${p.title}`, url });
      } catch {
        // user cancelled — do nothing
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(p.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        // clipboard failed — do nothing
      }
    }
  };

  const handleAreaClick = (area: string) => {
    triggerSearch(area);
    setSelectedRadius('This area only');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRelatedSearch = (search: string) => {
    triggerSearch(search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col pt-[92px]">
      <Header />

      {/* Hero Section */}
      <ListingHero
        hero={hero}
        defaultEyebrow="Upscale Properties"
        defaultTitle="Properties For Sale in Nairobi"
        defaultSubtitle="Discover exceptional homes across Nairobi's most sought-after neighbourhoods."
      />

      {/* === SEARCH + FILTER BAR === */}
      <div className="z-40 bg-white border-b border-gray-200 shadow-sm mt-6">
        {/* Search bar */}
        <div className="px-4 md:px-6 lg:px-10 py-3">
          <div className="flex items-stretch gap-2 max-w-[1400px] mx-auto">
            <div className="relative flex items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 min-w-0 flex items-center gap-2.5 px-4 h-11 bg-white border border-gray-300 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  <i className="ri-map-pin-line text-gray-400 text-base"></i>
                </span>
                <input
                  value={searchQuery}
                  onChange={(e) => triggerSearch(e.target.value)}
                  placeholder="e.g. 'Nairobi', 'Kilimani', or '3 bed house'"
                  className="flex-1 min-w-0 text-sm font-roboto font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent"
                />
                {searchQuery && (
                  <button onClick={() => triggerSearch('')} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer">
                    <i className="ri-close-line text-sm"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <div className="relative">
                <select value={selectedRadius} onChange={(e) => setSelectedRadius(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {radiusOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              </div>
              <div className="relative">
                <select value={selectedBeds} onChange={(e) => setSelectedBeds(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {bedOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              </div>
              <div className="relative">
                <select value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {priceOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              </div>
              <div className="relative">
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {propTypeOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              </div>
            </div>
            <button
              onClick={() => setShowAdvancedFilters(true)}
              className="hidden md:flex items-center gap-2 h-11 px-4 text-sm font-roboto font-medium text-gray-700 border border-gray-300 rounded-lg hover:border-primary hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-equalizer-line text-sm"></i>
              </span>
              Filters
            </button>
            <button onClick={handleSearch} className="hidden md:flex items-center gap-2 h-11 px-5 bg-primary text-white text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-search-line text-sm"></i>
              </span>
              Search
            </button>
            <button onClick={() => setSearchBookmarked(!searchBookmarked)} className={`hidden md:flex items-center gap-2 h-11 px-4 border text-sm font-roboto font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${searchBookmarked ? 'border-primary text-primary bg-primary/5' : 'border-gray-300 text-gray-700 hover:border-primary hover:text-primary'}`}>
              <span className="w-4 h-4 flex items-center justify-center">
                <i className={`${searchBookmarked ? 'ri-heart-fill' : 'ri-heart-line'} text-sm`}></i>
              </span>
              {searchBookmarked ? 'Saved' : 'Save'}
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className="md:hidden flex items-center justify-center w-11 h-11 border border-gray-300 rounded-lg text-gray-600 cursor-pointer">
              <i className="ri-equalizer-line text-lg"></i>
            </button>
          </div>
        </div>

        {/* Mobile filters */}
        {showFilters && (
          <div className="md:hidden px-4 pb-3 flex flex-wrap gap-2">
            <div className="relative">
              <select value={selectedRadius} onChange={(e) => setSelectedRadius(e.target.value)} className="appearance-none h-9 px-3 pr-8 text-xs font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none cursor-pointer">
                {radiusOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            </div>
            <div className="relative">
              <select value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)} className="appearance-none h-9 px-3 pr-8 text-xs font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none cursor-pointer">
                {priceOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            </div>
            <div className="relative">
              <select value={selectedBeds} onChange={(e) => setSelectedBeds(e.target.value)} className="appearance-none h-9 px-3 pr-8 text-xs font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none cursor-pointer">
                {bedOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            </div>
            <div className="relative">
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="appearance-none h-9 px-3 pr-8 text-xs font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none cursor-pointer">
                {propTypeOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            </div>
            <div className="relative">
              <select value={selectedAdded} onChange={(e) => setSelectedAdded(e.target.value)} className="appearance-none h-9 px-3 pr-8 text-xs font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none cursor-pointer">
                {addedOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            </div>
          </div>
        )}

        {/* Secondary filter bar */}
        <div className="hidden md:flex items-center justify-between px-4 md:px-6 lg:px-10 pb-0 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <button className="flex items-center gap-1.5 py-2 text-xs font-roboto font-medium text-gray-700 border-b-2 border-transparent hover:text-primary transition-colors cursor-pointer">
                {selectedAdded}
                <span className="w-3 h-3 flex items-center justify-center text-gray-400"><i className="ri-arrow-down-s-line text-xs"></i></span>
              </button>
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {addedOptions.map((o) => (
                  <button
                    key={o}
                    onClick={() => setSelectedAdded(o)}
                    className={`w-full text-left px-3 py-2 text-xs font-roboto cursor-pointer hover:bg-gray-50 ${selectedAdded === o ? 'text-primary font-semibold' : 'text-gray-600'}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative group">
              <button className="flex items-center gap-1.5 py-2 text-xs font-roboto font-medium text-gray-700 border-b-2 border-transparent hover:text-primary transition-colors cursor-pointer">
                {sortBy}
                <span className="w-3 h-3 flex items-center justify-center text-gray-400"><i className="ri-arrow-down-s-line text-xs"></i></span>
              </button>
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {sortOptions.map((o) => (
                  <button
                    key={o}
                    onClick={() => setSortBy(o)}
                    className={`w-full text-left px-3 py-2 text-xs font-roboto cursor-pointer hover:bg-gray-50 ${sortBy === o ? 'text-primary font-semibold' : 'text-gray-600'}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <Link to="/commute-time" className="flex items-center gap-1.5 py-2 text-xs font-roboto font-medium text-gray-700 border-b-2 border-transparent hover:text-primary hover:border-primary/40 transition-colors cursor-pointer">
              <i className="ri-route-line text-xs"></i>
              Commute time
            </Link>
            <Link to="/schools" className="flex items-center gap-1.5 py-2 text-xs font-roboto font-medium text-gray-700 border-b-2 border-transparent hover:text-primary hover:border-primary/40 transition-colors cursor-pointer">
              <i className="ri-school-line text-xs"></i>
              Schools
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 py-2 text-xs font-roboto font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${viewMode === 'list' ? 'text-primary border-primary' : 'text-gray-700 border-transparent hover:text-primary'}`}
            >
              <i className="ri-list-check text-xs"></i>
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 py-2 text-xs font-roboto font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${viewMode === 'map' ? 'text-primary border-primary' : 'text-gray-700 border-transparent hover:text-primary'}`}
            >
              <i className="ri-map-2-line text-xs"></i>
              Map
            </button>
            <button onClick={() => setSavedSearch(!savedSearch)} className={`flex items-center gap-1.5 py-2 text-xs font-roboto font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${savedSearch ? 'text-primary border-primary' : 'text-gray-700 border-transparent hover:text-primary hover:border-primary/40'}`}>
              <i className={`${savedSearch ? 'ri-bookmark-fill' : 'ri-bookmark-line'} text-xs`}></i>
              {savedSearch ? 'Search saved' : 'Save search'}
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AdvancedFilters
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={(f) => setAdvancedFilters(f)}
        initialFilters={advancedFilters}
      />

      {/* === RESULTS HEADER === */}
      <div className="px-4 md:px-6 lg:px-10 pt-6 pb-2 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-roboto font-bold text-primary">Properties for sale in Nairobi</h1>
            <p className="text-xs font-roboto text-gray-500 mt-0.5">
              <span className="text-primary font-semibold">{activeCount}</span> properties &middot; <span className="text-primary font-semibold">{agentCount}</span> agents
            </p>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none h-8 px-3 pr-7 text-xs font-roboto font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none cursor-pointer">
                {sortOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            </div>
            <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 cursor-pointer">
              <i className={viewMode === 'list' ? 'ri-map-2-line text-xs' : 'ri-list-check text-xs'}></i>
            </button>
          </div>
        </div>
      </div>

      {/* === MAIN CONTENT === */}
      <main className="flex-1 px-4 md:px-6 lg:px-10 pb-10 max-w-[1400px] mx-auto w-full">
        <div className={`flex gap-6 ${viewMode === 'map' ? 'flex-col lg:flex-row' : 'flex-col lg:flex-row'}`}>
          {/* Listings */}
          <div className={`${viewMode === 'map' ? 'lg:w-[55%] xl:w-[60%]' : 'lg:w-[75%] xl:w-[78%]'}`}>
            {/* Create alert tab bar */}
            <div className="flex items-center gap-2 mb-4">
              <button onClick={scrollToAlertForm} className="flex items-center gap-1.5 h-9 px-4 text-xs font-roboto font-medium text-gray-600 border border-gray-300 rounded-lg hover:border-primary hover:text-primary transition-colors cursor-pointer whitespace-nowrap">
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-notification-3-line text-xs"></i>
                </span>
                Create alert
              </button>
            </div>

            <div className="space-y-4">
              {loading && (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex flex-col sm:flex-row bg-white border-2 border-gray-200 rounded-lg overflow-hidden sm:h-[300px] animate-pulse">
                      <div className="sm:w-[300px] md:w-[360px] lg:w-[400px] xl:w-[440px] h-[240px] sm:h-full bg-gray-200 flex-shrink-0"></div>
                      <div className="flex-1 p-6 space-y-4">
                        <div className="h-6 w-32 bg-gray-200 rounded"></div>
                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                        <div className="h-3 w-24 bg-gray-200 rounded"></div>
                        <div className="flex gap-2"><div className="h-3 w-12 bg-gray-200 rounded"></div><div className="h-3 w-12 bg-gray-200 rounded"></div><div className="h-3 w-12 bg-gray-200 rounded"></div></div>
                        <div className="h-3 w-full bg-gray-200 rounded"></div>
                        <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && !loading && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-50">
                    <i className="ri-error-warning-line text-red-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-roboto font-bold text-primary mb-2">Something went wrong</h3>
                  <p className="text-sm font-roboto text-gray-500 mb-4">{error}</p>
                  <button onClick={refetch} className="px-6 py-2 bg-primary text-white text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
                    Try again
                  </button>
                </div>
              )}

              {!loading && !error && paginated.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100">
                    <i className="ri-search-line text-gray-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-roboto font-bold text-primary mb-2">No properties found</h3>
                  <p className="text-sm font-roboto text-gray-500 mb-4">Try adjusting your search or filters to see more results.</p>
                  <button onClick={() => { triggerSearch('Nairobi'); setSelectedPrice('Any price'); setSelectedBeds('Any beds'); setSelectedType('Any type'); }} className="px-6 py-2 bg-primary text-white text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
                    Clear filters
                  </button>
                </div>
              )}

              {!loading && !error && paginated.map((p) => {
                const imgIdx = imageIndexes[p.id] || 0;
                const isSaved = savedIds.has(p.id);
                const isHovered = hoveredCard === p.id;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row bg-white border-2 border-gray-200 rounded-lg overflow-hidden sm:h-[300px] hover:border-gray-300 hover:shadow-md transition-all duration-200"
                    onMouseEnter={() => setHoveredCard(p.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Image area */}
                    <div className="relative sm:w-[300px] md:w-[360px] lg:w-[400px] xl:w-[440px] h-[240px] sm:h-full flex-shrink-0 overflow-hidden group">
                      <Link to={`/property/${p.slug}`} className="block w-full h-full">
                        <img
                          src={p.images[imgIdx]}
                          alt={p.title}
                          className={`w-full h-full object-cover object-top transition-transform duration-500 ${isHovered ? 'scale-[1.06]' : 'scale-100'}`}
                        />
                      </Link>

                      {/* Image counter */}
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded">
                        {imgIdx + 1}/{p.images.length}
                      </div>

                      {/* Preview badge */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setQuickViewProperty(p);
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

                      {/* Nav arrows */}
                      {p.images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => prevImage(p.id, e)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full cursor-pointer transition-colors"
                          >
                            <i className="ri-arrow-left-s-line text-sm"></i>
                          </button>
                          <button
                            onClick={(e) => nextImage(p.id, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full cursor-pointer transition-colors"
                          >
                            <i className="ri-arrow-right-s-line text-sm"></i>
                          </button>
                        </>
                      )}

                      {/* Top badges */}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                        {p.isJointVenture && (
                          <span className="bg-[#2B5B3C] text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded">Joint Venture</span>
                        )}
                        {p.justAdded && (
                          <span className="bg-[#F5A623] text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded">Just added</span>
                        )}
                        {p.newHome && (
                          <span className="bg-[#0D5959] text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded">New home</span>
                        )}
                        {p.reduced && (
                          <span className="bg-[#E63946] text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded">Reduced</span>
                        )}
                        {p.videoTour && (
                          <span className="bg-black/60 text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                            <i className="ri-video-line text-[10px]"></i>Video tour
                          </span>
                        )}
                        {p.virtualTour && (
                          <span className="bg-black/60 text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                            <i className="ri-globe-line text-[10px]"></i>Virtual tour
                          </span>
                        )}
                        {p.floorPlan && (
                          <span className="bg-black/60 text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                            <i className="ri-map-2-line text-[10px]"></i>Floor plan
                          </span>
                        )}
                        {p.houseShare && (
                          <span className="bg-white text-gray-700 text-[10px] font-roboto font-semibold px-2 py-0.5 rounded border border-gray-200">House share</span>
                        )}
                      </div>

                      {/* Top right actions */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <button
                          onClick={() => toggleSave(p.id)}
                          className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-colors ${isSaved ? 'bg-primary text-white' : 'bg-black/40 hover:bg-black/60 text-white'}`}
                        >
                          <i className={`${isSaved ? 'ri-heart-fill' : 'ri-heart-line'} text-sm`}></i>
                        </button>
                        <button
                          onClick={() => handleShare(p)}
                          className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-colors ${copiedId === p.id ? 'bg-primary text-white' : 'bg-black/40 hover:bg-black/60 text-white'}`}
                          title={copiedId === p.id ? 'Link copied!' : 'Share property'}
                        >
                          <i className={`${copiedId === p.id ? 'ri-check-line' : 'ri-share-forward-line'} text-sm`}></i>
                        </button>
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden">
                      <div>
                        {/* Price & title */}
                        {/* Price — Rightmove style: value + Guide price same size + info icon */}
                        <div className="mb-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-roboto font-semibold text-[#002349] text-sm md:text-base lg:text-lg">{format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}</span>
                            <span className="text-xs font-roboto text-[#636363]">Guide price</span>
                            <span className="w-4 h-4 flex items-center justify-center cursor-help" title="The asking price set by the seller">
                              <i className="ri-information-line text-[#636363] text-sm"></i>
                            </span>
                          </div>
                        </div>

                        {/* Meta badges — Rightmove bold style */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                          {p.beds > 0 && (
                            <span className="flex items-center gap-1 text-xs md:text-sm font-roboto font-medium text-[#222222]">
                              <i className="ri-hotel-bed-line text-[#555555] text-xs"></i>
                              {p.beds} {p.beds === 1 ? 'bed' : 'beds'}
                            </span>
                          )}
                          {p.baths > 0 && (
                            <span className="flex items-center gap-1 text-xs md:text-sm font-roboto font-medium text-[#222222]">
                              <i className="fas fa-bath text-[#555555] text-xs"></i>
                              {p.baths} {p.baths === 1 ? 'bath' : 'baths'}
                            </span>
                          )}
                          {p.parking > 0 && (
                            <span className="flex items-center gap-1 text-xs md:text-sm font-roboto font-medium text-[#222222]">
                              <i className="ri-car-line text-[#555555] text-xs"></i>
                              {p.parking} {p.parking === 1 ? 'parking' : 'parking'}
                            </span>
                          )}
                          {p.sqft > 0 && (
                            <span className="flex items-center gap-1 text-xs md:text-sm font-roboto font-medium text-[#222222]">
                              <i className="ri-ruler-line text-[#555555] text-xs"></i>
                              {p.sqft.toLocaleString()} sqft
                            </span>
                          )}
                          {p.beds === 0 && p.baths === 0 && p.parking === 0 && (
                            <span className="text-xs font-roboto text-gray-400 italic">Details on request</span>
                          )}
                        </div>

                        <Link to={`/property/${p.slug}`} className="block mb-3">
                          <address className="text-xs md:text-sm font-roboto font-medium text-[#636363] leading-relaxed not-italic flex items-center gap-1">
                            <span className="w-3 h-3 flex items-center justify-center shrink-0">
                              <i className="ri-map-pin-line text-golden text-[10px]"></i>
                            </span>
                            {p.location.includes('Nairobi') ? p.location : `${p.location}, Nairobi`}
                          </address>
                        </Link>

                        {/* Description */}
                        <p className="text-xs md:text-sm font-roboto text-[#555555] leading-relaxed line-clamp-2 mb-3">{p.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()}</p>
                      </div>

                      {/* Agent footer — Rightmove style: Added today green bold */}
                      <div className="flex items-end justify-between gap-3 pt-2.5 border-t-2 border-gray-200">
                        <span className="text-xs font-roboto font-bold text-[#00703c]">
                            {formatTimeAgo(p.createdAt)}
                          </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <a href={`tel:${p.agentPhone || '+254712345678'}`} className="flex items-center gap-1 text-xs font-roboto font-semibold text-[#1a2744] hover:text-[#2d4a7a] rounded px-1.5 py-0.5 transition-colors cursor-pointer whitespace-nowrap">
                            <span className="w-3.5 h-3.5 flex items-center justify-center">
                              <i className="ri-phone-line text-xs"></i>
                            </span>
                            Call
                          </a>
                          <button onClick={() => setContactModalProperty(p)} className="flex items-center gap-1 text-xs font-roboto font-semibold text-[#1a2744] hover:text-[#2d4a7a] rounded px-1.5 py-0.5 transition-colors cursor-pointer whitespace-nowrap">
                            <span className="w-3.5 h-3.5 flex items-center justify-center">
                              <i className="ri-mail-line text-xs"></i>
                            </span>
                            Email
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 flex items-center justify-center text-sm font-roboto text-gray-500 hover:text-primary disabled:opacity-30 cursor-pointer border border-gray-200 rounded-md hover:border-primary"
                >
                  <i className="ri-arrow-left-s-line"></i>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 flex items-center justify-center text-sm font-roboto cursor-pointer transition-colors border rounded-md ${currentPage === page ? 'bg-primary text-white border-primary' : 'text-gray-500 border-gray-200 hover:border-primary hover:text-primary'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 flex items-center justify-center text-sm font-roboto text-gray-500 hover:text-primary disabled:opacity-30 cursor-pointer border border-gray-200 rounded-md hover:border-primary"
                >
                  <i className="ri-arrow-right-s-line"></i>
                </button>
              </div>
            )}

            {/* Bottom CTA */}
            <div ref={alertFormRef} className="mt-10 bg-[#f8f7f4] rounded-lg p-6 text-center">
              <h3 className="text-lg font-roboto font-bold text-primary mb-2">Can&apos;t find what you&apos;re looking for?</h3>
              <p className="text-sm font-roboto text-gray-500 mb-4 max-w-md mx-auto">Register for property alerts and be the first to know about new homes for sale in your area.</p>
              <form data-readdy-form="true" id="buy-alert-form" onSubmit={handleEnquiry} className="flex flex-col sm:flex-row items-center gap-3 max-w-lg mx-auto">
                <input name="email" type="email" placeholder="Enter your email" required className="flex-1 w-full h-11 px-4 text-sm font-roboto border border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
                <input type="hidden" name="type" value="buy_alert" />
                <input type="hidden" name="location" value="Nairobi" />
                <input type="text" name="company_alt" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly className="footer-hp-field" />
                <button type="submit" disabled={alertStatus === 'submitting'} className="w-full sm:w-auto h-11 px-6 bg-primary text-white text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {alertStatus === 'success' ? 'Alert set!' : 'Get alerts'}
                </button>
              </form>
              {alertStatus === 'success' && (
                <p className="text-green-600 text-sm font-roboto text-center">Thank you! We&apos;ll respond within 24 hours.</p>
              )}
              {alertStatus === 'error' && (
                <p className="text-red-500 text-sm font-roboto text-center">{alertError}</p>
              )}
            </div>
          </div>

          {/* Right Sidebar - Only in list view */}
          {viewMode === 'list' && (
            <div className="hidden lg:block lg:w-[25%] xl:w-[22%]">
              <div className="sticky top-[140px] space-y-3">
                {/* Recently Viewed */}
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
                        onClick={() => { localStorage.removeItem('recently_viewed_properties'); localStorage.removeItem('recently_viewed_devs'); setRecentlyViewed([]); }}
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
                                src={p.image || p.images[0]}
                                alt={p.title}
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-roboto font-semibold text-[#002349] group-hover:text-primary transition-colors truncate">
                                {format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
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
                                  beds: Number(p.beds) || 0, baths: Number(p.baths) || 0, parking: Number(p.parking) || 0,
                                  rawPrice: p.rawPrice, currency: p.currency, image: p.image || p.images[0],
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

                {/* Refine search */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-gray-100">
                    <h3 className="text-xs font-roboto font-semibold text-primary">Houses for sale in Nairobi</h3>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[11px] font-roboto text-gray-500">Refine your search with specific requirements</p>
                  </div>
                </div>

                {/* Nearby areas */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-gray-100">
                    <h3 className="text-xs font-roboto font-semibold text-primary">Nearby Nairobi</h3>
                  </div>
                  <div className="px-3 py-2 grid grid-cols-2 gap-x-2 gap-y-1.5">
                    {nearbyAreas.map((area) => (
                      <button key={area} onClick={() => handleAreaClick(area)} className="text-left text-xs font-roboto text-gray-600 hover:text-primary hover:underline transition-colors cursor-pointer">
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Related searches */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-gray-100">
                    <h3 className="text-xs font-roboto font-semibold text-primary">Related searches</h3>
                  </div>
                  <div className="px-3 py-2 space-y-1.5">
                    {relatedSearches.map((search) => (
                      <button key={search} onClick={() => handleRelatedSearch(search.replace(' for sale in Nairobi', '').replace(' in Nairobi', ''))} className="block text-left w-full text-xs font-roboto text-gray-600 hover:text-primary hover:underline transition-colors cursor-pointer">
                        {search}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List property CTA */}
                <div className="bg-primary rounded-lg p-3.5 text-center">
                  <h3 className="text-white font-roboto font-bold text-xs mb-1.5">List your property</h3>
                  <p className="text-white/70 font-roboto text-[10px] mb-2.5">Reach thousands of qualified buyers</p>
                  <Link to="/landlords" className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-golden text-white font-roboto text-[10px] font-semibold rounded-md hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap">
                    Get started
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Map view */}
          {viewMode === 'map' && (
            <div className="lg:w-[45%] xl:w-[40%] lg:sticky lg:top-[180px] lg:h-[calc(100vh-200px)]" ref={mapRef}>
              <div className="w-full h-[400px] lg:h-full rounded-lg overflow-hidden border border-gray-200">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255281.1989180463!2d36.68258773125!3d-1.302861050000005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f1172d84d49a7%3A0xf7cf0254b297924c!2sNairobi%2C%20Kenya!5e0!3m2!1sen!2sus!4v1717000000000!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Property map - Nairobi"
                  className="w-full h-full"
                ></iframe>
              </div>
              {/* Map overlay cards */}
              <div className="hidden lg:block mt-3 space-y-2">
                {paginated.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${activeMapMarker === p.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => setActiveMapMarker(activeMapMarker === p.id ? null : p.id)}
                  >
                    <img src={p.image} alt={p.title} className="w-16 h-12 object-cover rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-roboto font-semibold text-primary truncate">{format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}</p>
                      <p className="text-[10px] font-roboto text-gray-500 truncate">{p.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* === FOOTER CTA === */}
      <div className="bg-primary py-12 px-6 text-center">
        <p className="text-golden text-sm font-roboto tracking-widest uppercase mb-3">Own a Property?</p>
        <h2 className="text-white font-roboto font-bold text-2xl md:text-3xl mb-3">List Your Property With Us</h2>
        <p className="text-white/70 font-roboto text-sm mb-7 max-w-md mx-auto">Reach thousands of qualified buyers. Get a free market valuation from our expert team today.</p>
        <Link to="/landlords" className="inline-flex items-center gap-2 px-8 py-3 bg-golden text-white font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-colors">
          <i className="ri-home-heart-line"></i>Get Free Valuation
        </Link>
      </div>

      <PageContactSection />
      <Footer />
      <BackToTop />
      {contactModalProperty && (
        <ContactAgentModal
          isOpen={true}
          onClose={() => setContactModalProperty(null)}
          propertyTitle={contactModalProperty.title}
          propertyId={contactModalProperty.id}
          propertySlug={contactModalProperty.slug}
          propertyPrice={format(contactModalProperty.rawPrice, contactModalProperty.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
          propertyLocation={contactModalProperty.location}
        />
      )}
      <QuickViewModal
        isOpen={quickViewProperty !== null}
        onClose={() => setQuickViewProperty(null)}
        property={quickViewProperty ? {
          id: quickViewProperty.id,
          slug: quickViewProperty.slug,
          title: quickViewProperty.title,
          price: quickViewProperty.price,
          rawPrice: quickViewProperty.rawPrice,
          priceUnit: quickViewProperty.priceUnit,
          location: quickViewProperty.location,
          category: quickViewProperty.category,
          beds: Number(quickViewProperty.beds) || 0,
          baths: Number(quickViewProperty.baths) || 0,
          parking: Number(quickViewProperty.parking) || 0,
          receptions: Number(quickViewProperty.receptions) || 0,
          description: quickViewProperty.description,
          images: quickViewProperty.images,
          type: 'sale',
          agentPhone: quickViewProperty.agentPhone,
          agentEmail: quickViewProperty.agentEmail,
        } : null}
      />

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
    </div>
  );
}