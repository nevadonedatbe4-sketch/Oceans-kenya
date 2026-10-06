import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getSiteNameSync, loadSiteMeta, DEFAULT_SITE_NAME } from '@/lib/siteMeta';
import { haversineDistance } from '@/lib/distance';
import { formatLocation, formatLocationParts, formatAreaName, smartTitleCase } from '@/lib/location';
import { parsePropertySearch, parseSearchClauses, buildClausesOr, type PropertySearchIntent } from '@/lib/propertySearch';
import { buildCityOrClause } from '@/lib/locationRegistry';
import { applyPublicVisibility, applyStatusScope, statusScopeFromFilter } from '@/lib/publicListings';
import { listingHasFloorPlan } from '@/lib/listingMeta';

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
  status: string;
  amenities: string[] | null;
  features: Record<string, unknown> | null;
  floor_plans: string[] | null;
  documents?: Record<string, unknown>[] | null;
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
  availability_status?: string | null;
  urgency_message?: string | null;
  show_urgency_message?: boolean | null;
  total_units?: number | null;
  units_sold?: number | null;
  units_reserved?: number | null;
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
  /** Manual agent urgency message ('' when none). */
  urgencyMessage?: string;
  /** CRM display toggle for the automatic urgency message. */
  showUrgencyMessage?: boolean;
  /** Reliable remaining-unit count for this development unit (0 = unknown). */
  availableUnits?: number;
  // Distance info
  latitude?: number | null;
  longitude?: number | null;
  // Calculated
  distanceKm?: number | null;
  // JV / Land flags
  isLand: boolean;
  isJointVenture: boolean;
  videoUrl?: string;
  virtualTourUrl?: string;
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
  /**
   * Multiple, OR-combined property types (e.g. ['house', 'apartment']). When
   * provided this is the authoritative type constraint and is applied as a
   * strict AND on top of any free-text search - a selected type can never be
   * ignored or overridden by the parser.
   */
  propertyTypes?: string[];
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
  // Bathroom range (advanced filter).
  bathsMin?: number;
  bathsMax?: number;
  // Terms to EXCLUDE (from the keywords box, entered as -term). A listing is
  // dropped when any excluded term appears in its title or description.
  excludeTerms?: string[];
  // Amenities filter - additive constraint on the listings.amenities array
  // (e.g. ['Furnished'], ['Serviced'], ['Luxury']). Used by SEO landing pages.
  amenitiesFilter?: string[];
  // "Must-have" amenity GROUPS. Each inner array is OR-combined (a listing
  // matches when it has ANY of them) and every group must be satisfied (AND).
  // e.g. [['Parking','Underground Parking'], ['24/7 Security','CCTV Surveillance']]
  amenitiesGroups?: string[][];
  // Sub-type filter - matches the listings.sub_type discriminator
  // (e.g. 'duplex', 'modern'). Used by SEO landing pages for true matching.
  subTypeFilter?: string;
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

function deriveAgentInfo(name: string | null | undefined, fallbackName: string = DEFAULT_SITE_NAME) {
  if (!name) return { agent: fallbackName, agentShortName: agentInitials(fallbackName), agentBrandColor: '#1a1a2e' };
  const words = name.trim().split(/\s+/);
  const short = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : words[0].slice(0, 2).toUpperCase();
  const colorIndex = Math.abs(hashCode(name)) % AGENT_COLORS.length;
  return { agent: name, agentShortName: short, agentBrandColor: AGENT_COLORS[colorIndex] };
}

