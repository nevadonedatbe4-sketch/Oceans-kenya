import { useMemo, useState } from 'react';
import type { ImportRow, RowSummary } from '@/lib/importPlaces';
import { STATUS_META } from './statusMeta';

interface PreviewStepProps {
  rows: ImportRow[];
  summary: RowSummary;
  onChangeDecision: (rowNumber: number, decision: 'include' | 'skip') => void;
  onBulkDecision: (decision: 'include' | 'skip', rowNumbers: number[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

const PAGE_SIZE = 50;

type Filter = 'all' | 'ready' | 'review' | 'duplicates';

export default function PreviewStep({ rows, summary, onChangeDecision, onBulkDecision, onBack, onContinue }: PreviewStepProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);

  const duplicateRows = useMemo(() => rows.filter((r) => !!r.duplicateOf && r.status !== 'error'), [rows]);
  const includeableRows = useMemo(() => rows.filter((r) => r.status !== 'error'), [rows]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'ready':
        return rows.filter((r) => r.status === 'ready');
      case 'review':
        return rows.filter((r) => r.status === 'warning' || r.status === 'error');
      case 'duplicates':
        return rows.filter((r) => !!r.duplicateOf);
      default:
        return rows;
    }
  }, [rows, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const chips: { key: Filter; label: string; value: number; className: string }[] = [
    { key: 'all', label: 'rows detected', value: summary.total, className: 'bg-[#f7f8fa] text-[#001731]' },
    { key: 'ready', label: 'ready to import', value: summary.ready, className: 'bg-emerald-50 text-emerald-700' },
    { key: 'duplicates', label: 'duplicates', value: summary.duplicates, className: 'bg-amber-50 text-amber-700' },
    { key: 'review', label: 'need a look', value: summary.errors + summary.warnings, className: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Summary chips (clickable filters) */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              setFilter(c.key);
              setPage(1);
            }}
            className={`px-3 py-2 rounded-lg text-base font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap ${c.className} ${
              filter === c.key ? 'ring-2 ring-[#0d5959]/40' : 'opacity-90'
            }`}
          >
            {c.value} {c.label}
          </button>
        ))}
      </div>

      {/* Bulk actions across every page */}
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg border border-[#e8edf2] bg-[#f7f8fa] px-3 py-2.5">
        <div className="flex flex-col">
          <span className="inline-flex items-center gap-1.5 text-sm font-roboto font-semibold text-[#4b5563]">
            <i className="ri-checkbox-multiple-line text-[#0d5959]" /> Bulk actions
          </span>
          <span className="text-xs font-roboto text-[#7a8a99]">
            Every row imports by default — only rows with no name are left out.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onBulkDecision('include', includeableRows.map((r) => r.rowNumber))}
            disabled={includeableRows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-roboto font-medium bg-[#0d5959] text-white hover:bg-[#0d5959]/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
          >
            <i className="ri-check-double-line" /> Include all ({includeableRows.length})
          </button>
          <button
            onClick={() => onBulkDecision('skip', rows.map((r) => r.rowNumber))}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-roboto font-medium bg-white border border-[#e8edf2] text-[#4b5563] hover:border-[#c7d3dc] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
          >
            <i className="ri-close-line" /> Skip all
          </button>

          {duplicateRows.length > 0 && (
            <>
              <span className="w-px h-5 bg-[#e8edf2] mx-0.5" aria-hidden="true" />
              <span className="text-xs font-roboto font-semibold text-amber-700 whitespace-nowrap">
                Possible duplicates: {duplicateRows.length}
              </span>
              <button
                onClick={() => onBulkDecision('skip', duplicateRows.map((r) => r.rowNumber))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-roboto font-medium bg-white border border-[#e8edf2] text-[#4b5563] hover:border-[#c7d3dc] transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-delete-bin-6-line" /> Skip all duplicates
              </button>
              <button
                onClick={() => onBulkDecision('include', duplicateRows.map((r) => r.rowNumber))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-roboto font-medium bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-circle-line" /> Import duplicates anyway
              </button>
            </>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#e8edf2]">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[820px]">
            <thead className="bg-[#f7f8fa] border-b border-[#e8edf2]">
              <tr>
                <th className="px-3 py-3 text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider w-14">Row</th>
                <th className="px-3 py-3 text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider">Name</th>
                <th className="px-3 py-3 text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider">Category</th>
                <th className="px-3 py-3 text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider">Area</th>
                <th className="px-3 py-3 text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider">Phone</th>
                <th className="px-3 py-3 text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider">Website</th>
                <th className="px-3 py-3 text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => {
                const meta = STATUS_META[r.status];
                return (
                  <tr key={r.rowNumber} className="border-b border-[#e8edf2]/60 align-top hover:bg-[#f7f8fa]/60">
                    <td className="px-3 py-3 text-sm font-roboto text-[#7a8a99]">{r.rowNumber}</td>
                    <td className="px-3 py-3">
                      <p className={`text-base font-roboto font-medium ${r.name ? 'text-[#001731]' : 'text-red-500'}`}>
                        {r.name || 'Missing name'}
                      </p>
                      {r.reasons.length > 0 && (
                        <p className="text-xs text-[#7a8a99] mt-0.5 max-w-[240px]">{r.reasons.join(' · ')}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-base font-roboto text-[#4b5563]">{r.categoryLabel || '—'}</td>
                    <td className="px-3 py-3 text-base font-roboto text-[#4b5563]">{r.area || '—'}</td>
                    <td className="px-3 py-3 text-base font-roboto text-[#4b5563]">{r.phone || '—'}</td>
                    <td className="px-3 py-3 text-base font-roboto text-[#4b5563] max-w-[180px] truncate">{r.website || '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-roboto font-semibold whitespace-nowrap ${meta.className}`}>
                        <i className={meta.icon} /> {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === 'error' ? (
                          <span className="text-xs font-roboto text-[#7a8a99] whitespace-nowrap">Skipped</span>
                        ) : (
                          <>
                            <button
                              onClick={() => onChangeDecision(r.rowNumber, 'include')}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-roboto font-medium cursor-pointer whitespace-nowrap ${
                                r.decision === 'include' ? 'bg-[#0d5959] text-white' : 'bg-white border border-[#e8edf2] text-[#4b5563] hover:border-[#c7d3dc]'
                              }`}
                            >
                              {r.duplicateOf ? 'Import anyway' : 'Include'}
                            </button>
                            <button
                              onClick={() => onChangeDecision(r.rowNumber, 'skip')}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-roboto font-medium cursor-pointer whitespace-nowrap ${
                                r.decision === 'skip' ? 'bg-[#dc2626] text-white' : 'bg-white border border-[#e8edf2] text-[#4b5563] hover:border-[#c7d3dc]'
                              }`}
                            >
                              Skip
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-base font-roboto text-[#7a8a99]">
                    Nothing matches this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2.5 bg-[#f7f8fa] border-t border-[#e8edf2]">
            <span className="text-sm font-roboto text-[#7a8a99]">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e8edf2] text-[#4b5563] hover:bg-white disabled:opacity-40 cursor-pointer"><i className="ri-arrow-left-s-line" /></button>
              <span className="text-sm font-roboto text-[#4b5563]">{safePage} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e8edf2] text-[#4b5563] hover:bg-white disabled:opacity-40 cursor-pointer"><i className="ri-arrow-right-s-line" /></button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[#7a8a99] hover:bg-[#f7f8fa] px-4 py-2.5 rounded-lg text-base font-roboto font-medium cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line" /> Back to mapping
        </button>
        <button
          onClick={onContinue}
          disabled={summary.willImport === 0}
          className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-5 py-2.5 rounded-lg text-base font-roboto font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          Continue <i className="ri-arrow-right-line" />
        </button>
      </div>
    </div>
  );
}