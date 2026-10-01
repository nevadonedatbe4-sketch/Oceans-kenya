import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { NAIROBI_MALLS, mallAreaGuideHref } from '@/lib/nairobiMalls';
import { useMallListings } from '@/hooks/useMallListings';
import { haversineDistance, formatDistance } from '@/lib/distance';
import MallMap, { type MallListingPin } from '@/pages/blog/components/MallMap';

/** Radius (metres) that counts as "nearby" a mall. */
const NEARBY_RADIUS_M = 5000;
/** Max nearby listings shown per mall / period. */
const MAX_NEARBY = 6;

function SectionHeading() {
  return (
    <div className="mb-6 md:mb-8">
      <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-1">
        Explore on the map
      </p>
      <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-2">
        Live Near Your Favourite Mall
      </h2>
      <p className="font-roboto text-stone-500 text-sm max-w-2xl leading-relaxed">
        Tap a mall to see where it sits in the city and the homes for sale and for rent within
        {' '}{NEARBY_RADIUS_M / 1000} km of its doors.
      </p>
    </div>
  );
}

export default function MallMapExplorer() {
  const { listings, loading, error } = useMallListings();
  const [selectedId, setSelectedId] = useState<string>(NAIROBI_MALLS[0].id);
  const [purpose, setPurpose] = useState<'sale' | 'rent'>('sale');

  const selectedMall = useMemo(
    () => NAIROBI_MALLS.find((m) => m.id === selectedId) || NAIROBI_MALLS[0],
    [selectedId],
  );

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  // Listings matched to every mall, with distance from the selected mall.
  const nearbyForSelected = useMemo(() => {
    const withDistance = listings.map((l) => ({
      ...l,
      distanceMeters: haversineDistance(selectedMall.lat, selectedMall.lng, l.lat, l.lng),
    }));
    return withDistance.filter(
      (l) => l.distanceMeters <= NEARBY_RADIUS_M && l.purpose === purpose,
    );
  }, [listings, selectedMall, purpose]);

  const nearbyCounts = useMemo(() => {
    const counts = { sale: 0, rent: 0 };
    listings.forEach((l) => {
      const d = haversineDistance(selectedMall.lat, selectedMall.lng, l.lat, l.lng);
      if (d <= NEARBY_RADIUS_M) counts[l.purpose] += 1;
    });
    return counts;
  }, [listings, selectedMall]);

  const nearbyShown = useMemo(
    () => [...nearbyForSelected].sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, MAX_NEARBY),
    [nearbyForSelected],
  );

  const listingPins: MallListingPin[] = useMemo(
    () =>
      [...nearbyForSelected]
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, 8)
        .map((l) => ({
          id: l.id,
          slug: l.slug,
          lat: l.lat,
          lng: l.lng,
          title: l.title,
          priceLabel: l.price,
        })),
    [nearbyForSelected],
  );

  return (
    <section className="mt-12 md:mt-16 pt-8 border-t border-primary/12">
      <SectionHeading />

      {/* ── Mall selector strip (imagery-led) ─────────────── */}
      <div className="mb-6 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto">
        <div className="flex gap-3 md:gap-4 min-w-max md:min-w-0 md:grid md:grid-cols-5">
          {NAIROBI_MALLS.map((mall) => {
            const active = mall.id === selectedId;
            return (
              <button
                key={mall.id}
                type="button"
                onClick={() => handleSelect(mall.id)}
                className={`group w-[180px] md:w-auto text-left rounded-lg overflow-hidden border-2 transition-colors cursor-pointer bg-white ${
                  active ? 'border-primary' : 'border-primary/12 hover:border-primary/40'
                }`}
              >
                <div className="relative w-full h-[110px] md:h-[120px] overflow-hidden bg-stone-100">
                  <img
                    src={mall.image}
                    alt={`${mall.name} - shopping mall in ${mall.area}, Nairobi`}
                    title={`${mall.name} Nairobi shopping mall`}
                    className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <span
                    className={`absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-roboto font-bold text-white ${
                      active ? 'bg-golden' : 'bg-primary'
                    }`}
                  >
                    {mall.rank}
                  </span>
                </div>
                <div className="p-3">
                  <p className="font-roboto font-bold text-primary text-xs md:text-[13px] leading-snug line-clamp-2">
                    {mall.name}
                  </p>
                  <p className="font-roboto text-stone-500 text-[10px] md:text-[11px] mt-1 truncate">
                    {mall.area}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Map + detail panel ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Map */}
        <div className="order-2 lg:order-1">
          <div className="w-full h-[420px] md:h-[560px] rounded-lg overflow-hidden border-2 border-primary/12">
            <MallMap
              malls={NAIROBI_MALLS}
              selectedId={selectedId}
              onSelect={handleSelect}
              listingPins={listingPins}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 px-1">
            <span className="flex items-center gap-2 text-xs font-roboto text-stone-500">
              <span className="w-4 h-4 flex items-center justify-center">
                <span className="w-3 h-3 rounded-full bg-primary border-2 border-white shadow-sm"></span>
              </span>
              Mall
            </span>
            <span className="flex items-center gap-2 text-xs font-roboto text-stone-500">
              <span className="w-4 h-4 flex items-center justify-center">
                <span className="w-3 h-3 rounded-full bg-golden border-2 border-white shadow-sm"></span>
              </span>
              Selected mall
            </span>
            <span className="flex items-center gap-2 text-xs font-roboto text-stone-500">
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-home-4-line text-primary text-sm"></i>
              </span>
              Nearby home
            </span>
            <span className="flex items-center gap-2 text-xs font-roboto text-stone-500">
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-zoom-in-line text-primary text-sm"></i>
              </span>
              Click a pin to open the listing
            </span>
          </div>
        </div>

        {/* Detail panel */}
        <aside className="order-1 lg:order-2 space-y-4">
          {/* Selected mall card */}
          <div className="rounded-lg overflow-hidden border-2 border-primary/12 bg-white">
            <div className="relative w-full aspect-[16/10] overflow-hidden bg-stone-100">
              <img
                src={selectedMall.image}
                alt={`${selectedMall.name} - shopping mall in ${selectedMall.area}, Nairobi`}
                title={`${selectedMall.name} Nairobi shopping mall`}
                className="w-full h-full object-cover object-center"
              />
              <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-golden text-white text-[11px] font-roboto font-bold">
                #{selectedMall.rank} on the list
              </span>
            </div>
            <div className="p-4 md:p-5">
              <h3 className="font-roboto font-bold text-primary text-base md:text-lg leading-snug">
                {selectedMall.name}
              </h3>
              <p className="flex items-center gap-1.5 text-stone-500 text-xs font-roboto mt-1">
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <i className="ri-map-pin-2-line"></i>
                </span>
                {selectedMall.area}
              </p>
              <p className="font-roboto text-stone-600 text-sm leading-relaxed mt-3">
                {selectedMall.blurb}
              </p>
              <ul className="mt-3 space-y-1.5">
                {selectedMall.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-xs font-roboto text-stone-600">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5 text-golden">
                      <i className="ri-check-line text-sm"></i>
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
              <Link
                to={mallAreaGuideHref(selectedMall)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-roboto font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
              >
                Explore the {selectedMall.area.split(' /')[0]} area guide
                <i className="ri-arrow-right-line"></i>
              </Link>
            </div>
          </div>

          {/* Nearby listings */}
          <div className="rounded-lg border-2 border-primary/12 bg-[#F7F9F9] p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="font-roboto font-bold text-primary text-sm">Nearby homes</h4>
              <div className="flex gap-1 bg-white rounded-full p-1 border border-primary/12">
                <button
                  type="button"
                  onClick={() => setPurpose('sale')}
                  className={`px-3 py-1 rounded-full text-[11px] font-roboto font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                    purpose === 'sale' ? 'bg-primary text-white' : 'text-stone-500 hover:text-primary'
                  }`}
                >
                  For sale ({nearbyCounts.sale})
                </button>
                <button
                  type="button"
                  onClick={() => setPurpose('rent')}
                  className={`px-3 py-1 rounded-full text-[11px] font-roboto font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                    purpose === 'rent' ? 'bg-primary text-white' : 'text-stone-500 hover:text-primary'
                  }`}
                >
                  For rent ({nearbyCounts.rent})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 bg-white rounded-lg p-2 animate-pulse">
                    <div className="w-[72px] h-[60px] rounded bg-stone-100 shrink-0"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-stone-100 rounded w-2/3"></div>
                      <div className="h-3 bg-stone-100 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="font-roboto text-stone-500 text-xs py-4">
                We couldn&apos;t load nearby listings right now. Please try again shortly.
              </p>
            ) : nearbyShown.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                  <i className="ri-home-4-line"></i>
                </div>
                <p className="font-roboto text-stone-500 text-xs mb-3">
                  No {purpose === 'sale' ? 'homes for sale' : 'rentals'} published within{' '}
                  {NEARBY_RADIUS_M / 1000} km yet.
                </p>
                <Link
                  to={purpose === 'sale' ? '/property-for-sale/nairobi' : '/rent'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-md text-xs font-roboto font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                  Browse Nairobi {purpose === 'sale' ? 'homes' : 'rentals'}
                  <i className="ri-arrow-right-line"></i>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {nearbyShown.map((l) => (
                  <Link
                    key={l.id}
                    to={`/property/${l.slug}`}
                    className="group flex gap-3 bg-white rounded-lg p-2 border border-primary/10 hover:border-primary/40 transition-colors cursor-pointer"
                  >
                    <div className="w-[76px] h-[64px] rounded overflow-hidden bg-stone-100 shrink-0">
                      {l.image ? (
                        <img
                          src={l.image}
                          alt={l.title}
                          title={`${l.title} near ${selectedMall.name}`}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-stone-300">
                          <i className="ri-image-line"></i>
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-roboto font-bold text-primary text-xs leading-snug line-clamp-2 group-hover:text-primary/80">
                        {l.title}
                      </p>
                      <p className="font-roboto text-stone-500 text-[11px] mt-0.5 truncate">
                        {l.area}
                        {l.beds > 0 ? ` · ${l.beds} bed` : ''}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="font-roboto font-bold text-golden text-xs">{l.price}</span>
                        <span className="font-roboto text-stone-400 text-[10px] whitespace-nowrap">
                          {formatDistance(l.distanceMeters)} away
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                <Link
                  to={purpose === 'sale' ? '/property-for-sale/nairobi' : '/rent'}
                  className="block text-center text-xs font-roboto font-semibold text-primary hover:text-primary/80 transition-colors pt-1 whitespace-nowrap"
                >
                  See all {purpose === 'sale' ? 'homes for sale' : 'rentals'} in Nairobi
                  <i className="ri-arrow-right-line ml-1"></i>
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}