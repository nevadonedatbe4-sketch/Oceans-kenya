import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { applyPublicVisibility } from '@/lib/publicListings';
import { areaCentreFor } from '@/lib/areaCentres';
import { computeRadiusBands, type DiagListing } from '@/lib/radiusBands';
import type { AdminArea } from '@/hooks/useAreaGeoAdmin';

interface Props {
  areas: AdminArea[];
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'studio_flat', label: 'Studio' },
  { value: 'land', label: 'Land' },
  { value: 'office', label: 'Office' },
  { value: 'retail_shop', label: 'Retail' },
];

export default function RadiusDiagnosticsPanel({ areas }: Props) {
  const [anchorId, setAnchorId] = useState('');
  const [txn, setTxn] = useState<'all' | 'sale' | 'rent'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listings, setListings] = useState<DiagListing[]>([]);
  const [missingCoords, setMissingCoords] = useState(0);

  // Default the anchor to the first area once the list arrives.
  useEffect(() => {
    if (!anchorId && areas.length > 0) setAnchorId(areas[0].id);
  }, [areas, anchorId]);

  const anchorArea = useMemo(() => areas.find((a) => a.id === anchorId) || null, [areas, anchorId]);

  const run = useCallback(async () => {
    if (!anchorArea) return;
    setLoading(true);
    setError('');
    try {
      let query = applyPublicVisibility(
        supabase
          .from('all_listings')
          .select('id, neighbourhood, location, city, latitude, longitude, property_type, purpose'),
        'active',
      );
      if (txn !== 'all') query = query.eq('purpose', txn);
      if (typeFilter !== 'all') query = query.eq('property_type', typeFilter);

      const { data, error: dbError } = await query;
      if (dbError) throw dbError;

      const rows = (data || []) as Array<Record<string, unknown>>;
      let missing = 0;
      const mapped: DiagListing[] = rows.map((r) => {
        const areaText = String(r.neighbourhood || r.location || r.city || '');
        let lat = r.latitude != null ? Number(r.latitude) : null;
        let lng = r.longitude != null ? Number(r.longitude) : null;
        if (lat == null || lng == null) {
          const hub = areaCentreFor(r.neighbourhood as string | null, r.location as string | null, r.city as string | null);
          if (hub) { lat = hub.lat; lng = hub.lng; } else { missing += 1; }
        }
        return { id: String(r.id), area: areaText, lat, lng };
      });
      setListings(mapped);
      setMissingCoords(missing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings');
      setListings([]);
    }
    setLoading(false);
  }, [anchorArea, txn, typeFilter]);

  const result = useMemo(() => {
    if (!anchorArea) return null;
    const anchor = anchorArea.latitude != null && anchorArea.longitude != null
      ? { lat: anchorArea.latitude, lng: anchorArea.longitude }
      : areaCentreFor(anchorArea.name);
    if (!anchor) return null;
    return computeRadiusBands(listings, anchorArea.name, anchor);
  }, [anchorArea, listings]);

  // Area breakdown for the widest radius - where do the results actually live?
  const breakdown = useMemo(() => {
    if (!result) return [];
    const within = result.resolved.filter((r) => r.inAnchorArea || (r.distanceMeters != null && r.distanceMeters <= 10 * 1609.344));
    const map = new Map<string, { area: string; count: number; isAnchor: boolean }>();
    within.forEach((r) => {
      const key = r.area || 'Unknown';
      const entry = map.get(key) || { area: key, count: 0, isAnchor: r.inAnchorArea };
      entry.count += 1;
      map.set(key, entry);
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [result]);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-[#f0f0f0] p-5 space-y-4">
        <div>
          <h3 className="text-base font-jost font-semibold text-[#001731]">Radius Search Diagnostics</h3>
          <p className="text-xs font-roboto text-[#636363] mt-1">
            Proves the cumulative behaviour: the anchor area&apos;s eligible results are always retained, and each
            larger radius only ADDS qualifying nearby listings. Runs against real listings.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className="block">
            <span className="block text-xs font-roboto text-[#636363] mb-1">Anchor area</span>
            <select value={anchorId} onChange={(e) => setAnchorId(e.target.value)} className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto bg-white focus:outline-none focus:border-[#0d5959]">
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-roboto text-[#636363] mb-1">Transaction</span>
            <select value={txn} onChange={(e) => setTxn(e.target.value as 'all' | 'sale' | 'rent')} className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto bg-white focus:outline-none focus:border-[#0d5959]">
              <option value="all">All</option>
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-roboto text-[#636363] mb-1">Property type</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-roboto bg-white focus:outline-none focus:border-[#0d5959]">
              {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button onClick={run} disabled={loading || !anchorArea} className="w-full inline-flex items-center justify-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-4 py-2.5 rounded-lg text-sm font-roboto cursor-pointer disabled:opacity-50">
              <i className={loading ? 'ri-loader-4-line animate-spin' : 'ri-play-line'} />
              {loading ? 'Running...' : 'Run test'}
            </button>
          </div>
        </div>
        {anchorArea && anchorArea.latitude == null && (
          <p className="text-xs font-roboto text-amber-600 flex items-center gap-1.5">
            <i className="ri-alert-line" /> This area has no coordinates set - add a centre above so distance can be calculated.
          </p>
        )}
        {error && <p className="text-xs font-roboto text-red-500">{error}</p>}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-xs font-roboto text-[#636363]">Area-only baseline</p>
              <p className="text-2xl font-jost font-semibold text-[#0d5959]">{result.originalArea}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-xs font-roboto text-[#636363]">At 10 miles</p>
              <p className="text-2xl font-jost font-semibold text-[#001731]">{result.bands[result.bands.length - 1]?.total ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-xs font-roboto text-[#636363]">Eligible listings scanned</p>
              <p className="text-2xl font-jost font-semibold text-[#001731]">{listings.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-xs font-roboto text-[#636363]">Missing coordinates</p>
              <p className="text-2xl font-jost font-semibold text-amber-600">{missingCoords}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-roboto">
                <thead className="bg-[#f8fafc] text-[#636363] text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Search radius</th>
                    <th className="text-right px-4 py-3">Original-area results</th>
                    <th className="text-right px-4 py-3">New nearby results</th>
                    <th className="text-right px-4 py-3">Total unique</th>
                    <th className="text-left px-4 py-3">Expected behaviour</th>
                  </tr>
                </thead>
                <tbody>
                  {result.bands.map((band, i) => {
                    const prev = i > 0 ? result.bands[i - 1].total : null;
                    const retained = prev == null || band.total >= prev;
                    return (
                      <tr key={band.label} className="border-t border-[#f0f0f0]">
                        <td className="px-4 py-3 text-[#001731] font-medium">{band.label}</td>
                        <td className="px-4 py-3 text-right text-[#0d5959]">{band.originalArea}</td>
                        <td className="px-4 py-3 text-right">{band.nearbyAdded > 0 ? `+${band.nearbyAdded}` : '0'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#001731]">{band.total}</td>
                        <td className="px-4 py-3">
                          {retained ? (
                            <span className="text-xs text-emerald-600 inline-flex items-center gap-1"><i className="ri-checkbox-circle-line" /> Retains &amp; expands</span>
                          ) : (
                            <span className="text-xs text-red-500 inline-flex items-center gap-1"><i className="ri-error-warning-line" /> Lost results</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#f0f0f0] p-5">
            <h4 className="text-sm font-roboto font-bold text-[#001731] uppercase tracking-wide mb-3">Where results come from (within 10 miles)</h4>
            {breakdown.length === 0 ? (
              <p className="text-xs font-roboto text-[#9a9a9a]">No results - run a test with different filters.</p>
            ) : (
              <div className="space-y-2">
                {breakdown.map((b) => (
                  <div key={b.area} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 text-xs font-roboto text-[#001731] truncate flex items-center gap-1.5">
                      {b.isAnchor && <span className="w-1.5 h-1.5 rounded-full bg-[#0d5959]" />}
                      {b.area}
                    </span>
                    <div className="flex-1 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#0d5959]" style={{ width: `${Math.min(100, (b.count / (breakdown[0]?.count || 1)) * 100)}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs font-roboto text-[#636363]">{b.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}