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
  /** Optional active search keywords — matched words are highlighted. */
  terms?: string[];
  className?: string;
  style?: CSSProperties;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
 * - When `terms` is supplied, words matching an active search keyword are
 *   highlighted so staff can see why the record matched.
 */
export default function CrmTitle({
  title,
  fallback = 'Untitled',
  breakAfter = 4,
  terms = [],
  className,
  style,
}: CrmTitleProps) {
  const text = displayTitle(title) || fallback;
  const words = text.split(/\s+/).filter(Boolean);

  const cleanTerms = Array.from(
    new Set((terms || []).map((t) => (t || '').trim()).filter((t) => t.length > 1)),
  );
  const lowerTerms = new Set(cleanTerms.map((t) => t.toLowerCase()));
  const pattern = cleanTerms.length > 0
    ? new RegExp(`(${cleanTerms.map(escapeRegExp).join('|')})`, 'gi')
    : null;

  const renderWord = (word: string, key: number) => {
    if (!pattern) return <span key={key}>{word}</span>;
    pattern.lastIndex = 0;
    const segments = word.split(pattern);
    return (
      <span key={key}>
        {segments.map((seg, i) =>
          seg && lowerTerms.has(seg.toLowerCase()) ? (
            <mark key={i} className="bg-[#C9A84C]/45 text-inherit rounded-[3px] px-0.5">
              {seg}
            </mark>
          ) : (
            <span key={i}>{seg}</span>
          ),
        )}
      </span>
    );
  };

  if (words.length <= breakAfter) {
    return (
      <span className={className} style={style}>
        {words.map((w, i) => (
          <span key={i}>
            {renderWord(w, i)}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    );
  }

  const first = words.slice(0, breakAfter);
  const rest = words.slice(breakAfter);

  return (
    <span className={className} style={style}>
      {first.map((w, i) => (
        <span key={i}>
          {renderWord(w, i)}
          {i < first.length - 1 ? ' ' : ''}
        </span>
      ))}
      <br />
      {rest.map((w, i) => (
        <span key={i}>
          {renderWord(w, i)}
          {i < rest.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}