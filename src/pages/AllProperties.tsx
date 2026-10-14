import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '@/components/feature/Header';
import { humanizeError } from '@/lib/errorMessage';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import InlineBackLink from '@/components/feature/InlineBackLink';
import PageContactSection from '@/components/feature/PageContactSection';
import QuickViewModal from '@/components/feature/QuickViewModal';
import ContactAgentModal from '@/components/feature/ContactAgentModal';
import PropertyBadge from '@/components/feature/PropertyBadge';
import PropertyMetaBadges from '@/components/feature/PropertyMetaBadges';
import CompareToolbar from '@/components/feature/CompareToolbar';
import CompareModal from '@/components/feature/CompareModal';
import PageLoader from '@/components/feature/PageLoader';
import { useCompareToolbar, type CompareProperty } from '@/hooks/useCompareToolbar';
import { supabase } from '@/lib/supabase';
import { getPropertySpecs } from '@/lib/propertySpecs';
import { useCurrency } from '@/hooks/useCurrency';
import { useListingsPageContent } from '@/hooks/useListingsPageContent';
import { formatListingAge } from '@/lib/listingMeta';
import { formatLocation, formatLocationParts, formatAreaName, smartTitleCase } from '@/lib/location';
import PropertySearchBar from '@/components/feature/PropertySearchBar';
import CardContactActions from '@/components/feature/CardContactActions';
import EntityImage from '@/components/feature/EntityImage';
import Pagination from '@/components/feature/Pagination';
import { withReturnFrom } from '@/lib/navigation';
import { applyPublicVisibility } from '@/lib/publicListings';
import UrgencyMessage from '@/components/feature/UrgencyMessage';
import { resolveUrgency, autoUrgency } from '@/lib/urgency';
import { BEDROOM_OPTIONS, bedroomSelectionToRange } from '@/lib/bedrooms';
import { radiusLabelToMeters, haversineDistance } from '@/lib/distance';
import { areaCentreFor } from '@/lib/areaCentres';
import AdvancedFilters, { defaultFilters, FilterState } from '@/pages/Rent/components/AdvancedFilters';
import { advancedToFilters } from '@/pages/Rent/components/advancedToFilters';
import RecentActivitySuggestion from '@/components/feature/RecentActivitySuggestion';
import { hoursForWindowLabel } from '@/lib/recentWindow';
import { rentPriceMinOptions, rentPriceMaxOptions, salePriceMinOptions, salePriceMaxOptions, parsePriceSelection, priceRangeInvalid } from '@/lib/prices';

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
  videoUrl?: string;
  virtualTourUrl?: string;
  floorPlanCount?: number;
  urgencyMessage?: string;
  showUrgencyMessage?: boolean;
  availableUnits?: number;
  /** Coordinates used for radius search (falls back to the listing's area hub). */
  latitude?: number | null;
  longitude?: number | null;
  distanceMeters?: number;
}

const PAGE_SIZE = 12;

// ── Shared search-bar option sets (mirrors Buy / Rent so search matches) ──
const propTypeOptions = ['Show all', 'House', 'Apartment', 'Bungalow', 'Studio', 'Maisonette', 'Villa', 'Townhouse', 'Penthouse', 'Detached', 'Semi-detached', 'Terraced'];
const bedOptions = BEDROOM_OPTIONS;
const radiusOptions = ['This area only', '¼ mile', '½ mile', '1 mile', '3 miles', '5 miles', '10 miles', '15 miles', '20 miles', '30 miles', '40 miles'];
const PROP_TYPE_DB: Record<string, string> = {
  House: 'house',
  Apartment: 'apartment',
  Bungalow: 'bungalow',
  Studio: 'studio_flat',
  Maisonette: 'maisonette',
  Villa: 'villa',
  Townhouse: 'townhouse',
  Penthouse: 'penthouse',
  Detached: 'detached',
  'Semi-detached': 'detached',
  Terraced: 'townhouse',
};

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

  const priceNum = Number(row.price || 0);
  const currency = String(row.currency || 'KES');

  const created = new Date(String(row.created_at || Date.now()));
  const listedDays = Math.floor((Date.now() - created.getTime()) / 86400000);

  // Radius fallback: a listing without its own coordinates sits at its AREA HUB
  // (e.g. a Karen home without lat/lng is treated as the Karen hub) so a
  // "within X miles" search works across the whole inventory honestly.
  let latitude = row.latitude != null ? Number(row.latitude) : null;
  let longitude = row.longitude != null ? Number(row.longitude) : null;
  if (latitude == null || longitude == null) {
    const centre = areaCentreFor(
      row.neighbourhood as string | null,
      row.location as string | null,
      row.city as string | null,
      row.state_region as string | null,
    );
    if (centre) {
      latitude = centre.lat;
      longitude = centre.lng;
    }
  }

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
    image: mainImg || images[0] || '',
    images: mainImg ? [mainImg, ...images] : images,
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
    videoUrl: row.video_url ? String(row.video_url) : undefined,
    virtualTourUrl: row.virtual_tour_url ? String(row.virtual_tour_url) : undefined,
    floorPlanCount: Array.isArray(row.floor_plans) ? (row.floor_plans as unknown[]).length : 0,
    urgencyMessage: row.urgency_message ? String(row.urgency_message) : '',
    showUrgencyMessage: row.show_urgency_message !== false,
    availableUnits: Number(row.total_units ?? 0) > 0
      ? Math.max(0, Number(row.total_units) - Number(row.units_sold ?? 0) - Number(row.units_reserved ?? 0))
      : 0,
    latitude,
    longitude,
  };
}

