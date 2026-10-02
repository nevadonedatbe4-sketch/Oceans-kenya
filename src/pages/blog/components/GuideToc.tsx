import { useState } from 'react';

export interface TocItem {
  id: string;
  label: string;
  level?: number;
}

interface GuideTocProps {
  items: TocItem[];
  /** 'sidebar' = always-open list; 'inline' = compact expandable (mobile). */
  variant?: 'sidebar' | 'inline';
  className?: string;
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * "In this guide" content navigation. Clicking an entry smooth-scrolls to that
 * section. On mobile it collapses into a compact, expandable panel so it never
 * eats the whole screen.
 */
export default function GuideToc({ items, variant = 'sidebar', className = '' }: GuideTocProps) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  if (variant === 'inline') {
    return (
      <div className={`bg-[#F7F9F9] border-2 border-primary/12 rounded-lg ${className}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer"
        >
          <span className="flex items-center gap-2.5">
            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-white shrink-0">
              <i className="ri-list-check-2 text-[15px]"></i>
            </span>
            <span className="font-jost font-semibold uppercase tracking-[0.1em] text-[12px] text-primary whitespace-normal">
              In this guide
            </span>
          </span>
          <i
            className={`ri-arrow-down-s-line text-primary text-xl transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          ></i>
        </button>
        {open && (
          <ul className="px-4 pb-4 pt-1 space-y-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    scrollToId(item.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left font-roboto text-[14px] text-[#444444] hover:text-primary transition-colors cursor-pointer py-1 whitespace-normal break-words ${
                    item.level === 3 ? 'pl-4 text-[13px] text-[#666666]' : 'font-medium'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <nav className={`bg-[#F7F9F9] rounded-lg border-2 border-primary/12 p-5 ${className}`} aria-label="In this guide">
      <p className="text-golden text-[11px] font-roboto font-semibold uppercase tracking-[0.3em] mb-3">
        In this guide
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => scrollToId(item.id)}
              className={`w-full text-left font-roboto text-[13.5px] leading-snug text-[#444444] hover:text-primary transition-colors cursor-pointer py-1.5 border-l-2 border-transparent hover:border-golden whitespace-normal break-words ${
                item.level === 3 ? 'pl-5 text-[12.5px] text-[#6b6b6b]' : 'pl-3 font-medium'
              }`}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}