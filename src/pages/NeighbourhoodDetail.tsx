import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getPropertySpecs } from '@/lib/propertySpecs';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';
import PropertyBadge from '@/components/feature/PropertyBadge';
import { useCurrency } from '@/hooks/useCurrency';
import { smartTitleCase } from '@/lib/location';

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
  sqft: number | null;
  land_size: number | null;
  acreage: number | null;
  land_unit: string | null;
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
  tags: string[] | null;
  vibe: string | null;
  target_market: string | null;
  content_html: string | null;
  expat_guide: string | null;
  practical_info: string | null;
  average_sale_price: number | null;
  rental_range_kes: string | null;
  propertyCount: number;
}

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${className} reveal-up ${isVisible ? 'revealed' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function NeighbourhoodDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [neighbourhood, setNeighbourhood] = useState<DBNeighbourhood | null>(null);
  const [listings, setListings] = useState<DBListing[]>([]);
  const [nearbyHoods, setNearbyHoods] = useState<DBNeighbourhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyTab, setPropertyTab] = useState<'sale' | 'rent'>('sale');

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
        const { data: dbListings } = await supabase
          .from('listings')
          .select(
            'id, title, slug, location, price, currency, price_prefix, price_postfix, purpose, status, property_type, bedrooms, bathrooms, parking, size, sqft, land_size, acreage, land_unit, main_image, cover_image, images, neighbourhood'
          )
          .eq('is_published', true)
          .eq('status', 'available')
          .or(`location.ilike.%${dbHood.name}%,neighbourhood.ilike.%${dbHood.name}%`);

        const { data: nearbyData } = await supabase
          .from('neighbourhoods')
          .select('id, name, slug, hero_image, summary, tags')
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
        };
        setNeighbourhood(enriched);
        setListings(dbListings || []);
      } else {
        setNeighbourhood(null);
        setListings([]);
        setNearbyHoods([]);
        setLoading(false);
        return;
      }
    } catch {
      setNeighbourhood(null);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { format } = useCurrency();

  const saleListings = listings.filter((l) => l.purpose === 'sale');
  const rentListings = listings.filter((l) => l.purpose === 'rent');

  if (!neighbourhood && !loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-32 pb-20 px-4 md:px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="font-roboto font-bold text-3xl text-primary mb-4">Neighbourhood Not Found</h1>
            <p className="font-roboto text-stone-500 mb-6">
              We could not find the neighbourhood you are looking for.
            </p>
            <Link
              to="/neighbourhoods"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-sm font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
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
            src={neighbourhood?.hero_image || ''}
          />
          <div className="absolute inset-0 bg-primary/75"></div>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 md:px-6">
          <nav className="mb-4">
            <ol className="flex items-center gap-2 text-xs font-roboto text-white/60">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li><i className="ri-arrow-right-s-line"></i></li>
              <li>
                <Link to="/neighbourhoods" className="hover:text-white transition-colors">Neighbourhoods</Link>
              </li>
              <li><i className="ri-arrow-right-s-line"></i></li>
              <li className="text-white font-medium">{neighbourhood?.name}</li>
            </ol>
          </nav>
          <div className="flex flex-wrap gap-2 mb-3">
            {neighbourhood?.tags?.map((tag) => (
              <span key={tag} className="px-2.5 py-1 bg-white/15 backdrop-blur-sm text-white text-xs font-roboto font-medium rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.35em] mb-2">
            {neighbourhood?.propertyCount} Properties Available
          </p>
          <h1 className="font-roboto font-bold text-2xl md:text-5xl text-white mb-4 leading-tight">
            {neighbourhood?.name} Area Guide
          </h1>
          <p className="font-roboto text-white/80 text-sm md:text-base max-w-2xl leading-relaxed">
            {neighbourhood?.summary || ''}
          </p>
        </div>
      </section>

      <main className="px-3 md:px-6 py-10 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          {/* Overview */}
          <Reveal>
            <section className="mb-12 md:mb-16">
              <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Overview &amp; Vibe</h2>
              <p className="font-roboto text-stone-600 text-sm leading-relaxed mb-6">
                {neighbourhood?.description || neighbourhood?.summary || ''}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-stone-50 p-4 rounded-lg border-2 border-primary/12">
                  <p className="font-roboto text-stone-400 text-xs uppercase tracking-wider mb-1">Price Range (2026)</p>
                  <p className="font-roboto text-primary text-sm font-semibold">{neighbourhood?.average_sale_price ? format(neighbourhood.average_sale_price, 'KES') : 'Contact us'}</p>
                </div>
                <div className="bg-stone-50 p-4 rounded-lg border-2 border-primary/12">
                  <p className="font-roboto text-stone-400 text-xs uppercase tracking-wider mb-1">Rental Range</p>
                  <p className="font-roboto text-primary text-sm font-semibold">{neighbourhood?.rental_range_kes || 'Contact us'}</p>
                </div>
                <div className="bg-stone-50 p-4 rounded-lg border-2 border-primary/12">
                  <p className="font-roboto text-stone-400 text-xs uppercase tracking-wider mb-1">Best Suited For</p>
                  <p className="font-roboto text-stone-600 text-xs leading-relaxed">{neighbourhood?.target_market || ''}</p>
                </div>
              </div>
            </section>
          </Reveal>

          {/* Map */}
          <Reveal>
          <section className="mb-12 md:mb-16">
            <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Location</h2>
            <div className="w-full h-56 md:h-80 rounded-lg overflow-hidden border border-primary/12">
              <iframe
                allowFullScreen
                className="w-full h-full"
                loading="lazy"
                src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255282.32335424927!2d36.78258701714773!3d-1.262861158456208!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f107ba5a6c4c49%3A0x6b6651a6e9b1a63c!2s${encodeURIComponent(neighbourhood?.name || '')}%2C%20${encodeURIComponent(neighbourhood?.city || 'Nairobi')}!5e0!3m2!1sen!2ske!4v1700000000000`}
                title={`${neighbourhood?.name} map`}
              ></iframe>
            </div>
          </section>
          </Reveal>

          {/* Related Listings */}
          <Reveal>
          <section className="mb-12 md:mb-16">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-[0.3em] mb-1">Properties</p>
                <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary">
                  Active Listings in {neighbourhood?.name}
                </h2>
              </div>
              <Link
                to="/all-properties"
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 text-sm font-roboto font-medium text-primary border border-primary/20 rounded-sm hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
              >
                View All
                <i className="ri-arrow-right-line"></i>
              </Link>
            </div>

            <div className="flex items-center gap-1 border-b border-stone-100 mb-6">
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
                  <span className="px-1.5 py-0.5 bg-stone-100 text-xs rounded-full text-stone-500">{t.count}</span>
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
              <>
                {(propertyTab === 'sale' ? saleListings : rentListings).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                    {(propertyTab === 'sale' ? saleListings : rentListings).map((p) => (
                      <Link
                        key={p.id}
                        to={`/property/${p.slug}`}
                        className="group cursor-pointer block bg-white rounded-lg overflow-hidden border-2 border-primary/12 hover:border-primary/12 transition-all duration-300"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <img
                            alt={p.title}
                            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                            src={p.main_image || p.cover_image || (p.images && p.images[0]) || ''}
                          />
                          <PropertyBadge variant={propertyTab === 'sale' ? 'sale' : 'rent'} className="absolute top-2.5 left-2.5" />
                        </div>
                        <div className="p-3.5 md:p-4">
                          <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-wider mb-1">
                            {p.property_type}
                          </p>
                          <h3 className="font-roboto font-bold text-sm md:text-base text-primary leading-snug mb-2 line-clamp-2">
                            {smartTitleCase(p.title)}
                          </h3>
                          <p className="font-roboto text-stone-400 text-xs mb-3 flex items-center gap-1">
                            <i className="ri-map-pin-line"></i>
                            {smartTitleCase(p.location)}
                          </p>
                          <div className="flex items-center gap-3 flex-wrap text-stone-400 text-xs font-roboto mb-3">
                            {getPropertySpecs(p.property_type, {
                              beds: p.bedrooms ?? 0,
                              baths: p.bathrooms ?? 0,
                              parking: p.parking ?? 0,
                              sqft: Number(p.sqft ?? 0),
                              acreage: Number(p.acreage ?? 0),
                              landSize: Number(p.land_size ?? 0),
                              landUnit: p.land_unit || undefined,
                            }).map((spec) => (
                              <span key={spec.key} className="flex items-center gap-1"><i className={spec.icon}></i> {spec.label}</span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
                            <p className="font-roboto text-primary text-sm font-semibold">{format(p.price, (p.currency || 'KES') as 'KES' | 'USD' | 'GBP' | 'EUR')}</p>
                            {propertyTab === 'rent' && (
                              <p className="font-roboto text-stone-400 text-xs uppercase">per month</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-stone-50 rounded-lg border-2 border-primary/12">
                    <div className="w-12 h-12 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-3">
                      <i className="ri-home-4-line text-stone-400 text-xl"></i>
                    </div>
                    <p className="font-roboto font-bold text-base text-primary mb-1">
                      No Properties {propertyTab === 'sale' ? 'For Sale' : 'To Let'}
                    </p>
                    <p className="font-roboto text-stone-400 text-xs max-w-md mx-auto mb-4">
                      New listings come in regularly in {neighbourhood?.name}. Register your interest to be notified first.
                    </p>
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                      Register Interest
                      <i className="ri-arrow-right-line text-xs"></i>
                    </Link>
                  </div>
                )}
              </>
            )}
          </section>
          </Reveal>

          {/* Nearby Areas */}
          <Reveal>
          <section className="mb-12 md:mb-16">
            <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-5">Explore Nearby Areas</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
                    <h3 className="text-white text-base font-roboto font-bold leading-tight">{n.name}</h3>
                    {n.propertyCount > 0 && (
                      <p className="text-white/70 text-xs font-roboto mt-0.5">{n.propertyCount} Properties</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
          </Reveal>

          {/* CTA */}
          <Reveal>
          <div className="text-center bg-stone-50 py-12 md:py-16 px-4 md:px-6 rounded-lg">
            <h3 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-3">
              Talk to an Agent About {neighbourhood?.name}
            </h3>
            <p className="font-roboto text-stone-500 text-sm max-w-xl mx-auto mb-6">
              Our agents know {neighbourhood?.name} inside out — from the best streets and schools to off-market opportunities. Let us match you with the perfect property in this neighbourhood.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2.5 px-8 md:px-10 py-4 bg-primary text-white border-2 border-primary text-base font-roboto font-semibold tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Speak to an Agent
              <i className="ri-arrow-right-line text-sm"></i>
            </Link>
          </div>
          </Reveal>

          {/* Top Neighbourhoods Comparison Table */}
          <Reveal>
          <section className="mt-16">
            <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-2">How Nairobi Neighbourhoods Compare</h2>
            <p className="font-roboto text-stone-500 text-sm mb-6">Quick reference for the top 6 neighbourhoods — at a glance.</p>
            <div className="overflow-x-auto rounded-lg border-2 border-primary/12">
              <table className="w-full text-xs font-roboto">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Neighbourhood</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Best For</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Vibe</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Price Range</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">CBD (Normal)</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Safety</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Nightlife</th>
                    <th className="text-left p-3 font-medium text-stone-700 whitespace-nowrap">Nature</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Karen', best: 'Families, Nature', vibe: 'Quiet, Green', price: 'KES 35M–245M+', cbd: '25–35 min', safety: 'Very High', nightlife: 'Quiet', nature: 'Excellent' },
                    { name: 'Westlands', best: 'Nightlife, Business', vibe: 'Urban, Fast', price: 'KES 36M–104M', cbd: '8–15 min', safety: 'Moderate–Good', nightlife: 'Best in City', nature: 'Limited' },
                    { name: 'Kilimani', best: 'Young Pros, Walkable', vibe: 'Cosmopolitan', price: 'KES 33M–98M', cbd: '10–15 min', safety: 'Moderate', nightlife: 'Excellent', nature: 'Moderate' },
                    { name: 'Lavington', best: 'Families, Schools', vibe: 'Refined, Quiet', price: 'KES 46M–117M', cbd: '12–18 min', safety: 'High', nightlife: 'Quiet', nature: 'Good' },
                    { name: 'Gigiri', best: 'Diplomats, UN', vibe: 'International', price: 'KES 52M–143M', cbd: '20–25 min', safety: 'Very High', nightlife: 'Diplomatic', nature: 'Excellent' },
                    { name: 'Parklands', best: 'Value, Central', vibe: 'Diverse, Value', price: 'KES 28M–65M', cbd: '8–12 min', safety: 'Moderate', nightlife: 'Quiet (5 min to Westlands)', nature: 'Good' },
                  ].map((row, i) => (
                    <tr key={row.name} className={`border-b border-stone-50 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'} ${row.name.toLowerCase() === slug ? 'bg-accent-50/50' : ''}`}>
                      <td className="p-3">
                        <Link to={`/neighbourhood/${row.name.toLowerCase()}`} className="text-primary font-medium hover:underline whitespace-nowrap">
                          {row.name} {row.name.toLowerCase() === slug && <span className="text-accent-600 text-xs ml-1">(this page)</span>}
                        </Link>
                      </td>
                      <td className="p-3 text-stone-600">{row.best}</td>
                      <td className="p-3 text-stone-600">{row.vibe}</td>
                      <td className="p-3 text-stone-600 whitespace-nowrap">{row.price}</td>
                      <td className="p-3 text-stone-600 whitespace-nowrap">{row.cbd}</td>
                      <td className="p-3"><span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${row.safety.includes('Very') ? 'bg-emerald-100 text-emerald-700' : row.safety.includes('High') ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-600'}`}>{row.safety}</span></td>
                      <td className="p-3 text-stone-600">{row.nightlife}</td>
                      <td className="p-3"><span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${row.nature === 'Excellent' ? 'bg-emerald-100 text-emerald-700' : row.nature === 'Good' ? 'bg-emerald-50 text-emerald-600' : row.nature === 'Moderate' ? 'bg-stone-100 text-stone-600' : 'bg-amber-50 text-amber-600'}`}>{row.nature}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          </Reveal>
        </div>
      </main>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}