import { MATCH_LABELS } from '@/lib/clientMatching';
import type { ClientMatch } from '@/lib/clientRequestsApi';
import { formatMoneyIn } from '@/lib/fxRates';
import useFxRates from '@/hooks/useFxRates';
import BudgetCeilingHint from '@/pages/crm/client-requests/components/BudgetCeilingHint';
import { CATEGORY_LABELS, REJECTION_REASON_LABELS } from '@/pages/crm/client-requests/constants';

interface MatchCompareModalProps {
  matches: ClientMatch[];
  /** The client's chosen currency — every price is shown converted into it. */
  requestCurrency?: string | null;
  /** The client's maximum budget — shown as a ceiling the price is measured against. */
  requestBudgetMax?: number | null;
  onClose: () => void;
  onRemove: (match: ClientMatch) => void;
}

const priceLine = (m: ClientMatch, currency: string | null | undefined, rates: Record<string, number>): string =>
  formatMoneyIn(m.listing_price, currency || m.listing_currency || 'KES', rates, m.listing_currency);

const scoreTone = (score: number) => {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-[#0f766e]';
  if (score >= 40) return 'text-amber-600';
  return 'text-stone-500';
};

/** Join a criteria list into a readable line, or a muted dash. */
function CritLine({ items, tone }: { items?: string[] | null; tone: string }) {
  if (!items || items.length === 0) return <span className="text-stone-300">—</span>;
  return <span className={tone}>{items.join(' · ')}</span>;
}

/**
 * Side-by-side comparison of the client's shortlisted / best candidates.
 *
 * Every row is a real, stored fact from the matching engine (score, satisfied
 * criteria, gaps, unverified data) — nothing is recomputed or invented here.
 */
export default function MatchCompareModal({ matches, requestCurrency, requestBudgetMax, onClose, onRemove }: MatchCompareModalProps) {
  const rates = useFxRates();
  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center p-0 md:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-[#001731]/70" onClick={onClose} />
      <div className="relative bg-white rounded-none md:rounded-xl w-full max-w-5xl my-0 md:my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h3 className="font-semibold text-stone-900">Compare candidates</h3>
            <p className="text-xs text-stone-500">
              {matches.length} properties side by side — score, what fits, what&apos;s missing.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-stone-100 cursor-pointer text-stone-500">
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="p-5 overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className="w-36 text-left align-bottom pb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Criterion
                </th>
                {matches.map((m) => (
                  <th key={m.id} className="align-bottom pb-3 px-2 text-left min-w-[200px]">
                    <div className="rounded-lg border border-stone-200 overflow-hidden">
                      <div className="relative h-24 bg-stone-100">
                        {m.listing_image ? (
                          <img src={m.listing_image} alt={m.listing_title || 'Property'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300">
                            <i className="ri-image-line text-2xl" />
                          </div>
                        )}
                        <button
                          onClick={() => onRemove(m)}
                          title="Remove from comparison"
                          className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 text-stone-600 hover:text-red-600 hover:bg-white transition-colors cursor-pointer"
                        >
                          <i className="ri-close-line" />
                        </button>
                      </div>
                      <div className="p-2.5">
                        {m.listing_slug ? (
                          <a
                            href={`/property/${m.listing_slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs font-semibold text-stone-900 leading-snug line-clamp-2 hover:text-[#0f766e] hover:underline cursor-pointer"
                          >
                            {m.listing_title || 'Untitled property'}
                          </a>
                        ) : (
                          <span className="block text-xs font-semibold text-stone-900 leading-snug line-clamp-2">
                            {m.listing_title || 'Untitled property'}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {m.shortlisted && <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">Shortlisted</span>}
                          {m.shared_with_client && <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full">Shared</span>}
                        </div>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-xs text-stone-700">
              <Row label="Match score">
                {matches.map((m) => {
                  const label = MATCH_LABELS[(m.match_label as keyof typeof MATCH_LABELS)] || MATCH_LABELS.partial;
                  return (
                    <Cell key={m.id}>
                      <span className={`text-base font-bold ${scoreTone(m.match_score)}`}>{m.match_score}</span>
                      <span className={`ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium align-middle ${label.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${label.dot}`} />
                        {label.label}
                      </span>
                    </Cell>
                  );
                })}
              </Row>
              <Row label="Price">{matches.map((m) => <Cell key={m.id}><span className="font-semibold">{priceLine(m, requestCurrency, rates)}</span></Cell>)}</Row>
              <Row label="Budget ceiling">
                {matches.map((m) => (
                  <Cell key={m.id}>
                    <BudgetCeilingHint
                      price={m.listing_price}
                      fromCurrency={m.listing_currency}
                      currency={requestCurrency}
                      budgetMax={requestBudgetMax}
                      rates={rates}
                      compact
                    />
                  </Cell>
                ))}
              </Row>
              <Row label="Location">{matches.map((m) => <Cell key={m.id}>{m.listing_location || '—'}</Cell>)}</Row>
              <Row label="Category">{matches.map((m) => <Cell key={m.id}>{CATEGORY_LABELS[m.listing_category || ''] || m.listing_category || '—'}</Cell>)}</Row>
              <Row label="Meets">
                {matches.map((m) => <Cell key={m.id}><CritLine items={m.satisfied_criteria} tone="text-emerald-700" /></Cell>)}
              </Row>
              <Row label="Falls short">
                {matches.map((m) => <Cell key={m.id}><CritLine items={m.unmet_criteria} tone="text-amber-700" /></Cell>)}
              </Row>
              <Row label="Unverified">
                {matches.map((m) => <Cell key={m.id}>{m.missing_info && m.missing_info.length ? <span className="text-stone-600">{m.missing_info.join(' · ')}</span> : <span className="text-stone-300">—</span>}</Cell>)}
              </Row>
              <Row label="Client feedback">
                {matches.map((m) => <Cell key={m.id}>{m.client_feedback || <span className="text-stone-300">—</span>}</Cell>)}
              </Row>
              <Row label="Rejection" last>
                {matches.map((m) => (
                  <Cell key={m.id}>
                    {m.rejection_reason
                      ? <span className="text-red-700">{REJECTION_REASON_LABELS[m.rejection_reason] || m.rejection_reason}</span>
                      : <span className="text-stone-300">—</span>}
                  </Cell>
                ))}
              </Row>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <tr className={last ? '' : 'border-t border-stone-100'}>
      <th className="text-left align-top py-2.5 pr-3 font-semibold text-stone-500">{label}</th>
      {children}
    </tr>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="align-top py-2.5 px-2 leading-snug">{children}</td>;
}