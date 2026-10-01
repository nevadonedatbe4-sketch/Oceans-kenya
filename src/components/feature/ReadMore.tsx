import { useState } from 'react';

interface ReadMoreProps {
  /** The full long-form text. */
  text: string;
  /** Characters shown before the cut-off (default 320). */
  limit?: number;
  /** Class applied to the wrapper (colour, size, spacing). */
  className?: string;
  moreLabel?: string;
  lessLabel?: string;
}

/**
 * ReadMore - collapses long-form text to a sensible preview and expands it in
 * place. Used for descriptions, land/JV/development write-ups, agent bios and
 * long location copy so a page never becomes excessively tall.
 *
 * IMPORTANT: this only ever wraps prose. Structured facts and specifications
 * are never hidden behind it - those stay permanently visible.
 */
export default function ReadMore({
  text,
  limit = 320,
  className = '',
  moreLabel = 'Read more',
  lessLabel = 'Show less',
}: ReadMoreProps) {
  const [expanded, setExpanded] = useState(false);

  const plain = (text || '').trim();
  if (!plain) return null;

  const isLong = plain.length > limit;
  const preview = isLong && !expanded ? `${plain.slice(0, limit).trimEnd()}\u2026` : plain;

  return (
    <span className={`block ${className}`.trim()}>
      <span className="whitespace-pre-line">{preview}</span>
      {isLong && (
        <>
          {' '}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="inline-flex items-center gap-1 font-semibold text-accent hover:opacity-70 transition-opacity cursor-pointer whitespace-nowrap"
          >
            {expanded ? lessLabel : moreLabel}
            <i className={`${expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-sm`}></i>
          </button>
        </>
      )}
    </span>
  );
}