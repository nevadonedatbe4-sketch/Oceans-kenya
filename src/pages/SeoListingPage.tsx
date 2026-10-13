import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import PropertySearchBar from '@/components/feature/PropertySearchBar';
import SeoListingCard from '@/components/feature/SeoListingCard';
import RecentActivitySuggestion from '@/components/feature/RecentActivitySuggestion';
import ScrollRevealBlock from '@/components/feature/StaticBlock';
import type { ListingFilters } from '@/hooks/useListings';
import { useLoadMoreListings } from '@/hooks/useLoadMoreListings';
import { useSeoMeta, buildBreadcrumbSchema, buildFaqSchema, buildListingSchema } from '@/hooks/useSeoMeta';
import { SEO_PAGES, type SeoPageDef } from '@/lib/seoPages';
import { parsePropertySearch } from '@/lib/propertySearch';
import { buildResultsHeading, humanizeType } from '@/lib/searchHeading';
import PageBreadcrumbTrail from '@/components/feature/PageBreadcrumbTrail';
import { useSeoListingContent } from '@/hooks/useDynamicPageTemplates';
import { BEDROOM_OPTIONS, bedroomSelectionToRange } from '@/lib/bedrooms';
import { rentPriceMinOptions, rentPriceMaxOptions, salePriceMinOptions, salePriceMaxOptions, parsePriceSelection, priceRangeInvalid } from '@/lib/prices';

const SITE_URL = 'https://www.oceanske.com';

// ── Shared global search-bar option sets ────────────────────────
const BED_OPTIONS = BEDROOM_OPTIONS;
const TYPE_OPTIONS = ['Show all', 'House', 'Apartment', 'Bungalow', 'Studio', 'Maisonette', 'Villa', 'Townhouse', 'Penthouse', 'Detached', 'Semi-detached', 'Terraced', 'Land'];
const TYPE_DB: Record<string, string> = {
  House: 'house', Apartment: 'apartment', Bungalow: 'bungalow', Studio: 'studio_flat',
  Maisonette: 'maisonette', Villa: 'villa', Townhouse: 'townhouse', Penthouse: 'penthouse',
  Detached: 'detached', 'Semi-detached': 'detached', Terraced: 'townhouse', Land: 'land',
};


