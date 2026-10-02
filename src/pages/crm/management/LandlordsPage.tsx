import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import ManagementLayout from '../ManagementLayout';
import { DEFAULT_LANDLORDS_CONTENT, invalidateLandlordsPageContentCache, type LandlordsPageContent } from '@/hooks/useLandlordsPageContent';

type TabKey = 'hero' | 'stats' | 'commit' | 'services' | 'packages' | 'how' | 'why' | 'faq' | 'guar' | 'form' | 'preview';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'hero', label: 'Hero', icon: 'ri-image-2-line' },
  { key: 'stats', label: 'Stats', icon: 'ri-bar-chart-line' },
  { key: 'commit', label: 'Commitment', icon: 'ri-flag-line' },
  { key: 'services', label: 'Services', icon: 'ri-list-check-2' },
  { key: 'packages', label: 'Packages', icon: 'ri-price-tag-3-line' },
  { key: 'how', label: 'How It Works', icon: 'ri-flow-chart' },
  { key: 'why', label: 'Why Us', icon: 'ri-award-line' },
  { key: 'faq', label: 'FAQ', icon: 'ri-question-line' },
  { key: 'guar', label: 'Guarantees', icon: 'ri-shield-check-line' },
  { key: 'form', label: 'Form Block', icon: 'ri-chat-3-line' },
  { key: 'preview', label: 'Preview', icon: 'ri-eye-line' },
];

const PAGE_KEY = 'landlords';

function SC({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4"><div className="flex items-center gap-2 mb-1"><span className="w-5 h-5 flex items-center justify-center"><i className={`${icon} text-[#1B4332] text-sm`}></i></span><h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3></div>{children}</div>;
}
function TextF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" /></div>;
}
function TextAreaF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" /></div>;
}
function ListF({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label} (one per line)</label><textarea rows={Math.max(4, value.length)} value={value.join('\n')} onChange={(e) => onChange(e.target.value.split('\n').filter((l) => l.trim()))} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" /></div>;
}

