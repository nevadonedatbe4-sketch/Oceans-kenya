import { useEffect, useRef, useState } from 'react';

/**
 * LocationMultiSelect - a searchable multi-select for CRM locations.
 *
 * Staff add several neighbourhoods in one search; each becomes a removable
 * chip. The selected names are returned as an array so the caller can build
 * the correct `Location IN (a, b, c)` (OR) logic - never a single free-text
 * phrase that the database would misread.
 *
 * Styling is injectable to match each CRM area's theme.
 */
export interface LocationMultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  chipClassName?: string;
  controlClassName?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
}

const DEFAULT_CONTROL =
  'flex flex-wrap items-center gap-1.5 px-2 py-1.5 border border-background-200 rounded-lg bg-white min-h-[44px]';
const DEFAULT_CHIP =
  'inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-semibold bg-secondary-100 text-secondary-900';
const DEFAULT_INPUT =
  'flex-1 min-w-[120px] px-2 py-1 text-sm focus:outline-none bg-transparent text-foreground-900 placeholder:text-foreground-400';

export default function LocationMultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Add location…',
  className = '',
  chipClassName = DEFAULT_CHIP,
  controlClassName = DEFAULT_CONTROL,
  inputClassName = DEFAULT_INPUT,
  dropdownClassName = 'absolute z-40 left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-lg border border-background-200 bg-white shadow-lg',
  disabled = false,
}: LocationMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = options
    .filter((o) => !selected.some((s) => s.toLowerCase() === o.toLowerCase()))
    .filter((o) => (q ? o.toLowerCase().includes(q) : true))
    .slice(0, 40);

  const add = (name: string) => {
    const exists = selected.some((s) => s.toLowerCase() === name.toLowerCase());
    if (!exists) onChange([...selected, name]);
    setQuery('');
    setOpen(false);
  };

  const remove = (name: string) => onChange(selected.filter((s) => s.toLowerCase() !== name.toLowerCase()));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) add(filtered[0]);
    } else if (e.key === 'Backspace' && !query && selected.length > 0) {
      remove(selected[selected.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className={controlClassName}>
        <i className="ri-map-pin-2-line text-sm text-foreground-400 flex-shrink-0 ml-1" />
        {selected.map((name) => (
          <span key={name} className={chipClassName}>
            {name}
            <button
              type="button"
              onClick={() => remove(name)}
              aria-label={`Remove ${name}`}
              className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-black/10 cursor-pointer"
            >
              <i className="ri-close-line text-xs" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : ''}
          className={inputClassName}
          aria-label="Add a location"
        />
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] font-semibold text-foreground-400 hover:text-foreground-700 cursor-pointer whitespace-nowrap ml-auto"
          >
            Clear
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className={dropdownClassName} role="listbox">
          {filtered.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => add(name)}
                className="w-full text-left px-3 py-2 text-sm text-foreground-800 hover:bg-background-50 cursor-pointer flex items-center gap-2"
              >
                <i className="ri-map-pin-line text-xs text-foreground-400" />
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && q && (
        <div className={dropdownClassName}>
          <p className="px-3 py-2.5 text-sm text-foreground-400">No matching location</p>
        </div>
      )}
    </div>
  );
}