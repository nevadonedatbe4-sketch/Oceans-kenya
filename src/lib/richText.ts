/**
 * Shared rich-text helpers for the CRM description editors and the public
 * property / development pages.
 *
 * The editors format text with document.execCommand, which emits inline
 * `style` attributes and a small set of tags. We need to (a) render that same
 * HTML back on the public site so headings, colours and highlights survive,
 * and (b) do it safely. This module provides a strict allow-list sanitizer so
 * only safe markup ever reaches `dangerouslySetInnerHTML`.
 */

import { smartTitleCase } from '@/lib/location';

/* ── Toolbar option sets (shared by the editor + toolbar) ── */

export const FONT_FAMILIES = [
  'DM Sans',
  'Roboto',
  'Jost',
  'Space Grotesk',
  'Prata',
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Trebuchet MS',
  'Courier New',
];

export const FONT_SIZES = [
  { label: '11', value: '11pt' },
  { label: '12', value: '12pt' },
  { label: '14', value: '14pt' },
  { label: '16', value: '16pt' },
  { label: '18', value: '18pt' },
  { label: '20', value: '20pt' },
  { label: '22', value: '22pt' },
  { label: '24', value: '24pt' },
  { label: '26', value: '26pt' },
  { label: '28', value: '28pt' },
  { label: '36', value: '36pt' },
  { label: '48', value: '48pt' },
  { label: '72', value: '72pt' },
];

export type TextStyle = {
  key: string;
  label: string;
  tag: string;
  fontSize: string;
  fontWeight: string;
  color: string;
  marginTop: string;
  marginBottom: string;
  italic?: boolean;
};

export const TEXT_STYLES: TextStyle[] = [
  { key: 'normal', label: 'Normal text', tag: 'p', fontSize: '16px', fontWeight: '400', color: '#0d1f2d', marginTop: '0px', marginBottom: '10px' },
  { key: 'title', label: 'Title', tag: 'h1', fontSize: '30px', fontWeight: '700', color: '#0d1f2d', marginTop: '0px', marginBottom: '8px' },
  { key: 'subtitle', label: 'Subtitle', tag: 'h2', fontSize: '20px', fontWeight: '400', color: '#5f6368', marginTop: '0px', marginBottom: '10px', italic: true },
  { key: 'heading1', label: 'Heading 1', tag: 'h3', fontSize: '24px', fontWeight: '700', color: '#0d1f2d', marginTop: '4px', marginBottom: '8px' },
  { key: 'heading2', label: 'Heading 2', tag: 'h4', fontSize: '20px', fontWeight: '600', color: '#0d1f2d', marginTop: '4px', marginBottom: '8px' },
  { key: 'heading3', label: 'Heading 3', tag: 'h5', fontSize: '17px', fontWeight: '600', color: '#0d1f2d', marginTop: '4px', marginBottom: '6px' },
];

export const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff', '#0d1f2d', '#0d5959',
  '#1a7a7a', '#2e7d32', '#558b2f', '#f9a825', '#ef6c00', '#c62828', '#8d6e63', '#ad1457',
];

export const HIGHLIGHT_COLORS = [
  '#fff2cc', '#fce8b2', '#f4cccc', '#d9ead3', '#d0e8e8', '#e6b8af', '#ead1dc', '#eeeeee',
];

export const BULLET_STYLES = [
  { label: 'Disc', value: 'disc', icon: 'ri-checkbox-blank-circle-fill' },
  { label: 'Circle', value: 'circle', icon: 'ri-checkbox-blank-circle-line' },
  { label: 'Square', value: 'square', icon: 'ri-checkbox-blank-fill' },
];

export const NUMBER_STYLES = [
  { label: '1. 2. 3.', value: 'decimal' },
  { label: 'a. b. c.', value: 'lower-alpha' },
  { label: 'A. B. C.', value: 'upper-alpha' },
  { label: 'i. ii. iii.', value: 'lower-roman' },
  { label: 'I. II. III.', value: 'upper-roman' },
];

export const LINE_SPACINGS = [
  { label: 'Single', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: 'Double', value: '2' },
];

