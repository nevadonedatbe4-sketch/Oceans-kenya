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

const ITEMS_PER_PAGE = 9;

const BEDS_OPTIONS = ['Any Beds', '1+', '2+', '3+', '4+', '5+'];
const COMPLETION_OPTIONS = ['All Status', 'Completed', 'Off-Plan / Under Construction'];
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

function getDevLabel(dev: DevelopmentGroup): string {
  if (dev.unitOptions.length <= 1) {
    const pt = dev.propertyType.toLowerCase();
    if (pt === 'house' || pt === 'villa' || pt === 'townhouse' || pt === 'bungalow') return 'Houses with';
    if (pt === 'apartment' || pt === 'penthouse' || pt === 'studio' || pt === 'condo') return 'Apartments with';
  }
  return 'Houses & apartments with';
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
    const p33 = sorted[Math.floor(sorted.length * 0.33)];
    const p66 = sorted[Math.floor(sorted.length * 0.66)];
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
      { label: `Under ${fmt(p33)}`, min: 0, max: p33 },
      { label: `${fmt(p33)} – ${fmt(p66)}`, min: p33, max: p66 },
      { label: `Over ${fmt(p66)}`, min: p66, max: Infinity },
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
      result = result.filter((d) => d.location.toLowerCase().includes(area));
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
        const cd = d.completionDate.toLowerCase();
        return cd === 'completed' || cd === 'ready' || cd === '';
      });
    } else if (filterCompletion === 'Off-Plan / Under Construction') {
      result = result.filter((d) => {
        const cd = d.completionDate.toLowerCase();
        return cd && cd !== 'completed' && cd !== 'ready' && cd !== '';
      });
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
              placeholder="Search developments or developers..."
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
              onClick={resetFilters}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 md:py-2.5 bg-golden text-white font-roboto text-xs tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-colors rounded-sm"
              title="Clear all filters"
            >
              <i className="ri-refresh-line"></i>
              <span className="hidden sm:inline">Reset</span>
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

    return (
      <div key={dev.id} className={`group relative bg-white overflow-hidden border transition-all duration-300 hover:-translate-y-1 flex flex-col ${compareMode && isComparing ? 'ring-2 ring-golden' : ''}`} style={{ borderColor: '#f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        {/* Image */}
        <Link to={`/property/${dev.slug}`} className="block relative overflow-hidden flex-shrink-0 h-48 sm:h-52 md:h-56">
          {dev.image ? (
            <img alt={dev.name} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" src={dev.image} />
          ) : (
            <div className="w-full h-full bg-stone-100 flex items-center justify-center">
              <i className="ri-building-line text-4xl text-stone-300"></i>
            </div>
          )}
          {/* Status badge - top right */}
          <div className="absolute top-3 right-3 z-10">
            <span className={`text-white text-[10px] font-roboto font-semibold uppercase tracking-[0.15em] px-2.5 py-1 ${isCompleted ? 'bg-emerald-600' : 'bg-accent'}`}>
              {isCompleted ? 'Completed' : 'Off-Plan'}
            </span>
          </div>
          {/* Compare checkbox overlay */}
          {compareMode && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(dev.id); }}
              className={`absolute top-[5.5rem] left-3 z-20 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 border-2 ${isComparing ? 'bg-golden border-golden text-white' : compareFull ? 'bg-white/70 border-stone-300 text-stone-300' : 'bg-white/90 border-stone-300 text-stone-500 hover:border-golden hover:text-golden'}`}
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
              className="absolute top-[5.5rem] right-3 z-20 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 bg-white/90 text-stone-500 hover:text-primary hover:bg-white border border-stone-200"
              title="Notify me when completion approaches"
            >
              <i className="ri-notification-3-line text-xs"></i>
            </button>
          )}
        </Link>

        {/* Card body */}
        <div className="flex flex-col flex-1 p-4 md:p-5">
          {/* Developer logo + Name + Location */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <Link to={`/property/${dev.slug}`}>
                <h2 className="text-[15px] md:text-base font-prata text-primary leading-snug mb-0.5 group-hover:text-golden transition-colors line-clamp-1">{dev.name}</h2>
              </Link>
              <p className="text-xs font-roboto text-stone-400 line-clamp-1">{dev.location}</p>
            </div>
            {dev.developer && (
              <div className="w-10 h-10 md:w-11 md:h-11 flex-shrink-0 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden">
                {dev.developerLogo ? (
                  <img src={dev.developerLogo} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-[9px] font-roboto font-bold text-stone-400 text-center leading-tight px-0.5">
                    {dev.developer.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Unit options label + list */}
          <div className="mt-1">
            <span className="text-[11px] font-roboto font-semibold text-stone-400 uppercase tracking-wider">{label}</span>
            <ul className="mt-1.5 space-y-1">
              {dev.unitOptions.map((opt, idx) => (
                <li key={idx} className="text-[13px] font-roboto text-primary flex items-baseline gap-1">
                  <span className="font-semibold">{opt.beds} {opt.beds === 1 ? 'bed' : 'beds'}</span>
                  <span className="text-stone-400 text-[11px]">from</span>
                  <span className="font-semibold text-primary">{format(opt.fromPrice, opt.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Completion date */}
          {dev.completionDate && (
            <p className="text-[10px] font-roboto text-stone-400 uppercase tracking-wider mt-3 pt-3 border-t" style={{ borderColor: '#f0f0f0' }}>
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
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-roboto text-[11px] tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/80 transition-colors"
          >
            <i className="ri-mail-send-line text-sm"></i>Enquire Now
          </button>
        </div>

        {/* Save button */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSave(dev.id); }}
          className={`absolute top-[3.25rem] left-3 z-20 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 ${isSaved ? 'bg-red-500 text-white scale-110' : 'bg-white/90 text-stone-400 hover:text-red-400 hover:scale-110'}`}
          aria-label={isSaved ? 'Remove from saved' : 'Save development'}
        >
          <i className={`${isSaved ? 'ri-heart-fill' : 'ri-heart-line'} text-xs`}></i>
        </button>
      </div>
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
                <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-stone-100 overflow-hidden rounded-sm" style={{ boxShadow: '0 12px 48px rgba(0,23,49,0.08)' }}>
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
          <p className="text-stone-400 font-roboto text-sm mb-4">{error}</p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
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
        <div className="absolute inset-0 bg-black/60"></div>
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
              {featuredListings.map((dev: NewDevListing, idx: number) => (
                <div key={dev.id} className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden border transition-all duration-300 hover:-translate-y-1" style={{ borderColor: '#f3f4f6', boxShadow: '0 12px 48px rgba(0,23,49,0.1)' }}>
                  <div className={`relative h-60 sm:h-72 md:h-80 lg:h-auto ${idx % 2 === 1 ? 'lg:order-2' : ''} group`}>
                    {dev.image ? (
                      <img alt={dev.title} className="w-full h-full object-cover object-top lg:absolute lg:inset-0" src={dev.image} />
                    ) : (
                      <div className="w-full h-full bg-stone-100 flex items-center justify-center lg:absolute lg:inset-0">
                        <i className="ri-building-line text-4xl text-stone-300"></i>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 md:top-4 md:left-4">
                      <span className="bg-golden text-white font-roboto text-[11px] md:text-xs px-2.5 md:px-3 py-1 md:py-1.5 uppercase tracking-wider">
                        {format(dev.price, dev.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 md:top-4 md:right-4">
                      <span className="bg-accent text-white font-roboto text-[11px] md:text-xs px-2.5 md:px-3 py-1 md:py-1.5 uppercase tracking-wider">New Development</span>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickViewProperty(dev); }}
                      className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      <span className="flex items-center gap-1.5 text-white text-[11px] font-roboto font-medium tracking-wide px-3 py-1.5 whitespace-nowrap bg-black/60 rounded-sm cursor-pointer hover:bg-black/80 transition-colors">
                        <i className="ri-expand-diagonal-line text-sm"></i>Preview
                      </span>
                    </button>
                  </div>
                  <div className={`p-5 md:p-8 lg:p-10 flex flex-col justify-center bg-white ${idx % 2 === 1 ? 'lg:order-1' : ''}`}>
                    <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-2">New Development</p>
                    <h3 className="text-primary font-prata text-xl md:text-2xl mb-2 md:mb-3">{dev.title}</h3>
                    <p className="text-stone-400 font-roboto text-sm flex items-center gap-1.5 mb-3 md:mb-4">
                      <i className="ri-map-pin-2-line text-golden"></i>{dev.location}
                    </p>
                    <div className="flex flex-wrap gap-3 md:gap-4 mb-4 md:mb-6">
                      {dev.beds > 0 && (
                        <div className="flex items-center gap-2 text-xs md:text-sm font-roboto text-stone-500">
                          <i className="ri-hotel-bed-line text-primary"></i>{dev.beds} {dev.beds === 1 ? 'Bedroom' : 'Bedrooms'}
                        </div>
                      )}
                      {dev.baths > 0 && (
                        <div className="flex items-center gap-2 text-xs md:text-sm font-roboto text-stone-500">
                          <i className="fa-solid fa-bath text-primary"></i>{dev.baths} {dev.baths === 1 ? 'Bathroom' : 'Bathrooms'}
                        </div>
                      )}
                      {dev.parking > 0 && (
                        <div className="flex items-center gap-2 text-xs md:text-sm font-roboto text-stone-500">
                          <i className="ri-car-line text-primary"></i>{dev.parking} Parking
                        </div>
                      )}
                    </div>
                    <Link to={`/property/${dev.slug}`} className="inline-flex items-center gap-1.5 text-primary font-roboto text-xs md:text-sm font-semibold mb-3 cursor-pointer hover:text-primary/70 transition-colors whitespace-nowrap">
                      See more of this development <i className="ri-arrow-right-line text-xs"></i>
                    </Link>
                    <ul className="space-y-1.5 mb-4 md:mb-6">
                      {(() => {
                        const feat = (dev.featureList && dev.featureList.length > 0) ? dev.featureList : ['3 & 4 bedroom properties', 'Garden', 'Extended warranties'];
                        return feat.map((f: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-xs md:text-sm font-roboto text-primary">
                            <i className="ri-checkbox-circle-fill text-primary text-xs"></i>{f}
                          </li>
                        ));
                      })()}
                    </ul>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3 mt-auto">
                      <Link to={`/property/${dev.slug}`} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-primary text-white font-roboto text-[11px] md:text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
                        <i className="ri-eye-line"></i>View Development
                      </Link>
                      <Link to="/contact" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 border border-primary text-primary font-roboto text-[11px] md:text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white transition-colors">
                        <i className="ri-book-open-line"></i>Request Brochure
                      </Link>
                      {dev.floorPlans && dev.floorPlans.length > 0 && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedFloorPlanId(expandedFloorPlanId === dev.id ? null : dev.id); }}
                          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 border font-roboto text-[11px] md:text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap transition-colors ${expandedFloorPlanId === dev.id ? 'bg-golden text-white border-golden' : 'border-stone-300 text-stone-500 hover:border-golden hover:text-golden'}`}
                        >
                          <i className={`${expandedFloorPlanId === dev.id ? 'ri-close-line' : 'ri-layout-line'}`}></i>
                          {expandedFloorPlanId === dev.id ? 'Hide Plans' : 'Floor Plans'}
                        </button>
                      )}
                    </div>
                    {/* Expandable Floor Plan Gallery */}
                    {expandedFloorPlanId === dev.id && dev.floorPlans && dev.floorPlans.length > 0 && (
                      <div className="mt-4 md:mt-5 overflow-hidden animate-[slideDown_0.3s_ease-out]">
                        <p className="text-stone-400 font-roboto text-[10px] uppercase tracking-wider mb-3">
                          <i className="ri-layout-line mr-1"></i>Floor Plans ({dev.floorPlans.length})
                        </p>
                        <div className="flex gap-3 overflow-x-auto pb-1">
                          {dev.floorPlans.map((fp: string, fpi: number) => (
                            <a
                              key={fpi}
                              href={fp}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 w-[140px] md:w-[180px] h-[100px] md:h-[130px] rounded-sm overflow-hidden border border-stone-200 hover:border-golden transition-colors cursor-pointer group/fp bg-stone-50"
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
              ))}
            </div>
          </div>
        </section>
      )}

      {featuredListings.length === 0 && developments.length > 0 && (
        <section className="py-12 md:py-16 px-4 md:px-6 bg-white">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-golden text-sm font-roboto font-semibold tracking-widest uppercase mb-2">Featured Projects</p>
            <h2 className="text-2xl md:text-3xl font-prata text-primary mb-4">Signature Developments</h2>
            <p className="text-stone-400 font-roboto text-sm">Browse our full catalogue of new developments below.</p>
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
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-primary/5 rounded-full mb-4 md:mb-5">
                  <i className={`${b.icon} text-lg md:text-xl text-golden`}></i>
                </div>
                <h3 className="text-primary font-prata text-sm md:text-base mb-2">{b.title}</h3>
                <p className="text-stone-500 font-roboto text-xs md:text-sm leading-relaxed">{b.desc}</p>
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
                    <span className="ml-2 text-stone-400">developments found</span>
                  </p>
                  {savedIds.length > 0 && (
                    <span className="text-stone-400 text-xs font-roboto">
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
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-sm text-xs font-roboto cursor-pointer whitespace-nowrap transition-colors ${compareMode ? 'bg-primary text-white border-primary' : 'border-stone-200 text-stone-500 hover:text-primary hover:border-primary'}`}
                    title="Toggle compare mode"
                  >
                    <i className={`${compareMode ? 'ri-scales-fill' : 'ri-scales-line'} text-sm`}></i>
                    {compareMode ? 'Done' : 'Compare'}
                  </button>
                  <div className="flex items-center border border-stone-200 rounded-sm overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-2.5 py-1.5 cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-stone-400 hover:text-primary'}`}
                      aria-label="Grid view"
                    >
                      <i className="ri-layout-grid-line text-sm"></i>
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={`px-2.5 py-1.5 cursor-pointer transition-colors ${viewMode === 'map' ? 'bg-primary text-white' : 'bg-white text-stone-400 hover:text-primary'}`}
                      aria-label="Map view"
                    >
                      <i className="ri-map-pin-line text-sm"></i>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 font-roboto text-xs whitespace-nowrap">Sort:</span>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-stone-200 text-primary rounded-sm px-3 py-1.5 text-sm font-roboto focus:outline-none cursor-pointer">
                      {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Map View */}
              {viewMode === 'map' && (
                <div className="mb-10 rounded-sm overflow-hidden border border-stone-200" style={{ height: '500px' }}>
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
                        <div className="flex items-center justify-center gap-2 mt-10 md:mt-12">
                          <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            className="w-9 h-9 flex items-center justify-center border border-stone-200 rounded-sm text-stone-400 cursor-pointer hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <i className="ri-arrow-left-s-line"></i>
                          </button>
                          {Array.from({ length: totalPages }).map((_, i) => {
                            const pageNum = i + 1;
                            const isActive = pageNum === safePage;
                            if (totalPages <= 7 || pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - safePage) <= 1) {
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setPage(pageNum)}
                                  className={`w-9 h-9 flex items-center justify-center rounded-sm text-sm font-roboto cursor-pointer transition-colors ${isActive ? 'bg-primary text-white' : 'border border-stone-200 text-stone-500 hover:border-primary hover:text-primary'}`}
                                >
                                  {pageNum}
                                </button>
                              );
                            }
                            if (pageNum === 2 || pageNum === totalPages - 1) {
                              return <span key={pageNum} className="w-9 h-9 flex items-center justify-center text-stone-300 text-sm">…</span>;
                            }
                            return null;
                          })}
                          <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages}
                            className="w-9 h-9 flex items-center justify-center border border-stone-200 rounded-sm text-stone-400 cursor-pointer hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <i className="ri-arrow-right-s-line"></i>
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 flex items-center justify-center bg-stone-50 rounded-full mx-auto mb-4">
                        <i className="ri-search-line text-2xl text-stone-300"></i>
                      </div>
                      <h3 className="font-prata text-primary text-lg mb-2">No developments found</h3>
                      <p className="text-stone-400 font-roboto text-sm mb-4">Try adjusting your filters or search terms.</p>
                      <button
                        onClick={resetFilters}
                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-stone-200 text-primary font-roboto text-xs tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white hover:border-primary transition-colors"
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
              <div className="sticky top-[120px] space-y-4">
                {/* Compare action card */}
                {compareIds.length > 0 && (
                  <div className="border rounded-sm bg-white" style={{ borderColor: '#f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="ri-scales-line text-golden text-sm"></i>
                        <h3 className="text-sm font-prata text-primary">Comparison</h3>
                        <span className="ml-auto text-[10px] font-roboto text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-sm">{compareIds.length}/3</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCompareModalOpen(true)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white font-roboto text-[11px] tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors rounded-sm"
                        >
                          <i className="ri-eye-line"></i>View Comparison
                        </button>
                        <button
                          onClick={() => { setCompareIds([]); setCompareMode(false); }}
                          className="px-3 py-2 border border-stone-200 text-stone-400 font-roboto text-[11px] tracking-wider uppercase cursor-pointer whitespace-nowrap hover:text-red-400 hover:border-red-200 transition-colors rounded-sm"
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
                            <span key={id} className="text-[10px] font-roboto bg-stone-50 text-stone-500 px-1.5 py-0.5 rounded-sm border border-stone-100 truncate max-w-[120px]">
                              {d.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Saved Developments */}
                <div className="border rounded-sm bg-white" style={{ borderColor: '#f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#f0f0f0' }}>
                    <div className="flex items-center gap-2">
                      <i className="ri-heart-fill text-red-400 text-sm"></i>
                      <h3 className="text-sm font-prata text-primary">Saved Developments</h3>
                    </div>
                    {savedIds.length > 0 && (
                      <button
                        onClick={() => setSavedIds([])}
                        className="text-[10px] font-roboto text-stone-400 hover:text-red-400 cursor-pointer transition-colors uppercase tracking-wider"
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
                          <i className="ri-heart-line text-lg text-stone-300"></i>
                        </div>
                        <p className="text-stone-400 font-roboto text-xs leading-relaxed">
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
                                  <img src={dev.image} alt={dev.name} className="w-full h-full object-cover object-top" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <i className="ri-building-line text-lg text-stone-300"></i>
                                  </div>
                                )}
                              </Link>
                              <div className="min-w-0 flex-1">
                                <Link to={`/property/${dev.slug}`} className="block">
                                  <p className="text-[13px] font-prata text-primary leading-snug line-clamp-1 group-hover:text-golden transition-colors">
                                    {dev.name}
                                  </p>
                                </Link>
                                <p className="text-[11px] font-roboto text-stone-400 line-clamp-1 mt-0.5">{dev.location}</p>
                                {dev.unitOptions.length > 0 && (
                                  <p className="text-[11px] font-roboto text-primary font-semibold mt-0.5">
                                    From {format(dev.unitOptions[0].fromPrice, dev.unitOptions[0].currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => toggleSave(dev.id)}
                                className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-stone-300 hover:text-red-400 cursor-pointer transition-colors mt-0.5"
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
                  <div className="border rounded-sm bg-white" style={{ borderColor: '#f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#f0f0f0' }}>
                      <div className="flex items-center gap-2">
                        <i className="ri-time-line text-primary text-sm"></i>
                        <h3 className="text-sm font-prata text-primary">Recently Viewed</h3>
                      </div>
                      <button
                        onClick={() => { localStorage.removeItem('recently_viewed_devs'); setRecentlyViewed([]); }}
                        className="text-[10px] font-roboto text-stone-400 hover:text-red-400 cursor-pointer transition-colors uppercase tracking-wider"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="px-4 py-3 space-y-3">
                      {recentlyViewed.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-start gap-3 group">
                          <Link to={`/property/${item.slug}`} className="w-14 h-14 flex-shrink-0 rounded-sm overflow-hidden bg-stone-100">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <i className="ri-building-line text-lg text-stone-300"></i>
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link to={`/property/${item.slug}`} className="block">
                              <p className="text-[13px] font-prata text-primary leading-snug line-clamp-1 group-hover:text-golden transition-colors">
                                {item.name}
                              </p>
                            </Link>
                            <p className="text-[11px] font-roboto text-stone-400 line-clamp-1 mt-0.5">{item.location}</p>
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
            <Link to="/contact" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-3.5 bg-golden text-white font-roboto text-xs md:text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
              <i className="ri-mail-line"></i>Contact Our Team
            </Link>
            <Link to="/landlords" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-3.5 border border-white/50 text-white font-roboto text-xs md:text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors">
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
          price: quickViewProperty.price,
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