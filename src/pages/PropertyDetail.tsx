import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { type LocationSuggestion } from '@/components/feature/LocationSearch';
import PropertySearchBar from '@/components/feature/PropertySearchBar';
import ShareButton from '@/components/feature/ShareButton';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import { recordRecentlyViewedDevelopment } from '@/hooks/useRecentlyViewedDevelopments';
import PropertyBreadcrumbBar from '@/components/feature/PropertyBreadcrumbBar';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { NON_PUBLIC_STATUS_LIST } from '@/lib/publicListings';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useSeoMeta, buildBreadcrumbSchema } from '@/hooks/useSeoMeta';
import { useCurrency } from '@/hooks/useCurrency';
import { formatLocation, smartTitleCase } from '@/lib/location';
import { buildPropertySpecs, type DetailSpecRow } from '@/lib/propertyDetailSpecs';
import PropertyGallery from '@/pages/PropertyDetail/components/Gallery';
import PropertyLeftColumn from '@/pages/PropertyDetail/components/LeftColumn';
import PropertyMetaBadges from '@/components/feature/PropertyMetaBadges';
import PropertyContactCard from '@/pages/PropertyDetail/components/ContactCard';
import SimilarProperties from '@/pages/PropertyDetail/components/SimilarProperties';
import PropertyPrevNext from '@/pages/PropertyDetail/components/PrevNext';
import MobileStickyBar from '@/pages/PropertyDetail/components/MobileStickyBar';
import AdvancedFilters, { defaultFilters, FilterState } from '@/pages/Rent/components/AdvancedFilters';
import PageLoader from '@/components/feature/PageLoader';
import { type DocItem } from '@/pages/PropertyDetail/components/PropertyDocuments';
import PropertyDetailSections from '@/pages/PropertyDetail/components/DetailSections';
import LandDescription from '@/pages/PropertyDetail/components/LandDescription';
import VideoTour from '@/pages/PropertyDetail/components/VideoTour';
import JvDealRoom from '@/pages/PropertyDetail/components/JvDealRoom';
import { buildLandModel } from '@/lib/propertyDetail/land';
import { buildJvModel } from '@/lib/propertyDetail/jv';
import { usePropertyDetailContent } from '@/hooks/useDynamicPageTemplates';

interface ListingImage {
  id: string;
  url: string;
  sort_order: number;
}

interface AgentInfo {
  name: string;
  role: string;
  phone: string;
  email: string;
  avatar?: string;
}

interface ListingDetail {
  id: string;
  slug: string;
  title: string;
  propertyType: string;
  location: string;
  district: string;
  area: string;
  county: string;
  price: string;
  priceRaw: number;
  currency: string;
  description: string;
  image: string;
  images: ListingImage[];
  beds: number | null;
  baths: number | null;
  parking: number | null;
  sqft: number | null;
  garages: number | null;
  floorNumber: string;
  status: string;
  category: string;
  size: string;
  titleType: string;
  ref: string;
  purpose: string;
  neighbourhood: string;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  features: string[];
  agentId: string | null;
  city: string;
  country: string;
  furnished: string;
  landType: string;
  commissionApplicable: boolean;
  commissionDetails: string;
  createdAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoImage?: string;
  // Badge flags (driven by Badge Visibility settings)
  featured: boolean;
  justListed: boolean;
  newHome: boolean;
  reduced: boolean;
  refurbished: boolean;
  backOnMarket: boolean;
  propertyOfTheWeek: boolean;
  isJointVenture: boolean;
  // New development fields
  totalUnits: number | null;
  unitsSold: number | null;
  unitsReserved: number | null;
  unitsRented: number | null;
  unitsOccupied: number | null;
  currentPrice: number | null;
  previousPrice: number | null;
  marketingType: string;
  showUnitsRemaining: boolean;
  showPercentSold: boolean;
  showPercentRented: boolean;
  showDeveloperName: boolean;
  showUrgencyMessage: boolean;
  developerName: string;
  developerPhone: string;
  developerEmail: string;
  // Video / virtual tour links captured in the CRM
  videoUrl: string;
  virtualTourUrl: string;
  // Every other populated CRM field (condition, rooms, year built, etc.)
  specs: DetailSpecRow[];
  // Attachments captured in the CRM (floor plans, brochures, plans, …)
  documents: DocItem[];
}

function mockToListing(mock: any): ListingDetail {
  return mock as ListingDetail;
}

function deriveCounty(city: string, stateRegion: string): string {
  const c = (city || '').trim();
  const known: Record<string, string> = {
    nairobi: 'Nairobi County',
    nakuru: 'Nakuru County',
    mombasa: 'Mombasa County',
    kisumu: 'Kisumu County',
    eldoret: 'Uasin Gishu County',
  };
  const key = c.toLowerCase();
  if (known[key]) return known[key];
  if (c) return `${c} County`;
  return (stateRegion || '').trim();
}

const SITE_URL = 'https://www.oceanske.com';

