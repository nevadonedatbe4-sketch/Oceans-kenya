import { useMemo } from 'react';
import { buildRenderableHtml, normalizeHtmlCase, RICH_TEXT_TYPOGRAPHY_CLASSES } from '@/lib/richText';

interface RichTextContentProps {
  /** Raw stored description - rich HTML or legacy plain text. */
  html?: string | null;
  /** Extra classes for the wrapper (colour, size, spacing). */
  className?: string;
  /** Shown when there is nothing to render. */
  emptyFallback?: React.ReactNode;
  /**
   * When true, run the shared block-level casing normaliser over the content so
   * a shouty ALL-CAPS headline becomes title case while well-cased prose is
   * left untouched - matching the card snippet treatment site-wide.
   */
  normalizeCase?: boolean;
}

/**
 * Renders a stored description as safe, styled HTML. Rich formatting created in
 * the CRM editor (headings, colours, highlights, lists) is preserved; legacy
 * plain-text records are converted to paragraphs.
 */
export default function RichTextContent({ html, className = '', emptyFallback = null, normalizeCase = false }: RichTextContentProps) {
  const safeHtml = useMemo(() => {
    const built = buildRenderableHtml(html);
    return normalizeCase ? normalizeHtmlCase(built) : built;
  }, [html, normalizeCase]);

  if (!safeHtml) return <>{emptyFallback}</>;

  return (
    <div
      className={`${RICH_TEXT_TYPOGRAPHY_CLASSES} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}