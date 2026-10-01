import type { ImportResult } from '@/lib/importPlaces';

interface ResultsStepProps {
  result: ImportResult;
  onImportAnother: () => void;
  onViewPlaces: () => void;
  onDownloadFailures: () => void;
}

export default function ResultsStep({
  result,
  onImportAnother,
  onViewPlaces,
  onDownloadFailures,
}: ResultsStepProps) {
  return (
    <div className="p-8 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
        <i className="ri-checkbox-circle-line text-emerald-600 text-3xl" />
      </div>
      <h3 className="font-jost text-xl font-semibold text-[#001731]">Import complete</h3>
      <p className="text-base text-[#7a8a99] mt-1">
        {result.imported} place{result.imported === 1 ? ' was' : 's were'} imported successfully.
      </p>

      <div className="flex items-center gap-3 mt-6 flex-wrap justify-center">
        <span className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-base font-roboto font-semibold">{result.imported} Imported</span>
        <span className="px-4 py-2 rounded-lg bg-amber-50 text-amber-700 text-base font-roboto font-semibold">{result.skipped} Skipped</span>
        <span className="px-4 py-2 rounded-lg bg-[#f7f8fa] text-[#001731] text-base font-roboto font-semibold">{result.failed} Failed</span>
      </div>

      {result.failed > 0 && (
        <div className="mt-5 w-full max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-base font-roboto text-red-700">
              {result.failed} row{result.failed === 1 ? '' : 's'} could not be imported.
            </p>
            <button
              onClick={onDownloadFailures}
              className="inline-flex items-center gap-1.5 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-roboto font-semibold cursor-pointer whitespace-nowrap"
            >
              <i className="ri-download-2-line" /> Download failed rows
            </button>
          </div>
          <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {result.failures.slice(0, 50).map((f) => (
              <li key={f.rowNumber} className="text-sm font-roboto text-red-600">
                Row {f.rowNumber}{f.name ? ` · ${f.name}` : ''} — {f.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 mt-8 flex-wrap justify-center">
        <button
          onClick={onViewPlaces}
          className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-5 py-2.5 rounded-lg text-base font-roboto font-medium transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-store-2-line" /> View imported places
        </button>
        <button
          onClick={onImportAnother}
          className="inline-flex items-center gap-2 bg-white border border-[#e8edf2] text-[#0d5959] px-5 py-2.5 rounded-lg text-base font-roboto font-medium hover:bg-[#eef7f5] transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-upload-cloud-2-line" /> Import another file
        </button>
      </div>
    </div>
  );
}