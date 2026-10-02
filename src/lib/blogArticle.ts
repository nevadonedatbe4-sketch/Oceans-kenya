/**
 * blogArticle - prepares authored article HTML for the editorial template.
 *
 * It does NOT inject decorative images (that produced the meaningless little
 * thumbnails). It only:
 *  - gives every H2/H3 a stable id so the "In this guide" navigation can jump
 *    to it,
 *  - returns the ordered list of those headings,
 *  - marks body images below the first one to lazy-load.
 *
 * The template controls presentation; the authored HTML controls content.
 */

export interface ArticleHeading {
  id: string;
  text: string;
  level: number;
}

export interface BuiltArticle {
  html: string;
  headings: ArticleHeading[];
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

export function buildArticle(rawHtml: string | null | undefined): BuiltArticle {
  const html = rawHtml || '';
  if (!html || typeof window === 'undefined') return { html, headings: [] };

  try {
    const doc = new DOMParser().parseFromString(
      `<div id="__article_root">${html}</div>`,
      'text/html',
    );
    const root = doc.getElementById('__article_root');
    if (!root) return { html, headings: [] };

    const headings: ArticleHeading[] = [];
    const used = new Set<string>();

    root.querySelectorAll('h2, h3').forEach((el) => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      const base = slugifyHeading(text) || 'section';
      let id = base;
      let n = 2;
      while (used.has(id)) {
        id = `${base}-${n}`;
        n += 1;
      }
      used.add(id);
      el.setAttribute('id', id);
      headings.push({ id, text, level: el.tagName === 'H2' ? 2 : 3 });
    });

    // Keep the first body image eager (above the fold), lazy-load the rest.
    root.querySelectorAll('img').forEach((img, index) => {
      if (index === 0) {
        img.setAttribute('loading', 'eager');
      } else {
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
      }
    });

    return { html: root.innerHTML, headings };
  } catch {
    return { html, headings: [] };
  }
}