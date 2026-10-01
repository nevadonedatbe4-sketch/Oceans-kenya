import { useMemo } from 'react';
import { FIELDS, fieldLabel, type ColumnAssignment, type FieldKey } from '@/lib/importPlaces';

interface MappingStepProps {
  headers: string[];
  assignments: ColumnAssignment[];
  rowCount: number;
  onChange: (next: ColumnAssignment[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function MappingStep({
  headers,
  assignments,
  rowCount,
  onChange,
  onBack,
  onContinue,
}: MappingStepProps) {
  const nameAssigned = assignments.some((a) => a.field === 'name');
  const detectedCount = assignments.filter((a) => a.field).length;

  const usedBy = useMemo(() => {
    const map: Partial<Record<FieldKey, string>> = {};
    assignments.forEach((a) => {
      if (a.field) map[a.field] = a.header || `Column ${a.index + 1}`;
    });
    return map;
  }, [assignments]);

  const setField = (index: number, value: string) => {
    onChange(
      assignments.map((a) => {
        if (a.index === index) return { ...a, field: value ? (value as FieldKey) : null, auto: false };
        // A canonical field can only be assigned to one column.
        if (value && a.field === value) return { ...a, field: null, auto: false };
        return a;
      }),
    );
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-jost text-base font-semibold text-[#001731]">Map columns</h3>
          <p className="text-base text-[#7a8a99]">
            {headers.length} column{headers.length === 1 ? '' : 's'} detected from {rowCount} row{rowCount === 1 ? '' : 's'}.
            {' '}{detectedCount} auto-matched. Adjust anything that looks wrong, or ignore a column.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e8edf2]">
        <table className="w-full text-left">
          <thead className="bg-[#f7f8fa] border-b border-[#e8edf2]">
            <tr>
              <th className="px-4 py-3 text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider">Spreadsheet column</th>
              <th className="px-4 py-3 text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider">Places field</th>
              <th className="px-4 py-3 text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider w-28 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => {
              const isDuplicateAssignment =
                !!a.field && usedBy[a.field] !== (a.header || `Column ${a.index + 1}`);
              return (
                <tr key={a.index} className="border-b border-[#e8edf2]/60">
                  <td className="px-4 py-3">
                    <p className="text-base font-roboto font-medium text-[#001731]">{a.header || `Column ${a.index + 1}`}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={a.field || ''}
                      onChange={(e) => setField(a.index, e.target.value)}
                      className="w-full max-w-xs px-3 py-2 border border-[#e8edf2] rounded-lg text-base font-roboto text-[#001731] bg-white focus:outline-none focus:border-[#0d5959]"
                    >
                      <option value="">Ignore column</option>
                      {FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}{f.required ? ' (required)' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isDuplicateAssignment ? (
                      <span className="inline-flex items-center gap-1 text-xs font-roboto font-semibold text-red-600">
                        <i className="ri-close-line" /> Conflict
                      </span>
                    ) : a.field ? (
                      <span className="inline-flex items-center gap-1 text-sm font-roboto font-semibold text-emerald-700">
                        <i className="ri-check-line" /> {fieldLabel(a.field)}
                      </span>
                    ) : (
                      <span className="text-sm font-roboto text-[#7a8a99]">Ignored</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!nameAssigned && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <i className="ri-error-warning-line text-red-600 text-lg mt-0.5" />
          <p className="text-base font-roboto text-red-700">
            No column is mapped to <span className="font-semibold">Name</span>. Map your place-name column to Name to continue.
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[#7a8a99] hover:bg-[#f7f8fa] px-4 py-2.5 rounded-lg text-base font-roboto font-medium cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line" /> Choose another file
        </button>
        <button
          onClick={onContinue}
          disabled={!nameAssigned}
          className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-5 py-2.5 rounded-lg text-base font-roboto font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          Continue to preview <i className="ri-arrow-right-line" />
        </button>
      </div>
    </div>
  );
}