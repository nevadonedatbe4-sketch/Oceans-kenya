import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import QuickViewModal from '@/components/feature/QuickViewModal';
import ContactAgentModal from '@/components/feature/ContactAgentModal';
import CompareToolbar from '@/components/feature/CompareToolbar';
import CompareModal from '@/components/feature/CompareModal';
import PropertySearchBar from '@/components/feature/PropertySearchBar';
import Pagination from '@/components/feature/Pagination';
import PropertyMetaBadges from '@/components/feature/PropertyMetaBadges';
import CardContactActions from '@/components/feature/CardContactActions';
import EntityImage from '@/components/feature/EntityImage';
import ShareButton from '@/components/feature/ShareButton';
import RecentActivitySuggestion from '@/components/feature/RecentActivitySuggestion';
import { useCompareToolbar, type CompareProperty } from '@/hooks/useCompareToolbar';
import { useListings, type MappedListing, type ListingFilters } from '@/hooks/useListings';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/lib/supabase';
import { getPropertySpecs } from '@/lib/propertySpecs';
import { formatListingAge } from '@/lib/listingMeta';
import { smartTitleCase } from '@/lib/location';
import { cleanListingDescription } from '@/lib/description';
import { useCommercialPropertyPageContent } from '@/hooks/useCommercialPropertyPageContent';
import CommercialAdvancedFilters, { defaultCommercialFilters, COMMERCIAL_MUST_HAVES, type CommercialFilterState } from '@/pages/CommercialProperty/components/CommercialAdvancedFilters';
import { BEDROOM_OPTIONS, bedroomSelectionToRange } from '@/lib/bedrooms';
import { rentPriceMinOptions, rentPriceMaxOptions, salePriceMinOptions, salePriceMaxOptions, parsePriceSelection, priceRangeInvalid } from '@/lib/prices';
import { ADDED_WINDOW_OPTIONS } from '@/lib/recentWindow';

const ITEMS_PER_PAGE = 10;

// Commercial property type mapping for DB filtering
const COMM_TYPE_DB_MAP: Record<string, string> = {
  any: '',
  office: 'office',
  serviced_office: 'serviced_office',
  retail: 'retail_shop',
  guest_house: 'guest_house',
  leisure: 'leisure',
  warehouse: 'warehouse',
  industrial: 'industrial',
  land: 'land',
  other: 'other',
};

