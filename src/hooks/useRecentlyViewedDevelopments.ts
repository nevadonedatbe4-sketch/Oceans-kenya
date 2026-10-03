import { useCallback, useEffect, useState } from 'react';

/**
 * Recently-viewed developments - stored locally so a visitor can jump back to
 * the projects they were just exploring. Development pages record themselves
 * here; the rail (on the index + project pages) reads them back.
 */

export interface RecentlyViewedDevelopment {
  slug: string;
  name: string;
  image: string;
  location: string;
  priceRaw: number;
  currency: string;
  timestamp: number;
}

const STORAGE_KEY = 'recently_viewed_developments';
const MAX_ITEMS = 8;
/** Same-tab signal so a freshly recorded project shows up in an open rail. */
const UPDATE_EVENT = 'recently-viewed-developments-updated';

/** Normalise a project name so different casings of the same project collapse. */
function normalizeName(value: string): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function readRecentlyViewedDevelopments(): RecentlyViewedDevelopment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentlyViewedDevelopment =>
        !!e && typeof e === 'object' && typeof (e as RecentlyViewedDevelopment).slug === 'string',
    );
  } catch {
    return [];
  }
}

/** Record a development visit (most-recent first, de-duplicated). */
export function recordRecentlyViewedDevelopment(
  entry: Omit<RecentlyViewedDevelopment, 'timestamp'>,
): void {
  try {
    if (!entry.slug) return;
    const existing = readRecentlyViewedDevelopments();
    const entryName = normalizeName(entry.name || '');
    const next: RecentlyViewedDevelopment[] = [
      { ...entry, timestamp: Date.now() },
      ...existing.filter(
        (e) => e.slug !== entry.slug && (!entryName || normalizeName(e.name || '') !== entryName),
      ),
    ].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(UPDATE_EVENT));
  } catch {
    // Storage full / unavailable - the rail simply stays empty.
  }
}

export function useRecentlyViewedDevelopments(excludeSlug?: string) {
  const [items, setItems] = useState<RecentlyViewedDevelopment[]>([]);

  useEffect(() => {
    const load = () => setItems(readRecentlyViewedDevelopments());
    load();
    window.addEventListener('storage', load);
    window.addEventListener(UPDATE_EVENT, load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener(UPDATE_EVENT, load);
    };
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setItems([]);
  }, []);

  const filtered = excludeSlug ? items.filter((i) => i.slug !== excludeSlug) : items;
  return { items: filtered, clear };
}