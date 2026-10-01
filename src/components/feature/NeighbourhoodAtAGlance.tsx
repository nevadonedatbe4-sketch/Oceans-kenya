import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { countAmenitiesNearby, type Amenity, type AmenityCounts } from '@/lib/amenities';
import { smartTitleCase } from '@/lib/location';

interface AreaInfo {
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

interface NeighbourhoodAtAGlanceProps {
  neighbourhoodSlugs: string[];
  radiusMeters?: number;
  title?: string;
}

const COUNT_ROWS: { key: keyof Omit<AmenityCounts, 'total'>; label: string; icon: string }[] = [
  { key: 'schools', label: 'Schools', icon: 'ri-school-line' },
  { key: 'restaurants', label: 'Restaurants', icon: 'ri-restaurant-line' },
  { key: 'malls', label: 'Shopping malls', icon: 'ri-shopping-bag-line' },
  { key: 'hospitals', label: 'Hospitals', icon: 'ri-hospital-line' },
  { key: 'supermarkets', label: 'Supermarkets', icon: 'ri-store-2-line' },
  { key: 'gyms', label: 'Gyms', icon: 'ri-run-line' },
  { key: 'parks', label: 'Parks & green spaces', icon: 'ri-leaf-line' },
];

/**
 * Load EVERY published place, paging past the API's default 1000-row cap.
 * A single unbounded select would silently drop anything beyond the first
 * 1000 rows, so the "at a glance" counts would only reflect a slice of the
 * real directory.
 */
const PAGE_SIZE = 1000;
async function fetchAllPublishedAmenities(): Promise<Amenity[]> {
  const all: Amenity[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('amenities')
      .select('*')
      .eq('is_published', true)
      .order('name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data || []) as Amenity[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

export default function NeighbourhoodAtAGlance({
  neighbourhoodSlugs,
  radiusMeters = 3000,
  title = 'Amenities at a glance',
}: NeighbourhoodAtAGlanceProps) {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [areas, setAreas] = useState<AreaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!neighbourhoodSlugs.length) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [amenitiesData, areasRes] = await Promise.all([
        fetchAllPublishedAmenities(),
        supabase
          .from('neighbourhoods')
          .select('slug, name, latitude, longitude')
          .in('slug', neighbourhoodSlugs)
          .eq('is_published', true),
      ]);

      if (areasRes.error) throw areasRes.error;

      setAmenities(amenitiesData);

      const areaList: AreaInfo[] = (areasRes.data || [])
        .filter((a) => a.latitude != null && a.longitude != null)
        .map((a) => ({
          slug: a.slug,
          name: smartTitleCase(a.name),
          lat: a.latitude as number,
          lng: a.longitude as number,
        }))
        // Preserve the order requested by the article author
        .sort(
          (x, y) => neighbourhoodSlugs.indexOf(x.slug) - neighbourhoodSlugs.indexOf(y.slug)
        );

      setAreas(areaList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load amenities';
      setError(message);
      setAmenities([]);
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }, [neighbourhoodSlugs]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!neighbourhoodSlugs.length) return null;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-56 bg-stone-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || areas.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-5">
        <h3 className="font-roboto font-bold text-lg text-primary">{title}</h3>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-roboto text-primary/50">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
          Live data · within {Math.round(radiusMeters / 1000)} km
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas.map((area) => {
          const counts = countAmenitiesNearby(amenities, area.lat, area.lng, radiusMeters);
          return (
            <div
              key={area.slug}
              className="bg-white border border-primary/12 rounded-lg p-4 md:p-5 flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-roboto font-bold text-sm text-primary">{area.name}</h4>
                <Link
                  to={`/neighbourhood/${area.slug}`}
                  className="inline-flex items-center gap-1 text-[11px] font-roboto font-medium text-golden hover:text-golden/80 transition-colors whitespace-nowrap"
                >
                  Guide
                  <i className="ri-arrow-right-up-line text-xs"></i>
                </Link>
              </div>

              <div className="space-y-2 flex-1">
                {COUNT_ROWS.map((row) => {
                  const value = counts[row.key];
                  return (
                    <div key={row.key} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-xs font-roboto text-primary/60 min-w-0">
                        <span className="w-4 h-4 flex items-center justify-center shrink-0">
                          <i className={`${row.icon} text-primary text-sm`}></i>
                        </span>
                        <span className="truncate">{row.label}</span>
                      </span>
                      {value > 0 ? (
                        <span className="text-xs font-roboto font-semibold text-primary shrink-0">
                          {value}
                        </span>
                      ) : (
                        <span
                          className="text-xs font-roboto text-primary/35 shrink-0 select-none"
                          title="No verified listings recorded yet"
                          aria-label={`No verified listings recorded yet for ${row.label}`}
                        >
                          -
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <Link
                to={`/rent?area=${area.slug}`}
                className="mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-white border-2 border-primary rounded-md text-xs font-roboto font-medium hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
              >
                Explore {area.name} properties
                <i className="ri-arrow-right-line text-xs"></i>
              </Link>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] font-roboto text-primary/45 mt-4 leading-relaxed">
        Counts reflect verified listings only. - means no verified listings have been
        recorded in that category yet - not that none exist.
      </p>
    </div>
  );
}