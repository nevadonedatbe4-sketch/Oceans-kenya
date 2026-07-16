import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

export interface QuickViewProperty {
  id: string;
  slug: string;
  title: string;
  price: string;
  priceUnit?: string;
  location: string;
  category?: string;
  beds: number;
  baths: number;
  parking?: number;
  receptions?: number;
  description?: string;
  images: string[];
  type?: 'sale' | 'rent';
  agentPhone?: string;
  agentEmail?: string;
}

interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: QuickViewProperty | null;
}

export default function QuickViewModal({ isOpen, onClose, property }: QuickViewModalProps) {
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (property) setImgIdx(0);
  }, [property]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleEsc]);

  if (!isOpen || !property) return null;

  const images = property.images.length > 0 ? property.images : ['https://readdy.ai/api/search-image?query=Modern%20luxury%20real%20estate%20property%20exterior%20with%20clean%20white%20walls%20spacious%20living%20area%20large%20windows%20bright%20daylight%20architectural%20photography%20high%20quality%20warm%20neutral%20background&width=1000&height=600&seq=qv-fallback&orientation=landscape'];
  const totalImages = images.length;

  const nextImg = () => { if (totalImages > 1) setImgIdx((p) => (p + 1) % totalImages); };
  const prevImg = () => { if (totalImages > 1) setImgIdx((p) => (p === 0 ? totalImages - 1 : p - 1)); };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white cursor-pointer transition-colors"
        >
          <i className="ri-close-line text-lg"></i>
        </button>

        {/* Image Gallery */}
        <div className="relative w-full h-[360px] md:h-[460px] bg-stone-100 flex-shrink-0 overflow-hidden group">
          <img
            src={images[imgIdx]}
            alt={property.title}
            className="w-full h-full object-cover object-top"
          />

          {/* Image counter */}
          {totalImages > 1 && (
            <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs font-roboto font-semibold px-2 py-0.5 rounded">
              {imgIdx + 1}/{totalImages}
            </div>
          )}

          {/* Nav arrows */}
          {totalImages > 1 && (
            <>
              <button
                onClick={prevImg}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
              >
                <i className="ri-arrow-left-s-line text-xl"></i>
              </button>
              <button
                onClick={nextImg}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
              >
                <i className="ri-arrow-right-s-line text-xl"></i>
              </button>
            </>
          )}

          {/* Dot indicators */}
          {totalImages > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {Array.from({ length: totalImages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-2 h-2 rounded-full cursor-pointer transition-all ${i === imgIdx ? 'bg-white w-5' : 'bg-white/50 hover:bg-white/80'}`}
                />
              ))}
            </div>
          )}

          {/* Type badge */}
          {property.type && (
            <div className="absolute top-3 left-3">
              <span className={`text-[10px] font-roboto font-semibold px-2.5 py-1 rounded text-white uppercase tracking-wider ${property.type === 'rent' ? 'bg-[#0E7C7B]' : 'bg-[#002349]'}`}>
                For {property.type === 'rent' ? 'Rent' : 'Sale'}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl md:text-3xl font-roboto font-medium text-[#002349]">{property.price}</span>
                {property.priceUnit && <span className="text-sm text-gray-500 font-roboto">{property.priceUnit}</span>}
              </div>
              <h2 className="text-lg md:text-xl font-roboto font-bold text-primary leading-snug mb-2">{property.title}</h2>
              <p className="flex items-center gap-1.5 text-sm font-roboto text-gray-500">
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-map-pin-line text-primary text-sm"></i>
                </span>
                {property.location}
              </p>
            </div>
            <Link
              to={`/property/${property.slug}`}
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-eye-line"></i>
              View Full Details
            </Link>
          </div>

          {/* Key details */}
          <div className="flex flex-wrap items-center gap-5 mb-4">
            {property.beds > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-roboto text-[#363535]">
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-hotel-bed-line text-[#636363]"></i>
                </span>
                {property.beds} Beds
              </span>
            )}
            {property.baths > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-roboto text-[#363535]">
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-drop-line text-[#636363]"></i>
                </span>
                {property.baths} Baths
              </span>
            )}
            {property.receptions != null && property.receptions > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-roboto text-[#363535]">
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-sofa-line text-[#636363]"></i>
                </span>
                {property.receptions} Receptions
              </span>
            )}
            {property.parking != null && property.parking > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-roboto text-[#363535]">
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-car-line text-[#636363]"></i>
                </span>
                {property.parking} Parking
              </span>
            )}
          </div>

          {/* Category */}
          {property.category && (
            <p className="text-[10px] font-roboto font-semibold uppercase tracking-widest text-[#1f1f1f] mb-3">
              {property.category}
            </p>
          )}

          {/* Description */}
          {property.description && (
            <p className="text-sm font-roboto text-[#555555] leading-relaxed mb-4">{property.description}</p>
          )}

          {/* Call / Email */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            <a
              href={`tel:${property.agentPhone || '+254712345678'}`}
              className="flex items-center gap-1.5 text-sm font-roboto text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md px-3 py-1.5 -mx-3 transition-all duration-200 cursor-pointer whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-phone-line text-sm"></i>
              </span>
              <span className="underline underline-offset-2">Call</span>
            </a>
            <button className="flex items-center gap-1.5 text-sm font-roboto text-gray-700 hover:text-primary hover:bg-primary/5 rounded-md px-3 py-1.5 -mx-3 transition-all duration-200 cursor-pointer whitespace-nowrap">
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-mail-line text-sm"></i>
              </span>
              <span className="underline underline-offset-2">Email</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}