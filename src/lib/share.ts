/**
 * Global sharing - the single source of truth for sharing any property.
 *
 * Every surface that offers a "share" (directory/grid cards on Buy, Rent and
 * Commercial, plus every property detail page) calls this one function instead
 * of rolling its own logic. It prefers the device's native share sheet when
 * available and transparently falls back to copying the public link.
 *
 * The public URL itself is built by {@link propertyPublicUrl} in
 * `shareLinks.ts`, so the link format stays consistent with the CRM Share
 * actions.
 */
import { propertyPublicUrl } from '@/lib/shareLinks';

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface SharePropertyInput {
  /** Property title, used by the native share sheet and fallback copy text. */
  title: string;
  /** Public slug of the listing. */
  slug?: string | null;
  /** Record id, used only when no slug is available. */
  id?: string | null;
  /** Pre-formatted price line, e.g. "KES 45,000,000". */
  priceLabel?: string;
  /** Explicit URL to share - wins over slug/id when provided. */
  url?: string;
  /** Optional sentence appended after the link. */
  text?: string;
}

/** Resolve the public URL a property should be shared with. */
export function buildPropertyShareUrl(input: {
  slug?: string | null;
  id?: string | null;
  url?: string;
}): string {
  if (input.url) return input.url;
  return propertyPublicUrl(input.slug, input.id);
}

/** Build the human-readable share text (native sheet body / copy fallback). */
export function buildPropertyShareText(input: SharePropertyInput, url: string): string {
  const lead = [input.priceLabel, input.title].filter(Boolean).join(' · ');
  const base = lead ? `${lead} — ${url}` : url;
  return input.text ? `${base}\n${input.text}` : base;
}

/**
 * Copy text to the clipboard. Returns true when the write succeeded.
 * Uses the async Clipboard API with a legacy fallback for older browsers.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    if (typeof document !== 'undefined') {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Share a property. One call, used everywhere:
 *   - native share sheet when the device supports it
 *   - clipboard copy of the public link otherwise
 *
 * Returns the {@link ShareOutcome} so callers can show the right feedback
 * ("Link copied!" vs a silent dismissal of the native sheet).
 */
export async function shareProperty(input: SharePropertyInput): Promise<ShareOutcome> {
  const url = buildPropertyShareUrl(input);
  const text = buildPropertyShareText(input, url);

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: input.title, text, url });
      return 'shared';
    } catch (err) {
      // The user closing the native sheet is not an error - just stop.
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
      // Any other failure (e.g. share unsupported for this payload) falls
      // through to the clipboard so the user still gets the link.
    }
  }

  const copied = await copyToClipboard(text);
  return copied ? 'copied' : 'failed';
}