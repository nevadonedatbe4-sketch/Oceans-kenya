import { useEffect, useState } from 'react';
import { geocodeLocation } from '@/lib/geocode';

interface LandMapPickerProps {
  latitude: string;
  longitude: string;
  onCoords: (lat: string, lng: string) => void;
  mapPrecision: string;
  onMapPrecision: (v: string) => void;
  showExact: boolean;
  onShowExact: (v: boolean) => void;
}

const PRECISION_OPTIONS = [
  { value: 'exact', label: 'Exact Location' },
  { value: 'approximate', label: 'Approximate Location' },
];

/**
 * Interactive map pin for Land listings.
 * Agents search a place and the exact/approximate coords are captured automatically —
 * they never type latitude/longitude. Uses a keyless Google Maps embed for preview.
 */
export default function LandMapPicker({
  latitude, longitude, onCoords, mapPrecision, onMapPrecision, showExact, onShowExact,
}: LandMapPickerProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialise the query from existing coords once (reverse-ish via coordinates only).
  const [recent, setRecent] = useState<{ lat: string; lng: string }[]>([]);
  useEffect(() => { setRecent([]); }, []);

  const hasPin = latitude !== '' && longitude !== '';

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await geocodeLocation(query);
      onCoords(String(res.lat), String(res.lng));
      setQuery(res.formattedAddress);
    } catch {
      setError('Could not locate that place. Try a nearby landmark, road or area name.');
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    onCoords('', '');
    setQuery('');
    setError(null);
  };

  const previewSrc = hasPin
    ? `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`
    : 'https://maps.google.com/maps?q=-1.2921,36.8219&z=11&output=embed';

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9ca3af]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Search place, road, area or landmark..."
            className="w-full pl-9 pr-4 py-2.5 border border-[#e5e7eb] rounded-lg text-sm text-[#001731] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-roboto bg-[#0d5959] hover:bg-[#0d5959]/90 text-white transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {searching ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <i className="ri-map-pin-line" />}
          Set pin
        </button>
      </div>

      {/* Map preview */}
      <div className="relative rounded-lg overflow-hidden border border-[#e5e7eb] h-64 bg-[#f7f8fa]">
        <iframe
          title="Land location map"
          src={previewSrc}
          className="w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {hasPin && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/95 border border-[#e5e7eb] text-[11px] font-bold text-[#636363] hover:text-[#dc2626] hover:border-[#dc2626]/30 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-close-line" /> Clear pin
          </button>
        )}
      </div>

      {/* Coordinates (read only) */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-roboto text-[#636363]">
        <span>Lat <b className="text-[#001731]">{latitude || '—'}</b></span>
        <span>Lng <b className="text-[#001731]">{longitude || '—'}</b></span>
      </div>

      {error && <p className="text-xs text-red-500 flex items-center gap-1"><i className="ri-error-warning-line" />{error}</p>}

      {/* Precision + visibility */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[#001731] font-roboto text-sm font-medium mb-1.5">Pin precision</label>
          <select
            value={mapPrecision}
            onChange={(e) => onMapPrecision(e.target.value)}
            className="w-full border border-[#e5e7eb] px-3.5 py-2.5 text-sm font-roboto text-[#001731] focus:outline-none focus:border-[#0d5959] rounded-lg bg-white cursor-pointer"
          >
            {PRECISION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showExact}
              onChange={(e) => onShowExact(e.target.checked)}
              className="w-4 h-4 rounded border-[#c0c8d0] text-[#0d5959] focus:ring-[#0d5959]"
            />
            <span className="text-sm font-roboto text-[#001731]">Show exact location publicly</span>
          </label>
        </div>
      </div>
    </div>
  );
}