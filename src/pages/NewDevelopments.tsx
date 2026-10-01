import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import MobileCollapsible from '@/components/feature/MobileCollapsible';
import Pagination from '@/components/feature/Pagination';
import PropertySearchBar from '@/components/feature/PropertySearchBar';
import { useNewDevelopments } from '@/hooks/useNewDevelopments';
import type { Development } from '@/hooks/useNewDevelopments';
import DevelopmentCard from '@/pages/NewDevelopments/components/DevelopmentCard';
import FeaturedDevelopmentCard from '@/pages/NewDevelopments/components/FeaturedDevelopmentCard';
import DevelopmentModal from '@/pages/NewDevelopments/components/DevelopmentModal';

const ITEMS_PER_PAGE = 9;
const BEDS_OPTIONS = ['Any unit', 'Studio', '1 Bed', '2 Beds', '3 Beds', '4 Beds', '5+ Beds'];
const DEVELOPER_DEFAULT = 'All Developers';
const COMPLETION_DEFAULT = 'Any Completion';
const STAGE_OPTIONS = ['All Status', 'Completed', 'Off-Plan', 'Under Construction'];
const SORT_OPTIONS = [
  { value: 'name', label: 'Name: A to Z' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const benefits = [
  { icon: 'ri-price-tag-3-line', title: 'Early-Bird Pricing', desc: 'Secure units at pre-construction prices, often 15-20% below completion value.' },
  { icon: 'ri-palette-line', title: 'Personalised Finishes', desc: 'Choose layouts and finishes to match your taste before construction completes.' },
  { icon: 'ri-shield-check-line', title: 'Modern Standards', desc: 'Latest building codes, energy efficiency and contemporary design included.' },
  { icon: 'ri-line-chart-line', title: 'Capital Growth', desc: 'Units typically gain significant value between launch and completion.' },
  { icon: 'ri-file-list-3-line', title: 'Staged Payment Plans', desc: 'Payments tied to construction milestones make buying more accessible.' },
  { icon: 'ri-tools-line', title: 'Warranty Protection', desc: 'Structural warranties and builder guarantees for complete peace of mind.' },
];

/** Does any real unit in this project satisfy the selected unit-type filter? */
function matchesUnitType(units: { bedrooms: number }[], filter: string): boolean {
  if (!filter || filter === 'Any unit') return true;
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
  if (s === 'completed' || s === '' || s === 'ready') return 'Completed';
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
  if (prices.length === 0) return [{ label: 'Any Price', min: 0, max: Infinity }];
  const q = (p: number) => prices[Math.min(prices.length - 1, Math.floor(prices.length * p))];
  const p20 = q(0.2);
  const p40 = q(0.4);
  const p60 = q(0.6);
  const p80 = q(0.8);
  return [
    { label: 'Any Price', min: 0, max: Infinity },
    { label: `Under ${formatCompact(p20)}`, min: 0, max: p20 },
    { label: `${formatCompact(p20)} - ${formatCompact(p40)}`, min: p20, max: p40 },
    { label: `${formatCompact(p40)} - ${formatCompact(p60)}`, min: p40, max: p60 },
    { label: `${formatCompact(p60)} - ${formatCompact(p80)}`, min: p60, max: p80 },
    { label: `Over ${formatCompact(p80)}`, min: p80, max: Infinity },
  ];
}

export default function NewDevelopments() {
  const { developments, loading, error, refetch } = useNewDevelopments();
  const [selected, setSelected] = useState<Development | null>(null);
  const [requestBrochure, setRequestBrochure] = useState(false);

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
  const [filterArea, setFilterArea] = useState('All Areas');
  const [filterType, setFilterType] = useState('All Types');
  const [filterBeds, setFilterBeds] = useState('Any unit');
  const [filterDeveloper, setFilterDeveloper] = useState(DEVELOPER_DEFAULT);
  const [filterCompletion, setFilterCompletion] = useState(COMPLETION_DEFAULT);
  const [filterPrice, setFilterPrice] = useState('Any Price');
  const [filterStage, setFilterStage] = useState('All Status');
  const [sortBy, setSortBy] = useState('name');
  const [page, setPage] = useState(1);
  const [savedSearch, setSavedSearch] = useState(false);

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
    return ['All Areas', ...list];
  }, [developments]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    developments.forEach((d) => {
      const t = (d.propertyType || '').trim();
      if (t) set.add(t.charAt(0).toUpperCase() + t.slice(1));
    });
    return ['All Types', ...Array.from(set).sort()];
  }, [developments]);

  const priceRanges = useMemo(() => buildPriceRanges(developments), [developments]);

  // Development-specific filter options - every option comes from a real record.
  const developerOptions = useMemo(() => {
    const set = new Set<string>();
    developments.forEach((d) => {
      const v = (d.developer || '').trim();
      if (v) set.add(v);
    });
    return [DEVELOPER_DEFAULT, ...Array.from(set).sort()];
  }, [developments]);

  const completionOptions = useMemo(() => {
    const set = new Set<string>();
    developments.forEach((d) => {
      const y = completionYear(d.completionDate);
      if (y) set.add(y);
    });
    return [COMPLETION_DEFAULT, ...Array.from(set).sort()];
  }, [developments]);

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
    if (filterArea !== 'All Areas') {
      const area = filterArea.toLowerCase();
      result = result.filter((d) => (d.location || d.city).toLowerCase().includes(area));
    }
    if (filterType !== 'All Types') {
      const t = filterType.toLowerCase();
      result = result.filter((d) => d.propertyType.toLowerCase() === t);
    }
    if (filterBeds !== 'Any unit') {
      // A project stays visible if any of its real units meets the unit-type filter.
      result = result.filter((d) => matchesUnitType(d.units, filterBeds));
    }
    if (filterDeveloper !== DEVELOPER_DEFAULT) {
      result = result.filter((d) => (d.developer || '') === filterDeveloper);
    }
    if (filterCompletion !== COMPLETION_DEFAULT) {
      result = result.filter((d) => completionYear(d.completionDate) === filterCompletion);
    }
    if (filterPrice !== 'Any Price') {
      const range = priceRanges.find((r) => r.label === filterPrice);
      if (range) result = result.filter((d) => d.lowestPrice > 0 && d.lowestPrice >= range.min && d.lowestPrice <= range.max);
    }
    if (filterStage !== 'All Status') {
      result = result.filter((d) => stageKey(d.status) === filterStage);
    }

    const sorted = [...result];
    if (sortBy === 'price_asc') sorted.sort((a, b) => a.lowestPrice - b.lowestPrice);
    else if (sortBy === 'price_desc') sorted.sort((a, b) => b.lowestPrice - a.lowestPrice);
    else if (sortBy === 'newest') sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    else sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return sorted;
  }, [developments, featuredIds, searchQuery, filterArea, filterType, filterBeds, filterDeveloper, filterCompletion, filterPrice, filterStage, sortBy, priceRanges]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterArea, filterType, filterBeds, filterDeveloper, filterCompletion, filterPrice, filterStage, sortBy]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterArea('All Areas');
    setFilterType('All Types');
    setFilterBeds('Any unit');
    setFilterDeveloper(DEVELOPER_DEFAULT);
    setFilterCompletion(COMPLETION_DEFAULT);
    setFilterPrice('Any Price');
    setFilterStage('All Status');
    setSortBy('name');
    setPage(1);
  }, []);

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
          <h1 className="text-primary font-bold text-xl mb-2">Unable to load developments</h1>
          <p className="text-primary/60 text-sm mb-1 text-center max-w-md">{error}</p>
          <p className="text-primary/50 text-xs mb-6 text-center max-w-md">
            Please try again in a moment.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={refetch}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white border-2 border-primary text-sm font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
            >
              <i className="ri-refresh-line"></i>Retry
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-primary text-primary text-sm font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white transition-colors"
            >
              <i className="ri-arrow-left-line"></i>Back to Home
            </Link>
          </div>
        </div>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-[60px] md:pt-[130px] lg:pt-[148px] newdev-ui">
      <Header />

      {/* Hero */}
      <div
        className="relative flex flex-col items-center justify-center text-center overflow-hidden pt-12 pb-12 md:pt-16 md:pb-16 bg-gradient-to-br from-primary via-primary to-accent/70"
        style={{ minHeight: '320px' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/50"></div>
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 md:px-6 text-center">
          <p className="text-golden text-sm md:text-base font-bold tracking-widest uppercase mb-3 md:mb-4">Premium Developments</p>
          <h1 className="text-[28px] md:text-[32px] lg:text-[36px] font-bold text-white mb-4 md:mb-5 leading-tight">New Developments &amp; Projects</h1>
          <p className="text-white/80 font-medium text-sm md:text-base lg:text-lg leading-relaxed max-w-xl mx-auto">
            Off-plan and completed projects from leading developers. Secure your unit at launch pricing - choose your unit type and reserve today.
          </p>
        </div>
      </div>

      {/* Breadcrumb below the banner - keeps the blue flow intact */}
      <PageBreadcrumbs />

      {/* Benefits - directly below the hero */}
      <section className="py-10 md:py-16 lg:py-20 px-4 md:px-6" style={{ background: '#f5f7f7' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-5 md:mb-14">
            <p className="text-golden text-sm md:text-base font-bold tracking-widest uppercase mb-2 md:mb-3">The Benefits</p>
            <h2 className="text-2xl md:text-[28px] font-bold text-primary">Why Buy a New Development?</h2>
          </div>

          <MobileCollapsible
            label="See the key benefits"
            openLabel="Hide the benefits"
            summary={benefits.slice(0, 3).map((b) => b.title).join(' · ')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              {benefits.map((b) => (
              <div key={b.title} className="p-5 md:p-6 lg:p-7 border rounded-sm bg-white hover:-translate-y-1 transition-all duration-300" style={{ borderColor: '#f3f4f6' }}>
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-primary rounded-full mb-4 md:mb-5">
                  <i className={`${b.icon} text-lg md:text-xl text-white`}></i>
                </div>
                <h3 className="text-primary font-bold text-sm md:text-base mb-2">{b.title}</h3>
                <p className="text-primary/70 text-xs md:text-sm leading-relaxed">{b.desc}</p>
              </div>
              ))}
            </div>
          </MobileCollapsible>
        </div>
      </section>

      {/* Featured New Developments - real is_featured listings, alternating layout */}
      {featured.length > 0 && (
        <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-[#f5f7f7]" id="featured">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 md:mb-12 text-start">
              <p className="text-golden text-sm font-bold tracking-widest uppercase mb-2">Featured</p>
              <h2 className="text-2xl md:text-[28px] font-bold text-primary">Featured New Developments</h2>
              <p className="text-primary/70 text-sm md:text-base mt-3 max-w-2xl">
                Launch offers and final units from Kenya's leading developers - reserve your unit at entry pricing.
              </p>
            </div>
            <div className="space-y-6 md:space-y-8">
              {featured.map((dev, idx) => (
                <FeaturedDevelopmentCard key={dev.key} development={dev} imageLeft={idx % 2 === 0} onOpen={openDevelopment} onRequestBrochure={openBrochureRequest} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All New Developments */}
      <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-white" id="browse">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <p className="text-golden text-sm font-bold tracking-widest uppercase mb-2">Development Projects</p>
            <h2 className="text-2xl md:text-[28px] font-bold text-primary">New Development Projects</h2>
          </div>

          {/* Shared global search bar - consistent with Buy / Rent / All Properties */}
          <div className="bg-primary rounded-lg p-4 md:p-5">
            <PropertySearchBar
              tone="dark"
              searchQuery={searchQuery}
              onLocationChange={(val) => setSearchQuery(val)}
              placeholderCycle={[
                "Looking for an off-plan apartment...",
                "Looking for a gated community home...",
                "Looking for a new townhouse...",
                "Looking for a completed development...",
              ]}
              priceValue={filterPrice}
              onPriceChange={setFilterPrice}
              priceOptions={priceRanges.map((r) => r.label)}
              typeValue={filterType}
              onTypeChange={setFilterType}
              typeOptions={typeOptions}
              typeLabel="Development type"
              extraFields={[
                { key: 'unit-type', label: 'Unit type', value: filterBeds, options: BEDS_OPTIONS, onChange: setFilterBeds },
                { key: 'developer', label: 'Developer', value: filterDeveloper, options: developerOptions, onChange: setFilterDeveloper },
                { key: 'completion', label: 'Completion', value: filterCompletion, options: completionOptions, onChange: setFilterCompletion },
              ]}
              saved={savedSearch}
              onToggleSave={() => setSavedSearch(!savedSearch)}
              onSearch={() => document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />

            {/* Development-specific filters - area & build status */}
            <div className="mt-4 pt-3 border-t border-white/15 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-3">
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
                <span className="text-sm font-roboto font-semibold text-white whitespace-nowrap">Area</span>
                <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="h-10 w-full md:w-auto px-3 text-sm font-roboto text-primary bg-white border border-primary/60 rounded-[4px] focus:outline-none focus:border-primary cursor-pointer">
                  {areaOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
                <span className="text-sm font-roboto font-semibold text-white whitespace-nowrap">Status</span>
                <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="h-10 w-full md:w-auto px-3 text-sm font-roboto text-primary bg-white border border-primary/60 rounded-[4px] focus:outline-none focus:border-primary cursor-pointer">
                  {STAGE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <button
                onClick={resetFilters}
                className="w-full md:w-auto md:ml-auto inline-flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-roboto font-semibold text-white border border-white/50 rounded-[4px] hover:bg-white hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
              >
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-refresh-line text-sm"></i></span>
                Clear
              </button>
            </div>
          </div>

          {/* Results header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-8 mb-6">
            <p className="text-primary text-base ">
              <span className="font-bold text-xl">{filtered.length}</span>
              <span className="ml-2 text-primary/50">development projects</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="text-primary/50 text-base whitespace-nowrap">Sort:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-primary/12 text-primary rounded-sm px-3 py-1.5 text-base focus:outline-none cursor-pointer">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
              <h3 className="font-bold text-primary text-lg mb-2">No developments found</h3>
              <p className="text-primary/50 text-sm mb-4">Try adjusting your filters or search terms.</p>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-primary/12 text-primary text-sm font-semibold tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white hover:border-primary transition-colors"
              >
                <i className="ri-refresh-line"></i>Clear All Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Developer CTA */}
      <section className="py-10 md:py-14 lg:py-16 px-4 md:px-6 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-white font-bold text-2xl md:text-3xl mb-3 md:mb-4">Have a Development to Sell?</h2>
          <MobileCollapsible
            label="Why partner with us?"
            openLabel="Hide details"
            summary="Trusted agency · Qualified buyers · Full marketing"
            icon="ri-team-line"
            variant="dark"
            className="max-w-lg mx-auto text-left md:text-center"
          >
            <p className="text-white/70 text-xs md:text-sm mb-6 md:mb-8 max-w-lg mx-auto">
              We work with leading developers to market and sell premium new developments. Partner with a trusted agency and reach qualified buyers.
            </p>
          </MobileCollapsible>
          <div className="mt-6 md:mt-0 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <Link to="/contact" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-3.5 bg-golden text-white text-sm md:text-base font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
              <i className="ri-mail-line"></i>Contact Our Team
            </Link>
            <Link to="/landlords" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-3.5 border border-white/50 text-white text-sm md:text-base font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors">
              <i className="ri-bar-chart-2-line"></i>Request Valuation
            </Link>
          </div>
        </div>
      </section>

      <PageContactSection />
      <Footer />
      <BackToTop />

      <DevelopmentModal development={selected} onClose={() => setSelected(null)} requestBrochure={requestBrochure} />
    </div>
  );
}