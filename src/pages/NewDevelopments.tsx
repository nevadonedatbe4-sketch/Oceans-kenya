import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { properties } from '@/mocks/properties';

const benefits = [
  { icon: 'ri-price-tag-3-line', title: 'Early-Bird Pricing', desc: 'Secure properties at pre-construction prices, often 15-20% below market value upon completion.' },
  { icon: 'ri-palette-line', title: 'Customisation Options', desc: 'Choose finishes, layouts, and fixtures to match your personal taste before construction is complete.' },
  { icon: 'ri-shield-check-line', title: 'Modern Standards', desc: 'Benefit from the latest building codes, energy efficiency, and contemporary design.' },
  { icon: 'ri-line-chart-line', title: 'Capital Appreciation', desc: 'Properties typically gain significant value between launch and completion.' },
  { icon: 'ri-file-list-3-line', title: 'Payment Plans', desc: 'Flexible staged payments tied to construction milestones, making luxury more accessible.' },
  { icon: 'ri-tools-line', title: 'Warranty Protection', desc: 'New builds come with structural warranties and builder guarantees for peace of mind.' },
];

const featuredDevelopments = [
  {
    id: 'dev-1',
    slug: '-off-plan-luxury-apartments-for-sale-in-kololo',
    title: 'OFF-PLAN LUXURY APARTMENTS FOR SALE IN KAREN',
    location: 'Karen',
    beds: 1,
    baths: 1,
    price: '$86,000',
    type: 'APARTMENT',
    image: 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778757621679-xbpy3gho.JPG',
    tag: 'For Sale',
  },
  {
    id: 'dev-2',
    slug: 'executive-apartments-penthouses-for-sale-in-kololo-kampala-prime-location',
    title: 'Executive Apartments & Penthouses for Sale in Karen Nairobi – Prime Location',
    location: 'Karen',
    beds: 1,
    baths: 1,
    price: '$136,000',
    type: 'APARTMENT',
    image: 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778769316224-aj8sxten.jpg',
    tag: 'For Sale',
  },
  {
    id: 'dev-3',
    slug: 'buy-off-plan-affordable-luxury-in-nakasero-kampala',
    title: 'Buy off plan affordable Luxury in Westlands Nairobi',
    location: 'Westlands',
    beds: 3,
    baths: 3,
    price: '$388,000',
    type: 'APARTMENT',
    image: 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1776957969634-7nepr2cs.jpg',
    tag: 'For Sale',
  },
];

