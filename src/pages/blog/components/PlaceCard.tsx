import { Link, useLocation } from 'react-router-dom';
import EntityImage from '@/components/feature/EntityImage';
import { withReturnFrom } from '@/lib/navigation';
import type { GuidePlace } from '@/lib/guidePlaces';

interface PlaceCardProps {
  place: GuidePlace;
  className?: string;
}

const ICON_BY_CATEGORY: Record<string, string> = {
  recreation: 'ri-leaf-line',
  art: 'ri-palette-line',
  night_life: 'ri-moon-clear-line',
  shopping_centres: 'ri-store-3-line',
  community: 'ri-community-line',
  fitness: 'ri-run-line',
};

function placeIcon(place: GuidePlace): string {
  if (place.icon) return place.icon;
  return (place.category && ICON_BY_CATEGORY[place.category]) || 'ri-map-pin-2-line';
}

/**
 * An editorial "thing to do" card. Every field is optional - anything the
 * record does not actually have is simply not rendered (no "", no "0", no
 * placeholder text). The description explains WHY it belongs in the guide, and
 * the source / last-verified date is shown so the reader can trust it.
 */
export default function PlaceCard({ place, className = '' }: PlaceCardProps) {
  const { pathname, search } = useLocation();
  const detailHref = withReturnFrom(`/directory/place/${place.slug}`, `${pathname}${search}`);

  return (
    <article
      className={`group flex flex-col bg-white border border-primary/12 rounded-lg overflow-hidden hover:border-primary/30 transition-colors ${className}`}
    >
      <div className="relative aspect-[16/10] bg-[#F5F5F5] overflow-hidden">
        <EntityImage
          src={place.image || null}
          alt={place.name}
          icon={placeIcon(place)}
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />
        {place.subcategoryLabel && (
          <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full bg-primary/90 text-white text-[10px] font-jost font-semibold uppercase tracking-[0.08em]">
            {place.subcategoryLabel}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 md:p-5">
        <h3 className="font-prata font-semibold text-primary text-[19px] leading-snug mb-1.5">
          {place.name}
        </h3>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-roboto text-[12.5px] text-[#636363] mb-2.5">
          {place.area && (
            <span className="inline-flex items-center gap-1">
              <i className="ri-map-pin-2-line text-golden"></i>
              {place.area}
            </span>
          )}
          {place.area && place.categoryLabel && <span className="text-primary/20">|</span>}
          {place.categoryLabel && <span className="font-medium text-[#333]">{place.categoryLabel}</span>}
        </p>

        {place.description && (
          <p className="font-roboto text-[14px] text-[#333333] leading-[1.62] mb-3">
            {place.description}
          </p>
        )}

        {place.bestFor.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {place.bestFor.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full bg-secondary-100 text-secondary-900 text-[11px] font-roboto font-medium capitalize"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {(place.openingHours || place.lastVerified) && (
          <div className="font-roboto text-[12px] text-[#7a7a7a] space-y-1 mb-3">
            {place.openingHours && (
              <p className="flex items-center gap-1.5">
                <i className="ri-time-line text-golden"></i>
                {place.openingHours}
              </p>
            )}
            {place.lastVerified && (
              <p className="flex items-center gap-1.5">
                <i className="ri-shield-check-line text-golden"></i>
                Last verified {place.lastVerified}
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
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-primary/25 text-primary rounded-md text-[11.5px] font-jost font-semibold uppercase tracking-[0.06em] hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
            >
              Website
              <i className="ri-external-link-line text-xs"></i>
            </a>
          )}
          {place.mapsUrl && (
            <a
              href={place.mapsUrl}
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