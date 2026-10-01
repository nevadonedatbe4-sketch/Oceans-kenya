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

interface DevelopmentCardProps {
  development: Development;
  onOpen: (development: Development) => void;
}

export default function DevelopmentCard({ development, onOpen }: DevelopmentCardProps) {
  const { format } = useCurrency();
  const badge = stageBadge(development.status);
  const features = (development.features || []).slice(0, 3);
  const primary = development.units[0];
  const displayName = titleCase(development.name);
  const detailHref = development.slug ? `/property/${development.slug}` : undefined;

  return (
    <article className="group relative h-full bg-white overflow-hidden border flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-[#c9a84c]" style={{ borderColor: '#e8eaed' }}>
      {/* Image */}
      <div className="relative flex-shrink-0 h-52 sm:h-56 md:h-60 bg-stone-100">
        <DevelopmentGallery
          images={development.gallery}
          name={displayName}
          detailHref={detailHref}
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
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 md:p-5">
        {/* Price - 20 mobile / 24 desktop / 700 */}
        <div className="mb-1.5">
          {development.lowestPrice > 0 ? (
            <p className="text-xl md:text-[24px] font-bold text-[#001731] leading-tight">
              {development.hasPriceRange && <span className="text-base font-semibold text-[#8a6d1f] mr-1">From</span>}
              {format(development.lowestPrice, (development.currency as CurrencyCode) || 'KES')}
            </p>
          ) : (
            <p className="text-base text-[#6b7280]">Price on request</p>
          )}
        </div>

        {/* Project name - clickable through to the property detail page */}
        <h3 className="text-[20px] md:text-[24px] font-medium text-[#2D303D] leading-snug line-clamp-2">
          {detailHref ? (
            <Link to={detailHref} className="hover:text-[#8a6d1f] transition-colors">{displayName}</Link>
          ) : (
            displayName
          )}
        </h3>

        {/* Location - 16px / 600 */}
        <p className="text-base font-normal text-[#2D303D] mt-1 flex items-center gap-1 line-clamp-1">
          <i className="ri-map-pin-2-line text-[#6b7280] text-base"></i>
          {titleCase(development.location) || titleCase(development.city) || 'Location on request'}
        </p>

        {/* Specs - 16px / 600, grammar-safe */}
        {primary && (primary.bedrooms > 0 || primary.bathrooms > 0 || primary.size > 0) && (
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

        {/* Project scale - real total_units from the CRM */}
        {development.totalUnits > 0 && (
          <p className="text-base font-normal text-[#2D303D] mt-1.5">{development.totalUnits} Units</p>
        )}

        {/* Video Tour - only when an actual video is attached */}
        {development.videoUrl && (
          <button
            type="button"
            aria-label={`Play video tour for ${displayName}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(development.videoUrl, '_blank', 'noopener,noreferrer'); }}
            className="mt-2.5 inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-sm bg-[#001731] text-white text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer hover:bg-[#002349] transition-colors"
          >
            <i className="ri-play-circle-line text-base"></i>Video Tour
          </button>
        )}

        {/* Description - real listing description only, 16px / 400 / 1.5 */}
        {development.descriptionText && (
          <p className="text-base font-normal text-[#2D303D] leading-normal line-clamp-2 mt-2">{sentenceCase(development.descriptionText)}</p>
        )}

        {/* Feature ticks - 16px / 400 */}
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

        {/* See more - 16px / 700 */}
        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={() => onOpen(development)}
            className="inline-flex items-center gap-1.5 text-base font-bold text-[#001731] cursor-pointer hover:underline whitespace-nowrap"
          >
            See more of this development
            <i className="ri-arrow-right-line text-base"></i>
          </button>
        </div>
      </div>
    </article>
  );
}