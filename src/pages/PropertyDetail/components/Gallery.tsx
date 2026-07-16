import { useState, useCallback } from 'react';

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
  const hasExtras = allImages.length > 5;
  const displayImages = allImages.slice(0, 5);
  const extraCount = allImages.length - 5;

  const openLightboxAt = useCallback((idx: number) => {
    setLbIndex(idx);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const lbPrev = useCallback(() => setLbIndex((i) => (i === 0 ? allImages.length - 1 : i - 1)), [allImages.length]);
  const lbNext = useCallback(() => setLbIndex((i) => (i + 1) % allImages.length), [allImages.length]);

  return (
    <>
      {/* Desktop Gallery */}
      <div className="hidden md:flex gap-2 h-[460px]">
        {/* Main image (60%) */}
        <div className="w-[60%] relative overflow-hidden rounded-[2px] cursor-pointer group" onClick={() => openLightboxAt(0)}>
          <img src={displayImages[0] || mainImage} alt={title} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" />
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1.5 bg-primary/90 text-white text-[10px] font-roboto font-semibold uppercase tracking-widest">
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Right grid (40%) */}
        <div className="w-[40%] grid grid-cols-2 grid-rows-2 gap-2">
          {displayImages.slice(1, 5).map((url, idx) => (
            <div
              key={idx + 1}
              className={`relative overflow-hidden rounded-[2px] cursor-pointer group ${idx === 3 && hasExtras ? '' : ''}`}
              onClick={() => openLightboxAt(idx + 1)}
            >
              <img src={url} alt={`${title} ${idx + 2}`} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.05]" />
              {idx === 3 && hasExtras && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-roboto text-sm font-semibold">+{extraCount} more</span>
                </div>
              )}
            </div>
          ))}
          {/* Fill empty slots if fewer than 4 extra images */}
          {Array.from({ length: Math.max(0, 4 - displayImages.slice(1, 5).length) }).map((_, idx) => (
            <div key={`empty-${idx}`} className="relative overflow-hidden rounded-[2px] bg-stone-100 flex items-center justify-center">
              <i className="ri-image-line text-stone-300 text-2xl"></i>
            </div>
          ))}
        </div>

        {/* Floating "Show all photos" button */}
        {allImages.length > 1 && (
          <button
            onClick={() => openLightboxAt(0)}
            className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 bg-white text-primary text-xs font-roboto font-semibold tracking-wide rounded-[2px] shadow-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap z-10"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-camera-line"></i>
            </span>
            Show all {allImages.length} photos
          </button>
        )}
      </div>

      {/* Mobile Gallery */}
      <div className="md:hidden relative h-[260px] overflow-hidden rounded-[2px]">
        <img src={displayImages[0] || mainImage} alt={title} className="w-full h-full object-cover object-top" />
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 bg-primary/90 text-white text-[10px] font-roboto font-semibold uppercase tracking-widest">
            {statusLabel}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        {allImages.length > 1 && (
          <>
            <button
              onClick={() => openLightboxAt(0)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 text-white rounded-[2px] cursor-pointer"
            >
              <i className="ri-arrow-left-s-line"></i>
            </button>
            <button
              onClick={() => openLightboxAt(0)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 text-white rounded-[2px] cursor-pointer"
            >
              <i className="ri-arrow-right-s-line"></i>
            </button>
            <button
              onClick={() => openLightboxAt(0)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 text-white text-[10px] font-roboto font-medium rounded-full cursor-pointer whitespace-nowrap"
            >
              <i className="ri-grid-line"></i>All photos
            </button>
          </>
        )}
      </div>

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
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full cursor-pointer z-10"
          >
            <i className="ri-arrow-left-s-line text-xl"></i>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); lbNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full cursor-pointer z-10"
          >
            <i className="ri-arrow-right-s-line text-xl"></i>
          </button>
          <div className="max-w-5xl max-h-[85vh] px-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={allImages[lbIndex]}
              alt={`${title} ${lbIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-[2px]"
            />
            <p className="text-center text-white/60 text-xs font-roboto mt-3">
              {lbIndex + 1} / {allImages.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}