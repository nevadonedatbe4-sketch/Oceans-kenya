import { useMemo, type ReactNode } from 'react';
import type { Development } from '@/lib/developmentModel';
import { buildDevelopmentInfo, type InfoRow } from '@/lib/developmentInfo';

interface ProjectInfoSectionsProps {
  development: Development;
  /** Formatted "From ..." price line for the project. */
  priceLabel: string;
  currency: string;
  /** Opens the enquiry flow with a reason + message. */
  onEnquire: (reason: string, message: string) => void;
}

function RowList({ rows, columns = 2 }: { rows: InfoRow[]; columns?: 1 | 2 }) {
  if (rows.length === 0) return null;
  return (
    <dl className={`grid grid-cols-1 ${columns === 2 ? 'sm:grid-cols-2' : ''} gap-x-8 gap-y-0`}>
      {rows.map((r) => (
        <div key={r.label} className="flex items-start justify-between gap-4 py-2.5 border-b border-[#f0f0f0] last:border-b-0">
          <dt className="text-sm font-roboto text-[#6b7280] min-w-0">{r.label}</dt>
          <dd className="text-sm font-roboto font-semibold text-primary text-right min-w-0 break-words">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[#e5e5e5] bg-white p-5 md:p-7">
      <h2 className="flex items-center gap-2 text-xl md:text-2xl font-bold text-primary mb-4">
        <span className="w-6 h-6 flex items-center justify-center text-[#c9a84c]">
          <i className={`${icon} text-lg`}></i>
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * ProjectInfoSections - the project-level information blocks for a development
 * (Key information, Ownership, Finance, Costs, Utilities & more details).
 *
 * Every value comes from the real project record; empty categories are dropped
 * entirely so a sparse project simply shows fewer, honest blocks.
 */
export default function ProjectInfoSections({ development, priceLabel, currency, onEnquire }: ProjectInfoSectionsProps) {
  const info = useMemo(
    () => buildDevelopmentInfo(development, { priceLabel, currency }),
    [development, priceLabel, currency],
  );

  const name = development.name || 'this development';
  const { keyInformation, ownership, finance, costs, utilities } = info;

  return (
    <div className="space-y-6">
      {/* ── Key information ── */}
      {keyInformation.length > 0 && (
        <SectionCard title="Key information" icon="ri-file-list-3-line">
          <RowList rows={keyInformation} columns={2} />
          <p className="mt-3 text-xs font-roboto text-[#9aa0a6] leading-relaxed">
            Figures shown are provided by the developer or agent. Where a field is unknown it is marked “Ask agent” - we never guess ownership or cost details.
          </p>
        </SectionCard>
      )}

      {/* ── Ownership & purchase options ── */}
      {(ownership.schemes.length > 0 || ownership.rows.length > 0) && (
        <SectionCard title="Ownership & purchase options" icon="ri-key-2-line">
          {ownership.schemes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {ownership.schemes.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fdf8ec] border border-[#e8d9a8] text-sm font-semibold text-[#8a6d1f] whitespace-nowrap"
                >
                  <i className="ri-home-4-line text-sm"></i>
                  {s}
                </span>
              ))}
            </div>
          )}
          <RowList rows={ownership.rows} columns={2} />
        </SectionCard>
      )}

      {/* ── Finance & how to buy ── */}
      {(finance.length > 0 || costs.length > 0) && (
        <SectionCard title="Finance & how to buy" icon="ri-bank-card-line">
          {finance.length > 0 ? (
            <RowList rows={finance} columns={2} />
          ) : (
            <p className="text-sm font-roboto text-[#6b7280]">
              Ask agent about available finance options for {name}.
            </p>
          )}
          <div className="mt-4 pt-4 border-t border-[#f0f0f0]">
            <button
              type="button"
              onClick={() => onEnquire('Financing', `Hello, I would like to know about the finance and purchase options for ${name}.`)}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary text-primary text-sm font-semibold rounded-md whitespace-nowrap cursor-pointer hover:bg-primary hover:text-white transition-colors"
            >
              <i className="ri-question-line text-base"></i>Ask about financing
            </button>
          </div>
        </SectionCard>
      )}

      {/* ── Costs to consider ── */}
      {costs.length > 0 && (
        <SectionCard title="Costs to consider" icon="ri-money-dollar-circle-line">
          <div className="border border-[#eef0f2] rounded-md overflow-hidden">
            <table className="w-full">
              <tbody className="divide-y divide-[#eef0f2]">
                {costs.map((c) => (
                  <tr key={c.label}>
                    <td className="px-4 py-3 text-sm font-roboto text-[#6b7280] w-1/2">{c.label}</td>
                    <td className="px-4 py-3 text-sm font-roboto font-semibold text-primary">{c.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs font-roboto text-[#9aa0a6] leading-relaxed">
            Indicative only - final costs are confirmed by the developer or agent and may change.
          </p>
        </SectionCard>
      )}

      {/* ── Utilities & more details ── */}
      {utilities.length > 0 && (
        <SectionCard title="Utilities &amp; more details" icon="ri-plug-line">
          <RowList rows={utilities} columns={2} />
        </SectionCard>
      )}
    </div>
  );
}