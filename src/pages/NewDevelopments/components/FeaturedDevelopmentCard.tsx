import type { Development } from '@/hooks/useNewDevelopments';
import { Link } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import DevelopmentGallery from '@/pages/NewDevelopments/components/DevelopmentGallery';
import { titleCase, sentenceCase, pluralCount } from '@/pages/NewDevelopments/components/typography';
import { priceBounds, unitTypeRangeLabel, groupUnitTypes, hasMultipleUnitTypes } from '@/lib/developmentUnits';
import UrgencyMessage from '@/components/feature/UrgencyMessage';
import { resolveUrgency, autoUrgency } from '@/lib/urgency';

type CurrencyCode = 'KES' | 'USD' | 'GBP' | 'EUR' | 'UGX' | 'AED' | 'ZAR';

function stageBadge(stage: string): { label: string; color: string } | null {
  const s = (stage || '').trim().toLowerCase();
  if (s === 'off_plan') return { label: 'Off-Plan', color: 'bg-[#fd7e14]' };
  if (s === 'under_construction') return { label: 'Under Construction', color: 'bg-amber-500' };
  if (s === 'completed' || s === '' || s === 'ready') return { label: 'Completed', color: 'bg-[#28a745]' };
  return null;
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
  const rangeLabel = hasMultipleUnitTypes(development) ? unitTypeRangeLabel(development) : '';
  const bounds = priceBounds(development);
  const listedOn = formatDate(development.createdAt);
  const displayName = titleCase(development.name);
  // The individual property detail page - the "See more / detail" destination.
  const projectHref = development.slug ? `/property/${development.slug}` : undefined;
  // The parent PROJECT page (the whole development) - only "See more of this development" points here.
  const developmentHref = development.slug ? `/development/${development.slug}` : undefined;

  // Manual agent message wins; otherwise an honest automatic message from the
  // real available-unit count (and only when the display toggle allows it).
  const availableCount = development.availableUnits > 0
    ? development.availableUnits
    : groupUnitTypes(development.units).reduce((sum, g) => sum + g.available, 0);
  const urgency = resolveUrgency({
    manual: development.urgencyMessage,
    automatic: autoUrgency(availableCount, 'home'),
    enabled: development.showUrgencyMessage,
  });

  return (
    <article
      className={`group flex flex-col lg:flex-row items-stretch bg-white border rounded-lg overflow-hidden transition-colors duration-300 ${
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
            detailHref={projectHref}
            overlay={
              <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5">
                <span className="text-white text-xs font-medium uppercase tracking-wide px-2.5 py-1 bg-[#001731] rounded-sm">
                  Featured
                </span>
                <Link
                  to="/new-developments"
                  aria-label="Show all new developments"
                  className="text-white text-xs font-semibold uppercase tracking-wide px-2.5 py-1 bg-[#0d5959] rounded-sm cursor-pointer hover:opacity-90 transition-opacity"
                >
                  New Development
                </Link>
              </div>
            }
          />

          {/* Quick preview - consistent with Sale / Rent property cards */}
          <button
            type="button"
            onClick={() => onOpen(development)}
            aria-label={`Preview ${displayName}`}
            className="absolute bottom-3 left-3 z-20 flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 hover:bg-black/80 rounded-sm cursor-pointer transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
          >
            <span className="w-3.5 h-3.5 flex items-center justify-center">
              <i className="ri-expand-diagonal-line text-xs"></i>
            </span>
            Preview
          </button>
        </div>
      </div>

      {/* Content column */}
      <div className="flex-1 flex flex-col p-5 md:p-7">
        {/* Header: price + stage badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {projectHref ? (
              <Link
                to={projectHref}
                aria-label={`View property details for ${displayName}`}
                className="text-xl md:text-[24px] font-bold text-[#001731] leading-tight cursor-pointer hover:underline"
              >
                {development.hasPriceRange && bounds.max > bounds.min ? (
                  <>
                    <span className="text-base md:text-base font-semibold text-[#8a6d1f] mr-1.5">From</span>
                    {format(bounds.min, (development.currency as CurrencyCode) || 'KES')}
                    <span className="text-base font-semibold text-[#001731]/70"> {'\u2013'} {format(bounds.max, (development.currency as CurrencyCode) || 'KES')}</span>
                  </>
                ) : (
                  format(bounds.min, (development.currency as CurrencyCode) || 'KES')
                )}
              </Link>
            ) : (
              <p className="text-xl md:text-[24px] font-bold text-[#001731] leading-tight">
                {development.hasPriceRange && bounds.max > bounds.min ? (
                  <>
                    <span className="text-base md:text-base font-semibold text-[#8a6d1f] mr-1.5">From</span>
                    {format(bounds.min, (development.currency as CurrencyCode) || 'KES')}
                    <span className="text-base font-semibold text-[#001731]/70"> {'\u2013'} {format(bounds.max, (development.currency as CurrencyCode) || 'KES')}</span>
                  </>
                ) : (
                  format(bounds.min, (development.currency as CurrencyCode) || 'KES')
                )}
              </p>
            )}
            {badge && (
              <Link
                to={`/new-developments?stage=${encodeURIComponent(badge.label)}`}
                aria-label={`Show ${badge.label} developments`}
                className={`shrink-0 text-white text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-sm cursor-pointer hover:opacity-90 transition-opacity ${badge.color}`}
              >
                {badge.label}
              </Link>
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

        {/* Project name - clickable through to the project page */}
        <h3 className="font-opensans text-xl md:text-2xl font-medium text-[#2D303D] leading-snug mt-3">
          {projectHref ? (
            <Link to={projectHref} className="hover:text-[#8a6d1f] transition-colors">{displayName}</Link>
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

        {urgency && <UrgencyMessage message={urgency} className="mt-2" />}

        {/* Divider */}
        <div className="mt-4 border-t border-[#e8eaed]" />

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

        {/* Floor plan availability - so buyers spot plans before opening */}
        {development.hasFloorPlan && (
          developmentHref ? (
            <Link
              to={`${developmentHref}?tab=floor-plans`}
              className="mt-3 inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full bg-[#eef2f7] border border-[#dbe3ec] text-sm font-semibold text-[#001731] whitespace-nowrap cursor-pointer hover:border-primary/40 transition-colors"
            >
              <i className="ri-map-2-line text-[#0d5959]"></i>
              Floor Plan Available
            </Link>
          ) : (
            <span className="mt-3 inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full bg-[#eef2f7] border border-[#dbe3ec] text-sm font-semibold text-[#001731] whitespace-nowrap">
              <i className="ri-map-2-line text-[#0d5959]"></i>
              Floor Plan Available
            </span>
          )
        )}

        {/* See more of this development - leads to the full project page */}
        <div className="mt-5 pt-4 border-t border-[#e8eaed]">
          {developmentHref ? (
            <Link
              to={developmentHref}
              className="inline-flex items-center gap-1.5 text-base font-bold text-[#001731] cursor-pointer hover:underline whitespace-nowrap"
            >
              See more of this development
              <i className="ri-arrow-right-line text-base"></i>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(development)}
              className="inline-flex items-center gap-1.5 text-base font-bold text-[#001731] cursor-pointer hover:underline whitespace-nowrap"
            >
              See more of this development
              <i className="ri-arrow-right-line text-base"></i>
            </button>
          )}

          {/* Unit-type range - the project's bedroom mix, shown only when the
              project genuinely offers more than one unit type. */}
          {rangeLabel && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f3f4f6] border border-[#e8eaed] text-[#001731] whitespace-nowrap">
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-hotel-bed-line text-base text-[#0d5959]"></i>
                </span>
                <span className="text-sm font-semibold">{rangeLabel}</span>
              </span>
            </div>
          )}
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

        {/* Divider */}
        <div className="mt-6 border-t border-[#e8eaed]" />

        {/* CTAs */}
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          {projectHref ? (
            <Link
              to={projectHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#001731] text-white text-base font-bold rounded-sm cursor-pointer whitespace-nowrap hover:bg-[#002349] transition-colors"
            >
              <i className="ri-eye-line text-base"></i>View property
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(development)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#001731] text-white text-base font-bold rounded-sm cursor-pointer whitespace-nowrap hover:bg-[#002349] transition-colors"
            >
              <i className="ri-eye-line text-base"></i>View property
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