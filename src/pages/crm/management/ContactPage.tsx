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
  hero_title: string; hero_subtitle: string; hero_image: string;
  address_line1: string; address_line2: string; phone: string; email: string; whatsapp: string;
  office_hours_weekday: string; office_hours_saturday: string; office_hours_sunday: string;
  map_embed_url: string; map_lat: string; map_lng: string;
  form_heading: string; form_subheading: string;
  cta_title: string; cta_subtitle: string; cta_button_text: string; cta_button_link: string;
  section_order: string; hero_height: string; accent_color: string;
  meta_title: string; meta_description: string; meta_keywords: string;
  is_published: boolean; published_at: string | null;
}

const DEFAULTS: Content = {
  hero_title: 'Contact Us', hero_subtitle: 'We\'d love to hear from you', hero_image: '',
  address_line1: 'Riverside Drive, Westlands', address_line2: 'Nairobi, Kenya',
  phone: '+254 703712984', email: 'ask@oceanske.com', whatsapp: '+254 703712984',
  office_hours_weekday: 'Mon — Fri: 9:00 AM — 6:00 PM', office_hours_saturday: 'Saturday: 10:00 AM — 2:00 PM', office_hours_sunday: 'Sunday: Closed',
  map_embed_url: '', map_lat: '-1.2921', map_lng: '36.8219',
  form_heading: 'Send Us a Message', form_subheading: 'Fill in the form and our team will get back to you within 24 hours.',
  cta_title: 'Prefer a Call?', cta_subtitle: 'Speak directly with one of our agents.', cta_button_text: 'Call Now', cta_button_link: 'tel:+254703712984',
  section_order: 'hero,info,form,map,cta', hero_height: '350', accent_color: '#1B4332',
  meta_title: 'Contact Us — Oceans', meta_description: 'Get in touch with our team. Visit our office in Westlands, Nairobi or send us a message online.', meta_keywords: 'contact, get in touch, real estate contact',
  is_published: true, published_at: null,
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

export default function ContactPageCMS() {
  const [activeTab, setActiveTab] = useState<TabKey>('content');
  const [c, setC] = useState<Content>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const PAGE_KEY = 'contact_page';

  const fetchC = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    if (data) {
      const map = { ...DEFAULTS };
      data.forEach((r: { key: string; value: string | null }) => {
        const f = r.key.replace(`page_${PAGE_KEY}_`, '');
        if (f in map && r.value !== null) { if (f === 'is_published') (map as any)[f] = r.value === 'true'; else (map as any)[f] = r.value; }
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
    showToast('Contact page saved', 'success'); setSaving(false);
  };
  const pub = async () => {
    const ns = !c.is_published; upd('is_published', ns); upd('published_at', ns ? new Date().toISOString() : null);
    setSaving(true); await supabase.from('site_settings').upsert({ key: `page_${PAGE_KEY}_is_published`, value: ns ? 'true' : 'false' }, { onConflict: 'key' });
    showToast(ns ? 'Published!' : 'Unpublished', 'success'); setSaving(false);
  };

  if (loading) return <ManagementLayout title="Contact Page" description="" icon={<i className="ri-mail-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="Contact Page" description="Manage the Contact page — office details, map, opening hours and form settings." icon={<i className="ri-mail-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const isA = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${isA ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'content' && (
          <div className="space-y-5">
            <SC title="Hero" icon="ri-image-2-line"><T label="Title" value={c.hero_title} onChange={(v) => upd('hero_title', v)} /><TA label="Subtitle" value={c.hero_subtitle} onChange={(v) => upd('hero_subtitle', v)} /><ImageUploadField label="Hero Image" value={c.hero_image} onChange={(v) => upd('hero_image', v)} pageKey={PAGE_KEY} fieldKey="hero_image" /></SC>
            <SC title="Contact Details" icon="ri-contacts-book-2-line">
              <T label="Address Line 1" value={c.address_line1} onChange={(v) => upd('address_line1', v)} />
              <T label="Address Line 2" value={c.address_line2} onChange={(v) => upd('address_line2', v)} />
              <T label="Phone" value={c.phone} onChange={(v) => upd('phone', v)} />
              <T label="Email" value={c.email} onChange={(v) => upd('email', v)} />
              <T label="WhatsApp" value={c.whatsapp} onChange={(v) => upd('whatsapp', v)} />
            </SC>
            <SC title="Opening Hours" icon="ri-time-line">
              <T label="Weekdays" value={c.office_hours_weekday} onChange={(v) => upd('office_hours_weekday', v)} />
              <T label="Saturday" value={c.office_hours_saturday} onChange={(v) => upd('office_hours_saturday', v)} />
              <T label="Sunday" value={c.office_hours_sunday} onChange={(v) => upd('office_hours_sunday', v)} />
            </SC>
            <SC title="Map Settings" icon="ri-map-pin-line">
              <T label="Google Maps Embed URL" value={c.map_embed_url} onChange={(v) => upd('map_embed_url', v)} />
              <div className="grid grid-cols-2 gap-3"><T label="Latitude" value={c.map_lat} onChange={(v) => upd('map_lat', v)} /><T label="Longitude" value={c.map_lng} onChange={(v) => upd('map_lng', v)} /></div>
            </SC>
            <SC title="Contact Form" icon="ri-chat-3-line">
              <T label="Form Heading" value={c.form_heading} onChange={(v) => upd('form_heading', v)} />
              <TA label="Form Subheading" value={c.form_subheading} onChange={(v) => upd('form_subheading', v)} />
            </SC>
            <SC title="CTA" icon="ri-megaphone-line"><T label="Title" value={c.cta_title} onChange={(v) => upd('cta_title', v)} /><TA label="Subtitle" value={c.cta_subtitle} onChange={(v) => upd('cta_subtitle', v)} /><T label="Button Text" value={c.cta_button_text} onChange={(v) => upd('cta_button_text', v)} /><T label="Button Link" value={c.cta_button_link} onChange={(v) => upd('cta_button_link', v)} /></SC>
          </div>
        )}

        {activeTab === 'media' && <SC title="Page Images" icon="ri-image-2-line"><ImageUploadField label="Hero Image" value={c.hero_image} onChange={(v) => upd('hero_image', v)} pageKey={PAGE_KEY} fieldKey="hero_image" previewWidth="w-24" previewHeight="h-16" /></SC>}

        {activeTab === 'layout' && <SC title="Layout" icon="ri-layout-4-line"><div className="grid grid-cols-2 gap-4"><T label="Hero Height (px)" value={c.hero_height} onChange={(v) => upd('hero_height', v)} /><T label="Section Order" value={c.section_order} onChange={(v) => upd('section_order', v)} /></div></SC>}

        {activeTab === 'styling' && <SC title="Styling" icon="ri-palette-line"><div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">Accent Color</label><div className="flex items-center gap-2"><input type="color" value={c.accent_color} onChange={(e) => upd('accent_color', e.target.value)} className="w-10 h-10 border border-stone-200 rounded-md cursor-pointer shrink-0" /><input type="text" value={c.accent_color} onChange={(e) => upd('accent_color', e.target.value)} className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm uppercase focus:outline-none focus:border-[#1B4332] bg-white" /></div></div></SC>}

        {activeTab === 'seo' && <SC title="SEO" icon="ri-search-line"><T label="Meta Title" value={c.meta_title} onChange={(v) => upd('meta_title', v)} /><TA label="Meta Description" value={c.meta_description} onChange={(v) => upd('meta_description', v)} /><T label="Keywords" value={c.meta_keywords} onChange={(v) => upd('meta_keywords', v)} /></SC>}

        {activeTab === 'publishing' && <SC title="Publishing" icon="ri-global-line"><div className="flex items-center justify-between p-4 border border-stone-200 rounded-lg"><div><p className="text-sm font-medium text-stone-700">Status</p><p className="text-xs text-stone-400">{c.is_published ? `Published ${c.published_at ? new Date(c.published_at).toLocaleDateString() : ''}` : 'Draft'}</p></div><button onClick={pub} className={`px-4 py-2 text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap ${c.is_published ? 'bg-amber-100 text-amber-700' : 'bg-[#1B4332] text-white'}`}>{c.is_published ? 'Unpublish' : 'Publish'}</button></div></SC>}

        {activeTab === 'preview' && <SC title="Preview" icon="ri-eye-line"><div className="border border-stone-200 rounded-lg overflow-hidden"><div className="h-32 bg-gradient-to-br from-[#1B4332] to-[#2d5a3f] flex flex-col items-center justify-center text-center px-4"><p className="text-lg font-bold text-white">{c.hero_title}</p><p className="text-xs text-white/70">{c.hero_subtitle}</p></div><div className="p-4 grid grid-cols-2 gap-3"><div className="space-y-1"><p className="text-xs font-semibold text-stone-700">Address</p><p className="text-xs text-stone-500">{c.address_line1}</p><p className="text-xs text-stone-500">{c.address_line2}</p></div><div className="space-y-1"><p className="text-xs font-semibold text-stone-700">Contact</p><p className="text-xs text-stone-500">{c.phone}</p><p className="text-xs text-stone-500">{c.email}</p></div></div></div></SC>}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div>
      </div>
    </ManagementLayout>
  );
}