export default function AllProperties() {
  useSeoMeta({
    title: 'All Properties in Nairobi — For Sale & Rent | Oceans Kenya',
    description: 'Explore every Oceans Kenya listing — houses, apartments, villas, land and commercial property for sale and rent across Nairobi and Kenya.',
    path: '/all-properties',
  });
  const { format, currency, rates } = useCurrency();
  const { content: LC } = useListingsPageContent();
  const { pathname, search } = useLocation();
  const currentPath = `${pathname}${search}`;
  // Deep-link support: /all-properties?area=Kileleshwa preselects that area's listings.
  const initialAreaRef = useRef(new URLSearchParams(search).get('area') || '');
  // Deep-link support: /all-properties?type=Penthouse (footer type links) shows
  // that property type across ALL areas and BOTH sale + rent - never area-locked.
  const initialTypeRef = useRef(new URLSearchParams(search).get('type') || '');
  // Always default to "All Properties" on load - the visitor chooses For Sale / For Rent after.
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'rent'>('all');
  const [searchQuery, setSearchQuery] = useState(() => {
    try { return localStorage.getItem('ap_search_query') || ''; } catch { return ''; }
  });
  const handleLocationChange = (value: string) => {
    setSearchQuery(value);
  };

  // ── Shared search-bar controls (match Buy / Rent) ──
  const [selectedBeds, setSelectedBeds] = useState('Any beds');
  const [priceMin, setPriceMin] = useState('No min');
  const [priceMax, setPriceMax] = useState('No max');
  const [selectedType, setSelectedType] = useState(() => {
    const t = initialTypeRef.current;
    return propTypeOptions.includes(t) ? t : 'Show all';
  });
  const [searchBookmarked, setSearchBookmarked] = useState(false);
  // Radius search (lives in the action row). "This area only" (0 miles) is the
  // honest default - nothing widens until the visitor explicitly picks a radius.
  const [selectedRadius, setSelectedRadius] = useState(() => {
    try { return localStorage.getItem('ap_radius') || 'This area only'; } catch { return 'This area only'; }
  });
  // Advanced search - the SAME shared panel used by Buy / Rent / Commercial, so
  // every property search on the site behaves identically.
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({ ...defaultFilters });
  // When set to a window label (e.g. 'Last 24 hours'), the directory only shows
  // homes added in that window - used by the "what changed recently" note in the
  // zero-result state. 'Anytime' means no time restriction.
  const [recentWindow, setRecentWindow] = useState('Anytime');

  // Count of active advanced criteria - drives the Filters button badge.
  const advancedFilterCount = [
    advancedFilters.propertyTypes.length > 0,
    advancedFilters.mustHaves.length > 0,
    advancedFilters.furnished.length > 0,
    advancedFilters.minBedrooms !== '',
    advancedFilters.maxBedrooms !== '',
    advancedFilters.minBaths !== '',
    advancedFilters.minSize !== '',
    advancedFilters.maxSize !== '',
    advancedFilters.minPrice !== '',
    advancedFilters.maxPrice !== '',
  ].filter(Boolean).length;

  const priceMinOpts = useMemo(() => (filterType === 'rent' ? rentPriceMinOptions(currency, rates) : salePriceMinOptions(currency, rates)), [currency, rates, filterType]);
  const priceMaxOpts = useMemo(() => (filterType === 'rent' ? rentPriceMaxOptions(currency, rates) : salePriceMaxOptions(currency, rates)), [currency, rates, filterType]);
  const priceMinValue = parsePriceSelection(priceMinOpts, priceMin);
  const priceMaxValue = parsePriceSelection(priceMaxOpts, priceMax);
  const priceRangeError = priceRangeInvalid(priceMinValue, priceMaxValue) ? 'Minimum price cannot be greater than maximum price.' : '';

  // Price ladders change with sale/rent context + currency, so reset the range.
  useEffect(() => {
    setPriceMin('No min');
    setPriceMax('No max');
  }, [filterType, currency]);

  const [sortBy, setSortBy] = useState(() => {
    try {
      const saved = localStorage.getItem('ap_sort_by_v2');
      return saved && saved !== 'recommended' ? saved : 'recommended';
    } catch { return 'recommended'; }
  });
  // Defaults to the first area alphabetically once the area list loads (set in the effect below).
  const [selectedNeighbourhood, setSelectedNeighbourhood] = useState('');
  const [neighbourhoodNames, setNeighbourhoodNames] = useState<string[]>([]);
  const [neighbourhoodsLoaded, setNeighbourhoodsLoaded] = useState(false);
  const [listings, setListings] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recentlyViewed, setRecentlyViewed] = useState<Property[]>([]);
  const [quickViewProperty, setQuickViewProperty] = useState<Property | null>(null);
  const [contactModalProperty, setContactModalProperty] = useState<Property | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('saved_properties');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });
  const compare = useCompareToolbar();
  const [showCompareModal, setShowCompareModal] = useState(false);
  const areaScrollRef = useRef<HTMLDivElement>(null);
  const resultsTopRef = useRef<HTMLDivElement>(null);
  const resultsScrollInit = useRef(false);
  const scrollAreas = useCallback((dir: 'left' | 'right') => {
    const el = areaScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -480 : 480, behavior: 'smooth' });
  }, []);

  // Persist the free-text search + sort choice only. The type toggle and area always
  // reset on load so the page opens on "All Properties" in the first area (A→Z).
  useEffect(() => {
    try { localStorage.setItem('ap_search_query', searchQuery); } catch { /* ignore */ }
    try { localStorage.setItem('ap_sort_by_v2', sortBy); } catch { /* ignore */ }
    try { localStorage.setItem('ap_radius', selectedRadius); } catch { /* ignore */ }
  }, [searchQuery, sortBy, selectedRadius]);

  // Load recently viewed from localStorage - try stored objects first, then Supabase for real listings
  useEffect(() => {
    let cancelled = false;

    // First try: stored full-object entries (recently_viewed_devs) - instant, no network needed
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
            propertyType: '',
            sqft: 0,
            landSize: 0,
            acreage: 0,
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
            .from('all_listings')
            .select('id,title,location,address,neighbourhood,city,state_region,is_featured,country,price,property_type,sub_type,bedrooms,bathrooms,parking,sqft,land_size,acreage,land_unit,slug,created_at,main_image,images,purpose,currency,owner_phone,owner_email,property_of_the_week,new_home,refurbished,reduced_price,back_on_market,video_url,virtual_tour_url,floor_plans')
            .in('id', realIds)
            .then(({ data }) => {
              if (!cancelled && data) setRecentlyViewed(((data || []) as Record<string, unknown>[]).map(mapRow));
            }, () => {});
        }
      }
    } catch { /* ignore */ }

    return () => { cancelled = true; };
  }, []);

  // Load neighbourhood names from DB for the area tabs - sorted A→Z, with the first
  // area selected by default (there is no "All areas" tab anymore).
  useEffect(() => {
    supabase
      .from('neighbourhoods')
      .select('name')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          const names = (data as { name: string }[])
            .map((n) => smartTitleCase(n.name))
            .filter((n) => Boolean(n))
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
          setNeighbourhoodNames(names);
          setSelectedNeighbourhood((prev) => {
            if (prev && names.includes(prev)) return prev;
            const wanted = initialAreaRef.current;
            if (wanted) {
              const match = names.find((n) => n.toLowerCase() === wanted.toLowerCase());
              if (match) return match;
            }
            // A ?type= deep-link must span ALL areas, not default to the first.
            if (initialTypeRef.current) return '';
            return names.length > 0 ? names[0] : '';
          });
        }
        setNeighbourhoodsLoaded(true);
      }, () => { setNeighbourhoodsLoaded(true); });
  }, []);

  // A footer type link (?type=Penthouse) can change the type while this page is
  // ALREADY mounted (React Router keeps it alive), so re-apply it and widen to
  // all areas + both sale & rent. An explicit deep-link always wins.
  useEffect(() => {
    const t = new URLSearchParams(search).get('type') || '';
    if (t && propTypeOptions.includes(t) && t !== selectedType) {
      setSelectedType(t);
      setSelectedNeighbourhood('');
      setFilterType('all');
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
    if (!neighbourhoodsLoaded) return;
    setLoading(true);
    setError('');

    try {
      // ── Radius search setup (computed up-front so it can also RELAX the
      // neighbourhood constraint below): a radius EXPANDS the search, so the
      // area tab must not pre-restrict results to the anchor area alone.
      const radiusMeters = radiusLabelToMeters(selectedRadius);
      const radiusOrigin = areaCentreFor(searchQuery) || areaCentreFor(selectedNeighbourhood) || areaCentreFor('nairobi');
      const isRadiusSearch = radiusMeters != null && radiusOrigin != null;
      const radiusAnchorName = (selectedNeighbourhood || searchQuery || '').trim() || null;

      let query = supabase
        .from('all_listings')
        .select('id,title,location,address,neighbourhood,city,state_region,latitude,longitude,is_featured,country,price,property_type,sub_type,bedrooms,bathrooms,parking,sqft,land_size,acreage,land_unit,slug,created_at,main_image,images,purpose,currency,owner_phone,owner_email,is_new_development,property_category,property_of_the_week,new_home,refurbished,reduced_price,back_on_market,video_url,virtual_tour_url,floor_plans,urgency_message,show_urgency_message,total_units,units_sold,units_reserved', { count: 'exact' })
        .neq('title', '')
        // The All Properties directory is strictly residential - commercial, land,
        // joint ventures and new developments must never appear here, matching the
        // homepage Properties section.
        .eq('property_category', 'residential')
        .or('is_new_development.eq.false,is_new_development.is.null');

      // Canonical public visibility (published + live status), never gated on price.
      query = applyPublicVisibility(query, 'active');

      // Recent-only mode - enforced in the database query using the exact
      // window the visitor selected (e.g. 'Last 3 days').
      const recentHours = hoursForWindowLabel(recentWindow);
      if (recentHours != null) {
        query = query.gte('created_at', new Date(Date.now() - recentHours * 3_600_000).toISOString());
      }

      if (filterType !== 'all') {
        query = query.eq('purpose', filterType);
      }

      // The area tab restricts results ONLY when no radius is active. When a
      // radius is set the anchor area's own listings are retained client-side
      // (see below) and nearby areas within the radius are added too.
      if (!isRadiusSearch && selectedNeighbourhood && selectedNeighbourhood !== 'All') {
        // Case-insensitive so the normalised tab label still matches rows whose
        // stored neighbourhood value keeps its original casing.
        query = query.ilike('neighbourhood', selectedNeighbourhood);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%`);
      }

      // Bedrooms - exact count for 1–9 beds, open-ended for "10+ beds".
      const bedRange = bedroomSelectionToRange(selectedBeds);
      if (bedRange.bedsExact !== undefined) query = query.eq('bedrooms', bedRange.bedsExact);
      if (bedRange.bedsMin !== undefined) query = query.gte('bedrooms', bedRange.bedsMin);
      if (bedRange.bedsMax !== undefined) query = query.lte('bedrooms', bedRange.bedsMax);

      // Property type ('Show all' = any residential type)
      if (selectedType !== 'Show all' && PROP_TYPE_DB[selectedType]) {
        query = query.eq('property_type', PROP_TYPE_DB[selectedType]);
      }

      // Price range - independent min / max bounds enforced in the query.
      if (priceMinValue !== undefined && priceMinValue > 0) query = query.gte('price', priceMinValue);
      if (priceMaxValue !== undefined && priceMaxValue > 0) query = query.lte('price', priceMaxValue);

      // ── Advanced search (the SAME shared panel + mapping as Buy / Rent) ──
      // Every selected criterion is enforced as a strict AND on top of the quick
      // filters, so nothing is silently dropped or widened. This directory is
      // strictly residential, so the advanced 'Commercial' category is
      // intentionally NOT re-applied as a category flip.
      const adv = advancedToFilters(advancedFilters);
      if (adv.propertyTypes && adv.propertyTypes.length === 1) {
        query = query.eq('property_type', adv.propertyTypes[0]);
      } else if (adv.propertyTypes && adv.propertyTypes.length > 1) {
        query = query.in('property_type', adv.propertyTypes);
      }
      if (adv.bedsExact !== undefined) query = query.eq('bedrooms', adv.bedsExact);
      if (adv.bedsMin !== undefined && adv.bedsMin > 0) query = query.gte('bedrooms', adv.bedsMin);
      if (adv.bedsMax !== undefined && adv.bedsMax > 0) query = query.lte('bedrooms', adv.bedsMax);
      if (adv.bathsMin !== undefined && adv.bathsMin > 0) query = query.gte('bathrooms', adv.bathsMin);
      if (adv.sqmMin !== undefined && adv.sqmMin > 0) query = query.gte('sqft', adv.sqmMin * 10.764);
      if (adv.sqmMax !== undefined && adv.sqmMax > 0) query = query.lte('sqft', adv.sqmMax * 10.764);
      if (adv.priceMin !== undefined && adv.priceMin > 0) query = query.gte('price', adv.priceMin);
      if (adv.priceMax !== undefined && adv.priceMax > 0) query = query.lte('price', adv.priceMax);
      // "Added to site" window chosen in the advanced panel - enforced on
      // created_at so a 24-hour pick can never return a month-old listing.
      const advAddedHours = hoursForWindowLabel(adv.addedSince ?? null);
      if (advAddedHours != null) {
        query = query.gte('created_at', new Date(Date.now() - advAddedHours * 3_600_000).toISOString());
      }
      if (adv.amenitiesGroups && adv.amenitiesGroups.length > 0) {
        const groups = adv.amenitiesGroups.map((g) => (g || []).filter(Boolean)).filter((g) => g.length > 0);
        if (groups.length > 0) {
          const esc = (v: string) => v.replace(/"/g, '\\"');
          const parts = groups.map((vals) =>
            vals.length === 1
              ? `amenities.cs.{"${esc(vals[0])}"}`
              : `or(${vals.map((v) => `amenities.cs.{"${esc(v)}"}`).join(',')})`,
          );
          query = query.or(`and(${parts.join(',')})`);
        }
      }

      switch (sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'az':
          query = query.order('title', { ascending: true });
          break;
        case 'recommended':
        default:
          query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
          break;
      }

      // ── RADIUS SEARCH ───────────────────────────────────────────────
      // Origin = the typed location first, otherwise the selected area tab,
      // otherwise Nairobi. Distance is measured against each listing's own
      // coordinates or its AREA HUB (the same model used site-wide). Because
      // distance is computed client-side we cannot paginate in the database
      // while a radius is active, so we fetch the matching set and paginate it
      // after distance filtering - exactly like the shared useListings engine.
      // (radiusMeters / radiusOrigin / isRadiusSearch are computed up-front.)
      if (!isRadiusSearch) {
        query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      }

      const { data, error: dbError, count } = await query;
      if (dbError) throw dbError;

      // Hard client-side guarantee: this directory only ever shows residential,
      // non-new-development homes, on top of the DB filter above.
      const residentialRows = ((data || []) as Record<string, unknown>[]).filter((r) => {
        const cat = (String(r.property_category || 'residential') || 'residential').toLowerCase();
        return cat === 'residential' && !r.is_new_development;
      });
      let mapped = residentialRows.map(mapRow);

      if (isRadiusSearch && radiusMeters != null && radiusOrigin != null) {
        const anchor = radiusAnchorName ? radiusAnchorName.toLowerCase() : null;
        const inAnchorArea = (p: Property) => {
          if (!anchor) return false;
          return [p.area, p.location, p.locationLine1, p.locationLine2]
            .some((f) => (f || '').toLowerCase().includes(anchor));
        };
        const within = mapped
          .map((p) => ({
            p,
            dist: p.latitude != null && p.longitude != null
              ? haversineDistance(radiusOrigin.lat, radiusOrigin.lng, p.latitude, p.longitude)
              : Infinity,
          }))
          // CUMULATIVE: keep the anchor area's own listings unconditionally, and
          // only add listings outside it when they fall within the radius. A
          // larger radius can therefore never remove an eligible area listing.
          .filter((x) => inAnchorArea(x.p) || x.dist <= radiusMeters)
          .sort((a, b) => {
            const aa = inAnchorArea(a.p);
            const bb = inAnchorArea(b.p);
            if (aa !== bb) return aa ? -1 : 1;
            return a.dist - b.dist;
          })
          .map((x) => ({ ...x.p, distanceMeters: x.dist }));
        const total = within.length;
        const start = (page - 1) * PAGE_SIZE;
        mapped = within.slice(start, start + PAGE_SIZE);
        setTotalCount(total);
        setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
      } else {
        const total = count || 0;
        setTotalCount(total);
        setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
      }
      setListings(mapped);
    } catch (err: unknown) {
      setError(humanizeError(err, 'We couldn’t load properties right now. Please try again.'));
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, searchQuery, sortBy, page, selectedNeighbourhood, neighbourhoodsLoaded, selectedBeds, selectedType, priceMin, priceMax, advancedFilters, recentWindow, selectedRadius]);

  useEffect(() => {
    fetchListings();
   
  }, [fetchListings]);

  // Changing page must never leave the visitor at the footer - bring the top of
  // the results back into view. Listings keep their height while the next page
  // loads, so the page itself never collapses.
  useEffect(() => {
    if (!resultsScrollInit.current) { resultsScrollInit.current = true; return; }
    const el = resultsTopRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, top) });
  }, [page]);

  const handleSearch = () => {
    setPage(1);
  };

  const headingText = filterType === 'rent'
    ? LC.ap_heading_rent
    : filterType === 'sale'
      ? LC.ap_heading_sale
      : LC.ap_heading_all;

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col pt-[62px] md:pt-[122px] lg:pt-[130px] pb-16 md:pb-0">
      <Header />

      {/* === BREADCRUMBS === */}
      <div className="bg-white border-b border-stone-100">
        <div className="px-4 md:px-8 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 flex-wrap py-3">
            <InlineBackLink />
            <span className="hidden sm:block w-px h-3.5 bg-primary/15 shrink-0" aria-hidden="true"></span>
            <nav className="flex items-center gap-1.5 text-xs font-roboto text-primary/50">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <span className="w-3 h-3 flex items-center justify-center">
                <i className="ri-arrow-right-s-line text-stone-300"></i>
              </span>
              <span className="text-primary/70">Properties</span>
            </nav>
          </div>
        </div>
      </div>

      {/* === EDITORIAL HEADER === */}
      <div className="bg-white border-b border-stone-100">
        <div className="px-4 md:px-8 py-6 md:py-8 max-w-[1400px] mx-auto">
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
                  <><span className="text-primary font-semibold">{totalCount}</span> {LC.ap_listings_label}</>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary/50 font-roboto hidden sm:inline">{LC.ap_sort_label}</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                    className="appearance-none border border-primary/50 rounded-sm pl-3 pr-8 py-2 text-xs font-roboto font-medium text-primary focus:outline-none focus:border-primary cursor-pointer bg-white hover:border-primary transition-colors"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="az">A - Z</option>
                    <option value="newest">Newest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                  <i className="ri-arrow-down-wide-fill absolute right-2 top-1/2 -translate-y-1/2 text-primary/60 text-xs pointer-events-none"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === SEARCH + FILTER BAR === */}
      <div className="bg-white border-b border-stone-100">
        <div className="px-4 md:px-8 py-4 max-w-[1400px] mx-auto">
          <PropertySearchBar
            searchQuery={searchQuery}
            onLocationChange={(val) => { handleLocationChange(val); setPage(1); }}
            placeholderCycle={[
              "Search an area, e.g. Karen or Westlands",
              "Search a school, e.g. Brookhouse School",
              "Search a street, e.g. Riverside Drive",
              "Search a landmark, e.g. The Hub Karen",
              "Search by keyword, e.g. 3-bedroom apartment",
            ]}
            bedsValue={selectedBeds}
            onBedsChange={(v) => { setSelectedBeds(v); setPage(1); }}
            bedOptions={bedOptions}
            priceMinValue={priceMin}
            onPriceMinChange={(v) => { setPriceMin(v); setPage(1); }}
            priceMinOptions={priceMinOpts.labels}
            priceMaxValue={priceMax}
            onPriceMaxChange={(v) => { setPriceMax(v); setPage(1); }}
            priceMaxOptions={priceMaxOpts.labels}
            priceRangeError={priceRangeError}
            onClearPrice={(priceMin !== 'No min' || priceMax !== 'No max') ? () => { setPriceMin('No min'); setPriceMax('No max'); setPage(1); } : undefined}
            typeValue={selectedType}
            onTypeChange={(v) => { setSelectedType(v); setPage(1); }}
            typeOptions={propTypeOptions}
            onFilters={() => setShowAdvancedFilters((v) => !v)}
            filtersActive={showAdvancedFilters}
            filtersCount={advancedFilterCount}
            saved={searchBookmarked}
            onToggleSave={() => setSearchBookmarked(!searchBookmarked)}
            onSearch={handleSearch}
            actionRadiusValue={selectedRadius}
            onActionRadiusChange={(v) => { setSelectedRadius(v); setPage(1); }}
            actionRadiusOptions={radiusOptions}
          />

          {/* Filter tabs - All / Sale / Rent */}
          <div className="mt-3 md:mt-4">
            <div className="flex items-center gap-1 sm:gap-2">
              {(['all', 'sale', 'rent'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => { setFilterType(type); setPage(1); }}
                  className={`max-sm:flex-1 max-sm:basis-0 max-sm:min-w-0 max-sm:px-2 max-sm:py-2.5 max-sm:text-[11px] max-sm:leading-tight max-sm:tracking-wide px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-roboto font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer border-2 ${
                    filterType === type
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-primary border-primary/30 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  {type === 'all' ? LC.ap_tab_all : type === 'sale' ? LC.ap_tab_sale : LC.ap_tab_rent}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* === ADVANCED FILTERS (shared panel - same as Buy / Rent) === */}
      <AdvancedFilters
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={(f) => { setAdvancedFilters(f); setPage(1); }}
        initialFilters={advancedFilters}
        mode={filterType === 'sale' ? 'sale' : 'rent'}
      />

      {/* === MAIN CONTENT === */}
      <main ref={resultsTopRef} className="flex-1 px-4 md:px-8 py-8 pb-24 max-w-[1400px] mx-auto w-full">
        <div className="flex gap-5 flex-col lg:flex-row">
          {/* Listings column - widened so cards get more room */}
          <div className="lg:w-[78%] xl:w-[82%] min-w-0">
        {/* Area Tabs - sorted A→Z, first area selected by default (no "All areas" tab) */}
        {neighbourhoodNames.length > 0 && (
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
                {neighbourhoodNames.map((area) => (
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
        )}

        {error && !loading && (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center bg-red-50 rounded-full">
              <i className="ri-error-warning-line text-xl text-red-400"></i>
            </div>
            <p className="text-sm text-primary/70 mb-4">{error}</p>
            <button onClick={() => fetchListings()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
              <i className="ri-refresh-line"></i>Try Again
            </button>
          </div>
        )}

        {!error && listings.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-stone-100 rounded-full">
              <i className="ri-search-line text-2xl text-primary/50"></i>
            </div>
            <p className="font-roboto font-bold text-primary text-xl mb-2">No exact matches</p>
            <p className="text-sm font-roboto text-primary/50 mb-4">No properties matched your selected criteria. You can broaden the search to see more.</p>
            <button
              onClick={() => {
                // Consistent with the note button: drop the keyword text as well
                // as the quick filters, while keeping the selected AREA tab.
                setSelectedBeds('Any beds'); setSelectedType('Show all'); setPriceMin('No min'); setPriceMax('No max');
                setAdvancedFilters({ ...defaultFilters }); setRecentWindow('Anytime'); setSelectedRadius('This area only');
                setSearchQuery('');
                setPage(1);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
            >
              <i className="ri-equalizer-2-line"></i>Broaden search
            </button>
            <RecentActivitySuggestion
              location={selectedNeighbourhood || undefined}
              addedWindow={recentWindow}
              scope={{ purpose: filterType === 'all' ? null : filterType, propertyCategory: 'residential' }}
              onView={(targetWindow) => {
                setSelectedBeds('Any beds');
                setSelectedType('Show all');
                setPriceMin('No min');
                setPriceMax('No max');
                setAdvancedFilters({ ...defaultFilters });
                // Clear any conflicting keyword so the window shows every
                // residential listing in the selected area.
                setSearchQuery('');
                setRecentWindow(targetWindow);
                setPage(1);
              }}
            />
          </div>
        )}

        {/* Property Cards - grid matching Zoopla development card proportions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && listings.length === 0
            ? Array.from({ length: 9 }).map((_, n) => <PropertyCardSkeleton key={n} />)
            : listings.map((p) => (
                <PropertyCard key={p.id} property={p} isSaved={savedIds.has(p.id)} onToggleSave={toggleSave} onQuickView={setQuickViewProperty} onMessage={() => setContactModalProperty(p)} />
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
          {LC.ap_show_sidebar && (
          <div className="hidden lg:block lg:w-[22%] xl:w-[18%]">
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
                          to={withReturnFrom(`/property/${p.slug}`, currentPath)}
                          className="flex items-center gap-2.5 cursor-pointer"
                        >
                          <div className="w-14 h-10 flex-shrink-0 overflow-hidden rounded">
                            <EntityImage
                              src={p.image}
                              alt={p.title}
                              compact
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
                  <p className="text-[10px] font-roboto text-gray-400 uppercase tracking-wider mb-0.5">{LC.ap_saved_label}</p>
                  <p className="text-xs font-roboto text-gray-600 leading-relaxed">
                    {LC.ap_saved_text}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-primary/12 rounded-lg overflow-hidden">
                <div className="px-3 py-2.5 border-b border-gray-100">
                  <h3 className="text-xs font-roboto font-semibold text-primary">{LC.ap_quick_links_label}</h3>
                </div>
                <div className="px-3 py-2 space-y-1.5">
                  {LC.ap_quick_links.map((l, i) => (
                    <Link key={`${l.link}-${i}`} to={l.link} className="flex items-center gap-2 text-xs font-roboto text-gray-600 hover:text-primary transition-colors cursor-pointer">
                      <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-link text-[10px]"></i></span>
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}
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
      {contactModalProperty && (
        <ContactAgentModal
          isOpen={true}
          onClose={() => setContactModalProperty(null)}
          propertyTitle={contactModalProperty.title}
          propertyId={contactModalProperty.id}
          propertySlug={contactModalProperty.slug}
          propertyPrice={format(contactModalProperty.priceRaw, contactModalProperty.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
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

/* ── Property Card Skeleton - Zoopla dev-card proportions ── */
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

/* ── Luxury Property Card - Zoopla dev-card vertical style ── */
function PropertyCard({
  property,
  isSaved,
  onToggleSave,
  onQuickView,
  onMessage,
}: {
  property: Property;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onQuickView: (p: Property) => void;
  onMessage: () => void;
}) {
  const { format } = useCurrency();
  const { pathname, search } = useLocation();
  const detailHref = withReturnFrom(`/property/${property.slug}`, `${pathname}${search}`);
  const listedAgo = formatListingAge(property.createdAt);
  const openVideo = property.videoUrl ? () => window.open(property.videoUrl as string, '_blank', 'noopener,noreferrer') : undefined;
  const openVirtualTour = property.virtualTourUrl ? () => window.open(property.virtualTourUrl as string, '_blank', 'noopener,noreferrer') : undefined;
  const [imgIdx, setImgIdx] = useState(0);
  // On touch devices there is no real hover, so the first tap on a card image
  // reveals the prev/next arrows instead of jumping straight to the listing.
  const [revealed, setRevealed] = useState(false);
  const touchStartRef = useRef(0);
  const touchEndRef = useRef(0);
  const totalImages = property.images.length;

  const urgency = resolveUrgency({
    manual: property.urgencyMessage,
    automatic: property.availableUnits && property.availableUnits > 0 ? autoUrgency(property.availableUnits, 'unit') : null,
    enabled: property.showUrgencyMessage !== false,
  });

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

  return (
    <div className="listing-safe bg-[var(--card-bg)] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] hover:shadow-md transition-all duration-200 group">
      {/* ── Image - Zoopla 645×430 ratio ── */}
      <div
        className="relative aspect-[645/430] w-full overflow-hidden"
        onClickCapture={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button')) return;
          if (window.matchMedia('(hover: none)').matches && !revealed) {
            e.preventDefault();
            e.stopPropagation();
            setRevealed(true);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Link
          to={detailHref}
          className="flex h-full transition-transform duration-200 ease-out will-change-transform"
          style={{ transform: `translateX(-${imgIdx * 100}%)` }}
        >
          {(property.images.length > 0 ? property.images : ['']).map((src, i) => (
            <EntityImage
              key={i}
              src={src}
              alt={property.title}
              loading={i === 0 ? undefined : 'lazy'}
              className="w-full h-full object-cover object-center flex-shrink-0 transition-transform duration-700 group-hover:scale-105 pointer-events-none select-none"
            />
          ))}
        </Link>

        {/* Nav arrows */}
        {totalImages > 1 && (
          <>
            <button
              onClick={prevImg}
              className={`absolute left-1.5 md:left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-11 md:w-8 md:h-12 flex items-center justify-center rounded-md bg-white/90 text-[#002349] hover:bg-white transition-opacity duration-150 cursor-pointer whitespace-nowrap md:opacity-100 ${revealed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              aria-label="Previous image"
            >
              <i className="ri-arrow-left-s-line text-base md:text-lg"></i>
            </button>
            <button
              onClick={nextImg}
              className={`absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-11 md:w-8 md:h-12 flex items-center justify-center rounded-md bg-white/90 text-[#002349] hover:bg-white transition-opacity duration-150 cursor-pointer whitespace-nowrap md:opacity-100 ${revealed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              aria-label="Next image"
            >
              <i className="ri-arrow-right-s-line text-base md:text-lg"></i>
            </button>
          </>
        )}

        {/* Image counter - 1/N (Zoopla style) */}
        {totalImages > 1 && (
          <div className="absolute bottom-2 right-2 z-10">
            <span className="flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 rounded-sm">
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-image-line text-xs"></i>
              </span>
              {imgIdx + 1}/{totalImages}
            </span>
          </div>
        )}

        {/* Status badge - category first, status second */}
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
          className="absolute bottom-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <span className="flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 rounded-sm cursor-pointer hover:bg-black/80 transition-colors">
            <span className="w-3.5 h-3.5 flex items-center justify-center">
              <i className="ri-expand-diagonal-line text-xs"></i>
            </span>
            Preview
          </span>
        </button>
      </div>

      {/* ── Content - Zoopla dev-card content style ── */}
      <div className="p-4 md:p-6 max-sm:p-5 flex flex-col">
        <PropertyMetaBadges
          featured={property.featured}
          jointVenture={property.isJointVenture}
          justListed={property.justListed}
          newHome={property.newHome}
          reduced={property.reduced}
          refurbished={property.refurbished}
          backOnMarket={property.backOnMarket}
          propertyOfTheWeek={property.propertyOfTheWeek}
          videoTour={Boolean(property.videoUrl)}
          virtualTour={Boolean(property.virtualTourUrl)}
          floorPlan={(property.floorPlanCount ?? 0) > 0}
          onVideoClick={openVideo}
          onVirtualTourClick={openVirtualTour}
          className="mb-2"
        />
        {/* Price */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm md:text-base font-roboto font-bold text-[color:var(--card-price-text)]">
              {property.priceRaw > 0 ? format(property.priceRaw, property.currency as 'KES' | 'USD' | 'GBP' | 'EUR') : 'Price on request'}
            </span>
            {property.priceRaw > 0 && (property.type === 'rent' ? (
              <span className="text-sm md:text-base font-roboto font-normal text-[color:var(--card-price-text)]">pcm</span>
            ) : (
              <span className="text-xs font-roboto font-normal text-[color:var(--card-category-text)]">Guide Price</span>
            ))}
          </div>
        </div>

        {/* Location */}
        <p className="flex items-start gap-1.5 mb-1.5">
          <span className="w-3 h-3 flex items-center justify-center mt-0.5">
            <i className="ri-map-pin-line text-accent text-[10px]"></i>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-roboto font-medium text-[color:var(--card-location-text)] leading-snug">
              {property.area || property.location}
            </span>
          </span>
        </p>

        {/* Title */}
        <Link to={detailHref} className="block hover:underline mb-2">
          <h3 className="text-sm md:text-base font-roboto font-medium text-[color:var(--card-title-text)] leading-snug line-clamp-2">
            {property.title}
          </h3>
        </Link>

        {/* Beds | Baths | Parking */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm font-roboto font-normal text-[color:var(--card-specs-text)] mb-3">
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

        {urgency && <UrgencyMessage message={urgency} className="mb-3" />}

        {/* Footer: actions + date - always one line, never wraps */}
        <div className="flex flex-nowrap items-center justify-between gap-x-2 pt-3 border-t-2 border-primary/12 mt-auto">
          <CardContactActions
            phone={property.agentPhone}
            onMessage={onMessage}
            messageLabel="Message"
            className="min-w-0"
          />
          {listedAgo && (
            <p className="text-xs font-roboto font-medium text-[color:var(--card-time-text)] whitespace-nowrap shrink-0">
              {listedAgo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}