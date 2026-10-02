import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import ManagementLayout from '../ManagementLayout';
import { DEFAULT_CONTACT_PAGE_CONTENT, invalidateContactPageContentCache, type ContactPageContent } from '@/hooks/useContactPageContent';

type TabKey = 'hero' | 'quick' | 'form' | 'sidebar' | 'hours' | 'office' | 'preview';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'hero', label: 'Hero', icon: 'ri-image-2-line' },
  { key: 'quick', label: 'Quick Links', icon: 'ri-links-line' },
  { key: 'form', label: 'Form Copy', icon: 'ri-chat-3-line' },
  { key: 'sidebar', label: 'Sidebar', icon: 'ri-layout-right-2-line' },
  { key: 'hours', label: 'Office Hours', icon: 'ri-time-line' },
  { key: 'office', label: 'Find Office', icon: 'ri-map-pin-line' },
  { key: 'preview', label: 'Preview', icon: 'ri-eye-line' },
];

const PAGE_KEY = 'contact_page';

function SC({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4"><div className="flex items-center gap-2 mb-1"><span className="w-5 h-5 flex items-center justify-center"><i className={`${icon} text-[#1B4332] text-sm`}></i></span><h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3></div>{children}</div>;
}
function TextF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" /></div>;
}
function TextAreaF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" /></div>;
}

