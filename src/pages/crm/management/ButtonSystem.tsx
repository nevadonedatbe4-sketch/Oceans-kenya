import { Hand, Save, RefreshCw, Loader2, Info } from 'lucide-react';
import { useState } from 'react';
import ManagementLayout from '../ManagementLayout';
import { useManagementData } from '@/hooks/useManagementData';

const BUTTON_VARIANTS = [
  { key: 'primary', label: 'Primary', desc: 'Main call-to-action button' },
  { key: 'secondary', label: 'Secondary', desc: 'Supporting action button' },
  { key: 'outline', label: 'Outline', desc: 'Bordered transparent button' },
  { key: 'ghost', label: 'Ghost', desc: 'Minimal no-background button' },
  { key: 'danger', label: 'Danger', desc: 'Destructive action warning' },
];

const BUTTON_SIZES = [
  { key: 'sm', label: 'Small', height: '32px', padding: '8px 12px', fontSize: '11px' },
  { key: 'md', label: 'Medium', height: '38px', padding: '10px 16px', fontSize: '13px' },
  { key: 'lg', label: 'Large', height: '46px', padding: '12px 24px', fontSize: '14px' },
];

export default function ButtonSystemPage() {
  const data = useManagementData();
  const { loading, saving, getCard, setCard, getSite, setSite, handleSave, fetchData } = data;
  const [activeTab, setActiveTab] = useState<'variants' | 'sizes' | 'states'>('variants');

  if (loading) {
    return (
      <ManagementLayout title="Button System" description="Primary, outline, ghost, sizes, states, and global button styles." icon={<Hand size={20} className="text-[#1B4332]" />}>
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div>
      </ManagementLayout>
    );
  }

  const tabs = [
    { key: 'variants' as const, label: 'Variants' },
    { key: 'sizes' as const, label: 'Sizes' },
    { key: 'states' as const, label: 'States' },
  ];

  const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">{label}</label>
      <input type="number" value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] font-mono text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white" />
    </div>
  );

  const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 border border-stone-200 rounded cursor-pointer p-0.5" />
        <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className="flex-1 px-2.5 py-1.5 border border-stone-200 rounded text-[11px] font-mono text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white" />
      </div>
    </div>
  );

  return (
    <ManagementLayout title="Button System" description="Configure button variants, sizes, states, and global button styles across the site." icon={<Hand size={20} className="text-[#1B4332]" />}>
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
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-3 py-1.5 rounded-md text-[11px] font-sans font-medium transition-all cursor-pointer whitespace-nowrap ${activeTab === t.key ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'variants' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-4">Button Variants</h3>
            <div className="space-y-4">
              {BUTTON_VARIANTS.map((variant) => (
                <div key={variant.key} className="border border-stone-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-md bg-[#1B4332]/10 flex items-center justify-center">
                      <i className="ri-cursor-fill text-[#1B4332] text-xs"></i>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-stone-700">{variant.label}</p>
                      <p className="text-[10px] text-stone-400">{variant.desc}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <ColorField label="Background" value={getCard(`btn_${variant.key}_bg`) || ''} onChange={(v) => setCard(`btn_${variant.key}_bg`, v)} />
                    <ColorField label="Text Color" value={getCard(`btn_${variant.key}_text`) || ''} onChange={(v) => setCard(`btn_${variant.key}_text`, v)} />
                    <ColorField label="Hover BG" value={getCard(`btn_${variant.key}_hover`) || ''} onChange={(v) => setCard(`btn_${variant.key}_hover`, v)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sizes' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-4">Button Sizes</h3>
            <div className="space-y-4">
              {BUTTON_SIZES.map((size) => (
                <div key={size.key} className="border border-stone-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-stone-700">{size.label}</span>
                    <span className="text-[10px] text-stone-400">— {size.height} height, {size.fontSize} font</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Height (px)" value={getCard(`btn_size_${size.key}_height`) || ''} onChange={(v) => setCard(`btn_size_${size.key}_height`, v)} />
                    <Field label="Font Size (px)" value={getCard(`btn_size_${size.key}_font`) || ''} onChange={(v) => setCard(`btn_size_${size.key}_font`, v)} />
                    <Field label="Padding X (px)" value={getCard(`btn_size_${size.key}_px`) || ''} onChange={(v) => setCard(`btn_size_${size.key}_px`, v)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'states' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700">Global State Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Border Radius (px)" value={getCard('button_border_radius')} onChange={(v) => setCard('button_border_radius', v)} />
              <Field label="Font Weight" value={getCard('button_font_weight')} onChange={(v) => setCard('button_font_weight', v)} />
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-md mt-2">
              <Info size={13} className="text-blue-600 flex-shrink-0" />
              <p className="text-[11px] text-blue-700 font-sans">Global button settings apply to all buttons site-wide. Variant-specific settings override these defaults.</p>
            </div>
          </div>
        )}
      </div>
    </ManagementLayout>
  );
}