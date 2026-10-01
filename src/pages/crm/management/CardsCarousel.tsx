import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ManagementLayout from '../ManagementLayout';

type TabKey = 'cards' | 'carousel';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'cards', label: 'Property Cards', icon: 'ri-layout-grid-2-line' },
  { key: 'carousel', label: 'Carousel & Slider', icon: 'ri-slideshow-3-line' },
];

interface CardsSettings {
  border_radius: string;
  padding_x: string;
  padding_y: string;
  title_color: string;
  price_color: string;
  icons_color: string;
  background: string;
  separator_color: string;
  image_height: string;
  hover_effect: string;
}

interface CarouselSettings {
  autoplay: string;
  autoplay_speed: string;
  loop: string;
  show_dots: string;
  show_arrows: string;
  touch: string;
  transition_speed: string;
  slides_per_view: string;
}

const CARDS_DEFAULTS: CardsSettings = {
  border_radius: '0',
  padding_x: '16',
  padding_y: '16',
  title_color: '#011328',
  price_color: '#002349',
  icons_color: '#636363',
  background: '#ffffff',
  separator_color: '#d6d6d6',
  image_height: '260',
  hover_effect: 'lift',
};

const CAROUSEL_DEFAULTS: CarouselSettings = {
  autoplay: 'true',
  autoplay_speed: '4000',
  loop: 'true',
  show_dots: 'true',
  show_arrows: 'true',
  touch: 'true',
  transition_speed: '500',
  slides_per_view: '3',
};

const HOVER_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Lift Up', value: 'lift' },
  { label: 'Scale', value: 'scale' },
  { label: 'Border Highlight', value: 'border' },
];

function SC({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4"><div className="flex items-center gap-2 mb-1"><span className="w-5 h-5 flex items-center justify-center"><i className={`${icon} text-[#1B4332] text-sm`}></i></span><h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3></div>{children}</div>;
}
function T({ label, value, onChange, unit }: { label: string; value: string; onChange: (v: string) => void; unit?: string }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><div className="flex items-center gap-2"><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />{unit && <span className="text-sm text-stone-500 shrink-0">{unit}</span>}</div></div>;
}
function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm bg-white cursor-pointer">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;
}
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!value)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${value ? 'bg-[#1B4332]' : 'bg-stone-200'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}></span></button>;
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-stone-700 block">{label}</label><div className="flex items-center gap-2"><input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 border border-stone-200 rounded-md cursor-pointer shrink-0" /><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm uppercase focus:outline-none focus:border-[#1B4332] bg-white" /></div></div>;
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return <div className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0"><div className="flex-1 min-w-0"><p className="text-sm font-medium text-stone-700">{label}</p><p className="text-xs text-stone-400 mt-0.5">{desc}</p></div><Toggle value={value} onChange={onChange} /></div>;
}

