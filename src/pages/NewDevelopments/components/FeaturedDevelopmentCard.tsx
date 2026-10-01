import type { Development } from '@/hooks/useNewDevelopments';
import { Link } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import DevelopmentGallery from '@/pages/NewDevelopments/components/DevelopmentGallery';
import { titleCase, sentenceCase, pluralCount } from '@/pages/NewDevelopments/components/typography';

type CurrencyCode = 'KES' | 'USD' | 'GBP' | 'EUR' | 'UGX' | 'AED' | 'ZAR';

function stageBadge(stage: string): { label: string; color: string } | null {
  const s = (stage || '').trim().toLowerCase();
  if (s === 'off_plan') return { label: 'Off-Plan', color: 'bg-[#fd7e14]' };
  if (s === 'under_construction') return { label: 'Under Construction', color: 'bg-amber-500' };
  if (s === 'completed' || s === '' || s === 'ready') return { label: 'Completed', color: 'bg-[#28a745]' };
  return null;
}

function typeLabel(pt: string): string {
  const s = (pt || '').toLowerCase();
  if (s === 'apartment') return 'Apartments';
  if (s === 'villa') return 'Villas';
  if (s === 'townhouse') return 'Townhouses';
  if (s === 'maisonette') return 'Maisonettes';
  if (s === 'house') return 'Houses';
  if (s === 'office') return 'Offices';
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Properties';
}

