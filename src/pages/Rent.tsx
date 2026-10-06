import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import QuickViewModal from '@/components/feature/QuickViewModal';
import PropertyBadge from '@/components/feature/PropertyBadge';
import CompareToolbar from '@/components/feature/CompareToolbar';
import CompareModal from '@/components/feature/CompareModal';
import ContactAgentModal from '@/components/feature/ContactAgentModal';
import PropertyCardBody from '@/components/feature/PropertyCardBody';
import Pagination from '@/components/feature/Pagination';
import EntityImage from '@/components/feature/EntityImage';
import ShareButton from '@/components/feature/ShareButton';
import CommuteMap from '@/components/feature/CommuteMap';
import { useCompareToolbar, type CompareProperty } from '@/hooks/useCompareToolbar';
import { useListings, ListingFilters, type MappedListing } from '@/hooks/useListings';
import AdvancedFilters, { defaultFilters, FilterState } from './Rent/components/AdvancedFilters';
import { advancedToFilters } from '@/pages/Rent/components/advancedToFilters';
import { geocodeLocation } from '@/lib/geocode';
import { radiusLabelToMeters } from '@/lib/distance';
import { withReturnFrom } from '@/lib/navigation';
import { usePropertyPageSettings } from '@/hooks/usePropertyPageSettings';
import { useListingsPageContent } from '@/hooks/useListingsPageContent';
import ListingHero from '@/components/feature/ListingHero';
import LocationSearch, { type LocationSuggestion } from '@/components/feature/LocationSearch';
import PropertySearchBar from '@/components/feature/PropertySearchBar';
import MobileFilterPills from '@/components/feature/MobileFilterPills';
import RefineSearchChips from '@/components/feature/RefineSearchChips';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/lib/supabase';
import { parsePropertySearch, parseSearchClauses, clauseSummary, intentToChips, withoutIntent } from '@/lib/propertySearch';
import { smartTitleCase } from '@/lib/location';
import PageLoader from '@/components/feature/PageLoader';

function toDisplayType(category: string): string {
  return category
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const ITEMS_PER_PAGE = 10;

// KES base ranges for rent - labels generated dynamically per currency
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
  return `${sym} ${val.toLocaleString('en-US')}`;
}
const bedOptions = ['Any beds', 'Studio', '1+', '2+', '3+', '4+', '5+'];
const propTypeOptions = ['Any type', 'House', 'Apartment', 'Bungalow', 'Studio', 'Maisonette', 'Villa', 'Townhouse', 'Penthouse', 'Detached', 'Semi-detached', 'Terraced', 'Land'];
const addedOptions = ['Anytime', 'Last 24 hours', 'Last 3 days', 'Last 7 days', 'Last 14 days'];
const sortOptions = ['A - Z', 'Z - A', 'Most recent', 'Highest price', 'Lowest price', 'Most reduced', 'Most popular'];
const radiusOptions = ['This area only', '\u00bd mile', '1 mile', '3 miles', '5 miles', '10 miles', '15 miles', '20 miles', '30 miles', '40 miles'];

