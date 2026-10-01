import type { ReactNode } from 'react';

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  children: ReactNode;
}

/**
 * Sticky bulk-selection toolbar shared by every listing management screen.
 * Stays visible while the results list scrolls so actions remain reachable.
 */
export default function BulkActionBar({ count, onClear, children }: BulkActionBarProps) {
  if (count <= 0) return null;
  return (
    <div
      className="sticky top-2 z-40 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2.5 animate-dropdown-enter"
      style={{ backgroundColor: '#001731', border: '1px solid rgba(13,89,89,0.45)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}
    >
      <span className="inline-flex items-center gap-2 text-sm font-bold text-white whitespace-nowrap">
        <span
          className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold"
          style={{ backgroundColor: '#0d5959', color: '#ffffff' }}
        >
          {count}
        </span>
        selected
      </span>
      <span className="w-px h-5 hidden sm:block" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <button
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
        style={{ color: '#9fb3c8' }}
      >
        <i className="ri-close-line" /> Clear
      </button>
    </div>
  );
}

interface BulkActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'accent' | 'danger';
}

export function BulkActionButton({ icon, label, onClick, tone = 'default' }: BulkActionButtonProps) {
  const palette = {
    default: { bg: 'rgba(13,89,89,0.25)', color: '#e2e8f0', icon: '#5eead4' },
    accent: { bg: 'rgba(201,168,76,0.2)', color: '#f7e7b4', icon: '#fbbf24' },
    danger: { bg: 'rgba(220,38,38,0.2)', color: '#fca5a5', icon: '#f87171' },
  }[tone];
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer hover:brightness-125 transition"
      style={{ backgroundColor: palette.bg, color: palette.color }}
    >
      <i className={icon} style={{ color: palette.icon }} /> {label}
    </button>
  );
}