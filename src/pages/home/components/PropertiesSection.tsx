import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { properties } from '@/mocks/properties';

export default function PropertiesSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardsPerView = typeof window !== 'undefined' && window.innerWidth >= 768 ? 3 : 1;
  const totalSlides = Math.max(1, Math.ceil(properties.length / cardsPerView));

  useEffect(() => {
    const handleResize = () => {
      setCurrentSlide(0);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const getCardWidth = () => {
    if (typeof window === 'undefined') return 320;
    if (window.innerWidth >= 1024) return 360;
    if (window.innerWidth >= 768) return 320;
    return 280;
  };

  const visibleProperties = properties;

  return (
    <section id="properties" className="relative py-16 px-6 bg-[#f7f8fa]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-6 md:mb-10 gap-3 md:gap-4">
          <div>
            <p className="mb-1.5 md:mb-3 font-roboto text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] whitespace-nowrap text-golden">
              Exclusive
            </p>
            <h2 className="mb-1 md:mb-2 font-prata text-2xl md:text-3xl text-primary">
              Prime Residential Homes You&apos;ll Love
            </h2>
            <p className="text-[10px] sm:text-xs md:text-sm font-roboto font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] text-golden">
              Properties for sale and rent in Nairobi
            </p>
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto ml-auto md:ml-0">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="w-10 h-10 flex items-center justify-center border transition-all duration-200 cursor-pointer whitespace-nowrap border-gray-200 text-gray-300 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous"
            >
              <i className="ri-arrow-left-s-line text-xl"></i>
            </button>
            <button
              onClick={nextSlide}
              disabled={currentSlide >= totalSlides - 1}
              className="w-10 h-10 flex items-center justify-center border transition-all duration-200 cursor-pointer whitespace-nowrap border-primary text-primary hover:bg-primary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next"
            >
              <i className="ri-arrow-right-s-line text-xl"></i>
            </button>
          </div>
        </div>

        {/* Mobile grid */}
        <div className="grid md:hidden grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleProperties.slice(0, 4).map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        {/* Desktop carousel */}
        <div className="hidden md:block overflow-hidden">
          <div
            ref={carouselRef}
            className="flex items-stretch gap-5 transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * (getCardWidth() + 20)}px)` }}
          >
            {visibleProperties.map((property) => (
              <div key={property.id} className="flex-shrink-0 flex flex-col" style={{ width: getCardWidth() }}>
                <PropertyCard property={property} />
              </div>
            ))}
          </div>
        </div>

        {/* Pagination dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`transition-all duration-300 cursor-pointer whitespace-nowrap rounded-full ${
                i === currentSlide ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-gray-300 hover:bg-primary/40'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            ></button>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/all-properties"
            className="inline-flex items-center gap-2 bg-primary hover:bg-[#002349] text-white px-16 py-3.5 text-sm font-roboto transition-colors cursor-pointer whitespace-nowrap"
          >
            View More Properties
            <i className="ri-arrow-right-line"></i>
          </Link>
        </div>
      </div>
    </section>
  );
}

function PropertyCard({ property }: { property: (typeof properties)[0] }) {
  return (
    <Link to={`/property/${property.slug}`} className="block">
      <div className="bg-white overflow-hidden transition-all duration-300 group cursor-pointer flex flex-col w-full h-full">
        <div className="relative w-full overflow-hidden flex-shrink-0 aspect-[4/3]">
          <img
            alt={property.title}
            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
            src={property.image}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-100 transition-opacity duration-300 group-hover:from-black/40"></div>
          <div className="absolute top-3 left-3 z-10">
            <span className={`inline-block text-[9px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1.5 whitespace-nowrap text-white rounded-sm ${property.type === 'sale' ? 'bg-stone-800' : 'bg-primary'}`}>
              For {property.type === 'sale' ? 'Sale' : 'Rent'}
            </span>
          </div>
          {property.featured && (
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-block text-[9px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1.5 whitespace-nowrap bg-golden text-white rounded-sm">
                Featured
              </span>
            </div>
          )}
          <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 rounded-sm">
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-image-line text-xs"></i>
              </span>
              6
            </span>
          </div>
          <div className="absolute bottom-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 rounded-sm">
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-expand-diagonal-line text-xs"></i>
              </span>
              Preview
            </span>
          </div>
        </div>
        <div className="flex flex-col flex-1 p-4">
          <p className="flex items-center gap-1 truncate text-xs text-stone-500 mb-1">
            <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
              <i className="ri-map-pin-line text-xs"></i>
            </span>
            <span className="truncate">{property.location}</span>
          </p>
          <h3 className="leading-snug line-clamp-2 group-hover:text-primary transition-colors text-sm font-medium text-stone-800 mb-2">
            {property.title}
          </h3>
          <div className="flex items-center gap-4 text-xs whitespace-nowrap mb-3 text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-hotel-bed-line text-xs"></i></span>
              <span>{property.beds} Beds</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                <i className="ri-drop-line text-xs"></i>
              </span>
              <span>{property.baths} Baths</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-car-line text-xs"></i></span>
              <span>{property.parking} Parking</span>
            </span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 text-stone-400">{property.category}</p>
          <div className="mt-auto pt-3 border-t border-stone-100 flex items-end justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="font-bold leading-tight whitespace-nowrap text-primary text-base">
                {property.price}
                {property.priceUnit && (
                  <span className="text-xs font-normal ml-1">{property.priceUnit}</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-stone-400">
              <span className="flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                <i className="ri-time-line"></i>Listed {property.listedDays} days ago
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}