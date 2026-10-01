import { useEffect, useRef, useState } from 'react';
import {
  FILTER_FIELDS,
  type FilterRow,
  type MatchMode,
} from '@/pages/crm/contacts/contactTableUtils';

interface ContactFiltersPanelProps {
  open: boolean;
  applied: FilterRow[];
  matchMode: MatchMode;
  onApply: (rows: FilterRow[], mode: MatchMode) => void;
  onClear: () => void;
}

function newRow(field: string): FilterRow {
  return { id: `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, field, value: '' };
}

/**
 * Collapsible filter panel — "Contacts that match ALL of these / ANY of these"
 * with a "Select New Filter" dropdown, removable rows, and Apply / Clear.
 * The panel keeps a draft and only commits it when APPLY FILTERS is pressed.
 */
export default function ContactFiltersPanel({
  open,
  applied,
  matchMode,
  onApply,
  onClear,
}: ContactFiltersPanelProps) {
  const [draft, setDraft] = useState<FilterRow[]>(applied);
  const [mode, setMode] = useState<MatchMode>(matchMode);
  const addSelectRef = useRef<HTMLSelectElement>(null);

  // Re-sync the draft with the applied filters whenever the panel opens.
  useEffect(() => {
    if (open) {
      setDraft(applied);
      setMode(matchMode);
    }
  }, [open, applied, matchMode]);

  if (!open) return null;

  const updateRow = (id: string, patch: Partial<FilterRow>) =>
    setDraft((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) => setDraft((prev) => prev.filter((r) => r.id !== id));

  const addField = (field: string) => {
    if (!field) return;
    setDraft((prev) => [...prev, newRow(field)]);
    if (addSelectRef.current) addSelectRef.current.value = '';
  };

  return (
    <section className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
      <div className="px-4 md:px-5 py-3.5 border-b border-[#eef1f4] flex items-center gap-2.5">
        <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#001731]/8 text-[#001731]">
          <i className="ri-equalizer-2-line text-lg" />
        </span>
        <h3 className="admin-subheading text-[#001731]">Filters</h3>
      </div>

      <div className="p-4 md:p-5 space-y-4">
        {/* Match mode */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="admin-label font-semibold text-[#001731]">Contacts that match</span>
          {(['all', 'any'] as MatchMode[]).map((m) => (
            <label key={m} className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contact-match-mode"
                checked={mode === m}
                onChange={() => setMode(m)}
                className="w-4 h-4 accent-[#001731] cursor-pointer"
              />
              <span className="admin-label text-[#001731]">
                {m === 'all' ? 'ALL of these' : 'ANY of these'}
              </span>
            </label>
          ))}
        </div>

        {/* Draft filter rows */}
        {draft.length > 0 && (
          <div className="space-y-2.5">
            {draft.map((row) => (
              <div key={row.id} className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <select
                  value={row.field}
                  onChange={(e) => updateRow(row.id, { field: e.target.value })}
                  className="w-full sm:w-52 px-3 py-2.5 border border-[#e5e7eb] rounded-md bg-white text-[#001731] focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/25 cursor-pointer"
                >
                  {FILTER_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateRow(row.id, { value: e.target.value })}
                  placeholder="contains…"
                  className="flex-1 min-w-0 px-3 py-2.5 border border-[#e5e7eb] rounded-md font-roboto bg-white focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/25"
                />

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label="Remove filter"
                  className="self-start sm:self-auto w-10 h-10 flex items-center justify-center rounded-md text-[#001731]/55 hover:text-[#dc2626] hover:bg-[#dc2626]/8 transition-colors cursor-pointer flex-shrink-0"
                >
                  <i className="ri-close-line text-xl" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add row + actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            ref={addSelectRef}
            defaultValue=""
            onChange={(e) => addField(e.target.value)}
            className="w-full sm:w-56 px-3 py-2.5 border border-[#e5e7eb] rounded-md bg-white text-[#001731] focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/25 cursor-pointer"
          >
            <option value="" disabled>
              Select New Filter
            </option>
            {FILTER_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setDraft((prev) => [...prev, newRow(FILTER_FIELDS[0].value)])}
            aria-label="Add filter row"
            className="w-10 h-10 flex items-center justify-center rounded-md text-white bg-[#001731] hover:bg-[#0d5959] transition-colors cursor-pointer flex-shrink-0"
          >
            <i className="ri-add-line text-xl" />
          </button>

          <button
            type="button"
            onClick={() => onApply(draft, mode)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md admin-label font-semibold text-white bg-[#0d5959] hover:bg-[#001731] transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-filter-3-line text-lg" />
            Apply Filters
          </button>

          <button
            type="button"
            onClick={() => {
              setDraft([]);
              setMode('all');
              onClear();
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md admin-label font-semibold text-[#001731] border border-[#001731]/20 hover:bg-[#f7f9fb] transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-eraser-line text-lg" />
            Clear
          </button>
        </div>
      </div>
    </section>
  );
}