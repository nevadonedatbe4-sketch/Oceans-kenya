import type { ReactNode } from 'react';

export function SC({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 flex items-center justify-center"><i className={`${icon} text-[#1B4332] text-sm`}></i></span>
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function TextF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700 block">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white" />
    </div>
  );
}

export function TextAreaF({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700 block">{label}</label>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white resize-y" />
    </div>
  );
}

export function ToggleF({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <button type="button" onClick={() => onChange(!value)} className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${value ? 'bg-[#1B4332]' : 'bg-stone-300'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}

// Simple list editor for a list of strings (e.g. popular areas, related searches).
export function StringListEditor({
  label, items, onChange, placeholder,
}: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-stone-700 block">{label}</label>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={it}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] bg-white"
          />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-md cursor-pointer"><i className="ri-delete-bin-line text-sm"></i></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ''])} className="text-xs font-medium text-[#1B4332] hover:underline cursor-pointer">+ Add item</button>
    </div>
  );
}