import { MARKETING_TYPES } from './types';

interface Props {
  isNewDevelopment: boolean;
  totalUnits: number;
  setTotalUnits: (v: number) => void;
  unitsSold: number;
  setUnitsSold: (v: number) => void;
  unitsReserved: number;
  setUnitsReserved: (v: number) => void;
  unitsRented: number;
  setUnitsRented: (v: number) => void;
  unitsOccupied: number;
  setUnitsOccupied: (v: number) => void;
  currentPrice: string;
  setCurrentPrice: (v: string) => void;
  previousPrice: string;
  setPreviousPrice: (v: string) => void;
  marketingType: string;
  setMarketingType: (v: string) => void;
  showUnitsRemaining: boolean;
  setShowUnitsRemaining: (v: boolean) => void;
  showPercentSold: boolean;
  setShowPercentSold: (v: boolean) => void;
  showPercentRented: boolean;
  setShowPercentRented: (v: boolean) => void;
  showDeveloperName: boolean;
  setShowDeveloperName: (v: boolean) => void;
  showUrgencyMessage: boolean;
  setShowUrgencyMessage: (v: boolean) => void;
}

const inputBase =
  'w-full text-base font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] placeholder:font-normal rounded-md';

const selectClass = `${inputBase} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237a8a99%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px] pr-11`;

const labelClass = 'block text-[16px] font-bold tracking-wide text-[#0d1f2d] uppercase mb-2 leading-none';

const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
  <label className="relative inline-flex items-center cursor-pointer shrink-0">
    <input type="checkbox" className="sr-only" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
    <div className={`w-11 h-6 rounded-full transition-colors px-0.5 flex items-center ${enabled ? 'bg-[#0d5959]' : 'bg-[#d1d5db]'}`}>
      <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </label>
);

