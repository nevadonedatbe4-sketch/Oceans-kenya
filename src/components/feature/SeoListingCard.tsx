import { Link, useLocation } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import { getPropertySpecs } from '@/lib/propertySpecs';
import { smartTitleCase } from '@/lib/location';
import { cleanListingDescription } from '@/lib/description';
import { formatListingAge } from '@/lib/listingMeta';
import { withReturnFrom } from '@/lib/navigation';
import type { MappedListing } from '@/hooks/useListings';
import PropertyBadge from '@/components/feature/PropertyBadge';
import PropertyMetaBadges from '@/components/feature/PropertyMetaBadges';
import EntityImage from '@/components/feature/EntityImage';
import UrgencyMessage from '@/components/feature/UrgencyMessage';
import { resolveUrgency, autoUrgency } from '@/lib/urgency';

interface SeoListingCardProps {
  property: MappedListing;
}

/**
 * Compact listing card reused across every SEO landing page. Matches the
 * premium card system on /buy and /rent (currency conversion, spec icons,
 * badges, time-ago) so the SEO clusters never look like a separate template.
 */
export default function SeoListingCard({ property: p }: SeoListingCardProps) {
  const { format } = useCurrency();
  const { pathname, search } = useLocation();
  const detailHref = withReturnFrom(`/property/${p.slug}`, `${pathname}${search}`);
  const listedAgo = formatListingAge(p.createdAt);

  // Short, HTML-free taste of the listing copy - run through the SAME shared
  // block-by-block casing normaliser used on the main cards, so a shouty
  // ALL-CAPS headline is tidied while well-cased prose stays untouched. Empty
  // when there is no description, so the snippet is omitted cleanly.
  const snippet = cleanListingDescription(p.description, { normalizeCase: true });

  const urgency = resolveUrgency({
    manual: p.urgencyMessage,
    automatic: p.availableUnits && p.availableUnits > 0 ? autoUrgency(p.availableUnits, 'unit') : null,
    enabled: p.showUrgencyMessage !== false,
  });

  return (
    <Link
      to={detailHref}
      className="group block bg-white rounded-lg overflow-hidden border-2 border-primary/12 hover:border-primary/30 transition-all duration-300"
      data-product-shop="true"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F5F5F5]">
        <EntityImage
          src={p.image}
          alt={p.title}
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute top-2.5 left-2.5">
          <PropertyBadge variant={p.type === 'rent' ? 'rent' : 'sale'} />
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 md:p-4">
        <p className="text-[color:var(--card-category-text)] text-[13px] font-roboto font-medium uppercase tracking-[0.1em] mb-1">
          {p.category}
        </p>
        <h3 className="card-title font-roboto font-medium text-sm md:text-base text-[color:var(--card-title-text)] leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {smartTitleCase(p.title)}
        </h3>
        {snippet && (
          <p className="text-xs md:text-sm font-roboto font-normal text-[#555555] leading-relaxed line-clamp-2 mb-3">
            {snippet}
          </p>
        )}
        <address className="not-italic flex items-start gap-1.5 mb-3">
          <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 mt-0.5">
            <i className="ri-map-pin-line text-[#6b7280] text-xs"></i>
          </span>
          <span className="text-xs md:text-sm font-roboto font-medium text-[#2D303D] leading-snug">
            {smartTitleCase(p.area || p.location)}
          </span>
        </address>

        <div className="flex items-center gap-3 flex-wrap text-[#2D303D] text-xs font-roboto font-medium mb-3">
          {getPropertySpecs(p.propertyType, {
            beds: p.beds,
            baths: p.baths,
            parking: p.parking,
            sqft: p.sqft,
            acreage: p.acreage,
            landSize: p.landSize,
            landUnit: p.landUnit,
          }).map((spec) => (
            <span key={spec.key} className="flex items-center gap-1">
              <i className={`${spec.icon} text-[#555555] text-xs`}></i> {spec.label}
            </span>
          ))}
          {p.beds === 0 && p.baths === 0 && p.parking === 0 && p.sqft === 0 && p.acreage === 0 && p.landSize === 0 && (
            <span className="text-xs font-roboto text-primary/50 italic">Details on request</span>
          )}
        </div>

        <PropertyMetaBadges
          featured={p.featured}
          justListed={p.justAdded}
          reduced={p.reduced}
          newHome={p.newHome}
          backOnMarket={p.backOnMarket}
          refurbished={p.refurbished}
          floorPlan={p.floorPlan}
          className="mb-3"
        />

        {urgency && <UrgencyMessage message={urgency} className="mb-2.5" />}

        <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between">
          <p className="font-roboto text-[color:var(--card-price-text)] text-sm font-bold">
            {format(p.rawPrice, (p.currency || 'KES') as 'KES' | 'USD' | 'GBP' | 'EUR')}
          </p>
          <span className="text-xs font-roboto font-medium text-[color:var(--card-time-text)] whitespace-nowrap">
            {listedAgo}
          </span>
        </div>
      </div>
    </Link>
  );
}