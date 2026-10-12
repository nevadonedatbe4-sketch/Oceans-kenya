import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import Pagination from '@/components/feature/Pagination';
import PropertySearchBar from '@/components/feature/PropertySearchBar';
import { useNewDevelopments } from '@/hooks/useNewDevelopments';
import type { Development } from '@/hooks/useNewDevelopments';
import { useNewDevelopmentsPageContent } from '@/hooks/useNewDevelopmentsPageContent';
import DevelopmentCard from '@/pages/NewDevelopments/components/DevelopmentCard';
import NewDevHero from '@/pages/NewDevelopments/components/NewDevHero';
import BenefitsSection from '@/pages/NewDevelopments/components/BenefitsSection';
import FeaturedSection from '@/pages/NewDevelopments/components/FeaturedSection';
import DeveloperCta from '@/pages/NewDevelopments/components/DeveloperCta';
import DevelopmentModal from '@/pages/NewDevelopments/components/DevelopmentModal';
import DevelopmentAdvancedFilters, { type DevelopmentFilterState } from '@/pages/NewDevelopments/components/DevelopmentAdvancedFilters';
import RecentlyViewedDevelopments from '@/components/feature/RecentlyViewedDevelopments';
import RecentActivitySuggestion from '@/components/feature/RecentActivitySuggestion';
import { useCurrency } from '@/hooks/useCurrency';
import { salePriceMinOptions, salePriceMaxOptions, parsePriceSelection, priceRangeInvalid } from '@/lib/prices';
import { completionWindowOptions, matchesCompletionWindow } from '@/lib/completion';
import { hoursForWindowLabel } from '@/lib/recentWindow';

const ITEMS_PER_PAGE = 9;
const AREA_ANY = 'All Areas';
const TYPE_ANY = 'All Types';

/** Does any real unit in this project satisfy the selected unit-type filter? */
function matchesUnitType(units: { bedrooms: number }[], filter: string): boolean {
  if (!filter) return true;
  if (filter === 'Studio') return units.some((u) => u.bedrooms <= 0);
  const m = filter.match(/^(\d+)/);
  if (!m) return true;
  const n = parseInt(m[1], 10);
  return units.some((u) => u.bedrooms >= n);
}

function stageKey(stage: string): string {
  const s = (stage || '').trim().toLowerCase();
  if (s === 'off_plan') return 'Off-Plan';
  if (s === 'under_construction') return 'Under Construction';
  return 'Completed';
}

