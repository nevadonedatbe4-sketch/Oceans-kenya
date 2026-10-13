import type { CSSProperties } from 'react';

/**
 * HighlightText - wraps the parts of a string that match the active search
 * keywords in a subtle highlight, so staff can instantly see WHY a CRM record
 * matched their query.
 *
 * Matching is case-insensitive and substring-based (mirrors the `ilike %term%`
 * behaviour of the shared CRM search engine), so highlighting a row never
 * disagrees with the search that produced it.
 *
 * Pure presentational - it never changes the underlying text.
 */
export interface HighlightTextProps {
  text?: string | null;
  /** Active keyword tokens (already tokenised). */
  terms?: string[];
  className?: string;
  style?: CSSProperties;
  /** Class applied to each matched fragment. */
  highlightClassName?: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function HighlightText({
  text,
  terms = [],
  className,
  style,
  highlightClassName = 'bg-[#C9A84C]/45 text-inherit rounded-[3px] px-0.5',
}: HighlightTextProps) {
  const value = text ?? '';
  const cleanTerms = Array.from(
    new Set((terms || []).map((t) => (t || '').trim()).filter((t) => t.length > 1)),
  );

  if (!value || cleanTerms.length === 0) {
    return <span className={className} style={style}>{value}</span>;
  }

  const lowerTerms = new Set(cleanTerms.map((t) => t.toLowerCase()));
  const pattern = new RegExp(`(${cleanTerms.map(escapeRegExp).join('|')})`, 'gi');
  const parts = value.split(pattern);

  return (
    <span className={className} style={style}>
      {parts.map((part, i) => {
        if (part && lowerTerms.has(part.toLowerCase())) {
          return (
            <mark key={i} className={highlightClassName}>
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}