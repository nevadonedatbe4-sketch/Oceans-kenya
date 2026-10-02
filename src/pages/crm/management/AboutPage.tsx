import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import ManagementLayout from '../ManagementLayout';
import { DEFAULT_ABOUT_CONTENT, invalidateAboutPageContentCache, type AboutPageContent } from '@/hooks/useAboutPageContent';

type TabKey = 'intro' | 'stats' | 'why' | 'mission' | 'story' | 'cta' | 'preview';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'intro', label: 'Intro', icon: 'ri-article-line' },
  { key: 'stats', label: 'Stats', icon: 'ri-bar-chart-line' },
  { key: 'why', label: 'Why Choose', icon: 'ri-award-line' },
  { key: 'mission', label: 'Mission & Vision', icon: 'ri-flag-line' },
  { key: 'story', label: 'Our Story', icon: 'ri-book-open-line' },
  { key: 'cta', label: 'CTA', icon: 'ri-megaphone-line' },
  { key: 'preview', label: 'Preview', icon: 'ri-eye-line' },
];

const PAGE_KEY = 'about';

function SC({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4"><div className="flex items-center gap-2 mb-1"><span className="w-5 h-5 flex items-center justify-center"><i className={`${icon} text-[#1B4332] text-sm`}></i></span><h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3></div>{children}</div>;
}
function TextF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" /></div>;
}
function TextAreaF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" /></div>;
}

