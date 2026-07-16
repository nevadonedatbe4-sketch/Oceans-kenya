import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import ManagementLayout from '../ManagementLayout';

type TabKey = 'content' | 'media' | 'layout' | 'styling' | 'seo' | 'publishing' | 'preview';

interface TabDef { key: TabKey; label: string; icon: string; }

const TABS: TabDef[] = [
  { key: 'content', label: 'Content', icon: 'ri-article-line' },
  { key: 'media', label: 'Media', icon: 'ri-image-2-line' },
  { key: 'layout', label: 'Layout', icon: 'ri-layout-4-line' },
  { key: 'styling', label: 'Styling', icon: 'ri-palette-line' },
  { key: 'seo', label: 'SEO', icon: 'ri-search-line' },
  { key: 'publishing', label: 'Publishing', icon: 'ri-global-line' },
  { key: 'preview', label: 'Preview', icon: 'ri-eye-line' },
];

const PAGE_KEY = 'landlords';

interface PageContent {
  hero_title: string;
  hero_subtitle: string;
  hero_eyebrow: string;
  hero_image: string;
  section_1_title: string;
  section_1_body: string;
  section_1_image: string;
  section_2_title: string;
  section_2_body: string;
  section_2_image: string;
  section_3_title: string;
  section_3_body: string;
  section_3_image: string;
  cta_title: string;
  cta_subtitle: string;
  cta_button_text: string;
  cta_button_link: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_image: string;
  is_published: boolean;
  published_at: string | null;
  section_order: string;
  hero_height: string;
  hero_overlay_opacity: string;
  text_alignment: string;
  container_width: string;
  accent_color: string;
  font_family: string;
  custom_css: string;
}

const DEFAULTS: PageContent = {
  hero_title: 'Landlords',
  hero_subtitle: 'Maximize your property\'s potential with our expert management services',
  hero_eyebrow: 'Landlord Services',
  hero_image: '',
  section_1_title: 'Why List With Us',
  section_1_body: 'We handle everything from valuation to tenant placement, ensuring your property earns what it deserves.',
  section_1_image: '',
  section_2_title: 'Our Process',
  section_2_body: 'A simple four-step process: valuation, marketing, viewings, and tenancy — all managed by experts.',
  section_2_image: '',
  section_3_title: 'Fees & Pricing',
  section_3_body: 'Transparent fees with no hidden costs. Choose from our flexible management plans.',
  section_3_image: '',
  cta_title: 'Ready to List Your Property?',
  cta_subtitle: 'Get a free, no-obligation valuation from our expert team.',
  cta_button_text: 'Get Free Valuation',
  cta_button_link: '/valuation',
  meta_title: 'Landlords — Oceans',
  meta_description: 'Expert property management services for landlords. Get a free valuation and maximize your rental income.',
  meta_keywords: 'landlord, property management, rental, valuation',
  og_image: '',
  is_published: true,
  published_at: null,
  section_order: 'hero,section1,section2,section3,cta',
  hero_height: '500',
  hero_overlay_opacity: '40',
  text_alignment: 'left',
  container_width: '1280',
  accent_color: '#1B4332',
  font_family: 'Jost',
  custom_css: '',
};