export const TEXT_CASES: { key: string; label: string }[] = [
  { key: 'lower', label: 'lowercase' },
  { key: 'upper', label: 'UPPERCASE' },
  { key: 'title', label: 'Capitalise Each Word' },
  { key: 'sentence', label: 'Sentence case' },
  { key: 'toggle', label: 'tOGGLE cASE' },
];

/**
 * Sentence case: lowercase everything, then capitalise the first letter of every
 * sentence. A sentence boundary is `.`, `!` or `?` followed by whitespace or the
 * end of the string - so decimals like `3.5` and IDs are left untouched.
 * Returns the transformed text plus whether the NEXT character should be
 * capitalised, so callers can carry the state across multiple text nodes.
 */
export function capitalizeSentences(
  input: string,
  startCapitalized = true,
): { text: string; nextCapitalized: boolean } {
  if (!input) return { text: input, nextCapitalized: startCapitalized };
  const lowered = input.toLowerCase();
  let out = '';
  let cap = startCapitalized;
  for (let i = 0; i < lowered.length; i += 1) {
    const ch = lowered[i];
    if (cap && /[a-z]/.test(ch)) {
      out += ch.toUpperCase();
      cap = false;
      continue;
    }
    out += ch;
    if (ch === '.' || ch === '!' || ch === '?') {
      const next = lowered[i + 1];
      if (next === undefined || /\s/.test(next)) cap = true;
    }
  }
  return { text: out, nextCapitalized: cap };
}

/** Transform the case of a plain-text string (Docs-style text case). */
export function transformCase(text: string, key: string): string {
  if (!text) return text;
  switch (key) {
    case 'lower':
      return text.toLowerCase();
    case 'upper':
      return text.toUpperCase();
    case 'title':
      return text.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
    case 'sentence':
      return capitalizeSentences(text, true).text;
    case 'toggle':
      return text
        .split('')
        .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
        .join('');
    default:
      return text;
  }
}

/**
 * Transform a single character typed by the user according to the active
 * persistent case mode. `preceding` is the text already present before the
 * caret inside the current block, used for sentence / word / toggle logic.
 */
export function applyCaseToChar(char: string, preceding: string, key: string): string {
  if (!char) return char;
  const isLetter = /[a-zA-Z]/.test(char);
  switch (key) {
    case 'lower':
      return char.toLowerCase();
    case 'upper':
      return char.toUpperCase();
    case 'sentence': {
      const trimmed = preceding.replace(/[\s\u200B]+$/, '');
      const atSentenceStart = trimmed.length === 0 || /[.!?]$/.test(trimmed);
      return atSentenceStart ? char.toUpperCase() : char.toLowerCase();
    }
    case 'title': {
      const atWordStart = preceding.length === 0 || /\s$/.test(preceding);
      return atWordStart ? char.toUpperCase() : char.toLowerCase();
    }
    case 'toggle': {
      if (!isLetter) return char;
      const letters = preceding.match(/[a-zA-Z]/g);
      const last = letters ? letters[letters.length - 1] : '';
      const nextUpper = !last || last === last.toLowerCase();
      return nextUpper ? char.toUpperCase() : char.toLowerCase();
    }
    default:
      return char;
  }
}

/* ── DOM-aware case transform ──
 * Applies a case transform to the selected TEXT NODES only, so links, inline
 * formatting (bold/italic/colour) and paragraph / list structure survive. */

const CASE_BLOCK_TAGS = new Set([
  'P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BLOCKQUOTE', 'PRE', 'TD', 'TH', 'SECTION', 'ARTICLE',
]);

function caseBlockAncestor(node: Node): Node | null {
  let el: Node | null = node.parentNode;
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    if (CASE_BLOCK_TAGS.has((el as HTMLElement).tagName)) return el;
    el = el.parentNode;
  }
  return null;
}

/**
 * Rewrite the case of every text node the range touches, in place.
 * Case changes never alter string length, so the range stays valid afterwards.
 * Returns false when there was nothing selected to transform.
 */