/** Two-letter initials for an agency name (e.g. "Oceans Kenya" -> "OK"). */
function agentInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'OK';
  return words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : words[0].slice(0, 2).toUpperCase();
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
function mapRow(row: ListingRow, now: Date, listingType: 'sale' | 'rent', agencyName: string = DEFAULT_SITE_NAME): MappedListing {
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
  // No generated fallback image: a listing without real photos keeps an empty
  // list so the UI can show an honest placeholder instead.

  const priceNum = row.price || 0;
  // A published listing without a numeric price is still real ("Price on
  // request"). Never render a misleading "KES 0".
  const formattedPrice = priceNum > 0
    ? formatPriceDisplay(priceNum, row.currency, row.price_prefix, row.price_postfix)
    : (row.price_prefix || 'Price on request');

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
  // No fabricated size: a listing without sqft genuinely has no size yet, so
  // cards omit the fact instead of inventing a placeholder value.
  const sqft = row.sqft ?? 0;

  // Reliable remaining-unit count for a development unit (total − sold − reserved).
  // Zero means "unknown", so no automatic scarcity is ever derived from it.
  const totalUnits = Number(row.total_units ?? 0);
  const unitsSold = Number(row.units_sold ?? 0);
  const unitsReserved = Number(row.units_reserved ?? 0);
  const availableUnits = totalUnits > 0 ? Math.max(0, totalUnits - unitsSold - unitsReserved) : 0;

  const agentInfo = deriveAgentInfo(null, agencyName);
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
    receptions: 0,
    sqft,
    sqm: Math.round(sqft * 0.0929),
    landSize: Number(row.land_size ?? 0),
    acreage: Number(row.acreage ?? 0),
    landUnit: row.land_unit || undefined,
    price: formattedPrice,
    rawPrice: priceNum,
    currency: row.currency || 'KES',
    priceUnit: undefined,
    image: allImages[0] || '',
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
    videoUrl: row.video_url || undefined,
    virtualTourUrl: row.virtual_tour_url || undefined,
    floorPlan: listingHasFloorPlan(row),
    justAdded,
    houseShare: false,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    isLand,
    isJointVenture,
    agentPhone,
    agentEmail,
    ...agentInfo,
    urgencyMessage: row.urgency_message ? String(row.urgency_message) : '',
    showUrgencyMessage: row.show_urgency_message !== false,
    availableUnits,
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

// ── Dropdown label → canonical DB property_type ───────────────
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
  'Semi-detached': 'detached',
  'Terraced': 'townhouse',
  'Land': 'land',
  'Office': 'office',
  'Retail / Shop': 'retail_shop',
  'Warehouse': 'warehouse',
  'Industrial': 'industrial',
  'Serviced Office': 'office',
};

// ── Merge parsed search-intent with explicit UI filters ────────
interface ResolvedFilters {
  propertyType: string | null;
  propertyCategory: string | null;
  bedsMin?: number;
  bedsMax?: number;
  priceMin?: number;
  priceMax?: number;
  location: string | null;
  city?: string;
  locationLevel?: 'area' | 'city';
  terms: string[];
  furnished?: boolean;
}

function resolveFilters(filters: ListingFilters, parsed: PropertySearchIntent | null): ResolvedFilters {
  // Property type: explicit dropdown wins; otherwise use the parsed intent.
  let propertyType: string | null = null;
  if (filters.propertyType && filters.propertyType !== 'Any type') {
    propertyType = PROP_TYPE_MAP[filters.propertyType] || filters.propertyType.toLowerCase().replace(/[\s/]+/g, '_');
  } else if (parsed?.propertyType) {
    propertyType = parsed.propertyType;
  }

  // Category: explicit UI category wins; otherwise derive from parsed type.
  // IMPORTANT: we never force 'residential' when the user has actually
  // searched - that silently excluded all land/commercial searches. The
  // residential default only applies to the tidy "browse everything" state.
  let propertyCategory: string | null = filters.propertyCategory || null;
  if (!propertyCategory && parsed?.propertyCategory) {
    propertyCategory = parsed.propertyCategory;
  }
  const hasCriteria = !!filters.search.trim() || !!propertyType || !!filters.propertyCategory;
  if (!propertyCategory && !hasCriteria) {
    propertyCategory = 'residential';
  }

  // Bedrooms - combine UI minimums and parsed minimums (use the stricter).
  let bedsMin = filters.bedsMin;
  if (parsed?.bedroomsMin && (!bedsMin || parsed.bedroomsMin > bedsMin)) {
    bedsMin = parsed.bedroomsMin;
  }
  let bedsMax = filters.bedsMax;
  if (parsed?.bedroomsMax && (!bedsMax || parsed.bedroomsMax < bedsMax)) {
    bedsMax = parsed.bedroomsMax;
  }

  // Price - combine UI range and parsed range (use the stricter of each bound).
  let priceMin = filters.priceMin;
  if (parsed?.priceMin && (!priceMin || parsed.priceMin > priceMin)) {
    priceMin = parsed.priceMin;
  }
  let priceMax = filters.priceMax;
  if (parsed?.priceMax && (!priceMax || parsed.priceMax < priceMax)) {
    priceMax = parsed.priceMax;
  }

  return {
    propertyType,
    propertyCategory,
    bedsMin,
    bedsMax,
    priceMin,
    priceMax,
    location: parsed?.location || null,
    city: parsed?.city,
    locationLevel: parsed?.locationLevel,
    terms: parsed?.terms || [],
    furnished: undefined,
  };
}

