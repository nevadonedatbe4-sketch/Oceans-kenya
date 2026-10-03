import { useEffect, useRef, useState, type ReactNode } from 'react';

interface CollapsibleDescriptionProps {
  /** The rendered description (rich text) to collapse. */
  children: ReactNode;
  /** Pixel height shown before the cut-off when the copy is long. */
  collapsedHeight?: number;
  moreLabel?: string;
  lessLabel?: string;
}

/**
 * CollapsibleDescription - the shared treatment for long-form copy.
 *
 * The description is trimmed to a fixed height with a soft fade; the
 * "Read full description" control reveals the complete write-up in place.
 * The toggle only appears when the copy actually overflows, so short
 * descriptions stay clean and unbounded.
 */
export default function CollapsibleDescription({
  children,
  collapsedHeight = 240,
  moreLabel = 'Read full description',
  lessLabel = 'Show less',
}: CollapsibleDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [isLong, setIsLong] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setIsLong(el.scrollHeight > collapsedHeight + 32);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [collapsedHeight, children]);

  return (
    <div>
      <div
        className="relative overflow-hidden transition-[max-height] duration-500 ease-out"
        style={{ maxHeight: isLong && !expanded ? `${collapsedHeight}px` : expanded ? '3000px' : undefined }}
      >
        <div ref={innerRef}>{children}</div>
        {isLong && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
        )}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent hover:opacity-70 transition-opacity cursor-pointer whitespace-nowrap"
        >
          {expanded ? lessLabel : moreLabel}
          <span className="w-4 h-4 flex items-center justify-center">
            <i className={`text-sm ${expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
          </span>
        </button>
      )}
    </div>
  );
}