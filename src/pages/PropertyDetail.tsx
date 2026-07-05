import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { useParams, Link } from 'react-router-dom';
import { properties } from '@/mocks/properties';
import { landListings } from '@/mocks/jointVentures';

export default function PropertyDetail() {
  const { slug } = useParams<{ slug: string }>();

  const property = properties.find((p) => p.slug === slug);
  const land = landListings.find((l) => l.slug === slug);
  const item = property || land;

  if (!item) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-32 pb-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-stone-400"></i>
            </div>
            <h1 className="font-prata text-2xl md:text-3xl text-primary mb-3">Property Not Found</h1>
            <p className="font-roboto text-stone-500 mb-6">The property you are looking for does not exist or may have been removed.</p>
            <Link to="/joint-ventures" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
              <i className="ri-arrow-left-line"></i>Back to Joint Ventures
            </Link>
          </div>
        </main>
        <Footer />
        <BackToTop />
      </div>
    );
  }

  const isLand = !property && !!land;

  return (
    <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
      <Header />

      {/* Land Listing Detail */}
      {isLand && land && (
        <main>
          {/* Hero image */}
          <section className="relative overflow-hidden">
            <div className="aspect-[21/9] md:aspect-[21/7] overflow-hidden">
              <img
                alt={land.title}
                className="w-full h-full object-cover object-top"
                src={land.image}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
          </section>

          {/* Content */}
          <section className="px-6 py-10 md:py-14">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                {/* Main column */}
                <div className="lg:col-span-2">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="px-2 py-0.5 bg-white border border-stone-200 text-primary font-roboto text-[10px] font-semibold tracking-wider">
                      {land.ref}
                    </span>
                    <span className={`px-2.5 py-0.5 font-roboto text-[10px] uppercase tracking-wider text-white ${
                      land.category === 'joint_venture' ? 'bg-accent' : 'bg-golden'
                    }`}>
                      {land.category === 'joint_venture' ? 'Joint Venture' : 'For Sale'}
                    </span>
                  </div>

                  <h1 className="font-prata text-2xl md:text-3xl text-primary mb-4">{land.title}</h1>

                  <p className="flex items-center gap-1.5 text-sm text-stone-500 mb-6">
                    <i className="ri-map-pin-2-line text-golden"></i>
                    {land.district}, {land.area}
                  </p>

                  {/* Specs grid */}
                  <div className="grid grid-cols-3 gap-4 mb-8 p-5 bg-stone-50 border border-stone-100">
                    <div>
                      <p className="text-stone-400 font-roboto text-[10px] uppercase tracking-wider mb-1">Size</p>
                      <p className="text-primary font-roboto text-base font-semibold">{land.size}</p>
                    </div>
                    <div>
                      <p className="text-stone-400 font-roboto text-[10px] uppercase tracking-wider mb-1">Title Type</p>
                      <p className="text-primary font-roboto text-base font-semibold">{land.titleType}</p>
                    </div>
                    <div>
                      <p className="text-stone-400 font-roboto text-[10px] uppercase tracking-wider mb-1">Price</p>
                      <p className="text-golden font-roboto text-base font-semibold">{land.price}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-8">
                    <h2 className="font-prata text-primary text-lg mb-3">About This Plot</h2>
                    <p className="text-stone-600 font-roboto text-sm leading-relaxed">{land.description}</p>
                  </div>

                  {/* Location section */}
                  <div className="mb-8">
                    <h2 className="font-prata text-primary text-lg mb-3">Location</h2>
                    <div className="bg-stone-100 aspect-[16/9] rounded-sm overflow-hidden flex items-center justify-center">
                      <div className="text-center">
                        <i className="ri-map-pin-2-line text-3xl text-stone-300 mb-2 block"></i>
                        <p className="text-stone-400 font-roboto text-sm">{land.district}</p>
                        <p className="text-stone-300 font-roboto text-xs">{land.area}</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="bg-primary p-6 md:p-8">
                    <h3 className="font-prata text-white text-lg mb-2">Interested in this plot?</h3>
                    <p className="text-white/60 font-roboto text-sm mb-5">Submit your enquiry and a partner manager will reach out with full disclosure, site visit options, and next steps.</p>
                    <a
                      href="/joint-ventures#request-desk"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-golden text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity"
                    >
                      <i className="ri-mail-send-line"></i>Enquire About This Plot
                    </a>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1">
                  <div className="sticky top-28 space-y-5">
                    {/* Quick facts */}
                    <div className="border border-stone-200 p-5">
                      <h3 className="font-prata text-primary text-sm mb-4 pb-3 border-b border-stone-100">Quick Facts</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 font-roboto text-xs">Reference</span>
                          <span className="text-primary font-roboto text-xs font-semibold">{land.ref}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 font-roboto text-xs">Category</span>
                          <span className="text-primary font-roboto text-xs font-semibold capitalize">{land.category === 'joint_venture' ? 'Joint Venture' : 'Outright Purchase'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 font-roboto text-xs">Size</span>
                          <span className="text-primary font-roboto text-xs font-semibold">{land.size}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 font-roboto text-xs">Title</span>
                          <span className="text-primary font-roboto text-xs font-semibold">{land.titleType}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 font-roboto text-xs">District</span>
                          <span className="text-primary font-roboto text-xs font-semibold">{land.district}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 font-roboto text-xs">Area</span>
                          <span className="text-primary font-roboto text-xs font-semibold">{land.area}</span>
                        </div>
                      </div>
                    </div>

                    {/* Agent / Desk */}
                    <div className="border border-stone-200 p-5">
                      <h3 className="font-prata text-primary text-sm mb-4 pb-3 border-b border-stone-100">Contact the Desk</h3>
                      <p className="text-stone-500 font-roboto text-xs leading-relaxed mb-4">
                        Our joint ventures desk handles all land enquiries. Reach out for site visits, disclosure packs, or to discuss partnership terms.
                      </p>
                      <a
                        href="/contact"
                        className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 border border-stone-200 text-primary font-roboto text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white hover:border-primary transition-colors"
                      >
                        <i className="ri-chat-1-line"></i>Speak to the Desk
                      </a>
                    </div>

                    {/* Back link */}
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

      {/* Regular Property Detail */}
      {!isLand && property && (
        <main className="pt-8 pb-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="aspect-[4/3] overflow-hidden rounded-sm">
                <img
                  alt={property.title}
                  className="w-full h-full object-cover object-top"
                  src={property.image}
                />
              </div>
              <div>
                <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] px-2 py-1 rounded-sm whitespace-nowrap text-white mb-3 inline-block ${property.type === 'sale' ? 'bg-green-700' : 'bg-primary'}`}>
                  For {property.type === 'sale' ? 'Sale' : 'Rent'}
                </span>
                <h1 className="font-prata text-2xl md:text-3xl text-primary mb-3">{property.title}</h1>
                <p className="flex items-center gap-1 text-sm text-stone-500 mb-4">
                  <i className="ri-map-pin-line"></i> {property.location}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-4">{property.category}</p>
                <div className="flex items-center gap-6 text-sm text-stone-600 mb-6">
                  <span className="flex items-center gap-1.5">
                    <i className="ri-hotel-bed-line"></i> {property.beds} Beds
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="ri-drop-line"></i> {property.baths} Baths
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="ri-car-line"></i> {property.parking} Parking
                  </span>
                </div>
                <p className="font-bold text-2xl text-primary whitespace-nowrap">
                  {property.price}
                  {property.priceUnit && <span className="text-sm font-normal ml-1">{property.priceUnit}</span>}
                </p>
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