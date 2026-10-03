import { Link, useLocation } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import { getPropertySpecs } from '@/lib/propertySpecs';
import { withReturnFrom } from '@/lib/navigation';
import { smartTitleCase } from '@/lib/location';
import EntityImage from '@/components/feature/EntityImage';
import UrgencyMessage from '@/components/feature/UrgencyMessage';
import { resolveUrgency } from '@/lib/urgency';
import type { DevelopmentUnit } from '@/lib/developmentModel';

type CurrencyCode = 'KES' | 'USD' | 'GBP' | 'EUR' | 'UGX' | 'AED' | 'ZAR';

function availability(status: string): { label: string; className: string } {
  const s = (status || '').trim().toLowerCase();
  if (s === 'sold') return { label: 'Sold', className: 'bg-red-50 text-red-600 border-red-100' };
  if (s === 'reserved' || s === 'under_contract') return { label: 'Reserved', className: 'bg-amber-50 text-amber-700 border-amber-100' };
  if (s === 'rented') return { label: 'Rented', className: 'bg-stone-100 text-stone-600 border-stone-200' };
  return { label: 'Available', className: 'bg-green-50 text-green-700 border-green-100' };
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface UnitCardProps {
  unit: DevelopmentUnit;
  propertyType: string;
  /** Highlighted when the visitor arrived from this specific unit. */
  highlight?: boolean;
  /** Honest automatic message derived from this unit type's remaining stock. */
  automaticMessage?: string | null;
  /** Whether the CRM display toggle permits showing urgency on this project. */
  showUrgency?: boolean;
}

/**
 * Unit card for the project page inventory.
 *
 * Uses the site's approved listing-card UI/content system: image → compact unit
 * attributes (beds · baths · size) → unit type → availability/status → price →
 * "View property". Bedroom count is stated once (no repeated bedroom prose).
 */
export default function UnitCard({ unit, propertyType, highlight = false, automaticMessage = null, showUrgency = true }: UnitCardProps) {
  const { format } = useCurrency();
  const { pathname, search } = useLocation();
  const detailHref = withReturnFrom(`/property/${unit.slug}`, `${pathname}${search}`);
  const avail = availability(unit.status);
  const listedOn = formatDate(unit.createdAt);
  const typeWord = propertyType ? propertyType.replace(/_/g, ' ') : 'Unit';
  const urgency = resolveUrgency({ manual: unit.urgencyMessage, automatic: automaticMessage, enabled: showUrgency });

  const specs = getPropertySpecs(propertyType, {
    beds: unit.bedrooms,
    baths: unit.bathrooms,
    parking: unit.parking,
    sqft: unit.sizeUnit === 'sqft' ? unit.size : 0,
    sqm: unit.sizeUnit === 'sqm' ? unit.size : 0,
  });

  return (
    <article
      className={`group flex flex-col rounded-lg border bg-white overflow-hidden transition-colors ${
        highlight ? 'border-[#c9a84c] ring-1 ring-[#c9a84c]/40' : 'border-[#e5e5e5] hover:border-primary/30'
      }`}
    >
      <Link to={detailHref} className="relative block aspect-[4/3] overflow-hidden bg-[#F5F5F5]">
        <EntityImage
          src={unit.image}
          alt={unit.name}
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        <span className={`absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-roboto font-bold uppercase tracking-wide ${avail.className}`}>
          {avail.label}
        </span>
      </Link>

      <div className="flex flex-col flex-1 p-4">
        <p className="text-[11px] font-roboto font-semibold uppercase tracking-wide text-[#888] mb-0.5">
          {unit.bedrooms <= 0 ? 'Studio' : `${unit.bedrooms} bed`} &middot; {typeWord}
        </p>
        <h3 className="text-base font-roboto font-semibold text-primary leading-snug line-clamp-2 mb-1.5">
          <Link to={detailHref} className="hover:text-[#8a6d1f] transition-colors">
            {smartTitleCase(unit.name)}
          </Link>
        </h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-roboto font-medium text-[#2D303D] mb-3">
          {specs.map((spec) => (
            <span key={spec.key} className="inline-flex items-center gap-1">
              <i className={`${spec.icon} text-[#888] text-[13px]`}></i>
              {spec.label}
            </span>
          ))}
          {specs.length === 0 && <span className="text-[#888] italic">Details on request</span>}
        </div>

        <div className="mt-auto pt-3 border-t border-[#f0f0f0] flex flex-wrap items-center justify-between gap-2">
          <span className="font-roboto font-bold text-primary text-lg leading-none whitespace-nowrap">
            {unit.price > 0 ? format(unit.price, (unit.currency as CurrencyCode) || 'KES') : 'Price on request'}
          </span>
          <Link
            to={detailHref}
            className="inline-flex items-center gap-1 text-sm font-roboto font-semibold text-[#001731] hover:underline whitespace-nowrap"
          >
            View property
            <i className="ri-arrow-right-line text-sm"></i>
          </Link>
        </div>

        {urgency && <UrgencyMessage message={urgency} className="mt-2" />}

        {listedOn && (
          <p className="text-[12px] font-roboto font-medium text-[color:var(--card-time-text)] mt-2">
            Listed on {listedOn}
          </p>
        )}
      </div>
    </article>
  );
}