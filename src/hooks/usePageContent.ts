import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Generic, cached page-content loader shared by every backend-editable page.
 *
 * Reads rows from `site_settings` under the `page_<namespace>_<field>` key
 * convention (the same convention used by the About / Landlords / Contact /
 * Neighbourhoods / Directory editors) and merges them over the page's code
 * defaults. Arrays and booleans are (de)serialised automatically.
 */

 

const cache = new Map<string, Record<string, unknown>>();
const inflight = new Map<string, Promise<Record<string, unknown>>>();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function loadPageContent<T extends Record<string, unknown>>(
  namespace: string,
  defaults: T,
): Promise<T> {
  const map = clone(defaults) as Record<string, unknown>;
  const listKeys = Object.keys(defaults).filter((k) => Array.isArray((defaults as Record<string, unknown>)[k]));
  const boolKeys = Object.keys(defaults).filter((k) => typeof (defaults as Record<string, unknown>)[k] === 'boolean');
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .ilike('key', `page_${namespace}_%`);
  if (data) {
    (data as { key: string; value: string | null }[]).forEach((r) => {
      if (r.value === null) return;
      const field = r.key.replace(`page_${namespace}_`, '');
      if (!(field in map)) return;
      if (listKeys.includes(field)) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed)) map[field] = parsed;
        } catch { /* keep default */ }
        return;
      }
      if (boolKeys.includes(field)) {
        map[field] = r.value === 'true';
        return;
      }
      map[field] = r.value;
    });
  }
  return map as T;
}

export function usePageContent<T extends Record<string, unknown>>(
  namespace: string,
  defaults: T,
): { content: T; loading: boolean } {
  const [content, setContent] = useState<T>(
    () => (cache.get(namespace) as T) || clone(defaults),
  );
  const [loading, setLoading] = useState(!cache.has(namespace));

  useEffect(() => {
    let active = true;
    if (cache.has(namespace)) {
      setContent(cache.get(namespace) as T);
      setLoading(false);
      return;
    }
    let p = inflight.get(namespace);
    if (!p) {
      p = loadPageContent(namespace, defaults);
      inflight.set(namespace, p);
    }
    p.then((r) => {
      cache.set(namespace, r);
      if (active) {
        setContent(r as T);
        setLoading(false);
      }
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace]);

  return { content, loading };
}

export function invalidatePageContent(namespace?: string) {
  if (namespace) {
    cache.delete(namespace);
    inflight.delete(namespace);
  } else {
    cache.clear();
    inflight.clear();
  }
}