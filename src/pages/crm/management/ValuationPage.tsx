import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import ManagementLayout from '../ManagementLayout';
import { SC, TextF, TextAreaF, ToggleF } from './PageContentFields';
import { DEFAULT_VALUATION_CONTENT, invalidateValuationPageContentCache, type ValuationPageContent } from '@/hooks/useValuationPageContent';

type TabKey = 'hero' | 'process' | 'why' | 'faq' | 'cta' | 'visibility' | 'preview';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'hero', label: 'Hero & Stats', icon: 'ri-image-2-line' },
  { key: 'process', label: 'Process', icon: 'ri-flow-chart' },
  { key: 'why', label: 'Why Us', icon: 'ri-award-line' },
  { key: 'faq', label: 'FAQ', icon: 'ri-question-answer-line' },
  { key: 'cta', label: 'CTA', icon: 'ri-megaphone-line' },
  { key: 'visibility', label: 'Visibility', icon: 'ri-eye-line' },
  { key: 'preview', label: 'Preview', icon: 'ri-eye-2-line' },
];
const PAGE_KEY = 'valuation';
const JSON_LIST_KEYS = ['stats', 'steps', 'why', 'faqs'];
const BOOLEAN_KEYS = ['show_stats', 'show_process', 'show_why', 'show_faq', 'show_cta'];

