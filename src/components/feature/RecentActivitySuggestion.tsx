import { useRecentActivityCount, type RecentSource } from '@/hooks/useRecentActivityCount';
import { hoursForWindowLabel, formatElapsedHours, windowPhrase } from '@/lib/recentWindow';

interface RecentActivitySuggestionProps {
  /** Area the visitor is currently looking at ('' / undefined = everywhere). */
  location?: string;
  /** Which inventory to count - property listings or new developments. */
  source?: RecentSource;
  /**
   * The visitor's currently selected "added" window (e.g. 'Last 24 hours').
   * 'Anytime' (or anything unrecognised) keeps the note framed around the
   * default 48h reference window.
   */
  addedWindow?: string;
  /**
   * Applies the recent-only search when the visitor clicks View them. Receives
   * the window label the visitor should switch to - the window they searched
   * when it contains records, otherwise the closest window that does.
   */
  onView: (targetWindow: string) => void;
  className?: string;
}

/** Reference window used when the visitor has not restricted the time window. */
const DEFAULT_WINDOW = 'Last 48 hours';

/**
 * The "what changed recently" note shown inside a zero-result empty state.
 *
 * It reports how many new records were added in the window the visitor actually
 * searched (scoped to their area). When that window is empty it points them at
 * the CLOSEST window that does contain inventory - e.g. "nothing in the last 24
 * hours, but 8 new listings were added in the last 3 days" - instead of
 * pretending a different window was searched.
 *
 * This never changes the visitor's filters on its own - the criteria only relax
 * when they explicitly click View them.
 */
export default function RecentActivitySuggestion({
  location,
  source = 'listings',
  addedWindow = DEFAULT_WINDOW,
  onView,
  className = '',
}: RecentActivitySuggestionProps) {
  const place = (location || '').trim();

  // The visitor's real window. When they have not set one ('Anytime') the note
  // still frames itself around the default 48h reference window - never a
  // different window than the one shown in the message.
  const selectedHours = hoursForWindowLabel(addedWindow);
  const referenceLabel = selectedHours != null ? addedWindow : DEFAULT_WINDOW;
  const referenceHours = selectedHours ?? (hoursForWindowLabel(DEFAULT_WINDOW) as number);

  const { count, loading, closestAt, closestCount, coveringWindow } = useRecentActivityCount(
    place || undefined,
    source,
    referenceHours,
  );

  if (loading) return null;

  const isDev = source === 'developments';
  const nounOne = isDev ? 'new development' : 'new listing';
  const nounMany = isDev ? 'new developments' : 'new listings';
  const where = place ? ` in ${place}` : '';
  const referenceText = windowPhrase(referenceLabel);

  const wrapperClass = `mt-6 mx-auto max-w-xl rounded-lg border border-accent/30 bg-accent/5 px-4 py-3.5 text-left ${className}`;

  // ── Records inside the searched window ────────────────────────────────
  if (count > 0) {
    const noun = count === 1 ? nounOne : nounMany;
    return (
      <div className={wrapperClass}>
        <p className="flex items-start gap-2 text-sm font-roboto text-primary">
          <span className="w-4 h-4 flex items-center justify-center mt-0.5 text-accent shrink-0">
            <i className="ri-time-line"></i>
          </span>
          <span>
            <span className="font-bold">{count}</span> {noun} added{where} in the last {referenceText}.
          </span>
        </p>
        <button
          onClick={() => onView(referenceLabel)}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-xs font-roboto font-semibold rounded-md hover:bg-accent/90 transition-colors cursor-pointer whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center"><i className="ri-eye-line"></i></span>
          View them
        </button>
      </div>
    );
  }

  // ── Nothing in the searched window → suggest the closest period ────────
  const hoursAgo = closestAt ? (Date.now() - new Date(closestAt).getTime()) / 3_600_000 : null;

  if (!closestAt || !coveringWindow || hoursAgo == null) {
    return (
      <div className={wrapperClass}>
        <p className="flex items-start gap-2 text-sm font-roboto text-primary/70">
          <span className="w-4 h-4 flex items-center justify-center mt-0.5 text-accent shrink-0">
            <i className="ri-information-line"></i>
          </span>
          <span>
            Nothing new was added{where} in the last {referenceText}.
            {hoursAgo != null ? ` The most recent was added ${formatElapsedHours(hoursAgo)} ago.` : ''} Try widening your search.
          </span>
        </p>
      </div>
    );
  }

  const elapsed = formatElapsedHours(hoursAgo);
  const coveringText = windowPhrase(coveringWindow.label);
  const closestNoun = closestCount === 1 ? nounOne : nounMany;
  const verb = closestCount === 1 ? 'was' : 'were';

  return (
    <div className={wrapperClass}>
      <p className="flex items-start gap-2 text-sm font-roboto text-primary">
        <span className="w-4 h-4 flex items-center justify-center mt-0.5 text-accent shrink-0">
          <i className="ri-history-line"></i>
        </span>
        <span>
          Nothing new was added{where} in the last {referenceText}. The closest {closestNoun} {verb} added{' '}
          {elapsed} ago — <span className="font-bold">{closestCount}</span> in the last {coveringText}.
        </span>
      </p>
      <button
        onClick={() => onView(coveringWindow.label)}
        className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-xs font-roboto font-semibold rounded-md hover:bg-accent/90 transition-colors cursor-pointer whitespace-nowrap"
      >
        <span className="w-4 h-4 flex items-center justify-center"><i className="ri-eye-line"></i></span>
        {closestCount === 1 ? 'View it' : 'View them'}
      </button>
    </div>
  );
}