import type { ReactNode } from 'react';

interface SectionFoldProps {
  /** Stable id (kept for call-site compatibility; no longer used for folding). */
  id?: string;
  /** Section heading shown in the always-visible header row. */
  title: string;
  /** Remix icon class for the leading bubble. */
  icon?: string;
  /** Retained for call-site compatibility; no longer rendered. */
  summary?: string;
  /** Retained for call-site compatibility; sections are always expanded. */
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * SectionFold - the shared section shell used across the development detail page.
 *
 * Previously a collapsible accordion ("Expand all / Collapse all"). The page now
 * shows every section fully expanded behind a static header, so long-form copy
 * is trimmed in place with CollapsibleDescription instead of folding whole
 * blocks. The card styling and header layout are unchanged.
 */
export default function SectionFold({ title, icon, children }: SectionFoldProps) {
  return (
    <section className="rounded-lg border border-[#e5e5e5] bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 md:px-7 md:py-5">
        {icon && (
          <span className="w-9 h-9 flex items-center justify-center rounded-full bg-accent/10 text-accent shrink-0">
            <i className={`${icon} text-lg`}></i>
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-xl md:text-2xl font-bold text-primary leading-tight">{title}</span>
        </span>
      </div>

      <div className="px-5 pb-5 md:px-7 md:pb-7">{children}</div>
    </section>
  );
}