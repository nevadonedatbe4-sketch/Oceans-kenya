import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { NormalizedImage } from '@/lib/propertyImages';

interface PropertyImageCarouselProps {
  images: NormalizedImage[];
  detailHref: string;
  aspectClass: string;
}

// Isolated per-card image carousel. Maintains its own image index and never
// touches the homepage slide state. Images are absolutely stacked and
// crossfaded, which avoids the fragile flex + translateX collapse that caused
// only the first image to render.
export default function PropertyImageCarousel({
  images,
  detailHref,
  aspectClass,
}: PropertyImageCarouselProps) {
  const [current, setCurrent] = useState(0);
  const total = images.length;
  const multiple = total > 1;
  const showDots = multiple && total <= 6;

  const goPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrent((prev) => (prev - 1 + total) % total);
  };

  const goNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrent((prev) => (prev + 1) % total);
  };

  const goTo = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrent(index);
  };

  return (
    <div className={`group relative w-full overflow-hidden ${aspectClass}`}>
      {/* Clickable image area — opens the property detail page */}
      <Link to={detailHref} className="absolute inset-0 block" aria-label="View property details">
        {images.map((img, i) => (
          <img
            key={img.url}
            src={img.url}
            alt={img.alt}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-200 ${
              i === current ? 'opacity-100' : 'opacity-0'
            }`}
            loading={i <= 1 ? undefined : 'lazy'}
            decoding="async"
          />
        ))}
      </Link>

      {/* Previous / Next image controls */}
      {multiple && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-1.5 md:left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-white/90 text-[#002349] hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer whitespace-nowrap rounded-md"
            aria-label="Previous image"
          >
            <i className="ri-arrow-left-s-line text-base md:text-lg"></i>
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-white/90 text-[#002349] hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer whitespace-nowrap rounded-md"
            aria-label="Next image"
          >
            <i className="ri-arrow-right-s-line text-base md:text-lg"></i>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {showDots && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={goTo(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                i === current ? 'bg-white' : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to image ${i + 1}`}
            ></button>
          ))}
        </div>
      )}
    </div>
  );
}