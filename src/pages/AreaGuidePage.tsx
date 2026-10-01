import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import SeoListingCard from '@/components/feature/SeoListingCard';
import ScrollRevealBlock from '@/components/feature/StaticBlock';
import type { ListingFilters } from '@/hooks/useListings';
import { useLoadMoreListings } from '@/hooks/useLoadMoreListings';
import { usePriceGuide, formatKes, cleanRentalRange } from '@/hooks/usePriceGuide';
import { useAreaDirectory, useAreaCategoryCounts } from '@/hooks/useAreaDirectory';
import { useSeoMeta, buildBreadcrumbSchema, buildFaqSchema, buildListingSchema, buildPriceOfferSchema } from '@/hooks/useSeoMeta';
import {
  categoryColor,
  subcategoryLabel,
  contrastTextOn,
  type Amenity,
} from '@/lib/amenities';
import CategoryIcon from '@/components/base/CategoryIcon';
import { AREA_GUIDE_PAGES, getMallBlogLink, MALL_SHOPPING_BLOG, type AreaGuideDef } from '@/lib/areaGuides';
import { areaSearchHref } from '@/lib/areaSearch';
import NearbyAreaStrip from '@/components/feature/NearbyAreaStrip';
import PageBreadcrumbTrail from '@/components/feature/PageBreadcrumbTrail';
import AreaOverviewSidebar from '@/components/feature/AreaOverviewSidebar';
import { supabase } from '@/lib/supabase';

const SITE_URL = 'https://www.oceanske.com';

/** Live, category-grouped directory block. */
const DIRECTORY_INITIAL = 9;
const DIRECTORY_STEP = 9;