export default function NewDevelopments() {
  const { developments, loading, error, refetch } = useNewDevelopments();
  const { content } = useNewDevelopmentsPageContent();
  const [selected, setSelected] = useState<Development | null>(null);
  const [requestBrochure, setRequestBrochure] = useState(false);

  // Backend-provided "any" sentinels (fall back to sensible defaults).
  const bedsAny = content.beds_options[0] || 'Any unit';
  const stageAny = content.stage_options[0] || 'All Status';
  const devAny = content.developer_default_label || 'All Developers';
  const compAny = content.completion_default_label || 'Any Completion';

  // Plain "view" opens the modal; a brochure request opens it and resolves the
  // brochure (scroll to section when present, otherwise the agent form).
  const openDevelopment = useCallback((dev: Development) => {
    setRequestBrochure(false);
    setSelected(dev);
  }, []);

  const openBrochureRequest = useCallback((dev: Development) => {
    setRequestBrochure(true);
    setSelected(dev);
  }, []);

  // ---- filter state ----
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArea, setFilterArea] = useState(AREA_ANY);
  const [filterType, setFilterType] = useState(TYPE_ANY);
  const [filterBeds, setFilterBeds] = useState(bedsAny);
  const [filterDeveloper, setFilterDeveloper] = useState(devAny);
  const [filterCompletion, setFilterCompletion] = useState(compAny);
  const [filterPriceMin, setFilterPriceMin] = useState('No min');
  const [filterPriceMax, setFilterPriceMax] = useState('No max');
  const [filterStage, setFilterStage] = useState(stageAny);
  const [sortBy, setSortBy] = useState('name');
  const [page, setPage] = useState(1);
  const [savedSearch, setSavedSearch] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showLetAgreed, setShowLetAgreed] = useState(false);
  // The recency window for the "what changed recently" note in the zero-result
  // state. 'Anytime' means no time restriction.
  const [recentWindow, setRecentWindow] = useState('Anytime');
  const [searchParams] = useSearchParams();

  // ---- options derived from real records ----
  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    developments.forEach((d) => {
      const area = (d.location || d.city || '').trim();
      if (area) set.add(area);
    });
    const list = Array.from(set).sort((a, b) => {
      if (a.toLowerCase() === 'westlands') return -1;
      if (b.toLowerCase() === 'westlands') return 1;
      return a.localeCompare(b);
    });
    return [AREA_ANY, ...list];
  }, [developments]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    developments.forEach((d) => {
      const t = (d.propertyType || '').trim();
      if (t) set.add(t.charAt(0).toUpperCase() + t.slice(1));
    });
    return [TYPE_ANY, ...Array.from(set).sort()];
  }, [developments]);

  const { currency, rates } = useCurrency();
  const priceMinOpts = useMemo(() => salePriceMinOptions(currency, rates), [currency, rates]);
  const priceMaxOpts = useMemo(() => salePriceMaxOptions(currency, rates), [currency, rates]);
  const priceMinValue = parsePriceSelection(priceMinOpts, filterPriceMin);
  const priceMaxValue = parsePriceSelection(priceMaxOpts, filterPriceMax);
  const priceRangeError = priceRangeInvalid(priceMinValue, priceMaxValue)
    ? 'Minimum price cannot be greater than maximum price.'
    : '';

  // Reset the price range when the display currency changes so stale labels
  // never silently mismatch the freshly-built options.
  const prevCurrencyRef = useRef(currency);
  useEffect(() => {
    if (prevCurrencyRef.current !== currency) {
      setFilterPriceMin('No min');
      setFilterPriceMax('No max');
      prevCurrencyRef.current = currency;
    }
  }, [currency]);

  // Development-specific filter options - every option comes from a real record.
  const developerOptions = useMemo(() => {
    const set = new Set<string>();
    developments.forEach((d) => {
      const v = (d.developer || '').trim();
      if (v) set.add(v);
    });
    return [devAny, ...Array.from(set).sort()];
  }, [developments, devAny]);

  // Relative completion ladder measured from today (Within 1 month … Within 5 years).
  const completionOptions = useMemo(() => completionWindowOptions(compAny), [compAny]);

  // ---- Featured developments: real authoritative is_featured flag ----
  const featured = useMemo(() => developments.filter((d) => d.isFeatured).slice(0, 4), [developments]);
  const featuredIds = useMemo(() => new Set(featured.map((d) => d.key)), [featured]);

  // ---- filtering (against returned records; exclude featured from the grid) ----
  const filtered = useMemo(() => {
    let result = developments.filter((d) => !featuredIds.has(d.key));

    // Recent-only mode - applied before every other criterion, using the exact
    // window the note suggested (e.g. 'Last 3 days').
    const recentHours = hoursForWindowLabel(recentWindow);
    if (recentHours != null) {
      const cutoff = Date.now() - recentHours * 3_600_000;
      result = result.filter((d) => d.createdAt && new Date(d.createdAt).getTime() >= cutoff);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q) ||
          d.developer.toLowerCase().includes(q) ||
          d.propertyType.toLowerCase().includes(q)
      );
    }
    if (filterArea !== AREA_ANY) {
      const area = filterArea.toLowerCase();
      result = result.filter((d) => (d.location || d.city).toLowerCase().includes(area));
    }
    if (filterType !== TYPE_ANY) {
      const t = filterType.toLowerCase();
      result = result.filter((d) => d.propertyType.toLowerCase() === t);
    }
    if (filterBeds !== bedsAny) {
      result = result.filter((d) => matchesUnitType(d.units, filterBeds));
    }
    if (filterDeveloper !== devAny) {
      result = result.filter((d) => (d.developer || '') === filterDeveloper);
    }
    if (filterCompletion !== compAny) {
      const now = new Date();
      result = result.filter((d) => matchesCompletionWindow(d.completionDate, filterCompletion, now));
    }
    if (priceMinValue !== undefined || priceMaxValue !== undefined) {
      result = result.filter((d) => {
        if (d.lowestPrice <= 0) return false;
        if (priceMinValue !== undefined && d.lowestPrice < priceMinValue) return false;
        if (priceMaxValue !== undefined && d.lowestPrice > priceMaxValue) return false;
        return true;
      });
    }
    if (filterStage !== stageAny) {
      result = result.filter((d) => stageKey(d.status) === filterStage);
    }

    const sorted = [...result];
    if (sortBy === 'price_asc') sorted.sort((a, b) => a.lowestPrice - b.lowestPrice);
    else if (sortBy === 'price_desc') sorted.sort((a, b) => b.lowestPrice - a.lowestPrice);
    else if (sortBy === 'newest') sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    else sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return sorted;
  }, [developments, featuredIds, searchQuery, filterArea, filterType, filterBeds, filterDeveloper, filterCompletion, priceMinValue, priceMaxValue, filterStage, sortBy, bedsAny, devAny, compAny, stageAny, recentWindow]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterArea, filterType, filterBeds, filterDeveloper, filterCompletion, filterPriceMin, filterPriceMax, filterStage, sortBy]);

  // Deep-link support: a card badge like "Off-Plan" links to
  // /new-developments?stage=Off-Plan, which lands on a pre-filtered grid.
  useEffect(() => {
    const stageParam = searchParams.get('stage');
    if (!stageParam || !content.stage_options.includes(stageParam)) return;
    setFilterStage(stageParam);
    const el = document.getElementById('browse');
    if (el) window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }, [searchParams, content.stage_options]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterArea(AREA_ANY);
    setFilterType(TYPE_ANY);
    setFilterBeds(bedsAny);
    setFilterDeveloper(devAny);
    setFilterCompletion(compAny);
    setFilterPriceMin('No min');
    setFilterPriceMax('No max');
    setFilterStage(stageAny);
    setSortBy('name');
    setShowLetAgreed(false);
    setRecentWindow('Anytime');
    setPage(1);
  }, [bedsAny, devAny, compAny, stageAny]);

  const devAppliedCount = useMemo(() => [
    filterArea !== AREA_ANY,
    filterType !== TYPE_ANY,
    filterBeds !== bedsAny,
    filterDeveloper !== devAny,
    filterCompletion !== compAny,
    filterPriceMin !== 'No min' || filterPriceMax !== 'No max',
    filterStage !== stageAny,
  ].filter(Boolean).length, [filterArea, filterType, filterBeds, bedsAny, filterDeveloper, devAny, filterCompletion, compAny, filterPriceMin, filterPriceMax, filterStage, stageAny]);

  // ---- loading skeleton ----
  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-[62px] md:pt-[122px] lg:pt-[130px] newdev-ui">
        <Header />
        <div className="relative flex flex-col items-center justify-center pt-16 pb-16 bg-primary">
          <div className="relative z-10 w-full max-w-3xl mx-auto px-4 md:px-6 text-center">
            <div className="h-4 w-40 bg-white/20 rounded mx-auto mb-3 animate-pulse" />
            <div className="h-10 w-64 bg-white/20 rounded mx-auto mb-4 animate-pulse" />
            <div className="h-4 w-80 bg-white/20 rounded mx-auto animate-pulse" />
          </div>
        </div>
        <section className="py-12 md:py-16 px-4 md:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <div className="h-4 w-32 bg-stone-200 rounded mx-auto mb-2 animate-pulse" />
              <div className="h-7 w-64 bg-stone-200 rounded mx-auto animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="rounded-sm overflow-hidden border border-stone-100" style={{ boxShadow: '0 1px 2px rgba(0, 23, 49, 0.04), 0 4px 12px rgba(0, 23, 49, 0.06)' }}>
                  <div className="h-48 sm:h-52 bg-stone-200 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-3/4 bg-stone-200 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-stone-200 rounded animate-pulse" />
                    <div className="h-3 w-1/3 bg-stone-200 rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-stone-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  // ---- error state (real DB/query failure, never "0 results") ----
  if (error) {
    return (
      <div className="min-h-screen bg-white pt-[62px] md:pt-[122px] lg:pt-[130px] newdev-ui">
        <Header />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded-full mb-4">
            <i className="ri-error-warning-line text-2xl text-red-400"></i>
          </div>
          <h1 className="text-primary font-bold text-xl mb-2">{content.error_title}</h1>
          <p className="text-primary/60 text-sm mb-6 text-center max-w-md">{content.error_text}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={refetch}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white border-2 border-primary text-sm font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
            >
              <i className="ri-refresh-line"></i>{content.error_retry_label}
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-primary text-primary text-sm font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white transition-colors"
            >
              <i className="ri-arrow-left-line"></i>{content.error_back_label}
            </Link>
          </div>
        </div>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  // ---- Backend-ordered, backend-gated sections ----
  const sectionNodes: Record<string, React.ReactNode> = {
    benefits: content.benefits_visible
      ? (
        <BenefitsSection
          eyebrow={content.benefits_eyebrow}
          title={content.benefits_title}
          collapseLabel={content.benefits_collapse_label}
          openLabel={content.benefits_open_label}
          items={content.benefits}
        />
      )
      : null,
    featured: content.featured_visible
      ? (
        <FeaturedSection
          eyebrow={content.featured_eyebrow}
          title={content.featured_title}
          text={content.featured_text}
          items={featured}
          onOpen={openDevelopment}
          onRequestBrochure={openBrochureRequest}
        />
      )
      : null,
    devcta: content.devcta_visible
      ? (
        <DeveloperCta
          title={content.devcta_title}
          collapseLabel={content.devcta_collapse_label}
          openLabel={content.devcta_open_label}
          summary={content.devcta_summary}
          text={content.devcta_text}
          button1Label={content.devcta_button1_label}
          button1Link={content.devcta_button1_link}
          button2Label={content.devcta_button2_label}
          button2Link={content.devcta_button2_link}
        />
      )
      : null,
  };

  const order = (content.section_order || 'benefits,featured,browse,devcta')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const browseSection = content.browse_visible ? (
    <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-white" id="browse">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 md:mb-10">
          {content.browse_eyebrow && <p className="text-golden text-sm font-bold tracking-widest uppercase mb-2">{content.browse_eyebrow}</p>}
          {content.browse_title && <h2 className="text-2xl md:text-[28px] font-bold text-primary">{content.browse_title}</h2>}
        </div>

        {/* Shared global search bar - consistent with Buy / Rent / All Properties */}
        <div className="bg-primary rounded-lg p-4 md:p-5">
          <PropertySearchBar
            tone="dark"
            searchQuery={searchQuery}
            onLocationChange={(val) => setSearchQuery(val)}
            placeholderCycle={content.search_placeholders.length ? content.search_placeholders : ['Search developments...']}
            priceMinValue={filterPriceMin}
            onPriceMinChange={setFilterPriceMin}
            priceMinOptions={priceMinOpts.labels}
            priceMaxValue={filterPriceMax}
            onPriceMaxChange={setFilterPriceMax}
            priceMaxOptions={priceMaxOpts.labels}
            priceRangeError={priceRangeError}
            onClearPrice={(filterPriceMin !== 'No min' || filterPriceMax !== 'No max') ? () => { setFilterPriceMin('No min'); setFilterPriceMax('No max'); } : undefined}
            typeValue={filterType}
            onTypeChange={setFilterType}
            typeOptions={typeOptions}
            typeLabel="Development type"
            extraFields={[
              { key: 'unit-type', label: 'Unit type', value: filterBeds, options: content.beds_options, onChange: setFilterBeds },
              { key: 'developer', label: 'Developer', value: filterDeveloper, options: developerOptions, onChange: setFilterDeveloper },
              { key: 'completion', label: 'Completion', value: filterCompletion, options: completionOptions, onChange: setFilterCompletion },
            ]}
            saved={savedSearch}
            onToggleSave={() => setSavedSearch(!savedSearch)}
            onFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
            filtersActive={showAdvancedFilters}
            filtersCount={devAppliedCount}
            onSearch={() => document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />

          {/* Development-specific filters - area & build status */}
          <div className="mt-4 pt-3 border-t border-white/15 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-3">
            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
              <span className="text-sm font-roboto font-semibold text-white whitespace-nowrap">{content.filter_area_label}</span>
              <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="h-10 w-full md:w-auto px-3 text-sm font-roboto text-primary bg-white border border-primary/60 rounded-[4px] focus:outline-none focus:border-primary cursor-pointer">
                {areaOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
              <span className="text-sm font-roboto font-semibold text-white whitespace-nowrap">{content.filter_status_label}</span>
              <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="h-10 w-full md:w-auto px-3 text-sm font-roboto text-primary bg-white border border-primary/60 rounded-[4px] focus:outline-none focus:border-primary cursor-pointer">
                {content.stage_options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <button
              onClick={resetFilters}
              className="w-full md:w-auto md:ml-auto inline-flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-roboto font-semibold text-white border border-white/50 rounded-[4px] hover:bg-white hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-refresh-line text-sm"></i></span>
              {content.filter_clear_label}
            </button>
          </div>
        </div>

        <DevelopmentAdvancedFilters
          isOpen={showAdvancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onApply={(f: DevelopmentFilterState) => {
            setFilterArea(f.area);
            setFilterType(f.type);
            setFilterBeds(f.unitType);
            setFilterDeveloper(f.developer);
            setFilterCompletion(f.completion);
            setFilterPriceMin(f.priceMin);
            setFilterPriceMax(f.priceMax);
            setFilterStage(f.stage);
            setSearchQuery(f.keywords);
            setShowLetAgreed(f.showLetAgreed);
            setPage(1);
          }}
          initialFilters={{
            area: filterArea,
            type: filterType,
            unitType: filterBeds,
            developer: filterDeveloper,
            completion: filterCompletion,
            priceMin: filterPriceMin,
            priceMax: filterPriceMax,
            stage: filterStage,
            keywords: searchQuery,
            showLetAgreed,
          }}
          areaOptions={areaOptions}
          typeOptions={typeOptions}
          unitTypeOptions={content.beds_options}
          developerOptions={developerOptions}
          completionOptions={completionOptions}
          priceMinOptions={priceMinOpts.labels}
          priceMaxOptions={priceMaxOpts.labels}
          stageOptions={content.stage_options}
        />

        {/* Results header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-8 mb-6">
          <p className="text-primary text-base ">
            <span className="font-bold text-xl">{filtered.length}</span>
            <span className="ml-2 text-primary/50">{content.results_suffix}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-primary/50 text-base whitespace-nowrap">{content.sort_label}</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-primary/12 text-primary rounded-sm px-3 py-1.5 text-base focus:outline-none cursor-pointer">
              {content.sort_options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Grid */}
        {paginated.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
              {paginated.map((dev) => (
                <DevelopmentCard key={dev.key} development={dev} onOpen={openDevelopment} />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 flex items-center justify-center bg-stone-50 rounded-full mx-auto mb-4">
              <i className="ri-search-line text-2xl text-primary/30"></i>
            </div>
            <h3 className="font-bold text-primary text-lg mb-2">{content.empty_title}</h3>
            {content.empty_text && <p className="text-primary/50 text-sm mb-4">{content.empty_text}</p>}
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-primary/12 text-primary text-sm font-semibold tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white hover:border-primary transition-colors"
            >
              <i className="ri-refresh-line"></i>{content.empty_button}
            </button>
            <RecentActivitySuggestion
              source="developments"
              location={filterArea !== AREA_ANY ? filterArea : undefined}
              addedWindow={recentWindow}
              onView={(targetWindow) => {
                setFilterPriceMin('No min');
                setFilterPriceMax('No max');
                setFilterBeds(bedsAny);
                setFilterType(TYPE_ANY);
                setFilterDeveloper(devAny);
                setFilterCompletion(compAny);
                setFilterStage(stageAny);
                setSearchQuery('');
                setRecentWindow(targetWindow);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>
    </section>
  ) : null;

  return (
    <div className="min-h-screen bg-white pt-[62px] md:pt-[122px] lg:pt-[130px] newdev-ui">
      <Header />

      {content.hero_visible && (
        <NewDevHero
          eyebrow={content.hero_eyebrow}
          title={content.hero_title}
          subtitle={content.hero_subtitle}
          image={content.hero_image}
        />
      )}

      {/* Breadcrumb below the banner - keeps the blue flow intact */}
      <PageBreadcrumbs />

      {order.map((key) => (
        <Fragment key={key}>
          {key === 'browse' ? browseSection : sectionNodes[key] || null}
        </Fragment>
      ))}

      <RecentlyViewedDevelopments />

      <PageContactSection />
      <Footer />
      <BackToTop />

      <DevelopmentModal development={selected} onClose={() => setSelected(null)} requestBrochure={requestBrochure} />
    </div>
  );
}