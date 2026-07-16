import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageContactSection from '@/components/feature/PageContactSection';


interface School {
  id: string;
  name: string;
  type: 'Primary' | 'Secondary' | 'International' | 'Nursery';
  curriculum: string;
  location: string;
  rating: number;
  distance: string;
  fees: string;
  established: number;
  students: number;
  image: string;
  features: string[];
}

const schools: School[] = [
  {
    id: '1',
    name: 'Brookhouse School',
    type: 'International',
    curriculum: 'British (IGCSE / A-Levels)',
    location: 'Karen',
    rating: 4.8,
    distance: '1.2 km',
    fees: 'KSh 1.2M - 2.5M per year',
    established: 1981,
    students: 800,
    image: 'https://readdy.ai/api/search-image?query=Modern%20private%20school%20campus%20with%20red%20brick%20buildings%20and%20green%20sports%20fields%20in%20Nairobi%20Kenya%20on%20a%20sunny%20day%20with%20blue%20sky%20and%20white%20clouds%2C%20professional%20architectural%20photography%2C%20warm%20lighting%2C%20clean%20composition&width=600&height=400&seq=1&orientation=landscape',
    features: ['Boarding', 'Swimming pool', 'Equestrian centre', 'STEM lab'],
  },
  {
    id: '2',
    name: 'Peponi School',
    type: 'International',
    curriculum: 'British (IGCSE)',
    location: 'Runda',
    rating: 4.7,
    distance: '0.8 km',
    fees: 'KSh 1.5M - 2.8M per year',
    established: 1989,
    students: 650,
    image: 'https://readdy.ai/api/search-image?query=Prestigious%20international%20school%20campus%20with%20colonial%20style%20buildings%20and%20lush%20green%20gardens%20in%20Nairobi%20Kenya%2C%20warm%20golden%20afternoon%20light%2C%20professional%20real%20estate%20photography%2C%20elegant%20architecture&width=600&height=400&seq=2&orientation=landscape',
    features: ['Boarding', 'Tennis courts', 'Theatre', 'Music academy'],
  },
  {
    id: '3',
    name: 'Nairobi International School',
    type: 'International',
    curriculum: 'American (AP)',
    location: 'Kilimani',
    rating: 4.6,
    distance: '1.5 km',
    fees: 'KSh 1.1M - 2.2M per year',
    established: 2003,
    students: 500,
    image: 'https://readdy.ai/api/search-image?query=Modern%20contemporary%20school%20building%20with%20glass%20windows%20and%20concrete%20architecture%20in%20Nairobi%20Kenya%2C%20clean%20minimalist%20design%2C%20professional%20architectural%20photography%2C%20bright%20daylight%2C%20blue%20sky&width=600&height=400&seq=3&orientation=landscape',
    features: ['Day school', 'Robotics club', 'Art studio', 'Basketball court'],
  },
  {
    id: '4',
    name: 'St. Marys School Nairobi',
    type: 'Secondary',
    curriculum: 'KCSE / IB',
    location: 'Lavington',
    rating: 4.5,
    distance: '0.5 km',
    fees: 'KSh 350K - 600K per year',
    established: 1939,
    students: 1200,
    image: 'https://readdy.ai/api/search-image?query=Historic%20Catholic%20boys%20school%20with%20stone%20chapel%20and%20traditional%20buildings%20in%20Nairobi%20Kenya%2C%20established%20institution%20with%20green%20lawns%20and%20mature%20trees%2C%20warm%20natural%20lighting%2C%20professional%20photography&width=600&height=400&seq=4&orientation=landscape',
    features: ['Boarding', 'Chapel', 'Rugby pitch', 'Science labs'],
  },
  {
    id: '5',
    name: 'Kilimani Junior Academy',
    type: 'Primary',
    curriculum: 'British / KCPE',
    location: 'Kilimani',
    rating: 4.4,
    distance: '0.3 km',
    fees: 'KSh 200K - 400K per year',
    established: 1995,
    students: 400,
    image: 'https://readdy.ai/api/search-image?query=Colorful%20primary%20school%20campus%20with%20playground%20and%20modern%20classrooms%20in%20Nairobi%20Kenya%2C%20vibrant%20children%20playground%20equipment%2C%20bright%20cheerful%20architecture%2C%20sunny%20day%20with%20blue%20sky&width=600&height=400&seq=5&orientation=landscape',
    features: ['Day school', 'Playground', 'Swimming pool', 'Library'],
  },
  {
    id: '6',
    name: 'Runda Academy',
    type: 'Primary',
    curriculum: 'British (Key Stages)',
    location: 'Runda',
    rating: 4.3,
    distance: '1.0 km',
    fees: 'KSh 250K - 450K per year',
    established: 2001,
    students: 350,
    image: 'https://readdy.ai/api/search-image?query=Small%20private%20primary%20school%20with%20charming%20single-story%20buildings%20and%20manicured%20gardens%20in%20Nairobi%20Kenya%2C%20quaint%20educational%20facility%2C%20warm%20afternoon%20light%2C%20professional%20photography&width=600&height=400&seq=6&orientation=landscape',
    features: ['Day school', 'Garden', 'Football pitch', 'Computer lab'],
  },
  {
    id: '7',
    name: 'Westlands Academy',
    type: 'International',
    curriculum: 'Montessori / British',
    location: 'Westlands',
    rating: 4.5,
    distance: '0.7 km',
    fees: 'KSh 800K - 1.5M per year',
    established: 1998,
    students: 450,
    image: 'https://readdy.ai/api/search-image?query=Modern%20international%20school%20with%20Montessori%20learning%20spaces%20and%20outdoor%20play%20areas%20in%20Nairobi%20Kenya%2C%20contemporary%20educational%20architecture%2C%20natural%20light%2C%20green%20landscaping%2C%20professional%20photography&width=600&height=400&seq=7&orientation=landscape',
    features: ['Day school', 'Montessori', 'Swimming', 'Music room'],
  },
  {
    id: '8',
    name: 'Lavington Primary School',
    type: 'Primary',
    curriculum: 'KCPE',
    location: 'Lavington',
    rating: 4.2,
    distance: '0.4 km',
    fees: 'KSh 150K - 300K per year',
    established: 1962,
    students: 600,
    image: 'https://readdy.ai/api/search-image?query=Traditional%20Kenyan%20primary%20school%20with%20red%20tile%20roofs%20and%20spacious%20assembly%20grounds%20in%20Nairobi%20Kenya%2C%20established%20public%20institution%2C%20mature%20trees%2C%20warm%20natural%20lighting%2C%20professional%20photography&width=600&height=400&seq=8&orientation=landscape',
    features: ['Day school', 'Assembly hall', 'Netball court', 'Garden'],
  },
  {
    id: '9',
    name: 'Muthaiga Prep School',
    type: 'Nursery',
    curriculum: 'Early Years / Montessori',
    location: 'Muthaiga',
    rating: 4.6,
    distance: '0.6 km',
    fees: 'KSh 300K - 550K per year',
    established: 1985,
    students: 180,
    image: 'https://readdy.ai/api/search-image?query=Cozy%20nursery%20school%20with%20colorful%20outdoor%20play%20area%20and%20small%20classroom%20buildings%20in%20Nairobi%20Kenya%2C%20warm%20welcoming%20early%20education%20center%2C%20bright%20cheerful%20colors%2C%20sunny%20day%2C%20professional%20photography&width=600&height=400&seq=9&orientation=landscape',
    features: ['Day school', 'Nursery', 'Playground', 'Sandpit'],
  },
  {
    id: '10',
    name: 'Karen C Secondary',
    type: 'Secondary',
    curriculum: 'KCSE',
    location: 'Karen',
    rating: 4.1,
    distance: '1.8 km',
    fees: 'KSh 180K - 350K per year',
    established: 1975,
    students: 900,
    image: 'https://readdy.ai/api/search-image?query=Secondary%20school%20campus%20with%20multiple%20classroom%20blocks%20and%20sports%20field%20in%20Nairobi%20Kenya%2C%20functional%20educational%20facility%2C%20wide%20open%20grounds%2C%20warm%20afternoon%20light%2C%20professional%20photography&width=600&height=400&seq=10&orientation=landscape',
    features: ['Day & Boarding', 'Rugby', 'Labs', 'Library'],
  },
];

