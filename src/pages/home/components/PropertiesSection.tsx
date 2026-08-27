import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { normalizePropertyImages, type NormalizedImage } from '@/lib/propertyImages';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { formatLocation, formatAreaName, smartTitleCase } from '@/lib/location';
import QuickViewModal from '@/components/feature/QuickViewModal';
import PropertyCard, { type Property } from './PropertyCard';
import Pagination from '@/components/feature/Pagination';

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
  parking: number | null;
  sqft: number | null;
  land_size: number | null;
  acreage: number | null;
  land_unit: string | null;
  slug: string | null;
  created_at: string;
  main_image: string | null;
  cover_image: string | null;
  images: string[] | null;
  purpose: string;
  is_featured: boolean;
  currency: string;
  sub_type: string | null;
  new_home?: boolean | null;
  refurbished?: boolean | null;
  reduced_price?: boolean | null;
  back_on_market?: boolean | null;
  property_of_the_week?: boolean | null;
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
  const title = smartTitleCase(row.title || 'Untitled Property');
  const slug = row.slug || buildSlug(row.id, title);
  const images: NormalizedImage[] = normalizePropertyImages({
    coverImage: row.cover_image,
    mainImage: row.main_image,
    images: row.images,
    title,
  });

  return {
    id: row.id,
    slug,
    title,
    location: formatLocation({
      address: row.address,
      neighbourhood: row.neighbourhood,
      location: row.location,
      city: row.city,
      state_region: row.state_region,
    }),
    area: formatAreaName({
      address: row.address,
      neighbourhood: row.neighbourhood,
      location: row.location,
      city: row.city,
    }),
    type: row.purpose === 'rent' ? 'rent' : 'sale',
    category: toCategoryLabel(row.property_type || 'house'),
    propertyType: row.property_type || '',
    beds: row.bedrooms ?? 0,
    baths: row.bathrooms ?? 0,
    parking: row.parking ?? 0,
    sqft: Number(row.sqft ?? 0),
    landSize: Number(row.land_size ?? 0),
    acreage: Number(row.acreage ?? 0),
    landUnit: row.land_unit || undefined,
    priceRaw: row.price || 0,
    currency: row.currency || 'KES',
    priceUnit: row.purpose === 'rent' ? 'pm' : undefined,
    images,
    featured: row.is_featured || false,
    justListed: (Date.now() - new Date(row.created_at).getTime()) / 86400000 <= 3,
    newHome: Boolean(row.new_home),
    reduced: Boolean(row.reduced_price),
    refurbished: Boolean(row.refurbished),
    backOnMarket: Boolean(row.back_on_market),
    propertyOfTheWeek: Boolean(row.property_of_the_week),
    isJointVenture: (row.sub_type || '').toLowerCase() === 'joint_venture',
    createdAt: row.created_at,
  };
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'featured', label: 'Featured' },
  { key: 'sale', label: 'For Sale' },
  { key: 'rent', label: 'To Let' },
  { key: 'commercial', label: 'Commercial' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

interface PropertiesSectionProps {
  searchQuery?: string;
}

export default function PropertiesSection({ searchQuery = '' }: PropertiesSectionProps) {
  const [tab, setTab] = useState<TabKey>('all');
  const [page, setPage] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quickViewProperty, setQuickViewProperty] = useState<Property | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const { getCardStyle } = useSiteSettings();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const totalPages = Math.max(1, Math.ceil(properties.length / cardsPerView));
  const maxPage = Math.max(0, totalPages - 1);

  const cardShadow = getCardStyle('card_shadow') === 'true';
  const cardHoverLift = getCardStyle('card_hover_lift') === 'true';
  const showBadge = getCardStyle('card_show_badge') !== 'false';
  const imageRatio = getCardStyle('card_image_ratio') || '4/3';

  const aspectClass = {
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    '3/2': 'aspect-[3/2]',
    '1/1': 'aspect-square',
  }[imageRatio] || 'aspect-[4/3]';

  const shadowClass = cardShadow ? 'shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)]' : '';
  const hoverClass = cardHoverLift ? 'hover:-translate-y-1' : '';

  useEffect(() => {
    let cancelled = false;
    async function fetchProperties() {
      setLoading(true);
      setError('');
      try {
        let query = supabase
          .from('listings')
          .select('id,title,location,address,neighbourhood,city,state_region,price,property_type,sub_type,bedrooms,bathrooms,parking,sqft,land_size,acreage,land_unit,slug,created_at,main_image,cover_image,images,purpose,is_featured,currency,new_home,refurbished,reduced_price,back_on_market,property_of_the_week')
          .eq('is_published', true)
          .neq('title', '')
          .gt('price', 0)
          .in('status', ['available', 'under_contract'])
          .order('created_at', { ascending: false })
          .limit(36);

        if (tab === 'featured') {
          query = query.eq('is_featured', true).eq('property_category', 'residential').neq('is_new_development', true);
        } else if (tab === 'sale') {
          query = query.eq('purpose', 'sale').eq('property_category', 'residential').neq('is_new_development', true);
        } else if (tab === 'rent') {
          query = query.eq('purpose', 'rent').eq('property_category', 'residential').neq('is_new_development', true);
        } else if (tab === 'commercial') {
          query = query.eq('property_category', 'commercial');
        } else {
          query = query.eq('property_category', 'residential').neq('is_new_development', true);
        }

        if (searchQuery.trim()) {
          query = query.or(
            `title.ilike.%${searchQuery.trim()}%,location.ilike.%${searchQuery.trim()}%,property_type.ilike.%${searchQuery.trim()}%`,
          );
        }

        const { data, error: dbError } = await query;

        if (dbError) throw dbError;
        if (cancelled) return;

        const rows = (data || []) as ListingRow[];
        setProperties(rows.map(mapRow));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load properties');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProperties();
    return () => {
      cancelled = true;
    };
  }, [searchQuery, tab]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, tab]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setCardsPerView(w >= 1024 ? 3 : w >= 768 ? 2 : 1);
      setPage(0);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-rotate listings every minute (pauses on hover/touch)
  useEffect(() => {
    if (totalPages <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setPage((prev) => (prev >= maxPage ? 0 : prev + 1));
    }, 60000);
    return () => clearInterval(interval);
  }, [totalPages, maxPage, isPaused]);

  const nextSlide = useCallback(() => setPage((prev) => Math.min(prev + 1, maxPage)), [maxPage]);
  const prevSlide = useCallback(() => setPage((prev) => Math.max(prev - 1, 0)), []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  }, [nextSlide, prevSlide]);

  const headingText =
    tab === 'rent'
      ? 'Prime Homes for Rent'
      : tab === 'sale'
        ? 'Prime Homes for Sale'
        : tab === 'commercial'
          ? 'Commercial Properties'
          : 'Prime Residential Homes You\u2019ll Love';

  if (error) {
    return (
      <section id="properties" className="relative py-8 md:py-16 px-4 md:px-6 bg-[#f7f8fa]">
        <div className="max-w-6xl mx-auto text-center">
          <div className="w-14 h-14 flex items-center justify-center bg-red-50 rounded-full mx-auto mb-4">
            <i className="ri-error-warning-line text-xl text-red-400"></i>
          </div>
          <h2 className="font-roboto font-bold text-xl text-primary mb-2">Couldn&apos;t load properties</h2>
          <p className="text-sm text-stone-500 font-roboto mb-5">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
          >
            <i className="ri-refresh-line"></i>Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="properties" className="relative py-8 md:py-16 px-4 md:px-6 bg-[#f7f8fa]">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-2 md:mb-3 gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-roboto font-bold text-xl sm:text-2xl md:text-4xl text-primary leading-tight">
              {headingText}
            </h2>
            <p className="mt-2 text-sm sm:text-base md:text-lg font-roboto font-bold uppercase tracking-[0.12em] sm:tracking-[0.16em] md:tracking-[0.2em] text-golden">
              {tab === 'rent'
                ? 'Properties for rent in Nairobi'
                : tab === 'sale'
                  ? 'Properties for sale in Nairobi'
                  : tab === 'commercial'
                    ? 'Commercial spaces in Nairobi'
                    : 'Properties for sale and rent in Nairobi'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1 md:mt-2">
            <button
              onClick={prevSlide}
              disabled={page === 0}
              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center border-2 border-[#002349] text-[#002349] bg-white hover:bg-[#002349] hover:text-white transition-all duration-200 cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous properties"
            >
              <i className="ri-arrow-left-s-line text-base md:text-xl"></i>
            </button>
            <button
              onClick={nextSlide}
              disabled={page >= maxPage}
              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center border-2 border-[#002349] text-[#002349] bg-white hover:bg-[#002349] hover:text-white transition-all duration-200 cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next properties"
            >
              <i className="ri-arrow-right-s-line text-base md:text-xl"></i>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
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
                </div>
              </div>
            ))}
          </div>
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
            <div
              className="overflow-hidden -mx-2.5"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${page * 100}%)` }}
              >
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className="flex-shrink-0 px-2.5"
                    style={{ width: `${100 / cardsPerView}%` }}
                  >
                    <PropertyCard
                      property={property}
                      aspectClass={aspectClass}
                      shadowClass={shadowClass}
                      hoverClass={hoverClass}
                      showBadge={showBadge}
                      onQuickView={setQuickViewProperty}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Uniform numbered pagination */}
            <Pagination
              currentPage={page + 1}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p - 1)}
            />
          </>
        )}

        <div className="mt-10">
          <Link
            to="/all-properties"
            className="group flex w-full items-center justify-center gap-2 bg-primary hover:bg-[#002349] text-white border-2 border-primary px-12 py-3.5 text-lg font-roboto font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="relative">
              View More Properties
              <span className="absolute left-0 -bottom-1.5 h-[2px] w-0 bg-current transition-all duration-300 group-hover:w-full"></span>
            </span>
            <i className="ri-arrow-right-line"></i>
          </Link>
        </div>
      </div>

      <QuickViewModal
        isOpen={quickViewProperty !== null}
        onClose={() => setQuickViewProperty(null)}
        property={
          quickViewProperty
            ? {
                id: quickViewProperty.id,
                slug: quickViewProperty.slug,
                title: quickViewProperty.title,
                price: '',
                rawPrice: quickViewProperty.priceRaw,
                currency: quickViewProperty.currency,
                priceUnit: quickViewProperty.priceUnit,
                location: quickViewProperty.location,
                category: quickViewProperty.category,
                beds: quickViewProperty.beds,
                baths: quickViewProperty.baths,
                parking: quickViewProperty.parking,
                description: '',
                images: quickViewProperty.images.map((img) => img.url),
                type: quickViewProperty.type,
                agentPhone: '',
                agentEmail: '',
              }
            : null
        }
      />
    </section>
  );
}