import { DevelopmentFormState, CURRENCIES, MARKETING_TYPES } from './types';
import { inputBase, selectClass, labelClass, hintClass, SectionHeader, CollapsibleCard, CounterBox, ToggleRow } from './ui';

interface Props {
  form: DevelopmentFormState;
  update: (patch: Partial<DevelopmentFormState>) => void;
}

export default function DevelopmentPricingStep({ form, update }: Props) {
  return (
    <div className="w-full space-y-5">
      <SectionHeader icon="ri-price-tag-3-line" title="Pricing & Payment Plan" subtitle="Base price, deposit and instalment structure" />

      <CollapsibleCard icon="ri-money-dollar-circle-line" title="Base Pricing" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <div>
            <label className={labelClass}>Currency</label>
            <select value={form.currency} onChange={(e) => update({ currency: e.target.value })} className={selectClass}>
              {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>From Price</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => update({ price: e.target.value })}
              className={inputBase}
              placeholder="e.g. 10,000,000"
            />
            <p className={hintClass}>The lowest entry price shown on the listing card.</p>
          </div>
          <div>
            <label className={labelClass}>Current Price</label>
            <input
              type="number"
              value={form.currentPrice}
              onChange={(e) => update({ currentPrice: e.target.value })}
              className={inputBase}
              placeholder="e.g. 10,000,000"
            />
          </div>
          <div>
            <label className={labelClass}>Previous Price</label>
            <input
              type="number"
              value={form.previousPrice}
              onChange={(e) => update({ previousPrice: e.target.value })}
              className={inputBase}
              placeholder="e.g. 11,500,000"
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard icon="ri-calendar-check-line" title="Payment Plan" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <div>
            <label className={labelClass}>Deposit (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.paymentPlan.depositPercent}
              onChange={(e) => update({ paymentPlan: { ...form.paymentPlan, depositPercent: e.target.value } })}
              className={inputBase}
              placeholder="e.g. 20"
            />
          </div>
          <div>
            <label className={labelClass}>Installments</label>
            <input
              type="text"
              value={form.paymentPlan.installments}
              onChange={(e) => update({ paymentPlan: { ...form.paymentPlan, installments: e.target.value } })}
              className={inputBase}
              placeholder="e.g. Flexible / 24 months"
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard icon="ri-article-line" title="Marketing" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <div>
            <label className={labelClass}>Marketing Type</label>
            <select value={form.marketingType} onChange={(e) => update({ marketingType: e.target.value })} className={selectClass}>
              {MARKETING_TYPES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 border-t border-[#f0f3f5] pt-4">
          <p className="text-[16px] font-semibold text-[#0d1f2d] uppercase tracking-wide mb-3">Unit Inventory (for progress display)</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <CounterBox label="Units Sold" value={form.unitsSold} onDec={() => update({ unitsSold: Math.max(0, form.unitsSold - 1) })} onInc={() => update({ unitsSold: form.unitsSold + 1 })} />
            <CounterBox label="Units Reserved" value={form.unitsReserved} onDec={() => update({ unitsReserved: Math.max(0, form.unitsReserved - 1) })} onInc={() => update({ unitsReserved: form.unitsReserved + 1 })} />
            <CounterBox label="Units Rented" value={form.unitsRented} onDec={() => update({ unitsRented: Math.max(0, form.unitsRented - 1) })} onInc={() => update({ unitsRented: form.unitsRented + 1 })} />
            <CounterBox label="Units Occupied" value={form.unitsOccupied} onDec={() => update({ unitsOccupied: Math.max(0, form.unitsOccupied - 1) })} onInc={() => update({ unitsOccupied: form.unitsOccupied + 1 })} />
          </div>
        </div>
      </CollapsibleCard>

      <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
        <ToggleRow enabled={form.showUnitsRemaining} setEnabled={(v) => update({ showUnitsRemaining: v })} label="Show Units Remaining" desc="Display how many units are still available" icon="ri-stack-line" />
        <ToggleRow enabled={form.showPercentSold} setEnabled={(v) => update({ showPercentSold: v })} label="Show % Sold" desc="Display a sales progress bar" icon="ri-percent-line" />
        <ToggleRow enabled={form.showPercentRented} setEnabled={(v) => update({ showPercentRented: v })} label="Show % Rented" desc="Display rental progress" icon="ri-home-smile-line" />
        <ToggleRow enabled={form.showDeveloperName} setEnabled={(v) => update({ showDeveloperName: v })} label="Show Developer Name" desc="Show the developer brand on the card" icon="ri-user-3-line" />
        <ToggleRow enabled={form.showUrgencyMessage} setEnabled={(v) => update({ showUrgencyMessage: v })} label="Show Urgency Message" desc="Show 'only X units remaining' messaging" icon="ri-alarm-warning-line" />
        {form.showUrgencyMessage && (
          <div className="px-5 py-4 border-b border-[#f0f3f5] bg-[#fafbfc]">
            <label className={labelClass}>Units Remaining (override)</label>
            <input
              type="number"
              min={0}
              value={form.unitsRemaining}
              onChange={(e) => update({ unitsRemaining: e.target.value })}
              className={inputBase}
              placeholder="Optional — leaves empty to auto-calculate"
            />
            <p className={hintClass}>If set, the card shows “Only X units remaining” (using this number). Leave blank to auto-derive it from Total − Sold − Reserved.</p>
          </div>
        )}
      </div>
    </div>
  );
}