/** Strip HTML tags/entities from a description so it is safe for meta tags. */
function stripHtml(html: string): string {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * SoldRentedNotice - shown on a sold/let listing so the page stays useful
 * (and indexable-free) instead of dead-ending. Points visitors to the live
 * search for similar available stock.
 */
function SoldRentedNotice({ href, isSold, soldTitle, letTitle, text, buttonLabel }: { href: string; isSold: boolean; soldTitle: string; letTitle: string; text: string; buttonLabel: string }) {
  return (
    <div className="px-4 md:px-6 max-w-7xl mx-auto mt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border border-[#d3bb6e] bg-[#fdf8ec] px-5 py-4">
        <span className="w-9 h-9 flex items-center justify-center rounded-full bg-[#d3bb6e]/20 text-[#8a6d1f] shrink-0">
          <i className="ri-information-line text-lg" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0d1f2d]">
            {isSold ? soldTitle : letTitle}
          </p>
          <p className="text-[13px] text-[#5a6a7a] mt-0.5 leading-relaxed">
            {text}
          </p>
        </div>
        <Link
          to={href}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-[#0d1f2d] text-white text-[13px] font-semibold hover:bg-[#1a2f45] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          {buttonLabel}
          <i className="ri-arrow-right-line text-sm" />
        </Link>
      </div>
    </div>
  );
}

function DetailSearchBar({
  searchQuery,
  onLocationChange,
  radiusValue,
  onRadiusChange,
  radiusOptions,
  bedsValue,
  onBedsChange,
  bedOptions,
  priceValue,
  onPriceChange,
  priceOptions,
  typeValue,
  onTypeChange,
  typeOptions,
  onFilters,
  filtersActive,
  saved,
  onToggleSave,
  onSearch,
  onMapView,
  mapActive,
  onCreateAlert,
  advancedOpen,
  advancedFilters,
  onApplyAdvanced,
  onCloseAdvanced,
}: {
  searchQuery: string;
  onLocationChange: (value: string, suggestion?: LocationSuggestion) => void;
  radiusValue: string;
  onRadiusChange: (v: string) => void;
  radiusOptions: string[];
  bedsValue: string;
  onBedsChange: (v: string) => void;
  bedOptions: string[];
  priceValue: string;
  onPriceChange: (v: string) => void;
  priceOptions: string[];
  typeValue: string;
  onTypeChange: (v: string) => void;
  typeOptions: string[];
  onFilters: () => void;
  filtersActive: boolean;
  saved: boolean;
  onToggleSave: () => void;
  onSearch: () => void;
  onMapView: () => void;
  mapActive?: boolean;
  onCreateAlert: () => void;
  advancedOpen: boolean;
  advancedFilters: FilterState;
  onApplyAdvanced: (f: FilterState) => void;
  onCloseAdvanced: () => void;
}) {
  return (
    <div className="z-40 bg-white border-b border-primary/12 shadow-sm mt-6">
      <div className="px-4 md:px-6 lg:px-10 pt-4 pb-3">
        <PropertySearchBar
          className="max-w-[1400px] mx-auto"
          searchQuery={searchQuery}
          onLocationChange={onLocationChange}
          placeholderCycle={[
            "Looking for your next property...",
            "Looking for your dream home...",
            "Looking for an investment opportunity...",
            "Looking for a luxury residence...",
          ]}
          radiusValue={radiusValue}
          onRadiusChange={onRadiusChange}
          radiusOptions={radiusOptions}
          bedsValue={bedsValue}
          onBedsChange={onBedsChange}
          bedOptions={bedOptions}
          priceValue={priceValue}
          onPriceChange={onPriceChange}
          priceOptions={priceOptions}
          typeValue={typeValue}
          onTypeChange={onTypeChange}
          typeOptions={typeOptions}
          onFilters={onFilters}
          filtersActive={filtersActive}
          saved={saved}
          onToggleSave={onToggleSave}
          onSearch={onSearch}
          onMapView={onMapView}
          mapActive={mapActive}
          onCreateAlert={onCreateAlert}
        />
      </div>
      <AdvancedFilters
        isOpen={advancedOpen}
        onClose={onCloseAdvanced}
        onApply={onApplyAdvanced}
        initialFilters={advancedFilters}
      />
    </div>
  );
}

export default function PropertyDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [landRecord, setLandRecord] = useState<Record<string, unknown> | null>(null);
  const [jvRecord, setJvRecord] = useState<Record<string, unknown> | null>(null);
  const { format } = useCurrency();
  const { enableBreadcrumbs } = useSiteSettings();
  const { content: pd } = usePropertyDetailContent();

  // ── Search bar state (above breadcrumb on all property detail pages) ──
  const navigate = useNavigate();
  const [detailSearchQuery, setDetailSearchQuery] = useState('');
  const [detailLocation, setDetailLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [detailRadius, setDetailRadius] = useState('This area only');
  const [detailBeds, setDetailBeds] = useState('Any beds');
  const [detailPrice, setDetailPrice] = useState('Any price');
  const [detailType, setDetailType] = useState('Any type');
  const [detailSavedSearch, setDetailSavedSearch] = useState(false);
  const [showDetailAdvancedFilters, setShowDetailAdvancedFilters] = useState(false);
  const [detailAdvancedFilters, setDetailAdvancedFilters] = useState<FilterState>({ ...defaultFilters });

  const radiusOptions = ['This area only', '\u00bd mile', '1 mile', '3 miles', '5 miles', '10 miles', '15 miles', '20 miles', '30 miles', '40 miles'];
  const detailBedOptions = ['Any beds', 'Studio', '1+', '2+', '3+', '4+', '5+'];
  const detailPriceOptions = ['Any price', 'Under KES 10M', 'KES 10M - 30M', 'KES 30M - 50M', 'KES 50M - 100M', 'KES 100M - 200M', 'Over KES 200M'];
  const detailTypeOptions = ['Any type', 'Apartment', 'House', 'Townhouse', 'Penthouse', 'Villa', 'Studio', 'Land'];

  // Hands the visitor straight to the matching results page (rent or buy,
  // following this listing's purpose) whenever they touch the search bar.
  const runDetailSearch = (overrides: {
    query?: string;
    location?: { lat: number; lng: number } | null;
    radius?: string;
    beds?: string;
    price?: string;
    type?: string;
  } = {}) => {
    const targetPage = listing && listing.purpose === 'rent' ? '/rent' : '/buy';
    const query = overrides.query ?? detailSearchQuery;
    const loc = overrides.location !== undefined ? overrides.location : detailLocation;
    const radius = overrides.radius ?? detailRadius;
    const beds = overrides.beds ?? detailBeds;
    const price = overrides.price ?? detailPrice;
    const type = overrides.type ?? detailType;
    const params = new URLSearchParams();
    if (query.trim()) params.set('location', query.trim());
    if (loc) {
      params.set('lat', String(loc.lat));
      params.set('lng', String(loc.lng));
    }
    if (radius !== 'This area only') params.set('radius', radius);
    if (beds !== 'Any beds') params.set('beds', beds);
    if (price !== 'Any price') params.set('price', price);
    if (type !== 'Any type') params.set('type', type);
    const qs = params.toString();
    navigate(qs ? `${targetPage}?${qs}` : targetPage);
  };

  const handleDetailLocationChange = (value: string, suggestion?: LocationSuggestion) => {
    setDetailSearchQuery(value);
    const hasCoords = !!suggestion
      && typeof suggestion.lat === 'number'
      && typeof suggestion.lng === 'number'
      && (suggestion.lat !== 0 || suggestion.lng !== 0);
    const nextLocation = hasCoords && suggestion ? { lat: suggestion.lat, lng: suggestion.lng } : null;
    setDetailLocation(nextLocation);
    // Clearing the field should not yank the visitor away from the listing.
    if (!value.trim()) return;
    runDetailSearch({ query: value, location: nextLocation });
  };

  const handleDetailRadiusChange = (v: string) => {
    setDetailRadius(v);
    runDetailSearch({ radius: v });
  };

  const handleDetailBedsChange = (v: string) => {
    setDetailBeds(v);
    runDetailSearch({ beds: v });
  };

  const handleDetailPriceChange = (v: string) => {
    setDetailPrice(v);
    runDetailSearch({ price: v });
  };

  const handleDetailTypeChange = (v: string) => {
    setDetailType(v);
    runDetailSearch({ type: v });
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchListing() {
      setLoading(true);
      setError('');
      setAgents([]);
      try {
        const { data, error: dbError } = await supabase
          .from('all_listings')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (dbError) throw dbError;
        if (cancelled) return;

        if (!data) {
          // The listing may have been removed, renamed or unpublished. Rather
          // than dead-ending on a 404, redirect to the most recent similar
          // (available) listing so the visitor always lands on live stock.
          try {
            const { data: fallback } = await supabase
              .from('all_listings')
              .select('slug')
              .eq('is_published', true)
              .not('status', 'in', NON_PUBLIC_STATUS_LIST)
              .neq('title', '')
              .order('created_at', { ascending: false })
              .limit(1);
            const fbSlug = fallback && fallback[0]?.slug ? String(fallback[0].slug) : '';
            if (!cancelled && fbSlug && fbSlug !== slug) {
              navigate(`/property/${fbSlug}`, { replace: true });
              return;
            }
          } catch {
            // fall through to the not-found state
          }
          setListing(null);
          setLoading(false);
          return;
        }

        const row = data as Record<string, unknown>;
        const currencyLabel = String(row.currency || '').toUpperCase() === 'USD' ? 'USD'
          : 'KES';
        const priceVal = row.price ? Number(row.price) : 0;
        let priceDisplay = 'Price on request';
        if (priceVal > 0) {
          priceDisplay = `${currencyLabel} ${priceVal.toLocaleString()}`;
        }

        const rawPropertyType = String(row.property_type || '');
        const rawPropCategory = String(row.property_category || '');
        const landTypeValues = ['land','mixed_use_land','development_land','residential_land','commercial_land','industrial_land','agricultural_land','farmland','farms_/_land','farms_land','investment_land','recreational_land'];
        const isLand = landTypeValues.includes(rawPropertyType) || rawPropCategory === 'land';

        // Seed the gallery immediately from the listing row itself so the page
        // renders right away; enrich with listing_images + agent in the background.
        let galleryImages: ListingImage[] = [];
        if (row.images && Array.isArray(row.images)) {
          galleryImages = (row.images as string[]).map((url: string, idx: number) => ({
            id: `seed-${idx}`,
            url,
            sort_order: idx,
          }));
        }
        if (galleryImages.length === 0 && (row.main_image || row.cover_image)) {
          galleryImages = [{
            id: 'seed-main',
            url: String(row.main_image || row.cover_image),
            sort_order: 0,
          }];
        }

        const imagesPromise = (async () => {
          try {
            const { data: imgData, error: imgError } = await supabase
              .from('listing_images')
              .select('id,url,sort_order')
              .eq('listing_id', row.id)
              .order('sort_order', { ascending: true })
              .limit(20);
            if (!imgError && imgData && imgData.length > 0) {
              return imgData as ListingImage[];
            }
          } catch {
            // non-critical
          }
          return [] as ListingImage[];
        })();

        const agentPromise = (async () => {
          const ids: string[] = Array.isArray(row.agent_ids) && (row.agent_ids as unknown[]).length > 0
            ? (row.agent_ids as unknown[]).map(String)
            : (row.agent_id ? [String(row.agent_id)] : []);
          if (ids.length === 0) return [] as AgentInfo[];
          try {
            const { data: agentData } = await supabase
              .from('agents')
              .select('name,title,phone,email,avatar_url')
              .in('id', ids);
            if (agentData && agentData.length > 0) {
              const byId = new Map<string, Record<string, unknown>>();
              (agentData as Record<string, unknown>[]).forEach((a) => byId.set(String(a.id), a));
              return ids
                .map((id) => byId.get(id))
                .filter((a): a is Record<string, unknown> => Boolean(a))
                .map((a) => ({
                  name: String(a.name || 'Agent'),
                  role: String(a.title || 'Estate Agent'),
                  phone: String(a.phone || ''),
                  email: String(a.email || ''),
                  avatar: a.avatar_url ? String(a.avatar_url) : undefined,
                } as AgentInfo));
            }
          } catch {
            // non-critical
          }
          return [] as AgentInfo[];
        })();

        // Non-blocking enrichment: swap in the real gallery + agent once ready,
        // without holding the page's first paint hostage.
        void (async () => {
          const [gallery, agentsEnriched] = await Promise.all([imagesPromise, agentPromise]);
          if (cancelled) return;
          setAgents(agentsEnriched);
          if (gallery.length > 0) {
            setListing((prev) => (prev && prev.id === String(row.id) ? { ...prev, images: gallery } : prev));
          }
        })();

        // Parse amenities
        let amenitiesList: string[] = [];
        if (row.amenities) {
          if (Array.isArray(row.amenities)) {
            amenitiesList = row.amenities.map(String);
          }
        }

        // Parse features
        let featuresList: string[] = [];
        if (row.features) {
          if (Array.isArray(row.features)) {
            featuresList = row.features.map((f: unknown) => {
              if (typeof f === 'string') return f;
              if (typeof f === 'object' && f !== null) {
                const obj = f as Record<string, unknown>;
                return String(obj.label || obj.name || obj.key || '');
              }
              return String(f);
            }).filter(Boolean);
          } else if (typeof row.features === 'object' && row.features !== null) {
            const featObj = row.features as Record<string, unknown>;
            featuresList = Object.entries(featObj)
              .filter(([, v]) => v)
              .map(([k]) => k);
          }
        }

        // Parse furnished status - prefer the dedicated CRM field, then legacy
        // custom-field values, then fall back to amenities.
        const furnished = String(
          row.furnished_status
          || (row.custom_fields as Record<string, unknown> | null)?.furnished
          || (row.custom_fields as Record<string, unknown> | null)?.furnishing_status
          || (amenitiesList.find(a => a.toLowerCase().includes('furnished')) ? 'Furnished' : 'Unfurnished')
        );

        const listingDetail: ListingDetail = {
          id: String(row.id),
          slug: String(row.slug || ''),
          title: smartTitleCase(String(row.title || '')),
          propertyType: String(row.property_type || ''),
          location: formatLocation({
            address: row.address as string | null,
            neighbourhood: row.neighbourhood as string | null,
            location: String(row.location || ''),
            city: row.city as string | null,
            state_region: row.state_region as string | null,
          }),
          district: String(row.state_region || row.neighbourhood || row.location || ''),
          area: String(row.neighbourhood || row.location || ''),
          county: deriveCounty(String(row.city || ''), String(row.state_region || '')),
          price: priceDisplay,
          priceRaw: priceVal,
          currency: String(row.currency || 'KES'),
          description: String(row.description || ''),
          image: String(row.main_image || row.cover_image || ''),
          images: galleryImages,
          beds: row.bedrooms ? Number(row.bedrooms) : null,
          baths: row.bathrooms ? Number(row.bathrooms) : null,
          parking: row.parking ? Number(row.parking) : null,
          sqft: row.sqft ? Number(row.sqft) : null,
          garages: row.garages ? Number(row.garages) : null,
          floorNumber: String(row.floor_number || ''),
          status: String(row.status || 'available'),
          category: isLand
            ? (row.sub_type === 'joint_venture' ? 'joint_venture' : 'outright')
            : (row.featured_new_development || row.is_new_development || row.purpose === 'new_development' || row.property_category === 'new_development')
              ? 'new_development'
              : String(row.purpose || 'sale'),
          size: isLand
            ? (row.land_size ? `${row.land_size} ${row.land_unit || 'acres'}` : (row.size ? `${row.size} ${row.size_unit || 'sqm'}` : ''))
            : (row.sqft ? `${Number(row.sqft).toLocaleString()} sqft` : ''),
          titleType: (row.custom_fields as Record<string, unknown> | null)?.title_type as string || 'Freehold',
          ref: String(row.property_id || `LIST-${String(row.id).slice(0, 6)}`),
          landType: String(row.land_type || (row.custom_fields as Record<string, unknown> | null)?.land_type || row.sub_type || ''),
          purpose: String(row.purpose || 'sale'),
          neighbourhood: String(row.neighbourhood || ''),
          latitude: row.latitude ? Number(row.latitude) : null,
          longitude: row.longitude ? Number(row.longitude) : null,
          amenities: amenitiesList,
          features: featuresList,
          agentId: row.agent_id ? String(row.agent_id) : null,
          city: String(row.city || ''),
          country: String(row.country || ''),
          furnished: furnished,
          commissionApplicable: Boolean(row.commission_applicable),
          commissionDetails: String(row.commission_details || ''),
          createdAt: row.created_at ? String(row.created_at) : undefined,
          seoTitle: row.seo_title ? String(row.seo_title) : '',
          seoDescription: row.seo_description ? String(row.seo_description) : '',
          seoImage: row.seo_image ? String(row.seo_image) : '',
          // Badge flags
          featured: Boolean(row.is_featured),
          justListed: row.created_at ? ((Date.now() - new Date(String(row.created_at)).getTime()) / 86400000 <= 3) : false,
          newHome: Boolean(row.new_home),
          reduced: Boolean(row.reduced_price),
          refurbished: Boolean(row.refurbished),
          backOnMarket: Boolean(row.back_on_market),
          propertyOfTheWeek: Boolean(row.property_of_the_week),
          isJointVenture: String(row.sub_type || '').toLowerCase() === 'joint_venture',
          // New development fields
          totalUnits: row.total_units ? Number(row.total_units) : null,
          unitsSold: row.units_sold ? Number(row.units_sold) : null,
          unitsReserved: row.units_reserved ? Number(row.units_reserved) : null,
          unitsRented: row.units_rented ? Number(row.units_rented) : null,
          unitsOccupied: row.units_occupied ? Number(row.units_occupied) : null,
          currentPrice: row.current_price ? Number(row.current_price) : null,
          previousPrice: row.previous_price ? Number(row.previous_price) : null,
          marketingType: String(row.marketing_type || 'for_sale'),
          showUnitsRemaining: Boolean(row.show_units_remaining !== false),
          showPercentSold: Boolean(row.show_percent_sold !== false),
          showPercentRented: Boolean(row.show_percent_rented),
          showDeveloperName: Boolean(row.show_developer_name !== false),
          showUrgencyMessage: Boolean(row.show_urgency_message !== false),
          developerName: String(row.developer_name || row.owner_name || ''),
          developerPhone: String(row.developer_phone || ''),
          developerEmail: String(row.developer_email || ''),
          videoUrl: String(row.video_url || ''),
          virtualTourUrl: String(row.virtual_tour_url || ''),
          specs: buildPropertySpecs(row, { currency: currencyLabel, isLand }),
          documents: Array.isArray(row.documents)
            ? (row.documents as Record<string, unknown>[])
                .filter((d) => d && typeof d === 'object')
                .map((d) => ({
                  url: d.url ? String(d.url) : '',
                  name: d.name ? String(d.name) : '',
                  type: d.type ? String(d.type) : '',
                  size: d.size != null ? Number(d.size) : undefined,
                  category: d.category ? String(d.category) : '',
                }))
            : [],
        };

        // Track recently viewed for DB listing
        try {
          const key = 'recently_viewed_devs';
          const existing = JSON.parse(localStorage.getItem(key) || '[]') as Array<{
            id: string; slug: string; name: string; image: string; location: string;
            priceRaw: number; currency: string; timestamp: number;
          }>;
          const entry = {
            id: listingDetail.id,
            slug: listingDetail.slug,
            name: listingDetail.title,
            image: listingDetail.image,
            location: listingDetail.location,
            priceRaw: listingDetail.priceRaw,
            currency: listingDetail.currency,
            timestamp: Date.now(),
          };
          const filtered = existing.filter((item) => item.id !== entry.id);
          localStorage.setItem(key, JSON.stringify([entry, ...filtered].slice(0, 10)));
          // Also log to generic recently_viewed_properties
          try {
            const genericKey = 'recently_viewed_properties';
            const existingGeneric = JSON.parse(localStorage.getItem(genericKey) || '[]') as string[];
            localStorage.setItem(genericKey, JSON.stringify([listingDetail.id, ...existingGeneric.filter((i) => i !== listingDetail.id)].slice(0, 10)));
          } catch { /* ignore */ }
        } catch {
          // ignore
        }

        setListing(listingDetail);
      } catch (err: unknown) {
        if (!cancelled) {
          setListing(null);
          setError('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (slug) fetchListing();
    return () => { cancelled = true; };
  }, [slug, navigate]);

  // ── Land detail source: the public page must present the ACTUAL Land CRM
  //    record (zoning, tenure, utilities, payment terms, …), not the flattened
  //    all_listings view which does not carry those fields. ──
  useEffect(() => {
    if (!listing) {
      setLandRecord(null);
      setJvRecord(null);
      return;
    }
    const isLandType = listing.propertyType === 'land';
    let cancelled = false;
    (async () => {
      // Land record (by slug).
      if (isLandType) {
        try {
          const { data } = await supabase
            .from('land_listings')
            .select('*')
            .eq('slug', listing.slug)
            .maybeSingle();
          if (!cancelled) setLandRecord((data as Record<string, unknown>) || null);
        } catch {
          if (!cancelled) setLandRecord(null);
        }
      } else if (!cancelled) {
        setLandRecord(null);
      }

      // JV opportunity - a published JV is keyed either to the linked land
      // listing (its id is what jv_opportunities.land_listing_id references) or
      // to the same slug. When found, the page gets a JV-aware detail model
      // (commercial structure, contributions, project info) instead of land.
      if ((isLandType || listing.isJointVenture) && (listing.id || listing.slug)) {
        try {
          const orClause = [`land_listing_id.eq.${listing.id}`, `slug.eq.${listing.slug}`]
            .filter((c) => !c.endsWith('.eq.'))
            .join(',');
          if (orClause) {
            const { data } = await supabase
              .from('jv_opportunities')
              .select('*')
              .eq('is_published', true)
              .or(orClause)
              .maybeSingle();
            if (!cancelled) setJvRecord((data as Record<string, unknown>) || null);
          } else if (!cancelled) {
            setJvRecord(null);
          }
        } catch {
          if (!cancelled) setJvRecord(null);
        }
      } else if (!cancelled) {
        setJvRecord(null);
      }
    })();
    return () => { cancelled = true; };
  }, [listing?.slug, listing?.propertyType, listing?.id, listing?.isJointVenture]);

  // ── Dynamic SEO: title, meta description, canonical, OG image + structured data ──
  // Remember this unit's development so the recently-viewed rail on unit pages
  // brings the visitor back into the project.
  useEffect(() => {
    if (!listing || listing.category !== 'new_development' || !listing.slug) return;
    recordRecentlyViewedDevelopment({
      slug: listing.slug,
      name: listing.title,
      image: listing.image,
      location: listing.area || listing.city || '',
      priceRaw: listing.priceRaw,
      currency: listing.currency,
    });
  }, [listing?.slug, listing?.category, listing?.title, listing?.image, listing?.area, listing?.city, listing?.priceRaw, listing?.currency]);

  // ── Dynamic SEO: title, meta description, canonical, OG image + structured data ──
  const seoTitle = listing
    ? (listing.seoTitle && listing.seoTitle.trim())
      ? listing.seoTitle.trim()
      : `${listing.title} | Oceans Kenya`
    : 'Property Not Found | Oceans Kenya';

  const seoDescription = listing
    ? (listing.seoDescription && listing.seoDescription.trim())
      ? listing.seoDescription.trim()
      : listing.description
        ? stripHtml(listing.description).slice(0, 158)
        : `View this ${listing.propertyType || 'property'} in ${listing.area || listing.city || 'Nairobi'} with Oceans Kenya, premium estate agents in Nairobi.`
    : 'The property you are looking for could not be found. Browse premium property for sale and rent in Nairobi with Oceans Kenya.';

  const seoImage = listing?.seoImage || listing?.image || undefined;

  // Sold / let listings must not be indexed (thin, stale content) and should
  // point visitors to live stock instead of sitting as an orphan page.
  const isSoldOrRented = !!listing && [listing.status, listing.purpose]
    .some((v) => ['sold', 'rented'].includes(String(v || '').toLowerCase()));

  const seoSchemas = useMemo(() => {
    if (!listing) return [];
    const url = `${SITE_URL}/property/${listing.slug}`;
    const trail = [
      { name: 'Home', path: '/' },
      { name: listing.purpose === 'rent' ? 'Rent' : 'Buy', path: listing.purpose === 'rent' ? '/rent' : '/buy' },
      { name: listing.title, path: `/property/${listing.slug}` },
    ];
    const listingSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: listing.title,
      description: stripHtml(listing.description).slice(0, 500) || undefined,
      url,
      image:
        listing.images && listing.images.length > 0
          ? listing.images.map((img) => img.url)
          : listing.image
            ? [listing.image]
            : undefined,
      numberOfRooms: listing.beds ?? undefined,
      numberOfBathroomsTotal: listing.baths ?? undefined,
      floorSize: listing.sqft ? { '@type': 'QuantitativeValue', value: listing.sqft, unitCode: 'FTK' } : undefined,
      address: {
        '@type': 'PostalAddress',
        addressLocality: listing.area || listing.city || 'Nairobi',
        addressRegion: listing.district || listing.city || 'Nairobi',
        addressCountry: 'KE',
      },
      ...(listing.priceRaw > 0
        ? {
            offers: {
              '@type': 'Offer',
              price: listing.priceRaw,
              priceCurrency: listing.currency || 'KES',
              availability: 'https://schema.org/InStock',
              url,
            },
          }
        : {}),
    };
    return [buildBreadcrumbSchema(trail), listingSchema];
  }, [listing]);

  useSeoMeta({
    title: seoTitle,
    description: seoDescription,
    path: slug ? `/property/${slug}` : undefined,
    ogImage: seoImage,
    noindex: !listing || isSoldOrRented,
    schemas: seoSchemas,
  });

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] pt-[60px] md:pt-[130px] lg:pt-[148px]">
        <Header />
        <main className="px-4 md:px-6 py-8 md:py-12 max-w-6xl mx-auto">
          <PageLoader size={56} text={pd.loading_text} />
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] pt-[60px] md:pt-[130px] lg:pt-[148px]">
        <Header />
        <main className="pt-16 pb-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded-full mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-400"></i>
            </div>
            <h1 className="font-roboto font-bold text-2xl md:text-3xl text-primary mb-3">{pd.error_title}</h1>
            <p className="font-roboto text-stone-500 mb-6">{error}</p>
            <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
              <i className="ri-arrow-left-line"></i>{pd.back_home_label}
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  // Not found
  if (!listing) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] pt-[60px] md:pt-[130px] lg:pt-[148px]">
        <Header />
        <main className="pt-16 pb-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-stone-400"></i>
            </div>
            <h1 className="font-roboto font-bold text-2xl md:text-3xl text-primary mb-3">{pd.notfound_title}</h1>
            <p className="font-roboto text-stone-500 mb-6">{pd.notfound_text}</p>
            <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
              <i className="ri-arrow-left-line"></i>{pd.back_home_label}
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  // Determine if this is a land listing (keep old layout)
  const activeListing = listing;
  if (!activeListing) return null;

  const isLand = activeListing.propertyType === 'land';

  // ── LAND / JOINT VENTURE: type-specific detail driven by the Land CRM record ──
  if (isLand) {
    const landModel = landRecord
      ? buildLandModel(landRecord, {
          formatMoney: (amount, currency) => format(amount, currency as 'KES' | 'USD' | 'GBP' | 'EUR'),
        })
      : null;
    // A published JV opportunity upgrades the page from a generic land layout
    // to a JV-focused model (commercial structure, contributions, project info).
    const jvModel = jvRecord
      ? buildJvModel(jvRecord, {
          formatMoney: (amount, currency) => format(amount, currency as 'KES' | 'USD' | 'GBP' | 'EUR'),
        })
      : null;
    const isJv = Boolean(jvModel) || activeListing.isJointVenture || activeListing.category === 'joint_venture';
    const detailModel = isJv && jvModel ? jvModel : landModel;
    const heroStats = detailModel && detailModel.heroStats.length > 0
      ? detailModel.heroStats
      : [
          { label: 'Size', value: activeListing.size || '-' },
          { label: 'Land Type', value: activeListing.landType || '-' },
          { label: 'Price', value: format(activeListing.priceRaw, activeListing.currency as 'KES' | 'USD' | 'GBP' | 'EUR'), emphasis: true },
        ];
    const quickFacts = detailModel && detailModel.quickFacts.length > 0
      ? detailModel.quickFacts
      : [
          { label: 'Reference', value: activeListing.ref },
          { label: 'Size', value: activeListing.size || '-' },
          { label: 'County', value: activeListing.county || activeListing.district || '-' },
          { label: 'Area', value: activeListing.area || '-' },
        ];
    const mapQuery = activeListing.latitude && activeListing.longitude
      ? `${activeListing.latitude},${activeListing.longitude}`
      : encodeURIComponent(`${activeListing.district}, ${activeListing.area}`);
    const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&z=14&ie=UTF8&iwloc=&output=embed`;
    const breadcrumbCategory = { label: 'Land & Joint Ventures', href: '/joint-ventures' };

    return (
      <div className="min-h-screen bg-white pt-[60px] md:pt-[130px] lg:pt-[148px]">
        <Header />
        <main className="pb-24 md:pb-0">
          {isSoldOrRented && (
            <SoldRentedNotice
              href="/joint-ventures"
              isSold={String(activeListing.status || '').toLowerCase() === 'sold' || String(activeListing.purpose || '').toLowerCase() === 'sold'}
              soldTitle={pd.sold_title}
              letTitle={pd.let_title}
              text={pd.sold_text}
              buttonLabel={pd.sold_button}
            />
          )}
          {/* Global breadcrumb + utility bar - shared with the regular property layout */}
          {enableBreadcrumbs() && (
            <div className="px-4 md:px-6 max-w-6xl mx-auto mt-10 md:mt-14">
              <PropertyBreadcrumbBar
                title={activeListing.title}
                parentLabel={breadcrumbCategory.label}
                parentHref={breadcrumbCategory.href}
                slug={activeListing.slug}
                id={activeListing.id}
                priceLabel={format(activeListing.priceRaw, activeListing.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
              />
            </div>
          )}

          {/* Shared global search bar - consistent with Buy / Rent / All Properties */}
          <DetailSearchBar
            searchQuery={detailSearchQuery}
            onLocationChange={handleDetailLocationChange}
            radiusValue={detailRadius}
            onRadiusChange={handleDetailRadiusChange}
            radiusOptions={radiusOptions}
            bedsValue={detailBeds}
            onBedsChange={handleDetailBedsChange}
            bedOptions={detailBedOptions}
            priceValue={detailPrice}
            onPriceChange={handleDetailPriceChange}
            priceOptions={detailPriceOptions}
            typeValue={detailType}
            onTypeChange={handleDetailTypeChange}
            typeOptions={detailTypeOptions}
            onFilters={() => setShowDetailAdvancedFilters(!showDetailAdvancedFilters)}
            filtersActive={showDetailAdvancedFilters}
            saved={detailSavedSearch}
            onToggleSave={() => setDetailSavedSearch(!detailSavedSearch)}
            onSearch={() => runDetailSearch()}
            onMapView={() => runDetailSearch()}
            mapActive={false}
            onCreateAlert={() => runDetailSearch()}
            advancedOpen={showDetailAdvancedFilters}
            advancedFilters={detailAdvancedFilters}
            onApplyAdvanced={(f) => setDetailAdvancedFilters(f)}
            onCloseAdvanced={() => setShowDetailAdvancedFilters(false)}
          />

          <section className="px-4 md:px-6 max-w-7xl mx-auto">
            <PropertyGallery
              images={activeListing.images}
              mainImage={activeListing.image}
              title={activeListing.title}
              statusLabel={isJv ? 'Joint Venture' : 'For Sale'}
              layout="stacked"
            />
          </section>

          {/* Video / virtual tour - shown only when the listing has one */}
          {(activeListing.videoUrl || activeListing.virtualTourUrl) && (
            <section className="px-4 md:px-6 max-w-7xl mx-auto mt-8">
              <VideoTour
                videoUrl={activeListing.videoUrl}
                virtualTourUrl={activeListing.virtualTourUrl}
                title={activeListing.title}
              />
            </section>
          )}

          <section className="px-6 py-10 md:py-14">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                <div className="lg:col-span-2">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center px-3 py-1 bg-primary text-white font-roboto text-[11px] font-bold uppercase tracking-widest">
                      Land
                    </span>
                    {activeListing.landType && (
                      <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary font-roboto text-[11px] font-semibold uppercase tracking-widest">
                        {activeListing.landType}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-3 py-1 font-roboto text-[11px] uppercase tracking-widest font-semibold text-white bg-accent`}>
                      {isJv ? 'Joint Venture' : 'For Sale'}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 bg-white border border-primary/15 text-primary font-roboto text-[11px] font-semibold tracking-wider">
                      {activeListing.ref}
                    </span>
                  </div>
                  <PropertyMetaBadges
                    featured={activeListing.featured}
                    justListed={activeListing.justListed}
                    newHome={activeListing.newHome}
                    reduced={activeListing.reduced}
                    refurbished={activeListing.refurbished}
                    backOnMarket={activeListing.backOnMarket}
                    propertyOfTheWeek={activeListing.propertyOfTheWeek}
                    jointVenture={activeListing.isJointVenture}
                    className="mb-4"
                  />
                  <h1 className="font-roboto font-semibold text-2xl md:text-4xl text-primary mb-4 leading-tight">{activeListing.title}</h1>
                  <p className="flex items-center gap-2 text-sm md:text-base text-primary/70 mb-6">
                    <span className="w-4 h-4 flex items-center justify-center text-accent"><i className="ri-map-pin-2-line"></i></span>
                    {activeListing.county || activeListing.district}{activeListing.area ? `, ${activeListing.area}` : ''}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-primary/12 border border-primary/12 rounded-lg overflow-hidden mb-8">
                    {heroStats.map((stat, idx) => (
                      <div key={`${stat.label}-${idx}`} className="bg-white p-4">
                        <p className="text-primary/60 font-roboto text-xs font-semibold uppercase tracking-wider mb-1.5">{stat.label}</p>
                        <p className={`font-roboto text-lg md:text-xl font-semibold ${stat.emphasis ? 'text-accent' : 'text-primary'}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  {activeListing.commissionApplicable && (
                    <div className="mb-6">
                      <span className="inline-flex items-center gap-1 text-[11px] font-roboto font-semibold px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                        <i className="ri-hand-coin-line text-[11px]"></i>Commission applies
                      </span>
                    </div>
                  )}
                  {(detailModel?.summary || detailModel?.headline) && (
                    <p className="font-roboto text-primary/80 text-base md:text-lg leading-relaxed mb-4">
                      {detailModel?.summary || detailModel?.headline}
                    </p>
                  )}
                  <div className="mb-8">
                    <h2 className="font-roboto font-bold text-primary text-xl mb-3">{pd.land_about_heading}</h2>
                    <LandDescription html={activeListing.description} />
                  </div>
                  {detailModel?.investmentOpportunity && (
                    <div className="mb-8 rounded-lg border border-accent/30 bg-accent/5 p-5">
                      <h3 className="font-roboto font-bold text-primary text-base mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-accent"><i className="ri-lightbulb-line"></i></span>
                        {pd.land_investment_heading}
                      </h3>
                      <p className="font-roboto text-primary/80 text-sm md:text-base leading-relaxed whitespace-pre-line">{detailModel.investmentOpportunity}</p>
                    </div>
                  )}
                  {detailModel && detailModel.sections.length > 0 && (
                    <div className="mb-10">
                      <PropertyDetailSections sections={detailModel.sections} />
                    </div>
                  )}
                  {isJv && (
                    <div className="mb-10">
                      <JvDealRoom
                        listingId={activeListing.id}
                        listingRef={activeListing.ref}
                        listingTitle={activeListing.title}
                        landSize={activeListing.size}
                        location={[activeListing.district, activeListing.area].filter(Boolean).join(', ')}
                        jv={jvRecord}
                      />
                    </div>
                  )}
                  <div className="mb-8">
                    <h2 className="font-roboto font-bold text-primary text-xl mb-3">{pd.land_location_heading}</h2>
                    <div className="aspect-[16/9] rounded-lg overflow-hidden border border-primary/12">
                      <iframe src={mapSrc} className="w-full h-full" loading="lazy" title={`Map of ${activeListing.title}`} allowFullScreen></iframe>
                    </div>
                    <p className="text-primary/70 font-roboto text-sm mt-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 flex items-center justify-center text-accent"><i className="ri-map-pin-2-line"></i></span>
                      {activeListing.county || activeListing.district}{activeListing.area ? `, ${activeListing.area}` : ''}
                    </p>
                  </div>
                  <div className="bg-primary p-6 md:p-8 rounded-lg">
                    <h3 className="font-roboto font-bold text-white text-xl mb-2">{pd.land_enquiry_title}</h3>
                    <p className="text-white/70 font-roboto text-sm mb-5">{pd.land_enquiry_text}</p>
                    <Link to="/joint-ventures#request-desk" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white text-sm tracking-widest uppercase font-semibold cursor-pointer whitespace-nowrap hover:bg-accent/90 transition-opacity">
                      <i className="ri-mail-send-line"></i>{pd.land_enquiry_button}
                    </Link>
                  </div>

                  <SimilarProperties
                    currentId={activeListing.id}
                    propertyType={activeListing.propertyType}
                    purpose={activeListing.purpose}
                  />

                  <PropertyPrevNext
                    currentId={activeListing.id}
                    currentCreatedAt={activeListing.createdAt}
                  />
                </div>
                <div className="lg:col-span-1">
                  <div className="sticky top-28 space-y-5">
                    <PropertyDetailSections
                      title="Quick Facts"
                      headerIcon="ri-information-line"
                      sections={[{
                        id: 'land-quick-facts',
                        title: '',
                        icon: 'ri-information-line',
                        fields: quickFacts,
                      }]}
                    />
                    <div className="bg-primary border-2 border-primary rounded-lg p-5">
                      <h3 className="font-roboto font-bold text-white text-base mb-4 pb-3 border-b border-white/20">{pd.land_contact_title}</h3>
                      <p className="font-roboto text-sm leading-relaxed mb-4 text-white/80">{pd.land_contact_text}</p>
                      <Link to="/contact" className="inline-flex items-center gap-2 w-full justify-center px-4 py-3 bg-accent text-white font-roboto text-sm uppercase tracking-wider font-semibold cursor-pointer whitespace-nowrap hover:bg-accent/90 transition-colors">
                        <i className="ri-mail-send-line"></i>{pd.land_contact_button}
                      </Link>
                    </div>
                    <Link to="/joint-ventures" className="inline-flex items-center gap-2 text-primary/70 font-roboto text-sm hover:text-primary transition-colors cursor-pointer">
                      <i className="ri-arrow-left-line"></i>{pd.land_back_label}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  // ── REGULAR PROPERTY / NEW DEVELOPMENT: Oceans-style design ──
  const breadcrumbParent = activeListing.category === 'new_development'
    ? { label: 'New Projects', href: '/new-developments' }
    : activeListing.purpose === 'rent'
      ? { label: 'Rent', href: '/rent' }
      : { label: 'Buy', href: '/buy' };

  const statusLabel = activeListing.purpose === 'rent' ? 'For Rent' : activeListing.category === 'new_development' ? 'New Development' : 'For Sale';
  const areaCityCountry = [activeListing.area, activeListing.city, activeListing.country]
    .map((v) => (v || '').trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(', ');

  return (
    <div className="min-h-screen bg-[#F5F5F5] pt-[60px] md:pt-[130px] lg:pt-[148px]">
      <Header />

      {/* Breadcrumb trail - always visible on property pages */}
      <PageBreadcrumbs current={activeListing.title} />

      {isSoldOrRented && (
        <SoldRentedNotice
          href={breadcrumbParent.href}
          isSold={String(activeListing.status || '').toLowerCase() === 'sold' || String(activeListing.purpose || '').toLowerCase() === 'sold'}
          soldTitle={pd.sold_title}
          letTitle={pd.let_title}
          text={pd.sold_text}
          buttonLabel={pd.sold_button}
        />
      )}

      <main className="pb-24 md:pb-8">
        {/* Shared global search bar - consistent with Buy / Rent / All Properties */}
        <DetailSearchBar
          searchQuery={detailSearchQuery}
          onLocationChange={handleDetailLocationChange}
          radiusValue={detailRadius}
          onRadiusChange={handleDetailRadiusChange}
          radiusOptions={radiusOptions}
          bedsValue={detailBeds}
          onBedsChange={handleDetailBedsChange}
          bedOptions={detailBedOptions}
          priceValue={detailPrice}
          onPriceChange={handleDetailPriceChange}
          priceOptions={detailPriceOptions}
          typeValue={detailType}
          onTypeChange={handleDetailTypeChange}
          typeOptions={detailTypeOptions}
          onFilters={() => setShowDetailAdvancedFilters(!showDetailAdvancedFilters)}
          filtersActive={showDetailAdvancedFilters}
          saved={detailSavedSearch}
          onToggleSave={() => setDetailSavedSearch(!detailSavedSearch)}
          onSearch={() => runDetailSearch()}
          onMapView={() => runDetailSearch()}
          mapActive={false}
          onCreateAlert={() => runDetailSearch()}
          advancedOpen={showDetailAdvancedFilters}
          advancedFilters={detailAdvancedFilters}
          onApplyAdvanced={(f) => setDetailAdvancedFilters(f)}
          onCloseAdvanced={() => setShowDetailAdvancedFilters(false)}
        />

        {/* Main Card - Breadcrumb + Gallery + Stats */}
        <div className="px-4 md:px-6 max-w-7xl mx-auto">
          <div className="border border-[#e5e5e5] overflow-hidden bg-white rounded-[2px]">
            {/* Breadcrumb + Utility Bar */}
            {enableBreadcrumbs() && (
              <div className="px-4 md:px-6 py-3 border-b border-[#e5e5e5]">
                <PropertyBreadcrumbBar
                  title={activeListing.title}
                  parentLabel={breadcrumbParent.label}
                  parentHref={breadcrumbParent.href}
                  slug={activeListing.slug}
                  id={activeListing.id}
                  priceLabel={format(activeListing.priceRaw, activeListing.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                />
              </div>
            )}

            {/* Gallery */}
            <PropertyGallery
              images={activeListing.images}
              mainImage={activeListing.image}
              title={activeListing.title}
              statusLabel={statusLabel}
            />

            {/* Title + Price + Stats */}
            <div className="mt-1.5 md:mt-4 px-4 md:px-6 py-4 md:py-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-6">
                <div className="min-w-0">
                  <h1 className="font-roboto font-bold leading-snug text-primary break-words" style={{ fontSize: 'clamp(16px, 2.2vw, 26px)', letterSpacing: '-0.01em' }}>
                    {activeListing.title}
                  </h1>
                  <p className="flex items-center gap-1 mt-1 md:mt-2 text-xs md:text-sm font-roboto text-[#888]">
                    <i className="ri-map-pin-2-line text-xs md:text-sm shrink-0 text-[#888]"></i>
                    {areaCityCountry || activeListing.location}
                  </p>
                  <PropertyMetaBadges
                    featured={activeListing.featured}
                    justListed={activeListing.justListed}
                    newHome={activeListing.newHome}
                    reduced={activeListing.reduced}
                    refurbished={activeListing.refurbished}
                    backOnMarket={activeListing.backOnMarket}
                    propertyOfTheWeek={activeListing.propertyOfTheWeek}
                    jointVenture={activeListing.isJointVenture}
                    className="mt-2"
                  />
                </div>
                <div className="shrink-0 md:text-right">
                  <p className="font-roboto font-bold whitespace-nowrap leading-tight" style={{ fontSize: 'clamp(24px, 4vw, 38px)', color: '#012042' }}>
                    {format(activeListing.priceRaw, activeListing.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                  </p>
                  {activeListing.priceRaw > 0 && (activeListing.purpose === 'rent' ? (
                    <p className="text-xs font-roboto text-[#636363] mt-0.5 md:text-right">Per month (pcm)</p>
                  ) : (
                    <p className="text-xs font-roboto text-[#636363] mt-0.5 md:text-right">Guide price</p>
                  ))}
                </div>
              </div>
              <div className="mt-3 md:mt-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-[#e5e5e5] border border-[#e5e5e5] overflow-hidden rounded-[2px]">
                  {[
                    { icon: 'ri-home-5-line', label: 'Type', value: activeListing.propertyType ? activeListing.propertyType.charAt(0).toUpperCase() + activeListing.propertyType.slice(1) : 'N/A' },
                    { icon: 'ri-hotel-bed-line', label: 'Beds', value: activeListing.beds != null && activeListing.beds > 0 ? String(activeListing.beds) : 'N/A' },
                    { icon: 'fa-solid fa-bath', label: 'Baths', value: activeListing.baths != null && activeListing.baths > 0 ? String(activeListing.baths) : 'N/A' },
                    { icon: 'ri-car-line', label: 'Parking', value: activeListing.parking != null && activeListing.parking > 0 ? String(activeListing.parking) : 'N/A' },
                    { icon: 'ri-fingerprint-line', label: 'ID', value: activeListing.ref },
                  ].map((stat, idx, arr) => (
                    <div key={idx} className={`flex flex-col items-center justify-center bg-white px-2 py-3 md:px-3 md:py-4 text-center min-w-0 ${idx === arr.length - 1 ? 'col-span-2 md:col-span-1' : ''}`}>
                      <div className="flex items-center justify-center gap-0.5 md:gap-1.5 mb-0.5 w-full">
                        <span className="w-3 h-3 md:w-4 md:h-4 flex items-center justify-center shrink-0 hidden sm:flex">
                          <i className={`${stat.icon} text-[10px] md:text-sm text-[#333333]`}></i>
                        </span>
                        <span className="text-[11px] md:text-sm font-roboto font-bold leading-tight truncate text-[#111111]">{stat.value}</span>
                      </div>
                      <p className="text-[9px] md:text-[10px] font-roboto font-semibold uppercase tracking-wider text-[#888888]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 md:mt-4">
                {activeListing.commissionApplicable && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-roboto font-semibold px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                    <i className="ri-hand-coin-line text-[11px]"></i>Commission applies
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Body */}
        <div className="px-4 md:px-6 pt-4 md:pt-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <PropertyLeftColumn
                description={activeListing.description}
                features={activeListing.features}
                amenities={activeListing.amenities}
                beds={activeListing.beds}
                baths={activeListing.baths}
                parking={activeListing.parking}
                garages={activeListing.garages}
                sqft={activeListing.sqft}
                propertyType={activeListing.propertyType}
                status={activeListing.status}
                ref={activeListing.ref}
                price={format(activeListing.priceRaw, activeListing.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                priceRaw={activeListing.priceRaw}
                currency={activeListing.currency}
                location={activeListing.location}
                title={activeListing.title}
                latitude={activeListing.latitude}
                longitude={activeListing.longitude}
                district={activeListing.district}
                area={activeListing.area}
                city={activeListing.city}
                country={activeListing.country}
                furnished={activeListing.furnished}
                createdAt={activeListing.createdAt}
                commissionApplicable={activeListing.commissionApplicable}
                commissionDetails={activeListing.commissionDetails}
                specs={activeListing.specs}
                documents={activeListing.documents}
              />

              {/* Video / virtual tour - shown only when the listing has one */}
              <VideoTour
                videoUrl={activeListing.videoUrl}
                virtualTourUrl={activeListing.virtualTourUrl}
                title={activeListing.title}
              />

              {/* Similar Properties */}
              <SimilarProperties
                currentId={activeListing.id}
                propertyType={activeListing.propertyType}
                purpose={activeListing.purpose}
              />

              {/* Prev / Next */}
              <PropertyPrevNext
                currentId={activeListing.id}
                currentCreatedAt={activeListing.createdAt}
              />
            </div>

            {/* Right Column - Sticky Sidebar */}
            <div className="lg:col-span-1" id="section-contact">
              <PropertyContactCard
                agents={agents}
                propertyTitle={activeListing.title}
                propertyRef={activeListing.ref}
                formSubmitUrl="https://readdy.ai/api/form/d9b6qsihsavvukudolsg"
                tourFormSubmitUrl="https://readdy.ai/api/form/d9bk52c5ku1dsad40gng"
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <BackToTop />
      <MobileStickyBar propertyTitle={activeListing.title} agentPhone={agents[0]?.phone} />
    </div>
  );
}