export default function ValuationPageCMS() {
  const [activeTab, setActiveTab] = useState<TabKey>('hero');
  const [c, setC] = useState<ValuationPageContent>(DEFAULT_VALUATION_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    if (data) {
      const map = JSON.parse(JSON.stringify(DEFAULT_VALUATION_CONTENT)) as Record<string, unknown>;
      data.forEach((r: { key: string; value: string | null }) => {
        const f = r.key.replace(`page_${PAGE_KEY}_`, '');
        if (!(f in map) || r.value === null) return;
        if (JSON_LIST_KEYS.includes(f)) {
          try { map[f] = JSON.parse(r.value); } catch { /* keep default */ }
        } else if (BOOLEAN_KEYS.includes(f)) {
          map[f] = r.value === 'true';
        } else {
          map[f] = r.value;
        }
      });
      setC(map as unknown as ValuationPageContent);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const upd = (key: keyof ValuationPageContent, value: unknown) => setC((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    const entries = Object.entries(c).map(([k, v]) => ({
      key: `page_${PAGE_KEY}_${k}`,
      value: Array.isArray(v) ? JSON.stringify(v) : String(v),
    }));
    await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    invalidateValuationPageContentCache();
    showToast('Valuation page saved', 'success');
    setSaving(false);
  };

  if (loading) return <ManagementLayout title="Valuation Page" description="" icon={<i className="ri-line-chart-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="Valuation Page" description="Edit the hero, process steps, why-us cards, FAQs and CTA on the free valuation page." icon={<i className="ri-line-chart-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const a = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${a ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'hero' && (
          <>
            <SC title="Hero" icon="ri-image-2-line">
              <TextF label="Eyebrow" value={c.hero_eyebrow} onChange={(v) => upd('hero_eyebrow', v)} />
              <TextF label="Title" value={c.hero_title} onChange={(v) => upd('hero_title', v)} />
              <TextAreaF label="Subtitle" value={c.hero_subtitle} onChange={(v) => upd('hero_subtitle', v)} />
              <ImageUploadField label="Background Image" value={c.hero_bg_image} onChange={(v) => upd('hero_bg_image', v)} pageKey={PAGE_KEY} fieldKey="hero_bg_image" />
              <TextF label="Button label" value={c.hero_btn1_label} onChange={(v) => upd('hero_btn1_label', v)} />
              <div className="grid grid-cols-2 gap-3">
                <TextF label="Badge value" value={c.hero_badge_value} onChange={(v) => upd('hero_badge_value', v)} />
                <TextF label="Badge label" value={c.hero_badge_label} onChange={(v) => upd('hero_badge_label', v)} />
              </div>
            </SC>
            <SC title="Statistics" icon="ri-bar-chart-line">
              {c.stats.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-3 p-3 bg-stone-50 rounded-lg items-end">
                  <TextF label="Value" value={s.value} onChange={(v) => upd('stats', c.stats.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
                  <TextF label="Label" value={s.label} onChange={(v) => upd('stats', c.stats.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                  <button onClick={() => upd('stats', c.stats.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer pb-2">Remove</button>
                </div>
              ))}
              <button onClick={() => upd('stats', [...c.stats, { value: '0', label: 'New Stat' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add stat</button>
            </SC>
          </>
        )}

        {activeTab === 'process' && (
          <SC title="Valuation Process" icon="ri-flow-chart">
            <TextF label="Eyebrow" value={c.process_eyebrow} onChange={(v) => upd('process_eyebrow', v)} />
            <TextF label="Title" value={c.process_title} onChange={(v) => upd('process_title', v)} />
            <TextAreaF label="Text" value={c.process_text} onChange={(v) => upd('process_text', v)} />
            {c.steps.map((s, i) => (
              <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Step {i + 1}</p><button onClick={() => upd('steps', c.steps.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                <div className="grid grid-cols-3 gap-3"><TextF label="Icon" value={s.icon} onChange={(v) => upd('steps', c.steps.map((x, j) => (j === i ? { ...x, icon: v } : x)))} /><TextF label="Number" value={s.step} onChange={(v) => upd('steps', c.steps.map((x, j) => (j === i ? { ...x, step: v } : x)))} /><TextF label="Title" value={s.title} onChange={(v) => upd('steps', c.steps.map((x, j) => (j === i ? { ...x, title: v } : x)))} /></div>
                <TextAreaF label="Description" value={s.desc} onChange={(v) => upd('steps', c.steps.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
              </div>
            ))}
            <button onClick={() => upd('steps', [...c.steps, { icon: 'ri-star-line', step: String(c.steps.length + 1), title: 'New Step', desc: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add step</button>
          </SC>
        )}

        {activeTab === 'why' && (
          <SC title="Why Choose Us" icon="ri-award-line">
            <TextF label="Eyebrow" value={c.why_eyebrow} onChange={(v) => upd('why_eyebrow', v)} />
            <TextF label="Title" value={c.why_title} onChange={(v) => upd('why_title', v)} />
            {c.why.map((s, i) => (
              <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Card {i + 1}</p><button onClick={() => upd('why', c.why.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                <div className="grid grid-cols-2 gap-3"><TextF label="Icon" value={s.icon} onChange={(v) => upd('why', c.why.map((x, j) => (j === i ? { ...x, icon: v } : x)))} /><TextF label="Title" value={s.title} onChange={(v) => upd('why', c.why.map((x, j) => (j === i ? { ...x, title: v } : x)))} /></div>
                <TextAreaF label="Description" value={s.desc} onChange={(v) => upd('why', c.why.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
              </div>
            ))}
            <button onClick={() => upd('why', [...c.why, { icon: 'ri-star-line', title: 'New Card', desc: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add card</button>
          </SC>
        )}

        {activeTab === 'faq' && (
          <SC title="FAQs" icon="ri-question-answer-line">
            <TextF label="Eyebrow" value={c.faq_eyebrow} onChange={(v) => upd('faq_eyebrow', v)} />
            <TextF label="Title" value={c.faq_title} onChange={(v) => upd('faq_title', v)} />
            {c.faqs.map((f, i) => (
              <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">FAQ {i + 1}</p><button onClick={() => upd('faqs', c.faqs.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                <TextF label="Question" value={f.q} onChange={(v) => upd('faqs', c.faqs.map((x, j) => (j === i ? { ...x, q: v } : x)))} />
                <TextAreaF label="Answer" value={f.a} onChange={(v) => upd('faqs', c.faqs.map((x, j) => (j === i ? { ...x, a: v } : x)))} />
              </div>
            ))}
            <button onClick={() => upd('faqs', [...c.faqs, { q: 'New question', a: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add FAQ</button>
          </SC>
        )}

        {activeTab === 'cta' && (
          <SC title="Bottom CTA" icon="ri-megaphone-line">
            <TextF label="Eyebrow" value={c.cta_eyebrow} onChange={(v) => upd('cta_eyebrow', v)} />
            <TextF label="Title" value={c.cta_title} onChange={(v) => upd('cta_title', v)} />
            <TextAreaF label="Text" value={c.cta_text} onChange={(v) => upd('cta_text', v)} />
            <ImageUploadField label="Background Image (optional)" value={c.cta_bg_image} onChange={(v) => upd('cta_bg_image', v)} pageKey={PAGE_KEY} fieldKey="cta_bg_image" />
            <div className="grid grid-cols-2 gap-3">
              <TextF label="Button 1 label" value={c.cta_btn1_label} onChange={(v) => upd('cta_btn1_label', v)} />
              <TextF label="Button 2 label" value={c.cta_btn2_label} onChange={(v) => upd('cta_btn2_label', v)} />
            </div>
          </SC>
        )}

        {activeTab === 'visibility' && (
          <SC title="Section Visibility" icon="ri-eye-line">
            <ToggleF label="Show statistics band" value={c.show_stats} onChange={(v) => upd('show_stats', v)} />
            <ToggleF label="Show process section" value={c.show_process} onChange={(v) => upd('show_process', v)} />
            <ToggleF label="Show why us" value={c.show_why} onChange={(v) => upd('show_why', v)} />
            <ToggleF label="Show FAQs" value={c.show_faq} onChange={(v) => upd('show_faq', v)} />
            <ToggleF label="Show bottom CTA" value={c.show_cta} onChange={(v) => upd('show_cta', v)} />
          </SC>
        )}

        {activeTab === 'preview' && (
          <SC title="Live Preview" icon="ri-eye-2-line">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="p-6 bg-cover bg-center relative" style={{ backgroundImage: `url(${c.hero_bg_image})` }}>
                <div className="absolute inset-0 bg-[#1B4332]/80"></div>
                <div className="relative">
                  <p className="text-[10px] uppercase tracking-widest text-[#C9A84C] mb-1">{c.hero_eyebrow}</p>
                  <p className="text-2xl font-bold text-white">{c.hero_title}</p>
                  <p className="text-sm text-white/70 mt-2">{c.hero_subtitle}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 p-4 bg-[#1B4332] text-center text-white">
                {c.stats.map((s, i) => <div key={i}><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-white/60">{s.label}</p></div>)}
              </div>
              <div className="p-4 grid grid-cols-4 gap-3">
                {c.steps.slice(0, 4).map((s, i) => <div key={i} className="p-3 border border-stone-200 rounded-lg text-center"><i className={`${s.icon} text-[#1B4332]`}></i><p className="text-xs font-bold text-[#1B4332] mt-1">{s.title}</p></div>)}
              </div>
            </div>
          </SC>
        )}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div>
      </div>
    </ManagementLayout>
  );
}