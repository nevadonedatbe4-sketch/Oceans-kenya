import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import ContactCTA from '@/components/feature/ContactCTA';
import { properties } from '@/mocks/properties';
import AdvancedFilters, { defaultFilters, FilterState } from '@/pages/Rent/components/AdvancedFilters';

interface ExtendedProperty {
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
  sqft: number;
  sqm: number;
  price: string;
  priceUnit?: string;
  image: string;
  featured: boolean;
  listedDays: number;
  badges: string[];
  description: string;
  agent: string;
  agentLogo?: string;
  images: string[];
  newHome?: boolean;
  reduced?: boolean;
  videoTour?: boolean;
  virtualTour?: boolean;
  floorPlan?: boolean;
  justAdded?: boolean;
  houseShare?: boolean;
  agentShortName?: string;
  agentBrandColor?: string;
}

const extendedProperties: ExtendedProperty[] = properties.map((p, i) => {
  const sqftValues = [2150, 1840, 1200, 950, 2800, 3200, 1450, 3980, 2100, 1750, 2200];
  const sqft = sqftValues[i] || 1500;
  const sqm = Math.round(sqft * 0.0929);
  const descs = [
    'A stunning ultra-luxury townhouse in the prestigious Karen neighbourhood. This property features 5 spacious bedrooms, a private pool, fully equipped gym and sauna.',
    'Elegant colonial-style residence in Runda with 4 large bedrooms, mature gardens, and a private compound ideal for diplomatic families.',
    'Executive furnished apartment in Kilimani with 3 ensuite bedrooms, swimming pool access, and modern gym facilities.',
    'Spacious 4-bedroom apartment in Lavington with all ensuite bedrooms, open-plan living, and proximity to top schools.',
    'Fully furnished 3-bedroom apartment in Westlands featuring a heated pool, state-of-the-art gym, and sauna for the ultimate luxury lifestyle.',
    'Premium 4-bedroom house in Muthaiga with a mature garden, expansive living spaces, and a serene family environment.',
    'Furnished 3-bedroom apartment in Kileleshwa with modern fittings, balcony views, and convenient access to the CBD.',
    'Luxury 3-bedroom apartment spanning 370 sqm in Kilimani with panoramic city views, premium finishes, and smart home features.',
    'Exclusive penthouse in Westlands with 3 bedrooms, rooftop terrace, and elevated views of the Nairobi skyline.',
    'Smart home 4-bedroom furnished apartment in Lavington with automated lighting, climate control, and integrated security.',
    'Modern luxury 3-bedroom apartments in Karen with contemporary architecture, open-plan living, and landscaped grounds.',
  ];
  const imageList = [
    [p.image, 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778828764885-hdbj6j9u.jpg', 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778850072525-boes78l6.jpg'],
    [p.image, 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778828331764-z2j033jq.jpeg', 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778833774204-f9uff0tj.jpeg'],
    [p.image, 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778834733525-vyzdij9x.jpeg', 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778827801796-2cmg2v85.jpg'],
    [p.image, 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778835218019-o8768u5e.jfif', 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778829364320-ipypb5yn.jpg'],
    [p.image, 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778832068863-wt5d1tmv.jpeg', 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778829845010-srtt5yyz.jpeg'],
    [p.image, 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778830377992-ujip07g9.jpg', 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778834733525-vyzdij9x.jpeg'],
    [p.image, 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778828764885-hdbj6j9u.jpg', 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778835218019-o8768u5e.jfif'],
    [p.image, 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778832068863-wt5d1tmv.jpeg', 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778833774204-f9uff0tj.jpeg'],
    [p.image, 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778829364320-ipypb5yn.jpg', 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778827801796-2cmg2v85.jpg'],
    [p.image, 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778830377992-ujip07g9.jpg', 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778834733525-vyzdij9x.jpeg'],
    [p.image, 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778829845010-srtt5yyz.jpeg', 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778850072525-boes78l6.jpg'],
  ];
  const badges: string[] = [];
  if (i === 0 || i === 5) badges.push('New home');
  if (i === 2 || i === 7) badges.push('Video tour');
  if (i === 3 || i === 9) badges.push('Virtual tour');
  if (i === 1 || i === 4) badges.push('Floor plan');
  if (i === 6) badges.push('Reduced');
  const agentData = [
    { name: 'Oceans Kenya', short: 'OK', color: '#1a1a2e' },
    { name: 'HassConsult', short: 'HC', color: '#8B0000' },
    { name: 'Knight Frank', short: 'KF', color: '#006400' },
    { name: 'Dunhill', short: 'DH', color: '#4B0082' },
    { name: 'Villa Care', short: 'VC', color: '#D2691E' },
    { name: 'Tysons', short: 'TY', color: '#2F4F4F' },
    { name: 'Azizi', short: 'AZ', color: '#556B2F' },
    { name: 'Red Realty', short: 'RR', color: '#8B4513' },
  ];
  const agent = agentData[i % agentData.length];
  return {
    ...p,
    receptions: Math.max(1, Math.floor(p.beds / 2)),
    sqft,
    sqm,
    description: descs[i] || descs[0],
    agent: agent.name,
    agentShortName: agent.short,
    agentBrandColor: agent.color,
    images: imageList[i] || [p.image],
    badges,
    newHome: i === 0 || i === 5,
    reduced: i === 6,
    videoTour: i === 2 || i === 7,
    virtualTour: i === 3 || i === 9,
    floorPlan: i === 1 || i === 4,
    justAdded: i === 0 || i === 3 || i === 6,
    houseShare: i === 4 || i === 7,
  };
});

