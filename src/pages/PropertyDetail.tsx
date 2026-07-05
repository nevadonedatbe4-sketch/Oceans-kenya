import { useState, useEffect } from 'react';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface ListingDetail {
  id: string;
  slug: string;
  title: string;
  propertyType: string;
  location: string;
  district: string;
  area: string;
  price: string;
  description: string;
  image: string;
  beds: number | null;
  baths: number | null;
  parking: number | null;
  sqft: number | null;
  status: string;
  category: string;
  size: string;
  titleType: string;
  ref: string;
  purpose: string;
  neighbourhood: string;
  latitude: number | null;
  longitude: number | null;
}

export default function PropertyDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchListing() {
      setLoading(true);
      setError('');
      try {
        const { data, error: dbError } = await supabase
          .from('listings')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (dbError) throw dbError;
        if (cancelled) return;

        if (!data) {
          setListing(null);
          setLoading(false);
          return;
        }

        const row = data as Record<string, unknown>;
        const currencyLabel = String(row.currency || '').toUpperCase() === 'UGX' ? 'UGX'
          : String(row.currency || '').toUpperCase() === 'USD' ? 'USD'
          : 'KSh';
        const priceVal = row.price ? Number(row.price) : 0;
        let priceDisplay = 'On request';
        if (priceVal > 0) {
          if (priceVal >= 1_000_000) {
            priceDisplay = `${currencyLabel} ${(priceVal / 1_000_000).toFixed(priceVal % 1_000_000 === 0 ? 0 : 1)}M`;
          } else {
            priceDisplay = `${currencyLabel} ${priceVal.toLocaleString()}`;
          }
        }

        const isLand = String(row.property_type || '') === 'land';

        setListing({
          id: String(row.id),
          slug: String(row.slug || ''),
          title: String(row.title || ''),
          propertyType: String(row.property_type || ''),
          location: String(row.location || ''),
          district: String(row.state_region || row.location || ''),
          area: String(row.location || ''),
          price: priceDisplay,
          description: String(row.description || ''),
          image: String(row.main_image || row.cover_image || ''),
          beds: row.bedrooms ? Number(row.bedrooms) : null,
          baths: row.bathrooms ? Number(row.bathrooms) : null,
          parking: row.parking ? Number(row.parking) : null,
          sqft: row.sqft ? Number(row.sqft) : null,
          status: String(row.status || 'available'),
          category: isLand
            ? (row.sub_type === 'joint_venture' ? 'joint_venture' : 'outright')
            : String(row.purpose || 'sale'),
          size: isLand
            ? (row.land_size ? `${row.land_size} ${row.land_unit || 'acres'}` : (row.size ? `${row.size} ${row.size_unit || 'sqm'}` : ''))
            : (row.sqft ? `${Number(row.sqft).toLocaleString()} sqft` : ''),
          titleType: (row.custom_fields as Record<string, unknown> | null)?.title_type as string || 'Freehold',
          ref: String(row.property_id || `LIST-${String(row.id).slice(0, 6)}`),
          purpose: String(row.purpose || 'sale'),
          neighbourhood: String(row.neighbourhood || ''),
          latitude: row.latitude ? Number(row.latitude) : null,
          longitude: row.longitude ? Number(row.longitude) : null,
        });
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load listing');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (slug) fetchListing();
    return () => { cancelled = true; };
  }, [slug]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
        <Header />
        <main className="px-6 py-10 md:py-14">
          <div className="max-w-6xl mx-auto animate-pulse">
            <div className="aspect-[21/7] bg-stone-200 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-4 bg-stone-200 rounded w-40" />
                <div className="h-8 bg-stone-200 rounded w-3/4" />
                <div className="h-4 bg-stone-200 rounded w-1/2" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-16 bg-stone-200 rounded" />
                  <div className="h-16 bg-stone-200 rounded" />
                  <div className="h-16 bg-stone-200 rounded" />
                </div>
                <div className="h-32 bg-stone-200 rounded" />
              </div>
              <div className="lg:col-span-1 space-y-4">
                <div className="h-48 bg-stone-200 rounded" />
                <div className="h-36 bg-stone-200 rounded" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
        <Header />
        <main className="pt-16 pb-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded-full mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-400"></i>
            </div>
            <h1 className="font-prata text-2xl md:text-3xl text-primary mb-3">Something went wrong</h1>
            <p className="font-roboto text-stone-500 mb-6">{error}</p>
            <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
              <i className="ri-arrow-left-line"></i>Back to Home
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  // Not found
  if (!listing) {
    return (
      <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
        <Header />
        <main className="pt-16 pb-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-stone-400"></i>
            </div>
            <h1 className="font-prata text-2xl md:text-3xl text-primary mb-3">Listing Not Found</h1>
            <p className="font-roboto text-stone-500 mb-6">This listing does not exist or may have been removed.</p>
            <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
              <i className="ri-arrow-left-line"></i>Back to Home
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  const isLand = listing.propertyType === 'land';

  const mapQuery = listing.latitude && listing.longitude
    ? `${listing.latitude},${listing.longitude}`
    : encodeURIComponent(`${listing.district}, ${listing.area}`);

  const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&z=14&ie=UTF8&iwloc=&output=embed`;

  const breadcrumbCategory = isLand
    ? { label: 'Joint Ventures', href: '/joint-ventures' }
    : listing.purpose === 'rent'
      ? { label: 'Rent', href: '/rent' }
      : { label: 'Buy', href: '/buy' };

  return (
    <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
      <Header />

      {/* ---- LAND LISTING LAYOUT ---- */}
      {isLand && (
        <main>
          {/* Breadcrumb */}
          <div className="px-6 py-3 bg-stone-50 border-b border-stone-100">
            <div className="max-w-6xl mx-auto">
              <nav className="flex items-center gap-2 text-xs font-roboto">
                <Link to="/" className="text-stone-400 hover:text-primary transition-colors cursor-pointer whitespace-nowrap">Home</Link>
                <span className="text-stone-300">/</span>
                <Link to={breadcrumbCategory.href} className="text-stone-400 hover:text-primary transition-colors cursor-pointer whitespace-nowrap">{breadcrumbCategory.label}</Link>
                <span className="text-stone-300">/</span>
                <span className="text-primary font-semibold truncate max-w-[300px]">{listing.title}</span>
              </nav>
            </div>
          </div>

          <section className="relative overflow-hidden">
            <div className="aspect-[21/9] md:aspect-[21/7] overflow-hidden bg-stone-100">
              {listing.image ? (
                <img
                  alt={listing.title}
                  className="w-full h-full object-cover object-top"
                  src={listing.image}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="ri-landscape-line text-5xl text-stone-300 block"></i>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
            </div>
          </section>

          <section className="px-6 py-10 md:py-14">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                <div className="lg:col-span-2">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="px-2 py-0.5 bg-white border border-stone-200 text-primary font-roboto text-[10px] font-semibold tracking-wider">
                      {listing.ref}
                    </span>
                    <span className={`px-2.5 py-0.5 font-roboto text-[10px] uppercase tracking-wider text-white ${
                      listing.category === 'joint_venture' ? 'bg-accent' : 'bg-golden'
                    }`}>
                      {listing.category === 'joint_venture' ? 'Joint Venture' : 'For Sale'}
                    </span>
                  </div>
                  <h1 className="font-prata text-2xl md:text-3xl text-primary mb-4">{listing.title}</h1>
                  <p className="flex items-center gap-1.5 text-sm text-stone-500 mb-6">
                    <i className="ri-map-pin-2-line text-golden"></i>
                    {listing.district}, {listing.area}
                  </p>
                  <div className="grid grid-cols-3 gap-4 mb-8 p-5 bg-stone-50 border border-stone-100">
                    <div>
                      <p className="text-stone-400 font-roboto text-[10px] uppercase tracking-wider mb-1">Size</p>
                      <p className="text-primary font-roboto text-base font-semibold">{listing.size}</p>
                    </div>
                    <div>
                      <p className="text-stone-400 font-roboto text-[10px] uppercase tracking-wider mb-1">Title Type</p>
                      <p className="text-primary font-roboto text-base font-semibold">{listing.titleType}</p>
                    </div>
                    <div>
                      <p className="text-stone-400 font-roboto text-[10px] uppercase tracking-wider mb-1">Price</p>
                      <p className="text-golden font-roboto text-base font-semibold">{listing.price}</p>
                    </div>
                  </div>
                  <div className="mb-8">
                    <h2 className="font-prata text-primary text-lg mb-3">About This Plot</h2>
                    <p className="text-stone-600 font-roboto text-sm leading-relaxed">{listing.description}</p>
                  </div>
                  <div className="mb-8">
                    <h2 className="font-prata text-primary text-lg mb-3">Location</h2>
                    <div className="aspect-[16/9] rounded-sm overflow-hidden border border-stone-200">
                      <iframe
                        src={mapSrc}
                        className="w-full h-full"
                        loading="lazy"
                        title={`Map of ${listing.title}`}
                        allowFullScreen
                      ></iframe>
                    </div>
                    <p className="text-stone-400 font-roboto text-xs mt-2 flex items-center gap-1.5">
                      <i className="ri-map-pin-2-line text-golden"></i>
                      {listing.district}{listing.area ? `, ${listing.area}` : ''}
                    </p>
                  </div>
                  <div className="bg-primary p-6 md:p-8">
                    <h3 className="font-prata text-white text-lg mb-2">Interested in this plot?</h3>
                    <p className="text-white/60 font-roboto text-sm mb-5">Submit your enquiry and a partner manager will reach out with full disclosure, site visit options, and next steps.</p>
                    <Link
                      to="/joint-ventures#request-desk"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-golden text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity"
                    >
                      <i className="ri-mail-send-line"></i>Enquire About This Plot
                    </Link>
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <div className="sticky top-28 space-y-5">
                    <div className="border border-stone-200 p-5">
                      <h3 className="font-prata text-primary text-sm mb-4 pb-3 border-b border-stone-100">Quick Facts</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 font-roboto text-xs">Reference</span>
                          <span className="text-primary font-roboto text-xs font-semibold">{listing.ref}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 font-roboto text-xs">Category</span>
                          <span className="text-primary font-roboto text-xs font-semibold capitalize">{listing.category === 'joint_venture' ? 'Joint Venture' : 'Outright Purchase'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 font-roboto text-xs">Size</span>
                          <span className="text-primary font-roboto text-xs font-semibold">{listing.size}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 font-roboto text-xs">Title</span>
                          <span className="text-primary font-roboto text-xs font-semibold">{listing.titleType}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 font-roboto text-xs">District</span>
                          <span className="text-primary font-roboto text-xs font-semibold">{listing.district}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 font-roboto text-xs">Area</span>
                          <span className="text-primary font-roboto text-xs font-semibold">{listing.area}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border border-stone-200 p-5">
                      <h3 className="font-prata text-primary text-sm mb-4 pb-3 border-b border-stone-100">Contact the Desk</h3>
                      <p className="text-stone-500 font-roboto text-xs leading-relaxed mb-4">
                        Our joint ventures desk handles all land enquiries. Reach out for site visits, disclosure packs, or to discuss partnership terms.
                      </p>
                      <Link
                        to="/contact"
                        className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 border border-stone-200 text-primary font-roboto text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white hover:border-primary transition-colors"
                      >
                        <i className="ri-chat-1-line"></i>Speak to the Desk
                      </Link>
                    </div>
                    <Link
                      to="/joint-ventures"
                      className="inline-flex items-center gap-2 text-stone-400 font-roboto text-xs hover:text-primary transition-colors cursor-pointer"
                    >
                      <i className="ri-arrow-left-line"></i>Back to all listings
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ---- REGULAR PROPERTY LAYOUT ---- */}
      {!isLand && (
        <main>
          {/* Breadcrumb */}
          <div className="px-6 py-3 bg-stone-50 border-b border-stone-100">
            <div className="max-w-6xl mx-auto">
              <nav className="flex items-center gap-2 text-xs font-roboto">
                <Link to="/" className="text-stone-400 hover:text-primary transition-colors cursor-pointer whitespace-nowrap">Home</Link>
                <span className="text-stone-300">/</span>
                <Link to={breadcrumbCategory.href} className="text-stone-400 hover:text-primary transition-colors cursor-pointer whitespace-nowrap">{breadcrumbCategory.label}</Link>
                <span className="text-stone-300">/</span>
                <span className="text-primary font-semibold truncate max-w-[300px]">{listing.title}</span>
              </nav>
            </div>
          </div>

          <div className="px-6 py-10 md:py-14 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="aspect-[4/3] overflow-hidden rounded-sm bg-stone-100">
                {listing.image ? (
                  <img
                    alt={listing.title}
                    className="w-full h-full object-cover object-top"
                    src={listing.image}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className="ri-building-line text-5xl text-stone-300 block"></i>
                  </div>
                )}
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] px-2 py-1 rounded-sm whitespace-nowrap text-white mb-3 inline-block bg-primary">
                  For {listing.category === 'rent' ? 'Rent' : 'Sale'}
                </span>
                <h1 className="font-prata text-2xl md:text-3xl text-primary mb-3">{listing.title}</h1>
                <p className="flex items-center gap-1 text-sm text-stone-500 mb-4">
                  <i className="ri-map-pin-line"></i> {listing.location}
                </p>
                {listing.neighbourhood && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-4">{listing.neighbourhood}</p>
                )}
                <div className="flex items-center gap-6 text-sm text-stone-600 mb-6">
                  {listing.beds != null && listing.beds > 0 && (
                    <span className="flex items-center gap-1.5">
                      <i className="ri-hotel-bed-line"></i> {listing.beds} Beds
                    </span>
                  )}
                  {listing.baths != null && listing.baths > 0 && (
                    <span className="flex items-center gap-1.5">
                      <i className="ri-drop-line"></i> {listing.baths} Baths
                    </span>
                  )}
                  {listing.parking != null && listing.parking > 0 && (
                    <span className="flex items-center gap-1.5">
                      <i className="ri-car-line"></i> {listing.parking} Parking
                    </span>
                  )}
                  {listing.sqft != null && listing.sqft > 0 && (
                    <span className="flex items-center gap-1.5">
                      <i className="ri-ruler-line"></i> {listing.sqft.toLocaleString()} sqft
                    </span>
                  )}
                </div>
                <p className="font-bold text-2xl text-primary whitespace-nowrap mb-6">
                  {listing.price}
                </p>
                {listing.description && (
                  <div>
                    <h2 className="font-prata text-primary text-lg mb-3">Description</h2>
                    <p className="text-stone-600 font-roboto text-sm leading-relaxed">{listing.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      <Footer />
      <BackToTop />
    </div>
  );
}