import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAmenities } from '@/hooks/useAmenities';
import { haversineDistance, formatDistance } from '@/lib/distance';
import {
  AMENITY_CATEGORIES,
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
import { areaNameBelongsTo } from '@/lib/locationRegistry';

const PER_CATEGORY_INITIAL = 8;
const NEARBY_RADIUS_METERS = 5000; // 5 km

interface NeighbourhoodAmenitiesProps {
  neighbourhoodId: string;
  neighbourhoodName: string;
  lat: number | null;
  lng: number | null;
}

export default function NeighbourhoodAmenities({
  neighbourhoodId,
  neighbourhoodName,
  lat,
  lng,
}: NeighbourhoodAmenitiesProps) {
  // Fetch all published amenities once, then split into "in this neighbourhood"
  // vs "nearby" so we can offer real fallbacks instead of false zeroes.
  const { amenities: allAmenities, loading, error, refetch } = useAmenities();
  const [search, setSearch] = useState('');
  const [activeCategories, setActiveCategories] = useState<AmenityCategory[]>([]);
  const [showNearby, setShowNearby] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Amenity | null>(null);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});

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
      });
  }, []);

  // A Life Around Here tile asked to focus a set of categories - apply it and
  // clear any conflicting search / nearby view so results are predictable.
  const distanceMeters = (a: Amenity): number | null => {
    if (a.latitude == null || a.longitude == null || lat == null || lng == null) return null;
    return haversineDistance(lat, lng, a.latitude, a.longitude);
  };

  const distanceFor = (a: Amenity): string | null => {
    const d = distanceMeters(a);
    if (d == null || d < 50) return null;
    return formatDistance(d);
  };

  // Places that belong to this neighbourhood: FK-linked OR auto-inherited by
  // canonical area (tolerant of variant spellings like "Runda Estate").
  const local = useMemo(
    () =>
      allAmenities.filter(
        (a) =>
          a.neighbourhood_id === neighbourhoodId ||
          areaNameBelongsTo(a.neighbourhood_name, neighbourhoodName)
      ),
    [allAmenities, neighbourhoodId, neighbourhoodName],
  );

  // Verified places outside the boundary but within the configured radius (section 15: "Nearby").
  const nearby = useMemo(() => {
    return allAmenities
      .filter((a) => {
        if (a.neighbourhood_id === neighbourhoodId) return false;
        if (areaNameBelongsTo(a.neighbourhood_name, neighbourhoodName)) return false;
        const d = distanceMeters(a);
        return d != null && d <= NEARBY_RADIUS_METERS;
      })
      .sort((a, b) => (distanceMeters(a) || 0) - (distanceMeters(b) || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAmenities, neighbourhoodId, neighbourhoodName, lat, lng]);

  const filterFn = (a: Amenity): boolean => {
    if (activeCategories.length > 0 && !activeCategories.includes((a.category || 'services') as AmenityCategory)) return false;
    const q = search.trim().toLowerCase();
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

  const filteredLocal = useMemo(() => local.filter(filterFn), [local, search, activeCategories]);
  const filteredNearby = useMemo(() => nearby.filter(filterFn), [nearby, search, activeCategories]);

  const grouped = useMemo(() => {
    const map: Record<string, Amenity[]> = {};
    filteredLocal.forEach((a) => {
      const cat = a.category || 'services';
      if (!map[cat]) map[cat] = [];
      map[cat].push(a);
    });
    return map;
  }, [filteredLocal]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    local.forEach((a) => {
      const cat = a.category || 'services';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [local]);

  const relatedFor = (a: Amenity): Amenity[] => {
    return allAmenities
      .filter((x) => x.id !== a.id && x.category === a.category)
      .slice(0, 6);
  };

  const visibleCategories = AMENITY_CATEGORIES.filter((c) => grouped[c.key]?.length);
  const hasNearbyAvailable = filteredNearby.length > 0;

  return (
    <section className="mt-12 md:mt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-golden text-xs font-semibold uppercase tracking-[0.3em] mb-1">What&apos;s Nearby</p>
          <h2 className="font-bold text-xl md:text-2xl text-primary">Lifestyle & Amenities</h2>
          <p className="font-roboto text-stone-500 text-sm font-medium mt-1 max-w-xl">
            Schools, healthcare, fitness, transport, recreation, shops and dining around {neighbourhoodName}.
          </p>
        </div>
        {!loading && !error && (
          <p className="text-xs text-stone-400">
            {local.length} place{local.length === 1 ? '' : 's'} in this neighbourhood
            {nearby.length > 0 && <span className="text-primary/60"> &middot; {nearby.length} within 5 km</span>}
          </p>
        )}
      </div>

      {/* Search + category filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="relative max-w-md">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-base"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schools, hospitals, parks, vets..."
            className="w-full pl-10 pr-4 py-2.5 rounded-md border border-primary/20 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
          />
        </div>
        <div className="grid grid-rows-2 grid-flow-col auto-cols-max items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]">
          {AMENITY_CATEGORIES.map((c) => {
            const count = categoryCounts[c.key] || 0;
            const isActive = activeCategories.includes(c.key);
            return (
              <button
                key={c.key}
                onClick={() =>
                  setActiveCategories(isActive && activeCategories.length === 1 ? [] : [c.key])
                }
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'border-transparent'
                    : 'border-primary/25 text-primary hover:bg-primary/5'
                }`}
                style={
                  isActive
                    ? { backgroundColor: categoryColor(c.key, categoryColors), color: '#ffffff', borderColor: 'transparent' }
                    : undefined
                }
              >
                <i className={`${c.icon} text-[13px]`}></i>
                {c.label}
                {count > 0 && <span className="opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading / error states */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-stone-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-14 bg-stone-50 rounded-lg border border-primary/10">
          <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-stone-100 rounded-full">
            <i className="ri-error-warning-line text-stone-400 text-xl"></i>
          </div>
          <p className="font-semibold text-primary text-sm mb-1">Couldn&apos;t load the directory</p>
          <p className="text-xs text-stone-500 mb-3">{error}</p>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <i className="ri-refresh-line"></i> Try again
          </button>
        </div>
      ) : (
        <div className="space-y-10 md:space-y-12">
          {/* Grouped by category (in this neighbourhood) */}
          {visibleCategories.map((cat) => {
            const items = grouped[cat.key];
            const isExpanded = expanded[cat.key] || false;
            const visibleItems = isExpanded ? items : items.slice(0, PER_CATEGORY_INITIAL);
            return (
              <div key={cat.key}>
                <div className="flex items-center gap-2.5 mb-3">
                  <CategoryIcon icon={cat.icon} color={categoryColor(cat.key, categoryColors)} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-primary text-base leading-none">{cat.label}</h3>
                    <p className="text-sm font-medium text-stone-500 mt-0.5">{items.length} in this neighbourhood</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleItems.map((a) => (
                    <AmenityCard
                      key={a.id}
                      amenity={a}
                      categoryColor={categoryColor(a.category, categoryColors)}
                      distanceText={distanceFor(a)}
                      onViewDetails={() => setSelected(a)}
                    />
                  ))}
                </div>
                {items.length > PER_CATEGORY_INITIAL && (
                  <button
                    onClick={() => setExpanded((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-[#0D5959] transition-colors cursor-pointer"
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

          {/* Empty state - three-state, never a false zero (sections 17 & 22) */}
          {filteredLocal.length === 0 && !error && (
            <div className="text-center py-12 bg-stone-50 rounded-lg border border-primary/10">
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-stone-100 rounded-full">
                <i className="ri-map-pin-line text-stone-400 text-xl"></i>
              </div>
              {hasNearbyAvailable ? (
                <>
                  <p className="font-semibold text-primary text-sm mb-1">
                    No verified listings currently recorded in this category.
                  </p>
                  <p className="text-sm font-medium text-stone-500 mb-4 max-w-sm mx-auto">
                    There may still be places nearby - this category simply hasn&apos;t been populated yet.
                  </p>
                  <button
                    onClick={() => setShowNearby(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-route-line"></i> View nearby options
                  </button>
                </>
              ) : (
                <>
                  <p className="font-semibold text-primary text-sm mb-1">Data being updated</p>
                  <p className="text-sm font-medium text-stone-500 max-w-sm mx-auto">
                    We don&apos;t have enough verified information for this category around {neighbourhoodName} yet.
                    Check back soon.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Nearby section (section 16 - distance-based discovery) */}
          {showNearby && (
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 flex items-center justify-center rounded-md text-white shrink-0 bg-secondary-500">
                  <i className="ri-compass-3-line text-lg"></i>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary text-base leading-none">Nearby - within 5 km</h3>
                  <p className="text-xs text-stone-400 mt-0.5">Verified places just outside {neighbourhoodName}</p>
                </div>
              </div>
              {filteredNearby.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredNearby.map((a) => (
                    <AmenityCard
                      key={a.id}
                      amenity={a}
                      categoryColor={categoryColor(a.category, categoryColors)}
                      distanceText={distanceFor(a)}
                      onViewDetails={() => setSelected(a)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-stone-500">
                  No verified listings nearby either - data being updated for this area.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <AmenityDetailModal
          amenity={selected}
          categoryColor={categoryColor(selected.category, categoryColors)}
          distanceText={distanceFor(selected)}
          related={relatedFor(selected)}
          onSelectRelated={(a) => setSelected(a)}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}