const schoolTypeFilters = ['All', 'Primary', 'Secondary', 'International', 'Nursery'];
const curriculumFilters = ['All', 'British', 'American', 'KCSE', 'KCPE', 'Montessori', 'IB'];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <i
          key={s}
          className={`ri-star-fill text-xs ${s <= Math.round(rating) ? 'text-golden' : 'text-gray-300'}`}
        ></i>
      ))}
      <span className="text-xs font-roboto text-gray-600 ml-1">{rating}</span>
    </div>
  );
}

export default function Schools() {
  const [selectedType, setSelectedType] = useState('All');
  const [selectedCurriculum, setSelectedCurriculum] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const filtered = schools.filter((s) => {
    const typeMatch = selectedType === 'All' || s.type === selectedType;
    const curriculumMatch = selectedCurriculum === 'All' || s.curriculum.includes(selectedCurriculum);
    const searchMatch = searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.location.toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatch && curriculumMatch && searchMatch;
  });

  return (
    <div className="min-h-screen bg-white flex flex-col pt-[92px]">
      <Header />

      {/* Hero */}
      <div className="relative h-[320px] md:h-[400px] overflow-hidden">
        <img
          src="https://readdy.ai/api/search-image?query=Aerial%20view%20of%20Nairobi%20school%20campus%20with%20green%20sports%20fields%20and%20modern%20buildings%20surrounded%20by%20trees%2C%20warm%20golden%20hour%20lighting%2C%20professional%20drone%20photography%2C%20beautiful%20educational%20facility%20landscape%2C%20Kenya&width=1400&height=500&seq=11&orientation=landscape"
          alt="Schools in Nairobi"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50"></div>
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div>
            <h1 className="text-white font-roboto font-bold text-3xl md:text-4xl mb-3">Schools in Nairobi</h1>
            <p className="text-white/80 font-roboto text-sm md:text-base max-w-lg mx-auto">
              Discover the best schools in every neighbourhood. Find properties near top-rated institutions for your family.
            </p>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="sticky top-[92px] z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 md:px-6 lg:px-10 py-3 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <div className="flex items-center gap-2.5 px-4 h-10 bg-white border border-gray-300 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  <i className="ri-search-line text-gray-400 text-sm"></i>
                </span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search schools or neighbourhoods..."
                  className="flex-1 min-w-0 text-sm font-roboto text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer">
                    <i className="ri-close-line text-xs"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              {schoolTypeFilters.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-roboto font-medium cursor-pointer transition-colors whitespace-nowrap ${selectedType === t ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedCurriculum}
                  onChange={(e) => setSelectedCurriculum(e.target.value)}
                  className="appearance-none h-9 px-3 pr-8 text-xs font-roboto font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none cursor-pointer"
                >
                  {curriculumFilters.map((c) => (
                    <option key={c}>{c === 'All' ? 'All curriculums' : c}</option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
              </div>
            </div>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-roboto text-gray-700 cursor-pointer"
            >
              <i className="ri-equalizer-line text-xs"></i>
              Filters
            </button>
          </div>

          {/* Mobile filters */}
          {showMobileFilters && (
            <div className="md:hidden flex flex-wrap gap-2 mt-3 pb-2">
              {schoolTypeFilters.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-roboto font-medium cursor-pointer transition-colors whitespace-nowrap ${selectedType === t ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="px-4 md:px-6 lg:px-10 pt-6 pb-2 max-w-[1400px] mx-auto w-full">
        <p className="text-xs font-roboto text-gray-500">
          Showing <span className="text-primary font-semibold">{filtered.length}</span> schools
          {selectedType !== 'All' && ` in ${selectedType}`}
          {selectedCurriculum !== 'All' && ` with ${selectedCurriculum} curriculum`}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 md:px-6 lg:px-10 pb-10 max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Schools List */}
          <div className="lg:w-[65%] xl:w-[70%]">
            <div className="space-y-4">
              {filtered.map((school) => (
                <div
                  key={school.id}
                  className="flex flex-col sm:flex-row bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200"
                >
                  {/* Image */}
                  <div className="relative sm:w-[220px] lg:w-[260px] h-[180px] sm:h-auto flex-shrink-0 overflow-hidden">
                    <img
                      src={school.image}
                      alt={school.name}
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute top-2 left-2">
                      <span className={`text-[10px] font-roboto font-semibold px-2 py-0.5 rounded text-white ${school.type === 'International' ? 'bg-[#0E7C7B]' : school.type === 'Secondary' ? 'bg-[#4B0082]' : school.type === 'Primary' ? 'bg-[#D2691E]' : 'bg-[#556B2F]'}`}>
                        {school.type}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-roboto font-bold text-sm md:text-base text-primary leading-snug">{school.name}</h3>
                        <StarRating rating={school.rating} />
                      </div>
                      <p className="flex items-center gap-1.5 text-sm font-roboto text-gray-500 mb-2">
                        <span className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-map-pin-line text-primary text-sm"></i>
                        </span>
                        {school.location}, Nairobi
                      </p>
                      <div className="flex items-center gap-3 mb-2 text-xs font-roboto text-gray-600">
                        <span className="flex items-center gap-1">
                          <i className="ri-book-open-line text-primary text-xs"></i>
                          {school.curriculum}
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="ri-calendar-line text-primary text-xs"></i>
                          Est. {school.established}
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="ri-user-line text-primary text-xs"></i>
                          {school.students} students
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2 text-xs font-roboto text-gray-500">
                        <span className="flex items-center gap-1">
                          <i className="ri-money-dollar-circle-line text-primary text-xs"></i>
                          {school.fees}
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="ri-route-line text-primary text-xs"></i>
                          {school.distance} from centre
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {school.features.map((f) => (
                          <span key={f} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-roboto rounded">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <Link
                        to={`/rent?area=${school.location.toLowerCase()}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-md text-[10px] font-roboto font-semibold hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-home-4-line text-[10px]"></i>
                        Properties nearby
                      </Link>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md text-[10px] font-roboto font-semibold hover:border-primary hover:text-primary transition-colors cursor-pointer whitespace-nowrap">
                        <i className="ri-phone-line text-[10px]"></i>
                        Contact school
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 bg-gray-100 rounded-full">
                  <i className="ri-school-line text-gray-400 text-xl"></i>
                </div>
                <h3 className="text-sm font-roboto font-semibold text-gray-700 mb-1">No schools found</h3>
                <p className="text-xs font-roboto text-gray-500">Try adjusting your filters or search query</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block lg:w-[35%] xl:w-[30%]">
            <div className="sticky top-[140px] space-y-4">
              {/* By neighbourhood */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-roboto font-semibold text-primary">Schools by Neighbourhood</h3>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {['Karen', 'Runda', 'Lavington', 'Kilimani', 'Westlands', 'Muthaiga'].map((area) => {
                    const count = schools.filter((s) => s.location === area).length;
                    return (
                      <button
                        key={area}
                        onClick={() => setSearchQuery(area)}
                        className="w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-xs font-roboto cursor-pointer hover:bg-gray-50 transition-colors text-gray-600"
                      >
                        <span className="flex items-center gap-2">
                          <i className="ri-map-pin-2-line text-xs"></i>
                          {area}
                        </span>
                        <span className="text-gray-400">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type breakdown */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-roboto font-semibold text-primary">School Types</h3>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {schoolTypeFilters.slice(1).map((t) => {
                    const count = schools.filter((s) => s.type === t).length;
                    return (
                      <div key={t} className="flex items-center justify-between text-xs font-roboto text-gray-600">
                        <span>{t}</span>
                        <span className="text-gray-400">{count} schools</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CTA */}
              <div className="bg-primary rounded-lg p-4 text-center">
                <h3 className="text-white font-roboto font-bold text-sm mb-2">Looking for a family home?</h3>
                <p className="text-white/70 font-roboto text-xs mb-3">Find properties near the best schools in Nairobi</p>
                <Link to="/rent" className="inline-flex items-center gap-1 px-4 py-2 bg-golden text-white font-roboto text-xs font-semibold rounded-md hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap">
                  Browse rentals
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}