import { smartTitleCase } from '@/lib/location';

function decodeEntities(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * cleanListingDescription - strips the embedded title heading and any
 * "Location:" line that many listings store inside their description HTML,
 * leaving just the body copy for a clean card snippet.
 *
 * @param options.normalizeCase - when true, each block is run through the
 * shared casing normaliser (smartTitleCase). The normaliser only transforms
 * shouty ALL-CAPS / all-lowercase blocks, so a mixed description is tidied
 * block-by-block (a CAPS headline becomes title case) while already well-cased
 * prose is left completely untouched.
 */
export function cleanListingDescription(
  html?: string | null,
  options?: { normalizeCase?: boolean },
): string {
  if (!html) return '';

  const normalizeCase = options?.normalizeCase === true;

  const blocks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .split('\n');

  const out: string[] = [];
  let isFirstBlock = true;

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    const text = decodeEntities(block);
    if (!text) continue;

    // Detect a standalone <strong> heading (the embedded title)
    const strongOnly = /^(<p[^>]*>)?<strong>.*<\/strong>$/i.test(block);

    // Skip a leading embedded title heading (first <strong>-only block)
    if (isFirstBlock && strongOnly) {
      isFirstBlock = false;
      continue;
    }
    isFirstBlock = false;

    // Skip "Location:" lines
    if (/^Location\s*:/i.test(text)) continue;

    out.push(normalizeCase ? smartTitleCase(text) : text);
  }

  return out.join(' ');
}