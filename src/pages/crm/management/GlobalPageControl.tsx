import { Layout, Save, RefreshCw, Loader2, Info } from 'lucide-react';
import { useState } from 'react';
import ManagementLayout from '../ManagementLayout';
import { useManagementData } from '@/hooks/useManagementData';

export default function GlobalPageControlPage() {
  const data = useManagementData();
  const { loading, saving, getSite, setSite, handleSave, fetchData } = data;
  const [activeTab, setActiveTab] = useState<'width' | 'sections' | 'transitions'>('width');

  if (loading) {
    return (
      <ManagementLayout title="Global Page Control" description="Page width, content spacing, section defaults, and page transitions." icon={<Layout size={20} className="text-[#1B4332]" />}>
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div>
      </ManagementLayout>
    );
  }

  const tabs = [
    { key: 'width' as const, label: 'Width & Spacing' },
    { key: 'sections' as const, label: 'Section Defaults' },
    { key: 'transitions' as const, label: 'Transitions' },
  ];

  const Field = ({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">{label}</label>
      {type === 'number' ? (
        <input type="number" value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] font-mono text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white" placeholder={placeholder} />
      ) : type === 'select' ? (
        <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white cursor-pointer">
          {(type === 'select' ? [{ value: 'wide', label: 'Wide (full width)' }, { value: 'contained', label: 'Contained (max-width)' }, { value: 'narrow', label: 'Narrow (compact)' }] : []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] font-mono text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white" placeholder={placeholder} />
      )}
    </div>
  );

  return (
    <ManagementLayout title="Global Page Control" description="Control page width, content spacing, section defaults, and page transitions across the entire site." icon={<Layout size={20} className="text-[#1B4332]" />}>
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

        {activeTab === 'width' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700">Page Width & Content Spacing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Container Max Width (px)" value={getSite('container_max_width')} onChange={(v) => setSite('container_max_width', v)} type="number" placeholder="1280" />
              <Field label="Content Max Width (px)" value={getSite('content_max_width')} onChange={(v) => setSite('content_max_width', v)} type="number" placeholder="960" />
              <Field label="Section H Padding (px)" value={getSite('section_h_padding')} onChange={(v) => setSite('section_h_padding', v)} type="number" placeholder="24" />
              <Field label="Section V Spacing (px)" value={getSite('section_spacing')} onChange={(v) => setSite('section_spacing', v)} type="number" placeholder="80" />
              <Field label="Container Border Radius (px)" value={getSite('container_border_radius')} onChange={(v) => setSite('container_border_radius', v)} type="number" placeholder="8" />
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">Container Type</label>
                <select value={getSite('container_type') || 'contained'} onChange={(e) => setSite('container_type', e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white cursor-pointer">
                  {[{ value: 'wide', label: 'Wide (full width)' }, { value: 'contained', label: 'Contained (max-width)' }, { value: 'narrow', label: 'Narrow (compact)' }].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sections' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700">Section Defaults</h3>
            <p className="text-[11px] text-stone-400">Default spacing and layout for all page sections.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Header Spacing (px)" value={getSite('header_spacing')} onChange={(v) => setSite('header_spacing', v)} type="number" placeholder="16" />
              <Field label="Footer Spacing (px)" value={getSite('footer_spacing')} onChange={(v) => setSite('footer_spacing', v)} type="number" placeholder="16" />
              <Field label="Grid Gap (px)" value={getSite('grid_gap')} onChange={(v) => setSite('grid_gap', v)} type="number" placeholder="24" />
              <Field label="Input Border Radius (px)" value={getSite('input_border_radius')} onChange={(v) => setSite('input_border_radius', v)} type="number" placeholder="6" />
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-md mt-2">
              <Info size={13} className="text-blue-600 flex-shrink-0" />
              <p className="text-[11px] text-blue-700 font-sans">Section defaults apply to all pages unless overridden by page-specific settings in the Page Builder.</p>
            </div>
          </div>
        )}

        {activeTab === 'transitions' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700">Page Transitions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">Transition Type</label>
                <select value={getSite('page_transition') || 'none'} onChange={(e) => setSite('page_transition', e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white cursor-pointer">
                  {[{ value: 'none', label: 'None' }, { value: 'fade', label: 'Fade' }, { value: 'slide', label: 'Slide' }].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <Field label="Transition Duration (ms)" value={getSite('transition_duration')} onChange={(v) => setSite('transition_duration', v)} type="number" placeholder="300" />
            </div>
          </div>
        )}
      </div>
    </ManagementLayout>
  );
}