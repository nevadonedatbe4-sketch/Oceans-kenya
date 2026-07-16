import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import ManagementLayout from '../ManagementLayout';

type TabKey = 'content' | 'media' | 'layout' | 'styling' | 'seo' | 'publishing' | 'preview';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'content', label: 'Content', icon: 'ri-article-line' },
  { key: 'media', label: 'Media', icon: 'ri-image-2-line' },
  { key: 'layout', label: 'Layout', icon: 'ri-layout-4-line' },
  { key: 'styling', label: 'Styling', icon: 'ri-palette-line' },
  { key: 'seo', label: 'SEO', icon: 'ri-search-line' },
  { key: 'publishing', label: 'Publishing', icon: 'ri-global-line' },
  { key: 'preview', label: 'Preview', icon: 'ri-eye-line' },
];

const PAGE_KEY = 'landlords_images';

interface PageContent {
  image_1_url: string;
  image_1_caption: string;
  image_2_url: string;
  image_2_caption: string;
  image_3_url: string;
  image_3_caption: string;
  image_4_url: string;
  image_4_caption: string;
  grid_layout: string;
  image_height: string;
  gap_size: string;
  accent_color: string;
  custom_css: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  is_published: boolean;
  published_at: string | null;
}

const DEFAULTS: PageContent = {
  image_1_url: '',
  image_1_caption: 'Expert property valuation',
  image_2_url: '',
  image_2_caption: 'Professional marketing',
  image_3_url: '',
  image_3_caption: 'Tenant screening & placement',
  image_4_url: '',
  image_4_caption: 'Ongoing management & support',
  grid_layout: '2x2',
  image_height: '300',
  gap_size: '16',
  accent_color: '#1B4332',
  custom_css: '',
  meta_title: 'Landlord Services Gallery — Oceans',
  meta_description: 'See how we help landlords maximize their property value with professional marketing and management.',
  meta_keywords: 'landlord gallery, property services, management',
  is_published: true,
  published_at: null,
};

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1"><span className="w-5 h-5 flex items-center justify-center"><i className={`${icon} text-[#1B4332] text-sm`}></i></span><h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3></div>
      {children}
    </div>
  );
}