function LiveDirectoryGroup({
  title,
  eyebrow,
  icon,
  color,
  items,
}: {
  title: string;
  eyebrow: string;
  icon: string;
  color: string;
  items: Amenity[];
}) {
  // Large directory lists reveal in batches behind a Load More button so the
  // page stays readable without ever hiding content behind a loading screen.
  const [visible, setVisible] = useState(DIRECTORY_INITIAL);
  if (!items.length) return null;
  const shown = items.slice(0, visible);
  const remaining = items.length - shown.length;
  return (
    <section className="mb-12 md:mb-16">
      <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-1">
        {eyebrow}
      </p>
      <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-6">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((it) => (
          <div
            key={it.id}
            className="bg-[#F7F9F9] rounded-lg border-2 border-primary/12 p-5 flex items-start gap-3"
          >
            <span className="w-10 h-10 flex items-center justify-center rounded-full shrink-0" style={{ backgroundColor: color, color: contrastTextOn(color) }}>
              <i className={icon} />
            </span>
            <div className="min-w-0">
              <p className="font-roboto font-bold text-primary text-sm md:text-base leading-snug mb-1">
                {it.name}
              </p>
              <p className="font-roboto text-stone-500 text-xs leading-relaxed">
                {subcategoryLabel(it.subcategory)}
                {it.address ? ` · ${it.address}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + DIRECTORY_STEP)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-roboto font-semibold uppercase tracking-wide rounded-md hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line"></i>
            Load More ({remaining} more)
          </button>
        </div>
      )}
    </section>
  );
}

function GuideBlockSection({
  title,
  eyebrow,
  items,
  icon,
}: {
  title: string;
  eyebrow: string;
  items: { name: string; note?: string }[];
  icon: string;
}) {
  if (!items.length) return null;
  return (
    <section className="mb-12 md:mb-16">
      <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-1">
        {eyebrow}
      </p>
      <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-6">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <div
            key={it.name}
            className="bg-[#F7F9F9] rounded-lg border-2 border-primary/12 p-5 flex items-start gap-3"
          >
            <span className="w-10 h-10 flex items-center justify-center bg-primary text-white rounded-full shrink-0">
              <i className={icon}></i>
            </span>
            <div>
              <p className="font-roboto font-bold text-primary text-sm md:text-base leading-snug mb-1">
                {it.name}
              </p>
              <p className="font-roboto text-stone-500 text-xs md:text-sm leading-relaxed">{it.note}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FaqSection({ def }: { def: AreaGuideDef }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mt-12 md:mt-16">
      <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-5">
        Frequently Asked Questions
      </h2>
      <div className="divide-y-2 divide-primary/12 border-y-2 border-primary/12">
        {def.faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 py-4 text-left cursor-pointer group"
                aria-expanded={isOpen}
              >
                <span className="font-roboto font-semibold text-primary text-sm md:text-base">{f.q}</span>
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full border border-primary/20 text-primary shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 bg-primary text-white border-primary' : ''
                  }`}
                >
                  <i className="ri-arrow-down-s-line"></i>
                </span>
              </button>
              {isOpen && (
                <p className="font-roboto text-stone-500 text-sm leading-relaxed pb-5 -mt-1">{f.a}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RelatedLinks({ def }: { def: AreaGuideDef }) {
  return (
    <section className="mt-12 md:mt-16 bg-[#F7F9F9] rounded-lg p-6 md:p-8">
      <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-5">
        Explore More in {def.area}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {def.related.map((r) => (
          <Link
            key={r.href}
            to={r.href}
            className="group flex items-center justify-between gap-3 bg-white border-2 border-primary/12 rounded-lg px-5 py-4 hover:border-primary/40 transition-colors cursor-pointer"
          >
            <span className="font-roboto font-medium text-primary text-sm md:text-base group-hover:text-[#2d4a7a] transition-colors">
              {r.label}
            </span>
            <span className="w-7 h-7 flex items-center justify-center text-primary shrink-0 group-hover:translate-x-1 transition-transform">
              <i className="ri-arrow-right-line"></i>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function AreaGuidePage({ slug }: { slug: string }) {
  const def: AreaGuideDef | undefined = AREA_GUIDE_PAGES[slug];
  // Canonical neighbourhood id so the directory resolves by FK (not just name).
  const [areaId, setAreaId] = useState<string | null>(null);
  // Area centre point so the shared directory layer can fold in nearby places
  // using the exact same proximity rule the neighbourhood editor uses.
  const [areaCoords, setAreaCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Per-neighbourhood nearby radius (km). Defaults to 5 km until the area's
  // own setting is loaded, so this guide always matches the editor exactly.
  const [radiusKm, setRadiusKm] = useState(5);

  useEffect(() => {
    setAreaId(null);
    setAreaCoords(null);
    setRadiusKm(5);
    if (!def) return;
    supabase
      .from('neighbourhoods')
      .select('id,latitude,longitude,nearby_radius_km')
      .eq('slug', def.areaSlug)
      .eq('is_published', true)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const row = data as {
          id: string;
          latitude: number | null;
          longitude: number | null;
          nearby_radius_km: number | null;
        };
        setAreaId(row.id);
        if (row.latitude != null && row.longitude != null) {
          setAreaCoords({ lat: Number(row.latitude), lng: Number(row.longitude) });
        }
        if (row.nearby_radius_km != null && Number(row.nearby_radius_km) > 0) {
          setRadiusKm(Number(row.nearby_radius_km));
        }
      });
  }, [slug, def]);

  const { target } = usePriceGuide(def?.areaSlug || slug);

  // Live directory for this area - the SAME shared layer the neighbourhood
  // editor reads from, with the SAME nearby-within-radius set (using the
  // area's own adjustable radius), so the counts and listings here always
  // match the "Life Around Here" tab exactly.
  const directory = useAreaDirectory({
    neighbourhoodId: areaId,
    neighbourhoodName: def?.area,
    latitude: areaCoords?.lat ?? null,
    longitude: areaCoords?.lng ?? null,
    radiusMeters: radiusKm * 1000,
  });
  const categoryTiles = useAreaCategoryCounts(directory.areaCategoryCounts);
  const areaPlaces = directory.areaDirectory;

  const filters: ListingFilters = {
    purpose: 'sale',
    search: def?.area || '',
    propertyType: 'Any type',
    addedSince: 'Anytime',
    sortBy: 'A - Z',
    statusFilter: 'active',
  };

  const { items, totalCount, loading, loadingMore, error, hasMore, loadMore, refetch } = useLoadMoreListings(filters);

  const path = `/${def?.slug ?? slug}`;

  const priceValue = useMemo(() => {
    if (!def) return '-';
    const live = target?.average_sale_price != null ? target.average_sale_price : def.avgSale;
    return live ? formatKes(live) : 'On request';
  }, [def, target]);

  const rentValue = useMemo(() => {
    if (!def) return '-';
    const live = target?.rental_range_kes ? cleanRentalRange(target.rental_range_kes) : '';
    return live ? `KSh ${live}` : def.rentalRange || 'On request';
  }, [def, target]);

  const schemas = useMemo(
    () =>
      def
        ? [
            buildBreadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Neighbourhood Guides', path: '/neighbourhoods' },
              { name: def.h1, path },
            ]),
            buildFaqSchema(def.faqs),
            buildPriceOfferSchema(
              def.area,
              target?.average_sale_price ?? def.avgSale ?? null,
              target?.rental_range_kes ?? def.rentalRange ?? null,
            ),
            buildListingSchema(
              items.map((p) => ({
                title: p.title,
                url: `${SITE_URL}/property/${p.slug}`,
                price: p.rawPrice,
                priceCurrency: p.currency || 'KES',
                address: p.area || p.location,
                image: p.image,
                bedrooms: p.beds,
                bathrooms: p.baths,
                propertyType: p.propertyType,
              })),
            ),
          ]
        : [],
    [def, path, target, items],
  );

  useSeoMeta({
    title: def?.metaTitle || 'Oceans Kenya | Nairobi Area Guides',
    description:
      def?.metaDescription ||
      'Complete premium Nairobi area guides covering schools, malls, lifestyle and property prices.',
    path,
    schemas,
  });

  if (!def) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-36 pb-24 px-4 md:px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="font-roboto font-bold text-3xl text-primary mb-4">Guide Not Found</h1>
            <p className="font-roboto text-stone-500 mb-6">This premium area guide could not be found.</p>
            <Link
              to="/property-for-sale/nairobi"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white border-2 border-primary text-sm font-roboto font-semibold uppercase hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
            >
              Browse Nairobi Property
              <i className="ri-arrow-right-line text-xs"></i>
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  const mapSrc = `https://maps.google.com/maps?q=${def.latitude},${def.longitude}&z=13&hl=en&output=embed`;

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative pt-28 md:pt-36 pb-14 md:pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="w-full h-full bg-gradient-to-br from-primary via-primary to-accent/70"></div>
          <div className="absolute inset-0 bg-primary/75"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-6">
          <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-2">
            {def.eyebrow}
          </p>
          <h1 className="font-prata font-bold text-white text-3xl md:text-5xl leading-tight mb-3">
            {def.h1}
          </h1>
          <p className="font-roboto text-white/80 text-sm md:text-base max-w-2xl leading-relaxed">
            Everything you need to know about {def.area} - schools, malls, lifestyle and the market.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#properties"
              className="inline-flex items-center gap-2 px-7 py-3 bg-golden text-white border-2 border-golden text-sm font-roboto font-semibold uppercase hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-home-4-line"></i> View {def.area} Homes
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-7 py-3 border-2 border-white/60 text-white text-sm font-roboto font-semibold uppercase hover:bg-white hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-chat-3-line"></i> Ask About {def.area}
            </Link>
          </div>
        </div>
      </section>

      <main className="py-10 md:py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <PageBreadcrumbTrail
            className="mb-6"
            items={[
              { label: 'Home', to: '/' },
              { label: 'Area Guide', to: '/neighbourhoods' },
              { label: 'Nairobi', to: '/neighbourhoods' },
              { label: def.h1 },
            ]}
          />
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-12 items-start">
          <div className="min-w-0">
          {/* Intro */}
          <ScrollRevealBlock>
            <div className="max-w-3xl mb-10">
              <h2 className="font-roboto font-bold text-primary text-lg md:text-xl mb-4">
                About {def.area}, Nairobi
              </h2>
              {def.intro.map((para, i) => (
                <p key={i} className="font-roboto text-stone-600 text-sm leading-relaxed mb-4">
                  {para}
                </p>
              ))}
            </div>
          </ScrollRevealBlock>

          {/* Life Around Here - live directory, dynamic counts */}
          <ScrollRevealBlock>
            <section className="mb-12 md:mb-16">
              <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-1">
                Life around here
              </p>
              <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
                <div>
                  <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary">
                    Everyday Life in {def.area}
                  </h2>
                  {!directory.loading && directory.nearby.length > 0 && (
                    <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-100 text-accent-900 text-xs font-roboto font-semibold whitespace-nowrap">
                      <i className="ri-map-pin-2-line" />
                      {directory.nearby.length} nearby within {radiusKm} km
                    </span>
                  )}
                </div>
                <Link
                  to={`/directory`}
                  className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 text-sm font-roboto font-medium text-primary border border-primary/20 rounded-sm hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Full Directory
                  <i className="ri-arrow-right-line"></i>
                </Link>
              </div>

              {directory.loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-[#F5F5F5] h-20 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {categoryTiles.map((c) => (
                    <div key={c.key} className="bg-[#F7F9F9] rounded-lg border-2 border-primary/12 p-4">
                      <CategoryIcon icon={c.icon} color={c.color} className="mb-2" />
                      <p className="font-roboto text-primary text-lg font-bold leading-none">{c.count}</p>
                      <p className="font-roboto text-stone-500 text-[11px] mt-1 leading-snug">{c.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </ScrollRevealBlock>

          {/* Live directory by category */}
          <ScrollRevealBlock>
            <LiveDirectoryGroup
              title="Schools & Education"
              eyebrow="Education"
              icon="ri-graduation-cap-line"
              color={categoryColor('education')}
              items={areaPlaces.filter((a) => a.category === 'education')}
            />
          </ScrollRevealBlock>
          <ScrollRevealBlock>
            <LiveDirectoryGroup
              title="Health & Wellness"
              eyebrow="Healthcare"
              icon="ri-heart-pulse-line"
              color={categoryColor('health')}
              items={areaPlaces.filter((a) => a.category === 'health')}
            />
          </ScrollRevealBlock>
          <ScrollRevealBlock>
            <LiveDirectoryGroup
              title="Shopping & Malls"
              eyebrow="Lifestyle"
              icon="ri-shopping-bag-3-line"
              color={categoryColor('shopping')}
              items={areaPlaces.filter((a) => a.category === 'shopping' || a.category === 'shopping_centres')}
            />
          </ScrollRevealBlock>
          <ScrollRevealBlock>
            <LiveDirectoryGroup
              title="Dining & Social"
              eyebrow="Lifestyle"
              icon="ri-restaurant-line"
              color={categoryColor('dining')}
              items={areaPlaces.filter((a) => a.category === 'dining')}
            />
          </ScrollRevealBlock>
          <ScrollRevealBlock>
            <LiveDirectoryGroup
              title="Nature & Outdoors"
              eyebrow="Open spaces"
              icon="ri-leaf-line"
              color={categoryColor('recreation')}
              items={areaPlaces.filter((a) => a.category === 'recreation')}
            />
          </ScrollRevealBlock>
          <ScrollRevealBlock>
            <LiveDirectoryGroup
              title="Transport & Connectivity"
              eyebrow="Getting around"
              icon="ri-bus-line"
              color={categoryColor('transport')}
              items={areaPlaces.filter((a) => a.category === 'transport' || a.category === 'connectivity')}
            />
          </ScrollRevealBlock>
          <ScrollRevealBlock>
            <LiveDirectoryGroup
              title="Fitness & Wellness"
              eyebrow="Stay active"
              icon="ri-run-line"
              color={categoryColor('fitness')}
              items={areaPlaces.filter((a) => a.category === 'fitness')}
            />
          </ScrollRevealBlock>
          <ScrollRevealBlock>
            <LiveDirectoryGroup
              title="Pets & Animal Care"
              eyebrow="Pet friendly"
              icon="ri-heart-3-line"
              color={categoryColor('pets')}
              items={areaPlaces.filter((a) => a.category === 'pets')}
            />
          </ScrollRevealBlock>

          {/* Schools */}
          <ScrollRevealBlock>
            <GuideBlockSection
              title="Schools Near You"
              eyebrow="Education"
              items={def.schools}
              icon="ri-graduation-cap-line"
            />
          </ScrollRevealBlock>

          {/* Malls */}
          <ScrollRevealBlock>
            <GuideBlockSection
              title="Shopping & Malls"
              eyebrow="Lifestyle"
              items={def.malls}
              icon="ri-shopping-bag-3-line"
            />
          </ScrollRevealBlock>

          {/* Deep dive: the Nairobi mall round-up article */}
          {getMallBlogLink(def.areaSlug) && (
            <ScrollRevealBlock>
              <Link
                to={MALL_SHOPPING_BLOG.href}
                className="group mb-12 md:mb-16 flex flex-col sm:flex-row items-start gap-4 sm:gap-6 bg-accent-100/60 border-2 border-accent-200 rounded-lg p-5 md:p-6 hover:border-accent-300 transition-colors cursor-pointer"
              >
                <span className="w-12 h-12 flex items-center justify-center bg-accent-500 text-white rounded-full shrink-0">
                  <i className="ri-store-3-line text-xl"></i>
                </span>
                <div className="min-w-0">
                  <p className="text-golden text-[11px] font-roboto font-semibold uppercase tracking-[0.2em] mb-1">
                    Recommended reading
                  </p>
                  <h3 className="font-roboto font-bold text-primary text-base md:text-lg mb-1 group-hover:text-[#2d4a7a] transition-colors">
                    {MALL_SHOPPING_BLOG.label}
                  </h3>
                  <p className="font-roboto text-stone-600 text-sm leading-relaxed">
                    {MALL_SHOPPING_BLOG.blurb}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-roboto font-semibold text-primary whitespace-nowrap">
                    Read the mall guide
                    <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
                  </span>
                </div>
              </Link>
            </ScrollRevealBlock>
          )}

          {/* Lifestyle */}
          <ScrollRevealBlock>
            <section className="mb-12 md:mb-16">
              <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-1">
                Lifestyle
              </p>
              <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-6">
                Living in {def.area}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {def.lifestyle.map((t) => (
                  <div
                    key={t}
                    className="bg-accent-100/60 rounded-lg p-5 flex items-start gap-3 border-2 border-accent-200"
                  >
                    <span className="w-9 h-9 flex items-center justify-center bg-accent-500 text-white rounded-full shrink-0">
                      <i className="ri-heart-3-line"></i>
                    </span>
                    <p className="font-roboto text-stone-700 text-sm leading-relaxed">{t}</p>
                  </div>
                ))}
              </div>
            </section>
          </ScrollRevealBlock>

          {/* Map */}
          <ScrollRevealBlock>
            <section className="mb-12 md:mb-16">
              <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-1">
                Location
              </p>
              <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-6">
                Where is {def.area}?
              </h2>
              <div className="w-full h-72 md:h-96 rounded-lg overflow-hidden border-2 border-primary/12">
                <iframe
                  allowFullScreen
                  className="w-full h-full"
                  src={mapSrc}
                  title={`${def.area} map location`}
                ></iframe>
              </div>
            </section>
          </ScrollRevealBlock>

          {/* Live listings */}
          <section id="properties" className="mb-8">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-1">
                  Properties
                </p>
                <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary">
                  Homes in {def.area} - {totalCount} result{totalCount === 1 ? '' : 's'}
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-[#F5F5F5] aspect-[4/3] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-16 bg-[#F5F5F5] rounded-lg">
                <p className="font-roboto text-stone-500 mb-4">{error}</p>
                <button
                  onClick={refetch}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-roboto font-semibold uppercase hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-refresh-line"></i> Try Again
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 bg-[#F5F5F5] rounded-lg">
                <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3 rounded-full">
                  <i className="ri-home-4-line text-white text-xl"></i>
                </div>
                <p className="font-roboto font-bold text-primary mb-1">No properties available yet</p>
                <p className="font-roboto text-stone-500 text-sm max-w-md mx-auto mb-4">
                  New premium {def.area} listings arrive regularly. Explore the area search or register your interest to be contacted first.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to={areaSearchHref(def.area)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-roboto font-semibold uppercase hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Search {def.area}
                    <i className="ri-arrow-right-line text-xs"></i>
                  </Link>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-primary/25 text-primary text-sm font-roboto font-semibold uppercase hover:border-primary transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Register Interest
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {items.map((p) => (
                    <SeoListingCard key={p.id} property={p} />
                  ))}
                </div>
                {hasMore && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 px-7 py-3 bg-primary text-white text-sm font-roboto font-semibold uppercase tracking-wide rounded-md hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-wait"
                    >
                      <i className={loadingMore ? 'ri-loader-4-line animate-spin' : 'ri-add-line'}></i>
                      {loadingMore ? 'Loading…' : 'Load More Homes'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* FAQ */}
          <ScrollRevealBlock>
            <FaqSection def={def} />
          </ScrollRevealBlock>

          {/* Related */}
          <ScrollRevealBlock>
            <RelatedLinks def={def} />
          </ScrollRevealBlock>

          {/* Nearby areas - cross-link to neighbouring areas via the shared resolver */}
          <NearbyAreaStrip label={def.area} />

          {/* CTA */}
          <ScrollRevealBlock>
            <div className="mt-12 md:mt-16 bg-primary rounded-lg py-12 md:py-16 px-6 text-center">
              <h2 className="font-prata font-semibold text-white text-2xl md:text-3xl mb-4">
                Ready to Call {def.area} Home?
              </h2>
              <p className="font-roboto text-white/80 text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-7">
                Our local agents know {def.area} inside out - from the best streets and schools to off-market
                opportunities. Let us match you with the perfect property in this neighbourhood.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-golden text-white border-2 border-golden text-sm font-roboto font-semibold uppercase hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-chat-3-line"></i> Contact an Agent
              </Link>
            </div>
          </ScrollRevealBlock>
          </div>

          <AreaOverviewSidebar
            eyebrow="At a glance"
            heading={`${def.area} Quick Facts`}
            intro={`Everything you need to know about ${def.area} - schools, malls, lifestyle and the market.`}
            facts={[
              { label: 'Average Sale Price', value: priceValue },
              { label: 'Monthly Rent Range', value: rentValue },
              { label: 'Drive to CBD', value: `~${def.commuteMinutes} min (${def.commuteKm} km)` },
              { label: 'Best For', value: 'Families · Professionals · Investors' },
            ]}
            footer={
              <a
                href="#properties"
                className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-roboto font-semibold uppercase tracking-wider rounded-sm hover:bg-primary/90 transition-colors whitespace-nowrap cursor-pointer"
              >
                View {def.area} Homes
                <i className="ri-home-4-line"></i>
              </a>
            }
          />
          </div>
        </div>
      </main>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}