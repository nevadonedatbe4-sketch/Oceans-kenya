import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ManagementLayout from '../ManagementLayout';
import {
  DEFAULT_LISTINGS_CONTENT,
  invalidateListingsPageContentCache,
  type ListingsPageContent,
  type QuickLink,
} from '@/hooks/useListingsPageContent';

type TabKey = 'headers' | 'labels' | 'lists' | 'cta' | 'allprops' | 'visibility';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'headers', label: 'Results & Headings', icon: 'ri-heading' },
  { key: 'labels', label: 'Sidebar Labels', icon: 'ri-layout-left-line' },
  { key: 'lists', label: 'Sidebar Lists', icon: 'ri-list-check-2' },
  { key: 'cta', label: 'CTA Blocks', icon: 'ri-megaphone-line' },
  { key: 'allprops', label: 'All Properties', icon: 'ri-building-2-line' },
  { key: 'visibility', label: 'Visibility', icon: 'ri-eye-line' },
];

const PAGE_KEY = 'listings';
const STRING_LIST_KEYS: (keyof ListingsPageContent)[] = ['popular_areas', 'related_searches_buy', 'related_searches_rent'];
const LINK_LIST_KEYS: (keyof ListingsPageContent)[] = ['rent_quick_links', 'ap_quick_links'];
const BOOLEAN_KEYS: (keyof ListingsPageContent)[] = ['show_sidebar', 'show_alert_cta', 'show_footer_cta', 'ap_show_sidebar'];

