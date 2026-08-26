import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import ManagementLayout from '../ManagementLayout';

type TabKey = 'content' | 'media' | 'layout' | 'styling' | 'seo' | 'publishing' | 'preview';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'content', label: 'Content', icon: 'ri-article-line' }, { key: 'media', label: 'Media', icon: 'ri-image-2-line' }, { key: 'layout', label: 'Layout', icon: 'ri-layout-4-line' },
  { key: 'styling', label: 'Styling', icon: 'ri-palette-line' }, { key: 'seo', label: 'SEO', icon: 'ri-search-line' }, { key: 'publishing', label: 'Publishing', icon: 'ri-global-line' }, { key: 'preview', label: 'Preview', icon: 'ri-eye-line' },
];

interface Content {
  hero_title: string; hero_subtitle: string; hero_eyebrow: string; hero_image: string;
  intro_title: string; intro_body: string;
  grid_layout: string; grid_columns: string; card_style: string;
  show_search: boolean; show_filter: boolean;
  meta_title: string; meta_description: string; meta_keywords: string;
  accent_color: string; hero_height: string;
  is_published: boolean; published_at: string | null;
  tag_green: string; tag_luxury: string; tag_wealthy: string; tag_family: string;
  tag_young: string; tag_gated: string; tag_modern: string; tag_default: string;
}

const DEFAULTS: Content = {
  hero_title: 'Explore Neighbourhoods', hero_subtitle: 'Discover the perfect area for your next home', hero_eyebrow: 'Area Guides', hero_image: '',
  intro_title: 'Find Your Perfect Location', intro_body: 'Browse our comprehensive neighbourhood guides to find the area that matches your lifestyle, budget, and preferences.',
  grid_layout: 'grid', grid_columns: '3', card_style: 'standard',
  show_search: true, show_filter: true,
  meta_title: 'Neighbourhoods — Oceans', meta_description: 'Explore detailed neighbourhood guides. Find the perfect area for your lifestyle with our comprehensive area profiles.', meta_keywords: 'neighbourhoods, area guides, locations, communities',
  accent_color: '#1B4332', hero_height: '400',
  is_published: true, published_at: null,
  tag_green: '#2C5E1A', tag_luxury: '#E55B13', tag_wealthy: '#F6A21E', tag_family: '#1F7A6E',
  tag_young: '#7A871E', tag_gated: '#3E6B8A', tag_modern: '#32CD30', tag_default: '#6B4423',
};

