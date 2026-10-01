import { useState } from 'react';

export interface InlineAddOption {
  value: string;
  label: string;
}

interface InlineAddSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: InlineAddOption[];
  /** Placeholder shown in the dropdown when nothing is selected. */
  placeholder: string;
  /** Placeholder shown in the inline input while adding a new entry. */
  newPlaceholder: string;
  /** Noun used in the tooltip/title, e.g. "category" or "sub category". */
  newNoun: string;
  /** Called when the user confirms a new entry. Return true to close & reset. */
  onAdd: (name: string) => Promise<boolean>;
  /** When true the "New" button is disabled (e.g. no parent selected yet). */
  addDisabled?: boolean;
  /** Tooltip shown when adding is disabled. */
  addDisabledHint?: string;
}

/**
 * A select field with an inline "+ New" affordance so a user can extend the
 * underlying list without leaving the form. It is intentionally dumb: the
 * parent owns persistence and returns whether the add succeeded.
 */
export default function InlineAddSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  newPlaceholder,
  newNoun,
  onAdd,
  addDisabled = false,
  addDisabledHint,
}: InlineAddSelectProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const labelClass = 'block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5';
  const inputClass =
    'w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white text-[#001731]';

  const close = () => {
    setOpen(false);
    setName('');
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    const ok = await onAdd(trimmed);
    setSaving(false);
    if (ok) close();
  };

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            if (addDisabled) return;
            setOpen((v) => !v);
          }}
          disabled={addDisabled}
          title={addDisabled ? addDisabledHint : `Add a new ${newNoun}`}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-2.5 rounded-lg border border-[#0d5959]/30 text-[#0d5959] text-sm font-roboto font-medium hover:bg-[#0d5959]/5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <i className="ri-add-line" /> New
        </button>
      </div>
      {open && (
        <div className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              } else if (e.key === 'Escape') {
                close();
              }
            }}
            className={inputClass}
            placeholder={newPlaceholder}
          />
          <button
            type="button"
            onClick={submit}
            disabled={saving || !name.trim()}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-2.5 rounded-lg bg-[#0d5959] text-white text-sm font-roboto font-medium hover:bg-[#0d5959]/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-check-line" />} Add
          </button>
          <button
            type="button"
            onClick={close}
            title="Cancel"
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border border-[#e8edf2] text-[#7a8a99] hover:bg-[#f7f8fa] cursor-pointer"
          >
            <i className="ri-close-line" />
          </button>
        </div>
      )}
      {open && (
        <p className="text-[11px] text-[#7a8a99] mt-1 font-roboto">
          Saved to the {newNoun} list and available for every place and future imports.
        </p>
      )}
    </div>
  );
}