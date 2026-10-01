import {
  amenityImage,
  amenityLabel,
  amenityLabelStyle,
  amenityMapsUrl,
  subcategoryIcon,
  categoryLabel,
  normalizeUrl,
  type Amenity,
} from '@/lib/amenities';
import { Link, useLocation } from 'react-router-dom';
import { withReturnFrom } from '@/lib/navigation';
import { CARD_HEIGHT, CARD_IMAGE_FRAME, CARD_IMAGE, CARD_BODY } from '@/lib/cardLayout';
import NoImagePlaceholder from '@/components/feature/NoImagePlaceholder';

interface AmenityCardProps {
  amenity: Amenity;
  categoryColor: string;
  distanceText: string | null;
  onViewDetails: () => void;
}

export default function AmenityCard({ amenity, categoryColor, distanceText, onViewDetails }: AmenityCardProps) {
  const label = amenityLabel(amenity);
  const style = amenityLabelStyle(amenity, categoryColor);
  const icon = style.icon || subcategoryIcon(amenity.subcategory);
  const website = normalizeUrl(amenity.website);
  const maps = amenityMapsUrl(amenity);
  const rating = amenity.rating;
  const reviewCount = typeof amenity.review_count === 'number' ? amenity.review_count : typeof amenity.attributes?.review_count === 'number' ? amenity.attributes.review_count : null;
  const feeRange = typeof amenity.attributes?.fee_range === 'string' ? amenity.attributes.fee_range : null;
  // Only surface a genuine street address - never leak a maps/website URL into the card text.
  const rawAddress = (amenity.address || '').trim();
  const addressLooksLikeUrl = /^(https?:\/\/|www\.)/i.test(rawAddress) || /(?:maps\.google|google\.[a-z.]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(rawAddress);
  const hasRealAddress = rawAddress.length > 0 && !addressLooksLikeUrl;
  const { pathname, search } = useLocation();
  const currentPath = `${pathname}${search}`;
  const detailHref = withReturnFrom(`/directory/place/${amenity.slug || amenity.id}`, currentPath);

  return (
    <article className={`group flex flex-col sm:flex-row bg-white border border-primary/12 rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.05)] hover:border-primary/25 transition-all duration-200 ${CARD_HEIGHT}`}>
      <button
        onClick={onViewDetails}
        className={`${CARD_IMAGE_FRAME} cursor-pointer block`}
        aria-label={`View details for ${amenity.name}`}
      >
        {amenityImage(amenity) ? (
          <img
            src={amenityImage(amenity)}
            alt={amenity.alt_text || amenity.name}
            className={CARD_IMAGE}
          />
        ) : (
          <NoImagePlaceholder />
        )}
        <div
          className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap"
          style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
        >
          <i className={`${icon} text-[11px]`}></i>
          {label}
        </div>
      </button>

      <div className={CARD_BODY}>
        <div className="min-h-0 overflow-hidden">
          <button onClick={onViewDetails} className="text-left block cursor-pointer w-full">
            <h4 className="font-semibold text-primary text-sm md:text-base leading-snug line-clamp-1 group-hover:text-[#0D5959] transition-colors">
              {amenity.name}
            </h4>
          </button>
          {hasRealAddress && (
            <p className="flex items-center gap-1 text-sm font-medium text-gray-500 mt-0.5 line-clamp-1">
              <i className="ri-map-pin-line text-primary/70 text-sm"></i>
              {amenity.address}
              {distanceText && <span className="text-primary/50">&middot; {distanceText}</span>}
            </p>
          )}
          {(rating != null || feeRange) && (
            <p className="flex items-center gap-2 text-xs mt-1.5 flex-wrap">
              {rating != null && (
                <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
                  <i className="ri-star-fill text-xs"></i>
                  {rating.toFixed(1)}
                  {reviewCount != null && (
                    <span className="text-gray-400 font-normal">({reviewCount.toLocaleString()})</span>
                  )}
                </span>
              )}
              {feeRange && (
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <i className="ri-money-dollar-circle-line text-xs text-primary/70"></i>
                  {feeRange}
                </span>
              )}
            </p>
          )}
          {amenity.description && (
            <p className="text-sm font-medium text-gray-500 leading-relaxed mt-1.5 line-clamp-2">{amenity.description}</p>
          )}
          {amenity.opening_hours && (
            <p className="flex items-center gap-1 text-sm font-medium text-gray-500 mt-1">
              <i className="ri-time-line text-primary/70 text-sm"></i>
              {amenity.opening_hours}
            </p>
          )}
        </div>

        <div className="flex flex-nowrap items-center gap-1 sm:gap-2 mt-3 pt-3 border-t border-primary/10">
          <Link
            to={detailHref}
            className="flex-[1.6] basis-0 min-w-0 sm:flex-[1.6] inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 bg-primary text-white rounded-md text-[10px] sm:text-[11px] font-semibold hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-eye-line text-xs"></i>
            View Details
          </Link>
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex-1 basis-0 min-w-0 sm:flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 border border-primary/25 text-primary rounded-md text-[10px] sm:text-[11px] font-semibold hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
            >
              Website
              <i className="ri-external-link-line text-xs"></i>
            </a>
          )}
          {maps && (
            <a
              href={maps}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex-1 basis-0 min-w-0 sm:flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 border border-primary/25 text-primary rounded-md text-[10px] sm:text-[11px] font-semibold hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-map-pin-line text-xs"></i>
              Directions
            </a>
          )}
        </div>
      </div>
    </article>
  );
}