function SeoFaqSection({ faqs, heading }: { faqs: SeoPageDef['faqs']; heading: string }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!faqs.length) return null;
  return (
    <section className="mt-12 md:mt-16">
      <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-5">
        {heading}
      </h2>
      <div className="divide-y-2 divide-primary/12 border-y-2 border-primary/12">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 py-4 text-left cursor-pointer group"
                aria-expanded={isOpen}
              >
                <span className="font-roboto font-semibold text-primary text-sm md:text-base">
                  {f.q}
                </span>
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full border border-primary/20 text-primary shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 bg-primary text-white border-primary' : ''
                  }`}
                >
                  <i className="ri-arrow-down-s-line"></i>
                </span>
              </button>
              {isOpen && (
                <p className="font-roboto text-stone-500 text-sm leading-relaxed pb-5 -mt-1">
                  {f.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SeoRelatedLinks({ related, heading }: { related: SeoPageDef['related']; heading: string }) {
  if (!related.length) return null;
  return (
    <section className="mt-12 md:mt-16 bg-[#F7F9F9] rounded-lg p-6 md:p-8">
      <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-5">
        {heading}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {related.map((r) => (
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

export default function SeoListingPage({ slug }: { slug: string }) {
  const { content: c } = useSeoListingContent();
  const def = SEO_PAGES[slug];

  // ── Shared search-bar refinements (default to the page's canonical search) ──
  const [searchQuery, setSearchQuery] = useState(def?.search || '');
  const [bedsValue, setBedsValue] = useState('Any beds');
  const [priceMin, setPriceMin] = useState('No min');
  const [priceMax, setPriceMax] = useState('No max');
  const [typeValue, setTypeValue] = useState('Show all');
  const [savedSearch, setSavedSearch] = useState(false);
  // When set to a window label (e.g. 'Last 24 hours'), only listings added in
  // that window are shown - used by the "what changed recently" note in the
  // zero-result state. 'Anytime' means no time restriction.
  const [recentWindow, setRecentWindow] = useState('Anytime');

  useEffect(() => {
    setSearchQuery(def?.search || '');
    setBedsValue('Any beds');
    setPriceMin('No min');
    setPriceMax('No max');
    setTypeValue('Show all');
    setRecentWindow('Anytime');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const purpose: 'sale' | 'rent' = def?.purpose || 'sale';
  // The zero-result note's count must be scoped to the SAME area this landing
  // page targets (otherwise it could advertise national activity the page's
  // location-bound query can never surface).
  const noteLocation = useMemo(() => {
    const intent = parsePropertySearch(def?.search || '');
    return intent.location || intent.city || undefined;
  }, [def]);
  const priceMinOpts = useMemo(() => (purpose === 'rent' ? rentPriceMinOptions('KES', {}) : salePriceMinOptions('KES', {})), [purpose]);
  const priceMaxOpts = useMemo(() => (purpose === 'rent' ? rentPriceMaxOptions('KES', {}) : salePriceMaxOptions('KES', {})), [purpose]);
  const priceMinValue = parsePriceSelection(priceMinOpts, priceMin);
  const priceMaxValue = parsePriceSelection(priceMaxOpts, priceMax);
  const priceRangeError = priceRangeInvalid(priceMinValue, priceMaxValue) ? 'Minimum price cannot be greater than maximum price.' : '';

  const filters: ListingFilters = useMemo(() => {
    const f: ListingFilters = {
      purpose,
      search: searchQuery,
      propertyType: (typeValue !== 'Show all' && TYPE_DB[typeValue]) ? TYPE_DB[typeValue] : (def?.propertyType || 'Show all'),
      propertyCategory: def?.propertyCategory || null,
      addedSince: recentWindow,
      sortBy: 'A - Z',
      statusFilter: 'active',
      amenitiesFilter: def?.amenitiesFilter,
      subTypeFilter: def?.subTypeFilter,
      priceMin: def?.priceMin,
      centerLat: null,
      centerLng: null,
      radiusMeters: null,
    };
    Object.assign(f, bedroomSelectionToRange(bedsValue));
    if (priceMinValue !== undefined) f.priceMin = priceMinValue;
    if (priceMaxValue !== undefined) f.priceMax = priceMaxValue;
    return f;
  }, [purpose, searchQuery, bedsValue, priceMin, priceMax, typeValue, def, recentWindow]);

  const { items, totalCount, loading, loadingMore, error, hasMore, loadMore, refetch } = useLoadMoreListings(filters);

  // Dynamic results heading - a natural-language summary of what the page is
  // really querying (type + transaction + location), from the search state.
  const resultsHeading = useMemo(() => {
    const intent = parsePropertySearch(def?.search || '');
    const place = intent.location || intent.city || def?.search || null;
    const typeLabel = (typeValue !== 'Show all' && typeValue)
      ? typeValue
      : (def?.propertyType ? humanizeType(def.propertyType) : null);
    return buildResultsHeading({
      typeLabel,
      purpose,
      location: place,
      radiusLabel: null,
      fallback: def?.h1 || 'Properties',
    });
  }, [def, typeValue, purpose]);

  // ── Crawl-ready head + structured data ──────────────────────
  const path = `/${def?.slug ?? slug}`;
  const schemas = useCallback(
    () =>
      def
        ? [
            buildBreadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: def.section, path: def.section === 'Rent' ? '/rent' : '/buy' },
              { name: def.h1, path },
            ]),
            buildFaqSchema(def.faqs),
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
    [def, path, items],
  );

  useSeoMeta({
    title: def?.metaTitle || 'Oceans Kenya | Premium Property in Nairobi',
    description:
      def?.metaDescription ||
      'Premium property for sale and rent across Nairobi, Kenya luxury neighbourhoods.',
    path,
    schemas: schemas(),
  });

  if (!def) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-36 pb-24 px-4 md:px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="font-roboto font-bold text-3xl text-primary mb-4">Page Not Found</h1>
            <p className="font-roboto text-stone-500 mb-6">This premium property page could not be found.</p>
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

  const breadcrumbTrail =
    def.section === 'Rent' ? '/rent' : def.section === 'Buy' ? '/buy' : '/property-for-sale/nairobi';

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative pt-28 md:pt-36 pb-14 md:pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="w-full h-full bg-gradient-to-br from-primary via-primary to-accent/70"></div>
          <div className="absolute inset-0 bg-primary/70"></div>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 md:px-6">
          <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-2">
            {def.eyebrow}
          </p>
          <h1 className="font-prata font-bold text-white text-3xl md:text-5xl leading-tight mb-3">
            {def.h1}
          </h1>
          <p className="font-roboto text-white/80 text-sm md:text-base max-w-2xl leading-relaxed">
            {c.hero_intro}
          </p>
        </div>
      </section>

      {/* Shared global search bar - refine this collection in place */}
      <div className="bg-white border-b border-primary/12">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <PropertySearchBar
            searchQuery={searchQuery}
            onLocationChange={(val) => setSearchQuery(val)}
            placeholderCycle={c.search_placeholders}
            bedsValue={bedsValue}
            onBedsChange={(v) => setBedsValue(v)}
            bedOptions={BED_OPTIONS}
            priceMinValue={priceMin}
            onPriceMinChange={(v) => setPriceMin(v)}
            priceMinOptions={priceMinOpts.labels}
            priceMaxValue={priceMax}
            onPriceMaxChange={(v) => setPriceMax(v)}
            priceMaxOptions={priceMaxOpts.labels}
            priceRangeError={priceRangeError}
            onClearPrice={(priceMin !== 'No min' || priceMax !== 'No max') ? () => { setPriceMin('No min'); setPriceMax('No max'); } : undefined}
            typeValue={typeValue}
            onTypeChange={(v) => setTypeValue(v)}
            typeOptions={TYPE_OPTIONS}
            saved={savedSearch}
            onToggleSave={() => setSavedSearch(!savedSearch)}
          />
        </div>
      </div>

      <main className="py-10 md:py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <PageBreadcrumbTrail
            className="mb-8"
            items={[
              { label: 'Home', to: '/' },
              { label: def.section === 'Rent' ? 'Rent' : 'Buy', to: breadcrumbTrail },
              { label: def.h1 },
            ]}
          />
          {/* SEO intro */}
          <ScrollRevealBlock>
            <div className="max-w-3xl mb-10">
              <h2 className="font-roboto font-bold text-primary text-lg md:text-xl mb-4">{c.about_title}</h2>
              {def.intro.map((para, i) => (
                <p key={i} className="font-roboto text-stone-600 text-sm leading-relaxed mb-4">
                  {para}
                </p>
              ))}
            </div>
          </ScrollRevealBlock>

          {/* Listing grid */}
          <section>
            <div className="flex items-end justify-between mb-6">
              <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary">
                {resultsHeading} - {totalCount} {c.results_word}
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <p className="font-roboto font-bold text-primary mb-1">{c.empty_title}</p>
                <p className="font-roboto text-stone-500 text-sm max-w-md mx-auto mb-4">
                  {c.empty_text}
                </p>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-roboto font-semibold uppercase hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {c.empty_button}
                  <i className="ri-arrow-right-line text-xs"></i>
                </Link>
                <RecentActivitySuggestion
                  location={noteLocation}
                  addedWindow={recentWindow}
                  scope={{
                    purpose,
                    propertyCategory: def?.propertyCategory ?? null,
                    propertyType: def?.propertyType ?? null,
                    amenitiesFilter: def?.amenitiesFilter ?? null,
                    subTypeFilter: def?.subTypeFilter ?? null,
                  }}
                  onView={(targetWindow) => {
                    setBedsValue('Any beds');
                    setPriceMin('No min');
                    setPriceMax('No max');
                    setTypeValue('Show all');
                    setRecentWindow(targetWindow);
                  }}
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      {loadingMore ? c.loading_label : c.load_more_label}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* FAQ */}
          <ScrollRevealBlock>
            <SeoFaqSection faqs={def.faqs} heading={c.faq_heading} />
          </ScrollRevealBlock>

          {/* Related internal links */}
          <ScrollRevealBlock>
            <SeoRelatedLinks related={def.related} heading={c.related_heading} />
          </ScrollRevealBlock>

          {/* CTA */}
          <ScrollRevealBlock>
            <div className="mt-12 md:mt-16 bg-primary rounded-lg py-12 md:py-16 px-6 text-center">
              <h2 className="font-prata font-semibold text-white text-2xl md:text-3xl mb-4">
                {c.cta_title}
              </h2>
              <p className="font-roboto text-white/80 text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-7">
                {c.cta_text}
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-golden text-white border-2 border-golden text-sm font-roboto font-semibold uppercase hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-chat-3-line"></i> {c.cta_button}
              </Link>
            </div>
          </ScrollRevealBlock>
        </div>
      </main>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}