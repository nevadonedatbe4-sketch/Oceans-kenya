import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPin {
  id: string;
  slug: string;
  lat: number;
  lng: number;
  title: string;
  priceLabel: string;
  commuteLabel: string;
  image?: string;
}

interface CommuteMapProps {
  destination?: { name: string; lat: number; lng: number };
  pins: MapPin[];
  pinColor?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function CommuteMap({ destination, pins, pinColor = '#0d5959' }: CommuteMapProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const destMarkerRef = useRef<L.Marker | null>(null);

  // ── Initialise the map once ──────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      destMarkerRef.current = null;
    };
  }, []);

  // ── Render destination marker + property pins, then fit bounds ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing property pins
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Destination marker (dark, distinct from property pins) - optional
    if (destination) {
      const destIcon = L.divIcon({
        className: '',
        html:
          '<div style="width:22px;height:22px;border-radius:50%;background:#1a1a2e;border:3px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
      } else {
        destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destIcon })
          .addTo(map)
          .bindTooltip(`<b>${escapeHtml(destination.name)}</b>`);
      }
    }

    // Property pins
    pins.forEach((pin) => {
      const pinIcon = L.divIcon({
        className: '',
        html:
          '<div style="transform:translate(-50%,-100%);position:relative;">' +
          `<div style="background:${pinColor};color:#ffffff;font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.35);border:2px solid #ffffff;">${escapeHtml(pin.priceLabel)}</div>` +
          `<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${pinColor};margin:0 auto;"></div>` +
          '</div>',
        iconSize: [0, 0],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon: pinIcon }).addTo(map);

      const tooltipHtml =
        '<div style="width:200px;">' +
        (pin.image
          ? `<img src="${escapeHtml(pin.image)}" alt="" style="width:100%;height:96px;object-fit:cover;object-position:center;border-radius:6px;margin-bottom:6px;background:#f0f0f0;" />`
          : '') +
        `<div style="font-weight:600;font-size:12px;color:#1a1a2e;margin-bottom:2px;line-height:1.3;">${escapeHtml(pin.title)}</div>` +
        `<div style="font-size:12px;color:${pinColor};font-weight:700;">${escapeHtml(pin.priceLabel)}</div>` +
        (pin.commuteLabel
          ? `<div style="font-size:11px;color:#6b7280;margin-top:1px;">${escapeHtml(pin.commuteLabel)}</div>`
          : '') +
        '<div style="font-size:10px;color:#9ca3af;margin-top:3px;">Click to view property</div>' +
        '</div>';

      marker.bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -10] });
      marker.on('click', () => {
        navigate(`/property/${pin.slug}`);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to destination + pins for an Airbnb-style overview
    const points: [number, number][] = [];
    if (destination) points.push([destination.lat, destination.lng]);
    points.push(...pins.map((p) => [p.lat, p.lng] as [number, number]));

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    } else if (points.length === 1) {
      map.setView(points[0], 12);
    } else {
      map.setView([-1.2921, 36.8219], 11);
    }
  }, [destination?.lat, destination?.lng, destination?.name, pins, pinColor, navigate]);

  return <div ref={containerRef} className="w-full h-full min-h-[420px]" />;
}