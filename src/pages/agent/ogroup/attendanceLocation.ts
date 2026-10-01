// ─────────────────────────────────────────────────────────────────────────
// Attendance location resolution — ONE reliable service.
//
// Punch-in location follows a single pipeline so that ACCEPTING the browser
// location permission actually results in a usable location:
//
//   1. device geolocation  → high-accuracy attempt, then a coarse/cached
//                            fallback (a slow or stuck GPS must NOT dead-end
//                            the punch-in flow)
//   2. reverse geocode     → Google (if key) → Nominatim → nearest known area
//                            → raw coordinates
//   3. manual search       → Nominatim + built-in area list (coords required)
//
// Every coordinate the service returns is validated: out-of-range values and
// the classic `0,0` "no fix" placeholder are rejected, never stored.
// ─────────────────────────────────────────────────────────────────────────

import { allAreas } from '@/lib/locationRegistry';

export type LocationSource =
  | 'browser_geolocation'
  | 'google_geocoding'
  | 'nominatim'
  | 'area_registry'
  | 'manual'
  | 'unavailable';

export interface PunchLocation {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  label: string;
  source: LocationSource;
}

export interface Coords {
  lat: number;
  lng: number;
  accuracy: number | null;
}

export type GeoErrorCode =
  | 'unsupported'
  | 'insecure_context'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'invalid_coords'
  | 'unknown';

export interface GeoFailure {
  code: GeoErrorCode;
  message: string;
}

export type GeoPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface DetectionResult {
  /** `lat`/`lng` are non-null only on success. */
  location: PunchLocation;
  /** Set when detection failed — carries the real, actionable reason. */
  error: GeoFailure | null;
  /** Browser permission state at the time of the attempt. */
  permission: GeoPermission;
}

const GOOGLE_KEY = (import.meta as { env?: Record<string, string> }).env?.VITE_PUBLIC_GOOGLE_MAPS_API_KEY;

/** Development diagnostics — the exact geolocation failure is never swallowed. */
function logGeo(context: string, detail: unknown) {
  try {
    console.warn(`[attendance-location] ${context}`, detail);
  } catch {
    /* logging must never throw */
  }
}

/** Human-readable source label for the UI. */
export function sourceLabel(source: LocationSource): string {
  switch (source) {
    case 'browser_geolocation': return 'Device location';
    case 'google_geocoding': return 'Google';
    case 'nominatim': return 'OpenStreetMap';
    case 'area_registry': return 'Saved area';
    case 'manual': return 'Manual';
    default: return 'Unavailable';
  }
}

/** A coordinate is usable only when it is finite, in range, and not the 0,0 placeholder. */
export function isValidCoords(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false; // classic "no fix" placeholder
  return true;
}

// ── Permission ────────────────────────────────────────────────────────────
/** Query the live permission state without prompting. */
export async function queryGeolocationPermission(): Promise<GeoPermission> {
  try {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unsupported';
    const perms = (navigator as unknown as {
      permissions?: { query?: (d: { name: string }) => Promise<{ state: string }> };
    }).permissions;
    if (!perms?.query) return 'prompt'; // cannot introspect → assume not yet granted
    const status = await perms.query({ name: 'geolocation' });
    if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') {
      return status.state;
    }
    return 'prompt';
  } catch (e) {
    logGeo('permission query failed', e);
    return 'prompt';
  }
}

/** True only when the browser reports the geolocation permission is ALREADY granted. */
export async function hasGeolocationPermission(): Promise<boolean> {
  return (await queryGeolocationPermission()) === 'granted';
}

// ── Device position ───────────────────────────────────────────────────────
function mapGeoError(err: { code?: number; message?: string } | undefined): GeoFailure {
  const code = err?.code;
  const raw = err?.message || '';
  if (code === 1) return { code: 'denied', message: raw || 'Location permission was denied.' };
  if (code === 2) return { code: 'unavailable', message: raw || 'Your location could not be determined.' };
  if (code === 3) return { code: 'timeout', message: raw || 'Getting your location timed out.' };
  return { code: 'unknown', message: raw || 'Unknown location error.' };
}

interface OnceResult {
  coords: Coords | null;
  error: GeoFailure | null;
}

