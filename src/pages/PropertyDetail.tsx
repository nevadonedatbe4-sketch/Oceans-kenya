import { useState, useEffect } from 'react';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useCurrency } from '@/hooks/useCurrency';
import PropertyGallery from '@/pages/PropertyDetail/components/Gallery';
import PropertyStatsBar from '@/pages/PropertyDetail/components/StatsBar';
import PropertyLeftColumn from '@/pages/PropertyDetail/components/LeftColumn';
import PropertyContactCard from '@/pages/PropertyDetail/components/ContactCard';
import SimilarProperties from '@/pages/PropertyDetail/components/SimilarProperties';
import PropertyPrevNext from '@/pages/PropertyDetail/components/PrevNext';
import MobileStickyBar from '@/pages/PropertyDetail/components/MobileStickyBar';

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
  furnished: string;
  createdAt?: string;
}

function mockToListing(mock: any): ListingDetail {
  return mock as ListingDetail;
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
  const [detailPurpose, setDetailPurpose] = useState<'sale' | 'rent'>('sale');
  const [detailRadius, setDetailRadius] = useState('This area only');
  const [detailPrice, setDetailPrice] = useState('Any price');
  const [detailType, setDetailType] = useState('Any type');

  const radiusOptions = ['This area only', '\u00bd mile', '1 mile', '3 miles', '5 miles', '10 miles', '15 miles', '20 miles', '30 miles', '40 miles'];
  const detailPriceOptions = ['Any price', 'Under KES 10M', 'KES 10M – 30M', 'KES 30M – 50M', 'KES 50M – 100M', 'KES 100M – 200M', 'Over KES 200M'];
  const detailTypeOptions = ['Any type', 'Apartment', 'House', 'Townhouse', 'Penthouse', 'Villa', 'Studio', 'Land'];

  const handleDetailSearch = () => {
    const targetPage = detailPurpose === 'rent' ? '/rent' : '/buy';
    // Build query params
    const params = new URLSearchParams();
    if (detailSearchQuery.trim()) params.set('search', detailSearchQuery.trim());
    if (detailRadius !== 'This area only') params.set('radius', detailRadius);
    if (detailPrice !== 'Any price') params.set('price', detailPrice);
    if (detailType !== 'Any type') params.set('type', detailType);
    const qs = params.toString();
    navigate(qs ? `${targetPage}?${qs}` : targetPage);
  };

  const handleDetailSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleDetailSearch();
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

        // Fetch listing images
        let galleryImages: ListingImage[] = [];
        try {
          const { data: imgData, error: imgError } = await supabase
            .from('listing_images')
            .select('id,url,sort_order')
            .eq('listing_id', row.id)
            .order('sort_order', { ascending: true })
            .limit(20);
          if (!imgError && imgData) {
            galleryImages = imgData as ListingImage[];
          }
        } catch {
          // non-critical
        }

        // Fetch agent if assigned
        let agentInfo: AgentInfo | null = null;
        if (row.agent_id) {
          try {
            const { data: agentData } = await supabase
              .from('agents')
              .select('name,role,phone,email,avatar_url')
              .eq('id', row.agent_id)
              .maybeSingle();
            if (agentData) {
              const a = agentData as Record<string, unknown>;
              agentInfo = {
                name: String(a.name || 'Agent'),
                role: String(a.role || 'Estate Agent'),
                phone: String(a.phone || ''),
                email: String(a.email || ''),
                avatar: a.avatar_url ? String(a.avatar_url) : undefined,
              };
            }
          } catch {
            // non-critical
          }
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
          title: String(row.title || ''),
          propertyType: String(row.property_type || ''),
          location: String(row.location || ''),
          district: String(row.state_region || row.location || ''),
          area: String(row.location || ''),
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
            : String(row.purpose || 'sale'),
          size: isLand
            ? (row.land_size ? `${row.land_size} ${row.land_unit || 'acres'}` : (row.size ? `${row.size} ${row.size_unit || 'sqm'}` : ''))
            : (row.sqft ? `${Number(row.sqft).toLocaleString()} sqft` : ''),
          titleType: (row.custom_fields as Record<string, unknown> | null)?.title_type as string || 'Freehold',
          ref: String(row.property_id || `LIST-${String(row.id).slice(0, 6)}`),
          purpose: String(row.purpose || 'sale'),
          neighbourhood: String(row.neighbourhood || ''),
          latitude: row.latitude ? Number(row.latitude) : null,
          longitude: row.longitude ? Number(row.longitude) : null,
          amenities: amenitiesList,
          features: featuresList,
          agentId: row.agent_id ? String(row.agent_id) : null,
          city: String(row.city || ''),
          furnished: furnished,
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
          <div className="animate-pulse space-y-4">
            <div className="h-[260px] md:h-[460px] bg-stone-200 rounded-[2px]" />
            <div className="h-32 bg-stone-200 rounded-[2px]" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-48 bg-stone-200 rounded-[2px]" />
                <div className="h-48 bg-stone-200 rounded-[2px]" />
              </div>
              <div className="h-96 bg-stone-200 rounded-[2px]" />
            </div>
          </div>
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
            <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
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
            <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
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
    const breadcrumbCategory = activeListing.category === 'joint_venture'
      ? { label: 'Joint Ventures', href: '/joint-ventures' }
      : { label: 'Buy', href: '/buy' };

    return (
      <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
        <Header />
        <main>
          {/* Back to results — above the search bar */}
          <div className="px-4 md:px-6 max-w-6xl mx-auto mt-10 md:mt-14">
            <Link
              to={breadcrumbCategory.href}
              className="inline-flex items-center gap-1.5 text-xs font-roboto font-medium text-stone-500 hover:text-primary transition-colors cursor-pointer whitespace-nowrap mb-2"
            >
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-arrow-left-line text-xs"></i>
              </span>
              Back to results
            </Link>
          </div>

          {/* Search Bar — above breadcrumb on all property detail pages */}
          <div className="bg-white border-b border-gray-100 mt-4">
            <div className="px-4 md:px-6 pt-6 pb-5 max-w-6xl mx-auto">
              {/* Desktop search bar */}
              <div className="hidden lg:block">
                <div className="flex items-stretch gap-2">
                <div className="relative flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative flex-1 min-w-0 flex items-center gap-2.5 px-4 h-11 bg-white border border-stone-200 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                    <span className="w-5 h-5 flex items-center justify-center shrink-0">
                      <i className="ri-map-pin-line text-stone-400 text-base"></i>
                    </span>
                    <input
                      value={detailSearchQuery}
                      onChange={(e) => setDetailSearchQuery(e.target.value)}
                      onKeyDown={handleDetailSearchKeyDown}
                      placeholder="e.g. 'Nairobi', 'Kilimani', or '3 bed villa'"
                      className="flex-1 min-w-0 text-sm font-roboto font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none bg-transparent"
                    />
                    {detailSearchQuery && (
                      <button onClick={() => setDetailSearchQuery('')} className="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-stone-600 cursor-pointer">
                        <i className="ri-close-line text-sm"></i>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select value={detailPurpose} onChange={(e) => setDetailPurpose(e.target.value as 'sale' | 'rent')} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-stone-700 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                      <option value="sale">For Sale</option>
                      <option value="rent">For Rent</option>
                    </select>
                    <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                      <i className="ri-arrow-down-s-line text-sm"></i>
                    </span>
                  </div>
                  <div className="relative">
                    <select value={detailRadius} onChange={(e) => setDetailRadius(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-stone-700 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                      {radiusOptions.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                      <i className="ri-arrow-down-s-line text-sm"></i>
                    </span>
                  </div>
                  <div className="relative">
                    <select value={detailPrice} onChange={(e) => setDetailPrice(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-stone-700 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                      {detailPriceOptions.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                      <i className="ri-arrow-down-s-line text-sm"></i>
                    </span>
                  </div>
                  <div className="relative">
                    <select value={detailType} onChange={(e) => setDetailType(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-stone-700 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                      {detailTypeOptions.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                      <i className="ri-arrow-down-s-line text-sm"></i>
                    </span>
                  </div>
                </div>
                <button onClick={handleDetailSearch} className="flex items-center gap-2 h-11 px-5 bg-primary text-white text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-search-line text-sm"></i>
                  </span>
                  Search
                </button>
              </div>
            </div>

              {/* Mobile: compact row with back link + search trigger */}
              <div className="lg:hidden flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-0 flex items-center gap-2 px-3 h-9 bg-white border border-stone-200 rounded-lg">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0">
                      <i className="ri-map-pin-line text-stone-400 text-xs"></i>
                    </span>
                    <input
                      value={detailSearchQuery}
                      onChange={(e) => setDetailSearchQuery(e.target.value)}
                      onKeyDown={handleDetailSearchKeyDown}
                      placeholder="Search location..."
                      className="flex-1 min-w-0 text-xs font-roboto font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none bg-transparent"
                    />
                  </div>
                  <button onClick={handleDetailSearch} className="flex items-center justify-center w-9 h-9 bg-primary text-white rounded-lg cursor-pointer shrink-0">
                    <i className="ri-search-line text-sm"></i>
                  </button>
                </div>
              </div>
            </div>
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

          <section className="relative overflow-hidden">
            <div className="aspect-[21/9] md:aspect-[21/7] overflow-hidden bg-stone-100">
              {activeListing.image ? (
                <img alt={activeListing.title} className="w-full h-full object-cover object-top" src={activeListing.image} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="ri-landscape-line text-5xl text-stone-300 block"></i>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
            </div>
          </section>

          <section className="px-6 py-10 md:py-14">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                <div className="lg:col-span-2">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="px-2 py-0.5 bg-white border border-stone-200 text-primary font-roboto text-[10px] font-semibold tracking-wider">
                      {activeListing.ref}
                    </span>
                    <span className={`px-2.5 py-0.5 font-roboto text-[10px] uppercase tracking-wider text-white ${
                      activeListing.category === 'joint_venture' ? 'bg-accent' : 'bg-golden'
                    }`}>
                      {activeListing.category === 'joint_venture' ? 'Joint Venture' : 'For Sale'}
                    </span>
                  </div>
                  <h1 className="font-roboto font-bold text-2xl md:text-3xl text-primary mb-4">{activeListing.title}</h1>
                  <p className="flex items-center gap-1.5 text-sm text-stone-500 mb-6">
                    <i className="ri-map-pin-2-line text-golden"></i>
                    {activeListing.district}, {activeListing.area}
                  </p>
                  <div className="grid grid-cols-3 gap-4 mb-8 p-5 bg-stone-50 border border-stone-100">
                    <div>
                      <p className="text-stone-400 font-roboto text-[10px] uppercase tracking-wider mb-1">Size</p>
                      <p className="text-primary font-roboto text-base font-semibold">{activeListing.size}</p>
                    </div>
                    <div>
                      <p className="text-stone-400 font-roboto text-[10px] uppercase tracking-wider mb-1">Title Type</p>
                      <p className="text-primary font-roboto text-base font-semibold">{activeListing.titleType}</p>
                    </div>
                    <div>
                      <p className="text-stone-400 font-roboto text-[10px] uppercase tracking-wider mb-1">Price</p>
                      <p className="text-golden font-roboto text-base font-semibold">{format(activeListing.priceRaw, activeListing.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}</p>
                    </div>
                  </div>
                  <div className="mb-8">
                    <h2 className="font-roboto font-bold text-primary text-lg mb-3">About This Plot</h2>
                    <p className="text-stone-600 font-roboto text-sm leading-relaxed">{activeListing.description}</p>
                  </div>
                  <div className="mb-8">
                    <h2 className="font-roboto font-bold text-primary text-lg mb-3">Location</h2>
                    <div className="aspect-[16/9] rounded-sm overflow-hidden border border-stone-200">
                      <iframe src={mapSrc} className="w-full h-full" loading="lazy" title={`Map of ${activeListing.title}`} allowFullScreen></iframe>
                    </div>
                    <p className="text-stone-400 font-roboto text-xs mt-2 flex items-center gap-1.5">
                      <i className="ri-map-pin-2-line text-golden"></i>
                      {activeListing.district}{activeListing.area ? `, ${activeListing.area}` : ''}
                    </p>
                  </div>
                  <div className="bg-primary p-6 md:p-8">
                    <h3 className="font-roboto font-bold text-white text-lg mb-2">Interested in this plot?</h3>
                    <p className="text-white/60 font-roboto text-sm mb-5">Submit your enquiry and a partner manager will reach out with full disclosure, site visit options, and next steps.</p>
                    <Link to="/joint-ventures#request-desk" className="inline-flex items-center gap-2 px-6 py-3 bg-golden text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
                      <i className="ri-mail-send-line"></i>Enquire About This Plot
                    </Link>
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <div className="sticky top-28 space-y-5">
                    <div className="border border-stone-200 p-5">
                      <h3 className="font-roboto font-bold text-primary text-sm mb-4 pb-3 border-b border-stone-100">Quick Facts</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between"><span className="text-stone-400 font-roboto text-xs">Reference</span><span className="text-primary font-roboto text-xs font-semibold">{activeListing.ref}</span></div>
                        <div className="flex items-center justify-between"><span className="text-stone-400 font-roboto text-xs">Category</span><span className="text-primary font-roboto text-xs font-semibold capitalize">{activeListing.category === 'joint_venture' ? 'Joint Venture' : 'Outright Purchase'}</span></div>
                        <div className="flex items-center justify-between"><span className="text-stone-400 font-roboto text-xs">Size</span><span className="text-primary font-roboto text-xs font-semibold">{activeListing.size}</span></div>
                        <div className="flex items-center justify-between"><span className="text-stone-400 font-roboto text-xs">Title</span><span className="text-primary font-roboto text-xs font-semibold">{activeListing.titleType}</span></div>
                        <div className="flex items-center justify-between"><span className="text-stone-400 font-roboto text-xs">District</span><span className="text-primary font-roboto text-xs font-semibold">{activeListing.district}</span></div>
                        <div className="flex items-center justify-between"><span className="text-stone-400 font-roboto text-xs">Area</span><span className="text-primary font-roboto text-xs font-semibold">{activeListing.area}</span></div>
                      </div>
                    </div>
                    <div className="border border-stone-200 p-5">
                      <h3 className="font-roboto font-bold text-primary text-sm mb-4 pb-3 border-b border-stone-100">Contact the Desk</h3>
                      <p className="text-stone-500 font-roboto text-xs leading-relaxed mb-4">Our joint ventures desk handles all land enquiries.</p>
                      <Link to="/contact" className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 border border-stone-200 text-primary font-roboto text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white hover:border-primary transition-colors">
                        <i className="ri-chat-1-line"></i>Speak to the Desk
                      </Link>
                    </div>
                    <Link to="/joint-ventures" className="inline-flex items-center gap-2 text-stone-400 font-roboto text-xs hover:text-primary transition-colors cursor-pointer">
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

  return (
    <div className="min-h-screen bg-[#F5F5F5] pt-[88px] md:pt-[96px]">
      <Header />

      <main className="pb-8">
        {/* Back to results — above the search bar */}
        <div className="px-4 md:px-6 max-w-6xl mx-auto mt-10 md:mt-14">
          <Link
            to={breadcrumbParent.href}
            className="inline-flex items-center gap-1.5 text-xs font-roboto font-medium text-stone-500 hover:text-primary transition-colors cursor-pointer whitespace-nowrap mb-2"
          >
            <span className="w-3.5 h-3.5 flex items-center justify-center">
              <i className="ri-arrow-left-line text-xs"></i>
            </span>
            Back to results
          </Link>
        </div>

        {/* Search Bar — above breadcrumb on all property detail pages */}
        <div className="bg-white border-b border-gray-100 mt-4">
          <div className="px-4 md:px-6 pt-6 pb-5 max-w-6xl mx-auto">
            {/* Desktop search bar */}
            <div className="hidden lg:block">
              <div className="flex items-stretch gap-2">
              <div className="relative flex items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-1 min-w-0 flex items-center gap-2.5 px-4 h-11 bg-white border border-stone-200 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                  <span className="w-5 h-5 flex items-center justify-center shrink-0">
                    <i className="ri-map-pin-line text-stone-400 text-base"></i>
                  </span>
                  <input
                    value={detailSearchQuery}
                    onChange={(e) => setDetailSearchQuery(e.target.value)}
                    onKeyDown={handleDetailSearchKeyDown}
                    placeholder="e.g. 'Nairobi', 'Kilimani', or '3 bed villa'"
                    className="flex-1 min-w-0 text-sm font-roboto font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none bg-transparent"
                  />
                  {detailSearchQuery && (
                    <button onClick={() => setDetailSearchQuery('')} className="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-stone-600 cursor-pointer">
                      <i className="ri-close-line text-sm"></i>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select value={detailPurpose} onChange={(e) => setDetailPurpose(e.target.value as 'sale' | 'rent')} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-stone-700 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>
                  <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                    <i className="ri-arrow-down-s-line text-sm"></i>
                  </span>
                </div>
                <div className="relative">
                  <select value={detailRadius} onChange={(e) => setDetailRadius(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-stone-700 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                    {radiusOptions.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                    <i className="ri-arrow-down-s-line text-sm"></i>
                  </span>
                </div>
                <div className="relative">
                  <select value={detailPrice} onChange={(e) => setDetailPrice(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-stone-700 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                    {detailPriceOptions.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                    <i className="ri-arrow-down-s-line text-sm"></i>
                  </span>
                </div>
                <div className="relative">
                  <select value={detailType} onChange={(e) => setDetailType(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-stone-700 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-primary cursor-pointer whitespace-nowrap transition-colors">
                    {detailTypeOptions.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                    <i className="ri-arrow-down-s-line text-sm"></i>
                  </span>
                </div>
              </div>
              <button onClick={handleDetailSearch} className="flex items-center gap-2 h-11 px-5 bg-primary text-white text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-search-line text-sm"></i>
                </span>
                Search
              </button>
              </div>
            </div>

            {/* Mobile: compact row with search trigger */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-0 flex items-center gap-2 px-3 h-9 bg-white border border-stone-200 rounded-lg">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <i className="ri-map-pin-line text-stone-400 text-xs"></i>
                  </span>
                  <input
                    value={detailSearchQuery}
                    onChange={(e) => setDetailSearchQuery(e.target.value)}
                    onKeyDown={handleDetailSearchKeyDown}
                    placeholder="Search location..."
                    className="flex-1 min-w-0 text-xs font-roboto font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none bg-transparent"
                  />
                </div>
                <button onClick={handleDetailSearch} className="flex items-center justify-center w-9 h-9 bg-primary text-white rounded-lg cursor-pointer shrink-0">
                  <i className="ri-search-line text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumb + Utility Bar */}
        {enableBreadcrumbs() && (
          <div className="px-4 md:px-6 pt-4 md:pt-6 max-w-6xl mx-auto">
            <div className="bg-white border border-stone-200 rounded-[2px] px-4 py-3 flex items-center justify-between">
              <nav className="flex items-center gap-2 text-xs font-roboto text-stone-400">
                <Link to="/" className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer whitespace-nowrap">
                  <i className="ri-home-line text-[10px]"></i>Home
                </Link>
                <i className="ri-arrow-right-s-line text-stone-300 text-[10px]"></i>
                <Link to={breadcrumbParent.href} className="hover:text-primary transition-colors cursor-pointer whitespace-nowrap">
                  {breadcrumbParent.label}
                </Link>
                <i className="ri-arrow-right-s-line text-stone-300 text-[10px]"></i>
                <span className="text-primary font-semibold truncate max-w-[200px] md:max-w-[300px]">{activeListing.title}</span>
              </nav>
              <div className="hidden sm:flex items-center gap-2">
                <button className="w-8 h-8 flex items-center justify-center border border-stone-200 rounded-[2px] text-stone-400 hover:text-primary hover:border-primary transition-colors cursor-pointer" title="Save">
                  <i className="ri-heart-line text-sm"></i>
                </button>
                <button className="w-8 h-8 flex items-center justify-center border border-stone-200 rounded-[2px] text-stone-400 hover:text-primary hover:border-primary transition-colors cursor-pointer" title="Share">
                  <i className="ri-share-line text-sm"></i>
                </button>
                <button className="w-8 h-8 flex items-center justify-center border border-stone-200 rounded-[2px] text-stone-400 hover:text-primary hover:border-primary transition-colors cursor-pointer" title="Print">
                  <i className="ri-printer-line text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gallery */}
        <div className="px-4 md:px-6 pt-4 md:pt-6 max-w-6xl mx-auto">
          <div className="relative">
            <PropertyGallery
              images={activeListing.images}
              mainImage={activeListing.image}
              title={activeListing.title}
              statusLabel={statusLabel}
            />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-4 md:px-6 pt-4 md:pt-6 max-w-6xl mx-auto">
          <PropertyStatsBar
            title={activeListing.title}
            location={activeListing.location}
            price={format(activeListing.priceRaw, activeListing.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
            propertyType={activeListing.propertyType}
            beds={activeListing.beds}
            baths={activeListing.baths}
            parking={activeListing.parking}
            ref={activeListing.ref}
            purpose={activeListing.purpose}
          />
        </div>

        {/* Two-Column Body */}
        <div className="px-4 md:px-6 pt-4 md:pt-6 max-w-6xl mx-auto">
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
            <div className="lg:col-span-1">
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