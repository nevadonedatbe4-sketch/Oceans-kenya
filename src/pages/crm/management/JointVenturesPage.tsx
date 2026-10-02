import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ManagementLayout from '../ManagementLayout';
import {
  DEFAULT_JV_CONTENT,
  invalidateJointVenturesPageContentCache,
  type JointVenturesPageContent,
  type JvStat,
  type JvService,
} from '@/hooks/useJointVenturesPageContent';

type TabKey = 'hero' | 'land' | 'how' | 'services' | 'projects' | 'request' | 'faq';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'hero', label: 'Hero & Figures', icon: 'ri-home-4-line' },
  { key: 'land', label: 'Land Feed', icon: 'ri-landscape-line' },
  { key: 'how', label: 'How It Works', icon: 'ri-flow-chart' },
  { key: 'services', label: 'Services', icon: 'ri-briefcase-4-line' },
  { key: 'projects', label: 'Projects', icon: 'ri-building-2-line' },
  { key: 'request', label: 'Request Desk', icon: 'ri-file-list-3-line' },
  { key: 'faq', label: 'FAQ & CTA', icon: 'ri-question-line' },
];

const PAGE_KEY = 'jv';
const STRING_LIST_KEYS: (keyof JointVenturesPageContent)[] = ['landowner_steps', 'investor_steps'];

