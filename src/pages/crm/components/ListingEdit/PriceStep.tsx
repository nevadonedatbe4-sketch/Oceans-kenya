import { useEffect } from 'react';
import { AVAILABILITY_STATUS } from './types';

const FREQUENCIES = [
  { value: 'once_off', label: 'Once Off (no suffix)' },
  { value: 'per_month', label: 'Per Month' },
  { value: 'per_year', label: 'Per Year' },
  { value: 'per_week', label: 'Per Week' },
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_quarter', label: 'Per Quarter' },
];

const CURRENCIES = [
  { value: 'KES', label: 'KES (KSh)', flag: 'Kenyan Shilling' },
  { value: 'USD', label: 'USD ($)', flag: 'US Dollar' },
  { value: 'EUR', label: 'EUR (€)', flag: 'Euro' },
  { value: 'GBP', label: 'GBP (£)', flag: 'British Pound' },
];

interface Props {
  price: string;
  setPrice: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  priceUgx: string;
  setPriceUgx: (v: string) => void;
  autoExchange: boolean;
  setAutoExchange: (v: boolean) => void;
  pricePrefix: string;
  setPricePrefix: (v: string) => void;
  pricePostfix: string;
  setPricePostfix: (v: string) => void;
  secondPrice: string;
  setSecondPrice: (v: string) => void;
  propertyLabel: string;
  setPropertyLabel: (v: string) => void;
  serviceCharge: string;
  setServiceCharge: (v: string) => void;
  availabilityStatus: string;
  setAvailabilityStatus: (v: string) => void;
  negotiable: boolean;
  setNegotiable: (v: boolean) => void;
  pricePlaceholder: boolean;
  setPricePlaceholder: (v: boolean) => void;
  showSecondPrice: boolean;
  setShowSecondPrice: (v: boolean) => void;
  frequency: string;
  setFrequency: (v: string) => void;
  purpose: string;
  isPriceRequired?: boolean;
}

/* ── Design tokens — identical to DetailsStep ── */
const inputBase =
  'w-full text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] placeholder:font-normal rounded-md';

const selectClass = `${inputBase} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237a8a99%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px] pr-11`;

const labelClass = 'block text-[14px] font-bold tracking-wide text-[#0d1f2d] uppercase mb-2.5 leading-none';

const hintClass = 'text-[15px] text-[#4a5568] mt-2 leading-relaxed';

