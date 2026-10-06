import { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbTrail from '@/components/feature/PageBreadcrumbTrail';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import { useAmenities } from '@/hooks/useAmenities';
import { supabase } from '@/lib/supabase';
import {
  categoryMeta,
  categoryColor,
  categoryLabel,
  subcategoryLabel,
  SUBCATEGORIES,
  categoryIcon,
  type Amenity,
} from '@/lib/amenities';
import AmenityCard from '@/components/feature/AmenityCard';
import AmenityDetailModal from '@/components/feature/AmenityDetailModal';
import CategoryIcon from '@/components/base/CategoryIcon';
import { useDirectoryCategoryContent } from '@/hooks/useDirectoryPageContent';

const SUB_PER_ROW = 10;
const PER_PAGE_INITIAL = 12;

export default function DirectoryCategory() {
  const { content: dc } = useDirectoryCategoryContent();
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { amenities, loading, error, refetch } = useAmenities();
  const [activeSub, setActiveSub] = useState<string>('all');
  const [selected, setSelected] = useState<Amenity | null>(null);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(PER_PAGE_INITIAL);

  const meta = categoryMeta(categorySlug || null);

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
      }, () => {});
  }, []);

  useEffect(() => {
    setActiveSub('all');
    setVisibleCount(PER_PAGE_INITIAL);
  }, [categorySlug]);

  const categoryItems = useMemo(() => {
    if (!meta) return [];
    return amenities.filter((a) => (a.category || 'services') === meta.key);
  }, [amenities, meta]);

  const subcategories = useMemo(() => {
    if (!meta) return [];
    return SUBCATEGORIES[meta.key] || [];
  }, [meta]);

  const filtered = useMemo(() => {
    if (activeSub === 'all') return categoryItems;
    return categoryItems.filter((a) => (a.subcategory || '') === activeSub);
  }, [categoryItems, activeSub]);

  const colour = meta ? categoryColor(meta.key, categoryColors) : '#6B4423';

  /**
   * Build the chip colour variables from the page's own category colour, so
   * every unselected chip sits on a soft tint of the same hue (a "shade" of the
   * accent) instead of a flat grey. The active chip keeps the solid colour with
   * white text, and hovering an unselected chip deepens its shade.
   */
  const chipStyle = (isActive: boolean): CSSProperties => {
    if (isActive) {
      return {
        '--dir-chip-bg': colour,
        '--dir-chip-fg': '#ffffff',
        '--dir-chip-border': colour,
        '--dir-chip-bg-hover': colour,
        '--dir-chip-border-hover': colour,
      } as CSSProperties;
    }
    return {
      '--dir-chip-bg': `color-mix(in srgb, ${colour} 10%, #ffffff)`,
      '--dir-chip-fg': `color-mix(in srgb, ${colour} 78%, #14201c)`,
      '--dir-chip-border': `color-mix(in srgb, ${colour} 20%, #ffffff)`,
      '--dir-chip-bg-hover': `color-mix(in srgb, ${colour} 20%, #ffffff)`,
      '--dir-chip-border-hover': `color-mix(in srgb, ${colour} 38%, #ffffff)`,
    } as CSSProperties;
  };

  const relatedFor = (a: Amenity): Amenity[] =>
    categoryItems.filter((x) => x.id !== a.id && x.category === a.category).slice(0, 6);

  if (!meta) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-24">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 bg-[#F3F0E9] rounded-full">
              <i className="ri-map-pin-2-line text-2xl text-primary"></i>
            </div>
            <h1 className="font-prata font-bold text-primary text-3xl mb-3">{dc.notfound_title}</h1>
            <p className="font-roboto text-[#636363] text-sm mb-6 leading-relaxed">
              {dc.notfound_text}
            </p>
            <Link
              to="/directory"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-jost font-semibold uppercase tracking-[0.08em] hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-arrow-left-line"></i> {dc.notfound_button}
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  const visibleItems = filtered.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Hero - solid dark-blue band, no image */}
      <section className="relative h-3/4 min-h-[420px] md:min-h-[520px] overflow-hidden bg-[#081F47]">
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div className="max-w-3xl w-full">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-white text-xs font-jost font-semibold uppercase tracking-[0.12em] mb-3"
              style={{ backgroundColor: colour }}
            >
              <i className={`${categoryIcon(meta.key)} text-sm`}></i>
              {categoryLabel(meta.key)}
            </div>
            <h1 className="text-white font-prata font-bold text-3xl md:text-5xl mb-4">
              {categoryLabel(meta.key)}
            </h1>
            <p className="text-white/80 font-roboto text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              {meta.description}. {dc.hero_intro.replace('{category}', categoryLabel(meta.key).toLowerCase())}
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
          {/* Bridge to the dedicated Night Life guide */}
          {meta.key === 'night_life' && (
            <Link
              to="/night-life"
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 rounded-lg border border-primary/15 bg-[#FBF6F4] hover:border-primary/30 transition-colors px-4 md:px-5 py-4"
            >
              <span className="flex items-center gap-3">
                <span
                  className="w-11 h-11 flex items-center justify-center rounded-full text-white shrink-0"
                  style={{ backgroundColor: colour }}
                >
                  <i className="ri-moon-clear-line text-xl"></i>
                </span>
                <span>
                  <span className="block font-prata font-semibold text-primary text-base leading-tight">
                    {dc.nightlife_title}
                  </span>
                  <span className="block text-xs text-[#636363] mt-0.5">
                    {dc.nightlife_text}
                  </span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-jost font-semibold uppercase tracking-[0.08em] text-primary whitespace-nowrap">
                {dc.nightlife_button}
                <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
              </span>
            </Link>
          )}

          {/* Subcategory filters */}
          {subcategories.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2.5 mb-3">
                <CategoryIcon icon={categoryIcon(meta.key)} color={colour} />
                <h2 className="font-prata font-semibold text-primary text-lg leading-none">
                  {dc.subcat_heading}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSub('all')}
                  className="dir-chip px-3.5 py-1.5 rounded-[3px] text-[12px] font-jost font-semibold tracking-[0.04em] cursor-pointer whitespace-nowrap"
                  style={chipStyle(activeSub === 'all')}
                >
                  {dc.subcat_all_label}
                  <span className={activeSub === 'all' ? 'ml-1' : 'ml-1 opacity-70'}>
                    {categoryItems.length}
                  </span>
                </button>
                {subcategories.slice(0, SUB_PER_ROW).map((s) => {
                  const count = categoryItems.filter((a) => a.subcategory === s.key).length;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setActiveSub(s.key)}
                      className="dir-chip px-3.5 py-1.5 rounded-[3px] text-[12px] font-jost font-semibold tracking-[0.04em] cursor-pointer whitespace-nowrap"
                      style={chipStyle(activeSub === s.key)}
                    >
                      {s.label}
                      {count > 0 && (
                        <span className={activeSub === s.key ? 'ml-1' : 'ml-1 opacity-70'}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Breadcrumb + count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <PageBreadcrumbTrail
              items={[
                { label: 'Home', to: '/' },
                { label: 'Nairobi', to: '/neighbourhoods' },
                { label: categoryLabel(meta.key) },
              ]}
            />
            <p className="text-xs font-roboto text-[#636363]">
              {dc.showing_label} <span className="text-primary font-semibold">{filtered.length}</span> {dc.place_word}
              {activeSub !== 'all' && ` ${subcategoryLabel(activeSub)}`}
            </p>
          </div>

          {/* Listing grid */}
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
              <p className="font-semibold text-primary text-sm mb-1">{dc.error_title}</p>
              <p className="text-xs text-stone-500 mb-3">{error}</p>
              <button
                onClick={refetch}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line"></i> {dc.error_retry_label}
              </button>
            </div>
          ) : visibleItems.length > 0 ? (
            <>
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
              {filtered.length > visibleCount && (
                <div className="text-center mt-8">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PER_PAGE_INITIAL)}
                    className="inline-flex items-center gap-1.5 px-6 py-3 bg-primary text-white text-xs font-jost font-semibold uppercase tracking-[0.08em] hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {dc.load_more_label} ({filtered.length - visibleCount} {dc.remaining_label})
                    <i className="ri-arrow-down-s-line"></i>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-14 bg-stone-50 rounded-lg border border-primary/10">
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-stone-100 rounded-full">
                <i className="ri-map-pin-line text-stone-400 text-xl"></i>
              </div>
              <p className="font-semibold text-primary text-sm mb-1">
                {dc.empty_title}
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {activeSub !== 'all'
                  ? `There aren&rsquo;t any verified ${subcategoryLabel(activeSub)} spots here yet - data is being updated regularly.`
                  : dc.empty_text}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* CTA */}
      <section className="bg-primary py-14 md:py-20 px-4 md:px-6 text-center">
        <h3 className="font-prata font-semibold text-white text-[27px] md:text-[33px] mb-3">
          {dc.cta_heading}
        </h3>
        <p className="font-roboto text-white/80 text-[15px] md:text-base max-w-xl mx-auto leading-relaxed mb-6">
          {dc.cta_text}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/neighbourhoods"
            className="inline-flex items-center gap-2 px-6 py-3 bg-golden text-white text-sm font-jost font-semibold uppercase tracking-[0.08em] hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap"
          >
            {dc.cta_button_primary}
            <i className="ri-arrow-right-line"></i>
          </Link>
          <Link
            to="/directory"
            className="inline-flex items-center gap-2 px-6 py-3 border border-white/50 text-white text-sm font-jost font-semibold uppercase tracking-[0.08em] hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
          >
            {dc.cta_button_secondary}
            <i className="ri-arrow-right-line"></i>
          </Link>
        </div>
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