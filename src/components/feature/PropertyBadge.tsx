import { useBadgeSettings } from '@/hooks/useBadgeSettings';

export type PropertyBadgeVariant =
  | 'sale'
  | 'rent'
  | 'featured'
  | 'just-listed'
  | 'completed'
  | 'offplan'
  | 'joint-venture'
  | 'new-development'
  | 'off-plan'
  | 'under-construction'
  | 'sold-off-plan'
  | 'sold-out'
  | 'investment';

// Each badge maps to editable CSS variables (driven from property_cards_style
// via useCardTheme) so colours can be changed in the admin Colour Palette.
const BADGE_CONFIG: Record<PropertyBadgeVariant, { label: string; bg: string; text: string; enabledKey: string }> = {
  sale: { label: 'SALE', bg: '--badge-sale-bg', text: '--badge-sale-text', enabledKey: 'sale' },
  rent: { label: 'RENT', bg: '--badge-rent-bg', text: '--badge-rent-text', enabledKey: 'rent' },
  featured: { label: 'FEATURED', bg: '--badge-featured-bg', text: '--badge-featured-text', enabledKey: 'featured' },
  'just-listed': { label: 'JUST LISTED', bg: '--badge-just-listed-bg', text: '--badge-just-listed-text', enabledKey: 'just_listed' },
  completed: { label: 'COMPLETED', bg: '--badge-completed-bg', text: '--badge-completed-text', enabledKey: 'completed' },
  offplan: { label: 'OFFPLAN', bg: '--badge-offplan-bg', text: '--badge-offplan-text', enabledKey: 'offplan' },
  'joint-venture': { label: 'JOINT VENTURE', bg: '--badge-jv-bg', text: '--badge-jv-text', enabledKey: 'joint_venture' },
  'new-development': { label: 'NEW DEVELOPMENT', bg: '--badge-new-dev-bg', text: '--badge-new-dev-text', enabledKey: 'new_dev' },
  'off-plan': { label: 'OFF-PLAN', bg: '--badge-offplan-bg', text: '--badge-offplan-text', enabledKey: 'offplan' },
  'under-construction': { label: 'UNDER CONSTRUCTION', bg: '--badge-under-construction-bg', text: '--badge-under-construction-text', enabledKey: 'under_construction' },
  'sold-off-plan': { label: 'SOLD OFF-PLAN', bg: '--badge-sold-off-plan-bg', text: '--badge-sold-off-plan-text', enabledKey: 'sold_off_plan' },
  'sold-out': { label: 'SOLD OUT', bg: '--badge-sold-out-bg', text: '--badge-sold-out-text', enabledKey: 'sold_out' },
  investment: { label: 'INVESTMENT', bg: '--badge-investment-bg', text: '--badge-investment-text', enabledKey: 'investment' },
};

interface PropertyBadgeProps {
  variant: PropertyBadgeVariant;
  className?: string;
}

export default function PropertyBadge({ variant, className = '' }: PropertyBadgeProps) {
  const { isEnabled } = useBadgeSettings();
  const cfg = BADGE_CONFIG[variant];

  if (!isEnabled(cfg.enabledKey)) return null;

  return (
    <span
      className={`inline-block text-[12px] md:text-[14px] font-roboto font-semibold uppercase tracking-[0.16em] px-2 md:px-3 py-0.5 md:py-1 whitespace-nowrap rounded-sm ${className}`}
      style={{ backgroundColor: `var(${cfg.bg})`, color: `var(${cfg.text})` }}
    >
      {cfg.label}
    </span>
  );
}