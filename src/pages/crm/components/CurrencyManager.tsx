import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, RefreshCw } from 'lucide-react';

interface CurrencyRow {
  id: string;
  code: string;
  label: string;
  symbol: string;
  rate: number;
  enabled: boolean;
  rate_mode: string;
  display_order: number;
  last_updated: string;
}

export default function CurrencyManager() {
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCurrencies = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('currency_settings')
      .select('*')
      .order('display_order', { ascending: true });
    setCurrencies(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const toggleEnabled = (code: string) => {
    setCurrencies((prev) =>
      prev.map((c) => (c.code === code ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const updateRate = (code: string, rate: string) => {
    setCurrencies((prev) =>
      prev.map((c) => (c.code === code ? { ...c, rate: parseFloat(rate) || 0 } : c))
    );
  };

  const toggleRateMode = (code: string) => {
    setCurrencies((prev) =>
      prev.map((c) =>
        c.code === code
          ? { ...c, rate_mode: c.rate_mode === 'auto' ? 'manual' : 'auto' }
          : c
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const c of currencies) {
        await supabase
          .from('currency_settings')
          .update({
            enabled: c.enabled,
            rate: c.rate,
            rate_mode: c.rate_mode,
            last_updated: new Date().toISOString(),
          })
          .eq('code', c.code);
      }

      // Also sync old site_settings for backward compatibility
      const usdRow = currencies.find((c) => c.code === 'USD');
      const gbpRow = currencies.find((c) => c.code === 'GBP');
      const eurRow = currencies.find((c) => c.code === 'EUR');

      const settingsToUpsert: { key: string; value: string }[] = [];
      if (usdRow) settingsToUpsert.push({ key: 'exchange_rate_usd', value: String(usdRow.rate) });
      if (gbpRow) settingsToUpsert.push({ key: 'exchange_rate_gbp', value: String(gbpRow.rate) });
      if (eurRow) settingsToUpsert.push({ key: 'exchange_rate_eur', value: String(eurRow.rate) });

      for (const s of settingsToUpsert) {
        const { data: existing } = await supabase
          .from('site_settings')
          .select('id')
          .eq('key', s.key)
          .maybeSingle();
        if (existing) {
          await supabase.from('site_settings').update({ value: s.value }).eq('key', s.key);
        } else {
          await supabase.from('site_settings').insert(s);
        }
      }

      alert('Currency settings saved successfully.');
    } catch (err) {
      console.error('Save currencies error:', err);
      alert('Failed to save. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCurrencies();
    setRefreshing(false);
  };

  const samplePriceKes = 15000000;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Save Bar */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-white border border-stone-200/70 hover:bg-stone-50 text-stone-600 px-3 py-2 rounded-lg text-[13px] font-roboto transition-all cursor-pointer whitespace-nowrap"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#15382A] text-white px-4 py-2 rounded-lg text-[13px] font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>

      {/* Live Preview */}
      <div className="bg-[#1B4332] rounded-xl p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-3">
          Live Display Preview — Sample: KES {samplePriceKes.toLocaleString('en-US')}
        </p>
        <div className="space-y-1.5">
          <p className="text-2xl font-bold">KES {samplePriceKes.toLocaleString('en-US')}</p>
          {currencies.filter((c) => c.enabled && c.code !== 'KES').map((c) => {
            const converted = Math.round(samplePriceKes / c.rate);
            return (
              <p key={c.code} className="text-sm text-white/60">
                ≈ {c.symbol} {converted.toLocaleString('en-US')}
                <span className="text-white/30 ml-1">({c.code})</span>
              </p>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-4 text-xs text-white/30">
          <span>Base: KES (Kenyan Shilling)</span>
          <span>·</span>
          <span>{currencies.filter((c) => c.enabled).length} currencies enabled</span>
        </div>
      </div>

      {/* Currency List */}
      <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">
            Currencies ({currencies.filter((c) => c.enabled).length} enabled)
          </h3>
          <span className="text-xs text-stone-400">
            Rate = 1 {currencies.find((c) => c.code === 'USD')?.symbol || '$'} = X KES
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left">
                <th className="py-3 px-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Currency</th>
                <th className="py-3 px-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Symbol</th>
                <th className="py-3 px-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Rate (1 Unit = X KES)</th>
                <th className="py-3 px-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Mode</th>
                <th className="py-3 px-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((c) => (
                <tr key={c.code} className={`border-b border-stone-100 ${!c.enabled ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-3">
                    <p className="font-medium text-stone-800">{c.label}</p>
                    <p className="text-xs text-stone-400">{c.code}</p>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-lg font-semibold text-stone-700">{c.symbol}</span>
                  </td>
                  <td className="py-3 px-3">
                    {c.code === 'KES' ? (
                      <p className="text-stone-600 font-medium">1 KES = 1 KES (base)</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400 text-xs">1 {c.code} =</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={c.rate || ''}
                          onChange={(e) => updateRate(c.code, e.target.value)}
                          disabled={!c.enabled}
                          className="w-28 px-3 py-1.5 border border-stone-200 rounded-md text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 bg-white disabled:bg-stone-100"
                        />
                        <span className="text-xs text-stone-500">KES</span>
                        {c.rate > 0 && (
                          <span className="text-xs text-stone-400 ml-1">
                            (1 KES ≈ {(1 / c.rate).toFixed(6)} {c.code})
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {c.code === 'KES' ? (
                      <span className="text-xs text-stone-400">Base</span>
                    ) : (
                      <button
                        onClick={() => toggleRateMode(c.code)}
                        disabled={!c.enabled}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                          c.rate_mode === 'auto'
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        {c.rate_mode === 'auto' ? 'Auto' : 'Manual'}
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => toggleEnabled(c.code)}
                      disabled={c.code === 'KES'}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        c.code === 'KES'
                          ? 'bg-stone-200 cursor-not-allowed'
                          : c.enabled
                          ? 'bg-[#1B4332]'
                          : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          c.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      ></span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-3">
        <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">How It Works</h3>
        <div className="rounded-lg border border-[#1B4332]/20 bg-[#1B4332]/5 p-4 space-y-2">
          <ul className="text-sm text-[#1B4332]/70 space-y-1.5">
            <li className="flex items-start gap-2">
              <i className="ri-checkbox-circle-line mt-0.5 shrink-0"></i>
              <strong>KES is the base currency</strong> — all internal conversions use KES as the reference
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-checkbox-circle-line mt-0.5 shrink-0"></i>
              Agents enter property prices in either <strong>KES</strong> or <strong>USD</strong>
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-checkbox-circle-line mt-0.5 shrink-0"></i>
              Visitors see <strong>KES by default</strong> — they can switch via the header currency switcher
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-checkbox-circle-line mt-0.5 shrink-0"></i>
              <strong>Auto mode</strong> = rate fetched from API (coming soon). <strong>Manual</strong> = your fixed rate
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-checkbox-circle-line mt-0.5 shrink-0"></i>
              Disabled currencies won't appear in the frontend currency switcher
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-checkbox-circle-line mt-0.5 shrink-0"></i>
              All conversions happen on the frontend — stored prices never change
            </li>
          </ul>
        </div>
      </div>

      {/* Applied Across */}
      <div className="bg-white rounded-xl border border-stone-200/70 p-5">
        <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em] mb-3">Applied Across</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {[
            'Property Cards',
            'Listing Detail Pages',
            'Featured Listings',
            'Search Results',
            'Agent Profiles',
            'Neighbourhood Listings',
            'Inquiry Summaries',
            'Admin Listings Table',
            'Homepage Widgets',
            'Quick View Modals',
            'Comparison Tool',
            'New Developments',
            'Land & Joint Ventures',
            'Prev/Next Navigation',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 py-1.5">
              <i className="ri-checkbox-circle-fill text-[#1B4332] text-sm"></i>
              <span className="text-sm text-stone-600">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}