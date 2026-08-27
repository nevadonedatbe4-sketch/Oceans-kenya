import { useState, useEffect } from 'react';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import LocationSearch from '@/components/feature/LocationSearch';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useCurrency } from '@/hooks/useCurrency';
import { formatLocation, smartTitleCase } from '@/lib/location';
import PropertyGallery from '@/pages/PropertyDetail/components/Gallery';
import PropertyLeftColumn from '@/pages/PropertyDetail/components/LeftColumn';
import PropertyContactCard from '@/pages/PropertyDetail/components/ContactCard';
import SimilarProperties from '@/pages/PropertyDetail/components/SimilarProperties';
import PropertyPrevNext from '@/pages/PropertyDetail/components/PrevNext';
import MobileStickyBar from '@/pages/PropertyDetail/components/MobileStickyBar';
import AdvancedFilters from '@/pages/Rent/components/AdvancedFilters';
import { defaultFilters, type FilterState } from '@/pages/Rent/components/filterState';
import PageLoader from '@/components/feature/PageLoader';

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
  createdAt?: string;
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

export default function PropertyDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const { format } = useCurrency();
  const { enableBreadcrumbs } = useSiteSettings();

  // ── Search bar state (above breadcrumb on all property detail pages) ──
  const navigate = useNavigate();
  const [detailSearchQuery, setDetailSearchQuery] = useState('');
  const [detailLocation, setDetailLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [detailPurpose, setDetailPurpose] = useState<'sale' | 'rent'>('sale');
  const [detailRadius, setDetailRadius] = useState('This area only');
  const [detailPrice, setDetailPrice] = useState('Any price');
  const [detailType, setDetailType] = useState('Any type');
  const [showDetailAdvancedFilters, setShowDetailAdvancedFilters] = useState(false);
  const [detailAdvancedFilters, setDetailAdvancedFilters] = useState<FilterState>({ ...defaultFilters });

  const radiusOptions = ['This area only', '\u00bd mile', '1 mile', '3 miles', '5 miles', '10 miles', '15 miles', '20 miles', '30 miles', '40 miles'];
  const detailPriceOptions = ['Any price', 'Under KES 10M', 'KES 10M – 30M', 'KES 30M – 50M', 'KES 50M – 100M', 'KES 100M – 200M', 'Over KES 200M'];
  const detailTypeOptions = ['Any type', 'Apartment', 'House', 'Townhouse', 'Penthouse', 'Villa', 'Studio', 'Land'];

  const handleDetailSearch = () => {
    const targetPage = detailPurpose === 'rent' ? '/rent' : '/buy';
    const params = new URLSearchParams();
    if (detailSearchQuery.trim()) params.set('search', detailSearchQuery.trim());
    if (detailLocation) {
      params.set('lat', String(detailLocation.lat));
      params.set('lng', String(detailLocation.lng));
    }
    if (detailRadius !== 'This area only') params.set('radius', detailRadius);
    if (detailPrice !== 'Any price') params.set('price', detailPrice);
    if (detailType !== 'Any type') params.set('type', detailType);
    const qs = params.toString();
    navigate(qs ? `${targetPage}?${qs}` : targetPage);
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchListing() {
      setLoading(true);
      setError('');
      setAgent(null);
      try {
        const { data, error: dbError } = await supabase
          .from('listings')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (dbError) throw dbError;
        if (cancelled) return;

        if (!data) {
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

        const isLand = String(row.property_type || '') === 'land';

        // Fetch listing images and agent in parallel (non-critical, non-blocking)
        let galleryImages: ListingImage[] = [];
        let agentInfo: AgentInfo | null = null;

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
          if (!row.agent_id) return null;
          try {
            const { data: agentData } = await supabase
              .from('agents')
              .select('name,title,phone,email,avatar_url')
              .eq('id', row.agent_id)
              .maybeSingle();
            if (agentData) {
              const a = agentData as Record<string, unknown>;
              return {
                name: String(a.name || 'Agent'),
                role: String(a.title || 'Estate Agent'),
                phone: String(a.phone || ''),
                email: String(a.email || ''),
                avatar: a.avatar_url ? String(a.avatar_url) : undefined,
              } as AgentInfo;
            }
          } catch {
            // non-critical
          }
          return null;
        })();

        [galleryImages, agentInfo] = await Promise.all([imagesPromise, agentPromise]);

        // Fallback: if listing_images returned nothing, use the images array from listings
        if (galleryImages.length === 0 && row.images && Array.isArray(row.images)) {
          galleryImages = (row.images as string[]).map((url: string, idx: number) => ({
            id: `fallback-${idx}`,
            url,
            sort_order: idx,
          }));
        }

        setAgent(agentInfo);

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

        // Parse furnished status
        const furnished = String(
          (row.custom_fields as Record<string, unknown> | null)?.furnished
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
          status: String(row.status || 'available'),
          category: isLand
            ? (row.sub_type === 'joint_venture' ? 'joint_venture' : 'outright')
            : (row.featured_new_development || row.purpose === 'new_development')
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
          createdAt: row.created_at ? String(row.created_at) : undefined,
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
  }, [slug]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] pt-[88px] md:pt-[96px]">
        <Header />
        <main className="px-4 md:px-6 py-8 md:py-12 max-w-6xl mx-auto">
          <PageLoader size={56} text="Loading property..." />
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] pt-[88px] md:pt-[96px]">
        <Header />
        <main className="pt-16 pb-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded-full mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-400"></i>
            </div>
            <h1 className="font-roboto font-bold text-2xl md:text-3xl text-primary mb-3">Something went wrong</h1>
            <p className="font-roboto text-stone-500 mb-6">{error}</p>
            <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
              <i className="ri-arrow-left-line"></i>Back to Home
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
      <div className="min-h-screen bg-[#F5F5F5] pt-[88px] md:pt-[96px]">
        <Header />
        <main className="pt-16 pb-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-stone-400"></i>
            </div>
            <h1 className="font-roboto font-bold text-2xl md:text-3xl text-primary mb-3">Listing Not Found</h1>
            <p className="font-roboto text-stone-500 mb-6">This listing does not exist or may have been removed.</p>
            <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
              <i className="ri-arrow-left-line"></i>Back to Home
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

  // ── LAND / JOINT VENTURE: keep existing layout ──
  if (isLand) {
    const mapQuery = activeListing.latitude && activeListing.longitude
      ? `${activeListing.latitude},${activeListing.longitude}`
      : encodeURIComponent(`${activeListing.district}, ${activeListing.area}`);
    const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&z=14&ie=UTF8&iwloc=&output=embed`;
    const breadcrumbCategory = { label: 'Land & Joint Ventures', href: '/joint-ventures' };

    return (
      <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
        <Header />
        <main className="pb-24 md:pb-0">
          {/* Back to results — above the search bar */}
          <div className="px-4 md:px-6 max-w-6xl mx-auto mt-10 md:mt-14">
            <Link
              to={breadcrumbCategory.href}
              className="inline-flex items-center gap-1.5 text-sm font-roboto font-medium text-primary/70 hover:text-primary transition-colors cursor-pointer whitespace-nowrap mb-2"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-arrow-left-line text-sm"></i>
              </span>
              Back to land &amp; joint ventures
            </Link>
          </div>

          {/* Search Bar — above breadcrumb on all property detail pages */}
          <div className="bg-white border-b border-gray-100 mt-4">
            <div className="px-4 md:px-6 pt-6 pb-5 max-w-6xl mx-auto">
              {/* Desktop search bar */}
              <div className="hidden lg:block">
                <div className="flex items-stretch gap-[2px]">
                <LocationSearch
                  value={detailSearchQuery}
                  onChange={(val, sug) => {
                    setDetailSearchQuery(val);
                    if (sug) setDetailLocation({ lat: sug.lat, lng: sug.lng });
                  }}
                  className="flex-1 min-w-0"
                  placeholderCycle={[
                    "Looking for your next property...",
                    "Looking for your dream home...",
                    "Looking for an investment opportunity...",
                    "Looking for a luxury residence...",
                  ]}
                />
                <div className="flex items-center gap-[2px]">
                  <div className="relative">
                    <select value={detailPurpose} onChange={(e) => setDetailPurpose(e.target.value as 'sale' | 'rent')} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                      <option value="sale">For Sale</option>
                      <option value="rent">For Rent</option>
                    </select>
                    <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none">
                      <i className="ri-arrow-down-s-line text-sm"></i>
                    </span>
                  </div>
                  <div className="relative">
                    <select value={detailRadius} onChange={(e) => setDetailRadius(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                      {radiusOptions.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none">
                      <i className="ri-arrow-down-s-line text-sm"></i>
                    </span>
                  </div>
                  <div className="relative">
                    <select value={detailPrice} onChange={(e) => setDetailPrice(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                      {detailPriceOptions.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none">
                      <i className="ri-arrow-down-s-line text-sm"></i>
                    </span>
                  </div>
                  <div className="relative">
                    <select value={detailType} onChange={(e) => setDetailType(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                      {detailTypeOptions.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none">
                      <i className="ri-arrow-down-s-line text-sm"></i>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailAdvancedFilters(!showDetailAdvancedFilters)}
                  className={`hidden md:flex items-center gap-2 h-11 px-4 text-base font-roboto font-semibold border rounded-lg transition-colors cursor-pointer whitespace-nowrap ${showDetailAdvancedFilters ? 'text-accent border-accent bg-accent/5' : 'text-accent border-accent/20 hover:bg-accent hover:text-white hover:border-accent'}`}
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-equalizer-line text-sm"></i>
                  </span>
                  Advanced Filters
                </button>
                <button onClick={handleDetailSearch} className="flex items-center gap-2 h-11 px-5 bg-primary text-white border-2 border-primary text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-search-line text-sm"></i>
                  </span>
                  Search
                </button>
              </div>
            </div>

              {/* Mobile: compact row with back link + search trigger */}
              <div className="lg:hidden flex items-center justify-between gap-[2px]">
                <div className="flex items-center gap-[2px] flex-1">
                  <LocationSearch
                    value={detailSearchQuery}
                    onChange={(val, sug) => {
                      setDetailSearchQuery(val);
                      if (sug) setDetailLocation({ lat: sug.lat, lng: sug.lng });
                    }}
                    className="flex-1 min-w-0"
                    placeholderCycle={[
                      "Looking for your next property...",
                      "Looking for your dream home...",
                      "Looking for an investment opportunity...",
                      "Looking for a luxury residence...",
                    ]}
                  />
                  <button onClick={() => setShowDetailAdvancedFilters(!showDetailAdvancedFilters)} className={`flex items-center justify-center w-9 h-9 border rounded-lg cursor-pointer transition-colors shrink-0 ${showDetailAdvancedFilters ? 'text-accent border-accent bg-accent/5' : 'text-accent/60 border-accent/20'}`}>
                    <i className="ri-equalizer-line text-sm"></i>
                  </button>
                  <button onClick={handleDetailSearch} className="flex items-center justify-center w-9 h-9 bg-primary text-white border-2 border-primary rounded-lg cursor-pointer shrink-0">
                    <i className="ri-search-line text-sm"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Filters Panel — inline below search bar like Zoopla */}
            <AdvancedFilters
              isOpen={showDetailAdvancedFilters}
              onClose={() => setShowDetailAdvancedFilters(false)}
              onApply={(f) => setDetailAdvancedFilters(f)}
              initialFilters={detailAdvancedFilters}
            />
          </div>

          {enableBreadcrumbs() && (
            <div className="px-6 py-3 bg-stone-50 border-b border-stone-100">
              <div className="max-w-6xl mx-auto">
                <nav className="flex items-center gap-2 text-xs font-roboto">
                  <Link to="/" className="text-stone-400 hover:text-primary transition-colors cursor-pointer whitespace-nowrap">Home</Link>
                  <span className="text-stone-300">/</span>
                  <Link to={breadcrumbCategory.href} className="text-stone-400 hover:text-primary transition-colors cursor-pointer whitespace-nowrap">{breadcrumbCategory.label}</Link>
                  <span className="text-stone-300">/</span>
                  <span className="text-primary font-semibold truncate max-w-[300px]">{activeListing.title}</span>
                </nav>
              </div>
            </div>
          )}

          <section className="px-4 md:px-6 max-w-7xl mx-auto">
            <PropertyGallery
              images={activeListing.images}
              mainImage={activeListing.image}
              title={activeListing.title}
              statusLabel={activeListing.category === 'joint_venture' ? 'Joint Venture' : 'For Sale'}
            />
          </section>

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
                    <span className={`inline-flex items-center px-3 py-1 font-roboto text-[11px] uppercase tracking-widest font-semibold text-white ${activeListing.category === 'joint_venture' ? 'bg-accent' : 'bg-golden'}`}>
                      {activeListing.category === 'joint_venture' ? 'Joint Venture' : 'For Sale'}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 bg-white border border-primary/15 text-primary font-roboto text-[11px] font-semibold tracking-wider">
                      {activeListing.ref}
                    </span>
                  </div>
                  <h1 className="font-roboto font-semibold text-2xl md:text-4xl text-primary mb-4 leading-tight">{activeListing.title}</h1>
                  <p className="flex items-center gap-2 text-sm md:text-base text-primary/70 mb-6">
                    <span className="w-4 h-4 flex items-center justify-center text-golden"><i className="ri-map-pin-2-line"></i></span>
                    {activeListing.county || activeListing.district}{activeListing.area ? `, ${activeListing.area}` : ''}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-primary/12 border border-primary/12 rounded-lg overflow-hidden mb-8">
                    <div className="bg-white p-4">
                      <p className="text-primary/60 font-roboto text-xs font-semibold uppercase tracking-wider mb-1.5">Size</p>
                      <p className="text-primary font-roboto text-lg font-semibold">{activeListing.size}</p>
                    </div>
                    <div className="bg-white p-4">
                      <p className="text-primary/60 font-roboto text-xs font-semibold uppercase tracking-wider mb-1.5">Title Type</p>
                      <p className="text-primary font-roboto text-lg font-semibold">{activeListing.titleType}</p>
                    </div>
                    <div className="bg-white p-4">
                      <p className="text-primary/60 font-roboto text-xs font-semibold uppercase tracking-wider mb-1.5">Land Type</p>
                      <p className="text-primary font-roboto text-lg font-semibold">{activeListing.landType || '—'}</p>
                    </div>
                    <div className="bg-white p-4">
                      <p className="text-primary/60 font-roboto text-xs font-semibold uppercase tracking-wider mb-1.5">Price</p>
                      <p className="text-golden font-roboto text-lg md:text-xl font-semibold">{format(activeListing.priceRaw, activeListing.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}</p>
                    </div>
                  </div>
                  <div className="mb-8">
                    <h2 className="font-roboto font-bold text-primary text-xl mb-3">About This Plot</h2>
                    {activeListing.description ? (
                      <div
                        className="font-roboto text-primary/80 text-sm md:text-base leading-relaxed space-y-3 [&_p]:leading-relaxed [&_strong]:text-primary [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_li]:leading-relaxed [&_h3]:font-bold [&_h3]:text-lg [&_h3]:text-primary [&_h3]:mt-4 [&_h3]:mb-2 [&_a]:text-golden [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: activeListing.description }}
                      />
                    ) : (
                      <p className="text-primary/60 font-roboto text-sm md:text-base leading-relaxed">No description available for this plot.</p>
                    )}
                  </div>
                  <div className="mb-8">
                    <h2 className="font-roboto font-bold text-primary text-xl mb-3">Location</h2>
                    <div className="aspect-[16/9] rounded-lg overflow-hidden border border-primary/12">
                      <iframe src={mapSrc} className="w-full h-full" loading="lazy" title={`Map of ${activeListing.title}`} allowFullScreen></iframe>
                    </div>
                    <p className="text-primary/70 font-roboto text-sm mt-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 flex items-center justify-center text-golden"><i className="ri-map-pin-2-line"></i></span>
                      {activeListing.county || activeListing.district}{activeListing.area ? `, ${activeListing.area}` : ''}
                    </p>
                  </div>
                  <div className="bg-primary p-6 md:p-8 rounded-lg">
                    <h3 className="font-roboto font-bold text-white text-xl mb-2">Interested in this plot?</h3>
                    <p className="text-white/70 font-roboto text-sm mb-5">Submit your enquiry and a partner manager will reach out with full disclosure, site visit options, and next steps.</p>
                    <Link to="/joint-ventures#request-desk" className="inline-flex items-center gap-2 px-6 py-3 bg-golden text-white text-sm tracking-widest uppercase font-semibold cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
                      <i className="ri-mail-send-line"></i>Enquire About This Plot
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
                    <div className="border border-primary/12 rounded-lg p-5">
                      <h3 className="font-roboto font-bold text-primary text-base mb-4 pb-3 border-b border-primary/12">Quick Facts</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3"><span className="text-primary/70 font-roboto text-sm font-semibold">Reference</span><span className="text-primary font-roboto text-sm font-semibold text-right">{activeListing.ref}</span></div>
                        <div className="flex items-center justify-between gap-3"><span className="text-primary/70 font-roboto text-sm font-semibold">Category</span><span className="text-primary font-roboto text-sm font-semibold text-right capitalize">{activeListing.category === 'joint_venture' ? 'Joint Venture' : 'Outright Purchase'}</span></div>
                        <div className="flex items-center justify-between gap-3"><span className="text-primary/70 font-roboto text-sm font-semibold">Size</span><span className="text-primary font-roboto text-sm font-semibold text-right">{activeListing.size}</span></div>
                        <div className="flex items-center justify-between gap-3"><span className="text-primary/70 font-roboto text-sm font-semibold">Title</span><span className="text-primary font-roboto text-sm font-semibold text-right">{activeListing.titleType}</span></div>
                        <div className="flex items-center justify-between gap-3"><span className="text-primary/70 font-roboto text-sm font-semibold">County</span><span className="text-primary font-roboto text-sm font-semibold text-right">{activeListing.county || activeListing.district}</span></div>
                        <div className="flex items-center justify-between gap-3"><span className="text-primary/70 font-roboto text-sm font-semibold">Area</span><span className="text-primary font-roboto text-sm font-semibold text-right">{activeListing.area}</span></div>
                      </div>
                    </div>
                    <div className="bg-primary/5 border border-primary/12 rounded-lg p-5">
                      <h3 className="font-roboto font-bold text-primary text-base mb-4 pb-3 border-b border-primary/12">Contact the Desk</h3>
                      <p className="text-primary/70 font-roboto text-sm leading-relaxed mb-4">Our joint ventures desk handles all land enquiries.</p>
                      <Link to="/contact" className="inline-flex items-center gap-2 w-full justify-center px-4 py-3 bg-primary text-white font-roboto text-sm uppercase tracking-wider font-semibold cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
                        <i className="ri-mail-send-line"></i>Speak to the Desk
                      </Link>
                    </div>
                    <Link to="/joint-ventures" className="inline-flex items-center gap-2 text-primary/70 font-roboto text-sm hover:text-primary transition-colors cursor-pointer">
                      <i className="ri-arrow-left-line"></i>Back to all listings
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
    <div className="min-h-screen bg-[#F5F5F5] pt-[88px] md:pt-[96px]">
      <Header />

      <main className="pb-24 md:pb-8">
        {/* Back to previous page */}
        <div className="px-4 md:px-6 max-w-7xl mx-auto mt-2">
          <Link
            to={breadcrumbParent.href}
            className="inline-flex items-center gap-1.5 text-xs font-roboto font-medium text-[#888] hover:text-[#012042] transition-colors mb-3 md:mb-4 cursor-pointer whitespace-nowrap"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-arrow-left-line text-sm"></i>
            </span>
            Back to results
          </Link>
        </div>

        {/* Search Bar — above breadcrumb on all property detail pages */}
        <div className="bg-white border-b border-gray-100 mt-4">
          <div className="px-4 md:px-6 pt-6 pb-5 max-w-7xl mx-auto">
            {/* Desktop search bar */}
            <div className="hidden lg:block">
              <div className="flex items-stretch gap-[2px]">
              <LocationSearch
                value={detailSearchQuery}
                onChange={(val, sug) => {
                  setDetailSearchQuery(val);
                  if (sug) setDetailLocation({ lat: sug.lat, lng: sug.lng });
                }}
                className="flex-1 min-w-0"
                placeholderCycle={[
                  "Looking for your next property...",
                  "Looking for your dream home...",
                  "Looking for an investment opportunity...",
                  "Looking for a luxury residence...",
                ]}
              />
              <div className="flex items-center gap-[2px]">
                <div className="relative">
                  <select value={detailPurpose} onChange={(e) => setDetailPurpose(e.target.value as 'sale' | 'rent')} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>
                  <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none">
                    <i className="ri-arrow-down-s-line text-sm"></i>
                  </span>
                </div>
                <div className="relative">
                  <select value={detailRadius} onChange={(e) => setDetailRadius(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                    {radiusOptions.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none">
                    <i className="ri-arrow-down-s-line text-sm"></i>
                  </span>
                </div>
                <div className="relative">
                  <select value={detailPrice} onChange={(e) => setDetailPrice(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                    {detailPriceOptions.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none">
                    <i className="ri-arrow-down-s-line text-sm"></i>
                  </span>
                </div>
                <div className="relative">
                  <select value={detailType} onChange={(e) => setDetailType(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-primary bg-white border border-primary/50 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                    {detailTypeOptions.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none">
                    <i className="ri-arrow-down-s-line text-sm"></i>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDetailAdvancedFilters(!showDetailAdvancedFilters)}
                className={`hidden md:flex items-center gap-2 h-11 px-4 text-base font-roboto font-semibold border rounded-lg transition-colors cursor-pointer whitespace-nowrap ${showDetailAdvancedFilters ? 'text-accent border-accent bg-accent/5' : 'text-accent border-accent/20 hover:bg-accent hover:text-white hover:border-accent'}`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-equalizer-line text-sm"></i>
                </span>
                Advanced Filters
              </button>
              <button onClick={handleDetailSearch} className="flex items-center gap-2 h-11 px-5 bg-primary text-white border-2 border-primary text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-search-line text-sm"></i>
                </span>
                Search
              </button>
              </div>
            </div>

        {/* Mobile: search row with input + filter + search */}
            <div className="lg:hidden px-0 pt-0 pb-0">
              <div className="flex items-stretch gap-[2px]">
                <LocationSearch
                  value={detailSearchQuery}
                  onChange={(val, sug) => {
                    setDetailSearchQuery(val);
                    if (sug) setDetailLocation({ lat: sug.lat, lng: sug.lng });
                  }}
                  className="flex-1 min-w-0"
                  placeholderCycle={[
                    "Looking for your next property...",
                    "Looking for your dream home...",
                    "Looking for an investment opportunity...",
                    "Looking for a luxury residence...",
                  ]}
                />
                <button
                  onClick={() => setShowDetailAdvancedFilters(!showDetailAdvancedFilters)}
                  className={`flex items-center justify-center w-10 h-10 border border-accent/20 rounded-lg cursor-pointer transition-colors ${showDetailAdvancedFilters ? 'text-accent border-accent bg-accent/5' : 'text-accent hover:bg-accent hover:text-white hover:border-accent'}`}
                >
                  <i className="ri-equalizer-line text-base"></i>
                </button>
                <button
                  onClick={handleDetailSearch}
                  className="flex items-center justify-center w-10 h-10 bg-primary text-white border-2 border-primary rounded-lg cursor-pointer disabled:opacity-60 hover:bg-primary/90 transition-colors"
                >
                  <i className="ri-search-line text-base"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters Panel — inline below search bar like Zoopla */}
          <AdvancedFilters
            isOpen={showDetailAdvancedFilters}
            onClose={() => setShowDetailAdvancedFilters(false)}
            onApply={(f) => setDetailAdvancedFilters(f)}
            initialFilters={detailAdvancedFilters}
          />
        </div>

        {/* Main Card — Breadcrumb + Gallery + Stats */}
        <div className="px-4 md:px-6 max-w-7xl mx-auto">
          <div className="border border-[#e5e5e5] overflow-hidden bg-white rounded-[2px]">
            {/* Breadcrumb + Utility Bar */}
            {enableBreadcrumbs() && (
              <div className="px-4 md:px-6 py-3 border-b border-[#e5e5e5]">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <nav className="flex items-center gap-1.5 flex-wrap min-w-0" aria-label="Breadcrumb">
                    <Link to="/" className="flex items-center gap-1 text-xs font-roboto whitespace-nowrap hover:opacity-70 transition-opacity cursor-pointer shrink-0 text-[#888]">
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-home-4-line text-xs"></i>
                      </span>
                      Home
                    </Link>
                    <span className="w-3 h-3 flex items-center justify-center shrink-0">
                      <i className="ri-arrow-right-s-line text-xs text-[#cccccc]"></i>
                    </span>
                    <Link to={breadcrumbParent.href} className="text-xs font-roboto whitespace-nowrap hover:opacity-70 transition-opacity cursor-pointer shrink-0 text-[#888]">
                      {breadcrumbParent.label}
                    </Link>
                  </nav>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button className="w-8 h-8 flex items-center justify-center border border-[#ddd] hover:border-[#aaa] transition-colors cursor-pointer rounded-[2px] text-[#555555]" title="Save property">
                      <i className="ri-heart-line text-sm"></i>
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center border border-[#ddd] hover:border-[#aaa] transition-colors cursor-pointer rounded-[2px] text-[#555555]" title="Share property">
                      <i className="ri-share-line text-sm"></i>
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center border border-[#ddd] hover:border-[#aaa] transition-colors cursor-pointer rounded-[2px] text-[#555555]" title="Print property">
                      <i className="ri-printer-line text-sm"></i>
                    </button>
                  </div>
                </div>
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
                  <div className="mt-2">
                    {activeListing.commissionApplicable ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-roboto font-semibold px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                        <i className="ri-hand-coin-line text-[11px]"></i>Commission applies
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-roboto font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                        <i className="ri-close-circle-line text-[11px]"></i>No commission
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 md:text-right">
                  <p className="font-roboto font-bold whitespace-nowrap leading-tight" style={{ fontSize: 'clamp(24px, 4vw, 38px)', color: '#012042' }}>
                    {format(activeListing.priceRaw, activeListing.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                  </p>
                  {activeListing.purpose === 'rent' ? (
                    <p className="text-xs font-roboto text-[#636363] mt-0.5 md:text-right">Per month (pcm)</p>
                  ) : (
                    <p className="text-xs font-roboto text-[#636363] mt-0.5 md:text-right">Guide price</p>
                  )}
                </div>
              </div>
              <div className="mt-3 md:mt-6">
                <div className="flex w-full border border-[#e5e5e5] overflow-hidden rounded-[2px]">
                  {[
                    { icon: 'ri-home-5-line', label: 'Type', value: activeListing.propertyType ? activeListing.propertyType.charAt(0).toUpperCase() + activeListing.propertyType.slice(1) : 'N/A' },
                    { icon: 'ri-hotel-bed-line', label: 'Beds', value: activeListing.beds != null && activeListing.beds > 0 ? String(activeListing.beds) : 'N/A' },
                    { icon: 'fa-solid fa-bath', label: 'Baths', value: activeListing.baths != null && activeListing.baths > 0 ? String(activeListing.baths) : 'N/A' },
                    { icon: 'ri-car-line', label: 'Parking', value: activeListing.parking != null && activeListing.parking > 0 ? String(activeListing.parking) : 'N/A' },
                    { icon: 'ri-fingerprint-line', label: 'ID', value: activeListing.ref },
                  ].map((stat, idx, arr) => (
                    <div key={idx} className={`flex-1 flex flex-col items-center justify-center px-1 py-2.5 md:px-3 md:py-4 text-center min-w-0 overflow-hidden ${idx < arr.length - 1 ? 'border-r border-[#e5e5e5]' : ''}`}>
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
                agent={agent}
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
      <MobileStickyBar propertyTitle={activeListing.title} agentPhone={agent?.phone} />
    </div>
  );
}