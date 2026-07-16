import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { neighborhoods as mockNeighborhoods } from '@/mocks/neighborhoods';
import { areaGuides, type AreaGuide } from '@/mocks/areaGuides';
import { blogPosts } from '@/mocks/blogPosts';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';

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
  const [areaGuide, setAreaGuide] = useState<AreaGuide | null>(null);
  const [listings, setListings] = useState<DBListing[]>([]);
  const [nearbyHoods, setNearbyHoods] = useState<DBNeighbourhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyTab, setPropertyTab] = useState<'sale' | 'rent'>('sale');
  const [galleryIndex, setGalleryIndex] = useState(0);

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
            'id, title, slug, location, price, currency, price_prefix, price_postfix, purpose, status, property_type, bedrooms, bathrooms, parking, size, main_image, cover_image, images, neighbourhood'
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
        const mockGuide = areaGuides.find((g) => g.slug === slug) || null;
        setAreaGuide(mockGuide);
      } else {
        const mockHood = mockNeighborhoods.find((n) => n.slug === slug);
        if (!mockHood) {
          setNeighbourhood(null);
          setAreaGuide(null);
          setNearbyHoods([]);
          setLoading(false);
          return;
        }

        const mockGuide = areaGuides.find((g) => g.slug === slug) || null;
        setAreaGuide(mockGuide);

        const dbStyle: DBNeighbourhood = {
          id: mockHood.id,
          name: mockHood.name,
          slug: mockHood.slug,
          city: 'Nairobi',
          country: 'Kenya',
          hero_image: mockGuide?.heroImage || mockHood.image || mockHood.hero_image,
          summary: mockGuide?.summary || mockHood.summary || mockHood.description,
          description: mockGuide?.overviewDescription || mockHood.longDescription,
          tags: mockGuide?.tags || mockHood.tags || [],
          vibe: mockHood.vibe || '',
          target_market: mockGuide?.whoItSuits || mockHood.target_market || '',
          content_html: null,
          expat_guide: null,
          practical_info: null,
          average_sale_price: mockHood.average_sale_price || null,
          rental_range_kes: mockGuide?.rentalRange || mockHood.rental_range_kes || null,
          propertyCount: mockHood.propertyCount,
        };
        setNeighbourhood(dbStyle);

        const { data: fallbackPropData } = await supabase
          .from('listings')
          .select('id, title, slug, location, price, currency, purpose, status, property_type, bedrooms, bathrooms, parking, main_image, images, neighbourhood')
          .eq('is_published', true)
          .or(`location.ilike.%${mockHood.name}%,neighbourhood.ilike.%${mockHood.name}%`);
        const fallbackProps = (fallbackPropData || []) as Record<string, unknown>[];
        const mockAsDB: DBListing[] = fallbackProps.map((p) => ({
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
      }
    } catch {
      const mockHood = mockNeighborhoods.find((n) => n.slug === slug);
      if (!mockHood) {
        setNeighbourhood(null);
        setAreaGuide(null);
        setNearbyHoods([]);
        setLoading(false);
        return;
      }

      const mockGuide = areaGuides.find((g) => g.slug === slug) || null;
      setAreaGuide(mockGuide);

      const dbStyle: DBNeighbourhood = {
        id: mockHood.id,
        name: mockHood.name,
        slug: mockHood.slug,
        city: 'Nairobi',
        country: 'Kenya',
        hero_image: mockGuide?.heroImage || mockHood.image || mockHood.hero_image,
        summary: mockGuide?.summary || mockHood.summary || mockHood.description,
        description: mockGuide?.overviewDescription || mockHood.longDescription,
        tags: mockGuide?.tags || mockHood.tags || [],
        vibe: mockHood.vibe || '',
        target_market: mockGuide?.whoItSuits || mockHood.target_market || '',
        content_html: null,
        expat_guide: null,
        practical_info: null,
        average_sale_price: mockHood.average_sale_price || null,
        rental_range_kes: mockGuide?.rentalRange || mockHood.rental_range_kes || null,
        propertyCount: mockHood.propertyCount,
      };
      setNeighbourhood(dbStyle);

      let fallbackProps2: Record<string, unknown>[] = [];
      try {
        const { data: fallbackData } = await supabase
          .from('listings')
          .select('id, title, slug, location, price, currency, purpose, status, property_type, bedrooms, bathrooms, parking, main_image, images, neighbourhood')
          .eq('is_published', true)
          .or(`location.ilike.%${mockHood.name}%,neighbourhood.ilike.%${mockHood.name}%`);
        fallbackProps2 = (fallbackData || []) as Record<string, unknown>[];
      } catch {
        // silently continue with empty
      }
      const mockAsDB2: DBListing[] = fallbackProps2.map((p) => ({
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
      setListings(mockAsDB2);

      const nearbyMock2 = mockNeighborhoods
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
      setNearbyHoods(nearbyMock2);
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

  const relatedBlogPosts = areaGuide
    ? blogPosts.filter((bp) => areaGuide.relatedArticleSlugs.includes(bp.slug))
    : [];

  const galleryImages = areaGuide ? areaGuide.gallery : [];

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
          <h1 className="font-roboto font-bold text-3xl md:text-5xl text-white mb-4 leading-tight">
            {areaGuide?.headline || `${neighbourhood?.name} Area Guide`}
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
                <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                  <p className="font-roboto text-stone-400 text-xs uppercase tracking-wider mb-1">Price Range (2026)</p>
                  <p className="font-roboto text-primary text-sm font-semibold">{areaGuide?.priceRange || 'Contact us'}</p>
                </div>
                <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                  <p className="font-roboto text-stone-400 text-xs uppercase tracking-wider mb-1">Rental Range</p>
                  <p className="font-roboto text-primary text-sm font-semibold">{areaGuide?.rentalRange || neighbourhood?.rental_range_kes || 'Contact us'}</p>
                </div>
                <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                  <p className="font-roboto text-stone-400 text-xs uppercase tracking-wider mb-1">Best Suited For</p>
                  <p className="font-roboto text-stone-600 text-xs leading-relaxed">{areaGuide?.whoItSuits || neighbourhood?.target_market || ''}</p>
                </div>
              </div>
            </section>
          </Reveal>

          {/* Area Guide rich content — only when mock data is available */}
          {areaGuide && (
            <>
              {/* Distance & Transportation */}
              <Reveal>
                <section className="mb-12 md:mb-16">
                  <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Distance &amp; Transportation from CBD</h2>
                  <div className="bg-stone-50 p-5 md:p-6 rounded-lg border border-stone-100 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <span className="font-roboto text-stone-400 text-xs uppercase tracking-wider block mb-1">Distance from CBD</span>
                        <p className="font-roboto text-stone-700 text-sm font-medium">{areaGuide.transportation.distanceFromCBD}</p>
                      </div>
                      <div>
                        <span className="font-roboto text-stone-400 text-xs uppercase tracking-wider block mb-1">Normal (Car/Uber)</span>
                        <p className="font-roboto text-stone-700 text-sm font-medium">{areaGuide.transportation.normalTimeCar}</p>
                      </div>
                      <div>
                        <span className="font-roboto text-stone-400 text-xs uppercase tracking-wider block mb-1">Peak Hours</span>
                        <p className="font-roboto text-amber-700 text-sm font-medium">{areaGuide.transportation.peakTimeCar}</p>
                      </div>
                    </div>
                    <div>
                      <span className="font-roboto text-stone-400 text-xs uppercase tracking-wider block mb-1">Transport Options</span>
                      <p className="font-roboto text-stone-600 text-sm leading-relaxed">{areaGuide.transportation.modesAvailable}</p>
                    </div>
                    <div className="bg-white p-4 rounded-md border border-stone-100">
                      <p className="font-roboto text-stone-500 text-xs uppercase tracking-wider mb-1">Traffic Notes &amp; Tips</p>
                      <p className="font-roboto text-stone-600 text-xs leading-relaxed">{areaGuide.transportation.trafficNotes}</p>
                    </div>
                  </div>
                </section>
              </Reveal>

              {/* Key Landmarks & Attractions */}
              {areaGuide.keyLandmarks && areaGuide.keyLandmarks.length > 0 && (
                <Reveal>
                  <section className="mb-12 md:mb-16">
                    <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Key Landmarks &amp; Attractions</h2>
                    <div className="space-y-4">
                      {areaGuide.keyLandmarks.map((lm, i) => (
                        <div key={i} className="bg-stone-50 p-4 md:p-5 rounded-lg border border-stone-100">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-9 h-9 flex items-center justify-center bg-accent-500/10 rounded-full shrink-0 mt-0.5">
                              <i className="ri-map-pin-2-line text-accent-600 text-base"></i>
                            </div>
                            <div>
                              {lm.website ? (
                                <a href={lm.website} target="_blank" rel="noopener noreferrer" className="font-roboto font-bold text-sm text-primary hover:underline inline-flex items-center gap-1 mb-0.5">
                                  {lm.name}
                                  <i className="ri-external-link-line text-xs text-stone-400"></i>
                                </a>
                              ) : (
                                <h4 className="font-roboto font-bold text-sm text-primary mb-0.5">{lm.name}</h4>
                              )}
                              <p className="font-roboto text-stone-600 text-sm leading-relaxed">{lm.highlights}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-12">
                            <div className="bg-white p-3 rounded-md border border-stone-100">
                              <p className="font-roboto text-stone-400 text-xs uppercase tracking-wider mb-1">Why Visit</p>
                              <p className="font-roboto text-stone-600 text-xs leading-relaxed">{lm.whyVisit}</p>
                            </div>
                            <div className="bg-white p-3 rounded-md border border-stone-100">
                              <p className="font-roboto text-stone-400 text-xs uppercase tracking-wider mb-1">Location</p>
                              <p className="font-roboto text-stone-600 text-xs leading-relaxed">{lm.location}</p>
                            </div>
                            <div className="bg-white p-3 rounded-md border border-stone-100">
                              <p className="font-roboto text-stone-400 text-xs uppercase tracking-wider mb-1">Practical Info</p>
                              <p className="font-roboto text-stone-600 text-xs leading-relaxed">{lm.practicalInfo}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </Reveal>
              )}

              {/* Schools */}
              <Reveal>
                <section className="mb-12 md:mb-16">
                  <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Schools</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {areaGuide.schools.map((school, i) => (
                      <div key={i} className="bg-stone-50 p-4 md:p-5 rounded-lg border border-stone-100">
                        {school.website ? (
                          <a href={school.website} target="_blank" rel="noopener noreferrer" className="font-roboto font-bold text-sm text-primary hover:underline inline-flex items-center gap-1 mb-1">
                            {school.name}
                            <i className="ri-external-link-line text-xs text-stone-400"></i>
                          </a>
                        ) : (
                          <h4 className="font-roboto font-bold text-sm text-primary mb-1">{school.name}</h4>
                        )}
                        <p className="font-roboto text-stone-500 text-xs leading-relaxed">{school.description}</p>
                      </div>
                    ))}
                  </div>
                  <p className="font-roboto text-stone-400 text-xs mt-3 italic">School details should be verified directly with each institution before publishing.</p>
                </section>
              </Reveal>

              {/* Shopping & Malls */}
              <Reveal>
                <section className="mb-12 md:mb-16">
                  <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Shopping &amp; Malls</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {areaGuide.malls.map((mall, i) => (
                      <div key={i} className="bg-stone-50 p-4 md:p-5 rounded-lg border border-stone-100">
                        {mall.website ? (
                          <a href={mall.website} target="_blank" rel="noopener noreferrer" className="font-roboto font-bold text-sm text-primary hover:underline inline-flex items-center gap-1 mb-1">
                            {mall.name}
                            <i className="ri-external-link-line text-xs text-stone-400"></i>
                          </a>
                        ) : (
                          <h4 className="font-roboto font-bold text-sm text-primary mb-1">{mall.name}</h4>
                        )}
                        <p className="font-roboto text-stone-500 text-xs leading-relaxed">{mall.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </Reveal>

              {/* Restaurants & Dining */}
              <Reveal>
                <section className="mb-12 md:mb-16">
                  <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Restaurants &amp; Dining</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {areaGuide.restaurants.map((r, i) => (
                      <div key={i} className="bg-stone-50 p-4 md:p-5 rounded-lg border border-stone-100">
                        {r.website ? (
                          <a href={r.website} target="_blank" rel="noopener noreferrer" className="font-roboto font-bold text-sm text-primary hover:underline inline-flex items-center gap-1 mb-1">
                            {r.name}
                            <i className="ri-external-link-line text-xs text-stone-400"></i>
                          </a>
                        ) : (
                          <h4 className="font-roboto font-bold text-sm text-primary mb-1">{r.name}</h4>
                        )}
                        <p className="font-roboto text-stone-500 text-xs leading-relaxed">{r.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </Reveal>

              {/* Accommodation */}
              {areaGuide.accommodation && areaGuide.accommodation.length > 0 && (
                <Reveal>
                  <section className="mb-12 md:mb-16">
                    <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Accommodation</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {areaGuide.accommodation.map((acc, i) => (
                        <div key={i} className="bg-stone-50 p-4 md:p-5 rounded-lg border border-stone-100 flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            acc.tier.toLowerCase().includes('ultra') || acc.tier.toLowerCase().includes('luxury') ? 'bg-accent-500' : acc.tier.toLowerCase().includes('mid') ? 'bg-primary/60' : 'bg-stone-400'
                          }`}></div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              {acc.website ? (
                                <a href={acc.website} target="_blank" rel="noopener noreferrer" className="font-roboto font-bold text-sm text-primary hover:underline inline-flex items-center gap-1">
                                  {acc.name}
                                  <i className="ri-external-link-line text-xs text-stone-400"></i>
                                </a>
                              ) : (
                                <h4 className="font-roboto font-bold text-sm text-primary">{acc.name}</h4>
                              )}
                              <span className="px-1.5 py-0.5 bg-stone-200 text-stone-500 text-[9px] font-roboto rounded-full whitespace-nowrap">{acc.tier}</span>
                            </div>
                            <p className="font-roboto text-stone-500 text-xs leading-relaxed">{acc.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </Reveal>
              )}

              {/* Nightlife, Clubs & Social Activities */}
              <Reveal>
                <section className="mb-12 md:mb-16">
                  <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Nightlife, Clubs &amp; Social Activities</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                      <div className="w-8 h-8 flex items-center justify-center bg-accent-500/10 rounded-full mb-3">
                        <i className="ri-drinks-line text-accent-600"></i>
                      </div>
                      <h4 className="font-roboto font-bold text-sm text-primary mb-1">Bars</h4>
                      <p className="font-roboto text-stone-500 text-xs leading-relaxed">{areaGuide.nightlife.bars}</p>
                    </div>
                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                      <div className="w-8 h-8 flex items-center justify-center bg-accent-500/10 rounded-full mb-3">
                        <i className="ri-music-line text-accent-600"></i>
                      </div>
                      <h4 className="font-roboto font-bold text-sm text-primary mb-1">Clubs</h4>
                      <p className="font-roboto text-stone-500 text-xs leading-relaxed">{areaGuide.nightlife.clubs}</p>
                    </div>
                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                      <div className="w-8 h-8 flex items-center justify-center bg-accent-500/10 rounded-full mb-3">
                        <i className="ri-mic-line text-accent-600"></i>
                      </div>
                      <h4 className="font-roboto font-bold text-sm text-primary mb-1">Live Music</h4>
                      <p className="font-roboto text-stone-500 text-xs leading-relaxed">{areaGuide.nightlife.liveMusic}</p>
                    </div>
                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                      <div className="w-8 h-8 flex items-center justify-center bg-accent-500/10 rounded-full mb-3">
                        <i className="ri-heart-line text-accent-600"></i>
                      </div>
                      <h4 className="font-roboto font-bold text-sm text-primary mb-1">Inclusive Spaces</h4>
                      <p className="font-roboto text-stone-500 text-xs leading-relaxed">{areaGuide.nightlife.inclusiveSpaces}</p>
                    </div>
                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100 sm:col-span-2">
                      <div className="w-8 h-8 flex items-center justify-center bg-accent-500/10 rounded-full mb-3">
                        <i className="ri-calendar-event-line text-accent-600"></i>
                      </div>
                      <h4 className="font-roboto font-bold text-sm text-primary mb-1">Social Events &amp; Community</h4>
                      <p className="font-roboto text-stone-500 text-xs leading-relaxed">{areaGuide.nightlife.socialEvents}</p>
                    </div>
                  </div>
                </section>
              </Reveal>

              {/* Art, Culture & Interesting Spots */}
              {areaGuide.artCulture && areaGuide.artCulture.length > 0 && (
                <Reveal>
                  <section className="mb-12 md:mb-16">
                    <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Art, Culture &amp; Interesting Spots</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {areaGuide.artCulture.map((ac, i) => (
                        <div key={i} className="bg-stone-50 p-4 md:p-5 rounded-lg border border-stone-100">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-accent-100 text-accent-700 text-xs font-roboto font-medium rounded-full">{ac.type}</span>
                          </div>
                          {ac.website ? (
                            <a href={ac.website} target="_blank" rel="noopener noreferrer" className="font-roboto font-bold text-sm text-primary hover:underline inline-flex items-center gap-1 mb-1">
                              {ac.name}
                              <i className="ri-external-link-line text-xs text-stone-400"></i>
                            </a>
                          ) : (
                            <h4 className="font-roboto font-bold text-sm text-primary mb-1">{ac.name}</h4>
                          )}
                          <p className="font-roboto text-stone-500 text-xs leading-relaxed">{ac.description}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </Reveal>
              )}

              {/* Sports & Recreation */}
              <Reveal>
                <section className="mb-12 md:mb-16">
                  <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Sports &amp; Recreation</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                      <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full mb-3">
                        <i className="ri-heart-pulse-line text-primary"></i>
                      </div>
                      <h4 className="font-roboto font-bold text-sm text-primary mb-1">Gyms &amp; Fitness</h4>
                      <p className="font-roboto text-stone-500 text-xs leading-relaxed">{areaGuide.sportsRecreation.gyms}</p>
                    </div>
                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                      <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full mb-3">
                        <i className="ri-football-line text-primary"></i>
                      </div>
                      <h4 className="font-roboto font-bold text-sm text-primary mb-1">Sports Facilities</h4>
                      <p className="font-roboto text-stone-500 text-xs leading-relaxed">{areaGuide.sportsRecreation.sports}</p>
                    </div>
                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                      <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full mb-3">
                        <i className="ri-walk-line text-primary"></i>
                      </div>
                      <h4 className="font-roboto font-bold text-sm text-primary mb-1">Hiking &amp; Outdoor</h4>
                      <p className="font-roboto text-stone-500 text-xs leading-relaxed">{areaGuide.sportsRecreation.hiking}</p>
                    </div>
                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                      <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full mb-3">
                        <i className="ri-bike-line text-primary"></i>
                      </div>
                      <h4 className="font-roboto font-bold text-sm text-primary mb-1">Other Activities</h4>
                      <p className="font-roboto text-stone-500 text-xs leading-relaxed">{areaGuide.sportsRecreation.other}</p>
                    </div>
                  </div>
                </section>
              </Reveal>

              {/* Safety & Practical Tips */}
              <Reveal>
                <section className="mb-12 md:mb-16">
                  <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Safety &amp; Practical Tips</h2>
                  <div className="bg-stone-50 p-5 md:p-6 rounded-lg border border-stone-100 space-y-4">
                    <div>
                      <span className="font-roboto text-stone-400 text-xs uppercase tracking-wider block mb-1">Safety Summary</span>
                      <p className="font-roboto text-stone-700 text-sm leading-relaxed font-medium">{areaGuide.safetyTips.summary}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="font-roboto text-stone-400 text-xs uppercase tracking-wider block mb-1">Best Times to Explore</span>
                        <p className="font-roboto text-stone-600 text-xs leading-relaxed">{areaGuide.safetyTips.bestTimes}</p>
                      </div>
                      <div>
                        <span className="font-roboto text-stone-400 text-xs uppercase tracking-wider block mb-1">Neighbourhood Advice</span>
                        <p className="font-roboto text-stone-600 text-xs leading-relaxed">{areaGuide.safetyTips.tips}</p>
                      </div>
                    </div>
                  </div>
                </section>
              </Reveal>

              {/* Anything Else Interesting */}
              {areaGuide.interestingInfo && areaGuide.interestingInfo.length > 0 && (
                <Reveal>
                  <section className="mb-12 md:mb-16">
                    <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Anything Else Interesting</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {areaGuide.interestingInfo.map((info, i) => (
                        <div key={i} className="bg-stone-50 p-4 md:p-5 rounded-lg border border-stone-100">
                          <h4 className="font-roboto font-bold text-sm text-primary mb-1 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-accent-500 rounded-full shrink-0"></span>
                            {info.title}
                          </h4>
                          <p className="font-roboto text-stone-500 text-xs leading-relaxed">{info.description}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </Reveal>
              )}

              {/* What's Trending */}
              <Reveal>
                <section className="mb-12 md:mb-16">
                  <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">What&apos;s Trending in {neighbourhood?.name} (2026)</h2>
                  <div className="bg-stone-50 p-5 md:p-6 rounded-lg border border-stone-100">
                    <p className="font-roboto text-stone-600 text-sm leading-relaxed whitespace-pre-line">
                      {areaGuide.trending}
                    </p>
                  </div>
                </section>
              </Reveal>

              {/* Lifestyle & Amenities */}
              <Reveal>
                <section className="mb-12 md:mb-16">
                  <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Lifestyle &amp; Amenities</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                      <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full mb-3">
                        <i className="ri-leaf-line text-primary"></i>
                      </div>
                      <h4 className="font-roboto font-bold text-sm text-primary mb-1">Nature &amp; Recreation</h4>
                      <p className="font-roboto text-stone-500 text-xs leading-relaxed">{areaGuide.lifestyle.parks}</p>
                    </div>
                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                      <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full mb-3">
                        <i className="ri-heart-pulse-line text-primary"></i>
                      </div>
                      <h4 className="font-roboto font-bold text-sm text-primary mb-1">Fitness &amp; Wellness</h4>
                      <p className="font-roboto text-stone-500 text-xs leading-relaxed">{areaGuide.lifestyle.gyms}</p>
                    </div>
                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                      <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full mb-3">
                        <i className="ri-hospital-line text-primary"></i>
                      </div>
                      <h4 className="font-roboto font-bold text-sm text-primary mb-1">Healthcare</h4>
                      <p className="font-roboto text-stone-500 text-xs leading-relaxed">{areaGuide.lifestyle.healthcare}</p>
                    </div>
                  </div>
                </section>
              </Reveal>

              {/* Wildlife & Attractions — for neighbourhoods with nature/wildlife draws */}
              {areaGuide && areaGuide.wildlifeAttractions.length > 0 && (
                <Reveal>
                <section className="mb-12 md:mb-16">
                  <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-2">Wildlife &amp; Attractions</h2>
                  <p className="font-roboto text-stone-500 text-sm mb-6">
                    {neighbourhood?.name} is uniquely positioned for world-class wildlife experiences right on Nairobi&apos;s doorstep. Here are the standout attractions you should not miss.
                  </p>
                  <div className="space-y-5">
                    {areaGuide.wildlifeAttractions.map((attraction, i) => (
                      <div key={i} className="bg-stone-50 p-5 md:p-6 rounded-lg border border-stone-100">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full shrink-0 mt-0.5">
                            <i className="ri-compass-3-line text-primary text-lg"></i>
                          </div>
                          <div>
                            {attraction.website ? (
                              <a href={attraction.website} target="_blank" rel="noopener noreferrer" className="font-roboto font-bold text-base text-primary hover:underline inline-flex items-center gap-1 mb-1">
                                {attraction.name}
                                <i className="ri-external-link-line text-xs text-stone-400"></i>
                              </a>
                            ) : (
                              <h4 className="font-roboto font-bold text-base text-primary mb-1">{attraction.name}</h4>
                            )}
                            <p className="font-roboto text-stone-600 text-sm leading-relaxed">{attraction.highlights}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-13">
                          <div className="bg-white p-3 rounded-md border border-stone-100">
                            <p className="font-roboto text-stone-400 text-xs uppercase tracking-wider mb-1">Why Visit</p>
                            <p className="font-roboto text-stone-600 text-xs leading-relaxed">{attraction.whyVisit}</p>
                          </div>
                          <div className="bg-white p-3 rounded-md border border-stone-100">
                            <p className="font-roboto text-stone-400 text-xs uppercase tracking-wider mb-1">Location</p>
                            <p className="font-roboto text-stone-600 text-xs leading-relaxed">{attraction.location}</p>
                          </div>
                          <div className="bg-white p-3 rounded-md border border-stone-100">
                            <p className="font-roboto text-stone-400 text-xs uppercase tracking-wider mb-1">Practical Info</p>
                            <p className="font-roboto text-stone-600 text-xs leading-relaxed">{attraction.practicalInfo}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 bg-accent-100/50 p-4 md:p-5 rounded-lg border border-accent-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-accent-500/10 rounded-full shrink-0">
                        <i className="ri-lightbulb-line text-accent-600"></i>
                      </div>
                      <div>
                        <h4 className="font-roboto font-bold text-sm text-primary mb-1">Suggested Wildlife Day Itinerary</h4>
                        <p className="font-roboto text-stone-600 text-xs leading-relaxed">
                          <strong>Morning:</strong> David Sheldrick Elephant Orphanage (book ahead) + Nairobi National Park game drive. {' '}
                          <strong>Midday:</strong> Lunch in Karen at Talisman or a farm-to-table spot. {' '}
                          <strong>Afternoon:</strong> Giraffe Centre + Karen Blixen Museum. {' '}
                          <strong>Optional:</strong> Kazuri Beads Factory (women&apos;s cooperative) or a longer park visit. Many operators offer convenient half-day or full-day combo tours covering Giraffe Centre + Sheldrick + Blixen Museum from Nairobi hotels.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
                </Reveal>
              )}

              {/* Photo Gallery */}
              {galleryImages.length > 0 && (
                <Reveal>
                <section className="mb-12 md:mb-16">
                  <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Photo Gallery</h2>
                  <div className="mb-4">
                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-stone-100">
                      <img
                        alt={`${neighbourhood?.name} gallery`}
                        className="w-full h-full object-cover object-top"
                        src={galleryImages[galleryIndex]}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {galleryImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setGalleryIndex(i)}
                        className={`relative aspect-[4/3] rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                          i === galleryIndex ? 'border-primary' : 'border-transparent hover:border-stone-300'
                        }`}
                      >
                        <img
                          alt={`${neighbourhood?.name} thumbnail ${i + 1}`}
                          className="w-full h-full object-cover object-top"
                          src={img}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="font-roboto text-stone-400 text-xs mt-2 italic">Images are placeholder photography. Tag each image clearly in the CMS so real photography can be swapped in later.</p>
                </section>
                </Reveal>
              )}
            </>
          )}

          {/* Map */}
          <Reveal>
          <section className="mb-12 md:mb-16">
            <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Location</h2>
            <div className="w-full h-64 md:h-80 rounded-lg overflow-hidden border border-stone-200">
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
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-roboto font-medium text-stone-500 hover:text-primary transition-colors whitespace-nowrap"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(propertyTab === 'sale' ? saleListings : rentListings).map((p) => (
                      <Link
                        key={p.id}
                        to={`/property/${p.slug}`}
                        className="group cursor-pointer block bg-white rounded-lg overflow-hidden border border-stone-100 hover:border-stone-200 transition-all duration-300"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <img
                            alt={p.title}
                            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                            src={p.main_image || p.cover_image || (p.images && p.images[0]) || ''}
                          />
                          <div className={`absolute top-2.5 left-2.5 px-2 py-0.5 text-white text-xs font-roboto font-medium uppercase tracking-wider rounded-sm ${
                            propertyTab === 'sale' ? 'bg-primary/90' : 'bg-emerald-600/90'
                          }`}>
                            {propertyTab === 'sale' ? 'For Sale' : 'To Let'}
                          </div>
                        </div>
                        <div className="p-3.5 md:p-4">
                          <p className="text-golden text-xs font-roboto font-semibold uppercase tracking-wider mb-1">
                            {p.property_type}
                          </p>
                          <h3 className="font-roboto font-bold text-sm md:text-base text-primary leading-snug mb-2 line-clamp-2">
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
                          </div>
                          <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
                            <p className="font-roboto text-primary text-sm font-semibold">{formatPrice(p)}</p>
                            {propertyTab === 'rent' && (
                              <p className="font-roboto text-stone-400 text-xs uppercase">per month</p>
                            )}
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
                    <p className="font-roboto font-bold text-base text-primary mb-1">
                      No Properties {propertyTab === 'sale' ? 'For Sale' : 'To Let'}
                    </p>
                    <p className="font-roboto text-stone-400 text-xs max-w-md mx-auto mb-4">
                      New listings come in regularly in {neighbourhood?.name}. Register your interest to be notified first.
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
              </>
            )}
          </section>
          </Reveal>

          {/* Related Articles */}
          {relatedBlogPosts.length > 0 && (
            <Reveal>
            <section className="mb-12 md:mb-16">
              <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-4">Related Articles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {relatedBlogPosts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group cursor-pointer block bg-white rounded-lg overflow-hidden border border-stone-100 hover:border-stone-200 transition-all duration-300"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        alt={post.title}
                        className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                        src={post.featured_image}
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-0.5 bg-primary/90 text-white text-xs font-roboto font-medium rounded-full">
                          {post.categoryTag}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-roboto font-bold text-sm text-primary leading-snug mb-2 line-clamp-2 group-hover:text-primary/80 transition-colors">
                        {post.title}
                      </h3>
                      <p className="font-roboto text-stone-500 text-sm leading-relaxed line-clamp-2 mb-3">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-2 text-xs font-roboto text-stone-400">
                        <span>{post.author}</span>
                        <span>&middot;</span>
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
            </Reveal>
          )}

          {/* Nearby Areas */}
          <Reveal>
          <section className="mb-12 md:mb-16">
            <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-5">Explore Nearby Areas</h2>
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
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-roboto font-medium tracking-wider uppercase hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Speak to an Agent
              <i className="ri-arrow-right-line text-xs"></i>
            </Link>
          </div>
          </Reveal>

          {/* Top Neighbourhoods Comparison Table */}
          <Reveal>
          <section className="mt-16">
            <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary mb-2">How Nairobi Neighbourhoods Compare</h2>
            <p className="font-roboto text-stone-500 text-sm mb-6">Quick reference for the top 6 neighbourhoods — at a glance.</p>
            <div className="overflow-x-auto rounded-lg border border-stone-100">
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
            <p className="font-roboto text-stone-400 text-xs mt-2 italic">
              Comparison is indicative based on 2026 market data. Individual experience varies. Visit each neighbourhood page for the full guide.
            </p>
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

function parsePrice(priceStr: string): number {
  const clean = priceStr.replace(/[^0-9.]/g, '');
  const val = parseFloat(clean);
  if (priceStr.includes('M') && val < 1000) return val * 1_000_000;
  if (priceStr.includes('K') && val < 1000) return val * 1_000;
  return val || 0;
}