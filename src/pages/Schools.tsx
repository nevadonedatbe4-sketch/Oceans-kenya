import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import { useAmenities } from '@/hooks/useAmenities';
import { haversineDistance, formatDistance } from '@/lib/distance';
import { withReturnFrom, useCurrentPath } from '@/lib/navigation';
import { usePageContent } from '@/hooks/usePageContent';
import { DEFAULT_SCHOOLS } from '@/lib/pageCopy';
import { CARD_HEIGHT, CARD_IMAGE_FRAME, CARD_IMAGE, CARD_BODY } from '@/lib/cardLayout';
import {
  schoolCategoryLabel,
  getFeatures,
  getCurriculum,
  getLevels,
  getFeeRange,
  amenityImage,
  type Amenity,
} from '@/lib/amenities';

// Nairobi CBD reference point for "distance from centre" labels
const CBD = { lat: -1.286389, lng: 36.817223 };

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  international_school: 'bg-accent',
  primary_school: 'bg-[#C05621]',
  secondary_school: 'bg-[#556B2F]',
  kindergarten: 'bg-[#B7791F]',
  university: 'bg-[#1F7A6E]',
  college: 'bg-[#8A6D3B]',
  nursery: 'bg-[#B7791F]',
  daycare: 'bg-[#B7791F]',
  local: 'bg-[#6B4423]',
};

/** Order the Level filter options sensibly rather than alphabetically. */
const LEVEL_ORDER = ['Kindergarten', 'Primary', 'Secondary', 'College', 'University'];

/** School-type categories that are intentionally hidden from the directory pills. */
const HIDDEN_TYPE_KEYS = ['other', 'tuition'];

/**
 * School-type pills that always appear on the directory - even before any
 * listing uses them - so the categories are in place ready for future data.
 * Each group matches one or more underlying subcategory keys.
 */
const FEATURED_TYPE_GROUPS: { key: string; label: string; match: string[] }[] = [
  {
    key: 'institution',
    label: 'Institutions',
    match: ['college', 'university', 'vocational', 'training_centre', 'professional_training'],
  },
  { key: 'language_school', label: 'Language Schools', match: ['language_school'] },
];

/** Split a comma/newline separated attribute value into clean tokens. */
function splitTokens(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Turn a raw subcategory key into a display label when there is no mapping. */
function prettyTypeLabel(key: string): string {
  if (!key || key === 'other') return 'Other';
  const known = schoolCategoryLabel(key);
  if (known && known !== key) return known;
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Display label for a type filter key, including the always-visible groups. */
function typeLabel(key: string): string {
  const group = FEATURED_TYPE_GROUPS.find((g) => g.key === key);
  return group ? group.label : prettyTypeLabel(key);
}

/** Does a school with this subcategory belong under the selected type filter? */
function matchesType(type: string, subcategory: string | null): boolean {
  if (type === 'other') return !subcategory;
  const group = FEATURED_TYPE_GROUPS.find((g) => g.key === type);
  if (group) return group.match.includes(subcategory || '');
  return subcategory === type;
}

function StarRating({ rating }: { rating: number | null }) {
  const r = Math.round(rating ?? 0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <i key={s} className={`ri-star-fill text-xs ${s <= r ? 'text-golden' : 'text-gray-300'}`} />
      ))}
      {rating != null && <span className="text-xs font-roboto text-primary/60 ml-1">{rating}</span>}
    </div>
  );
}

function distanceFromCbd(school: Amenity): number | null {
  if (school.latitude == null || school.longitude == null) return null;
  return haversineDistance(CBD.lat, CBD.lng, school.latitude, school.longitude);
}

