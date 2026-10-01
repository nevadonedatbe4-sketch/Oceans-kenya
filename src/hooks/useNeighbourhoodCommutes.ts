import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Nairobi CBD - the default destination for neighbourhood commute times.
const CBD = { lat: -1.286389, lng: 36.817223 };

// Average city driving speed (km/h) used to estimate drive time from
// straight-line distance when real routing is unavailable.
const ESTIMATE_SPEED_KMH = 28;

export interface NeighbourhoodCommute {
  minutes: number | null;
  km: number | null;
  available: boolean;
}

function estimateMinutes(km: number | null): number | null {
  if (km == null) return null;
  return Math.max(1, Math.round((km / ESTIMATE_SPEED_KMH) * 60));
}

/**
 * Fetches drive times from every published neighbourhood to Nairobi CBD.
 *
 * Uses the free, key-free OSRM routing API (via the `commute-search` edge
 * function) for real road-based times, falling back to a straight-line
 * estimate. Returns a map keyed by neighbourhood slug.
 */
export function useNeighbourhoodCommutes(): Record<string, NeighbourhoodCommute> {
  const [commutes, setCommutes] = useState<Record<string, NeighbourhoodCommute>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase
          .from('neighbourhoods')
          .select('slug, latitude, longitude')
          .eq('is_published', true);

        if (error || !data) return;

        const withCoords = data.filter(
          (n) => n.latitude != null && n.longitude != null
        );

        if (withCoords.length === 0) return;

        const res = await fetch(
          `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/commute-search`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destinationLat: CBD.lat,
              destinationLng: CBD.lng,
              transportMode: 'Driving',
              listings: withCoords.map((n) => ({
                id: n.slug,
                lat: n.latitude,
                lng: n.longitude,
              })),
            }),
          }
        );

        if (!res.ok) return;

        const payload = await res.json();
        const map: Record<string, NeighbourhoodCommute> = {};

        (payload.results || []).forEach(
          (r: {
            id: string;
            distance_km: number | null;
            commute_time_min: number | null;
            commute_available: boolean;
          }) => {
            map[r.id] = {
              minutes: r.commute_time_min ?? estimateMinutes(r.distance_km),
              km: r.distance_km,
              available: r.commute_available,
            };
          }
        );

        if (!cancelled) setCommutes(map);
      } catch {
        // Silently keep the empty map - the UI shows a neutral placeholder.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return commutes;
}