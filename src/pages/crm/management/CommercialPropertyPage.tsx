import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ManagementLayout from '../ManagementLayout';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import { SC, TextF, TextAreaF, ToggleF, StringListEditor } from './PageContentFields';
import { DEFAULT_COMMERCIAL_PROPERTY_CONTENT, invalidateCommercialPropertyPageContentCache, type CommercialPropertyPageContent } from '@/hooks/useCommercialPropertyPageContent';

type TabKey = 'hero' | 'results' | 'ctas' | 'states' | 'controls' | 'visibility' | 'preview';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'hero', label: 'Hero', icon: 'ri-image-2-line' },
  { key: 'results', label: 'Results & Sidebar', icon: 'ri-layout-left-line' },
  { key: 'ctas', label: 'CTAs', icon: 'ri-megaphone-line' },
  { key: 'states', label: 'Empty & Error', icon: 'ri-error-warning-line' },
  { key: 'controls', label: 'Controls', icon: 'ri-equalizer-line' },
  { key: 'visibility', label: 'Visibility', icon: 'ri-eye-line' },
  { key: 'preview', label: 'Preview', icon: 'ri-eye-2-line' },
];
const PAGE_KEY = 'commprop';
const STRING_LIST_KEYS = ['popular_areas', 'related_searches'];
const BOOLEAN_KEYS = ['show_hero', 'show_hero_image', 'show_sidebar', 'show_alert_cta', 'show_footer_cta'];

