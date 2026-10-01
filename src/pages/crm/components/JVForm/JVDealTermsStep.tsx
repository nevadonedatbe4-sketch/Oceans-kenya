import type { JVFormState } from './types';
import { Field, JvSection, inputCls, selectCls, PaymentTermPills } from './ui';
import {
  DEV_PAYMENT_TYPE_OPTIONS, DEV_PAYMENT_FREQUENCY_OPTIONS, CURRENCY_OPTIONS,
  COMMISSION_STRUCTURE_OPTIONS, COMMISSION_BASIS_OPTIONS, COMMISSION_PAYER_OPTIONS,
  COMMISSION_PAYMENT_TIMING_OPTIONS, PRICE_BASIS_OPTIONS, PAYMENT_TERMS_OPTIONS,
} from '@/pages/crm/jvOpportunityConstants';
import { isCompletePricing, isCompleteDevPayment, isCompleteCommission } from './jvCompletion';

interface Props {
  state: JVFormState;
  update: (p: Partial<JVFormState>) => void;
}

export default function JVDealTermsStep({ state, update }: Props) {
  return (
    <>
      {/* Pricing & Payment Terms — a JV does not have to be price-free */}
      <JvSection num="8" title="Pricing & Payment Terms" subtitle="Optional commercial pricing and flexible payment structures" complete={isCompletePricing(state)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Price (optional)" hint="Leave empty if price is on request or not applicable.">
            <input
              type="number"
              step="0.01"
              min={0}
              name="price"
              value={state.price}
              onChange={(e) => update({ price: e.target.value })}
              placeholder="e.g. 2500000"
              className={inputCls}
            />
          </Field>
          <Field label="Currency">
            <select name="price_currency" value={state.price_currency} onChange={(e) => update({ price_currency: e.target.value })} className={selectCls}>
              {CURRENCY_OPTIONS.filter((o) => o.value !== '').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Price basis">
            <select name="price_basis" value={state.price_basis} onChange={(e) => update({ price_basis: e.target.value })} className={selectCls}>
              {PRICE_BASIS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <div className="flex items-end pb-1">
            <label className="inline-flex items-center gap-2.5 pt-4 cursor-pointer">
              <input
                type="checkbox"
                name="price_on_request"
                checked={state.price_on_request}
                onChange={(e) => update({ price_on_request: e.target.checked })}
                className="w-[18px] h-[18px] rounded text-[#001731] border-[#cdd5de] focus:ring-[#001731]"
              />
              <span className="text-[16px] font-roboto text-[#001731]">Price on request</span>
            </label>
          </div>
        </div>
        <div className="border-t border-[#e2e7ec] pt-5">
          <PaymentTermPills
            label="Payment terms"
            hint="Select all that apply — combinations allowed. Checkable rectangular pills, not a dropdown."
            options={PAYMENT_TERMS_OPTIONS}
            value={state.payment_terms}
            onChange={(v) => update({ payment_terms: v })}
          />
        </div>
        <div className="p-4 border border-[#e2e7ec] bg-[#f8f9fb] rounded-md flex items-start gap-2.5">
          <i className="ri-information-line text-[#001731] text-base mt-0.5" />
          <p className="text-[13px] font-roboto text-[#6b7684] leading-relaxed">
            Pricing is optional and independent. Selecting <span className="font-semibold text-[#001731]">Price on request</span> does not hide the price basis — both stay editable.
          </p>
        </div>
      </JvSection>

      {/* Development-Period Payments */}
      <JvSection num="9" title="Development-Period Payments" subtitle="Interim compensation paid to the landowner during development" complete={isCompleteDevPayment(state)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Payment during development">
            <select name="dev_payment_type" value={state.dev_payment_type} onChange={(e) => update({ dev_payment_type: e.target.value })} className={selectCls}>
              {DEV_PAYMENT_TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment amount">
            <input
              type="number"
              step="0.01"
              min={0}
              name="dev_payment_amount"
              value={state.dev_payment_amount}
              onChange={(e) => update({ dev_payment_amount: e.target.value })}
              placeholder="e.g. 5000"
              className={inputCls}
            />
          </Field>
          <Field label="Payment currency">
            <select name="dev_payment_currency" value={state.dev_payment_currency} onChange={(e) => update({ dev_payment_currency: e.target.value })} className={selectCls}>
              {CURRENCY_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Frequency">
            <select name="dev_payment_frequency" value={state.dev_payment_frequency} onChange={(e) => update({ dev_payment_frequency: e.target.value })} className={selectCls}>
              <option value="">Select frequency</option>
              {DEV_PAYMENT_FREQUENCY_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Development period / duration">
            <input
              name="dev_payment_duration"
              value={state.dev_payment_duration}
              onChange={(e) => update({ dev_payment_duration: e.target.value })}
              placeholder="e.g. 24 months"
              className={inputCls}
            />
          </Field>
          <Field label="Start date">
            <input
              type="date"
              name="dev_payment_start"
              value={state.dev_payment_start}
              onChange={(e) => update({ dev_payment_start: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Payment recipient">
            <input
              name="dev_payment_recipient"
              value={state.dev_payment_recipient}
              onChange={(e) => update({ dev_payment_recipient: e.target.value })}
              placeholder="e.g. Landowner / Trust"
              className={inputCls}
            />
          </Field>
          <Field label="Payment responsibility">
            <input
              name="dev_payment_responsible"
              value={state.dev_payment_responsible}
              onChange={(e) => update({ dev_payment_responsible: e.target.value })}
              placeholder="e.g. Developer / SPV"
              className={inputCls}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                name="dev_payment_notes"
                value={state.dev_payment_notes}
                onChange={(e) => update({ dev_payment_notes: e.target.value })}
                rows={3}
                maxLength={800}
                placeholder="Any conditions, indexation or payment triggers..."
                className={`${inputCls} resize-none`}
              />
            </Field>
          </div>
        </div>
        <div className="p-4 border border-[#e2e7ec] bg-[#f8f9fb] rounded-md flex items-start gap-2.5">
          <i className="ri-information-line text-[#001731] text-base mt-0.5" />
          <p className="text-[13px] font-roboto text-[#6b7684] leading-relaxed">
            e.g. Development-period rent <span className="font-semibold text-[#001731]">USD 5,000</span> monthly for <span className="font-semibold text-[#001731]">24 months</span>.
          </p>
        </div>
      </JvSection>

      {/* Agent Commission */}
      <JvSection num="10" title="Agent Commission" subtitle="Explicit commission capture for land-for-units, equity, profit or revenue share deals" complete={isCompleteCommission(state)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Commission structure">
            <select name="commission_structure" value={state.commission_structure} onChange={(e) => update({ commission_structure: e.target.value })} className={selectCls}>
              {COMMISSION_STRUCTURE_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Commission basis">
            <select name="commission_basis" value={state.commission_basis} onChange={(e) => update({ commission_basis: e.target.value })} className={selectCls}>
              {COMMISSION_BASIS_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Commission payer" required hint="Clearly identify who pays the commission.">
            <select name="commission_payer" value={state.commission_payer} onChange={(e) => update({ commission_payer: e.target.value })} className={selectCls}>
              {COMMISSION_PAYER_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Commission percentage (%)">
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              name="commission_percent"
              value={state.commission_percent}
              onChange={(e) => update({ commission_percent: e.target.value })}
              placeholder="e.g. 3"
              className={inputCls}
            />
          </Field>
          <Field label="Commission amount">
            <input
              type="number"
              step="0.01"
              min={0}
              name="commission_amount"
              value={state.commission_amount}
              onChange={(e) => update({ commission_amount: e.target.value })}
              placeholder="e.g. 75000"
              className={inputCls}
            />
          </Field>
          <Field label="Commission currency">
            <select name="commission_currency" value={state.commission_currency} onChange={(e) => update({ commission_currency: e.target.value })} className={selectCls}>
              {CURRENCY_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment timing">
            <select name="commission_payment_timing" value={state.commission_payment_timing} onChange={(e) => update({ commission_payment_timing: e.target.value })} className={selectCls}>
              {COMMISSION_PAYMENT_TIMING_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment trigger">
            <input
              name="commission_payment_trigger"
              value={state.commission_payment_trigger}
              onChange={(e) => update({ commission_payment_trigger: e.target.value })}
              placeholder="e.g. Upon execution of JV agreement"
              className={inputCls}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Commission notes">
              <textarea
                name="commission_notes"
                value={state.commission_notes}
                onChange={(e) => update({ commission_notes: e.target.value })}
                rows={3}
                maxLength={600}
                placeholder="e.g. Payable by developer, based on agreed transaction value, upon execution of JV agreement."
                className={`${inputCls} resize-none`}
              />
            </Field>
          </div>
        </div>
        <label className="inline-flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            name="commission_internal"
            checked={state.commission_internal}
            onChange={(e) => update({ commission_internal: e.target.checked })}
            className="w-[18px] h-[18px] rounded text-[#001731] border-[#cdd5de] focus:ring-[#001731]"
          />
          <span className="text-[16px] font-roboto text-[#001731]">
            Keep commission <span className="font-semibold">Internal / CRM Only</span> — never shown on the public desk
          </span>
        </label>
        <div className="mt-2 p-4 border border-[#e2e7ec] bg-[#f8f9fb] rounded-md flex items-start gap-2.5">
          <i className="ri-lock-line text-[#001731] text-base mt-0.5" />
          <p className="text-[13px] font-roboto text-[#6b7684] leading-relaxed">
            Commission, its payer and negotiated terms stay private in the CRM. Only the public opportunity summary is exported to the desk.
          </p>
        </div>
      </JvSection>
    </>
  );
}