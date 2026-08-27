import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import ContactAgentModal from '@/components/feature/ContactAgentModal';
import QuickViewModal from '@/components/feature/QuickViewModal';
import { supabase } from '@/lib/supabase';
import { useCurrency } from '@/hooks/useCurrency';
import { smartTitleCase } from '@/lib/location';
import PageLoader from '@/components/feature/PageLoader';

// ── Types ──────────────────────────────────────────────

interface ListingRow {
  id: string;
  title: string;
  location: string;
  address: string | null;
  neighbourhood: string | null;
  city: string | null;
  price: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  slug: string;
  main_image: string;
  images: string[] | null;
  purpose: string;
  currency: string;
  latitude: number | null;
  longitude: number | null;
}

interface CommuteProperty {
  id: string;
  slug: string;
  title: string;
  location: string;
  type: 'sale' | 'rent';
  category: string;
  beds: number;
  baths: number;
  parking: number;
  priceRaw: number;
  currency: string;
  priceUnit?: string;
  image: string;
  distanceKm: number | null;
  commuteTimeMin: number | null;
  commuteTimeText: string | null;
  commuteAvailable: boolean;
  _lat: number | null;
  _lng: number | null;
}

// ── Constants ──────────────────────────────────────────

interface Destination {
  name: string;
  lat: number;
  lng: number;
}

const DESTINATIONS: Destination[] = [
  { name: 'Nairobi CBD', lat: -1.286389, lng: 36.817223 },
  { name: 'Westlands Business District', lat: -1.2673, lng: 36.8023 },
  { name: 'Jomo Kenyatta International Airport', lat: -1.3191, lng: 36.9278 },
  { name: 'Karen Hub', lat: -1.3758, lng: 36.7066 },
  { name: 'Kilimani Mall', lat: -1.2921, lng: 36.7885 },
  { name: 'Lavington Curve', lat: -1.2809, lng: 36.7706 },
  { name: 'Gigiri (UN Complex)', lat: -1.2359, lng: 36.8100 },
  { name: 'Upper Hill', lat: -1.3009, lng: 36.8130 },
  { name: 'Eastleigh', lat: -1.2675, lng: 36.8499 },
  { name: 'Thika Road Mall', lat: -1.2189, lng: 36.8950 },
];

const TRANSPORT_MODES = ['Driving', 'Public transit', 'Walking', 'Cycling'] as const;

const TIME_RANGES: { label: string; minutes: number }[] = [
  { label: 'Under 15 min', minutes: 15 },
  { label: 'Under 30 min', minutes: 30 },
  { label: 'Under 45 min', minutes: 45 },
  { label: 'Under 1 hour', minutes: 60 },
  { label: 'Any', minutes: 999 },
];

const FALLBACK_IMAGE = 'https://readdy.ai/api/search-image?query=Modern%20luxury%20real%20estate%20property%20exterior%20with%20clean%20white%20walls%20and%20large%20windows%20in%20bright%20daylight%2C%20architectural%20photography%2C%20minimalist%20design%2C%20tropical%20landscaping%2C%20blue%20sky%20background&width=800&height=600&seq=ct-fallback-2026&orientation=landscape';

// ── Helpers ────────────────────────────────────────────

