import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import ManagementLayout from '../ManagementLayout';
import {
  DEFAULT_NEWDEV_CONTENT,
  invalidateNewDevelopmentsContentCache,
  type NewDevelopmentsPageContent,
  type NewDevBenefit,
  type NewDevSortOption,
} from '@/hooks/useNewDevelopmentsPageContent';

type TabKey = 'hero' | 'benefits' | 'featured' | 'browse' | 'devcta' | 'layout' | 'preview';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'hero', label: 'Hero', icon: 'ri-image-2-line' },
  { key: 'benefits', label: 'Benefits', icon: 'ri-star-line' },
  { key: 'featured', label: 'Featured', icon: 'ri-vip-crown-2-line' },
  { key: 'browse', label: 'Browse & Filters', icon: 'ri-filter-3-line' },
  { key: 'devcta', label: 'Developer CTA', icon: 'ri-megaphone-line' },
  { key: 'layout', label: 'Layout & Visibility', icon: 'ri-layout-4-line' },
  { key: 'preview', label: 'Preview', icon: 'ri-eye-line' },
];

const PAGE_KEY = 'newdev';

const JSON_KEYS = ['benefits', 'search_placeholders', 'sort_options', 'beds_options', 'stage_options'];
const STRING_LIST_KEYS: (keyof NewDevelopmentsPageContent)[] = ['search_placeholders', 'beds_options', 'stage_options'];
const BOOLEAN_KEYS: (keyof NewDevelopmentsPageContent)[] = [
  'hero_visible', 'benefits_visible', 'featured_visible', 'browse_visible', 'devcta_visible',
];

function cloneDefaults(): NewDevelopmentsPageContent {
  return {
    ...DEFAULT_NEWDEV_CONTENT,
    benefits: DEFAULT_NEWDEV_CONTENT.benefits.map((b) => ({ ...b })),
    search_placeholders: [...DEFAULT_NEWDEV_CONTENT.search_placeholders],
    beds_options: [...DEFAULT_NEWDEV_CONTENT.beds_options],
    stage_options: [...DEFAULT_NEWDEV_CONTENT.stage_options],
    sort_options: DEFAULT_NEWDEV_CONTENT.sort_options.map((s) => ({ ...s })),
  };
}

