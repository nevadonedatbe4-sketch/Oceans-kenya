import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import ContactAgentModal from '@/components/feature/ContactAgentModal';
import QuickViewModal from '@/components/feature/QuickViewModal';
import { useListings, type MappedListing, type ListingFilters } from '@/hooks/useListings';
import AdvancedFilters, { defaultFilters, FilterState } from '@/pages/Rent/components/AdvancedFilters';
import { usePropertyPageSettings } from '@/hooks/usePropertyPageSettings';
import ListingHero from '@/components/feature/ListingHero';
import { useFormSubmit } from '@/hooks/useFormSubmit';

const ITEMS_PER_PAGE = 10;
const priceOptions = ['Any price', 'Under KSh 10M', 'KSh 10M – 30M', 'KSh 30M – 50M', 'KSh 50M – 100M', 'KSh 100M – 200M', 'Over KSh 200M'];
const bedOptions = ['Any beds', 'Studio', '1+', '2+', '3+', '4+', '5+'];
const propTypeOptions = ['Any type', 'Apartment', 'House', 'Townhouse', 'Penthouse', 'Villa', 'Studio', 'Land'];
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
  const [searchQuery, setSearchQuery] = useState('Nairobi');
  const [debouncedSearch, setDebouncedSearch] = useState('Nairobi');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  };

  const [selectedRadius, setSelectedRadius] = useState('This area only');
  const [selectedPrice, setSelectedPrice] = useState('Any price');
  const [selectedBeds, setSelectedBeds] = useState('Any beds');
  const [selectedType, setSelectedType] = useState('Any type');
  const [selectedAdded, setSelectedAdded] = useState('Anytime');
  const [sortBy, setSortBy] = useState('Most recent');
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
  const { status: alertStatus, error: alertError, submitToContacts, reset: resetAlert } = useFormSubmit();

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
    // Price
    if (selectedPrice === 'Under KSh 10M') { filters.priceMax = 10_000_000; }
    else if (selectedPrice === 'KSh 10M – 30M') { filters.priceMin = 10_000_000; filters.priceMax = 30_000_000; }
    else if (selectedPrice === 'KSh 30M – 50M') { filters.priceMin = 30_000_000; filters.priceMax = 50_000_000; }
    else if (selectedPrice === 'KSh 50M – 100M') { filters.priceMin = 50_000_000; filters.priceMax = 100_000_000; }
    else if (selectedPrice === 'KSh 100M – 200M') { filters.priceMin = 100_000_000; filters.priceMax = 200_000_000; }
    else if (selectedPrice === 'Over KSh 200M') { filters.priceMin = 200_000_000; }
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
        await navigator.share({ title: p.title, text: `${p.price} - ${p.title}`, url });
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
        defaultTitle="Properties For Sale in Kampala"
        defaultSubtitle="Discover exceptional homes across Kampala's most sought-after neighbourhoods."
      />

      {/* === SEARCH + FILTER BAR === */}
      <div className="sticky top-[92px] z-40 bg-white border-b border-gray-200 shadow-sm mt-6">
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
          <div className={`${viewMode === 'map' ? 'lg:w-[55%] xl:w-[60%]' : 'lg:w-[70%] xl:w-[75%]'}`}>
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
                    <div key={i} className="flex flex-col sm:flex-row bg-white border border-gray-200 rounded-lg overflow-hidden sm:h-[420px] animate-pulse">
                      <div className="sm:w-[380px] h-[260px] sm:h-full bg-gray-200 flex-shrink-0"></div>
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
                    className="flex flex-col sm:flex-row bg-white border border-gray-200 rounded-lg overflow-hidden sm:h-[420px] hover:border-gray-300 hover:shadow-md transition-all duration-200"
                    onMouseEnter={() => setHoveredCard(p.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Image area */}
                    <div className="relative sm:w-[380px] md:w-[440px] lg:w-[480px] h-[260px] sm:h-full flex-shrink-0 overflow-hidden group">
                      <Link to={`/property/${p.slug}`} className="block w-full h-full">
                        <img
                          src={p.images[imgIdx]}
                          alt={p.title}
                          className="w-full h-full object-cover object-top transition-transform duration-500"
                          style={{ transform: isHovered ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
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
                        {p.justAdded && (
                          <span className="bg-[#F5A623] text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded">Just added</span>
                        )}
                        {p.newHome && (
                          <span className="bg-[#0E7C7B] text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded">New home</span>
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
                    <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between min-w-0 overflow-hidden">
                      <div>
                        {/* Price & title */}
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="min-w-0">
                            <span className="text-2xl font-roboto font-medium text-[#002349]">{p.price}</span>
                            {p.priceUnit && <span className="text-sm text-gray-500 font-roboto ml-1">{p.priceUnit}</span>}
                          </div>
                        </div>
                        <Link to={`/property/${p.slug}`} className="block hover:underline">
                          <h3 className="text-base font-roboto font-medium text-[#011328] leading-snug line-clamp-2 mb-3">{p.title}</h3>
                        </Link>
                        <p className="flex items-center gap-1.5 text-sm font-roboto text-[#636363] mb-2">
                          <span className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-map-pin-line text-primary text-sm"></i>
                          </span>
                          {p.location.includes('Nairobi') ? p.location : `${p.location}, Nairobi`}
                        </p>

                        <p className="text-[10px] font-roboto font-semibold uppercase tracking-widest text-[#1f1f1f] mb-3">
                          {p.category}
                        </p>

                        {/* Meta badges */}
                        <div className="flex items-center gap-4 mb-3">
                          <span className="flex items-center gap-1 text-sm font-roboto text-[#363535]">
                            <i className="ri-hotel-bed-line text-[#636363] text-xs"></i>
                            {p.beds}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-[#363535]">
                            <i className="ri-showers-line text-[#636363] text-xs"></i>
                            {p.baths}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-[#363535]">
                            <i className="ri-sofa-line text-[#636363] text-xs"></i>
                            {p.receptions}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-[#363535]">
                            <i className="ri-car-line text-[#636363] text-xs"></i>
                            {p.parking}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-sm font-roboto text-[#555555] leading-relaxed line-clamp-2 mb-3">{p.description}</p>
                      </div>

                      {/* Agent footer */}
                      <div className="flex items-end justify-between gap-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-roboto font-medium text-[#005733] capitalize">
                            {(() => {
                              const days = p.listedDays;
                              if (days < 1) return 'LISTED JUST NOW';
                              if (days === 1) return 'LISTED YESTERDAY';
                              if (days < 7) return `LISTED ${days} DAYS AGO`;
                              const weeks = Math.floor(days / 7);
                              if (weeks === 1) return 'LISTED 1 WEEK AGO';
                              if (weeks < 4) return `LISTED ${weeks} WEEKS AGO`;
                              const months = Math.floor(days / 30);
                              if (months === 1) return 'LISTED 1 MONTH AGO';
                              return `LISTED ${months} MONTHS AGO`;
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <a href="tel:+254712345678" className="flex items-center gap-1.5 text-sm font-roboto text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md px-2 py-1 -mx-2 transition-all duration-200 cursor-pointer whitespace-nowrap">
                            <span className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-phone-line text-sm"></i>
                            </span>
                            <span className="underline underline-offset-2">Call</span>
                          </a>
                          <button onClick={() => setContactModalProperty(p)} className="flex items-center gap-1.5 text-sm font-roboto text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md px-2 py-1 -mx-2 transition-all duration-200 cursor-pointer whitespace-nowrap">
                            <span className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-mail-line text-sm"></i>
                            </span>
                            <span className="underline underline-offset-2">Email</span>
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
            <div className="hidden lg:block lg:w-[30%] xl:w-[25%]">
              <div className="sticky top-[140px] space-y-4">
                {/* Similar search */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-roboto font-semibold text-primary">Houses for sale in Nairobi</h3>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-roboto text-gray-500">Refine your search with specific requirements</p>
                  </div>
                </div>

                {/* Nearby areas */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-roboto font-semibold text-primary">Nearby Nairobi</h3>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2">
                    {nearbyAreas.map((area) => (
                      <button key={area} onClick={() => handleAreaClick(area)} className="text-left text-sm font-roboto text-gray-600 hover:text-primary hover:underline transition-colors cursor-pointer">
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Related searches */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-roboto font-semibold text-primary">Related searches</h3>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {relatedSearches.map((search) => (
                      <button key={search} onClick={() => handleRelatedSearch(search.replace(' for sale in Nairobi', '').replace(' in Nairobi', ''))} className="block text-left w-full text-sm font-roboto text-gray-600 hover:text-primary hover:underline transition-colors cursor-pointer">
                        {search}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List property CTA */}
                <div className="bg-primary rounded-lg p-4 text-center">
                  <h3 className="text-white font-roboto font-bold text-sm mb-2">List your property</h3>
                  <p className="text-white/70 font-roboto text-xs mb-3">Reach thousands of qualified buyers</p>
                  <Link to="/landlords" className="inline-flex items-center gap-1 px-4 py-2 bg-golden text-white font-roboto text-xs font-semibold rounded-md hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap">
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
                      <p className="text-xs font-roboto font-semibold text-primary truncate">{p.price}</p>
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
          propertyPrice={contactModalProperty.price}
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
    </div>
  );
}