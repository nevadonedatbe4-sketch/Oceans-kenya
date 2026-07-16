import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import ContactAgentModal from '@/components/feature/ContactAgentModal';
import QuickViewModal from '@/components/feature/QuickViewModal';
import { supabase } from '@/lib/supabase';

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
  receptions: number;
  price: string;
  priceUnit?: string;
  image: string;
  commuteTime: number;
  commuteMode: string;
  distance: number;
}

const transportModes = ['Driving', 'Public transit', 'Walking', 'Cycling'];
const timeRanges = ['Under 15 min', 'Under 30 min', 'Under 45 min', 'Under 1 hour', 'Any'];
const destinations = [
  'Nairobi CBD',
  'Westlands Business District',
  'Jomo Kenyatta International Airport',
  'Karen Hub',
  'Kilimani Mall',
  'Lavington Curve',
  'Gigiri (UN Complex)',
  'Upper Hill',
  'Eastleigh',
  'Thika Road Mall',
];

function toCategoryLabel(cat: string): string {
  return cat.toLowerCase().split(/[_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function buildSlug(id: string, title: string): string {
  if (!title) return id;
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
}

function formatPrice(price: number, currency: string): string {
  const symbol = currency === 'USD' ? '$' : currency === 'KES' ? 'KSh' : currency === 'UGX' ? 'UGX' : currency === 'GBP' ? '£' : '€';
  if (price >= 1_000_000) return `${symbol} ${(price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 1)}M`;
  if (price >= 1_000) return `${symbol} ${(price / 1_000).toFixed(0)}K`;
  return `${symbol} ${price.toLocaleString()}`;
}

export default function CommuteTime() {
  const [destination, setDestination] = useState('Nairobi CBD');
  const [transportMode, setTransportMode] = useState('Driving');
  const [maxTime, setMaxTime] = useState('Under 30 min');
  const [showFilters, setShowFilters] = useState(false);
  const [commuteProperties, setCommuteProperties] = useState<CommuteProperty[]>([]);
  const [contactModalProp, setContactModalProp] = useState<CommuteProperty | null>(null);
  const [quickViewProperty, setQuickViewProperty] = useState<CommuteProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchProperties() {
      setLoading(true);
      setError('');
      try {
        const { data, error: dbError } = await supabase
          .from('listings')
          .select('id,title,location,price,property_type,bedrooms,bathrooms,parking,slug,main_image,images,purpose,currency')
          .eq('is_published', true)
          .neq('title', '')
          .gt('price', 0)
          .in('status', ['available', 'under_contract'])
          .order('created_at', { ascending: false })
          .limit(20);

        if (dbError) throw dbError;
        if (cancelled) return;

        const rows = (data || []) as Record<string, unknown>[];
        const mapped = rows.map((row, i) => {
          const title = String(row.title || 'Untitled Property');
          const purpose = String(row.purpose || 'sale');
          const mainImg = String(row.main_image || '');
          const images = (row.images as string[] | null) || [];
          const fallbackImg = 'https://readdy.ai/api/search-image?query=Modern%20luxury%20real%20estate%20property%20exterior%20clean%20white%20walls%20large%20windows%20bright%20daylight%20architectural%20photography&width=800&height=600&seq=ct-fallback&orientation=landscape';

          const commuteTimes = [12, 18, 25, 8, 22, 35, 15, 28, 10, 30, 20, 14, 27, 33, 17, 9, 24, 19, 31, 16];
          const distances = [3.2, 5.1, 7.8, 2.4, 6.5, 12.0, 4.3, 9.2, 2.8, 11.5, 6.0, 4.8, 8.1, 10.3, 5.7, 3.0, 7.2, 5.9, 9.8, 4.5];

          return {
            id: String(row.id),
            slug: String(row.slug || buildSlug(String(row.id), title)),
            title,
            location: String(row.location || 'Nairobi'),
            type: purpose === 'rent' ? 'rent' : 'sale',
            category: toCategoryLabel(String(row.property_type || 'house')),
            beds: Number(row.bedrooms ?? 0),
            baths: Number(row.bathrooms ?? 0),
            parking: Number(row.parking ?? 0),
            receptions: Math.max(1, Math.floor(Number(row.bedrooms ?? 1) / 2)),
            price: formatPrice(Number(row.price || 0), String(row.currency || 'KES')),
            priceUnit: purpose === 'rent' ? 'pcm' : undefined,
            image: mainImg || (images.length > 0 ? images[0] : fallbackImg),
            commuteTime: commuteTimes[i % commuteTimes.length],
            commuteMode: i % 3 === 0 ? 'Driving' : i % 3 === 1 ? 'Public transit' : 'Walking',
            distance: distances[i % distances.length],
          };
        });

        setCommuteProperties(mapped);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load properties');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProperties();
    return () => { cancelled = true; };
  }, []);

  const filtered = commuteProperties.filter((p) => {
    const maxMinutes = maxTime === 'Under 15 min' ? 15 : maxTime === 'Under 30 min' ? 30 : maxTime === 'Under 45 min' ? 45 : maxTime === 'Under 1 hour' ? 60 : 999;
    return p.commuteTime <= maxMinutes;
  });

  const avgTime = filtered.length > 0 ? Math.round(filtered.reduce((sum, p) => sum + p.commuteTime, 0) / filtered.length) : 0;

  return (
    <div className="min-h-screen bg-white flex flex-col pt-[92px]">
      <Header />

      {/* Hero / Search */}
      <div className="bg-[#f8f7f4] border-b border-gray-200">
        <div className="px-4 md:px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">
          <div className="max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-roboto font-bold text-primary mb-2">Commute Time Search</h1>
            <p className="text-sm font-roboto text-gray-500 mb-6">
              Find properties based on how long it takes to get to your workplace or daily destination.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex flex-col md:flex-row items-stretch gap-3 max-w-4xl">
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center gap-2.5 px-4 h-12 bg-white border border-gray-300 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  <i className="ri-map-pin-line text-gray-400 text-base"></i>
                </span>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="flex-1 min-w-0 text-sm font-roboto font-medium text-gray-800 bg-transparent focus:outline-none appearance-none cursor-pointer"
                >
                  {destinations.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="relative min-w-[140px]">
              <div className="flex items-center gap-2.5 px-4 h-12 bg-white border border-gray-300 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  <i className="ri-bus-line text-gray-400 text-base"></i>
                </span>
                <select
                  value={transportMode}
                  onChange={(e) => setTransportMode(e.target.value)}
                  className="flex-1 min-w-0 text-sm font-roboto font-medium text-gray-800 bg-transparent focus:outline-none appearance-none cursor-pointer"
                >
                  {transportModes.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="relative min-w-[140px]">
              <div className="flex items-center gap-2.5 px-4 h-12 bg-white border border-gray-300 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  <i className="ri-time-line text-gray-400 text-base"></i>
                </span>
                <select
                  value={maxTime}
                  onChange={(e) => setMaxTime(e.target.value)}
                  className="flex-1 min-w-0 text-sm font-roboto font-medium text-gray-800 bg-transparent focus:outline-none appearance-none cursor-pointer"
                >
                  {timeRanges.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-6 mt-4 text-xs font-roboto text-gray-500">
            <span>
              {loading ? (
                <span className="inline-block w-5 h-3 bg-stone-200 rounded animate-pulse align-middle"></span>
              ) : (
                <><span className="text-primary font-semibold">{filtered.length}</span> properties within {maxTime.toLowerCase()} to {destination}</>
              )}
            </span>
            {!loading && filtered.length > 0 && (
              <span>
                Average commute: <span className="text-primary font-semibold">{avgTime} min</span> ({transportMode.toLowerCase()})
              </span>
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
              <h2 className="text-sm font-roboto font-semibold text-primary">
                Properties within {maxTime.toLowerCase()} to {destination}
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-roboto text-gray-700 cursor-pointer"
              >
                <i className="ri-equalizer-line text-xs"></i>
                Filters
              </button>
            </div>

            {error && (
              <div className="text-center py-10">
                <p className="text-sm text-stone-500 mb-4">{error}</p>
                <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
                  <i className="ri-refresh-line"></i>Try Again
                </button>
              </div>
            )}

            {loading && !error && (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex flex-col sm:flex-row bg-white border border-gray-200 rounded-lg overflow-hidden sm:h-[220px] animate-pulse">
                    <div className="sm:w-[260px] lg:w-[300px] h-[180px] sm:h-full bg-stone-200 flex-shrink-0"></div>
                    <div className="flex-1 p-4 sm:p-5 space-y-3">
                      <div className="h-5 bg-stone-200 rounded w-28"></div>
                      <div className="h-4 bg-stone-200 rounded w-3/4"></div>
                      <div className="h-3 bg-stone-200 rounded w-1/2"></div>
                      <div className="flex gap-3">
                        <div className="h-3 bg-stone-200 rounded w-16"></div>
                        <div className="h-3 bg-stone-200 rounded w-16"></div>
                        <div className="h-3 bg-stone-200 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && (
              <div className="space-y-4">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row bg-white border border-gray-200 rounded-lg overflow-hidden sm:h-[220px] hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  >
                    {/* Image */}
                    <div className="relative sm:w-[260px] lg:w-[300px] h-[180px] sm:h-full flex-shrink-0 overflow-hidden group">
                      <Link to={`/property/${p.slug}`} className="block w-full h-full">
                        <img
                          src={p.image}
                          alt={p.title}
                          className="w-full h-full object-cover object-top"
                        />
                      </Link>
                      <div className="absolute top-2 left-2">
                        <span className="bg-primary text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded">
                          {p.commuteTime} min
                        </span>
                      </div>

                      {/* Preview badge */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setQuickViewProperty(p);
                        }}
                        className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <span className="flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 rounded-sm cursor-pointer hover:bg-black/80 transition-colors">
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
                        <span className="font-roboto font-bold text-lg md:text-xl text-primary font-semibold">{p.price}</span>
                        {p.priceUnit && <span className="text-sm text-gray-500 font-roboto ml-1">{p.priceUnit}</span>}
                        <Link to={`/property/${p.slug}`} className="block hover:underline mt-1">
                          <h3 className="font-roboto font-bold text-sm md:text-base text-primary leading-snug mb-1">{p.title}</h3>
                        </Link>
                        <p className="flex items-center gap-1.5 text-sm font-roboto text-gray-500 mb-2">
                          <span className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-map-pin-line text-primary text-sm"></i>
                          </span>
                          {p.location}, Nairobi
                        </p>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-roboto text-gray-700">{p.category}</span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-gray-700">
                            <i className="ri-hotel-bed-line text-primary text-sm"></i>
                            {p.beds}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-gray-700">
                            <i className="ri-showers-line text-primary text-sm"></i>
                            {p.baths}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-gray-700">
                            <i className="ri-car-line text-primary text-sm"></i>
                            {p.parking}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-roboto text-gray-500">
                          <span className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-route-line text-primary text-sm"></i>
                          </span>
                          {p.distance} km to {destination} &middot; {p.commuteTime} min {transportMode.toLowerCase()}
                        </div>
                      </div>
                      <div className="flex items-end justify-between gap-3 pt-3 border-t border-gray-100 mt-2">
                        <span className="text-xs font-roboto text-gray-500">{p.type === 'rent' ? 'To rent' : 'For sale'}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <a href="tel:+254712345678" className="flex items-center gap-1.5 text-sm font-roboto text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md px-2 py-1 -mx-2 transition-all duration-200 cursor-pointer whitespace-nowrap">
                            <span className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-phone-line text-sm"></i>
                            </span>
                            <span className="underline underline-offset-2">Call</span>
                          </a>
                          <button onClick={() => setContactModalProp(p)} className="flex items-center gap-1.5 text-sm font-roboto text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md px-2 py-1 -mx-2 transition-all duration-200 cursor-pointer whitespace-nowrap">
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
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="text-center py-16">
                <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 bg-gray-100 rounded-full">
                  <i className="ri-route-line text-gray-400 text-xl"></i>
                </div>
                <p className="font-roboto font-bold text-primary text-lg mb-2">No properties in this range</p>
                <p className="text-sm font-roboto text-stone-400">Try extending your time range or changing destinations</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block lg:w-[40%] xl:w-[35%]">
            <div className="sticky top-[140px] space-y-4">
              {/* Map */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-roboto font-semibold text-primary">Commute Map</h3>
                </div>
                <div className="h-[300px]">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255281.1989180463!2d36.68258773125!3d-1.302861050000005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f1172d84d49a7%3A0xf7cf0254b297924c!2sNairobi%2C%20Kenya!5e0!3m2!1sen!2sus!4v1717000000000!5m2!1sen!2sus"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Commute map - Nairobi"
                  ></iframe>
                </div>
              </div>

              {/* Popular destinations */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-roboto font-semibold text-primary">Popular Destinations</h3>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {destinations.slice(0, 6).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDestination(d)}
                      className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-xs font-roboto cursor-pointer transition-colors ${destination === d ? 'bg-primary/5 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span className="flex items-center gap-2">
                        <i className="ri-map-pin-2-line text-xs"></i>
                        {d}
                      </span>
                      <i className="ri-arrow-right-s-line text-xs"></i>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-[#f8f7f4] rounded-lg p-4">
                <h3 className="text-sm font-roboto font-semibold text-primary mb-2">Commute Tips</h3>
                <ul className="space-y-2 text-xs font-roboto text-gray-600">
                  <li className="flex items-start gap-2">
                    <i className="ri-time-line text-primary text-xs mt-0.5"></i>
                    Morning peak hours in Nairobi are 7:00 - 9:00 AM
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-road-map-line text-primary text-xs mt-0.5"></i>
                    Mombasa Road and Thika Road experience the heaviest traffic
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-bus-line text-primary text-xs mt-0.5"></i>
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
          propertyPrice={contactModalProp.price}
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
          price: quickViewProperty.price,
          priceUnit: quickViewProperty.priceUnit,
          location: quickViewProperty.location,
          category: quickViewProperty.category,
          beds: quickViewProperty.beds,
          baths: quickViewProperty.baths,
          parking: quickViewProperty.parking,
          receptions: quickViewProperty.receptions,
          description: '',
          images: [quickViewProperty.image],
          type: quickViewProperty.type,
        } : null}
      />
    </div>
  );
}