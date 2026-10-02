import { useMemo } from 'react';

interface BlogArticleBodyProps {
  /** Stored rich HTML for the article body (already prepared by buildArticle). */
  html?: string | null;
  /** Optional extra classes merged after the built-in editorial styles. */
  className?: string;
}

/**
 * Editorial typography for article bodies.
 *
 * This replaces the old behaviour that silently injected a thumbnail onto every
 * heading and bullet. Now the body renders exactly the authored markup, styled
 * as a comfortable, publication-quality reading column.
 */
const ARTICLE_CLASSES = [
  'font-roboto [&_*]:font-roboto',
  'text-[#333333] text-[15px] md:text-[17px] leading-[1.85]',
  // Headings
  '[&_h2]:font-prata [&_h2]:font-semibold [&_h2]:not-italic [&_h2]:text-primary [&_h2]:text-[24px] md:[&_h2]:text-[30px] [&_h2]:leading-[1.2] [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:scroll-mt-28',
  '[&_h3]:font-prata [&_h3]:font-semibold [&_h3]:text-primary [&_h3]:text-[19px] md:[&_h3]:text-[23px] [&_h3]:leading-snug [&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:scroll-mt-28',
  '[&_h4]:font-jost [&_h4]:font-semibold [&_h4]:uppercase [&_h4]:tracking-[0.08em] [&_h4]:text-[13px] [&_h4]:text-golden [&_h4]:mt-7 [&_h4]:mb-2',
  // Paragraphs
  '[&_p]:mb-5 [&_p]:leading-[1.85]',
  // Lists
  '[&_ul]:mb-5 [&_ul]:pl-5 [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:marker:text-golden',
  '[&_ol]:mb-5 [&_ol]:pl-5 [&_ol]:space-y-2 [&_ol]:list-decimal [&_ol]:marker:text-golden [&_ol]:marker:font-semibold',
  '[&_li]:leading-[1.7] [&_li]:pl-1',
  // Links / emphasis
  '[&_a]:text-primary [&_a]:font-medium [&_a]:underline [&_a]:decoration-primary/30 [&_a]:underline-offset-2 hover:[&_a]:decoration-primary',
  '[&_strong]:font-semibold [&_strong]:text-primary',
  // Quote
  '[&_blockquote]:my-8 [&_blockquote]:border-l-4 [&_blockquote]:border-golden [&_blockquote]:bg-[#F7F9F9] [&_blockquote]:py-4 [&_blockquote]:px-5 [&_blockquote]:font-prata [&_blockquote]:text-[17px] md:[&_blockquote]:text-[20px] [&_blockquote]:italic [&_blockquote]:text-primary [&_blockquote]:leading-snug',
  '[&_blockquote_p]:mb-0 [&_blockquote_p]:font-prata',
  // Media
  '[&_img]:w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-6',
  '[&_figure]:my-8 [&_figure]:rounded-lg [&_figure]:overflow-hidden',
  '[&_figcaption]:font-roboto [&_figcaption]:text-[13px] [&_figcaption]:text-[#777777] [&_figcaption]:italic [&_figcaption]:mt-2 [&_figcaption]:px-1',
  // Tables
  '[&_table]:w-full [&_table]:my-6 [&_table]:text-[14px] [&_table]:border-collapse',
  '[&_th]:text-left [&_th]:p-3 [&_th]:bg-[#F7F9F9] [&_th]:font-jost [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.06em] [&_th]:text-[12px] [&_th]:text-primary [&_th]:border-b-2 [&_th]:border-primary/12 [&_th]:whitespace-nowrap',
  '[&_td]:p-3 [&_td]:border-b [&_td]:border-primary/10 [&_td]:align-top [&_td]:leading-relaxed',
  // Divider
  '[&_hr]:my-10 [&_hr]:border-0 [&_hr]:h-px [&_hr]:bg-primary/12',
].join(' ');

export default function BlogArticleBody({ html, className = '' }: BlogArticleBodyProps) {
  const safeHtml = useMemo(() => html || '', [html]);

  if (!safeHtml.trim()) return null;

  return (
    <div
      className={`${ARTICLE_CLASSES} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}