export default function NewDevelopments() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Types');
  const [filterArea, setFilterArea] = useState('');
  const [filterPrice, setFilterPrice] = useState('Any Price');
  const [filterBeds, setFilterBeds] = useState('Any Beds');
  const [sortBy, setSortBy] = useState('newest');

  const allDevs = [
    ...featuredDevelopments,
    {
      id: 'dev-4',
      slug: 'a-fully-furnished-4-bedroom-apartment-to-let-',
      title: 'A Fully Furnished 4 Bedroom Apartment To Let',
      location: 'Kilimani',
      beds: 4,
      baths: 4,
      price: 'Price on request',
      type: 'APARTMENT',
      image: 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1776957198509-wlo5yz3p.jpg',
      tag: 'For Sale',
    },
  ];

  return (
    <div className="min-h-screen bg-white pt-[88px] md:pt-[96px]">
      <Header />

      {/* Hero section */}
      <div className="relative flex flex-col items-center justify-center text-center overflow-hidden pt-16 pb-16 bg-primary">
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 md:px-6 text-center">
          <p className="text-golden text-sm md:text-base font-roboto font-semibold tracking-widest uppercase mb-3">Premium Developments</p>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-prata text-white mb-4 leading-tight">New Developments</h1>
          <p className="text-white/80 font-roboto text-sm md:text-base leading-relaxed max-w-xl mx-auto">
            Discover Nairobi&apos;s finest off-plan and newly completed properties. From luxury apartments to exclusive villas — secure your future home today.
          </p>
        </div>
      </div>

      {/* Featured Developments */}
      <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-14">
            <p className="text-golden text-sm font-roboto font-semibold tracking-widest uppercase mb-2">Featured Projects</p>
            <h2 className="text-2xl md:text-3xl font-prata text-primary">Signature Developments</h2>
          </div>
          <div className="space-y-6 md:space-y-10">
            {featuredDevelopments.map((dev, idx) => (
              <div key={dev.id} className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden border border-gray-100 hover:-translate-y-1 transition-all duration-300">
                <div className={`relative h-56 sm:h-64 md:h-72 lg:h-auto ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <img alt={dev.title} className="w-full h-full object-cover object-top" src={dev.image} />
                  <div className="absolute top-3 left-3">
                    <span className="bg-golden text-white font-roboto text-[11px] px-2.5 py-1 uppercase tracking-wider">{dev.price}</span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="bg-primary text-white font-roboto text-[11px] px-2.5 py-1 uppercase tracking-wider">New Development</span>
                  </div>
                </div>
                <div className={`p-5 md:p-8 lg:p-10 flex flex-col justify-center ${idx % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <p className="text-golden text-xs font-roboto font-semibold tracking-widest uppercase mb-2">New Development</p>
                  <h3 className="text-primary font-prata text-xl md:text-2xl mb-2 md:mb-3">{dev.title}</h3>
                  <p className="text-stone-400 font-roboto text-sm flex items-center gap-1.5 mb-3 md:mb-4">
                    <i className="ri-map-pin-2-line"></i>{dev.location}
                  </p>
                  <div className="flex flex-wrap gap-3 md:gap-4 mb-4 md:mb-6">
                    <div className="flex items-center gap-2 text-xs md:text-sm font-roboto text-stone-500">
                      <i className="ri-hotel-bed-line text-primary"></i>{dev.beds} Bedrooms
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm font-roboto text-stone-500">
                      <i className="ri-drop-line text-primary"></i>{dev.baths} Bathrooms
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3 mt-auto">
                    <Link to={`/property/${dev.slug}`} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-primary text-white font-roboto text-[11px] md:text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
                      <i className="ri-eye-line"></i>View Development
                    </Link>
                    <Link to="/contact" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 border border-primary text-primary font-roboto text-[11px] md:text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white transition-colors">
                      <i className="ri-mail-line"></i>Enquire Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-14">
            <p className="text-golden text-sm font-roboto font-semibold tracking-widest uppercase mb-2">The Benefits</p>
            <h2 className="text-2xl md:text-3xl font-prata text-primary">Why Buy a New Development?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {benefits.map((b) => (
              <div key={b.title} className="p-5 md:p-6 lg:p-7 border border-gray-100 rounded-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-primary/5 rounded-full mb-4 md:mb-5">
                  <i className={`${b.icon} text-lg md:text-xl text-primary`}></i>
                </div>
                <h3 className="text-primary font-prata text-sm md:text-base mb-2">{b.title}</h3>
                <p className="text-stone-500 font-roboto text-xs md:text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse All */}
      <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-white" id="browse">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <p className="text-golden text-sm font-roboto font-semibold tracking-widest uppercase mb-2">Browse All</p>
            <h2 className="text-2xl md:text-3xl font-prata text-primary">All New Developments</h2>
          </div>

          {/* Filters */}
          <div className="bg-primary px-3 md:px-6 py-3 md:py-5 mb-6 md:mb-10">
            <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-2 md:gap-3">
              <div className="flex flex-1 min-w-0 gap-2">
                <div className="flex-1 min-w-0 relative">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm"></i>
                  <input
                    placeholder="Search developments..."
                    className="w-full bg-white/10 border border-white/20 rounded-sm pl-9 pr-4 py-2 md:py-2.5 text-sm font-roboto text-white placeholder:text-white/40 focus:outline-none focus:border-golden"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="inline-flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-golden text-white font-roboto text-xs md:text-sm tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-colors rounded-sm">
                  <i className="ri-search-line"></i>
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>
              <div className="grid grid-cols-2 md:flex gap-2 md:gap-3">
                {[
                  { value: filterType, setter: setFilterType, options: ['All Types', 'Apartment', 'Villa', 'Penthouse', 'Townhouse', 'Family Home', 'Studio'] },
                  { value: filterArea, setter: setFilterArea, options: ['All Areas', 'Karen', 'Westlands', 'Kilimani', 'Lavington', 'Runda', 'Muthaiga', 'Kileleshwa', 'Gigiri', 'Parklands', 'Langata'] },
                  { value: filterPrice, setter: setFilterPrice, options: ['Any Price', 'Under $150K', '$150K – $300K', '$300K – $500K', '$500K – $1M', 'Over $1M'] },
                  { value: filterBeds, setter: setFilterBeds, options: ['Any Beds', '1+', '2+', '3+', '4+', '5+'] },
                ].map((sel, i) => (
                  <select
                    key={i}
                    value={sel.value}
                    onChange={(e) => sel.setter(e.target.value)}
                    className="bg-white/10 border border-white/20 text-white/80 rounded-sm px-3 md:px-4 py-2 md:py-2.5 text-sm font-roboto focus:outline-none focus:border-golden cursor-pointer min-w-0"
                  >
                    {sel.options.map((o) => <option key={o} className="bg-primary text-white">{o}</option>)}
                  </select>
                ))}
              </div>
            </div>
          </div>

          {/* Results header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <p className="text-primary text-sm font-roboto">
                <span className="font-prata text-xl">{allDevs.length}</span>
                <span className="ml-2 text-stone-400">developments found</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-stone-400 font-roboto text-xs">Sort:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-gray-200 text-primary rounded-sm px-3 py-1.5 text-sm font-roboto focus:outline-none cursor-pointer">
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allDevs.map((dev) => (
              <Link key={dev.id} to={`/property/${dev.slug}`} className="block group">
                <div className="bg-white overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border border-gray-100 flex flex-col h-full">
                  <div className="relative h-52 overflow-hidden flex-shrink-0">
                    <img alt={dev.title} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" src={dev.image} />
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="bg-primary text-white text-[9px] font-roboto font-semibold uppercase tracking-[0.18em] px-2 py-1">{dev.tag}</span>
                    </div>
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="bg-golden text-white text-[9px] font-roboto font-semibold uppercase tracking-[0.18em] px-2 py-1">New Dev</span>
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 p-4">
                    <p className="flex items-center gap-1 text-xs font-roboto text-stone-400 mb-1 truncate">
                      <i className="ri-map-pin-line text-golden text-xs flex-shrink-0"></i>
                      <span className="truncate">{dev.location}</span>
                    </p>
                    <h3 className="font-prata text-primary text-sm leading-snug line-clamp-2 mb-3 group-hover:text-golden transition-colors">{dev.title}</h3>
                    <div className="flex items-center gap-4 text-xs font-roboto text-stone-400 mb-3">
                      <span className="flex items-center gap-1"><i className="ri-hotel-bed-line text-primary"></i>{dev.beds} Bed</span>
                      <span className="flex items-center gap-1"><i className="ri-drop-line text-primary"></i>{dev.baths} Bath</span>
                    </div>
                    <p className="text-[10px] font-roboto font-semibold uppercase tracking-widest text-stone-400 mb-3">{dev.type}</p>
                    <div className="mt-auto pt-3 border-t border-gray-50 flex items-end justify-between gap-2">
                      <span className="font-prata text-primary font-bold">{dev.price}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Developer CTA */}
      <section className="py-10 md:py-14 lg:py-16 px-4 md:px-6 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-white font-prata text-2xl md:text-3xl mb-3 md:mb-4">Have a Development to Sell?</h2>
          <p className="text-white/70 font-roboto text-xs md:text-sm mb-6 md:mb-8 max-w-lg mx-auto">
            We work with leading developers across Kenya to market and sell premium new developments. Partner with Nairobi&apos;s most trusted agency.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <Link to="/contact" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-3.5 bg-golden text-white font-roboto text-xs md:text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
              <i className="ri-mail-line"></i>Contact Our Team
            </Link>
            <Link to="/landlords" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-3.5 border border-white/50 text-white font-roboto text-xs md:text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors">
              <i className="ri-bar-chart-2-line"></i>Request Valuation
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <BackToTop />
    </div>
  );
}