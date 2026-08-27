import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import QuickViewModal from '@/components/feature/QuickViewModal';
import ContactAgentModal from '@/components/feature/ContactAgentModal';
import { useNewDevelopments } from '@/hooks/useNewDevelopments';
import type { NewDevListing, DevelopmentGroup } from '@/hooks/useNewDevelopments';
import { useCurrency } from '@/hooks/useCurrency';
import CompareModal from '@/pages/NewDevelopments/components/CompareModal';
import NotifyModal from '@/pages/NewDevelopments/components/NotifyModal';
import Pagination from '@/components/feature/Pagination';
import { toTitleCase } from '@/lib/formatting';

const ITEMS_PER_PAGE = 9;
const MAX_VISIBLE_UNITS = 3;

const BEDS_OPTIONS = ['Any Beds', '1+', '2+', '3+', '4+', '5+'];
const COMPLETION_OPTIONS = ['All Status', 'Completed', 'Off-Plan', 'Under Construction'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const benefits = [
  { icon: 'ri-price-tag-3-line', title: 'Early-Bird Pricing', desc: 'Secure properties at pre-construction prices, often 15-20% below market value upon completion.' },
  { icon: 'ri-palette-line', title: 'Customisation Options', desc: 'Choose finishes, layouts, and fixtures to match your personal taste before construction is complete.' },
  { icon: 'ri-shield-check-line', title: 'Modern Standards', desc: 'Benefit from the latest building codes, energy efficiency, and contemporary design.' },
  { icon: 'ri-line-chart-line', title: 'Capital Appreciation', desc: 'Properties typically gain significant value between launch and completion.' },
  { icon: 'ri-file-list-3-line', title: 'Flexible Payment Plans', desc: 'Staged payments tied to construction milestones, making luxury more accessible.' },
  { icon: 'ri-tools-line', title: 'Warranty Protection', desc: 'New builds come with structural warranties and builder guarantees for peace of mind.' },
];

const whatToLookFor = [
  { icon: 'ri-building-2-line', title: 'Developer Track Record', desc: 'Research past projects, delivery timelines, and financial stability. A reputable developer with a history of on-time delivery reduces risk significantly.' },
  { icon: 'ri-map-pin-2-line', title: 'Location & Infrastructure', desc: 'Check proximity to transport links, schools, hospitals, and shopping. Future infrastructure projects can dramatically boost property values.' },
  { icon: 'ri-money-cny-circle-line', title: 'Payment Plans & Milestones', desc: 'Understand deposit requirements, instalment schedules tied to construction milestones, and penalties for late payment. Milestone-based plans are safer.' },
  { icon: 'ri-shield-check-line', title: 'Legal Documentation', desc: 'Verify title deeds, building permits, NEMA approvals, and survey plans. Ensure the developer has all necessary approvals before committing.' },
  { icon: 'ri-calendar-line', title: 'Completion Timeline', desc: 'Ask for realistic delivery dates with buffer for delays. Off-plan purchases typically take 18–36 months. Check if there are penalty clauses for delays.' },
  { icon: 'ri-star-smile-line', title: 'Amenities & Specifications', desc: 'Review finishes, fittings, parking ratios, and common facilities. Visit the show house if available and compare against the specification sheet.' },
];

function parseBedsFilter(filter: string): number | null {
  const match = filter.match(/^(\d+)\+$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function formatCompactPrice(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function getCompletionStatus(completionDate: string): { label: string; color: string } {
  const cd = completionDate.toLowerCase().trim();
  if (!cd || cd === 'completed' || cd === 'ready') return { label: 'Completed', color: 'bg-[#28a745]' };
  if (cd.includes('2026') || cd.includes('q1') || cd.includes('q2') || cd.includes('q3') || cd.includes('q4')) return { label: 'Under Construction', color: 'bg-amber-500' };
  return { label: 'Off-Plan', color: 'bg-[#fd7e14]' };
}

function getStageInfo(stage: string | undefined, completionDate: string): { label: string; color: string } {
  const s = (stage || '').toLowerCase();
  if (s === 'off_plan') return { label: 'Off-Plan', color: 'bg-[#fd7e14]' };
  if (s === 'under_construction') return { label: 'Under Construction', color: 'bg-amber-500' };
  if (s === 'completed') return { label: 'Completed', color: 'bg-[#28a745]' };
  if (s === 'sold_off_plan') return { label: 'Sold Off-Plan', color: 'bg-[#6c757d]' };
  if (s === 'sold_out') return { label: 'Sold Out', color: 'bg-[#dc3545]' };
  return getCompletionStatus(completionDate);
}

function getDevLabel(dev: DevelopmentGroup): string {
  if (dev.unitOptions.length <= 1) {
    const pt = dev.propertyType.toLowerCase();
    if (pt === 'house' || pt === 'villa' || pt === 'townhouse' || pt === 'bungalow') return 'Houses with';
    if (pt === 'apartment' || pt === 'penthouse' || pt === 'studio' || pt === 'condo') return 'Apartments with';
  }
  return 'Houses & apartments with';
}

function unitTypeLabel(beds: number): string {
  if (beds <= 0) return 'Studio';
  if (beds === 1) return '1 Bed';
  return `${beds} Beds`;
}

function getUnitTypesForListing(dev: NewDevListing, developments: DevelopmentGroup[]): string[] {
  const group = developments.find((d) => d.slug === dev.slug || d.name === dev.title);
  const options = group && group.unitOptions.length > 0
    ? group.unitOptions
    : [{ beds: dev.beds, fromPrice: 0, currency: dev.currency }];
  return [...new Set(options.map((o) => unitTypeLabel(o.beds)))];
}

export default function NewDevelopments() {
  const { format } = useCurrency();
  const { featuredListings, developments, loading, error, locations } = useNewDevelopments();

  // ---- filter state ----
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArea, setFilterArea] = useState('All Areas');
  const [filterPrice, setFilterPrice] = useState('Any Price');
  const [filterBeds, setFilterBeds] = useState('Any Beds');
  const [filterCompletion, setFilterCompletion] = useState('All Status');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [quickViewProperty, setQuickViewProperty] = useState<NewDevListing | null>(null);
  const [showAllFeatured, setShowAllFeatured] = useState(false);

  // ---- save/bookmark ----
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('saved_devs') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    localStorage.setItem('saved_devs', JSON.stringify(savedIds));
  }, [savedIds]);
  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  // ---- compare ----
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('compare_devs') || '[]'); } catch { return []; }
  });
  const [compareMode, setCompareMode] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [notifyModalDev, setNotifyModalDev] = useState<DevelopmentGroup | null>(null);
  const [expandedFloorPlanId, setExpandedFloorPlanId] = useState<string | null>(null);
  const [expandedUnitIds, setExpandedUnitIds] = useState<string[]>([]);
  const [enquireDev, setEnquireDev] = useState<{
    title: string;
    id: string;
    slug: string;
    price: string;
    location: string;
  } | null>(null);
  useEffect(() => {
    localStorage.setItem('compare_devs', JSON.stringify(compareIds));
  }, [compareIds]);
  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }, []);

  const toggleUnitOptions = useCallback((id: string) => {
    setExpandedUnitIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  // ---- recently viewed ----
  const [recentlyViewed, setRecentlyViewed] = useState<Array<{
    id: string; slug: string; name: string; image: string; location: string;
    priceRaw: number; currency: string; timestamp: number;
  }>>(() => {
    try { return JSON.parse(localStorage.getItem('recently_viewed_devs') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    const handler = () => {
      try {
        setRecentlyViewed(JSON.parse(localStorage.getItem('recently_viewed_devs') || '[]'));
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', handler);
    const interval = setInterval(handler, 2000);
    return () => { window.removeEventListener('storage', handler); clearInterval(interval); };
  }, []);

  // ---- sticky filter bar ----
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [filterSticky, setFilterSticky] = useState(false);
  useEffect(() => {
    const el = filterBarRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFilterSticky(!entry.isIntersecting),
      { threshold: [0] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ---- dynamic price ranges ----
  const priceRanges = useMemo(() => {
    const allPrices = developments.flatMap((d) => d.unitOptions.map((u) => u.fromPrice));
    if (allPrices.length === 0) return [{ label: 'Any Price', min: 0, max: Infinity }];
    const sorted = allPrices.sort((a, b) => a - b);
    const p20 = sorted[Math.floor(sorted.length * 0.2)] || sorted[0];
    const p40 = sorted[Math.floor(sorted.length * 0.4)] || sorted[0];
    const p60 = sorted[Math.floor(sorted.length * 0.6)] || sorted[sorted.length - 1];
    const p80 = sorted[Math.floor(sorted.length * 0.8)] || sorted[sorted.length - 1];
    const currencyCounts: Record<string, number> = {};
    developments.forEach((d) => {
      d.unitOptions.forEach((u) => {
        currencyCounts[u.currency] = (currencyCounts[u.currency] || 0) + 1;
      });
    });
    const dominant = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'USD';
    const sym = dominant === 'KES' ? 'KSh' : dominant === 'USD' ? '$' : dominant === 'GBP' ? '£' : dominant === 'EUR' ? '€' : dominant;
    const fmt = (n: number) => `${sym}${formatCompactPrice(n)}`;
    return [
      { label: 'Any Price', min: 0, max: Infinity },
      { label: `Under ${fmt(p20)}`, min: 0, max: p20 },
      { label: `${fmt(p20)} – ${fmt(p40)}`, min: p20, max: p40 },
      { label: `${fmt(p40)} – ${fmt(p60)}`, min: p40, max: p60 },
      { label: `${fmt(p60)} – ${fmt(p80)}`, min: p60, max: p80 },
      { label: `Over ${fmt(p80)}`, min: p80, max: Infinity },
    ];
  }, [developments]);

  // ---- filtering ----
  const filteredDevs = useMemo(() => {
    let result = [...developments];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(q) || d.location.toLowerCase().includes(q) || d.developer.toLowerCase().includes(q));
    }

    if (filterArea !== 'All Areas') {
      const area = filterArea.toLowerCase();
      result = result.filter((d) => d.area.toLowerCase().includes(area));
    }

    const selectedRange = priceRanges.find((r) => r.label === filterPrice);
    if (selectedRange && filterPrice !== 'Any Price') {
      result = result.filter((d) => d.unitOptions.some((u) => u.fromPrice >= selectedRange.min && u.fromPrice <= selectedRange.max));
    }

    const bedsMin = parseBedsFilter(filterBeds);
    if (bedsMin !== null) {
      result = result.filter((d) => d.unitOptions.some((u) => u.beds >= bedsMin));
    }

    if (filterCompletion === 'Completed') {
      result = result.filter((d) => {
        const s = (d.developmentStage || '').toLowerCase();
        return s === '' || s === 'completed' || s === 'ready';
      });
    } else if (filterCompletion === 'Off-Plan') {
      result = result.filter((d) => (d.developmentStage || '').toLowerCase() === 'off_plan');
    } else if (filterCompletion === 'Under Construction') {
      result = result.filter((d) => (d.developmentStage || '').toLowerCase() === 'under_construction');
    }

    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => {
          const aMin = Math.min(...a.unitOptions.map((u) => u.fromPrice));
          const bMin = Math.min(...b.unitOptions.map((u) => u.fromPrice));
          return aMin - bMin;
        });
        break;
      case 'price_desc':
        result.sort((a, b) => {
          const aMax = Math.max(...a.unitOptions.map((u) => u.fromPrice));
          const bMax = Math.max(...b.unitOptions.map((u) => u.fromPrice));
          return bMax - aMax;
        });
        break;
      default:
        break;
    }

    return result;
  }, [developments, searchQuery, filterArea, filterPrice, filterBeds, filterCompletion, sortBy, priceRanges]);

  // ---- pagination ----
  const visibleFeatured = showAllFeatured ? featuredListings : featuredListings.slice(0, 6);
  const totalPages = Math.max(1, Math.ceil(filteredDevs.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedDevs = filteredDevs.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [searchQuery, filterArea, filterPrice, filterBeds, filterCompletion, sortBy]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterArea('All Areas');
    setFilterPrice('Any Price');
    setFilterBeds('Any Beds');
    setFilterCompletion('All Status');
    setSortBy('newest');
    setPage(1);
  }, []);

  // ---- render helpers ----
  const renderFilterBar = (sticky: boolean) => (
    <div className={`bg-primary px-3 md:px-5 py-3 md:py-4 ${sticky ? 'shadow-lg rounded-b-sm' : 'rounded-sm'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 md:gap-3">
          <div className="flex-1 min-w-0 relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm"></i>
            <input
              placeholder="Looking for"
              className="w-full bg-white/10 border border-white/20 rounded-sm pl-9 pr-4 py-2 md:py-2.5 text-sm font-roboto text-white placeholder:text-white/40 focus:outline-none focus:border-golden"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex gap-2 md:gap-2.5">
            <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="bg-white/10 border border-white/20 text-white/80 rounded-sm px-2.5 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-roboto focus:outline-none focus:border-golden cursor-pointer min-w-0">
              {locations.map((o) => <option key={o} className="bg-primary text-white">{o}</option>)}
            </select>
            <select value={filterBeds} onChange={(e) => setFilterBeds(e.target.value)} className="bg-white/10 border border-white/20 text-white/80 rounded-sm px-2.5 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-roboto focus:outline-none focus:border-golden cursor-pointer min-w-0">
              {BEDS_OPTIONS.map((o) => <option key={o} className="bg-primary text-white">{o}</option>)}
            </select>
            <select value={filterPrice} onChange={(e) => setFilterPrice(e.target.value)} className="bg-white/10 border border-white/20 text-white/80 rounded-sm px-2.5 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-roboto focus:outline-none focus:border-golden cursor-pointer min-w-0">
              {priceRanges.map((o) => <option key={o.label} className="bg-primary text-white">{o.label}</option>)}
            </select>
            <select value={filterCompletion} onChange={(e) => setFilterCompletion(e.target.value)} className="bg-white/10 border border-white/20 text-white/80 rounded-sm px-2.5 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-roboto focus:outline-none focus:border-golden cursor-pointer min-w-0">
              {COMPLETION_OPTIONS.map((o) => <option key={o} className="bg-primary text-white">{o}</option>)}
            </select>
            <button
              onClick={() => setPage(1)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 md:py-2.5 bg-golden text-white font-roboto text-base font-semibold tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-colors rounded-sm"
              title="Search"
            >
              <i className="ri-search-line"></i>
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ---- Zoopla-style development card ----
  const renderDevCard = (dev: DevelopmentGroup) => {
    const isSaved = savedIds.includes(dev.id);
    const isCompleted = dev.completionDate && (dev.completionDate.toLowerCase() === 'completed' || dev.completionDate.toLowerCase() === 'ready');
    const label = getDevLabel(dev);
    const isComparing = compareIds.includes(dev.id);
    const compareFull = compareIds.length >= 3 && !isComparing;
    const isUnitsExpanded = expandedUnitIds.includes(dev.id);
    const visibleUnits = isUnitsExpanded ? dev.unitOptions : dev.unitOptions.slice(0, MAX_VISIBLE_UNITS);

    return (
      <Link key={dev.id} to={`/property/${dev.slug}`} className={`group relative h-full bg-white overflow-hidden border transition-all duration-300 hover:-translate-y-1 flex flex-col cursor-pointer ${compareMode && isComparing ? 'ring-2 ring-golden' : ''}`} style={{ borderColor: '#f0f0f0', boxShadow: '0 1px 2px rgba(0, 23, 49, 0.04), 0 4px 12px rgba(0, 23, 49, 0.06), 0 16px 48px rgba(0, 23, 49, 0.08)' }}>
        {/* Image */}
        <div className="block relative overflow-hidden flex-shrink-0 h-48 sm:h-52 md:h-56">
          {dev.image ? (
            <img alt={dev.name} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" src={dev.image} />
          ) : (
            <div className="w-full h-full bg-stone-100 flex items-center justify-center">
              <i className="ri-building-line text-4xl text-primary/30"></i>
            </div>
          )}
          {/* Primary + secondary badges */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-2">
            <span className="text-white text-xs font-roboto font-semibold uppercase tracking-[0.08em] px-2 py-0.5 bg-[#001731]">
              New Development
            </span>
            {(() => {
              const status = getStageInfo(dev.developmentStage, dev.completionDate);
              return (
                <span className={`text-white text-xs font-roboto font-semibold uppercase tracking-[0.08em] px-2 py-0.5 ${status.color}`}>
                  {status.label}
                </span>
              );
            })()}
          </div>
          {/* Compare checkbox overlay */}
          {compareMode && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(dev.id); }}
              className={`absolute top-[5.5rem] left-3 z-20 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 border-2 ${isComparing ? 'bg-golden border-golden text-white' : compareFull ? 'bg-white/70 border-stone-300 text-primary/30' : 'bg-white/90 border-stone-300 text-primary/70 hover:border-golden hover:text-golden'}`}
              title={compareFull ? 'Maximum 3 selections' : isComparing ? 'Remove from comparison' : 'Add to comparison'}
              disabled={compareFull}
            >
              <i className={`${isComparing ? 'ri-check-line' : 'ri-add-line'} text-xs`}></i>
            </button>
          )}
          {/* Notify bell - off-plan only */}
          {!isCompleted && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNotifyModalDev(dev); }}
              className="absolute top-[5.5rem] right-3 z-20 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 bg-white/90 text-primary/70 hover:text-primary hover:bg-white border border-primary/12"
              title="Notify me when completion approaches"
            >
              <i className="ri-notification-3-line text-xs"></i>
            </button>
          )}
        </div>

        {/* Card body */}
        <div className="flex flex-col flex-1 p-4 md:p-5">
          {/* Developer logo + Name + Location */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
                <h2 className="text-[15px] md:text-base font-prata text-primary leading-snug mb-0.5 group-hover:text-golden transition-colors line-clamp-1">{toTitleCase(dev.name)}</h2>
              <p className="text-xs font-roboto text-primary/50 line-clamp-1">{dev.area}</p>
            </div>
            {dev.developer && (
              <div className="w-10 h-10 md:w-11 md:h-11 flex-shrink-0 rounded-full bg-stone-100 border border-primary/12 flex items-center justify-center overflow-hidden">
                {dev.developerLogo ? (
                  <img src={dev.developerLogo} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-[9px] font-roboto font-bold text-primary/50 text-center leading-tight px-0.5">
                    {dev.developer.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Unit options label + list */}
          <div className="mt-1">
            <span className="text-[11px] font-roboto font-semibold text-primary/50 uppercase tracking-wider">{label}</span>
            <ul className="mt-1.5 space-y-1">
              {visibleUnits.map((opt, idx) => (
                <li key={idx} className="text-[13px] font-roboto text-primary flex items-baseline gap-1">
                  <span className="font-semibold">{opt.beds} {opt.beds === 1 ? 'bed' : 'beds'}</span>
                  <span className="text-primary/50 text-[11px]">from</span>
                  <span className="font-semibold text-primary">{format(opt.fromPrice, opt.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}</span>
                </li>
              ))}
            </ul>
            {dev.unitOptions.length > MAX_VISIBLE_UNITS && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleUnitOptions(dev.id); }}
                className="mt-1.5 inline-flex items-center gap-1 text-golden font-roboto text-xs font-semibold cursor-pointer hover:text-primary transition-colors"
              >
                {isUnitsExpanded ? 'Show less' : `View ${dev.unitOptions.length - MAX_VISIBLE_UNITS} more`}
                <i className={`${isUnitsExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-sm`}></i>
              </button>
            )}
            <span className="text-[10px] font-roboto text-primary/50 mt-1.5 inline-block">Guide Price</span>
          </div>

          {/* Completion date */}
          {dev.completionDate && (
            <p className="text-[10px] font-roboto text-primary/50 uppercase tracking-wider mt-3 pt-3 border-t" style={{ borderColor: '#f0f0f0' }}>
              <i className="ri-calendar-check-line mr-1"></i>
              {isCompleted ? 'Ready to move in' : `Completion: ${dev.completionDate}`}
            </p>
          )}
        </div>

        {/* Footer - Enquire button */}
        <div className="px-4 md:px-5 pb-4 md:pb-5 mt-auto">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEnquireDev({
                title: dev.name,
                id: dev.id,
                slug: dev.slug,
                price: dev.unitOptions.length > 0
                  ? format(dev.unitOptions[0].fromPrice, dev.unitOptions[0].currency as 'KES' | 'USD' | 'GBP' | 'EUR')
                  : 'Price on request',
                location: dev.location,
              });
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white border-2 border-primary font-roboto text-base font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/80 transition-colors"
          >
            <i className="ri-mail-send-line text-sm"></i>Enquire Now
          </button>
        </div>

        {/* Save button */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSave(dev.id); }}
          className={`absolute top-[3.25rem] left-3 z-20 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 ${isSaved ? 'bg-red-500 text-white scale-110' : 'bg-white/90 text-primary/50 hover:text-red-400 hover:scale-110'}`}
          aria-label={isSaved ? 'Remove from saved' : 'Save development'}
        >
          <i className={`${isSaved ? 'ri-heart-fill' : 'ri-heart-line'} text-xs`}></i>
        </button>
      </Link>
    );
  };

  // ---- loading skeleton ----
  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
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
            <div className="space-y-6 md:space-y-10">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-stone-100 overflow-hidden rounded-sm" style={{ boxShadow: '0 1px 2px rgba(0, 23, 49, 0.04), 0 4px 12px rgba(0, 23, 49, 0.06), 0 16px 48px rgba(0, 23, 49, 0.08)' }}>
                  <div className="h-56 sm:h-64 md:h-72 lg:h-80 bg-stone-200 animate-pulse" />
                  <div className="p-5 md:p-8 lg:p-10 flex flex-col justify-center space-y-3">
                    <div className="h-3 w-24 bg-stone-200 rounded animate-pulse" />
                    <div className="h-6 w-3/4 bg-stone-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-stone-200 rounded animate-pulse" />
                    <div className="flex gap-4">
                      <div className="h-4 w-20 bg-stone-200 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-stone-200 rounded animate-pulse" />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <div className="h-10 w-40 bg-stone-200 rounded animate-pulse" />
                      <div className="h-10 w-40 bg-stone-200 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
        <Header />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded-full mb-4">
            <i className="ri-error-warning-line text-2xl text-red-400"></i>
          </div>
          <p className="text-primary font-prata text-lg mb-2">Unable to load developments</p>
          <p className="text-primary/50 font-roboto text-sm mb-4">{error}</p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-base font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
            <i className="ri-arrow-left-line"></i>Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
      <Header />

      {/* Hero */}
      <div
        className="relative flex flex-col items-center justify-center text-center overflow-hidden pt-12 pb-12 md:pt-16 md:pb-16"
        style={{
          backgroundImage: 'url(https://readdy.ai/api/search-image?query=Modern%20architectural%20development%20with%20contemporary%20apartment%20buildings%2C%20clean%20lines%2C%20glass%20facades%2C%20warm%20sunset%20sky%2C%20lush%20landscaped%20surroundings%2C%20premium%20real%20estate%20photography%2C%20elegant%20urban%20living%20concept%2C%20soft%20golden%20hour%20light%2C%20architectural%20rendering%20style%2C%20sophisticated%20aesthetic&width=1600&height=500&seq=newdev-hero-2026&orientation=landscape)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          minHeight: '320px',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/50"></div>
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 md:px-6 text-center">
          <p className="text-golden text-sm md:text-base font-roboto font-semibold tracking-widest uppercase mb-3 md:mb-4">Premium Developments</p>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-prata text-white mb-4 md:mb-5 leading-tight">New Developments</h1>
          <p className="text-white/80 font-roboto text-sm md:text-base lg:text-lg leading-relaxed max-w-xl mx-auto">
            Discover exceptional off-plan and newly completed properties. From luxury apartments to exclusive villas — secure your future home today.
          </p>
        </div>
      </div>

      {/* Featured Developments */}
      {featuredListings.length > 0 && (
        <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 md:mb-14">
              <p className="text-golden text-sm md:text-base font-roboto font-semibold tracking-widest uppercase mb-2 md:mb-3">Featured Projects</p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-prata text-primary">Signature Developments</h2>
            </div>
            <div className="space-y-6 md:space-y-10">
              {visibleFeatured.map((dev: NewDevListing, idx: number) => (
                <Link key={dev.id} to={`/property/${dev.slug}`} className="block cursor-pointer">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden border transition-all duration-300 hover:-translate-y-1" style={{ borderColor: '#f3f4f6', boxShadow: '0 1px 2px rgba(0, 23, 49, 0.04), 0 4px 12px rgba(0, 23, 49, 0.06), 0 16px 48px rgba(0, 23, 49, 0.08)' }}>
                  <div className={`relative h-96 md:h-[26rem] lg:h-[28rem] ${idx % 2 === 1 ? 'lg:order-2' : ''} group`}>
                    {dev.image ? (
                      <img alt={dev.title} className="w-full h-full object-cover" src={dev.image} />
                    ) : (
                      <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                        <i className="ri-building-line text-4xl text-primary/30"></i>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 md:top-4 md:left-4">
                      <span className="bg-primary text-white font-roboto text-base px-2.5 md:px-3 py-1 md:py-1.5 uppercase tracking-wider font-bold">
                        {format(dev.price, dev.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 md:top-4 md:right-4">
                      {(() => {
                        const status = getStageInfo(dev.developmentStage, dev.completionDate);
                        return (
                          <span className={`${status.color} text-white font-roboto text-base font-semibold px-2.5 md:px-3 py-1 md:py-1.5 uppercase tracking-wider`}>{status.label}</span>
                        );
                      })()}
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickViewProperty(dev); }}
                      className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      <span className="flex items-center gap-1.5 text-white text-base font-roboto font-semibold tracking-wide px-3 py-1.5 whitespace-nowrap bg-black/60 rounded-sm cursor-pointer hover:bg-black/80 transition-colors">
                        <i className="ri-expand-diagonal-line text-sm"></i>Preview
                      </span>
                    </button>
                  </div>
                  <div className={`p-4 md:p-5 lg:p-6 flex flex-col justify-start bg-white min-h-96 md:min-h-[26rem] lg:min-h-[28rem] ${idx % 2 === 1 ? 'lg:order-1' : ''}`}>
                    <p className="text-golden text-base font-roboto font-semibold tracking-widest uppercase mb-1.5">New Development</p>
                    <h3 className="text-primary font-prata text-lg md:text-xl mb-1.5 leading-tight">{toTitleCase(dev.title)}</h3>
                    <p className="text-primary/50 font-roboto text-xs flex items-center gap-1 mb-2.5">
                      <i className="ri-map-pin-2-line text-golden"></i>{dev.area}
                    </p>
                    <div className="flex flex-wrap gap-2 md:gap-3 mb-2.5">
                      {dev.beds > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-roboto text-primary/70">
                          <i className="ri-hotel-bed-line text-primary"></i>{dev.beds} {dev.beds === 1 ? 'Bed' : 'Beds'}
                        </div>
                      )}
                      {dev.baths > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-roboto text-primary/70">
                          <i className="fa-solid fa-bath text-primary"></i>{dev.baths} {dev.baths === 1 ? 'Bath' : 'Baths'}
                        </div>
                      )}
                      {dev.parking > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-roboto text-primary/70">
                          <i className="ri-car-line text-primary"></i>{dev.parking} Park
                        </div>
                      )}
                    </div>
                    <p className="text-primary/60 font-roboto text-xs mb-2.5 flex items-center gap-1.5 flex-wrap">
                      <i className="ri-layout-masonry-line text-golden"></i>
                      <span>Available units:</span>
                      <span className="font-semibold text-primary">{getUnitTypesForListing(dev, developments).join(' · ')}</span>
                    </p>
<ul className="space-y-1 mb-3 flex-1">
                      {(() => {
                        const feat = (dev.featureList && dev.featureList.length > 0) ? dev.featureList : ['3 & 4 bedroom properties', 'Garden', 'Extended warranties'];
                        return feat.slice(0, 4).map((f: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-xs md:text-sm font-roboto text-primary">
                            <i className="ri-checkbox-circle-fill text-primary text-xs"></i>{f}
                          </li>
                        ));
                      })()}
                    </ul>

                    <div className="flex flex-col sm:flex-row flex-wrap gap-1.5 md:gap-2">
                      <Link to={`/property/${dev.slug}`} className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 bg-primary text-white border-2 border-primary font-roboto text-base font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
                        <i className="ri-eye-line"></i>View Development
                      </Link>
                      <Link to="/contact?type=brochure" className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 border border-primary text-primary font-roboto text-base font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white transition-colors">
                        <i className="ri-book-open-line"></i>Request Brochure
                      </Link>
                      {dev.floorPlans && dev.floorPlans.length > 0 && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedFloorPlanId(expandedFloorPlanId === dev.id ? null : dev.id); }}
                          className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 border font-roboto text-base font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap transition-colors ${expandedFloorPlanId === dev.id ? 'bg-golden text-white border-golden' : 'border-stone-300 text-primary/70 hover:border-golden hover:text-golden'}`}
                        >
                          <i className={`${expandedFloorPlanId === dev.id ? 'ri-close-line' : 'ri-layout-line'}`}></i>
                          {expandedFloorPlanId === dev.id ? 'Hide Plans' : 'Floor Plans'}
                        </button>
                      )}
                    </div>
                    {/* Expandable Floor Plan Gallery */}
                    {expandedFloorPlanId === dev.id && dev.floorPlans && dev.floorPlans.length > 0 && (
                      <div className="mt-4 md:mt-5 overflow-hidden animate-[slideDown_0.3s_ease-out]">
                        <p className="text-primary/50 font-roboto text-[10px] uppercase tracking-wider mb-3">
                          <i className="ri-layout-line mr-1"></i>Floor Plans ({dev.floorPlans.length})
                        </p>
                        <div className="flex gap-3 overflow-x-auto pb-1">
                          {dev.floorPlans.map((fp: string, fpi: number) => (
                            <a
                              key={fpi}
                              href={fp}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 w-[140px] md:w-[180px] h-[100px] md:h-[130px] rounded-sm overflow-hidden border border-primary/12 hover:border-golden transition-colors cursor-pointer group/fp bg-stone-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <img
                                src={fp}
                                alt={`Floor Plan ${fpi + 1} - ${dev.title}`}
                                className="w-full h-full object-contain p-1 group-hover/fp:scale-105 transition-transform duration-300"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </Link>
              ))}
            </div>

            {featuredListings.length > 6 && (
              <div className="flex justify-center mt-10 md:mt-12">
                <button
                  onClick={() => setShowAllFeatured((v) => !v)}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-white border-2 border-primary font-roboto text-base font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
                >
                  <i className={`${showAllFeatured ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-lg`}></i>
                  {showAllFeatured ? 'Show Less' : `View More Featured Projects (${featuredListings.length - 6} more)`}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {featuredListings.length === 0 && developments.length > 0 && (
        <section className="py-12 md:py-16 px-4 md:px-6 bg-white">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-golden text-sm font-roboto font-semibold tracking-widest uppercase mb-2">Featured Projects</p>
            <h2 className="text-2xl md:text-3xl font-prata text-primary mb-4">Signature Developments</h2>
            <p className="text-primary/50 font-roboto text-sm">Browse our full catalogue of new developments below.</p>
          </div>
        </section>
      )}

      {/* Benefits */}
      <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6" style={{ background: '#f5f7f7' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-14">
            <p className="text-golden text-sm md:text-base font-roboto font-semibold tracking-widest uppercase mb-2 md:mb-3">The Benefits</p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-prata text-primary">Why Buy a New Development?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {benefits.map((b) => (
              <div key={b.title} className="p-5 md:p-6 lg:p-7 border rounded-sm shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white" style={{ borderColor: '#f3f4f6' }}>
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-primary rounded-full mb-4 md:mb-5">
                  <i className={`${b.icon} text-lg md:text-xl text-white`}></i>
                </div>
                <h3 className="text-primary font-prata text-sm md:text-base mb-2">{b.title}</h3>
                <p className="text-primary/70 font-roboto text-xs md:text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What to Look For */}
      <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-14">
            <p className="text-golden text-sm md:text-base font-roboto font-semibold tracking-widest uppercase mb-2 md:mb-3">Buyer Guide</p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-prata text-primary">What to Look For When Buying a New Development</h2>
            <p className="text-primary/70 font-roboto text-sm mt-3 max-w-xl mx-auto">
              New developments offer unique opportunities, but they also require careful due diligence. Here are the key factors every buyer should consider.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {whatToLookFor.map((item) => (
              <div key={item.title} className="p-5 md:p-6 border rounded-sm bg-white hover:-translate-y-1 hover:shadow-xl transition-all duration-300" style={{ borderColor: '#f3f4f6' }}>
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-primary rounded-full mb-4 md:mb-5">
                  <i className={`${item.icon} text-lg md:text-xl text-white`}></i>
                </div>
                <h3 className="text-primary font-prata text-sm md:text-base mb-2">{item.title}</h3>
                <p className="text-primary/70 font-roboto text-xs md:text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse All */}
      <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-white" id="browse">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <p className="text-golden text-sm font-roboto font-semibold tracking-widest uppercase mb-2">Browse All</p>
            <h2 className="text-2xl md:text-3xl font-prata text-primary">All New Projects</h2>
          </div>

          {/* Two-column layout: main + sticky sidebar */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div ref={filterBarRef}>{renderFilterBar(false)}</div>

              {filterSticky && (
                <div className="fixed top-0 left-0 right-0 z-40" style={{ marginTop: '88px' }}>
                  <div className="md:hidden">{renderFilterBar(true)}</div>
                  <div className="hidden md:block">{renderFilterBar(true)}</div>
                </div>
              )}

              {/* Results header */}
              <div className="flex flex-wrap items-center justify-between gap-4 mt-8 mb-6">
                <div className="flex items-center gap-4">
                  <p className="text-primary text-sm font-roboto">
                    <span className="font-prata font-bold text-xl">{filteredDevs.length}</span>
                    <span className="ml-2 text-primary/50">developments found</span>
                  </p>
                  {savedIds.length > 0 && (
                    <span className="text-primary/50 text-xs font-roboto">
                      <i className="ri-heart-fill text-red-400 text-xs mr-1"></i>
                      {savedIds.length} saved
                    </span>
                  )}
                  {compareIds.length > 0 && (
                    <button
                      onClick={() => setCompareModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-golden text-xs font-roboto font-semibold cursor-pointer hover:text-primary transition-colors"
                    >
                      <i className="ri-scales-line"></i>
                      {compareIds.length} in comparison
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCompareMode((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-sm text-base font-roboto font-semibold cursor-pointer whitespace-nowrap transition-colors ${compareMode ? 'bg-primary text-white border-primary' : 'border-primary/12 text-primary/70 hover:text-primary hover:border-primary'}`}
                    title="Toggle compare mode"
                  >
                    <i className={`${compareMode ? 'ri-scales-fill' : 'ri-scales-line'} text-sm`}></i>
                    {compareMode ? 'Done' : 'Compare'}
                  </button>
                  <div className="flex items-center border border-primary/12 rounded-sm overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-2.5 py-1.5 cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-primary/50 hover:text-primary'}`}
                      aria-label="Grid view"
                    >
                      <i className="ri-layout-grid-line text-sm"></i>
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={`px-2.5 py-1.5 cursor-pointer transition-colors ${viewMode === 'map' ? 'bg-primary text-white' : 'bg-white text-primary/50 hover:text-primary'}`}
                      aria-label="Map view"
                    >
                      <i className="ri-map-pin-line text-sm"></i>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary/50 font-roboto text-xs whitespace-nowrap">Sort:</span>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-primary/12 text-primary rounded-sm px-3 py-1.5 text-sm font-roboto focus:outline-none cursor-pointer">
                      {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Map View */}
              {viewMode === 'map' && (
                <div className="mb-10 rounded-sm overflow-hidden border border-primary/12" style={{ height: '500px' }}>
                  <iframe
                    title="New Developments Map"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qby0MlaQMoY8l3L1jNaVl2VFCxMQY&q=Kampala+Uganda&zoom=12"
                  ></iframe>
                </div>
              )}

              {/* Grid */}
              {viewMode === 'grid' && (
                <>
                  {paginatedDevs.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                        {paginatedDevs.map((dev) => renderDevCard(dev))}
                      </div>

                      {totalPages > 1 && (
                        <Pagination
                          currentPage={safePage}
                          totalPages={totalPages}
                          onPageChange={setPage}
                        />
                      )}
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 flex items-center justify-center bg-stone-50 rounded-full mx-auto mb-4">
                        <i className="ri-search-line text-2xl text-primary/30"></i>
                      </div>
                      <h3 className="font-prata text-primary text-lg mb-2">No developments found</h3>
                      <p className="text-primary/50 font-roboto text-sm mb-4">Try adjusting your filters or search terms.</p>
                      <button
                        onClick={resetFilters}
                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-primary/12 text-primary font-roboto text-base font-semibold tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white hover:border-primary transition-colors"
                      >
                        <i className="ri-refresh-line"></i>Clear All Filters
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sticky Saved Sidebar */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-[120px] space-y-6">
                {/* Compare action card */}
                {compareIds.length > 0 && (
                  <div className="border rounded-sm bg-white" style={{ borderColor: '#f0f0f0', boxShadow: '0 1px 2px rgba(0, 23, 49, 0.04), 0 4px 12px rgba(0, 23, 49, 0.06), 0 16px 48px rgba(0, 23, 49, 0.08)' }}>
                    <div className="px-4 py-3 border-b border-primary/15 mb-2">
                      <div className="flex items-center gap-2">
                        <i className="ri-scales-line text-golden text-sm"></i>
                        <h3 className="text-xs font-roboto font-bold text-primary uppercase tracking-wide">Comparison</h3>
                        <span className="ml-auto text-[10px] font-roboto text-primary/70 bg-stone-100 px-1.5 py-0.5 rounded-sm">{compareIds.length}/3</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCompareModalOpen(true)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white border-2 border-primary font-roboto text-base font-semibold tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors rounded-sm"
                        >
                          <i className="ri-eye-line"></i>View Comparison
                        </button>
                        <button
                          onClick={() => { setCompareIds([]); setCompareMode(false); }}
                          className="px-3 py-2 border border-primary/12 text-primary/50 font-roboto text-[11px] tracking-wider uppercase cursor-pointer whitespace-nowrap hover:text-red-400 hover:border-red-200 transition-colors rounded-sm"
                          title="Clear comparison"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {compareIds.map((id) => {
                          const d = developments.find((dev) => dev.id === id);
                          if (!d) return null;
                          return (
                            <span key={id} className="text-[10px] font-roboto bg-stone-50 text-primary/70 px-1.5 py-0.5 rounded-sm border border-stone-100 truncate max-w-[120px]">
                              {d.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Saved Developments */}
                <div className="border rounded-sm bg-white" style={{ borderColor: '#f0f0f0', boxShadow: '0 1px 2px rgba(0, 23, 49, 0.04), 0 4px 12px rgba(0, 23, 49, 0.06), 0 16px 48px rgba(0, 23, 49, 0.08)' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15 mb-2">
                    <div className="flex items-center gap-2">
                      <i className="ri-heart-fill text-red-400 text-sm"></i>
                      <h3 className="text-xs font-roboto font-bold text-primary uppercase tracking-wide">Saved Developments</h3>
                    </div>
                    {savedIds.length > 0 && (
                      <button
                        onClick={() => setSavedIds([])}
                        className="text-base font-roboto font-semibold text-primary/50 hover:text-accent cursor-pointer transition-colors uppercase tracking-wider"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="px-4 py-3">
                    {savedIds.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="w-10 h-10 flex items-center justify-center bg-stone-50 rounded-full mx-auto mb-2">
                          <i className="ri-heart-line text-lg text-primary/30"></i>
                        </div>
                        <p className="text-primary/70 font-roboto text-xs leading-relaxed">
                          Click the heart on any development to save it here for quick access.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {developments
                          .filter((d) => savedIds.includes(d.id))
                          .map((dev) => (
                            <div key={dev.id} className="flex items-start gap-3 group">
                              <Link to={`/property/${dev.slug}`} className="w-14 h-14 flex-shrink-0 rounded-sm overflow-hidden bg-stone-100">
                                {dev.image ? (
                                  <img src={dev.image} alt={dev.name} className="w-full h-full object-cover object-center" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <i className="ri-building-line text-lg text-primary/30"></i>
                                  </div>
                                )}
                              </Link>
                              <div className="min-w-0 flex-1">
                                <Link to={`/property/${dev.slug}`} className="block">
                                  <p className="text-[13px] font-prata text-primary leading-snug line-clamp-1 group-hover:text-golden transition-colors">
                                    {toTitleCase(dev.name)}
                                  </p>
                                </Link>
                                <p className="text-[11px] font-roboto text-primary/70 line-clamp-1 mt-0.5">{dev.area}</p>
                                {dev.unitOptions.length > 0 && (
                                  <p className="text-[11px] font-roboto text-primary font-semibold mt-0.5">
                                    From {format(dev.unitOptions[0].fromPrice, dev.unitOptions[0].currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => toggleSave(dev.id)}
                                className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-primary/30 hover:text-red-400 cursor-pointer transition-colors mt-0.5"
                                aria-label="Remove from saved"
                              >
                                <i className="ri-close-line text-sm"></i>
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recently Viewed */}
                {recentlyViewed.length > 0 && (
                  <div className="border rounded-sm bg-white" style={{ borderColor: '#f0f0f0', boxShadow: '0 1px 2px rgba(0, 23, 49, 0.04), 0 4px 12px rgba(0, 23, 49, 0.06), 0 16px 48px rgba(0, 23, 49, 0.08)' }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15 mb-2">
                      <div className="flex items-center gap-2">
                        <i className="ri-time-line text-primary text-sm"></i>
                        <h3 className="text-xs font-roboto font-bold text-primary uppercase tracking-wide">Recently Viewed</h3>
                      </div>
                      <button
                        onClick={() => { localStorage.removeItem('recently_viewed_devs'); setRecentlyViewed([]); }}
                        className="text-base font-roboto font-semibold text-primary/50 hover:text-accent cursor-pointer transition-colors uppercase tracking-wider"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="px-4 py-3 space-y-3">
                      {recentlyViewed.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-start gap-3 group">
                          <Link to={`/property/${item.slug}`} className="w-14 h-14 flex-shrink-0 rounded-sm overflow-hidden bg-stone-100">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover object-center" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <i className="ri-building-line text-lg text-primary/30"></i>
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link to={`/property/${item.slug}`} className="block">
                              <p className="text-[13px] font-prata text-primary leading-snug line-clamp-1 group-hover:text-golden transition-colors">
                                {toTitleCase(item.name)}
                              </p>
                            </Link>
                            <p className="text-[11px] font-roboto text-primary/70 line-clamp-1 mt-0.5">{item.location}</p>
                            {item.priceRaw > 0 && (
                              <p className="text-[11px] font-roboto text-primary font-semibold mt-0.5">
                                {format(item.priceRaw, item.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Developer CTA */}
      <section className="py-10 md:py-14 lg:py-16 px-4 md:px-6 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-white font-prata text-2xl md:text-3xl mb-3 md:mb-4">Have a Development to Sell?</h2>
          <p className="text-white/70 font-roboto text-xs md:text-sm mb-6 md:mb-8 max-w-lg mx-auto">
            We work with leading developers to market and sell premium new developments. Partner with a trusted agency and reach qualified buyers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <Link to="/contact" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-3.5 bg-golden text-white font-roboto text-base font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
              <i className="ri-mail-line"></i>Contact Our Team
            </Link>
            <Link to="/landlords" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-3.5 border border-white/50 text-white font-roboto text-base font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors">
              <i className="ri-bar-chart-2-line"></i>Request Valuation
            </Link>
          </div>
        </div>
      </section>

      <PageContactSection />
      <Footer />
      <BackToTop />
      <CompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        compareIds={compareIds}
        developments={developments}
        onRemove={(id) => setCompareIds((prev) => prev.filter((i) => i !== id))}
      />
      <NotifyModal
        isOpen={notifyModalDev !== null}
        onClose={() => setNotifyModalDev(null)}
        dev={notifyModalDev}
      />
      <QuickViewModal
        isOpen={quickViewProperty !== null}
        onClose={() => setQuickViewProperty(null)}
        property={quickViewProperty ? {
          id: quickViewProperty.id,
          slug: quickViewProperty.slug,
          title: quickViewProperty.title,
          price: formatCompactPrice(quickViewProperty.price),
          rawPrice: quickViewProperty.price,
          currency: quickViewProperty.currency,
          location: quickViewProperty.location,
          category: quickViewProperty.propertyType,
          beds: quickViewProperty.beds,
          baths: quickViewProperty.baths,
          parking: quickViewProperty.parking || 0,
          description: '',
          images: quickViewProperty.image ? [quickViewProperty.image] : [],
          type: 'sale',
        } : null}
      />
      <ContactAgentModal
        isOpen={enquireDev !== null}
        onClose={() => setEnquireDev(null)}
        propertyTitle={enquireDev?.title || ''}
        propertyId={enquireDev?.id || ''}
        propertySlug={enquireDev?.slug || ''}
        propertyPrice={enquireDev?.price || ''}
        propertyLocation={enquireDev?.location || ''}
      />
    </div>
  );
}