export default function NewDevelopmentInventorySection({
  isNewDevelopment,
  totalUnits, setTotalUnits,
  unitsSold, setUnitsSold,
  unitsReserved, setUnitsReserved,
  unitsRented, setUnitsRented,
  unitsOccupied, setUnitsOccupied,
  currentPrice, setCurrentPrice,
  previousPrice, setPreviousPrice,
  marketingType, setMarketingType,
  showUnitsRemaining, setShowUnitsRemaining,
  showPercentSold, setShowPercentSold,
  showPercentRented, setShowPercentRented,
  showDeveloperName, setShowDeveloperName,
  showUrgencyMessage, setShowUrgencyMessage,
}: Props) {
  if (!isNewDevelopment) return null;

  const available = Math.max(0, totalUnits - unitsSold - unitsReserved);
  const salesProgress = totalUnits > 0 ? Math.min(100, Math.round((unitsSold / totalUnits) * 100)) : 0;
  const isSale = marketingType === 'for_sale' || marketingType === 'both';
  const isRent = marketingType === 'for_rent' || marketingType === 'both';

  const urgencyMsg = (() => {
    if (totalUnits === 0) return '—';
    if (available === 0) return 'Sold out';
    if (available === 1) return 'Last unit available';
    if (available <= 4) return `Only ${available} units remaining`;
    if (available <= 10) return `Limited availability — only ${available} units remaining`;
    return 'Now selling';
  })();

  return (
    <div className="mt-8 pt-6 border-t border-[#e8edf2]">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
          <i className="ri-building-4-line text-white text-sm" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#0d1f2d] tracking-wide">Development Inventory & Marketing</h4>
          <p className="text-[12px] text-[#7a8a99] mt-0.5">Unit counts, pricing urgency and public display toggles</p>
        </div>
      </div>

      {/* Marketing type */}
      <div className="mb-6">
        <label className={labelClass}>Marketing This Development As</label>
        <select value={marketingType} onChange={(e) => setMarketingType(e.target.value)} className={selectClass}>
          {MARKETING_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Unit Inventory Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className={labelClass}>Total Units</label>
          <input
            type="number"
            min={0}
            value={totalUnits || ''}
            onChange={(e) => setTotalUnits(Number(e.target.value) || 0)}
            className={inputBase}
            placeholder="e.g. 100"
          />
        </div>
        {isSale && (
          <>
            <div>
              <label className={labelClass}>Units Sold</label>
              <input
                type="number"
                min={0}
                value={unitsSold || ''}
                onChange={(e) => setUnitsSold(Number(e.target.value) || 0)}
                className={inputBase}
                placeholder="e.g. 50"
              />
            </div>
            <div>
              <label className={labelClass}>Units Reserved</label>
              <input
                type="number"
                min={0}
                value={unitsReserved || ''}
                onChange={(e) => setUnitsReserved(Number(e.target.value) || 0)}
                className={inputBase}
                placeholder="e.g. 10"
              />
            </div>
          </>
        )}
        {isRent && (
          <>
            <div>
              <label className={labelClass}>Units Rented</label>
              <input
                type="number"
                min={0}
                value={unitsRented || ''}
                onChange={(e) => setUnitsRented(Number(e.target.value) || 0)}
                className={inputBase}
                placeholder="e.g. 40"
              />
            </div>
            <div>
              <label className={labelClass}>Units Occupied</label>
              <input
                type="number"
                min={0}
                value={unitsOccupied || ''}
                onChange={(e) => setUnitsOccupied(Number(e.target.value) || 0)}
                className={inputBase}
                placeholder="e.g. 60"
              />
            </div>
          </>
        )}
      </div>

      {/* Live preview */}
      {totalUnits > 0 && (
        <div className="mb-6 p-4 border border-[#e8ecf0] rounded-lg bg-[#f8f9fb]">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#7a8a99] mb-3">Preview</p>
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-[11px] text-[#7a8a99] uppercase tracking-wider">Available</p>
              <p className="text-lg font-bold text-[#0d1f2d]">{available}</p>
            </div>
            {isSale && (
              <div>
                <p className="text-[11px] text-[#7a8a99] uppercase tracking-wider">% Sold</p>
                <p className={`text-lg font-bold ${salesProgress >= 80 ? 'text-red-500' : salesProgress >= 50 ? 'text-amber-600' : 'text-[#0d5959]'}`}>{salesProgress}%</p>
              </div>
            )}
            <div className="flex-1 min-w-[180px]">
              <p className="text-[11px] text-[#7a8a99] uppercase tracking-wider">Urgency Message</p>
              <p className="text-sm font-semibold text-[#0d1f2d]">{urgencyMsg}</p>
            </div>
          </div>
          {isSale && totalUnits > 0 && (
            <div className="mt-3">
              <div className="h-1.5 bg-[#e8ecf0] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${salesProgress}%`,
                    backgroundColor: salesProgress >= 80 ? '#dc2626' : salesProgress >= 50 ? '#f59e0b' : '#0d5959',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pricing urgency */}
      {isSale && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className={labelClass}>Current Price (for urgency messaging)</label>
            <input
              type="number"
              value={currentPrice || ''}
              onChange={(e) => setCurrentPrice(e.target.value)}
              className={inputBase}
              placeholder="e.g. 12500000"
            />
            <p className="text-[11px] text-[#7a8a99] mt-1.5">Used in "Only xy units left at this price" messages</p>
          </div>
          <div>
            <label className={labelClass}>Previous Price (optional)</label>
            <input
              type="number"
              value={previousPrice || ''}
              onChange={(e) => setPreviousPrice(e.target.value)}
              className={inputBase}
              placeholder="e.g. 13000000"
            />
            <p className="text-[11px] text-[#7a8a99] mt-1.5">Shown as strikethrough if higher than current price</p>
          </div>
        </div>
      )}

      {/* Marketing Display Toggles */}
      <div className="space-y-1 border border-[#e8ecf0] rounded-xl overflow-hidden">
        <p className="text-[12px] font-bold uppercase tracking-widest text-[#7a8a99] px-5 pt-4 pb-2">Display Toggles</p>
        {[
          { key: 'showDeveloperName', label: 'Show Developer Name', desc: 'Display developer name publicly on listing pages', icon: 'ri-building-2-line', value: showDeveloperName, set: setShowDeveloperName },
          ...(isSale ? [
            { key: 'showPercentSold', label: 'Show % Sold Progress', desc: 'Display sales progress bar publicly', icon: 'ri-bar-chart-fill', value: showPercentSold, set: setShowPercentSold },
            { key: 'showUnitsRemaining', label: 'Show Units Remaining', desc: 'Show how many units are left at the current price', icon: 'ri-hotel-bed-line', value: showUnitsRemaining, set: setShowUnitsRemaining },
            { key: 'showUrgencyMessage', label: 'Show Urgency Message', desc: 'Auto-generate contextual urgency text based on availability', icon: 'ri-alarm-warning-line', value: showUrgencyMessage, set: setShowUrgencyMessage },
          ] : []),
          ...(isRent ? [
            { key: 'showPercentRented', label: 'Show % Rented / Occupied', desc: 'Display rental/occupancy progress publicly', icon: 'ri-door-lock-line', value: showPercentRented, set: setShowPercentRented },
          ] : []),
        ].map(({ key, label, desc, icon, value, set }) => (
          <div key={key} className="flex items-center justify-between gap-4 px-5 py-3 border-b border-[#f0f3f5] last:border-b-0 hover:bg-[#fafbfc] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg bg-[#f4f6f8] border border-[#e8ecf0]">
                <i className={`${icon} text-sm text-[#5a6a7a]`} />
              </div>
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-[#1a1e24]">{label}</p>
                <p className="text-[12px] text-[#7a8a99]">{desc}</p>
              </div>
            </div>
            <Toggle enabled={value} onChange={set} />
          </div>
        ))}
      </div>
    </div>
  );
}