export default function ContactPageCMS() {
  const [activeTab, setActiveTab] = useState<TabKey>('hero');
  const [c, setC] = useState<ContactPageContent>(DEFAULT_CONTACT_PAGE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    if (data) {
      const map = { ...DEFAULT_CONTACT_PAGE_CONTENT };
      data.forEach((r: { key: string; value: string | null }) => {
        const f = r.key.replace(`page_${PAGE_KEY}_`, '');
        if (!(f in map) || r.value === null) return;
        if (['quick_links', 'hours'].includes(f)) {
          try { (map as any)[f] = JSON.parse(r.value); } catch { /* keep default */ }
        } else {
          (map as any)[f] = r.value;
        }
      });
      setC(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const upd = (key: keyof ContactPageContent, value: unknown) => setC((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    const entries = Object.entries(c).map(([k, v]) => ({
      key: `page_${PAGE_KEY}_${k}`,
      value: Array.isArray(v) ? JSON.stringify(v) : String(v),
    }));
    await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    invalidateContactPageContentCache();
    showToast('Contact page saved', 'success');
    setSaving(false);
  };

  if (loading) return <ManagementLayout title="Contact Page" description="" icon={<i className="ri-mail-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="Contact Page" description="Edit the Contact page hero, quick links, form copy, sidebar, office hours and location block." icon={<i className="ri-mail-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const a = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${a ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'hero' && (
          <SC title="Hero" icon="ri-image-2-line">
            <TextF label="Eyebrow" value={c.hero_eyebrow} onChange={(v) => upd('hero_eyebrow', v)} />
            <TextF label="Title" value={c.hero_title} onChange={(v) => upd('hero_title', v)} />
            <TextAreaF label="Subtitle" value={c.hero_subtitle} onChange={(v) => upd('hero_subtitle', v)} />
            <ImageUploadField label="Hero Background" value={c.hero_image} onChange={(v) => upd('hero_image', v)} pageKey={PAGE_KEY} fieldKey="hero_image" />
          </SC>
        )}

        {activeTab === 'quick' && (
          <SC title="Quick Links Strip" icon="ri-links-line">
            <p className="text-xs text-stone-400">The four shortcut links below the hero.</p>
            {c.quick_links.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 p-3 bg-stone-50 rounded-lg items-end">
                <TextF label="Icon" value={l.icon} onChange={(v) => upd('quick_links', c.quick_links.map((x, j) => (j === i ? { ...x, icon: v } : x)))} />
                <TextF label="Label" value={l.label} onChange={(v) => upd('quick_links', c.quick_links.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                <TextF label="Link" value={l.link} onChange={(v) => upd('quick_links', c.quick_links.map((x, j) => (j === i ? { ...x, link: v } : x)))} />
                <button onClick={() => upd('quick_links', c.quick_links.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer pb-2">Remove</button>
              </div>
            ))}
            <button onClick={() => upd('quick_links', [...c.quick_links, { icon: 'ri-link', label: 'New Link', link: '/' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add link</button>
          </SC>
        )}

        {activeTab === 'form' && (
          <SC title="Contact Form Copy" icon="ri-chat-3-line">
            <TextF label="Eyebrow" value={c.form_eyebrow} onChange={(v) => upd('form_eyebrow', v)} />
            <TextF label="Heading" value={c.form_heading} onChange={(v) => upd('form_heading', v)} />
            <TextAreaF label="Intro Text" value={c.form_text} onChange={(v) => upd('form_text', v)} />
            <TextF label="Footnote (under submit)" value={c.form_footnote} onChange={(v) => upd('form_footnote', v)} />
          </SC>
        )}

        {activeTab === 'sidebar' && (
          <div className="space-y-5">
            <SC title="Sidebar Header & Image" icon="ri-layout-right-2-line">
              <TextF label="Eyebrow" value={c.sidebar_eyebrow} onChange={(v) => upd('sidebar_eyebrow', v)} />
              <TextF label="Heading" value={c.sidebar_heading} onChange={(v) => upd('sidebar_heading', v)} />
              <ImageUploadField label="Office Photo" value={c.office_image} onChange={(v) => upd('office_image', v)} pageKey={PAGE_KEY} fieldKey="office_image" />
              <TextF label="Open Status Label" value={c.open_status_label} onChange={(v) => upd('open_status_label', v)} />
            </SC>
            <SC title="Sidebar Card Headings" icon="ri-layout-right-2-line">
              <TextF label="Details Heading" value={c.details_heading} onChange={(v) => upd('details_heading', v)} />
              <TextF label="Email Heading" value={c.email_heading} onChange={(v) => upd('email_heading', v)} />
              <TextF label="Social Heading" value={c.social_heading} onChange={(v) => upd('social_heading', v)} />
            </SC>
            <SC title="Valuation CTA Card" icon="ri-bar-chart-2-line">
              <TextF label="Title" value={c.valuation_title} onChange={(v) => upd('valuation_title', v)} />
              <TextF label="Text" value={c.valuation_text} onChange={(v) => upd('valuation_text', v)} />
            </SC>
          </div>
        )}

        {activeTab === 'hours' && (
          <SC title="Office Hours" icon="ri-time-line">
            <TextF label="Card Heading" value={c.hours_heading} onChange={(v) => upd('hours_heading', v)} />
            {c.hours.map((h, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 p-3 bg-stone-50 rounded-lg items-end">
                <TextF label="Day" value={h.day} onChange={(v) => upd('hours', c.hours.map((x, j) => (j === i ? { ...x, day: v } : x)))} />
                <TextF label="Hours" value={h.hours} onChange={(v) => upd('hours', c.hours.map((x, j) => (j === i ? { ...x, hours: v } : x)))} />
                <button onClick={() => upd('hours', c.hours.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer pb-2">Remove</button>
              </div>
            ))}
            <button onClick={() => upd('hours', [...c.hours, { day: 'Day', hours: 'Closed' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add day</button>
          </SC>
        )}

        {activeTab === 'office' && (
          <SC title="Find Our Office" icon="ri-map-pin-line">
            <TextF label="Eyebrow" value={c.find_eyebrow} onChange={(v) => upd('find_eyebrow', v)} />
            <TextF label="Heading" value={c.find_heading} onChange={(v) => upd('find_heading', v)} />
            <TextF label="Address Column Title" value={c.find_address_title} onChange={(v) => upd('find_address_title', v)} />
            <TextF label="Getting Here Title" value={c.find_getting_title} onChange={(v) => upd('find_getting_title', v)} />
            <TextAreaF label="Getting Here Text" value={c.find_getting_text} onChange={(v) => upd('find_getting_text', v)} />
            <TextF label="Book a Meeting Title" value={c.find_book_title} onChange={(v) => upd('find_book_title', v)} />
            <TextAreaF label="Book a Meeting Text" value={c.find_book_text} onChange={(v) => upd('find_book_text', v)} />
            <TextF label="Book Button Label" value={c.find_book_button} onChange={(v) => upd('find_book_button', v)} />
          </SC>
        )}

        {activeTab === 'preview' && (
          <SC title="Live Preview" icon="ri-eye-line">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="relative h-36 bg-[#1B4332] flex flex-col items-center justify-center text-center px-4">
                <p className="text-[10px] uppercase tracking-widest text-[#C9A84C] mb-1">{c.hero_eyebrow}</p>
                <p className="text-xl font-bold text-white">{c.hero_title}</p>
                <p className="text-xs text-white/70 mt-1 max-w-md">{c.hero_subtitle}</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                <div><p className="text-xs font-bold text-[#1B4332] mb-1">{c.form_heading}</p><p className="text-[10px] text-stone-500">{c.form_text}</p></div>
                <div><p className="text-xs font-bold text-[#1B4332] mb-1">{c.sidebar_heading}</p>{c.hours.slice(0, 3).map((h, i) => <p key={i} className="text-[10px] text-stone-500 flex justify-between"><span>{h.day}</span><span>{h.hours}</span></p>)}</div>
              </div>
            </div>
          </SC>
        )}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div>
      </div>
    </ManagementLayout>
  );
}