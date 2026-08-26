import type { ReactNode } from 'react';

interface PropertyMetaBadgesProps {
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
}

const chip =
  'inline-flex items-center gap-1 text-[10px] font-roboto font-semibold uppercase tracking-wide px-2 py-0.5 rounded whitespace-nowrap';

// Only the top 3 (by priority) labels render so cards stay uncluttered.
const MAX_BADGES = 3;

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
}: PropertyMetaBadgesProps) {
  const badges: Array<{ key: string; node: ReactNode }> = [];

  if (propertyOfTheWeek) {
    badges.push({ key: 'propertyOfTheWeek', node: <span key="potw" className={`${chip} bg-golden text-white`}>Property of the Week</span> });
  }
  if (justListed) {
    badges.push({ key: 'justListed', node: <span key="justListed" className={`${chip} bg-[#C2410C] text-white`}>Just Listed</span> });
  }
  if (featured) {
    badges.push({ key: 'featured', node: <span key="featured" className={`${chip} bg-accent text-white`}>Featured</span> });
  }
  if (backOnMarket) {
    badges.push({ key: 'backOnMarket', node: <span key="backOnMarket" className={`${chip} bg-[#0F766E] text-white`}>Back on Market</span> });
  }
  if (reduced) {
    badges.push({ key: 'reduced', node: <span key="reduced" className={`${chip} bg-[#E63946]/10 text-[#E63946] border border-[#E63946]/20`}>Reduced Price</span> });
  }
  if (newHome) {
    badges.push({ key: 'newHome', node: <span key="newHome" className={`${chip} bg-accent/10 text-accent border border-accent/20`}>New Home</span> });
  }
  if (refurbished) {
    badges.push({ key: 'refurbished', node: <span key="refurbished" className={`${chip} bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/20`}>Refurbished</span> });
  }
  if (jointVenture) {
    badges.push({ key: 'jointVenture', node: <span key="jointVenture" className={`${chip} bg-[#2B5B3C] text-white`}>Joint Venture</span> });
  }
  if (houseShare) {
    badges.push({ key: 'houseShare', node: <span key="houseShare" className={`${chip} bg-white text-primary border border-primary/20`}>House Share</span> });
  }
  if (videoTour) {
    badges.push({ key: 'videoTour', node: <span key="videoTour" className={`${chip} bg-primary/5 text-primary border border-primary/15`}><i className="ri-video-line text-[10px]"></i>Video Tour</span> });
  }
  if (virtualTour) {
    badges.push({ key: 'virtualTour', node: <span key="virtualTour" className={`${chip} bg-primary/5 text-primary border border-primary/15`}><i className="ri-globe-line text-[10px]"></i>Virtual Tour</span> });
  }
  if (floorPlan) {
    badges.push({ key: 'floorPlan', node: <span key="floorPlan" className={`${chip} bg-primary/5 text-primary border border-primary/15`}><i className="ri-map-2-line text-[10px]"></i>Floor Plan</span> });
  }

  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {badges.slice(0, MAX_BADGES).map((b) => b.node)}
    </div>
  );
}