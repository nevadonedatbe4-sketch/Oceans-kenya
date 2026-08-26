import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { JvImage } from '@/lib/jvImages';

interface ProjectCardProps {
  title: string;
  slug?: string;
  location: string;
  type: string;
  units: number;
  priceRange: string;
  description: string;
  status: string;
  images: JvImage[];
}

/**
 * A single "Projects Seeking Partners" card.
 *
 * Each card owns its image carousel state completely independently —
 * moving one project's image never touches any other project's image,
 * and the homepage card carousel (if any) is a separate concern entirely.
 *
 * Clicking the card (image/title/body) opens the project detail page.
 * The prev/next image controls stop propagation so they never navigate.
 */
export default function ProjectCard({
  title,
  slug,
  location,
  type,
  units,
  priceRange,
  description,
  status,
  images,
}: ProjectCardProps) {
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);
  const hasMultiple = images.length > 1;
  const detailUrl = slug ? `/joint-ventures/project/${slug}` : '/joint-ventures';

  const openDetail = () => navigate(detailUrl);

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage((prev) => (prev + 1 >= images.length ? 0 : prev + 1));
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage((prev) => (prev - 1 < 0 ? images.length - 1 : prev - 1));
  };

  return (
    <div
      onClick={openDetail}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(); } }}
      className="group bg-white border-2 border-primary/12 rounded-sm overflow-hidden hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Image carousel */}
      <div className="relative h-48 overflow-hidden bg-stone-100">
        {images.map((img, idx) => (
          <img
            key={img.id}
            src={img.url}
            alt={img.alt}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${
              idx === currentImage ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}

        {/* Type badge */}
        <span className="absolute top-3 left-3 bg-accent text-white text-[10px] font-roboto font-bold px-2.5 py-1 uppercase tracking-wider z-10">
          {type}
        </span>

        {/* Image counter */}
        {hasMultiple && (
          <span className="absolute bottom-3 right-3 z-10 bg-black/55 text-white text-[10px] font-roboto font-semibold px-2 py-0.5 rounded-sm tracking-wider">
            {currentImage + 1} / {images.length}
          </span>
        )}

        {/* Prev / Next controls */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/45 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/65"
            >
              <i className="ri-arrow-left-s-line text-base"></i>
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/45 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/65"
            >
              <i className="ri-arrow-right-s-line text-base"></i>
            </button>
          </>
        )}
      </div>

      {/* Body */}
      <div className="p-5 md:p-6 flex flex-col flex-1">
        <h3 className="font-roboto font-bold text-primary text-[18px] leading-snug mb-2">
          <Link to={detailUrl} onClick={(e) => e.stopPropagation()} className="hover:text-primary/80 transition-colors">
            {title}
          </Link>
        </h3>
        <p className="text-[#2D303D] font-roboto text-xs flex items-center gap-1.5 mb-3">
          <i className="ri-map-pin-2-line text-golden"></i>
          {location}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {units > 0 && (
            <span className="text-xs font-roboto font-semibold text-primary bg-white border border-[#002349] px-2.5 py-1 rounded-sm">
              <i className="ri-building-line mr-1 text-golden"></i>
              {units} units
            </span>
          )}
          {priceRange && (
            <span className="text-xs font-roboto font-semibold text-primary bg-white border border-[#002349] px-2.5 py-1 rounded-sm">
              <i className="ri-funds-line mr-1 text-golden"></i>
              {priceRange}
            </span>
          )}
        </div>
        <p className="text-[#2D303D] font-roboto text-xs leading-relaxed flex-1 mb-4">{description}</p>
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-primary/12">
          <span className="text-[14px] font-roboto font-bold text-accent uppercase tracking-wider leading-tight">
            {status}
          </span>
          <button
            onClick={openDetail}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#002349] text-white border-2 border-[#002349] font-roboto text-[11px] tracking-wider uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-[#003A6C] hover:text-white transition-colors"
          >
            View Project <i className="ri-arrow-right-line"></i>
          </button>
        </div>
      </div>
    </div>
  );
}