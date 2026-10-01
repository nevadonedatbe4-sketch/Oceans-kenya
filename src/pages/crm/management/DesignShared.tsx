import type { ReactNode } from 'react';

/* ================================================================== */
/*  Shared Helpers for the CRM Design tabs                              */
/* ================================================================== */

export function TabLoading() {
  return (
    <div className="bg-white rounded-xl border border-stone-100 p-10 text-center">
      <i className="ri-loader-4-line animate-spin text-stone-300 text-2xl"></i>
      <p className="text-xs text-stone-400 mt-2">Loading settings...</p>
    </div>
  );
}

export function TabInfoBanner({ icon, title, description, tags }: { icon: string; title: string; description: string; tags: string[] }) {
  return (
    <div className="bg-white rounded-xl border border-stone-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-5 h-5 flex items-center justify-center">
          <i className={`${icon} text-[#1B4332] text-sm`}></i>
        </span>
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3>
      </div>
      <p className="text-xs text-stone-500 mb-4">{description}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t} className="px-2.5 py-1 bg-[#1B4332]/8 text-[#1B4332] text-[10px] font-semibold rounded-full uppercase tracking-wide">{t}</span>
        ))}
      </div>
    </div>
  );
}

export function SaveBar({ count, saving, onSave }: { count: number; saving: boolean; onSave: () => void }) {
  return (
    <div className="sticky bottom-0 z-10">
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4 mx-1 mb-1">
        <p className="text-xs text-stone-400">
          <span className="font-medium text-stone-600">{count}</span> tokens configured
        </p>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#1B4332]/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line text-sm"></i>Save Changes</>}
        </button>
      </div>
    </div>
  );
}

export function FieldLabel({ label, cssVar }: { label: string; cssVar: string }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-stone-600 uppercase tracking-widest">{label}</label>
      <span className="text-[9px] font-mono text-stone-300 bg-[#f5f5f5] px-1.5 py-0.5 rounded">{cssVar}</span>
    </div>
  );
}

export function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md bg-white"
      placeholder={placeholder}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input className="w-10 h-10 border border-stone-200 cursor-pointer p-0.5 rounded shrink-0" type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <input className="flex-1 border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md uppercase" type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] rounded-md cursor-pointer bg-white"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${value ? 'bg-[#1B4332]' : 'bg-stone-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}></span>
    </button>
  );
}

export function FieldRow({ label, cssVar, description, children }: { label: string; cssVar: string; description: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <FieldLabel label={label} cssVar={cssVar} />
      {children}
      <p className="text-[11px] text-stone-400">{description}</p>
    </div>
  );
}