function toDisplayType(category: string): string {
  return category
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const ITEMS_PER_PAGE = 10;
const priceOptions = ['Any price', 'Under KSh 10M', 'KSh 10M – 30M', 'KSh 30M – 50M', 'KSh 50M – 100M', 'KSh 100M – 200M', 'Over KSh 200M'];
const bedOptions = ['Any beds', 'Studio', '1+', '2+', '3+', '4+', '5+'];
const propTypeOptions = ['Any type', 'Apartment', 'House', 'Townhouse', 'Penthouse', 'Villa', 'Studio', 'Land'];
const addedOptions = ['Anytime', 'Last 24 hours', 'Last 3 days', 'Last 7 days', 'Last 14 days'];
const sortOptions = ['Most recent', 'Highest price', 'Lowest price', 'Most reduced', 'Most popular'];
const radiusOptions = ['This area only', '½ mile', '1 mile', '3 miles', '5 miles', '10 miles', '15 miles', '20 miles', '30 miles', '40 miles'];

const nearbyAreas = [
  'Karen', 'Runda', 'Lavington', 'Kilimani', 'Westlands', 'Kileleshwa',
  'Muthaiga', 'Parklands', 'Riverside', 'Gigiri', 'Spring Valley', 'Nyari',
  'Langata', 'Kiserian', 'Ongata Rongai', 'Ngong', 'Kitengela', 'Athi River',
];

const relatedSearches = [
  'New homes for sale in Nairobi',
  'Properties for sale in Nairobi',
  'Explore house prices in Nairobi',
  'Find estate agents in Nairobi',
  'Commercial properties for sale in Nairobi',
  'Studios for sale in Nairobi',
  'Houses for sale in Nairobi',
  'Furnished apartments for sale in Nairobi',
];

export default function Buy() {
  const [searchQuery, setSearchQuery] = useState('Nairobi');
  const [selectedRadius, setSelectedRadius] = useState('This area only');
  const [selectedPrice, setSelectedPrice] = useState('Any price');
  const [selectedBeds, setSelectedBeds] = useState('Any beds');
  const [selectedType, setSelectedType] = useState('Any type');
  const [selectedAdded, setSelectedAdded] = useState('Anytime');
  const [sortBy, setSortBy] = useState('Most recent');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({ ...defaultFilters });
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const [enquiryStatus, setEnquiryStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [activeMapMarker, setActiveMapMarker] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const saleProperties = extendedProperties.filter((p) => p.type === 'sale');

  const totalPages = Math.ceil(saleProperties.length / ITEMS_PER_PAGE);
  const paginated = saleProperties.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const nextImage = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const prop = extendedProperties.find((p) => p.id === id);
    if (!prop) return;
    setImageIndexes((prev) => {
      const current = prev[id] || 0;
      const next = (current + 1) % prop.images.length;
      return { ...prev, [id]: next };
    });
  };

  const prevImage = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const prop = extendedProperties.find((p) => p.id === id);
    if (!prop) return;
    setImageIndexes((prev) => {
      const current = prev[id] || 0;
      const next = current === 0 ? prop.images.length - 1 : current - 1;
      return { ...prev, [id]: next };
    });
  };

  const handleEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setEnquiryStatus('submitting');
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    fetch('https://readdy.ai/api/form/d8co2lojl3r96eih9060', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData as any).toString(),
    })
      .then(() => {
        setEnquiryStatus('success');
        form.reset();
      })
      .catch(() => setEnquiryStatus('idle'));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPrice, selectedBeds, selectedType, selectedAdded, sortBy, advancedFilters]);

  const activeCount = saleProperties.length;
  const agentCount = 8;

  return (
    <div className="min-h-screen bg-white flex flex-col pt-[92px]">
      <Header />

      {/* === SEARCH + FILTER BAR === */}
      <div className="sticky top-[92px] z-40 bg-white border-b border-gray-200 shadow-sm mt-6">
        {/* Search bar */}
        <div className="px-4 md:px-6 lg:px-10 py-3">
          <div className="flex items-stretch gap-2 max-w-[1400px] mx-auto">
            <div className="relative flex items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 min-w-0 flex items-center gap-2.5 px-4 h-11 bg-white border border-gray-300 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  <i className="ri-map-pin-line text-gray-400 text-base"></i>
                </span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. 'Nairobi', 'Kilimani', or '3 bed house'"
                  className="flex-1 min-w-0 text-sm font-roboto font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer">
                    <i className="ri-close-line text-sm"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <div className="relative">
                <select value={selectedRadius} onChange={(e) => setSelectedRadius(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {radiusOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              </div>
              <div className="relative">
                <select value={selectedBeds} onChange={(e) => setSelectedBeds(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {bedOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              </div>
              <div className="relative">
                <select value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {priceOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              </div>
              <div className="relative">
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="appearance-none h-11 px-4 pr-9 text-sm font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-primary cursor-pointer">
                  {propTypeOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              </div>
            </div>
            <button
              onClick={() => setShowAdvancedFilters(true)}
              className="hidden md:flex items-center gap-2 h-11 px-4 text-sm font-roboto font-medium text-gray-700 border border-gray-300 rounded-lg hover:border-primary hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-equalizer-line text-sm"></i>
              </span>
              Filters
            </button>
            <button className="hidden md:flex items-center gap-2 h-11 px-5 bg-primary text-white text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-search-line text-sm"></i>
              </span>
              Search
            </button>
            <button className="hidden md:flex items-center gap-2 h-11 px-4 border border-gray-300 text-sm font-roboto font-medium text-gray-700 rounded-lg hover:border-primary hover:text-primary transition-colors cursor-pointer whitespace-nowrap">
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-heart-line text-sm"></i>
              </span>
              Save
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className="md:hidden flex items-center justify-center w-11 h-11 border border-gray-300 rounded-lg text-gray-600 cursor-pointer">
              <i className="ri-equalizer-line text-lg"></i>
            </button>
          </div>
        </div>

        {/* Mobile filters */}
        {showFilters && (
          <div className="md:hidden px-4 pb-3 flex flex-wrap gap-2">
            <div className="relative">
              <select value={selectedRadius} onChange={(e) => setSelectedRadius(e.target.value)} className="appearance-none h-9 px-3 pr-8 text-xs font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none cursor-pointer">
                {radiusOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            </div>
            <div className="relative">
              <select value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)} className="appearance-none h-9 px-3 pr-8 text-xs font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none cursor-pointer">
                {priceOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            </div>
            <div className="relative">
              <select value={selectedBeds} onChange={(e) => setSelectedBeds(e.target.value)} className="appearance-none h-9 px-3 pr-8 text-xs font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none cursor-pointer">
                {bedOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            </div>
            <div className="relative">
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="appearance-none h-9 px-3 pr-8 text-xs font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none cursor-pointer">
                {propTypeOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            </div>
            <div className="relative">
              <select value={selectedAdded} onChange={(e) => setSelectedAdded(e.target.value)} className="appearance-none h-9 px-3 pr-8 text-xs font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none cursor-pointer">
                {addedOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            </div>
          </div>
        )}

        {/* Secondary filter bar */}
        <div className="hidden md:flex items-center justify-between px-4 md:px-6 lg:px-10 pb-0 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <button className="flex items-center gap-1.5 py-2 text-xs font-roboto font-medium text-gray-700 border-b-2 border-transparent hover:text-primary transition-colors cursor-pointer">
                {selectedAdded}
                <span className="w-3 h-3 flex items-center justify-center text-gray-400"><i className="ri-arrow-down-s-line text-xs"></i></span>
              </button>
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {addedOptions.map((o) => (
                  <button
                    key={o}
                    onClick={() => setSelectedAdded(o)}
                    className={`w-full text-left px-3 py-2 text-xs font-roboto cursor-pointer hover:bg-gray-50 ${selectedAdded === o ? 'text-primary font-semibold' : 'text-gray-600'}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative group">
              <button className="flex items-center gap-1.5 py-2 text-xs font-roboto font-medium text-gray-700 border-b-2 border-transparent hover:text-primary transition-colors cursor-pointer">
                {sortBy}
                <span className="w-3 h-3 flex items-center justify-center text-gray-400"><i className="ri-arrow-down-s-line text-xs"></i></span>
              </button>
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {sortOptions.map((o) => (
                  <button
                    key={o}
                    onClick={() => setSortBy(o)}
                    className={`w-full text-left px-3 py-2 text-xs font-roboto cursor-pointer hover:bg-gray-50 ${sortBy === o ? 'text-primary font-semibold' : 'text-gray-600'}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <Link to="/commute-time" className="flex items-center gap-1.5 py-2 text-xs font-roboto font-medium text-gray-700 border-b-2 border-transparent hover:text-primary hover:border-primary/40 transition-colors cursor-pointer">
              <i className="ri-route-line text-xs"></i>
              Commute time
            </Link>
            <Link to="/schools" className="flex items-center gap-1.5 py-2 text-xs font-roboto font-medium text-gray-700 border-b-2 border-transparent hover:text-primary hover:border-primary/40 transition-colors cursor-pointer">
              <i className="ri-school-line text-xs"></i>
              Schools
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 py-2 text-xs font-roboto font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${viewMode === 'list' ? 'text-primary border-primary' : 'text-gray-700 border-transparent hover:text-primary'}`}
            >
              <i className="ri-list-check text-xs"></i>
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 py-2 text-xs font-roboto font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${viewMode === 'map' ? 'text-primary border-primary' : 'text-gray-700 border-transparent hover:text-primary'}`}
            >
              <i className="ri-map-2-line text-xs"></i>
              Map
            </button>
            <button className="flex items-center gap-1.5 py-2 text-xs font-roboto font-medium text-gray-700 border-b-2 border-transparent hover:text-primary hover:border-primary/40 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-bookmark-line text-xs"></i>
              Save search
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AdvancedFilters
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={(f) => setAdvancedFilters(f)}
        initialFilters={advancedFilters}
      />

      {/* === RESULTS HEADER === */}
      <div className="px-4 md:px-6 lg:px-10 pt-6 pb-2 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-prata text-primary">Properties for sale in Nairobi</h1>
            <p className="text-xs font-roboto text-gray-500 mt-0.5">
              <span className="text-primary font-semibold">{activeCount}</span> properties &middot; <span className="text-primary font-semibold">{agentCount}</span> agents
            </p>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none h-8 px-3 pr-7 text-xs font-roboto font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:outline-none cursor-pointer">
                {sortOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            </div>
            <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 cursor-pointer">
              <i className={viewMode === 'list' ? 'ri-map-2-line text-xs' : 'ri-list-check text-xs'}></i>
            </button>
          </div>
        </div>
      </div>

      {/* === MAIN CONTENT === */}
      <main className="flex-1 px-4 md:px-6 lg:px-10 pb-10 max-w-[1400px] mx-auto w-full">
        <div className={`flex gap-6 ${viewMode === 'map' ? 'flex-col lg:flex-row' : 'flex-col lg:flex-row'}`}>
          {/* Listings */}
          <div className={`${viewMode === 'map' ? 'lg:w-[55%] xl:w-[60%]' : 'lg:w-[70%] xl:w-[75%]'}`}>
            {/* Create alert tab bar */}
            <div className="flex items-center gap-2 mb-4">
              <button className="flex items-center gap-1.5 h-9 px-4 text-xs font-roboto font-medium text-gray-600 border border-gray-300 rounded-lg hover:border-primary hover:text-primary transition-colors cursor-pointer whitespace-nowrap">
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-notification-3-line text-xs"></i>
                </span>
                Create alert
              </button>
            </div>

            <div className="space-y-4">
              {paginated.map((p) => {
                const imgIdx = imageIndexes[p.id] || 0;
                const isSaved = savedIds.has(p.id);
                const isHovered = hoveredCard === p.id;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row bg-white border border-gray-200 rounded-lg overflow-hidden sm:h-[260px] hover:border-gray-300 hover:shadow-md transition-all duration-200"
                    onMouseEnter={() => setHoveredCard(p.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Image area */}
                    <div className="relative sm:w-[280px] md:w-[320px] lg:w-[340px] h-[220px] sm:h-full flex-shrink-0 overflow-hidden">
                      <Link to={`/property/${p.slug}`} className="block w-full h-full">
                        <img
                          src={p.images[imgIdx]}
                          alt={p.title}
                          className="w-full h-full object-cover object-top transition-transform duration-500"
                          style={{ transform: isHovered ? 'scale(1.03)' : 'scale(1)' }}
                        />
                      </Link>

                      {/* Image counter */}
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded">
                        {imgIdx + 1}/{p.images.length}
                      </div>

                      {/* Nav arrows */}
                      {p.images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => prevImage(p.id, e)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full cursor-pointer transition-colors"
                          >
                            <i className="ri-arrow-left-s-line text-sm"></i>
                          </button>
                          <button
                            onClick={(e) => nextImage(p.id, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full cursor-pointer transition-colors"
                          >
                            <i className="ri-arrow-right-s-line text-sm"></i>
                          </button>
                        </>
                      )}

                      {/* Top badges */}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                        {p.justAdded && (
                          <span className="bg-[#F5A623] text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded">Just added</span>
                        )}
                        {p.newHome && (
                          <span className="bg-[#0E7C7B] text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded">New home</span>
                        )}
                        {p.reduced && (
                          <span className="bg-[#E63946] text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded">Reduced</span>
                        )}
                        {p.videoTour && (
                          <span className="bg-black/60 text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                            <i className="ri-video-line text-[10px]"></i>Video tour
                          </span>
                        )}
                        {p.virtualTour && (
                          <span className="bg-black/60 text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                            <i className="ri-globe-line text-[10px]"></i>Virtual tour
                          </span>
                        )}
                        {p.floorPlan && (
                          <span className="bg-black/60 text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                            <i className="ri-map-2-line text-[10px]"></i>Floor plan
                          </span>
                        )}
                        {p.houseShare && (
                          <span className="bg-white text-gray-700 text-[10px] font-roboto font-semibold px-2 py-0.5 rounded border border-gray-200">House share</span>
                        )}
                      </div>

                      {/* Top right actions */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <button
                          onClick={() => toggleSave(p.id)}
                          className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-colors ${isSaved ? 'bg-primary text-white' : 'bg-black/40 hover:bg-black/60 text-white'}`}
                        >
                          <i className={`${isSaved ? 'ri-heart-fill' : 'ri-heart-line'} text-sm`}></i>
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full cursor-pointer transition-colors">
                          <i className="ri-share-forward-line text-sm"></i>
                        </button>
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden">
                      <div>
                        {/* Price & title */}
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="min-w-0">
                            <span className="font-prata text-xl md:text-2xl text-primary font-semibold">{p.price}</span>
                            {p.priceUnit && <span className="text-sm text-gray-500 font-roboto ml-1">{p.priceUnit}</span>}
                          </div>
                        </div>
                        <Link to={`/property/${p.slug}`} className="block hover:underline">
                          <h3 className="font-prata text-sm md:text-base text-primary leading-snug mb-1">{p.title}</h3>
                        </Link>
                        <p className="flex items-center gap-1.5 text-sm font-roboto text-gray-500 mb-2">
                          <span className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-map-pin-line text-primary text-sm"></i>
                          </span>
                          {p.location}, Nairobi
                        </p>

                        {/* Meta badges */}
                        <div className="flex items-center gap-3 mb-2.5">
                          <span className="text-xs font-roboto text-gray-700">
                            {toDisplayType(p.category)}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-gray-700">
                            <i className="ri-hotel-bed-line text-primary text-sm"></i>
                            {p.beds}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-gray-700">
                            <i className="ri-showers-line text-primary text-sm"></i>
                            {p.baths}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-gray-700">
                            <i className="ri-sofa-line text-primary text-sm"></i>
                            {p.receptions}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-roboto text-gray-700">
                            <i className="ri-car-line text-primary text-sm"></i>
                            {p.parking}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs font-roboto text-gray-600 leading-relaxed line-clamp-2 mb-3">{p.description}</p>
                      </div>

                      {/* Agent footer */}
                      <div className="flex items-end justify-between gap-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-roboto font-bold text-[#228B22] uppercase tracking-wide">
                            {(() => {
                              const now = new Date('2026-05-29');
                              const listed = new Date(now);
                              listed.setDate(listed.getDate() - p.listedDays);
                              const diffMs = now.getTime() - listed.getTime();
                              const diffMins = Math.floor(diffMs / 60000);
                              const diffHours = Math.floor(diffMs / 3600000);
                              const diffDays = Math.floor(diffMs / 86400000);
                              if (diffDays < 1) {
                                if (diffHours < 1) {
                                  if (diffMins < 2) return 'LISTED JUST NOW';
                                  return `LISTED ${diffMins} MINS AGO`;
                                }
                                if (diffHours === 1) return 'LISTED 1 HOUR AGO';
                                return `LISTED ${diffHours} HOURS AGO`;
                              }
                              if (diffDays === 1) return 'LISTED YESTERDAY';
                              if (diffDays < 7) return `LISTED ${diffDays} DAYS AGO`;
                              const diffWeeks = Math.floor(diffDays / 7);
                              if (diffWeeks === 1) return 'LISTED 1 WEEK AGO';
                              if (diffWeeks < 4) return `LISTED ${diffWeeks} WEEKS AGO`;
                              const diffMonths = Math.floor(diffDays / 30);
                              if (diffMonths === 1) return 'LISTED 1 MONTH AGO';
                              return `LISTED ${diffMonths} MONTHS AGO`;
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a href="tel:+254712345678" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-md text-[10px] font-roboto font-semibold hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
                            <span className="w-3 h-3 flex items-center justify-center">
                              <i className="ri-phone-line text-[10px]"></i>
                            </span>
                            Call
                          </a>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-golden text-white rounded-md text-[10px] font-roboto font-semibold hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap">
                            <span className="w-3 h-3 flex items-center justify-center">
                              <i className="ri-chat-1-line text-[10px]"></i>
                            </span>
                            Contact
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 flex items-center justify-center text-sm font-roboto text-gray-500 hover:text-primary disabled:opacity-30 cursor-pointer border border-gray-200 rounded-md hover:border-primary"
                >
                  <i className="ri-arrow-left-s-line"></i>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 flex items-center justify-center text-sm font-roboto cursor-pointer transition-colors border rounded-md ${currentPage === page ? 'bg-primary text-white border-primary' : 'text-gray-500 border-gray-200 hover:border-primary hover:text-primary'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 flex items-center justify-center text-sm font-roboto text-gray-500 hover:text-primary disabled:opacity-30 cursor-pointer border border-gray-200 rounded-md hover:border-primary"
                >
                  <i className="ri-arrow-right-s-line"></i>
                </button>
              </div>
            )}

            {/* Bottom CTA */}
            <div className="mt-10 bg-[#f8f7f4] rounded-lg p-6 text-center">
              <h3 className="text-lg font-prata text-primary mb-2">Can&apos;t find what you&apos;re looking for?</h3>
              <p className="text-sm font-roboto text-gray-500 mb-4 max-w-md mx-auto">Register for property alerts and be the first to know about new homes for sale in your area.</p>
              <form data-readdy-form="true" id="buy-alert-form" onSubmit={handleEnquiry} className="flex flex-col sm:flex-row items-center gap-3 max-w-lg mx-auto">
                <input name="email" type="email" placeholder="Enter your email" required className="flex-1 w-full h-11 px-4 text-sm font-roboto border border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
                <input type="hidden" name="type" value="buy_alert" />
                <input type="hidden" name="location" value="Nairobi" />
                <button type="submit" disabled={enquiryStatus === 'submitting'} className="w-full sm:w-auto h-11 px-6 bg-primary text-white text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {enquiryStatus === 'success' ? 'Alert set!' : 'Get alerts'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar - Only in list view */}
          {viewMode === 'list' && (
            <div className="hidden lg:block lg:w-[30%] xl:w-[25%]">
              <div className="sticky top-[140px] space-y-4">
                {/* Similar search */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-roboto font-semibold text-primary">Houses for sale in Nairobi</h3>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-roboto text-gray-500">Refine your search with specific requirements</p>
                  </div>
                </div>

                {/* Nearby areas */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-roboto font-semibold text-primary">Nearby Nairobi</h3>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2">
                    {nearbyAreas.map((area) => (
                      <a key={area} href={`/buy?area=${encodeURIComponent(area.toLowerCase())}`} className="text-xs font-roboto text-gray-600 hover:text-primary hover:underline transition-colors">
                        {area}
                      </a>
                    ))}
                  </div>
                </div>

                {/* Related searches */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-roboto font-semibold text-primary">Related searches</h3>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {relatedSearches.map((search) => (
                      <a key={search} href={`/buy?q=${encodeURIComponent(search.toLowerCase())}`} className="block text-xs font-roboto text-gray-600 hover:text-primary hover:underline transition-colors">
                        {search}
                      </a>
                    ))}
                  </div>
                </div>

                {/* List property CTA */}
                <div className="bg-primary rounded-lg p-4 text-center">
                  <h3 className="text-white font-prata text-sm mb-2">List your property</h3>
                  <p className="text-white/70 font-roboto text-xs mb-3">Reach thousands of qualified buyers</p>
                  <Link to="/landlords" className="inline-flex items-center gap-1 px-4 py-2 bg-golden text-white font-roboto text-xs font-semibold rounded-md hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap">
                    Get started
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Map view */}
          {viewMode === 'map' && (
            <div className="lg:w-[45%] xl:w-[40%] lg:sticky lg:top-[180px] lg:h-[calc(100vh-200px)]" ref={mapRef}>
              <div className="w-full h-[400px] lg:h-full rounded-lg overflow-hidden border border-gray-200">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255281.1989180463!2d36.68258773125!3d-1.302861050000005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f1172d84d49a7%3A0xf7cf0254b297924c!2sNairobi%2C%20Kenya!5e0!3m2!1sen!2sus!4v1717000000000!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Property map - Nairobi"
                  className="w-full h-full"
                ></iframe>
              </div>
              {/* Map overlay cards */}
              <div className="hidden lg:block mt-3 space-y-2">
                {paginated.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${activeMapMarker === p.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => setActiveMapMarker(activeMapMarker === p.id ? null : p.id)}
                  >
                    <img src={p.image} alt={p.title} className="w-16 h-12 object-cover rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-roboto font-semibold text-primary truncate">{p.price}</p>
                      <p className="text-[10px] font-roboto text-gray-500 truncate">{p.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* === FOOTER CTA === */}
      <div className="bg-primary py-12 px-6 text-center">
        <p className="text-golden text-sm font-roboto tracking-widest uppercase mb-3">Own a Property?</p>
        <h2 className="text-white font-prata text-2xl md:text-3xl mb-3">List Your Property With Us</h2>
        <p className="text-white/70 font-roboto text-sm mb-7 max-w-md mx-auto">Reach thousands of qualified buyers. Get a free market valuation from our expert team today.</p>
        <Link to="/landlords" className="inline-flex items-center gap-2 px-8 py-3 bg-golden text-white font-roboto text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-colors">
          <i className="ri-home-heart-line"></i>Get Free Valuation
        </Link>
      </div>

      <ContactCTA pageSlug="buy" />
      <Footer />
      <BackToTop />
    </div>
  );
}