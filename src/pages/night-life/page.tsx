import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbTrail from '@/components/feature/PageBreadcrumbTrail';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import AmenityCard from '@/components/feature/AmenityCard';
import AmenityDetailModal from '@/components/feature/AmenityDetailModal';
import { useAmenities } from '@/hooks/useAmenities';
import { useSeoMeta, buildBreadcrumbSchema } from '@/hooks/useSeoMeta';
import { supabase } from '@/lib/supabase';
import {
  SUBCATEGORIES,
  PRICE_TIERS,
  categoryColor,
  subcategoryLabel,
  subcategoryIcon,
  amenityImage,
  type Amenity,
} from '@/lib/amenities';
import NightLifeFilterBar, {
  type NightLifeAreaOption,
  type NightLifeSubcat,
} from '@/pages/night-life/components/NightLifeFilterBar';

const PER_PAGE = 12;
const NIGHT_CATEGORY = 'night_life';

export default function NightLifePage() {
  const { amenities, loading, error, refetch } = useAmenities();

  const [search, setSearch] = useState('');
  const [activeSub, setActiveSub] = useState<string>('all');
  const [area, setArea] = useState<string>('all');
  const [priceTier, setPriceTier] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [sort, setSort] = useState<string>('recommended');
  const [visibleCount, setVisibleCount] = useState(PER_PAGE);
  const [selected, setSelected] = useState<Amenity | null>(null);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});

  // CRM-managed category colour overrides (site_settings).
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

  const accent = categoryColor(NIGHT_CATEGORY, categoryColors);

  const nightItems = useMemo(
    () => amenities.filter((a) => (a.category || '') === NIGHT_CATEGORY),
    [amenities],
  );

  // Subcategory pills - only the types that actually have places, falling back
  // to the built-in Night Life taxonomy when the directory is still empty.
  const subcats = useMemo<NightLifeSubcat[]>(() => {
    const counts: Record<string, number> = {};
    nightItems.forEach((a) => {
      if (a.subcategory) counts[a.subcategory] = (counts[a.subcategory] || 0) + 1;
    });
    const builtins = SUBCATEGORIES[NIGHT_CATEGORY];
    const list: NightLifeSubcat[] = builtins.map((s) => ({
      key: s.key,
      label: s.label,
      icon: s.icon,
      count: counts[s.key] || 0,
    }));
    const known = new Set(builtins.map((s) => s.key));
    Object.keys(counts).forEach((key) => {
      if (known.has(key)) return;
      list.push({ key, label: subcategoryLabel(key) || key, icon: subcategoryIcon(key), count: counts[key] });
    });
    const withPlaces = list.filter((s) => s.count > 0);
    return withPlaces.length > 0 ? withPlaces : list;
  }, [nightItems]);

  const areas = useMemo<NightLifeAreaOption[]>(() => {
    const counts: Record<string, number> = {};
    nightItems.forEach((a) => {
      const name = a.neighbourhood_name || a.city;
      if (name) counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [nightItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return nightItems.filter((a) => {
      if (activeSub !== 'all' && (a.subcategory || '') !== activeSub) return false;
      if (area !== 'all' && (a.neighbourhood_name || '') !== area) return false;
      if (priceTier !== 'all' && (a.price_tier || '') !== priceTier) return false;
      if (minRating > 0) {
        const rate = a.rating ?? a.avg_rating ?? 0;
        if (rate < minRating) return false;
      }
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.address || '').toLowerCase().includes(q) ||
        (a.neighbourhood_name || '').toLowerCase().includes(q) ||
        (a.price_range || '').toLowerCase().includes(q) ||
        subcategoryLabel(a.subcategory).toLowerCase().includes(q)
      );
    });
  }, [nightItems, search, activeSub, area, priceTier, minRating]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === 'rating') {
      arr.sort((a, b) => (b.rating ?? b.avg_rating ?? 0) - (a.rating ?? a.avg_rating ?? 0));
    } else if (sort === 'name') {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return arr;
  }, [filtered, sort]);

  const hasActiveFilters =
    search.trim() !== '' || activeSub !== 'all' || area !== 'all' || priceTier !== 'all' || minRating > 0;

  // Reset the pagination window whenever the filtered result set changes.
  useEffect(() => {
    setVisibleCount(PER_PAGE);
  }, [search, activeSub, area, priceTier, minRating, sort]);

  const resetFilters = () => {
    setSearch('');
    setActiveSub('all');
    setArea('all');
    setPriceTier('all');
    setMinRating(0);
    setSort('recommended');
  };

  const stats = useMemo(() => {
    const clubs = nightItems.filter((a) => a.subcategory === 'night_club').length;
    const casinos = nightItems.filter((a) => a.subcategory === 'casino').length;
    const lounges = nightItems.filter((a) =>
      ['lounge', 'bar_lounge', 'bar', 'cocktail_bar', 'rooftop_bar', 'wine_bar', 'sports_bar', 'shisha_lounge', 'pub'].includes(
        a.subcategory || '',
      ),
    ).length;
    return { total: nightItems.length, areas: areas.length, clubs, casinos, lounges };
  }, [nightItems, areas]);

  const schemas = useMemo(() => {
    const breadcrumb = buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Directory', path: '/directory' },
      { name: 'Night Life', path: '/night-life' },
    ]);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const itemList = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Night Life in Nairobi',
      itemListElement: sorted.slice(0, 50).map((a, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'NightClub',
          name: a.name,
          url: `${origin}/directory/place/${a.slug || a.id}`,
          ...(amenityImage(a) ? { image: amenityImage(a) } : {}),
          address: {
            '@type': 'PostalAddress',
            streetAddress: a.address || a.neighbourhood_name || 'Nairobi',
            addressLocality: 'Nairobi',
            addressCountry: 'KE',
          },
        },
      })),
    };
    return [breadcrumb, itemList];
  }, [sorted]);

  useSeoMeta({
    title: 'Nairobi Night Life: Clubs, Bars & Casinos | Oceans Kenya',
    description:
      'Explore Nairobi night life - night clubs, rooftop bars, cocktail lounges, casinos, karaoke, quiz nights and late-night spots, filtered by area, price and rating.',
    path: '/night-life',
    schemas,
  });

  const visibleItems = sorted.slice(0, visibleCount);

  const relatedFor = (a: Amenity): Amenity[] =>
    nightItems.filter((x) => x.id !== a.id).slice(0, 6);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Hero */}
      <section className="relative h-[460px] md:h-[580px] overflow-hidden bg-[#160A0D]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#160A0D] via-[#2a1218] to-[#9B1B30]/70"></div>
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1.2px, transparent 0)', backgroundSize: '28px 28px' }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-[#160A0D]"></div>

        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div className="max-w-3xl w-full">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-jost font-semibold uppercase tracking-[0.16em] mb-4"
              style={{ backgroundColor: accent }}
            >
              <i className="ri-moon-clear-line text-sm"></i>
              After Dark
            </span>
            <h1 className="text-white font-prata font-bold text-4xl md:text-6xl mb-4">
              Night Life in Nairobi
            </h1>
            <p className="text-white/80 font-roboto text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              From thumping nightclubs and rooftop sundowners to cocktail lounges, casinos, karaoke and
              late-night eats - discover the city after dark and filter it your way.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
              <a
                href="#night-life-listings"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-white text-sm font-jost font-semibold uppercase tracking-[0.08em] transition-colors cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: accent }}
              >
                Browse the line-up
                <i className="ri-arrow-down-line"></i>
              </a>
              <Link
                to="/directory"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-white/40 text-white text-sm font-jost font-semibold uppercase tracking-[0.08em] hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-grid-line"></i>
                Full Directory
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-[#160A0D] border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: 'Night Spots', value: stats.total, icon: 'ri-map-pin-2-line' },
              { label: 'Areas Covered', value: stats.areas, icon: 'ri-map-2-line' },
              { label: 'Clubs & Lounges', value: stats.clubs + stats.lounges, icon: 'ri-disc-line' },
              { label: 'Casinos', value: stats.casinos, icon: 'ri-copper-coin-line' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/10 shrink-0">
                  <i className={`${s.icon} text-lg text-white`}></i>
                </span>
                <div>
                  <dd className="font-prata font-bold text-2xl md:text-3xl leading-none text-white">
                    {loading ? '-' : s.value}
                  </dd>
                  <dt className="font-jost text-white/55 text-[11px] uppercase tracking-[0.14em] mt-1">
                    {s.label}
                  </dt>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Filters + listings */}
      <main id="night-life-listings" className="flex-1 scroll-mt-24 bg-[#FBF6F4]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
          {/* Heading */}
          <div className="mb-6">
            <PageBreadcrumbTrail
              className="mb-2"
              items={[
                { label: 'Home', to: '/' },
                { label: 'Nairobi', to: '/neighbourhoods' },
                { label: 'Night Life' },
              ]}
            />
            <h2 className="font-prata font-bold text-[#160A0D] text-[26px] md:text-[34px]">
              Find your kind of night
            </h2>
            <p className="font-roboto text-sm text-[#6b6b6b] mt-1.5 max-w-2xl">
              Filter by vibe, area, price and rating to build the perfect night out across Nairobi.
            </p>
          </div>

          <NightLifeFilterBar
            search={search}
            onSearch={setSearch}
            subcats={subcats}
            activeSub={activeSub}
            onSub={setActiveSub}
            areas={areas}
            area={area}
            onArea={setArea}
            priceTier={priceTier}
            priceTierOptions={PRICE_TIERS}
            onPriceTier={setPriceTier}
            minRating={minRating}
            onMinRating={setMinRating}
            sort={sort}
            onSort={setSort}
            resultCount={filtered.length}
            totalCount={nightItems.length}
            onReset={resetFilters}
            hasActiveFilters={hasActiveFilters}
            accentColor={accent}
          />

          {/* Result summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-6 mb-5">
            <p className="text-xs font-roboto text-[#6b6b6b]">
              Showing <span className="text-[#9B1B30] font-semibold">{filtered.length}</span> night
              spot{filtered.length === 1 ? '' : 's'}
              {activeSub !== 'all' && ` · ${subcategoryLabel(activeSub)}`}
              {area !== 'all' && ` · ${area}`}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-jost font-semibold uppercase tracking-[0.08em] text-[#9B1B30] hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap"
              >
                <i className="ri-close-circle-line"></i>
                Clear all
              </button>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-36 bg-white rounded-lg border border-[#1a1a1a]/10 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-14 bg-white rounded-lg border border-[#1a1a1a]/10">
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-[#F3F0E9] rounded-full">
                <i className="ri-error-warning-line text-[#9B1B30] text-xl"></i>
              </div>
              <p className="font-semibold text-[#160A0D] text-sm mb-1">Unable to load night spots</p>
              <p className="text-xs text-[#6b6b6b] mb-3">{error}</p>
              <button
                onClick={refetch}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9B1B30] text-white rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line"></i> Try again
              </button>
            </div>
          ) : visibleItems.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleItems.map((a) => (
                  <AmenityCard
                    key={a.id}
                    amenity={a}
                    categoryColor={accent}
                    distanceText={null}
                    onViewDetails={() => setSelected(a)}
                  />
                ))}
              </div>
              {sorted.length > visibleCount && (
                <div className="text-center mt-8">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PER_PAGE)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-white text-xs font-jost font-semibold uppercase tracking-[0.08em] transition-colors cursor-pointer whitespace-nowrap"
                    style={{ backgroundColor: accent }}
                  >
                    Load more ({sorted.length - visibleCount} remaining)
                    <i className="ri-arrow-down-s-line"></i>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg border border-[#1a1a1a]/10">
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-[#F3F0E9] rounded-full">
                <i className="ri-moon-clear-line text-[#9B1B30] text-xl"></i>
              </div>
              <p className="font-semibold text-[#160A0D] text-sm mb-1">Nothing matches that yet</p>
              <p className="text-xs text-[#6b6b6b] max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'Try widening your filters - clear a couple and the night comes back to life.'
                  : 'Night Life venues are being added regularly. Check back soon for the full line-up.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 text-white rounded-md text-xs font-jost font-semibold uppercase tracking-[0.08em] transition-colors cursor-pointer whitespace-nowrap"
                  style={{ backgroundColor: accent }}
                >
                  <i className="ri-refresh-line"></i> Reset filters
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* CTA */}
      <section className="bg-[#160A0D] py-14 md:py-20 px-4 md:px-6 text-center">
        <h3 className="font-prata font-semibold text-white text-[27px] md:text-[33px] mb-3">
          Live where the night never ends
        </h3>
        <p className="font-roboto text-white/70 text-[15px] md:text-base max-w-xl mx-auto leading-relaxed mb-6">
          Homes in Westlands, Kilimani and the city centre put you minutes from the best bars, clubs and
          late-night kitchens.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/neighbourhoods"
            className="inline-flex items-center gap-2 px-6 py-3 text-white text-sm font-jost font-semibold uppercase tracking-[0.08em] transition-colors cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: accent }}
          >
            Explore Neighbourhoods
            <i className="ri-arrow-right-line"></i>
          </Link>
          <Link
            to="/rent"
            className="inline-flex items-center gap-2 px-6 py-3 border border-white/40 text-white text-sm font-jost font-semibold uppercase tracking-[0.08em] hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
          >
            Browse Rentals
            <i className="ri-arrow-right-line"></i>
          </Link>
        </div>
      </section>

      <PageContactSection />
      <Footer />
      <BackToTop />

      {selected && (
        <AmenityDetailModal
          amenity={selected}
          categoryColor={accent}
          distanceText={null}
          related={relatedFor(selected)}
          onSelectRelated={(a) => setSelected(a)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}