function SC({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4"><div className="flex items-center gap-2 mb-1"><span className="w-5 h-5 flex items-center justify-center"><i className={`${icon} text-[#1B4332] text-sm`}></i></span><h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3></div>{children}</div>;
}
function T({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" /></div>;
}
function TA({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" /></div>;
}
function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700 block">{label}</label>
      <textarea rows={Math.min(10, Math.max(3, items.length + 1))} value={items.join('\n')} onChange={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" />
      <p className="text-xs text-stone-400">One item per line.</p>
    </div>
  );
}
function FiguresEditor({ items, onChange }: { items: JvStat[]; onChange: (v: JvStat[]) => void }) {
  const update = (i: number, patch: Partial<JvStat>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-stone-700 block">Live figures</label>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-6 text-xs font-semibold text-stone-400 shrink-0">{String(i + 1).padStart(2, '0')}</span>
          <input type="text" value={it.value} onChange={(e) => update(i, { value: e.target.value })} placeholder="100+" className="w-24 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
          <input type="text" value={it.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Label" className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
          <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="w-8 h-8 flex items-center justify-center rounded-md border border-red-100 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"><i className="ri-delete-bin-line"></i></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { value: '0', label: '' }])} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-add-line"></i> Add figure</button>
    </div>
  );
}
function ServicesEditor({ items, onChange }: { items: JvService[]; onChange: (v: JvService[]) => void }) {
  const update = (i: number, patch: Partial<JvService>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-stone-700 block">Services</label>
      {items.map((it, i) => (
        <div key={i} className="border border-stone-200 rounded-lg p-3 space-y-2 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <span className="w-6 text-xs font-semibold text-stone-400 shrink-0">{String(i + 1).padStart(2, '0')}</span>
            <input type="text" value={it.code} onChange={(e) => update(i, { code: e.target.value })} placeholder="SVC/01" className="w-28 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
            <input type="text" value={it.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Service title" className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="w-8 h-8 flex items-center justify-center rounded-md border border-red-100 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"><i className="ri-delete-bin-line"></i></button>
          </div>
          <textarea rows={2} value={it.desc} onChange={(e) => update(i, { desc: e.target.value })} placeholder="Description" className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y sm:ml-8 sm:w-[calc(100%-2rem)]" />
        </div>
      ))}
      <button onClick={() => onChange([...items, { code: 'SVC/00', title: '', desc: '' }])} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-add-line"></i> Add service</button>
    </div>
  );
}

function cloneDefaults(): JointVenturesPageContent {
  return {
    ...DEFAULT_JV_CONTENT,
    figures: DEFAULT_JV_CONTENT.figures.map((f) => ({ ...f })),
    landowner_steps: [...DEFAULT_JV_CONTENT.landowner_steps],
    investor_steps: [...DEFAULT_JV_CONTENT.investor_steps],
    services: DEFAULT_JV_CONTENT.services.map((s) => ({ ...s })),
  };
}

export default function JointVenturesPageCMS() {
  const [activeTab, setActiveTab] = useState<TabKey>('hero');
  const [c, setC] = useState<JointVenturesPageContent>(cloneDefaults());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchC = useCallback(async () => {
    setLoading(true);
    const map = cloneDefaults();
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    if (data) {
      data.forEach((r: { key: string; value: string | null }) => {
        if (r.value === null) return;
        const field = r.key.replace(`page_${PAGE_KEY}_`, '') as keyof JointVenturesPageContent;
        if (!(field in map)) return;
        if (field === 'figures') {
          try { const parsed = JSON.parse(r.value); if (Array.isArray(parsed) && parsed.length) (map as unknown as Record<string, unknown>).figures = parsed.map((v: { value?: string; label?: string }) => ({ value: String(v.value || '').trim(), label: String(v.label || '').trim() })); } catch { /* ignore */ }
          return;
        }
        if (field === 'services') {
          try { const parsed = JSON.parse(r.value); if (Array.isArray(parsed) && parsed.length) (map as unknown as Record<string, unknown>).services = parsed.map((v: { code?: string; title?: string; desc?: string }) => ({ code: String(v.code || '').trim(), title: String(v.title || '').trim(), desc: String(v.desc || '').trim() })); } catch { /* ignore */ }
          return;
        }
        if (STRING_LIST_KEYS.includes(field)) {
          try { const parsed = JSON.parse(r.value); if (Array.isArray(parsed)) (map as unknown as Record<string, unknown>)[field] = parsed.map((v) => String(v).trim()).filter(Boolean); } catch { /* ignore */ }
          return;
        }
        (map as unknown as Record<string, unknown>)[field] = r.value;
      });
    }
    setC(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchC(); }, [fetchC]);

  const upd = (key: keyof JointVenturesPageContent, value: unknown) => setC((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    const entries = Object.entries(c).map(([k, v]) => {
      let value: string;
      if (Array.isArray(v) || (typeof v === 'object' && v !== null)) value = JSON.stringify(v);
      else value = String(v);
      return { key: `page_${PAGE_KEY}_${k}`, value };
    });
    const results = await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    const failed = results.some((r) => r.error);
    if (failed) showToast('Some fields failed to save', 'error');
    else { invalidateJointVenturesPageContentCache(); showToast('Joint Ventures page saved', 'success'); }
    setSaving(false);
  };

  const reset = () => {
    setC(cloneDefaults());
    showToast('Defaults restored — click Save to apply', 'info');
  };

  if (loading) return <ManagementLayout title="Joint Ventures Page" description="" icon={<i className="ri-briefcase-4-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="Joint Ventures Page" description="Manage the Joint Ventures hero, figures, services and section copy — all backend-driven." icon={<i className="ri-briefcase-4-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const isA = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${isA ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'hero' && (
          <div className="space-y-5">
            <SC title="Hero" icon="ri-home-4-line">
              <T label="Eyebrow" value={c.hero_eyebrow} onChange={(v) => upd('hero_eyebrow', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <T label="Headline — line 1" value={c.hero_line1} onChange={(v) => upd('hero_line1', v)} />
                <T label="Headline — line 2" value={c.hero_line2} onChange={(v) => upd('hero_line2', v)} />
                <T label="Headline — line 3" value={c.hero_line3} onChange={(v) => upd('hero_line3', v)} />
              </div>
              <TA label="Paragraph" value={c.hero_paragraph} onChange={(v) => upd('hero_paragraph', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Button 1 label" value={c.hero_button1} onChange={(v) => upd('hero_button1', v)} />
                <T label="Button 2 label" value={c.hero_button2} onChange={(v) => upd('hero_button2', v)} />
              </div>
            </SC>
            <SC title="Live Figures" icon="ri-bar-chart-box-line">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Card label" value={c.figures_label} onChange={(v) => upd('figures_label', v)} />
                <T label="Currency label" value={c.figures_currency} onChange={(v) => upd('figures_currency', v)} />
              </div>
              <FiguresEditor items={c.figures} onChange={(v) => upd('figures', v)} />
            </SC>
          </div>
        )}

        {activeTab === 'land' && (
          <div className="space-y-5">
            <SC title="Search Block" icon="ri-search-2-line">
              <T label="Eyebrow" value={c.search_eyebrow} onChange={(v) => upd('search_eyebrow', v)} />
              <T label="Heading" value={c.search_heading} onChange={(v) => upd('search_heading', v)} />
            </SC>
            <SC title="Land Feed" icon="ri-landscape-line">
              <T label="Eyebrow" value={c.land_eyebrow} onChange={(v) => upd('land_eyebrow', v)} />
              <T label="Heading" value={c.land_heading} onChange={(v) => upd('land_heading', v)} />
              <TA label="Subtitle" value={c.land_subtitle} onChange={(v) => upd('land_subtitle', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <T label="Tab — All" value={c.land_tab_all} onChange={(v) => upd('land_tab_all', v)} />
                <T label="Tab — Outright" value={c.land_tab_outright} onChange={(v) => upd('land_tab_outright', v)} />
                <T label="Tab — Joint venture" value={c.land_tab_jv} onChange={(v) => upd('land_tab_jv', v)} />
              </div>
            </SC>
          </div>
        )}

        {activeTab === 'how' && (
          <div className="space-y-5">
            <SC title="Section Intro" icon="ri-flow-chart">
              <T label="Eyebrow" value={c.how_eyebrow} onChange={(v) => upd('how_eyebrow', v)} />
              <T label="Heading" value={c.how_heading} onChange={(v) => upd('how_heading', v)} />
              <TA label="Intro text" value={c.how_intro} onChange={(v) => upd('how_intro', v)} />
            </SC>
            <SC title="Landowner Card" icon="ri-home-8-line">
              <T label="Badge" value={c.landowner_badge} onChange={(v) => upd('landowner_badge', v)} />
              <T label="Heading" value={c.landowner_heading} onChange={(v) => upd('landowner_heading', v)} />
              <ListEditor label="Steps" items={c.landowner_steps} onChange={(v) => upd('landowner_steps', v)} />
              <T label="Button label" value={c.landowner_button} onChange={(v) => upd('landowner_button', v)} />
            </SC>
            <SC title="Investor Card" icon="ri-funds-line">
              <T label="Badge" value={c.investor_badge} onChange={(v) => upd('investor_badge', v)} />
              <T label="Heading" value={c.investor_heading} onChange={(v) => upd('investor_heading', v)} />
              <ListEditor label="Steps" items={c.investor_steps} onChange={(v) => upd('investor_steps', v)} />
              <T label="Button label" value={c.investor_button} onChange={(v) => upd('investor_button', v)} />
            </SC>
          </div>
        )}

        {activeTab === 'services' && (
          <SC title="Services" icon="ri-briefcase-4-line">
            <T label="Eyebrow" value={c.services_eyebrow} onChange={(v) => upd('services_eyebrow', v)} />
            <T label="Heading" value={c.services_heading} onChange={(v) => upd('services_heading', v)} />
            <TA label="Subtitle" value={c.services_subtitle} onChange={(v) => upd('services_subtitle', v)} />
            <ServicesEditor items={c.services} onChange={(v) => upd('services', v)} />
          </SC>
        )}

        {activeTab === 'projects' && (
          <SC title="Projects Section" icon="ri-building-2-line">
            <T label="Eyebrow" value={c.projects_eyebrow} onChange={(v) => upd('projects_eyebrow', v)} />
            <T label="Heading" value={c.projects_heading} onChange={(v) => upd('projects_heading', v)} />
            <TA label="Subtitle" value={c.projects_subtitle} onChange={(v) => upd('projects_subtitle', v)} />
          </SC>
        )}

        {activeTab === 'request' && (
          <SC title="Request Desk" icon="ri-file-list-3-line">
            <T label="Eyebrow" value={c.request_eyebrow} onChange={(v) => upd('request_eyebrow', v)} />
            <T label="Heading" value={c.request_heading} onChange={(v) => upd('request_heading', v)} />
            <TA label="Paragraph" value={c.request_paragraph} onChange={(v) => upd('request_paragraph', v)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <T label="Tab — Landowner" value={c.request_tab_landowner} onChange={(v) => upd('request_tab_landowner', v)} />
              <T label="Tab — Investor" value={c.request_tab_investor} onChange={(v) => upd('request_tab_investor', v)} />
            </div>
          </SC>
        )}

        {activeTab === 'faq' && (
          <div className="space-y-5">
            <SC title="FAQ" icon="ri-question-line">
              <T label="Eyebrow" value={c.faq_eyebrow} onChange={(v) => upd('faq_eyebrow', v)} />
              <T label="Heading" value={c.faq_heading} onChange={(v) => upd('faq_heading', v)} />
              <p className="text-xs text-stone-400">Individual FAQs are managed in the CRM under Joint Ventures → FAQs.</p>
            </SC>
            <SC title="Bottom CTA" icon="ri-megaphone-line">
              <T label="Eyebrow" value={c.cta_eyebrow} onChange={(v) => upd('cta_eyebrow', v)} />
              <T label="Heading" value={c.cta_heading} onChange={(v) => upd('cta_heading', v)} />
              <TA label="Paragraph" value={c.cta_paragraph} onChange={(v) => upd('cta_paragraph', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Button 1 label" value={c.cta_button1} onChange={(v) => upd('cta_button1', v)} />
                <T label="Button 2 label" value={c.cta_button2} onChange={(v) => upd('cta_button2', v)} />
              </div>
            </SC>
          </div>
        )}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><div className="flex items-center gap-2"><button onClick={reset} className="px-4 py-2 text-sm font-medium bg-white border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"><i className="ri-refresh-line"></i> Reset Defaults</button><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div></div>
      </div>
    </ManagementLayout>
  );
}