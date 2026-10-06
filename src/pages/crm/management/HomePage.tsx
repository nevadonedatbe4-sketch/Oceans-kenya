import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import ManagementLayout from '../ManagementLayout';
import {
  DEFAULT_HOME_CONTENT,
  invalidateHomePageContentCache,
  type HomePageContent,
  type HomeHeroButton,
} from '@/hooks/useHomePageContent';

type TabKey = 'hero' | 'properties' | 'cta' | 'preview';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'hero', label: 'Hero', icon: 'ri-home-4-line' },
  { key: 'properties', label: 'Properties Section', icon: 'ri-building-2-line' },
  { key: 'cta', label: 'CTA Banner', icon: 'ri-megaphone-line' },
  { key: 'preview', label: 'Preview', icon: 'ri-eye-line' },
];

const PAGE_KEY = 'home';

function SC({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4"><div className="flex items-center gap-2 mb-1"><span className="w-5 h-5 flex items-center justify-center"><i className={`${icon} text-[#1B4332] text-sm`}></i></span><h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3></div>{children}</div>;
}
function T({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" /></div>;
}
function TA({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" /></div>;
}
function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
      <div className="flex-1 min-w-0 pr-4"><p className="text-sm font-medium text-stone-700">{label}</p>{desc && <p className="text-xs text-stone-400 mt-0.5">{desc}</p>}</div>
      <button type="button" onClick={() => onChange(!value)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${value ? 'bg-[#1B4332]' : 'bg-stone-200'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}></span></button>
    </div>
  );
}

export default function HomePageCMS() {
  const [activeTab, setActiveTab] = useState<TabKey>('hero');
  const [c, setC] = useState<HomePageContent>({ ...DEFAULT_HOME_CONTENT, hero_buttons: DEFAULT_HOME_CONTENT.hero_buttons.map((b) => ({ ...b })) });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchC = useCallback(async () => {
    setLoading(true);
    const map: HomePageContent = { ...DEFAULT_HOME_CONTENT, hero_buttons: DEFAULT_HOME_CONTENT.hero_buttons.map((b) => ({ ...b })) };
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    if (data) {
      data.forEach((r: { key: string; value: string | null }) => {
        if (r.value === null) return;
        const field = r.key.replace(`page_${PAGE_KEY}_`, '');
        if (field === 'hero_buttons') {
          try {
            const parsed = JSON.parse(r.value);
            if (Array.isArray(parsed) && parsed.length) {
              map.hero_buttons = parsed.map((b: HomeHeroButton) => ({ label: b.label || '', link: b.link || '', visible: b.visible !== false }));
            }
          } catch { /* ignore */ }
          return;
        }
        if (!(field in map)) return;
        if (typeof (map as unknown as Record<string, unknown>)[field] === 'boolean') (map as unknown as Record<string, unknown>)[field] = r.value === 'true';
        else (map as unknown as Record<string, unknown>)[field] = r.value;
      });
    }
    setC(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchC(); }, [fetchC]);

  const upd = (key: keyof HomePageContent, value: unknown) => setC((prev) => ({ ...prev, [key]: value }));

  const updateButton = (idx: number, patch: Partial<HomeHeroButton>) => {
    setC((prev) => ({ ...prev, hero_buttons: prev.hero_buttons.map((b, i) => (i === idx ? { ...b, ...patch } : b)) }));
  };
  const addButton = () => setC((prev) => ({ ...prev, hero_buttons: [...prev.hero_buttons, { label: 'New Button', link: '/', visible: true }] }));
  const removeButton = (idx: number) => setC((prev) => ({ ...prev, hero_buttons: prev.hero_buttons.filter((_, i) => i !== idx) }));
  const moveButton = (idx: number, dir: -1 | 1) => {
    setC((prev) => {
      const next = [...prev.hero_buttons];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, hero_buttons: next };
    });
  };

  const save = async () => {
    setSaving(true);
    const entries = Object.entries(c)
      .filter(([k]) => k !== 'hero_buttons')
      .map(([k, v]) => ({ key: `page_${PAGE_KEY}_${k}`, value: typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v) }));
    const cleanButtons = c.hero_buttons
      .map((b) => ({ label: b.label.trim(), link: b.link.trim(), visible: b.visible }))
      .filter((b) => b.label);
    entries.push({ key: `page_${PAGE_KEY}_hero_buttons`, value: JSON.stringify(cleanButtons) });
    const results = await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    const failed = results.some((r) => r.error);
    if (failed) showToast('Some fields failed to save', 'error');
    else { invalidateHomePageContentCache(); showToast('Home page saved', 'success'); }
    setSaving(false);
  };

  const reset = () => {
    setC({ ...DEFAULT_HOME_CONTENT, hero_buttons: DEFAULT_HOME_CONTENT.hero_buttons.map((b) => ({ ...b })) });
    showToast('Defaults restored — click Save to apply', 'info');
  };

  if (loading) return <ManagementLayout title="Home Page" description="" icon={<i className="ri-home-4-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="Home Page" description="Manage the homepage hero, properties section and CTA banner content — all backend-driven." icon={<i className="ri-home-4-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const isA = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${isA ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'hero' && (
          <div className="space-y-5">
            <SC title="Visibility" icon="ri-eye-line">
              <Toggle label="Show Hero Section" desc="Display the hero at the top of the homepage." value={c.hero_visible} onChange={(v) => upd('hero_visible', v)} />
              <Toggle label="Show Search Bar" value={c.hero_search_enabled} onChange={(v) => upd('hero_search_enabled', v)} />
              <Toggle label="Show Social Icons" value={c.hero_social_enabled} onChange={(v) => upd('hero_social_enabled', v)} />
              <Toggle label="Dark Overlay" desc="Overlay helps text stay readable over the image." value={c.hero_overlay_enabled} onChange={(v) => upd('hero_overlay_enabled', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <T label="Overlay Opacity (%)" value={c.hero_overlay_opacity} onChange={(v) => upd('hero_overlay_opacity', v)} placeholder="0-100" />
              </div>
            </SC>

            <SC title="Hero Content" icon="ri-article-line">
              <ImageUploadField label="Background Image" value={c.hero_image} onChange={(v) => upd('hero_image', v)} pageKey={PAGE_KEY} fieldKey="hero_image" previewWidth="w-24" previewHeight="h-16" />
              <T label="Title" value={c.hero_title} onChange={(v) => upd('hero_title', v)} />
              <T label="Subtitle" value={c.hero_subtitle} onChange={(v) => upd('hero_subtitle', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Search Placeholder" value={c.hero_search_placeholder} onChange={(v) => upd('hero_search_placeholder', v)} />
                <T label="Search Button Label" value={c.hero_search_button} onChange={(v) => upd('hero_search_button', v)} />
              </div>
            </SC>

            <SC title="Hero Buttons" icon="ri-link-m">
              <p className="text-xs text-stone-400 leading-relaxed">The call-to-action buttons under the hero. Buttons show two-per-row; a lone trailing button spans full width. Toggle each one on/off, reorder with the arrows.</p>
              <div className="space-y-3">
                {c.hero_buttons.map((btn, idx) => (
                  <div key={idx} className="border border-stone-200 rounded-lg p-3 space-y-2 bg-stone-50/50">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-xs font-semibold text-stone-400 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                      <input type="text" value={btn.label} onChange={(e) => updateButton(idx, { label: e.target.value })} placeholder="Button label" className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
                      <button onClick={() => updateButton(idx, { visible: !btn.visible })} title={btn.visible ? 'Hide button' : 'Show button'} className={`w-8 h-8 flex items-center justify-center rounded-md border transition-colors cursor-pointer ${btn.visible ? 'border-[#1B4332]/20 text-[#1B4332] bg-[#1B4332]/5' : 'border-stone-200 text-stone-400'}`}><i className={btn.visible ? 'ri-eye-line' : 'ri-eye-off-line'}></i></button>
                      <button onClick={() => moveButton(idx, -1)} disabled={idx === 0} className="w-8 h-8 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><i className="ri-arrow-up-line"></i></button>
                      <button onClick={() => moveButton(idx, 1)} disabled={idx === c.hero_buttons.length - 1} className="w-8 h-8 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><i className="ri-arrow-down-line"></i></button>
                      <button onClick={() => removeButton(idx)} className="w-8 h-8 flex items-center justify-center rounded-md border border-red-100 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"><i className="ri-delete-bin-line"></i></button>
                    </div>
                    <input type="text" value={btn.link} onChange={(e) => updateButton(idx, { link: e.target.value })} placeholder="Link e.g. /rent" className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white sm:ml-8 sm:w-[calc(100%-2rem)]" />
                  </div>
                ))}
              </div>
              <button onClick={addButton} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-add-line"></i> Add button</button>
            </SC>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="space-y-5">
            <SC title="Visibility" icon="ri-eye-line">
              <Toggle label="Show Properties Section" desc="The residential listings carousel on the homepage." value={c.properties_visible} onChange={(v) => upd('properties_visible', v)} />
            </SC>

            <SC title="Section Headings" icon="ri-article-line">
              <p className="text-xs text-stone-400 leading-relaxed">Each tab (All / For Sale / To Let) has its own heading and sub-heading.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <T label="All Tab — Heading" value={c.properties_title_all} onChange={(v) => upd('properties_title_all', v)} />
                  <T label="All Tab — Sub-heading" value={c.properties_subtitle_all} onChange={(v) => upd('properties_subtitle_all', v)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <T label="For Sale Tab — Heading" value={c.properties_title_sale} onChange={(v) => upd('properties_title_sale', v)} />
                  <T label="For Sale Tab — Sub-heading" value={c.properties_subtitle_sale} onChange={(v) => upd('properties_subtitle_sale', v)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <T label="To Let Tab — Heading" value={c.properties_title_rent} onChange={(v) => upd('properties_title_rent', v)} />
                  <T label="To Let Tab — Sub-heading" value={c.properties_subtitle_rent} onChange={(v) => upd('properties_subtitle_rent', v)} />
                </div>
                <T label="Search Results Label" value={c.properties_search_label} onChange={(v) => upd('properties_search_label', v)} />
              </div>
            </SC>

            <SC title="View More Button" icon="ri-link-m">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Button Label" value={c.properties_view_more_label} onChange={(v) => upd('properties_view_more_label', v)} />
                <T label="Button Link" value={c.properties_view_more_link} onChange={(v) => upd('properties_view_more_link', v)} placeholder="/all-properties" />
              </div>
            </SC>

            <SC title="Valuation Strip" icon="ri-line-chart-line">
              <Toggle label="Show Valuation Strip" value={c.properties_valuation_visible} onChange={(v) => upd('properties_valuation_visible', v)} />
              <T label="Title" value={c.properties_valuation_title} onChange={(v) => upd('properties_valuation_title', v)} />
              <TA label="Text" value={c.properties_valuation_text} onChange={(v) => upd('properties_valuation_text', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Button Label" value={c.properties_valuation_button_label} onChange={(v) => upd('properties_valuation_button_label', v)} />
                <T label="Button Link" value={c.properties_valuation_button_link} onChange={(v) => upd('properties_valuation_button_link', v)} placeholder="/valuation" />
              </div>
            </SC>
          </div>
        )}

        {activeTab === 'cta' && (
          <SC title="CTA Banner" icon="ri-megaphone-line">
            <Toggle label="Show CTA Banner" desc="The full-width banner below the properties section." value={c.cta_visible} onChange={(v) => upd('cta_visible', v)} />
            <ImageUploadField label="Background Image" value={c.cta_image} onChange={(v) => upd('cta_image', v)} pageKey={PAGE_KEY} fieldKey="cta_image" previewWidth="w-24" previewHeight="h-16" />
            <T label="Title" value={c.cta_title} onChange={(v) => upd('cta_title', v)} />
            <TA label="Text" value={c.cta_text} onChange={(v) => upd('cta_text', v)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <T label="Button 1 — Label" value={c.cta_button1_label} onChange={(v) => upd('cta_button1_label', v)} />
              <T label="Button 1 — Link" value={c.cta_button1_link} onChange={(v) => upd('cta_button1_link', v)} placeholder="/landlords" />
              <T label="Button 2 — Label" value={c.cta_button2_label} onChange={(v) => upd('cta_button2_label', v)} />
              <T label="Button 2 — Link" value={c.cta_button2_link} onChange={(v) => upd('cta_button2_link', v)} placeholder="/valuation" />
            </div>
          </SC>
        )}

        {activeTab === 'preview' && (
          <SC title="Homepage Preview" icon="ri-eye-line">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              {c.hero_visible && (
                <div className="relative h-40 flex flex-col items-center justify-center text-center px-4">
                  {c.hero_image && <img src={c.hero_image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                  {c.hero_overlay_enabled && <div className="absolute inset-0 bg-black" style={{ opacity: Number(c.hero_overlay_opacity || 30) / 100 }}></div>}
                  <p className="relative text-white text-xl font-[Prata,serif]">{c.hero_title}</p>
                  <p className="relative text-white/80 text-[10px] uppercase tracking-[0.2em] mt-1">{c.hero_subtitle}</p>
                  <div className="relative flex flex-wrap gap-1.5 justify-center mt-3">
                    {c.hero_buttons.filter((b) => b.visible && b.label).map((b, i) => <span key={i} className="px-3 py-1 text-[10px] uppercase tracking-wider text-white bg-black/40 border border-white">{b.label}</span>)}
                  </div>
                </div>
              )}
              {c.properties_visible && (
                <div className="p-4 bg-[#f7f8fa]">
                  <p className="font-bold text-primary text-base">{c.properties_title_all}</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-golden font-bold mt-1">{c.properties_subtitle_all}</p>
                </div>
              )}
              {c.cta_visible && (
                <div className="relative py-6 text-center px-4">
                  {c.cta_image && <img src={c.cta_image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-[#0a1f33]/80"></div>
                  <p className="relative text-white font-bold text-base">{c.cta_title}</p>
                  <p className="relative text-white/60 text-xs mt-1">{c.cta_text}</p>
                </div>
              )}
            </div>
          </SC>
        )}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><div className="flex items-center gap-2"><button onClick={reset} className="px-4 py-2 text-sm font-medium bg-white border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"><i className="ri-refresh-line"></i> Reset Defaults</button><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div></div>
      </div>
    </ManagementLayout>
  );
}