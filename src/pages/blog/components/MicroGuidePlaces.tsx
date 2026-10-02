import PlaceCard from '@/pages/blog/components/PlaceCard';
import { fragmentId } from '@/lib/guideVenues';
import type { GuidePlace } from '@/lib/guidePlaces';

interface MicroGuidePlacesProps {
  places: GuidePlace[];
  heading: string;
  subheading: string;
  /** When true (city-wide guides) the picks are grouped by area. */
  groupByArea?: boolean;
  className?: string;
}

const CITY_LABEL = 'Nairobi';

/**
 * The core module of a micro-guide: the real, verified places this guide is
 * about, rendered as editorial cards. City-wide guides group the picks by area
 * so the reader can find their neighbourhood; an area guide shows one grid.
 * Nothing is shown unless it is a real curated record.
 */
export default function MicroGuidePlaces({
  places,
  heading,
  subheading,
  groupByArea = false,
  className = '',
}: MicroGuidePlacesProps) {
  if (places.length === 0) return null;

  const groups = new Map<string, GuidePlace[]>();
  places.forEach((p) => {
    const key = p.area || CITY_LABEL;
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  });
  const grouped = Array.from(groups.entries());

  return (
    <section id="micro-guide-places" className={`scroll-mt-28 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <i className="ri-star-line text-lg"></i>
        </span>
        <div>
          <h2 className="font-prata font-semibold text-primary text-[24px] md:text-[30px] leading-tight">
            {heading}
          </h2>
          <p className="font-roboto text-[14px] text-[#636363]">{subheading}</p>
        </div>
      </div>

      {groupByArea ? (
        <div className="space-y-10 md:space-y-12">
          {grouped.map(([area, list]) => (
            <div key={area} id={`area-${fragmentId(area)}`} className="scroll-mt-28">
              <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
                <h3 className="font-prata font-semibold text-primary text-[20px] md:text-[24px]">
                  {area}
                </h3>
                <span className="font-roboto text-[13px] text-[#7a7a7a]">
                  {list.length} {list.length === 1 ? 'place' : 'places'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {list.map((place) => (
                  <PlaceCard key={place.id} place={place} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      )}
    </section>
  );
}