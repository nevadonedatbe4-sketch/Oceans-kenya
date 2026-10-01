import { Link, useNavigate } from 'react-router-dom';
import { useBackControl, type ReturnRoute } from '@/lib/navigation';

/**
 * InlineBackLink - the single, GLOBAL back control used everywhere a page sits
 * on a light or dark surface (breadcrumb bands, banners, portal headers).
 *
 * Behaviour (never hard-coded to one page):
 *   1. If the visitor arrived from a recorded in-site origin (`?from=`), go there.
 *   2. Otherwise, if there is real in-app browser history, go back one step.
 *   3. Otherwise fall back to the supplied parent route - and, when no parent is
 *      given, Home. So the control is ALWAYS usable, even after a cold load from
 *      Search, a shared link or a bookmark. It never lands on a blank page.
 *
 * It renders a real <Link>/<button> so the browser Back button keeps working too.
 */

const HOME: ReturnRoute = { to: '/', label: 'Home' };

interface InlineBackLinkProps {
  /** Canonical parent used when there is no origin and no in-app history. */
  parent?: ReturnRoute | null;
  /** `light` sits on a white surface; `dark` sits on a navy/dark surface. */
  tone?: 'light' | 'dark';
  className?: string;
}

export default function InlineBackLink({
  parent = null,
  tone = 'light',
  className = '',
}: InlineBackLinkProps) {
  const navigate = useNavigate();
  const back = useBackControl(parent ?? HOME, true);

  if (!back) return null;

  const skin =
    tone === 'dark'
      ? 'text-white/80 hover:text-white'
      : 'text-primary hover:text-[#0D5959]';

  const base = `inline-flex items-center gap-1.5 text-xs font-roboto font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${skin} ${className}`;

  // Real previous page → true history back.
  if (back.history) {
    return (
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Back to the previous page"
        className={base}
      >
        <i className="ri-arrow-left-line text-sm"></i>
        <span>Back</span>
      </button>
    );
  }

  const label = back.label ? `Back to ${back.label}` : 'Back';
  return (
    <Link to={back.to} aria-label={label} className={base}>
      <i className="ri-arrow-left-line text-sm"></i>
      <span>{label}</span>
    </Link>
  );
}