/* ── Section Header ── */
const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) => (
  <div className="mb-7">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
        <i className={`${icon} text-white text-base`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-semibold text-[#0d1f2d] tracking-wide">{title}</h4>
        <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
    <div className="h-px bg-[#e5e7eb] mt-4" />
  </div>
);

/* ── Sub-section header (inline, smaller) ── */
const SubHeader = ({ icon, title }: { icon: string; title: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg border border-[#e8ecf0] bg-[#f4f6f8]">
      <i className={`${icon} text-[#0d5959] text-sm`} />
    </div>
    <span className="text-[13px] font-semibold text-[#0d1f2d] uppercase tracking-wide">{title}</span>
    <div className="flex-1 h-px bg-[#e8ecf0]" />
  </div>
);

/* ── Card ── */
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`border border-[#e8ecf0] bg-white overflow-hidden rounded-xl ${className}`}>
    <div className="px-6 py-6">{children}</div>
  </div>
);

/* ── Toggle ── */
const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
  <label className="relative inline-flex items-center cursor-pointer shrink-0">
    <input type="checkbox" className="sr-only" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
    <div className={`w-12 h-7 rounded-full transition-colors px-0.5 flex items-center ${enabled ? 'bg-[#0d5959]' : 'bg-[#d1d5db]'}`}>
      <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </label>
);

/* ── Toggle Row ── */
const ToggleRow = ({
  enabled,
  setEnabled,
  label,
  desc,
  icon,
}: {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  label: string;
  desc: string;
  icon: string;
}) => (
  <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#f0f3f5] last:border-b-0 hover:bg-[#fafbfc] transition-colors">
    <div className="flex items-center gap-3.5 min-w-0">
      <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-lg border border-[#e8ecf0] bg-[#f4f6f8]">
        <i className={`${icon} text-sm text-[#5a6a7a]`} />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-[#1a1e24]">{label}</p>
        <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
    <Toggle enabled={enabled} onChange={setEnabled} />
  </div>
);

export default function PriceStep({
  price, setPrice, currency, setCurrency,
  priceUgx, setPriceUgx, autoExchange, setAutoExchange,
  pricePrefix, setPricePrefix, pricePostfix, setPricePostfix,
  secondPrice, setSecondPrice, propertyLabel, setPropertyLabel,
  serviceCharge, setServiceCharge, availabilityStatus, setAvailabilityStatus,
  negotiable, setNegotiable, pricePlaceholder, setPricePlaceholder,
  showSecondPrice, setShowSecondPrice, frequency, setFrequency, purpose,
  isPriceRequired,
}: Props) {
  useEffect(() => {
    if (!pricePrefix && purpose === 'sale') {
      setPricePrefix('Guide Price');
    }
  }, []);

  return (
    <div className="w-full space-y-5">

      {/* ─── Pricing ─── */}
      <SectionHeader
        icon="ri-price-tag-3-line"
        title="Pricing"
        subtitle="Set the asking price and billing details"
      />

      {/* Price Placeholder toggle */}
      <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
        <ToggleRow
          enabled={pricePlaceholder}
          setEnabled={setPricePlaceholder}
          label="Enable Price Placeholder"
          desc="Hides price, currency, frequency and prefix from the listing"
          icon="ri-eye-off-line"
        />
      </div>

      <Card className={pricePlaceholder ? 'border-amber-200 bg-amber-50/20 relative' : ''}>
        {pricePlaceholder && (
          <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 select-none cursor-not-allowed rounded-xl">
            <div className="flex items-center gap-2.5 px-5 py-3 border border-amber-300 bg-amber-50 rounded-lg">
              <i className="ri-lock-2-line text-amber-600 text-base" />
              <div>
                <p className="text-[15px] font-semibold text-amber-800">Fields locked — Price on Request active</p>
                <p className="text-[13px] text-amber-600 mt-0.5">Disable the toggle above to edit these fields</p>
              </div>
            </div>
          </div>
        )}

        {/* Currency + Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`${labelClass} ${pricePlaceholder ? 'text-[#9ba5b1]' : ''}`}>Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={pricePlaceholder}
              className={`${selectClass} ${pricePlaceholder ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label} — {c.flag}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`${labelClass} ${pricePlaceholder ? 'text-[#9ba5b1]' : ''}`}>
              {pricePlaceholder ? 'Price (locked)' : isPriceRequired !== false ? 'Price *' : 'Price'}
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={pricePlaceholder}
              className={`${inputBase} ${pricePlaceholder ? 'opacity-40 cursor-not-allowed' : ''}`}
              placeholder={pricePlaceholder ? 'Price on request' : isPriceRequired ? 'e.g. 15,000,000' : 'e.g. 15,000,000 (optional)'}
            />
          </div>
        </div>

        {/* Frequency + Prefix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-[#f0f3f5]">
          <div>
            <label className={`${labelClass} ${pricePlaceholder ? 'text-[#9ba5b1]' : ''}`}>Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              disabled={pricePlaceholder}
              className={`${selectClass} ${pricePlaceholder ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`${labelClass} ${pricePlaceholder ? 'text-[#9ba5b1]' : ''}`}>Price Prefix</label>
            <input
              type="text"
              value={pricePrefix}
              onChange={(e) => setPricePrefix(e.target.value)}
              disabled={pricePlaceholder}
              className={`${inputBase} ${pricePlaceholder ? 'opacity-40 cursor-not-allowed' : ''}`}
              placeholder="e.g. Guide Price"
            />
            {!pricePlaceholder && (
              <p className={hintClass}>Auto-set to &apos;Guide Price&apos; for sale listings</p>
            )}
          </div>
        </div>
      </Card>

      {/* ─── Price Condition ─── */}
      <SectionHeader
        icon="ri-file-list-line"
        title="Price Condition"
        subtitle="Negotiation and secondary pricing options"
      />

      <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
        <ToggleRow
          enabled={negotiable}
          setEnabled={setNegotiable}
          label="Negotiable"
          desc="Buyers can make an offer"
          icon="ri-hand-heart-line"
        />
        <ToggleRow
          enabled={showSecondPrice}
          setEnabled={setShowSecondPrice}
          label="Second Price"
          desc="e.g. service charge or per sqm rate"
          icon="ri-coins-line"
        />
      </div>

      {showSecondPrice && (
        <Card>
          <SubHeader icon="ri-coins-line" title="Second Price Details" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Second Amount</label>
              <input
                type="number"
                value={secondPrice}
                onChange={(e) => setSecondPrice(e.target.value)}
                className={inputBase}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>After The Price</label>
              <input
                type="text"
                value={pricePostfix}
                onChange={(e) => setPricePostfix(e.target.value)}
                className={inputBase}
                placeholder="e.g. Service charge"
              />
              <p className={hintClass}>Label shown next to the second price</p>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Currency Conversion ─── */}
      <SectionHeader
        icon="ri-exchange-dollar-line"
        title="Currency Conversion"
        subtitle="Auto-convert to Kenyan Shillings"
      />

      <Card>
        <div className="flex flex-col md:flex-row md:items-end gap-6">
          <div className="flex-1">
            <label className={labelClass}>Price in KES</label>
            <input
              type="number"
              value={priceUgx}
              onChange={(e) => setPriceUgx(e.target.value)}
              className={inputBase}
              placeholder="e.g. 1,950,000,000"
            />
            <p className={hintClass}>Enter KES equivalent or leave empty for auto-conversion</p>
          </div>
          <div className="shrink-0 pb-1">
            <label className="flex items-center gap-3.5 cursor-pointer select-none">
              <Toggle enabled={autoExchange} onChange={setAutoExchange} />
              <div>
                <p className="text-[15px] font-semibold text-[#1a1e24]">Auto Exchange Rate</p>
                <p className="text-[13px] text-[#7a8a99] leading-relaxed">
                  Automatically convert from {currency} to KES
                </p>
              </div>
            </label>
          </div>
        </div>
      </Card>

    </div>
  );
}