export function transformRangeCase(range: Range, key: string): boolean {
  const root = range.commonAncestorContainer;
  const container = root.nodeType === Node.TEXT_NODE ? root.parentNode : root;
  if (!container) return false;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let cur = walker.nextNode();
  while (cur) {
    if (range.intersectsNode(cur)) nodes.push(cur as Text);
    cur = walker.nextNode();
  }
  if (nodes.length === 0) return false;

  const startNode = range.startContainer;
  const endNode = range.endContainer;
  let cap = true;
  let lastBlock: Node | null = null;

  nodes.forEach((node) => {
    const full = node.nodeValue ?? '';
    const from = node === startNode ? range.startOffset : 0;
    const to = node === endNode ? range.endOffset : full.length;
    if (!full || to <= from) return;

    const before = full.slice(0, from);
    const target = full.slice(from, to);
    const after = full.slice(to);

    if (key === 'sentence') {
      const block = caseBlockAncestor(node);
      if (block !== lastBlock) cap = true;
      lastBlock = block;
      const res = capitalizeSentences(target, cap);
      cap = res.nextCapitalized;
      node.nodeValue = before + res.text + after;
    } else {
      node.nodeValue = before + transformCase(target, key) + after;
    }
  });

  return true;
}

/* ── Typography fallback classes ──
 * Inline styles from the editor win, but these keep legacy / plain
 * descriptions looking tidy when there is little formatting to begin with. */
export const RICH_TEXT_TYPOGRAPHY_CLASSES = [
  'break-words',
  /* Normal text - mirrors the editor's "Normal text" style 1:1:
     16px / 400 / #0d1f2d with a 10px bottom margin. */
  '[&_p]:text-[16px] [&_p]:font-normal [&_p]:text-[#0d1f2d] [&_p]:leading-[1.65] [&_p]:mb-[10px] [&_p:last-child]:mb-0',
  /* Headings mirror the editor's TEXT_STYLES exactly (font, size, weight,
     colour and spacing). They stay in the humanist Arial voice so they never
     inherit the global serif heading face. An inline font-family set in the
     editor still wins over these. */
  /* On small screens the fixed editor sizes (up to 30px) are too large and
     make titles dominate / overflow the column, so they step down below md.
     `!` keeps these mobile overrides winning even when a heading carries an
     inline font-size from the editor. Desktop (md+) is untouched. */
  '[&_h1]:font-copy [&_h1]:text-[30px] [&_h1]:font-bold [&_h1]:text-[#0d1f2d] [&_h1]:leading-[1.2] [&_h1]:mt-0 [&_h1]:mb-[8px] max-md:[&_h1]:!text-[18px] max-md:[&_h1]:leading-[1.3]',
  '[&_h2]:font-copy [&_h2]:text-[20px] [&_h2]:font-normal [&_h2]:italic [&_h2]:text-[#5f6368] [&_h2]:leading-[1.35] [&_h2]:mt-0 [&_h2]:mb-[10px] max-md:[&_h2]:!text-[17px]',
  '[&_h3]:font-copy [&_h3]:text-[24px] [&_h3]:font-bold [&_h3]:text-[#0d1f2d] [&_h3]:leading-[1.25] [&_h3]:mt-[4px] [&_h3]:mb-[8px] max-md:[&_h3]:!text-[18px] max-md:[&_h3]:leading-[1.3]',
  '[&_h4]:font-copy [&_h4]:text-[20px] [&_h4]:font-semibold [&_h4]:text-[#0d1f2d] [&_h4]:leading-[1.3] [&_h4]:mt-[4px] [&_h4]:mb-[8px] max-md:[&_h4]:!text-[17px]',
  '[&_h5]:font-copy [&_h5]:text-[17px] [&_h5]:font-semibold [&_h5]:text-[#0d1f2d] [&_h5]:leading-[1.35] [&_h5]:mt-[4px] [&_h5]:mb-[6px] max-md:[&_h5]:!text-[16px]',
  '[&_h6]:font-copy [&_h6]:text-[16px] [&_h6]:font-semibold [&_h6]:text-[#0d1f2d] [&_h6]:leading-[1.4] [&_h6]:mt-[4px] [&_h6]:mb-[6px] max-md:[&_h6]:!text-[15px]',
  '[&_b]:font-bold [&_strong]:font-bold',
  '[&_em]:italic',
  '[&_u]:underline',
  '[&_s]:line-through',
  '[&_ul]:list-disc [&_ul]:pl-8 [&_ul]:mb-3 [&_ul]:space-y-1',
  '[&_ol]:list-decimal [&_ol]:pl-8 [&_ol]:mb-3 [&_ol]:space-y-1',
  '[&_li]:leading-relaxed [&_li]:py-0.5 [&_li]:pl-2',
  '[&_a]:underline [&_a]:break-all',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-current/30 [&_blockquote]:pl-3 [&_blockquote]:italic',
  '[&_br]:leading-relaxed',
  '[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-2',
  '[&_a[title]]:cursor-help',
].join(' ');

