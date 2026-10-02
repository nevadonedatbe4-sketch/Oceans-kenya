import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import ManagementLayout from '../ManagementLayout';
import { SC, TextF, TextAreaF, ToggleF } from './PageContentFields';
import { DEFAULT_COMMERCIAL_ADVERTISING_CONTENT, invalidateCommercialAdvertisingPageContentCache, type CommercialAdvertisingPageContent } from '@/hooks/useCommercialAdvertisingPageContent';

type TabKey = 'hero' | 'commit' | 'services' | 'packages' | 'howWhy' | 'faq' | 'browse' | 'form' | 'visibility' | 'preview';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'hero', label: 'Hero & Stats', icon: 'ri-image-2-line' },
  { key: 'commit', label: 'Commitment', icon: 'ri-hand-heart-line' },
  { key: 'services', label: 'Services', icon: 'ri-service-line' },
  { key: 'packages', label: 'Packages', icon: 'ri-price-tag-3-line' },
  { key: 'howWhy', label: 'How & Why', icon: 'ri-flow-chart' },
  { key: 'faq', label: 'FAQ & Guarantees', icon: 'ri-question-answer-line' },
  { key: 'browse', label: 'Browse CTA', icon: 'ri-links-line' },
  { key: 'form', label: 'Form & Contact', icon: 'ri-contacts-line' },
  { key: 'visibility', label: 'Visibility', icon: 'ri-eye-line' },
  { key: 'preview', label: 'Preview', icon: 'ri-eye-2-line' },
];
const PAGE_KEY = 'commadv';
const JSON_LIST_KEYS = ['stats', 'services', 'packages', 'steps', 'why', 'faqs', 'guarantees', 'contact_info'];
const BOOLEAN_KEYS = ['show_stats', 'show_commit', 'show_services', 'show_packages', 'show_how', 'show_why', 'show_faq', 'show_guarantees', 'show_browse'];

