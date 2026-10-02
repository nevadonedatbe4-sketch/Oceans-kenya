import PlaceCard from '@/pages/blog/components/PlaceCard';
import type { ThemeGroup } from '@/lib/guidePlaces';

interface PlacesByThemeProps {
  groups: ThemeGroup[];
  className?: string;
}

const PER_THEME = 6;

/**
 * "Things to do, theme by theme" - curated places grouped by what the reader
 * actually wants to do (wildlife, culture, nature, art, family, shopping,
 * nightlife). Themes with no verified places are omitted entirely.
 */
export default function PlacesByTheme({ groups, className = '' }: PlacesByThemeProps) {
  if (groups.length === 0) return null;

  return (
    <section id="ttd-theme" className={`scroll-mt-28 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <i className="ri-compass-3-line text-lg"></i>
        </span>
        <div>
          <h2 className="font-prata font-semibold text-primary text-[24px] md:text-[30px] leading-tight">
            Things to do, theme by theme
          </h2>
          <p className="font-roboto text-[14px] text-[#636363]">
            Pick the kind of day you want - each section is a real, verified place.
          </p>
        </div>
      </div>

      <div className="space-y-10 md:space-y-12">
        {groups.map((group) => (
          <div key={group.key} id={`theme-${group.key}`} className="scroll-mt-28">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <i className={`${group.icon} text-[16px]`}></i>
              </span>
              <h3 className="font-prata font-semibold text-primary text-[20px] md:text-[23px]">
                {group.label}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {group.places.slice(0, PER_THEME).map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}