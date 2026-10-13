import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface AreaMapPickerProps {
  /** Latitude as a string (kept as string so the drawer's text input stays the source of truth). */
  lat: string;
  /** Longitude as a string. */
  lng: string;
  /** Called with new coordinates whenever the user clicks the map or drags the pin. */
  onChange: (lat: string, lng: string) => void;
  heightClass?: string;
}

const NAIROBI: [number, number] = [-1.2921, 36.8219];

function parse(lat: string, lng: string): [number, number] | null {
  const la = Number(lat);
  const ln = Number(lng);
  if (lat === '' || lng === '' || Number.isNaN(la) || Number.isNaN(ln)) return null;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
  return [la, ln];
}

/**
 * Keyless, interactive OpenStreetMap picker for area coordinates.
 * Click anywhere on the map or drag the pin to drop the area centre — no typing required.
 * The drawer's Latitude / Longitude inputs stay in sync for fine-tuning.
 */
export default function AreaMapPicker({ lat, lng, onChange, heightClass = 'h-64' }: AreaMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // ── Initialise the map once ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { scrollWheelZoom: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const start = parse(lat, lng) || NAIROBI;
    map.setView(start, parse(lat, lng) ? 14 : 11);

    const pinIcon = L.divIcon({
      className: '',
      html:
        '<div style="width:18px;height:18px;border-radius:50%;background:#0d5959;border:3px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    // Place the marker if we already have valid coordinates.
    const initial = parse(lat, lng);
    if (initial) {
      markerRef.current = L.marker(initial, { icon: pinIcon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const ll = markerRef.current?.getLatLng();
        if (ll) onChangeRef.current(ll.lat.toFixed(6), ll.lng.toFixed(6));
      });
    }

    // Click to drop / move the pin.
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: la, lng: ln } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([la, ln]);
      } else {
        markerRef.current = L.marker([la, ln], { icon: pinIcon, draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const ll = markerRef.current?.getLatLng();
          if (ll) onChangeRef.current(ll.lat.toFixed(6), ll.lng.toFixed(6));
        });
      }
      onChangeRef.current(la.toFixed(6), ln.toFixed(6));
    });

    mapRef.current = map;
    // The drawer animates in, so the container may start at zero size — re-measure once it settles.
    const t = window.setTimeout(() => map.invalidateSize(), 200);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep the marker in sync with the lat/lng inputs ──────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pos = parse(lat, lng);
    if (!pos) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }
    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
    } else {
      const pinIcon = L.divIcon({
        className: '',
        html:
          '<div style="width:18px;height:18px;border-radius:50%;background:#0d5959;border:3px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      markerRef.current = L.marker(pos, { icon: pinIcon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const ll = markerRef.current?.getLatLng();
        if (ll) onChangeRef.current(ll.lat.toFixed(6), ll.lng.toFixed(6));
      });
    }
  }, [lat, lng]);

  return (
    <div className={`relative rounded-lg overflow-hidden border border-[#f0f0f0] ${heightClass}`}>
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 z-[400] bg-white/95 border border-[#f0f0f0] rounded-md px-2.5 py-1 text-[11px] font-roboto text-[#636363] pointer-events-none">
        Click the map or drag the pin to set the area centre
      </div>
    </div>
  );
}