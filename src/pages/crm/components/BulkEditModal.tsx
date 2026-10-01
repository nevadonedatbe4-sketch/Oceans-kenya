import { useEffect, useState } from 'react';

export interface BulkEditChoice {
  value: string;
  label: string;
}

export interface BulkEditOption {
  field: string;
  label: string;
  choices: BulkEditChoice[];
}

interface BulkEditModalProps {
  open: boolean;
  count: number;
  entityLabel: string;
  options: BulkEditOption[];
  onApply: (field: string, value: string) => void;
  onClose: () => void;
}

/**
 * Bulk edit: lets the user change ONE field across every selected record.
 * Only the chosen field is written, so unrelated data is never overwritten.
 */
export default function BulkEditModal({ open, count, entityLabel, options, onApply, onClose }: BulkEditModalProps) {
  const [field, setField] = useState(options[0]?.field ?? '');
  const [value, setValue] = useState(options[0]?.choices[0]?.value ?? '');

  useEffect(() => {
    if (!open) return;
    const first = options[0];
    setField(first?.field ?? '');
    setValue(first?.choices[0]?.value ?? '');
  }, [open, options]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const active = options.find((o) => o.field === field);
  const activeChoice = active?.choices.find((c) => c.value === value);

  const handleField = (nextField: string) => {
    setField(nextField);
    const opt = options.find((o) => o.field === nextField);
    setValue(opt?.choices[0]?.value ?? '');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#001731]/70" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div>
            <h2 className="text-base font-semibold text-[#001731]">Edit Selected</h2>
            <p className="text-[11px] text-[#88929e] mt-0.5">Update one field across {count} {entityLabel}{count === 1 ? '' : 's'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f8fa] cursor-pointer">
            <i className="ri-close-line text-[#636363] text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-1.5">Field to update</label>
            <select
              value={field}
              onChange={(e) => handleField(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer text-[#001731]"
              style={{ borderColor: '#e5e7eb' }}
            >
              {options.map((o) => <option key={o.field} value={o.field}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#88929e] uppercase tracking-wider mb-1.5">New value</label>
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer text-[#001731]"
              style={{ borderColor: '#e5e7eb' }}
            >
              {(active?.choices ?? []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="rounded-lg p-3 flex items-start gap-2.5" style={{ backgroundColor: 'rgba(13,89,89,0.06)' }}>
            <i className="ri-information-line text-[#0d5959] text-base mt-0.5" />
            <p className="text-[11px] font-medium text-[#001731] leading-relaxed">
              You are about to update <span className="font-bold">{count} {entityLabel}{count === 1 ? '' : 's'}</span>.
              Only <span className="font-bold">{active?.label ?? 'the chosen field'}</span> will be set to
              <span className="font-bold"> {activeChoice?.label ?? '—'}</span>. All other fields stay untouched.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium text-[#636363] hover:bg-[#f7f8fa] transition-all cursor-pointer whitespace-nowrap" style={{ borderColor: '#e5e7eb' }}>
            Cancel
          </button>
          <button
            onClick={() => { if (active) onApply(active.field, value); }}
            disabled={!active}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
            style={{ backgroundColor: '#0d5959' }}
          >
            Update {count} {entityLabel}{count === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}