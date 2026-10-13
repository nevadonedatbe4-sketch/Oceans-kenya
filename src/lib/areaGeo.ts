/**
 * areaGeo - loads the admin-managed area geo data (area centres + verified
 * primary landmarks) from the database and registers it as the single,
 * site-wide coordinate source of truth for radius search.
 *
 * The static hubs in `areaCentres.ts` remain as sensible fallbacks, but once
 * this loader runs, every page (Buy, Rent, All Properties, SEO landing pages,
 * maps) resolves distances against the SAME live coordinates an administrator
 * edits in the "Neighbourhoods & Geo-Mapping" admin section. No page keeps its
 * own copy, so an edit is picked up everywhere without any per-page change.
 */

import { supabase } from './supabase';
import { registerAreaCentres } from './areaCentres';

export interface AreaCentreEntry {
  name: string;
  lat: number | null;
  lng: number | null;
  aliases: string[] | null;
}

let primePromise: Promise<void> | null = null;

/**
 * Fetch the live area geo data and register it. Safe to call many times - the
 * work runs once per session unless refreshAreaCentres() is called.
 */
export function primeAreaCentres(): Promise<void> {
  if (!primePromise) {
    primePromise = (async () => {
      try {
        const [areasRes, landmarksRes] = await Promise.all([
          supabase
            .from('neighbourhoods')
            .select('id, name, latitude, longitude, aliases, is_active')
            .eq('is_published', true),
          supabase
            .from('area_landmarks')
            .select('neighbourhood_id, latitude, longitude, is_primary')
            .eq('is_primary', true),
        ]);

        const areas = (areasRes.data || []) as Array<{
          id: string;
          name: string;
          latitude: number | null;
          longitude: number | null;
          aliases: string[] | null;
          is_active: boolean | null;
        }>;

        // A verified PRIMARY landmark overrides the area's own centre - it is the
        // designated, most precise anchor the administrator has chosen.
        const primaryByArea = new Map<string, { lat: number; lng: number }>();
        ((landmarksRes.data || []) as Array<{
          neighbourhood_id: string | null;
          latitude: number | null;
          longitude: number | null;
          is_primary: boolean | null;
        }>).forEach((l) => {
          if (l.neighbourhood_id && l.latitude != null && l.longitude != null && !primaryByArea.has(l.neighbourhood_id)) {
            primaryByArea.set(l.neighbourhood_id, { lat: Number(l.latitude), lng: Number(l.longitude) });
          }
        });

        const entries: AreaCentreEntry[] = areas
          .filter((a) => a.is_active !== false)
          .map((a) => {
            const primary = primaryByArea.get(a.id);
            const lat = primary ? primary.lat : (a.latitude != null ? Number(a.latitude) : null);
            const lng = primary ? primary.lng : (a.longitude != null ? Number(a.longitude) : null);
            return { name: a.name, lat, lng, aliases: a.aliases };
          });

        registerAreaCentres(entries);
      } catch {
        // Network/RLS issue - keep the static fallbacks so search still works.
      }
    })();
  }
  return primePromise;
}

/** Force a reload after an admin edits area coordinates/landmarks. */
export function refreshAreaCentres(): Promise<void> {
  primePromise = null;
  return primeAreaCentres();
}