export default function CommercialPropertyPageCMS() {
  const [activeTab, setActiveTab] = useState<TabKey>('hero');
  const [c, setC] = useState<CommercialPropertyPageContent>(DEFAULT_COMMERCIAL_PROPERTY_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    if (data) {
      const map = { ...DEFAULT_COMMERCIAL_PROPERTY_CONTENT } as unknown as Record<string, unknown>;
      data.forEach((r: { key: string; value: string | null }) => {
        const f = r.key.replace(`page_${PAGE_KEY}_`, '');
        if (!(f in map) || r.value === null) return;
        if (STRING_LIST_KEYS.includes(f)) {
          try { map[f] = JSON.parse(r.value); } catch { /* keep default */ }
        } else if (BOOLEAN_KEYS.includes(f)) {
          map[f] = r.value === 'true';
        } else {
          map[f] = r.value;
        }
      });
      setC(map as unknown as CommercialPropertyPageContent);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const upd = (key: keyof CommercialPropertyPageContent, value: unknown) => setC((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    const entries = Object.entries(c).map(([k, v]) => ({
      key: `page_${PAGE_KEY}_${k}`,
      value: Array.isArray(v) ? JSON.stringify(v) : String(v),
    }));
    await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    invalidateCommercialPropertyPageContentCache();
    showToast('Commercial Property page saved', 'success');
    setSaving(false);
  };

  if (loading) return <ManagementLayout title="Commercial Property Page" description="" icon={<i className="ri-building-2-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="Commercial Property Page" description="Edit every heading, label, sidebar list, CTA and message on the commercial listings page." icon={<i className="ri-building-2-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const a = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${a ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'hero' && (
          <SC title="Hero — For Sale" icon="ri-home-4-line">
            <TextF label="Eyebrow" value={c.hero_eyebrow_buy} onChange={(v) => upd('hero_eyebrow_buy', v)} />
            <TextF label="Title" value={c.hero_title_buy} onChange={(v) => upd('hero_title_buy', v)} />
            <TextAreaF label="Subtitle" value={c.hero_subtitle_buy} onChange={(v) => upd('hero_subtitle_buy', v)} />
          </SC>
        )}
        {activeTab === 'hero' && (
          <SC title="Hero Background Image" icon="ri-image-2-line">
            <p className="text-xs text-stone-400 leading-relaxed">Upload an image to sit behind the commercial hero. Turn on “Use hero image” below to display it; a dark overlay is applied automatically for readability.</p>
            <ImageUploadField label="Hero Image" value={c.hero_image} onChange={(v) => upd('hero_image', v)} pageKey={PAGE_KEY} fieldKey="hero_image" previewWidth="w-24" previewHeight="h-16" />
            <ToggleF label="Show hero section" value={c.show_hero} onChange={(v) => upd('show_hero', v)} />
            <ToggleF label="Use hero image" value={c.show_hero_image} onChange={(v) => upd('show_hero_image', v)} />
          </SC>
        )}
        {activeTab === 'hero' && (
          <SC title="Hero — To Rent" icon="ri-home-4-line">
            <TextF label="Eyebrow" value={c.hero_eyebrow_rent} onChange={(v) => upd('hero_eyebrow_rent', v)} />
            <TextF label="Title" value={c.hero_title_rent} onChange={(v) => upd('hero_title_rent', v)} />
            <TextAreaF label="Subtitle" value={c.hero_subtitle_rent} onChange={(v) => upd('hero_subtitle_rent', v)} />
          </SC>
        )}

        {activeTab === 'results' && (
          <>
            <SC title="Results Header" icon="ri-list-check-2">
              <TextF label="Heading (For Sale)" value={c.results_heading_buy} onChange={(v) => upd('results_heading_buy', v)} />
              <TextF label="Heading (To Rent)" value={c.results_heading_rent} onChange={(v) => upd('results_heading_rent', v)} />
              <TextF label="Count word (e.g. properties)" value={c.results_count_label} onChange={(v) => upd('results_count_label', v)} />
            </SC>
            <SC title="Sidebar Labels" icon="ri-layout-left-line">
              <TextF label="Section title" value={c.sidebar_section_title} onChange={(v) => upd('sidebar_section_title', v)} />
              <TextAreaF label="Refine text" value={c.sidebar_refine_text} onChange={(v) => upd('sidebar_refine_text', v)} />
              <TextF label="Recently viewed label" value={c.recently_viewed_label} onChange={(v) => upd('recently_viewed_label', v)} />
              <TextF label="Popular areas label" value={c.popular_areas_label} onChange={(v) => upd('popular_areas_label', v)} />
              <TextF label="Related searches label" value={c.related_searches_label} onChange={(v) => upd('related_searches_label', v)} />
            </SC>
            <SC title="Sidebar Lists" icon="ri-list-unordered">
              <StringListEditor label="Popular areas" items={c.popular_areas} onChange={(v) => upd('popular_areas', v)} placeholder="e.g. Westlands" />
              <StringListEditor label="Related searches" items={c.related_searches} onChange={(v) => upd('related_searches', v)} placeholder="e.g. Offices to rent" />
            </SC>
          </>
        )}

        {activeTab === 'ctas' && (
          <>
            <SC title="Sidebar Advertise Card" icon="ri-advertisement-line">
              <TextF label="Heading" value={c.list_cta_heading} onChange={(v) => upd('list_cta_heading', v)} />
              <TextF label="Text" value={c.list_cta_text} onChange={(v) => upd('list_cta_text', v)} />
              <div className="grid grid-cols-2 gap-3">
                <TextF label="Button label" value={c.list_cta_button} onChange={(v) => upd('list_cta_button', v)} />
                <TextF label="Button link" value={c.list_cta_button_link} onChange={(v) => upd('list_cta_button_link', v)} />
              </div>
            </SC>
            <SC title="Property Alert CTA" icon="ri-notification-3-line">
              <TextF label="Heading" value={c.alert_heading} onChange={(v) => upd('alert_heading', v)} />
              <TextAreaF label="Text" value={c.alert_text} onChange={(v) => upd('alert_text', v)} />
              <TextF label="Button label" value={c.alert_button} onChange={(v) => upd('alert_button', v)} />
              <TextF label="Success message" value={c.alert_success} onChange={(v) => upd('alert_success', v)} />
            </SC>
            <SC title="Footer CTA" icon="ri-megaphone-line">
              <TextF label="Eyebrow" value={c.footer_eyebrow} onChange={(v) => upd('footer_eyebrow', v)} />
              <TextF label="Heading" value={c.footer_heading} onChange={(v) => upd('footer_heading', v)} />
              <TextAreaF label="Text" value={c.footer_text} onChange={(v) => upd('footer_text', v)} />
              <div className="grid grid-cols-2 gap-3">
                <TextF label="Button label" value={c.footer_button} onChange={(v) => upd('footer_button', v)} />
                <TextF label="Button link" value={c.footer_button_link} onChange={(v) => upd('footer_button_link', v)} />
              </div>
            </SC>
          </>
        )}

        {activeTab === 'states' && (
          <>
            <SC title="Empty State" icon="ri-inbox-line">
              <TextF label="Title" value={c.empty_title} onChange={(v) => upd('empty_title', v)} />
              <TextAreaF label="Text" value={c.empty_text} onChange={(v) => upd('empty_text', v)} />
              <TextF label="Clear filters label" value={c.empty_clear_label} onChange={(v) => upd('empty_clear_label', v)} />
              <TextF label="Advertise label" value={c.empty_advertise_label} onChange={(v) => upd('empty_advertise_label', v)} />
            </SC>
            <SC title="Error State" icon="ri-error-warning-line">
              <TextF label="Title" value={c.error_title} onChange={(v) => upd('error_title', v)} />
              <TextF label="Retry label" value={c.error_retry_label} onChange={(v) => upd('error_retry_label', v)} />
            </SC>
          </>
        )}

        {activeTab === 'controls' && (
          <SC title="Listing Controls" icon="ri-equalizer-line">
            <TextF label="Create alert label" value={c.create_alert_label} onChange={(v) => upd('create_alert_label', v)} />
            <div className="grid grid-cols-3 gap-3">
              <TextF label="Sort label" value={c.sort_label} onChange={(v) => upd('sort_label', v)} />
              <TextF label="List label" value={c.list_label} onChange={(v) => upd('list_label', v)} />
              <TextF label="Map label" value={c.map_label} onChange={(v) => upd('map_label', v)} />
            </div>
          </SC>
        )}

        {activeTab === 'visibility' && (
          <SC title="Section Visibility" icon="ri-eye-line">
            <ToggleF label="Show hero section" value={c.show_hero} onChange={(v) => upd('show_hero', v)} />
            <ToggleF label="Show sidebar" value={c.show_sidebar} onChange={(v) => upd('show_sidebar', v)} />
            <ToggleF label="Show property alert CTA" value={c.show_alert_cta} onChange={(v) => upd('show_alert_cta', v)} />
            <ToggleF label="Show footer CTA" value={c.show_footer_cta} onChange={(v) => upd('show_footer_cta', v)} />
          </SC>
        )}

        {activeTab === 'preview' && (
          <SC title="Live Preview" icon="ri-eye-2-line">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-stone-100 bg-[#1B4332]">
                <p className="text-[10px] uppercase tracking-widest text-[#C9A84C] mb-1">{c.hero_eyebrow_buy}</p>
                <p className="text-2xl font-bold text-white">{c.hero_title_buy}</p>
                <p className="text-sm text-white/70 mt-2">{c.hero_subtitle_buy}</p>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-sm font-bold text-[#1B4332]">{c.results_heading_buy}</p>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div className="border border-stone-200 rounded p-2"><p className="font-bold text-[#1B4332] mb-1">{c.popular_areas_label}</p><p className="text-stone-500">{c.popular_areas.slice(0, 6).join(' · ')}</p></div>
                  <div className="border border-stone-200 rounded p-2"><p className="font-bold text-[#1B4332] mb-1">{c.related_searches_label}</p><p className="text-stone-500">{c.related_searches.slice(0, 3).join(' · ')}</p></div>
                </div>
              </div>
            </div>
          </SC>
        )}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div>
      </div>
    </ManagementLayout>
  );
}