// Commercial property type options - labels drive the shared search bar's
// "Property type" dropdown; keys map to the DB values above.
const COMM_TYPE_OPTIONS: { key: string; label: string }[] = [
  { key: 'any', label: 'Show all' },
  { key: 'office', label: 'Offices' },
  { key: 'serviced_office', label: 'Serviced Office' },
  { key: 'retail', label: 'Retail / Shop' },
  { key: 'leisure', label: 'Leisure / Hospitality' },
  { key: 'guest_house', label: 'Guest House' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'industrial', label: 'Industrial' },
  { key: 'land', label: 'Land / Development' },
  { key: 'other', label: 'Other' },
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

const bedOptions = BEDROOM_OPTIONS;
const sortOptions = ['Recommended', 'Most recent', 'Highest price', 'Lowest price', 'Most reduced', 'Most popular', 'A - Z', 'Z - A'];
const radiusOptions = ['This area only', '\u00bc mile', '\u00bd mile', '1 mile', '3 miles', '5 miles', '10 miles', '15 miles', '20 miles', '30 miles', '40 miles'];

export default function CommercialProperty() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isBuy = searchParams.get('buy') !== 'false';
  const purpose: 'sale' | 'rent' = isBuy ? 'sale' : 'rent';
  const urlAdded = searchParams.get('added') || '';

  const [searchQuery, setSearchQuery] = useState(() => { try { return localStorage.getItem('comm_search') || ''; } catch { return ''; } });
  const [debouncedSearch, setDebouncedSearch] = useState(() => { try { return localStorage.getItem('comm_search') || ''; } catch { return ''; } });
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  };

  const [selectedRadius, setSelectedRadius] = useState(() => { try { return localStorage.getItem('comm_radius') || 'This area only'; } catch { return 'This area only'; } });
  const [priceMin, setPriceMin] = useState(() => { try { return localStorage.getItem(`comm_price_min_${purpose}`) || 'No min'; } catch { return 'No min'; } });
  const [priceMax, setPriceMax] = useState(() => { try { return localStorage.getItem(`comm_price_max_${purpose}`) || 'No max'; } catch { return 'No max'; } });
  const [selectedBeds, setSelectedBeds] = useState(() => { try { return localStorage.getItem('comm_beds') || 'Any beds'; } catch { return 'Any beds'; } });
  const [selectedType, setSelectedType] = useState(() => {
    // A shared / footer link (?type=office) must win over any stored default.
    const t = searchParams.get('type') || '';
    if (t && Object.prototype.hasOwnProperty.call(COMM_TYPE_DB_MAP, t)) return t;
    try { return localStorage.getItem('comm_type') || 'any'; } catch { return 'any'; }
  });
  const [minSize, setMinSize] = useState(() => { try { return localStorage.getItem('comm_minsize') || ''; } catch { return ''; } });
  const [maxSize, setMaxSize] = useState(() => { try { return localStorage.getItem('comm_maxsize') || ''; } catch { return ''; } });
  const [selectedAdded, setSelectedAdded] = useState(() => {
    // Prefer an explicit shareable URL value, then the saved choice. A stale
    // saved value (e.g. a removed 'Last 48 hours' option) is ignored.
    if (ADDED_WINDOW_OPTIONS.includes(urlAdded)) return urlAdded;
    try {
      const saved = localStorage.getItem('comm_added') || '';
      if (ADDED_WINDOW_OPTIONS.includes(saved)) return saved;
    } catch { /* ignore */ }
    return 'Anytime';
  });
  const [sortBy, setSortBy] = useState(() => {
    try {
      const saved = localStorage.getItem('comm_sort_v2');
      return saved && saved !== 'Recommended' ? saved : 'Recommended';
    } catch { return 'Recommended'; }
  });
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<CommercialFilterState>({ ...defaultCommercialFilters });
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  // On touch devices there is no real hover, so the first tap on a card image
  // reveals the prev/next arrows instead of jumping straight to the listing.
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [activeMapMarker, setActiveMapMarker] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const alertFormRef = useRef<HTMLDivElement>(null);
  const resultsTopRef = useRef<HTMLDivElement>(null);
  const resultsScrollInit = useRef(false);
  const [savedSearch, setSavedSearch] = useState(false);
  const [searchBookmarked, setSearchBookmarked] = useState(false);
  const [quickViewProperty, setQuickViewProperty] = useState<MappedListing | null>(null);
  const [contactModalProperty, setContactModalProperty] = useState<MappedListing | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<MappedListing[]>([]);
  const compare = useCompareToolbar();
  const [showCompareModal, setShowCompareModal] = useState(false);
  const { status: alertStatus, error: alertError, submitToContacts, reset: resetAlert } = useFormSubmit();
  const { format, currency, rates } = useCurrency();
  const { content: c } = useCommercialPropertyPageContent();

  const priceMinOpts = useMemo(() => (isBuy ? salePriceMinOptions(currency, rates) : rentPriceMinOptions(currency, rates)), [isBuy, currency, rates]);
  const priceMaxOpts = useMemo(() => (isBuy ? salePriceMaxOptions(currency, rates) : rentPriceMaxOptions(currency, rates)), [isBuy, currency, rates]);
  const priceMinValue = parsePriceSelection(priceMinOpts, priceMin);
  const priceMaxValue = parsePriceSelection(priceMaxOpts, priceMax);
  const priceRangeError = priceRangeInvalid(priceMinValue, priceMaxValue) ? 'Minimum price cannot be greater than maximum price.' : '';

  const prevCurrencyRef = useRef(currency);
  useEffect(() => {
    if (prevCurrencyRef.current !== currency) {
      setPriceMin('No min');
      setPriceMax('No max');
      prevCurrencyRef.current = currency;
    }
  }, [currency]);

  useEffect(() => {
    try { localStorage.setItem('comm_search', searchQuery); } catch { /* ignore */ }
    try { localStorage.setItem('comm_radius', selectedRadius); } catch { /* ignore */ }
    try { localStorage.setItem(`comm_price_min_${purpose}`, priceMin); } catch { /* ignore */ }
    try { localStorage.setItem(`comm_price_max_${purpose}`, priceMax); } catch { /* ignore */ }
    try { localStorage.setItem('comm_beds', selectedBeds); } catch { /* ignore */ }
    try { localStorage.setItem('comm_type', selectedType); } catch { /* ignore */ }
    try { localStorage.setItem('comm_minsize', minSize); } catch { /* ignore */ }
    try { localStorage.setItem('comm_maxsize', maxSize); } catch { /* ignore */ }
    try { localStorage.setItem('comm_added', selectedAdded); } catch { /* ignore */ }
    try { localStorage.setItem('comm_sort_v2', sortBy); } catch { /* ignore */ }
  }, [searchQuery, selectedRadius, priceMin, priceMax, selectedBeds, selectedType, minSize, maxSize, selectedAdded, sortBy, purpose]);

  // A footer or shared link can change the commercial type while we are ALREADY
  // on /commercial-property (React Router keeps this component mounted). Re-apply
  // the URL type so an explicit category link always wins over stale state.
  useEffect(() => {
    const t = searchParams.get('type') || '';
    if (t && Object.prototype.hasOwnProperty.call(COMM_TYPE_DB_MAP, t) && t !== selectedType) {
      setSelectedType(t);
    }
    const a = searchParams.get('added') || '';
    if (ADDED_WINDOW_OPTIONS.includes(a) && a !== selectedAdded) setSelectedAdded(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Sync the rent/buy mode, type and "Added to site" window to the URL so a
  // filtered commercial search survives refresh, back/forward and sharing.
  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (!isBuy) nextParams.set('buy', 'false');
    if (selectedType && selectedType !== 'any') nextParams.set('type', selectedType);
    if (selectedAdded !== 'Anytime') nextParams.set('added', selectedAdded);
    setSearchParams(nextParams.toString(), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBuy, selectedType, selectedAdded]);

  const mustHaveGroups = useMemo(
    () => advancedFilters.mustHaves
      .map((key) => COMMERCIAL_MUST_HAVES.find((m) => m.key === key)?.amenities || [])
      .filter((group) => group.length > 0),
    [advancedFilters.mustHaves]
  );

  const buildFilters = (): ListingFilters => {
    const hasSectors = advancedFilters.sectors.length > 0;
    const combinedSearch = [debouncedSearch, advancedFilters.keywords].filter(Boolean).join(' ').trim();
    const filters: ListingFilters = {
      purpose,
      search: combinedSearch,
      propertyType: hasSectors ? '' : (COMM_TYPE_DB_MAP[selectedType] ?? ''),
      propertyTypes: hasSectors ? advancedFilters.sectors : undefined,
      addedSince: selectedAdded,
      sortBy,
      statusFilter: 'active',
      propertyCategory: 'commercial',
      amenitiesGroups: mustHaveGroups,
    };
    // Price - independent min / max bounds enforced in the query.
    if (priceMinValue !== undefined && priceMinValue > 0) filters.priceMin = priceMinValue;
    if (priceMaxValue !== undefined && priceMaxValue > 0) filters.priceMax = priceMaxValue;
    // Advanced-panel price (same shared ladder) refines the bounds when set.
    const advMin = advancedFilters.minPrice ? Number(advancedFilters.minPrice) : undefined;
    const advMax = advancedFilters.maxPrice ? Number(advancedFilters.maxPrice) : undefined;
    if (advMin !== undefined && advMin > 0) filters.priceMin = advMin;
    if (advMax !== undefined && advMax > 0) filters.priceMax = advMax;
    if (selectedBeds === 'Studio') { filters.bedsExact = 0; }
    else Object.assign(filters, bedroomSelectionToRange(selectedBeds));
    const minsz = parseFloat(minSize);
    const maxsz = parseFloat(maxSize);
    if (!isNaN(minsz) && minsz > 0) filters.sqmMin = minsz;
    if (!isNaN(maxsz) && maxsz > 0) filters.sqmMax = maxsz;
    return filters;
  };

  const { listings, totalCount, loading, error, refetch } = useListings(buildFilters(), currentPage);
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
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
      type: 'commercial_alert',
      notes: isBuy ? 'Enquiry for commercial properties for sale.' : 'Enquiry for commercial properties to rent.',
      tags: ['commercial_page'],
    });

    if (success) {
      form.reset();
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [priceMin, priceMax, selectedBeds, selectedType, minSize, maxSize, selectedAdded, sortBy]);

  // Keep the visitor in context on page change - bring the top of the results
  // back into view instantly (no disorienting smooth scroll, no jump to the very top).
  useEffect(() => {
    if (!resultsScrollInit.current) { resultsScrollInit.current = true; return; }
    const el = resultsTopRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, top) });
  }, [currentPage]);

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

    try {
      const idsRaw = localStorage.getItem('recently_viewed_properties');
      if (idsRaw) {
        const ids: string[] = JSON.parse(idsRaw);
        const realIds = ids.filter((id) => !id.startsWith('mock-')).slice(0, 6);
        if (realIds.length > 0) {
          supabase
            .from('all_listings')
            .select('id,title,location,price,property_type,bedrooms,bathrooms,parking,slug,created_at,main_image,images,purpose,currency,owner_phone,owner_email')
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

  const activeCount = totalCount;

  const handleSearch = () => {
    refetch();
  };

  const scrollToAlertForm = () => {
    alertFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  const commercialAppliedCount = useMemo(() => [
    advancedFilters.sectors.length > 0,
    minSize !== '' || maxSize !== '',
    selectedAdded !== 'Anytime',
    advancedFilters.keywords.trim() !== '',
    advancedFilters.mustHaves.length > 0,
  ].filter(Boolean).length, [advancedFilters, minSize, maxSize, selectedAdded]);

  const clearAllFilters = () => {
    triggerSearch('');
    setSelectedRadius('This area only');
    setPriceMin('No min');
    setPriceMax('No max');
    setSelectedBeds('Any beds');
    setSelectedType('any');
    setMinSize('');
    setMaxSize('');
    setSelectedAdded('Anytime');
    setAdvancedFilters({ ...defaultCommercialFilters });
    setCurrentPage(1);
  };

  const heroEyebrow = isBuy ? c.hero_eyebrow_buy : c.hero_eyebrow_rent;
  const heroTitle = isBuy ? c.hero_title_buy : c.hero_title_rent;
  const heroSubtitle = isBuy ? c.hero_subtitle_buy : c.hero_subtitle_rent;
  const resultsHeading = isBuy ? c.results_heading_buy : c.results_heading_rent;

  return (
    <div className="min-h-screen bg-white flex flex-col pt-[62px] md:pt-[122px] lg:pt-[130px]">
      <Header />

      {/* Hero Section */}
      {c.show_hero && (
      <section className="relative w-full">
        <div className="relative w-full h-[280px] md:h-[380px] lg:h-[420px] overflow-hidden">
          {c.show_hero_image && c.hero_image && (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${c.hero_image})` }}></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/70"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/80 to-primary/50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-6 w-full">
              <p className="text-golden text-sm font-roboto font-bold tracking-widest uppercase mb-3">{heroEyebrow}</p>
              <h1 className="text-white font-roboto font-bold text-3xl md:text-4xl lg:text-5xl mb-4">{heroTitle}</h1>
              <p className="text-white/80 font-roboto text-base md:text-lg max-w-xl mx-auto leading-relaxed">{heroSubtitle}</p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Shared global search bar - kept on the commercial page so search
          matches Buy / Rent / All Properties. Purpose, price, radius, type and
          a size filter are all preserved. */}
      <div className="relative z-10 -mt-24 md:-mt-28 px-4 md:px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto bg-white rounded-2xl border border-primary/12 shadow-lg p-4 md:p-6">
          {/* Rent / Buy toggle */}
          <div className="flex items-center justify-center border-b border-primary/12 pb-4 mb-4">
            <div className="inline-flex gap-1 w-full sm:w-auto" role="group" aria-label="Rent or Buy toggle">
              <button
                type="button"
                onClick={() => navigate('/commercial-property?buy=false')}
                aria-pressed={!isBuy}
                className={`flex-1 sm:flex-none px-6 sm:px-10 py-2.5 text-sm font-roboto font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap tracking-[0.12em] ${!isBuy ? 'bg-accent text-white' : 'border border-primary/40 text-primary/70 hover:text-primary hover:border-primary'}`}
              >
                RENT
              </button>
              <button
                type="button"
                onClick={() => navigate('/commercial-property?buy=true')}
                aria-pressed={isBuy}
                className={`flex-1 sm:flex-none px-6 sm:px-10 py-2.5 text-sm font-roboto font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap tracking-[0.12em] ${isBuy ? 'bg-accent text-white' : 'border border-primary/40 text-primary/70 hover:text-primary hover:border-primary'}`}
              >
                BUY
              </button>
            </div>
          </div>

          <PropertySearchBar
            searchQuery={searchQuery}
            onLocationChange={(val) => triggerSearch(val)}
            placeholderCycle={[
              "Search an area, e.g. Westlands or Industrial Area",
              "Search a landmark, e.g. The Hub Karen",
              "Search a street, e.g. Riverside Drive",
              "Search by keyword, e.g. office space to let",
            ]}
            radiusValue={selectedRadius}
            onRadiusChange={setSelectedRadius}
            radiusOptions={radiusOptions}
            priceMinValue={priceMin}
            onPriceMinChange={setPriceMin}
            priceMinOptions={priceMinOpts.labels}
            priceMaxValue={priceMax}
            onPriceMaxChange={setPriceMax}
            priceMaxOptions={priceMaxOpts.labels}
            priceRangeError={priceRangeError}
            onClearPrice={(priceMin !== 'No min' || priceMax !== 'No max') ? () => { setPriceMin('No min'); setPriceMax('No max'); } : undefined}
            typeValue={COMM_TYPE_OPTIONS.find((t) => t.key === selectedType)?.label || 'Show all'}
            onTypeChange={(label) => setSelectedType(COMM_TYPE_OPTIONS.find((t) => t.label === label)?.key || 'any')}
            typeOptions={COMM_TYPE_OPTIONS.map((t) => t.label)}
            saved={savedSearch}
            onToggleSave={() => setSavedSearch(!savedSearch)}
            onSearch={handleSearch}
            onFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
            filtersActive={showAdvancedFilters}
            filtersCount={commercialAppliedCount}
            onMapView={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            mapActive={viewMode === 'map'}
            onCreateAlert={scrollToAlertForm}
          />

          {/* Size filter - preserved from the commercial search panel */}
          <div className="mt-4 pt-3 border-t border-primary/15 flex items-center gap-2 md:gap-3">
            <span className="text-sm font-roboto font-semibold text-primary whitespace-nowrap shrink-0">Size (sq m)</span>
            <input
              type="number"
              value={minSize}
              onChange={(e) => setMinSize(e.target.value)}
              placeholder="Min"
              min="0"
              className="flex-1 min-w-0 md:flex-none md:w-28 h-10 px-3 text-sm font-roboto text-primary bg-white border border-primary/60 rounded-[4px] focus:outline-none focus:border-primary"
            />
            <span className="text-sm font-roboto text-primary/60 shrink-0">to</span>
            <input
              type="number"
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
              placeholder="Max"
              min="0"
              className="flex-1 min-w-0 md:flex-none md:w-28 h-10 px-3 text-sm font-roboto text-primary bg-white border border-primary/60 rounded-[4px] focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <CommercialAdvancedFilters
          isOpen={showAdvancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onApply={(f) => {
            setAdvancedFilters(f);
            setSelectedAdded(f.added);
            setMinSize(f.minSize);
            setMaxSize(f.maxSize);
            setCurrentPage(1);
          }}
          initialFilters={{ ...advancedFilters, minSize, maxSize, added: selectedAdded }}
          isBuy={isBuy}
          currency={currency}
          rates={rates}
        />
      </div>

      {/* Breadcrumb below the banner - keeps the blue flow intact */}
      <PageBreadcrumbs />

      {/* Secondary filter bar - simplified, no Price (now in panel) */}
      <div className="hidden md:flex items-center justify-between px-4 md:px-6 lg:px-10 pt-6 pb-1 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <button className="flex items-center gap-1.5 py-2 text-sm font-roboto font-bold text-accent border-b-2 border-transparent hover:text-accent transition-colors cursor-pointer">
              {selectedAdded}
              <span className="w-4 h-4 flex items-center justify-center text-gray-400"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
            </button>
            <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-primary/12 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {ADDED_WINDOW_OPTIONS.map((o) => (
                <button
                  key={o}
                  onClick={() => setSelectedAdded(o)}
                  className={`w-full text-left px-3 py-2 text-sm font-roboto cursor-pointer hover:bg-gray-50 ${selectedAdded === o ? 'text-accent font-bold' : 'text-accent/60'}`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
          <div className="relative group">
            <button className="flex items-center gap-1.5 py-2 text-sm font-roboto font-bold text-accent border-b-2 border-transparent hover:text-accent transition-colors cursor-pointer">
              {sortBy}
              <span className="w-4 h-4 flex items-center justify-center text-gray-400"><i className="ri-arrow-down-wide-fill text-sm"></i></span>
            </button>
            <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-primary/12 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {sortOptions.map((o) => (
                <button
                  key={o}
                  onClick={() => setSortBy(o)}
                  className={`w-full text-left px-3 py-2 text-sm font-roboto cursor-pointer hover:bg-gray-50 ${sortBy === o ? 'text-accent font-bold' : 'text-accent/60'}`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 py-2 text-sm font-roboto font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${viewMode === 'list' ? 'text-accent border-accent' : 'text-accent/60 border-accent/15 hover:text-accent'}`}
          >
            <i className="ri-list-check text-sm"></i>
            List
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 py-2 text-sm font-roboto font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${viewMode === 'map' ? 'text-accent border-accent' : 'text-accent/60 border-accent/15 hover:text-accent'}`}
          >
            <i className="ri-map-2-line text-sm"></i>
            Map
          </button>
        </div>
      </div>

      {/* === RESULTS HEADER === */}
      <div ref={resultsTopRef} className="px-4 md:px-6 lg:px-10 pt-6 pb-2 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-roboto font-bold text-primary">
              {resultsHeading}
            </h1>
            <p className="text-sm font-roboto text-gray-500 mt-0.5">
              <span className="text-primary font-bold">{activeCount}</span> {c.results_count_label}
            </p>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none h-9 px-3 pr-8 text-sm font-roboto font-bold text-accent/60 bg-white border border-accent/20 rounded-lg focus:outline-none cursor-pointer">
                {sortOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-wide-fill absolute right-2 top-1/2 -translate-y-1/2 text-accent/50 text-sm pointer-events-none"></i>
            </div>
            <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="w-9 h-9 flex items-center justify-center border border-accent/20 rounded-lg text-accent/60 cursor-pointer">
              <i className={viewMode === 'list' ? 'ri-map-2-line text-sm' : 'ri-list-check text-sm'}></i>
            </button>
          </div>
        </div>
      </div>

      {/* === MAIN CONTENT === */}
      <main className="flex-1 px-4 md:px-6 lg:px-10 pb-10 max-w-[1400px] mx-auto w-full">
        <div className={`flex gap-6 ${viewMode === 'map' ? 'flex-col lg:flex-row' : 'flex-col lg:flex-row'}`}>
          <div className={`${viewMode === 'map' ? 'lg:w-[55%] xl:w-[60%]' : 'lg:w-[75%] xl:w-[78%]'}`}>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={scrollToAlertForm} className="flex items-center gap-1.5 h-9 px-4 text-sm font-roboto font-bold text-primary/60 border border-primary/12 rounded-lg hover:border-primary hover:text-primary transition-colors cursor-pointer whitespace-nowrap">
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-notification-3-line text-sm"></i>
                </span>
                {c.create_alert_label}
              </button>
            </div>

            <div className="space-y-4">
              {loading && (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex flex-col sm:flex-row bg-white border-2 border-primary/12 rounded-lg overflow-hidden sm:h-[300px] animate-pulse">
                      <div className="sm:w-[300px] md:w-[360px] lg:w-[400px] xl:w-[440px] h-[240px] sm:h-full bg-gray-200 flex-shrink-0"></div>
                      <div className="flex-1 p-6 space-y-4">
                        <div className="h-6 w-32 bg-gray-200 rounded"></div>
                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                        <div className="h-3 w-24 bg-gray-200 rounded"></div>
                        <div className="flex gap-2"><div className="h-3 w-12 bg-gray-200 rounded"></div><div className="h-3 w-12 bg-gray-200 rounded"></div></div>
                        <div className="h-3 w-full bg-gray-200 rounded"></div>
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
                  <h3 className="text-lg font-roboto font-bold text-primary mb-2">{c.error_title}</h3>
                  <p className="text-sm font-roboto text-gray-500 mb-4">{error}</p>
                  <button onClick={refetch} className="px-6 py-2 bg-primary text-white border-2 border-primary text-sm font-roboto font-bold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
                    {c.error_retry_label}
                  </button>
                </div>
              )}

              {!loading && !error && paginated.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100">
                    <i className="ri-building-2-line text-gray-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-roboto font-bold text-primary mb-2">{c.empty_title}</h3>
                  <p className="text-sm font-roboto text-gray-500 mb-4 max-w-md mx-auto">
                    {c.empty_text}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={clearAllFilters} className="px-6 py-2 bg-primary text-white border-2 border-primary text-sm font-roboto font-bold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
                      Broaden search
                    </button>
                    <Link to={c.list_cta_button_link} className="px-6 py-2 border-2 border-primary text-primary text-sm font-roboto font-bold rounded-lg hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap">
                      {c.empty_advertise_label}
                    </Link>
                  </div>
                  <RecentActivitySuggestion
                    location={debouncedSearch || undefined}
                    addedWindow={selectedAdded}
                    scope={{ purpose, propertyCategory: 'commercial' }}
                    onView={(targetWindow) => {
                      setPriceMin('No min');
                      setPriceMax('No max');
                      setSelectedBeds('Any beds');
                      setSelectedType('any');
                      setMinSize('');
                      setMaxSize('');
                      setAdvancedFilters({ ...defaultCommercialFilters });
                      // Clear the keyword search so the window shows every commercial
                      // listing rather than another zero-result state.
                      triggerSearch('');
                      setSelectedAdded(targetWindow);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              )}

              {!loading && !error && paginated.map((p) => {
                const imgIdx = imageIndexes[p.id] || 0;
                const isSaved = savedIds.has(p.id);
                const isHovered = hoveredCard === p.id;
                const openVideo = p.videoUrl ? () => window.open(p.videoUrl as string, '_blank', 'noopener,noreferrer') : undefined;
                const openVirtualTour = p.virtualTourUrl ? () => window.open(p.virtualTourUrl as string, '_blank', 'noopener,noreferrer') : undefined;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row bg-[var(--card-bg)] rounded-lg shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] overflow-hidden sm:h-[300px] hover:shadow-md transition-all duration-200"
                    onMouseEnter={() => setHoveredCard(p.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div className="relative sm:w-[300px] md:w-[360px] lg:w-[400px] xl:w-[440px] h-[240px] sm:h-full flex-shrink-0 overflow-hidden group"
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
                        to={`/property/${p.slug}`}
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
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickViewProperty(p); }}
                        className="absolute bottom-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <span className="flex items-center gap-1 text-white text-[10px] font-bold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 rounded-sm cursor-pointer hover:bg-black/80 transition-colors">
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            <i className="ri-expand-diagonal-line text-xs"></i>
                          </span>
                          Preview
                        </span>
                      </button>
                      {p.images.length > 1 && (
                        <>
                          <button onClick={(e) => prevImage(p.id, e)} className={`absolute left-1.5 md:left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-11 md:w-8 md:h-12 flex items-center justify-center rounded-md bg-white/80 md:bg-white/90 text-stone-700 hover:bg-white hover:text-primary transition-opacity duration-150 cursor-pointer whitespace-nowrap md:opacity-100 ${revealedCards.has(p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} aria-label="Previous image">
                            <i className="ri-arrow-left-s-line text-base md:text-lg"></i>
                          </button>
                          <button onClick={(e) => nextImage(p.id, e)} className={`absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-11 md:w-8 md:h-12 flex items-center justify-center rounded-md bg-white/80 md:bg-white/90 text-stone-700 hover:bg-white hover:text-primary transition-opacity duration-150 cursor-pointer whitespace-nowrap md:opacity-100 ${revealedCards.has(p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} aria-label="Next image">
                            <i className="ri-arrow-right-s-line text-base md:text-lg"></i>
                          </button>
                        </>
                      )}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                        <span className={`text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded ${p.type === 'rent' ? 'bg-[#002349]' : 'bg-black'}`}>
                          For {p.type === 'rent' ? 'Rent' : 'Sale'}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <button onClick={() => toggleSave(p.id)} className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-colors ${isSaved ? 'bg-primary text-white' : 'bg-black/40 hover:bg-black/60 text-white'}`}>
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
                    <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden">
                      <div>
                        <PropertyMetaBadges
                          featured={p.featured}
                          justListed={p.justAdded}
                          jointVenture={p.isJointVenture}
                          newHome={p.newHome}
                          reduced={p.reduced}
                          propertyOfTheWeek={p.propertyOfTheWeek}
                          backOnMarket={p.backOnMarket}
                          refurbished={p.refurbished}
                          videoTour={p.videoTour}
                          virtualTour={p.virtualTour}
                          floorPlan={p.floorPlan}
                          onVideoClick={openVideo}
                          onVirtualTourClick={openVirtualTour}
                          className="mb-2"
                        />
                        <div className="mb-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-roboto font-bold text-[color:var(--card-price-text)] text-sm md:text-base lg:text-lg">{format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}</span>
                            {p.rawPrice > 0 && !isBuy && <span className="font-roboto font-normal text-[color:var(--card-price-text)] text-sm md:text-base lg:text-lg">pcm</span>}
                            {p.rawPrice > 0 && <span className="text-xs font-roboto font-normal text-[color:var(--card-category-text)]">Guide price</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                          {getPropertySpecs(p.propertyType, {
                            beds: p.beds,
                            baths: p.baths,
                            parking: p.parking,
                            sqft: p.sqft,
                            sqm: p.sqm,
                            acreage: p.acreage,
                            landSize: p.landSize,
                            landUnit: p.landUnit,
                          }).map((spec) => (
                            <span key={spec.key} className="flex items-center gap-1 text-xs md:text-sm font-roboto font-normal text-[#2D303D]">
                              <i className={`${spec.icon} text-[#555555] text-xs`}></i>
                              {spec.label}
                            </span>
                          ))}
                        </div>
                        <Link to={`/property/${p.slug}`} className="block mb-3">
                          <h3 className="text-sm md:text-base font-roboto font-medium text-[color:var(--card-title-text)] leading-snug mb-1 line-clamp-2 transition-colors hover:text-primary">{p.title}</h3><address className="not-italic flex items-start gap-1.5">
                            <span className="w-3 h-3 flex items-center justify-center shrink-0 mt-0.5">
                              <i className="ri-map-pin-line text-accent text-[10px]"></i>
                            </span>
                            <span className="min-w-0">
                              <span className="block text-xs md:text-sm font-roboto font-medium text-[#2D303D] leading-snug">
                                {p.area || p.location}
                              </span>
                            </span>
                          </address>
                        </Link>
                        <p className="text-xs md:text-sm font-roboto font-normal text-[#2D303D] leading-relaxed line-clamp-2 mb-3">{cleanListingDescription(p.description, { normalizeCase: true })}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 pt-2.5 border-t-2 border-primary/12">
                        {formatListingAge(p.createdAt) && (
                          <span className="text-xs font-roboto font-medium text-[color:var(--card-time-text)] whitespace-nowrap shrink-0">{formatListingAge(p.createdAt)}</span>
                        )}
                        <CardContactActions
                          phone={p.agentPhone}
                          onMessage={() => setContactModalProperty(p)}
                          messageLabel="Message"
                          className="shrink-0"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}

            {c.show_alert_cta && (<div ref={alertFormRef} className="mt-10 bg-[#f8f7f4] rounded-lg p-6 text-center">
              <h3 className="text-lg font-roboto font-bold text-primary mb-2">{c.alert_heading}</h3>
              <p className="text-sm font-roboto text-gray-500 mb-4 max-w-md mx-auto">{c.alert_text}</p>
              <form data-readdy-form="true" id="comm-alert-form" onSubmit={handleEnquiry} className="flex flex-col sm:flex-row items-center gap-3 max-w-lg mx-auto">
                <input name="email" type="email" placeholder="Enter your email" required className="flex-1 w-full h-11 px-4 text-sm font-roboto border border-stone-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors shadow-[0_1px_2px_rgba(0,23,49,0.04),0_2px_8px_rgba(0,23,49,0.05)]" />
                <input type="hidden" name="type" value="commercial_alert" />
                <input type="hidden" name="location" value="" />
                <input type="text" name="company_alt" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly className="footer-hp-field" />
                <button type="submit" disabled={alertStatus === 'submitting'} className="w-full sm:w-auto px-5 py-2.5 bg-primary text-white border-2 border-primary text-base font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {alertStatus === 'success' ? 'Alert set!' : c.alert_button}
                </button>
              </form>
              {alertStatus === 'success' && (
                <p className="text-green-600 text-sm font-roboto text-center">{c.alert_success}</p>
              )}
              {alertStatus === 'error' && (
                <p className="text-red-500 text-sm font-roboto text-center">{alertError}</p>
              )}
            </div>)}
          </div>

          {viewMode === 'list' && c.show_sidebar && (
            <div className="hidden lg:block lg:w-[25%] xl:w-[22%]">
              <div className="sticky top-[140px] space-y-3">
                {recentlyViewed.length > 0 && (
                  <div className="bg-white border border-primary/12 rounded-lg overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-xs font-roboto font-bold text-primary flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 flex items-center justify-center">
                          <i className="ri-time-line text-[10px]"></i>
                        </span>
                        {c.recently_viewed_label}
                      </h3>
                      <button onClick={() => { localStorage.removeItem('recently_viewed_properties'); localStorage.removeItem('recently_viewed_devs'); setRecentlyViewed([]); }} className="text-[10px] font-roboto text-gray-400 hover:text-primary/60 cursor-pointer whitespace-nowrap">
                        Clear
                      </button>
                    </div>
                    <div className="px-3 py-2 space-y-2">
                      {recentlyViewed.slice(0, 4).map((p) => (
                        <div key={p.id} className="group">
                          <Link to={`/property/${p.slug}`} className="flex items-center gap-2.5 cursor-pointer">
                            <div className="w-14 h-10 flex-shrink-0 overflow-hidden rounded">
                              <EntityImage src={p.image || p.images[0]} alt={p.title} compact className="w-full h-full object-cover object-center" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-roboto font-bold text-primary group-hover:text-primary transition-colors truncate">
                                {format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                              </p>
                              <p className="text-[10px] font-roboto text-gray-500 truncate">{p.title}</p>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white border border-primary/12 rounded-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-gray-100">
                    <h3 className="text-xs font-roboto font-bold text-primary">{c.sidebar_section_title}</h3>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[11px] font-roboto text-gray-500">{c.sidebar_refine_text}</p>
                  </div>
                </div>

                <div className="bg-white border border-primary/12 rounded-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-gray-100">
                    <h3 className="text-xs font-roboto font-bold text-primary">{c.popular_areas_label}</h3>
                  </div>
                  <div className="px-3 py-2 grid grid-cols-2 gap-x-2 gap-y-1.5">
                    {c.popular_areas.map((area) => (
                      <button key={area} onClick={() => handleAreaClick(area)} className="text-left text-xs font-roboto text-primary/60 hover:text-primary hover:underline transition-colors cursor-pointer">
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-primary/12 rounded-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-gray-100">
                    <h3 className="text-xs font-roboto font-bold text-primary">{c.related_searches_label}</h3>
                  </div>
                  <div className="px-3 py-2 space-y-1.5">
                    {c.related_searches.map((search) => (
                      <button key={search} onClick={() => handleRelatedSearch(search)} className="block text-left w-full text-xs font-roboto text-primary/60 hover:text-primary hover:underline transition-colors cursor-pointer">
                        {search}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-primary rounded-lg p-3.5 text-center">
                  <h3 className="text-white font-roboto font-bold text-xs mb-1.5">{c.list_cta_heading}</h3>
                  <p className="text-white/70 font-roboto text-[10px] mb-2.5">{c.list_cta_text}</p>
                  <Link to={c.list_cta_button_link} className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-golden text-white font-roboto text-[10px] font-bold rounded-md hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap">
                    {c.list_cta_button}
                  </Link>
                </div>
              </div>
            </div>
          )}

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
                  title="Commercial property map - Nairobi"
                  className="w-full h-full"
                ></iframe>
              </div>
              <div className="hidden lg:block mt-3 space-y-2">
                {paginated.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${activeMapMarker === p.id ? 'border-primary bg-primary/5' : 'border-primary/12 hover:border-primary/12'}`}
                    onClick={() => setActiveMapMarker(activeMapMarker === p.id ? null : p.id)}
                  >
                    <EntityImage src={p.image} alt={p.title} compact className="w-16 h-12 object-cover rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-roboto font-bold text-primary truncate">{format(p.rawPrice, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}</p>
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
      {c.show_footer_cta && (
      <div className="bg-primary py-12 px-6 text-center">
        <p className="text-golden text-sm font-roboto tracking-widest uppercase mb-3">{c.footer_eyebrow}</p>
        <h2 className="text-white font-roboto font-bold text-2xl md:text-3xl mb-3">{c.footer_heading}</h2>
        <p className="text-white/70 font-roboto text-sm mb-7 max-w-md mx-auto">{c.footer_text}</p>
        <Link to={c.footer_button_link} className="inline-flex items-center gap-2 px-8 py-3 bg-golden text-white border-2 border-golden font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-colors">
          <i className="ri-building-2-line"></i>{c.footer_button}
        </Link>
      </div>
      )}

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
          listingId={contactModalProperty.id}
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
          type: isBuy ? 'sale' : 'rent',
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