import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import ContactCTA from '@/components/feature/ContactCTA';
import { supabase } from '@/lib/supabase';
import AdvancedFilters, { defaultFilters, FilterState } from './Rent/components/AdvancedFilters';

interface ExtendedProperty {
  id: string;
  slug: string;
  title: string;
  location: string;
  type: 'sale' | 'rent';
  category: string;
  beds: number;
  baths: number;
  parking: number;
  receptions: number;
  sqft: number;
  sqm: number;
  price: string;
  priceUnit?: string;
  image: string;
  featured: boolean;
  listedDays: number;
  badges: string[];
  description: string;
  agent: string;
  agentLogo?: string;
  images: string[];
  newHome?: boolean;
  reduced?: boolean;
  videoTour?: boolean;
  virtualTour?: boolean;
  floorPlan?: boolean;
  justAdded?: boolean;
  houseShare?: boolean;
  agentShortName?: string;
  agentBrandColor?: string;
}

function toDisplayType(category: string): string {
  return category
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function parseNumericPrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

function priceMatchesFilter(priceStr: string, selected: string): boolean {
  if (selected === 'Any price') return true;
  const num = parseNumericPrice(priceStr);
  if (num === 0) return true;
  if (selected === 'Under KSh 300K') return num < 300000;
  if (selected === 'KSh 300K – 500K') return num >= 300000 && num <= 500000;
  if (selected === 'KSh 500K – 1M') return num >= 500000 && num <= 1000000;
  if (selected === 'KSh 1M – 2M') return num >= 1000000 && num <= 2000000;
  if (selected === 'KSh 2M – 5M') return num >= 2000000 && num <= 5000000;
  if (selected === 'Over KSh 5M') return num > 5000000;
  return true;
}

function bedsMatchFilter(beds: number, selected: string): boolean {
  if (selected === 'Any beds') return true;
  if (selected === 'Studio') return beds === 0;
  const min = parseInt(selected, 10);
  if (!Number.isNaN(min)) return beds >= min;
  return true;
}

function typeMatchesFilter(category: string, selected: string): boolean {
  if (selected === 'Any type') return true;
  return category.toLowerCase().includes(selected.toLowerCase());
}

function addedMatchesFilter(listedDays: number, selected: string): boolean {
  if (selected === 'Anytime') return true;
  if (selected === 'Last 24 hours') return listedDays <= 1;
  if (selected === 'Last 3 days') return listedDays <= 3;
  if (selected === 'Last 7 days') return listedDays <= 7;
  if (selected === 'Last 14 days') return listedDays <= 14;
  return true;
}

function advancedPriceMatch(priceStr: string, af: FilterState): boolean {
  const num = parseNumericPrice(priceStr);
  if (af.minPrice && num < parseFloat(af.minPrice.replace(/[^\d.]/g, ''))) return false;
  if (af.maxPrice && num > parseFloat(af.maxPrice.replace(/[^\d.]/g, ''))) return false;
  return true;
}

function numberFromStr(s: string): number {
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? 0 : n;
}

const ITEMS_PER_PAGE = 10;
const priceOptions = ['Any price', 'Under KSh 300K', 'KSh 300K \u2013 500K', 'KSh 500K \u2013 1M', 'KSh 1M \u2013 2M', 'KSh 2M \u2013 5M', 'Over KSh 5M'];
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
  const [searchQuery, setSearchQuery] = useState('Nairobi');
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
  const [enquiryStatus, setEnquiryStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [activeMapMarker, setActiveMapMarker] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const [rentListings, setRentListings] = useState<ExtendedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRentListings = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*, agent:agents(*)')
          .eq('purpose', 'rent')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped: ExtendedProperty[] = (data || []).map((listing: any) => {
          const mainImg = listing.main_image || '';
          const dbImages = Array.isArray(listing.images) ? listing.images.filter(Boolean) : [];
          const allImages = [mainImg, ...dbImages].filter(Boolean);
          const bedrooms = listing.bedrooms || 0;
          const bathrooms = listing.bathrooms || 0;
          const sqft = Number(listing.sqft) || 0;
          const createdAt = listing.created_at ? new Date(listing.created_at) : new Date();
          const listedDays = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86400000));
          const amenities = Array.isArray(listing.amenities) ? listing.amenities : [];

          return {
            id: listing.id,
            slug: listing.slug || listing.id,
            title: listing.title || 'Untitled Property',
            location: listing.location || listing.neighbourhood || listing.city || 'Nairobi',
            type: 'rent',
            category: listing.property_type || 'Apartment',
            beds: bedrooms,
            baths: bathrooms,
            parking: listing.parking || listing.garages || 0,
            receptions: listing.rooms || Math.max(1, Math.floor(bedrooms / 2)),
            sqft,
            sqm: Math.round(sqft * 0.0929),
            price: listing.price ? `KSh ${Number(listing.price).toLocaleString()}` : 'Price on request',
            priceUnit: listing.price_prefix || undefined,
            image: allImages[0] || '',
            featured: listing.is_featured || false,
            listedDays,
            badges: listing.property_label ? [listing.property_label] : [],
            description: listing.description || '',
            agent: listing.agent?.name || 'Oceans Kenya',
            agentShortName: (listing.agent?.name || 'OK').substring(0, 2).toUpperCase(),
            agentBrandColor: '#1a1a2e',
            images: allImages.length > 0 ? allImages : [''],
            newHome: listedDays <= 7,
            reduced: listing.availability_status === 'reduced',
            videoTour: !!listing.video_url,
            virtualTour: !!listing.virtual_tour_url,
            floorPlan: Array.isArray(listing.floor_plans) && listing.floor_plans.length > 0,
            justAdded: listedDays <= 2,
            houseShare: amenities.includes('Shared'),
          };
        });

        setRentListings(mapped);
      } catch (err: any) {
        console.error('Failed to fetch rent listings:', err);
        setFetchError(err.message || 'Failed to load properties');
      } finally {
        setLoading(false);
      }
    };

    fetchRentListings();
  }, []);

  const rentProperties = rentListings;

  const filteredProperties = useMemo(() => {
    const af = appliedFilters.advanced;
    return rentProperties.filter((p) => {
      if (appliedSearchQuery) {
        const q = appliedSearchQuery.toLowerCase();
        const matchesQuery =
          p.title.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      if (!priceMatchesFilter(p.price, selectedPrice)) return false;
      if (!bedsMatchFilter(p.beds, selectedBeds)) return false;
      if (!typeMatchesFilter(p.category, selectedType)) return false;
      if (!addedMatchesFilter(p.listedDays, selectedAdded)) return false;
      if (!advancedPriceMatch(p.price, af)) return false;
      if (af.minBeds && p.beds < numberFromStr(af.minBeds)) return false;
      if (af.maxBeds && p.beds > numberFromStr(af.maxBeds)) return false;
      if (af.minBaths && p.baths < numberFromStr(af.minBaths)) return false;
      if (af.propertyTypes.length > 0 && !af.propertyTypes.some((t) => typeMatchesFilter(p.category, t))) return false;
      if (af.furnished.length > 0) {
        const hasFurnished = af.furnished.some((f) => p.description.toLowerCase().includes(f.toLowerCase()));
        if (!hasFurnished) return false;
      }
      if (af.lettingType.length > 0) {
        const hasLetting = af.lettingType.some((lt) => p.category.toLowerCase().includes(lt.toLowerCase().replace(' ', '')) || p.description.toLowerCase().includes(lt.toLowerCase()));
        if (!hasLetting) return false;
      }
      if (af.minSize && p.sqft < numberFromStr(af.minSize)) return false;
      if (af.maxSize && p.sqft > numberFromStr(af.maxSize)) return false;
      if (af.keywords) {
        const kws = af.keywords.toLowerCase().split(',').map((k) => k.trim()).filter(Boolean);
        if (kws.length > 0 && !kws.some((kw) => p.title.toLowerCase().includes(kw) || p.description.toLowerCase().includes(kw))) return false;
      }
      if (af.keywordsExclude) {
        const kwsEx = af.keywordsExclude.toLowerCase().split(',').map((k) => k.trim()).filter(Boolean);
        if (kwsEx.length > 0 && kwsEx.some((kw) => p.title.toLowerCase().includes(kw) || p.description.toLowerCase().includes(kw))) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'Highest price') return parseNumericPrice(b.price) - parseNumericPrice(a.price);
      if (sortBy === 'Lowest price') return parseNumericPrice(a.price) - parseNumericPrice(b.price);
      if (sortBy === 'Most reduced') return (b.reduced ? 1 : 0) - (a.reduced ? 1 : 0);
      if (sortBy === 'Most popular') return a.listedDays - b.listedDays;
      return a.listedDays - b.listedDays;
    });
  }, [rentProperties, appliedSearchQuery, appliedFilters, sortBy]);

  const executeSearch = useCallback(() => {
    setAppliedSearchQuery(searchQuery);
    setAppliedFilters((prev) => ({
      ...prev,
      advanced: { ...advancedFilters },
    }));
    setCurrentPage(1);
  }, [searchQuery, advancedFilters]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedPrice('Any price');
    setSelectedBeds('Any beds');
    setSelectedType('Any type');
    setSelectedAdded('Anytime');
    setAdvancedFilters({ ...defaultFilters });
    setAppliedSearchQuery('');
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

  const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
  const paginated = filteredProperties.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

  const handleEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setEnquiryStatus('submitting');
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    fetch('https://readdy.ai/api/form/d8coevklhp0cimum0or0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData as any).toString(),
    })
      .then(() => {
        setEnquiryStatus('success');
        form.reset();
      })
      .catch(() => setEnquiryStatus('idle'));
  };

  const activeCount = filteredProperties.length;
  const agentCount = useMemo(() => {
    const uniqueAgents = new Set(rentProperties.map((p) => p.agent).filter(Boolean));
    return uniqueAgents.size || 0;
  }, [rentProperties]);

  return (
    <div className="min-h-screen bg-white flex flex-col pt-[92px]">
      <Header />

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
            <h1 className="text-lg md:text-xl font-prata text-primary">Properties to rent in Nairobi</h1>
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
          <div className={`${viewMode === 'map' ? 'lg:w-[55%] xl:w-[60%]' : 'lg:w-[70%] xl:w-[75%]'}`}>
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
                    <div key={i} className="flex flex-col sm:flex-row bg-white border border-gray-200 rounded-lg overflow-hidden sm:h-[260px] animate-pulse">
                      <div className="sm:w-[280px] md:w-[320px] lg:w-[340px] h-[220px] sm:h-full bg-gray-200" />
                      <div className="flex-1 p-5 space-y-3">
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
                  <h3 className="text-lg font-prata text-primary mb-2">Something went wrong</h3>
                  <p className="text-sm font-roboto text-gray-500 mb-4">{fetchError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-roboto text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <i className="ri-refresh-line"></i>
                    Try again
                  </button>
                </div>
              ) : rentProperties.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100">
                    <i className="ri-home-line text-gray-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-prata text-primary mb-2">No rental properties yet</h3>
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
                  <h3 className="text-lg font-prata text-primary mb-2">No properties match your filters</h3>
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
                    className="flex flex-col sm:flex-row bg-white border border-gray-200 rounded-lg overflow-hidden sm:h-[260px] hover:border-gray-300 hover:shadow-md transition-all duration-200"
                    onMouseEnter={() => setHoveredCard(p.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Image area */}
                    <div className="relative sm:w-[280px] md:w-[320px] lg:w-[340px] h-[220px] sm:h-full flex-shrink-0 overflow-hidden">
                      <Link to={`/property/${p.slug}`} className="block w-full h-full">
                        <img
                          src={p.images[imgIdx]}
                          alt={p.title}
                          className="w-full h-full object-cover object-top transition-transform duration-500"
                          style={{ transform: isHovered ? 'scale(1.03)' : 'scale(1)' }}
                        />
                      </Link>

                      {/* Image counter */}
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded">
                        {imgIdx + 1}/{p.images.length}
                      </div>

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
                        <button className="w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full cursor-pointer transition-colors">
                          <i className="ri-share-forward-line text-sm"></i>
                        </button>
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden">
                      <div>
                        {/* Price & title */}
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="min-w-0">
                            <span className="font-prata text-xl md:text-2xl text-primary font-semibold">{p.price}</span>
                            {p.priceUnit && <span className="text-sm text-gray-500 font-roboto ml-1">{p.priceUnit}</span>}
                          </div>
                        </div>
                        <Link to={`/property/${p.slug}`} className="block hover:underline">
                          <h3 className="font-prata text-sm md:text-base text-primary leading-snug mb-1">{p.title}</h3>
                        </Link>
                        <p className="flex items-center gap-1.5 text-sm font-roboto text-gray-500 mb-2">
                          <span className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-map-pin-line text-primary text-sm"></i>
                          </span>
                          {p.location}, Nairobi
                        </p>

                        {/* Meta badges */}
                        <div className="flex items-center gap-3 mb-2.5">
                          <span className="text-xs font-roboto text-gray-700">
                            {toDisplayType(p.category)}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-gray-700">
                            <i className="ri-hotel-bed-line text-primary text-sm"></i>
                            {p.beds}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-gray-700">
                            <i className="ri-drop-line text-primary text-sm"></i>
                            {p.baths}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-gray-700">
                            <i className="ri-sofa-line text-primary text-sm"></i>
                            {p.receptions}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-gray-700">
                            <i className="ri-car-line text-primary text-sm"></i>
                            {p.parking}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs font-roboto text-gray-600 leading-relaxed line-clamp-2 mb-3">{p.description}</p>
                      </div>

                      {/* Agent footer */}
                      <div className="flex items-end justify-between gap-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-roboto font-bold text-[#228B22] uppercase tracking-wide">
                            {(() => {
                              const now = Date.now();
                              const listed = new Date(now - p.listedDays * 86400000);
                              const diffMs = now - listed.getTime();
                              const diffMins = Math.floor(diffMs / 60000);
                              const diffHours = Math.floor(diffMs / 3600000);
                              const diffDays = Math.floor(diffMs / 86400000);
                              if (diffDays < 1) {
                                if (diffHours < 1) {
                                  if (diffMins < 2) return 'LISTED JUST NOW';
                                  return `LISTED ${diffMins} MINS AGO`;
                                }
                                if (diffHours === 1) return 'LISTED 1 HOUR AGO';
                                return `LISTED ${diffHours} HOURS AGO`;
                              }
                              if (diffDays === 1) return 'LISTED YESTERDAY';
                              if (diffDays < 7) return `LISTED ${diffDays} DAYS AGO`;
                              const diffWeeks = Math.floor(diffDays / 7);
                              if (diffWeeks === 1) return 'LISTED 1 WEEK AGO';
                              if (diffWeeks < 4) return `LISTED ${diffWeeks} WEEKS AGO`;
                              const diffMonths = Math.floor(diffDays / 30);
                              if (diffMonths === 1) return 'LISTED 1 MONTH AGO';
                              return `LISTED ${diffMonths} MONTHS AGO`;
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a href="tel:+254712345678" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-md text-[10px] font-roboto font-semibold hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
                            <span className="w-3 h-3 flex items-center justify-center">
                              <i className="ri-phone-line text-[10px]"></i>
                            </span>
                            Call
                          </a>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-golden text-white rounded-md text-[10px] font-roboto font-semibold hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap">
                            <span className="w-3 h-3 flex items-center justify-center">
                              <i className="ri-chat-1-line text-[10px]"></i>
                            </span>
                            Contact
                          </button>
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
              <h3 className="text-lg font-prata text-primary mb-2">Can't find what you're looking for?</h3>
              <p className="text-sm font-roboto text-gray-500 mb-4 max-w-md mx-auto">Register for property alerts and be the first to know about new rentals in your area.</p>
              <form data-readdy-form="true" id="rent-alert-form" onSubmit={handleEnquiry} className="flex flex-col sm:flex-row items-center gap-3 max-w-lg mx-auto">
                <input name="email" type="email" placeholder="Enter your email" required className="flex-1 w-full h-11 px-4 text-sm font-roboto border border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
                <input type="hidden" name="type" value="rent_alert" />
                <input type="hidden" name="location" value="Nairobi" />
                <button type="submit" disabled={enquiryStatus === 'submitting'} className="w-full sm:w-auto h-11 px-6 bg-primary text-white text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {enquiryStatus === 'success' ? 'Alert set!' : 'Get alerts'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar - Only in list view */}
          {viewMode === 'list' && (
            <div className="hidden lg:block lg:w-[30%] xl:w-[25%]">
              <div className="sticky top-[140px] space-y-4">
                {/* Similar search */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-roboto font-semibold text-primary">Studios to rent in Nairobi</h3>
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
                      <a key={area} href={`/rent?area=${encodeURIComponent(area.toLowerCase())}`} className="text-xs font-roboto text-gray-600 hover:text-primary hover:underline transition-colors">
                        {area}
                      </a>
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
                      <a key={search} href={`/rent?q=${encodeURIComponent(search.toLowerCase())}`} className="block text-xs font-roboto text-gray-600 hover:text-primary hover:underline transition-colors">
                        {search}
                      </a>
                    ))}
                  </div>
                </div>

                {/* List property CTA */}
                <div className="bg-primary rounded-lg p-4 text-center">
                  <h3 className="text-white font-prata text-sm mb-2">List your property</h3>
                  <p className="text-white/70 font-roboto text-xs mb-3">Reach thousands of qualified tenants</p>
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
        <h2 className="text-white font-prata text-2xl md:text-3xl mb-3">List Your Property With Us</h2>
        <p className="text-white/70 font-roboto text-sm mb-7 max-w-md mx-auto">Reach thousands of qualified tenants. Get a free rental assessment from our expert team today.</p>
        <Link to="/landlords" className="inline-flex items-center gap-2 px-8 py-3 bg-golden text-white font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-colors">
          <i className="ri-home-heart-line"></i>Get Rental Valuation
        </Link>
      </div>

      <ContactCTA pageSlug="rent" />
      <Footer />
      <BackToTop />
    </div>
  );
}