/* ── Sanitizer config ── */

const ALLOWED_TAGS = new Set([
  'P', 'DIV', 'BR', 'SPAN',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI',
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'INS', 'SUB', 'SUP',
  'A', 'BLOCKQUOTE', 'HR', 'FONT', 'IMG',
]);

const DANGEROUS_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'VIDEO', 'AUDIO', 'CANVAS']);

const ALLOWED_STYLE_PROPS = new Set([
  'color', 'background-color', 'font-size', 'font-family', 'font-weight', 'font-style',
  'text-align', 'text-decoration', 'text-decoration-line', 'text-decoration-color',
  'text-decoration-style', 'vertical-align', 'line-height', 'list-style-type',
  'margin-top', 'margin-bottom', 'margin-left', 'padding-left',
  'border', 'border-bottom', 'border-radius', 'max-width', 'width', 'height', 'display',
]);

/**
 * Minimum body font size (in px) enforced site-wide. Any rich-text inline
 * font-size below this is clamped up, so a legacy or manually-sized description
 * can never render smaller than the global site body copy.
 */
const MIN_FONT_PX = 14;

/** Clamp a CSS font-size so body text never renders below the global minimum. */
function clampFontSize(value: string): string {
  const match = value.trim().match(/^([\d.]+)\s*(px|pt)$/i);
  if (!match) return value;
  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const px = unit === 'pt' ? num * 1.3333 : num;
  if (!Number.isFinite(px) || px >= MIN_FONT_PX) return value;
  return `${MIN_FONT_PX}px`;
}

function cleanStyle(style: string): string {
  const out: string[] = [];
  style.split(';').forEach((part) => {
    const idx = part.indexOf(':');
    if (idx === -1) return;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop) || !val) return;
    // Block anything that could fetch or execute
    if (/url\s*\(|expression|javascript:|@import/i.test(val)) return;
    // Keep every detail page on the global site's minimum body size.
    const finalVal = prop === 'font-size' ? clampFontSize(val) : val;
    out.push(`${prop}: ${finalVal}`);
  });
  return out.join('; ');
}

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent || '');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();

  if (DANGEROUS_TAGS.has(tag)) return null;

  // Depth-first: sanitize children first so unwrapping keeps clean content.
  const children = Array.from(el.childNodes)
    .map((child) => sanitizeNode(child, doc))
    .filter((child): child is Node => child !== null);

  // Non-allowed (but non-dangerous) tags are unwrapped - keep their content.
  if (!ALLOWED_TAGS.has(tag)) {
    const frag = doc.createDocumentFragment();
    children.forEach((child) => frag.appendChild(child));
    return frag;
  }

  const clean = doc.createElement(tag);

  Array.from(el.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name === 'style') {
      const cleaned = cleanStyle(attr.value);
      if (cleaned) clean.setAttribute('style', cleaned);
    } else if (name === 'href' && tag === 'A') {
      const value = attr.value.trim();
      if (/^(https?:|mailto:|tel:|\/|#)/i.test(value)) clean.setAttribute('href', value);
    } else if (name === 'align') {
      clean.setAttribute('align', attr.value);
    } else if (name === 'title') {
      // Inline note / comment annotation.
      clean.setAttribute('title', attr.value);
    } else if (tag === 'IMG' && (name === 'src' || name === 'alt' || name === 'width' || name === 'height')) {
      if (name === 'src') {
        const value = attr.value.trim();
        if (/^(https?:\/\/|\/)/i.test(value)) clean.setAttribute('src', value);
      } else {
        clean.setAttribute(name, attr.value);
      }
    } else if (tag === 'FONT' && (name === 'color' || name === 'face' || name === 'size')) {
      clean.setAttribute(name, attr.value);
    }
  });

  if (tag === 'A') {
    clean.setAttribute('rel', 'noopener noreferrer');
    clean.setAttribute('target', '_blank');
  }

  children.forEach((child) => clean.appendChild(child));
  return clean;
}

