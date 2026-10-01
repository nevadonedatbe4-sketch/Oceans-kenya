import type { ReactNode } from 'react';

export interface AreaOverviewFact {
  label: string;
  value: ReactNode;
}

interface AreaOverviewSidebarProps {
  /** Card title, e.g. "Overview & Vibe" or "Karen Quick Facts". */
  heading: string;
  /** Small eyebrow label above the heading. */
  eyebrow?: string;
  /** Optional intro paragraph shown under the heading. */
  intro?: string;
  /** The quick-facts rows rendered as a stacked, divided list. */
  facts: AreaOverviewFact[];
  /** Optional call-to-action or extra content pinned to the bottom. */
  footer?: ReactNode;
  className?: string;
}

/**
 * AreaOverviewSidebar - the shared right-hand "at a glance" panel used on every
 * area page (neighbourhood detail, area guide and area results).
 *
 * It is intentionally dumb: each page feeds it the facts it already has, so the
 * three views share one look and one sticky behaviour without duplicating markup.
 */
export default function AreaOverviewSidebar({
  heading,
  eyebrow = 'At a glance',
  intro,
  facts,
  footer,
  className = '',
}: AreaOverviewSidebarProps) {
  return (
    <aside className={`self-start w-full ${className}`}>
      <div className="bg-[#F7F9F9] rounded-lg border-2 border-primary/12 p-5 md:p-6">
        <p className="text-golden text-[11px] font-roboto font-semibold uppercase tracking-[0.3em] mb-1">
          {eyebrow}
        </p>
        <h2 className="font-roboto font-bold text-lg md:text-xl text-primary mb-4">{heading}</h2>
        {intro && (
          <p className="font-roboto text-stone-600 text-sm leading-relaxed mb-5">{intro}</p>
        )}
        <div className="flex flex-col divide-y divide-primary/10">
          {facts.map((fact) => (
            <div key={fact.label} className="py-3.5 first:pt-0 last:pb-0">
              <p className="font-roboto text-stone-400 text-[11px] uppercase tracking-wider mb-1">
                {fact.label}
              </p>
              <div className="font-roboto text-primary text-sm font-semibold leading-snug">
                {fact.value}
              </div>
            </div>
          ))}
        </div>
        {footer && <div className="mt-5 pt-5 border-t border-primary/10">{footer}</div>}
      </div>
    </aside>
  );
}