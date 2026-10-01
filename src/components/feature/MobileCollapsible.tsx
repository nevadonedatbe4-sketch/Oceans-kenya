import { useState } from 'react';
import type { ReactNode } from 'react';

interface MobileCollapsibleProps {
  /** Closed label shown inside the toggle bar. */
  label: string;
  /** Optional label swap when the drawer is open. */
  openLabel?: string;
  /** Short one-line gist shown under the label while collapsed. */
  summary?: string;
  /** Remix icon class for the leading bubble. */
  icon?: string;
  /** Visual tone - 'light' for white panels, 'dark' for coloured sections. */
  variant?: 'light' | 'dark';
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Collapses long content into a tap-to-open drawer on mobile while leaving the
 * content fully visible on desktop. Shared by text-heavy sections so the
 * treatment stays consistent across a page.
 */
export default function MobileCollapsible({
  label,
  openLabel,
  summary,
  icon = 'ri-lightbulb-line',
  variant = 'light',
  defaultOpen = false,
  className = '',
  children,
}: MobileCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isLight = variant === 'light';

  return (
    <div className={className}>
      {/* Toggle bar - mobile only */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 border rounded-sm cursor-pointer transition-colors ${
            isLight ? 'bg-white' : 'bg-white/10 border-white/20'
          }`}
          style={isLight ? { borderColor: '#f3f4f6' } : undefined}
        >
          <span className="flex items-center gap-3 text-left min-w-0">
            <span className={`w-7 h-7 flex items-center justify-center rounded-full shrink-0 ${isLight ? 'bg-primary' : 'bg-golden'}`}>
              <i className={`${icon} text-sm text-white`}></i>
            </span>
            <span className="min-w-0">
              <span className={`block font-semibold text-sm ${isLight ? 'text-primary' : 'text-white'}`}>
                {open ? (openLabel || label) : label}
              </span>
              {!open && summary && (
                <span className={`block text-xs mt-0.5 truncate ${isLight ? 'text-primary/50' : 'text-white/60'}`}>
                  {summary}
                </span>
              )}
            </span>
          </span>
          <span className={`w-5 h-5 flex items-center justify-center shrink-0 ${isLight ? 'text-primary/60' : 'text-white/70'}`}>
            <i className={`ri-arrow-down-s-line text-xl transition-transform duration-300 ${open ? 'rotate-180' : ''}`}></i>
          </span>
        </button>
      </div>

      {/* Content - animated drawer on mobile, always expanded on desktop */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-out md:max-h-none md:opacity-100 md:overflow-visible ${
          open ? 'max-h-[1600px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}