export default function Schools() {
  const currentPath = useCurrentPath();
  const { content: c } = usePageContent('schools', DEFAULT_SCHOOLS);
  // ── Filters live in the URL, so every pill / sidebar item is a real,
  //    shareable link that always drives the results below. ──
  const [params, setParams] = useSearchParams();
  const type = params.get('type') || 'all';
  const area = params.get('area') || 'all';
  const level = params.get('level') || 'all';
  const curriculum = params.get('curriculum') || 'all';

  const { amenities, loading, error, refetch } = useAmenities({ category: 'education' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  /** Build a new /schools search string, overriding some params ('' / 'all' clears). */
  const buildSearch = (overrides: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(overrides).forEach(([k, v]) => {
      if (!v || v === 'all') next.delete(k);
      else next.set(k, v);
    });
    const s = next.toString();
    return s ? `?${s}` : '';
  };

  // ── Filter options are derived live from the data, so they always reflect
  //    what is actually in the directory (School Type, Level, Curriculum). ──
  const typeOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    amenities.forEach((s) => {
      const key = s.subcategory || 'other';
      counts[key] = (counts[key] || 0) + 1;
    });
    const featuredKeys = new Set(FEATURED_TYPE_GROUPS.map((g) => g.key));
    const derived = Object.entries(counts)
      .filter(([key]) => !HIDDEN_TYPE_KEYS.includes(key) && !featuredKeys.has(key))
      .map(([key, count]) => ({ key, label: prettyTypeLabel(key), count }))
      .sort((a, b) => b.count - a.count);
    // Always-visible groups, so the category is present even with no listings yet.
    const featured = FEATURED_TYPE_GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      count: amenities.filter((s) => g.match.includes(s.subcategory || '')).length,
    }));
    return [...derived, ...featured];
  }, [amenities]);

  const levelOptions = useMemo(() => {
    const set = new Set<string>();
    amenities.forEach((s) => splitTokens(getLevels(s)).forEach((t) => set.add(t)));
    const all = Array.from(set);
    all.sort((a, b) => {
      const ai = LEVEL_ORDER.indexOf(a);
      const bi = LEVEL_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return all;
  }, [amenities]);

  const curriculumOptions = useMemo(() => {
    const set = new Set<string>();
    amenities.forEach((s) => splitTokens(getCurriculum(s)).forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [amenities]);

  const areaOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    amenities.forEach((s) => {
      const n = s.neighbourhood_name;
      if (n) counts[n] = (counts[n] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [amenities]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return amenities.filter((s) => {
      const typeMatch = type === 'all' || matchesType(type, s.subcategory);
      const areaMatch = area === 'all' || (s.neighbourhood_name || '') === area;
      const levelMatch = level === 'all' || splitTokens(getLevels(s)).includes(level);
      const curriculumMatch =
        curriculum === 'all' || splitTokens(getCurriculum(s)).includes(curriculum);
      const searchMatch =
        q === '' ||
        s.name.toLowerCase().includes(q) ||
        (s.neighbourhood_name || '').toLowerCase().includes(q) ||
        getCurriculum(s).toLowerCase().includes(q) ||
        getLevels(s).toLowerCase().includes(q) ||
        prettyTypeLabel(s.subcategory || 'other').toLowerCase().includes(q);
      return typeMatch && areaMatch && levelMatch && curriculumMatch && searchMatch;
    });
  }, [amenities, type, area, level, curriculum, searchQuery]);

  const hasActiveFilter =
    type !== 'all' || area !== 'all' || level !== 'all' || curriculum !== 'all' || searchQuery !== '';

  const clearAll = () => {
    setParams(new URLSearchParams());
    setSearchQuery('');
  };

  // Breadcrumbs describe the site hierarchy (Home → Nairobi → Area → Schools).
  const breadcrumbItems = useMemo(() => {
    const items: { label: string; to?: string }[] = [
      { label: 'Home', to: '/' },
      { label: 'Nairobi', to: '/neighbourhoods' },
    ];
    if (area !== 'all') {
      items.push({ label: area, to: `/schools?area=${encodeURIComponent(area)}` });
    }
    items.push({ label: 'Schools' });
    return items;
  }, [area]);

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-roboto font-medium cursor-pointer transition-colors whitespace-nowrap ${
      active ? 'bg-primary text-white' : 'bg-gray-100 text-primary hover:bg-gray-200'
    }`;

  return (
    <div className="min-h-screen bg-white flex flex-col pt-[60px] md:pt-[130px] lg:pt-[148px]">
      <Header />

      {/* Hero */}
      <div className="relative h-[320px] md:h-[400px] overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/80"></div>
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1.2px, transparent 0)', backgroundSize: '26px 26px' }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/40"></div>
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div className="w-full">
            <h1 className="text-white font-roboto font-bold text-3xl md:text-4xl mb-3">{c.hero_title}</h1>
            <p className="text-white/80 font-roboto text-sm md:text-base max-w-lg mx-auto">
              {c.hero_subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Breadcrumb - reflects the real hierarchy, not browsing history */}
      <PageBreadcrumbs items={breadcrumbItems} />

      {/* Search + Filters */}
      <div className="sticky top-[60px] md:top-[120px] z-30 bg-white border-b border-primary/12 shadow-sm">
        <div className="px-4 md:px-6 lg:px-10 py-3 max-w-[1400px] mx-auto space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <div className="flex items-center gap-2.5 px-4 h-10 bg-white border border-primary/20 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  <i className="ri-search-line text-gray-400 text-sm"></i>
                </span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={c.search_placeholder}
                  className="flex-1 min-w-0 text-sm font-roboto text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-primary/60 cursor-pointer">
                    <i className="ri-close-line text-xs"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <div className="relative">
                <select
                  value={area}
                  onChange={(e) => setParams(new URLSearchParams(buildSearch({ area: e.target.value })), { replace: true })}
                  className="appearance-none h-9 pl-3 pr-8 text-xs font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none cursor-pointer"
                  aria-label="Filter by area"
                >
                  <option value="all">{c.all_areas_label}</option>
                  {areaOptions.map((a) => (
                    <option key={a.name} value={a.name}>{a.name}</option>
                  ))}
                </select>
                <i className="ri-arrow-down-wide-fill absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
              </div>
              <div className="relative">
                <select
                  value={level}
                  onChange={(e) => setParams(new URLSearchParams(buildSearch({ level: e.target.value })), { replace: true })}
                  className="appearance-none h-9 pl-3 pr-8 text-xs font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none cursor-pointer"
                  aria-label="Filter by level"
                >
                  <option value="all">{c.all_levels_label}</option>
                  {levelOptions.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <i className="ri-arrow-down-wide-fill absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
              </div>
              <div className="relative">
                <select
                  value={curriculum}
                  onChange={(e) => setParams(new URLSearchParams(buildSearch({ curriculum: e.target.value })), { replace: true })}
                  className="appearance-none h-9 pl-3 pr-8 text-xs font-roboto font-medium text-primary bg-white border border-primary/20 rounded-lg focus:outline-none cursor-pointer"
                  aria-label="Filter by curriculum"
                >
                  <option value="all">{c.all_curriculums_label}</option>
                  {curriculumOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <i className="ri-arrow-down-wide-fill absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
              </div>
            </div>

            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 border border-primary/20 rounded-lg text-xs font-roboto text-primary cursor-pointer whitespace-nowrap"
            >
              <i className="ri-equalizer-line text-xs"></i>
              {c.filters_label}
            </button>
          </div>

          {/* School Type pills (desktop) - real links that filter the results */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <Link to={{ pathname: '/schools', search: buildSearch({ type: 'all' }) }} className={pillClass(type === 'all')}>
              {c.all_types_label}
            </Link>
            {typeOptions.map((t) => (
              <Link
                key={t.key}
                to={{ pathname: '/schools', search: buildSearch({ type: t.key }) }}
                className={pillClass(type === t.key)}
              >
                {t.label}{' '}
                <span className={type === t.key ? 'text-white/60' : 'text-primary/40'}>{t.count}</span>
              </Link>
            ))}
          </div>

          {/* Mobile filter panel */}
          {showMobileFilters && (
            <div className="md:hidden pb-1 space-y-3">
              <div>
                <p className="text-[11px] font-roboto font-semibold text-gray-400 uppercase tracking-wider mb-2">School type</p>
                <div className="flex flex-wrap gap-2">
                  <Link to={{ pathname: '/schools', search: buildSearch({ type: 'all' }) }} className={pillClass(type === 'all')}>
                    All
                  </Link>
                  {typeOptions.map((t) => (
                    <Link
                      key={t.key}
                      to={{ pathname: '/schools', search: buildSearch({ type: t.key }) }}
                      className={pillClass(type === t.key)}
                    >
                      {t.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={area}
                  onChange={(e) => setParams(new URLSearchParams(buildSearch({ area: e.target.value })), { replace: true })}
                  className="flex-1 h-10 px-3 text-sm font-roboto text-primary bg-white border border-primary/20 rounded-lg focus:outline-none cursor-pointer"
                  aria-label="Filter by area"
                >
                  <option value="all">{c.all_areas_label}</option>
                  {areaOptions.map((a) => (
                    <option key={a.name} value={a.name}>{a.name}</option>
                  ))}
                </select>
                <select
                  value={level}
                  onChange={(e) => setParams(new URLSearchParams(buildSearch({ level: e.target.value })), { replace: true })}
                  className="flex-1 h-10 px-3 text-sm font-roboto text-primary bg-white border border-primary/20 rounded-lg focus:outline-none cursor-pointer"
                  aria-label="Filter by level"
                >
                  <option value="all">{c.all_levels_label}</option>
                  {levelOptions.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <select
                  value={curriculum}
                  onChange={(e) => setParams(new URLSearchParams(buildSearch({ curriculum: e.target.value })), { replace: true })}
                  className="flex-1 h-10 px-3 text-sm font-roboto text-primary bg-white border border-primary/20 rounded-lg focus:outline-none cursor-pointer"
                  aria-label="Filter by curriculum"
                >
                  <option value="all">{c.all_curriculums_label}</option>
                  {curriculumOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Active filters */}
          {hasActiveFilter && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-roboto font-semibold text-gray-400 uppercase tracking-wider">{c.active_label}</span>
              {type !== 'all' && (
                <Link
                  to={{ pathname: '/schools', search: buildSearch({ type: 'all' }) }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-roboto font-medium hover:bg-primary/20 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {typeLabel(type)} <i className="ri-close-line"></i>
                </Link>
              )}
              {area !== 'all' && (
                <Link
                  to={{ pathname: '/schools', search: buildSearch({ area: 'all' }) }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-roboto font-medium hover:bg-primary/20 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {area} <i className="ri-close-line"></i>
                </Link>
              )}
              {level !== 'all' && (
                <Link
                  to={{ pathname: '/schools', search: buildSearch({ level: 'all' }) }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-roboto font-medium hover:bg-primary/20 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {level} <i className="ri-close-line"></i>
                </Link>
              )}
              {curriculum !== 'all' && (
                <Link
                  to={{ pathname: '/schools', search: buildSearch({ curriculum: 'all' }) }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-roboto font-medium hover:bg-primary/20 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {curriculum} <i className="ri-close-line"></i>
                </Link>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-roboto font-medium hover:bg-primary/20 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {searchQuery} <i className="ri-close-line"></i>
                </button>
              )}
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-roboto font-medium text-primary/70 hover:bg-gray-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line text-xs"></i>
                {c.reset_label}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="px-4 md:px-6 lg:px-10 pt-6 pb-2 max-w-[1400px] mx-auto w-full">
        <p className="text-xs font-roboto text-gray-500">
          Showing <span className="text-primary font-semibold">{filtered.length}</span> {c.schools_word}
          {type !== 'all' && ` in ${typeLabel(type)}`}
          {area !== 'all' && ` in ${area}`}
          {level !== 'all' && ` at ${level} level`}
          {curriculum !== 'all' && ` teaching ${curriculum}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 md:px-6 lg:px-10 pb-10 max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Schools List */}
          <div className="lg:w-[65%] xl:w-[70%]">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : error && !loading ? (
              <div className="text-center py-16 bg-gray-50 rounded-lg border border-primary/10">
                <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 bg-gray-100 rounded-full">
                  <i className="ri-error-warning-line text-gray-400 text-xl" />
                </div>
                <p className="text-sm font-roboto font-semibold text-primary mb-1">{c.error_title}</p>
                <p className="text-xs font-roboto text-gray-500 mb-3">{error}</p>
                <button onClick={refetch} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-md text-xs font-roboto font-semibold cursor-pointer">
                  <i className="ri-refresh-line"></i> {c.retry_button}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((school) => {
                  const dist = distanceFromCbd(school);
                  const category = school.subcategory || 'local';
                  const levels = splitTokens(getLevels(school));
                  const img = amenityImage(school) || null;
                  return (
                    <div
                      key={school.id}
                      className={`flex flex-col sm:flex-row bg-white border border-primary/12 rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] hover:border-primary/20 transition-all duration-200 ${CARD_HEIGHT}`}
                    >
                      <div className={CARD_IMAGE_FRAME}>
                        {img ? (
                          <img src={img} alt={school.name} className={CARD_IMAGE} />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/10 via-primary/[0.05] to-golden/10">
                            <span className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80">
                              <i className="ri-school-line text-primary/45 text-2xl"></i>
                            </span>
                            <span className="text-[10px] font-roboto font-semibold uppercase tracking-wider text-primary/45">
                              {c.photo_coming_label}
                            </span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <span className={`text-[10px] font-roboto font-semibold px-2 py-0.5 rounded text-white ${CATEGORY_BADGE_COLORS[category] || 'bg-[#6B4423]'}`}>
                            {prettyTypeLabel(school.subcategory || 'other')}
                          </span>
                        </div>
                      </div>

                      <div className={CARD_BODY}>
                        <div className="min-h-0 overflow-hidden">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <h3 className="font-roboto font-bold text-sm md:text-base text-primary leading-snug">{school.name}</h3>
                            <StarRating rating={school.rating} />
                          </div>
                          <p className="flex items-center gap-1.5 text-sm font-roboto text-gray-500 mb-2">
                            <span className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-map-pin-line text-primary text-sm"></i>
                            </span>
                            {school.neighbourhood_name || 'Nairobi'}, {c.address_suffix}
                            {dist != null && <span className="text-primary/50">· {formatDistance(dist)} {c.from_cbd_label}</span>}
                          </p>
                          <div className="flex items-center gap-3 mb-2 text-xs font-roboto text-primary/60 flex-wrap">
                            {getCurriculum(school) && (
                              <span className="flex items-center gap-1">
                                <i className="ri-book-open-line text-primary text-xs"></i>
                                {getCurriculum(school)}
                              </span>
                            )}
                            {school.attributes?.established != null && (
                              <span className="flex items-center gap-1">
                                <i className="ri-calendar-line text-primary text-xs"></i>
                                {c.established_prefix} {school.attributes.established}
                              </span>
                            )}
                            {school.attributes?.student_count != null && (
                              <span className="flex items-center gap-1">
                                <i className="ri-user-line text-primary text-xs"></i>
                                {school.attributes.student_count.toLocaleString()} {c.students_word}
                              </span>
                            )}
                          </div>
                          {getFeeRange(school) && (
                            <div className="flex items-center gap-2 mb-2 text-xs font-roboto text-gray-500">
                              <span className="flex items-center gap-1">
                                <i className="ri-money-dollar-circle-line text-primary text-xs"></i>
                                {getFeeRange(school)}
                              </span>
                            </div>
                          )}
                          {levels.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {levels.slice(0, 3).map((l) => (
                                <span key={l} className="px-2 py-0.5 bg-primary/10 text-primary/70 text-[10px] font-roboto font-medium rounded">
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                          {getFeatures(school).length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {getFeatures(school).slice(0, 3).map((f) => (
                                <span key={f} className="px-2 py-0.5 bg-gray-100 text-primary/60 text-[10px] font-roboto rounded">
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-3 pt-3 border-t-2 border-primary/12">
                          <Link
                            to={`/rent?area=${(school.neighbourhood_name || '').toLowerCase()}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white border-2 border-primary rounded-md text-[10px] font-roboto font-semibold hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <i className="ri-home-4-line text-[10px]"></i>
                            {c.properties_nearby}
                          </Link>
                          <Link
                            to={withReturnFrom(`/directory/place/${school.id}`, currentPath)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-primary/20 text-primary rounded-md text-[10px] font-roboto font-semibold hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {c.view_school}
                            <i className="ri-arrow-right-line text-[10px]"></i>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="text-center py-16">
                <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 bg-gray-100 rounded-full">
                  <i className="ri-school-line text-gray-400 text-xl"></i>
                </div>
                <h3 className="text-sm font-roboto font-semibold text-primary mb-1">{c.empty_title}</h3>
                <p className="text-xs font-roboto text-gray-500 mb-3">
                  {area !== 'all' || type !== 'all'
                    ? c.empty_text_filtered
                    : c.empty_text_default}
                </p>
                {hasActiveFilter && (
                  <button
                    onClick={clearAll}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-md text-xs font-roboto font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-refresh-line"></i> {c.clear_filters}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block lg:w-[35%] xl:w-[30%]">
            <div className="sticky top-[200px] space-y-4">
              <div className="bg-white border border-primary/12 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-roboto font-semibold text-primary">{c.by_neighbourhood_title}</h3>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <Link
                    to="/schools"
                    onClick={() => setSearchQuery('')}
                    className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-xs font-roboto cursor-pointer transition-colors ${area === 'all' ? 'bg-primary/5 text-primary font-semibold' : 'text-primary/60 hover:bg-gray-50'}`}
                  >
                    <span className="flex items-center gap-2">
                      <i className="ri-map-pin-2-line text-xs"></i>
                      {c.all_neighbourhoods_label}
                    </span>
                    <span className="text-gray-400">{amenities.length}</span>
                  </Link>
                  {areaOptions.map((a) => (
                    <Link
                      key={a.name}
                      to={{ pathname: '/schools', search: buildSearch({ area: a.name, type: 'all', level: 'all', curriculum: 'all' }) }}
                      onClick={() => setSearchQuery('')}
                      className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-xs font-roboto cursor-pointer transition-colors ${area === a.name ? 'bg-primary/5 text-primary font-semibold' : 'text-primary/60 hover:bg-gray-50'}`}
                    >
                      <span className="flex items-center gap-2">
                        <i className="ri-map-pin-2-line text-xs"></i>
                        {a.name}
                      </span>
                      <span className="text-gray-400">{a.count}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-primary/12 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-roboto font-semibold text-primary">{c.types_title}</h3>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {typeOptions.map((t) => (
                    <Link
                      key={t.key}
                      to={{ pathname: '/schools', search: buildSearch({ type: type === t.key ? 'all' : t.key }) }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-roboto cursor-pointer transition-colors ${type === t.key ? 'bg-primary/5 text-primary font-semibold' : 'text-primary/60 hover:bg-gray-50'}`}
                    >
                      <span>{t.label}</span>
                      <span className="text-gray-400">{t.count} {c.schools_count_word}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="bg-primary rounded-lg p-4 text-center">
                <h3 className="text-white font-roboto font-bold text-sm mb-2">{c.cta_title}</h3>
                <p className="text-white/70 font-roboto text-xs mb-3">{c.cta_text}</p>
                <Link to="/rent" className="inline-flex items-center gap-1 px-4 py-2 bg-golden text-white font-roboto text-xs font-semibold rounded-md hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap">
                  {c.cta_button}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}