/** Local shape for the geolocation request options (avoids lib-type coupling). */
interface GeoOptions {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}

/** One `getCurrentPosition` attempt. Never throws, never hangs. */
function getOnce(opts: GeoOptions): Promise<OnceResult> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ coords: null, error: { code: 'unsupported', message: 'This browser does not support location.' } });
      return;
    }
    let settled = false;
    const done = (r: OnceResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };
    const watchdogMs = (opts.timeout ?? 15000) + 2500;
    const watchdog = setTimeout(
      () => done({ coords: null, error: { code: 'timeout', message: 'Getting your location took too long.' } }),
      watchdogMs,
    );
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(watchdog);
          const c: Coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
          };
          if (!isValidCoords(c.lat, c.lng)) {
            logGeo('device returned unusable coords', c);
            done({ coords: null, error: { code: 'invalid_coords', message: 'The device returned an unusable location fix.' } });
          } else {
            done({ coords: c, error: null });
          }
        },
        (err) => {
          clearTimeout(watchdog);
          logGeo('getCurrentPosition error', { code: err?.code, message: err?.message });
          done({ coords: null, error: mapGeoError(err) });
        },
        opts,
      );
    } catch (e) {
      clearTimeout(watchdog);
      logGeo('getCurrentPosition threw', e);
      done({ coords: null, error: { code: 'unknown', message: e instanceof Error ? e.message : 'Unknown location error.' } });
    }
  });
}

export interface DevicePositionResult {
  coords: Coords | null;
  error: GeoFailure | null;
  permission: GeoPermission;
}

/**
 * Resolve the device position robustly:
 *   - high-accuracy attempt first, then a coarse / network / cached fallback,
 *     so a slow GPS on a desktop or indoors does not dead-end the punch-in;
 *   - a denied / unsupported permission fails fast (retrying cannot help);
 *   - never throws, never hangs.
 */
