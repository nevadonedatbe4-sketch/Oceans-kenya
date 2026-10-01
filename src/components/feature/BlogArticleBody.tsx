import { useMemo } from 'react';
import { placeImageFor, sectionImageFor } from '@/lib/blogPlaceImages';

interface BlogArticleBodyProps {
  /** Stored rich HTML for the article body. */
  html?: string | null;
  /** Wrapper classes (typography, spacing) applied to the rendered article. */
  className?: string;
}

/**
 * Tailwind classes for the generated thumbnail-list markup. These use arbitrary
 * variants so the styles travel with the component instead of needing global CSS.
 */
const PLACE_LIST_CLASSES = [
  '[&_.blog-place-list]:grid',
  '[&_.blog-place-list]:grid-cols-1',
  '[&_.blog-place-list]:gap-3',
  '[&_.blog-place-list]:my-4',
  '[&_.blog-place-item]:flex',
  '[&_.blog-place-item]:items-start',
  '[&_.blog-place-item]:gap-4',
  '[&_.blog-place-item]:p-3',
  '[&_.blog-place-item]:rounded-lg',
  '[&_.blog-place-item]:bg-stone-50',
  '[&_.blog-place-item]:border',
  '[&_.blog-place-item]:border-primary/10',
  '[&_.blog-place-thumb]:w-20',
  '[&_.blog-place-thumb]:h-20',
  '[&_.blog-place-thumb]:sm:w-24',
  '[&_.blog-place-thumb]:sm:h-24',
  '[&_.blog-place-thumb]:flex-shrink-0',
  '[&_.blog-place-thumb]:overflow-hidden',
  '[&_.blog-place-thumb]:rounded-md',
  '[&_.blog-place-thumb]:bg-stone-100',
  '[&_.blog-place-thumb_img]:w-full',
  '[&_.blog-place-thumb_img]:h-full',
  '[&_.blog-place-thumb_img]:object-cover',
  '[&_.blog-place-thumb_img]:object-center',
  '[&_.blog-place-body]:flex-1',
  '[&_.blog-place-body]:min-w-0',
  '[&_.blog-place-name]:font-roboto',
  '[&_.blog-place-name]:font-bold',
  '[&_.blog-place-name]:text-primary',
  '[&_.blog-place-name]:text-sm',
  '[&_.blog-place-name]:mb-1',
  '[&_.blog-place-desc]:font-roboto',
  '[&_.blog-place-desc]:text-stone-600',
  '[&_.blog-place-desc]:text-xs',
  '[&_.blog-place-desc]:leading-relaxed',
  '[&_.blog-section-head]:flex',
  '[&_.blog-section-head]:items-center',
  '[&_.blog-section-head]:gap-3',
  '[&_.blog-section-head]:mt-8',
  '[&_.blog-section-head]:mb-3',
  '[&_.blog-section-head_h3]:mt-0',
  '[&_.blog-section-head_h3]:mb-0',
  '[&_.blog-section-thumb]:w-12',
  '[&_.blog-section-thumb]:h-12',
  '[&_.blog-section-thumb]:md:w-14',
  '[&_.blog-section-thumb]:md:h-14',
  '[&_.blog-section-thumb]:flex-shrink-0',
  '[&_.blog-section-thumb]:overflow-hidden',
  '[&_.blog-section-thumb]:rounded-md',
  '[&_.blog-section-thumb]:bg-stone-100',
  '[&_.blog-section-thumb_img]:w-full',
  '[&_.blog-section-thumb_img]:h-full',
  '[&_.blog-section-thumb_img]:object-cover',
  '[&_.blog-section-thumb_img]:object-center',
].join(' ');

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Splits a list item into a short label + supporting description. */
function splitItem(text: string): { name: string; desc: string } {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return { name: '', desc: '' };

  const dashParts = clean.split(/\s*[—–]\s*/);
  if (dashParts.length > 1) {
    return {
      name: (dashParts[0] || '').trim(),
      desc: dashParts.slice(1).join(' — ').trim(),
    };
  }

  const colonIndex = clean.indexOf(':');
  if (colonIndex > 0) {
    return {
      name: clean.slice(0, colonIndex).trim(),
      desc: clean.slice(colonIndex + 1).trim(),
    };
  }

  return { name: clean, desc: '' };
}

/**
 * Turns every authored bullet list into a set of thumbnail rows so all guides
 * share the same rich list treatment. Each row shows an image (matched to the
 * item where possible) plus its label and description.
 */
function enhanceHtml(html: string): string {
  if (!html || typeof window === 'undefined') return html;
  if (!html.includes('<ul') && !html.includes('<h3')) return html;

  const doc = new DOMParser().parseFromString(`<div id="__blog_root">${html}</div>`, 'text/html');
  const root = doc.getElementById('__blog_root');
  if (!root) return html;

  root.querySelectorAll('ul').forEach((ul) => {
    const items = Array.from(ul.children).filter((el) => el.tagName === 'LI');
    if (items.length === 0) return;

    const parsed = items
      .map((li) => splitItem(li.textContent || ''))
      .filter((item) => item.name || item.desc);

    if (parsed.length === 0) return;

    const container = doc.createElement('div');
    container.className = 'blog-place-list';

    parsed.forEach((place, index) => {
      const card = doc.createElement('div');
      card.className = 'blog-place-item';

      const img = placeImageFor(place.name);
      if (img) {
        const thumb = doc.createElement('div');
        thumb.className = 'blog-place-thumb';
        const image = doc.createElement('img');
        image.src = img;
        image.alt = place.name || `Item ${index + 1}`;
        thumb.appendChild(image);
        card.appendChild(thumb);
      }

      const body = doc.createElement('div');
      body.className = 'blog-place-body';
      const nameHtml = place.name
        ? `<p class="blog-place-name">${escapeHtml(place.name)}</p>`
        : '';
      const descHtml = place.desc
        ? `<p class="blog-place-desc">${escapeHtml(place.desc)}</p>`
        : '';
      body.innerHTML = `${nameHtml}${descHtml}`;

      card.appendChild(body);
      container.appendChild(card);
    });

    ul.replaceWith(container);
  });

  // Attach a thumbnail to every section heading so articles without bullet
  // lists still show visual thumbnails beside each sub-section.
  root.querySelectorAll('h3').forEach((h3) => {
    const headingText = (h3.textContent || '').trim();
    if (!headingText) return;

    const wrap = doc.createElement('div');
    wrap.className = 'blog-section-head';

    const thumb = doc.createElement('div');
    thumb.className = 'blog-section-thumb';
    const image = doc.createElement('img');
    image.src = sectionImageFor(headingText);
    image.alt = headingText;
    thumb.appendChild(image);

    if (h3.parentNode) {
      h3.parentNode.insertBefore(wrap, h3);
      wrap.appendChild(thumb);
      wrap.appendChild(h3);
    }
  });

  return root.innerHTML;
}

/**
 * Renders an article body. Every bullet list automatically gains list-item
 * thumbnails; all other markup renders untouched.
 */
export default function BlogArticleBody({ html, className = '' }: BlogArticleBodyProps) {
  const safeHtml = useMemo(() => enhanceHtml(html || ''), [html]);

  return (
    <div
      className={`${className} ${PLACE_LIST_CLASSES}`.trim()}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}