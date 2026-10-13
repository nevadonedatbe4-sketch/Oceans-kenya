import { Link, useLocation } from 'react-router-dom';
import PropertyMetaBadges from '@/components/feature/PropertyMetaBadges';
import CardContactActions from '@/components/feature/CardContactActions';
import { getPropertySpecs } from '@/lib/propertySpecs';
import { formatListingAge } from '@/lib/listingMeta';
import { cleanListingDescription } from '@/lib/description';
import { withReturnFrom } from '@/lib/navigation';
import type { MappedListing } from '@/hooks/useListings';
import UrgencyMessage from '@/components/feature/UrgencyMessage';
import { resolveUrgency, autoUrgency } from '@/lib/urgency';

type Currency = 'KES' | 'USD' | 'GBP' | 'EUR';

interface PropertyCardBodyProps {
  property: MappedListing;
  format: (value: number, currency: Currency) => string;
  onMessage: () => void;
  /** Transaction mode - controls the price annotation (Guide price / pcm). */
  variant: 'sale' | 'rent';
  /**
   * The area the current radius search is centred on (e.g. "Karen"). When a
   * listing sits in this SAME area, its distance badge is suppressed: the area
   * hubs are coarse (~100m of drift) so a sub-kilometre reading is noise, not
   * a real distance. Only listings that step OUT of the anchor area ever show
   * a distance, and that distance is shown in miles.
   */
  anchorArea?: string;
}

/**
 * Shared content column for every Sale & Buy property result card.
 *
 * Content hierarchy (top to bottom):
 *   1. Status badges
 *   2. PRICE - the primary, most prominent element (22px minimum)
 *   3. Title
 *   4. Short description snippet (2 lines, trimmed from the listing copy)
 *   5. Key property facts directly below the title (beds / baths / parking / size)
 *   6. Location
 *   7. Agent footer - listing age + Call / Message actions
 *
 * The description is clamped to two lines so the card stays scannable and
 * premium while still giving a taste of the listing.
 */
