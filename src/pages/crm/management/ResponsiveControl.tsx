import { Smartphone, Save, RefreshCw, Loader2, Info, Monitor, Tablet } from 'lucide-react';
import { useState } from 'react';
import ManagementLayout from '../ManagementLayout';
import { useManagementData } from '@/hooks/useManagementData';

const BREAKPOINTS = [
  { key: 'desktop', label: 'Desktop', icon: <Monitor size={14} />, defaultWidth: '1280', desc: 'Large screens — 1024px and up' },
  { key: 'laptop', label: 'Laptop', icon: <Monitor size={14} />, defaultWidth: '1024', desc: 'Medium screens — 768px to 1023px' },
  { key: 'tablet', label: 'Tablet', icon: <Tablet size={14} />, defaultWidth: '768', desc: 'Small screens — 480px to 767px' },
  { key: 'mobile', label: 'Mobile', icon: <Smartphone size={14} />, defaultWidth: '480', desc: 'Extra small — below 480px' },
];

export default function ResponsiveControlPage() {
  const data = useManagementData();
  const { loading, saving, getSite, setSite, handleSave, fetchData } = data;
  const [expandedBreakpoint, setExpandedBreakpoint] = useState<string | null>('desktop');

  if (loading) {
    return (
      <ManagementLayout title="Responsive Control" description="Desktop, tablet, and mobile breakpoint overrides for every design setting." icon={<Smartphone size={20} className="text-[#1B4332]" />}>
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" /></div>
      </ManagementLayout>
    );
  }

  const Field = ({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div className="space-y-1">
      <label className="text-[9px] font-medium text-stone-400 uppercase tracking-wider">{label}</label>
      <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full px-2 py-1 border border-stone-200 rounded text-[10px] font-mono text-stone-600 focus:outline-none focus:border-[#1B4332] bg-white" placeholder={placeholder} />
    </div>
  );

  const getResp = (bp: string, key: string) => getSite(`resp_${bp}_${key}`);
  const setResp = (bp: string, key: string, value: string) => setSite(`resp_${bp}_${key}`, value);

  const overrideFields = [
    { key: 'container_max_width', label: 'Container Max Width', placeholder: '1280' },
    { key: 'section_spacing', label: 'Section Spacing', placeholder: '80' },
    { key: 'card_columns', label: 'Card Columns', placeholder: '3' },
    { key: 'font_scale', label: 'Font Scale %', placeholder: '100' },
    { key: 'image_height', label: 'Image Height', placeholder: '280' },
    { key: 'button_size', label: 'Button Size', placeholder: 'md' },
    { key: 'nav_style', label: 'Nav Style', placeholder: 'horizontal' },
    { key: 'sidebar_visible', label: 'Sidebar Visible', placeholder: 'true' },
  ];

  return (
    <ManagementLayout title="Responsive Control" description="Set breakpoint-specific overrides for container widths, spacing, columns, and more." icon={<Smartphone size={20} className="text-[#1B4332]" />}>
      <div className="space-y-5">
        <div className="flex items-center justify-end gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 px-3 py-2 rounded-lg text-xs font-sans transition-all cursor-pointer whitespace-nowrap">
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#1B4332]/90 text-white px-4 py-2 rounded-lg text-xs font-sans transition-all cursor-pointer whitespace-nowrap disabled:opacity-50">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Changes</>}
          </button>
        </div>

        <div className="space-y-3">
          {BREAKPOINTS.map((bp) => {
            const isExpanded = expandedBreakpoint === bp.key;
            return (
              <div key={bp.key} className="bg-white rounded-lg border border-stone-100 overflow-hidden">
                <button
                  onClick={() => setExpandedBreakpoint(isExpanded ? null : bp.key)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors cursor-pointer text-left"
                >
                  <div className="w-8 h-8 rounded-md bg-[#1B4332]/8 flex items-center justify-center text-[#1B4332]">
                    {bp.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-stone-700">{bp.label}</p>
                    <p className="text-[10px] text-stone-400">{bp.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-stone-400">{bp.defaultWidth}px+</span>
                    {isExpanded ? <i className="ri-arrow-up-s-line text-stone-300 text-sm"></i> : <i className="ri-arrow-down-s-line text-stone-300 text-sm"></i>}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-stone-50">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                      {overrideFields.map((field) => (
                        <Field
                          key={field.key}
                          label={field.label}
                          value={getResp(bp.key, field.key)}
                          onChange={(v) => setResp(bp.key, field.key, v)}
                          placeholder={field.placeholder}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-md">
          <Info size={13} className="text-amber-600 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 font-sans">Leave a field empty to inherit from the next larger breakpoint. Desktop values are the global defaults and cascade down automatically.</p>
        </div>
      </div>
    </ManagementLayout>
  );
}