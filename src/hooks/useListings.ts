import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { haversineDistance } from '@/lib/distance';
import { formatLocation, formatLocationParts, formatAreaName, smartTitleCase } from '@/lib/location';

// ── Raw DB shape ──────────────────────────────────────────────
interface ListingRow {
  id: string;
  title: string;
  location: string;
  address?: string | null;
  neighbourhood?: string | null;
  city?: string | null;
  state_region?: string | null;
  price: number;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  land_size: number | null;
  acreage: number | null;
  land_unit: string | null;
  parking: number | null;
  slug: string | null;
  created_at: string;
  description: string | null;
  main_image: string | null;
  images: string[] | null;
  neighbourhood: string | null;
  status: string;
  amenities: string[] | null;
  features: Record<string, unknown> | null;
  floor_plans: string[] | null;
  property_label: string | null;
  price_prefix: string | null;
  price_postfix: string | null;
  currency: string;
  agent_id: string | null;
  video_url?: string | null;
  virtual_tour_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sub_type?: string | null;
  is_featured?: boolean | null;
  country?: string | null;
  owner_phone?: string | null;
  owner_email?: string | null;
  property_of_the_week?: boolean | null;
  new_home?: boolean | null;
  refurbished?: boolean | null;
  reduced_price?: boolean | null;
  back_on_market?: boolean | null;
  commission_applicable?: boolean | null;
}

// ── Mapped shape used by the Buy page ──────────────────────────
export interface MappedListing {
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
  receptions: number;
  sqft: number;
  sqm: number;
  landSize: number;
  acreage: number;
  landUnit?: string;
  price: string;
  rawPrice: number;
  currency: string;
  priceUnit?: string;
  image: string;
  featured: boolean;
  listedDays: number;
  badges: string[];
  createdAt: string;
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
  propertyOfTheWeek?: boolean;
  refurbished?: boolean;
  backOnMarket?: boolean;
  commissionApplicable?: boolean;
  agentShortName?: string;
  agentBrandColor?: string;
  // Distance info
  latitude?: number | null;
  longitude?: number | null;
  // Calculated
  distanceKm?: number | null;
  // JV / Land flags
  isLand: boolean;
  isJointVenture: boolean;
  agentPhone?: string;
  agentEmail?: string;
}

// ── Filter / Search / Sort input ───────────────────────────────
export interface ListingFilters {
  purpose: 'sale' | 'rent';
  search: string;
  priceMin?: number;
  priceMax?: number;
  bedsMin?: number;
  bedsMax?: number;
  propertyType: string;
  addedSince: string;
  sortBy: string;
  statusFilter: string;
  // Distance-based filtering
  centerLat?: number | null;
  centerLng?: number | null;
  radiusMeters?: number | null;
  // Category filter (e.g. 'commercial')
  propertyCategory?: string | null;
  // Size filters (sqft in DB, but filter by sqm)
  sqmMin?: number;
  sqmMax?: number;
}