function bedName(beds: number): string {
  if (beds <= 0) return 'Studio';
  return `${pluralCount(beds, 'Bed', 'Beds')}room`;
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] || '';
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`;
}

/**
 * Resolves a real, data-driven unit-type phrase for a project, e.g.
 * "1, 2 & 3 Bedroom Apartments" when the backend returns multiple unit
 * records, or "2 Bedroom Apartments" when it returns only one. Only unit
 * types actually present in the backend are used - nothing is invented.
 */
function unitTypesText(development: Development): string {
  const beds = Array.from(new Set(development.units.map((u) => u.bedrooms))).sort((a, b) => a - b);
  if (beds.length === 0) return '';
  const phrase = joinList(beds.map((b) => bedName(b)));
  return `${phrase} ${typeLabel(development.propertyType)}`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface FeaturedDevelopmentCardProps {
  development: Development;
  /** Whether the image sits on the left (true) or right (false) on desktop. */
  imageLeft: boolean;
  /** Opens the full-detail modal for this project. */
  onOpen: (development: Development) => void;
  /** Opens the modal and resolves the brochure request for this project. */
  onRequestBrochure: (development: Development) => void;
}

export default function FeaturedDevelopmentCard({ development, imageLeft, onOpen, onRequestBrochure }: FeaturedDevelopmentCardProps) {
  const { format } = useCurrency();
  const badge = stageBadge(development.status);
  const features = (development.features || []).slice(0, 6);
  const primary = development.units[0];
  const unitPhrase = unitTypesText(development);
  const listedOn = formatDate(development.createdAt);
  const displayName = titleCase(development.name);
  const detailHref = development.slug ? `/property/${development.slug}` : undefined;

  return (
    <article
      className={`flex flex-col lg:flex-row items-stretch bg-white border rounded-lg overflow-hidden transition-colors duration-300 ${
        imageLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'
      }`}
      style={{ borderColor: '#e8eaed' }}
    >
      {/* Image column */}
      <div className={
        `flex flex-col flex-shrink-0 lg:w-[47%] w-full ${
          imageLeft ? 'lg:border-r' : 'lg:border-l'
        } border-b lg:border-b-0 border-[#e8eaed]`
      }>
        <div className="relative h-[520px] sm:h-[640px]">
          <DevelopmentGallery
            images={development.gallery}
            name={displayName}
            showThumbnails
            thumbCount={2}
            detailHref={detailHref}
            overlay={
              <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5">
                <span className="text-white text-xs font-medium uppercase tracking-wide px-2.5 py-1 bg-[#001731] rounded-sm">
                  Featured
                </span>
                <span className="text-white text-xs font-semibold uppercase tracking-wide px-2.5 py-1 bg-[#0d5959] rounded-sm">
                  New Development
                </span>
              </div>
            }
          />
        </div>
      </div>

      {/* Content column */}
      <div className="flex-1 flex flex-col p-5 md:p-7">
        {/* Header: price + stage badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xl md:text-[24px] font-bold text-[#001731] leading-tight">
              {development.hasPriceRange ? (
                <>
                  <span className="text-base md:text-base font-semibold text-[#8a6d1f] mr-1.5">From</span>
                  {format(development.lowestPrice, (development.currency as CurrencyCode) || 'KES')}
                </>
              ) : (
                format(development.lowestPrice, (development.currency as CurrencyCode) || 'KES')
              )}
            </p>
            {badge && (
              <span className={`shrink-0 text-white text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-sm ${badge.color}`}>
                {badge.label}
              </span>
            )}
          </div>
          {/* Save / favourite interaction */}
          <button
            type="button"
            aria-label="Save this development"
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full border border-[#e8eaed] text-[#001731] hover:bg-stone-50 transition-colors cursor-pointer"
          >
            <i className="ri-heart-3-line text-lg"></i>
          </button>
        </div>

        {/* Project name - clickable through to the property detail page */}
        <h3 className="text-xl md:text-2xl font-medium text-[#2D303D] leading-snug mt-3">
          {detailHref ? (
            <Link to={detailHref} className="hover:text-[#8a6d1f] transition-colors">{displayName}</Link>
          ) : (
            displayName
          )}
        </h3>

        {/* Property stats (real unit data) - 16px / 600, grammar-safe */}
        {primary && (primary.bedrooms > 0 || primary.bathrooms > 0 || primary.size > 0) && (
          <p className="text-base font-normal text-[#2D303D] mt-2 leading-normal">
            {primary.bedrooms > 0 && <span>{pluralCount(primary.bedrooms, 'Bed', 'Beds')}</span>}
            {primary.bedrooms > 0 && primary.bathrooms > 0 && <span className="mx-1.5 text-[#9aa0a6]">·</span>}
            {primary.bathrooms > 0 && <span>{pluralCount(primary.bathrooms, 'Bath', 'Baths')}</span>}
            {primary.size > 0 && (
              <>
                <span className="mx-1.5 text-[#9aa0a6]">·</span>
                <span>{primary.size.toLocaleString()} {primary.sizeUnit}</span>
              </>
            )}
          </p>
        )}

        {/* Location - 16px / 600 */}
        <p className="text-base font-normal text-[#2D303D] mt-1 flex items-center gap-1.5 leading-normal">
          <i className="ri-map-pin-2-line text-[#6b7280] text-base"></i>
          {titleCase(development.location) || titleCase(development.city) || 'Location on request'}
        </p>

        {/* Summary - real listing description only, sentence case, 16px / 400 / 1.5 */}
        {development.descriptionText && (
          <p className="text-base font-normal text-[#2D303D] leading-normal mt-3 line-clamp-2">
            {sentenceCase(development.descriptionText)}
          </p>
        )}

        {/* Listed on - real created_at, global green date colour */}
        {listedOn && (
          <p className="text-base font-medium text-[color:var(--card-time-text)] mt-2.5">Listed on {listedOn}</p>
        )}

        {/* Feature ticks - real amenities, 16px / 400 */}
        {features.length > 0 && (
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3.5">
            {features.slice(0, 4).map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-base font-normal text-[#2D303D] whitespace-nowrap">
                <i className="ri-check-line text-[#00703c] text-base"></i>
                {titleCase(f)}
              </li>
            ))}
          </ul>
        )}

        {/* Available unit types - real, data-driven, 18px / 600 */}
        {unitPhrase && (
          <p className="text-lg font-normal text-[#2D303D] mt-4">{unitPhrase}</p>
        )}
        {development.unitTypes.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {development.unitTypes.map((ut) => (
              <button
                key={ut.label}
                type="button"
                onClick={() => onOpen(development)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f3f4f6] border border-[#e8eaed] text-[#001731] text-base font-semibold rounded-full whitespace-nowrap cursor-pointer hover:bg-stone-100 transition-colors"
              >
                <i className="ri-building-4-line text-base"></i>
                {titleCase(ut.label)}
              </button>
            ))}
          </div>
        )}

        {/* See more of this development - tick panel */}
        <div className="mt-5 pt-4 border-t border-[#e8eaed]">
          <button
            type="button"
            onClick={() => onOpen(development)}
            className="inline-flex items-center gap-1.5 text-base font-bold text-[#001731] cursor-pointer hover:underline whitespace-nowrap"
          >
            See more of this development
            <i className="ri-arrow-right-line text-base"></i>
          </button>
        </div>

        {/* Video Tour - only when an actual video is attached */}
        {development.videoUrl && (
          <div className="mt-5">
            <button
              type="button"
              aria-label={`Play video tour for ${displayName}`}
              onClick={() => window.open(development.videoUrl, '_blank', 'noopener,noreferrer')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm bg-[#001731] text-white text-sm font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer hover:bg-[#002349] transition-colors"
            >
              <i className="ri-play-circle-line text-base"></i>Video Tour
            </button>
          </div>
        )}

        {/* CTAs */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {detailHref ? (
            <Link
              to={detailHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#001731] text-white text-base font-bold rounded-sm cursor-pointer whitespace-nowrap hover:bg-[#002349] transition-colors"
            >
              <i className="ri-eye-line text-base"></i>View Development
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(development)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#001731] text-white text-base font-bold rounded-sm cursor-pointer whitespace-nowrap hover:bg-[#002349] transition-colors"
            >
              <i className="ri-eye-line text-base"></i>View Development
            </button>
          )}
          <button
            type="button"
            onClick={() => onRequestBrochure(development)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#001731] text-[#001731] text-base font-bold rounded-sm cursor-pointer whitespace-nowrap hover:bg-[#001731] hover:text-white transition-colors"
          >
            <i className="ri-file-paper-2-line text-base"></i>Request Brochure
          </button>
        </div>
      </div>
    </article>
  );
}