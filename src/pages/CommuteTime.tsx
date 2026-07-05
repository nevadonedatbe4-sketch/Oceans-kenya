import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import { properties } from '@/mocks/properties';

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

const commuteProperties: CommuteProperty[] = properties.map((p, i) => {
  const commuteTimes = [12, 18, 25, 8, 22, 35, 15, 28, 10, 30, 20];
  const distances = [3.2, 5.1, 7.8, 2.4, 6.5, 12.0, 4.3, 9.2, 2.8, 11.5, 6.0];
  return {
    ...p,
    receptions: Math.max(1, Math.floor(p.beds / 2)),
    commuteTime: commuteTimes[i] || 15,
    commuteMode: i % 3 === 0 ? 'Driving' : i % 3 === 1 ? 'Public transit' : 'Walking',
    distance: distances[i] || 5,
  };
});

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

export default function CommuteTime() {
  const [destination, setDestination] = useState('Nairobi CBD');
  const [transportMode, setTransportMode] = useState('Driving');
  const [maxTime, setMaxTime] = useState('Under 30 min');
  const [showFilters, setShowFilters] = useState(false);

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
            <h1 className="text-2xl md:text-3xl font-prata text-primary mb-2">Commute Time Search</h1>
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
            <button className="h-12 px-6 bg-primary text-white text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap">
              Search
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-6 mt-4 text-xs font-roboto text-gray-500">
            <span>
              <span className="text-primary font-semibold">{filtered.length}</span> properties within {maxTime.toLowerCase()} to {destination}
            </span>
            <span>
              Average commute: <span className="text-primary font-semibold">{avgTime} min</span> ({transportMode.toLowerCase()})
            </span>
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

            <div className="space-y-4">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row bg-white border border-gray-200 rounded-lg overflow-hidden sm:h-[220px] hover:border-gray-300 hover:shadow-md transition-all duration-200"
                >
                  {/* Image */}
                  <div className="relative sm:w-[260px] lg:w-[300px] h-[180px] sm:h-full flex-shrink-0 overflow-hidden">
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
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden">
                    <div>
                      <span className="font-prata text-lg md:text-xl text-primary font-semibold">{p.price}</span>
                      {p.priceUnit && <span className="text-sm text-gray-500 font-roboto ml-1">{p.priceUnit}</span>}
                      <Link to={`/property/${p.slug}`} className="block hover:underline mt-1">
                        <h3 className="font-prata text-sm md:text-base text-primary leading-snug mb-1">{p.title}</h3>
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
              ))}
            </div>
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

      <Footer />
      <BackToTop />
    </div>
  );
}