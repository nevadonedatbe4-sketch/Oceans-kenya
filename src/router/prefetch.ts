import { matchPath } from 'react-router-dom';
import { PUBLIC_ROUTE_LOADERS } from './config';

// Route chunks are loaded on demand (see router/config.tsx), which means the
// first navigation to a page pays for its download. Fetching that chunk while
// the pointer is still travelling towards the link usually hides the cost
// entirely, so the Suspense fallback never gets a chance to appear.

type Loader = () => Promise<unknown>;

// Loaders already requested. import() caches the module itself, so this only
// avoids the redundant call; a failed prefetch is removed so a later hover (or
// the real navigation) can retry.
const requested = new Set<Loader>();

/**
 * Warm the chunk for a pathname, if it maps to a known public route.
 * Safe to call repeatedly and never throws — a prefetch failure must not
 * surface to the user, since the real navigation will report it properly.
 */
export function prefetchPath(pathname: string): void {
  for (const [pattern, load] of PUBLIC_ROUTE_LOADERS) {
    if (!matchPath({ path: pattern, end: true }, pathname)) continue;
    if (requested.has(load)) return;
    requested.add(load);
    load().catch(() => {
      requested.delete(load);
    });
    return;
  }
}

// Honour the user's data preferences: never speculatively download on a
// metered connection or a very slow link, where a wasted chunk costs more
// than the latency it would have saved.
function prefetchingIsWelcome(): boolean {
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  return conn.effectiveType !== 'slow-2g' && conn.effectiveType !== '2g';
}

// Strips the router basename so hrefs compare against route patterns, which
// are always basename-relative.
function toRoutePath(url: URL, basename: string): string | null {
  if (url.origin !== window.location.origin) return null;
  let path = url.pathname;
  if (basename && basename !== '/') {
    if (!path.startsWith(basename)) return null;
    path = path.slice(basename.length) || '/';
  }
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Installs a single delegated listener that prefetches a route's chunk when
 * the user hovers or keyboard-focuses a link to it.
 *
 * Delegation is what keeps this cheap: one listener on the document covers
 * every <Link> in the app, so no call site has to opt in and nothing has to
 * change when routes are added.
 *
 * Returns a cleanup function.
 */
export function installRoutePrefetch(basename = '/'): () => void {
  if (!prefetchingIsWelcome()) return () => {};

  const onCandidate = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    // Links that leave the SPA: new tab, downloads, mailto/tel, other origins.
    if (anchor.hasAttribute('download')) return;
    const targetAttr = anchor.getAttribute('target');
    if (targetAttr && targetAttr !== '_self') return;

    let url: URL;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    const path = toRoutePath(url, basename);
    if (path) prefetchPath(path);
  };

  // pointerenter does not bubble, so pointerover is the delegable equivalent.
  // focusin covers keyboard navigation, which pointer events never see.
  document.addEventListener('pointerover', onCandidate, { passive: true });
  document.addEventListener('focusin', onCandidate, { passive: true });

  return () => {
    document.removeEventListener('pointerover', onCandidate);
    document.removeEventListener('focusin', onCandidate);
  };
}
