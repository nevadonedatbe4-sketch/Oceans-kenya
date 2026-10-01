import type { CSSProperties, ReactNode } from 'react';
import { useBadgeSettings } from '@/hooks/useBadgeSettings';

export interface PropertyMetaBadgesProps {
  featured?: boolean;
  justListed?: boolean;
  jointVenture?: boolean;
  newHome?: boolean;
  reduced?: boolean;
  videoTour?: boolean;
  virtualTour?: boolean;
  floorPlan?: boolean;
  houseShare?: boolean;
  propertyOfTheWeek?: boolean;
  backOnMarket?: boolean;
  refurbished?: boolean;
  className?: string;
  /** When provided, the Video Tour badge becomes a clickable control. */
  onVideoClick?: () => void;
  /** When provided, the Virtual Tour badge becomes a clickable control. */
  onVirtualTourClick?: () => void;
  /** When provided, the Floor Plan badge becomes a clickable control. */
  onFloorPlanClick?: () => void;
}

const chip =
  'inline-flex items-center gap-0.5 text-[9px] font-roboto font-semibold uppercase tracking-tight px-1.5 py-0.5 rounded whitespace-nowrap shrink-0';

// Solid badge: full background + text colour (both editable CSS variables).
const solid = (bg: string, text: string): CSSProperties => ({
  backgroundColor: `var(${bg})`,
  color: `var(${text})`,
});

// Only the top status labels render so cards stay uncluttered - but media
// badges (Video / Virtual Tour / Floor Plan) are ALWAYS kept so a listing with
// an attached video always advertises it.
const MAX_STATUS_BADGES = 3;
const MAX_TOTAL_BADGES = 4;

function TourBadge({
  label,
  icon,
  onClick,
  ariaLabel,
}: {
  label: string;
  icon: string;
  onClick?: () => void;
  ariaLabel: string;
}) {
  const style = solid('--badge-tour-bg', '--badge-tour-text');
  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        aria-label={ariaLabel}
        className={`${chip} cursor-pointer hover:opacity-85 transition-opacity`}
        style={style}
      >
        <i className={`${icon} text-[9px]`}></i>
        {label}
      </button>
    );
  }
  return (
    <span className={chip} style={style}>
      <i className={`${icon} text-[9px]`}></i>
      {label}
    </span>
  );
}

export default function PropertyMetaBadges({
  featured = false,
  justListed = false,
  jointVenture = false,
  newHome = false,
  reduced = false,
  videoTour = false,
  virtualTour = false,
  floorPlan = false,
  houseShare = false,
  propertyOfTheWeek = false,
  backOnMarket = false,
  refurbished = false,
  className = '',
  onVideoClick,
  onVirtualTourClick,
  onFloorPlanClick,
}: PropertyMetaBadgesProps) {
  const { isEnabled } = useBadgeSettings();

  // Status badges (priority-ordered, capped).
  const status: Array<{ key: string; node: ReactNode }> = [];
  // Media badges (always kept when the asset exists).
  const media: Array<{ key: string; node: ReactNode }> = [];

  if (propertyOfTheWeek && isEnabled('potw')) {
    status.push({ key: 'propertyOfTheWeek', node: <span key="potw" className={chip} style={solid('--badge-potw-bg', '--badge-potw-text')}>Property of the Week</span> });
  }
  if (featured && isEnabled('featured')) {
    status.push({ key: 'featured', node: <span key="featured" className={chip} style={solid('--badge-featured-bg', '--badge-featured-text')}>Featured</span> });
  }
  if (backOnMarket && isEnabled('back_on_market')) {
    status.push({ key: 'backOnMarket', node: <span key="backOnMarket" className={chip} style={solid('--badge-back-market-bg', '--badge-back-market-text')}>Back on Market</span> });
  }
  if (reduced && isEnabled('reduced')) {
    status.push({ key: 'reduced', node: <span key="reduced" className={chip} style={solid('--badge-reduced-bg', '--badge-reduced-text')}>Reduced Price</span> });
  }
  if (newHome && isEnabled('new_home')) {
    status.push({ key: 'newHome', node: <span key="newHome" className={chip} style={{ backgroundColor: '#002F6C', color: '#FFFFFF' }}>New Home</span> });
  }
  if (refurbished && isEnabled('refurbished')) {
    status.push({ key: 'refurbished', node: <span key="refurbished" className={chip} style={solid('--badge-refurbished-bg', '--badge-refurbished-text')}>Refurbished</span> });
  }
  if (jointVenture && isEnabled('joint_venture')) {
    status.push({ key: 'jointVenture', node: <span key="jointVenture" className={chip} style={solid('--badge-jv-bg', '--badge-jv-text')}>Joint Venture</span> });
  }
  if (houseShare && isEnabled('house_share')) {
    status.push({ key: 'houseShare', node: <span key="houseShare" className={chip} style={solid('--badge-house-share-bg', '--badge-house-share-text')}>House Share</span> });
  }
  // justListed intentionally excluded from the badge row (kept for API parity).

  if (videoTour && isEnabled('tour')) {
    media.push({ key: 'videoTour', node: <TourBadge key="videoTour" label="Video Tour" icon="ri-play-circle-line" onClick={onVideoClick} ariaLabel="Video Tour" /> });
  }
  if (virtualTour && isEnabled('tour')) {
    media.push({ key: 'virtualTour', node: <TourBadge key="virtualTour" label="Virtual Tour" icon="ri-globe-line" onClick={onVirtualTourClick} ariaLabel="Virtual Tour" /> });
  }
  if (floorPlan && isEnabled('tour')) {
    media.push({ key: 'floorPlan', node: <TourBadge key="floorPlan" label="Floor Plan" icon="ri-map-2-line" onClick={onFloorPlanClick} ariaLabel="Floor Plan" /> });
  }

  // Media badges always survive; status badges fill the remaining slots.
  const statusSlots = Math.max(0, MAX_STATUS_BADGES - media.length);
  const ordered = [...status.slice(0, statusSlots), ...media].slice(0, MAX_TOTAL_BADGES);

  if (ordered.length === 0) return null;

  return (
    <div className={`flex flex-nowrap items-center gap-1 overflow-hidden ${className}`}>
      {ordered.map((b) => b.node)}
    </div>
  );
}