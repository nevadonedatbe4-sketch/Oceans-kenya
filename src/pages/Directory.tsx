import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import { useAmenities } from '@/hooks/useAmenities';
import { supabase } from '@/lib/supabase';
import { detectSearchIntent } from '@/lib/searchIntent';
import {
  SORTED_CATEGORIES,
  SUBCATEGORIES,
  categoryColor,
  categoryLabel,
  categoryIcon,
  subcategoryLabel,
  type Amenity,
  type AmenityCategory,
} from '@/lib/amenities';
import AmenityCard from '@/components/feature/AmenityCard';
import AmenityDetailModal from '@/components/feature/AmenityDetailModal';
import CategoryIcon from '@/components/base/CategoryIcon';
import { useDirectoryLandingContent } from '@/hooks/useDirectoryPageContent';

const PER_CATEGORY_INITIAL = 8;

export default function Directory() {
  const { content: c } = useDirectoryLandingContent();
  const { amenities, loading, error, refetch } = useAmenities();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | AmenityCategory>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Amenity | null>(null);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [openCategory, setOpenCategory] = useState<AmenityCategory | null>(null);
  const listingsRef = useRef<HTMLDivElement>(null);

  // Load CRM-managed category colour overrides (site_settings).
  useEffect(() => {
    supabase
      .from('site_settings')
      .select('key, value')
      .like('key', 'amenity_category_color_%')
      .then(({ data }) => {
        if (data && data.length) {
          const overrides: Record<string, string> = {};
          (data as { key: string; value: string }[]).forEach((r) => {
            const cat = r.key.replace('amenity_category_color_', '');
            if (r.value) overrides[cat] = r.value;
          });
          setCategoryColors(overrides);
        }
      })
      .catch(() => {});
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    amenities.forEach((a) => {
      const cat = a.category || 'services';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [amenities]);

  const totalCount = useMemo(() => amenities.length, [amenities]);

  // Natural-language intent: "Where can I get a SIM card?" → connectivity, etc.
  const intent = useMemo(() => detectSearchIntent(search), [search]);
  const effectiveCategory = intent ? intent.category : activeCategory;
  const effectiveSearch = intent ? intent.term ?? '' : search;

  const filterFn = (a: Amenity): boolean => {
    if (effectiveCategory !== 'all' && a.category !== effectiveCategory) return false;
    const q = effectiveSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q) ||
      (a.address || '').toLowerCase().includes(q) ||
      categoryLabel(a.category).toLowerCase().includes(q) ||
      subcategoryLabel(a.subcategory).toLowerCase().includes(q) ||
      (a.neighbourhood_name || '').toLowerCase().includes(q)
    );
  };

  const filtered = useMemo(
    () => amenities.filter(filterFn),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [amenities, effectiveSearch, effectiveCategory],
  );

  const grouped = useMemo(() => {
    const map: Record<string, Amenity[]> = {};
    filtered.forEach((a) => {
      const cat = a.category || 'services';
      if (!map[cat]) map[cat] = [];
      map[cat].push(a);
    });
    return map;
  }, [filtered]);

  const visibleCategories = useMemo(
    () => SORTED_CATEGORIES.filter((c) => grouped[c.key]?.length),
    [grouped],
  );

  const relatedFor = (a: Amenity): Amenity[] =>
    amenities.filter((x) => x.id !== a.id && x.category === a.category).slice(0, 6);

  const scrollToListings = () => {
    listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectCategory = (key: AmenityCategory) => {
    setActiveCategory(key);
    setOpenCategory(null);
    scrollToListings();
  };

  const toggleCategory = (key: AmenityCategory) => {
    setOpenCategory((prev) => (prev === key ? null : key));
  };

  const selectSubcategory = (cat: AmenityCategory, sub: string) => {
    setActiveCategory(cat);
    setSearch(subcategoryLabel(sub));
    setOpenCategory(null);
    scrollToListings();
  };

  // Close the open category dropdown when clicking outside the tiles section.
  const tilesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tilesRef.current && !tilesRef.current.contains(e.target as Node)) {
        setOpenCategory(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Hero */}
      <section className="relative h-[340px] md:h-[420px] overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/60"></div>
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1.2px, transparent 0)', backgroundSize: '26px 26px' }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/70 to-primary/60"></div>
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div className="max-w-3xl w-full">
            <p className="text-golden text-xs font-jost font-semibold uppercase tracking-[0.3em] mb-3">
              {c.hero_eyebrow}
            </p>
            <h1 className="text-white font-prata font-bold text-3xl md:text-5xl mb-4">
              {c.hero_title}
            </h1>
            <p className="text-white/85 font-roboto text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              {c.hero_text}
            </p>
          </div>
        </div>
      </section>

      {/* Live counter + category summary - sits directly under the hero so the blue flows straight through */}
      <section className="bg-primary border-t-2 border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-10 mb-5">
            <div>
              <p className="font-prata font-bold text-golden text-[40px] md:text-[52px] leading-none">
                {loading ? '-' : totalCount}
              </p>
              <p className="font-jost text-white/60 text-xs uppercase tracking-[0.15em] mt-1.5">
                {c.counter_label}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 md:gap-2">
                {SORTED_CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => selectCategory(c.key)}
                    style={{ '--cat-color': categoryColor(c.key, categoryColors) } as CSSProperties}
                    className="group relative inline-flex items-center gap-1 md:gap-1.5 py-1 md:px-3 md:py-1.5 md:rounded-[3px] text-[10px] md:text-xs font-jost font-semibold uppercase tracking-[0.06em] cursor-pointer whitespace-nowrap transition-colors text-white/70 hover:text-white md:text-white bg-transparent md:bg-[color:var(--cat-color)]"
                  >
                    <i className={`${c.icon} text-[11px] md:text-[13px]`}></i>
                    {c.label}
                    <span className="opacity-60 md:opacity-80">{categoryCounts[c.key] || 0}</span>
                    <span className="pointer-events-none absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full origin-left scale-x-0 bg-[color:var(--cat-color)] transition-transform duration-200 group-hover:scale-x-100 md:hidden"></span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Breadcrumb - placed below the blue band so the blue is never broken */}
      <PageBreadcrumbs />

      {/* Category tiles */}
      <section className="bg-[#F7F9F9] border-b-2 border-primary/10">
        <div ref={tilesRef} className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="mb-6">
            <p className="text-[#0D5959] text-xs font-jost font-semibold uppercase tracking-[0.15em] mb-1">
              {c.tiles_eyebrow}
            </p>
            <h2 className="font-prata font-bold text-primary text-[27px] md:text-[33px]">
              {c.tiles_title}
            </h2>
            <p className="font-roboto text-sm text-[#636363] mt-1.5">
              {c.tiles_text}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3">
            {SORTED_CATEGORIES.map((c) => {
              const count = categoryCounts[c.key] || 0;
              const isOpen = openCategory === c.key;
              const subs = SUBCATEGORIES[c.key] || [];
              return (
                <div key={c.key} className="relative">
                  <button
                    type="button"
                    onClick={() => toggleCategory(c.key)}
                    aria-expanded={isOpen}
                    className={`group flex items-center gap-3 bg-white border-2 p-3 text-left w-full transition-colors cursor-pointer ${
                      isOpen
                        ? 'border-primary/50'
                        : 'border-primary/10 hover:border-primary/30'
                    }`}
                  >
                    <CategoryIcon icon={c.icon} color={categoryColor(c.key, categoryColors)} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-roboto font-semibold text-primary text-lg leading-tight group-hover:text-[#0D5959] transition-colors truncate">
                        {c.label}
                      </h3>
                      <p className="font-roboto text-sm text-[#636363] mt-0.5 line-clamp-1">
                        {count} place{count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <i
                      className={`ri-arrow-down-s-line text-primary/50 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    ></i>
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white border border-primary/10 animate-dropdown-enter">
                      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-primary/10">
                        <p className="flex items-center gap-2 font-jost text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0D5959] truncate">
                          <i className={`${c.icon} text-sm`}></i>
                          {c.label}
                        </p>
                        <span className="font-prata text-lg text-golden leading-none shrink-0">
                          {count}
                        </span>
                      </div>
                      <div className="px-4 py-3 max-h-40 overflow-y-auto">
                        {subs.length > 0 ? (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                            {subs.slice(0, 14).map((s) => (
                              <button
                                key={s.key}
                                type="button"
                                onClick={() => selectSubcategory(c.key, s.key)}
                                className="group flex items-center justify-between gap-2 py-1.5 text-left text-sm font-roboto text-[#3A3A3A] hover:text-[#0D5959] transition-colors cursor-pointer whitespace-nowrap border-b border-primary/5 last:border-0"
                              >
                                <span className="truncate">{s.label}</span>
                                <i className="ri-arrow-right-line text-[11px] text-primary/30 group-hover:text-primary/70 transition-colors shrink-0"></i>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[12px] font-roboto text-[#636363]">
                            Explore this category to see everything inside.
                          </p>
                        )}
                      </div>
                      <Link
                        to={c.key === 'night_life' ? '/night-life' : `/directory/${c.key}`}
                        onClick={() => setOpenCategory(null)}
                        className="flex items-center justify-between gap-3 px-4 py-3.5 border-t border-primary/10 font-jost text-[12px] font-semibold uppercase tracking-[0.12em] text-white bg-primary hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap group"
                      >
                        {c.view_category_label}
                        <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Search + suggestions + listings */}
      <main ref={listingsRef} className="flex-1 scroll-mt-24">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-xl">
              <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-[#636363] text-base pointer-events-none"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={c.search_placeholder}
                className="w-full pl-11 pr-11 py-3 rounded-md border border-primary/20 bg-white text-sm font-roboto text-[#1a1a1a] placeholder:text-[#636363] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[#636363] hover:text-[#1a1a1a] transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-base"></i>
                </button>
              )}
            </div>
          </div>

          {/* Active filter indicator (intent or manual category) */}
          {effectiveCategory !== 'all' && (
            <div className="mb-4 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-roboto text-[#636363]">
                {intent ? 'Results for' : 'Showing'}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[3px] text-xs font-jost font-semibold text-white whitespace-nowrap"
                style={{ backgroundColor: categoryColor(effectiveCategory, categoryColors) }}
              >
                <i className={`${categoryIcon(effectiveCategory)} text-[13px]`}></i>
                {categoryLabel(effectiveCategory)}
                <span className="opacity-80">{categoryCounts[effectiveCategory] || 0}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (intent) setSearch('');
                    else setActiveCategory('all');
                  }}
                  className="ml-1 w-4 h-4 flex items-center justify-center cursor-pointer opacity-80 hover:opacity-100"
                  aria-label="Clear filter"
                >
                  <i className="ri-close-line"></i>
                </button>
              </span>
              {intent && effectiveSearch && (
                <span className="text-xs font-roboto text-[#636363]">
                  matching <span className="text-primary font-semibold">&ldquo;{effectiveSearch}&rdquo;</span>
                </span>
              )}
            </div>
          )}

          {/* Dynamic suggestions */}
          {!search.trim() && activeCategory === 'all' && (
            <div className="mb-6">
              <p className="text-xs font-roboto text-[#636363] mb-2">
                {c.suggestions_label}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {c.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSearch(s)}
                    className="text-sm font-roboto text-primary underline underline-offset-2 decoration-primary/40 hover:text-[#0D5959] hover:decoration-[#0D5959] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results count */}
          {!loading && !error && (
            <p className="text-xs font-roboto text-[#636363] mb-5">
              {c.showing_label} <span className="text-primary font-semibold">{filtered.length}</span>{' '}
              {c.place_word}
              {effectiveCategory !== 'all' && ` ${c.category_word} ${categoryLabel(effectiveCategory)}`}
              {effectiveSearch.trim() && ` matching \u201c${effectiveSearch.trim()}\u201d`}
            </p>
          )}

          {/* Loading */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-stone-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-14 bg-stone-50 rounded-lg border border-primary/10">
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-stone-100 rounded-full">
                <i className="ri-error-warning-line text-stone-400 text-xl"></i>
              </div>
              <p className="font-semibold text-primary text-sm mb-1">Unable to verify results</p>
              <p className="text-xs text-stone-500 mb-3">{error}</p>
              <button
                onClick={refetch}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line"></i> Try again
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Grouped by category */}
              {visibleCategories.map((cat) => {
                const items = grouped[cat.key];
                const isExpanded = expanded[cat.key] || false;
                const visibleItems = isExpanded ? items : items.slice(0, PER_CATEGORY_INITIAL);
                return (
                  <div key={cat.key}>
                    <div className="flex items-center gap-2.5 mb-3">
                      <CategoryIcon icon={cat.icon} color={categoryColor(cat.key, categoryColors)} />
                      <div className="flex-1">
                        <h3 className="font-prata font-semibold text-primary text-base leading-none">
                          {cat.label}
                        </h3>
                        <p className="text-xs text-[#636363] mt-0.5">
                          {items.length} place{items.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {visibleItems.map((a) => (
                        <AmenityCard
                          key={a.id}
                          amenity={a}
                          categoryColor={categoryColor(a.category, categoryColors)}
                          distanceText={null}
                          onViewDetails={() => setSelected(a)}
                        />
                      ))}
                    </div>
                    {items.length > PER_CATEGORY_INITIAL && (
                      <button
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }))
                        }
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-[#0D5959] transition-colors cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            Show less <i className="ri-arrow-up-s-line"></i>
                          </>
                        ) : (
                          <>
                            Show all {items.length} <i className="ri-arrow-down-wide-fill"></i>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Empty state */}
              {filtered.length === 0 && (
                <div className="text-center py-14 bg-stone-50 rounded-lg border border-primary/10">
                  <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-stone-100 rounded-full">
                    <i className="ri-map-pin-line text-stone-400 text-xl"></i>
                  </div>
                  <p className="font-semibold text-primary text-sm mb-1">
                    {c.empty_title}
                  </p>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    {effectiveSearch.trim()
                      ? `No verified places match \u201c${effectiveSearch.trim()}\u201d. Try a different term or category.`
                      : c.empty_text}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* CTA */}
      <section className="bg-primary py-14 md:py-20 px-4 md:px-6 text-center">
        <h3 className="font-prata font-semibold text-white text-[27px] md:text-[33px] mb-3">
          {c.cta_heading}
        </h3>
        <p className="font-roboto text-white/80 text-[15px] md:text-base max-w-xl mx-auto leading-relaxed mb-6">
          {c.cta_text}
        </p>
        <Link
          to="/neighbourhoods"
          className="inline-flex items-center gap-2 px-6 py-3 bg-golden text-white text-sm font-jost font-semibold uppercase tracking-[0.08em] hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap"
        >
          {c.cta_button}
          <i className="ri-arrow-right-line"></i>
        </Link>
      </section>

      <PageContactSection />
      <Footer />
      <BackToTop />

      {/* Detail modal */}
      {selected && (
        <AmenityDetailModal
          amenity={selected}
          categoryColor={categoryColor(selected.category, categoryColors)}
          distanceText={null}
          related={relatedFor(selected)}
          onSelectRelated={(a) => setSelected(a)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}