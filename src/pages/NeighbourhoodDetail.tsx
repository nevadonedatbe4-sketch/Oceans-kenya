import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { withReturnFrom } from '@/lib/navigation';
import { areaSearchHref } from '@/lib/areaSearch';
import NearbyAreaStrip from '@/components/feature/NearbyAreaStrip';
import AreaOverviewSidebar from '@/components/feature/AreaOverviewSidebar';
import { supabase } from '@/lib/supabase';
import { NON_PUBLIC_STATUS_LIST } from '@/lib/publicListings';
import { getPropertySpecs } from '@/lib/propertySpecs';
import Header from '@/components/feature/Header';
import PageBreadcrumbTrail from '@/components/feature/PageBreadcrumbTrail';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import PropertyBadge from '@/components/feature/PropertyBadge';
import NeighbourhoodAmenities from '@/components/feature/NeighbourhoodAmenities';
import LifeAroundHere from '@/components/feature/LifeAroundHere';
import { useCurrency } from '@/hooks/useCurrency';
import { useNeighbourhoodCommutes } from '@/hooks/useNeighbourhoodCommutes';
import { smartTitleCase } from '@/lib/location';
import { usePageContent } from '@/hooks/usePageContent';
import { DEFAULT_NEIGH_DETAIL } from '@/lib/pageCopy';
import EntityImage from '@/components/feature/EntityImage';

interface DBListing {
  id: string;
  title: string;
  slug: string;
  location: string;
  price: number;
  currency: string | null;
  price_prefix: string | null;
  price_postfix: string | null;
  purpose: string;
  status: string;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  size: number | null;
  sqft: number | null;
  land_size: number | null;
  acreage: number | null;
  land_unit: string | null;
  main_image: string | null;
  cover_image: string | null;
  images: string[] | null;
  neighbourhood: string | null;
  city: string | null;
}

interface DBNeighbourhood {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  hero_image: string | null;
  summary: string | null;
  description: string | null;
  tags: string[] | null;
  vibe: string | null;
  target_market: string | null;
  content_html: string | null;
  expat_guide: string | null;
  practical_info: string | null;
  average_sale_price: number | null;
  rental_range_kes: string | null;
  latitude: number | null;
  longitude: number | null;
  propertyCount: number;
}

