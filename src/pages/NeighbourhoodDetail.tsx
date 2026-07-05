import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { neighborhoods as mockNeighborhoods } from '@/mocks/neighborhoods';
import { properties as mockProperties } from '@/mocks/properties';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import ContactCTA from '@/components/feature/ContactCTA';

interface DBListing {
  id: string;
  title: string;
  slug: string;
  location: string;
  price: number;
  currency: string | null;
  price_prefix: string | null;
  price_postfix: string | null;
  purpose: string;
  status: string;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  size: number | null;
  main_image: string | null;
  cover_image: string | null;
  images: string[] | null;
  neighbourhood: string | null;
}

interface DBNeighbourhood {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  hero_image: string | null;
  summary: string | null;
  description: string | null;
  longDescription?: string;
  tags: string[] | null;
  vibe: string | null;
  target_market: string | null;
  content_html: string | null;
  expat_guide: string | null;
  practical_info: string | null;
  mapUrl?: string;
  lifestyle?: string;
  highlights?: string[];
  avgPrice?: string;
  propertyTypes?: string[];
  average_sale_price?: number | null;
  rental_range_kes?: string | null;
  propertyCount: number;
}

export default function NeighbourhoodDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [neighbourhood, setNeighbourhood] = useState<DBNeighbourhood | null>(null);
  const [listings, setListings] = useState<DBListing[]>([]);
  const [nearbyHoods, setNearbyHoods] = useState<DBNeighbourhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyTab, setPropertyTab] = useState<'sale' | 'rent'>('sale');
  const [guideTab, setGuideTab] = useState<'overview' | 'lifestyle' | 'practical'>('overview');

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const { data: dbHood, error: hoodError } = await supabase
        .from('neighbourhoods')
        .select(
          'id, name, slug, city, country, hero_image, summary, description, tags, vibe, target_market, content_html, expat_guide, practical_info, average_sale_price, rental_range_kes'
        )
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (!hoodError && dbHood) {
        const { data: images } = await supabase
          .from('neighbourhood_images')
          .select('url, alt_text')
          .eq('neighbourhood_id', dbHood.id)
          .order('sort_order', { ascending: true });

        const { data: faqs } = await supabase
          .from('neighbourhood_faqs')
          .select('question, answer')
          .eq('neighbourhood_id', dbHood.id)
          .order('sort_order', { ascending: true });

        const { data: dbListings } = await supabase
          .from('listings')
          .select(
            'id, title, slug, location, price, currency, price_prefix, price_postfix, purpose, status, property_type, bedrooms, bathrooms, parking, size, main_image, cover_image, images, neighbourhood'
          )
          .eq('is_published', true)
          .eq('status', 'available')
          .or(`location.ilike.%${dbHood.name}%,neighbourhood.ilike.%${dbHood.name}%`);

        const { data: nearbyData } = await supabase
          .from('neighbourhoods')
          .select('id, name, slug, hero_image, summary, tags, propertyCount:sort_order')
          .eq('is_published', true)
          .neq('id', dbHood.id)
          .order('sort_order', { ascending: true })
          .limit(4);

        const enrichedNearby: DBNeighbourhood[] = (nearbyData || []).map((n) => ({
          id: n.id,
          name: n.name,
          slug: n.slug,
          city: dbHood.city,
          country: dbHood.country,
          hero_image: n.hero_image,
          summary: n.summary,
          description: null,
          tags: n.tags || [],
          vibe: null,
          target_market: null,
          content_html: null,
          expat_guide: null,
          practical_info: null,
          average_sale_price: null,
          rental_range_kes: null,
          propertyCount: 0,
        }));
        setNearbyHoods(enrichedNearby);

        const enriched: DBNeighbourhood = {
          ...dbHood,
          tags: dbHood.tags || [],
          propertyCount: (dbListings || []).length,
          highlights: (faqs || []).map((f) => `${f.question}: ${f.answer}`),
          lifestyle: dbHood.vibe || '',
          avgPrice: dbHood.average_sale_price
            ? `KSh ${(dbHood.average_sale_price / 1_000_000).toFixed(0)}M`
            : '',
          propertyTypes: [],
          mapUrl: `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255282.32335424927!2d36.78258701714773!3d-1.262861158456208!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f107ba5a6c4c49%3A0x6b6651a6e9b1a63c!2s${encodeURIComponent(
            dbHood.name
          )}%2C%20${encodeURIComponent(dbHood.city)}!5e0!3m2!1sen!2ske!4v1700000000000`,
        };
        setNeighbourhood(enriched);
        setListings(dbListings || []);
      } else {
        const mockHood = mockNeighborhoods.find((n) => n.slug === slug);
        if (mockHood) {
          const dbStyle: DBNeighbourhood = {
            id: mockHood.id,
            name: mockHood.name,
            slug: mockHood.slug,
            city: 'Nairobi',
            country: 'Kenya',
            hero_image: mockHood.image || mockHood.hero_image,
            summary: mockHood.summary || mockHood.description,
            description: mockHood.longDescription,
            tags: mockHood.tags || [],
            vibe: mockHood.vibe || '',
            target_market: mockHood.target_market || '',
            content_html: null,
            expat_guide: null,
            practical_info: null,
            lifestyle: mockHood.lifestyle,
            highlights: mockHood.highlights,
            avgPrice: mockHood.avgPrice,
            propertyTypes: mockHood.propertyTypes,
            mapUrl: mockHood.mapUrl,
            propertyCount: mockHood.propertyCount,
            average_sale_price: mockHood.average_sale_price || null,
            rental_range_kes: mockHood.rental_range_kes || null,
          };
          setNeighbourhood(dbStyle);

          const areaMockProps = mockProperties.filter(
            (p) => p.location.toLowerCase() === mockHood.name.toLowerCase()
          );
          const mockAsDB: DBListing[] = areaMockProps.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            location: p.location,
            price: parsePrice(p.price),
            currency: 'KES',
            price_prefix: null,
            price_postfix: null,
            purpose: p.type,
            status: 'available',
            property_type: p.category,
            bedrooms: p.beds,
            bathrooms: p.baths,
            parking: p.parking,
            size: null,
            main_image: p.image,
            cover_image: null,
            images: null,
            neighbourhood: p.location,
          }));
          setListings(mockAsDB);

          const nearbyMock = mockNeighborhoods
            .filter((n) => n.slug !== slug)
            .slice(0, 4)
            .map((n) => ({
              id: n.id,
              name: n.name,
              slug: n.slug,
              city: 'Nairobi',
              country: 'Kenya',
              hero_image: n.image || n.hero_image || null,
              summary: n.summary || null,
              description: null,
              tags: n.tags || [],
              vibe: null,
              target_market: null,
              content_html: null,
              expat_guide: null,
              practical_info: null,
              average_sale_price: null,
              rental_range_kes: null,
              propertyCount: n.propertyCount,
            }));
          setNearbyHoods(nearbyMock);
        } else {
          setNeighbourhood(null);
          setNearbyHoods([]);
        }
      }
    } catch {
      const mockHood = mockNeighborhoods.find((n) => n.slug === slug);
      if (mockHood) {
        const dbStyle: DBNeighbourhood = {
          id: mockHood.id,
          name: mockHood.name,
          slug: mockHood.slug,
          city: 'Nairobi',
          country: 'Kenya',
          hero_image: mockHood.image || mockHood.hero_image,
          summary: mockHood.summary || mockHood.description,
          description: mockHood.longDescription,
          tags: mockHood.tags || [],
          vibe: mockHood.vibe || '',
          target_market: mockHood.target_market || '',
          content_html: null,
          expat_guide: null,
          practical_info: null,
          lifestyle: mockHood.lifestyle,
          highlights: mockHood.highlights,
          avgPrice: mockHood.avgPrice,
          propertyTypes: mockHood.propertyTypes,
          mapUrl: mockHood.mapUrl,
          propertyCount: mockHood.propertyCount,
          average_sale_price: mockHood.average_sale_price || null,
          rental_range_kes: mockHood.rental_range_kes || null,
        };
        setNeighbourhood(dbStyle);

        const areaMockProps = mockProperties.filter(
          (p) => p.location.toLowerCase() === mockHood.name.toLowerCase()
        );
        const mockAsDB: DBListing[] = areaMockProps.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          location: p.location,
          price: parsePrice(p.price),
          currency: 'KES',
          price_prefix: null,
          price_postfix: null,
          purpose: p.type,
          status: 'available',
          property_type: p.category,
          bedrooms: p.beds,
          bathrooms: p.baths,
          parking: p.parking,
          size: null,
          main_image: p.image,
          cover_image: null,
          images: null,
          neighbourhood: p.location,
        }));
        setListings(mockAsDB);

        const nearbyMock = mockNeighborhoods
          .filter((n) => n.slug !== slug)
          .slice(0, 4)
          .map((n) => ({
            id: n.id,
            name: n.name,
            slug: n.slug,
            city: 'Nairobi',
            country: 'Kenya',
            hero_image: n.image || n.hero_image || null,
            summary: n.summary || null,
            description: null,
            tags: n.tags || [],
            vibe: null,
            target_market: null,
            content_html: null,
            expat_guide: null,
            practical_info: null,
            average_sale_price: null,
            rental_range_kes: null,
            propertyCount: n.propertyCount,
          }));
        setNearbyHoods(nearbyMock);
      } else {
        setNeighbourhood(null);
        setNearbyHoods([]);
      }
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saleListings = listings.filter((l) => l.purpose === 'sale');
  const rentListings = listings.filter((l) => l.purpose === 'rent');

  const formatPrice = (l: DBListing) => {
    const prefix = l.price_prefix || '';
    const postfix = l.price_postfix || '';
    if (l.currency === 'USD' || l.price < 10000) {
      return `${prefix}$${l.price.toLocaleString()}${postfix}`;
    }
    if (l.price >= 1_000_000) {
      return `${prefix}KSh ${(l.price / 1_000_000).toFixed(0)}M${postfix}`;
    }
    return `${prefix}KSh ${l.price.toLocaleString()}${postfix}`;
  };

  if (!neighbourhood && !loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-32 pb-20 px-4 md:px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="font-prata text-3xl text-primary mb-4">Neighbourhood Not Found</h1>
            <p className="font-roboto text-stone-500 mb-6">
              We could not find the neighbourhood you are looking for.
            </p>
            <Link
              to="/neighbourhoods"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              View All Neighbourhoods
              <i className="ri-arrow-right-line text-xs"></i>
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative pt-28 md:pt-32 pb-16 md:pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            alt={neighbourhood?.name || 'Neighbourhood'}
            className="w-full h-full object-cover object-top"
            src={
              neighbourhood?.hero_image || ''
            }
          />
          <div className="absolute inset-0 bg-primary/75"></div>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 md:px-6">
          {/* Breadcrumb */}
          <nav className="mb-4">
            <ol className="flex items-center gap-2 text-xs font-roboto text-white/60">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <i className="ri-arrow-right-s-line"></i>
              </li>
              <li>
                <Link to="/neighbourhoods" className="hover:text-white transition-colors">Neighbourhoods</Link>
              </li>
              <li>
                <i className="ri-arrow-right-s-line"></i>
              </li>
              <li className="text-white font-medium">{neighbourhood?.name}</li>
            </ol>
          </nav>
          <div className="flex flex-wrap gap-2 mb-3">
            {neighbourhood?.tags &&
              neighbourhood.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-white/15 backdrop-blur-sm text-white text-[10px] font-roboto font-medium rounded-full"
                >
                  {tag}
                </span>
              ))}
          </div>
          <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.35em] mb-2">
            {neighbourhood?.propertyCount} Properties Available
          </p>
          <h1 className="font-prata text-3xl md:text-5xl text-white mb-4 leading-tight">
            {neighbourhood?.name}
          </h1>
          <p className="font-roboto text-white/80 text-sm md:text-base max-w-2xl leading-relaxed">
            {neighbourhood?.summary || neighbourhood?.description || ''}
          </p>
        </div>
      </section>

      <main className="px-3 md:px-6 py-10 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          {/* About + Lifestyle */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10 mb-12 md:mb-16">
            <div className="lg:col-span-2">
              <h2 className="font-prata text-xl md:text-2xl text-primary mb-4">
                About {neighbourhood?.name}
              </h2>
              <p className="font-roboto text-stone-600 text-sm leading-relaxed mb-6">
                {neighbourhood?.description || neighbourhood?.summary || ''}
              </p>

              {/* Area Guide Tabs */}
              <div className="border-b border-stone-100 mb-4">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {[
                    { key: 'overview' as const, label: 'Overview', icon: 'ri-file-text-line' },
                    { key: 'lifestyle' as const, label: 'Lifestyle', icon: 'ri-heart-pulse-line' },
                    { key: 'practical' as const, label: 'Practical Info', icon: 'ri-information-line' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setGuideTab(t.key)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-roboto transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                        guideTab === t.key
                          ? 'border-primary text-primary'
                          : 'border-transparent text-stone-400 hover:text-stone-600'
                      }`}
                    >
                      <i className={t.icon}></i>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-[120px]">
                {guideTab === 'overview' && (
                  <div>
                    {neighbourhood?.content_html ? (
                      <div
                        className="font-roboto text-stone-600 text-sm leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: neighbourhood.content_html }}
                      />
                    ) : (
                      <div className="space-y-4">
                        <p className="font-roboto text-stone-600 text-sm leading-relaxed">
                          {neighbourhood?.description || neighbourhood?.summary || ''}
                        </p>
                        {neighbourhood?.highlights && neighbourhood.highlights.length > 0 && (
                          <div>
                            <h3 className="font-prata text-base text-primary mb-3">Neighbourhood Highlights</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {neighbourhood.highlights.map((h, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                  <div className="w-5 h-5 flex items-center justify-center bg-golden/20 rounded-full mt-0.5 shrink-0">
                                    <i className="ri-check-line text-golden text-xs"></i>
                                  </div>
                                  <span className="font-roboto text-stone-600 text-sm">{h}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {guideTab === 'lifestyle' && (
                  <div className="space-y-4">
                    <div className="bg-stone-50 p-4 md:p-5 rounded-lg border border-stone-100">
                      <h3 className="font-prata text-sm text-primary mb-2">Lifestyle Character</h3>
                      <p className="font-roboto text-stone-600 text-sm leading-relaxed">
                        {neighbourhood?.lifestyle || neighbourhood?.vibe || 'No lifestyle description available.'}
                      </p>
                    </div>
                    <div className="bg-stone-50 p-4 md:p-5 rounded-lg border border-stone-100">
                      <h3 className="font-prata text-sm text-primary mb-2">Target Residents</h3>
                      <p className="font-roboto text-stone-600 text-sm leading-relaxed">
                        {neighbourhood?.target_market || 'Information coming soon.'}
                      </p>
                    </div>
                    {neighbourhood?.expat_guide && (
                      <div className="bg-stone-50 p-4 md:p-5 rounded-lg border border-stone-100">
                        <h3 className="font-prata text-sm text-primary mb-2">Expat Guide</h3>
                        <p className="font-roboto text-stone-600 text-sm leading-relaxed whitespace-pre-line">
                          {neighbourhood.expat_guide}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {guideTab === 'practical' && (
                  <div className="space-y-4">
                    {neighbourhood?.practical_info ? (
                      <div className="bg-stone-50 p-4 md:p-5 rounded-lg border border-stone-100">
                        <p className="font-roboto text-stone-600 text-sm leading-relaxed whitespace-pre-line">
                          {neighbourhood.practical_info}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-stone-50 p-4 md:p-5 rounded-lg border border-stone-100">
                        <p className="font-roboto text-stone-500 text-sm">Practical information coming soon.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                        <p className="font-roboto text-stone-400 text-[10px] uppercase tracking-wider mb-1">Average Price Range</p>
                        <p className="font-roboto text-primary text-sm font-medium">
                          {neighbourhood?.avgPrice || 'Contact us'}
                        </p>
                      </div>
                      <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                        <p className="font-roboto text-stone-400 text-[10px] uppercase tracking-wider mb-1">Rental Range</p>
                        <p className="font-roboto text-primary text-sm font-medium">
                          {neighbourhood?.rental_range_kes || 'Contact us'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-stone-50 p-5 md:p-6 rounded-lg border border-stone-100 h-fit">
              <h3 className="font-prata text-base text-primary mb-4">Neighbourhood Snapshot</h3>
              <div className="space-y-4">
                <div>
                  <p className="font-roboto text-stone-400 text-[10px] uppercase tracking-wider mb-0.5">Average Price Range</p>
                  <p className="font-roboto text-primary text-sm font-medium">{neighbourhood?.avgPrice || 'Contact us'}</p>
                </div>
                <div className="border-t border-stone-200 pt-3">
                  <p className="font-roboto text-stone-400 text-[10px] uppercase tracking-wider mb-0.5">Rental Range</p>
                  <p className="font-roboto text-primary text-sm font-medium">{neighbourhood?.rental_range_kes || 'Contact us'}</p>
                </div>
                <div className="border-t border-stone-200 pt-3">
                  <p className="font-roboto text-stone-400 text-[10px] uppercase tracking-wider mb-0.5">Property Types</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(neighbourhood?.propertyTypes || []).map((t, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-white border border-stone-200 text-stone-600 text-[10px] font-roboto font-medium rounded-sm whitespace-nowrap"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="border-t border-stone-200 pt-3">
                  <p className="font-roboto text-stone-400 text-[10px] uppercase tracking-wider mb-0.5">Lifestyle</p>
                  <p className="font-roboto text-stone-600 text-xs">{neighbourhood?.lifestyle || neighbourhood?.vibe || ''}</p>
                </div>
                <div className="border-t border-stone-200 pt-3">
                  <p className="font-roboto text-stone-400 text-[10px] uppercase tracking-wider mb-0.5">Active Listings</p>
                  <p className="font-roboto text-primary text-sm font-medium">{neighbourhood?.propertyCount} Properties</p>
                </div>
              </div>
              <Link
                to="/contact"
                className="mt-5 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap w-full rounded-lg"
              >
                Enquire About This Area
                <i className="ri-arrow-right-line text-xs"></i>
              </Link>
            </div>
          </div>

          {/* Map */}
          <div className="mb-12 md:mb-16">
            <h2 className="font-prata text-xl md:text-2xl text-primary mb-4">Location</h2>
            <div className="w-full h-64 md:h-80 rounded-lg overflow-hidden border border-stone-200">
              {neighbourhood?.mapUrl ? (
                <iframe
                  allowFullScreen
                  className="w-full h-full"
                  loading="lazy"
                  src={neighbourhood.mapUrl}
                  title={`${neighbourhood.name} map`}
                ></iframe>
              ) : (
                <div className="w-full h-full bg-stone-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-3">
                      <i className="ri-map-pin-line text-stone-400 text-xl"></i>
                    </div>
                    <p className="font-roboto text-stone-400 text-sm">Map view coming soon</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Properties */}
          <div>
            <div className="flex items-end justify-between mb-6 md:mb-8">
              <div>
                <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-1">Featured</p>
                <h2 className="font-prata text-xl md:text-2xl text-primary">
                  Properties in {neighbourhood?.name}
                </h2>
              </div>
              <Link
                to="/all-properties"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-roboto font-medium text-stone-500 hover:text-primary transition-colors whitespace-nowrap"
              >
                View All
                <i className="ri-arrow-right-line"></i>
              </Link>
            </div>

            {/* Property Tabs */}
            <div className="flex items-center gap-1 border-b border-stone-100 mb-6 md:mb-8">
              {[
                { key: 'sale' as const, label: 'For Sale', count: saleListings.length },
                { key: 'rent' as const, label: 'To Let', count: rentListings.length },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setPropertyTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-roboto transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                    propertyTab === t.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-stone-400 hover:text-stone-600'
                  }`}
                >
                  {t.label}
                  <span className="px-1.5 py-0.5 bg-stone-100 text-[10px] rounded-full text-stone-500">{t.count}</span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-stone-50 rounded-lg h-72 animate-pulse" />
                ))}
              </div>
            ) : (
              <div>
                {propertyTab === 'sale' && (
                  <div>
                    {saleListings.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {saleListings.map((p) => (
                          <Link
                            key={p.id}
                            to={`/property/${p.slug}`}
                            className="group cursor-pointer block bg-white rounded-lg overflow-hidden border border-stone-100 hover:border-stone-200 transition-all duration-300"
                          >
                            <div className="relative aspect-[4/3] overflow-hidden">
                              <img
                                alt={p.title}
                                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                                src={
                                  p.main_image ||
                                  p.cover_image ||
                                  (p.images && p.images[0]) ||
                                  ''
                                }
                              />
                              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-primary/90 text-white text-[10px] font-roboto font-medium uppercase tracking-wider rounded-sm">
                                For Sale
                              </div>
                            </div>
                            <div className="p-3.5 md:p-4">
                              <p className="text-golden text-[10px] font-roboto font-semibold uppercase tracking-wider mb-1">
                                {p.property_type}
                              </p>
                              <h3 className="font-prata text-sm md:text-base text-primary leading-snug mb-2 line-clamp-2">
                                {p.title}
                              </h3>
                              <p className="font-roboto text-stone-400 text-xs mb-3 flex items-center gap-1">
                                <i className="ri-map-pin-line"></i>
                                {p.location}
                              </p>
                              <div className="flex items-center gap-3 text-stone-400 text-xs font-roboto mb-3">
                                {p.bedrooms !== null && (
                                  <span className="flex items-center gap-1"><i className="ri-hotel-bed-line"></i> {p.bedrooms}</span>
                                )}
                                {p.bathrooms !== null && (
                                  <span className="flex items-center gap-1"><i className="ri-drop-line"></i> {p.bathrooms}</span>
                                )}
                                {p.parking !== null && (
                                  <span className="flex items-center gap-1"><i className="ri-car-line"></i> {p.parking}</span>
                                )}
                                {p.size !== null && (
                                  <span className="flex items-center gap-1"><i className="ri-ruler-line"></i> {p.size} sqm</span>
                                )}
                              </div>
                              <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
                                <p className="font-roboto text-primary text-sm font-semibold">{formatPrice(p)}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-stone-50 rounded-lg border border-stone-100">
                        <div className="w-12 h-12 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-3">
                          <i className="ri-home-4-line text-stone-400 text-xl"></i>
                        </div>
                        <p className="font-prata text-base text-primary mb-1">No Properties For Sale</p>
                        <p className="font-roboto text-stone-400 text-xs max-w-md mx-auto mb-4">
                          There are currently no sale properties in {neighbourhood?.name}. New listings come in regularly — register your interest.
                        </p>
                        <Link
                          to="/contact"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
                        >
                          Register Interest
                          <i className="ri-arrow-right-line text-xs"></i>
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {propertyTab === 'rent' && (
                  <div>
                    {rentListings.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {rentListings.map((p) => (
                          <Link
                            key={p.id}
                            to={`/property/${p.slug}`}
                            className="group cursor-pointer block bg-white rounded-lg overflow-hidden border border-stone-100 hover:border-stone-200 transition-all duration-300"
                          >
                            <div className="relative aspect-[4/3] overflow-hidden">
                              <img
                                alt={p.title}
                                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                                src={
                                  p.main_image ||
                                  p.cover_image ||
                                  (p.images && p.images[0]) ||
                                  ''
                                }
                              />
                              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-emerald-600/90 text-white text-[10px] font-roboto font-medium uppercase tracking-wider rounded-sm">
                                To Let
                              </div>
                            </div>
                            <div className="p-3.5 md:p-4">
                              <p className="text-golden text-[10px] font-roboto font-semibold uppercase tracking-wider mb-1">
                                {p.property_type}
                              </p>
                              <h3 className="font-prata text-sm md:text-base text-primary leading-snug mb-2 line-clamp-2">
                                {p.title}
                              </h3>
                              <p className="font-roboto text-stone-400 text-xs mb-3 flex items-center gap-1">
                                <i className="ri-map-pin-line"></i>
                                {p.location}
                              </p>
                              <div className="flex items-center gap-3 text-stone-400 text-xs font-roboto mb-3">
                                {p.bedrooms !== null && (
                                  <span className="flex items-center gap-1"><i className="ri-hotel-bed-line"></i> {p.bedrooms}</span>
                                )}
                                {p.bathrooms !== null && (
                                  <span className="flex items-center gap-1"><i className="ri-drop-line"></i> {p.bathrooms}</span>
                                )}
                                {p.parking !== null && (
                                  <span className="flex items-center gap-1"><i className="ri-car-line"></i> {p.parking}</span>
                                )}
                                {p.size !== null && (
                                  <span className="flex items-center gap-1"><i className="ri-ruler-line"></i> {p.size} sqm</span>
                                )}
                              </div>
                              <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
                                <p className="font-roboto text-primary text-sm font-semibold">{formatPrice(p)}</p>
                                <p className="font-roboto text-stone-400 text-[10px] uppercase">per month</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-stone-50 rounded-lg border border-stone-100">
                        <div className="w-12 h-12 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-3">
                          <i className="ri-home-4-line text-stone-400 text-xl"></i>
                        </div>
                        <p className="font-prata text-base text-primary mb-1">No Properties To Let</p>
                        <p className="font-roboto text-stone-400 text-xs max-w-md mx-auto mb-4">
                          There are currently no rental properties in {neighbourhood?.name}. Register your interest to be notified first.
                        </p>
                        <Link
                          to="/contact"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
                        >
                          Register Interest
                          <i className="ri-arrow-right-line text-xs"></i>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nearby Areas */}
          <div className="mt-12 md:mt-16">
            <h2 className="font-prata text-xl md:text-2xl text-primary mb-5">
              Explore Nearby Areas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {nearbyHoods.slice(0, 4).map((n) => (
                <Link
                  key={n.id}
                  to={`/neighbourhood/${n.slug}`}
                  className="relative overflow-hidden rounded-lg group cursor-pointer block aspect-[4/3]"
                >
                  <img
                    alt={n.name}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    src={n.hero_image || ''}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-3 left-3">
                    <h3 className="text-white text-base font-prata leading-tight">{n.name}</h3>
                    {n.propertyCount > 0 && (
                      <p className="text-white/70 text-[10px] font-roboto mt-0.5">{n.propertyCount} Properties</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 md:mt-16 text-center bg-stone-50 py-12 md:py-16 px-4 md:px-6 rounded-lg">
            <h3 className="font-prata text-xl md:text-2xl text-primary mb-3">
              Speak to an Agent About {neighbourhood?.name}
            </h3>
            <p className="font-roboto text-stone-500 text-sm max-w-xl mx-auto mb-6">
              Our agents have deep knowledge of {neighbourhood?.name} and can help you find the perfect property or investment opportunity in this area.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Get in Touch
              <i className="ri-arrow-right-line text-xs"></i>
            </Link>
          </div>
        </div>
      </main>

      <ContactCTA />
      <Footer />
      <BackToTop />
    </div>
  );
}

function parsePrice(priceStr: string): number {
  const clean = priceStr.replace(/[^0-9.]/g, '');
  const val = parseFloat(clean);
  if (priceStr.includes('M') && val < 1000) return val * 1_000_000;
  if (priceStr.includes('K') && val < 1000) return val * 1_000;
  return val || 0;
}