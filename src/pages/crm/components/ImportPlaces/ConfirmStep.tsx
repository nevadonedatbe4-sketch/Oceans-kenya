import type { RowSummary } from '@/lib/importPlaces';

interface ConfirmStepProps {
  summary: RowSummary;
  onBack: () => void;
  onConfirm: () => void;
}

export default function ConfirmStep({ summary, onBack, onConfirm }: ConfirmStepProps) {
  return (
    <div className="p-8 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-xl bg-[#0d5959]/10 flex items-center justify-center mb-4">
        <i className="ri-file-list-3-line text-[#0d5959] text-3xl" />
      </div>
      <h3 className="font-jost text-xl font-semibold text-[#001731]">
        You are about to import {summary.willImport} place{summary.willImport === 1 ? '' : 's'}.
      </h3>
      <p className="text-base text-[#7a8a99] mt-1 max-w-md">
        Nothing has been saved yet. Review the breakdown below, then confirm to write these places into the directory.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 w-full max-w-2xl">
        <div className="rounded-lg border border-[#e8edf2] px-4 py-3 text-left">
          <p className="text-2xl font-jost font-semibold text-emerald-700">{summary.willImport}</p>
          <p className="text-sm font-roboto text-[#7a8a99]">New places to import</p>
        </div>
        <div className="rounded-lg border border-[#e8edf2] px-4 py-3 text-left">
          <p className="text-2xl font-jost font-semibold text-amber-700">{summary.willSkip}</p>
          <p className="text-sm font-roboto text-[#7a8a99]">Skipped / duplicates</p>
        </div>
        <div className="rounded-lg border border-[#e8edf2] px-4 py-3 text-left">
          <p className="text-2xl font-jost font-semibold text-[#001731]">{summary.errors}</p>
          <p className="text-sm font-roboto text-[#7a8a99]">Cannot be imported</p>
        </div>
        <div className="rounded-lg border border-[#e8edf2] px-4 py-3 text-left">
          <p className="text-2xl font-jost font-semibold text-[#001731]">{summary.warnings}</p>
          <p className="text-sm font-roboto text-[#7a8a99]">Rows with warnings</p>
        </div>
        <div className="rounded-lg border border-[#e8edf2] px-4 py-3 text-left">
          <p className="text-2xl font-jost font-semibold text-[#001731]">{summary.duplicates}</p>
          <p className="text-sm font-roboto text-[#7a8a99]">Possible duplicates</p>
        </div>
        <div className="rounded-lg border border-[#e8edf2] px-4 py-3 text-left">
          <p className="text-2xl font-jost font-semibold text-[#001731]">{summary.total}</p>
          <p className="text-sm font-roboto text-[#7a8a99]">Rows detected</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[#4b5563] border border-[#e8edf2] hover:bg-[#f7f8fa] px-5 py-2.5 rounded-lg text-base font-roboto font-medium cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line" /> Back
        </button>
        <button
          onClick={onConfirm}
          className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-6 py-2.5 rounded-lg text-base font-roboto font-medium transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-upload-2-line" /> Import {summary.willImport} place{summary.willImport === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  );
}