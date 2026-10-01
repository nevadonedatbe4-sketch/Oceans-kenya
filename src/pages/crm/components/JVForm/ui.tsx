import { useState, type ReactNode } from 'react';

/* ── JV Land Listing form theme ──
   Rectangular, minimal, premium. Navy + white button system.
   Minimum base text 16px. Avoid pill shapes & excess rounding. ── */
export const NAVY = '#001731';

export const inputCls =
  'w-full border border-[#cdd5de] bg-white px-3.5 py-2.5 text-[16px] font-roboto text-[#001731] placeholder:text-[#9aa4b1] focus:outline-none focus:border-[#001731] focus:ring-1 focus:ring-[#001731]/20 rounded-md';

export const selectCls =
  "w-full border border-[#cdd5de] bg-white px-3.5 py-2.5 text-[16px] font-roboto text-[#001731] focus:outline-none focus:border-[#001731] focus:ring-1 focus:ring-[#001731]/20 rounded-md cursor-pointer appearance-none pr-10 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23001731%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px]";

export const labelCls = 'block text-[16px] font-roboto font-bold text-[#001731] mb-1.5';
export const hintCls = 'text-[14px] font-roboto text-[#6b7684] mt-1.5 leading-relaxed';

/* White → navy hover/active state: the default is navy with white text; on
   hover/selected it flips to white with navy text + navy border. */
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-none bg-[#001731] text-white text-[16px] font-roboto font-semibold text-center hover:bg-white hover:text-[#001731] hover:shadow-[inset_0_0_0_1px_#001731] transition-all cursor-pointer whitespace-nowrap';
export const btnSecondary =
  'inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-none bg-white text-[#001731] shadow-[inset_0_0_0_1px_#001731] text-[16px] font-roboto font-semibold text-center hover:bg-[#001731] hover:text-white transition-all cursor-pointer whitespace-nowrap';
export const btnGhost =
  'inline-flex items-center gap-2 px-4 py-3 sm:py-2.5 rounded-none text-[#6b7684] hover:text-[#001731] text-[16px] font-roboto font-medium text-center hover:bg-[#f2f4f6] transition-all cursor-pointer whitespace-nowrap';

/* Marks a field whose value was inherited from the linked land listing, so the
   agent can tell inherited data apart from JV-specific input at a glance. */
export function InheritedChip({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 align-middle text-[11px] font-roboto font-semibold text-[#088135] bg-[#e6f4ea] rounded whitespace-nowrap">
      <i className="ri-download-2-line" />
      From land listing
    </span>
  );
}

export function Field({ label, required, hint, inherited, children }: { label?: string; required?: boolean; hint?: string; inherited?: boolean; children: ReactNode }) {
  return (
    <div>
      {label && (
        <label className={labelCls}>
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
          <InheritedChip show={inherited} />
        </label>
      )}
      {children}
      {hint && <p className={hintCls}>{hint}</p>}
    </div>
  );
}

/* Collapsible section with a numbered header — keeps the long form tidy.
   `complete` shows a dynamic green completion check (green when filled,
   neutral when empty, amber when partial). `dark` renders the section as
   a clearly-identifiable internal/private CRM block (soft light-blue panel,
   dark navy type) so it still reads as private without a heavy dark fill. */
export function JvSection({ num, title, subtitle, children, defaultOpen = false, complete = false, dark = false, required = false, statusBadge }: {
  num: string; title: string; subtitle?: string; children: ReactNode; defaultOpen?: boolean; complete?: boolean; dark?: boolean; required?: boolean; statusBadge?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border overflow-hidden ${dark ? 'bg-[#eaf2fb] border-[#cfe0f2]' : 'bg-white border-[#e2e7ec]'}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center gap-3 px-4 sm:px-6 py-4 sm:py-5 text-left transition-colors cursor-pointer whitespace-normal ${dark ? 'bg-[#eaf2fb] hover:bg-[#dfeaf7]' : 'bg-[#f8f9fb] hover:bg-[#f2f4f6]'}`}
      >
        <span className={`w-7 h-7 flex items-center justify-center rounded-none text-[13px] font-bold flex-shrink-0 ${dark ? 'bg-[#001731] text-white' : 'bg-[#001731] text-white'}`}>{num}</span>
        <span className="flex-1 min-w-0">
          <span className={`block font-jost text-[17px] font-bold ${dark ? 'text-[#001731]' : 'text-[#001731]'}`}>
            {title}
            {required && <span className="text-red-500 ml-1 font-bold" aria-label="required section">*</span>}
          </span>
          {subtitle && <span className={`block text-[14px] font-roboto mt-0.5 leading-relaxed ${dark ? 'text-[#5a6b80]' : 'text-[#6b7684]'}`}>{subtitle}</span>}
        </span>
        {statusBadge && <span className="hidden sm:inline-flex items-center flex-shrink-0">{statusBadge}</span>}
        {/* Completion indicator */}
        <span
          className={`hidden sm:inline-flex items-center gap-1.5 text-[13px] font-roboto font-semibold pl-2.5 pr-2.5 py-1 flex-shrink-0 ${
            complete
              ? `bg-[#088135]/12 ${dark ? 'text-[#001731]' : 'text-[#088135]'}`
              : dark ? 'bg-[#d7e6f6] text-[#001731]' : 'bg-[#eef2f5] text-[#6b7684]'
          }`}
        >
          <i className={complete ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'} />
          {complete ? 'Complete' : 'Incomplete'}
        </span>
        <i className={`ri-arrow-down-s-line text-xl transition-transform ${dark ? 'text-[#5a6b80]' : 'text-[#6b7684]'} ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className={`px-4 sm:px-6 py-5 sm:py-6 space-y-5 sm:space-y-6 ${dark ? 'bg-[#eaf2fb]' : ''}`}>{children}</div>}
    </div>
  );
}

/* Rectangular checkable payment-term pills in a horizontal wrapping layout. */
export function PaymentTermPills({ label, hint, options, value, onChange }: {
  label?: string; hint?: string; options: string[]; value: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <div className="flex flex-wrap gap-2.5">
        {options.map((opt) => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 border rounded-none text-[16px] font-roboto font-medium transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'border-[#001731] bg-[#001731] text-white'
                  : 'border-[#cdd5de] bg-white text-[#001731] hover:border-[#001731]/40'
              }`}
            >
              <i className={active ? 'ri-checkbox-fill' : 'ri-checkbox-blank-line'} />
              {opt}
            </button>
          );
        })}
      </div>
      {hint && <p className={hintCls}>{hint}</p>}
      {value.length > 0 && (
        <p className="text-[13px] font-roboto text-[#088135] mt-2">{value.length} term{value.length > 1 ? 's' : ''} selected</p>
      )}
    </div>
  );
}

/* Rectangular multi-select checkbox cards. */
export function CheckboxGrid({ label, hint, inherited, options, value, onChange, cols = 3 }: {
  label?: string; hint?: string; inherited?: boolean; options: string[]; value: string[]; onChange: (v: string[]) => void; cols?: number;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };
  const gridCols = cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return (
    <div>
      {label && (
        <label className={labelCls}>
          {label}
          <InheritedChip show={inherited} />
        </label>
      )}
      <div className={`grid ${gridCols} gap-2.5`}>
        {options.map((opt) => {
          const active = value.includes(opt);
          return (
            <label
              key={opt}
              className={`flex items-start gap-2.5 px-3.5 py-2.5 border rounded-md cursor-pointer transition-colors text-[16px] font-roboto ${
                active ? 'border-[#001731] bg-[#001731]/5 text-[#001731]' : 'border-[#cdd5de] bg-white text-[#001731] hover:border-[#001731]/40'
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(opt)}
                className="w-[18px] h-[18px] shrink-0 mt-0.5 rounded text-[#001731] border-[#cdd5de] focus:ring-[#001731]"
              />
              <span className="select-none leading-snug">{opt}</span>
            </label>
          );
        })}
      </div>
      {hint && <p className={hintCls}>{hint}</p>}
    </div>
  );
}

/* Divider between form groups. */
export function Divider() {
  return <div className="border-t border-[#e2e7ec]" />;
}