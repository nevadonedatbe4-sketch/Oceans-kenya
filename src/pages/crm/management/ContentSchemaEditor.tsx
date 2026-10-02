import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';

export type FieldType = 'text' | 'textarea' | 'toggle' | 'image' | 'stringlist' | 'jsonlist';

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  rows?: number;
  placeholder?: string;
  // For 'jsonlist' items: the shape of each row.
  itemFields?: { key: string; label: string; type: 'text' | 'textarea' | 'image' }[];
  itemLabelKey?: string;
}

export interface TabSchema {
  key: string;
  label: string;
  icon: string;
  fields: FieldSchema[];
}

export interface ContentSchemaEditorProps {
  pageKey: string;
  title: string;
  description: string;
  icon: ReactNode;
  tabs: TabSchema[];
  /** Authoritative defaults — identical to the public page's code fallback. */
  defaults: Record<string, unknown>;
  /** Optional extra renderer for a tab (e.g. an embedded live preview). */
  renderExtra?: (tabKey: string, value: Record<string, unknown>) => ReactNode;
  /** Called after a successful save so the public page cache can be invalidated. */
  onSaved?: () => void;
}

/** Deep-clone a defaults object so the editor never mutates the source. */
function cloneDefaults(defaults: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(defaults));
}

/** Load persisted rows for a namespace and merge them over the defaults. */
export async function loadNamespace(pageKey: string, defaults: Record<string, unknown>): Promise<Record<string, unknown>> {
  const map = cloneDefaults(defaults);
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${pageKey}_%`);
  const listKeys = Object.keys(defaults).filter((k) => Array.isArray(defaults[k]));
  const boolKeys = Object.keys(defaults).filter((k) => typeof defaults[k] === 'boolean');
  if (data) {
    (data as { key: string; value: string | null }[]).forEach((r) => {
      if (r.value === null) return;
      const field = r.key.replace(`page_${pageKey}_`, '');
      if (!(field in map)) return;
      if (listKeys.includes(field)) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed)) map[field] = parsed;
        } catch { /* keep default list */ }
        return;
      }
      if (boolKeys.includes(field)) {
        map[field] = r.value === 'true';
        return;
      }
      map[field] = r.value;
    });
  }
  return map;
}

/** Persist an edited value map for a namespace. */
export async function saveNamespace(pageKey: string, values: Record<string, unknown>): Promise<void> {
  const entries = Object.entries(values).map(([k, v]) => ({
    key: `page_${pageKey}_${k}`,
    value: Array.isArray(v) ? JSON.stringify(v) : typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v ?? ''),
  }));
  await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
}

export default function ContentSchemaEditor({
  pageKey, title, description, icon, tabs, defaults, renderExtra, onSaved,
}: ContentSchemaEditorProps) {
  const firstTab = tabs[0]?.key || '';
  const [activeTab, setActiveTab] = useState(firstTab);
  const [values, setValues] = useState<Record<string, unknown>>(cloneDefaults(defaults));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    const merged = await loadNamespace(pageKey, defaults);
    setValues(merged);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const upd = (key: string, value: unknown) => setValues((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    await saveNamespace(pageKey, values);
    onSaved?.();
    showToast(`${title} saved`, 'success');
    setSaving(false);
  };

  const fieldCount = tabs.reduce((n, t) => n + t.fields.length, 0);

  if (loading) {
    return <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div>;
  }

  const renderField = (f: FieldSchema) => {
    const v = values[f.key];
    if (f.type === 'toggle') {
      const on = Boolean(v);
      return (
        <div key={f.key} className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-stone-700">{f.label}</p>
            {f.hint && <p className="text-xs text-stone-400">{f.hint}</p>}
          </div>
          <button type="button" onClick={() => upd(f.key, !on)} className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${on ? 'bg-[#1B4332]' : 'bg-stone-300'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${on ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      );
    }
    if (f.type === 'textarea') {
      return (
        <div key={f.key} className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700 block">{f.label}</label>
          {f.hint && <p className="text-xs text-stone-400">{f.hint}</p>}
          <textarea rows={f.rows || 3} value={String(v ?? '')} onChange={(e) => upd(f.key, e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" />
        </div>
      );
    }
    if (f.type === 'image') {
      return (
        <ImageUploadField key={f.key} label={f.label} value={String(v ?? '')} onChange={(url) => upd(f.key, url)} pageKey={pageKey} fieldKey={f.key} />
      );
    }
    if (f.type === 'stringlist') {
      const items = Array.isArray(v) ? (v as string[]) : [];
      return (
        <div key={f.key} className="space-y-2">
          <label className="text-sm font-medium text-stone-700 block">{f.label}</label>
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="text" value={it} placeholder={f.placeholder} onChange={(e) => upd(f.key, items.map((x, j) => (j === i ? e.target.value : x)))} className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
              <button onClick={() => upd(f.key, items.filter((_, j) => j !== i))} className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-md cursor-pointer"><i className="ri-delete-bin-line text-sm"></i></button>
            </div>
          ))}
          <button onClick={() => upd(f.key, [...items, ''])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add item</button>
        </div>
      );
    }
    if (f.type === 'jsonlist') {
      const items = Array.isArray(v) ? (v as Record<string, string>[]) : [];
      const itemFields = f.itemFields || [];
      const labelKey = f.itemLabelKey || itemFields[0]?.key || '';
      return (
        <div key={f.key} className="space-y-3">
          <label className="text-sm font-medium text-stone-700 block">{f.label}</label>
          {f.hint && <p className="text-xs text-stone-400">{f.hint}</p>}
          {items.map((item, idx) => (
            <div key={idx} className="border border-stone-200 rounded-lg p-3 space-y-2 bg-stone-50/50">
              <div className="flex items-center gap-2">
                <span className="w-6 text-xs font-semibold text-stone-400 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                <span className="flex-1 text-xs text-stone-500 truncate">{String(item[labelKey] || 'Item')}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { if (idx === 0) return; const next = [...items]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; upd(f.key, next); }} disabled={idx === 0} className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-white transition-colors cursor-pointer disabled:opacity-30"><i className="ri-arrow-up-line text-sm"></i></button>
                  <button onClick={() => { if (idx === items.length - 1) return; const next = [...items]; [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]; upd(f.key, next); }} disabled={idx === items.length - 1} className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-white transition-colors cursor-pointer disabled:opacity-30"><i className="ri-arrow-down-line text-sm"></i></button>
                  <button onClick={() => upd(f.key, items.filter((_, j) => j !== idx))} className="w-7 h-7 flex items-center justify-center rounded-md border border-red-100 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"><i className="ri-delete-bin-line text-sm"></i></button>
                </div>
              </div>
              {itemFields.map((sub) => (
                <div key={sub.key}>
                  {sub.type === 'image' ? (
                    <ImageUploadField label={sub.label} value={String(item[sub.key] || '')} onChange={(url) => upd(f.key, items.map((it, j) => (j === idx ? { ...it, [sub.key]: url } : it)))} pageKey={pageKey} fieldKey={`${f.key}_${idx}_${sub.key}`} previewWidth="w-20" previewHeight="h-14" />
                  ) : sub.type === 'textarea' ? (
                    <textarea rows={2} value={String(item[sub.key] || '')} placeholder={sub.label} onChange={(e) => upd(f.key, items.map((it, j) => (j === idx ? { ...it, [sub.key]: e.target.value } : it)))} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" />
                  ) : (
                    <input type="text" value={String(item[sub.key] || '')} placeholder={sub.label} onChange={(e) => upd(f.key, items.map((it, j) => (j === idx ? { ...it, [sub.key]: e.target.value } : it)))} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
                  )}
                </div>
              ))}
            </div>
          ))}
          <button onClick={() => upd(f.key, [...items, Object.fromEntries(itemFields.map((s) => [s.key, '']))])} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-add-line"></i> Add item</button>
        </div>
      );
    }
    return (
      <div key={f.key} className="space-y-1.5">
        <label className="text-sm font-medium text-stone-700 block">{f.label}</label>
        {f.hint && <p className="text-xs text-stone-400">{f.hint}</p>}
        <input type="text" value={String(v ?? '')} placeholder={f.placeholder} onChange={(e) => upd(f.key, e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
      </div>
    );
  };

  const active = tabs.find((t) => t.key === activeTab) || tabs[0];

  return (
    <div className="space-y-5 pb-24">
      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
        <div className="flex border-b border-stone-100 overflow-x-auto">
          {tabs.map((t) => {
            const a = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${a ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}>
                <i className={`${t.icon} text-sm`}></i>{t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center"><i className={`${active.icon} text-[#1B4332] text-sm`}></i></span>
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{active.label}</h3>
        </div>
        {active.fields.map(renderField)}
      </div>

      {renderExtra ? renderExtra(activeTab, values) : null}

      <div className="sticky bottom-0 z-10">
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{fieldCount}</span> fields · {description}</p>
          <button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">
            {saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}