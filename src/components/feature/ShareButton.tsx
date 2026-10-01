import { useEffect, useRef, useState } from 'react';
import { shareProperty } from '@/lib/share';

interface ShareButtonProps {
  /** Property title, used for the native share sheet + accessible label. */
  title: string;
  /** Public slug of the listing. */
  slug?: string | null;
  /** Record id, used when no slug is available. */
  id?: string | null;
  /** Pre-formatted price line, e.g. "KES 45,000,000". */
  priceLabel?: string;
  /** Explicit URL to share - wins over slug/id when provided. */
  url?: string;
  /** Base button classes. */
  className?: string;
  /** Extra classes applied while the confirmation state is showing. */
  activeClassName?: string;
  /** Icon classes (size/colour). */
  iconClassName?: string;
  /** Remix icon used in the idle state. */
  idleIcon?: string;
  /** Optional visible text next to the icon. */
  label?: string;
  /** Tooltip shown while idle. */
  tooltipTitle?: string;
}

/**
 * The one share control used across the whole site - directory cards,
 * commercial cards, rental cards and every property detail page.
 *
 * It delegates to the global {@link shareProperty} helper and reflects the
 * outcome (native share vs. clipboard copy) with a short confirmation state,
 * so no surface re-implements share logic.
 */
export default function ShareButton({
  title,
  slug,
  id,
  priceLabel,
  url,
  className = '',
  activeClassName = '',
  iconClassName = '',
  idleIcon = 'ri-share-forward-line',
  label,
  tooltipTitle = 'Share property',
}: ShareButtonProps) {
  const [done, setDone] = useState<null | 'shared' | 'copied'>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const outcome = await shareProperty({ title, slug, id, priceLabel, url });
    if (outcome === 'shared' || outcome === 'copied') {
      setDone(outcome);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(null), 2000);
    }
  };

  const tooltip = done === 'copied'
    ? 'Link copied!'
    : done === 'shared'
      ? 'Shared!'
      : tooltipTitle;

  const icon = done ? 'ri-check-line' : idleIcon;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip}
      aria-label={`${tooltipTitle}: ${title}`}
      className={`${className} ${done ? activeClassName : ''}`}
    >
      <i className={`${icon} ${iconClassName}`}></i>
      {label && <span className="whitespace-nowrap">{done ? (done === 'copied' ? 'Link copied' : 'Shared') : label}</span>}
    </button>
  );
}