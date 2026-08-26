import { useState, useCallback, useRef, useEffect } from 'react';

interface ListingImage {
  id: string;
  url: string;
  sort_order: number;
}

interface GalleryProps {
  images: ListingImage[];
  mainImage: string;
  title: string;
  statusLabel: string;
}

export default function PropertyGallery({ images, mainImage, title, statusLabel }: GalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  const allImages = images.length > 0 ? images.map((i) => i.url) : [mainImage];
  const displayImages = allImages.slice(0, 5);
  const hasMultipleImages = allImages.length > 1;

  const openLightboxAt = useCallback((idx: number) => {
    setLbIndex(idx);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const lbPrev = useCallback(() => setLbIndex((i) => (i === 0 ? allImages.length - 1 : i - 1)), [allImages.length]);
  const lbNext = useCallback(() => setLbIndex((i) => (i + 1) % allImages.length), [allImages.length]);

  return (
    <>
      {/* ── Desktop Gallery — James Edition 55/35 split, landscape-optimized ── */}
      <div className="hidden md:flex relative gap-2.5 h-[420px]">
        {/* Single image — full width when no extras */}
        {!hasMultipleImages ? (
          <div className="w-full relative overflow-hidden cursor-pointer group" onClick={() => openLightboxAt(0)}>
            <img
              src={displayImages[0] || mainImage}
              alt={title}
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
              decoding="async"
              fetchPriority="high"
            />
            <div className="absolute top-5 left-5">
              <span className="px-3.5 py-1.5 bg-black/70 text-white text-[11px] font-roboto font-semibold uppercase tracking-[0.15em]">
                {statusLabel}
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* ── Main image — 55% ── */}
            <div
              className="w-[55%] relative overflow-hidden cursor-pointer group"
              onClick={() => openLightboxAt(0)}
            >
              <img
                src={displayImages[0] || mainImage}
                alt={title}
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
                decoding="async"
                fetchPriority="high"
              />
              {/* Status badge — James Edition style */}
              <div className="absolute top-5 left-5">
                <span className="px-3.5 py-1.5 bg-black/70 text-white text-[11px] font-roboto font-semibold uppercase tracking-[0.15em]">
                  {statusLabel}
                </span>
              </div>
            </div>

            {/* ── Right grid — 35%, 2×2 ── */}
            <div className="w-[35%] grid grid-cols-2 grid-rows-2 gap-2.5">
              {displayImages.slice(1, 5).map((url, idx, arr) => (
                <div
                  key={idx + 1}
                  className="relative overflow-hidden cursor-pointer group"
                  onClick={() => openLightboxAt(idx + 1)}
                >
                  <img
                    src={url}
                    alt={`${title} ${idx + 2}`}
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.04]"
                    decoding="async"
                    loading="lazy"
                  />
                  {/* "Show all photos" button overlaid on last thumbnail */}
                  {idx === arr.length - 1 && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); openLightboxAt(0); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/95 text-gray-900 text-[11px] font-roboto font-semibold tracking-wide hover:bg-white transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <span className="w-3.5 h-3.5 flex items-center justify-center">
                          <i className="ri-image-line text-xs"></i>
                        </span>
                        Show all photos
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

      </div>

      {/* Mobile Gallery with inline swipe */}
      <MobileGallery
        images={allImages}
        title={title}
        statusLabel={statusLabel}
        hasMultipleImages={hasMultipleImages}
        onOpenLightbox={openLightboxAt}
      />

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={closeLightbox}>
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer z-10"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); lbPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white cursor-pointer z-10"
          >
            <i className="ri-arrow-left-s-line text-xl"></i>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); lbNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white cursor-pointer z-10"
          >
            <i className="ri-arrow-right-s-line text-xl"></i>
          </button>
          <div className="max-w-5xl max-h-[85vh] px-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <img
                src={allImages[lbIndex]}
                alt={`${title} ${lbIndex + 1}`}
                className="max-w-full max-h-[85vh] object-contain"
              />
              {/* Watermark — iStock-style protection (lightbox view) */}
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none text-white/50 font-prata text-[23px] whitespace-nowrap">
                Oceans.ke
              </span>
            </div>
            <p className="text-center text-white/60 text-xs font-roboto mt-3">
              {lbIndex + 1} / {allImages.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Mobile Gallery with inline image cycling ── */
interface MobileGalleryProps {
  images: string[];
  title: string;
  statusLabel: string;
  hasMultipleImages: boolean;
  onOpenLightbox: (idx: number) => void;
}

function MobileGallery({ images, title, statusLabel, hasMultipleImages, onOpenLightbox }: MobileGalleryProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartRef = useRef(0);
  const touchEndRef = useRef(0);

  // Preload the next image so the swipe/next transition is instant
  useEffect(() => {
    if (images.length <= 1) return;
    const next = images[(currentIdx + 1) % images.length];
    if (next) {
      const preloader = new Image();
      preloader.src = next;
    }
  }, [currentIdx, images]);

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % images.length);
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (images.length <= 1) return;
    const diff = touchStartRef.current - touchEndRef.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setCurrentIdx((prev) => (prev + 1) % images.length);
      } else {
        setCurrentIdx((prev) => (prev - 1 + images.length) % images.length);
      }
    }
  };

  return (
    <div
      className="md:hidden relative h-[260px] overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="w-full h-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[currentIdx] || images[0]}
          alt={`${title} ${currentIdx + 1} of ${images.length}`}
          className="w-full h-full object-cover object-center"
          decoding="async"
          fetchPriority={currentIdx === 0 ? 'high' : undefined}
          onClick={() => onOpenLightbox(currentIdx)}
        />
      </div>

      <div className="absolute top-3 left-3 z-10">
        <span className="px-2.5 py-1 bg-black/70 text-white text-[10px] font-roboto font-semibold uppercase tracking-wider">
          {statusLabel}
        </span>
      </div>

      {hasMultipleImages && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>

          <button
            onClick={goPrev}
            className={`absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-white/90 text-gray-700 hover:bg-white hover:text-gray-900 transition-all duration-200 cursor-pointer whitespace-nowrap ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            aria-label="Previous image"
          >
            <i className="ri-arrow-left-s-line text-lg"></i>
          </button>

          <button
            onClick={goNext}
            className={`absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-white/90 text-gray-700 hover:bg-white hover:text-gray-900 transition-all duration-200 cursor-pointer whitespace-nowrap ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            aria-label="Next image"
          >
            <i className="ri-arrow-right-s-line text-lg"></i>
          </button>

          <div className="absolute bottom-3 left-3 z-10">
            <span className="flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60">
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-image-line text-xs"></i>
              </span>
              {currentIdx + 1}/{images.length}
            </span>
          </div>

          <button
            onClick={() => onOpenLightbox(currentIdx)}
            className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 text-white text-[10px] font-roboto font-medium rounded-full cursor-pointer whitespace-nowrap"
          >
            <i className="ri-grid-line"></i>All photos
          </button>
        </>
      )}
    </div>
  );
}