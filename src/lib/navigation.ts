import { useLocation } from 'react-router-dom';
import { categoryLabel } from './amenities';

/**
 * Safe, internal-only return-route handling.
 *
 * Directory pages must never trap a user at Home. When someone clicks into a
 * detail page we stash the page they came from in a `?from=` query parameter so
 * the detail page can offer a real, labelled way back - "← Back to Westlands
 * Schools" rather than a bare "Back". Only same-site paths are ever trusted;
 * arbitrary external URLs are rejected and fall back to a canonical parent.
 *
 * Breadcrumbs stay separate: they always describe the site hierarchy, never the
 * user's browsing history.
 */

export const RETURN_QUERY_KEY = 'from';

/**
 * Is `value` a safe, internal, same-site path we are allowed to return to?
 * Rejects absolute URLs, protocol-relative paths, schemes (javascript:, data:),
 * backslashes and whitespace.
 */
export function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  const raw = value.trim();
  if (!raw.startsWith('/')) return false;
  if (raw.startsWith('//')) return false;
  if (raw.includes('\\')) return false;
  if (/\s/.test(raw)) return false;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(raw)) return false;
  return true;
}

/** Read & validate the `from` parameter from a location search string. */
export function readReturnFrom(search: string): string | null {
  if (!search) return null;
  const value = new URLSearchParams(search).get(RETURN_QUERY_KEY);
  return isSafeInternalPath(value) ? value : null;
}

/**
 * Append `?from=<origin>` to an internal link target so the destination can
 * offer a context-aware return. Ignores unsafe origins and preserves any hash.
 */
export function withReturnFrom(target: string, from: string | null | undefined): string {
  if (!isSafeInternalPath(from)) return target;
  const [pathAndQuery, hash] = target.split('#');
  const sep = pathAndQuery.includes('?') ? '&' : '?';
  const suffix = hash ? `#${hash}` : '';
  return `${pathAndQuery}${sep}${RETURN_QUERY_KEY}=${encodeURIComponent(from as string)}${suffix}`;
}

/** The current location as a single `pathname + search` string. */
export function useCurrentPath(): string {
  const { pathname, search } = useLocation();
  return `${pathname}${search}`;
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Human-readable destination name for a return path (used for "Back to X"). */
export function sectionLabelFor(to: string): string {
  const [rawPath, rawQuery = ''] = to.split('?');
  const path = rawPath.replace(/\/+$/, '') || '/';
  const area = new URLSearchParams(rawQuery).get('area');

  if (path === '/') return 'Home';
  if (path === '/night-life') return 'Night Life';
  if (path === '/directory') return 'Directory';
  if (path === '/neighbourhoods') return 'Neighbourhoods';
  if (path.startsWith('/neighbourhood/')) return humanizeSlug(path.split('/')[2] || 'Neighbourhood');
  if (path.startsWith('/directory/place/')) return 'Place';
  if (path.startsWith('/directory/')) {
    const slug = path.split('/')[2] || '';
    return categoryLabel(slug) || humanizeSlug(slug) || 'Directory';
  }
  if (path === '/all-properties') return 'Properties';
  if (path === '/rent') return 'Rent';
  if (path === '/buy') return 'Buy';
  if (path === '/new-developments') return 'New Projects';
  if (path === '/joint-ventures') return 'Joint Ventures';
  if (path.startsWith('/joint-ventures/project/')) return 'Joint Ventures';
  if (path.startsWith('/property/')) return 'Property';
  if (path === '/living-in-nairobi') return 'Living in Nairobi';
  return humanizeSlug(path.split('/').filter(Boolean).slice(-1)[0] || 'Directory');
}

export interface ReturnRoute {
  /** Internal path to navigate back to. */
  to: string;
  /** Plain destination label, e.g. "Westlands Schools". */
  label: string;
}

/** Resolve the return route: prefer the valid `from`, else the canonical parent. */
export function resolveReturnRoute(from: string | null, fallback: ReturnRoute): ReturnRoute {
  if (from && isSafeInternalPath(from)) {
    return { to: from, label: sectionLabelFor(from) };
  }
  return fallback;
}

/** Hook form of {@link resolveReturnRoute} reading `from` from the current URL. */
export function useReturnRoute(fallback: ReturnRoute): ReturnRoute {
  const { search } = useLocation();
  return resolveReturnRoute(readReturnFrom(search), fallback);
}

/**
 * The single Back control rendered inside the breadcrumb bar.
 * - `history: true`  → go back through the browser's own history (the true
 *                      "previous page"), used when we did not record an origin.
 * - `history: false` → navigate to `to` (a safe, labelled internal route).
 */
export interface BackControl {
  to: string;
  label: string;
  history: boolean;
}

/**
 * Resolve the context-aware Back control, in order of preference:
 *   1. the page the visitor actually came from (safe `?from=` origin),
 *   2. real in-app browser history - the literal previous page,
 *   3. the canonical hierarchy parent.
 * Falls back to `null` (no control) only when none of the above exist.
 * External URLs are never trusted.
 */
export function useBackControl(parent: ReturnRoute | null, enabled = true): BackControl | null {
  const { search } = useLocation();
  if (!enabled) return null;

  const from = readReturnFrom(search);
  if (from) return { to: from, label: sectionLabelFor(from), history: false };

  // React Router keeps a monotonically increasing `idx` on the history state;
  // a value above zero means there is a genuine in-app page to return to.
  const state = typeof window !== 'undefined' ? (window.history.state as { idx?: number } | null) : null;
  if (state && typeof state.idx === 'number' && state.idx > 0) {
    return { to: '', label: '', history: true };
  }

  if (parent && isSafeInternalPath(parent.to)) {
    return { to: parent.to, label: parent.label, history: false };
  }
  return null;
}