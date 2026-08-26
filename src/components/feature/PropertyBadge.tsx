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

const BADGE_CONFIG: Record<PropertyBadgeVariant, { label: string; className: string }> = {
  sale: { label: 'SALE', className: 'bg-[#001731] text-white' },
  rent: { label: 'RENT', className: 'bg-[#007054] text-white' },
  featured: { label: 'FEATURED', className: 'bg-accent text-white' },
  'just-listed': { label: 'JUST LISTED', className: 'bg-accent text-white' },
  completed: { label: 'COMPLETED', className: 'bg-[#28a745] text-white' },
  offplan: { label: 'OFFPLAN', className: 'bg-[#fd7e14] text-white' },
  'joint-venture': { label: 'JOINT VENTURE', className: 'bg-[#2B5B3C] text-white' },
  'new-development': { label: 'NEW DEVELOPMENT', className: 'bg-[#001731] text-white' },
  'off-plan': { label: 'OFF-PLAN', className: 'bg-[#fd7e14] text-white' },
  'under-construction': { label: 'UNDER CONSTRUCTION', className: 'bg-amber-500 text-white' },
  'sold-off-plan': { label: 'SOLD OFF-PLAN', className: 'bg-[#6c757d] text-white' },
  'sold-out': { label: 'SOLD OUT', className: 'bg-[#dc3545] text-white' },
  investment: { label: 'INVESTMENT', className: 'bg-[#2B5B3C] text-white' },
};

interface PropertyBadgeProps {
  variant: PropertyBadgeVariant;
  className?: string;
}

export default function PropertyBadge({ variant, className = '' }: PropertyBadgeProps) {
  const cfg = BADGE_CONFIG[variant];
  return (
    <span
      className={`inline-block text-[12px] md:text-[14px] font-roboto font-semibold uppercase tracking-[0.16em] px-2 md:px-3 py-0.5 md:py-1 whitespace-nowrap rounded-sm ${cfg.className} ${className}`}
    >
      {cfg.label}
    </span>
  );
}