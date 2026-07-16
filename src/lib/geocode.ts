// Known Nairobi neighbourhood coordinates for fallback when Google API is unavailable
const NAIROBI_COORDS: Record<string, { lat: number; lng: number }> = {
  nairobi: { lat: -1.2921, lng: 36.8219 },
  karen: { lat: -1.3170, lng: 36.6950 },
  runda: { lat: -1.2080, lng: 36.8150 },
  lavington: { lat: -1.2730, lng: 36.7750 },
  kilimani: { lat: -1.2870, lng: 36.7890 },
  westlands: { lat: -1.2675, lng: 36.8042 },
  kileleshwa: { lat: -1.2730, lng: 36.7850 },
  muthaiga: { lat: -1.2520, lng: 36.8330 },
  parklands: { lat: -1.2590, lng: 36.8190 },
  riverside: { lat: -1.2670, lng: 36.8000 },
  gigiri: { lat: -1.2300, lng: 36.8070 },
  'spring valley': { lat: -1.2410, lng: 36.7900 },
  nyari: { lat: -1.2180, lng: 36.8020 },
  langata: { lat: -1.3630, lng: 36.7410 },
  kiserian: { lat: -1.4300, lng: 36.6740 },
  'ongata rongai': { lat: -1.4000, lng: 36.7570 },
  ngong: { lat: -1.3600, lng: 36.6540 },
  kitengela: { lat: -1.4760, lng: 36.9620 },
  'athi river': { lat: -1.4580, lng: 36.9780 },
  'lower kabete': { lat: -1.2380, lng: 36.7750 },
  rosslyn: { lat: -1.2080, lng: 36.8000 },
  naivasha: { lat: -0.7170, lng: 36.4310 },
  tigoni: { lat: -1.1400, lng: 36.6770 },
  nanyuki: { lat: 0.0100, lng: 37.0740 },
};

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  source: 'google' | 'local';
}

// Try Google Geocoding API, fall back to local neighbourhood lookup
export async function geocodeLocation(query: string): Promise<GeocodeResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ...NAIROBI_COORDS.nairobi, formattedAddress: 'Nairobi, Kenya', source: 'local' };
  }

  const apiKey = (import.meta as any).env?.VITE_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Try Google Geocoding API if key is available
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed + ', Nairobi, Kenya')}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK' && data.results?.length > 0) {
        const result = data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          source: 'google',
        };
      }
    } catch {
      // Fall through to local lookup
    }
  }

  // Local fallback — match against known neighbourhoods
  const lower = trimmed.toLowerCase();
  for (const [name, coords] of Object.entries(NAIROBI_COORDS)) {
    if (lower.includes(name)) {
      return { ...coords, formattedAddress: `${name.charAt(0).toUpperCase() + name.slice(1)}, Nairobi, Kenya`, source: 'local' };
    }
  }

  // Default to Nairobi center
  return { ...NAIROBI_COORDS.nairobi, formattedAddress: 'Nairobi, Kenya', source: 'local' };
}