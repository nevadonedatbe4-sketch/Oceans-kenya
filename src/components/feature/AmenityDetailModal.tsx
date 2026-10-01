import { useEffect } from 'react';
import {
  amenityImage,
  amenityLabel,
  amenityLabelStyle,
  amenityMapsUrl,
  categoryLabel,
  subcategoryLabel,
  subcategoryIcon,
  normalizeUrl,
  type Amenity,
} from '@/lib/amenities';
import NoImagePlaceholder from '@/components/feature/NoImagePlaceholder';

interface AmenityDetailModalProps {
  amenity: Amenity;
  categoryColor: string;
  distanceText: string | null;
  related: Amenity[];
  onSelectRelated: (a: Amenity) => void;
  onClose: () => void;
}

export default function AmenityDetailModal({
  amenity,
  categoryColor,
  distanceText,
  related,
  onSelectRelated,
  onClose,
}: AmenityDetailModalProps) {
  const label = amenityLabel(amenity);
  const style = amenityLabelStyle(amenity, categoryColor);
  const icon = style.icon || subcategoryIcon(amenity.subcategory);
  const website = normalizeUrl(amenity.website);
  const maps = amenityMapsUrl(amenity);
  const gallery = Array.isArray(amenity.gallery) ? amenity.gallery.filter(Boolean) : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
        {/* Image */}
        <div className="relative h-52 md:h-64 overflow-hidden">
          {amenityImage(amenity) ? (
            <img src={amenityImage(amenity)} alt={amenity.alt_text || amenity.name} className="w-full h-full object-cover object-center" />
          ) : (
            <NoImagePlaceholder />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
          <div
            className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
          >
            <i className={`${icon} text-sm`}></i>
            {label}
          </div>
        </div>

        <div className="p-5 md:p-6">
          <p className="text-golden text-xs font-semibold uppercase tracking-[0.15em]">
            {categoryLabel(amenity.category)}
            {amenity.subcategory && subcategoryLabel(amenity.subcategory) !== categoryLabel(amenity.category)
              ? ` · ${subcategoryLabel(amenity.subcategory)}`
              : ''}
          </p>
          <h3 className="font-bold text-primary text-xl md:text-2xl mt-1">{amenity.name}</h3>

          {amenity.description && (
            <p className="text-gray-600 text-sm leading-relaxed mt-3">{amenity.description}</p>
          )}

          {/* Key facts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {(amenity.address || amenity.neighbourhood_name) && (
              <div className="flex items-start gap-2">
                <i className="ri-map-pin-line text-primary text-base mt-0.5"></i>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Location</p>
                  <p className="text-sm text-gray-700">{amenity.address || amenity.neighbourhood_name}</p>
                </div>
              </div>
            )}
            {distanceText && (
              <div className="flex items-start gap-2">
                <i className="ri-route-line text-primary text-base mt-0.5"></i>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Distance</p>
                  <p className="text-sm text-gray-700">{distanceText} from neighbourhood</p>
                </div>
              </div>
            )}
            {amenity.opening_hours && (
              <div className="flex items-start gap-2">
                <i className="ri-time-line text-primary text-base mt-0.5"></i>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Opening Hours</p>
                  <p className="text-sm text-gray-700">{amenity.opening_hours}</p>
                </div>
              </div>
            )}
            {amenity.phone && (
              <div className="flex items-start gap-2">
                <i className="ri-phone-line text-primary text-base mt-0.5"></i>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Phone</p>
                  <a href={`tel:${amenity.phone}`} className="text-sm text-primary font-medium hover:underline">
                    {amenity.phone}
                  </a>
                </div>
              </div>
            )}
            {amenity.email && (
              <div className="flex items-start gap-2">
                <i className="ri-mail-line text-primary text-base mt-0.5"></i>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Email</p>
                  <a href={`mailto:${amenity.email}`} className="text-sm text-primary font-medium hover:underline break-all">
                    {amenity.email}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Gallery */}
          {gallery.length > 0 && (
            <div className="mt-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Gallery</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {gallery.map((url, i) => (
                  <div key={i} className="aspect-[4/3] rounded-md overflow-hidden">
                    <img src={url} alt={`${amenity.name} ${i + 1}`} className="w-full h-full object-cover object-center" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2.5 mt-6">
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
              >
                Visit Website
                <i className="ri-external-link-line"></i>
              </a>
            )}
            {maps && (
              <a
                href={maps}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-primary/25 text-primary rounded-md text-sm font-semibold hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-map-pin-line"></i>
                Get Directions
              </a>
            )}
            {amenity.phone && (
              <a
                href={`tel:${amenity.phone}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-primary/25 text-primary rounded-md text-sm font-semibold hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-phone-line"></i>
                Call
              </a>
            )}
          </div>

          {/* Related amenities */}
          {related.length > 0 && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">More in this area</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {related.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onSelectRelated(r)}
                    className="flex items-center gap-2.5 p-2 rounded-md border border-primary/10 hover:border-primary/25 hover:bg-primary/[0.03] transition-colors cursor-pointer text-left"
                  >
                    <div className="w-10 h-10 rounded-md overflow-hidden shrink-0">
                      {amenityImage(r) ? (
                        <img src={amenityImage(r)} alt={r.name} className="w-full h-full object-cover object-center" />
                      ) : (
                        <NoImagePlaceholder compact />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-primary font-medium truncate">{r.name}</p>
                      <p className="text-xs text-gray-500 truncate">{subcategoryLabel(r.subcategory) || categoryLabel(r.category)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}