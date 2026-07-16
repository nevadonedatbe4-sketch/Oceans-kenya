import { useState } from 'react';
import { SlidersHorizontal, Save, RefreshCw, Loader2, Info } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import { useManagementData } from '@/hooks/useManagementData';

export default function SpacingSizesPage() {
  const data = useManagementData();
  const { loading, saving, getSite, setSite, getCard, setCard, getDetailStyle, setDetailStyleVal, handleSave, fetchData } = data;
  const [activeSection, setActiveSection] = useState<'containers' | 'cards' | 'radius' | 'shadows'>('containers');

  if (loading) {
    return (
      <ManagementLayout title="Spacing & Sizes" description="Container widths, grid gaps, radius, shadows and elevation." icon={<SlidersHorizontal size={20} className="text-[#1B4332]" />}>
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div>
      </ManagementLayout>
    );
  }

  const sections = [
    { key: 'containers' as const, label: 'Containers' },
    { key: 'cards' as const, label: 'Card Layout' },
    { key: 'radius' as const, label: 'Radius' },
    { key: 'shadows' as const, label: 'Shadows' },
  ];

  const NumberRow = ({ label, value, onChange, unit = 'px', hint }: { label: string; value: string; onChange: (v: string) => void; unit?: string; hint?: string }) => (
    <div className="flex items-center gap-3 p-3 border border-stone-100 rounded-lg bg-white hover:border-stone-200 transition-colors">
      <span className="text-xs font-medium text-stone-700 flex-1 min-w-0 truncate">{label}</span>
      {hint && <span className="text-[10px] text-stone-400 hidden sm:inline">{hint}</span>}
      <div className="flex items-center gap-1 flex-shrink-0">
        <input type="number" value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-[80px] px-2 py-1.5 border border-stone-200 rounded text-[11px] font-mono text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white text-right" />
        <span className="text-[10px] text-stone-400 w-5">{unit}</span>
      </div>
    </div>
  );

  const SelectRow = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <div className="flex items-center gap-3 p-3 border border-stone-100 rounded-lg bg-white hover:border-stone-200 transition-colors">
      <span className="text-xs font-medium text-stone-700 flex-1 min-w-0 truncate">{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="px-2.5 py-1.5 border border-stone-200 rounded text-[11px] text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white cursor-pointer">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <ManagementLayout title="Spacing & Sizes" description="Control container widths, grid gaps, card spacing, border radius, and shadow elevation across the site." icon={<SlidersHorizontal size={20} className="text-[#1B4332]" />}>
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

        {activeSection === 'containers' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-[#1B4332]/10 flex items-center justify-center"><i className="ri-layout-column-line text-[#1B4332] text-sm"></i></div>
              <div><h3 className="text-sm font-semibold text-stone-700">Container Settings</h3><p className="text-[11px] text-stone-400">Max-width and content spacing for the main site container.</p></div>
            </div>
            <NumberRow label="Container Max Width" value={getSite('container_max_width')} onChange={(v) => setSite('container_max_width', v)} hint="Default: 1280" />
            <NumberRow label="Content Max Width" value={getSite('content_max_width')} onChange={(v) => setSite('content_max_width', v)} hint="Default: 960" />
            <NumberRow label="Section Vertical Spacing" value={getSite('section_spacing')} onChange={(v) => setSite('section_spacing', v)} hint="Between sections" />
            <NumberRow label="Section Horizontal Padding" value={getSite('section_h_padding')} onChange={(v) => setSite('section_h_padding', v)} />
          </div>
        )}

        {activeSection === 'cards' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-[#1B4332]/10 flex items-center justify-center"><i className="ri-layout-grid-2-line text-[#1B4332] text-sm"></i></div>
              <div><h3 className="text-sm font-semibold text-stone-700">Card Layout</h3><p className="text-[11px] text-stone-400">Image height, card spacing, and grid gaps for property cards.</p></div>
            </div>
            <NumberRow label="Image Height" value={getCard('image_height')} onChange={(v) => setCard('image_height', v)} hint="Property card image" />
            <NumberRow label="Card Spacing" value={getCard('card_spacing')} onChange={(v) => setCard('card_spacing', v)} hint="Between cards" />
            <NumberRow label="Detail Image Height" value={getDetailStyle('image_height')} onChange={(v) => setDetailStyleVal('image_height', v)} hint="Detail page banner" />
            <NumberRow label="Detail Section Spacing" value={getDetailStyle('section_spacing')} onChange={(v) => setDetailStyleVal('section_spacing', v)} hint="Between modules" />
          </div>
        )}

        {activeSection === 'radius' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-[#1B4332]/10 flex items-center justify-center"><i className="ri-rounded-corner text-[#1B4332] text-sm"></i></div>
              <div><h3 className="text-sm font-semibold text-stone-700">Border Radius</h3><p className="text-[11px] text-stone-400">Corner rounding for cards, buttons, inputs, and containers.</p></div>
            </div>
            <NumberRow label="Card Border Radius" value={getCard('card_border_radius')} onChange={(v) => setCard('card_border_radius', v)} hint="Default: 8" />
            <NumberRow label="Badge Border Radius" value={getCard('badge_border_radius')} onChange={(v) => setCard('badge_border_radius', v)} hint="Default: 4" />
            <NumberRow label="Button Border Radius" value={getCard('button_border_radius')} onChange={(v) => setCard('button_border_radius', v)} hint="Default: 6" />
            <NumberRow label="Input Border Radius" value={getSite('input_border_radius')} onChange={(v) => setSite('input_border_radius', v)} hint="Form elements" />
            <NumberRow label="Container Border Radius" value={getSite('container_border_radius')} onChange={(v) => setSite('container_border_radius', v)} hint="Sections & panels" />
          </div>
        )}

        {activeSection === 'shadows' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-[#1B4332]/10 flex items-center justify-center"><i className="ri-contrast-drop-2-line text-[#1B4332] text-sm"></i></div>
              <div><h3 className="text-sm font-semibold text-stone-700">Shadow & Elevation</h3><p className="text-[11px] text-stone-400">Card shadow intensity and hover elevation.</p></div>
            </div>
            <SelectRow label="Card Shadow" value={getCard('card_shadow')} onChange={(v) => setCard('card_shadow', v)} options={[
              { value: 'none', label: 'None' }, { value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' },
            ]} />
            <SelectRow label="Hover Effect" value={getCard('hover_effect')} onChange={(v) => setCard('hover_effect', v)} options={[
              { value: 'none', label: 'None' }, { value: 'lift', label: 'Lift Up' }, { value: 'scale', label: 'Scale' }, { value: 'border', label: 'Border Highlight' },
            ]} />
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-md mt-2">
              <Info size={13} className="text-amber-600 flex-shrink-0" />
              <p className="text-[11px] text-amber-700 font-sans">Shadows and hover effects apply globally to all property listing cards. Changes take effect immediately after saving.</p>
            </div>
          </div>
        )}
      </div>
    </ManagementLayout>
  );
}