import DOMPurify from 'dompurify';

// Rich-text fields (blog bodies, listing descriptions) are authored in the CRM
// and stored as raw HTML, then rendered with dangerouslySetInnerHTML. Any code
// path that can write those rows — and, until RLS is enforced, that is anyone
// holding the public anon key — could otherwise store a <script>/onerror
// payload that executes in every visitor's and admin's browser (stored XSS).
//
// This strips scripts, event handlers, and dangerous URLs while keeping the
// formatting tags the editors actually produce. Sanitize at the render sink so
// existing stored content is cleaned too, not only new writes.

// Tags the WYSIWYG output legitimately uses. Anything else is dropped.
const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark', 'small',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'pre', 'code',
  'a', 'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'figure', 'figcaption',
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class'];

/**
 * Sanitize untrusted rich-text HTML for safe rendering.
 *
 * - FORBID_TAGS/ATTR are redundant with the allowlist but make the intent
 *   explicit and survive future allowlist edits.
 * - Any `target="_blank"` link is forced to rel="noopener noreferrer" so a
 *   linked page cannot reach back through window.opener.
 */
export function sanitizeRichText(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
    ALLOW_DATA_ATTR: false,
  });
}

// Force safe rel on any anchor that opens a new tab. DOMPurify hooks run
// during sanitize, so this is registered once at module load.
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}