export default function AboutPageCMS() {
  const [activeTab, setActiveTab] = useState<TabKey>('intro');
  const [c, setC] = useState<AboutPageContent>(DEFAULT_ABOUT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    if (data) {
      const map = { ...DEFAULT_ABOUT_CONTENT };
      data.forEach((r: { key: string; value: string | null }) => {
        const f = r.key.replace(`page_${PAGE_KEY}_`, '');
        if (!(f in map) || r.value === null) return;
        if (['stats', 'why_cards', 'values', 'timeline'].includes(f)) {
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

  const upd = (key: keyof AboutPageContent, value: unknown) => setC((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    const entries = Object.entries(c).map(([k, v]) => ({
      key: `page_${PAGE_KEY}_${k}`,
      value: Array.isArray(v) ? JSON.stringify(v) : String(v),
    }));
    await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    invalidateAboutPageContentCache();
    showToast('About page saved', 'success');
    setSaving(false);
  };

  if (loading) return <ManagementLayout title="About Us Page" description="" icon={<i className="ri-information-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="About Us Page" description="Edit every heading, paragraph, card, statistic and button on the About Us page." icon={<i className="ri-information-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const a = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${a ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'intro' && (
          <div className="space-y-5">
            <SC title="Heading" icon="ri-article-line">
              <TextF label="Eyebrow" value={c.intro_eyebrow} onChange={(v) => upd('intro_eyebrow', v)} />
              <TextF label="Page Title (H1)" value={c.intro_title} onChange={(v) => upd('intro_title', v)} />
            </SC>
            <SC title="Intro Text" icon="ri-text">
              <TextAreaF label="Paragraph 1" value={c.intro_p1} onChange={(v) => upd('intro_p1', v)} />
              <TextAreaF label="Paragraph 2" value={c.intro_p2} onChange={(v) => upd('intro_p2', v)} />
              <TextF label="Paragraph 3 — bold lead" value={c.intro_p3_lead} onChange={(v) => upd('intro_p3_lead', v)} />
              <TextAreaF label="Paragraph 3 — body" value={c.intro_p3_body} onChange={(v) => upd('intro_p3_body', v)} />
            </SC>
            <SC title="Image & Badge" icon="ri-image-2-line">
              <ImageUploadField label="Intro Image" value={c.intro_image} onChange={(v) => upd('intro_image', v)} pageKey={PAGE_KEY} fieldKey="intro_image" />
              <div className="grid grid-cols-2 gap-3"><TextF label="Badge Value" value={c.intro_badge_value} onChange={(v) => upd('intro_badge_value', v)} /><TextF label="Badge Label" value={c.intro_badge_label} onChange={(v) => upd('intro_badge_label', v)} /></div>
            </SC>
            <SC title="Buttons" icon="ri-links-line">
              <div className="grid grid-cols-2 gap-3"><TextF label="Button 1 Label" value={c.intro_btn1_label} onChange={(v) => upd('intro_btn1_label', v)} /><TextF label="Button 1 Link" value={c.intro_btn1_link} onChange={(v) => upd('intro_btn1_link', v)} /></div>
              <div className="grid grid-cols-2 gap-3"><TextF label="Button 2 Label" value={c.intro_btn2_label} onChange={(v) => upd('intro_btn2_label', v)} /><TextF label="Button 2 Link" value={c.intro_btn2_link} onChange={(v) => upd('intro_btn2_link', v)} /></div>
            </SC>
          </div>
        )}

        {activeTab === 'stats' && (
          <SC title="Statistics" icon="ri-bar-chart-line">
            <p className="text-xs text-stone-400">The four stats shown in the blue band.</p>
            {c.stats.map((s, i) => (
              <div key={i} className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-lg">
                <TextF label={`Stat ${i + 1} Value`} value={s.value} onChange={(v) => upd('stats', c.stats.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
                <TextF label={`Stat ${i + 1} Label`} value={s.label} onChange={(v) => upd('stats', c.stats.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
              </div>
            ))}
            <button onClick={() => upd('stats', [...c.stats, { value: '0', label: 'New Stat' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add stat</button>
          </SC>
        )}

        {activeTab === 'why' && (
          <SC title="Why Choose Oceans — Cards" icon="ri-award-line">
            <TextF label="Eyebrow" value={c.why_eyebrow} onChange={(v) => upd('why_eyebrow', v)} />
            <TextF label="Heading" value={c.why_heading} onChange={(v) => upd('why_heading', v)} />
            {c.why_cards.map((card, i) => (
              <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Card {i + 1}</p><button onClick={() => upd('why_cards', c.why_cards.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                <div className="grid grid-cols-2 gap-3"><TextF label="Icon (Remix class)" value={card.icon} onChange={(v) => upd('why_cards', c.why_cards.map((x, j) => (j === i ? { ...x, icon: v } : x)))} /><TextF label="Title" value={card.title} onChange={(v) => upd('why_cards', c.why_cards.map((x, j) => (j === i ? { ...x, title: v } : x)))} /></div>
                <TextAreaF label="Description" value={card.desc} onChange={(v) => upd('why_cards', c.why_cards.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
              </div>
            ))}
            <button onClick={() => upd('why_cards', [...c.why_cards, { icon: 'ri-star-line', title: 'New Card', desc: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add card</button>
          </SC>
        )}

        {activeTab === 'mission' && (
          <div className="space-y-5">
            <SC title="Section Header" icon="ri-flag-line">
              <TextF label="Eyebrow" value={c.mission_eyebrow} onChange={(v) => upd('mission_eyebrow', v)} />
              <TextF label="Heading" value={c.mission_heading} onChange={(v) => upd('mission_heading', v)} />
              <ImageUploadField label="Background Image" value={c.mission_bg_image} onChange={(v) => upd('mission_bg_image', v)} pageKey={PAGE_KEY} fieldKey="mission_bg_image" />
            </SC>
            <SC title="Mission & Vision" icon="ri-compass-3-line">
              <TextF label="Mission Label" value={c.mission_label} onChange={(v) => upd('mission_label', v)} />
              <TextAreaF label="Mission Text" value={c.mission_text} onChange={(v) => upd('mission_text', v)} />
              <TextF label="Vision Label" value={c.vision_label} onChange={(v) => upd('vision_label', v)} />
              <TextAreaF label="Vision Text" value={c.vision_text} onChange={(v) => upd('vision_text', v)} />
            </SC>
            <SC title="Values Cards" icon="ri-lightbulb-line">
              {c.values.map((card, i) => (
                <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Value {i + 1}</p><button onClick={() => upd('values', c.values.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                  <div className="grid grid-cols-2 gap-3"><TextF label="Icon" value={card.icon} onChange={(v) => upd('values', c.values.map((x, j) => (j === i ? { ...x, icon: v } : x)))} /><TextF label="Title" value={card.title} onChange={(v) => upd('values', c.values.map((x, j) => (j === i ? { ...x, title: v } : x)))} /></div>
                  <TextAreaF label="Description" value={card.desc} onChange={(v) => upd('values', c.values.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
                </div>
              ))}
              <button onClick={() => upd('values', [...c.values, { icon: 'ri-star-line', title: 'New Value', desc: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add value</button>
            </SC>
          </div>
        )}

        {activeTab === 'story' && (
          <div className="space-y-5">
            <SC title="Our Story" icon="ri-book-open-line">
              <TextF label="Eyebrow" value={c.story_eyebrow} onChange={(v) => upd('story_eyebrow', v)} />
              <TextF label="Heading" value={c.story_heading} onChange={(v) => upd('story_heading', v)} />
              <TextAreaF label="Paragraph 1" value={c.story_p1} onChange={(v) => upd('story_p1', v)} />
              <TextAreaF label="Paragraph 2" value={c.story_p2} onChange={(v) => upd('story_p2', v)} />
              <ImageUploadField label="Story Image" value={c.story_image} onChange={(v) => upd('story_image', v)} pageKey={PAGE_KEY} fieldKey="story_image" />
              <div className="grid grid-cols-2 gap-3"><TextF label="Badge Value" value={c.story_badge_value} onChange={(v) => upd('story_badge_value', v)} /><TextF label="Badge Label" value={c.story_badge_label} onChange={(v) => upd('story_badge_label', v)} /></div>
            </SC>
            <SC title="Timeline" icon="ri-history-line">
              {c.timeline.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-3 p-3 bg-stone-50 rounded-lg items-end">
                  <TextF label="Year" value={t.year} onChange={(v) => upd('timeline', c.timeline.map((x, j) => (j === i ? { ...x, year: v } : x)))} />
                  <TextF label="Event" value={t.event} onChange={(v) => upd('timeline', c.timeline.map((x, j) => (j === i ? { ...x, event: v } : x)))} />
                  <button onClick={() => upd('timeline', c.timeline.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer pb-2">Remove</button>
                </div>
              ))}
              <button onClick={() => upd('timeline', [...c.timeline, { year: '2025', event: 'New milestone' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add milestone</button>
            </SC>
          </div>
        )}

        {activeTab === 'cta' && (
          <SC title="Bottom CTA" icon="ri-megaphone-line">
            <TextF label="Eyebrow" value={c.cta_eyebrow} onChange={(v) => upd('cta_eyebrow', v)} />
            <TextF label="Heading" value={c.cta_heading} onChange={(v) => upd('cta_heading', v)} />
            <TextAreaF label="Text" value={c.cta_text} onChange={(v) => upd('cta_text', v)} />
            <div className="grid grid-cols-2 gap-3"><TextF label="Button 1 Label" value={c.cta_btn1_label} onChange={(v) => upd('cta_btn1_label', v)} /><TextF label="Button 1 Link" value={c.cta_btn1_link} onChange={(v) => upd('cta_btn1_link', v)} /></div>
            <div className="grid grid-cols-2 gap-3"><TextF label="Button 2 Label" value={c.cta_btn2_label} onChange={(v) => upd('cta_btn2_label', v)} /><TextF label="Button 2 Link" value={c.cta_btn2_link} onChange={(v) => upd('cta_btn2_link', v)} /></div>
          </SC>
        )}

        {activeTab === 'preview' && (
          <SC title="Live Preview" icon="ri-eye-line">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-stone-100">
                <p className="text-[10px] uppercase tracking-widest text-[#C9A84C] mb-1">{c.intro_eyebrow}</p>
                <p className="text-2xl font-bold text-[#1B4332]">{c.intro_title}</p>
                <p className="text-sm text-stone-500 mt-2">{c.intro_p1}</p>
              </div>
              <div className="grid grid-cols-4 gap-2 p-4 bg-[#1B4332] text-center">
                {c.stats.map((s, i) => <div key={i}><p className="text-lg font-bold text-white">{s.value}</p><p className="text-[10px] text-white/60">{s.label}</p></div>)}
              </div>
              <div className="p-4 grid grid-cols-3 gap-3">
                {c.why_cards.slice(0, 3).map((card, i) => <div key={i} className="p-3 border border-stone-200 rounded-lg"><p className="text-xs font-bold text-[#1B4332]">{card.title}</p><p className="text-[10px] text-stone-500 mt-1">{card.desc}</p></div>)}
              </div>
            </div>
          </SC>
        )}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div>
      </div>
    </ManagementLayout>
  );
}