export async function getDevicePosition(opts?: { quick?: boolean }): Promise<DevicePositionResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { coords: null, error: { code: 'unsupported', message: 'This browser does not support location.' }, permission: 'unsupported' };
  }
  const insecure = typeof window !== 'undefined' && window.isSecureContext === false;
  const permission = await queryGeolocationPermission();

  if (opts?.quick === true) {
    const quick = await getOnce({ enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
    return { coords: quick.coords, error: quick.error, permission };
  }

  // Attempt 1 — accurate.
  const first = await getOnce({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  if (first.coords) return { coords: first.coords, error: null, permission };

  // Fail fast: a denied or unsupported permission will not improve by retrying.
  if (first.error?.code === 'denied' || first.error?.code === 'unsupported') {
    const error: GeoFailure = insecure && first.error.code === 'denied'
      ? { code: 'insecure_context', message: 'Location needs a secure (https) connection.' }
      : first.error;
    return { coords: null, error, permission: error.code === 'unsupported' ? 'unsupported' : 'denied' };
  }

  // Attempt 2 — coarse / network / cached. This is the fix for "I allowed the
  // permission but a high-accuracy fix never arrived in time".
  const second = await getOnce({ enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  if (second.coords) return { coords: second.coords, error: null, permission };

  const error = second.error ?? first.error ?? { code: 'unavailable', message: 'Your location could not be determined.' };
  return { coords: null, error, permission };
}

/** Thin wrapper used by punch-out: best-effort coords, never a prompt. */
export async function getBrowserPosition(timeoutMs = 9000): Promise<Coords | null> {
  const r = await getOnce({ enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300000 });
  return r.coords;
}

// ── Reverse geocoding ─────────────────────────────────────────────────────
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Nearest known area within a sane radius, else null (never a far-away guess). */
function nearestAreaLabel(lat: number, lng: number): string | null {
  let best: { label: string; dist: number } | null = null;
  for (const area of allAreas()) {
    if (area.latitude == null || area.longitude == null) continue;
    const dist = haversineKm(lat, lng, area.latitude, area.longitude);
    if (!best || dist < best.dist) best = { label: `${area.name}, ${area.city}, ${area.country}`, dist };
  }
  if (best && best.dist <= 60) return best.label;
  return null;
}

async function googleReverse(lat: number, lng: number): Promise<string | null> {
  if (!GOOGLE_KEY) return null;
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status === 'OK' && data.results?.[0]?.formatted_address) {
      return String(data.results[0].formatted_address);
    }
  } catch { /* fall through */ }
  return null;
}

async function nominatimReverse(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data?.address || {};
    const locality = a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.hamlet;
    const city = a.city || a.town || a.county || a.state;
    const country = a.country;
    const label = [locality, city && city !== locality ? city : null, country]
      .filter(Boolean)
      .join(', ');
    if (label) return label;
    if (typeof data?.display_name === 'string' && data.display_name) return String(data.display_name);
  } catch { /* fall through */ }
  return null;
}

/** Turn coordinates into a readable label: Google → Nominatim → known area → raw coords. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const google = await googleReverse(lat, lng);
  if (google) return google;
  const osm = await nominatimReverse(lat, lng);
  if (osm) return osm;
  const near = nearestAreaLabel(lat, lng);
  if (near) return near;
  // Last resort: a real, non-fabricated coordinate string.
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

// ── High-level detection (used by the punch-in UI + hook) ─────────────────
/**
 * Full detection attempt. Returns usable coordinates when the device gives
 * any; otherwise a location with `source: 'unavailable'` PLUS the real failure
 * reason so the UI can explain exactly what happened. Never throws.
 */
export async function detectPunchLocation(): Promise<DetectionResult> {
  const { coords, error, permission } = await getDevicePosition();
  if (!coords) {
    return {
      location: { lat: null, lng: null, accuracy: null, label: '', source: 'unavailable' },
      error: error ?? { code: 'unavailable', message: 'Your location could not be determined.' },
      permission,
    };
  }
  const label = await reverseGeocode(coords.lat, coords.lng);
  return {
    location: { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy, label, source: 'browser_geolocation' },
    error: null,
    permission,
  };
}

// ── Manual search / selection ─────────────────────────────────────────────
function dedupe(items: PunchLocation[]): PunchLocation[] {
  const seen = new Set<string>();
  const out: PunchLocation[] = [];
  for (const item of items) {
    const key = item.label.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Search for a location by free text. Merges the built-in area registry with a
 * keyless Nominatim search. Only results that carry VALID coordinates are
 * returned, so a selectable suggestion can never produce a coordinate-less
 * punch. Returns [] on total failure.
 */
export async function searchLocations(query: string): Promise<PunchLocation[]> {
  const q = query.trim();
  if (!q) return [];
  const lower = q.toLowerCase();

  const registry: PunchLocation[] = allAreas()
    .filter((a) => a.name.toLowerCase().includes(lower) || a.city.toLowerCase().includes(lower))
    .slice(0, 5)
    .map((a) => ({
      lat: a.latitude ?? null,
      lng: a.longitude ?? null,
      accuracy: null,
      label: `${a.name}, ${a.city}, ${a.country}`,
      source: 'area_registry' as const,
    }))
    .filter((r) => isValidCoords(r.lat, r.lng));

  let osm: PunchLocation[] = [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`,
      { headers: { Accept: 'application/json' } },
    );
    if (res.ok) {
      const data = await res.json();
      osm = (data || []).map((d: { lat: string; lon: string; display_name?: string; name?: string }) => ({
        lat: Number.parseFloat(d.lat),
        lng: Number.parseFloat(d.lon),
        accuracy: null,
        label: (d.display_name || d.name || q).toString(),
        source: 'nominatim' as const,
      }));
    }
  } catch { /* registry-only results are fine */ }

  return dedupe([...registry, ...osm])
    .filter((r) => isValidCoords(r.lat, r.lng))
    .slice(0, 8);
}

/**
 * Resolve a free-typed place name into a coordinate-backed location. Returns
 * null when no real coordinates could be found (callers must then ask the user
 * to pick a suggestion rather than punch without a location).
 */
export async function resolveTypedLocation(query: string): Promise<PunchLocation | null> {
  const results = await searchLocations(query);
  return results.find((r) => isValidCoords(r.lat, r.lng)) ?? null;
}