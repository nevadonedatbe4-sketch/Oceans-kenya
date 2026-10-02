export interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onClearAll: () => void;
  /** Optional heading shown before the chips. */
  label?: string;
  className?: string;
}

/**
 * ActiveFilterChips - a single, reusable row of removable "active filter" chips
 * shown directly above a results list. Removing a chip clears just that one
 * filter; "Clear all" resets the whole search. Matches the pill language used
 * across the Rent / Buy results so every listing page reads identically.
 */
export default function ActiveFilterChips({
  chips,
  onClearAll,
  label = 'Active filters',
  className = '',
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-[11px] font-roboto font-semibold uppercase tracking-wide text-primary/50 whitespace-nowrap">
        {label}
      </span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          aria-label={`Remove ${chip.label}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-roboto font-medium rounded-full hover:bg-primary/20 transition-colors cursor-pointer whitespace-nowrap"
        >
          {chip.label}
          <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-primary/20">
            <i className="ri-close-line text-[10px]"></i>
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-roboto font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer whitespace-nowrap"
      >
        <span className="w-3.5 h-3.5 flex items-center justify-center">
          <i className="ri-restart-line text-xs"></i>
        </span>
        Clear all
      </button>
    </div>
  );
}