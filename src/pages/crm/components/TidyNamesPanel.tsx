import { useState } from 'react';
import { addToast } from '@/pages/crm/components/CRMToast';
import { tidyAllNames, type TidyReport } from '@/lib/tidyNames';

/**
 * "Tidy all names" — one-click maintenance action.
 *
 * Rewrites shouty stored names/titles (listings, developments, land, JV,
 * neighbourhoods, places & services, amenity categories + sub-categories,
 * blog posts & categories) into clean Title Case at the source, using the same
 * shared normaliser the whole site displays with. Correctly-cased values are
 * never touched, so it is safe to run again and again.
 */
export default function TidyNamesPanel() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<TidyReport | null>(null);

  const run = async () => {
    setRunning(true);
    try {
      const result = await tidyAllNames();
      setReport(result);
      if (result.totalUpdated > 0) {
        addToast(`Tidied ${result.totalUpdated} name${result.totalUpdated === 1 ? '' : 's'}`, 'success');
      } else {
        addToast('Everything is already tidy — nothing to change', 'info');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to tidy names', 'error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-[#e8edf2] p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-11 h-11 rounded-lg bg-[#0d5959]/10 flex items-center justify-center flex-shrink-0">
              <i className="ri-text-wrap text-[#0d5959] text-xl" />
            </span>
            <div className="min-w-0">
              <h3 className="font-jost text-base font-semibold text-[#001731]">Tidy All Names</h3>
              <p className="text-sm text-[#7a8a99] mt-1 leading-relaxed max-w-2xl">
                Rewrites shouty stored names — ALL CAPS or all-lowercase — into clean
                Title Case <strong className="text-[#33414f]">at the source</strong>, so the data itself is
                clean, not just the display. Covers listings, developments, land, JV projects,
                neighbourhoods, places &amp; services, amenity categories and sub-categories, and
                blog posts &amp; categories. Correctly-cased values are never touched, so it is safe to
                run any time.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="shrink-0 inline-flex items-center justify-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-5 py-2.5 rounded-lg text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {running ? (
              <>
                <i className="ri-loader-4-line animate-spin" /> Tidying…
              </>
            ) : (
              <>
                <i className="ri-magic-line" /> Tidy all names
              </>
            )}
          </button>
        </div>
      </div>

      {report && (
        <div className="bg-white rounded-xl border border-[#e8edf2] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[#e8edf2]">
            <h4 className="font-jost text-sm font-semibold text-[#001731] uppercase tracking-wider">Result</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-roboto font-semibold bg-[#0d5959]/10 text-[#0d5959]">
                {report.totalUpdated} updated
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-roboto font-semibold bg-[#001731]/8 text-[#33414f]">
                {report.totalScanned} scanned
              </span>
            </div>
          </div>
          <ul className="divide-y divide-[#eef1f4]">
            {report.fields.map((field) => (
              <li key={field.key} className="flex items-center justify-between gap-3 px-6 py-3">
                <span className="flex items-center gap-2 min-w-0 text-sm font-roboto text-[#33414f]">
                  <i
                    className={
                      field.error
                        ? 'ri-error-warning-line text-[#dc2626]'
                        : field.updated > 0
                          ? 'ri-check-line text-[#0d5959]'
                          : 'ri-subtract-line text-[#cbd2d9]'
                    }
                  />
                  <span className="truncate">{field.label}</span>
                </span>
                <span className="text-xs font-roboto text-[#7a8a99] whitespace-nowrap">
                  {field.error ? (
                    <span className="text-[#dc2626]">{field.error}</span>
                  ) : (
                    <>
                      {field.updated} of {field.scanned} tidied
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}