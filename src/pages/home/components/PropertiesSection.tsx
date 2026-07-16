import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface PropertyAgent {
  name: string;
  photo: string;
}

interface Property {
  id: string;
  slug: string;
  title: string;
  location: string;
  type: 'sale' | 'rent';
  category: string;
  beds: number;
  baths: number;
  parking: number;
  price: string;
  priceUnit?: string;
  image: string;
  featured: boolean;
  listedDays: number;
  agent?: PropertyAgent;
}

interface ListingRow {
  id: string;
  title: string;
  location: string;
  price: number;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  slug: string | null;
  created_at: string;
  main_image: string | null;
  images: string[] | null;
  purpose: string;
  is_featured: boolean;
  currency: string;
}

function buildSlug(id: string, title: string): string {
  if (!title) return id;
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function toCategoryLabel(category: string): string {
  return category
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function mapRow(row: ListingRow): Property {
  const title = row.title || 'Untitled Property';
  const slug = row.slug || buildSlug(row.id, title);

  const mainImg = row.main_image || (row.images && row.images.length > 0 ? row.images[0] : null);
  const fallbackImg = 'https://readdy.ai/api/search-image?query=Modern%20luxury%20real%20estate%20property%20exterior%20clean%20white%20walls%20large%20windows%20bright%20daylight%20architectural%20photography%20high%20quality%20warm%20neutral%20background%20professional%20real%20estate%20photo&width=800&height=600&seq=hp-property-fallback&orientation=landscape';

  const priceNum = row.price || 0;
  const currencySymbol = row.currency === 'USD' ? '$' : row.currency === 'KES' ? 'KSh' : row.currency === 'UGX' ? 'UGX' : row.currency === 'GBP' ? '£' : row.currency === 'EUR' ? '€' : '';
  let priceDisplay = 'On request';
  if (priceNum > 0) {
    if (priceNum >= 1_000_000) {
      priceDisplay = `${currencySymbol} ${(priceNum / 1_000_000).toFixed(priceNum % 1_000_000 === 0 ? 0 : 1)}M`;
    } else if (priceNum >= 1_000) {
      priceDisplay = `${currencySymbol} ${(priceNum / 1_000).toFixed(0)}K`;
    } else {
      priceDisplay = `${currencySymbol} ${priceNum.toLocaleString()}`;
    }
  }

  const created = new Date(row.created_at);
  const listedDays = Math.floor((Date.now() - created.getTime()) / 86400000);

  return {
    id: row.id,
    slug,
    title,
    location: row.location || 'Nairobi',
    type: row.purpose === 'rent' ? 'rent' : 'sale',
    category: toCategoryLabel(row.property_type || 'house'),
    beds: row.bedrooms ?? 0,
    baths: row.bathrooms ?? 0,
    parking: row.parking ?? 0,
    price: priceDisplay,
    priceUnit: row.purpose === 'rent' ? 'pcm' : undefined,
    image: mainImg || fallbackImg,
    featured: row.is_featured || false,
    listedDays,
  };
}

export default function PropertiesSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { getCardStyle } = useSiteSettings();

  const cardsPerView = typeof window !== 'undefined' && window.innerWidth >= 768 ? 3 : 1;
  const totalSlides = Math.max(1, Math.ceil(properties.length / cardsPerView));

  const cardShadow = getCardStyle('card_shadow') === 'true';
  const cardHoverLift = getCardStyle('card_hover_lift') === 'true';
  const showBadge = getCardStyle('card_show_badge') !== 'false';
  const showAgent = getCardStyle('card_show_agent') === 'true';
  const imageRatio = getCardStyle('card_image_ratio') || '4/3';
  const badgeColor = getCardStyle('card_badge_color') || '#1B4332';

  const aspectClass = {
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    '3/2': 'aspect-[3/2]',
    '1/1': 'aspect-square',
  }[imageRatio] || 'aspect-[4/3]';

  const shadowClass = cardShadow ? 'shadow-md' : '';
  const hoverClass = cardHoverLift ? 'hover:-translate-y-1' : '';

  useEffect(() => {
    let cancelled = false;
    async function fetchProperties() {
      setLoading(true);
      setError('');
      try {
        const { data, error: dbError } = await supabase
          .from('listings')
          .select('id,title,location,price,property_type,bedrooms,bathrooms,parking,slug,created_at,main_image,images,purpose,is_featured,currency')
          .eq('is_published', true)
          .neq('title', '')
          .gt('price', 0)
          .in('status', ['available', 'under_contract'])
          .order('created_at', { ascending: false })
          .limit(12);

        if (dbError) throw dbError;
        if (cancelled) return;

        const rows = (data || []) as ListingRow[];
        const mapped = rows.map(mapRow);
        setProperties(mapped);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load properties');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProperties();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setCurrentSlide(0);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const getCardWidth = () => {
    if (typeof window === 'undefined') return 320;
    if (window.innerWidth >= 1024) return 360;
    if (window.innerWidth >= 768) return 320;
    return 280;
  };

  if (error) {
    return (
      <section id="properties" className="relative py-16 px-6 bg-[#f7f8fa]">
        <div className="max-w-6xl mx-auto text-center">
          <div className="w-14 h-14 flex items-center justify-center bg-red-50 rounded-full mx-auto mb-4">
            <i className="ri-error-warning-line text-xl text-red-400"></i>
          </div>
          <h2 className="font-roboto font-bold text-xl text-primary mb-2">Couldn&apos;t load properties</h2>
          <p className="text-sm text-stone-500 font-roboto mb-5">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
          >
            <i className="ri-refresh-line"></i>Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="properties" className="relative py-16 px-6 bg-[#f7f8fa]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-6 md:mb-10 gap-3 md:gap-4">
          <div>
            <p className="mb-1.5 md:mb-3 font-roboto text-xs sm:text-sm md:text-base font-bold uppercase tracking-[0.12em] sm:tracking-[0.16em] md:tracking-[0.2em] whitespace-nowrap text-golden">
              Exclusive
            </p>
            <h2 className="mb-1 md:mb-2 font-roboto font-bold text-2xl md:text-3xl text-primary">
              Prime Residential Homes You&apos;ll Love
            </h2>
            <p className="text-xs sm:text-sm md:text-base font-roboto font-bold uppercase tracking-[0.12em] sm:tracking-[0.16em] md:tracking-[0.2em] text-golden">
              Properties for sale and rent in Nairobi
            </p>
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto ml-auto md:ml-0">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="w-10 h-10 flex items-center justify-center border transition-all duration-200 cursor-pointer whitespace-nowrap border-gray-200 text-gray-300 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous"
            >
              <i className="ri-arrow-left-s-line text-xl"></i>
            </button>
            <button
              onClick={nextSlide}
              disabled={currentSlide >= totalSlides - 1}
              className="w-10 h-10 flex items-center justify-center border transition-all duration-200 cursor-pointer whitespace-nowrap border-primary text-primary hover:bg-primary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next"
            >
              <i className="ri-arrow-right-s-line text-xl"></i>
            </button>
          </div>
        </div>

        {loading ? (
          <>
            {/* Mobile loading skeleton */}
            <div className="grid md:hidden grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white overflow-hidden animate-pulse">
                  <div className={`w-full bg-stone-200 ${aspectClass}`}></div>
                  <div className="p-4 space-y-3">
                    <div className="h-3 bg-stone-200 rounded w-1/2"></div>
                    <div className="h-4 bg-stone-200 rounded w-3/4"></div>
                    <div className="flex gap-4">
                      <div className="h-3 bg-stone-200 rounded w-16"></div>
                      <div className="h-3 bg-stone-200 rounded w-16"></div>
                      <div className="h-3 bg-stone-200 rounded w-16"></div>
                    </div>
                    <div className="pt-3 border-t border-stone-100 flex justify-between">
                      <div className="h-5 bg-stone-200 rounded w-24"></div>
                      <div className="h-3 bg-stone-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop loading skeleton */}
            <div className="hidden md:flex gap-5 overflow-hidden">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex-shrink-0 bg-white overflow-hidden animate-pulse" style={{ width: getCardWidth() }}>
                  <div className={`w-full bg-stone-200 ${aspectClass}`}></div>
                  <div className="p-4 space-y-3">
                    <div className="h-3 bg-stone-200 rounded w-1/2"></div>
                    <div className="h-4 bg-stone-200 rounded w-3/4"></div>
                    <div className="flex gap-4">
                      <div className="h-3 bg-stone-200 rounded w-16"></div>
                      <div className="h-3 bg-stone-200 rounded w-16"></div>
                      <div className="h-3 bg-stone-200 rounded w-16"></div>
                    </div>
                    <div className="pt-3 border-t border-stone-100 flex justify-between">
                      <div className="h-5 bg-stone-200 rounded w-24"></div>
                      <div className="h-3 bg-stone-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : properties.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-4">
              <i className="ri-building-line text-xl text-stone-300"></i>
            </div>
            <h3 className="font-roboto font-bold text-lg text-primary mb-2">No Properties Listed Yet</h3>
            <p className="text-sm text-stone-500 font-roboto">Check back soon for new listings.</p>
          </div>
        ) : (
          <>
            {/* Mobile grid */}
            <div className="grid md:hidden grid-cols-1 sm:grid-cols-2 gap-4">
              {properties.slice(0, 4).map((property) => (
                <PropertyCard key={property.id} property={property} aspectClass={aspectClass} shadowClass={shadowClass} hoverClass={hoverClass} showBadge={showBadge} showAgent={showAgent} badgeColor={badgeColor} />
              ))}
            </div>

            {/* Desktop carousel */}
            <div className="hidden md:block overflow-hidden">
              <div
                className="flex items-stretch gap-5 transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * (getCardWidth() + 20)}px)` }}
              >
                {properties.map((property) => (
                  <div key={property.id} className="flex-shrink-0 flex flex-col" style={{ width: getCardWidth() }}>
                    <PropertyCard property={property} aspectClass={aspectClass} shadowClass={shadowClass} hoverClass={hoverClass} showBadge={showBadge} showAgent={showAgent} badgeColor={badgeColor} />
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`transition-all duration-300 cursor-pointer whitespace-nowrap rounded-full ${
                    i === currentSlide ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-gray-300 hover:bg-primary/40'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                ></button>
              ))}
            </div>
          </>
        )}

        <div className="mt-10 text-center">
          <Link
            to="/all-properties"
            className="inline-flex items-center gap-2 bg-primary hover:bg-[#002349] text-white px-16 py-3.5 text-sm font-roboto transition-colors cursor-pointer whitespace-nowrap"
          >
            View More Properties
            <i className="ri-arrow-right-line"></i>
          </Link>
        </div>
      </div>
    </section>
  );
}

interface PropertyCardProps {
  property: Property;
  aspectClass: string;
  shadowClass: string;
  hoverClass: string;
  showBadge: boolean;
  showAgent: boolean;
  badgeColor: string;
}

function PropertyCard({ property, aspectClass, shadowClass, hoverClass, showBadge, showAgent, badgeColor }: PropertyCardProps) {
  return (
    <Link to={`/property/${property.slug}`} className="block">
      <div className={`bg-white overflow-hidden transition-all duration-300 group cursor-pointer flex flex-col w-full h-full ${shadowClass} ${hoverClass}`}>
        <div className={`relative w-full overflow-hidden flex-shrink-0 ${aspectClass}`}>
          <img
            alt={property.title}
            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
            src={property.image}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-100 transition-opacity duration-300 group-hover:from-black/40"></div>
          {showBadge && (
            <div className="absolute top-3 left-3 z-10">
              <span
                className="inline-block text-[9px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1.5 whitespace-nowrap text-white rounded-sm"
                style={{ backgroundColor: badgeColor }}
              >
                For {property.type === 'sale' ? 'Sale' : 'Rent'}
              </span>
            </div>
          )}
          {property.featured && (
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-block text-[9px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1.5 whitespace-nowrap bg-golden text-white rounded-sm">
                Featured
              </span>
            </div>
          )}
          <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 rounded-sm">
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-image-line text-xs"></i>
              </span>
              6
            </span>
          </div>
          <div className="absolute bottom-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 rounded-sm">
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-expand-diagonal-line text-xs"></i>
              </span>
              Preview
            </span>
          </div>
        </div>
        <div className="flex flex-col flex-1" style={{ padding: '16px 20px' }}>
          <p className="flex items-center gap-1 truncate" style={{ color: 'rgb(99, 99, 99)', fontSize: '13px', marginBottom: '6px' }}>
            <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
              <i className="ri-map-pin-line text-xs" style={{ color: 'rgb(99, 99, 99)' }}></i>
            </span>
            <span className="truncate">{property.location}</span>
          </p>
          <h3 className="leading-snug line-clamp-2 group-hover:transition-colors" style={{ color: 'rgb(1, 19, 40)', fontSize: '15px', fontWeight: 500, textTransform: 'none', marginBottom: '10px' }}>
            {property.title}
          </h3>
          <div className="flex items-center gap-4 text-xs whitespace-nowrap mb-3" style={{ color: 'rgb(54, 53, 53)', fontSize: '12px' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-hotel-bed-line text-xs" style={{ color: 'rgb(99, 99, 99)' }}></i></span>
              <span>{property.beds} Beds</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0"><i className="ri-drop-line text-xs" style={{ color: 'rgb(99, 99, 99)' }}></i></span>
              <span>{property.baths} Baths</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-car-line text-xs" style={{ color: 'rgb(99, 99, 99)' }}></i></span>
              <span>{property.parking} Parking</span>
            </span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgb(31, 31, 31)' }}>{property.category}</p>
          {showAgent && property.agent && (
            <div className="flex items-center gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid rgb(214, 214, 214)' }}>
              <img
                src={property.agent.photo}
                alt={property.agent.name}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="text-xs text-stone-500 font-roboto">{property.agent.name}</span>
            </div>
          )}
          <div className="mt-auto pt-3 flex items-end justify-between gap-2" style={{ borderTop: '1px solid rgb(214, 214, 214)' }}>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold leading-tight whitespace-nowrap" style={{ color: 'rgb(0, 35, 73)', fontSize: '21px', fontWeight: 500 }}>
                {property.price}
                {property.priceUnit && (
                  <span className="relative inline-flex items-baseline cursor-help">
                    <span className="font-inherit" style={{ opacity: 1, fontSize: 'inherit', color: 'rgb(0, 35, 73)' }}>{property.priceUnit}</span>
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="flex items-center gap-1 whitespace-nowrap flex-shrink-0" style={{ color: 'rgb(0, 87, 51)', fontSize: '12px', fontWeight: 500, textTransform: 'capitalize' }}>
                <i className="ri-time-line" style={{ fontSize: '12px' }}></i>Listed {property.listedDays} days ago
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}