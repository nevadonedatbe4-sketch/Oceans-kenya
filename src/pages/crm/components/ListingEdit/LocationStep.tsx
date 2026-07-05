import { useEffect, useState } from 'react';
import { COLORS, COUNTRIES, fetchNeighborhoods } from './types';

interface Props {
  address: string;
  setAddress: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  neighbourhood: string;
  setNeighbourhood: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  latitude: string;
  setLatitude: (v: string) => void;
  longitude: string;
  setLongitude: (v: string) => void;
  stateRegion: string;
  setStateRegion: (v: string) => void;
  zipCode: string;
  setZipCode: (v: string) => void;
}

export default function LocationStep({
  address, setAddress, location, setLocation, neighbourhood, setNeighbourhood,
  city, setCity, country, setCountry, latitude, setLatitude, longitude, setLongitude,
  stateRegion, setStateRegion, zipCode, setZipCode,
}: Props) {
  const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string }[]>([]);
  const [loadingHoods, setLoadingHoods] = useState(false);
  const [manualPin, setManualPin] = useState(false);

  useEffect(() => {
    setLoadingHoods(true);
    fetchNeighborhoods().then((data) => {
      setNeighborhoods(data);
      setLoadingHoods(false);
    });
  }, []);

  const handleGeolocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(String(pos.coords.latitude));
          setLongitude(String(pos.coords.longitude));
        },
        () => {
          // fallback: use address approximation
        }
      );
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!manualPin) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 180 - 90;
    const y = ((e.clientY - rect.top) / rect.height) * 360 - 180;
    setLatitude(String(x));
    setLongitude(String(y));
  };

  return (
    <div className="space-y-5">
      {/* Address Fields */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-map-pin-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Address</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Set the property address and location</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Property Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="123 Riverside Drive, Westlands" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>State / Region</label>
            <input type="text" value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. Central Region" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="Nairobi" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Area / Neighborhood</label>
            <select
              value={neighbourhood}
              onChange={(e) => setNeighbourhood(e.target.value)}
              disabled={loadingHoods}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer disabled:opacity-60"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <option value="">Select neighborhood</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.name}>{n.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Zip Code</label>
            <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. 256" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Location / Area</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. Karen, Nairobi" />
          </div>
        </div>
      </div>

      {/* Coordinates */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
              <i className="ri-compass-line text-lg" style={{ color: COLORS.navy }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Coordinates</h3>
              <p className="text-xs" style={{ color: COLORS.gray }}>Map position for this property</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGeolocate}
              className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-colors cursor-pointer hover:bg-gray-50"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <i className="ri-map-pin-2-line" /> Auto Geolocate
            </button>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={manualPin}
                onChange={(e) => setManualPin(e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: COLORS.navy }}
              />
              <span className="text-xs font-medium" style={{ color: COLORS.navy }}>Manual Pin</span>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Latitude</label>
            <input type="text" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="0.3136" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Longitude</label>
            <input type="text" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="32.5811" />
          </div>
        </div>
      </div>

      {/* Map Preview */}
      {(latitude && longitude) ? (
        <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Map Preview</h3>
            {manualPin && <span className="text-xs font-medium" style={{ color: COLORS.navy }}>Click map to place pin</span>}
          </div>
          <div
            className="w-full h-64 rounded-lg overflow-hidden border relative cursor-pointer"
            style={{ borderColor: COLORS.border }}
            onClick={handleMapClick}
          >
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0, pointerEvents: manualPin ? 'none' : 'auto' }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${latitude},${longitude}`}
            />
            {manualPin && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-8 h-8 flex items-center justify-center bg-red-500 rounded-full shadow-lg">
                  <i className="ri-map-pin-fill text-white" />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-5 text-center" style={{ borderColor: COLORS.border }}>
          <i className="ri-map-2-line text-3xl mb-2" style={{ color: COLORS.border }} />
          <p className="text-sm font-medium" style={{ color: COLORS.gray }}>Enter coordinates to preview the map</p>
        </div>
      )}
    </div>
  );
}