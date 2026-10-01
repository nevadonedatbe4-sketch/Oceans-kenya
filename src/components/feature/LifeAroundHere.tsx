import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAmenities } from '@/hooks/useAmenities';
import { haversineDistance } from '@/lib/distance';
import type { Amenity, AmenityCategory } from '@/lib/amenities';
import { areaNameBelongsTo } from '@/lib/locationRegistry';

const NEARBY_RADIUS_METERS = 5000; // 5 km

interface LifeGroup {
  key: string;
  label: string;
  icon: string;
  tags: string;
  categories: AmenityCategory[];
}

// The ten everyday-life buckets from the "Life Around Here" spec, mapped to
// the directory taxonomy so counts stay live and never hard-coded.
const LIFE_GROUPS: LifeGroup[] = [
  { key: 'connected', label: 'Stay Connected', icon: 'ri-wifi-line', tags: 'Fibre · 4G · 5G · SIM · Wi-Fi', categories: ['connectivity'] },
  { key: 'money', label: 'Money', icon: 'ri-bank-line', tags: 'Banks · ATMs · Mobile Money · Forex · Insurance', categories: ['financial', 'insurance'] },
  { key: 'shop', label: 'Shop', icon: 'ri-shopping-bag-line', tags: 'Supermarkets · Malls · Clothing · Electronics · Home', categories: ['groceries', 'shopping', 'shopping_centres'] },
  { key: 'eat', label: 'Eat', icon: 'ri-restaurant-line', tags: 'Restaurants · Cafés · Bakeries · Takeaway', categories: ['dining'] },
  { key: 'healthy', label: 'Stay Healthy', icon: 'ri-heart-pulse-line', tags: 'Hospitals · Clinics · Pharmacies · Dental · Fitness', categories: ['health', 'fitness'] },
  { key: 'around', label: 'Get Around', icon: 'ri-bus-line', tags: 'Uber · Bolt · Matatu · Bus · Parking · Petrol', categories: ['transport'] },
  { key: 'families', label: 'Families', icon: 'ri-graduation-cap-line', tags: 'Schools · Daycare · Parks · Activities', categories: ['education'] },
  { key: 'pets', label: 'Pets', icon: 'ri-heart-3-line', tags: 'Vets · Grooming · Boarding · Dog Walking · Parks', categories: ['pets'] },
  { key: 'outdoors', label: 'Outdoors', icon: 'ri-leaf-line', tags: 'Parks · Nature Walks · Arboretums · Trails', categories: ['recreation'] },
  { key: 'services', label: 'Everyday Services', icon: 'ri-tools-line', tags: 'Laundry · Repairs · Printing · Courier · Hardware', categories: ['services'] },
];

interface LifeAroundHereProps {
  neighbourhoodId: string;
  neighbourhoodName: string;
  lat: number | null;
  lng: number | null;
}

export default function LifeAroundHere({ neighbourhoodId, neighbourhoodName, lat, lng }: LifeAroundHereProps) {
  const { amenities, loading } = useAmenities();

  const counts = useMemo(() => {
    const result: Record<string, { count: number; scope: 'here' | 'nearby' | 'citywide' }> = {};
    LIFE_GROUPS.forEach((group) => {
      const inGroup = amenities.filter((a) => group.categories.includes((a.category || 'services') as AmenityCategory));

      let local = 0;
      let nearby = 0;
      let citywide = 0;

      inGroup.forEach((a: Amenity) => {
        if (a.neighbourhood_id === neighbourhoodId || areaNameBelongsTo(a.neighbourhood_name, neighbourhoodName)) {
          local += 1;
          return;
        }
        if (a.latitude != null && a.longitude != null && lat != null && lng != null) {
          if (haversineDistance(lat, lng, a.latitude, a.longitude) <= NEARBY_RADIUS_METERS) {
            nearby += 1;
            return;
          }
          return; // has coordinates but too far - ignore for this snapshot
        }
        // No coordinates and not tied to this neighbourhood → city-wide availability.
        citywide += 1;
      });

      if (local + nearby > 0) {
        result[group.key] = { count: local + nearby, scope: local > 0 ? 'here' : 'nearby' };
      } else if (citywide > 0) {
        result[group.key] = { count: citywide, scope: 'citywide' };
      } else {
        result[group.key] = { count: 0, scope: 'citywide' };
      }
    });
    return result;
  }, [amenities, neighbourhoodId, neighbourhoodName, lat, lng]);

  return (
    <section className="mt-12 md:mt-16">
      <div className="mb-6">
        <p className="text-golden text-xs font-semibold uppercase tracking-[0.3em] mb-1">The Essentials</p>
        <h2 className="font-bold text-xl md:text-2xl text-primary">Life Around Here</h2>
        <p className="font-roboto text-stone-500 text-sm font-medium mt-1 max-w-xl">
          A snapshot of everyday living in {neighbourhoodName} - connectivity, money, shopping, dining,
          health, getting around and more.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {LIFE_GROUPS.map((group) => {
          const info = counts[group.key];
          const hasCount = !loading && info && info.count > 0;
          return (
            <Link
              key={group.key}
              to={`/directory/${group.categories[0]}`}
              aria-label={`Browse ${group.label} places around ${neighbourhoodName}`}
              title={`See all ${group.label.toLowerCase()} options in the directory`}
              className="group text-left bg-stone-50 rounded-lg border-2 border-primary/12 p-4 flex flex-col hover:border-primary/25 hover:bg-stone-100 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="w-9 h-9 flex items-center justify-center rounded-md bg-primary/10 text-primary mb-3">
                <i className={`${group.icon} text-lg`}></i>
              </div>
              <h3 className="font-semibold text-primary text-sm leading-tight">{group.label}</h3>
              <p className="text-sm font-medium text-stone-500 leading-snug mt-1.5 flex-1">{group.tags}</p>
              <div className="mt-3 pt-3 border-t border-primary/10 flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  {loading ? (
                    <span className="text-stone-500 text-sm font-medium">Loading…</span>
                  ) : hasCount ? (
                    <>
                      <span className="text-primary text-lg font-bold leading-none">{info.count}</span>
                      <span className="text-stone-500 text-sm font-medium">
                        {info.scope === 'here' ? 'here' : info.scope === 'nearby' ? 'nearby' : 'citywide'}
                      </span>
                    </>
                  ) : (
                    <span className="text-stone-500 text-sm font-medium">Being updated</span>
                  )}
                </div>
                <i className="ri-arrow-right-line text-primary/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all"></i>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}