// ── Build the PostgREST `.or()` filter for location + leftover terms ────
function buildSearchOr(resolved: ResolvedFilters): string | null {
  const conds: string[] = [];

  // City-level (“Nairobi”) → all Nairobi areas, never a literal field.
  if (resolved.locationLevel === 'city' && resolved.city) {
    const cityClause = buildCityOrClause(resolved.city);
    if (cityClause) conds.push(cityClause);
  }

  // Specific area (“Karen”) → only that area, never broadened to the city.
  // We match the WHOLE location hierarchy (neighbourhood, estate/area,
  // address line, city) so "Lavington" resolves even when it lives in a
  // different column per listing, and never relies on one exact field.
  if (resolved.locationLevel === 'area' && resolved.location) {
    const loc = resolved.location;
    conds.push(
      `neighbourhood.ilike.%${loc}%`,
      `location.ilike.%${loc}%`,
      `address.ilike.%${loc}%`,
      `city.ilike.%${loc}%`,
    );
  }

  for (const term of resolved.terms) {
    conds.push(
      `title.ilike.%${term}%`,
      `location.ilike.%${term}%`,
      `neighbourhood.ilike.%${term}%`,
      `city.ilike.%${term}%`,
    );
  }
  return conds.length > 0 ? conds.join(',') : null;
}

// ── Apply the resolved constraints to a query builder ──────────
function applyResolved(query: any, resolved: ResolvedFilters) {
  // Search intent OR clause (location + leftover terms). Empty locations are
  // fine to include; only include when we actually have a condition.
  const orClause = buildSearchOr(resolved);
  if (orClause) query = query.or(orClause);

  if (resolved.propertyType) {
    query = query.eq('property_type', resolved.propertyType);
  }
  if (resolved.propertyCategory) {
    query = query.eq('property_category', resolved.propertyCategory);
  }
  if (resolved.bedsMin !== undefined && resolved.bedsMin > 0) {
    query = query.gte('bedrooms', resolved.bedsMin);
  }
  if (resolved.bedsMax !== undefined && resolved.bedsMax > 0) {
    query = query.lte('bedrooms', resolved.bedsMax);
  }
  if (resolved.priceMin !== undefined && resolved.priceMin > 0) {
    query = query.gte('price', resolved.priceMin);
  }
  if (resolved.priceMax !== undefined && resolved.priceMax > 0) {
    query = query.lte('price', resolved.priceMax);
  }
  return query;
}

// ── Hook ───────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 10;

const LISTING_SELECT = 'id,title,location,address,neighbourhood,city,state_region,price,property_type,bedrooms,bathrooms,sqft,land_size,acreage,land_unit,parking,slug,created_at,description,main_image,images,status,amenities,features,floor_plans,documents,property_label,price_prefix,price_postfix,currency,agent_id,video_url,virtual_tour_url,latitude,longitude,sub_type,is_featured,country,owner_phone,owner_email,property_of_the_week,new_home,refurbished,reduced_price,back_on_market,commission_applicable,availability_status,urgency_message,show_urgency_message,total_units,units_sold,units_reserved';

