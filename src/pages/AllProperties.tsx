import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import ContactCTA from '@/components/feature/ContactCTA';
import { properties } from '@/mocks/properties';

const propertyTypes = [
  { label: 'Apartment', icon: 'ri-building-2-line' },
  { label: 'Villa', icon: 'ri-home-heart-line' },
  { label: 'Penthouse', icon: 'ri-building-4-line' },
  { label: 'Townhouse', icon: 'ri-community-line' },
  { label: 'Family Home', icon: 'ri-home-2-line' },
  { label: 'Studio', icon: 'ri-door-open-line' },
  { label: 'Land', icon: 'ri-landscape-line' },
  { label: 'Commercial', icon: 'ri-store-2-line' },
];

export default function AllProperties() {
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'rent'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'row' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = properties.filter((p) => {
    if (filterType === 'sale' && p.type !== 'sale') return false;
    if (filterType === 'rent' && p.type !== 'rent') return false;
    if (selectedCategory && !p.category.toLowerCase().includes(selectedCategory.toLowerCase())) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.location.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-white flex flex-col pt-[88px] md:pt-[96px]">
      <Header />

      {/* Search bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="hidden lg:block px-10 py-3">
          <div className="flex items-stretch gap-3">
            <div className="relative flex items-center gap-2.5 px-4 bg-white border border-[#d1d5db] rounded-[4px] h-12 flex-[1.5] min-w-0">
              <i className="ri-search-line text-stone-400 text-sm shrink-0"></i>
              <input
                placeholder="Enter an address, town, street, zip or property ID"
                className="flex-1 min-w-0 text-sm font-roboto font-semibold text-[#374151] placeholder:text-[#9ca3af] focus:outline-none bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative h-12">
              <select
                className="h-full appearance-none px-4 text-sm font-roboto font-semibold text-[#374151] bg-white border border-[#d1d5db] rounded-[4px] focus:outline-none cursor-pointer pr-8"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'sale' | 'rent')}
              >
                <option value="all">All Properties</option>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none"></i>
            </div>
            <div className="relative h-12">
              <select className="h-full appearance-none px-4 text-sm font-roboto font-semibold text-[#374151] bg-white border border-[#d1d5db] rounded-[4px] focus:outline-none cursor-pointer pr-8">
                <option>Property Type</option>
                {propertyTypes.map((t) => <option key={t.label}>{t.label}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none"></i>
            </div>
            <div className="relative h-12">
              <select className="h-full appearance-none px-4 text-sm font-roboto font-semibold text-[#374151] bg-white border border-[#d1d5db] rounded-[4px] focus:outline-none cursor-pointer pr-8">
                <option>Max. Price</option>
                <option>Under $100K</option>
                <option>$100K – $300K</option>
                <option>$300K – $500K</option>
                <option>$500K – $1M</option>
                <option>Over $1M</option>
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none"></i>
            </div>
            <button className="flex items-center gap-2 text-sm font-roboto h-12 rounded-[4px] font-semibold cursor-pointer whitespace-nowrap bg-primary text-white px-5">
              <i className="ri-search-line text-sm"></i>Search
            </button>
          </div>
        </div>
        <div className="lg:hidden px-3 py-2">
          <div className="flex items-stretch gap-1.5">
            <div className="relative flex-1 min-w-0 flex items-center gap-2 px-3 h-11 border border-[#d1d5db] rounded-[4px] bg-white">
              <i className="ri-map-pin-line text-stone-400 text-sm"></i>
              <input placeholder="Enter a location" className="flex-1 min-w-0 text-[13px] font-roboto font-semibold text-[#374151] placeholder:text-[#9ca3af] focus:outline-none bg-transparent" />
            </div>
            <button className="h-11 w-11 flex items-center justify-center bg-primary text-white rounded-[4px] cursor-pointer shrink-0">
              <i className="ri-search-line text-sm"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb + title */}
      <div className="px-5 md:px-10 pt-8 pb-2">
        <div className="flex items-center gap-2 text-xs font-roboto text-stone-400 mb-3">
          <Link className="hover:text-primary transition-colors" to="/">Home</Link>
          <i className="ri-arrow-right-s-line"></i>
          <span className="text-stone-500">Properties</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-prata text-primary">All Properties</h1>
        <p className="text-sm font-roboto text-stone-500 mt-1">Browse our complete portfolio of premium residential properties for sale and rent in Nairobi.</p>
      </div>

      {/* Filter tabs */}
      <div className="px-5 md:px-10 pt-4 pb-0">
        <div className="flex items-center gap-1 border-b border-gray-100">
          {(['all', 'sale', 'rent'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-5 py-2.5 text-xs font-roboto font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap border-b-2 -mb-px ${filterType === tab ? 'border-golden text-golden' : 'border-transparent text-stone-400 hover:text-primary'}`}
            >
              {tab === 'all' ? 'All' : tab === 'sale' ? 'For Sale' : 'For Rent'}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-5 md:px-10 py-7">
        <div className="flex flex-col lg:flex-row gap-7">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <span className="text-xs font-roboto text-stone-500">
                <span className="text-primary font-semibold">{filtered.length}</span> properties found
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-400 font-roboto hidden sm:block">Sort by:</span>
                <div className="relative">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none border border-gray-200 rounded-sm pl-3 pr-8 py-1.5 text-xs font-roboto text-primary focus:outline-none cursor-pointer bg-white">
                    <option value="newest">Newest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs pointer-events-none"></i>
                </div>
                <div className="flex border border-gray-200 rounded-sm overflow-hidden">
                  <button onClick={() => setViewMode('row')} className={`w-8 h-8 flex items-center justify-center cursor-pointer transition-colors ${viewMode === 'row' ? 'bg-primary text-white' : 'text-stone-400 hover:bg-gray-50'}`}>
                    <i className="ri-layout-row-line text-sm"></i>
                  </button>
                  <button onClick={() => setViewMode('grid')} className={`w-8 h-8 flex items-center justify-center cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-stone-400 hover:bg-gray-50'}`}>
                    <i className="ri-grid-fill text-sm"></i>
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((p) => (
                  <Link key={p.id} to={`/property/${p.slug}`} className="block group">
                    <div className="border border-gray-100 hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                      <div className="relative h-48 overflow-hidden">
                        <img src={p.image} alt={p.title} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                        <span className={`absolute top-3 left-3 text-white text-[9px] font-roboto font-semibold uppercase tracking-wider px-2.5 py-1 ${p.type === 'sale' ? 'bg-primary' : 'bg-golden'}`}>
                          {p.type === 'sale' ? 'For Sale' : 'For Rent'}
                        </span>
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-roboto text-stone-400 flex items-center gap-1 mb-1">
                          <i className="ri-map-pin-line text-golden"></i>{p.location}
                        </p>
                        <h3 className="font-prata text-primary text-sm leading-snug mb-3 line-clamp-2 group-hover:text-golden transition-colors">{p.title}</h3>
                        <div className="flex items-center gap-3 text-xs font-roboto text-stone-500 mb-3">
                          <span className="flex items-center gap-1"><i className="ri-hotel-bed-line text-primary"></i>{p.beds}</span>
                          <span className="flex items-center gap-1"><i className="ri-drop-line text-primary"></i>{p.baths}</span>
                          <span className="flex items-center gap-1"><i className="ri-car-line text-primary"></i>{p.parking}</span>
                        </div>
                        <span className="font-prata text-primary text-sm">{p.price} {p.priceUnit && <span className="text-xs text-stone-400 font-roboto">{p.priceUnit}</span>}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {filtered.map((p) => (
                  <Link key={p.id} to={`/property/${p.slug}`} className="block group">
                    <div className="flex flex-col sm:flex-row border border-gray-100 hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                      <div className="relative sm:w-64 lg:w-80 h-52 sm:h-auto flex-shrink-0 overflow-hidden">
                        <img src={p.image} alt={p.title} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                        <span className={`absolute top-3 left-3 text-white text-[9px] font-roboto font-semibold uppercase tracking-wider px-2.5 py-1 ${p.type === 'sale' ? 'bg-primary' : 'bg-golden'}`}>
                          {p.type === 'sale' ? 'For Sale' : 'For Rent'}
                        </span>
                      </div>
                      <div className="flex-1 p-5 flex flex-col justify-between">
                        <div>
                          <p className="text-xs font-roboto text-stone-400 flex items-center gap-1 mb-1.5">
                            <i className="ri-map-pin-line text-golden"></i>{p.location}
                          </p>
                          <h3 className="font-prata text-primary text-base md:text-lg leading-snug mb-3 line-clamp-2 group-hover:text-golden transition-colors">{p.title}</h3>
                          <div className="flex items-center gap-4 text-xs font-roboto text-stone-500">
                            <span className="flex items-center gap-1.5"><i className="ri-hotel-bed-line text-primary"></i>{p.beds} Beds</span>
                            <span className="flex items-center gap-1.5"><i className="ri-drop-line text-primary"></i>{p.baths} Baths</span>
                            <span className="flex items-center gap-1.5"><i className="ri-car-line text-primary"></i>{p.parking} Parking</span>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="font-prata text-primary text-lg">{p.price} {p.priceUnit && <span className="text-sm text-stone-400 font-roboto">{p.priceUnit}</span>}</span>
                          <span className="text-[10px] font-roboto text-stone-400 flex items-center gap-1">
                            <i className="ri-time-line"></i>Listed {p.listedDays} days ago
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 flex items-center justify-center bg-stone-100 rounded-full mb-4">
                  <i className="ri-search-line text-2xl text-stone-400"></i>
                </div>
                <p className="font-prata text-primary text-lg mb-2">No properties found</p>
                <p className="text-sm font-roboto text-stone-400">Try adjusting your filters or search query</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block lg:w-52 xl:w-56 shrink-0">
            <div className="sticky top-24">
              <aside className="flex flex-col gap-3 w-full">
                <div className="bg-white border border-stone-100 rounded-sm overflow-hidden">
                  <div className="py-1">
                    {propertyTypes.map((t) => (
                      <button key={t.label} onClick={() => setSelectedCategory(selectedCategory === t.label ? null : t.label)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-roboto transition-all cursor-pointer whitespace-nowrap text-left ${selectedCategory === t.label ? 'bg-primary/8 text-primary font-semibold' : 'text-stone-600 hover:bg-[#f5f5f5] hover:text-primary'}`}>
                        <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                          <i className={`${t.icon} text-xs text-stone-400`}></i>
                        </span>
                        <span className="flex-1">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-primary rounded-sm overflow-hidden">
                  <div className="p-4 text-center">
                    <div className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full mx-auto mb-2">
                      <i className="ri-customer-service-2-line text-white text-sm"></i>
                    </div>
                    <h3 className="text-xs font-prata text-white mb-1">Need Help?</h3>
                    <p className="text-white/60 text-[10px] font-roboto leading-relaxed mb-3">Our agents are ready to help you find the perfect property.</p>
                    <Link to="/contact" className="inline-flex items-center gap-1 px-4 py-1.5 bg-golden text-white text-[10px] font-roboto font-semibold uppercase tracking-wider rounded-sm hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap">
                      <i className="ri-phone-line text-[10px]"></i>Talk to an Agent
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>

      <ContactCTA />
      <Footer />
      <BackToTop />
    </div>
  );
}