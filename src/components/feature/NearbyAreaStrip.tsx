import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import ScrollRevealBlock from '@/components/feature/ScrollRevealBlock';
import {
  resolveAreaSearch,
  nearbyAreaNames,
  areaSearchHref,
  type AreaSearchPurpose,
} from '@/lib/areaSearch';
import { PREMIUM_AREA_PROFILES } from '@/lib/seoClusters';

interface NearbyAreaStripProps {
  /** The current page's area label (single, combined or alias). */
  label: string;
  /** Buy/Rent intent carried into every neighbour's search. */
  purpose?: AreaSearchPurpose;
  /** Heading override (defaults to "Nearby areas"). */
  heading?: string;
  /** Description override (defaults to a label-aware sentence). */
  description?: string;
  /** Optional className for the section wrapper (controls top spacing). */
  className?: string;
}

/**
 * NearbyAreaStrip - the shared "cross-link to neighbouring areas" block.
 *
 * Every consumer (Area Results, Area Guides, Neighbourhood Detail) passes the
 * page's own area label; the strip runs it through the SAME area resolver used
 * by every property CTA, then renders each neighbour as a chip that links to
 * that neighbour's OWN filtered search (`/area/{slug}?place=...`), carrying the
 * Buy/Rent intent with it.
 *
 * Neighbours are true geographic neighbours from the location registry
 * (haversine distance), and when a label cannot be pinned to a concrete area it
 * falls back to the premium area list - so the strip is never empty.
 */
export default function NearbyAreaStrip({
  label,
  purpose,
  heading = 'Nearby areas',
  description,
  className = 'mt-14 md:mt-16',
}: NearbyAreaStripProps) {
  const resolved = useMemo(() => resolveAreaSearch(label), [label]);

  const nearbyAreas = useMemo(() => {
    const fromGeo = nearbyAreaNames(resolved.areas, resolved.city, 8);
    if (fromGeo.length > 0) return fromGeo;
    return PREMIUM_AREA_PROFILES.filter(
      (p) =>
        !resolved.areas.some((a) => a.toLowerCase() === p.name.toLowerCase()) &&
        p.name.toLowerCase() !== resolved.label.toLowerCase()
    )
      .slice(0, 8)
      .map((p) => p.name);
  }, [resolved]);

  if (nearbyAreas.length === 0) return null;

  return (
    <ScrollRevealBlock>
      <section className={className} aria-label={heading}>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-accent-100 text-accent-700 shrink-0">
            <i className="ri-road-map-line text-lg"></i>
          </span>
          <div>
            <h2 className="font-roboto font-bold text-xl md:text-2xl text-primary leading-tight">
              {heading}
            </h2>
            <p className="font-roboto text-[14px] text-[#636363]">
              {description || `Explore homes in the neighbourhoods around ${resolved.label}.`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {nearbyAreas.map((name) => (
            <Link
              key={name}
              to={areaSearchHref(name, { purpose })}
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-100 text-accent-900 border-2 border-accent-200 hover:border-accent-400 hover:bg-accent-200 transition-colors cursor-pointer"
            >
              <i className="ri-map-pin-2-line text-sm"></i>
              <span className="font-roboto text-[14px] font-medium whitespace-nowrap">{name}</span>
              <i className="ri-arrow-right-line text-xs group-hover:translate-x-0.5 transition-transform"></i>
            </Link>
          ))}
        </div>
      </section>
    </ScrollRevealBlock>
  );
}