function Reveal({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  // Area-guide content renders immediately. The scroll-gated reveal that used
  // to hide each section until it entered the viewport has been removed, so the
  // whole guide is present the moment the page opens.
  return <div className={className}>{children}</div>;
}

export default function NeighbourhoodDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { pathname, search } = useLocation();
  const currentPath = `${pathname}${search}`;
  const [neighbourhood, setNeighbourhood] = useState<DBNeighbourhood | null>(null);
  const [listings, setListings] = useState<DBListing[]>([]);
  const [nearbyHoods, setNearbyHoods] = useState<DBNeighbourhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyTab, setPropertyTab] = useState<'sale' | 'rent'>('rent');
  const { content: c } = usePageContent('neigh_detail', DEFAULT_NEIGH_DETAIL);

  // Anchor for the amenities section (kept for deep-linking / scroll targets).
  const amenitiesAnchorRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const { data: dbHood, error: hoodError } = await supabase
        .from('neighbourhoods')
        .select(
          'id, name, slug, city, country, hero_image, summary, description, tags, vibe, target_market, content_html, expat_guide, practical_info, average_sale_price, rental_range_kes, latitude, longitude'
        )
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (!hoodError && dbHood) {
        // Same fallback as the list page: if the hero_image column is empty but
        // a gallery image exists (uploaded via the admin Gallery tab), use it so
        // the area hero never renders as a blank image.
        let resolvedHero = dbHood.hero_image || '';
        if (!resolvedHero) {
          const { data: galRows } = await supabase
            .from('neighbourhood_images')
            .select('url')
            .eq('neighbourhood_id', dbHood.id)
            .order('sort_order', { ascending: true })
            .limit(1);
          if (galRows && galRows.length > 0 && galRows[0].url) resolvedHero = galRows[0].url;
        }

        const { data: dbListings } = await supabase
          .from('all_listings')
          .select(
            'id, title, slug, location, price, currency, price_prefix, price_postfix, purpose, status, property_type, bedrooms, bathrooms, parking, size, sqft, land_size, acreage, land_unit, main_image, cover_image, images, neighbourhood, city'
          )
          .eq('is_published', true)
          .not('status', 'in', NON_PUBLIC_STATUS_LIST)
          .or(`location.ilike.%${dbHood.name}%,neighbourhood.ilike.%${dbHood.name}%,address.ilike.%${dbHood.name}%,city.ilike.%${dbHood.name}%`);

        const { data: nearbyData } = await supabase
          .from('neighbourhoods')
          .select('id, name, slug, hero_image, summary, tags')
          .eq('is_published', true)
          .neq('id', dbHood.id)
          .order('sort_order', { ascending: true })
          .limit(4);

        const enrichedNearby: DBNeighbourhood[] = (nearbyData || []).map((n) => ({
          id: n.id,
          name: smartTitleCase(n.name),
          slug: n.slug,
          city: dbHood.city,
          country: dbHood.country,
          hero_image: n.hero_image,
          summary: n.summary,
          description: null,
          tags: (n.tags || []).map((t) => smartTitleCase(t)).filter(Boolean),
          vibe: null,
          target_market: null,
          content_html: null,
          expat_guide: null,
          practical_info: null,
          average_sale_price: null,
          rental_range_kes: null,
          latitude: null,
          longitude: null,
          propertyCount: 0,
        }));
        setNearbyHoods(enrichedNearby);

        const enriched: DBNeighbourhood = {
          ...dbHood,
          hero_image: resolvedHero,
          // Normalise the neighbourhood title through the shared casing normaliser
          // so it matches the rest of the site.
          name: smartTitleCase(dbHood.name),
          // Same normaliser over tags so badges read consistently site-wide.
          tags: (dbHood.tags || []).map((t) => smartTitleCase(t)).filter(Boolean),
          propertyCount: (dbListings || []).length,
        };
        setNeighbourhood(enriched);
        setListings(dbListings || []);
      } else {
        setNeighbourhood(null);
        setListings([]);
        setNearbyHoods([]);
        setLoading(false);
        return;
      }
    } catch {
      setNeighbourhood(null);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { format } = useCurrency();
  const commutes = useNeighbourhoodCommutes();

  const saleListings = listings.filter((l) => l.purpose === 'sale');
  const rentListings = listings.filter((l) => l.purpose === 'rent');

  // Location line on each card: prefer the listing's own location, otherwise
  // fall back to the neighbourhood (and append the city when it adds context)
  // so the card never shows a blank pin.
  const listingLocation = (p: DBListing) => {
    const primary = smartTitleCase((p.location || '').trim() || (p.neighbourhood || '').trim());
    const city = smartTitleCase((p.city || '').trim());
    if (!primary) return city;
    if (city && !primary.toLowerCase().includes(city.toLowerCase())) {
      return `${primary}, ${city}`;
    }
    return primary;
  };

  // Compact facts shown on a card. When a record has no measurable facts
  // (e.g. a listing with no beds / baths / size captured yet) fall back to a
  // neutral "Details on request" chip so the metadata row is never blank.
  const listingSpecs = (p: DBListing) => {
    const specs = getPropertySpecs(p.property_type, {
      beds: p.bedrooms ?? 0,
      baths: p.bathrooms ?? 0,
      parking: p.parking ?? 0,
      sqft: Number(p.sqft ?? 0),
      acreage: Number(p.acreage ?? 0),
      landSize: Number(p.land_size ?? 0),
      landUnit: p.land_unit || undefined,
    });
    if (specs.length > 0) return specs;
    return [{ key: 'details-on-request', icon: 'ri-information-line', label: 'Details on request' }];
  };

  if (!neighbourhood && !loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-32 md:pt-40 lg:pt-44 pb-20 px-4 md:px-6">
          <div className="max-w-[1400px] mx-auto text-center">
            <h1 className="font-roboto font-bold text-3xl text-primary mb-4">{c.notfound_title}</h1>
            <p className="font-roboto text-stone-500 mb-6">
              {c.notfound_text}
            </p>
            <Link
              to="/neighbourhoods"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-sm font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              {c.notfound_button}
              <i className="ri-arrow-right-line text-xs"></i>
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative pt-28 md:pt-40 lg:pt-44 pb-16 md:pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <EntityImage
            alt={neighbourhood?.name || 'Neighbourhood'}
            className="w-full h-full object-cover object-center"
            src={neighbourhood?.hero_image}
          />
          <div className="absolute inset-0 bg-primary/75"></div>
        </div>
        <div className="relative max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="flex flex-wrap gap-2 mb-3">
            {neighbourhood?.tags?.map((tag) => (
              <span key={tag} className="px-2.5 py-1 bg-white/15 backdrop-blur-sm text-white text-xs font-roboto font-medium rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.35em] mb-2">
            {neighbourhood?.propertyCount} {c.hero_badge_suffix}
          </p>
          <h1 className="font-roboto font-bold text-2xl md:text-5xl text-white mb-4 leading-tight">
            {neighbourhood?.name} {c.hero_title_suffix}
          </h1>
          <p className="font-roboto text-white/80 text-sm md:text-base max-w-2xl leading-relaxed">
            {neighbourhood?.summary || ''}
          </p>
        </div>
      </section>

      <main className="mobile-flat-headings px-3 md:px-6 py-10 md:py-16 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <PageBreadcrumbTrail
            className="mb-6 md:mb-8"
            items={[
              { label: 'Home', to: '/' },
              { label: 'Nairobi', to: '/neighbourhoods' },
              { label: neighbourhood?.name || 'Neighbourhood' },
            ]}
          />
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-10 items-start">
          <div className="min-w-0">
          {/* Active Listings */}
          <Reveal>
          <section className="mb-12 md:mb-16">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-1">{c.listings_eyebrow}</p>
                <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary">
                  {c.listings_heading_prefix} {neighbourhood?.name}
                </h2>
              </div>
              <Link
                to={areaSearchHref(neighbourhood?.name || '')}
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 text-sm font-roboto font-medium text-primary border border-primary/20 rounded-sm hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
              >
                {c.view_all_label}
                <i className="ri-arrow-right-line"></i>
              </Link>
            </div>

            <div className="flex items-center gap-1 border-b border-stone-100 mb-6">
              {[
                { key: 'sale' as const, label: c.tab_sale, count: saleListings.length },
                { key: 'rent' as const, label: c.tab_rent, count: rentListings.length },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setPropertyTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-roboto transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                    propertyTab === t.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-stone-400 hover:text-stone-600'
                  }`}
                >
                  {t.label}
                  <span className="px-1.5 py-0.5 bg-stone-100 text-xs rounded-full text-stone-500">{t.count}</span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-stone-50 rounded-lg h-72 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {(propertyTab === 'sale' ? saleListings : rentListings).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                    {(propertyTab === 'sale' ? saleListings : rentListings).map((p) => (
                      <Link
                        key={p.id}
                        to={withReturnFrom(`/property/${p.slug}`, currentPath)}
                        className="group cursor-pointer block bg-white rounded-lg overflow-hidden border-2 border-primary/12 hover:border-primary/12 transition-all duration-300"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <img
                            alt={p.title}
                            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                            src={p.main_image || p.cover_image || (p.images && p.images[0]) || ''}
                          />
                          <PropertyBadge variant={propertyTab === 'sale' ? 'sale' : 'rent'} className="absolute top-2.5 left-2.5" />
                        </div>
                        <div className="p-3.5 md:p-4">
                          <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-wider mb-1">
                            {p.property_type}
                          </p>
                          <h3 className="font-roboto font-bold text-sm md:text-base text-primary leading-snug mb-2 line-clamp-2">
                            {smartTitleCase(p.title)}
                          </h3>
                          {listingLocation(p) && (
                            <p className="font-roboto text-stone-400 text-xs mb-3 flex items-center gap-1">
                              <i className="ri-map-pin-line"></i>
                              {listingLocation(p)}
                            </p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap text-stone-400 text-xs font-roboto mb-3">
                            {listingSpecs(p).map((spec) => (
                              <span key={spec.key} className="flex items-center gap-1"><i className={spec.icon}></i> {spec.label}</span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
                            <p className="font-roboto text-primary text-[20px] font-semibold">{format(p.price, (p.currency || 'KES') as 'KES' | 'USD' | 'GBP' | 'EUR')}</p>
                            {p.price > 0 && propertyTab === 'rent' && (
                              <p className="font-roboto text-stone-400 text-xs uppercase">per month</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-stone-50 rounded-lg border-2 border-primary/12">
                    <div className="w-12 h-12 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-3">
                      <i className="ri-home-4-line text-stone-400 text-xl"></i>
                    </div>
                    <p className="font-roboto font-bold text-base text-primary mb-1">
                      {propertyTab === 'sale' ? c.empty_sale_title : c.empty_rent_title}
                    </p>
                    <p className="font-roboto text-stone-400 text-xs max-w-md mx-auto mb-4">
                      New listings come in regularly in {neighbourhood?.name}. {c.empty_text_suffix}
                    </p>
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                      {c.empty_button}
                      <i className="ri-arrow-right-line text-xs"></i>
                    </Link>
                  </div>
                )}
              </>
            )}
          </section>
          </Reveal>

          {/* Map */}
          <Reveal>
          <section className="mb-12 md:mb-16">
            <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">{c.location_heading}</h2>
            <div className="w-full h-56 md:h-80 rounded-lg overflow-hidden border border-primary/12">
              <iframe
                allowFullScreen
                className="w-full h-full"
                src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255282.32335424927!2d36.78258701714773!3d-1.262861158456208!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f107ba5a6c4c49%3A0x6b6651a6e9b1a63c!2s${encodeURIComponent(neighbourhood?.name || '')}%2C%20${encodeURIComponent(neighbourhood?.city || 'Nairobi')}!5e0!3m2!1sen!2ske!4v1700000000000`}
                title={`${neighbourhood?.name} map`}
              ></iframe>
            </div>
          </section>
          </Reveal>

          </div>

          <AreaOverviewSidebar
            eyebrow={c.sidebar_eyebrow}
            heading={c.sidebar_heading}
            intro={neighbourhood?.description || neighbourhood?.summary || ''}
            facts={[
              {
                label: 'Price Range (2026)',
                value: neighbourhood?.average_sale_price
                  ? format(neighbourhood.average_sale_price, 'KES')
                  : 'Contact us',
              },
              { label: 'Rental Range', value: neighbourhood?.rental_range_kes || 'Contact us' },
              { label: 'Best Suited For', value: neighbourhood?.target_market || '\u2014' },
              {
                label: 'Drive to CBD',
                value:
                  commutes[neighbourhood?.slug || '']?.minutes != null
                    ? `~${commutes[neighbourhood!.slug].minutes} min${
                        commutes[neighbourhood!.slug].km != null
                          ? ` (${commutes[neighbourhood!.slug].km} km)`
                          : ''
                      }`
                    : '\u2014',
              },
            ]}
            footer={
              <Link
                to={areaSearchHref(neighbourhood?.name || '')}
                className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-roboto font-semibold uppercase tracking-wider rounded-sm hover:bg-primary/90 transition-colors whitespace-nowrap cursor-pointer"
              >
                {c.sidebar_button_prefix} {neighbourhood?.name} {c.sidebar_button_suffix}
                <i className="ri-arrow-right-line"></i>
              </Link>
            }
          />
          </div>

          {/* Lifestyle & Amenities - full container width, right after the map */}
          <Reveal>
            <div ref={amenitiesAnchorRef} className="scroll-mt-20 md:scroll-mt-24">
              {neighbourhood?.id && (
                <NeighbourhoodAmenities
                  neighbourhoodId={neighbourhood.id}
                  neighbourhoodName={neighbourhood.name}
                  lat={neighbourhood.latitude}
                  lng={neighbourhood.longitude}
                />
              )}
            </div>
          </Reveal>

          {/* Life Around Here - everyday essentials snapshot */}
          <Reveal>
            {neighbourhood?.id && (
              <LifeAroundHere
                neighbourhoodId={neighbourhood.id}
                neighbourhoodName={neighbourhood.name}
                lat={neighbourhood.latitude}
                lng={neighbourhood.longitude}
              />
            )}
          </Reveal>

          {/* Nearby Areas */}
          <Reveal>
          <section className="mb-12 md:mb-16">
            <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-5">{c.nearby_heading}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {nearbyHoods.slice(0, 4).map((n) => (
                <Link
                  key={n.id}
                  to={`/neighbourhood/${n.slug}`}
                  className="relative overflow-hidden rounded-lg group cursor-pointer block aspect-[4/3]"
                >
                  <img
                    alt={n.name}
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    src={n.hero_image || ''}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-3 left-3">
                    <h3 className="text-white text-base font-roboto font-bold leading-tight">{n.name}</h3>
                    {n.propertyCount > 0 && (
                      <p className="text-white/70 text-xs font-roboto mt-0.5">{n.propertyCount} {c.nearby_property_word}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
          </Reveal>

          {/* Neighbouring areas - wired to the same filtered area search */}
          <NearbyAreaStrip
            label={neighbourhood?.name || ''}
            heading={c.strip_heading}
            description={`${c.strip_desc_prefix} ${neighbourhood?.name || 'this area'} - ${c.strip_desc_suffix}`}
            className="mb-12 md:mb-16"
          />

          {/* CTA */}
          <Reveal>
          <div className="text-center bg-stone-50 py-12 md:py-16 px-4 md:px-6 rounded-lg">
            <h3 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-3">
              {c.cta_title_prefix} {neighbourhood?.name}
            </h3>
            <p className="font-roboto text-stone-500 text-sm max-w-xl mx-auto mb-6">
              {c.cta_text}
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2.5 px-8 md:px-10 py-4 bg-primary text-white border-2 border-primary text-base font-roboto font-semibold tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              {c.cta_button}
              <i className="ri-arrow-right-line text-sm"></i>
            </Link>
          </div>
          </Reveal>

          {/* Top Neighbourhoods Comparison Table */}
          <Reveal>
          <section className="mt-16">
            <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-2">{c.compare_heading}</h2>
            <p className="font-roboto text-stone-500 text-sm mb-6">{c.compare_sub}</p>
            <div className="overflow-x-auto rounded-lg border-2 border-primary/12">
              <table className="w-full text-xs font-roboto">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Neighbourhood</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Best For</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Vibe</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Price Range</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Drive to CBD</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Safety</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Nightlife</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Nature</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Karen', best: 'Families, Nature', vibe: 'Quiet, Green', price: 'KES 35M-245M+', cbd: '25-35 min', safety: 'Very High', nightlife: 'Quiet', nature: 'Excellent' },
                    { name: 'Westlands', best: 'Nightlife, Business', vibe: 'Urban, Fast', price: 'KES 36M-104M', cbd: '8-15 min', safety: 'Moderate-Good', nightlife: 'Best in City', nature: 'Limited' },
                    { name: 'Kilimani', best: 'Young Pros, Walkable', vibe: 'Cosmopolitan', price: 'KES 33M-98M', cbd: '10-15 min', safety: 'Moderate', nightlife: 'Excellent', nature: 'Moderate' },
                    { name: 'Lavington', best: 'Families, Schools', vibe: 'Refined, Quiet', price: 'KES 46M-117M', cbd: '12-18 min', safety: 'High', nightlife: 'Quiet', nature: 'Good' },
                    { name: 'Gigiri', best: 'Diplomats, UN', vibe: 'International', price: 'KES 52M-143M', cbd: '20-25 min', safety: 'Very High', nightlife: 'Diplomatic', nature: 'Excellent' },
                    { name: 'Parklands', best: 'Value, Central', vibe: 'Diverse, Value', price: 'KES 28M-65M', cbd: '8-12 min', safety: 'Moderate', nightlife: 'Quiet (5 min to Westlands)', nature: 'Good' },
                  ].map((row, i) => (
                    <tr key={row.name} className={`border-b border-stone-50 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'} ${row.name.toLowerCase() === slug ? 'bg-accent-50/50' : ''}`}>
                      <td className="p-3">
                        <Link to={`/neighbourhood/${row.name.toLowerCase()}`} className="text-primary font-medium hover:underline whitespace-nowrap">
                          {row.name} {row.name.toLowerCase() === slug && <span className="text-accent-600 text-xs ml-1">{c.this_page_label}</span>}
                        </Link>
                      </td>
                      <td className="p-3 text-stone-600">{row.best}</td>
                      <td className="p-3 text-stone-600">{row.vibe}</td>
                      <td className="p-3 text-stone-600 whitespace-nowrap">{row.price}</td>
                      <td className="p-3 text-stone-600 whitespace-nowrap">
                        {commutes[row.name.toLowerCase()]?.minutes != null
                          ? `~${commutes[row.name.toLowerCase()].minutes} min`
                          : '\u2014'}
                      </td>
                      <td className="p-3"><span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${row.safety.includes('Very') ? 'bg-emerald-100 text-emerald-700' : row.safety.includes('High') ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-600'}`}>{row.safety}</span></td>
                      <td className="p-3 text-stone-600">{row.nightlife}</td>
                      <td className="p-3"><span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${row.nature === 'Excellent' ? 'bg-emerald-100 text-emerald-700' : row.nature === 'Good' ? 'bg-emerald-50 text-emerald-600' : row.nature === 'Moderate' ? 'bg-stone-100 text-stone-600' : 'bg-amber-50 text-amber-600'}`}>{row.nature}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          </Reveal>
        </div>
      </main>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}