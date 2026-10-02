import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageBreadcrumbTrail from '@/components/feature/PageBreadcrumbTrail';
import PageContactSection from '@/components/feature/PageContactSection';
import Pagination from '@/components/feature/Pagination';
import SeoListingCard from '@/components/feature/SeoListingCard';
import ScrollRevealBlock from '@/components/feature/ScrollRevealBlock';
import { useListings, type ListingFilters } from '@/hooks/useListings';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { supabase } from '@/lib/supabase';
import { applyPublicVisibility } from '@/lib/publicListings';
import { parseSearchClauses, buildClausesOr } from '@/lib/propertySearch';
import {
  resolveAreaSearch,
  buildAreaFallbackTiers,
  labelFromAreaSlug,
  type AreaSearchPurpose,
} from '@/lib/areaSearch';
import NearbyAreaStrip from '@/components/feature/NearbyAreaStrip';
import AreaOverviewSidebar from '@/components/feature/AreaOverviewSidebar';
import { useAreaResultsContent } from '@/hooks/useDynamicPageTemplates';

const ITEMS_PER_PAGE = 12;

/**
 * Live inventory check for ONE fallback tier. Reuses the SAME parser and the
 * SAME public-visibility rules the listing engine uses, so a tier's count
 * exactly reflects what the results grid will show.
 */
async function countTier(
  search: string,
  purpose: AreaSearchPurpose,
  type: string
): Promise<number> {
  let query = supabase
    .from('all_listings')
    .select('id', { count: 'exact', head: true })
    .neq('title', '')
    .or('is_new_development.eq.false,is_new_development.is.null');

  // Canonical public visibility (published + a live, non-withdrawn status).
  query = applyPublicVisibility(query, 'active');
  // Area guides are about homes - match the residential scope used elsewhere.
  query = query.eq('property_category', 'residential');
  query = query.eq('purpose', purpose);
  if (type) query = query.eq('property_type', type);

  if (search.trim()) {
    const orClause = buildClausesOr(parseSearchClauses(search));
    if (orClause) query = query.or(orClause);
  }

  const { count } = await query;
  return count || 0;
}

function AreaResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-[#F5F5F5] aspect-[4/3] rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

/**
 * AreaResults - the dedicated area property search view.
 *
 * Owns the "never show an empty page" fallback hierarchy: exact area(s) →
 * nearby/related areas → all published property. It is the single destination
 * for every Area Guide / Neighbourhood property CTA (via @/lib/areaSearch).
 */
export default function AreaResults() {
  const { content: c } = useAreaResultsContent();
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  const place = searchParams.get('place') || labelFromAreaSlug(routeSlug || '');
  const typeParam = searchParams.get('type') || '';
  const purposeParam = searchParams.get('purpose');
  const initialPurpose: AreaSearchPurpose = purposeParam === 'rent' ? 'rent' : 'sale';

  const [purpose, setPurpose] = useState<AreaSearchPurpose>(initialPurpose);
  const [page, setPage] = useState(1);

  const resolved = useMemo(() => resolveAreaSearch(place), [place]);
  const tiers = useMemo(() => buildAreaFallbackTiers(resolved), [resolved]);

  // Which fallback tier actually has inventory (0 = exact match).
  const [activeTier, setActiveTier] = useState(0);
  const [probing, setProbing] = useState(true);

  // Pre-flight probe: walk the hierarchy in order and stop at the first tier
  // that has real, published listings. This is what guarantees a meaningful
  // landing instead of a blank results page.
  useEffect(() => {
    let cancelled = false;
    setProbing(true);
    setActiveTier(0);
    setPage(1);

    (async () => {
      let chosen = tiers.length - 1;
      for (let i = 0; i < tiers.length; i += 1) {
        try {
          const count = await countTier(tiers[i].query, purpose, typeParam);
          if (count > 0) {
            chosen = i;
            break;
          }
        } catch {
          // A failed count is treated as "no inventory here" and we widen -
          // the hierarchy must still resolve to a usable tier.
        }
      }
      if (!cancelled) {
        setActiveTier(chosen);
        setProbing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tiers, purpose, typeParam]);

  const active = tiers[activeTier] ?? tiers[0];

  // Memoised so the array identity is stable across renders - otherwise the
  // listing engine would see a new reference every render and refetch forever.
  const propertyTypes = useMemo(
    () => (typeParam ? [typeParam] : undefined),
    [typeParam]
  );

  const filters: ListingFilters = {
    purpose,
    search: active.query,
    propertyType: 'Any type',
    propertyTypes,
    propertyCategory: 'residential',
    addedSince: 'Anytime',
    sortBy: 'A - Z',
    statusFilter: 'active',
  };

  const { listings, totalCount, loading, error, refetch } = useListings(filters, page);
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  useSeoMeta({
    title: `${resolved.label} Properties | Oceans Kenya`,
    description: `Browse live, published properties in ${resolved.label}. Verified homes for sale and to rent from Oceans Kenya, matched from the same inventory used across the site.`,
    path: `/area/${resolved.slug}`,
    // A broadened fallback page is not the canonical area page - keep it out of
    // the index but let crawlers follow through to the real listings.
    noindex: active.key !== 'exact',
  });

  const broadened = active.key !== 'exact';

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-[80px] md:pt-[140px] lg:pt-[156px] pb-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          {/* Breadcrumb + Back */}
          <PageBreadcrumbTrail
            className="py-4"
            items={[
              { label: 'Home', to: '/' },
              { label: 'Neighbourhoods', to: '/neighbourhoods' },
              { label: resolved.label },
            ]}
          />

          {/* Header */}
          <div className="border-b-2 border-[#1a1a1a]/10 pb-6 mb-6">
            <p className="font-jost text-golden text-[13px] uppercase tracking-[0.15em] font-semibold mb-2">
              {c.eyebrow}
            </p>
            <h1 className="font-prata font-bold text-primary text-[26px] md:text-[38px] leading-tight mb-3">
              {c.heading_prefix} {resolved.label}
            </h1>
            <p className="font-roboto text-[15px] text-[#636363] max-w-2xl leading-relaxed">
              {c.intro}
            </p>

            <div className="flex items-center gap-2 mt-4">
              {(['sale', 'rent'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPurpose(p);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-md text-[14px] font-jost font-semibold uppercase tracking-[0.06em] whitespace-nowrap cursor-pointer transition-colors border-2 ${
                    purpose === p
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-primary border-primary/25 hover:border-primary'
                  }`}
                >
                  {p === 'sale' ? c.tab_sale : c.tab_rent}
                </button>
              ))}
            </div>
          </div>

          {/* Fallback notice - shown only when we had to widen past the exact area */}
          {broadened && !probing && (
            <div className="mb-6 bg-accent-100/70 border-2 border-accent-300 rounded-lg p-4 flex items-start gap-3">
              <span className="w-8 h-8 flex items-center justify-center bg-accent-500 text-white rounded-full shrink-0">
                <i className="ri-map-pin-2-line"></i>
              </span>
              <div className="min-w-0">
                <p className="font-roboto font-semibold text-primary text-[15px]">
                  {active.key === 'nearby'
                    ? c.fallback_nearby_title.replace('{area}', resolved.label)
                    : c.fallback_broad_title.replace('{area}', resolved.label)}
                </p>
                <p className="font-roboto text-[14px] text-[#636363] leading-relaxed mt-0.5">
                  {active.key === 'nearby'
                    ? c.fallback_nearby_text.replace('{areas}', active.label)
                    : c.fallback_broad_text}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-10 items-start">
          <div className="min-w-0">
          {/* Results header */}
          {!probing && (
            <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
              <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary">
                {active.key === 'exact'
                  ? `${c.results_exact_prefix} ${resolved.label}`
                  : active.key === 'nearby'
                    ? c.results_nearby
                    : c.results_all}{' '}
                <span className="text-primary/50 font-medium text-base">
                  - {totalCount} {c.results_word}
                </span>
              </h2>
            </div>
          )}

          {/* Results */}
          {probing || (loading && listings.length === 0) ? (
            <AreaResultsSkeleton />
          ) : error ? (
            <div className="text-center py-16 bg-[#F5F5F5] rounded-lg">
              <p className="font-roboto text-stone-500 mb-4">{error}</p>
              <button
                type="button"
                onClick={refetch}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-roboto font-semibold uppercase hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line"></i> Try Again
              </button>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 bg-[#F5F5F5] rounded-lg">
              <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3 rounded-full">
                <i className="ri-home-4-line text-white text-xl"></i>
              </div>
              <p className="font-roboto font-bold text-primary mb-1">{c.empty_title}</p>
              <p className="font-roboto text-stone-500 text-sm max-w-md mx-auto mb-5">
                {c.empty_text}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/buy"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-roboto font-semibold uppercase hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {c.empty_browse_sale}
                  <i className="ri-arrow-right-line text-xs"></i>
                </Link>
                <Link
                  to="/rent"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-primary/25 text-primary text-sm font-roboto font-semibold uppercase hover:border-primary transition-colors cursor-pointer whitespace-nowrap"
                >
                  {c.empty_browse_rent}
                  <i className="ri-arrow-right-line text-xs"></i>
                </Link>
              </div>
            </div>
          ) : (
            <ScrollRevealBlock>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {listings.map((p) => (
                  <SeoListingCard key={p.id} property={p} />
                ))}
              </div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </ScrollRevealBlock>
          )}

          {/* Nearby areas - each neighbour links to its own filtered search */}
          <NearbyAreaStrip label={resolved.label} purpose={purpose} />

          {/* Explore other areas */}
          <ScrollRevealBlock>
            <div className="mt-14 md:mt-16 bg-[#F7F9F9] rounded-lg p-6 md:p-8">
              <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-5">
                {c.explore_title}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  to="/neighbourhoods"
                  className="group flex items-center justify-between gap-3 bg-white border-2 border-primary/12 rounded-lg px-5 py-4 hover:border-primary/40 transition-colors cursor-pointer"
                >
                  <span className="font-roboto font-medium text-primary text-sm md:text-base group-hover:text-[#2d4a7a] transition-colors">
                    {c.explore_all_label}
                  </span>
                  <span className="w-7 h-7 flex items-center justify-center text-primary shrink-0 group-hover:translate-x-1 transition-transform">
                    <i className="ri-arrow-right-line"></i>
                  </span>
                </Link>
                <Link
                  to="/contact"
                  className="group flex items-center justify-between gap-3 bg-white border-2 border-primary/12 rounded-lg px-5 py-4 hover:border-primary/40 transition-colors cursor-pointer"
                >
                  <span className="font-roboto font-medium text-primary text-sm md:text-base group-hover:text-[#2d4a7a] transition-colors">
                    {c.explore_contact_label.replace('{area}', resolved.label)}
                  </span>
                  <span className="w-7 h-7 flex items-center justify-center text-primary shrink-0 group-hover:translate-x-1 transition-transform">
                    <i className="ri-arrow-right-line"></i>
                  </span>
                </Link>
              </div>
            </div>
          </ScrollRevealBlock>
          </div>

          <AreaOverviewSidebar
            eyebrow={c.sidebar_eyebrow}
            heading={resolved.label}
            intro={c.sidebar_intro}
            facts={[
              { label: 'Area', value: resolved.label },
              {
                label: 'Match',
                value:
                  active.key === 'exact'
                    ? 'Exact area'
                    : active.key === 'nearby'
                      ? `Nearby areas (${active.label})`
                      : 'All published properties',
              },
              { label: 'Intent', value: purpose === 'sale' ? 'For Sale' : 'For Rent' },
              {
                label: 'Results',
                value: probing ? 'Searching...' : `${totalCount} result${totalCount === 1 ? '' : 's'}`,
              },
            ]}
            footer={
              <Link
                to="/neighbourhoods"
                className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-roboto font-semibold uppercase tracking-wider rounded-sm hover:bg-primary/90 transition-colors whitespace-nowrap cursor-pointer"
              >
                {c.sidebar_browse_label}
                <i className="ri-arrow-right-line"></i>
              </Link>
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