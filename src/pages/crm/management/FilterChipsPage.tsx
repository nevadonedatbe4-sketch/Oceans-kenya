import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ManagementLayout from '../ManagementLayout';
import {
  DEFAULT_FILTER_CHIPS,
  invalidateFilterChipsCache,
  CHIP_ROLES,
  CHIP_PAGES,
  type FilterChip,
} from '@/hooks/useFilterChips';

const CONFIG_KEY = 'filter_chips_config';

const ROLE_LABELS: Record<string, string> = {
  public: 'Public visitors',
  agent: 'Agents',
  admin: 'Admins',
  super_admin: 'Super admins',
};

const PAGE_LABELS: Record<string, string> = {
  buy: 'Buy (For Sale)',
  rent: 'Rent (To Let)',
};

function cloneDefaults(): FilterChip[] {
  return DEFAULT_FILTER_CHIPS.map((c) => ({ ...c, roles: [...c.roles], pages: [...c.pages] }));
}

function Field({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-stone-600 block">{label}</label>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white ${mono ? 'font-mono' : ''}`} />
    </div>
  );
}

function CheckPill({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${checked ? 'bg-[#1B4332] text-white border-[#1B4332]' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}>
      <i className={checked ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}></i>
      {label}
    </button>
  );
}

export default function FilterChipsPage() {
  const [chips, setChips] = useState<FilterChip[]>(cloneDefaults());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchChips = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('value').eq('key', CONFIG_KEY).maybeSingle();
    const raw = (data as { value?: string } | null)?.value;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          setChips(parsed.map((c: Partial<FilterChip>, i: number) => ({
            id: String(c.id || `chip_${i + 1}`),
            label: String(c.label || ''),
            filterKey: String(c.filterKey || ''),
            link: String(c.link || ''),
            roles: Array.isArray(c.roles) ? c.roles.map(String) : [...CHIP_ROLES],
            pages: Array.isArray(c.pages) ? c.pages.map(String) : [...CHIP_PAGES],
            order: Number.isFinite(Number(c.order)) ? Number(c.order) : i + 1,
            active: c.active !== false,
            icon: String(c.icon || ''),
            tooltip: String(c.tooltip || ''),
          })));
          setLoading(false);
          return;
        }
      } catch { /* keep defaults */ }
    }
    setChips(cloneDefaults());
    setLoading(false);
  }, []);

  useEffect(() => { fetchChips(); }, [fetchChips]);

  const upd = (idx: number, patch: Partial<FilterChip>) => setChips((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const toggleIn = (idx: number, field: 'roles' | 'pages', value: string) => setChips((prev) => prev.map((c, i) => {
    if (i !== idx) return c;
    const list = c[field];
    return { ...c, [field]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
  }));
  const addChip = () => setChips((prev) => [...prev, { id: `chip_${Date.now()}`, label: 'New Chip', filterKey: 'search=', link: '', roles: [...CHIP_ROLES], pages: [...CHIP_PAGES], order: prev.length + 1, active: true, icon: '', tooltip: '' }]);
  const removeChip = (idx: number) => setChips((prev) => prev.filter((_, i) => i !== idx));
  const moveChip = (idx: number, dir: -1 | 1) => setChips((prev) => {
    const next = [...prev];
    const t = idx + dir;
    if (t < 0 || t >= next.length) return prev;
    [next[idx], next[t]] = [next[t], next[idx]];
    return next.map((c, i) => ({ ...c, order: i + 1 }));
  });

  const reindex = (list: FilterChip[]) => list.map((c, i) => ({ ...c, order: i + 1 }));

  const save = async () => {
    setSaving(true);
    const clean = reindex(chips).map((c) => ({
      ...c,
      label: c.label.trim(),
      filterKey: c.filterKey.trim(),
      link: c.link.trim(),
      icon: c.icon.trim(),
      tooltip: c.tooltip.trim(),
    })).filter((c) => c.label || c.filterKey || c.link);
    const { error } = await supabase.from('site_settings').upsert({ key: CONFIG_KEY, value: JSON.stringify(clean) }, { onConflict: 'key' });
    if (error) showToast('Failed to save filter chips', 'error');
    else { invalidateFilterChipsCache(); showToast('Filter chips saved', 'success'); }
    setSaving(false);
  };

  const reset = () => {
    setChips(cloneDefaults());
    showToast('Defaults restored — click Save to apply', 'info');
  };

  if (loading) return <ManagementLayout title="Search Filter Chips" description="" icon={<i className="ri-filter-3-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="Search Filter Chips" description="Control the “Refine your search” chips on the Buy and Rent pages — labels, internal filters, links, per-role visibility, order and state." icon={<i className="ri-filter-3-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">How the chips work</h3>
          <ul className="text-xs text-stone-500 space-y-1.5 leading-relaxed list-disc pl-4">
            <li><span className="font-medium text-stone-600">Label</span> is what visitors see — it can differ from the internal filter.</li>
            <li><span className="font-medium text-stone-600">Internal filter</span> uses <span className="font-mono">key=value</span>: <span className="font-mono">beds=Studio</span>, <span className="font-mono">type=Apartment</span> or <span className="font-mono">search=furnished</span>.</li>
            <li><span className="font-medium text-stone-600">Link</span> (optional) — when set, the chip navigates there instead of filtering.</li>
            <li><span className="font-medium text-stone-600">Roles</span> decide who sees the chip. No roles selected = everyone.</li>
          </ul>
        </div>

        <div className="space-y-4">
          {chips.map((chip, idx) => (
            <div key={chip.id} className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 text-xs font-semibold text-stone-400 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                <span className="flex-1 text-sm font-semibold text-stone-700 truncate">{chip.label || 'Untitled chip'}</span>
                <button onClick={() => upd(idx, { active: !chip.active })} title={chip.active ? 'Active — click to deactivate' : 'Inactive — click to activate'} className={`w-8 h-8 flex items-center justify-center rounded-md border transition-colors cursor-pointer ${chip.active ? 'border-[#1B4332]/20 text-[#1B4332] bg-[#1B4332]/5' : 'border-stone-200 text-stone-400'}`}><i className={chip.active ? 'ri-eye-line' : 'ri-eye-off-line'}></i></button>
                <button onClick={() => moveChip(idx, -1)} disabled={idx === 0} className="w-8 h-8 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><i className="ri-arrow-up-line"></i></button>
                <button onClick={() => moveChip(idx, 1)} disabled={idx === chips.length - 1} className="w-8 h-8 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><i className="ri-arrow-down-line"></i></button>
                <button onClick={() => removeChip(idx)} className="w-8 h-8 flex items-center justify-center rounded-md border border-red-100 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"><i className="ri-delete-bin-line"></i></button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Display label" value={chip.label} onChange={(v) => upd(idx, { label: v })} placeholder="Apartments" />
                <Field label="Internal filter (key=value)" value={chip.filterKey} onChange={(v) => upd(idx, { filterKey: v })} placeholder="type=Apartment" mono />
                <Field label="Destination link (optional)" value={chip.link} onChange={(v) => upd(idx, { link: v })} placeholder="/new-developments" mono />
                <Field label="Icon class (optional)" value={chip.icon} onChange={(v) => upd(idx, { icon: v })} placeholder="ri-home-line" mono />
              </div>
              <Field label="Tooltip / help text (optional)" value={chip.tooltip} onChange={(v) => upd(idx, { tooltip: v })} placeholder="Show only apartments" />

              <div className="space-y-2">
                <p className="text-xs font-medium text-stone-600">Pages</p>
                <div className="flex flex-wrap gap-2">
                  {CHIP_PAGES.map((p) => (
                    <CheckPill key={p} label={PAGE_LABELS[p] || p} checked={chip.pages.includes(p)} onToggle={() => toggleIn(idx, 'pages', p)} />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-stone-600">Visible to roles <span className="text-stone-400 font-normal">(none = everyone)</span></p>
                <div className="flex flex-wrap gap-2">
                  {CHIP_ROLES.map((r) => (
                    <CheckPill key={r} label={ROLE_LABELS[r] || r} checked={chip.roles.includes(r)} onToggle={() => toggleIn(idx, 'roles', r)} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addChip} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-stone-200 text-stone-600 rounded-lg hover:bg-white transition-colors cursor-pointer whitespace-nowrap"><i className="ri-add-line"></i> Add chip</button>

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{chips.length}</span> chips</p><div className="flex items-center gap-2"><button onClick={reset} className="px-4 py-2 text-sm font-medium bg-white border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"><i className="ri-refresh-line"></i> Reset Defaults</button><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div></div>
      </div>
    </ManagementLayout>
  );
}