export default function Rent() {
  const { hero } = usePropertyPageSettings('rent');
  const { content: LC } = useListingsPageContent();
  const { pathname, search } = useLocation();
  const currentPath = `${pathname}${search}`;
  const handleLocationChange = (value: string, suggestion?: LocationSuggestion) => {
    setSearchQuery(value);
    setAppliedSearchQuery(value);
    setCurrentPage(1);
    if (suggestion) {
      const hasCoords = typeof suggestion.lat === 'number' && typeof suggestion.lng === 'number' && (suggestion.lat !== 0 || suggestion.lng !== 0);
      if (hasCoords) {
        // Only pin a geocode centre when real coordinates are available; when an
        // area from the registry has no coords, fall back to location-filtering only.
        setSearchCenter({ lat: suggestion.lat, lng: suggestion.lng });
        setGeocodedName(suggestion.name);
      } else {
        setSearchCenter(null);
        setGeocodedName(suggestion.name);
      }
      // A "Near me" (geolocation) result should trigger a real radius search
      // around the visitor's actual position. Default to a sensible radius so
      // the distance filter runs, unless the user already picked one.
      if (suggestion.source === 'geolocation') {
        setSelectedRadius((prev) => (prev === 'This area only' ? '5 miles' : prev));
      }
    } else if (!value.trim()) {
      setSearchCenter(null);
      setGeocodedName('');
    } else {
      // Free-text search - geocode so the radius filter still works.
      geocodeLocation(value)
        .then((result) => {
          setSearchCenter({ lat: result.lat, lng: result.lng });
          setGeocodedName(result.formattedAddress);
        })
        .catch(() => { setSearchCenter(null); setGeocodedName(''); });
    }
  };
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlLocation = searchParams.get('location') || '';
  const urlType = searchParams.get('type') || '';
  const urlBeds = searchParams.get('beds') || '';
  const [searchQuery, setSearchQuery] = useState(() => urlLocation || (() => { try { return localStorage.getItem('rent_search') || ''; } catch { return ''; } })());
  const [selectedRadius, setSelectedRadius] = useState(() => { try { return localStorage.getItem('rent_radius') || 'This area only'; } catch { return 'This area only'; } });
  const [selectedPrice, setSelectedPrice] = useState(() => { try { return localStorage.getItem('rent_price') || 'Any price'; } catch { return 'Any price'; } });
  const [selectedBeds, setSelectedBeds] = useState(() => urlBeds || (() => { try { return localStorage.getItem('rent_beds') || 'Any beds'; } catch { return 'Any beds'; } })());
  const [selectedType, setSelectedType] = useState(() => urlType || (() => { try { return localStorage.getItem('rent_type') || 'Any type'; } catch { return 'Any type'; } })());
  const [selectedAdded, setSelectedAdded] = useState(() => { try { return localStorage.getItem('rent_added') || 'Anytime'; } catch { return 'Anytime'; } });
  const [sortBy, setSortBy] = useState(() => {
    try {
      const saved = localStorage.getItem('rent_sort');
      return saved && saved !== 'Most recent' ? saved : 'A - Z';
    } catch { return 'A - Z'; }
  });
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [currentPage, setCurrentPage] = useState(() => {
    const p = Number(searchParams.get('page'));
    return Number.isFinite(p) && p > 1 ? p : 1;
  });
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedSearch, setSavedSearch] = useState(false);
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
  // On touch devices there is no real hover, so the first tap on a card image
  // reveals the prev/next arrows instead of jumping straight to the listing.
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [quickViewProperty, setQuickViewProperty] = useState<MappedListing | null>(null);
  const [contactProperty, setContactProperty] = useState<MappedListing | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<MappedListing[]>([]);
  const compare = useCompareToolbar();
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [activeMapMarker, setActiveMapMarker] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const resultsTopRef = useRef<HTMLDivElement>(null);
  const alertFormRef = useRef<HTMLDivElement>(null);
  const resultsScrollInit = useRef(false);
  const filtersResetInit = useRef(false);
  const { status: alertStatus, error: alertError, submitToContacts, reset: resetAlert } = useFormSubmit();
  const [alertEmailError, setAlertEmailError] = useState('');
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  const { format, currency, rates } = useCurrency();

  // Dynamic price labels - auto-convert KES rent ranges to selected currency
  const priceOptions = useMemo(() => [
    'Any price',
    `Under ${fmtPriceKes(300_000, currency, rates)}`,
    `${fmtPriceKes(300_000, currency, rates)} - ${fmtPriceKes(500_000, currency, rates)}`,
    `${fmtPriceKes(500_000, currency, rates)} - ${fmtPriceKes(1_000_000, currency, rates)}`,
    `${fmtPriceKes(1_000_000, currency, rates)} - ${fmtPriceKes(2_000_000, currency, rates)}`,
    `${fmtPriceKes(2_000_000, currency, rates)} - ${fmtPriceKes(5_000_000, currency, rates)}`,
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
    // Fold the advanced "keywords" box into the free-text search so it filters
    // results (matches CommercialProperty's behaviour).
    const combinedSearch = [appliedSearchQuery, appliedFilters.advanced.keywords].filter(Boolean).join(' ').trim();
    const filters: ListingFilters = {
      purpose: 'rent',
      search: combinedSearch,
      propertyType: selectedType,
      addedSince: selectedAdded,
      sortBy,
      statusFilter: 'active',
      centerLat: searchCenter?.lat ?? null,
      centerLng: searchCenter?.lng ?? null,
      radiusMeters: radiusMeters ?? null,
    };
    // Price - map selected dynamic label back to KES range via index
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
    // Advanced Filters panel (types, baths, size, must-haves, furnishing).
    return { ...filters, ...advancedToFilters(appliedFilters.advanced) };
  }, [appliedSearchQuery, appliedFilters.advanced, selectedPrice, selectedBeds, selectedType, selectedAdded, sortBy, searchCenter, radiusMeters]);

  const { listings: rentListings, totalCount, loading, error: fetchError, refetch } = useListings(buildFilters(), currentPage);

  const paginated = rentListings;

  // Map pins for the live price-pin map view
  const mapPins = useMemo(() => {
    return paginated
      .filter((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number')
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        lat: p.latitude as number,
        lng: p.longitude as number,
        title: p.title,
        priceLabel: format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR'),
        commuteLabel: p.area || p.location || '',
        image: p.image,
      }));
  }, [paginated, format]);

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

  const applyRefineFilter = (opts: { beds?: string; type?: string; search?: string }) => {
    if (opts.beds) setSelectedBeds(opts.beds);
    if (opts.type) setSelectedType(opts.type);
    if (opts.search) { setSearchQuery(opts.search); setAppliedSearchQuery(opts.search); }
    setCurrentPage(1);
  };

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

  // Reset pagination when quick filters change (skipping the first mount so a
  // page restored from the URL survives).
  useEffect(() => {
    if (!filtersResetInit.current) { filtersResetInit.current = true; return; }
    setCurrentPage(1);
  }, [selectedPrice, selectedBeds, selectedType, selectedAdded]);

  // Changing the results page must never dump the visitor at the footer. The
  // listings keep their previous height while the next page loads (no collapse),
  // so we simply bring the top of the results section back into view.
  useEffect(() => {
    if (!resultsScrollInit.current) { resultsScrollInit.current = true; return; }
    const el = resultsTopRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, top) });
  }, [currentPage]);

  // Load recently viewed from localStorage - try stored objects first, then Supabase for real listings
  useEffect(() => {
    const mapStoredObj = (obj: Record<string, unknown>): MappedListing => ({
      id: String(obj.id || ''),
      slug: String(obj.slug || ''),
      title: smartTitleCase(String(obj.name || obj.title || '')),
      location: smartTitleCase(String(obj.location || '')),
      type: 'sale',
      category: '',
      beds: 0,
      baths: 0,
      parking: 0,
      receptions: 0,

      propertyType: '',

      landSize: 0,

      acreage: 0,

      isLand: false,

      isJointVenture: false,
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

    // First try: stored full-object entries (recently_viewed_devs) - instant, no network needed
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
        // Filter out mock IDs - Supabase can't resolve those
        const realIds = ids.filter((id) => !id.startsWith('mock-')).slice(0, 6);
        if (realIds.length > 0) {
          supabase
            .from('all_listings')
            .select('id,title,location,address,neighbourhood,city,state_region,price,property_type,bedrooms,bathrooms,parking,slug,created_at,main_image,images,purpose,currency,owner_phone,owner_email')
            .in('id', realIds)
            .then(({ data }) => {
              if (!cancelled && data && data.length > 0) {
                const mapped = ((data || []) as Record<string, unknown>[]).map((row): MappedListing => ({
                  id: String(row.id),
                  slug: String(row.slug || ''),
                  title: smartTitleCase(String(row.title || '')),
                  location: smartTitleCase(String(row.location || '')),
                  type: String(row.purpose || 'sale') === 'rent' ? 'rent' : 'sale',
                  category: String(row.property_type || ''),
                  beds: Number(row.bedrooms ?? 0),
                  baths: Number(row.bathrooms ?? 0),
                  parking: Number(row.parking ?? 0),
                  receptions: 0,

                  propertyType: '',

                  landSize: 0,

                  acreage: 0,

                  isLand: false,

                  isJointVenture: false,
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
            }, () => {});
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

  // Sync search criteria to the URL (replaceState) so a search survives refresh,
  // back/forward and can be shared: /rent?location=...&type=...&beds=...
  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (searchQuery) nextParams.set('location', searchQuery);
    if (selectedType !== 'Any type') nextParams.set('type', selectedType);
    if (selectedBeds !== 'Any beds') nextParams.set('beds', selectedBeds);
    if (currentPage > 1) nextParams.set('page', String(currentPage));
    setSearchParams(nextParams.toString(), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedType, selectedBeds, currentPage]);

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

    // Inline validation - catch invalid emails before we submit anything.
    if (!email) {
      setAlertEmailError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(email)) {
      setAlertEmailError('Please enter a valid email address, e.g. name@example.com.');
      return;
    }
    setAlertEmailError('');

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

  // Understood search criteria - derived from the same string the query engine parses
  const parsedIntent = useMemo(() => parsePropertySearch(appliedSearchQuery), [appliedSearchQuery]);
  const intentChips = intentToChips(parsedIntent);
  const hasSearch = appliedSearchQuery.trim() !== '';
  const searchClauses = useMemo(() => parseSearchClauses(appliedSearchQuery), [appliedSearchQuery]);
  const isCompound = searchClauses.length > 1;
  const removeIntentChip = (key: 'transaction' | 'propertyType' | 'location' | 'bedrooms' | 'price' | 'furnished') => {
    const next = withoutIntent(appliedSearchQuery, key);
    setSearchQuery(next);
    setAppliedSearchQuery(next);
    setCurrentPage(1);
  };


  return (
    <div className="min-h-screen bg-white flex flex-col pt-[62px] md:pt-[122px] lg:pt-[130px]">
      <Header />

      {/* Hero Section */}
      <ListingHero
        hero={hero}
        defaultEyebrow="Premium Rentals"
        defaultTitle="Properties For Rent"
        defaultSubtitle="Explore exceptional rental properties across Kenya's finest neighbourhoods."
      />

      {/* Breadcrumb below the banner - keeps the blue flow intact */}
      <PageBreadcrumbs />

      {/* === SEARCH + FILTER BAR === */}
      <div className="z-40 bg-white border-b border-primary/12 shadow-sm mt-6">
        {/* Shared property search bar (desktop / tablet / mobile) */}
        <div className="px-4 md:px-6 lg:px-10 pt-4 pb-3">
          <PropertySearchBar
            className="max-w-[1400px] mx-auto"
            searchQuery={searchQuery}
            onLocationChange={handleLocationChange}
            placeholderCycle={[
              "Looking for a rental in a leafy suburb...",
              "Looking for an apartment with a view...",
              "Looking for a studio with great amenities...",
              "Looking for a furnished spacious home...",
              "Looking for a townhouse in Gigiri...",
            ]}
            radiusValue={selectedRadius}
            onRadiusChange={setSelectedRadius}
            radiusOptions={radiusOptions}
            bedsValue={selectedBeds}
            onBedsChange={setSelectedBeds}
            priceValue={selectedPrice}
            onPriceChange={setSelectedPrice}
            priceOptions={priceOptions}
            typeValue={selectedType}
            onTypeChange={setSelectedType}
            typeOptions={propTypeOptions}
            onFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
            filtersActive={showAdvancedFilters}
            saved={savedSearch}
            onToggleSave={() => setSavedSearch(!savedSearch)}
            onSearch={() => executeSearch()}
            onMapView={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            mapActive={viewMode === 'map'}
            onCreateAlert={() => alertFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          />
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

        {/* Mobile filter pills */}
        <MobileFilterPills
          pills={[
            ...(appliedSearchQuery && appliedSearchQuery !== '' ? [{ key: 'search', label: `"${appliedSearchQuery}"`, onRemove: () => { setSearchQuery(''); setAppliedSearchQuery(''); } }] : []),
            ...(selectedPrice !== 'Any price' ? [{ key: 'price', label: selectedPrice, onRemove: () => setSelectedPrice('Any price') }] : []),
            ...(selectedBeds !== 'Any beds' ? [{ key: 'beds', label: selectedBeds, onRemove: () => setSelectedBeds('Any beds') }] : []),
            ...(selectedType !== 'Any type' ? [{ key: 'type', label: selectedType, onRemove: () => setSelectedType('Any type') }] : []),
            ...(selectedAdded !== 'Anytime' ? [{ key: 'added', label: selectedAdded, onRemove: () => setSelectedAdded('Anytime') }] : []),
            ...(selectedRadius !== 'This area only' ? [{ key: 'radius', label: selectedRadius, onRemove: () => setSelectedRadius('This area only') }] : []),
            ...(sortBy !== 'A - Z' ? [{ key: 'sort', label: sortBy, onRemove: () => setSortBy('A - Z') }] : []),
          ]}
          onClearAll={clearSearch}
        />

        {/* Secondary filter bar - underline style */}
        <div className="hidden md:flex items-center justify-between px-4 md:px-6 lg:px-10 pb-0 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'added' ? null : 'added')}
                className={`flex items-center gap-1.5 py-2 text-xs font-roboto font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${openDropdown === 'added' ? 'text-primary border-primary' : 'text-primary/70 border-primary/30 hover:text-primary'}`}
              >
                {selectedAdded}
                <span className="w-3 h-3 flex items-center justify-center text-primary/60"><i className={`ri-arrow-down-wide-fill text-xs transition-transform ${openDropdown === 'added' ? 'rotate-180' : ''}`}></i></span>
              </button>
              {openDropdown === 'added' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)}></div>
                  <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-primary/20 rounded-lg shadow-lg z-50">
                    {addedOptions.map((o) => (
                      <button
                        key={o}
                        onClick={() => { setSelectedAdded(o); setOpenDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-roboto cursor-pointer hover:bg-gray-50 ${selectedAdded === o ? 'text-primary font-semibold' : 'text-primary/60'}`}
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
                className={`flex items-center gap-1.5 py-2 text-xs font-roboto font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${openDropdown === 'sort' ? 'text-primary border-primary' : 'text-primary/70 border-primary/30 hover:text-primary'}`}
              >
                {sortBy}
                <span className="w-3 h-3 flex items-center justify-center text-primary/60"><i className={`ri-arrow-down-wide-fill text-xs transition-transform ${openDropdown === 'sort' ? 'rotate-180' : ''}`}></i></span>
              </button>
              {openDropdown === 'sort' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)}></div>
                  <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-primary/20 rounded-lg shadow-lg z-50">
                    {sortOptions.map((o) => (
                      <button
                        key={o}
                        onClick={() => { setSortBy(o); setOpenDropdown(null); }}
                        className={`w-full text-left px-3 py-2 text-xs font-roboto cursor-pointer hover:bg-gray-50 ${sortBy === o ? 'text-primary font-semibold' : 'text-primary/60'}`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Link to="/commute-time" className="flex items-center gap-1.5 py-2 text-xs font-roboto font-semibold text-primary border-b-2 border-transparent hover:text-primary hover:border-primary/40 transition-colors cursor-pointer">
              <i className="ri-route-line text-xs"></i>
              Commute time
            </Link>
            <Link to="/schools" className="flex items-center gap-1.5 py-2 text-xs font-roboto font-semibold text-primary border-b-2 border-transparent hover:text-primary hover:border-primary/40 transition-colors cursor-pointer">
              <i className="ri-school-line text-xs"></i>
              Schools
            </Link>
          </div>
        </div>
      </div>

      {/* === RESULTS HEADER === */}
      <div ref={resultsTopRef} className="px-4 md:px-6 lg:px-10 pt-6 pb-2 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-roboto font-bold text-primary">{LC.heading_rent}</h1>
            {geocodedName && radiusMeters && (
              <p className="text-xs font-roboto text-primary/50 mt-0.5">
                <span className="w-3.5 h-3.5 inline-flex items-center justify-center align-middle mr-1">
                  <i className="ri-focus-3-line text-primary text-xs"></i>
                </span>
                Within <span className="text-primary font-semibold">{selectedRadius}</span> of {geocodedName}
              </p>
            )}
            <p className="text-xs font-roboto text-primary/50 mt-0.5">
              <span className="text-primary font-semibold">{activeCount}</span> {LC.count_label}
              {hasActiveFilters && <span className="text-primary/50"> &middot; filtered</span>}
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
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none h-8 px-3 pr-7 text-xs font-roboto font-medium text-primary/60 bg-white border border-primary/20 rounded-lg focus:outline-none cursor-pointer">
                  {sortOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <i className="ri-arrow-down-wide-fill absolute right-2 top-1/2 -translate-y-1/2 text-primary/60 text-xs pointer-events-none"></i>
              </div>
              <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="w-8 h-8 flex items-center justify-center border border-primary/12 rounded-lg text-primary/60 cursor-pointer">
                <i className={viewMode === 'list' ? 'ri-map-2-line text-xs' : 'ri-list-check text-xs'}></i>
              </button>
            </div>
          </div>
        </div>

        {/* Understood search criteria - the system shows what it parsed */}
        {hasSearch && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-roboto font-semibold text-primary/50 uppercase tracking-wide whitespace-nowrap">{LC.search_label}</span>
            {isCompound ? (
              searchClauses.map((cl, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs font-roboto font-medium text-primary bg-primary/5 border border-primary/15 rounded-full px-3 py-1 whitespace-nowrap">
                  <span className="w-4 h-4 flex items-center justify-center text-primary/40"><i className="ri-arrow-right-s-line text-xs"></i></span>
                  {clauseSummary(cl)}
                </span>
              ))
            ) : intentChips.length === 0 ? (
              <span className="text-xs font-roboto text-primary/60 bg-primary/5 border border-primary/15 rounded-full px-3 py-1">"{appliedSearchQuery}"</span>
            ) : (
              intentChips.map((chip) => (
                <span key={`${chip.key}-${chip.label}`} className="inline-flex items-center gap-1.5 text-xs font-roboto font-medium text-primary bg-primary/5 border border-primary/15 rounded-full px-3 py-1 whitespace-nowrap">
                  {chip.label}
                  <button
                    onClick={() => removeIntentChip(chip.key)}
                    className="w-4 h-4 flex items-center justify-center text-primary/50 hover:text-accent hover:bg-accent/10 rounded-full transition-colors cursor-pointer"
                    aria-label={`Remove ${chip.label}`}
                  >
                    <i className="ri-close-line text-sm"></i>
                  </button>
                </span>
              ))
            )}
          </div>
        )}
      </div>

      {/* === MAIN CONTENT === */}
      <main className="flex-1 px-4 md:px-6 lg:px-10 pb-24 md:pb-10 max-w-[1400px] mx-auto w-full">
        <div className={`flex gap-6 ${viewMode === 'map' ? 'flex-col lg:flex-row' : 'flex-col lg:flex-row'}`}>
          {/* Listings */}
          <div className={`${viewMode === 'map' ? 'lg:w-[55%] xl:w-[60%]' : 'lg:w-[75%] xl:w-[78%]'}`}>
            {/* Featured label */}
            {paginated.some((p) => p.featured) && (
              <div className="mb-3">
                <span className="inline-flex items-center px-3 py-1 bg-golden/10 text-golden text-xs font-roboto font-semibold rounded-md">
                </span>
              </div>
            )}

            <div className="space-y-4">
              {/* Lightweight indicator while the NEXT page loads - the previous
                  results stay on screen so the page never collapses. */}
              {loading && paginated.length > 0 && (
                <div className="flex items-center justify-center gap-2 py-2" aria-live="polite">
                  <i className="ri-loader-4-line animate-spin text-primary text-base"></i>
                  <span className="text-xs font-roboto text-primary/60">Updating results\u2026</span>
                </div>
              )}
              {loading && rentListings.length === 0 ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col sm:flex-row bg-white border-2 border-primary/12 rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden md:h-[300px] animate-pulse">
                      <div className="w-full sm:w-[280px] md:w-[360px] lg:w-[400px] xl:w-[440px] h-[220px] sm:h-full bg-gray-200" />
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
                  <p className="text-sm font-roboto text-primary/60 mb-4">{fetchError}</p>
                  <button
                    onClick={refetch}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary font-roboto text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <i className="ri-refresh-line"></i>
                    Try again
                  </button>
                </div>
              ) : rentListings.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100">
                    <i className="ri-home-line text-primary/50 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-roboto font-bold text-primary mb-2">No rental properties yet</h3>
                  <p className="text-sm font-roboto text-primary/60 mb-4 max-w-md mx-auto">
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
                    <i className="ri-search-line text-primary/50 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-roboto font-bold text-primary mb-2">No properties match your search</h3>
                  <p className="text-sm font-roboto text-primary/60 mb-4">{hasSearch ? 'There are no matching rental properties for your search criteria. Try adjusting your search.' : 'Try adjusting your search criteria or clearing filters.'}</p>
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
                    className="listing-safe flex flex-col sm:flex-row bg-[var(--card-bg)] rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden md:h-[300px] hover:shadow-[0_2px_4px_rgba(0,23,49,0.06),0_8px_24px_rgba(0,23,49,0.10),0_24px_64px_rgba(0,23,49,0.12)] transition-all duration-200"
                    onMouseEnter={() => setHoveredCard(p.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Image area */}
                    <div className="relative w-full sm:w-[280px] md:w-[360px] lg:w-[400px] xl:w-[440px] h-[220px] sm:h-full flex-shrink-0 overflow-hidden group"
                      onClickCapture={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button')) return;
                        if (window.matchMedia('(hover: none)').matches && !revealedCards.has(p.id)) {
                          e.preventDefault();
                          e.stopPropagation();
                          setRevealedCards((prev) => new Set(prev).add(p.id));
                        }
                      }}
                      onTouchStart={(e) => { const t = e.touches[0].clientX; (e.currentTarget as HTMLElement).dataset.tsX = String(t); }}
                      onTouchMove={(e) => { (e.currentTarget as HTMLElement).dataset.teX = String(e.touches[0].clientX); }}
                      onTouchEnd={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        const sx = parseFloat(el.dataset.tsX || '0');
                        const ex = parseFloat(el.dataset.teX || '0');
                        if (Math.abs(sx - ex) > 40 && p.images.length > 1) {
                          if (sx - ex > 0) setImageIndexes((prev) => ({ ...prev, [p.id]: ((prev[p.id] || 0) + 1) % p.images.length }));
                          else setImageIndexes((prev) => ({ ...prev, [p.id]: ((prev[p.id] || 0) - 1 + p.images.length) % p.images.length }));
                        }
                      }}
                    >
                      <Link
                        to={withReturnFrom(`/property/${p.slug}`, currentPath)}
                        className="flex h-full transition-transform duration-200 ease-out will-change-transform"
                        style={{ transform: `translateX(-${imgIdx * 100}%)` }}
                      >
                        {(p.images.length > 0 ? p.images : ['']).map((src, i) => (
                          <EntityImage
                            key={i}
                            src={src}
                            alt={p.title}
                            loading={i === 0 ? undefined : 'lazy'}
                            className="w-full h-full object-cover object-center flex-shrink-0 transition-transform duration-700 group-hover:scale-105 pointer-events-none select-none"
                          />
                        ))}
                      </Link>

                      {/* Preview badge */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setQuickViewProperty(p);
                        }}
                        className="absolute bottom-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
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
                            className={`absolute left-1.5 md:left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-11 md:w-8 md:h-12 flex items-center justify-center rounded-md bg-white/90 text-[#002349] hover:bg-white transition-opacity duration-150 cursor-pointer whitespace-nowrap md:opacity-100 ${revealedCards.has(p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            aria-label="Previous image"
                          >
                            <i className="ri-arrow-left-s-line text-base md:text-lg"></i>
                          </button>
                          <button
                            onClick={(e) => nextImage(p.id, e)}
                            className={`absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-11 md:w-8 md:h-12 flex items-center justify-center rounded-md bg-white/90 text-[#002349] hover:bg-white transition-opacity duration-150 cursor-pointer whitespace-nowrap md:opacity-100 ${revealedCards.has(p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            aria-label="Next image"
                          >
                            <i className="ri-arrow-right-s-line text-base md:text-lg"></i>
                          </button>
                        </>
                      )}

                      {/* Image counter - 1/N (Zoopla style) */}
                      {p.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 z-10">
                          <span className="flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 rounded-sm">
                            <span className="w-3.5 h-3.5 flex items-center justify-center">
                              <i className="ri-image-line text-xs"></i>
                            </span>
                            {imgIdx + 1}/{p.images.length}
                          </span>
                        </div>
                      )}

                      {/* Status badge - SALE / RENT only */}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                        <PropertyBadge variant={p.type === 'rent' ? 'rent' : 'sale'} />
                      </div>

                      {/* Top right actions */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <button
                          onClick={() => toggleSave(p.id)}
                          className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-colors ${isSaved ? 'bg-primary text-white' : 'bg-black/40 hover:bg-black/60 text-white'}`}
                        >
                          <i className={`${isSaved ? 'ri-heart-fill' : 'ri-heart-line'} text-sm`}></i>
                        </button>
                        <ShareButton
                          title={p.title}
                          slug={p.slug}
                          id={p.id}
                          priceLabel={format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                          className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-colors bg-black/40 hover:bg-black/60 text-white"
                          activeClassName="bg-primary text-white"
                          iconClassName="text-sm"
                        />
                      </div>
                    </div>

                    {/* Content area - shared Sale/Rent card body */}
                    <PropertyCardBody
                      property={p}
                      format={format}
                      onMessage={() => setContactProperty(p)}
                      variant="rent"
                    />
                  </div>
                );
              }))}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />

            {/* Bottom CTA */}
            {LC.show_alert_cta && (
            <div ref={alertFormRef} className="mt-10 bg-[#f8f7f4] rounded-lg p-6 text-center">
              <h3 className="text-lg font-roboto font-bold text-primary mb-2">{LC.alert_heading}</h3>
              <p className="text-sm font-roboto text-primary/60 mb-4 max-w-md mx-auto">{LC.alert_text_rent}</p>
              <form data-readdy-form="true" id="rent-alert-form" onSubmit={handleEnquiry} noValidate className="flex flex-col sm:flex-row items-center gap-3 max-w-lg mx-auto">
                <div className="flex-1 w-full">
                  <input
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    aria-invalid={alertEmailError ? true : undefined}
                    aria-describedby={alertEmailError ? 'rent-alert-email-error' : undefined}
                    onChange={(e) => { if (alertEmailError && isValidEmail(e.target.value)) setAlertEmailError(''); }}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && !isValidEmail(v)) setAlertEmailError('Please enter a valid email address, e.g. name@example.com.');
                    }}
                    className={`w-full h-16 px-4 text-base font-roboto text-primary bg-white border-2 rounded-lg placeholder:text-primary/40 focus:outline-none focus:ring-2 ${alertEmailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15' : 'border-primary/30 focus:border-primary focus:ring-primary/15'}`}
                  />
                  {alertEmailError && (
                    <p id="rent-alert-email-error" className="mt-1.5 flex items-center gap-1 text-xs font-roboto text-red-500 text-left">
                      <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                        <i className="ri-error-warning-line"></i>
                      </span>
                      {alertEmailError}
                    </p>
                  )}
                </div>
                <input type="hidden" name="type" value="rent_alert" />
                <input type="hidden" name="location" value="" />
                <button type="submit" disabled={alertStatus === 'submitting'} className="w-full sm:w-auto h-11 px-6 bg-primary text-white border-2 border-primary text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {alertStatus === 'success' ? (
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <span className="w-4 h-4 flex items-center justify-center animate-check-pop">
                        <i className="ri-checkbox-circle-fill"></i>
                      </span>
                      Alert set!
                    </span>
                  ) : LC.alert_button}
                </button>
              </form>
              {alertStatus === 'success' && (
                <p className="mt-3 inline-flex items-center justify-center gap-1.5 text-green-600 text-sm font-roboto text-center animate-check-pop">
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-checkbox-circle-fill"></i>
                  </span>
                  Thank you! We&apos;ll respond within 24 hours.
                </p>
              )}
              {alertStatus === 'error' && (
                <p className="text-red-500 text-sm font-roboto text-center">{alertError}</p>
              )}
            </div>
            )}
          </div>

          {/* Right Sidebar - Only in list view */}
          {LC.show_sidebar && viewMode === 'list' && (
            <div className="hidden lg:block lg:w-[25%] xl:w-[22%]">
              <div className="sticky top-[140px] space-y-6">
                {/* Recently Viewed */}
                {recentlyViewed.length > 0 && (
                  <div className="bg-white border border-primary/20 rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-primary/15 mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-roboto font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 flex items-center justify-center">
                          <i className="ri-time-line text-[10px]"></i>
                        </span>
                        {LC.recently_viewed_label}
                      </h3>
                      <button
                        onClick={() => { localStorage.removeItem('recently_viewed_properties'); localStorage.removeItem('recently_viewed_devs'); setRecentlyViewed([]); }}
                        className="text-[10px] font-roboto text-primary/50 hover:text-accent cursor-pointer whitespace-nowrap transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="px-4 py-3 space-y-3">
                      {recentlyViewed.slice(0, 4).map((p) => (
                        <div key={p.id} className="group">
                          <Link
                            to={withReturnFrom(`/property/${p.slug}`, currentPath)}
                            className="flex items-center gap-2.5 cursor-pointer"
                          >
                            <div className="w-14 h-10 flex-shrink-0 overflow-hidden rounded">
                              <EntityImage
                                src={p.image || p.images[0]}
                                alt={p.title}
                                compact
                                className="w-full h-full object-cover object-center"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-roboto font-semibold text-primary group-hover:text-accent transition-colors truncate">
                                {format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                              </p>
                              <p className="text-[10px] font-roboto text-primary/85 truncate">{p.title}</p>
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

                {/* Refine search */}
                <div className="bg-white border border-primary/20 rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-primary/15 mb-2">
                    <h3 className="text-base font-roboto font-bold text-primary uppercase tracking-wide">{LC.refine_label}</h3>
                  </div>
                  <div className="px-4 py-3 space-y-2.5">
                    <p className="text-base font-roboto text-primary/70 leading-relaxed">
                      {geocodedName && radiusMeters
                        ? `Showing properties within ${selectedRadius} of ${geocodedName}`
                        : appliedSearchQuery
                        ? `Showing results for "${appliedSearchQuery}"`
                        : 'Rental properties across surrounding areas'}
                    </p>
                    <RefineSearchChips page="rent" onFilterChange={applyRefineFilter} onNavigate={navigate} />
                    {hasActiveFilters && (
                      <button
                        onClick={clearSearch}
                        className="flex items-center gap-1.5 text-base font-roboto font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer pt-1"
                      >
                        <span className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-close-circle-line text-base"></i>
                        </span>
                        Clear all filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Nearby areas */}
                <div className="bg-white border border-primary/20 rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-primary/15 mb-2">
                    <h3 className="text-xs font-roboto font-bold text-primary uppercase tracking-wide">{LC.popular_areas_label}</h3>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 gap-2">
                    {LC.popular_areas.map((area) => (
                      <button
                        key={area}
                        onClick={() => {
                          setSearchQuery(area);
                          setAppliedSearchQuery(area);
                          setCurrentPage(1);
                        }}
                        className="text-left text-xs font-roboto text-primary/85 hover:text-accent hover:underline transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Related searches */}
                <div className="bg-white border border-primary/20 rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-primary/15 mb-2">
                    <h3 className="text-xs font-roboto font-bold text-primary uppercase tracking-wide">{LC.related_searches_label}</h3>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {LC.related_searches_rent.map((search) => (
                      <button
                        key={search}
                        onClick={() => {
                          let searchTerm = search.replace(' to rent in ', '').replace('Properties ', '').replace(' in ', '').replace('New homes in ', '').trim();
                          if (search === 'New homes') {
                            setSelectedAdded('Last 14 days');
                            setSearchQuery('');
                            setAppliedSearchQuery('');
                          } else if (search === 'Properties for sale') {
                            navigate('/buy');
                            return;
                          } else if (search === 'Explore house prices') {
                            navigate('/valuation');
                            return;
                          } else if (search === 'Find letting agents') {
                            navigate('/landlords');
                            return;
                          } else if (search === 'Studios to rent') {
                            setSelectedBeds('Studio');
                            setSelectedType('Studio');
                            setSearchQuery('');
                            setAppliedSearchQuery('');
                          } else {
                            setSearchQuery(searchTerm);
                            setAppliedSearchQuery(searchTerm);
                          }
                          setCurrentPage(1);
                        }}
                        className="block w-full text-left text-xs font-roboto text-primary/85 hover:text-accent hover:underline transition-colors cursor-pointer"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick links */}
                <div className="bg-white border border-primary/20 rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-primary/15 mb-2">
                    <h3 className="text-xs font-roboto font-bold text-primary uppercase tracking-wide">{LC.quick_links_label}</h3>
                  </div>
                  <div className="px-4 py-3 space-y-2.5">
                    {LC.rent_quick_links.map((l, i) => (
                      <Link key={`${l.link}-${i}`} to={l.link} className="flex items-center gap-2 text-xs font-roboto text-primary/85 hover:text-accent hover:underline transition-colors">
                        <span className="w-3.5 h-3.5 flex items-center justify-center">
                          <i className="ri-link text-[10px]"></i>
                        </span>
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* List property CTA */}
                <div className="bg-primary rounded-lg p-4 text-center">
                  <h3 className="text-white font-roboto font-bold text-xs uppercase tracking-wide mb-1.5">{LC.list_cta_heading}</h3>
                  <p className="text-white/70 font-roboto text-[10px] mb-2.5">{LC.list_cta_text_rent}</p>
                  <Link to={LC.list_cta_button_link} className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-golden text-white font-roboto text-[10px] font-semibold rounded-md hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap">
                    {LC.list_cta_button}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Map view */}
          {viewMode === 'map' && (
            <div className="lg:w-[45%] xl:w-[40%] lg:sticky lg:top-[180px] lg:h-[calc(100vh-200px)]" ref={mapRef}>
              <div className="w-full h-[400px] lg:h-full rounded-lg overflow-hidden border border-primary/12">
                <CommuteMap pins={mapPins} />
              </div>
              {/* Map overlay cards */}
              <div className="hidden lg:block mt-3 space-y-2">
                {paginated.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${activeMapMarker === p.id ? 'border-primary bg-primary/5' : 'border-primary/12 hover:border-primary/20'}`}
                    onClick={() => setActiveMapMarker(activeMapMarker === p.id ? null : p.id)}
                  >
                    <EntityImage src={p.image} alt={p.title} compact className="w-16 h-12 object-cover rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-roboto font-semibold text-primary truncate">{format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}</p>
                      <p className="text-[10px] font-roboto text-primary/50 truncate">{p.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* === FOOTER CTA === */}
      {LC.show_footer_cta && (
      <div className="bg-primary py-12 px-6 text-center">
        <p className="text-golden text-sm font-roboto tracking-widest uppercase mb-3">{LC.footer_eyebrow}</p>
        <h2 className="text-white font-roboto font-bold text-2xl md:text-3xl mb-3">{LC.footer_heading}</h2>
        <p className="text-white/70 font-roboto text-sm mb-7 max-w-md mx-auto">{LC.footer_text_rent}</p>
        <Link to={LC.footer_button_link} className="inline-flex items-center gap-2 px-8 py-3 bg-golden text-white border-2 border-golden font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-colors">
          <i className="ri-home-heart-line"></i>{LC.footer_button_rent}
        </Link>
      </div>
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

      <ContactAgentModal
        isOpen={contactProperty !== null}
        onClose={() => setContactProperty(null)}
        propertyTitle={contactProperty?.title || ''}
        propertyId={contactProperty?.id || ''}
        propertySlug={contactProperty?.slug || ''}
        propertyPrice={contactProperty ? format(contactProperty.rawPrice, contactProperty.currency as 'KES' | 'USD' | 'GBP' | 'EUR') : ''}
        propertyLocation={contactProperty?.location || ''}
      />
    </div>
  );
}