import { contrastTextOn } from '@/lib/amenities';

type CategoryIconSize = 'sm' | 'md' | 'lg';

interface CategoryIconProps {
  /** Remix icon class, e.g. "ri-store-2-line". */
  icon: string;
  /** Background colour (hex). When omitted, a neutral light tint is used. */
  color?: string | null;
  size?: CategoryIconSize;
  className?: string;
  title?: string;
}

const SIZE_MAP: Record<CategoryIconSize, { box: string; glyph: string }> = {
  sm: { box: 'w-7 h-7 rounded-lg', glyph: 'text-base' },
  md: { box: 'w-9 h-9 rounded-md', glyph: 'text-lg' },
  lg: { box: 'w-11 h-11 rounded-lg', glyph: 'text-xl' },
};

/**
 * Single source of truth for rendering a category glyph inside a coloured
 * bubble. It guarantees the icon is always legible: on a supplied colour it
 * computes the readable foreground automatically, and when no colour is given
 * it falls back to a dark icon on a light tint instead of an invisible white
 * icon on white.
 */
export default function CategoryIcon({
  icon,
  color,
  size = 'md',
  className = '',
  title,
}: CategoryIconProps) {
  const s = SIZE_MAP[size];
  const trimmed = (color || '').trim();

  if (!trimmed) {
    return (
      <span
        className={`${s.box} flex items-center justify-center shrink-0 bg-[#e8f1f0] text-[#0d5959] ${className}`}
        title={title}
      >
        <i className={`${icon} ${s.glyph}`} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={`${s.box} flex items-center justify-center shrink-0 ${className}`}
      style={{ backgroundColor: trimmed, color: contrastTextOn(trimmed) }}
      title={title}
    >
      <i className={`${icon} ${s.glyph}`} aria-hidden="true" />
    </span>
  );
}