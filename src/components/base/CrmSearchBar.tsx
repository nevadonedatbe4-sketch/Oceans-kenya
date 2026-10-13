import { useRef } from 'react';

/**
 * CrmSearchBar - the shared, reusable search field used by every CRM area.
 *
 * Always renders a clearly visible, functional **Search** button beside the
 * input. It wraps a real <form> so pressing Enter and clicking the button run
 * the exact same search. While a search is running the button shows a loading
 * state and is disabled, so repeated clicks can never fire duplicate requests.
 *
 * Styling is fully injectable so each CRM area keeps its own look (e.g. the
 * dark-on-mobile / light-on-desktop Listings panel) without losing behaviour.
 */
export interface CrmSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
  buttonClassName?: string;
  buttonLabel?: string;
  showClear?: boolean;
  onClear?: () => void;
}

const DEFAULT_INPUT =
  'w-full pl-10 pr-9 py-2.5 border-2 border-foreground-300 rounded-lg text-sm font-semibold focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/25 bg-white text-foreground-950 placeholder:text-foreground-500 placeholder:font-medium';

const DEFAULT_BUTTON =
  'inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap cursor-pointer transition-colors bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed';

export default function CrmSearchBar({
  value,
  onChange,
  onSubmit,
  loading = false,
  placeholder = 'Search…',
  className = '',
  inputClassName = DEFAULT_INPUT,
  iconClassName = 'ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-foreground-500',
  buttonClassName = DEFAULT_BUTTON,
  buttonLabel = 'Search',
  showClear = true,
  onClear,
}: CrmSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Guard against duplicate submits while a request is already in flight.
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    onSubmit();
  };

  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={`flex items-stretch gap-2 min-w-0 w-full ${className}`}
    >
      <div className="relative flex-1 min-w-0">
        <i className={iconClassName} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={inputClassName}
        />
        {showClear && value.trim().length > 0 && !loading && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-foreground-400 hover:text-foreground-700 cursor-pointer"
          >
            <i className="ri-close-line text-sm" />
          </button>
        )}
      </div>
      <button type="submit" aria-label={buttonLabel} className={buttonClassName} disabled={loading}>
        {loading ? (
          <i className="ri-loader-4-line animate-spin text-base" />
        ) : (
          <i className="ri-search-line text-base" />
        )}
        <span>{loading ? 'Searching…' : buttonLabel}</span>
      </button>
    </form>
  );
}