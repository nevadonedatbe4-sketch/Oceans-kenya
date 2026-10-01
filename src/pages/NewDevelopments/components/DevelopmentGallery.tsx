import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface DevelopmentGalleryProps {
  images: string[];
  name: string;
  /** Optional overlay rendered on top of the gallery (badges, price, etc.). */
  overlay?: React.ReactNode;
  /** When true, renders a clickable thumbnail strip underneath the main image. */
  showThumbnails?: boolean;
  /** Maximum number of thumbnails to render in the strip (Zoopla shows a small set). */
  thumbCount?: number;
  /**
   * When set, the main image becomes a link to the property detail page.
   * Omitted inside modals/previews where navigating away is undesirable.
   */
  detailHref?: string;
}

/**
 * A gallery with prev/next controls and an on-image counter, matching the
 * Zoopla-style "n/m" pattern. Optionally renders a clickable thumbnail strip
 * below the main image. Falls back to a placeholder icon when no image exists
 * so a card is never removed because of a missing asset.
 */
export default function DevelopmentGallery({ images, name, overlay, showThumbnails = false, thumbCount, detailHref }: DevelopmentGalleryProps) {
  const list = images.filter(Boolean);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= list.length && list.length > 0) setIndex(list.length - 1);
  }, [list.length, index]);

  const prev = useCallback(() => {
    if (list.length === 0) return;
    setIndex((i) => (i - 1 + list.length) % list.length);
  }, [list.length]);

  const next = useCallback(() => {
    if (list.length === 0) return;
    setIndex((i) => (i + 1) % list.length);
  }, [list.length]);

  const current = list[index];

  // Zoopla-style strip: show a small set of "extra" images, rotating so the
  // current image leads, then the following ones wrap around.
  const visibleThumbs = showThumbnails && list.length > 1
    ? Array.from({ length: Math.min(thumbCount ?? list.length, list.length) }, (_, k) => list[(index + k) % list.length])
    : [];

  return (
    <div className="flex flex-col w-full h-full bg-stone-100">
      {/* Main image area */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {current ? (
          detailHref ? (
            <Link to={detailHref} aria-label={`View ${name}`} className="absolute inset-0 block cursor-pointer">
              <img
                alt={name}
                title={name}
                className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300"
                src={current}
              />
            </Link>
          ) : (
            <img
              alt={name}
              title={name}
              className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300"
              src={current}
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="ri-building-2-line text-5xl text-primary/30"></i>
          </div>
        )}

        {overlay}

        {/* Image counter (only when more than one image) */}
        {list.length > 1 && (
          <div className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1 px-2 py-1 bg-black/55 text-white text-xs rounded">
            <i className="ri-image-line text-xs"></i>
            <span>{index + 1}/{list.length}</span>
          </div>
        )}

        {/* Prev / Next arrows */}
        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-11 md:w-8 md:h-12 flex items-center justify-center rounded-md bg-white/90 text-primary shadow-sm hover:bg-white transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-s-line text-lg"></i>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-11 md:w-8 md:h-12 flex items-center justify-center rounded-md bg-white/90 text-primary shadow-sm hover:bg-white transition-colors cursor-pointer"
            >
              <i className="ri-arrow-right-s-line text-lg"></i>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {showThumbnails && list.length > 1 && (
        <div className="flex gap-[3px] p-[3px] bg-white overflow-x-auto no-scrollbar">
          {visibleThumbs.map((img, i) => {
            return (
              <button
                key={`${img}-${i}`}
                type="button"
                onClick={() => setIndex((list.indexOf(img) + list.length) % list.length)}
                aria-label={`View image ${i + 1}`}
                className="relative flex-1 h-40 sm:h-[11.5rem] shrink-0 overflow-hidden transition-all duration-200 cursor-pointer opacity-100 hover:opacity-90"
              >
                <img src={img} alt={`${name} ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}