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

// Convert radius label like "½ mile", "1 mile", "3 miles" etc. to meters
export function radiusLabelToMeters(label: string): number | null {
  if (!label || label === 'This area only') return null;
  if (label === '½ mile') return 805;
  const match = label.match(/^(\d+)\s*miles?$/i);
  if (!match) return null;
  const miles = parseInt(match[1], 10);
  return Math.round(miles * 1609.344);
}

// Format a distance in meters to a human-readable string
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}