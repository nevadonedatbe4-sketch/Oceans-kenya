// Haversine distance in meters between two lat/lng points
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert radius label like "This area only", "¼ mile", "½ mile", "1 mile",
// "3 miles" etc. to meters. "This area only" (the 0-mile default) returns
// null so the caller runs a plain neighbourhood search, never a radius.
export function radiusLabelToMeters(label: string): number | null {
  if (!label || label === 'This area only') return null;
  // Normalise the pretty fraction glyphs to decimals so ¼ / ½ / ¾ all parse.
  const normalised = label
    .replace(/¼/g, '0.25')
    .replace(/½/g, '0.5')
    .replace(/¾/g, '0.75')
    .replace(/^\s*0\s*miles?$/i, '0');
  const match = normalised.match(/^(\d+(?:\.\d+)?)\s*miles?$/i);
  if (!match) return null;
  const miles = parseFloat(match[1]);
  if (!Number.isFinite(miles) || miles <= 0) return null;
  return Math.round(miles * 1609.344);
}

/**
 * Parse a user-typed/selected travel-time label (e.g. "30 minutes") into
 * minutes. Travel time is a SEPARATE filter from radius and must never be
 * interpreted as a distance.
 */
export function travelLabelToMinutes(label: string): number | null {
  if (!label) return null;
  const match = label.match(/^(\d+)\s*(?:min|mins|minute|minutes)$/i);
  if (!match) return null;
  const mins = parseInt(match[1], 10);
  return Number.isFinite(mins) && mins > 0 ? mins : null;
}

// Format a distance in meters to a human-readable string
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}