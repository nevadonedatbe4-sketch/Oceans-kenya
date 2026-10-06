import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

let cache: Record<string, string> = {};
let lastFetch = 0;
const CACHE_TTL = 60000;

function fetchSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now - lastFetch < CACHE_TTL && Object.keys(cache).length > 0) {
    return Promise.resolve(cache);
  }

  // Wrap the Postgrest thenable so the function returns a real Promise.
  return Promise.resolve(
    supabase.from('property_cards_style').select('key, value')
  )
    .then(({ data }) => {
      cache = {};
      if (data) {
        data.forEach((row: any) => {
          cache[row.key] = row.value || '';
        });
      }
      lastFetch = Date.now();
      return cache;
    });
}

export function refreshBadgeSettings() {
  lastFetch = 0;
  cache = {};
}

export function useBadgeSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(cache);

  useEffect(() => {
    fetchSettings().then((map) => {
      setSettings(map);
    });
  }, []);

  const isEnabled = (badgeKey: string) => {
    return settings[`badge_${badgeKey}_enabled`] !== 'false';
  };

  return { isEnabled, settings };
}