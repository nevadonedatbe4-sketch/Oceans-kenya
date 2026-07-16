import { Play, Save, RefreshCw, Loader2, Info } from 'lucide-react';
import { useState } from 'react';
import ManagementLayout from '../ManagementLayout';
import { useManagementData } from '@/hooks/useManagementData';

export default function CarouselSystemPage() {
  const data = useManagementData();
  const { loading, saving, getSite, setSite, handleSave, fetchData } = data;
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'breakpoints'>('general');

  if (loading) {
    return (
      <ManagementLayout title="Carousel System" description="Slides, autoplay, dots, arrows, speed, touch, and responsive breakpoints." icon={<Play size={20} className="text-[#1B4332]" />}>
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div>
      </ManagementLayout>
    );
  }

  const tabs = [
    { key: 'general' as const, label: 'General' },
    { key: 'appearance' as const, label: 'Appearance' },
    { key: 'breakpoints' as const, label: 'Breakpoints' },
  ];

  const Field = ({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">{label}</label>
      {type === 'select' ? (
        <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white cursor-pointer">
          {(type === 'select' ? [{ value: 'fade', label: 'Fade' }, { value: 'slide', label: 'Slide' }] : []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === 'number' ? (
        <input type="number" value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] font-mono text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white" placeholder={placeholder} />
      ) : (
        <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] font-mono text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white" placeholder={placeholder} />
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

  return (
    <ManagementLayout title="Carousel System" description="Configure carousel behavior — speed, autoplay, dots, arrows, fade, touch, and responsive breakpoints." icon={<Play size={20} className="text-[#1B4332]" />}>
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

        {activeTab === 'general' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700">General Settings</h3>
            <div className="space-y-3">
              <Toggle label="Autoplay" desc="Automatically advance slides" value={getSite('carousel_autoplay') === 'true'} onToggle={() => setSite('carousel_autoplay', getSite('carousel_autoplay') === 'true' ? 'false' : 'true')} />
              <Toggle label="Loop" desc="Continuously loop through slides" value={getSite('carousel_loop') === 'true'} onToggle={() => setSite('carousel_loop', getSite('carousel_loop') === 'true' ? 'false' : 'true')} />
              <Toggle label="Touch Swipe" desc="Enable touch/swipe navigation on mobile" value={getSite('carousel_touch') === 'true'} onToggle={() => setSite('carousel_touch', getSite('carousel_touch') === 'true' ? 'false' : 'true')} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Autoplay Speed (ms)" value={getSite('carousel_speed')} onChange={(v) => setSite('carousel_speed', v)} type="number" placeholder="5000" />
                <Field label="Transition Speed (ms)" value={getSite('carousel_transition')} onChange={(v) => setSite('carousel_transition', v)} type="number" placeholder="400" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700">Appearance</h3>
            <div className="space-y-3">
              <Toggle label="Show Dots" desc="Display pagination dots" value={getSite('carousel_show_dots') === 'true'} onToggle={() => setSite('carousel_show_dots', getSite('carousel_show_dots') === 'true' ? 'false' : 'true')} />
              <Toggle label="Show Arrows" desc="Display prev/next arrows" value={getSite('carousel_show_arrows') === 'true'} onToggle={() => setSite('carousel_show_arrows', getSite('carousel_show_arrows') === 'true' ? 'false' : 'true')} />
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">Transition Effect</label>
                <select value={getSite('carousel_effect') || 'slide'} onChange={(e) => setSite('carousel_effect', e.target.value)} className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-[11px] text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white cursor-pointer">
                  {[{ value: 'slide', label: 'Slide' }, { value: 'fade', label: 'Fade' }].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'breakpoints' && (
          <div className="bg-white rounded-lg border border-stone-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700">Responsive Breakpoints</h3>
            <p className="text-[11px] text-stone-400">Slides per view at each screen size.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Desktop Slides" value={getSite('carousel_desktop_slides')} onChange={(v) => setSite('carousel_desktop_slides', v)} type="number" placeholder="3" />
              <Field label="Tablet Slides" value={getSite('carousel_tablet_slides')} onChange={(v) => setSite('carousel_tablet_slides', v)} type="number" placeholder="2" />
              <Field label="Mobile Slides" value={getSite('carousel_mobile_slides')} onChange={(v) => setSite('carousel_mobile_slides', v)} type="number" placeholder="1" />
            </div>
            <div className="flex items-center gap-2 p-3 bg-stone-100/80 border border-stone-200/70 rounded-lg mt-2">
              <Info size={13} className="text-stone-500 flex-shrink-0" />
              <p className="text-[11px] text-stone-600 font-sans">Breakpoint values cascade down. Desktop settings apply to all screens unless overridden by smaller breakpoints.</p>
            </div>
          </div>
        )}
      </div>
    </ManagementLayout>
  );
}