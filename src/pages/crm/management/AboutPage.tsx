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
  mission_title: string; mission_body: string; mission_image: string;
  team_title: string; team_1_name: string; team_1_role: string; team_1_bio: string; team_1_image: string;
  team_2_name: string; team_2_role: string; team_2_bio: string; team_2_image: string;
  team_3_name: string; team_3_role: string; team_3_bio: string; team_3_image: string;
  stats_title: string; stat_1_value: string; stat_1_label: string; stat_2_value: string; stat_2_label: string; stat_3_value: string; stat_3_label: string;
  cta_title: string; cta_subtitle: string; cta_button_text: string; cta_button_link: string;
  section_order: string; hero_height: string; accent_color: string;
  meta_title: string; meta_description: string; meta_keywords: string;
  is_published: boolean; published_at: string | null;
}

const DEFAULTS: Content = {
  hero_title: 'About Us', hero_subtitle: 'Your trusted real estate partner since 2010', hero_image: '',
  mission_title: 'Our Mission', mission_body: 'To connect people with exceptional properties and deliver an unparalleled real estate experience across East Africa.', mission_image: '',
  team_title: 'Meet Our Team', team_1_name: 'Jane Mwangi', team_1_role: 'Managing Director', team_1_bio: '20+ years in real estate across East Africa.', team_1_image: '',
  team_2_name: 'David Ochieng', team_2_role: 'Head of Sales', team_2_bio: 'Specialist in luxury and commercial properties.', team_2_image: '',
  team_3_name: 'Amina Hassan', team_3_role: 'Head of Lettings', team_3_bio: 'Expert in residential lettings and property management.', team_3_image: '',
  stats_title: 'By the Numbers', stat_1_value: '500+', stat_1_label: 'Properties Sold', stat_2_value: '1,200+', stat_2_label: 'Happy Clients', stat_3_value: '15+', stat_3_label: 'Years Experience',
  cta_title: 'Work With Us', cta_subtitle: 'Join hundreds of satisfied clients who found their dream property.', cta_button_text: 'Get in Touch', cta_button_link: '/contact',
  section_order: 'hero,mission,stats,team,cta', hero_height: '400', accent_color: '#1B4332',
  meta_title: 'About Us — Oceans', meta_description: 'Learn about our team, mission, and track record. Your trusted real estate partner in East Africa since 2010.', meta_keywords: 'about us, real estate team, property experts',
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

export default function AboutPageCMS() {
  const [activeTab, setActiveTab] = useState<TabKey>('content');
  const [c, setC] = useState<Content>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const PAGE_KEY = 'about';

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
    showToast('About page saved', 'success'); setSaving(false);
  };
  const pub = async () => {
    const ns = !c.is_published; upd('is_published', ns); upd('published_at', ns ? new Date().toISOString() : null);
    setSaving(true); await supabase.from('site_settings').upsert({ key: `page_${PAGE_KEY}_is_published`, value: ns ? 'true' : 'false' }, { onConflict: 'key' });
    showToast(ns ? 'Published!' : 'Unpublished', 'success'); setSaving(false);
  };

  if (loading) return <ManagementLayout title="About Us Page" description="" icon={<i className="ri-information-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="About Us Page" description="Manage the About Us page content, team profiles, and statistics." icon={<i className="ri-information-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const isA = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${isA ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'content' && (
          <div className="space-y-5">
            <SC title="Hero" icon="ri-image-2-line"><T label="Title" value={c.hero_title} onChange={(v) => upd('hero_title', v)} /><TA label="Subtitle" value={c.hero_subtitle} onChange={(v) => upd('hero_subtitle', v)} /><ImageUploadField label="Hero Image" value={c.hero_image} onChange={(v) => upd('hero_image', v)} pageKey={PAGE_KEY} fieldKey="hero_image" /></SC>
            <SC title="Mission" icon="ri-flag-line"><T label="Title" value={c.mission_title} onChange={(v) => upd('mission_title', v)} /><TA label="Body" value={c.mission_body} onChange={(v) => upd('mission_body', v)} /><ImageUploadField label="Image" value={c.mission_image} onChange={(v) => upd('mission_image', v)} pageKey={PAGE_KEY} fieldKey="mission_image" /></SC>
            <SC title="Team Members" icon="ri-team-line"><T label="Section Title" value={c.team_title} onChange={(v) => upd('team_title', v)} />
              {[1,2,3].map((n) => <div key={n} className="p-3 bg-stone-50 rounded-lg space-y-2"><p className="text-xs font-semibold text-stone-500 uppercase">Member {n}</p><T label="Name" value={c[`team_${n}_name` as keyof Content] as string} onChange={(v) => upd(`team_${n}_name` as keyof Content, v)} /><T label="Role" value={c[`team_${n}_role` as keyof Content] as string} onChange={(v) => upd(`team_${n}_role` as keyof Content, v)} /><TA label="Bio" value={c[`team_${n}_bio` as keyof Content] as string} onChange={(v) => upd(`team_${n}_bio` as keyof Content, v)} /><ImageUploadField label="Photo" value={c[`team_${n}_image` as keyof Content] as string} onChange={(v) => upd(`team_${n}_image` as keyof Content, v)} pageKey={PAGE_KEY} fieldKey={`team_${n}_image`} /></div>)}
            </SC>
            <SC title="Statistics" icon="ri-bar-chart-line"><T label="Section Title" value={c.stats_title} onChange={(v) => upd('stats_title', v)} />
              {[1,2,3].map((n) => <div key={n} className="grid grid-cols-2 gap-3"><T label={`Stat ${n} Value`} value={c[`stat_${n}_value` as keyof Content] as string} onChange={(v) => upd(`stat_${n}_value` as keyof Content, v)} /><T label={`Stat ${n} Label`} value={c[`stat_${n}_label` as keyof Content] as string} onChange={(v) => upd(`stat_${n}_label` as keyof Content, v)} /></div>)}
            </SC>
            <SC title="CTA" icon="ri-megaphone-line"><T label="Title" value={c.cta_title} onChange={(v) => upd('cta_title', v)} /><TA label="Subtitle" value={c.cta_subtitle} onChange={(v) => upd('cta_subtitle', v)} /><T label="Button Text" value={c.cta_button_text} onChange={(v) => upd('cta_button_text', v)} /><T label="Button Link" value={c.cta_button_link} onChange={(v) => upd('cta_button_link', v)} /></SC>
          </div>
        )}

        {activeTab === 'media' && <SC title="Page Images" icon="ri-image-2-line">{[{ k: 'hero_image' as const, l: 'Hero' }, { k: 'mission_image' as const, l: 'Mission' }, { k: 'team_1_image' as const, l: 'Team 1' }, { k: 'team_2_image' as const, l: 'Team 2' }, { k: 'team_3_image' as const, l: 'Team 3' }].map(({ k, l }) => <ImageUploadField key={k} label={l} value={c[k]} onChange={(v) => upd(k, v)} pageKey={PAGE_KEY} fieldKey={k} previewWidth="w-24" previewHeight="h-16" />)}</SC>}

        {activeTab === 'layout' && <SC title="Layout" icon="ri-layout-4-line"><div className="grid grid-cols-2 gap-4"><T label="Hero Height (px)" value={c.hero_height} onChange={(v) => upd('hero_height', v)} /><T label="Section Order" value={c.section_order} onChange={(v) => upd('section_order', v)} /></div></SC>}

        {activeTab === 'styling' && <SC title="Styling" icon="ri-palette-line"><div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">Accent Color</label><div className="flex items-center gap-2"><input type="color" value={c.accent_color} onChange={(e) => upd('accent_color', e.target.value)} className="w-10 h-10 border border-stone-200 rounded-md cursor-pointer shrink-0" /><input type="text" value={c.accent_color} onChange={(e) => upd('accent_color', e.target.value)} className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm uppercase focus:outline-none focus:border-[#1B4332] bg-white" /></div></div></SC>}

        {activeTab === 'seo' && <SC title="SEO" icon="ri-search-line"><T label="Meta Title" value={c.meta_title} onChange={(v) => upd('meta_title', v)} /><TA label="Meta Description" value={c.meta_description} onChange={(v) => upd('meta_description', v)} /><T label="Keywords" value={c.meta_keywords} onChange={(v) => upd('meta_keywords', v)} /></SC>}

        {activeTab === 'publishing' && <SC title="Publishing" icon="ri-global-line"><div className="flex items-center justify-between p-4 border border-stone-200 rounded-lg"><div><p className="text-sm font-medium text-stone-700">Status</p><p className="text-xs text-stone-400">{c.is_published ? `Published ${c.published_at ? new Date(c.published_at).toLocaleDateString() : ''}` : 'Draft'}</p></div><button onClick={pub} className={`px-4 py-2 text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap ${c.is_published ? 'bg-amber-100 text-amber-700' : 'bg-[#1B4332] text-white'}`}>{c.is_published ? 'Unpublish' : 'Publish'}</button></div></SC>}

        {activeTab === 'preview' && <SC title="Preview" icon="ri-eye-line"><div className="border border-stone-200 rounded-lg overflow-hidden"><div className="h-36 bg-gradient-to-br from-[#1B4332] to-[#2d5a3f] flex flex-col items-center justify-center text-center px-4"><p className="text-xl font-bold text-white">{c.hero_title}</p><p className="text-xs text-white/70 mt-1">{c.hero_subtitle}</p></div><div className="p-4 space-y-3"><p className="text-sm font-semibold text-stone-700">{c.mission_title}</p><div className="grid grid-cols-3 gap-2 text-center">{[1,2,3].map((n) => <div key={n} className="p-2"><p className="text-lg font-bold text-[#1B4332]">{c[`stat_${n}_value` as keyof Content] as string}</p><p className="text-[10px] text-stone-400">{c[`stat_${n}_label` as keyof Content] as string}</p></div>)}</div><div className="grid grid-cols-3 gap-3">{[1,2,3].map((n) => <div key={n} className="text-center"><div className="w-10 h-10 rounded-full bg-stone-200 mx-auto mb-1"></div><p className="text-xs font-medium text-stone-700">{c[`team_${n}_name` as keyof Content] as string}</p><p className="text-[10px] text-stone-400">{c[`team_${n}_role` as keyof Content] as string}</p></div>)}</div></div></div></SC>}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div>
      </div>
    </ManagementLayout>
  );
}