export default function CommercialAdvertisingPageCMS() {
  const [activeTab, setActiveTab] = useState<TabKey>('hero');
  const [c, setC] = useState<CommercialAdvertisingPageContent>(DEFAULT_COMMERCIAL_ADVERTISING_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    if (data) {
      const map = JSON.parse(JSON.stringify(DEFAULT_COMMERCIAL_ADVERTISING_CONTENT)) as Record<string, unknown>;
      data.forEach((r: { key: string; value: string | null }) => {
        const f = r.key.replace(`page_${PAGE_KEY}_`, '');
        if (!(f in map) || r.value === null) return;
        if (JSON_LIST_KEYS.includes(f)) {
          try { map[f] = JSON.parse(r.value); } catch { /* keep default */ }
        } else if (BOOLEAN_KEYS.includes(f)) {
          map[f] = r.value === 'true';
        } else {
          map[f] = r.value;
        }
      });
      setC(map as unknown as CommercialAdvertisingPageContent);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const upd = (key: keyof CommercialAdvertisingPageContent, value: unknown) => setC((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    const entries = Object.entries(c).map(([k, v]) => ({
      key: `page_${PAGE_KEY}_${k}`,
      value: Array.isArray(v) ? JSON.stringify(v) : String(v),
    }));
    await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    invalidateCommercialAdvertisingPageContentCache();
    showToast('Commercial Advertising page saved', 'success');
    setSaving(false);
  };

  if (loading) return <ManagementLayout title="Commercial Advertising Page" description="" icon={<i className="ri-megaphone-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="Commercial Advertising Page" description="Edit every heading, service, package, step, FAQ, guarantee and form detail on the commercial advertising page." icon={<i className="ri-megaphone-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const a = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${a ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'hero' && (
          <>
            <SC title="Hero" icon="ri-image-2-line">
              <TextF label="Eyebrow" value={c.hero_eyebrow} onChange={(v) => upd('hero_eyebrow', v)} />
              <TextF label="Title" value={c.hero_title} onChange={(v) => upd('hero_title', v)} />
              <TextAreaF label="Text" value={c.hero_text} onChange={(v) => upd('hero_text', v)} />
              <div className="grid grid-cols-2 gap-3">
                <TextF label="Button 1 label" value={c.hero_btn1_label} onChange={(v) => upd('hero_btn1_label', v)} />
                <TextF label="Button 2 label" value={c.hero_btn2_label} onChange={(v) => upd('hero_btn2_label', v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextF label="Badge value" value={c.hero_badge_value} onChange={(v) => upd('hero_badge_value', v)} />
                <TextF label="Badge label" value={c.hero_badge_label} onChange={(v) => upd('hero_badge_label', v)} />
              </div>
            </SC>
            <SC title="Statistics" icon="ri-bar-chart-line">
              {c.stats.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-3 p-3 bg-stone-50 rounded-lg items-end">
                  <TextF label="Value" value={s.value} onChange={(v) => upd('stats', c.stats.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
                  <TextF label="Label" value={s.label} onChange={(v) => upd('stats', c.stats.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                  <button onClick={() => upd('stats', c.stats.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer pb-2">Remove</button>
                </div>
              ))}
              <button onClick={() => upd('stats', [...c.stats, { value: '0', label: 'New Stat' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add stat</button>
            </SC>
          </>
        )}

        {activeTab === 'commit' && (
          <SC title="Our Commitment" icon="ri-hand-heart-line">
            <TextF label="Eyebrow" value={c.commit_eyebrow} onChange={(v) => upd('commit_eyebrow', v)} />
            <TextF label="Title" value={c.commit_title} onChange={(v) => upd('commit_title', v)} />
            <TextAreaF label="Paragraph 1" value={c.commit_p1} onChange={(v) => upd('commit_p1', v)} />
            <TextAreaF label="Paragraph 2" value={c.commit_p2} onChange={(v) => upd('commit_p2', v)} />
            <ImageUploadField label="Image" value={c.commit_image} onChange={(v) => upd('commit_image', v)} pageKey={PAGE_KEY} fieldKey="commit_image" />
            <div className="grid grid-cols-2 gap-3">
              <TextF label="Badge value" value={c.commit_badge_value} onChange={(v) => upd('commit_badge_value', v)} />
              <TextF label="Badge label" value={c.commit_badge_label} onChange={(v) => upd('commit_badge_label', v)} />
            </div>
          </SC>
        )}

        {activeTab === 'services' && (
          <SC title="Services" icon="ri-service-line">
            <TextF label="Eyebrow" value={c.services_eyebrow} onChange={(v) => upd('services_eyebrow', v)} />
            <TextF label="Title" value={c.services_title} onChange={(v) => upd('services_title', v)} />
            <TextAreaF label="Text" value={c.services_text} onChange={(v) => upd('services_text', v)} />
            {c.services.map((s, i) => (
              <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Service {i + 1}</p><button onClick={() => upd('services', c.services.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                <div className="grid grid-cols-2 gap-3"><TextF label="Icon (Remix class)" value={s.icon} onChange={(v) => upd('services', c.services.map((x, j) => (j === i ? { ...x, icon: v } : x)))} /><TextF label="Title" value={s.title} onChange={(v) => upd('services', c.services.map((x, j) => (j === i ? { ...x, title: v } : x)))} /></div>
                <TextAreaF label="Description" value={s.desc} onChange={(v) => upd('services', c.services.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
              </div>
            ))}
            <button onClick={() => upd('services', [...c.services, { icon: 'ri-star-line', title: 'New Service', desc: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add service</button>
          </SC>
        )}

        {activeTab === 'packages' && (
          <SC title="Packages" icon="ri-price-tag-3-line">
            <TextF label="Eyebrow" value={c.packages_eyebrow} onChange={(v) => upd('packages_eyebrow', v)} />
            <TextF label="Title" value={c.packages_title} onChange={(v) => upd('packages_title', v)} />
            <TextAreaF label="Text" value={c.packages_text} onChange={(v) => upd('packages_text', v)} />
            {c.packages.map((p, i) => (
              <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Package {i + 1}</p><button onClick={() => upd('packages', c.packages.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                <div className="grid grid-cols-2 gap-3"><TextF label="Badge (optional)" value={p.badge} onChange={(v) => upd('packages', c.packages.map((x, j) => (j === i ? { ...x, badge: v } : x)))} /><TextF label="Title" value={p.title} onChange={(v) => upd('packages', c.packages.map((x, j) => (j === i ? { ...x, title: v } : x)))} /></div>
                <TextAreaF label="Description" value={p.desc} onChange={(v) => upd('packages', c.packages.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Feature list</label>
                  {p.items.map((it, k) => (
                    <div key={k} className="flex items-center gap-2">
                      <input type="text" value={it} onChange={(e) => upd('packages', c.packages.map((x, j) => (j === i ? { ...x, items: x.items.map((y, m) => (m === k ? e.target.value : y)) } : x)))} className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
                      <button onClick={() => upd('packages', c.packages.map((x, j) => (j === i ? { ...x, items: x.items.filter((_, m) => m !== k) } : x)))} className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-md cursor-pointer"><i className="ri-delete-bin-line text-sm"></i></button>
                    </div>
                  ))}
                  <button onClick={() => upd('packages', c.packages.map((x, j) => (j === i ? { ...x, items: [...x.items, ''] } : x)))} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add feature</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextF label="Button label" value={p.button} onChange={(v) => upd('packages', c.packages.map((x, j) => (j === i ? { ...x, button: v } : x)))} />
                  <ToggleF label="Highlighted (dark)" value={p.highlight} onChange={(v) => upd('packages', c.packages.map((x, j) => (j === i ? { ...x, highlight: v } : x)))} />
                </div>
              </div>
            ))}
            <button onClick={() => upd('packages', [...c.packages, { badge: '', title: 'New Package', desc: '', items: [''], button: 'Enquire', highlight: false }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add package</button>
          </SC>
        )}

        {activeTab === 'howWhy' && (
          <>
            <SC title="How It Works" icon="ri-flow-chart">
              <TextF label="Eyebrow" value={c.how_eyebrow} onChange={(v) => upd('how_eyebrow', v)} />
              <TextF label="Title" value={c.how_title} onChange={(v) => upd('how_title', v)} />
              {c.steps.map((s, i) => (
                <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Step {i + 1}</p><button onClick={() => upd('steps', c.steps.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                  <div className="grid grid-cols-3 gap-3"><TextF label="Icon" value={s.icon} onChange={(v) => upd('steps', c.steps.map((x, j) => (j === i ? { ...x, icon: v } : x)))} /><TextF label="Number" value={s.step} onChange={(v) => upd('steps', c.steps.map((x, j) => (j === i ? { ...x, step: v } : x)))} /><TextF label="Title" value={s.title} onChange={(v) => upd('steps', c.steps.map((x, j) => (j === i ? { ...x, title: v } : x)))} /></div>
                  <TextAreaF label="Description" value={s.desc} onChange={(v) => upd('steps', c.steps.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
                </div>
              ))}
              <button onClick={() => upd('steps', [...c.steps, { icon: 'ri-star-line', step: String(c.steps.length + 1), title: 'New Step', desc: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add step</button>
            </SC>
            <SC title="Why Us" icon="ri-award-line">
              <TextF label="Eyebrow" value={c.why_eyebrow} onChange={(v) => upd('why_eyebrow', v)} />
              <TextF label="Title" value={c.why_title} onChange={(v) => upd('why_title', v)} />
              {c.why.map((s, i) => (
                <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Card {i + 1}</p><button onClick={() => upd('why', c.why.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                  <div className="grid grid-cols-2 gap-3"><TextF label="Icon" value={s.icon} onChange={(v) => upd('why', c.why.map((x, j) => (j === i ? { ...x, icon: v } : x)))} /><TextF label="Title" value={s.title} onChange={(v) => upd('why', c.why.map((x, j) => (j === i ? { ...x, title: v } : x)))} /></div>
                  <TextAreaF label="Description" value={s.desc} onChange={(v) => upd('why', c.why.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
                </div>
              ))}
              <button onClick={() => upd('why', [...c.why, { icon: 'ri-star-line', title: 'New Card', desc: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add card</button>
            </SC>
          </>
        )}

        {activeTab === 'faq' && (
          <>
            <SC title="FAQs" icon="ri-question-answer-line">
              <TextF label="Eyebrow" value={c.faq_eyebrow} onChange={(v) => upd('faq_eyebrow', v)} />
              <TextF label="Title" value={c.faq_title} onChange={(v) => upd('faq_title', v)} />
              {c.faqs.map((f, i) => (
                <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">FAQ {i + 1}</p><button onClick={() => upd('faqs', c.faqs.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                  <TextF label="Question" value={f.q} onChange={(v) => upd('faqs', c.faqs.map((x, j) => (j === i ? { ...x, q: v } : x)))} />
                  <TextAreaF label="Answer" value={f.a} onChange={(v) => upd('faqs', c.faqs.map((x, j) => (j === i ? { ...x, a: v } : x)))} />
                </div>
              ))}
              <button onClick={() => upd('faqs', [...c.faqs, { q: 'New question', a: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add FAQ</button>
            </SC>
            <SC title="Guarantees" icon="ri-shield-check-line">
              {c.guarantees.map((g, i) => (
                <div key={i} className="p-3 bg-stone-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between"><p className="text-xs font-semibold text-stone-500 uppercase">Guarantee {i + 1}</p><button onClick={() => upd('guarantees', c.guarantees.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button></div>
                  <div className="grid grid-cols-2 gap-3"><TextF label="Icon" value={g.icon} onChange={(v) => upd('guarantees', c.guarantees.map((x, j) => (j === i ? { ...x, icon: v } : x)))} /><TextF label="Title" value={g.title} onChange={(v) => upd('guarantees', c.guarantees.map((x, j) => (j === i ? { ...x, title: v } : x)))} /></div>
                  <TextAreaF label="Description" value={g.desc} onChange={(v) => upd('guarantees', c.guarantees.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
                </div>
              ))}
              <button onClick={() => upd('guarantees', [...c.guarantees, { icon: 'ri-star-line', title: 'New Guarantee', desc: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add guarantee</button>
            </SC>
          </>
        )}

        {activeTab === 'browse' && (
          <SC title="Browse Listings CTA" icon="ri-links-line">
            <TextF label="Title" value={c.browse_title} onChange={(v) => upd('browse_title', v)} />
            <TextAreaF label="Text" value={c.browse_text} onChange={(v) => upd('browse_text', v)} />
            <div className="grid grid-cols-2 gap-3">
              <TextF label="Button 1 label" value={c.browse_btn1_label} onChange={(v) => upd('browse_btn1_label', v)} />
              <TextF label="Button 2 label" value={c.browse_btn2_label} onChange={(v) => upd('browse_btn2_label', v)} />
            </div>
          </SC>
        )}

        {activeTab === 'form' && (
          <>
            <SC title="Form Section" icon="ri-contacts-line">
              <TextF label="Eyebrow" value={c.form_eyebrow} onChange={(v) => upd('form_eyebrow', v)} />
              <TextF label="Title" value={c.form_title} onChange={(v) => upd('form_title', v)} />
              <TextAreaF label="Text" value={c.form_text} onChange={(v) => upd('form_text', v)} />
              <ImageUploadField label="Side image" value={c.form_image} onChange={(v) => upd('form_image', v)} pageKey={PAGE_KEY} fieldKey="form_image" />
              <TextF label="Footnote" value={c.form_note} onChange={(v) => upd('form_note', v)} />
            </SC>
            <SC title="Contact Info" icon="ri-map-pin-line">
              {c.contact_info.map((ci, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-3 p-3 bg-stone-50 rounded-lg items-end">
                  <TextF label="Icon" value={ci.icon} onChange={(v) => upd('contact_info', c.contact_info.map((x, j) => (j === i ? { ...x, icon: v } : x)))} />
                  <TextF label="Label" value={ci.label} onChange={(v) => upd('contact_info', c.contact_info.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                  <TextF label="Value" value={ci.value} onChange={(v) => upd('contact_info', c.contact_info.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
                  <button onClick={() => upd('contact_info', c.contact_info.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline cursor-pointer pb-2">Remove</button>
                </div>
              ))}
              <button onClick={() => upd('contact_info', [...c.contact_info, { icon: 'ri-phone-line', label: 'New', value: '' }])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add contact line</button>
            </SC>
          </>
        )}

        {activeTab === 'visibility' && (
          <SC title="Section Visibility" icon="ri-eye-line">
            <ToggleF label="Show statistics band" value={c.show_stats} onChange={(v) => upd('show_stats', v)} />
            <ToggleF label="Show commitment section" value={c.show_commit} onChange={(v) => upd('show_commit', v)} />
            <ToggleF label="Show services" value={c.show_services} onChange={(v) => upd('show_services', v)} />
            <ToggleF label="Show packages" value={c.show_packages} onChange={(v) => upd('show_packages', v)} />
            <ToggleF label="Show how it works" value={c.show_how} onChange={(v) => upd('show_how', v)} />
            <ToggleF label="Show why us" value={c.show_why} onChange={(v) => upd('show_why', v)} />
            <ToggleF label="Show FAQs" value={c.show_faq} onChange={(v) => upd('show_faq', v)} />
            <ToggleF label="Show guarantees" value={c.show_guarantees} onChange={(v) => upd('show_guarantees', v)} />
            <ToggleF label="Show browse CTA" value={c.show_browse} onChange={(v) => upd('show_browse', v)} />
          </SC>
        )}

        {activeTab === 'preview' && (
          <SC title="Live Preview" icon="ri-eye-2-line">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="p-6 bg-gradient-to-br from-[#1B4332] to-[#1B4332]/80">
                <p className="text-[10px] uppercase tracking-widest text-[#C9A84C] mb-1">{c.hero_eyebrow}</p>
                <p className="text-2xl font-bold text-white">{c.hero_title}</p>
                <p className="text-sm text-white/70 mt-2">{c.hero_text}</p>
              </div>
              <div className="grid grid-cols-4 gap-2 p-4 bg-[#1B4332] text-center text-white">
                {c.stats.map((s, i) => <div key={i}><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-white/60">{s.label}</p></div>)}
              </div>
              <div className="p-4 grid grid-cols-4 gap-3">
                {c.services.slice(0, 4).map((s, i) => <div key={i} className="p-3 border border-stone-200 rounded-lg"><i className={`${s.icon} text-[#1B4332]`}></i><p className="text-xs font-bold text-[#1B4332] mt-1">{s.title}</p></div>)}
              </div>
            </div>
          </SC>
        )}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div>
      </div>
    </ManagementLayout>
  );
}