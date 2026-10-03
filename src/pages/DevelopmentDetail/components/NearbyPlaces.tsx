import { useMemo } from 'react';
import { useAmenities } from '@/hooks/useAmenities';
import { haversineDistance, formatDistance } from '@/lib/distance';
import { categoryLabel } from '@/lib/amenities';
import type { Amenity } from '@/lib/amenities';

const NEARBY_RADIUS_METERS = 5000; // 5 km

interface NearbyPlacesProps {
  lat: number;
  lng: number;
  name: string;
  /** Free-text "nearby" note captured on the project, if any. */
  proximityNote?: string;
}

interface Group {
  key: string;
  label: string;
  icon: string;
  categories: string[];
}

const GROUPS: Group[] = [
  { key: 'transport', label: 'Transport', icon: 'ri-bus-line', categories: ['transport'] },
  { key: 'schools', label: 'Schools', icon: 'ri-graduation-cap-line', categories: ['education'] },
  { key: 'shopping', label: 'Shopping', icon: 'ri-shopping-bag-line', categories: ['groceries', 'shopping', 'shopping_centres'] },
  { key: 'health', label: 'Healthcare', icon: 'ri-heart-pulse-line', categories: ['health'] },
];

function distanceTo(a: Amenity, lat: number, lng: number): number | null {
  if (a.latitude == null || a.longitude == null) return null;
  return haversineDistance(lat, lng, a.latitude, a.longitude);
}

/**
 * NearbyPlaces - real, distance-verified places around a development.
 *
 * Uses the same published directory data as the neighbourhood guides, filtered
 * to transport, schools, shopping and healthcare within 5 km of the project.
 * When there is no reliable nearby data the whole block renders nothing rather
 * than inventing "nearby" claims.
 */
export default function NearbyPlaces({ lat, lng, name, proximityNote }: NearbyPlacesProps) {
  const { amenities, loading } = useAmenities();
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);

  const grouped = useMemo(() => {
    if (!hasCoords) return [] as { group: Group; items: Amenity[] }[];
    return GROUPS.map((group) => {
      const items = amenities
        .filter((a) => group.categories.includes((a.category || 'services')))
        .map((a) => ({ a, d: distanceTo(a, lat, lng) }))
        .filter((x): x is { a: Amenity; d: number } => x.d !== null && x.d <= NEARBY_RADIUS_METERS)
        .sort((x, y) => x.d - y.d)
        .slice(0, 5)
        .map((x) => x.a);
      return { group, items };
    }).filter((g) => g.items.length > 0);
  }, [amenities, hasCoords, lat, lng]);

  const note = (proximityNote || '').trim();

  // Nothing reliable to show and no note → render nothing at all.
  if (!note && (loading || grouped.length === 0)) return null;

  return (
    <div className="mt-5 pt-5 border-t border-[#f0f0f0]">
      <h3 className="text-base font-bold text-primary mb-1">Getting around &amp; nearby</h3>
      <p className="text-sm font-roboto text-[#6b7280] mb-4">
        Real, distance-verified places close to {name}.
      </p>

      {note && (
        <p className="text-sm font-roboto text-primary/80 leading-relaxed mb-4 whitespace-pre-line">{note}</p>
      )}

      {grouped.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {grouped.map(({ group, items }) => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 flex items-center justify-center text-[#c9a84c]">
                  <i className={`${group.icon} text-base`}></i>
                </span>
                <h4 className="text-sm font-bold uppercase tracking-wider text-primary">{group.label}</h4>
              </div>
              <ul className="space-y-1.5">
                {items.map((a) => {
                  const d = distanceTo(a, lat, lng);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm font-roboto text-primary/80 min-w-0 truncate">
                        {a.name}
                        <span className="text-[#9aa0a6]"> · {categoryLabel(a.category)}</span>
                      </span>
                      {d != null && (
                        <span className="text-xs font-roboto font-semibold text-[#0d5959] whitespace-nowrap shrink-0">
                          {formatDistance(d)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}