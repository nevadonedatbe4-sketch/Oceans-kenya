import { useState } from 'react';

/* ── Shared luxury styling tokens (match ListingEdit look) ── */
export const inputBase =
  'w-full text-base font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] placeholder:font-normal rounded-md';

export const selectClass = `${inputBase} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237a8a99%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px] pr-11`;

export const labelClass = 'block text-[16px] font-bold tracking-wide text-[#0d1f2d] uppercase mb-2.5 leading-none';

export const hintClass = 'text-[15px] text-[#4a5568] mt-2 leading-relaxed';

export function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
          <i className={`${icon} text-white text-base`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-[#0d1f2d] tracking-wide">{title}</h4>
          <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>
      <div className="h-px bg-[#e5e7eb] mt-4" />
    </div>
  );
}

export function CollapsibleCard({
  icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl mb-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#fafbfc] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-[#f4f6f8] rounded-lg">
            <i className={`${icon} text-[#0d5959] text-sm`} />
          </div>
          <span className="text-[16px] font-semibold text-[#0d1f2d] tracking-normal">{title}</span>
        </div>
        <i
          className={`ri-arrow-down-wide-fill text-[#7a8a99] text-xl transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6 pt-2 border-t border-[#f0f3f5]">{children}</div>
      )}
    </div>
  );
}

export function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input type="checkbox" className="sr-only" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
      <div className={`w-12 h-7 rounded-full transition-colors px-0.5 flex items-center ${enabled ? 'bg-[#0d5959]' : 'bg-[#d1d5db]'}`}>
        <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </label>
  );
}

export function ToggleRow({
  enabled,
  setEnabled,
  label,
  desc,
  icon,
}: {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  label: string;
  desc: string;
  icon: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#f0f3f5] last:border-b-0 hover:bg-[#fafbfc] transition-colors">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-lg border border-[#e8ecf0] bg-[#f4f6f8]">
          <i className={`${icon} text-sm text-[#5a6a7a]`} />
        </div>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold text-[#1a1e24]">{label}</p>
          <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed">{desc}</p>
        </div>
      </div>
      <Toggle enabled={enabled} onChange={setEnabled} />
    </div>
  );
}

export function CounterBox({
  label,
  value,
  onDec,
  onInc,
  min = 0,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  min?: number;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center border-2 border-[#e8edf2] rounded-md bg-white overflow-hidden">
        <button
          type="button"
          disabled={value <= min}
          onClick={onDec}
          className="w-11 h-11 flex items-center justify-center text-[#7a8a99] hover:bg-[#f6f7f9] hover:text-[#0d1f2d] transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed text-lg font-light"
        >
          −
        </button>
        <div className="flex-1 flex items-center justify-center border-x-2 border-[#e8edf2] h-11">
          <span className="text-[17px] font-semibold text-[#0d1f2d]">{value}</span>
        </div>
        <button
          type="button"
          onClick={onInc}
          className="w-12 h-12 flex items-center justify-center text-[#7a8a99] hover:bg-[#f6f7f9] hover:text-[#0d1f2d] transition-colors cursor-pointer text-lg font-light"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function CheckChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none group py-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-[#c8cdd5] text-[#0d5959] focus:ring-[#0d5959]/20 cursor-pointer accent-[#0d5959] shrink-0"
      />
      <span className="text-[16px] text-[#2d3748] group-hover:text-[#0d1f2d] transition-colors leading-snug">{label}</span>
    </label>
  );
}