export function useListings(filters: ListingFilters, page: number): UseListingsReturn {
  const [listings, setListings] = useState<MappedListing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Agency name used as the fallback "agent" on cards; comes from site settings.
  const agencyNameRef = useRef<string>(getSiteNameSync());

  // Resolve the admin-managed agency name once, then refresh so fallback cards
  // pick it up instead of the built-in default.
  useEffect(() => {
    let active = true;
    loadSiteMeta().then(() => {
      if (!active) return;
      if (agencyNameRef.current !== getSiteNameSync()) {
        agencyNameRef.current = getSiteNameSync();
        refetch();
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchListings = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const isDistanceFilter = !!(filters.centerLat && filters.centerLng && filters.radiusMeters);

    // Compound clauses = a natural-language query that may contain MULTIPLE
    // independent transaction/type/location combinations (OR between clauses).
    const clauses = filters.search ? parseSearchClauses(filters.search) : [];
    const isCompound = clauses.length > 0;
    // Simple intent, used only for the non-compound path.
    const parsed = filters.search ? parsePropertySearch(filters.search) : null;
    const resolved = resolveFilters(filters, parsed);

    try {
      let query = supabase
        .from('all_listings')
        .select(LISTING_SELECT, { count: 'exact', head: false })
        .neq('title', '')
        .or('is_new_development.eq.false,is_new_development.is.null');

      // ── CANONICAL PUBLIC VISIBILITY ──────────────────────────────────
      // is_published = true AND a live (non-withdrawn) status. Applied from the
      // ONE shared definition so Buy / Rent / Land / Commercial / SEO pages all
      // agree. Deliberately NOT gated on price: a published listing with a
      // "Price on request" value is still a real, discoverable listing.
      query = applyPublicVisibility(query, statusScopeFromFilter(filters.statusFilter));

      // Amenities filter - additive constraint (SEO landing pages only). Uses
      // array containment so a listing matches if its amenities include any of
      // the requested values (e.g. 'Furnished', 'Serviced', 'Luxury').
      if (filters.amenitiesFilter && filters.amenitiesFilter.length > 0) {
        query = query.contains('amenities', filters.amenitiesFilter);
      }

      // Must-have amenity groups - AND across groups, OR within a group. Built
      // as ONE nested PostgREST expression `and(or(...),...)` (repeated or=
      // params are not reliably supported), so "must have Parking AND any one
      // of the security amenities" behaves exactly as a must-have list implies.
      if (filters.amenitiesGroups && filters.amenitiesGroups.length > 0) {
        const groups = filters.amenitiesGroups
          .map((g) => (g || []).filter(Boolean))
          .filter((g) => g.length > 0);
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

      // Sub-type filter - strict discriminator (SEO landing pages only), e.g.
      // 'duplex' or 'modern'. Matches the listings.sub_type column exactly.
      if (filters.subTypeFilter) {
        query = query.eq('sub_type', filters.subTypeFilter);
      }

      // Purpose is global only when there is no compound query that sets its own
      // per-clause transaction. A compound query can mix sale AND rent, so when
      // any clause explicitly declares a transaction we encode it per-clause;
      // otherwise (e.g. an area-only "Karen" search) the page's sale/rent context
      // must still apply, so we keep the global purpose filter.
      const hasExplicitTxn = clauses.some((c) => c.transaction);
      if (!isCompound || !hasExplicitTxn) {
        query = query.eq('purpose', filters.purpose);
      }

      // Status filter is already applied by applyPublicVisibility above - the
      // per-page `statusFilter` only selects which CANONICAL scope to use, so
      // it can never widen or narrow the definition on its own.

      // Apply search criteria:
      //   • compound query → one PostgREST or() grouping every clause (AND
      //     within a clause, OR between clauses). Never broadens the query.
      //   • simple query → the single-intent resolved path.
      if (isCompound) {
        const orClause = buildClausesOr(clauses);
        if (orClause) query = query.or(orClause);
      } else {
        query = applyResolved(query, resolved);
      }

      // ── EXPLICIT PROPERTY TYPE IS AUTHORITATIVE ─────────────────────────
      // A type chosen in the UI must never be ignored or overridden by the
      // free-text parser. E.g. a compound query "house in Karen" combined with
      // a dropdown selection of "Land" must return LAND, not houses. The
      // selection is therefore applied as a strict AND on top of every other
      // constraint (multiple values are OR-combined, single value is exact).
      const explicitTypes = (filters.propertyTypes && filters.propertyTypes.length > 0)
        ? filters.propertyTypes.filter(Boolean)
        : [];
      if (explicitTypes.length === 1) {
        query = query.eq('property_type', explicitTypes[0]);
      } else if (explicitTypes.length > 1) {
        query = query.in('property_type', explicitTypes);
      }

      // Price range (advanced/explicit)
      if (filters.priceMin !== undefined && filters.priceMin > 0) query = query.gte('price', filters.priceMin);
      if (filters.priceMax !== undefined && filters.priceMax > 0) query = query.lte('price', filters.priceMax);

      // Beds (explicit dropdown - already merged via resolved, but keep for safety)
      if (filters.bedsMin !== undefined && filters.bedsMin > 0) query = query.gte('bedrooms', filters.bedsMin);
      if (filters.bedsMax !== undefined && filters.bedsMax > 0) query = query.lte('bedrooms', filters.bedsMax);

      // Property category (explicit only) - never defaulted to residential
      if (filters.propertyCategory) query = query.eq('property_category', filters.propertyCategory);

      // Size (sqft in DB, convert from sqm)
      if (filters.sqmMin !== undefined && filters.sqmMin > 0) query = query.gte('sqft', filters.sqmMin * 10.764);
      if (filters.sqmMax !== undefined && filters.sqmMax > 0) query = query.lte('sqft', filters.sqmMax * 10.764);

      // Bathrooms (advanced range)
      if (filters.bathsMin !== undefined && filters.bathsMin > 0) query = query.gte('bathrooms', filters.bathsMin);
      if (filters.bathsMax !== undefined && filters.bathsMax > 0) query = query.lte('bathrooms', filters.bathsMax);

      // Excluded keywords (-term): drop a listing when the term is in its title
      // or description. Each term adds two AND-ed NOTs, so a row survives only
      // when it matches neither field.
      if (filters.excludeTerms && filters.excludeTerms.length > 0) {
        for (const term of filters.excludeTerms) {
          const t = term.replace(/[%,()]/g, '').trim();
          if (!t) continue;
          query = query.not('title', 'ilike', `%${t}%`).not('description', 'ilike', `%${t}%`);
        }
      }

      // Added since
      if (filters.addedSince && filters.addedSince !== 'Anytime') {
        const now = new Date();
        let since: Date;
        switch (filters.addedSince) {
          case 'Last 24 hours': since = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
          case 'Last 3 days': since = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); break;
          case 'Last 7 days': since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
          case 'Last 14 days': since = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); break;
          default: since = new Date(0);
        }
        query = query.gte('created_at', since.toISOString());
      }

      // Sort - distance filtering overrides sort. A–Z is the default so a large
      // dataset always starts at "A" instead of an arbitrary insertion order.
      if (!isDistanceFilter) {
        switch (filters.sortBy) {
          case 'Highest price': query = query.order('price', { ascending: false }); break;
          case 'Lowest price': query = query.order('price', { ascending: true }); break;
          case 'Most recent':
          case 'Most reduced':
          case 'Most popular': query = query.order('created_at', { ascending: false }); break;
          case 'Z - A': query = query.order('title', { ascending: false }); break;
          case 'A - Z':
          default: query = query.order('title', { ascending: true }); break;
        }
      }

      // Pagination - skip when distance filtering (fetch all, paginate client-side)
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      if (!isDistanceFilter) {
        query = query.range(from, to);
      }

      const { data, error: queryError, count } = await query;
      if (queryError) throw queryError;

      const now = new Date();
      let mapped = ((data || []) as ListingRow[]).map((row) => mapRow(row, now, filters.purpose, agencyNameRef.current));

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load listings';
      setError(message);
      setListings([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.priceMin, filters.priceMax, filters.bedsMin, filters.bedsMax, filters.propertyType, filters.propertyTypes, filters.addedSince, filters.sortBy, filters.statusFilter, filters.purpose, filters.propertyCategory, filters.sqmMin, filters.sqmMax, filters.bathsMin, filters.bathsMax, filters.excludeTerms, page, filters.centerLat, filters.centerLng, filters.radiusMeters, filters.amenitiesFilter, filters.amenitiesGroups, filters.subTypeFilter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const refetch = useCallback(() => {
    fetchListings();
  }, [fetchListings]);

  return { listings, totalCount, loading, error, refetch };
}