import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import QuickViewModal from '@/components/feature/QuickViewModal';
import { useNewDevelopments } from '@/hooks/useNewDevelopments';
import type { NewDevListing } from '@/hooks/useNewDevelopments';

const benefits = [
  { icon: 'ri-price-tag-3-line', title: 'Early-Bird Pricing', desc: 'Secure properties at pre-construction prices, often 15-20% below market value upon completion.' },
  { icon: 'ri-palette-line', title: 'Customisation Options', desc: 'Choose finishes, layouts, and fixtures to match your personal taste before construction is complete.' },
  { icon: 'ri-shield-check-line', title: 'Modern Standards', desc: 'Benefit from the latest building codes, energy efficiency, and contemporary design.' },
  { icon: 'ri-line-chart-line', title: 'Capital Appreciation', desc: 'Properties typically gain significant value between launch and completion.' },
  { icon: 'ri-file-list-3-line', title: 'Payment Plans', desc: 'Flexible staged payments tied to construction milestones, making luxury more accessible.' },
  { icon: 'ri-tools-line', title: 'Warranty Protection', desc: 'New builds come with structural warranties and builder guarantees for peace of mind.' },
];

const TYPE_OPTIONS = ['All Types', 'Apartment', 'Villa', 'Penthouse', 'Townhouse', 'Family Home', 'Studio'];
const AREA_OPTIONS = ['All Areas', 'Karen', 'Westlands', 'Kilimani', 'Lavington', 'Runda', 'Muthaiga', 'Kileleshwa', 'Gigiri', 'Parklands', 'Langata'];
const PRICE_OPTIONS = ['Any Price', 'Under $150K', '$150K – $300K', '$300K – $500K', '$500K – $1M', 'Over $1M'];
const BEDS_OPTIONS = ['Any Beds', '1+', '2+', '3+', '4+', '5+'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

function parsePriceFilter(filter: string): { min: number; max: number } | null {
  switch (filter) {
    case 'Under $150K': return { min: 0, max: 19_999_999 };
    case '$150K – $300K': return { min: 20_000_000, max: 44_999_999 };
    case '$300K – $500K': return { min: 45_000_000, max: 74_999_999 };
    case '$500K – $1M': return { min: 75_000_000, max: 139_999_999 };
    case 'Over $1M': return { min: 140_000_000, max: Infinity };
    default: return null;
  }
}

function parseBedsFilter(filter: string): number | null {
  const match = filter.match(/^(\d+)\+$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

export default function NewDevelopments() {
  const { allListings, featuredListings, loading, error } = useNewDevelopments();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Types');
  const [filterArea, setFilterArea] = useState('All Areas');
  const [filterPrice, setFilterPrice] = useState('Any Price');
  const [filterBeds, setFilterBeds] = useState('Any Beds');
  const [sortBy, setSortBy] = useState('newest');
  const [quickViewProperty, setQuickViewProperty] = useState<NewDevListing | null>(null);

  const filteredDevs = useMemo(() => {
    let result = [...allListings];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (d) => d.title.toLowerCase().includes(q) || d.location.toLowerCase().includes(q)
      );
    }

    // Type
    if (filterType !== 'All Types') {
      const typeMap: Record<string, string> = {
        Apartment: 'apartment',
        Villa: 'villa',
        Penthouse: 'penthouse',
        Townhouse: 'townhouse',
        'Family Home': 'house',
        Studio: 'studio',
      };
      const dbType = typeMap[filterType] || filterType.toLowerCase();
      result = result.filter((d) => d.propertyType === dbType);
    }

    // Area
    if (filterArea !== 'All Areas') {
      const area = filterArea.toLowerCase();
      result = result.filter((d) => d.location.toLowerCase().includes(area));
    }

    // Price
    const priceRange = parsePriceFilter(filterPrice);
    if (priceRange) {
      result = result.filter((d) => d.price >= priceRange.min && d.price <= priceRange.max);
    }

    // Beds
    const bedsMin = parseBedsFilter(filterBeds);
    if (bedsMin !== null) {
      result = result.filter((d) => d.beds >= bedsMin);
    }

    // Sort
    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
      default:
        break;
    }

    return result;
  }, [allListings, searchQuery, filterType, filterArea, filterPrice, filterBeds, sortBy]);

  return (
    <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
      <Header />

      {/* Loading state */}
      {loading && (
        <>
          {/* Hero skeleton */}
          <div className="relative flex flex-col items-center justify-center pt-16 pb-16 bg-primary">
            <div className="relative z-10 w-full max-w-3xl mx-auto px-4 md:px-6 text-center">
              <div className="h-4 w-40 bg-white/20 rounded mx-auto mb-3 animate-pulse" />
              <div className="h-10 w-64 bg-white/20 rounded mx-auto mb-4 animate-pulse" />
              <div className="h-4 w-80 bg-white/20 rounded mx-auto animate-pulse" />
            </div>
          </div>
          {/* Featured skeleton */}
          <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-white">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8 md:mb-14">
                <div className="h-4 w-32 bg-stone-200 rounded mx-auto mb-2 animate-pulse" />
                <div className="h-7 w-64 bg-stone-200 rounded mx-auto animate-pulse" />
              </div>
              <div className="space-y-6 md:space-y-10">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-gray-100 overflow-hidden">
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
        </>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded-full mb-4">
            <i className="ri-error-warning-line text-2xl text-red-400"></i>
          </div>
          <p className="text-primary font-roboto font-bold text-lg mb-2">Unable to load developments</p>
          <p className="text-stone-400 font-roboto text-sm mb-4">{error}</p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
            <i className="ri-arrow-left-line"></i>Back to Home
          </Link>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Hero section */}
          <div className="relative flex flex-col items-center justify-center text-center overflow-hidden pt-16 pb-16 bg-primary">
            <div className="relative z-10 w-full max-w-3xl mx-auto px-4 md:px-6 text-center">
              <p className="text-golden text-sm md:text-base font-roboto font-semibold tracking-widest uppercase mb-3">Premium Developments</p>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-roboto font-bold text-white mb-4 leading-tight">New Projects</h1>
              <p className="text-white/80 font-roboto text-sm md:text-base leading-relaxed max-w-xl mx-auto">
                Discover Nairobi&apos;s finest off-plan and newly completed properties. From luxury apartments to exclusive villas — secure your future home today.
              </p>
            </div>
          </div>

          {/* Featured Developments - only show if there are featured listings */}
          {featuredListings.length > 0 && (
            <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-white">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8 md:mb-14">
                  <p className="text-golden text-sm font-roboto font-semibold tracking-widest uppercase mb-2">Featured Projects</p>
                  <h2 className="text-2xl md:text-3xl font-roboto font-bold text-primary">Signature Developments</h2>
                </div>
                <div className="space-y-6 md:space-y-10">
                  {featuredListings.map((dev: NewDevListing, idx: number) => (
                    <div key={dev.id} className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden border border-gray-100 hover:-translate-y-1 transition-all duration-300">
                      <div className={`relative h-56 sm:h-64 md:h-72 lg:h-auto ${idx % 2 === 1 ? 'lg:order-2' : ''} group`}>
                        {dev.image ? (
                          <img alt={dev.title} className="w-full h-full object-cover object-top" src={dev.image} />
                        ) : (
                          <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                            <i className="ri-building-line text-4xl text-stone-300"></i>
                          </div>
                        )}

                        {/* Preview badge */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setQuickViewProperty(dev);
                          }}
                          className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        >
                          <span className="flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 rounded-sm cursor-pointer hover:bg-black/80 transition-colors">
                            <span className="w-3.5 h-3.5 flex items-center justify-center">
                              <i className="ri-expand-diagonal-line text-xs"></i>
                            </span>
                            Preview
                          </span>
                        </button>
                        <div className="absolute top-3 left-3">
                          <span className="bg-golden text-white font-roboto text-[11px] px-2.5 py-1 uppercase tracking-wider">{dev.priceDisplay}</span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <span className="bg-primary text-white font-roboto text-[11px] px-2.5 py-1 uppercase tracking-wider">New Development</span>
                        </div>
                      </div>
                      <div className={`p-5 md:p-8 lg:p-10 flex flex-col justify-center ${idx % 2 === 1 ? 'lg:order-1' : ''}`}>
                        <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-2">New Development</p>
                        <h3 className="text-primary font-roboto font-bold text-xl md:text-2xl mb-2 md:mb-3">{dev.title}</h3>
                        <p className="text-stone-400 font-roboto text-sm flex items-center gap-1.5 mb-3 md:mb-4">
                          <i className="ri-map-pin-2-line"></i>{dev.location}
                        </p>
                        <div className="flex flex-wrap gap-3 md:gap-4 mb-4 md:mb-6">
                          {dev.beds > 0 && (
                            <div className="flex items-center gap-2 text-xs md:text-sm font-roboto text-stone-500">
                              <i className="ri-hotel-bed-line text-primary"></i>{dev.beds} Bedrooms
                            </div>
                          )}
                          {dev.baths > 0 && (
                            <div className="flex items-center gap-2 text-xs md:text-sm font-roboto text-stone-500">
                              <i className="ri-drop-line text-primary"></i>{dev.baths} Bathrooms
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3 mt-auto">
                          <Link to={`/property/${dev.slug}`} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-primary text-white font-roboto text-[11px] md:text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
                            <i className="ri-eye-line"></i>View Development
                          </Link>
                          <Link to="/contact" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 border border-primary text-primary font-roboto text-[11px] md:text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white transition-colors">
                            <i className="ri-mail-line"></i>Enquire Now
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Empty state - no featured but has listings */}
          {featuredListings.length === 0 && allListings.length > 0 && (
            <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-white">
              <div className="max-w-6xl mx-auto text-center">
                <p className="text-golden text-sm font-roboto font-semibold tracking-widest uppercase mb-2">Featured Projects</p>
                <h2 className="text-2xl md:text-3xl font-roboto font-bold text-primary mb-4">Signature Developments</h2>
                <p className="text-stone-400 font-roboto text-sm">Browse our full catalogue of new developments below.</p>
              </div>
            </section>
          )}

          {/* Benefits */}
          <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8 md:mb-14">
                <p className="text-golden text-sm font-roboto font-semibold tracking-widest uppercase mb-2">The Benefits</p>
                <h2 className="text-2xl md:text-3xl font-roboto font-bold text-primary">Why Buy a New Development?</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                {benefits.map((b) => (
                  <div key={b.title} className="p-5 md:p-6 lg:p-7 border border-gray-100 rounded-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-primary/5 rounded-full mb-4 md:mb-5">
                      <i className={`${b.icon} text-lg md:text-xl text-primary`}></i>
                    </div>
                    <h3 className="text-primary font-roboto font-bold text-sm md:text-base mb-2">{b.title}</h3>
                    <p className="text-stone-500 font-roboto text-xs md:text-sm leading-relaxed">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Browse All */}
          <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-white" id="browse">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8 md:mb-12">
                <p className="text-golden text-sm font-roboto font-semibold tracking-widest uppercase mb-2">Browse All</p>
                <h2 className="text-2xl md:text-3xl font-roboto font-bold text-primary">All New Projects</h2>
              </div>

              {/* Filters */}
              <div className="bg-primary px-3 md:px-6 py-3 md:py-5 mb-6 md:mb-10">
                <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-2 md:gap-3">
                  <div className="flex flex-1 min-w-0 gap-2">
                    <div className="flex-1 min-w-0 relative">
                      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm"></i>
                      <input
                        placeholder="Search developments..."
                        className="w-full bg-white/10 border border-white/20 rounded-sm pl-9 pr-4 py-2 md:py-2.5 text-sm font-roboto text-white placeholder:text-white/40 focus:outline-none focus:border-golden"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        setFilterType('All Types');
                        setFilterArea('All Areas');
                        setFilterPrice('Any Price');
                        setFilterBeds('Any Beds');
                        setSortBy('newest');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-golden text-white font-roboto text-xs md:text-sm tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-colors rounded-sm"
                      title="Clear all filters and search"
                    >
                      <i className="ri-refresh-line"></i>
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:flex gap-2 md:gap-3">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="bg-white/10 border border-white/20 text-white/80 rounded-sm px-3 md:px-4 py-2 md:py-2.5 text-sm font-roboto focus:outline-none focus:border-golden cursor-pointer min-w-0"
                    >
                      {TYPE_OPTIONS.map((o) => <option key={o} className="bg-primary text-white">{o}</option>)}
                    </select>
                    <select
                      value={filterArea}
                      onChange={(e) => setFilterArea(e.target.value)}
                      className="bg-white/10 border border-white/20 text-white/80 rounded-sm px-3 md:px-4 py-2 md:py-2.5 text-sm font-roboto focus:outline-none focus:border-golden cursor-pointer min-w-0"
                    >
                      {AREA_OPTIONS.map((o) => <option key={o} className="bg-primary text-white">{o}</option>)}
                    </select>
                    <select
                      value={filterPrice}
                      onChange={(e) => setFilterPrice(e.target.value)}
                      className="bg-white/10 border border-white/20 text-white/80 rounded-sm px-3 md:px-4 py-2 md:py-2.5 text-sm font-roboto focus:outline-none focus:border-golden cursor-pointer min-w-0"
                    >
                      {PRICE_OPTIONS.map((o) => <option key={o} className="bg-primary text-white">{o}</option>)}
                    </select>
                    <select
                      value={filterBeds}
                      onChange={(e) => setFilterBeds(e.target.value)}
                      className="bg-white/10 border border-white/20 text-white/80 rounded-sm px-3 md:px-4 py-2 md:py-2.5 text-sm font-roboto focus:outline-none focus:border-golden cursor-pointer min-w-0"
                    >
                      {BEDS_OPTIONS.map((o) => <option key={o} className="bg-primary text-white">{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Results header */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <p className="text-primary text-sm font-roboto">
                    <span className="font-roboto font-bold text-xl">{filteredDevs.length}</span>
                    <span className="ml-2 text-stone-400">developments found</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-stone-400 font-roboto text-xs">Sort:</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-gray-200 text-primary rounded-sm px-3 py-1.5 text-sm font-roboto focus:outline-none cursor-pointer">
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Grid */}
              {filteredDevs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDevs.map((dev) => (
                    <Link key={dev.id} to={`/property/${dev.slug}`} className="block group">
                      <div className="bg-white overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border border-gray-100 flex flex-col h-full">
                        <div className="relative h-52 overflow-hidden flex-shrink-0 group">
                          {dev.image ? (
                            <img alt={dev.title} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" src={dev.image} />
                          ) : (
                            <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                              <i className="ri-building-line text-4xl text-stone-300"></i>
                            </div>
                          )}

                          {/* Preview badge for grid cards */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setQuickViewProperty(dev);
                            }}
                            className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          >
                            <span className="flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 rounded-sm cursor-pointer hover:bg-black/80 transition-colors">
                              <span className="w-3.5 h-3.5 flex items-center justify-center">
                                <i className="ri-expand-diagonal-line text-xs"></i>
                              </span>
                              Preview
                            </span>
                          </button>
                          <div className="absolute top-2.5 left-2.5 z-10">
                            <span className="bg-primary text-white text-[9px] font-roboto font-semibold uppercase tracking-[0.18em] px-2 py-1">{dev.tag}</span>
                          </div>
                          <div className="absolute top-2.5 right-2.5 z-10">
                            <span className="bg-golden text-white text-[9px] font-roboto font-semibold uppercase tracking-[0.18em] px-2 py-1">New Dev</span>
                          </div>
                        </div>
                        <div className="flex flex-col flex-1 p-4">
                          <p className="flex items-center gap-1 text-[13px] font-roboto text-[#636363] mb-1 truncate">
                            <i className="ri-map-pin-line text-golden text-xs flex-shrink-0"></i>
                            <span className="truncate">{dev.location}</span>
                          </p>
                          <h3 className="text-[15px] font-roboto font-medium text-[#011328] leading-snug line-clamp-2 mb-3 group-hover:text-golden transition-colors">{dev.title}</h3>
                          <div className="flex items-center gap-4 text-xs font-roboto text-[#363535] mb-3">
                            {dev.beds > 0 && (
                              <span className="flex items-center gap-1"><i className="ri-hotel-bed-line text-[#636363]"></i>{dev.beds} Bed</span>
                            )}
                            {dev.baths > 0 && (
                              <span className="flex items-center gap-1"><i className="ri-drop-line text-[#636363]"></i>{dev.baths} Bath</span>
                            )}
                          </div>
                          <p className="text-[10px] font-roboto font-semibold uppercase tracking-widest text-[#1f1f1f] mb-3">{dev.propertyType.toUpperCase()}</p>
                          <div className="mt-auto pt-3 border-t border-gray-50 flex items-end justify-between gap-2">
                            <span className="text-[21px] font-roboto font-medium text-[#002349]">{dev.priceDisplay}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 flex items-center justify-center bg-stone-50 rounded-full mx-auto mb-4">
                    <i className="ri-search-line text-2xl text-stone-300"></i>
                  </div>
                  <h3 className="font-roboto font-bold text-primary text-lg mb-2">No developments found</h3>
                  <p className="text-stone-400 font-roboto text-sm mb-4">Try adjusting your filters or search terms.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('All Types');
                      setFilterArea('All Areas');
                      setFilterPrice('Any Price');
                      setFilterBeds('Any Beds');
                      setSortBy('newest');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-stone-200 text-primary font-roboto text-xs tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white hover:border-primary transition-colors"
                  >
                    <i className="ri-refresh-line"></i>Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Developer CTA */}
      <section className="py-10 md:py-14 lg:py-16 px-4 md:px-6 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-white font-roboto font-bold text-2xl md:text-3xl mb-3 md:mb-4">Have a Development to Sell?</h2>
          <p className="text-white/70 font-roboto text-xs md:text-sm mb-6 md:mb-8 max-w-lg mx-auto">
            We work with leading developers across Kenya to market and sell premium new developments. Partner with Nairobi&apos;s most trusted agency.
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
      <QuickViewModal
        isOpen={quickViewProperty !== null}
        onClose={() => setQuickViewProperty(null)}
        property={quickViewProperty ? {
          id: quickViewProperty.id,
          slug: quickViewProperty.slug,
          title: quickViewProperty.title,
          price: quickViewProperty.priceDisplay,
          location: quickViewProperty.location,
          category: quickViewProperty.propertyType,
          beds: quickViewProperty.beds,
          baths: quickViewProperty.baths,
          parking: 0,
          description: '',
          images: quickViewProperty.image ? [quickViewProperty.image] : [],
          type: 'sale',
        } : null}
      />
    </div>
  );
}