function SC({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4"><div className="flex items-center gap-2 mb-1"><span className="w-5 h-5 flex items-center justify-center"><i className={`${icon} text-[#1B4332] text-sm`}></i></span><h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3></div>{children}</div>;
}
function T({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" /></div>;
}
function TA({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" />{hint && <p className="text-xs text-stone-400">{hint}</p>}</div>;
}
function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
      <div className="flex-1 min-w-0 pr-4"><p className="text-sm font-medium text-stone-700">{label}</p>{desc && <p className="text-xs text-stone-400 mt-0.5">{desc}</p>}</div>
      <button type="button" onClick={() => onChange(!value)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${value ? 'bg-[#1B4332]' : 'bg-stone-200'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}></span></button>
    </div>
  );
}
function ListEditor({ label, items, onChange, hint }: { label: string; items: string[]; onChange: (v: string[]) => void; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700 block">{label}</label>
      <textarea rows={Math.min(10, Math.max(3, items.length + 1))} value={items.join('\n')} onChange={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" />
      <p className="text-xs text-stone-400">{hint || 'One item per line. Reorder by moving lines.'}</p>
    </div>
  );
}
function LinkListEditor({ label, items, onChange }: { label: string; items: QuickLink[]; onChange: (v: QuickLink[]) => void }) {
  const update = (i: number, patch: Partial<QuickLink>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-stone-700 block">{label}</label>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-6 text-xs font-semibold text-stone-400 shrink-0">{String(i + 1).padStart(2, '0')}</span>
          <input type="text" value={it.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Label" className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
          <input type="text" value={it.link} onChange={(e) => update(i, { link: e.target.value })} placeholder="/link" className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
          <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="w-8 h-8 flex items-center justify-center rounded-md border border-red-100 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"><i className="ri-delete-bin-line"></i></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { label: '', link: '/' }])} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-add-line"></i> Add link</button>
    </div>
  );
}

function cloneDefaults(): ListingsPageContent {
  return {
    ...DEFAULT_LISTINGS_CONTENT,
    popular_areas: [...DEFAULT_LISTINGS_CONTENT.popular_areas],
    related_searches_buy: [...DEFAULT_LISTINGS_CONTENT.related_searches_buy],
    related_searches_rent: [...DEFAULT_LISTINGS_CONTENT.related_searches_rent],
    rent_quick_links: DEFAULT_LISTINGS_CONTENT.rent_quick_links.map((l) => ({ ...l })),
    ap_quick_links: DEFAULT_LISTINGS_CONTENT.ap_quick_links.map((l) => ({ ...l })),
  };
}

export default function ListingPagesCMS() {
  const [activeTab, setActiveTab] = useState<TabKey>('headers');
  const [c, setC] = useState<ListingsPageContent>(cloneDefaults());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchC = useCallback(async () => {
    setLoading(true);
    const map = cloneDefaults();
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `page_${PAGE_KEY}_%`);
    if (data) {
      data.forEach((r: { key: string; value: string | null }) => {
        if (r.value === null) return;
        const field = r.key.replace(`page_${PAGE_KEY}_`, '') as keyof ListingsPageContent;
        if (!(field in map)) return;
        if (STRING_LIST_KEYS.includes(field)) {
          try {
            const parsed = JSON.parse(r.value);
            if (Array.isArray(parsed)) (map as unknown as Record<string, unknown>)[field] = parsed.map((v) => String(v).trim()).filter(Boolean);
          } catch { /* ignore */ }
          return;
        }
        if (LINK_LIST_KEYS.includes(field)) {
          try {
            const parsed = JSON.parse(r.value);
            if (Array.isArray(parsed)) (map as unknown as Record<string, unknown>)[field] = parsed.map((v: { label?: string; link?: string }) => ({ label: String(v.label || '').trim(), link: String(v.link || '').trim() })).filter((v: QuickLink) => v.label || v.link);
          } catch { /* ignore */ }
          return;
        }
        if (BOOLEAN_KEYS.includes(field)) (map as unknown as Record<string, unknown>)[field] = r.value === 'true';
        else (map as unknown as Record<string, unknown>)[field] = r.value;
      });
    }
    setC(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchC(); }, [fetchC]);

  const upd = (key: keyof ListingsPageContent, value: unknown) => setC((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    const entries = Object.entries(c).map(([k, v]) => {
      let value: string;
      if (Array.isArray(v)) value = JSON.stringify(v);
      else if (typeof v === 'boolean') value = v ? 'true' : 'false';
      else value = String(v);
      return { key: `page_${PAGE_KEY}_${k}`, value };
    });
    const results = await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    const failed = results.some((r) => r.error);
    if (failed) showToast('Some fields failed to save', 'error');
    else { invalidateListingsPageContentCache(); showToast('Listing pages saved', 'success'); }
    setSaving(false);
  };

  const reset = () => {
    setC(cloneDefaults());
    showToast('Defaults restored — click Save to apply', 'info');
  };

  if (loading) return <ManagementLayout title="Listing Pages" description="" icon={<i className="ri-file-list-3-line text-[#1B4332] text-lg"></i>}><div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div></ManagementLayout>;

  return (
    <ManagementLayout title="Listing Pages" description="Manage Buy, Rent and All Properties copy, sidebar labels, lists and CTAs — all backend-driven." icon={<i className="ri-file-list-3-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const isA = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${isA ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'headers' && (
          <div className="space-y-5">
            <SC title="Results Headers" icon="ri-heading">
              <T label="Buy page — results heading" value={c.heading_buy} onChange={(v) => upd('heading_buy', v)} placeholder="Properties for sale" />
              <T label="Rent page — results heading" value={c.heading_rent} onChange={(v) => upd('heading_rent', v)} placeholder="Properties to rent" />
              <T label="Listings count word" value={c.count_label} onChange={(v) => upd('count_label', v)} placeholder="properties" />
              <T label="“You searched for” label" value={c.search_label} onChange={(v) => upd('search_label', v)} placeholder="You searched for" />
            </SC>
            <SC title="All Properties — Headings" icon="ri-building-2-line">
              <T label="Heading — All tab" value={c.ap_heading_all} onChange={(v) => upd('ap_heading_all', v)} />
              <T label="Heading — For Sale tab" value={c.ap_heading_sale} onChange={(v) => upd('ap_heading_sale', v)} />
              <T label="Heading — For Rent tab" value={c.ap_heading_rent} onChange={(v) => upd('ap_heading_rent', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Listings count word" value={c.ap_listings_label} onChange={(v) => upd('ap_listings_label', v)} placeholder="listings" />
                <T label="Sort label" value={c.ap_sort_label} onChange={(v) => upd('ap_sort_label', v)} placeholder="Sort:" />
              </div>
            </SC>
          </div>
        )}

        {activeTab === 'labels' && (
          <div className="space-y-5">
            <SC title="Sidebar Section Labels" icon="ri-layout-left-line">
              <T label="Recently viewed" value={c.recently_viewed_label} onChange={(v) => upd('recently_viewed_label', v)} />
              <T label="Refine your search" value={c.refine_label} onChange={(v) => upd('refine_label', v)} />
              <T label="Popular areas" value={c.popular_areas_label} onChange={(v) => upd('popular_areas_label', v)} />
              <T label="Related searches" value={c.related_searches_label} onChange={(v) => upd('related_searches_label', v)} />
              <T label="Quick links (Rent)" value={c.quick_links_label} onChange={(v) => upd('quick_links_label', v)} />
            </SC>
            <SC title="All Properties — Sidebar" icon="ri-building-2-line">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Filter tabs — All" value={c.ap_tab_all} onChange={(v) => upd('ap_tab_all', v)} />
                <T label="Filter tabs — For Sale" value={c.ap_tab_sale} onChange={(v) => upd('ap_tab_sale', v)} />
                <T label="Filter tabs — For Rent" value={c.ap_tab_rent} onChange={(v) => upd('ap_tab_rent', v)} />
                <T label="Quick links heading" value={c.ap_quick_links_label} onChange={(v) => upd('ap_quick_links_label', v)} />
              </div>
              <T label="“Search Filters Saved” label" value={c.ap_saved_label} onChange={(v) => upd('ap_saved_label', v)} />
              <TA label="“Search Filters Saved” text" value={c.ap_saved_text} onChange={(v) => upd('ap_saved_text', v)} />
            </SC>
          </div>
        )}

        {activeTab === 'lists' && (
          <div className="space-y-5">
            <SC title="Sidebar Lists" icon="ri-list-check-2">
              <ListEditor label="Popular areas (Buy & Rent)" items={c.popular_areas} onChange={(v) => upd('popular_areas', v)} />
              <ListEditor label="Related searches (Buy)" items={c.related_searches_buy} onChange={(v) => upd('related_searches_buy', v)} />
              <ListEditor label="Related searches (Rent)" items={c.related_searches_rent} onChange={(v) => upd('related_searches_rent', v)} />
            </SC>
            <SC title="Rent — Quick Links" icon="ri-link-m">
              <LinkListEditor label="Quick links" items={c.rent_quick_links} onChange={(v) => upd('rent_quick_links', v)} />
            </SC>
            <SC title="All Properties — Quick Links" icon="ri-link-m">
              <LinkListEditor label="Quick links" items={c.ap_quick_links} onChange={(v) => upd('ap_quick_links', v)} />
            </SC>
          </div>
        )}

        {activeTab === 'cta' && (
          <div className="space-y-5">
            <SC title="Sidebar “List your property” CTA" icon="ri-home-heart-line">
              <T label="Heading" value={c.list_cta_heading} onChange={(v) => upd('list_cta_heading', v)} />
              <T label="Text (Buy)" value={c.list_cta_text_buy} onChange={(v) => upd('list_cta_text_buy', v)} />
              <T label="Text (Rent)" value={c.list_cta_text_rent} onChange={(v) => upd('list_cta_text_rent', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Button label" value={c.list_cta_button} onChange={(v) => upd('list_cta_button', v)} />
                <T label="Button link" value={c.list_cta_button_link} onChange={(v) => upd('list_cta_button_link', v)} placeholder="/landlords" />
              </div>
            </SC>
            <SC title="Bottom property-alert CTA" icon="ri-mail-add-line">
              <T label="Heading" value={c.alert_heading} onChange={(v) => upd('alert_heading', v)} />
              <T label="Text (Buy)" value={c.alert_text_buy} onChange={(v) => upd('alert_text_buy', v)} />
              <T label="Text (Rent)" value={c.alert_text_rent} onChange={(v) => upd('alert_text_rent', v)} />
              <T label="Button label" value={c.alert_button} onChange={(v) => upd('alert_button', v)} />
            </SC>
            <SC title="Footer CTA" icon="ri-megaphone-line">
              <T label="Eyebrow" value={c.footer_eyebrow} onChange={(v) => upd('footer_eyebrow', v)} />
              <T label="Heading" value={c.footer_heading} onChange={(v) => upd('footer_heading', v)} />
              <T label="Text (Buy)" value={c.footer_text_buy} onChange={(v) => upd('footer_text_buy', v)} />
              <T label="Text (Rent)" value={c.footer_text_rent} onChange={(v) => upd('footer_text_rent', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Button label (Buy)" value={c.footer_button_buy} onChange={(v) => upd('footer_button_buy', v)} />
                <T label="Button label (Rent)" value={c.footer_button_rent} onChange={(v) => upd('footer_button_rent', v)} />
              </div>
              <T label="Button link" value={c.footer_button_link} onChange={(v) => upd('footer_button_link', v)} placeholder="/landlords" />
            </SC>
          </div>
        )}

        {activeTab === 'allprops' && (
          <div className="space-y-5">
            <SC title="All Properties — Headings" icon="ri-heading">
              <T label="Heading — All tab" value={c.ap_heading_all} onChange={(v) => upd('ap_heading_all', v)} />
              <T label="Heading — For Sale tab" value={c.ap_heading_sale} onChange={(v) => upd('ap_heading_sale', v)} />
              <T label="Heading — For Rent tab" value={c.ap_heading_rent} onChange={(v) => upd('ap_heading_rent', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <T label="Listings count word" value={c.ap_listings_label} onChange={(v) => upd('ap_listings_label', v)} />
                <T label="Sort label" value={c.ap_sort_label} onChange={(v) => upd('ap_sort_label', v)} />
              </div>
            </SC>
            <SC title="All Properties — Filter Tabs & Sidebar" icon="ri-layout-left-line">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <T label="Tab — All" value={c.ap_tab_all} onChange={(v) => upd('ap_tab_all', v)} />
                <T label="Tab — For Sale" value={c.ap_tab_sale} onChange={(v) => upd('ap_tab_sale', v)} />
                <T label="Tab — For Rent" value={c.ap_tab_rent} onChange={(v) => upd('ap_tab_rent', v)} />
              </div>
              <T label="“Search Filters Saved” label" value={c.ap_saved_label} onChange={(v) => upd('ap_saved_label', v)} />
              <TA label="“Search Filters Saved” text" value={c.ap_saved_text} onChange={(v) => upd('ap_saved_text', v)} />
              <T label="Quick links heading" value={c.ap_quick_links_label} onChange={(v) => upd('ap_quick_links_label', v)} />
              <LinkListEditor label="Quick links" items={c.ap_quick_links} onChange={(v) => upd('ap_quick_links', v)} />
            </SC>
          </div>
        )}

        {activeTab === 'visibility' && (
          <SC title="Section Visibility" icon="ri-eye-line">
            <Toggle label="Show sidebar (Buy & Rent)" desc="The right-hand sidebar with recently viewed, popular areas and CTAs." value={c.show_sidebar} onChange={(v) => upd('show_sidebar', v)} />
            <Toggle label="Show property-alert CTA (Buy & Rent)" value={c.show_alert_cta} onChange={(v) => upd('show_alert_cta', v)} />
            <Toggle label="Show footer CTA (Buy & Rent)" value={c.show_footer_cta} onChange={(v) => upd('show_footer_cta', v)} />
            <Toggle label="Show sidebar (All Properties)" value={c.ap_show_sidebar} onChange={(v) => upd('ap_show_sidebar', v)} />
          </SC>
        )}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(c).length}</span> fields</p><div className="flex items-center gap-2"><button onClick={reset} className="px-4 py-2 text-sm font-medium bg-white border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"><i className="ri-refresh-line"></i> Reset Defaults</button><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div></div>
      </div>
    </ManagementLayout>
  );
}