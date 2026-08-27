import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import ContactAgentModal from '@/components/feature/ContactAgentModal';
import Pagination from '@/components/feature/Pagination';
import QuickViewModal from '@/components/feature/QuickViewModal';
import PropertyBadge from '@/components/feature/PropertyBadge';
import PropertyMetaBadges from '@/components/feature/PropertyMetaBadges';
import CompareToolbar from '@/components/feature/CompareToolbar';
import CompareModal from '@/components/feature/CompareModal';
import { useCompareToolbar, type CompareProperty } from '@/hooks/useCompareToolbar';
import { useListings, type MappedListing, type ListingFilters } from '@/hooks/useListings';
import AdvancedFilters, { defaultFilters, FilterState } from '@/pages/Rent/components/AdvancedFilters';
import { usePropertyPageSettings } from '@/hooks/usePropertyPageSettings';
import ListingHero from '@/components/feature/ListingHero';
import LocationSearch, { type LocationSuggestion } from '@/components/feature/LocationSearch';
import MobileFilterPills from '@/components/feature/MobileFilterPills';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useCurrency, type CurrencyCode, type ExchangeRates } from '@/hooks/useCurrency';
import { supabase } from '@/lib/supabase';
import { getPropertySpecs } from '@/lib/propertySpecs';
import { formatTimeAgo } from '@/lib/timeAgo';
import { smartTitleCase } from '@/lib/location';
import { cleanListingDescription } from '@/lib/description';

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

function fmtPriceKes(kes: number, curr: CurrencyCode, rates: ExchangeRates): string {
  const SYMS: Record<string, string> = { KES: 'KES', USD: '$', GBP: '£', EUR: '€', UGX: 'UGX', AED: 'AED', ZAR: 'R' };
  const sym = SYMS[curr] || curr;
  const rate = curr === 'KES' ? 1 : (rates[curr] || 0.0077);
  const val = curr === 'KES' ? kes : Math.round(kes * rate);
  return `${sym} ${val.toLocaleString('en-US')}`;
}
const bedOptions = ['Any beds', 'Studio', '1+', '2+', '3+', '4+', '5+'];
const propTypeOptions = ['Any type', 'House', 'Apartment', 'Bungalow', 'Studio', 'Maisonette', 'Villa', 'Townhouse', 'Penthouse', 'Detached', 'Semi-detached', 'Terraced', 'Land'];
const addedOptions = ['Anytime', 'Last 24 hours', 'Last 3 days', 'Last 7 days', 'Last 14 days'];
const sortOptions = ['Most recent', 'Highest price', 'Lowest price', 'Most reduced', 'Most popular'];
const radiusOptions = ['This area only', '½ mile', '1 mile', '3 miles', '5 miles', '10 miles', '15 miles', '20 miles', '30 miles', '40 miles'];

const nearbyAreas = [
  'Karen', 'Runda', 'Lavington', 'Kilimani', 'Westlands', 'Kileleshwa',
  'Muthaiga', 'Parklands', 'Riverside', 'Gigiri', 'Spring Valley', 'Nyari',
  'Langata', 'Kiserian', 'Ongata Rongai', 'Ngong', 'Kitengela', 'Athi River',
];

const relatedSearches = [
  'New homes for sale',
  'Properties for sale',
  'Explore house prices',
  'Find estate agents',
  'Commercial properties for sale',
  'Studios for sale',
  'Houses for sale',
  'Furnished apartments for sale',
];

