import { useState, useRef, useEffect } from 'react';
import { DIAL_CODES, DEFAULT_DIAL_CODE, type DialCode } from '@/lib/dialCodes';
import { FLAG_BY_ISO } from '@/lib/flagComponents';

/**
 * Country dial-code picker that shows real flag IMAGES.
 *
 * A native <select> can only render text, and Windows draws flag emoji as the
 * two-letter country code ("KE") rather than a flag — so this is a small custom
 * dropdown. It writes the chosen dial code into a hidden <input name={name}> so
 * forms that read it from FormData keep working unchanged. Flags are inline SVGs
 * bundled from country-flag-icons, so everything loads from this origin.
 */
interface Props {
  name: string;
  defaultCode?: string;
}

// Small reusable flag chip (fixed box, clipped corners) rendered from the
// bundled inline-SVG components.
function FlagChip({ iso }: { iso: string }) {
  const Flag = FLAG_BY_ISO[iso];
  return (
    <span className="inline-flex h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/5">
      {Flag ? <Flag className="h-full w-full object-cover" aria-hidden="true" /> : null}
    </span>
  );
}

export default function CountryCodeSelect({ name, defaultCode = DEFAULT_DIAL_CODE }: Props) {
  const initial = DIAL_CODES.find((c) => c.code === defaultCode) ?? DIAL_CODES[0];
  const [selected, setSelected] = useState<DialCode>(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <input type="hidden" name={name} value={selected.code} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country code: ${selected.name} ${selected.code}`}
        className="flex items-center gap-1.5 px-3 py-3 h-full border border-stone-300 border-r-0 bg-white text-base font-roboto text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 cursor-pointer whitespace-nowrap shadow-[0_1px_2px_rgba(0,23,49,0.04),0_2px_8px_rgba(0,23,49,0.05)]"
      >
        <FlagChip iso={selected.iso} />
        <span>{selected.code}</span>
        <i className={`ri-arrow-down-s-line text-stone-400 text-sm transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 z-20 mt-1 max-h-64 w-60 overflow-auto bg-white border border-stone-200 rounded-md shadow-xl py-1"
        >
          {DIAL_CODES.map((c) => (
            <li key={c.iso} role="option" aria-selected={c.iso === selected.iso}>
              <button
                type="button"
                onClick={() => {
                  setSelected(c);
                  setOpen(false);
                }}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm font-roboto transition-colors hover:bg-primary/5 ${
                  c.iso === selected.iso ? 'bg-primary/5 text-primary font-semibold' : 'text-stone-600'
                }`}
              >
                <FlagChip iso={c.iso} />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-stone-400">{c.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
