import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MallEntry } from '@/lib/nairobiMalls';

export interface MallListingPin {
  id: string;
  slug: string;
  lat: number;
  lng: number;
  title: string;
  priceLabel: string;
}

interface MallMapProps {
  malls: MallEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
  listingPins: MallListingPin[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function MallMap({ malls, selectedId, onSelect, listingPins }: MallMapProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mallMarkersRef = useRef<L.Marker[]>([]);
  const listingMarkersRef = useRef<L.Marker[]>([]);
  const fittedRef = useRef(false);

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
      mallMarkersRef.current = [];
      listingMarkersRef.current = [];
      fittedRef.current = false;
    };
  }, []);

  // ── Mall markers (numbered, highlight the selected one) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    mallMarkersRef.current.forEach((m) => m.remove());
    mallMarkersRef.current = [];

    malls.forEach((mall) => {
      const isActive = mall.id === selectedId;
      const size = isActive ? 38 : 30;
      const bg = isActive ? '#c8a24a' : '#0d5959';
      const icon = L.divIcon({
        className: '',
        html:
          '<div style="transform:translate(-50%,-50%);">' +
          `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};color:#ffffff;` +
          'display:flex;align-items:center;justify-content:center;' +
          `font-family:Roboto,sans-serif;font-weight:700;font-size:${isActive ? 15 : 13}px;` +
          'border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;' +
          `${isActive ? 'outline:3px solid rgba(200,162,74,0.35);' : ''}">${mall.rank}</div>`,
        iconSize: [0, 0],
      });

      const marker = L.marker([mall.lat, mall.lng], { icon })
        .addTo(map)
        .bindTooltip(
          `<div style="font-family:Roboto,sans-serif;"><b style="font-size:12px;">${escapeHtml(
            mall.name,
          )}</b><br/><span style="font-size:11px;color:#6b7280;">${escapeHtml(mall.area)}</span></div>`,
          { direction: 'top', offset: [0, -12] },
        );

      marker.on('click', () => onSelect(mall.id));
      mallMarkersRef.current.push(marker);
    });

    // Fit to all malls once so the overview is complete on first paint.
    if (!fittedRef.current && malls.length > 0) {
      const bounds = L.latLngBounds(malls.map((m) => [m.lat, m.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      fittedRef.current = true;
    }
  }, [malls, selectedId, onSelect]);

  // ── Centre on the selected mall ──────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fittedRef.current) return;
    const mall = malls.find((m) => m.id === selectedId);
    if (!mall) return;
    map.flyTo([mall.lat, mall.lng], 14, { duration: 0.6 });
  }, [selectedId, malls]);

  // ── Nearby listing pins for the selected mall ────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    listingMarkersRef.current.forEach((m) => m.remove());
    listingMarkersRef.current = [];

    listingPins.forEach((pin) => {
      const icon = L.divIcon({
        className: '',
        html:
          '<div style="transform:translate(-50%,-100%);position:relative;">' +
          `<div style="background:#ffffff;color:#0d5959;font-family:Roboto,sans-serif;font-size:11px;font-weight:700;` +
          'padding:3px 9px;border-radius:9999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.28);' +
          `border:2px solid #c8a24a;">${escapeHtml(pin.priceLabel)}</div>` +
          '<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;' +
          'border-top:6px solid #c8a24a;margin:0 auto;"></div>' +
          '</div>',
        iconSize: [0, 0],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindTooltip(
          `<div style="font-family:Roboto,sans-serif;"><b style="font-size:12px;color:#1a1a2e;">${escapeHtml(
            pin.title,
          )}</b><br/><span style="font-size:11px;color:#0d5959;font-weight:700;">${escapeHtml(
            pin.priceLabel,
          )}</span><br/><span style="font-size:10px;color:#9ca3af;">Click to view property</span></div>`,
          { direction: 'top', offset: [0, -10] },
        );

      marker.on('click', () => navigate(`/property/${pin.slug}`));
      listingMarkersRef.current.push(marker);
    });
  }, [listingPins, navigate]);

  return <div ref={containerRef} className="w-full h-full min-h-[420px]" />;
}