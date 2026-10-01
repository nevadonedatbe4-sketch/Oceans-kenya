import type { CSSProperties } from 'react';
import { displayTitle } from '@/lib/crmDisplay';

interface CrmTitleProps {
  /** Raw title from the backend — rendered in Normal Title Case. */
  title?: string | null;
  /** Shown when the title is empty. */
  fallback?: string;
  /**
   * Insert a line break after this many words so long listing titles read as
   * two balanced lines instead of overflowing their column. Defaults to 4.
   */
  breakAfter?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * CrmTitle — the single source of truth for how property / land / development
 * / JV titles render across every CRM surface.
 *
 * Rules:
 * - Always Normal Title Case (never ALL CAPS).
 * - Never truncated and never given an ellipsis.
 * - Titles longer than `breakAfter` words wrap naturally onto a second line,
 *   breaking after the 4th word by default.
 */
export default function CrmTitle({
  title,
  fallback = 'Untitled',
  breakAfter = 4,
  className,
  style,
}: CrmTitleProps) {
  const text = displayTitle(title) || fallback;
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length <= breakAfter) {
    return <span className={className} style={style}>{text}</span>;
  }

  const first = words.slice(0, breakAfter).join(' ');
  const rest = words.slice(breakAfter).join(' ');

  return (
    <span className={className} style={style}>
      {first}
      <br />
      {rest}
    </span>
  );
}