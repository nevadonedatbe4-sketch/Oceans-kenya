import { Grid3X3, Save, RefreshCw, Loader2, Info } from 'lucide-react';
import { useState } from 'react';
import ManagementLayout from '../ManagementLayout';
import { useManagementData } from '@/hooks/useManagementData';

export default function CardBoxSystemPage() {
  const data = useManagementData();
  const { loading, saving, getCard, setCard, getDetailStyle, setDetailStyleVal, handleSave, fetchData } = data;
  const [activeSection, setActiveSection] = useState<'style' | 'badges' | 'content' | 'hover'>('style');

  if (loading) {
    return (
      <ManagementLayout title="Card Box System" description="Global card builder — background, border, radius, shadow, hover, and content layout." icon={<Grid3X3 size={20} className="text-[#1B4332]" />}>
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div>
      </ManagementLayout>
    );
  }

  const sections = [
    { key: 'style' as const, label: 'Card Style' },
    { key: 'badges' as const, label: 'Badges' },
    { key: 'content' as const, label: 'Content' },
    { key: 'hover' as const, label: 'Hover & Anim' },
  ];

  const Field = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">{label}</label>
      {type === 'color' ? (
        <div className="flex items-center gap-2">
          <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 border border-stone-200 rounded cursor-pointer p-0.5" />
          <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className="flex-1 px-2.5 py-1.5 border border-stone-200 rounded text-[11px] font-mono text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white" />
        </div>
      ) : type === 'select' ? (
        <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white cursor-pointer">
          {type === 'select' && [
            { value: 'none', label: 'None' }, { value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' },
          ].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] text-stone-600 font-mono focus:outline-none focus:border-[#1B4332] bg-white" />
      )}
    </div>
  );

  const Toggle = ({ label, desc, value, onToggle }: { label: string; desc: string; value: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between p-4 border border-stone-200/70 rounded-lg bg-stone-50/50 hover:bg-stone-50 transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-sans font-medium text-stone-800 tracking-tight">{label}</p>
        {desc && <p className="text-[11px] text-stone-400 font-sans mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      <button
        onClick={onToggle}
        className={`relative flex-shrink-0 ml-5 w-11 h-6 rounded-full transition-all duration-300 ease-out cursor-pointer ${value ? 'bg-[#1B4332] shadow-[0_0_0_1px_rgba(27,67,50,0.2)]' : 'bg-stone-300'}`}
        role="switch"
        aria-checked={value}
      >
        <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all duration-300 ease-out shadow-sm ${value ? 'left-[calc(100%-21px)] shadow-[0_1px_3px_rgba(27,67,50,0.3)]' : 'left-[3px]'}`} />
      </button>
    </div>
  );

  const hoverOptions = [
    { value: 'none', label: 'None' }, { value: 'lift', label: 'Lift Up' }, { value: 'scale', label: 'Scale' }, { value: 'border', label: 'Border Highlight' },
  ];

  return (
    <ManagementLayout title="Card Box System" description="Global card builder — every card on the site inherits these base settings." icon={<Grid3X3 size={20} className="text-[#1B4332]" />}>
      <div className="space-y-5">
        <div className="flex items-center justify-end gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 px-3 py-2 rounded-lg text-xs font-sans transition-all cursor-pointer whitespace-nowrap">
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#1B4332]/90 text-white px-4 py-2 rounded-lg text-xs font-sans transition-all cursor-pointer whitespace-nowrap disabled:opacity-50">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Changes</>}
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 bg-stone-50 rounded-lg w-fit">
          {sections.map((s) => (
            <button key={s.key} onClick={() => setActiveSection(s.key)} className={`px-3 py-1.5 rounded-md text-[11px] font-sans font-medium transition-all cursor-pointer whitespace-nowrap ${activeSection === s.key ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {activeSection === 'style' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-4">Card Style Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Card Background" value={getCard('card_background')} onChange={(v) => setCard('card_background', v)} type="color" />
              <Field label="Border Radius (px)" value={getCard('card_border_radius')} onChange={(v) => setCard('card_border_radius', v)} type="number" />
              <Field label="Image Height (px)" value={getCard('image_height')} onChange={(v) => setCard('image_height', v)} type="number" />
              <Field label="Card Spacing (px)" value={getCard('card_spacing')} onChange={(v) => setCard('card_spacing', v)} type="number" />
              <Field label="Title Size (px)" value={getCard('title_size')} onChange={(v) => setCard('title_size', v)} type="number" />
              <Field label="Price Size (px)" value={getCard('price_size')} onChange={(v) => setCard('price_size', v)} type="number" />
              <Field label="Icon Style" value={getCard('icon_style')} onChange={(v) => setCard('icon_style', v)} type="text" />
            </div>
          </div>
        )}

        {activeSection === 'badges' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-4">Badge Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Rent Badge Color" value={getCard('rent_badge_color')} onChange={(v) => setCard('rent_badge_color', v)} type="color" />
              <Field label="Rent Badge Text" value={getCard('rent_badge_text_color')} onChange={(v) => setCard('rent_badge_text_color', v)} type="color" />
              <Field label="Sale Badge Color" value={getCard('sale_badge_color')} onChange={(v) => setCard('sale_badge_color', v)} type="color" />
              <Field label="Sale Badge Text" value={getCard('sale_badge_text_color')} onChange={(v) => setCard('sale_badge_text_color', v)} type="color" />
              <Field label="Featured Badge" value={getCard('featured_badge_color')} onChange={(v) => setCard('featured_badge_color', v)} type="color" />
              <Field label="New Dev Badge" value={getCard('new_dev_badge_color')} onChange={(v) => setCard('new_dev_badge_color', v)} type="color" />
              <Field label="Badge Radius (px)" value={getCard('badge_border_radius')} onChange={(v) => setCard('badge_border_radius', v)} type="number" />
            </div>
          </div>
        )}

        {activeSection === 'content' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700">Content & Layout</h3>
            <Toggle label="Show Details Button" desc="Display a details button on property cards" value={getCard('show_details_button') === 'true'} onToggle={() => setCard('show_details_button', getCard('show_details_button') === 'true' ? 'false' : 'true')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Button BG Color" value={getCard('button_bg_color')} onChange={(v) => setCard('button_bg_color', v)} type="color" />
              <Field label="Button Text Color" value={getCard('button_text_color')} onChange={(v) => setCard('button_text_color', v)} type="color" />
              <Field label="Button Hover Color" value={getCard('button_hover_color')} onChange={(v) => setCard('button_hover_color', v)} type="color" />
              <Field label="Button Radius (px)" value={getCard('button_border_radius')} onChange={(v) => setCard('button_border_radius', v)} type="number" />
            </div>
          </div>
        )}

        {activeSection === 'hover' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700">Hover & Animation</h3>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">Hover Effect</label>
              <select value={getCard('hover_effect') || 'none'} onChange={(e) => setCard('hover_effect', e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white cursor-pointer">
                {hoverOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">Card Shadow</label>
              <select value={getCard('card_shadow') || 'none'} onChange={(e) => setCard('card_shadow', e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white cursor-pointer">
                {[{ value: 'none', label: 'None' }, { value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 p-3 bg-stone-100/80 border border-stone-200/70 rounded-lg mt-2">
              <Info size={13} className="text-stone-500 flex-shrink-0" />
              <p className="text-[11px] text-stone-600 font-sans">Hover effects apply to all property listing cards across the site. Test on the frontend after saving.</p>
            </div>
          </div>
        )}
      </div>
    </ManagementLayout>
  );
}