export default function LandlordsPageCMS() {
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

  const update = (key: keyof PageContent, value: any) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const entries = Object.entries(content).map(([key, value]) => ({
      key: `page_${PAGE_KEY}_${key}`,
      value: typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value),
    }));
    const upserts = entries.map((e) =>
      supabase.from('site_settings').upsert(e, { onConflict: 'key' })
    );
    await Promise.all(upserts);

    await supabase.from('activity_logs').insert({
      action: 'page_updated',
      details: `Landlords page settings updated`,
      created_at: new Date().toISOString(),
    });

    showToast('Landlords page saved successfully', 'success');
    setSaving(false);
  };

  const handlePublish = async () => {
    const newStatus = !content.is_published;
    update('is_published', newStatus);
    update('published_at', newStatus ? new Date().toISOString() : null);
    setSaving(true);
    await supabase.from('site_settings').upsert({ key: `page_${PAGE_KEY}_is_published`, value: newStatus ? 'true' : 'false' }, { onConflict: 'key' });
    if (newStatus) {
      await supabase.from('site_settings').upsert({ key: `page_${PAGE_KEY}_published_at`, value: new Date().toISOString() }, { onConflict: 'key' });
    }
    await supabase.from('activity_logs').insert({
      action: newStatus ? 'page_published' : 'page_unpublished',
      details: `Landlords page ${newStatus ? 'published' : 'unpublished'}`,
      created_at: new Date().toISOString(),
    });
    showToast(newStatus ? 'Landlords page published!' : 'Landlords page unpublished', 'success');
    setSaving(false);
  };

  const sectionOrderOptions = [
    { value: 'hero,section1,section2,section3,cta', label: 'Hero → Sections 1-3 → CTA' },
    { value: 'hero,section2,section1,section3,cta', label: 'Hero → Section 2 → 1 → 3 → CTA' },
    { value: 'hero,section1,cta,section2,section3', label: 'Hero → Section 1 → CTA → Sections 2-3' },
  ];

  if (loading) {
    return (
      <ManagementLayout title="Landlords Page" description="" icon={<i className="ri-user-star-line text-[#1B4332] text-lg"></i>}>
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout
      title="Landlords Page"
      description="Manage the Landlords page — content, media, layout, styling, SEO and publishing controls."
      icon={<i className="ri-user-star-line text-[#1B4332] text-lg"></i>}
    >
      <div className="space-y-5 pb-24">
        {/* Tab Switcher */}
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${isActive ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}>
                  <i className={`${tab.icon} text-sm`}></i>{tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-5">
            <SectionCard title="Hero Section" icon="ri-image-2-line">
              <TextF label="Eyebrow" value={content.hero_eyebrow} onChange={(v) => update('hero_eyebrow', v)} />
              <TextF label="Title" value={content.hero_title} onChange={(v) => update('hero_title', v)} />
              <TextAreaF label="Subtitle" value={content.hero_subtitle} onChange={(v) => update('hero_subtitle', v)} />
              <ImageUploadField label="Hero Background" value={content.hero_image} onChange={(v) => update('hero_image', v)} pageKey={PAGE_KEY} fieldKey="hero_image" />
            </SectionCard>
            <SectionCard title="Section 1" icon="ri-article-line">
              <TextF label="Title" value={content.section_1_title} onChange={(v) => update('section_1_title', v)} />
              <TextAreaF label="Body" value={content.section_1_body} onChange={(v) => update('section_1_body', v)} />
              <ImageUploadField label="Image" value={content.section_1_image} onChange={(v) => update('section_1_image', v)} pageKey={PAGE_KEY} fieldKey="section_1_image" />
            </SectionCard>
            <SectionCard title="Section 2" icon="ri-article-line">
              <TextF label="Title" value={content.section_2_title} onChange={(v) => update('section_2_title', v)} />
              <TextAreaF label="Body" value={content.section_2_body} onChange={(v) => update('section_2_body', v)} />
              <ImageUploadField label="Image" value={content.section_2_image} onChange={(v) => update('section_2_image', v)} pageKey={PAGE_KEY} fieldKey="section_2_image" />
            </SectionCard>
            <SectionCard title="Section 3" icon="ri-article-line">
              <TextF label="Title" value={content.section_3_title} onChange={(v) => update('section_3_title', v)} />
              <TextAreaF label="Body" value={content.section_3_body} onChange={(v) => update('section_3_body', v)} />
              <ImageUploadField label="Image" value={content.section_3_image} onChange={(v) => update('section_3_image', v)} pageKey={PAGE_KEY} fieldKey="section_3_image" />
            </SectionCard>
            <SectionCard title="CTA Section" icon="ri-megaphone-line">
              <TextF label="Title" value={content.cta_title} onChange={(v) => update('cta_title', v)} />
              <TextAreaF label="Subtitle" value={content.cta_subtitle} onChange={(v) => update('cta_subtitle', v)} />
              <TextF label="Button Text" value={content.cta_button_text} onChange={(v) => update('cta_button_text', v)} />
              <TextF label="Button Link" value={content.cta_button_link} onChange={(v) => update('cta_button_link', v)} />
            </SectionCard>
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <SectionCard title="Page Media" icon="ri-image-2-line">
            <p className="text-xs text-stone-400 mb-4">Manage all images used on the Landlords page.</p>
            {(['hero_image', 'section_1_image', 'section_2_image', 'section_3_image'] as const).map((key) => (
              <ImageUploadField key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} value={content[key]} onChange={(v) => update(key, v)} pageKey={PAGE_KEY} fieldKey={key} previewWidth="w-24" previewHeight="h-16" />
            ))}
          </SectionCard>
        )}

        {/* Layout Tab */}
        {activeTab === 'layout' && (
          <SectionCard title="Page Layout" icon="ri-layout-4-line">
            <div className="grid grid-cols-2 gap-4">
              <SelectF label="Section Order" value={content.section_order} onChange={(v) => update('section_order', v)} options={sectionOrderOptions} />
              <TextF label="Hero Height (px)" value={content.hero_height} onChange={(v) => update('hero_height', v)} />
              <TextF label="Hero Overlay Opacity (%)" value={content.hero_overlay_opacity} onChange={(v) => update('hero_overlay_opacity', v)} />
              <SelectF label="Text Alignment" value={content.text_alignment} onChange={(v) => update('text_alignment', v)} options={[{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }]} />
              <TextF label="Container Width (px)" value={content.container_width} onChange={(v) => update('container_width', v)} />
            </div>
          </SectionCard>
        )}

        {/* Styling Tab */}
        {activeTab === 'styling' && (
          <SectionCard title="Page Styling" icon="ri-palette-line">
            <div className="grid grid-cols-2 gap-4">
              <ColorF label="Accent Color" value={content.accent_color} onChange={(v) => update('accent_color', v)} />
              <SelectF label="Font Family" value={content.font_family} onChange={(v) => update('font_family', v)} options={[{ label: 'Jost', value: 'Jost' }, { label: 'Roboto', value: 'Roboto' }, { label: 'Inter', value: 'Inter' }, { label: 'Prata', value: 'Prata' }]} />
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Custom CSS</label>
              <textarea rows={6} value={content.custom_css} onChange={(e) => update('custom_css', e.target.value)} className="w-full border border-stone-200 rounded-md px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#1B4332] resize-y" placeholder="/* Add custom CSS here */" />
            </div>
          </SectionCard>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <SectionCard title="SEO Settings" icon="ri-search-line">
            <div className="grid grid-cols-1 gap-4">
              <TextF label="Meta Title" value={content.meta_title} onChange={(v) => update('meta_title', v)} />
              <TextAreaF label="Meta Description" value={content.meta_description} onChange={(v) => update('meta_description', v)} />
              <TextF label="Meta Keywords" value={content.meta_keywords} onChange={(v) => update('meta_keywords', v)} placeholder="keyword1, keyword2, keyword3" />
              <TextF label="OG Image URL" value={content.og_image} onChange={(v) => update('og_image', v)} placeholder="https://..." />
            </div>
            <div className="mt-4 p-3 bg-stone-50 rounded-lg">
              <p className="text-xs text-stone-500 mb-2">SEO Preview</p>
              <p className="text-sm font-semibold text-[#1a0dab]">{content.meta_title || 'Landlords — Oceans'}</p>
              <p className="text-xs text-[#006621]">/landlords</p>
              <p className="text-xs text-stone-500 mt-0.5">{content.meta_description}</p>
            </div>
          </SectionCard>
        )}

        {/* Publishing Tab */}
        {activeTab === 'publishing' && (
          <SectionCard title="Publishing" icon="ri-global-line">
            <div className="flex items-center justify-between p-4 border border-stone-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-stone-700">Publication Status</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {content.is_published ? `Published ${content.published_at ? new Date(content.published_at).toLocaleDateString() : ''}` : 'Draft — not visible to public'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${content.is_published ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{content.is_published ? 'Published' : 'Draft'}</span>
                <button onClick={handlePublish} disabled={saving} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${content.is_published ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-[#1B4332] text-white hover:bg-[#163828]'}`}>
                  {content.is_published ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <SectionCard title="Live Preview" icon="ri-eye-line">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="relative" style={{ height: `${content.hero_height}px`, background: 'linear-gradient(135deg, #1B4332 0%, #2d5a3f 50%, #1B4332 100%)' }}>
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center px-6">
                  {content.hero_eyebrow && <p className="text-xs uppercase tracking-widest text-[#C9A84C] mb-2">{content.hero_eyebrow}</p>}
                  <p className="text-3xl font-bold text-white mb-3">{content.hero_title}</p>
                  <p className="text-sm text-white/70 max-w-md">{content.hero_subtitle}</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-stone-50 rounded-lg">
                  <p className="text-sm font-semibold text-stone-700">{content.section_1_title}</p>
                  <p className="text-xs text-stone-500 mt-1">{content.section_1_body}</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-lg">
                  <p className="text-sm font-semibold text-stone-700">{content.section_2_title}</p>
                  <p className="text-xs text-stone-500 mt-1">{content.section_2_body}</p>
                </div>
                <div className="p-4 bg-[#1B4332]/10 rounded-lg text-center">
                  <p className="text-sm font-semibold text-[#1B4332]">{content.cta_title}</p>
                  <p className="text-xs text-stone-500 mt-1">{content.cta_subtitle}</p>
                  <button className="mt-3 px-4 py-2 bg-[#1B4332] text-white text-sm font-medium rounded-lg whitespace-nowrap">{content.cta_button_text}</button>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Save Bar */}
        <div className="sticky bottom-0 z-10">
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4">
            <p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(content).length}</span> fields configured</p>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">
              {saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </ManagementLayout>
  );
}

/* ─── Shared Form Components ─── */
function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 flex items-center justify-center"><i className={`${icon} text-[#1B4332] text-sm`}></i></span>
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TextF({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700 block">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
    </div>
  );
}

function TextAreaF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700 block">{label}</label>
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" />
    </div>
  );
}

function SelectF({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700 block">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white cursor-pointer">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ColorF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700 block">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 border border-stone-200 rounded-md cursor-pointer shrink-0" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm uppercase focus:outline-none focus:border-[#1B4332] bg-white" />
      </div>
    </div>
  );
}