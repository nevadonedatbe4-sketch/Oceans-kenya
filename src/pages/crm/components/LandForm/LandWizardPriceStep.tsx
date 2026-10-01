import type { LandFormState } from './types';
import { Field, SectionCard, SectionHeader, SelectField, CheckboxGroup, ToggleField, inputCls } from './fields';
import {
  PRICE_BASIS_OPTIONS, PAYMENT_TERMS_CONCISE, INSTALLMENT_FREQUENCY_OPTIONS, CURRENCY_OPTIONS,
} from '@/pages/crm/landConstants';

interface Props { state: LandFormState; update: (p: Partial<LandFormState>) => void; }

const INSTALLMENT_TRIGGERS = ['Installments Available', 'Seller Financing', 'Flexible / Negotiable'];

export default function LandWizardPriceStep({ state, update }: Props) {
  const priceOnRequest = state.priceStatus === 'on_request';
  const hasInstallments = state.paymentTerms.some((t) => INSTALLMENT_TRIGGERS.includes(t));
  const size = parseFloat(state.landSize) || 0;

  /* Toggle the existing global Price-on-Request flag; no duplicate pricing logic. */
  const togglePriceOnRequest = (checked: boolean) => {
    update({ priceStatus: checked ? 'on_request' : '' });
  };

  return (
    <SectionCard>
      <SectionHeader step={2} title="Pricing" subtitle="Set the asking price and how it can be paid" />
      <div className="space-y-6">
        {/* Price on Request — separate line, above Asking Price. Independently controls the price fields. */}
        <label className={`inline-flex items-center gap-3 px-4 py-3 border rounded-md cursor-pointer transition-colors text-base font-roboto ${
          priceOnRequest ? 'border-[#0d5959] bg-[#0d5959]/5 text-[#111827]' : 'border-[#aab4bf] bg-white text-[#111827] hover:border-[#0d5959]/40'
        }`}>
          <input
            type="checkbox"
            checked={priceOnRequest}
            onChange={(e) => togglePriceOnRequest(e.target.checked)}
            className="w-[18px] h-[18px] rounded text-[#0d5959] border-[#aab4bf] focus:ring-[#0d5959]"
          />
          <span className="select-none">Price on Request</span>
          {priceOnRequest && <span className="text-[13px] font-medium text-[#0d5959]">— listing shows &quot;Price on Request&quot;</span>}
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Asking price"
            required={!priceOnRequest}
            hint={priceOnRequest ? 'Locked while Price on Request is selected' : 'Numerical value, e.g. 25000000'}
          >
            <input
              type="number"
              step="any"
              min="0"
              value={state.askingPrice}
              onChange={(e) => update({ askingPrice: e.target.value })}
              disabled={priceOnRequest}
              placeholder="e.g. 25000000"
              className={`${inputCls} ${priceOnRequest ? 'bg-[#f3f5f7] text-[#6b7280] cursor-not-allowed' : ''}`}
            />
          </Field>
          <Field label="Price basis" hint={priceOnRequest ? 'Locked while Price on Request is selected' : 'How the asking price is expressed'}>
            <div className={priceOnRequest ? 'opacity-60 pointer-events-none' : ''}>
              <SelectField value={state.priceBasis} onChange={(v) => update({ priceBasis: v })} options={PRICE_BASIS_OPTIONS.filter((o) => o.value !== '')} placeholder="Price basis" />
            </div>
          </Field>
        </div>

        <Field label="Currency" hint="Independent of Price on Request — always visible">
          <SelectField value={state.currency} onChange={(v) => update({ currency: v })} options={CURRENCY_OPTIONS} />
        </Field>

        {!priceOnRequest && parseFloat(state.askingPrice) > 0 && size > 0 && (
          <p className="text-[14px] font-roboto text-[#0d5959]">
            <i className="ri-calculator-line" /> ≈ {formatCurrency(parseFloat(state.askingPrice) / size, state.currency)} per {state.landSizeUnit || 'acre'}
          </p>
        )}

        <div className="border-t border-[#d6dbe1] pt-6">
          <CheckboxGroup
            label="Payment terms"
            hint="Select all that apply — Installment options reveal further fields"
            options={PAYMENT_TERMS_CONCISE}
            value={state.paymentTerms}
            onChange={(v) => update({ paymentTerms: v })}
          />
        </div>

        {hasInstallments && (
          <div className="rounded-lg border border-[#0d5959]/25 bg-[#0d5959]/5 p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Deposit required">
                <input value={state.depositRequired} onChange={(e) => update({ depositRequired: e.target.value })} placeholder="e.g. 20% on signing" className={inputCls} />
              </Field>
              <Field label="Installment period">
                <input value={state.installmentPeriod} onChange={(e) => update({ installmentPeriod: e.target.value })} placeholder="e.g. 36 months" className={inputCls} />
              </Field>
              <Field label="Payment frequency">
                <SelectField value={state.installmentFrequency} onChange={(v) => update({ installmentFrequency: v })} options={INSTALLMENT_FREQUENCY_OPTIONS.filter((o) => o.value !== '')} placeholder="Frequency" />
              </Field>
              <Field label="Balance terms">
                <input value={state.balanceTerms} onChange={(e) => update({ balanceTerms: e.target.value })} placeholder="e.g. Balance upon transfer of title" className={inputCls} />
              </Field>
            </div>
            <ToggleField label="Interest applies" checked={state.interestApplies} onChange={(v) => update({ interestApplies: v })} />
            <Field label="Payment notes">
              <textarea value={state.paymentNotes} onChange={(e) => update({ paymentNotes: e.target.value })} rows={2} maxLength={400} placeholder="Any further payment detail" className={`${inputCls} resize-none`} />
            </Field>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function formatCurrency(value: number, currency: string) {
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : 'KSh ';
  if (value >= 1000000000) return `${sym}${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${sym}${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${sym}${(value / 1000).toFixed(0)}K`;
  return `${sym}${value.toLocaleString()}`;
}