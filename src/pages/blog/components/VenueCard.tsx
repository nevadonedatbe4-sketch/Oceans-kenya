import { Link, useLocation } from 'react-router-dom';
import EntityImage from '@/components/feature/EntityImage';
import { withReturnFrom } from '@/lib/navigation';
import type { GuideVenue } from '@/lib/guideVenues';

interface VenueCardProps {
  venue: GuideVenue;
  className?: string;
}

/**
 * An editorial restaurant card. Every field is optional - anything the venue
 * record does not actually have is simply not rendered (no "", no "0", no
 * placeholder text). The description explains WHY the venue belongs in the
 * guide, and the source / last-verified date is shown so the reader can trust it.
 */
export default function VenueCard({ venue, className = '' }: VenueCardProps) {
  const { pathname, search } = useLocation();
  const detailHref = withReturnFrom(`/directory/place/${venue.slug}`, `${pathname}${search}`);

  return (
    <article
      className={`group flex flex-col bg-white border border-primary/12 rounded-lg overflow-hidden hover:border-primary/30 transition-colors ${className}`}
    >
      <div className="relative aspect-[16/10] bg-[#F5F5F5] overflow-hidden">
        <EntityImage
          src={venue.image || null}
          alt={venue.name}
          icon="ri-restaurant-line"
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />
        {venue.priceTier && (
          <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full bg-primary text-white text-[10px] font-jost font-semibold uppercase tracking-[0.08em]">
            {venue.priceTier}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 md:p-5">
        <h3 className="font-prata font-semibold text-primary text-[19px] leading-snug mb-1.5">
          {venue.name}
        </h3>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-roboto text-[12.5px] text-[#636363] mb-2.5">
          {venue.area && (
            <span className="inline-flex items-center gap-1">
              <i className="ri-map-pin-2-line text-golden"></i>
              {venue.area}
            </span>
          )}
          {venue.area && venue.cuisine && <span className="text-primary/20">|</span>}
          {venue.cuisine && <span className="font-medium text-[#333]">{venue.cuisine}</span>}
        </p>

        {venue.description && (
          <p className="font-roboto text-[14px] text-[#333333] leading-[1.62] mb-3">
            {venue.description}
          </p>
        )}

        {venue.bestFor.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {venue.bestFor.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full bg-secondary-100 text-secondary-900 text-[11px] font-roboto font-medium capitalize"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {(venue.openingHours || venue.lastVerified) && (
          <div className="font-roboto text-[12px] text-[#7a7a7a] space-y-1 mb-3">
            {venue.openingHours && (
              <p className="flex items-center gap-1.5">
                <i className="ri-time-line text-golden"></i>
                {venue.openingHours}
              </p>
            )}
            {venue.lastVerified && (
              <p className="flex items-center gap-1.5">
                <i className="ri-shield-check-line text-golden"></i>
                Last verified {venue.lastVerified}
              </p>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 border-t border-primary/10">
          <Link
            to={detailHref}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-md text-[11.5px] font-jost font-semibold uppercase tracking-[0.06em] hover:bg-[#002349] transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-eye-line text-xs"></i>
            Details
          </Link>
          {venue.website && (
            <a
              href={venue.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-primary/25 text-primary rounded-md text-[11.5px] font-jost font-semibold uppercase tracking-[0.06em] hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
            >
              Website
              <i className="ri-external-link-line text-xs"></i>
            </a>
          )}
          {venue.mapsUrl && (
            <a
              href={venue.mapsUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-primary/25 text-primary rounded-md text-[11.5px] font-jost font-semibold uppercase tracking-[0.06em] hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-map-pin-line text-xs"></i>
              Map
            </a>
          )}
        </div>
      </div>
    </article>
  );
}