function SC({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4"><div className="flex items-center gap-2 mb-1"><span className="w-5 h-5 flex items-center justify-center"><i className={`${icon} text-[#1B4332] text-sm`}></i></span><h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3></div>{children}</div>;
}
function T({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" /></div>;
}
function TA({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" />{hint && <p className="text-xs text-stone-400">{hint}</p>}</div>;
}
function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
      <div className="flex-1 min-w-0 pr-4"><p className="text-sm font-medium text-stone-700">{label}</p>{desc && <p className="text-xs text-stone-400 mt-0.5">{desc}</p>}</div>
      <button type="button" onClick={() => onChange(!value)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${value ? 'bg-[#1B4332]' : 'bg-stone-200'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}></span></button>
    </div>
  );
}
function ListEditor({ label, items, onChange, hint }: { label: string; items: string[]; onChange: (v: string[]) => void; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700 block">{label}</label>
      <textarea rows={Math.min(10, Math.max(3, items.length + 1))} value={items.join('\n')} onChange={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" />
      <p className="text-xs text-stone-400">{hint || 'One item per line. Reorder by moving lines.'}</p>
    </div>
  );
}

export default function NewDevelopmentsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('hero');
  const [c, setC] = useState<NewDevelopmentsPageContent>(cloneDefaults());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchC = useCallback(async () => {
    setLoading(true);
    const map = cloneDefaults();
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    if (data) {
      data.forEach((r: { key: string; value: string | null }) => {
        if (r.value === null) return;
        const field = r.key.replace(`page_${PAGE_KEY}_`, '');
        if (field === 'benefits') {
          try {
            const parsed = JSON.parse(r.value);
            if (Array.isArray(parsed) && parsed.length) {
              map.benefits = parsed.map((b: NewDevBenefit) => ({ icon: String(b.icon || ''), title: String(b.title || ''), desc: String(b.desc || '') }));
            }
          } catch { /* ignore */ }
          return;
        }
        if (field === 'sort_options') {
          try {
            const parsed = JSON.parse(r.value);
            if (Array.isArray(parsed) && parsed.length) {
              map.sort_options = parsed.map((s: NewDevSortOption) => ({ label: String(s.label || ''), value: String(s.value || '') }));
            }
          } catch { /* ignore */ }
          return;
        }
        if (STRING_LIST_KEYS.includes(field as keyof NewDevelopmentsPageContent)) {
          try {
            const parsed = JSON.parse(r.value);
            if (Array.isArray(parsed)) (map as unknown as Record<string, unknown>)[field] = parsed.map((v) => String(v)).filter(Boolean);
          } catch { /* ignore */ }
          return;
        }
        if (!(field in map)) return;
        if (BOOLEAN_KEYS.includes(field as keyof NewDevelopmentsPageContent)) (map as unknown as Record<string, unknown>)[field] = r.value === 'true';
        else (map as unknown as Record<string, unknown>)[field] = r.value;
      });
    }
    setC(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchC(); }, [fetchC]);

  const upd = (key: keyof NewDevelopmentsPageContent, value: unknown) => setC((prev) => ({ ...prev, [key]: value }));

  const updateBenefit = (i: number, patch: Partial<NewDevBenefit>) => setC((prev) => ({ ...prev, benefits: prev.benefits.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) }));
  const addBenefit = () => setC((prev) => ({ ...prev, benefits: [...prev.benefits, { icon: 'ri-checkbox-circle-line', title: 'New Benefit', desc: '' }] }));
  const removeBenefit = (i: number) => setC((prev) => ({ ...prev, benefits: prev.benefits.filter((_, idx) => idx !== i) }));
  const moveBenefit = (i: number, dir: -1 | 1) => setC((prev) => {
    const next = [...prev.benefits];
    const t = i + dir;
    if (t < 0 || t >= next.length) return prev;
    [next[i], next[t]] = [next[t], next[i]];
    return { ...prev, benefits: next };
  });

  const updateSort = (i: number, patch: Partial<NewDevSortOption>) => setC((prev) => ({ ...prev, sort_options: prev.sort_options.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  const addSort = () => setC((prev) => ({ ...prev, sort_options: [...prev.sort_options, { label: 'New Sort', value: `sort_${prev.sort_options.length + 1}` }] }));
  const removeSort = (i: number) => setC((prev) => ({ ...prev, sort_options: prev.sort_options.filter((_, idx) => idx !== i) }));
  const moveSort = (i: number, dir: -1 | 1) => setC((prev) => {
    const next = [...prev.sort_options];
    const t = i + dir;
    if (t < 0 || t >= next.length) return prev;
    [next[i], next[t]] = [next[t], next[i]];
    return { ...prev, sort_options: next };
  });

  const save = async () => {
    setSaving(true);
    const entries = Object.entries(c).map(([k, v]) => {
      let value: string;
      if (JSON_KEYS.includes(k)) value = JSON.stringify(v);
      else if (typeof v === 'boolean') value = v ? 'true' : 'false';
      else value = String(v);
      return { key: `page_${PAGE_KEY}_${k}`, value };
    });
    const results = await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    const failed = results.some((r) => r.error);
    if (failed) showToast('Some fields failed to save', 'error');
    else { invalidateNewDevelopmentsContentCache(); showToast('New Developments page saved', 'success'); }
    setSaving(false);
  };

  const reset = () => {
    setC(cloneDefaults());
    showToast('Defaults restored — click Save to apply', 'info');
  };

  if (loading) return <ManagementLayout title="New Developments Page" description="" icon={<i className="ri-building-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="New Developments Page" description="Manage every element of the New Developments page — hero, benefits, featured block, filters, results and CTA — all backend-driven." icon={<i className="ri-building-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const isA = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${isA ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'hero' && (
          <div className="space-y-5">
            <SC title="Visibility" icon="ri-eye-line">
              <Toggle label="Show Hero" desc="The banner at the top of the New Developments page." value={c.hero_visible} onChange={(v) => upd('hero_visible', v)} />
            </SC>
            <SC title="Hero Content" icon="ri-article-line">
              <ImageUploadField label="Background Image (optional)" value={c.hero_image} onChange={(v) => upd('hero_image', v)} pageKey={PAGE_KEY} fieldKey="hero_image" previewWidth="w-24" previewHeight="h-16" />
              <T label="Eyebrow" value={c.hero_eyebrow} onChange={(v) => upd('hero_eyebrow', v)} placeholder="Premium Developments" />
              <T label="Title" value={c.hero_title} onChange={(v) => upd('hero_title', v)} />
              <TA label="Subtitle" value={c.hero_subtitle} onChange={(v) => upd('hero_subtitle', v)} />
            </SC>
          </div>
        )}

        {activeTab === 'benefits' && (
          <div className="space-y-5">
            <SC title="Section" icon="ri-eye-line">
              <Toggle label="Show Benefits Section" value={c.benefits_visible} onChange={(v) => upd('benefits_visible', v)} />
              <T label="Eyebrow" value={c.benefits_eyebrow} onChange={(v) => upd('benefits_eyebrow', v)} placeholder="The Benefits" />
              <T label="Title" value={c.benefits_title} onChange={(v) => upd('benefits_title', v)} placeholder="Why Buy a New Development?" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Collapsed label (mobile)" value={c.benefits_collapse_label} onChange={(v) => upd('benefits_collapse_label', v)} />
                <T label="Open label (mobile)" value={c.benefits_open_label} onChange={(v) => upd('benefits_open_label', v)} />
              </div>
            </SC>
            <SC title="Benefit Cards" icon="ri-list-check-2">
              <p className="text-xs text-stone-400 leading-relaxed">Each card is fully editable. Use the arrows to reorder. Icon uses a Remix Icon class, e.g. <span className="font-mono">ri-line-chart-line</span>.</p>
              <div className="space-y-3">
                {c.benefits.map((b, idx) => (
                  <div key={idx} className="border border-stone-200 rounded-lg p-3 space-y-2 bg-stone-50/50">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-xs font-semibold text-stone-400 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                      <input type="text" value={b.icon} onChange={(e) => updateBenefit(idx, { icon: e.target.value })} placeholder="ri-checkbox-circle-line" className="w-44 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white font-mono" />
                      <input type="text" value={b.title} onChange={(e) => updateBenefit(idx, { title: e.target.value })} placeholder="Card title" className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
                      <button onClick={() => moveBenefit(idx, -1)} disabled={idx === 0} className="w-8 h-8 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><i className="ri-arrow-up-line"></i></button>
                      <button onClick={() => moveBenefit(idx, 1)} disabled={idx === c.benefits.length - 1} className="w-8 h-8 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><i className="ri-arrow-down-line"></i></button>
                      <button onClick={() => removeBenefit(idx)} className="w-8 h-8 flex items-center justify-center rounded-md border border-red-100 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"><i className="ri-delete-bin-line"></i></button>
                    </div>
                    <textarea rows={2} value={b.desc} onChange={(e) => updateBenefit(idx, { desc: e.target.value })} placeholder="Card description" className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" />
                  </div>
                ))}
              </div>
              <button onClick={addBenefit} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-add-line"></i> Add benefit card</button>
            </SC>
          </div>
        )}

        {activeTab === 'featured' && (
          <SC title="Featured Block" icon="ri-vip-crown-2-line">
            <Toggle label="Show Featured Section" desc="Shows projects flagged as Featured in the CRM." value={c.featured_visible} onChange={(v) => upd('featured_visible', v)} />
            <T label="Eyebrow" value={c.featured_eyebrow} onChange={(v) => upd('featured_eyebrow', v)} placeholder="Featured" />
            <T label="Title" value={c.featured_title} onChange={(v) => upd('featured_title', v)} />
            <TA label="Description" value={c.featured_text} onChange={(v) => upd('featured_text', v)} />
          </SC>
        )}

        {activeTab === 'browse' && (
          <div className="space-y-5">
            <SC title="Section Heading" icon="ri-article-line">
              <Toggle label="Show Browse / Results Section" value={c.browse_visible} onChange={(v) => upd('browse_visible', v)} />
              <T label="Eyebrow" value={c.browse_eyebrow} onChange={(v) => upd('browse_eyebrow', v)} placeholder="Development Projects" />
              <T label="Title" value={c.browse_title} onChange={(v) => upd('browse_title', v)} />
            </SC>
            <SC title="Search & Results Labels" icon="ri-search-line">
              <ListEditor label="Search placeholder cycle" items={c.search_placeholders} onChange={(v) => upd('search_placeholders', v)} hint="Rotating placeholder text in the search bar — one per line." />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Area filter label" value={c.filter_area_label} onChange={(v) => upd('filter_area_label', v)} />
                <T label="Status filter label" value={c.filter_status_label} onChange={(v) => upd('filter_status_label', v)} />
                <T label="Clear button label" value={c.filter_clear_label} onChange={(v) => upd('filter_clear_label', v)} />
                <T label="Results count suffix" value={c.results_suffix} onChange={(v) => upd('results_suffix', v)} placeholder="development projects" />
                <T label="Sort label" value={c.sort_label} onChange={(v) => upd('sort_label', v)} placeholder="Sort:" />
                <T label="Developer “any” option label" value={c.developer_default_label} onChange={(v) => upd('developer_default_label', v)} placeholder="All Developers" />
                <T label="Completion “any” option label" value={c.completion_default_label} onChange={(v) => upd('completion_default_label', v)} placeholder="Any Completion" />
              </div>
            </SC>
            <SC title="Filter Options" icon="ri-filter-3-line">
              <ListEditor label="Unit type options" items={c.beds_options} onChange={(v) => upd('beds_options', v)} hint="First line is the “any” option (e.g. Any unit)." />
              <ListEditor label="Build status options" items={c.stage_options} onChange={(v) => upd('stage_options', v)} hint="First line is the “any” option (e.g. All Status)." />
            </SC>
            <SC title="Sort Options" icon="ri-sort-desc">
              <p className="text-xs text-stone-400 leading-relaxed">Display label is shown to visitors; the value is the internal sort key (name, newest, price_asc, price_desc).</p>
              <div className="space-y-3">
                {c.sort_options.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-xs font-semibold text-stone-400 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                    <input type="text" value={s.label} onChange={(e) => updateSort(idx, { label: e.target.value })} placeholder="Label" className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
                    <input type="text" value={s.value} onChange={(e) => updateSort(idx, { value: e.target.value })} placeholder="value" className="w-40 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white font-mono" />
                    <button onClick={() => moveSort(idx, -1)} disabled={idx === 0} className="w-8 h-8 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><i className="ri-arrow-up-line"></i></button>
                    <button onClick={() => moveSort(idx, 1)} disabled={idx === c.sort_options.length - 1} className="w-8 h-8 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><i className="ri-arrow-down-line"></i></button>
                    <button onClick={() => removeSort(idx)} className="w-8 h-8 flex items-center justify-center rounded-md border border-red-100 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"><i className="ri-delete-bin-line"></i></button>
                  </div>
                ))}
              </div>
              <button onClick={addSort} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-add-line"></i> Add sort option</button>
            </SC>
            <SC title="Empty State" icon="ri-search-eye-line">
              <T label="Title" value={c.empty_title} onChange={(v) => upd('empty_title', v)} />
              <TA label="Text" value={c.empty_text} onChange={(v) => upd('empty_text', v)} />
              <T label="Button label" value={c.empty_button} onChange={(v) => upd('empty_button', v)} />
            </SC>
          </div>
        )}

        {activeTab === 'devcta' && (
          <SC title="Developer CTA" icon="ri-megaphone-line">
            <Toggle label="Show Developer CTA" value={c.devcta_visible} onChange={(v) => upd('devcta_visible', v)} />
            <T label="Title" value={c.devcta_title} onChange={(v) => upd('devcta_title', v)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <T label="Collapsed label (mobile)" value={c.devcta_collapse_label} onChange={(v) => upd('devcta_collapse_label', v)} />
              <T label="Open label (mobile)" value={c.devcta_open_label} onChange={(v) => upd('devcta_open_label', v)} />
            </div>
            <T label="Collapsed summary (mobile)" value={c.devcta_summary} onChange={(v) => upd('devcta_summary', v)} />
            <TA label="Text" value={c.devcta_text} onChange={(v) => upd('devcta_text', v)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <T label="Button 1 — Label" value={c.devcta_button1_label} onChange={(v) => upd('devcta_button1_label', v)} />
              <T label="Button 1 — Link" value={c.devcta_button1_link} onChange={(v) => upd('devcta_button1_link', v)} placeholder="/contact" />
              <T label="Button 2 — Label" value={c.devcta_button2_label} onChange={(v) => upd('devcta_button2_label', v)} />
              <T label="Button 2 — Link" value={c.devcta_button2_link} onChange={(v) => upd('devcta_button2_link', v)} placeholder="/landlords" />
            </div>
          </SC>
        )}

        {activeTab === 'layout' && (
          <div className="space-y-5">
            <SC title="Section Order" icon="ri-layout-4-line">
              <T label="Order (comma separated)" value={c.section_order} onChange={(v) => upd('section_order', v)} placeholder="benefits,featured,browse,devcta" />
              <p className="text-xs text-stone-400">Available keys: <span className="font-mono">benefits, featured, browse, devcta</span>. The hero always sits at the top.</p>
            </SC>
            <SC title="Section Visibility" icon="ri-eye-line">
              <Toggle label="Hero" value={c.hero_visible} onChange={(v) => upd('hero_visible', v)} />
              <Toggle label="Benefits" value={c.benefits_visible} onChange={(v) => upd('benefits_visible', v)} />
              <Toggle label="Featured" value={c.featured_visible} onChange={(v) => upd('featured_visible', v)} />
              <Toggle label="Browse / Results" value={c.browse_visible} onChange={(v) => upd('browse_visible', v)} />
              <Toggle label="Developer CTA" value={c.devcta_visible} onChange={(v) => upd('devcta_visible', v)} />
            </SC>
            <SC title="Error State" icon="ri-error-warning-line">
              <T label="Title" value={c.error_title} onChange={(v) => upd('error_title', v)} />
              <TA label="Text" value={c.error_text} onChange={(v) => upd('error_text', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Retry button label" value={c.error_retry_label} onChange={(v) => upd('error_retry_label', v)} />
                <T label="Back button label" value={c.error_back_label} onChange={(v) => upd('error_back_label', v)} />
              </div>
            </SC>
          </div>
        )}

        {activeTab === 'preview' && (
          <SC title="Preview" icon="ri-eye-line">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              {c.hero_visible && (
                <div className="relative h-32 flex flex-col items-center justify-center text-center px-4 bg-gradient-to-br from-[#0d5959] to-[#C9A84C]/60">
                  <p className="text-[#C9A84C] text-[10px] uppercase tracking-widest font-bold">{c.hero_eyebrow}</p>
                  <p className="text-white text-lg font-bold mt-1">{c.hero_title}</p>
                  <p className="text-white/70 text-[10px] mt-1 max-w-md">{c.hero_subtitle}</p>
                </div>
              )}
              {c.benefits_visible && (
                <div className="p-4 bg-stone-50">
                  <p className="text-xs font-bold text-stone-700">{c.benefits_title}</p>
                  <div className="grid grid-cols-3 gap-2 mt-2">{[...c.benefits].slice(0, 3).map((b, i) => <div key={i} className="p-2 bg-white rounded border border-stone-100 text-center"><p className="text-[10px] font-semibold text-stone-700">{b.title}</p></div>)}</div>
                </div>
              )}
              {c.featured_visible && <div className="px-4 py-3 bg-white border-t border-stone-100"><p className="text-xs font-bold text-stone-700">{c.featured_title}</p><p className="text-[10px] text-stone-400 mt-0.5 line-clamp-2">{c.featured_text}</p></div>}
              {c.browse_visible && <div className="px-4 py-3 bg-stone-900"><p className="text-[10px] text-white/60 uppercase tracking-wide">{c.browse_title}</p><p className="text-[10px] text-white/40 mt-1">[{c.results_suffix}] · {c.filter_clear_label} · {c.sort_label}</p></div>}
              {c.devcta_visible && <div className="px-4 py-4 bg-[#0d5959] text-center"><p className="text-white text-sm font-bold">{c.devcta_title}</p><div className="flex gap-2 justify-center mt-2">{c.devcta_button1_label && <span className="text-[10px] text-white bg-[#C9A84C] px-2 py-1 rounded">{c.devcta_button1_label}</span>}{c.devcta_button2_label && <span className="text-[10px] text-white border border-white/50 px-2 py-1 rounded">{c.devcta_button2_label}</span>}</div></div>}
            </div>
          </SC>
        )}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><div className="flex items-center gap-2"><button onClick={reset} className="px-4 py-2 text-sm font-medium bg-white border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"><i className="ri-refresh-line"></i> Reset Defaults</button><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div></div>
      </div>
    </ManagementLayout>
  );
}