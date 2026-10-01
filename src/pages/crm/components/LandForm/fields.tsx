import { useState, type ReactNode } from 'react';

/* Land theme token — adopts the continuity form's vivid green so the Land form stands out. */
export const GREEN = '#088135';

/* Foxtons-grade readability: 18px body text, 17px labels @600, clear borders. */
export const inputCls =
  'w-full border border-[#aab4bf] px-4 py-3 text-[18px] font-roboto text-[#111827] placeholder:text-[#87919d] focus:outline-none focus:border-[#088135] focus:ring-2 focus:ring-[#088135]/20 rounded-lg bg-white';

export const labelCls = 'block text-[#111827] font-roboto text-[18px] font-semibold mb-2';

/* Dark, clearly visible chevron on custom selects. */
const selectChevron =
  "appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23233340%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_16px_center] bg-[length:20px_20px] pr-11 cursor-pointer";

/* Sentinel used when "Other" is toggled but no custom text typed yet. */
const OTHER_SENTINEL = '__land_other__';

export function SectionCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#088135]/25 overflow-hidden">
      <div className="p-5 md:p-7">{children}</div>
    </div>
  );
}

export function SectionHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#088135]/20">
      <span className="w-8 h-8 rounded-md bg-[#088135] text-white text-[14px] font-bold flex items-center justify-center flex-shrink-0">{step}</span>
      <div className="min-w-0">
        <h3 className="font-jost text-lg font-semibold text-[#0d1f2d]">{title}</h3>
        {subtitle && <p className="text-[14px] font-roboto text-[#4b6a72] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Field({ label, required, hint, children }: { label?: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div>
      {label && (
        <label className={labelCls}>
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="text-[14px] font-roboto text-[#4b6a72] mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Single-select dropdown.
   Always includes an "Other / Specify" option that reveals a
   free-text field, so anything missing from the suggested list
   can still be captured.
   ───────────────────────────────────────────────────────────── */
export function SelectField({ value, onChange, options, placeholder, allowOther = true }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
  placeholder?: string; allowOther?: boolean;
}) {
  const [otherText, setOtherText] = useState('');
  const baseOptions = placeholder ? [{ value: '', label: placeholder }, ...options] : options;
  const allOptions = allowOther ? [...baseOptions, { value: OTHER_SENTINEL, label: 'Other / Specify' }] : baseOptions;
  const isOther = value === OTHER_SENTINEL;
  const isCustom = !!value && value !== OTHER_SENTINEL && !options.some((o) => o.value === value);
  const showOtherInput = allowOther && (isOther || isCustom);

  return (
    <div>
      <select
        value={isCustom ? OTHER_SENTINEL : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTHER_SENTINEL) { setOtherText(''); onChange(OTHER_SENTINEL); return; }
          onChange(v);
        }}
        className={`${inputCls} ${selectChevron}`}
      >
        {allOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {showOtherInput && (
        <input
          value={isCustom ? value : otherText}
          onChange={(e) => { setOtherText(e.target.value); onChange(e.target.value); }}
          placeholder="Type your own value…"
          className={`${inputCls} mt-2`}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Searchable single-select (e.g. county) with an inline
   "Use custom value" action so any missing option can be typed.
   ───────────────────────────────────────────────────────────── */
export function SearchableSelect({ value, onChange, options, placeholder, allowOther = true }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; allowOther?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const isCustom = allowOther && !!value && !options.includes(value);
  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((p) => !p); setQuery(''); }}
        className={`${inputCls} flex items-center justify-between cursor-pointer text-left`}
      >
        <span className={value ? 'text-[#111827]' : 'text-[#87919d]'}>{value || placeholder || 'Select'}</span>
        <i className={`ri-arrow-down-s-line text-[#233340] text-xl transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-white border border-[#c2c9d2] rounded-lg max-h-[70vh] min-h-[240px] overflow-auto shadow-lg">
            <div className="p-2.5 sticky top-0 bg-white border-b border-[#d6dbe1]">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search…"
                className="w-full border border-[#c2c9d2] px-3 py-2 text-base font-roboto rounded-md text-[#111827] focus:outline-none focus:border-[#088135]"
              />
            </div>
            {filtered.length === 0 && (
              <p className="p-4 text-[13px] text-[#87919d]">No matches in the list</p>
            )}
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-[17px] font-roboto text-[#111827] hover:bg-[#088135]/5 cursor-pointer ${value === o ? 'bg-[#088135]/5 text-[#088135] font-semibold' : ''}`}
              >
                {o}
              </button>
            ))}
            {allowOther && (
              <div className="border-t border-[#d6dbe1]">
                <button
                  type="button"
                  onClick={() => {
                    const custom = query.trim();
                    onChange(custom || 'Other / Custom');
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[17px] font-roboto font-semibold text-[#088135] hover:bg-[#088135]/5 cursor-pointer"
                >
                  <i className="ri-add-line text-base" />
                  {query.trim() ? `Use "${query.trim()}" as a custom value` : 'Use a custom value'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {isCustom && (
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#088135]/10 text-[#088135] text-[16px] font-roboto font-medium rounded-md">
            <i className="ri-checkbox-circle-fill text-[13px]" /> {value}
            <button type="button" onClick={() => onChange('')} className="cursor-pointer hover:text-[#065a27]">
              <i className="ri-close-line" />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

export function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-[18px] h-[18px] rounded border-[#aab4bf] text-[#088135] focus:ring-[#088135]" />
      <span className="text-[17px] font-roboto text-[#111827]">{label}</span>
    </label>
  );
}

/* ─────────────────────────────────────────────────────────────
   Multi-select dropdown.
   Click to expand a checklist of options, tick several, and the
   dropdown closes on an outside click. Includes an "Other /
   Specify" option with a free-text field, and selected values
   render as removable chips beneath the trigger.
   ───────────────────────────────────────────────────────────── */
export function MultiSelectDropdown({ label, hint, options, value, onChange, allowOther = true, placeholder }: {
  label: string; hint?: string; options: string[]; value: string[]; onChange: (v: string[]) => void; allowOther?: boolean; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const optionsWithoutOther = options.filter((o) => o !== 'Other');
  const filtered = optionsWithoutOther.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  const customEntries = value.filter((v) => v !== OTHER_SENTINEL && !optionsWithoutOther.includes(v));
  const hasCustomChecked = value.includes(OTHER_SENTINEL) || customEntries.length > 0;
  const customVal = customEntries[customEntries.length - 1] || '';

  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };
  const toggleOther = (checked: boolean) => {
    const base = value.filter((v) => v !== OTHER_SENTINEL && !optionsWithoutOther.includes(v));
    onChange(checked ? [...base, OTHER_SENTINEL] : base);
  };
  const onOtherText = (t: string) => {
    const base = value.filter((v) => v !== OTHER_SENTINEL && !optionsWithoutOther.includes(v));
    onChange(t.trim() ? [...base, t] : [...base, OTHER_SENTINEL]);
  };

  const chips = value.filter((v) => v !== OTHER_SENTINEL);
  const summaryText = chips.length === 0 ? (placeholder || 'Select options') : `${chips.length} selected`;

  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setOpen((p) => !p); setQuery(''); }}
          className={`${inputCls} flex items-center justify-between cursor-pointer text-left`}
        >
          <span className={chips.length ? 'text-[#111827]' : 'text-[#87919d]'}>{summaryText}</span>
          <i className={`ri-arrow-down-s-line text-[#233340] text-xl transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute z-20 mt-1 w-full bg-white border border-[#c2c9d2] rounded-lg max-h-[70vh] min-h-[240px] overflow-auto shadow-lg">
              <div className="p-2.5 sticky top-0 bg-white border-b border-[#d6dbe1]">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search options…"
                  className="w-full border border-[#c2c9d2] px-3 py-2 text-base font-roboto rounded-md text-[#111827] focus:outline-none focus:border-[#088135]"
                />
              </div>
              {filtered.length === 0 && <p className="p-4 text-[13px] text-[#87919d]">No matches in the list</p>}
              {filtered.map((opt) => {
                const active = value.includes(opt);
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 px-4 py-2.5 text-[17px] font-roboto cursor-pointer transition-colors ${
                      active ? 'bg-[#088135]/5 text-[#088135]' : 'text-[#111827] hover:bg-[#088135]/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggle(opt)}
                      className="w-[18px] h-[18px] rounded text-[#088135] border-[#aab4bf] focus:ring-[#088135]"
                    />
                    <span className="select-none">{opt}</span>
                  </label>
                );
              })}
              {allowOther && (
                <div className="border-t border-[#d6dbe1]">
                  <label
                    className={`flex items-center gap-3 px-4 py-2.5 text-[17px] font-roboto cursor-pointer transition-colors ${
                      hasCustomChecked ? 'bg-[#088135]/5 text-[#088135]' : 'text-[#111827] hover:bg-[#088135]/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={hasCustomChecked}
                      onChange={(e) => toggleOther(e.target.checked)}
                      className="w-[18px] h-[18px] rounded text-[#088135] border-[#aab4bf] focus:ring-[#088135]"
                    />
                    <span className="select-none">Other / Specify</span>
                  </label>
                  {hasCustomChecked && (
                    <div className="px-4 pb-3">
                      <input
                        value={customVal || ''}
                        onChange={(e) => onOtherText(e.target.value)}
                        placeholder="Type your own value…"
                        className={`${inputCls} py-2`}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {chips.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#088135]/10 text-[#088135] text-[16px] font-roboto font-medium rounded-md">
              <i className="ri-checkbox-circle-fill text-[13px]" /> {c}
              <button type="button" onClick={() => toggle(c)} className="cursor-pointer hover:text-[#065a27]">
                <i className="ri-close-line" />
              </button>
            </span>
          ))}
        </div>
      )}

      {hint && <p className="text-[14px] font-roboto text-[#4b6a72] mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function CheckboxGroup({ label, hint, options, value, onChange, allowOther = true }: {
  label: string; hint?: string; options: string[]; value: string[]; onChange: (v: string[]) => void; allowOther?: boolean;
}) {
  return <MultiSelectDropdown label={label} hint={hint} options={options} value={value} onChange={onChange} allowOther={allowOther} />;
}

/* Compatibility wrapper: multi-select feature fields now render as a
   dropdown checklist instead of a grid. Keeps existing call-sites unchanged. */
export function MultiSelectCheckbox({ label, hint, options, value, onChange, placeholder }: {
  label: string; hint?: string; options: string[]; value: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  return <MultiSelectDropdown label={label} hint={hint} options={options} value={value} onChange={onChange} placeholder={placeholder} />;
}

/* ─────────────────────────────────────────────────────────────
   Flat pill checklist (used on Features & Marketing steps).
   Shows every option as a bordered pill with a checkmark, plus an
   "Other / Specify" row with a free-text field. Selected values
   render as removable chips beneath the pills.
   ───────────────────────────────────────────────────────────── */
export function CheckboxPills({ label, hint, options, value, onChange, allowOther = true, placeholder }: {
  label: string; hint?: string; options: string[]; value: string[]; onChange: (v: string[]) => void; allowOther?: boolean; placeholder?: string;
}) {
  const optionsWithoutOther = options.filter((o) => o !== 'Other');
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };

  const customEntries = value.filter((v) => v !== OTHER_SENTINEL && !optionsWithoutOther.includes(v));
  const hasCustomChecked = value.includes(OTHER_SENTINEL) || customEntries.length > 0;
  const customVal = customEntries[customEntries.length - 1] || '';
  const toggleOther = (checked: boolean) => {
    const base = value.filter((v) => v !== OTHER_SENTINEL && !optionsWithoutOther.includes(v));
    onChange(checked ? [...base, OTHER_SENTINEL] : base);
  };
  const onOtherText = (t: string) => {
    const base = value.filter((v) => v !== OTHER_SENTINEL && !optionsWithoutOther.includes(v));
    onChange(t.trim() ? [...base, t] : [...base, OTHER_SENTINEL]);
  };

  const chips = value.filter((v) => v !== OTHER_SENTINEL);

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {optionsWithoutOther.map((opt) => {
          const active = value.includes(opt);
          return (
            <label
              key={opt}
              className={`flex items-start gap-2.5 px-3.5 py-2.5 border rounded-lg cursor-pointer transition-colors text-[16px] font-roboto ${
                active
                  ? 'border-[#088135] bg-[#088135]/10 text-[#0d1f2d]'
                  : 'border-[#aab4bf] bg-white text-[#111827] hover:border-[#088135]/40'
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(opt)}
                className="w-[18px] h-[18px] shrink-0 mt-0.5 rounded text-[#088135] border-[#aab4bf] focus:ring-[#088135]"
              />
              <span className="select-none leading-snug">{opt}</span>
            </label>
          );
        })}
        {allowOther && (
          <label
            className={`flex items-start gap-2.5 px-3.5 py-2.5 border rounded-lg cursor-pointer transition-colors text-[16px] font-roboto ${
              hasCustomChecked
                ? 'border-[#088135] bg-[#088135]/10 text-[#0d1f2d]'
                : 'border-[#aab4bf] bg-white text-[#111827] hover:border-[#088135]/40'
            }`}
          >
            <input
              type="checkbox"
              checked={hasCustomChecked}
              onChange={(e) => toggleOther(e.target.checked)}
              className="w-[18px] h-[18px] shrink-0 mt-0.5 rounded text-[#088135] border-[#aab4bf] focus:ring-[#088135]"
            />
            <span className="select-none leading-snug">Other / Specify</span>
            {hasCustomChecked && <span className="text-[13px] font-medium text-[#088135]">— type below</span>}
          </label>
        )}
      </div>

      {hasCustomChecked && (
        <input
          value={customVal || ''}
          onChange={(e) => onOtherText(e.target.value)}
          placeholder="Type your own value…"
          className={`${inputCls} mt-2.5`}
        />
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {chips.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#088135]/10 text-[#088135] text-[16px] font-roboto font-medium rounded-md">
              <i className="ri-checkbox-circle-fill text-[13px]" /> {c}
              <button type="button" onClick={() => toggle(c)} className="cursor-pointer hover:text-[#065a27]">
                <i className="ri-close-line" />
              </button>
            </span>
          ))}
        </div>
      )}

      {hint && <p className="text-[14px] font-roboto text-[#4b6a72] mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Flat horizontal checkbox list.
   Renders options as simple "☐ Option" rows that wrap naturally
   onto new lines — no pills, buttons, or dropdown styling.
   Used for Water, Electricity, Connectivity and Sewage groups.
   ───────────────────────────────────────────────────────────── */
export function FlatCheckboxList({ label, hint, options, value, onChange, allowOther = true }: {
  label: string; hint?: string; options: string[]; value: string[]; onChange: (v: string[]) => void; allowOther?: boolean;
}) {
  const optionsWithoutOther = options.filter((o) => o !== 'Other');
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };

  const customEntries = value.filter((v) => v !== OTHER_SENTINEL && !optionsWithoutOther.includes(v));
  const hasCustomChecked = value.includes(OTHER_SENTINEL) || customEntries.length > 0;
  const customVal = customEntries[customEntries.length - 1] || '';
  const toggleOther = (checked: boolean) => {
    const base = value.filter((v) => v !== OTHER_SENTINEL && !optionsWithoutOther.includes(v));
    onChange(checked ? [...base, OTHER_SENTINEL] : base);
  };
  const onOtherText = (t: string) => {
    const base = value.filter((v) => v !== OTHER_SENTINEL && !optionsWithoutOther.includes(v));
    onChange(t.trim() ? [...base, t] : [...base, OTHER_SENTINEL]);
  };

  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-2.5">
        {optionsWithoutOther.map((opt) => {
          const active = value.includes(opt);
          return (
            <label key={opt} className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(opt)}
                className="w-[18px] h-[18px] shrink-0 rounded text-[#088135] border-[#aab4bf] focus:ring-[#088135]"
              />
              <span className="text-[16px] font-roboto font-medium text-[#111827] leading-snug">{opt}</span>
            </label>
          );
        })}
        {allowOther && (
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasCustomChecked}
              onChange={(e) => toggleOther(e.target.checked)}
              className="w-[18px] h-[18px] shrink-0 rounded text-[#088135] border-[#aab4bf] focus:ring-[#088135]"
            />
            <span className="text-[16px] font-roboto font-medium text-[#111827] leading-snug">Other / Specify</span>
          </label>
        )}
      </div>

      {hasCustomChecked && (
        <input
          value={customVal || ''}
          onChange={(e) => onOtherText(e.target.value)}
          placeholder="Type your own value…"
          className={`${inputCls} mt-2.5`}
        />
      )}

      {hint && <p className="text-[14px] font-roboto text-[#4b6a72] mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function Collapsible({ title, icon, children }: { title: string; icon?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#c2c9d2] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-[#f6f8f9] transition-colors cursor-pointer"
      >
        <span className="inline-flex items-center gap-2.5 text-[17px] font-roboto font-semibold text-[#0d1f2d]">
          {icon && <i className={icon} />}
          {title}
        </span>
        <i className={`ri-arrow-down-s-line transition-transform ${open ? 'rotate-180' : ''} text-[#233340] text-xl`} />
      </button>
      {open && <div className="p-5 space-y-5 border-t border-[#d6dbe1]">{children}</div>}
    </div>
  );
}

export function Divider() {
  return <div className="border-t border-[#d6dbe1]" />;
}