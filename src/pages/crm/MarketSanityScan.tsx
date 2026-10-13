import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import usePortalBase from '@/hooks/usePortalBase';
import useMarketSanityScan, { type FlaggedListing } from '@/hooks/useMarketSanityScan';
import { showToast } from '@/pages/crm/components/CRMToast';

type Filter = 'all' | 'usd' | 'junk';

const FREQ_LABELS: Record<string, string> = {
  per_month: 'per month',
  per_year: 'per year',
  per_week: 'per week',
  per_day: 'per day',
  per_quarter: 'per quarter',
  once_off: '',
};

function contextLabel(l: FlaggedListing): string {
  const purpose = l.purpose === 'sale' ? 'For Sale' : l.purpose === 'rent' ? 'For Rent' : (l.purpose || '—');
  const freq = l.frequency ? FREQ_LABELS[l.frequency] ?? l.frequency.replace(/_/g, ' ') : '';
  return freq ? `${purpose} · ${freq}` : purpose;
}

const kes = (n: number) => `KES ${n.toLocaleString('en-US')}`;

export default function MarketSanityScan() {
  const portalBase = usePortalBase();
  const navigate = useNavigate();
  const { items, loading, error, refresh, setCurrencyUsd, markPriceOnRequest } = useMarketSanityScan();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const usdCount = items.filter((i) => !i.junk).length;
  const junkCount = items.filter((i) => i.junk).length;

  const filtered = useMemo(() => {
    if (filter === 'usd') return items.filter((i) => !i.junk);
    if (filter === 'junk') return items.filter((i) => i.junk);
    return items;
  }, [items, filter]);

  const allSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id));

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allSelected) filtered.forEach((i) => next.delete(i.id));
    else filtered.forEach((i) => next.add(i.id));
    return next;
  });

  const runBulk = async (action: 'usd' | 'por') => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBusy(true);
    const res = action === 'usd' ? await setCurrencyUsd(ids) : await markPriceOnRequest(ids);
    setBusy(false);
    setSelected(new Set());
    if (res.ok) showToast(`${res.count} listing${res.count === 1 ? '' : 's'} corrected`, 'success');
    else showToast(res.message || 'Could not update the listings', 'error');
  };

  const fixOne = async (l: FlaggedListing, action: 'usd' | 'por') => {
    setBusy(true);
    const res = action === 'usd' ? await setCurrencyUsd([l.id]) : await markPriceOnRequest([l.id]);
    setBusy(false);
    if (res.ok) showToast(`“${l.title}” corrected`, 'success');
    else showToast(res.message || 'Could not update the listing', 'error');
  };

  const statCards = [
    { label: 'Flagged listings', value: items.length, icon: 'ri-alert-line', tone: 'text-amber-700 bg-amber-100' },
    { label: 'Likely USD', value: usdCount, icon: 'ri-exchange-dollar-line', tone: 'text-[#0f766e] bg-[#0f766e]/10' },
    { label: 'Placeholder junk', value: junkCount, icon: 'ri-error-warning-line', tone: 'text-red-700 bg-red-100' },
  ];

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All flagged', count: items.length },
    { key: 'usd', label: 'Likely USD', count: usdCount },
    { key: 'junk', label: 'Placeholder junk', count: junkCount },
  ];

  return (
    <div className="space-y-5">
      <Link to={`${portalBase}/listings`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#0f766e] cursor-pointer">
        <i className="ri-arrow-left-line" /> All properties
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-semibold text-stone-900 flex items-center gap-2">
            <i className="ri-shield-check-line text-[#0f766e]" /> Market Sanity Scan
          </h1>
          <p className="text-sm text-stone-500 mt-0.5 max-w-2xl">
            Every listing priced below the plausible Kenyan market floor — usually a figure entered in USD but left
            labelled KES, or a junk placeholder. Fix them all in one pass.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-md border border-stone-300 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 cursor-pointer whitespace-nowrap"
        >
          <i className={loading ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'} /> Re-scan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-stone-200 p-4 flex items-center gap-3">
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.tone}`}>
              <i className={`${s.icon} text-lg`} />
            </span>
            <div>
              <div className="text-2xl font-bold text-stone-900">{s.value}</div>
              <div className="text-xs font-medium text-stone-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-lg border border-stone-200 p-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              filter === f.key ? 'bg-[#0f766e] text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 text-xs ${filter === f.key ? 'text-white/80' : 'text-stone-400'}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-stone-900 text-white rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="w-px h-4 bg-white/20" />
          <button
            onClick={() => runBulk('usd')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-stone-900 text-xs font-semibold hover:bg-white/90 disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-exchange-dollar-line" /> Change currency to USD
          </button>
          <button
            onClick={() => runBulk('por')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/30 text-xs font-semibold hover:bg-white/10 disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-eye-off-line" /> Mark as Price on Request
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs font-medium text-white/70 hover:text-white cursor-pointer">
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        {error ? (
          <div className="p-10 text-center">
            <i className="ri-error-warning-line text-3xl text-red-500" />
            <p className="text-sm text-stone-600 mt-2">{error}</p>
            <button onClick={refresh} className="mt-3 px-4 py-2 rounded-md bg-stone-800 text-white text-sm cursor-pointer">Try again</button>
          </div>
        ) : loading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-md bg-stone-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <i className="ri-shield-check-fill text-4xl text-[#0f766e]" />
            <p className="text-sm font-medium text-stone-700 mt-2">
              {items.length === 0 ? 'All clean — no listings priced below the market floor.' : 'Nothing matches this filter.'}
            </p>
            <p className="text-xs text-stone-500 mt-1">Prices look healthy across the inventory. Nice.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-3 w-10">
                    <button
                      onClick={toggleAll}
                      className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${allSelected ? 'bg-[#0f766e] border-[#0f766e] text-white' : 'border-stone-300 text-transparent'}`}
                      aria-label="Select all"
                    >
                      <i className="ri-check-line text-xs" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">Property</th>
                  <th className="px-4 py-3 font-semibold">Context</th>
                  <th className="px-4 py-3 font-semibold">Recorded price</th>
                  <th className="px-4 py-3 font-semibold">Market floor</th>
                  <th className="px-4 py-3 font-semibold">Why it's flagged</th>
                  <th className="px-4 py-3 font-semibold text-right">Fix</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t border-stone-100 hover:bg-stone-50/60 align-top">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggle(l.id)}
                        className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${selected.has(l.id) ? 'bg-[#0f766e] border-[#0f766e] text-white' : 'border-stone-300 text-transparent'}`}
                        aria-label="Select listing"
                      >
                        <i className="ri-check-line text-xs" />
                      </button>
                    </td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <p className="font-semibold text-stone-900 leading-snug break-words">{l.title}</p>
                      {l.location && (
                        <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                          <i className="ri-map-pin-line text-[11px]" /> {l.location}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{contextLabel(l)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-red-600">{kes(l.price)}</span>
                      {l.junk ? (
                        <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700">Placeholder</span>
                      ) : (
                        <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#0f766e]/10 text-[#0f766e]">Likely USD</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{kes(l.floor)}</td>
                    <td className="px-4 py-3 max-w-[320px]">
                      <p className="text-xs text-stone-600 leading-snug">{l.warning}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-1.5">
                        {l.junk ? (
                          <button
                            onClick={() => fixOne(l, 'por')}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0f766e] text-white text-xs font-semibold hover:bg-[#0d5f59] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                          >
                            <i className="ri-eye-off-line" /> Price on Request
                          </button>
                        ) : (
                          <button
                            onClick={() => fixOne(l, 'usd')}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0f766e] text-white text-xs font-semibold hover:bg-[#0d5f59] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                          >
                            <i className="ri-exchange-dollar-line" /> Change to USD
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`${portalBase}/listings/edit/${l.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-[#0f766e] cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-external-link-line" /> Open listing
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-stone-400">
        Floors — rentals: KES 20,000/month, KES 8,000/week, KES 2,000/day, KES 200,000/year · sale: KES 1,000,000.
        Listings marked "Price on Request" are skipped.
      </p>
    </div>
  );
}