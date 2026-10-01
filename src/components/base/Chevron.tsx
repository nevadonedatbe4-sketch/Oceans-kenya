import { ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Shared chevron sizing - the single source of truth for every chevron in the
 * app. Change these two numbers to retune ALL chevrons consistently.
 */
export const CHEVRON_SIZE = 22;
export const CHEVRON_STROKE = 3;

type ChevronDir = 'right' | 'left' | 'down' | 'up';

const ICONS = {
  right: ChevronRight,
  left: ChevronLeft,
  down: ChevronDown,
  up: ChevronUp,
} as const;

interface ChevronProps {
  /** Which way the chevron points. Defaults to 'right'. */
  dir?: ChevronDir;
  /** Optional override - omit to inherit the shared size. */
  size?: number;
  /** Optional override - omit to inherit the shared stroke weight. */
  strokeWidth?: number;
  className?: string;
}

/**
 * Consistent, beefy chevron. Defaults to {@link CHEVRON_SIZE} / {@link CHEVRON_STROKE}
 * so future nav items stay visually consistent automatically.
 */
export default function Chevron({
  dir = 'right',
  size = CHEVRON_SIZE,
  strokeWidth = CHEVRON_STROKE,
  className,
}: ChevronProps) {
  const Icon = ICONS[dir];
  return <Icon size={size} strokeWidth={strokeWidth} className={className} />;
}