export default function LandlordsPageCMS() {
  const [activeTab, setActiveTab] = useState<TabKey>('hero');
  const [c, setC] = useState<LandlordsPageContent>(DEFAULT_LANDLORDS_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    if (data) {
      const map = { ...DEFAULT_LANDLORDS_CONTENT };
      const jsonKeys = ['stats', 'services', 'how_steps', 'why_cards', 'faqs', 'guarantees', 'form_info', 'pkg1_features', 'pkg2_features'];
      data.forEach((r: { key: string; value: string | null }) => {
        const f = r.key.replace(`page_${PAGE_KEY}_`, '');
        if (!(f in map) || r.value === null) return;
        if (jsonKeys.includes(f)) {
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

  const upd = (key: keyof LandlordsPageContent, value: unknown) => setC((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    const entries = Object.entries(c).map(([k, v]) => ({
      key: `page_${PAGE_KEY}_${k}`,
      value: Array.isArray(v) ? JSON.stringify(v) : String(v),
    }));
    await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    invalidateLandlordsPageContentCache();
    showToast('Landlords page saved', 'success');
    setSaving(false);
  };

  if (loading) return <ManagementLayout title="Landlords Page" description="" icon={<i className="ri-user-star-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent animate-spin rounded-full" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="Landlords Page" description="Edit every section of the Landlords page — hero, stats, services, packages, process, FAQ, guarantees and the enquiry form." icon={<i className="ri-user-star-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const a = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${a ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'hero' && (
          <SC title="Hero" icon="ri-image-2-line">
            <ImageUploadField label="Background Image" value={c.hero_image} onChange={(v) => upd('hero_image', v)} pageKey={PAGE_KEY} fieldKey="hero_image" />
            <TextF label="Eyebrow" value={c.hero_eyebrow} onChange={(v) => upd('hero_eyebrow', v)} />
            <div className="grid grid-cols-3 gap-3"><TextF label="Title Line 1" value={c.hero_line1} onChange={(v) => upd('hero_line1', v)} /><TextF label="Title Line 2" value={c.hero_line2} onChange={(v) => upd('hero_line2', v)} /><TextF label="Title Line 3" value={c.hero_line3} onChange={(v) => upd('hero_line3', v)} /></div>
            <TextAreaF label="Paragraph" value={c.hero_paragraph} onChange={(v) => upd('hero_paragraph', v)} />
            <div className="grid grid-cols-2 gap-3"><TextF label="Button 1 Label" value={c.hero_btn1_label} onChange={(v) => upd('hero_btn1_label', v)} /><TextF label="Button 2 Label" value={c.hero_btn2_label} onChange={(v) => upd('hero_btn2_label', v)} /></div>
            <div className="grid grid-cols-2 gap-3"><TextF label="Badge Title" value={c.hero_badge_title} onChange={(v) => upd('hero_badge_title', v)} /><TextF label="Badge Label" value={c.hero_badge_label} onChange={(v) => upd('hero_badge_label', v)} /></div>
            <TextF label="Form Anchor (e.g. #landlord-form)" value={c.hero_form_anchor} onChange={(v) => upd('hero_form_anchor', v)} />
          </SC>
        )}

        {activeTab === 'stats' && (
          <SC title="Statistics Band" icon="ri-bar-chart-line">
            {c.stats.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 p-3 bg-stone-50 rounded-lg items-end">
                <TextF label={`Stat ${i + 1} Value`} value={s.value} onChange={(v) => upd('stats', c.stats.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
                <TextF label="Label" value={s.label} onChange={(v) => upd('stats', c.stats.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                <button onClick={() => upd('stats', c.stats.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer pb-2">Remove</button>
              </div>
            ))}
            <button onClick={() => upd('stats', [...c.stats, { value: '0', label: 'New Stat' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add stat</button>
          </SC>
        )}

        {activeTab === 'commit' && (
          <SC title="Your Property Is Our Priority" icon="ri-flag-line">
            <TextF label="Eyebrow" value={c.commit_eyebrow} onChange={(v) => upd('commit_eyebrow', v)} />
            <TextF label="Heading" value={c.commit_heading} onChange={(v) => upd('commit_heading', v)} />
            <TextAreaF label="Paragraph 1" value={c.commit_p1} onChange={(v) => upd('commit_p1', v)} />
            <TextAreaF label="Paragraph 2" value={c.commit_p2} onChange={(v) => upd('commit_p2', v)} />
            <ImageUploadField label="Image" value={c.commit_image} onChange={(v) => upd('commit_image', v)} pageKey={PAGE_KEY} fieldKey="commit_image" />
            <div className="grid grid-cols-2 gap-3"><TextF label="Badge Value" value={c.commit_badge_value} onChange={(v) => upd('commit_badge_value', v)} /><TextF label="Badge Label" value={c.commit_badge_label} onChange={(v) => upd('commit_badge_label', v)} /></div>
          </SC>
        )}

        {activeTab === 'services' && (
          <SC title="Services" icon="ri-list-check-2">
            <TextF label="Eyebrow" value={c.services_eyebrow} onChange={(v) => upd('services_eyebrow', v)} />
            <TextF label="Heading" value={c.services_heading} onChange={(v) => upd('services_heading', v)} />
            <TextAreaF label="Intro Text" value={c.services_text} onChange={(v) => upd('services_text', v)} />
            {c.services.map((s, i) => (
              <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Service {i + 1}</p><button onClick={() => upd('services', c.services.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                <div className="grid grid-cols-2 gap-3"><TextF label="Icon" value={s.icon} onChange={(v) => upd('services', c.services.map((x, j) => (j === i ? { ...x, icon: v } : x)))} /><TextF label="Title" value={s.title} onChange={(v) => upd('services', c.services.map((x, j) => (j === i ? { ...x, title: v } : x)))} /></div>
                <TextAreaF label="Description" value={s.desc} onChange={(v) => upd('services', c.services.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
              </div>
            ))}
            <button onClick={() => upd('services', [...c.services, { icon: 'ri-star-line', title: 'New Service', desc: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add service</button>
          </SC>
        )}

        {activeTab === 'packages' && (
          <div className="space-y-5">
            <SC title="Section Header" icon="ri-price-tag-3-line">
              <TextF label="Eyebrow" value={c.packages_eyebrow} onChange={(v) => upd('packages_eyebrow', v)} />
              <TextF label="Heading" value={c.packages_heading} onChange={(v) => upd('packages_heading', v)} />
              <TextAreaF label="Intro Text" value={c.packages_text} onChange={(v) => upd('packages_text', v)} />
            </SC>
            <SC title="Package 1 — Let Only" icon="ri-key-2-line">
              <div className="grid grid-cols-2 gap-3"><TextF label="Icon" value={c.pkg1_icon} onChange={(v) => upd('pkg1_icon', v)} /><TextF label="Title" value={c.pkg1_title} onChange={(v) => upd('pkg1_title', v)} /></div>
              <TextAreaF label="Description" value={c.pkg1_desc} onChange={(v) => upd('pkg1_desc', v)} />
              <ListF label="Features" value={c.pkg1_features} onChange={(v) => upd('pkg1_features', v)} />
              <TextF label="Button Label" value={c.pkg1_button} onChange={(v) => upd('pkg1_button', v)} />
            </SC>
            <SC title="Package 2 — Full Management" icon="ri-building-4-line">
              <div className="grid grid-cols-2 gap-3"><TextF label="Badge" value={c.pkg2_badge} onChange={(v) => upd('pkg2_badge', v)} /><TextF label="Icon" value={c.pkg2_icon} onChange={(v) => upd('pkg2_icon', v)} /></div>
              <TextF label="Title" value={c.pkg2_title} onChange={(v) => upd('pkg2_title', v)} />
              <TextAreaF label="Description" value={c.pkg2_desc} onChange={(v) => upd('pkg2_desc', v)} />
              <ListF label="Features" value={c.pkg2_features} onChange={(v) => upd('pkg2_features', v)} />
              <TextF label="Button Label" value={c.pkg2_button} onChange={(v) => upd('pkg2_button', v)} />
            </SC>
          </div>
        )}

        {activeTab === 'how' && (
          <SC title="How It Works" icon="ri-flow-chart">
            <TextF label="Eyebrow" value={c.how_eyebrow} onChange={(v) => upd('how_eyebrow', v)} />
            <TextF label="Heading" value={c.how_heading} onChange={(v) => upd('how_heading', v)} />
            {c.how_steps.map((s, i) => (
              <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Step {i + 1}</p><button onClick={() => upd('how_steps', c.how_steps.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                <div className="grid grid-cols-[1fr_1fr_80px] gap-3"><TextF label="Icon" value={s.icon} onChange={(v) => upd('how_steps', c.how_steps.map((x, j) => (j === i ? { ...x, icon: v } : x)))} /><TextF label="Title" value={s.title} onChange={(v) => upd('how_steps', c.how_steps.map((x, j) => (j === i ? { ...x, title: v } : x)))} /><TextF label="Step No." value={String(s.step)} onChange={(v) => upd('how_steps', c.how_steps.map((x, j) => (j === i ? { ...x, step: Number(v) || 0 } : x)))} /></div>
                <TextAreaF label="Description" value={s.desc} onChange={(v) => upd('how_steps', c.how_steps.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
              </div>
            ))}
            <button onClick={() => upd('how_steps', [...c.how_steps, { icon: 'ri-check-line', step: c.how_steps.length + 1, title: 'New Step', desc: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add step</button>
          </SC>
        )}

        {activeTab === 'why' && (
          <SC title="Why Landlords Choose Us" icon="ri-award-line">
            <TextF label="Eyebrow" value={c.why_eyebrow} onChange={(v) => upd('why_eyebrow', v)} />
            <TextF label="Heading" value={c.why_heading} onChange={(v) => upd('why_heading', v)} />
            {c.why_cards.map((card, i) => (
              <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Card {i + 1}</p><button onClick={() => upd('why_cards', c.why_cards.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                <div className="grid grid-cols-2 gap-3"><TextF label="Icon" value={card.icon} onChange={(v) => upd('why_cards', c.why_cards.map((x, j) => (j === i ? { ...x, icon: v } : x)))} /><TextF label="Title" value={card.title} onChange={(v) => upd('why_cards', c.why_cards.map((x, j) => (j === i ? { ...x, title: v } : x)))} /></div>
                <TextAreaF label="Description" value={card.desc} onChange={(v) => upd('why_cards', c.why_cards.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
              </div>
            ))}
            <button onClick={() => upd('why_cards', [...c.why_cards, { icon: 'ri-star-line', title: 'New Card', desc: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add card</button>
          </SC>
        )}

        {activeTab === 'faq' && (
          <SC title="Frequently Asked Questions" icon="ri-question-line">
            <TextF label="Eyebrow" value={c.faq_eyebrow} onChange={(v) => upd('faq_eyebrow', v)} />
            <TextF label="Heading" value={c.faq_heading} onChange={(v) => upd('faq_heading', v)} />
            {c.faqs.map((f, i) => (
              <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Q {i + 1}</p><button onClick={() => upd('faqs', c.faqs.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                <TextF label="Question" value={f.q} onChange={(v) => upd('faqs', c.faqs.map((x, j) => (j === i ? { ...x, q: v } : x)))} />
                <TextAreaF label="Answer" value={f.a} onChange={(v) => upd('faqs', c.faqs.map((x, j) => (j === i ? { ...x, a: v } : x)))} />
              </div>
            ))}
            <button onClick={() => upd('faqs', [...c.faqs, { q: 'New question', a: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add question</button>
          </SC>
        )}

        {activeTab === 'guar' && (
          <SC title="Guarantees Band" icon="ri-shield-check-line">
            {c.guarantees.map((g, i) => (
              <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Guarantee {i + 1}</p><button onClick={() => upd('guarantees', c.guarantees.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                <div className="grid grid-cols-2 gap-3"><TextF label="Icon" value={g.icon} onChange={(v) => upd('guarantees', c.guarantees.map((x, j) => (j === i ? { ...x, icon: v } : x)))} /><TextF label="Title" value={g.title} onChange={(v) => upd('guarantees', c.guarantees.map((x, j) => (j === i ? { ...x, title: v } : x)))} /></div>
                <TextAreaF label="Description" value={g.desc} onChange={(v) => upd('guarantees', c.guarantees.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
              </div>
            ))}
            <button onClick={() => upd('guarantees', [...c.guarantees, { icon: 'ri-check-double-line', title: 'New Guarantee', desc: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add guarantee</button>
          </SC>
        )}

        {activeTab === 'form' && (
          <div className="space-y-5">
            <SC title="Form Intro Block" icon="ri-chat-3-line">
              <ImageUploadField label="Side Image" value={c.form_image} onChange={(v) => upd('form_image', v)} pageKey={PAGE_KEY} fieldKey="form_image" />
              <TextF label="Eyebrow" value={c.form_eyebrow} onChange={(v) => upd('form_eyebrow', v)} />
              <TextF label="Heading" value={c.form_heading} onChange={(v) => upd('form_heading', v)} />
              <TextAreaF label="Text" value={c.form_text} onChange={(v) => upd('form_text', v)} />
            </SC>
            <SC title="Contact Info Rows" icon="ri-contacts-line">
              {c.form_info.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-3 p-3 bg-stone-50 rounded-lg items-end">
                  <TextF label="Icon" value={row.icon} onChange={(v) => upd('form_info', c.form_info.map((x, j) => (j === i ? { ...x, icon: v } : x)))} />
                  <TextF label="Label" value={row.label} onChange={(v) => upd('form_info', c.form_info.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                  <TextF label="Value" value={row.value} onChange={(v) => upd('form_info', c.form_info.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
                  <button onClick={() => upd('form_info', c.form_info.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer pb-2">Remove</button>
                </div>
              ))}
              <button onClick={() => upd('form_info', [...c.form_info, { icon: 'ri-information-line', label: 'New', value: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add row</button>
            </SC>
            <SC title="Form Messaging" icon="ri-message-2-line">
              <TextF label="Submit Button Label" value={c.form_submit_label} onChange={(v) => upd('form_submit_label', v)} />
              <TextF label="Success Title" value={c.form_success_title} onChange={(v) => upd('form_success_title', v)} />
              <TextF label="Success Text" value={c.form_success_text} onChange={(v) => upd('form_success_text', v)} />
              <TextF label="Footnote" value={c.form_footnote} onChange={(v) => upd('form_footnote', v)} />
            </SC>
          </div>
        )}

        {activeTab === 'preview' && (
          <SC title="Live Preview" icon="ri-eye-line">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="relative h-40 bg-gradient-to-br from-[#1B4332] to-[#2d5a3f] flex flex-col justify-center px-6">
                <p className="text-[10px] uppercase tracking-widest text-[#C9A84C] mb-1">{c.hero_eyebrow}</p>
                <p className="text-2xl font-bold text-white leading-tight">{c.hero_line1}<br />{c.hero_line2}<br />{c.hero_line3}</p>
                <p className="text-xs text-white/70 mt-2 max-w-md">{c.hero_paragraph}</p>
              </div>
              <div className="grid grid-cols-4 gap-2 p-4 bg-[#1B4332] text-center">{c.stats.map((s, i) => <div key={i}><p className="text-lg font-bold text-white">{s.value}</p><p className="text-[10px] text-white/60">{s.label}</p></div>)}</div>
              <div className="p-4 grid grid-cols-4 gap-3">{c.services.map((s, i) => <div key={i} className="p-3 border border-stone-200 rounded-lg"><p className="text-xs font-bold text-[#1B4332]">{s.title}</p><p className="text-[10px] text-stone-500 mt-1">{s.desc}</p></div>)}</div>
            </div>
          </SC>
        )}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div>
      </div>
    </ManagementLayout>
  );
}