/** Strip everything except a safe allow-list of tags/styles/attributes. */
export function sanitizeRichHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const container = doc.createElement('div');
  Array.from(doc.body.childNodes).forEach((node) => {
    const clean = sanitizeNode(node, doc);
    if (clean) container.appendChild(clean);
  });
  return container.innerHTML;
}

/** True when a stored value contains real markup rather than plain text. */
export function looksLikeHtml(value: string): boolean {
  return !!value && /<[a-z][\s\S]*>/i.test(value);
}

/** Flatten rich HTML to readable plain text (for snippets, counts, meta). */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

/* ── Block-level casing normalisation ──
 * Runs the shared casing normaliser (smartTitleCase) over the description
 * container-by-container, so a shouty ALL-CAPS heading is tidied while normal,
 * well-cased prose is left untouched. Inline formatting (bold / links / colour)
 * and the underlying document structure survive, because only the case of the
 * existing characters is rewritten - never the markup. */

const NORMALIZE_BLOCK_TAGS = [
  'P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BLOCKQUOTE', 'TD', 'TH', 'SECTION', 'ARTICLE',
];
const NORMALIZE_BLOCK_SELECTOR = NORMALIZE_BLOCK_TAGS.join(',');

/** Apply the case transform to every text node inside one block, in place. */
function normalizeBlockCase(el: Element): void {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  if (nodes.length === 0) return;

  const source = nodes.map((node) => node.nodeValue || '').join('');
  if (!source.trim()) return;

  // Preserve surrounding whitespace so text nodes stay aligned (case changes
  // never alter string length, which keeps this mapping exact).
  const leading = (source.match(/^\s*/)?.[0].length) || 0;
  const trailing = (source.match(/\s*$/)?.[0].length) || 0;
  const core = source.slice(leading, source.length - trailing);
  const transformedCore = smartTitleCase(core);
  if (transformedCore === core || transformedCore.length !== core.length) return;

  const transformed = source.slice(0, leading) + transformedCore + source.slice(source.length - trailing);

  let index = 0;
  nodes.forEach((node) => {
    const value = node.nodeValue || '';
    node.nodeValue = transformed.slice(index, index + value.length);
    index += value.length;
  });
}

/** Normalise case across every leaf block (blocks with no nested block). */
function normalizeDocBlockCase(root: Element): void {
  root.querySelectorAll(NORMALIZE_BLOCK_SELECTOR).forEach((block) => {
    // Skip wrapper blocks so their paragraphs/lists are treated individually.
    if (block.querySelector(NORMALIZE_BLOCK_SELECTOR)) return;
    normalizeBlockCase(block);
  });
}

/**
 * Normalise the casing of renderable rich HTML, block by block, preserving all
 * markup. Safe to call on already-clean content (idempotent).
 */
export function normalizeHtmlCase(html: string): string {
  if (!html) return html;
  const doc = new DOMParser().parseFromString(`<div id="__case_root">${html}</div>`, 'text/html');
  const root = doc.getElementById('__case_root');
  if (!root) return html;
  normalizeDocBlockCase(root);
  return root.innerHTML;
}

/**
 * Build a normalised, single-line plain-text version of a stored description -
 * used for the collapsed preview so it matches the tidied full description.
 */
export function descriptionToNormalizedPlainText(value?: string | null): string {
  const built = buildRenderableHtml(value);
  if (!built) return '';
  const doc = new DOMParser().parseFromString(`<div id="__case_root">${built}</div>`, 'text/html');
  const root = doc.getElementById('__case_root');
  if (root) normalizeDocBlockCase(root);
  return (root?.textContent || '').replace(/\s+/g, ' ').trim();
}

/** Convert a plain-text description (legacy records) into safe paragraph HTML. */
export function plainTextToHtml(text: string): string {
  if (!text) return '';
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Normalise any stored description into safe, renderable HTML - handling both
 * new rich HTML and legacy plain-text records.
 */
export function buildRenderableHtml(value?: string | null): string {
  if (!value) return '';
  const normalised = value.replace(/\r\n/g, '\n').trim();
  if (!normalised) return '';
  if (looksLikeHtml(normalised)) return sanitizeRichHtml(normalised);
  return plainTextToHtml(normalised);
}