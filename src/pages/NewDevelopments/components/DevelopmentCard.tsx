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

interface DevelopmentCardProps {
  development: Development;
  /** Opens the quick-preview modal for this project (card "Preview" control). */
  onOpen: (development: Development) => void;
}

export default function DevelopmentCard({ development, onOpen }: DevelopmentCardProps) {
  const { format } = useCurrency();
  const badge = stageBadge(development.status);
  const features = (development.features || []).slice(0, 3);
  const primary = development.units[0];
  const displayName = titleCase(development.name);
  // The individual property detail page - the "See more / detail" destination.
  const projectHref = development.slug ? `/property/${development.slug}` : undefined;
  // The parent PROJECT page (the whole development) - only "See more of this development" points here.
  const developmentHref = development.slug ? `/development/${development.slug}` : undefined;
  const bounds = priceBounds(development);
  const rangeLabel = hasMultipleUnitTypes(development) ? unitTypeRangeLabel(development) : '';
  const listedOn = formatDate(development.createdAt);

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

  const hasStats = Boolean(primary && (primary.bedrooms > 0 || primary.bathrooms > 0 || primary.size > 0));
  const hasMiddle = Boolean(development.descriptionText || features.length > 0 || development.developer);
  const hasActions = Boolean(development.hasFloorPlan || development.videoUrl);

  return (
    <article className="group relative h-full bg-white overflow-hidden border rounded-lg flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-[#c9a84c]" style={{ borderColor: '#e8eaed' }}>
      {/* Image */}
      <div className="relative flex-shrink-0 h-52 sm:h-56 md:h-60 bg-stone-100">
        <DevelopmentGallery
          images={development.gallery}
          name={displayName}
          overlay={
            <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-2">
              <span className="text-white text-[10px] sm:text-[11px] leading-none font-bold uppercase tracking-wide px-2 py-1 bg-[#001731] rounded-sm whitespace-nowrap">
                New Development
              </span>
              {badge && (
                <span className={`text-white text-[10px] sm:text-[11px] leading-none font-semibold uppercase tracking-wide px-2 py-1 rounded-sm whitespace-nowrap ${badge.color}`}>
                  {badge.label}
                </span>
              )}
            </div>
          }
        />

        {/* Quick preview - consistent with Sale / Rent property cards */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen(development); }}
          aria-label={`Preview ${displayName}`}
          className="absolute bottom-3 left-3 z-20 flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 hover:bg-black/80 rounded-sm cursor-pointer transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            <i className="ri-expand-diagonal-line text-xs"></i>
          </span>
          Preview
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 md:p-5">
        {/* Block 1 - headline identity */}
        <div>
          {/* PRIMARY - Price */}
          <div className="mb-1.5">
            {bounds.min > 0 ? (
              <p className="text-xl md:text-[24px] font-bold text-[#001731] leading-tight">
                {development.hasPriceRange && bounds.max > bounds.min && (
                  <span className="text-base font-semibold text-[#8a6d1f] mr-1">From</span>
                )}
                {format(bounds.min, (development.currency as CurrencyCode) || 'KES')}
                {development.hasPriceRange && bounds.max > bounds.min && (
                  <span className="text-base font-semibold text-[#001731]/70">
                    {' '}&ndash; {format(bounds.max, (development.currency as CurrencyCode) || 'KES')}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-base text-[#6b7280]">Price on request</p>
            )}
          </div>

          {/* PRIMARY - Development name, clickable through to the project page */}
          <h3 className="text-[20px] md:text-[24px] font-medium text-[#2D303D] leading-snug line-clamp-2">
            {projectHref ? (
              <Link to={projectHref} className="hover:text-[#8a6d1f] transition-colors">{displayName}</Link>
            ) : (
              displayName
            )}
          </h3>

          {/* PRIMARY - Location */}
          <p className="text-base font-normal text-[#2D303D] mt-1 flex items-center gap-1 line-clamp-1">
            <i className="ri-map-pin-2-line text-[#6b7280] text-base"></i>
            {titleCase(development.location) || titleCase(development.city) || 'Location on request'}
          </p>

          {/* PRIMARY - Beds / baths / size, stated once (no repeated bedroom prose) */}
          {hasStats && primary && (
            <p className="text-base font-normal text-[#2D303D] mt-1.5 leading-normal">
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

          {/* Unit-type range - the project's bedroom mix as one compact badge */}
          {rangeLabel && (
            <div className="mt-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f3f4f6] border border-[#e8eaed] text-[#001731] whitespace-nowrap">
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <i className="ri-hotel-bed-line text-sm text-[#0d5959]"></i>
                </span>
                <span className="text-[13px] font-semibold">{rangeLabel}</span>
              </span>
            </div>
          )}

          {urgency && <UrgencyMessage message={urgency} className="mt-2.5" />}
        </div>

        {/* Block 2 - description / features / developer */}
        {hasMiddle && (
          <div className="mt-3 pt-3 border-t border-[#eef0f2]">
            {development.descriptionText && (
              <p className="text-base font-normal text-[#2D303D] leading-normal line-clamp-2">{sentenceCase(development.descriptionText)}</p>
            )}

            {features.length > 0 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-1 text-base font-normal text-[#2D303D] whitespace-nowrap">
                    <i className="ri-check-line text-[#00703c] text-base"></i>
                    {titleCase(f)}
                  </li>
                ))}
              </ul>
            )}

            {development.developer && (
              <p className="text-base font-normal text-[#2D303D] mt-2 flex items-center gap-1.5 line-clamp-1">
                <i className="ri-building-2-line text-[#6b7280] text-base"></i>
                {titleCase(development.developer)}
              </p>
            )}
          </div>
        )}

        {/* Block 3 - available assets */}
        {hasActions && (
          <div className="mt-3 pt-3 border-t border-[#eef0f2] flex flex-wrap items-center gap-2">
            {development.hasFloorPlan && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eef2f7] border border-[#dbe3ec] text-[12px] font-semibold text-[#001731] whitespace-nowrap">
                <i className="ri-map-2-line text-[#0d5959]"></i>
                Floor Plan Available
              </span>
            )}
            {development.videoUrl && (
              <button
                type="button"
                aria-label={`Play video tour for ${displayName}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(development.videoUrl, '_blank', 'noopener,noreferrer'); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#001731] text-white text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer hover:bg-[#002349] transition-colors"
              >
                <i className="ri-play-circle-line text-base"></i>Video Tour
              </button>
            )}
          </div>
        )}

        {/* Block 4 - listed date + detail link */}
        <div className="mt-auto pt-3 border-t border-[#eef0f2] flex flex-col gap-2">
          {listedOn && (
            <p className="text-base font-medium text-[color:var(--card-time-text)]">Listed on {listedOn}</p>
          )}
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
              className="inline-flex items-center gap-1.5 self-start text-base font-bold text-[#001731] cursor-pointer hover:underline whitespace-nowrap"
            >
              See more of this development
              <i className="ri-arrow-right-line text-base"></i>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}