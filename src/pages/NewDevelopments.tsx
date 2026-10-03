import { useState, useMemo, useEffect, useCallback, Fragment } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import Pagination from '@/components/feature/Pagination';
import PropertySearchBar from '@/components/feature/PropertySearchBar';
import ActiveFilterChips, { type ActiveFilterChip } from '@/components/feature/ActiveFilterChips';
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

const ITEMS_PER_PAGE = 9;
const AREA_ANY = 'All Areas';
const TYPE_ANY = 'All Types';
const PRICE_ANY = 'Any Price';

/** Does any real unit in this project satisfy the selected unit-type filter? */
function matchesUnitType(units: { bedrooms: number }[], filter: string): boolean {
  if (!filter) return true;
  if (filter === 'Studio') return units.some((u) => u.bedrooms <= 0);
  const m = filter.match(/^(\d+)/);
  if (!m) return true;
  const n = parseInt(m[1], 10);
  return units.some((u) => u.bedrooms >= n);
}

/** Extract the year from a real completion date, or '' when absent/invalid. */
function completionYear(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return String(d.getFullYear());
}

function stageKey(stage: string): string {
  const s = (stage || '').trim().toLowerCase();
  if (s === 'off_plan') return 'Off-Plan';
  if (s === 'under_construction') return 'Under Construction';
  return 'Completed';
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

interface PriceRange {
  label: string;
  min: number;
  max: number;
}

function buildPriceRanges(items: Development[]): PriceRange[] {
  const prices = items.map((d) => d.lowestPrice).filter((p) => p > 0).sort((a, b) => a - b);
  if (prices.length === 0) return [{ label: PRICE_ANY, min: 0, max: Infinity }];
  const q = (p: number) => prices[Math.min(prices.length - 1, Math.floor(prices.length * p))];
  const p20 = q(0.2);
  const p40 = q(0.4);
  const p60 = q(0.6);
  const p80 = q(0.8);
  return [
    { label: PRICE_ANY, min: 0, max: Infinity },
    { label: `Under ${formatCompact(p20)}`, min: 0, max: p20 },
    { label: `${formatCompact(p20)} - ${formatCompact(p40)}`, min: p20, max: p40 },
    { label: `${formatCompact(p40)} - ${formatCompact(p60)}`, min: p40, max: p60 },
    { label: `${formatCompact(p60)} - ${formatCompact(p80)}`, min: p60, max: p80 },
    { label: `Over ${formatCompact(p80)}`, min: p80, max: Infinity },
  ];
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
  const [filterPrice, setFilterPrice] = useState(PRICE_ANY);
  const [filterStage, setFilterStage] = useState(stageAny);
  const [sortBy, setSortBy] = useState('name');
  const [page, setPage] = useState(1);
  const [savedSearch, setSavedSearch] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showLetAgreed, setShowLetAgreed] = useState(false);

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

  const priceRanges = useMemo(() => buildPriceRanges(developments), [developments]);

  // Development-specific filter options - every option comes from a real record.
  const developerOptions = useMemo(() => {
    const set = new Set<string>();
    developments.forEach((d) => {
      const v = (d.developer || '').trim();
      if (v) set.add(v);
    });
    return [devAny, ...Array.from(set).sort()];
  }, [developments, devAny]);

  const completionOptions = useMemo(() => {
    const set = new Set<string>();
    developments.forEach((d) => {
      const y = completionYear(d.completionDate);
      if (y) set.add(y);
    });
    return [compAny, ...Array.from(set).sort()];
  }, [developments, compAny]);

  // ---- Featured developments: real authoritative is_featured flag ----
  const featured = useMemo(() => developments.filter((d) => d.isFeatured).slice(0, 4), [developments]);
  const featuredIds = useMemo(() => new Set(featured.map((d) => d.key)), [featured]);

  // ---- filtering (against returned records; exclude featured from the grid) ----
  const filtered = useMemo(() => {
    let result = developments.filter((d) => !featuredIds.has(d.key));

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
      result = result.filter((d) => completionYear(d.completionDate) === filterCompletion);
    }
    if (filterPrice !== PRICE_ANY) {
      const range = priceRanges.find((r) => r.label === filterPrice);
      if (range) result = result.filter((d) => d.lowestPrice > 0 && d.lowestPrice >= range.min && d.lowestPrice <= range.max);
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
  }, [developments, featuredIds, searchQuery, filterArea, filterType, filterBeds, filterDeveloper, filterCompletion, filterPrice, filterStage, sortBy, priceRanges, bedsAny, devAny, compAny, stageAny]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterArea, filterType, filterBeds, filterDeveloper, filterCompletion, filterPrice, filterStage, sortBy]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterArea(AREA_ANY);
    setFilterType(TYPE_ANY);
    setFilterBeds(bedsAny);
    setFilterDeveloper(devAny);
    setFilterCompletion(compAny);
    setFilterPrice(PRICE_ANY);
    setFilterStage(stageAny);
    setSortBy('name');
    setShowLetAgreed(false);
    setPage(1);
  }, [bedsAny, devAny, compAny, stageAny]);

  const devAppliedCount = useMemo(() => [
    filterArea !== AREA_ANY,
    filterType !== TYPE_ANY,
    filterBeds !== bedsAny,
    filterDeveloper !== devAny,
    filterCompletion !== compAny,
    filterPrice !== PRICE_ANY,
    filterStage !== stageAny,
  ].filter(Boolean).length, [filterArea, filterType, filterBeds, bedsAny, filterDeveloper, devAny, filterCompletion, compAny, filterPrice, filterStage, stageAny]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterArea !== AREA_ANY) chips.push({ key: 'area', label: filterArea, onRemove: () => setFilterArea(AREA_ANY) });
    if (filterType !== TYPE_ANY) chips.push({ key: 'type', label: filterType, onRemove: () => setFilterType(TYPE_ANY) });
    if (filterBeds !== bedsAny) chips.push({ key: 'beds', label: filterBeds, onRemove: () => setFilterBeds(bedsAny) });
    if (filterDeveloper !== devAny) chips.push({ key: 'developer', label: filterDeveloper, onRemove: () => setFilterDeveloper(devAny) });
    if (filterCompletion !== compAny) chips.push({ key: 'completion', label: `Completion ${filterCompletion}`, onRemove: () => setFilterCompletion(compAny) });
    if (filterPrice !== PRICE_ANY) chips.push({ key: 'price', label: filterPrice, onRemove: () => setFilterPrice(PRICE_ANY) });
    if (filterStage !== stageAny) chips.push({ key: 'stage', label: filterStage, onRemove: () => setFilterStage(stageAny) });
    if (searchQuery.trim()) chips.push({ key: 'search', label: `"${searchQuery.trim()}"`, onRemove: () => setSearchQuery('') });
    return chips;
  }, [filterArea, filterType, filterBeds, bedsAny, filterDeveloper, devAny, filterCompletion, compAny, filterPrice, filterStage, stageAny, searchQuery]);

  // ---- loading skeleton ----
  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-[60px] md:pt-[130px] lg:pt-[148px] newdev-ui">
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
      <div className="min-h-screen bg-white pt-[60px] md:pt-[130px] lg:pt-[148px] newdev-ui">
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
            priceValue={filterPrice}
            onPriceChange={setFilterPrice}
            priceOptions={priceRanges.map((r) => r.label)}
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
            setFilterPrice(f.price);
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
            price: filterPrice,
            stage: filterStage,
            keywords: searchQuery,
            showLetAgreed,
          }}
          areaOptions={areaOptions}
          typeOptions={typeOptions}
          unitTypeOptions={content.beds_options}
          developerOptions={developerOptions}
          completionOptions={completionOptions}
          priceOptions={priceRanges.map((r) => r.label)}
          stageOptions={content.stage_options}
        />

        <ActiveFilterChips chips={activeChips} onClearAll={resetFilters} className="mt-6" />

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
          </div>
        )}
      </div>
    </section>
  ) : null;

  return (
    <div className="min-h-screen bg-white pt-[60px] md:pt-[130px] lg:pt-[148px] newdev-ui">
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