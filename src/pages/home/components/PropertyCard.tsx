import { Link, useLocation } from 'react-router-dom';
import type { NormalizedImage } from '@/lib/propertyImages';
import { getPropertySpecs } from '@/lib/propertySpecs';
import { useCurrency } from '@/hooks/useCurrency';
import { formatListingAge } from '@/lib/listingMeta';
import { withReturnFrom } from '@/lib/navigation';
import PropertyBadge from '@/components/feature/PropertyBadge';
import PropertyMetaBadges from '@/components/feature/PropertyMetaBadges';
import PropertyImageCarousel from './PropertyImageCarousel';

export interface Property {
  id: string;
  slug: string;
  title: string;
  location: string;
  area: string;
  type: 'sale' | 'rent';
  category: string;
  propertyType: string;
  beds: number;
  baths: number;
  parking: number;
  sqft: number;
  landSize: number;
  acreage: number;
  landUnit?: string;
  priceRaw: number;
  currency: string;
  priceUnit?: string;
  images: NormalizedImage[];
  featured: boolean;
  isJointVenture: boolean;
  justListed?: boolean;
  newHome?: boolean;
  reduced?: boolean;
  refurbished?: boolean;
  backOnMarket?: boolean;
  propertyOfTheWeek?: boolean;
  createdAt: string;
}

interface PropertyCardProps {
  property: Property;
  aspectClass: string;
  shadowClass: string;
  hoverClass: string;
  showBadge: boolean;
  onQuickView: (p: Property) => void;
}

export default function PropertyCard({
  property,
  aspectClass,
  shadowClass,
  hoverClass,
  showBadge,
  onQuickView,
}: PropertyCardProps) {
  const { format } = useCurrency();
  const { pathname, search } = useLocation();
  const href = withReturnFrom(`/property/${property.slug}`, `${pathname}${search}`);
  const listedAgo = formatListingAge(property.createdAt);

  return (
    <div className={`bg-[var(--card-bg)] overflow-hidden transition-all duration-300 group flex flex-col w-full h-full ${shadowClass} ${hoverClass}`}>
      <div className="relative flex-shrink-0">
        <PropertyImageCarousel
          images={property.images}
          detailHref={href}
          aspectClass={aspectClass}
        />

        {/* Sale / Rent badge */}
        {showBadge && (
          <div className="absolute top-3 left-3 z-10">
            <PropertyBadge variant={property.type === 'sale' ? 'sale' : 'rent'} />
          </div>
        )}

        {/* Quick view */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQuickView(property);
          }}
          className="absolute bottom-3 left-3 z-20 flex items-center gap-1 text-white text-[10px] font-semibold tracking-wide px-2 py-1 whitespace-nowrap bg-black/60 hover:bg-black/80 rounded-sm cursor-pointer transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            <i className="ri-expand-diagonal-line text-xs"></i>
          </span>
          Preview
        </button>
      </div>

      <div className="flex flex-col flex-1 p-3 px-4">
        <PropertyMetaBadges
          featured={property.featured}
          jointVenture={property.isJointVenture}
          justListed={property.justListed}
          newHome={property.newHome}
          reduced={property.reduced}
          refurbished={property.refurbished}
          backOnMarket={property.backOnMarket}
          propertyOfTheWeek={property.propertyOfTheWeek}
          className="mb-2"
        />
        <p className="text-[13px] font-medium uppercase tracking-[0.1em] mb-1 text-[color:var(--card-category-text)]">
          {property.category}
        </p>
        <Link to={href} className="block group/title">
          <h3 className="leading-snug line-clamp-2 transition-colors duration-200 text-[color:var(--card-title-text)] text-[18px] md:text-[19px] font-medium mb-2 break-words hover:text-primary cursor-pointer">
            {property.title}
          </h3>
        </Link>
        <p className="flex items-center gap-1 truncate font-medium text-[color:var(--card-location-text)] text-[14px] md:text-[15px] mb-2">
          <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
            <i className="ri-map-pin-line text-xs text-accent"></i>
          </span>
          <span className="truncate">{property.area}</span>
        </p>
        <div className="flex items-center gap-2 sm:gap-4 text-[13px] sm:text-[15px] flex-wrap font-normal mb-2 text-[color:var(--card-specs-text)]">
          {getPropertySpecs(property.propertyType, {
            beds: property.beds,
            baths: property.baths,
            parking: property.parking,
            sqft: property.sqft,
            acreage: property.acreage,
            landSize: property.landSize,
            landUnit: property.landUnit,
          }).map((spec) => (
            <span key={spec.key} className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                <i className={`${spec.icon} text-xs text-[color:var(--card-specs-text)]`}></i>
              </span>
              <span className="whitespace-nowrap">{spec.label}</span>
            </span>
          ))}
        </div>
        <p className="text-[12px] sm:text-[15px] font-roboto font-medium text-[color:var(--card-time-text)] normal-case tracking-normal whitespace-nowrap pr-1 mb-2">
          {listedAgo}
        </p>

        <div className="mt-auto pt-2 flex items-end justify-between gap-2 border-t border-[#d6d6d6] min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
            <span className="font-bold leading-tight text-[color:var(--card-price-text)] text-[19px] sm:text-[21px] md:text-[23px] lg:text-[25px] whitespace-nowrap">
              {format(property.priceRaw, property.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
            </span>
            {property.priceRaw > 0 && (property.priceUnit ? (
              <span className="inline-flex items-baseline gap-0.5 text-[#2D303D] text-[15px] font-normal">
                <span className="whitespace-nowrap">Pm</span>
                <span className="relative inline-flex items-center cursor-help group text-[#636363] opacity-40">
                  <i className="ri-information-line text-[10px]"></i>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-stone-800 text-white text-[10px] whitespace-nowrap rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none font-normal">
                    Pm = Per Month
                  </span>
                </span>
              </span>
            ) : (
              <span className="text-[15px] font-roboto font-normal text-[#2D303D] whitespace-nowrap">
                Guide Price
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}