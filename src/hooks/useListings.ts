import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { haversineDistance } from '@/lib/distance';

// ── Raw DB shape ──────────────────────────────────────────────
interface ListingRow {
  id: string;
  title: string;
  location: string;
  price: number;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
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
}

// ── Mapped shape used by the Buy page ──────────────────────────
export interface MappedListing {
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
  // Distance info
  latitude?: number | null;
  longitude?: number | null;
  // Calculated
  distanceKm?: number | null;
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
  const title = row.title || 'Untitled Property';
  const location = row.location || 'Nairobi';
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
  const newHome = listedDays <= 14 && listedDays > 3;
  if (justAdded) badges.push('Just added');
  if (newHome && !justAdded) badges.push('New home');
  if (row.video_url) badges.push('Video tour');
  if (row.virtual_tour_url) badges.push('Virtual tour');
  if (row.floor_plans && row.floor_plans.length > 0) badges.push('Floor plan');
  if (row.status === 'under_contract') badges.push('Under offer');

  const beds = row.bedrooms ?? 0;
  const baths = row.bathrooms ?? 0;
  const sqft = row.sqft ?? 1500;

  const agentInfo = deriveAgentInfo(null);

  return {
    id: row.id,
    slug,
    title,
    location,
    type: listingType,
    category: toDisplayType(row.property_type || 'house'),
    beds,
    baths,
    parking: row.parking ?? 0,
    receptions: Math.max(1, Math.floor(beds / 2)),
    sqft,
    sqm: Math.round(sqft * 0.0929),
    price: formattedPrice,
    priceUnit: undefined,
    image: allImages[0],
    featured: false,
    listedDays,
    badges,
    description: row.description || '',
    images: allImages,
    newHome,
    reduced: false,
    videoTour: !!row.video_url,
    virtualTour: !!row.virtual_tour_url,
    floorPlan: !!(row.floor_plans && row.floor_plans.length > 0),
    justAdded,
    houseShare: false,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    ...agentInfo,
  };
}

function formatPriceDisplay(price: number, currency: string, prefix?: string | null, postfix?: string | null): string {
  const p = prefix || '';
  const s = postfix || '';
  const currencySymbol = currency === 'USD' ? '$' : currency === 'KES' ? 'KSh' : currency === 'UGX' ? 'UGX' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '';
  if (price >= 1_000_000_000) return `${p}${currencySymbol} ${(price / 1_000_000_000).toFixed(1)}B${s}`;
  if (price >= 1_000_000) return `${p}${currencySymbol} ${(price / 1_000_000).toFixed(1)}M${s}`;
  if (price >= 1_000) return `${p}${currencySymbol} ${(price / 1_000).toFixed(0)}K${s}`;
  return `${p}${currencySymbol} ${price.toLocaleString()}${s}`;
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
        .select('*', { count: 'exact', head: false })
        .eq('purpose', filters.purpose)
        .eq('is_published', true)
        .neq('title', '')
        .gt('price', 0);

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

      // Property type
      if (filters.propertyType !== 'Any type') {
        const typeMap: Record<string, string> = {
          'Apartment': 'apartment',
          'House': 'house',
          'Townhouse': 'townhouse',
          'Penthouse': 'penthouse',
          'Villa': 'villa',
          'Studio': 'studio',
          'Land': 'land',
        };
        const dbType = typeMap[filters.propertyType] || filters.propertyType.toLowerCase();
        query = query.eq('property_type', dbType);
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
            .select('*', { count: 'exact', head: false })
            .eq('purpose', filters.purpose)
            .eq('is_published', true)
            .neq('title', '')
            .gt('price', 0);

          if (filters.search) {
            const q = filters.search.trim();
            fallbackQuery = fallbackQuery.or(`title.ilike.%${q}%,location.ilike.%${q}%`);
          }
          if (filters.priceMin && filters.priceMin > 0) fallbackQuery = fallbackQuery.gte('price', filters.priceMin);
          if (filters.priceMax && filters.priceMax > 0) fallbackQuery = fallbackQuery.lte('price', filters.priceMax);
          if (filters.bedsMin && filters.bedsMin > 0) fallbackQuery = fallbackQuery.gte('bedrooms', filters.bedsMin);
          if (filters.bedsMax && filters.bedsMax > 0) fallbackQuery = fallbackQuery.lte('bedrooms', filters.bedsMax);
          if (filters.propertyType !== 'Any type') {
            const dbType = filters.propertyType.toLowerCase();
            fallbackQuery = fallbackQuery.eq('property_type', dbType);
          }
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
  }, [filters.search, filters.priceMin, filters.priceMax, filters.bedsMin, filters.bedsMax, filters.propertyType, filters.addedSince, filters.sortBy, filters.statusFilter, filters.purpose, page, filters.centerLat, filters.centerLng, filters.radiusMeters]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const refetch = useCallback(() => {
    fetchListings();
  }, [fetchListings]);

  return { listings, totalCount, loading, error, refetch };
}