function SC({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4"><div className="flex items-center gap-2 mb-1"><span className="w-5 h-5 flex items-center justify-center"><i className={`${icon} text-[#1B4332] text-sm`}></i></span><h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3></div>{children}</div>;
}
function T({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" /></div>;
}
function TA({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" /></div>;
}
function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white cursor-pointer">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;
}

export default function NeighbourhoodsPageCMS() {
  const [activeTab, setActiveTab] = useState<TabKey>('content');
  const [c, setC] = useState<Content>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const PAGE_KEY = 'neighbourhoods';

  const fetchC = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    if (data) {
      const map = { ...DEFAULTS };
      data.forEach((r: { key: string; value: string | null }) => {
        const f = r.key.replace(`page_${PAGE_KEY}_`, '');
        if (f in map && r.value !== null) {
          if (f === 'is_published' || f === 'show_search' || f === 'show_filter') (map as any)[f] = r.value === 'true';
          else (map as any)[f] = r.value;
        }
      });
      setC(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchC(); }, [fetchC]);

  const upd = (key: keyof Content, value: any) => setC((prev) => ({ ...prev, [key]: value }));
  const save = async () => {
    setSaving(true);
    const entries = Object.entries(c).map(([k, v]) => ({ key: `page_${PAGE_KEY}_${k}`, value: typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v) }));
    await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    showToast('Neighbourhoods page saved', 'success'); setSaving(false);
  };
  const pub = async () => {
    const ns = !c.is_published; upd('is_published', ns); upd('published_at', ns ? new Date().toISOString() : null);
    setSaving(true); await supabase.from('site_settings').upsert({ key: `page_${PAGE_KEY}_is_published`, value: ns ? 'true' : 'false' }, { onConflict: 'key' });
    showToast(ns ? 'Published!' : 'Unpublished', 'success'); setSaving(false);
  };

  if (loading) return <ManagementLayout title="Neighbourhoods Page" description="" icon={<i className="ri-map-pin-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="Neighbourhoods Page" description="Manage the Neighbourhoods listing page — hero, layout, card style and filters." icon={<i className="ri-map-pin-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const isA = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${isA ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'content' && (
          <div className="space-y-5">
            <SC title="Hero" icon="ri-image-2-line"><T label="Eyebrow" value={c.hero_eyebrow} onChange={(v) => upd('hero_eyebrow', v)} /><T label="Title" value={c.hero_title} onChange={(v) => upd('hero_title', v)} /><TA label="Subtitle" value={c.hero_subtitle} onChange={(v) => upd('hero_subtitle', v)} /><ImageUploadField label="Hero Image" value={c.hero_image} onChange={(v) => upd('hero_image', v)} pageKey={PAGE_KEY} fieldKey="hero_image" /></SC>
            <SC title="Introduction" icon="ri-article-line"><T label="Title" value={c.intro_title} onChange={(v) => upd('intro_title', v)} /><TA label="Body" value={c.intro_body} onChange={(v) => upd('intro_body', v)} /></SC>
          </div>
        )}

        {activeTab === 'media' && <SC title="Page Images" icon="ri-image-2-line"><ImageUploadField label="Hero Image" value={c.hero_image} onChange={(v) => upd('hero_image', v)} pageKey={PAGE_KEY} fieldKey="hero_image" previewWidth="w-24" previewHeight="h-16" /></SC>}

        {activeTab === 'layout' && <SC title="Layout & Display" icon="ri-layout-4-line">
          <Sel label="Grid Layout" value={c.grid_layout} onChange={(v) => upd('grid_layout', v)} options={[{ label: 'Grid', value: 'grid' }, { label: 'List', value: 'list' }, { label: 'Map View', value: 'map' }]} />
          <Sel label="Grid Columns (Desktop)" value={c.grid_columns} onChange={(v) => upd('grid_columns', v)} options={[{ label: '2 columns', value: '2' }, { label: '3 columns', value: '3' }, { label: '4 columns', value: '4' }]} />
          <Sel label="Card Style" value={c.card_style} onChange={(v) => upd('card_style', v)} options={[{ label: 'Standard', value: 'standard' }, { label: 'Compact', value: 'compact' }, { label: 'Featured Image', value: 'featured' }]} />
          <T label="Hero Height (px)" value={c.hero_height} onChange={(v) => upd('hero_height', v)} />
          <div className="flex items-center justify-between py-2"><div><p className="text-sm font-medium text-stone-700">Show Search Bar</p></div><button onClick={() => upd('show_search', !c.show_search)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${c.show_search ? 'bg-[#1B4332]' : 'bg-stone-200'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${c.show_search ? 'translate-x-6' : 'translate-x-1'}`}></span></button></div>
          <div className="flex items-center justify-between py-2"><div><p className="text-sm font-medium text-stone-700">Show Filters</p></div><button onClick={() => upd('show_filter', !c.show_filter)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${c.show_filter ? 'bg-[#1B4332]' : 'bg-stone-200'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${c.show_filter ? 'translate-x-6' : 'translate-x-1'}`}></span></button></div>
        </SC>}

        {activeTab === 'styling' && (
          <div className="space-y-5">
            <SC title="Styling" icon="ri-palette-line">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 block">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={c.accent_color} onChange={(e) => upd('accent_color', e.target.value)} className="w-10 h-10 border border-stone-200 rounded-md cursor-pointer shrink-0" />
                  <input type="text" value={c.accent_color} onChange={(e) => upd('accent_color', e.target.value)} className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm uppercase focus:outline-none focus:border-[#1B4332] bg-white" />
                </div>
              </div>
            </SC>
            <SC title="Tag Colours" icon="ri-price-tag-3-line">
              <p className="text-xs text-stone-400 leading-relaxed">Control the badge colour used for each category of neighbourhood tag (shown on cards and blog posts). Each colour auto-applies based on the tag's meaning.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'tag_green', label: 'Green / Nature / Views', hint: 'leafy, park, garden, scenic, tree', sample: 'Garden' },
                  { key: 'tag_luxury', label: 'Luxury / Prestige', hint: 'luxury, premium, exclusive, historic', sample: 'Luxury' },
                  { key: 'tag_wealthy', label: 'Wealthy / Nightlife', hint: 'upscale, investment, social, bar', sample: 'Upscale' },
                  { key: 'tag_family', label: 'Family / Schools', hint: 'family, school, diplomatic, expat', sample: 'Family' },
                  { key: 'tag_young', label: 'Young Professionals', hint: 'young, starter, value, affordable', sample: 'Young' },
                  { key: 'tag_gated', label: 'Gated / Urban / Secure', hint: 'gated, corporate, central, hospital', sample: 'Gated' },
                  { key: 'tag_modern', label: 'Modern / New', hint: 'modern, contemporary, development', sample: 'Modern' },
                  { key: 'tag_default', label: 'Default (Fallback)', hint: 'any other tag', sample: 'Other' },
                ].map((t) => (
                  <div key={t.key} className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-700 block">{t.label}</label>
                    <p className="text-[11px] text-stone-400 leading-snug">{t.hint}</p>
                    <div className="flex items-center gap-2">
                      <input type="color" value={c[t.key as keyof Content] as string} onChange={(e) => upd(t.key as keyof Content, e.target.value)} className="w-10 h-10 border border-stone-200 rounded-md cursor-pointer shrink-0" />
                      <input type="text" value={c[t.key as keyof Content] as string} onChange={(e) => upd(t.key as keyof Content, e.target.value)} className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm uppercase focus:outline-none focus:border-[#1B4332] bg-white" />
                    </div>
                    <div className="pt-1">
                      <span className="inline-block px-2.5 py-1 text-white text-[11px] font-semibold uppercase tracking-[0.06em] rounded-sm" style={{ backgroundColor: c[t.key as keyof Content] as string }}>{t.sample}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SC>
          </div>
        )}

        {activeTab === 'seo' && <SC title="SEO" icon="ri-search-line"><T label="Meta Title" value={c.meta_title} onChange={(v) => upd('meta_title', v)} /><TA label="Meta Description" value={c.meta_description} onChange={(v) => upd('meta_description', v)} /><T label="Keywords" value={c.meta_keywords} onChange={(v) => upd('meta_keywords', v)} /></SC>}

        {activeTab === 'publishing' && <SC title="Publishing" icon="ri-global-line"><div className="flex items-center justify-between p-4 border border-stone-200 rounded-lg"><div><p className="text-sm font-medium text-stone-700">Status</p><p className="text-xs text-stone-400">{c.is_published ? `Published ${c.published_at ? new Date(c.published_at).toLocaleDateString() : ''}` : 'Draft'}</p></div><button onClick={pub} className={`px-4 py-2 text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap ${c.is_published ? 'bg-amber-100 text-amber-700' : 'bg-[#1B4332] text-white'}`}>{c.is_published ? 'Unpublish' : 'Publish'}</button></div></SC>}

        {activeTab === 'preview' && <SC title="Preview" icon="ri-eye-line"><div className="border border-stone-200 rounded-lg overflow-hidden"><div className="h-32 bg-gradient-to-br from-[#1B4332] to-[#2d5a3f] flex flex-col items-center justify-center text-center px-4"><p className="text-xs text-[#C9A84C] uppercase tracking-widest mb-1">{c.hero_eyebrow}</p><p className="text-lg font-bold text-white">{c.hero_title}</p><p className="text-xs text-white/70 mt-1">{c.hero_subtitle}</p></div><div className="p-4"><p className="text-sm font-semibold text-stone-700 mb-3">{c.intro_title}</p><div className={`grid gap-2 ${c.grid_columns === '2' ? 'grid-cols-2' : c.grid_columns === '4' ? 'grid-cols-4' : 'grid-cols-3'}`}>{Array.from({ length: parseInt(c.grid_columns) || 3 }).map((_, i) => <div key={i} className="h-20 bg-stone-100 rounded-lg flex items-center justify-center"><i className="ri-map-pin-line text-stone-300 text-lg"></i></div>)}</div></div></div></SC>}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div>
      </div>
    </ManagementLayout>
  );
}