export interface UseListingsReturn {
  listings: MappedListing[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ── Agent short-name helpers ──────────────────────────────────
const AGENT_COLORS = ['#1a1a2e', '#8B0000', '#006400', '#4B0082', '#D2691E', '#2F4F4F', '#556B2F', '#8B4513'];

function deriveAgentInfo(name: string | null | undefined) {
  if (!name) return { agent: 'Oceans Kenya', agentShortName: 'OK', agentBrandColor: '#1a1a2e' };
  const words = name.trim().split(/\s+/);
  const short = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : words[0].slice(0, 2).toUpperCase();
  const colorIndex = Math.abs(hashCode(name)) % AGENT_COLORS.length;
  return { agent: name, agentShortName: short, agentBrandColor: AGENT_COLORS[colorIndex] };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Build a slug from title ────────────────────────────────────
function buildSlug(id: string, title: string): string {
  if (!title) return id;
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

// ── category display helper ────────────────────────────────────
function toDisplayType(category: string): string {
  return category
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Map a single DB row → MappedListing ───────────────────────
function mapRow(row: ListingRow, now: Date, listingType: 'sale' | 'rent'): MappedListing {
  const title = smartTitleCase(row.title || 'Untitled Property');
  const location = formatLocation({
    address: row.address,
    neighbourhood: row.neighbourhood,
    location: row.location,
    city: row.city,
    state_region: row.state_region,
  });
  const locationParts = formatLocationParts({
    address: row.address,
    neighbourhood: row.neighbourhood,
    location: row.location,
    city: row.city,
    state_region: row.state_region,
    country: row.country,
  });
  const area = formatAreaName({
    address: row.address,
    neighbourhood: row.neighbourhood,
    location: row.location,
    city: row.city,
  });
  const slug = row.slug || buildSlug(row.id, title);

  const allImages: string[] = [];
  if (row.main_image) allImages.push(row.main_image);
  if (row.images && row.images.length > 0) {
    row.images.forEach((img) => {
      if (img && !allImages.includes(img)) allImages.push(img);
    });
  }
  // Fallback image if nothing is available
  if (allImages.length === 0) {
    allImages.push('https://readdy.ai/api/search-image?query=Modern%20luxury%20property%20exterior%20with%20clean%20white%20walls%20and%20large%20windows%2C%20bright%20daylight%2C%20architectural%20photography%2C%20high%20quality%20real%20estate%20photo%2C%20palm%20trees%2C%20blue%20sky&width=800&height=600&seq=buy-fallback-01&orientation=landscape');
  }

  const priceNum = row.price || 0;
  const formattedPrice = formatPriceDisplay(priceNum, row.currency, row.price_prefix, row.price_postfix);

  const created = new Date(row.created_at);
  const listedDays = Math.floor((now.getTime() - created.getTime()) / 86400000);

  const badges: string[] = [];
  const justAdded = listedDays <= 3;
  const newHome = Boolean(row.new_home);
  if (justAdded) badges.push('Just added');
  if (newHome && !justAdded) badges.push('New home');
  if (row.video_url) badges.push('Video tour');
  if (row.virtual_tour_url) badges.push('Virtual tour');
  if (row.floor_plans && row.floor_plans.length > 0) badges.push('Floor plan');
  if (row.status === 'under_contract') badges.push('Under offer');

  const isLand = (row.property_type || '').toLowerCase() === 'land';
  const isJointVenture = (row.sub_type || '').toLowerCase() === 'joint_venture';

  const beds = row.bedrooms ?? 0;
  const baths = row.bathrooms ?? 0;
  const sqft = row.sqft ?? 1500;

  const agentInfo = deriveAgentInfo(null);
  const agentPhone = row.owner_phone || undefined;
  const agentEmail = row.owner_email || undefined;

  return {
    id: row.id,
    slug,
    title,
    location,
    locationLine1: locationParts.line1,
    locationLine2: locationParts.line2,
    area,
    type: listingType,
    category: toDisplayType(row.property_type || 'house'),
    propertyType: row.property_type || '',
    beds,
    baths,
    parking: row.parking ?? 0,
    receptions: Math.max(1, Math.floor(beds / 2)),
    sqft,
    sqm: Math.round(sqft * 0.0929),
    landSize: Number(row.land_size ?? 0),
    acreage: Number(row.acreage ?? 0),
    landUnit: row.land_unit || undefined,
    price: formattedPrice,
    rawPrice: priceNum,
    currency: row.currency || 'KES',
    priceUnit: undefined,
    image: allImages[0],
    featured: Boolean(row.is_featured),
    listedDays,
    badges,
    createdAt: row.created_at,
    description: row.description || '',
    images: allImages,
    newHome,
    reduced: Boolean(row.reduced_price),
    propertyOfTheWeek: Boolean(row.property_of_the_week),
    refurbished: Boolean(row.refurbished),
    backOnMarket: Boolean(row.back_on_market),
    commissionApplicable: Boolean(row.commission_applicable),
    videoTour: !!row.video_url,
    virtualTour: !!row.virtual_tour_url,
    floorPlan: !!(row.floor_plans && row.floor_plans.length > 0),
    justAdded,
    houseShare: false,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    isLand,
    isJointVenture,
    agentPhone,
    agentEmail,
    ...agentInfo,
  };
}

function formatPriceDisplay(price: number, currency: string, prefix?: string | null, postfix?: string | null): string {
  const p = prefix || '';
  const s = postfix || '';
  if (!currency) currency = 'KES';
  const symbol = currency === 'USD' ? '$' : currency === 'KES' ? 'KES' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'UGX' ? 'UGX' : currency === 'AED' ? 'AED' : currency === 'ZAR' ? 'R' : currency;
  return `${p}${symbol} ${price.toLocaleString()}${s}`;
}

// ── Distance filtering helper ──────────────────────────────────
function filterAndSortByDistance(
  listings: MappedListing[],
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
): MappedListing[] {
  return listings
    .map((listing) => {
      const hasCoords = listing.latitude != null && listing.longitude != null;
      const dist = hasCoords
        ? haversineDistance(centerLat, centerLng, listing.latitude!, listing.longitude!)
        : Infinity;
      return { ...listing, distanceKm: hasCoords ? dist / 1000 : null };
    })
    .filter((listing) => {
      if (listing.distanceKm == null) return false;
      return listing.distanceKm * 1000 <= radiusMeters;
    })
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}

// ── Hook ───────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 10;

export function useListings(filters: ListingFilters, page: number): UseListingsReturn {
  const [listings, setListings] = useState<MappedListing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchListings = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const isDistanceFilter = !!(filters.centerLat && filters.centerLng && filters.radiusMeters);

    try {
      // Build base query without pagination when distance filtering
      let query = supabase
        .from('listings')
        .select('id,title,location,address,neighbourhood,city,state_region,price,property_type,bedrooms,bathrooms,sqft,land_size,acreage,land_unit,parking,slug,created_at,description,main_image,images,status,amenities,features,floor_plans,property_label,price_prefix,price_postfix,currency,agent_id,video_url,virtual_tour_url,latitude,longitude,sub_type,is_featured,country,owner_phone,owner_email,property_of_the_week,new_home,refurbished,reduced_price,back_on_market,commission_applicable', { count: 'exact', head: false })
        .eq('purpose', filters.purpose)
        .eq('is_published', true)
        .neq('title', '')
        .gt('price', 0)
        .or('is_new_development.eq.false,is_new_development.is.null');

      // Status filter
      if (filters.statusFilter === 'available') {
        query = query.eq('status', 'available');
      } else if (filters.statusFilter === 'all') {
        query = query.neq('status', 'sold');
      } else {
        query = query.in('status', ['available', 'under_contract']);
      }

      // Search
      if (filters.search) {
        const q = filters.search.trim();
        query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%,neighbourhood.ilike.%${q}%`);
      }

      // Price range
      if (filters.priceMin !== undefined && filters.priceMin > 0) {
        query = query.gte('price', filters.priceMin);
      }
      if (filters.priceMax !== undefined && filters.priceMax > 0) {
        query = query.lte('price', filters.priceMax);
      }

      // Beds
      if (filters.bedsMin !== undefined && filters.bedsMin > 0) {
        query = query.gte('bedrooms', filters.bedsMin);
      }
      if (filters.bedsMax !== undefined && filters.bedsMax > 0) {
        query = query.lte('bedrooms', filters.bedsMax);
      }

      // Property type — shared typeMap used in main & fallback paths
      const PROP_TYPE_MAP: Record<string, string> = {
        'Apartment': 'apartment',
        'House': 'house',
        'Townhouse': 'townhouse',
        'Penthouse': 'penthouse',
        'Villa': 'villa',
        'Studio': 'studio_flat',
        'Bungalow': 'bungalow',
        'Maisonette': 'maisonette',
        'Detached': 'detached',
        'Semi-detached': 'semi-detached',
        'Terraced': 'terraced',
        'Land': 'land',
        'Office': 'office',
        'Retail / Shop': 'retail_shop',
        'Warehouse': 'warehouse',
        'Industrial': 'industrial',
        'Serviced Office': 'serviced_office',
      };
      if (filters.propertyType && filters.propertyType !== 'Any type') {
        const dbType = PROP_TYPE_MAP[filters.propertyType] || filters.propertyType.toLowerCase().replace(/[\s/]+/g, '_');
        query = query.eq('property_type', dbType);
      }

      // Property category — always enforced; Buy/Rent default to residential-only
      // For commercial, also catch listings by property_type so nothing slips through
      if (filters.propertyCategory === 'commercial') {
        query = query.or('property_category.eq.commercial,property_type.in.(office,serviced_office,retail_shop,guest_house,leisure,warehouse,industrial,land,other)');
      } else {
        query = query.eq('property_category', filters.propertyCategory || 'residential');
      }

      // Size (sqft in DB, convert from sqm)
      if (filters.sqmMin !== undefined && filters.sqmMin > 0) {
        query = query.gte('sqft', filters.sqmMin * 10.764);
      }
      if (filters.sqmMax !== undefined && filters.sqmMax > 0) {
        query = query.lte('sqft', filters.sqmMax * 10.764);
      }

      // Added since
      if (filters.addedSince && filters.addedSince !== 'Anytime') {
        const now = new Date();
        let since: Date;
        switch (filters.addedSince) {
          case 'Last 24 hours':
            since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'Last 3 days':
            since = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
            break;
          case 'Last 7 days':
            since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'Last 14 days':
            since = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            break;
          default:
            since = new Date(0);
        }
        query = query.gte('created_at', since.toISOString());
      }

      // Sort — distance filtering overrides sort
      if (!isDistanceFilter) {
        switch (filters.sortBy) {
          case 'Highest price':
            query = query.order('price', { ascending: false });
            break;
          case 'Lowest price':
            query = query.order('price', { ascending: true });
            break;
          case 'Most recent':
          default:
            query = query.order('created_at', { ascending: false });
            break;
        }
      }

      // Pagination — skip when distance filtering (fetch all, paginate client-side)
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      if (!isDistanceFilter) {
        query = query.range(from, to);
      }

      const { data, error: queryError, count } = await query;

      if (queryError) {
        if (queryError.code === '42703' || queryError.message?.toLowerCase().includes('schema cache') || queryError.message?.toLowerCase().includes('agents')) {
          let fallbackQuery = supabase
            .from('listings')
            .select('id,title,location,address,neighbourhood,city,state_region,price,property_type,bedrooms,bathrooms,sqft,land_size,acreage,land_unit,parking,slug,created_at,description,main_image,images,status,amenities,features,floor_plans,property_label,price_prefix,price_postfix,currency,agent_id,video_url,virtual_tour_url,latitude,longitude,sub_type,is_featured,country,owner_phone,owner_email,property_of_the_week,new_home,refurbished,reduced_price,back_on_market,commission_applicable', { count: 'exact', head: false })
            .eq('purpose', filters.purpose)
            .eq('is_published', true)
            .neq('title', '')
            .gt('price', 0)
            .neq('is_new_development', true);

          if (filters.search) {
            const q = filters.search.trim();
            fallbackQuery = fallbackQuery.or(`title.ilike.%${q}%,location.ilike.%${q}%`);
          }
          if (filters.priceMin && filters.priceMin > 0) fallbackQuery = fallbackQuery.gte('price', filters.priceMin);
          if (filters.priceMax && filters.priceMax > 0) fallbackQuery = fallbackQuery.lte('price', filters.priceMax);
          if (filters.bedsMin && filters.bedsMin > 0) fallbackQuery = fallbackQuery.gte('bedrooms', filters.bedsMin);
          if (filters.bedsMax && filters.bedsMax > 0) fallbackQuery = fallbackQuery.lte('bedrooms', filters.bedsMax);
          if (filters.propertyType && filters.propertyType !== 'Any type') {
            const dbType = PROP_TYPE_MAP[filters.propertyType] || filters.propertyType.toLowerCase().replace(/[\s/]+/g, '_');
            fallbackQuery = fallbackQuery.eq('property_type', dbType);
          }
          fallbackQuery = fallbackQuery.eq('property_category', filters.propertyCategory || 'residential');
          if (filters.sqmMin && filters.sqmMin > 0) fallbackQuery = fallbackQuery.gte('sqft', filters.sqmMin * 10.764);
          if (filters.sqmMax && filters.sqmMax > 0) fallbackQuery = fallbackQuery.lte('sqft', filters.sqmMax * 10.764);
          fallbackQuery = fallbackQuery.in('status', ['available', 'under_contract']);
          fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
          if (!isDistanceFilter) {
            fallbackQuery = fallbackQuery.range(from, to);
          }

          const fallback = await fallbackQuery;
          if (fallback.error) throw fallback.error;

          const now = new Date();
          let mapped = ((fallback.data || []) as ListingRow[]).map((row) => mapRow(row, now, filters.purpose));

          // Distance filtering
          if (isDistanceFilter) {
            mapped = filterAndSortByDistance(mapped, filters.centerLat!, filters.centerLng!, filters.radiusMeters!);
            const total = mapped.length;
            const start = (page - 1) * ITEMS_PER_PAGE;
            mapped = mapped.slice(start, start + ITEMS_PER_PAGE);
            setTotalCount(total);
          } else {
            setTotalCount(fallback.count || mapped.length);
          }
          setListings(mapped);
        } else {
          throw queryError;
        }
      } else {
        const now = new Date();
        let mapped = ((data || []) as ListingRow[]).map((row) => mapRow(row, now, filters.purpose));

        // Distance filtering
        if (isDistanceFilter) {
          mapped = filterAndSortByDistance(mapped, filters.centerLat!, filters.centerLng!, filters.radiusMeters!);
          const total = mapped.length;
          const start = (page - 1) * ITEMS_PER_PAGE;
          mapped = mapped.slice(start, start + ITEMS_PER_PAGE);
          setTotalCount(total);
        } else {
          setTotalCount(count || mapped.length);
        }
        setListings(mapped);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load listings';
      setError(message);
      setListings([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.priceMin, filters.priceMax, filters.bedsMin, filters.bedsMax, filters.propertyType, filters.addedSince, filters.sortBy, filters.statusFilter, filters.purpose, filters.propertyCategory, filters.sqmMin, filters.sqmMax, page, filters.centerLat, filters.centerLng, filters.radiusMeters]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const refetch = useCallback(() => {
    fetchListings();
  }, [fetchListings]);

  return { listings, totalCount, loading, error, refetch };
}