function toCategoryLabel(cat: string): string {
  return cat
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function buildSlug(id: string, title: string): string {
  if (!title) return id;
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function formatListingLocation(row: ListingRow): string {
  const address = (row.address || '').trim();
  const neighbourhood = (row.neighbourhood || '').trim();
  const location = (row.location || '').trim();
  const city = (row.city || '').trim();

  if (address) return smartTitleCase(address);
  if (neighbourhood) return smartTitleCase(neighbourhood);
  if (location && location.toLowerCase() !== 'nairobi') return smartTitleCase(location);
  if (city) return smartTitleCase(city);
  return smartTitleCase(location) || '—';
}

function mapListingToProperty(row: ListingRow): CommuteProperty {
  const purpose = String(row.purpose || 'sale');
  const mainImg = String(row.main_image || '');
  const images = row.images || [];
  const image = mainImg || (images.length > 0 ? images[0] : FALLBACK_IMAGE);

  return {
    id: row.id,
    slug: String(row.slug || buildSlug(row.id, row.title)),
    title: smartTitleCase(row.title || 'Untitled Property'),
    location: formatListingLocation(row),
    type: purpose === 'rent' ? 'rent' : 'sale',
    category: toCategoryLabel(String(row.property_type || 'house')),
    beds: Number(row.bedrooms ?? 0),
    baths: Number(row.bathrooms ?? 0),
    parking: Number(row.parking ?? 0),
    priceRaw: Number(row.price || 0),
    currency: String(row.currency || 'KES'),
    priceUnit: purpose === 'rent' ? 'pcm' : undefined,
    image,
    distanceKm: null,
    commuteTimeMin: null,
    commuteTimeText: null,
    commuteAvailable: false,
    _lat: row.latitude ?? null,
    _lng: row.longitude ?? null,
  };
}

// ── Component ──────────────────────────────────────────

export default function CommuteTime() {
  const { format } = useCurrency();

  // Search state
  const [selectedDest, setSelectedDest] = useState(0);
  const [transportMode, setTransportMode] = useState<string>('Driving');
  const [timeRangeIndex, setTimeRangeIndex] = useState(1); // "Under 30 min"

  // Data state
  const [allProperties, setAllProperties] = useState<CommuteProperty[]>([]);
  const [enrichedProperties, setEnrichedProperties] = useState<CommuteProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [commuteLoading, setCommuteLoading] = useState(false);
  const [error, setError] = useState('');
  const [commuteError, setCommuteError] = useState('');

  // Modals
  const [contactModalProp, setContactModalProp] = useState<CommuteProperty | null>(null);
  const [quickViewProperty, setQuickViewProperty] = useState<CommuteProperty | null>(null);

  const destination = DESTINATIONS[selectedDest];
  const maxMinutes = TIME_RANGES[timeRangeIndex].minutes;

  // ── Step 1: Fetch listings from DB ────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchListings() {
      setLoading(true);
      setError('');
      try {
        const { data, error: dbError } = await supabase
          .from('listings')
          .select('id,title,location,address,neighbourhood,city,price,property_type,bedrooms,bathrooms,parking,slug,main_image,images,purpose,currency,latitude,longitude')
          .eq('is_published', true)
          .neq('title', '')
          .gt('price', 0)
          .in('status', ['available', 'under_contract'])
          .order('created_at', { ascending: false })
          .limit(30);

        if (dbError) throw dbError;
        if (cancelled) return;

        const rows = (data || []) as ListingRow[];
        const mapped = rows.map(mapListingToProperty);
        setAllProperties(mapped);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load properties');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchListings();
    return () => { cancelled = true; };
  }, []);

  // ── Step 2: Call Edge Function for real distances ─────
  const fetchCommuteData = useCallback(async () => {
    if (allProperties.length === 0) return;
    setCommuteLoading(true);
    setCommuteError('');

    const listingsWithCoords = allProperties.filter(
      (p) => typeof p._lat === 'number' && typeof p._lng === 'number'
    ).map((p) => ({ id: p.id, lat: p._lat as number, lng: p._lng as number }));

    if (listingsWithCoords.length === 0) {
      // No coordinates available — keep distance as null
      setEnrichedProperties(allProperties.map((p) => ({ ...p, distanceKm: null, commuteTimeMin: null, commuteTimeText: null, commuteAvailable: false })));
      setCommuteLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/commute-search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destinationLat: destination.lat,
            destinationLng: destination.lng,
            transportMode,
            listings: listingsWithCoords,
          }),
        }
      );

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      const resultMap = new Map<string, { distanceKm: number; commuteTimeMin: number | null; commuteTimeText: string | null; commuteAvailable: boolean }>();
      (data.results || []).forEach((r: { id: string; distance_km: number; commute_time_min: number | null; commute_time_text: string | null; commute_available: boolean }) => {
        resultMap.set(r.id, {
          distanceKm: r.distance_km,
          commuteTimeMin: r.commute_time_min,
          commuteTimeText: r.commute_time_text,
          commuteAvailable: r.commute_available,
        });
      });

      setEnrichedProperties(
        allProperties.map((p) => {
          const commute = resultMap.get(p.id);
          if (commute) {
            return { ...p, ...commute };
          }
          return { ...p, distanceKm: null, commuteTimeMin: null, commuteTimeText: null, commuteAvailable: false };
        })
      );
    } catch (err: unknown) {
      setCommuteError(err instanceof Error ? err.message : 'Failed to calculate distances');
      // Fallback: keep existing properties with null commute data
      setEnrichedProperties(allProperties.map((p) => ({ ...p, distanceKm: null, commuteTimeMin: null, commuteTimeText: null, commuteAvailable: false })));
    } finally {
      setCommuteLoading(false);
    }
  }, [allProperties, destination.lat, destination.lng, transportMode]);

  useEffect(() => {
    fetchCommuteData();
  }, [fetchCommuteData]);

  // ── Filtering ─────────────────────────────────────────
  const filtered = useMemo(() => {
    return enrichedProperties.filter((p) => {
      // If no commute time available, include based on distance (under ~20km radius if "Any")
      if (!p.commuteAvailable && p.distanceKm === null) {
        return maxMinutes === 999; // only show in "Any" mode
      }
      if (p.commuteAvailable && p.commuteTimeMin !== null) {
        return p.commuteTimeMin <= maxMinutes;
      }
      // Straight-line distance fallback: rough estimate ~1 min per km at city speeds
      if (p.distanceKm !== null) {
        const estimatedMinutes = p.distanceKm * 2.5; // rough city traffic estimate
        return estimatedMinutes <= maxMinutes;
      }
      return false;
    });
  }, [enrichedProperties, maxMinutes]);

  const avgDistance = useMemo(() => {
    const withDistance = filtered.filter((p) => p.distanceKm !== null);
    if (withDistance.length === 0) return null;
    const sum = withDistance.reduce((acc, p) => acc + (p.distanceKm || 0), 0);
    return Math.round((sum / withDistance.length) * 10) / 10;
  }, [filtered]);

  const avgCommute = useMemo(() => {
    const withTime = filtered.filter((p) => p.commuteAvailable && p.commuteTimeMin !== null);
    if (withTime.length === 0) return null;
    const sum = withTime.reduce((acc, p) => acc + (p.commuteTimeMin || 0), 0);
    return Math.round(sum / withTime.length);
  }, [filtered]);

  const anyCommuteAvailable = useMemo(() => {
    return enrichedProperties.some((p) => p.commuteAvailable);
  }, [enrichedProperties]);

  // ── Map URL ───────────────────────────────────────────
  const mapUrl = useMemo(() => {
    return `https://www.google.com/maps?q=${destination.lat},${destination.lng}&z=13&output=embed`;
  }, [destination.lat, destination.lng]);

  // ── Render ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col pt-[120px]">
      <Header />

      {/* Hero / Search */}
      <div className="bg-background-100 border-b border-background-200">
        <div className="px-4 md:px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">
          <div className="max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground-950 mb-2">Commute Time Search</h1>
            <p className="text-sm font-body text-foreground-600 mb-6">
              Find properties near your workplace or daily destination. {anyCommuteAvailable ? 'Times are calculated using live traffic data.' : 'Distances are straight-line from listing coordinates.'}
            </p>
          </div>

          {/* Search bar */}
          <div className="flex flex-col md:flex-row items-stretch gap-3 max-w-4xl">
            {/* Destination */}
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center gap-2.5 px-4 h-12 bg-background-50 border border-background-300 rounded-lg focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-400/30">
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  <i className="ri-map-pin-line text-foreground-400 text-base"></i>
                </span>
                <select
                  value={selectedDest}
                  onChange={(e) => setSelectedDest(Number(e.target.value))}
                  className="flex-1 min-w-0 text-sm font-body font-medium text-foreground-900 bg-transparent focus:outline-none appearance-none cursor-pointer"
                >
                  {DESTINATIONS.map((d, i) => (
                    <option key={d.name} value={i}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transport mode */}
            <div className="relative min-w-[150px]">
              <div className="flex items-center gap-2.5 px-4 h-12 bg-background-50 border border-background-300 rounded-lg focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-400/30">
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  <i className="ri-bus-line text-foreground-400 text-base"></i>
                </span>
                <select
                  value={transportMode}
                  onChange={(e) => setTransportMode(e.target.value)}
                  className="flex-1 min-w-0 text-sm font-body font-medium text-foreground-900 bg-transparent focus:outline-none appearance-none cursor-pointer"
                >
                  {TRANSPORT_MODES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Time range */}
            <div className="relative min-w-[160px]">
              <div className="flex items-center gap-2.5 px-4 h-12 bg-background-50 border border-background-300 rounded-lg focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-400/30">
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  <i className="ri-time-line text-foreground-400 text-base"></i>
                </span>
                <select
                  value={timeRangeIndex}
                  onChange={(e) => setTimeRangeIndex(Number(e.target.value))}
                  className="flex-1 min-w-0 text-sm font-body font-medium text-foreground-900 bg-transparent focus:outline-none appearance-none cursor-pointer"
                >
                  {TIME_RANGES.map((t, i) => (
                    <option key={t.label} value={i}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-4 text-xs font-body text-foreground-500">
            <span>
              {(loading || commuteLoading) ? (
                <span className="inline-block w-16 h-3 bg-background-200 rounded animate-pulse align-middle"></span>
              ) : commuteError ? (
                <span className="text-accent-500">Could not calculate distances</span>
              ) : (
                <><span className="text-primary-500 font-semibold">{filtered.length}</span> properties within {TIME_RANGES[timeRangeIndex].label.toLowerCase()} of {destination.name}</>
              )}
            </span>
            {!loading && !commuteLoading && !commuteError && filtered.length > 0 && (
              <>
                {avgDistance !== null && (
                  <span>
                    Avg distance: <span className="text-primary-500 font-semibold">{avgDistance} km</span>
                  </span>
                )}
                {avgCommute !== null && (
                  <span>
                    Avg commute: <span className="text-primary-500 font-semibold">{avgCommute} min</span> ({transportMode.toLowerCase()})
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 md:px-6 lg:px-10 py-8 max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Results */}
          <div className="lg:w-[60%] xl:w-[65%]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-heading font-semibold text-foreground-950">
                {commuteLoading ? 'Calculating distances...' : `Results for ${destination.name}`}
              </h2>
            </div>

            {/* DB Error */}
            {error && (
              <div className="text-center py-16">
                <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 bg-background-100 rounded-full">
                  <i className="ri-error-warning-line text-foreground-400 text-xl"></i>
                </div>
                <p className="font-body font-semibold text-foreground-950 text-lg mb-2">Could not load properties</p>
                <p className="text-sm font-body text-foreground-500 mb-4">{error}</p>
                <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-5 py-2 bg-primary-500 text-background-50 text-xs font-label tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary-600 transition-colors">
                  <i className="ri-refresh-line"></i>Try Again
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && !error && (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex flex-col sm:flex-row bg-background-50 border border-background-200 rounded-lg overflow-hidden sm:h-[220px] animate-pulse">
                    <div className="sm:w-[260px] lg:w-[300px] h-[180px] sm:h-full bg-background-200 flex-shrink-0"></div>
                    <div className="flex-1 p-4 sm:p-5 space-y-3">
                      <div className="h-5 bg-background-200 rounded w-28"></div>
                      <div className="h-4 bg-background-200 rounded w-3/4"></div>
                      <div className="h-3 bg-background-200 rounded w-1/2"></div>
                      <div className="flex gap-3">
                        <div className="h-3 bg-background-200 rounded w-16"></div>
                        <div className="h-3 bg-background-200 rounded w-16"></div>
                        <div className="h-3 bg-background-200 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results */}
            {!loading && !error && (
              <div className="space-y-4">
                {commuteLoading && filtered.length === 0 && enrichedProperties.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4">
                      <PageLoader size={32} />
                    </div>
                    <p className="text-sm font-body text-foreground-500">Calculating distances to {destination.name}...</p>
                  </div>
                )}

                {filtered.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row bg-background-50 border border-background-200 rounded-lg overflow-hidden sm:h-[220px] hover:border-background-300 transition-colors duration-200 group"
                  >
                    {/* Image */}
                    <div className="relative sm:w-[260px] lg:w-[300px] h-[180px] sm:h-full flex-shrink-0 overflow-hidden">
                      <Link to={`/property/${p.slug}`} className="block w-full h-full">
                        <img
                          src={p.image}
                          alt={p.title}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                        />
                      </Link>

                      {/* Distance badge */}
                      {p.distanceKm !== null && (
                        <div className="absolute top-2 left-2">
                          <span className="bg-foreground-950/75 text-background-50 text-[10px] font-label font-semibold px-2 py-0.5 rounded whitespace-nowrap">
                            {p.commuteAvailable && p.commuteTimeMin !== null
                              ? `${p.commuteTimeMin} min`
                              : `${p.distanceKm} km`}
                          </span>
                        </div>
                      )}

                      {/* Quick view */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setQuickViewProperty(p);
                        }}
                        className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1 text-background-50 text-[10px] font-label font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-foreground-950/60 rounded-sm hover:bg-foreground-950/80 transition-colors">
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            <i className="ri-expand-diagonal-line text-xs"></i>
                          </span>
                          Preview
                        </span>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden">
                      <div>
                        <span className="font-heading font-bold text-lg md:text-xl text-foreground-950">
                          {format(p.priceRaw, p.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                        </span>
                        {p.priceUnit && <span className="text-sm text-foreground-500 font-body ml-1">{p.priceUnit}</span>}

                        <Link to={`/property/${p.slug}`} className="block hover:underline mt-1">
                          <h3 className="font-heading font-bold text-sm md:text-base text-foreground-950 leading-snug mb-1">{p.title}</h3>
                        </Link>

                        <p className="flex items-center gap-1.5 text-sm font-body text-foreground-500 mb-2">
                          <span className="w-4 h-4 flex items-center justify-center shrink-0">
                            <i className="ri-map-pin-line text-primary-500 text-sm"></i>
                          </span>
                          {p.location}
                        </p>

                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-body text-foreground-600">{p.category}</span>
                          {p.beds > 0 && (
                            <span className="flex items-center gap-1 text-xs font-body text-foreground-600">
                              <span className="w-3.5 h-3.5 flex items-center justify-center">
                                <i className="ri-hotel-bed-line text-primary-500 text-sm"></i>
                              </span>
                              {p.beds}
                            </span>
                          )}
                          {p.baths > 0 && (
                            <span className="flex items-center gap-1 text-xs font-body text-foreground-600">
                              <span className="w-3.5 h-3.5 flex items-center justify-center">
                                <i className="ri-showers-line text-primary-500 text-sm"></i>
                              </span>
                              {p.baths}
                            </span>
                          )}
                          {p.parking > 0 && (
                            <span className="flex items-center gap-1 text-xs font-body text-foreground-600">
                              <span className="w-3.5 h-3.5 flex items-center justify-center">
                                <i className="ri-car-line text-primary-500 text-sm"></i>
                              </span>
                              {p.parking}
                            </span>
                          )}
                        </div>

                        {/* Commute detail */}
                        <div className="flex items-center gap-2 text-xs font-body">
                          <span className="w-4 h-4 flex items-center justify-center shrink-0">
                            <i className="ri-route-line text-primary-500 text-sm"></i>
                          </span>
                          {p.distanceKm !== null ? (
                            <span className="text-foreground-500">
                              {p.distanceKm} km to {destination.name}
                              {p.commuteAvailable && p.commuteTimeMin !== null && (
                                <span className="text-foreground-700 font-medium"> &middot; {p.commuteTimeMin} min {transportMode.toLowerCase()}</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-foreground-400">Distance unavailable</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-3 pt-3 border-t border-background-200 mt-2">
                        <span className="text-xs font-body text-foreground-400">{p.type === 'rent' ? 'To rent' : 'For sale'}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <a href="tel:+254703712984" className="flex items-center gap-1.5 text-sm font-body text-foreground-600 hover:text-primary-500 transition-colors cursor-pointer whitespace-nowrap">
                            <span className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-phone-line text-sm"></i>
                            </span>
                            <span className="underline underline-offset-2">Call</span>
                          </a>
                          <button onClick={() => setContactModalProp(p)} className="flex items-center gap-1.5 text-sm font-body text-foreground-600 hover:text-primary-500 transition-colors cursor-pointer whitespace-nowrap">
                            <span className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-mail-line text-sm"></i>
                            </span>
                            <span className="underline underline-offset-2">Email</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Empty state */}
                {!commuteLoading && filtered.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 bg-background-100 rounded-full">
                      <i className="ri-route-line text-foreground-400 text-xl"></i>
                    </div>
                    <p className="font-heading font-bold text-foreground-950 text-lg mb-2">No properties found</p>
                    <p className="text-sm font-body text-foreground-500">Try extending your time range or choosing a different destination</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block lg:w-[40%] xl:w-[35%]">
            <div className="sticky top-[140px] space-y-4">
              {/* Dynamic Map */}
              <div className="bg-background-50 border border-background-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-background-200">
                  <h3 className="text-sm font-heading font-semibold text-foreground-950">
                    Map &mdash; {destination.name}
                  </h3>
                </div>
                <div className="h-[300px]">
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Commute map — ${destination.name}`}
                  ></iframe>
                </div>
                {!anyCommuteAvailable && (
                  <div className="px-4 py-2 bg-background-100 border-t border-background-200">
                    <p className="text-[11px] font-body text-foreground-500">
                      Straight-line distances shown. Add a Google Maps API key for real driving times.
                    </p>
                  </div>
                )}
              </div>

              {/* Popular destinations */}
              <div className="bg-background-50 border border-background-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-background-200">
                  <h3 className="text-sm font-heading font-semibold text-foreground-950">Popular Destinations</h3>
                </div>
                <div className="px-4 py-3 space-y-1">
                  {DESTINATIONS.slice(0, 6).map((d, i) => (
                    <button
                      key={d.name}
                      onClick={() => setSelectedDest(i)}
                      className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-xs font-body cursor-pointer transition-colors ${
                        selectedDest === i
                          ? 'bg-primary-100/70 text-primary-700 font-semibold'
                          : 'text-foreground-600 hover:bg-background-100'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 flex items-center justify-center">
                          <i className="ri-map-pin-2-line text-xs"></i>
                        </span>
                        {d.name}
                      </span>
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-arrow-right-s-line text-xs"></i>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-background-100 rounded-lg p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground-950 mb-2">Commute Tips</h3>
                <ul className="space-y-2 text-xs font-body text-foreground-600">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                      <i className="ri-time-line text-primary-500 text-xs"></i>
                    </span>
                    Morning peak hours in Nairobi are 7:00 &mdash; 9:00 AM
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                      <i className="ri-road-map-line text-primary-500 text-xs"></i>
                    </span>
                    Mombasa Road and Thika Road experience the heaviest traffic
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                      <i className="ri-bus-line text-primary-500 text-xs"></i>
                    </span>
                    Matatus are the fastest public transport option on most routes
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PageContactSection />
      <Footer />
      <BackToTop />

      {contactModalProp && (
        <ContactAgentModal
          isOpen={true}
          onClose={() => setContactModalProp(null)}
          propertyTitle={contactModalProp.title}
          propertyId={contactModalProp.id}
          propertySlug={contactModalProp.slug}
          propertyPrice={format(contactModalProp.priceRaw, contactModalProp.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
          propertyLocation={contactModalProp.location}
        />
      )}

      <QuickViewModal
        isOpen={quickViewProperty !== null}
        onClose={() => setQuickViewProperty(null)}
        property={quickViewProperty ? {
          id: quickViewProperty.id,
          slug: quickViewProperty.slug,
          title: quickViewProperty.title,
          price: format(quickViewProperty.priceRaw, quickViewProperty.currency as 'KES' | 'USD' | 'GBP' | 'EUR'),
          rawPrice: quickViewProperty.priceRaw,
          currency: quickViewProperty.currency,
          priceUnit: quickViewProperty.priceUnit,
          location: quickViewProperty.location,
          category: quickViewProperty.category,
          beds: quickViewProperty.beds,
          baths: quickViewProperty.baths,
          parking: quickViewProperty.parking,
          receptions: 1,
          description: '',
          images: [quickViewProperty.image],
          type: quickViewProperty.type,
        } : null}
      />
    </div>
  );
}