function Txt({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" /></div>;
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white cursor-pointer">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;
}

export default function LandlordsImagesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('content');
  const [content, setContent] = useState<PageContent>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    if (data) {
      const map = { ...DEFAULTS };
      data.forEach((r: { key: string; value: string | null }) => {
        const field = r.key.replace(`page_${PAGE_KEY}_`, '');
        if (field in map && r.value !== null) {
          if (field === 'is_published') (map as any)[field] = r.value === 'true';
          else (map as any)[field] = r.value;
        }
      });
      setContent(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const update = (key: keyof PageContent, value: any) => setContent((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const entries = Object.entries(content).map(([key, value]) => ({ key: `page_${PAGE_KEY}_${key}`, value: typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value) }));
    await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    showToast('Landlords Images page saved', 'success');
    setSaving(false);
  };

  const handlePublish = async () => {
    const ns = !content.is_published;
    update('is_published', ns);
    update('published_at', ns ? new Date().toISOString() : null);
    setSaving(true);
    await supabase.from('site_settings').upsert({ key: `page_${PAGE_KEY}_is_published`, value: ns ? 'true' : 'false' }, { onConflict: 'key' });
    showToast(ns ? 'Published!' : 'Unpublished', 'success');
    setSaving(false);
  };

  if (loading) return <ManagementLayout title="Landlords — Images & Text" description="" icon={<i className="ri-image-2-line text-[#1B4332] text-lg"></i>}><div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="Landlords — Images & Text" description="Manage image gallery and captions for the Landlords section." icon={<i className="ri-image-2-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${isActive ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${tab.icon} text-sm`}></i>{tab.label}</button>;
            })}
          </div>
        </div>

        {activeTab === 'content' && (
          <SectionCard title="Images & Captions" icon="ri-image-2-line">
            <p className="text-xs text-stone-400">Set up to 4 images with captions. They display in your chosen grid layout.</p>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="grid grid-cols-2 gap-4 p-3 bg-stone-50 rounded-lg">
                <ImageUploadField label={`Image ${n}`} value={content[`image_${n}_url` as keyof PageContent] as string} onChange={(v) => update(`image_${n}_url` as keyof PageContent, v)} pageKey={PAGE_KEY} fieldKey={`image_${n}_url`} />
                <Txt label="Caption" value={content[`image_${n}_caption` as keyof PageContent] as string} onChange={(v) => update(`image_${n}_caption` as keyof PageContent, v)} />
              </div>
            ))}
          </SectionCard>
        )}

        {activeTab === 'media' && (
          <SectionCard title="Media Overview" icon="ri-image-2-line">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-3 bg-stone-50 rounded-lg">
                  <div className="w-full h-32 border border-stone-200 rounded-md flex items-center justify-center bg-white overflow-hidden mb-2">
                    {content[`image_${n}_url` as keyof PageContent] ? <img src={content[`image_${n}_url` as keyof PageContent] as string} alt="" className="w-full h-full object-cover" /> : <i className="ri-image-line text-stone-300 text-2xl"></i>}
                  </div>
                  <p className="text-xs text-stone-500 text-center">{content[`image_${n}_caption` as keyof PageContent] || `Image ${n}`}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {activeTab === 'layout' && (
          <SectionCard title="Grid Layout" icon="ri-layout-grid-line">
            <Sel label="Grid Layout" value={content.grid_layout} onChange={(v) => update('grid_layout', v)} options={[{ label: '2x2 Grid', value: '2x2' }, { label: '4-Column Row', value: '4col' }, { label: 'Masonry', value: 'masonry' }, { label: 'Stacked', value: 'stacked' }]} />
            <Txt label="Image Height (px)" value={content.image_height} onChange={(v) => update('image_height', v)} />
            <Txt label="Gap Size (px)" value={content.gap_size} onChange={(v) => update('gap_size', v)} />
          </SectionCard>
        )}

        {activeTab === 'styling' && (
          <SectionCard title="Styling" icon="ri-palette-line">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700 block">Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={content.accent_color} onChange={(e) => update('accent_color', e.target.value)} className="w-10 h-10 border border-stone-200 rounded-md cursor-pointer shrink-0" />
                <input type="text" value={content.accent_color} onChange={(e) => update('accent_color', e.target.value)} className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm uppercase focus:outline-none focus:border-[#1B4332] bg-white" />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Custom CSS</label>
              <textarea rows={4} value={content.custom_css} onChange={(e) => update('custom_css', e.target.value)} className="w-full border border-stone-200 rounded-md px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#1B4332] resize-y" />
            </div>
          </SectionCard>
        )}

        {activeTab === 'seo' && (
          <SectionCard title="SEO Settings" icon="ri-search-line">
            <Txt label="Meta Title" value={content.meta_title} onChange={(v) => update('meta_title', v)} />
            <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">Meta Description</label><textarea rows={2} value={content.meta_description} onChange={(e) => update('meta_description', e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" /></div>
            <Txt label="Meta Keywords" value={content.meta_keywords} onChange={(v) => update('meta_keywords', v)} />
          </SectionCard>
        )}

        {activeTab === 'publishing' && (
          <SectionCard title="Publishing" icon="ri-global-line">
            <div className="flex items-center justify-between p-4 border border-stone-200 rounded-lg">
              <div><p className="text-sm font-medium text-stone-700">Status</p><p className="text-xs text-stone-400">{content.is_published ? 'Published' : 'Draft'}</p></div>
              <button onClick={handlePublish} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${content.is_published ? 'bg-amber-100 text-amber-700' : 'bg-[#1B4332] text-white'}`}>{content.is_published ? 'Unpublish' : 'Publish'}</button>
            </div>
          </SectionCard>
        )}

        {activeTab === 'preview' && (
          <SectionCard title="Preview" icon="ri-eye-line">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="border border-stone-200 rounded-lg overflow-hidden">
                  <div className="h-32 bg-stone-100 flex items-center justify-center">{content[`image_${n}_url` as keyof PageContent] ? <img src={content[`image_${n}_url` as keyof PageContent] as string} alt="" className="w-full h-full object-cover" /> : <i className="ri-image-line text-stone-300 text-2xl"></i>}</div>
                  <p className="p-2 text-xs text-stone-500 text-center">{content[`image_${n}_caption` as keyof PageContent] || `Image ${n}`}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(content).length}</span> fields</p><button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div>
      </div>
    </ManagementLayout>
  );
}