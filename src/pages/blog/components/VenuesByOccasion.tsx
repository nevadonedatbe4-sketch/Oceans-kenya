import VenueCard from '@/pages/blog/components/VenueCard';
import type { OccasionGroup } from '@/lib/guideVenues';

interface VenuesByOccasionProps {
  groups: OccasionGroup[];
  className?: string;
}

const PER_OCCASION = 3;

/**
 * "Choose your restaurant by occasion" - the same verified venues, re-cut by
 * what the reader is actually doing (date night, family, business, brunch...).
 * Only the top few are shown per occasion to keep the page scannable.
 */
export default function VenuesByOccasion({ groups, className = '' }: VenuesByOccasionProps) {
  if (groups.length === 0) return null;

  return (
    <section id="by-occasion" className={`scroll-mt-28 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-golden/15 text-golden shrink-0">
          <i className="ri-restaurant-2-line text-lg"></i>
        </span>
        <div>
          <h2 className="font-prata font-semibold text-primary text-[24px] md:text-[30px] leading-tight">
            Choose your restaurant by occasion
          </h2>
          <p className="font-roboto text-[14px] text-[#636363]">
            The same verified venues, sorted by what you are planning.
          </p>
        </div>
      </div>

      <div className="space-y-10 md:space-y-12">
        {groups.map((group) => (
          <div key={group.key} id={`occasion-${group.key}`} className="scroll-mt-28">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <i className={`${group.icon} text-[16px]`}></i>
              </span>
              <h3 className="font-prata font-semibold text-primary text-[20px] md:text-[23px]">
                {group.label}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {group.venues.slice(0, PER_OCCASION).map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}