import { useCurrency } from '@/hooks/useCurrency';

interface NewDevAvailabilityPanelProps {
  totalUnits: number | null;
  unitsSold: number | null;
  unitsReserved: number | null;
  unitsRented: number | null;
  unitsOccupied: number | null;
  currentPrice: number | null;
  previousPrice: number | null;
  currency: string;
  marketingType: string;
  showUnitsRemaining: boolean;
  showPercentSold: boolean;
  showPercentRented: boolean;
  showDeveloperName: boolean;
  showUrgencyMessage: boolean;
  unitsRemainingOverride?: number;
  developerName: string;
}

function ProgressBar({ percentage, label, color }: { percentage: number; label: string; color?: string }) {
  const c = Math.min(100, Math.max(0, percentage));
  const barColor = color || (c >= 80 ? '#dc2626' : c >= 50 ? '#f59e0b' : '#0d5959');
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-roboto font-bold uppercase tracking-widest text-[#012042]">{label}</span>
        <span className="text-[11px] font-roboto font-bold text-[#012042]">{c}%</span>
      </div>
      <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${c}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

export default function NewDevAvailabilityPanel({
  totalUnits,
  unitsSold,
  unitsReserved,
  unitsRented,
  unitsOccupied,
  currentPrice,
  previousPrice,
  currency,
  marketingType,
  showUnitsRemaining,
  showPercentSold,
  showPercentRented,
  showUrgencyMessage,
  showDeveloperName,
  unitsRemainingOverride = 0,
  developerName,
}: NewDevAvailabilityPanelProps) {
  const { format } = useCurrency();

  const total = totalUnits || 0;
  const sold = unitsSold || 0;
  const reserved = unitsReserved || 0;
  const rented = unitsRented || 0;
  const occupied = unitsOccupied || 0;
  const available = Math.max(0, total - sold - reserved);

  const salesProgress = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
  const rentalProgress = total > 0 ? Math.min(100, Math.round((rented / total) * 100)) : 0;
  const occupancyProgress = total > 0 ? Math.min(100, Math.round((occupied / total) * 100)) : 0;

  const urgencyMessage = (() => {
    if (total === 0) return '';
    // Manual override: when the agent set an explicit number, show it verbatim.
    if (unitsRemainingOverride > 0) {
      if (unitsRemainingOverride === 1) return 'Last unit available';
      return `Only ${unitsRemainingOverride} units remaining`;
    }
    if (available === 0) return 'Sold out';
    if (available === 1) return 'Last unit available';
    if (available <= 4) return `Only ${available} units remaining`;
    if (available <= 10) return `Limited availability - only ${available} units remaining`;
    return 'Now selling';
  })();

  const isSale = marketingType === 'for_sale' || marketingType === 'both';
  const isRent = marketingType === 'for_rent' || marketingType === 'both';

  const hasAnything =
    (showDeveloperName && developerName) ||
    (isSale && total > 0 && (showPercentSold || showUnitsRemaining || showUrgencyMessage)) ||
    (isRent && total > 0 && showPercentRented && (rentalProgress > 0 || occupancyProgress > 0));

  if (!hasAnything) return null;

  return (
    <div className="border border-[#e5e5e5] rounded-[2px] bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-[#e5e5e5]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center bg-[#012042] rounded-[2px]">
            <i className="ri-building-4-line text-white text-sm"></i>
          </div>
          <div>
            <p className="text-[11px] font-roboto font-bold text-[#012042] uppercase tracking-widest">Development Status</p>
            {showDeveloperName && developerName && (
              <p className="text-[12px] font-roboto text-[#888]">
                Developed by <span className="font-semibold text-[#012042]">{developerName}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Sales Progress */}
        {isSale && total > 0 && showPercentSold && salesProgress > 0 && (
          <ProgressBar
            percentage={salesProgress}
            label={salesProgress >= 95 ? `${salesProgress}% SOLD - LIMITED UNITS` : `${salesProgress}% SOLD`}
          />
        )}

        {/* Rental Progress */}
        {isRent && total > 0 && showPercentRented && rentalProgress > 0 && (
          <ProgressBar percentage={rentalProgress} label={`${rentalProgress}% RENTED`} color="#0d5959" />
        )}

        {/* Occupancy Progress */}
        {isRent && total > 0 && showPercentRented && occupancyProgress > 0 && (
          <ProgressBar percentage={occupancyProgress} label={`${occupancyProgress}% OCCUPIED`} color="#7c3aed" />
        )}

        {/* Unit Stats Grid */}
        {total > 0 && (showUnitsRemaining || showPercentSold) && (
          <div className="grid grid-cols-2 gap-px bg-[#e5e5e5] border border-[#e5e5e5] rounded-[2px] overflow-hidden">
            {([
              { label: 'Total Units', value: String(total), icon: 'ri-building-2-line' },
              { label: 'Available', value: String(available), icon: 'ri-check-double-line', highlight: available <= 4 && available > 0 },
              { label: 'Sold', value: String(sold), icon: 'ri-hand-coin-line' },
              { label: 'Reserved', value: String(reserved), icon: 'ri-bookmark-line' },
            ]).map((stat) => (
              <div key={stat.label} className={`bg-white px-4 py-3 ${stat.highlight ? 'bg-red-50' : ''}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <i className={`${stat.icon} text-[#888] text-[11px]`}></i>
                  <span className="text-[10px] font-roboto font-semibold text-[#888] uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className={`text-lg font-roboto font-bold ${stat.highlight ? 'text-red-500' : 'text-[#012042]'}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Urgency message */}
        {isSale && showUrgencyMessage && urgencyMessage && urgencyMessage !== 'Now selling' && (
          <div className="flex items-center gap-2 py-2.5 px-3 bg-red-50 border border-red-100 rounded-[2px]">
            <i className="ri-alarm-warning-line text-red-500 text-sm shrink-0"></i>
            <p className="text-sm font-roboto font-semibold text-red-600">{urgencyMessage}</p>
          </div>
        )}

        {/* Pricing urgency */}
        {isSale && showUnitsRemaining && available > 0 && currentPrice && currentPrice > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-roboto text-[#888] uppercase tracking-wider">Current Price</p>
            <div className="flex items-baseline gap-2">
              <p className="text-base font-roboto font-bold text-[#012042]">
                {format(currentPrice, currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
              </p>
              {previousPrice && previousPrice > 0 && previousPrice > currentPrice && (
                <p className="text-sm font-roboto text-[#888] line-through">
                  {format(previousPrice, currency as 'KES' | 'USD' | 'GBP' | 'EUR')}
                </p>
              )}
            </div>
            <p className="text-[11px] font-roboto text-[#888]">
              {available} unit{available !== 1 ? 's' : ''} at this price
            </p>
          </div>
        )}
      </div>
    </div>
  );
}