export default function Buy() {
  const { hero } = usePropertyPageSettings('buy');
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState('For Sale');
  const { getSite } = useSiteSettings();
  const sitePhone = getSite('contact_phone') || '+254703712984';
  const telHref = `tel:${sitePhone.replace(/[^+\d]/g, '')}`;
  const [searchQuery, setSearchQuery] = useState(() => { try { return localStorage.getItem('buy_search') || ''; } catch { return ''; } });
  const [debouncedSearch, setDebouncedSearch] = useState(() => { try { return localStorage.getItem('buy_search') || ''; } catch { return ''; } });
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);

  const handleLocationChange = (value: string, suggestion?: LocationSuggestion) => {
    setSearchQuery(value);
    setDebouncedSearch(value);
    setSelectedLocation(suggestion || null);
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
                  propertyType: String(row.property_type || ''),
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
    handleLocationChange(area);
    setSelectedRadius('This area only');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRelatedSearch = (search: string) => {
    handleLocationChange(search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col pt-[116px] md:pt-[120px]">
      <Header />

      {/* Hero Section */}
      <ListingHero
        hero={hero}
        defaultEyebrow="Upscale Properties"
        defaultTitle="Properties For Sale"
        defaultSubtitle="Discover exceptional homes across Kenya's most sought-after neighbourhoods."
      />

      {/* === SEARCH + FILTER BAR === */}
      <div className="z-40 bg-white border-b border-primary/12 shadow-sm mt-6">
        {/* ── Desktop search bar (lg+) ── */}
        <div className="hidden lg:block px-4 md:px-6 lg:px-10 py-3">
          <div className="flex items-stretch gap-[2px] max-w-[1400px] mx-auto">
            <LocationSearch
              value={searchQuery}
              onChange={handleLocationChange}
              className="flex-[1.4] min-w-0"
              placeholderCycle={[
                "Looking for a home in a leafy suburb...",
                "Looking for a villa with a garden...",
                "Looking for an apartment with a view...",
                "Looking for a house in a quiet area...",
                "Looking for a bungalow with character...",
              ]}
            />
            <div className="flex items-center gap-[2px] flex-shrink-0">
              <div className="relative">
                <select value={selectedStatus} onChange={(e) => { const v = e.target.value; setSelectedStatus(v); if (v === 'For Rent') navigate('/rent'); }} className="appearance-none h-11 px-3 pr-8 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer whitespace-nowrap transition-colors">
                  <option value="For Sale">For Sale</option>
                  <option value="For Rent">For Rent</option>
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none"><i className="ri-arrow-down-s-line text-sm"></i></span>
              </div>
              <div className="relative">
                <select value={selectedRadius} onChange={(e) => setSelectedRadius(e.target.value)} className="appearance-none h-11 px-3 pr-8 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer whitespace-nowrap transition-colors">
                  {radiusOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none"><i className="ri-arrow-down-s-line text-sm"></i></span>
              </div>
              <div className="relative">
                <select value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)} className="appearance-none h-11 px-3 pr-8 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer whitespace-nowrap transition-colors">
                  {priceOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none"><i className="ri-arrow-down-s-line text-sm"></i></span>
              </div>
              <div className="relative">
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="appearance-none h-11 px-3 pr-8 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer whitespace-nowrap transition-colors">
                  {propTypeOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none"><i className="ri-arrow-down-s-line text-sm"></i></span>
              </div>
            </div>
            <button
              onClick={() => setShowAdvancedFilters(true)}
              className={`flex items-center gap-1.5 h-11 px-3 text-sm font-roboto font-semibold border rounded-lg transition-colors cursor-pointer whitespace-nowrap ${showAdvancedFilters ? 'text-accent border-accent bg-accent/5' : 'text-accent border-accent/20 hover:bg-accent hover:text-white hover:border-accent'}`}
            >
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-equalizer-line text-sm"></i></span>
              Advanced
            </button>
            <button onClick={handleSearch} className="flex items-center gap-1.5 h-11 px-5 bg-primary text-white border-2 border-primary text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60">
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-sm"></i></span>
              Search
            </button>
            <button onClick={() => setSearchBookmarked(!searchBookmarked)} title="Save this search" className={`flex items-center justify-center w-11 h-11 border rounded-lg transition-colors cursor-pointer ${searchBookmarked ? 'border-primary text-primary bg-primary/5' : 'text-primary border-primary/50 hover:bg-primary hover:text-white hover:border-primary'}`}>
              <span className="w-4 h-4 flex items-center justify-center"><i className={`${searchBookmarked ? 'ri-heart-fill' : 'ri-heart-line'} text-sm`}></i></span>
            </button>
          </div>
        </div>

        {/* ── Tablet search bar (md to lg) ── */}
        <div className="hidden md:block lg:hidden px-4 md:px-6 py-3">
          <div className="flex items-stretch gap-[2px] max-w-[1400px] mx-auto">
            <LocationSearch
              value={searchQuery}
              onChange={handleLocationChange}
              className="flex-[1.2] min-w-0"
              placeholderCycle={[
                "Looking for a home in a leafy suburb...",
                "Looking for a villa with a garden...",
                "Looking for an apartment with a view...",
                "Looking for a house in a quiet area...",
                "Looking for a bungalow with character...",
              ]}
            />
            <div className="flex items-center gap-[2px] flex-shrink-0">
              <div className="relative">
                <select value={selectedStatus} onChange={(e) => { const v = e.target.value; setSelectedStatus(v); if (v === 'For Rent') navigate('/rent'); }} className="appearance-none h-11 px-3 pr-8 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer whitespace-nowrap transition-colors">
                  <option value="For Sale">For Sale</option>
                  <option value="For Rent">For Rent</option>
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none"><i className="ri-arrow-down-s-line text-sm"></i></span>
              </div>
              <div className="relative">
                <select value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)} className="appearance-none h-11 px-3 pr-8 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer whitespace-nowrap transition-colors">
                  {priceOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none"><i className="ri-arrow-down-s-line text-sm"></i></span>
              </div>
              <div className="relative">
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="appearance-none h-11 px-3 pr-8 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer whitespace-nowrap transition-colors">
                  {propTypeOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <span className="w-4 h-4 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none"><i className="ri-arrow-down-s-line text-sm"></i></span>
              </div>
            </div>
            <button
              onClick={() => setShowAdvancedFilters(true)}
              className={`flex items-center gap-1.5 h-11 px-3 text-sm font-roboto font-semibold border rounded-lg transition-colors cursor-pointer whitespace-nowrap ${showAdvancedFilters ? 'text-accent border-accent bg-accent/5' : 'text-accent border-accent/20 hover:bg-accent hover:text-white hover:border-accent'}`}
            >
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-equalizer-line text-sm"></i></span>
              Advanced
            </button>
            <button onClick={handleSearch} className="flex items-center gap-1.5 h-11 px-4 bg-primary text-white border-2 border-primary text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-sm"></i></span>
              Search
            </button>
          </div>
        </div>

        {/* ── Mobile search bar (below md) ── */}
        <div className="md:hidden px-4 py-3">
          <div className="flex items-stretch gap-[2px]">
            <LocationSearch
                value={searchQuery}
                onChange={handleLocationChange}
                className="flex-1 min-w-0"
                placeholderCycle={[
                  "Looking for a home in a leafy suburb...",
                  "Looking for a villa with a garden...",
                  "Looking for an apartment with a view...",
                  "Looking for a house in a quiet area...",
                  "Looking for a bungalow with character...",
                ]}
              />
            <button onClick={() => setShowAdvancedFilters(true)} className={`flex items-center justify-center w-11 h-11 border rounded-lg cursor-pointer transition-colors ${showAdvancedFilters ? 'text-accent border-accent bg-accent/5' : 'text-accent border-accent/20 hover:bg-accent hover:text-white hover:border-accent'}`}>
              <i className="ri-equalizer-line text-lg"></i>
            </button>
            <button onClick={handleSearch} className="flex items-center justify-center w-11 h-11 bg-primary text-white border-2 border-primary rounded-lg cursor-pointer disabled:opacity-60 hover:bg-primary/90 transition-colors">
              <i className="ri-search-line text-lg"></i>
            </button>
          </div>
        </div>

        {/* Secondary filter bar */}
        <div className="hidden md:flex items-center justify-between px-4 md:px-6 lg:px-10 pb-0 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <button className="flex items-center gap-1.5 py-2 text-xs font-roboto font-semibold text-primary border-b-2 border-transparent hover:text-primary transition-colors cursor-pointer">
                {selectedAdded}
                <span className="w-3 h-3 flex items-center justify-center text-primary/50"><i className="ri-arrow-down-s-line text-xs"></i></span>
              </button>
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-primary/12 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {addedOptions.map((o) => (
                  <button
                    key={o}
                    onClick={() => setSelectedAdded(o)}
                    className={`w-full text-left px-3 py-2 text-xs font-roboto cursor-pointer hover:bg-gray-50 ${selectedAdded === o ? 'text-primary font-semibold' : 'text-primary/60'}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative group">
              <button className="flex items-center gap-1.5 py-2 text-xs font-roboto font-semibold text-primary border-b-2 border-transparent hover:text-primary transition-colors cursor-pointer">
                {sortBy}
                <span className="w-3 h-3 flex items-center justify-center text-primary/50"><i className="ri-arrow-down-s-line text-xs"></i></span>
              </button>
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-primary/12 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {sortOptions.map((o) => (
                  <button
                    key={o}
                    onClick={() => setSortBy(o)}
                    className={`w-full text-left px-3 py-2 text-xs font-roboto cursor-pointer hover:bg-gray-50 ${sortBy === o ? 'text-primary font-semibold' : 'text-primary/60'}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
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
          <div className="flex items-center gap-6">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 py-2 text-xs font-roboto font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${viewMode === 'list' ? 'text-primary border-primary' : 'text-primary/70 border-primary/30 hover:text-primary'}`}
            >
              <i className="ri-list-check text-xs"></i>
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 py-2 text-xs font-roboto font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${viewMode === 'map' ? 'text-primary border-primary' : 'text-primary/70 border-primary/30 hover:text-primary'}`}
            >
              <i className="ri-map-2-line text-xs"></i>
              Map
            </button>
            <button onClick={() => setSavedSearch(!savedSearch)} className={`flex items-center gap-1.5 py-2 text-xs font-roboto font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${savedSearch ? 'text-primary border-primary' : 'text-primary/70 border-primary/30 hover:text-primary hover:border-primary/40'}`}>
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

      {/* Mobile filter pills */}
      <MobileFilterPills
        pills={[
          ...(selectedPrice !== 'Any price' ? [{ key: 'price', label: selectedPrice, onRemove: () => setSelectedPrice('Any price') }] : []),
          ...(selectedBeds !== 'Any beds' ? [{ key: 'beds', label: selectedBeds, onRemove: () => setSelectedBeds('Any beds') }] : []),
          ...(selectedType !== 'Any type' ? [{ key: 'type', label: selectedType, onRemove: () => setSelectedType('Any type') }] : []),
          ...(selectedAdded !== 'Anytime' ? [{ key: 'added', label: selectedAdded, onRemove: () => setSelectedAdded('Anytime') }] : []),
          ...(selectedRadius !== 'This area only' ? [{ key: 'radius', label: selectedRadius, onRemove: () => setSelectedRadius('This area only') }] : []),
          ...(sortBy !== 'Most recent' ? [{ key: 'sort', label: sortBy, onRemove: () => setSortBy('Most recent') }] : []),
          ...(selectedStatus !== 'For Sale' ? [{ key: 'status', label: selectedStatus, onRemove: () => setSelectedStatus('For Sale') }] : []),
        ]}
        onClearAll={() => {
          setSelectedPrice('Any price');
          setSelectedBeds('Any beds');
          setSelectedType('Any type');
          setSelectedAdded('Anytime');
          setSelectedRadius('This area only');
          setSortBy('Most recent');
          handleLocationChange('');
        }}
      />

      {/* === RESULTS HEADER === */}
      <div className="px-4 md:px-6 lg:px-10 pt-6 pb-2 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-roboto font-bold text-primary">Properties for sale</h1>
            <p className="text-xs font-roboto text-primary/50 mt-0.5">
              <span className="text-primary font-semibold">{activeCount}</span> properties &middot; <span className="text-primary font-semibold">{agentCount}</span> agents
            </p>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none h-8 px-3 pr-7 text-xs font-roboto font-medium text-primary/60 bg-white border border-primary/20 rounded-lg focus:outline-none cursor-pointer">
                {sortOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-primary/50 text-xs pointer-events-none"></i>
            </div>
            <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="w-8 h-8 flex items-center justify-center border border-primary/20 rounded-lg text-primary/60 cursor-pointer">
              <i className={viewMode === 'list' ? 'ri-map-2-line text-xs' : 'ri-list-check text-xs'}></i>
            </button>
          </div>
        </div>
      </div>

      {/* === MAIN CONTENT === */}
      <main className="flex-1 px-4 md:px-6 lg:px-10 pb-24 md:pb-10 max-w-[1400px] mx-auto w-full">
        <div className={`flex gap-6 ${viewMode === 'map' ? 'flex-col lg:flex-row' : 'flex-col lg:flex-row'}`}>
          {/* Listings */}
          <div className={`${viewMode === 'map' ? 'lg:w-[55%] xl:w-[60%]' : 'lg:w-[75%] xl:w-[78%]'}`}>
            {/* Create alert tab bar */}
            <div className="flex items-center gap-2 mb-4">
              <button onClick={scrollToAlertForm} className="flex items-center gap-1.5 h-9 px-4 text-xs font-roboto font-medium text-primary/60 border border-primary/20 rounded-lg hover:border-primary hover:text-primary transition-colors cursor-pointer whitespace-nowrap">
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
                    <div key={i} className="flex flex-col sm:flex-row bg-white border-2 border-primary/12 rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden md:h-[300px] animate-pulse">
                      <div className="w-full sm:w-[280px] md:w-[360px] lg:w-[400px] xl:w-[440px] h-[220px] sm:h-full bg-gray-200 flex-shrink-0"></div>
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
                  <p className="text-sm font-roboto text-primary/60 mb-4">{error}</p>
                  <button onClick={refetch} className="px-6 py-2 bg-primary text-white border-2 border-primary text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
                    Try again
                  </button>
                </div>
              )}

              {!loading && !error && paginated.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100">
                    <i className="ri-search-line text-primary/50 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-roboto font-bold text-primary mb-2">No properties found</h3>
                  <p className="text-sm font-roboto text-primary/60 mb-4">Try adjusting your search or filters to see more results.</p>
                  <button onClick={() => { handleLocationChange(''); setSelectedPrice('Any price'); setSelectedBeds('Any beds'); setSelectedType('Any type'); }} className="px-6 py-2 bg-primary text-white border-2 border-primary text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
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
                    className="flex flex-col sm:flex-row bg-white rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden md:h-[300px] hover:shadow-[0_2px_4px_rgba(0,23,49,0.06),0_8px_24px_rgba(0,23,49,0.10),0_24px_64px_rgba(0,23,49,0.12)] transition-all duration-200"
                    onMouseEnter={() => setHoveredCard(p.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Image area */}
                    <div className="relative w-full sm:w-[280px] md:w-[360px] lg:w-[400px] xl:w-[440px] h-[220px] sm:h-full flex-shrink-0 overflow-hidden group"
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
                        to={`/property/${p.slug}`}
                        className="flex h-full transition-transform duration-200 ease-out will-change-transform"
                        style={{ transform: `translateX(-${imgIdx * 100}%)` }}
                      >
                        {p.images.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt={p.title}
                            loading={i === 0 ? undefined : "lazy"}
                            className="w-full h-full object-cover object-center flex-shrink-0 transition-transform duration-700 group-hover:scale-105 pointer-events-none select-none"
                          />
                        ))}
                      </Link>

                      {/* Image counter */}
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
                            className="absolute left-1.5 md:left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-white/90 text-[#002349] hover:bg-white transition-all duration-150 cursor-pointer whitespace-nowrap opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            aria-label="Previous image"
                          >
                            <i className="ri-arrow-left-s-line text-base md:text-lg"></i>
                          </button>
                          <button
                            onClick={(e) => nextImage(p.id, e)}
                            className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-white/90 text-[#002349] hover:bg-white transition-all duration-150 cursor-pointer whitespace-nowrap opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            aria-label="Next image"
                          >
                            <i className="ri-arrow-right-s-line text-base md:text-lg"></i>
                          </button>
                        </>
                      )}

                      {/* Status badge — SALE / RENT only */}
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
                        <PropertyMetaBadges
                          featured={p.featured}
                          justListed={p.justAdded}
                          jointVenture={p.isJointVenture}
                          newHome={p.newHome}
                          reduced={p.reduced}
                          videoTour={p.videoTour}
                          virtualTour={p.virtualTour}
                          floorPlan={p.floorPlan}
                          houseShare={p.houseShare}
                          propertyOfTheWeek={p.propertyOfTheWeek}
                          backOnMarket={p.backOnMarket}
                          refurbished={p.refurbished}
                          className="mb-2"
                        />
                        {/* Price & title */}
                        {/* Price — Rightmove style: value + Guide price same size + info icon */}
                        <div className="mb-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-roboto font-semibold text-primary text-sm md:text-base lg:text-lg">{format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}</span>
                            <span className="text-xs font-roboto text-[#636363]">Guide price</span>
                            <span className="w-4 h-4 flex items-center justify-center cursor-help" title="The asking price set by the seller">
                              <i className="ri-information-line text-[#636363] text-sm"></i>
                            </span>
                          </div>
                        </div>

                        {/* Meta badges — Rightmove bold style */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                          {getPropertySpecs(p.propertyType, {
                            beds: p.beds,
                            baths: p.baths,
                            parking: p.parking,
                            sqft: p.sqft,
                            acreage: p.acreage,
                            landSize: p.landSize,
                            landUnit: p.landUnit,
                          }).map((spec) => (
                            <span key={spec.key} className="flex items-center gap-1 text-xs md:text-sm font-roboto font-medium text-[#222222]">
                              <i className={`${spec.icon} text-[#555555] text-xs`}></i>
                              {spec.label}
                            </span>
                          ))}
                          {p.beds === 0 && p.baths === 0 && p.parking === 0 && p.sqft === 0 && p.acreage === 0 && p.landSize === 0 && (
                            <span className="text-xs font-roboto text-primary/50 italic">Details on request</span>
                          )}
                        </div>

                        <Link to={`/property/${p.slug}`} className="block mb-3">
                          <h3 className="text-sm md:text-base font-roboto font-bold text-primary leading-snug mb-1 line-clamp-2 transition-colors hover:text-[#2d4a7a]">{p.title}</h3><address className="not-italic flex items-start gap-1.5">
                            <span className="w-3 h-3 flex items-center justify-center shrink-0 mt-0.5">
                              <i className="ri-map-pin-line text-golden text-[10px]"></i>
                            </span>
                            <span className="min-w-0">
                              <span className="block text-xs md:text-sm font-roboto font-medium text-primary/70 leading-snug">
                                {p.area || p.location}
                              </span>
                            </span>
                          </address>
                        </Link>

                        {/* Description */}
                        <p className="text-xs md:text-sm font-roboto text-[#555555] leading-relaxed line-clamp-2 mb-3">{cleanListingDescription(p.description)}</p>
                      </div>

                      {/* Agent footer — Rightmove style: Added today green bold */}
                      <div className="flex items-end justify-between gap-3 pt-2.5 border-t-2 border-primary/12">
                        <span className="text-xs font-roboto font-bold text-[#00703c] whitespace-nowrap shrink-0">
                            {formatTimeAgo(p.createdAt)}
                          </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <a href={`tel:${p.agentPhone || '+2547111393806'}`} className="flex items-center gap-1 text-xs font-roboto font-semibold text-primary hover:text-[#2d4a7a] rounded px-1.5 py-0.5 transition-colors cursor-pointer whitespace-nowrap">
                            <span className="w-3.5 h-3.5 flex items-center justify-center">
                              <i className="ri-phone-line text-xs"></i>
                            </span>
                            Call
                          </a>
                          <button onClick={() => setContactModalProperty(p)} className="flex items-center gap-1 text-xs font-roboto font-semibold text-primary hover:text-[#2d4a7a] rounded px-1.5 py-0.5 transition-colors cursor-pointer whitespace-nowrap">
                            <span className="w-3.5 h-3.5 flex items-center justify-center">
                              <i className="ri-mail-line text-xs"></i>
                            </span>
                            Message Agent
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />

            {/* Bottom CTA */}
            <div ref={alertFormRef} className="mt-10 bg-[#f8f7f4] rounded-lg p-6 text-center">
              <h3 className="text-lg font-roboto font-bold text-primary mb-2">Can&apos;t find what you&apos;re looking for?</h3>
              <p className="text-sm font-roboto text-primary/60 mb-4 max-w-md mx-auto">Register for property alerts and be the first to know about new homes for sale in your area.</p>
              <form data-readdy-form="true" id="buy-alert-form" onSubmit={handleEnquiry} className="flex flex-col sm:flex-row items-center gap-3 max-w-lg mx-auto">
                <input name="email" type="email" placeholder="Enter your email" required className="flex-1 w-full h-11 px-4 text-sm font-roboto border border-primary/20 rounded-lg focus:outline-none focus:border-primary" />
                <input type="hidden" name="type" value="buy_alert" />
                <input type="hidden" name="location" value="" />
                <input type="text" name="company_alt" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly className="footer-hp-field" />
                <button type="submit" disabled={alertStatus === 'submitting'} className="w-full sm:w-auto px-5 py-2.5 bg-primary text-white border-2 border-primary text-base font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
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
              <div className="sticky top-[140px] space-y-6">
                {/* Recently Viewed */}
                {recentlyViewed.length > 0 && (
                  <div className="bg-white border border-primary/12 rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-primary/15 mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-roboto font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 flex items-center justify-center">
                          <i className="ri-time-line text-[10px]"></i>
                        </span>
                        Recently Viewed
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
                            to={`/property/${p.slug}`}
                            className="flex items-center gap-2.5 cursor-pointer"
                          >
                            <div className="w-14 h-10 flex-shrink-0 overflow-hidden rounded">
                              <img
                                src={p.image || p.images[0]}
                                alt={p.title}
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
                <div className="bg-white border border-primary/12 rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-primary/15 mb-2">
                    <h3 className="text-xs font-roboto font-bold text-primary uppercase tracking-wide">Refine your search</h3>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-roboto text-primary/70">Refine your search with specific requirements</p>
                  </div>
                </div>

                {/* Nearby areas */}
                <div className="bg-white border border-primary/12 rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-primary/15 mb-2">
                    <h3 className="text-xs font-roboto font-bold text-primary uppercase tracking-wide">Popular areas</h3>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 gap-2">
                    {nearbyAreas.map((area) => (
                      <button key={area} onClick={() => handleAreaClick(area)} className="text-left text-xs font-roboto text-primary/85 hover:text-accent hover:underline transition-colors cursor-pointer">
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Related searches */}
                <div className="bg-white border border-primary/12 rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-primary/15 mb-2">
                    <h3 className="text-xs font-roboto font-bold text-primary uppercase tracking-wide">Related searches</h3>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {relatedSearches.map((search) => (
                      <button key={search} onClick={() => handleRelatedSearch(search.replace(' for sale in ', '').replace(' in ', ''))} className="block text-left w-full text-xs font-roboto text-primary/85 hover:text-accent hover:underline transition-colors cursor-pointer">
                        {search}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List property CTA */}
                <div className="bg-primary rounded-lg p-4 text-center">
                  <h3 className="text-white font-roboto font-bold text-xs uppercase tracking-wide mb-1.5">List your property</h3>
                  <p className="text-white/70 font-roboto text-[10px] mb-2.5">Reach thousands of qualified buyers</p>
                  <Link to="/landlords" className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-accent text-white font-roboto text-xs font-semibold rounded-md hover:bg-accent/90 transition-colors cursor-pointer whitespace-nowrap">
                    Get started
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Map view */}
          {viewMode === 'map' && (
            <div className="lg:w-[45%] xl:w-[40%] lg:sticky lg:top-[180px] lg:h-[calc(100vh-200px)]" ref={mapRef}>
              <div className="w-full h-[400px] lg:h-full rounded-lg overflow-hidden border border-primary/12">
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
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${activeMapMarker === p.id ? 'border-primary bg-primary/5' : 'border-primary/12 hover:border-primary/20'}`}
                    onClick={() => setActiveMapMarker(activeMapMarker === p.id ? null : p.id)}
                  >
                    <img src={p.image} alt={p.title} className="w-16 h-12 object-cover rounded" />
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
      <div className="bg-primary py-12 px-6 text-center">
        <p className="text-golden text-sm font-roboto tracking-widest uppercase mb-3">Own a Property?</p>
        <h2 className="text-white font-roboto font-bold text-2xl md:text-3xl mb-3">List Your Property With Us</h2>
        <p className="text-white/70 font-roboto text-sm mb-7 max-w-md mx-auto">Reach thousands of qualified buyers. Get a free market valuation from our expert team today.</p>
        <Link to="/landlords" className="inline-flex items-center gap-2 px-8 py-3 bg-golden text-white border-2 border-golden font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-colors">
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