export default function CardsCarousel() {
  const [activeTab, setActiveTab] = useState<TabKey>('cards');
  const [cards, setCards] = useState<CardsSettings>({ ...CARDS_DEFAULTS });
  const [carousel, setCarousel] = useState<CarouselSettings>({ ...CAROUSEL_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'design_cards_carousel_%');
    const cardMap = { ...CARDS_DEFAULTS };
    const carMap = { ...CAROUSEL_DEFAULTS };
    if (data) {
      data.forEach((r: { key: string; value: string | null }) => {
        if (r.value === null) return;
        const f = r.key.replace('design_cards_carousel_', '');
        if (f in cardMap) (cardMap as Record<string, string>)[f] = r.value;
        if (f in carMap) (carMap as Record<string, string>)[f] = r.value;
      });
    }
    setCards(cardMap);
    setCarousel(carMap);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = async () => {
    setSaving(true);
    const entries = [
      ...Object.entries(cards).map(([k, v]) => ({ key: `design_cards_carousel_${k}`, value: String(v) })),
      ...Object.entries(carousel).map(([k, v]) => ({ key: `design_cards_carousel_${k}`, value: String(v) })),
    ];
    await Promise.all(entries.map((e) => supabase.from('site_settings').upsert(e, { onConflict: 'key' })));
    showToast('Cards & carousel settings saved', 'success');
    setSaving(false);
  };

  const setCard = (key: keyof CardsSettings, value: string) => setCards((p) => ({ ...p, [key]: value }));
  const setCar = (key: keyof CarouselSettings, value: string) => setCarousel((p) => ({ ...p, [key]: value }));

  return (
    <ManagementLayout title="Cards & Carousel" description="Customise the appearance of property cards and the behaviour of carousels / sliders across the site." icon={<i className="ri-slideshow-3-line text-[#1B4332] text-lg"></i>}>
      <div className="space-y-5 pb-24">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">{TABS.map((t) => { const isA = activeTab === t.key; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${isA ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'}`}><i className={`${t.icon} text-sm`}></i>{t.label}</button>; })}</div>
        </div>

        {activeTab === 'cards' && (
          <div className="space-y-5">
            <SC title="Card Layout" icon="ri-layout-grid-2-line">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <T label="Border Radius" value={cards.border_radius} onChange={(v) => setCard('border_radius', v)} unit="px" />
                <T label="Padding X" value={cards.padding_x} onChange={(v) => setCard('padding_x', v)} unit="px" />
                <T label="Padding Y" value={cards.padding_y} onChange={(v) => setCard('padding_y', v)} unit="px" />
                <T label="Image Height" value={cards.image_height} onChange={(v) => setCard('image_height', v)} unit="px" />
                <Sel label="Hover Effect" value={cards.hover_effect} onChange={(v) => setCard('hover_effect', v)} options={HOVER_OPTIONS} />
              </div>
            </SC>
            <SC title="Card Colours" icon="ri-drop-line">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ColorField label="Card Background" value={cards.background} onChange={(v) => setCard('background', v)} />
                <ColorField label="Title Colour" value={cards.title_color} onChange={(v) => setCard('title_color', v)} />
                <ColorField label="Price Colour" value={cards.price_color} onChange={(v) => setCard('price_color', v)} />
                <ColorField label="Icons Colour" value={cards.icons_color} onChange={(v) => setCard('icons_color', v)} />
                <ColorField label="Separator Colour" value={cards.separator_color} onChange={(v) => setCard('separator_color', v)} />
              </div>
            </SC>
            <SC title="Live Card Preview" icon="ri-eye-line">
              <div className="max-w-[280px] border rounded-lg overflow-hidden" style={{ borderColor: cards.separator_color, borderRadius: `${cards.border_radius}px`, background: cards.background }}>
                <div className="w-full bg-stone-100 overflow-hidden" style={{ height: `${cards.image_height}px` }}>
                  <div className="w-full h-full bg-gradient-to-br from-primary/25 via-accent/15 to-secondary/25 flex items-center justify-center" aria-hidden="true">
                    <i className="ri-image-line text-white/80 text-2xl"></i>
                  </div>
                </div>
                <div className="p-4 space-y-1.5" style={{ padding: `${cards.padding_y}px ${cards.padding_x}px` }}>
                  <p className="text-[10px] font-roboto uppercase tracking-widest" style={{ color: cards.icons_color }}>For Sale · Featured</p>
                  <p className="text-sm font-semibold" style={{ color: cards.title_color }}>Luxury 3-Bed Apartment</p>
                  <p className="text-xs" style={{ color: cards.icons_color }}>Kilimani, Nairobi</p>
                  <p className="font-bold text-sm pt-1" style={{ color: cards.price_color }}>$450,000</p>
                </div>
              </div>
            </SC>
          </div>
        )}

        {activeTab === 'carousel' && (
          <div className="space-y-5">
            <SC title="Carousel Behaviour" icon="ri-slideshow-3-line">
              <ToggleRow label="Autoplay" desc="Automatically advance slides without user interaction." value={carousel.autoplay === 'true'} onChange={(v) => setCar('autoplay', v ? 'true' : 'false')} />
              <ToggleRow label="Loop / Infinite" desc="Continuously loop slides — first slide follows the last." value={carousel.loop === 'true'} onChange={(v) => setCar('loop', v ? 'true' : 'false')} />
              <ToggleRow label="Show Dots" desc="Show pagination dots below the carousel." value={carousel.show_dots === 'true'} onChange={(v) => setCar('show_dots', v ? 'true' : 'false')} />
              <ToggleRow label="Show Arrows" desc="Show left / right navigation arrows on the carousel." value={carousel.show_arrows === 'true'} onChange={(v) => setCar('show_arrows', v ? 'true' : 'false')} />
              <ToggleRow label="Touch Enabled" desc="Allow swipe gestures on touch devices." value={carousel.touch === 'true'} onChange={(v) => setCar('touch', v ? 'true' : 'false')} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <T label="Autoplay Speed" value={carousel.autoplay_speed} onChange={(v) => setCar('autoplay_speed', v)} unit="ms" />
                <T label="Transition Speed" value={carousel.transition_speed} onChange={(v) => setCar('transition_speed', v)} unit="ms" />
                <T label="Slides Per View" value={carousel.slides_per_view} onChange={(v) => setCar('slides_per_view', v)} />
              </div>
            </SC>
            <SC title="Carousel Preview" icon="ri-eye-line">
              <div className="max-w-[600px] mx-auto bg-[#f5f5f5] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  {carousel.show_arrows === 'true' ? <span className="w-8 h-8 flex items-center justify-center bg-white rounded-full border border-stone-200 cursor-pointer text-stone-400"><i className="ri-arrow-left-s-line"></i></span> : <span></span>}
                  <div className="flex gap-2">
                    <div className="w-20 h-14 rounded bg-stone-300"></div>
                    <div className="w-20 h-14 rounded bg-[#1B4332]/20 border border-[#1B4332]/30"></div>
                    <div className="w-20 h-14 rounded bg-stone-300"></div>
                  </div>
                  {carousel.show_arrows === 'true' ? <span className="w-8 h-8 flex items-center justify-center bg-white rounded-full border border-stone-200 cursor-pointer text-stone-400"><i className="ri-arrow-right-s-line"></i></span> : <span></span>}
                </div>
                {carousel.show_dots === 'true' && (
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
                  </div>
                )}
              </div>
              <p className="text-xs text-stone-400 text-center">{carousel.autoplay === 'true' && `Autoplay every ${carousel.autoplay_speed}ms`}{carousel.loop === 'true' && ' · Looping'}{carousel.touch === 'true' && ' · Touch enabled'} · {carousel.slides_per_view} slides per view</p>
            </SC>
          </div>
        )}

        <div className="sticky bottom-0 z-10"><div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4"><p className="text-xs text-stone-400"><span className="font-medium text-stone-600">{Object.keys(cards).length + Object.keys(carousel).length}</span> tokens</p><button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2">{saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save Changes</>}</button></div></div>
      </div>
    </ManagementLayout>
  );
}