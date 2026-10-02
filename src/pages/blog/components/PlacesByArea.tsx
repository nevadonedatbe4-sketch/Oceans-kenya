import PlaceCard from '@/pages/blog/components/PlaceCard';
import { fragmentId } from '@/lib/guideVenues';
import type { AreaGroup } from '@/lib/guideVenues';
import type { GuidePlace } from '@/lib/guidePlaces';

interface PlacesByAreaProps {
  groups: AreaGroup[];
  className?: string;
}

/**
 * "Things to do, area by area" - real places grouped by the areas this guide
 * actually covers. Areas with no verified places are omitted entirely (no
 * empty sections, no filler). The placeholder card type is GuidePlace, so the
 * shared editorial card renders the correct icon and category label.
 */
export default function PlacesByArea({ groups, className = '' }: PlacesByAreaProps) {
  if (groups.length === 0) return null;

  return (
    <section id="ttd-area" className={`scroll-mt-28 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <i className="ri-map-2-line text-lg"></i>
        </span>
        <div>
          <h2 className="font-prata font-semibold text-primary text-[24px] md:text-[30px] leading-tight">
            Things to do, area by area
          </h2>
          <p className="font-roboto text-[14px] text-[#636363]">
            Start with the neighbourhood you are staying in or heading to.
          </p>
        </div>
      </div>

      <div className="space-y-10 md:space-y-12">
        {groups.map((group) => (
          <div key={group.name} id={`area-${fragmentId(group.name)}`} className="scroll-mt-28">
            <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
              <h3 className="font-prata font-semibold text-primary text-[20px] md:text-[24px]">
                {group.name}
              </h3>
              <span className="font-roboto text-[13px] text-[#7a7a7a]">
                {group.venues.length} {group.venues.length === 1 ? 'place' : 'places'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {group.venues.map((venue) => (
                <PlaceCard key={venue.id} place={venue as GuidePlace} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}