export default function PropertyCardBody({
  property: p,
  format,
  onMessage,
  variant,
  anchorArea,
}: PropertyCardBodyProps) {
  const allFactsEmpty =
    !p.beds && !p.baths && !p.parking && !p.sqft && !p.acreage && !p.landSize;

  const specs = getPropertySpecs(p.propertyType, {
    beds: p.beds,
    baths: p.baths,
    parking: p.parking,
    sqft: p.sqft,
    acreage: p.acreage,
    landSize: p.landSize,
    landUnit: p.landUnit,
  });

  const { pathname, search } = useLocation();
  const detailHref = withReturnFrom(`/property/${p.slug}`, `${pathname}${search}`);

  // A published listing with no numeric price ("Price on request") must never
  // render a misleading "KES 0" - fall back to the human label.
  const priceLabel = p.rawPrice > 0
    ? format(p.rawPrice, p.currency as Currency)
    : (p.price || 'Price on request');

  // Shared age rule: a specific time once one is measurable, and an EMPTY
  // string when the date is missing/invalid OR the listing is still under a
  // minute old - so the age line is omitted entirely rather than showing a
  // vague "recently" placeholder.
  const listedAgo = formatListingAge(p.createdAt);

  // Short, HTML-free taste of the listing copy, run through the SAME shared
  // casing normaliser used site-wide (block-by-block), so a shouty ALL-CAPS
  // headline is tidied while already well-cased prose is left untouched.
  // Empty when no description so the whole snippet is omitted cleanly.
  const snippet = cleanListingDescription(p.description, { normalizeCase: true });

  // Manual agent message wins; otherwise an honest automatic message when a
  // reliable remaining-unit count exists. Never invents scarcity.
  const urgency = resolveUrgency({
    manual: p.urgencyMessage,
    automatic: p.availableUnits && p.availableUnits > 0 ? autoUrgency(p.availableUnits, 'unit') : null,
    enabled: p.showUrgencyMessage !== false,
  });

  // ── Distance badge (radius search only) ────────────────────────────────
  // Only meaningful when the listing genuinely sits OUTSIDE the area the
  // search is centred on. A same-area listing must show NOTHING - the area
  // hubs are coarse, so a small sub-mile reading is coordinate drift between
  // two sources for the same place, not a real distance. Out-of-area listings
  // are expressed in MILES (e.g. "1 mile away"), never raw metres/kilometres.
  const milesAway = p.distanceKm != null ? p.distanceKm * 0.621371 : null;
  const sameArea = (() => {
    if (!anchorArea || !p.area) return false;
    const a = anchorArea.toLowerCase().trim();
    const b = p.area.toLowerCase().trim();
    return a === b || a.includes(b) || b.includes(a);
  })();
  const showDistance = milesAway != null && milesAway >= 0.1 && !sameArea;
  const roundedMiles = milesAway == null ? 0 : Math.round(milesAway);
  const distanceLabel = milesAway == null
    ? ''
    : milesAway < 1
      ? 'under 1 mile away'
      : `${roundedMiles} ${roundedMiles === 1 ? 'mile' : 'miles'} away`;

  return (
    <div className="flex-1 p-4 sm:p-5 max-sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden">
      <div className="min-w-0">
        <PropertyMetaBadges
          featured={p.featured}
          justListed={p.justAdded}
          jointVenture={p.isJointVenture}
          newHome={p.newHome}
          reduced={p.reduced}
          videoTour={p.videoTour}
          virtualTour={p.virtualTour}
          floorPlan={p.floorPlan}
          houseShare={p.houseShare}
          propertyOfTheWeek={p.propertyOfTheWeek}
          backOnMarket={p.backOnMarket}
          refurbished={p.refurbished}
          className="mb-2"
        />

        {/* PRICE - primary information, 22px minimum */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1.5">
          <span className="font-roboto font-bold text-[color:var(--card-price-text)] text-[22px] md:text-2xl leading-tight whitespace-nowrap">
            {priceLabel}
          </span>
          {p.rawPrice > 0 && (variant === 'rent' ? (
            <span className="relative inline-flex items-center gap-1 text-sm font-roboto font-medium text-[#1A1C26]">
              pcm
              <span className="group relative inline-flex items-center cursor-help opacity-60">
                <i className="ri-information-line text-[11px]"></i>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-stone-800 text-white text-[10px] whitespace-nowrap rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none font-normal">
                  Per calendar month
                </span>
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-roboto font-medium text-[color:var(--card-category-text)]">
              Guide price
              <span className="cursor-help" title="The asking price set by the seller">
                <i className="ri-information-line text-sm"></i>
              </span>
            </span>
          ))}
        </div>

        {urgency && <UrgencyMessage message={urgency} className="mb-1.5" />}

        {/* Title */}
        <Link to={detailHref} className="block mb-1.5">
          <h3 className="card-title text-sm md:text-base font-roboto font-medium text-[color:var(--card-title-text)] leading-snug line-clamp-2 transition-colors hover:text-primary">
            {p.title}
          </h3>
        </Link>

        {/* Short description snippet - 2 lines, directly below the title */}
        {snippet && (
          <p className="text-xs md:text-sm font-roboto font-normal text-[#555555] leading-relaxed line-clamp-2 mb-2">
            {snippet}
          </p>
        )}

        {/* Key facts - directly below the title */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
          {specs.map((spec) => (
            <span
              key={spec.key}
              className="flex items-center gap-1 text-xs md:text-sm font-roboto font-medium text-[#2D303D]"
            >
              <i className={`${spec.icon} text-[#555555] text-xs`}></i>
              {spec.label}
            </span>
          ))}
          {allFactsEmpty && (
            <span className="text-xs font-roboto text-primary/50 italic">Details on request</span>
          )}
        </div>

        {/* Location */}
        <address className="not-italic flex items-start gap-1.5">
          <span className="w-3 h-3 flex items-center justify-center shrink-0 mt-0.5">
            <i className="ri-map-pin-line text-accent text-[10px]"></i>
          </span>
          <span className="min-w-0">
            <span className="block text-xs md:text-sm font-roboto font-medium text-[#2D303D] leading-snug">
              {p.area || p.location}
            </span>
          </span>
          {showDistance && (
            <span className="ml-1.5 mt-0.5 text-[10px] font-roboto font-normal text-[#2D303D] bg-primary/5 px-1.5 py-0.5 rounded whitespace-nowrap">
              {distanceLabel}
            </span>
          )}
        </address>
      </div>

      {/* Agent footer */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 pt-3 border-t-2 border-primary/12">
        {listedAgo && (
          <span className="text-xs font-roboto font-medium text-[color:var(--card-time-text)] whitespace-nowrap shrink-0">
            {listedAgo}
          </span>
        )}
        <CardContactActions
          phone={p.agentPhone}
          onMessage={onMessage}
          className="shrink-0"
        />
      </div>
    </div>
  );
}