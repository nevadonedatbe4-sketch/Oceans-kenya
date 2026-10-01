import { useState } from 'react';
import RichTextContent from '@/components/feature/RichTextContent';
import { descriptionToNormalizedPlainText } from '@/lib/richText';

interface LandDescriptionProps {
  /** Raw stored description - rich HTML or legacy plain text. */
  html?: string;
  /** Characters shown before the "Read full description" cut-off. */
  limit?: number;
}

/**
 * Collapsible land description. The collapsed view shows a short plain-text
 * preview (capped at `limit` characters) so a long plot write-up never pushes
 * the Location / enquiry panels far down the page; "Read full description"
 * reveals the complete formatted copy.
 */
export default function LandDescription({ html = '', limit = 200 }: LandDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  const plain = descriptionToNormalizedPlainText(html);
  const isLong = plain.length > limit;
  const preview = isLong ? `${plain.slice(0, limit).trimEnd()}\u2026` : plain;

  if (!plain.trim()) {
    return (
      <p className="text-primary/60 font-roboto text-sm md:text-base leading-relaxed">
        No description available for this plot.
      </p>
    );
  }

  return (
    <div>
      {expanded ? (
        <RichTextContent
          html={html}
          normalizeCase
          className="font-roboto text-primary/80 text-sm md:text-base leading-relaxed [&_strong]:text-primary [&_strong]:font-semibold [&_em]:italic [&_h3]:text-primary [&_a]:text-accent"
        />
      ) : (
        <p className="font-roboto text-primary/80 text-sm md:text-base leading-relaxed whitespace-pre-line">
          {preview}
        </p>
      )}

      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-roboto font-bold uppercase tracking-wider text-accent hover:opacity-70 transition-opacity cursor-pointer whitespace-nowrap"
        >
          {expanded ? 'Show less' : 'Read full description'}
          <span className="w-4 h-4 flex items-center justify-center">
            <i className={`text-sm ${expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
          </span>
        </button>
      )}
    </div>
  );
}