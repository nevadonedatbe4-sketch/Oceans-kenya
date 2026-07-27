import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import QuickViewModal from '@/components/feature/QuickViewModal';
import CompareToolbar from '@/components/feature/CompareToolbar';
import CompareModal from '@/components/feature/CompareModal';
import { useCompareToolbar, type CompareProperty } from '@/hooks/useCompareToolbar';
import { useListings, ListingFilters, type MappedListing } from '@/hooks/useListings';
import AdvancedFilters, { defaultFilters, FilterState } from './Rent/components/AdvancedFilters';
import { geocodeLocation } from '@/lib/geocode';
import { radiusLabelToMeters } from '@/lib/distance';
import { usePropertyPageSettings } from '@/hooks/usePropertyPageSettings';
import ListingHero from '@/components/feature/ListingHero';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/lib/supabase';
import { formatTimeAgo } from '@/lib/timeAgo';

function toDisplayType(category: string): string {
  return category
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const ITEMS_PER_PAGE = 10;

// KES base ranges for rent — labels generated dynamically per currency
const KES_RENT_RANGES: { key: string; min?: number; max?: number }[] = [
  { key: 'any' },
  { key: 'under_300k', max: 300_000 },
  { key: '300k_500k', min: 300_000, max: 500_000 },
  { key: '500k_1m', min: 500_000, max: 1_000_000 },
  { key: '1m_2m', min: 1_000_000, max: 2_000_000 },
  { key: '2m_5m', min: 2_000_000, max: 5_000_000 },
  { key: 'over_5m', min: 5_000_000 },
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
const propTypeOptions = ['Any type', 'Apartment', 'House', 'Townhouse', 'Penthouse', 'Villa', 'Studio', 'Land'];
const addedOptions = ['Anytime', 'Last 24 hours', 'Last 3 days', 'Last 7 days', 'Last 14 days'];
const sortOptions = ['Most recent', 'Highest price', 'Lowest price', 'Most reduced', 'Most popular'];
const radiusOptions = ['This area only', '\u00bd mile', '1 mile', '3 miles', '5 miles', '10 miles', '15 miles', '20 miles', '30 miles', '40 miles'];

const nearbyAreas = [
  'Karen', 'Runda', 'Lavington', 'Kilimani', 'Westlands', 'Kileleshwa',
  'Muthaiga', 'Parklands', 'Riverside', 'Gigiri', 'Spring Valley', 'Nyari',
  'Langata', 'Kiserian', 'Ongata Rongai', 'Ngong', 'Kitengela', 'Athi River',
];

const relatedSearches = [
  'New homes in Nairobi',
  'Properties for sale in Nairobi',
  'Explore house prices in Nairobi',
  'Find letting agents in Nairobi',
  'Commercial properties to rent in Nairobi',
  'Studios to rent in Nairobi',
  'Houses to rent in Nairobi',
  'Furnished apartments in Nairobi',
];

export default function Rent() {
  const { hero } = usePropertyPageSettings('rent');
  const [searchQuery, setSearchQuery] = useState(() => { try { return localStorage.getItem('rent_search') || 'Nairobi'; } catch { return 'Nairobi'; } });
  const navigate = useNavigate();
  const [selectedRadius, setSelectedRadius] = useState(() => { try { return localStorage.getItem('rent_radius') || 'This area only'; } catch { return 'This area only'; } });
  const [selectedPrice, setSelectedPrice] = useState(() => { try { return localStorage.getItem('rent_price') || 'Any price'; } catch { return 'Any price'; } });
  const [selectedBeds, setSelectedBeds] = useState(() => { try { return localStorage.getItem('rent_beds') || 'Any beds'; } catch { return 'Any beds'; } });
  const [selectedType, setSelectedType] = useState(() => { try { return localStorage.getItem('rent_type') || 'Any type'; } catch { return 'Any type'; } });
  const [selectedAdded, setSelectedAdded] = useState(() => { try { return localStorage.getItem('rent_added') || 'Anytime'; } catch { return 'Anytime'; } });
  const [sortBy, setSortBy] = useState(() => { try { return localStorage.getItem('rent_sort') || 'Most recent'; } catch { return 'Most recent'; } });
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({ ...defaultFilters });
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<{ price: string; beds: string; type: string; added: string; advanced: FilterState }>({
    price: 'Any price',
    beds: 'Any beds',
    type: 'Any type',
    added: 'Anytime',
    advanced: { ...defaultFilters },
  });
  const [isSearching, setIsSearching] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [quickViewProperty, setQuickViewProperty] = useState<MappedListing | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<MappedListing[]>([]);
  const compare = useCompareToolbar();
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [activeMapMarker, setActiveMapMarker] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const { status: alertStatus, error: alertError, submitToContacts, reset: resetAlert } = useFormSubmit();
  const { format, currency, rates } = useCurrency();

  // Dynamic price labels — auto-convert KES rent ranges to selected currency
  const priceOptions = useMemo(() => [
    'Any price',
    `Under ${fmtPriceKes(300_000, currency, rates)}`,
    `${fmtPriceKes(300_000, currency, rates)} – ${fmtPriceKes(500_000, currency, rates)}`,
    `${fmtPriceKes(500_000, currency, rates)} – ${fmtPriceKes(1_000_000, currency, rates)}`,
    `${fmtPriceKes(1_000_000, currency, rates)} – ${fmtPriceKes(2_000_000, currency, rates)}`,
    `${fmtPriceKes(2_000_000, currency, rates)} – ${fmtPriceKes(5_000_000, currency, rates)}`,
    `Over ${fmtPriceKes(5_000_000, currency, rates)}`,
  ], [currency, rates]);

  // Reset price filter when currency changes
  const prevCurrencyRef = useRef(currency);
  useEffect(() => {
    if (prevCurrencyRef.current !== currency) {
      setSelectedPrice('Any price');
      prevCurrencyRef.current = currency;
    }
  }, [currency]);

  // ── Geocoded search center & radius ───────────────────────────
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodedName, setGeocodedName] = useState<string>('');
  const radiusMeters = radiusLabelToMeters(selectedRadius);

  // ── Build server-side filters from dropdown state ────────────
  const buildFilters = useCallback((): ListingFilters => {
    const filters: ListingFilters = {
      purpose: 'rent',
      search: appliedSearchQuery,
      propertyType: selectedType,
      addedSince: selectedAdded,
      sortBy,
      statusFilter: 'active',
      centerLat: searchCenter?.lat ?? null,
      centerLng: searchCenter?.lng ?? null,
      radiusMeters: radiusMeters ?? null,
    };
    // Price — map selected dynamic label back to KES range via index
    const priceIdx = priceOptions.indexOf(selectedPrice);
    const selectedRange = priceIdx > 0 ? KES_RENT_RANGES[priceIdx] : null;
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
  }, [appliedSearchQuery, selectedPrice, selectedBeds, selectedType, selectedAdded, sortBy, searchCenter, radiusMeters]);

  const { listings: rentListings, totalCount, loading, error: fetchError, refetch } = useListings(buildFilters(), currentPage);

  const paginated = rentListings;

  const executeSearch = useCallback(async () => {
    setAppliedSearchQuery(searchQuery);
    setAppliedFilters((prev) => ({
      ...prev,
      advanced: { ...advancedFilters },
    }));

    // Geocode the search query to enable radius filtering
    if (searchQuery.trim()) {
      try {
        const result = await geocodeLocation(searchQuery);
        setSearchCenter({ lat: result.lat, lng: result.lng });
        setGeocodedName(result.formattedAddress);
      } catch {
        setSearchCenter(null);
        setGeocodedName('');
      }
    } else {
      setSearchCenter(null);
      setGeocodedName('');
    }

    setCurrentPage(1);
  }, [searchQuery, advancedFilters]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedPrice('Any price');
    setSelectedBeds('Any beds');
    setSelectedType('Any type');
    setSelectedAdded('Anytime');
    setSelectedRadius('This area only');
    setAdvancedFilters({ ...defaultFilters });
    setAppliedSearchQuery('');
    setSearchCenter(null);
    setGeocodedName('');
    setAppliedFilters({
      price: 'Any price',
      beds: 'Any beds',
      type: 'Any type',
      added: 'Anytime',
      advanced: { ...defaultFilters },
    });
    setCurrentPage(1);
    setOpenDropdown(null);
  }, []);

  const hasActiveFilters =
    appliedSearchQuery !== '' ||
    selectedPrice !== 'Any price' ||
    selectedBeds !== 'Any beds' ||
    selectedType !== 'Any type' ||
    selectedAdded !== 'Anytime' ||
    appliedFilters.advanced.minPrice !== '' ||
    appliedFilters.advanced.maxPrice !== '' ||
    appliedFilters.advanced.propertyTypes.length > 0 ||
    appliedFilters.advanced.furnished.length > 0 ||
    appliedFilters.advanced.lettingType.length > 0 ||
    appliedFilters.advanced.minBeds !== '' ||
    appliedFilters.advanced.maxBeds !== '' ||
    appliedFilters.advanced.minBaths !== '' ||
    appliedFilters.advanced.minSize !== '' ||
    appliedFilters.advanced.maxSize !== '' ||
    appliedFilters.advanced.keywords !== '' ||
    appliedFilters.advanced.keywordsExclude !== '';

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeSearch();
    }
  };

  // Reset pagination when quick filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPrice, selectedBeds, selectedType, selectedAdded]);

  // Load recently viewed from localStorage — try stored objects first, then Supabase for real listings
  useEffect(() => {
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

  // Persist search filters to localStorage
  useEffect(() => {
    try { localStorage.setItem('rent_search', searchQuery); } catch { /* ignore */ }
    try { localStorage.setItem('rent_radius', selectedRadius); } catch { /* ignore */ }
    try { localStorage.setItem('rent_price', selectedPrice); } catch { /* ignore */ }
    try { localStorage.setItem('rent_beds', selectedBeds); } catch { /* ignore */ }
    try { localStorage.setItem('rent_type', selectedType); } catch { /* ignore */ }
    try { localStorage.setItem('rent_added', selectedAdded); } catch { /* ignore */ }
    try { localStorage.setItem('rent_sort', sortBy); } catch { /* ignore */ }
  }, [searchQuery, selectedRadius, selectedPrice, selectedBeds, selectedType, selectedAdded, sortBy]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

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
    const prop = rentListings.find((p) => p.id === id);
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
    const prop = rentListings.find((p) => p.id === id);
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

    const fullName = (formData.get('full_name') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const phone = (formData.get('phone') as string || '').trim();

    const success = await submitToContacts({
      name: fullName,
      email,
      phone: phone || undefined,
      type: 'rent_alert',
      notes: 'Enquiry for new rental properties that match their criteria.',
      tags: ['rent_page'],
    });

    if (success) {
      form.reset();
    }
  };

  const activeCount = totalCount;
  const agentCount = useMemo(() => {
    const uniqueAgents = new Set(rentListings.map((p) => p.agent).filter(Boolean));
    return uniqueAgents.size || 0;
  }, [rentListings]);

  return (
    <div className="min-h-screen bg-white flex flex-col pt-[92px]">
      <Header />

      {/* Hero Section */}
      <ListingHero
        hero={hero}
        defaultEyebrow="Premium Rentals"
        defaultTitle="Properties For Rent in Nairobi"
        defaultSubtitle="Explore exceptional rental properties across Nairobi's finest neighbourhoods."
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="e.g. 'Nairobi', 'Kilimani', or '3 bed house'"
                  className="flex-1 min-w-0 text-sm font-roboto font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer">
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
            <button
              onClick={executeSearch}
              disabled={isSearching}
              className="hidden md:flex items-center gap-2 h-11 px-5 bg-primary text-white text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                {isSearching ? <i className="ri-loader-4-line text-sm animate-spin"></i> : <i className="ri-search-line text-sm"></i>}
              </span>
              {isSearching ? 'Searching...' : 'Search'}
            </button>
            <button className="hidden md:flex items-center gap-2 h-11 px-4 border border-gray-300 text-sm font-roboto font-medium text-gray-700 rounded-lg hover:border-primary hover:text-primary transition-colors cursor-pointer whitespace-nowrap">
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-heart-line text-sm"></i>
              </span>
              Save
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className="md:hidden flex items-center justify-center w-11 h-11 border border-gray-300 rounded-lg text-gray-600 cursor-pointer">
              <i className="ri-equalizer-line text-lg"></i>
            </button>
            <button
              onClick={executeSearch}
              disabled={isSearching}
              className="md:hidden flex items-center justify-center w-11 h-11 bg-primary text-white rounded-lg cursor-pointer disabled:opacity-60"
            >
              {isSearching ? <i className="ri-loader-4-line text-sm animate-spin"></i> : <i className="ri-search-line text-lg"></i>}
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

        {/* Secondary filter bar — underline style */}
        <div className="hidden md:flex items-center justify-between px-4 md:px-6 lg:px-10 pb-0 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'added' ? null : 'added')}
                className={`flex items-center gap-1.5 py-2 text-xs font-roboto font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${openDropdown === 'added' ? 'text-primary border-primary' : 'text-gray-700 border-transparent hover:text-primary'}`}
              >
                {selectedAdded}
                <span className="w-3 h-3 flex items-center justify-center text-gray-400"><i className={`ri-arrow-down-s-line text-xs transition-transform ${openDropdown === 'added' ? 'rotate-180' : ''}`}></i></span>
              </button>
              {openDropdown === 'added' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)}></div>
                  <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {addedOptions.map((o) => (
                      <button
                        key={o}
                        onClick={() => { setSelectedAdded(o); setOpenDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-roboto cursor-pointer hover:bg-gray-50 ${selectedAdded === o ? 'text-primary font-semibold' : 'text-gray-600'}`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                className={`flex items-center gap-1.5 py-2 text-xs font-roboto font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${openDropdown === 'sort' ? 'text-primary border-primary' : 'text-gray-700 border-transparent hover:text-primary'}`}
              >
                {sortBy}
                <span className="w-3 h-3 flex items-center justify-center text-gray-400"><i className={`ri-arrow-down-s-line text-xs transition-transform ${openDropdown === 'sort' ? 'rotate-180' : ''}`}></i></span>
              </button>
              {openDropdown === 'sort' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)}></div>
                  <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {sortOptions.map((o) => (
                      <button
                        key={o}
                        onClick={() => { setSortBy(o); setOpenDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-roboto cursor-pointer hover:bg-gray-50 ${sortBy === o ? 'text-primary font-semibold' : 'text-gray-600'}`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </>
              )}
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
            <button className="flex items-center gap-1.5 py-2 text-xs font-roboto font-medium text-gray-700 border-b-2 border-transparent hover:text-primary hover:border-primary/40 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-bookmark-line text-xs"></i>
              Save search
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AdvancedFilters
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={(f) => {
          setAdvancedFilters(f);
          setAppliedSearchQuery(searchQuery);
          setAppliedFilters({
            price: selectedPrice,
            beds: selectedBeds,
            type: selectedType,
            added: selectedAdded,
            advanced: { ...f },
          });
          setCurrentPage(1);
        }}
        initialFilters={advancedFilters}
      />

      {/* === RESULTS HEADER === */}
      <div className="px-4 md:px-6 lg:px-10 pt-6 pb-2 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-roboto font-bold text-primary">Properties to rent in Nairobi</h1>
            {geocodedName && radiusMeters && (
              <p className="text-xs font-roboto text-gray-500 mt-0.5">
                <span className="w-3.5 h-3.5 inline-flex items-center justify-center align-middle mr-1">
                  <i className="ri-focus-3-line text-primary text-xs"></i>
                </span>
                Within <span className="text-primary font-semibold">{selectedRadius}</span> of {geocodedName}
              </p>
            )}
            <p className="text-xs font-roboto text-gray-500 mt-0.5">
              <span className="text-primary font-semibold">{activeCount}</span> properties &middot; <span className="text-primary font-semibold">{agentCount}</span> agents
              {hasActiveFilters && <span className="text-gray-400"> &middot; filtered</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={clearSearch}
                className="hidden md:flex items-center gap-1.5 text-xs font-roboto font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <i className="ri-close-circle-line text-sm"></i>
                </span>
                Clear search
              </button>
            )}
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
      </div>

      {/* === MAIN CONTENT === */}
      <main className="flex-1 px-4 md:px-6 lg:px-10 pb-10 max-w-[1400px] mx-auto w-full">
        <div className={`flex gap-6 ${viewMode === 'map' ? 'flex-col lg:flex-row' : 'flex-col lg:flex-row'}`}>
          {/* Listings */}
          <div className={`${viewMode === 'map' ? 'lg:w-[55%] xl:w-[60%]' : 'lg:w-[75%] xl:w-[78%]'}`}>
            {/* Map view / Create alert tab bar */}
            <div className="flex items-center gap-2 mb-4">
              <button className="flex items-center gap-1.5 h-9 px-4 text-xs font-roboto font-medium text-gray-600 border border-gray-300 rounded-lg hover:border-primary hover:text-primary transition-colors cursor-pointer whitespace-nowrap">
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-notification-3-line text-xs"></i>
                </span>
                Create alert
              </button>
            </div>

            {/* Featured label */}
            {paginated.some((p) => p.featured) && (
              <div className="mb-3">
                <span className="inline-flex items-center px-3 py-1 bg-golden/10 text-golden text-xs font-roboto font-semibold rounded-md">
                </span>
              </div>
            )}

            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col sm:flex-row bg-white border-2 border-gray-200 rounded-lg overflow-hidden sm:h-[300px] animate-pulse">
                      <div className="sm:w-[300px] md:w-[360px] lg:w-[400px] xl:w-[440px] h-[240px] sm:h-full bg-gray-200" />
                      <div className="flex-1 p-6 space-y-4">
                        <div className="h-7 bg-gray-200 rounded w-1/3" />
                        <div className="h-5 bg-gray-200 rounded w-2/3" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="h-4 bg-gray-200 rounded w-full" />
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/4 mt-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : fetchError ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-50">
                    <i className="ri-error-warning-line text-red-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-roboto font-bold text-primary mb-2">Something went wrong</h3>
                  <p className="text-sm font-roboto text-gray-500 mb-4">{fetchError}</p>
                  <button
                    onClick={refetch}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-roboto text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <i className="ri-refresh-line"></i>
                    Try again
                  </button>
                </div>
              ) : rentListings.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100">
                    <i className="ri-home-line text-gray-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-roboto font-bold text-primary mb-2">No rental properties yet</h3>
                  <p className="text-sm font-roboto text-gray-500 mb-4 max-w-md mx-auto">
                    There are currently no rental listings available. Check back soon or browse properties for sale.
                  </p>
                  <Link
                    to="/buy"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-roboto text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Browse properties for sale
                    <i className="ri-arrow-right-line"></i>
                  </Link>
                </div>
              ) : paginated.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100">
                    <i className="ri-search-line text-gray-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-roboto font-bold text-primary mb-2">No properties match your filters</h3>
                  <p className="text-sm font-roboto text-gray-500 mb-4">Try adjusting your search criteria or clearing filters.</p>
                  <button
                    onClick={clearSearch}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-roboto text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-close-circle-line"></i>
                    Clear all filters
                  </button>
                </div>
              ) : (
                paginated.map((p) => {
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
                        <button className="w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full cursor-pointer transition-colors">
                          <i className="ri-share-forward-line text-sm"></i>
                        </button>
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden">
                      <div>
                        {/* Price — Rightmove style: value + pcm same size + info icon */}
                        <div className="mb-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-roboto font-semibold text-[#002349] text-sm md:text-base lg:text-lg">{format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}</span>
                            <span className="font-roboto font-semibold text-[#002349] text-sm md:text-base lg:text-lg">pcm</span>
                            <span className="w-4 h-4 flex items-center justify-center cursor-help" title="Per calendar month">
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
                          {p.receptions > 0 && (
                            <span className="flex items-center gap-1 text-xs md:text-sm font-roboto font-medium text-[#222222]">
                              <i className="ri-sofa-line text-[#555555] text-xs"></i>
                              {p.receptions} {p.receptions === 1 ? 'reception' : 'receptions'}
                            </span>
                          )}
                          {p.parking > 0 && (
                            <span className="flex items-center gap-1 text-xs md:text-sm font-roboto font-medium text-[#222222]">
                              <i className="ri-car-line text-[#555555] text-xs"></i>
                              {p.parking} {p.parking === 1 ? 'parking' : 'parking'}
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
                            {p.location}, Nairobi
                            {searchCenter && p.distanceKm != null && (
                              <span className="ml-1.5 text-[10px] font-roboto font-semibold text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                                {p.distanceKm < 1
                                  ? `${Math.round(p.distanceKm * 1000)}m away`
                                  : `${p.distanceKm.toFixed(1)}km away`}
                              </span>
                            )}
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
                          <a href={`mailto:${p.agentEmail || 'info@property.co.ke'}?subject=Enquiry about ${encodeURIComponent(p.title)}`} className="flex items-center gap-1 text-xs font-roboto font-semibold text-[#1a2744] hover:text-[#2d4a7a] rounded px-1.5 py-0.5 transition-colors cursor-pointer whitespace-nowrap">
                            <span className="w-3.5 h-3.5 flex items-center justify-center">
                              <i className="ri-mail-line text-xs"></i>
                            </span>
                            Email
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }))}
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
            <div className="mt-10 bg-[#f8f7f4] rounded-lg p-6 text-center">
              <h3 className="text-lg font-roboto font-bold text-primary mb-2">Can't find what you're looking for?</h3>
              <p className="text-sm font-roboto text-gray-500 mb-4 max-w-md mx-auto">Register for property alerts and be the first to know about new rentals in your area.</p>
              <form data-readdy-form="true" id="rent-alert-form" onSubmit={handleEnquiry} className="flex flex-col sm:flex-row items-center gap-3 max-w-lg mx-auto">
                <input name="email" type="email" placeholder="Enter your email" required className="flex-1 w-full h-11 px-4 text-sm font-roboto border border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
                <input type="hidden" name="type" value="rent_alert" />
                <input type="hidden" name="location" value="Nairobi" />
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
                    <h3 className="text-xs font-roboto font-semibold text-primary">Refine your search</h3>
                  </div>
                  <div className="px-3 py-2 space-y-1.5">
                    <p className="text-[11px] font-roboto text-gray-500 leading-relaxed">
                      {geocodedName && radiusMeters
                        ? `Showing properties within ${selectedRadius} of ${geocodedName}`
                        : appliedSearchQuery
                        ? `Showing results for "${appliedSearchQuery}" in Nairobi`
                        : 'Rental properties across Nairobi and surrounding areas'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['Studio', '1 Bed', '2 Bed', '3 Bed', 'Furnished', 'Pet Friendly', 'Parking'].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            if (tag === 'Studio') {
                              setSelectedBeds('Studio');
                            } else if (tag === '1 Bed') {
                              setSelectedBeds('1+');
                            } else if (tag === '2 Bed') {
                              setSelectedBeds('2+');
                            } else if (tag === '3 Bed') {
                              setSelectedBeds('3+');
                            } else if (tag === 'Furnished') {
                              setAppliedSearchQuery('furnished');
                              setSearchQuery('furnished');
                            } else if (tag === 'Pet Friendly') {
                              setAppliedSearchQuery('pet friendly');
                              setSearchQuery('pet friendly');
                            } else if (tag === 'Parking') {
                              setAppliedSearchQuery('parking');
                              setSearchQuery('parking');
                            }
                            setCurrentPage(1);
                          }}
                          className="px-2.5 py-1 text-[10px] font-roboto font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-full hover:bg-primary hover:text-white hover:border-primary transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    {hasActiveFilters && (
                      <button
                        onClick={clearSearch}
                        className="flex items-center gap-1 text-[11px] font-roboto font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer pt-1"
                      >
                        <span className="w-3.5 h-3.5 flex items-center justify-center">
                          <i className="ri-close-circle-line text-xs"></i>
                        </span>
                        Clear all filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Nearby areas */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-gray-100">
                    <h3 className="text-xs font-roboto font-semibold text-primary">Nearby Nairobi</h3>
                  </div>
                  <div className="px-3 py-2 grid grid-cols-2 gap-x-2 gap-y-1.5">
                    {nearbyAreas.map((area) => (
                      <button
                        key={area}
                        onClick={() => {
                          setSearchQuery(area);
                          setAppliedSearchQuery(area);
                          setCurrentPage(1);
                        }}
                        className="text-left text-xs font-roboto text-gray-600 hover:text-primary hover:underline transition-colors cursor-pointer whitespace-nowrap"
                      >
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
                      <button
                        key={search}
                        onClick={() => {
                          let searchTerm = search.replace(' to rent in Nairobi', '').replace('Properties ', '').replace(' in Nairobi', '').replace('New homes in ', '').trim();
                          if (search === 'New homes in Nairobi') {
                            setSelectedAdded('Last 14 days');
                            setSearchQuery('Nairobi');
                            setAppliedSearchQuery('Nairobi');
                          } else if (search === 'Properties for sale in Nairobi') {
                            navigate('/buy');
                            return;
                          } else if (search === 'Explore house prices in Nairobi') {
                            navigate('/valuation');
                            return;
                          } else if (search === 'Find letting agents in Nairobi') {
                            navigate('/landlords');
                            return;
                          } else if (search === 'Studios to rent in Nairobi') {
                            setSelectedBeds('Studio');
                            setSelectedType('Studio');
                            setSearchQuery('Nairobi');
                            setAppliedSearchQuery('Nairobi');
                          } else {
                            setSearchQuery(searchTerm);
                            setAppliedSearchQuery(searchTerm);
                          }
                          setCurrentPage(1);
                        }}
                        className="block w-full text-left text-xs font-roboto text-gray-600 hover:text-primary hover:underline transition-colors cursor-pointer"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick links */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-gray-100">
                    <h3 className="text-xs font-roboto font-semibold text-primary">Quick links</h3>
                  </div>
                  <div className="px-3 py-2 space-y-1.5">
                    <Link to="/buy" className="flex items-center gap-2 text-xs font-roboto text-gray-600 hover:text-primary transition-colors">
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-home-line text-[10px]"></i>
                      </span>
                      Properties for sale
                    </Link>
                    <Link to="/neighbourhoods" className="flex items-center gap-2 text-xs font-roboto text-gray-600 hover:text-primary transition-colors">
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-building-2-line text-[10px]"></i>
                      </span>
                      Nairobi neighbourhoods
                    </Link>
                    <Link to="/commute-time" className="flex items-center gap-2 text-xs font-roboto text-gray-600 hover:text-primary transition-colors">
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-route-line text-[10px]"></i>
                      </span>
                      Commute time search
                    </Link>
                    <Link to="/schools" className="flex items-center gap-2 text-xs font-roboto text-gray-600 hover:text-primary transition-colors">
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-school-line text-[10px]"></i>
                      </span>
                      Schools near you
                    </Link>
                    <Link to="/new-developments" className="flex items-center gap-2 text-xs font-roboto text-gray-600 hover:text-primary transition-colors">
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-building-4-line text-[10px]"></i>
                      </span>
                      New developments
                    </Link>
                  </div>
                </div>

                {/* List property CTA */}
                <div className="bg-primary rounded-lg p-3.5 text-center">
                  <h3 className="text-white font-roboto font-bold text-xs mb-1.5">List your property</h3>
                  <p className="text-white/70 font-roboto text-[10px] mb-2.5">Reach thousands of qualified tenants</p>
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
        <p className="text-white/70 font-roboto text-sm mb-7 max-w-md mx-auto">Reach thousands of qualified tenants. Get a free rental assessment from our expert team today.</p>
        <Link to="/landlords" className="inline-flex items-center gap-2 px-8 py-3 bg-golden text-white font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-colors">
          <i className="ri-home-heart-line"></i>Get Rental Valuation
        </Link>
      </div>

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
          type: 'rent',
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