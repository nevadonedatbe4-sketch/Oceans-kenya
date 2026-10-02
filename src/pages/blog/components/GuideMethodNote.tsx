import type { GuideVenue } from '@/lib/guideVenues';

interface GuideMethodNoteProps {
  venues: GuideVenue[];
  className?: string;
}

/**
 * A short "how this guide is put together" note. It names the real sources the
 * venue records were verified against and the most recent verification date, so
 * the reader knows this is researched editorial - not scraped filler. Renders
 * only when there is at least one sourced venue.
 */
export default function GuideMethodNote({ venues, className = '' }: GuideMethodNoteProps) {
  const sources = Array.from(new Set(venues.map((v) => v.source).filter((s): s is string => !!s)));
  const dates = venues.map((v) => v.lastVerified).filter((d): d is string => !!d);

  if (sources.length === 0 && dates.length === 0) return null;

  return (
    <aside className={`bg-background-100 border-2 border-primary/12 rounded-lg p-5 md:p-6 ${className}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <i className="ri-shield-check-line text-[16px]"></i>
        </span>
        <h2 className="font-jost font-semibold uppercase tracking-[0.12em] text-[12px] text-primary">
          How this guide is put together
        </h2>
      </div>
      <p className="font-roboto text-[13.5px] text-[#4a4a4a] leading-relaxed mb-3">
        Every venue below is a real, verified place - not an advert. We describe why each one earns
        its place in this guide, and we omit any detail we cannot verify rather than guessing.
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
        {sources.length > 0 && (
          <div>
            <dt className="font-roboto text-[11px] uppercase tracking-[0.12em] text-[#7a7a7a]">
              Sources
            </dt>
            <dd className="font-roboto text-[13.5px] text-primary">{sources.join(' · ')}</dd>
          </div>
        )}
        {dates.length > 0 && (
          <div>
            <dt className="font-roboto text-[11px] uppercase tracking-[0.12em] text-[#7a7a7a]">
              Latest verification
            </dt>
            <dd className="font-roboto text-[13.5px] text-primary">{dates[0]}</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}