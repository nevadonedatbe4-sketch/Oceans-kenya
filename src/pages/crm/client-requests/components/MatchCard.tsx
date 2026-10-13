import { Link, useLocation } from 'react-router-dom';
import { MATCH_LABELS } from '@/lib/clientMatching';
import type { ClientMatch } from '@/lib/clientRequestsApi';
import { formatMoneyIn } from '@/lib/fxRates';
import useFxRates from '@/hooks/useFxRates';
import BudgetCeilingHint from '@/pages/crm/client-requests/components/BudgetCeilingHint';
import { CATEGORY_LABELS, REJECTION_REASON_LABELS } from '@/pages/crm/client-requests/constants';

interface MatchCardProps {
  match: ClientMatch;
  /** The client's chosen currency — every price is shown converted into it. */
  requestCurrency?: string | null;
  /** The client's maximum budget — shown as a ceiling the price is measured against. */
  requestBudgetMax?: number | null;
  onShortlist: (match: ClientMatch) => void;
  onShare: (match: ClientMatch) => void;
  onFeedback: (match: ClientMatch) => void;
  onExclude: (match: ClientMatch) => void;
  /** Whether this match is currently in the comparison tray. */
  isCompared?: boolean;
  /** Toggle this match in/out of the side-by-side comparison. */
  onToggleCompare?: (match: ClientMatch) => void;
}

const scoreTone = (score: number) => {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-[#0f766e]';
  if (score >= 40) return 'text-amber-600';
  return 'text-stone-500';
};

export default function MatchCard({ match, requestCurrency, requestBudgetMax, onShortlist, onShare, onFeedback, onExclude, isCompared = false, onToggleCompare }: MatchCardProps) {
  const location = useLocation();
  const rates = useFxRates();
  const portalBase = location.pathname.startsWith('/agent') ? '/agent' : '/admin';
  const editUrl = match.listing_source === 'land_listings'
    ? `${portalBase}/land-listings/edit/${match.listing_id}`
    : `${portalBase}/listings/edit/${match.listing_id}`;
  const label = MATCH_LABELS[(match.match_label as keyof typeof MATCH_LABELS)] || MATCH_LABELS.partial;
  const unavailable = match.status === 'unavailable';
  // Uniform currency: show the listing price converted into the client's chosen
  // currency so every candidate reads on the same scale as the budget.
  const currency = (requestCurrency || match.listing_currency || 'KES') as string;
  const price = formatMoneyIn(match.listing_price, currency, rates, match.listing_currency);

  return (
    <div className={`bg-white rounded-lg border overflow-hidden transition-all ${unavailable ? 'border-red-200 opacity-80' : 'border-stone-200 hover:border-stone-300'}`}>
      {unavailable && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 text-xs font-medium border-b border-red-100">
          <i className="ri-error-warning-line" />
          This shortlisted property is no longer available — pick another match below.
        </div>
      )}
      <div className="flex gap-3 p-3">
        <div className="w-24 h-20 rounded-md bg-stone-100 flex-shrink-0 overflow-hidden">
          {match.listing_image ? (
            <img src={match.listing_image} alt={match.listing_title || 'Property'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300">
              <i className="ri-image-line text-2xl" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                to={editUrl}
                className="block text-sm font-semibold text-stone-900 truncate hover:text-[#0f766e] hover:underline transition-colors cursor-pointer"
                title={`Open ${match.listing_title || 'property'} in CRM — source, contact & continuity`}
              >
                {match.listing_title || 'Untitled property'}
              </Link>
              <p className="text-xs text-stone-500 truncate mt-0.5">
                <i className="ri-map-pin-line mr-1" />{match.listing_location || 'Location N/A'}
                {match.listing_category ? ` · ${CATEGORY_LABELS[match.listing_category] || match.listing_category}` : ''}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={`text-lg font-bold leading-none ${scoreTone(match.match_score)}`}>{match.match_score}</div>
              <div className="text-[10px] uppercase tracking-wide text-stone-400">score</div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${label.className}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${label.dot}`} />
              {label.label}
            </span>
            <span className="text-xs font-semibold text-stone-700">{price}</span>
            {match.shortlisted && <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Shortlisted</span>}
            {match.shared_with_client && <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">Shared</span>}
          </div>

          <div className="mt-2">
            <BudgetCeilingHint
              price={match.listing_price}
              fromCurrency={match.listing_currency}
              currency={currency}
              budgetMax={requestBudgetMax}
              rates={rates}
            />
          </div>

          {(match.satisfied_criteria?.length || match.unmet_criteria?.length || match.missing_info?.length) && (
            <div className="mt-2 space-y-1">
              {!!match.satisfied_criteria?.length && (
                <p className="text-[11px] text-stone-600 leading-snug">
                  <span className="text-emerald-600 font-semibold">Meets:</span> {match.satisfied_criteria.join(' · ')}
                </p>
              )}
              {!!match.unmet_criteria?.length && (
                <p className="text-[11px] text-stone-600 leading-snug">
                  <span className="text-amber-600 font-semibold">Short:</span> {match.unmet_criteria.join(' · ')}
                </p>
              )}
              {!!match.missing_info?.length && (
                <p className="text-[11px] text-stone-500 leading-snug">
                  <span className="font-semibold">Unverified:</span> {match.missing_info.join(' · ')}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <button
              onClick={() => onShortlist(match)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                match.shortlisted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <i className={match.shortlisted ? 'ri-bookmark-fill' : 'ri-bookmark-line'} />
              {match.shortlisted ? 'Shortlisted' : 'Shortlist'}
            </button>
            <button
              onClick={() => onShare(match)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                match.shared_with_client
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <i className="ri-send-plane-line" />
              {match.shared_with_client ? 'Shared' : 'Mark shared'}
            </button>
            <button
              onClick={() => onFeedback(match)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="ri-chat-voice-line" />
              Feedback
            </button>
            {onToggleCompare && (
              <button
                onClick={() => onToggleCompare(match)}
                title="Add to side-by-side comparison"
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                  isCompared
                    ? 'bg-[#001731] text-white border-[#001731]'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <i className={isCompared ? 'ri-checkbox-multiple-fill' : 'ri-checkbox-multiple-blank-line'} />
                Compare
              </button>
            )}
            {match.listing_slug && (
              <a
                href={`/property/${match.listing_slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-stone-500 hover:text-stone-800 transition-all cursor-pointer whitespace-nowrap"
              >
                <i className="ri-external-link-line" /> Public page
              </a>
            )}
            <button
              onClick={() => onExclude(match)}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-stone-400 hover:text-red-600 transition-all cursor-pointer ml-auto"
              title="Exclude this property from the request"
            >
              <i className="ri-eye-off-line" /> Exclude
            </button>
          </div>

          {match.rejection_reason && (
            <p className="text-[11px] text-red-700 mt-2 bg-red-50 rounded-md px-2 py-1.5 leading-snug">
              <span className="font-semibold">Client rejected:</span>{' '}
              {REJECTION_REASON_LABELS[match.rejection_reason] || match.rejection_reason}
            </p>
          )}

          {match.client_feedback && (
            <p className="text-[11px] text-stone-600 mt-2 bg-stone-50 rounded-md px-2 py-1.5 leading-snug">
              <span className="font-semibold text-stone-700">Client feedback:</span> {match.client_feedback}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}