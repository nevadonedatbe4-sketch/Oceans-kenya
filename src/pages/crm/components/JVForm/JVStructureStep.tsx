import type { JVFormState } from './types';
import { Field, JvSection, inputCls, selectCls, hintCls } from './ui';
import {
  DEAL_TYPE_OPTIONS, DEAL_STRUCTURE_OPTIONS, CONTRIBUTION_TYPE_OPTIONS,
  CONSIDERATION_TYPE_OPTIONS, CURRENCY_OPTIONS, VALUATION_BASIS_OPTIONS,
  VALUATION_STATUS_OPTIONS, EXIT_EXPECTATION_OPTIONS, PROJECT_TYPE_OPTIONS,
  TIMELINE_OPTIONS,
} from '@/pages/crm/jvOpportunityConstants';
import { isCompleteStructure, isCompleteCapital, isCompleteIntent } from './jvCompletion';

interface Props {
  state: JVFormState;
  update: (p: Partial<JVFormState>) => void;
  dealTypeFromLand?: boolean;
}

export default function JVStructureStep({ state, update, dealTypeFromLand }: Props) {
  const total = Number(state.total_planned_units) || 0;
  const minUnits = Number(state.landowner_units_min) || 0;
  const autoPct = total > 0 ? ((minUnits / total) * 100).toFixed(1) : null;

  return (
    <>
      {/* JV Structure & Land Contribution */}
      <JvSection num="5" title="JV Structure & Land Contribution" subtitle="How the partnership is structured and what the land is worth" required complete={isCompleteStructure(state)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Deal type" required hint={dealTypeFromLand ? 'Inherited from the linked land listing — a JV opportunity defaults to Joint Venture. Change it if this deal differs.' : undefined}>
            <select name="deal_type" value={state.deal_type} onChange={(e) => update({ deal_type: e.target.value })} className={selectCls}>
              {DEAL_TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Deal structure">
            <select name="deal_structure" value={state.deal_structure} onChange={(e) => update({ deal_structure: e.target.value })} className={selectCls}>
              {DEAL_STRUCTURE_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Contribution type">
            <select name="contribution_type" value={state.contribution_type} onChange={(e) => update({ contribution_type: e.target.value })} className={selectCls}>
              {CONTRIBUTION_TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Land contribution value">
            <input
              type="number"
              step="0.01"
              min={0}
              name="land_value"
              value={state.land_value}
              onChange={(e) => update({ land_value: e.target.value })}
              placeholder="e.g. 2500000"
              className={inputCls}
            />
          </Field>
          <Field label="Land value currency">
            <select name="land_value_currency" value={state.land_value_currency} onChange={(e) => update({ land_value_currency: e.target.value })} className={selectCls}>
              {CURRENCY_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Valuation basis">
            <select name="valuation_basis" value={state.valuation_basis} onChange={(e) => update({ valuation_basis: e.target.value })} className={selectCls}>
              {VALUATION_BASIS_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Valuation date">
            <input
              type="date"
              name="valuation_date"
              value={state.valuation_date}
              onChange={(e) => update({ valuation_date: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Valuation status">
            <select name="valuation_status" value={state.valuation_status} onChange={(e) => update({ valuation_status: e.target.value })} className={selectCls}>
              {VALUATION_STATUS_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Valuation source / supporting document">
              <input
                name="valuation_source"
                value={state.valuation_source}
                onChange={(e) => update({ valuation_source: e.target.value })}
                placeholder="e.g. Independent appraisal report #1234"
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      </JvSection>

      {/* Capital & Consideration */}
      <JvSection num="6" title="Capital & Consideration" subtitle="Deal currency, capital figures and the landowner's allocation" complete={isCompleteCapital(state)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Deal currency" hint="Primary deal / transaction currency.">
            <select name="deal_currency" value={state.deal_currency} onChange={(e) => update({ deal_currency: e.target.value })} className={selectCls}>
              {CURRENCY_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Local / property currency" hint="Shown as informational equivalent only — never converted or overwritten.">
            <select name="local_currency" value={state.local_currency} onChange={(e) => update({ local_currency: e.target.value })} className={selectCls}>
              {CURRENCY_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Capital amount">
            <input
              type="number"
              step="0.01"
              min={0}
              name="capital_amount"
              value={state.capital_amount}
              onChange={(e) => update({ capital_amount: e.target.value })}
              placeholder="e.g. 2500000"
              className={inputCls}
            />
          </Field>
          <Field label="Expected ROI (%)">
            <input
              type="number"
              step="0.1"
              min={0}
              name="expected_roi"
              value={state.expected_roi}
              onChange={(e) => update({ expected_roi: e.target.value })}
              placeholder="e.g. 18"
              className={inputCls}
            />
          </Field>
          <Field label="Revenue share (%)">
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              name="revenue_share"
              value={state.revenue_share}
              onChange={(e) => update({ revenue_share: e.target.value })}
              placeholder="e.g. 60"
              className={inputCls}
            />
          </Field>
          <Field label="Exit expectation">
            <select name="exit_expectation" value={state.exit_expectation} onChange={(e) => update({ exit_expectation: e.target.value })} className={selectCls}>
              {EXIT_EXPECTATION_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Currency conversion note" hint="Informational equivalent. The original deal currency and amount are preserved.">
              <input
                name="currency_conversion_note"
                value={state.currency_conversion_note}
                onChange={(e) => update({ currency_conversion_note: e.target.value })}
                placeholder="e.g. USD 2.5M ≈ UGX 9.3B (indicative)"
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        <div className="border-t border-[#e2e7ec] pt-5 space-y-4">
          <p className="text-[16px] font-roboto font-semibold text-[#001731] uppercase tracking-wide">Developer consideration to landowner</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Consideration type">
              <select name="consideration_type" value={state.consideration_type} onChange={(e) => update({ consideration_type: e.target.value })} className={selectCls}>
                {CONSIDERATION_TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Consideration cash">
              <input
                type="number"
                step="0.01"
                min={0}
                name="consideration_cash"
                value={state.consideration_cash}
                onChange={(e) => update({ consideration_cash: e.target.value })}
                placeholder="e.g. 500000"
                className={inputCls}
              />
            </Field>
            <Field label="Total planned units">
              <input
                type="number"
                min={0}
                name="total_planned_units"
                value={state.total_planned_units}
                onChange={(e) => update({ total_planned_units: e.target.value })}
                placeholder="e.g. 100"
                className={inputCls}
              />
            </Field>
            <Field label="Landowner units — minimum">
              <input
                type="number"
                min={0}
                name="landowner_units_min"
                value={state.landowner_units_min}
                onChange={(e) => update({ landowner_units_min: e.target.value })}
                placeholder="e.g. 6"
                className={inputCls}
              />
            </Field>
            <Field label="Landowner units — maximum">
              <input
                type="number"
                min={0}
                name="landowner_units_max"
                value={state.landowner_units_max}
                onChange={(e) => update({ landowner_units_max: e.target.value })}
                placeholder="e.g. 10"
                className={inputCls}
              />
            </Field>
            <Field label="Landowner percentage (%)" hint={autoPct ? `Auto-calculated from your figures: ≈ ${autoPct}%` : 'Auto-calculated where enough figures are entered.'}>
              <input
                type="number"
                step="0.1"
                min={0}
                max={100}
                name="landowner_percent"
                value={state.landowner_percent}
                onChange={(e) => update({ landowner_percent: e.target.value })}
                placeholder="auto"
                className={inputCls}
              />
            </Field>
            <Field label="Developer units / percentage">
              <input
                name="developer_units"
                value={state.developer_units}
                onChange={(e) => update({ developer_units: e.target.value })}
                placeholder="e.g. 90 units / 90%"
                className={inputCls}
              />
            </Field>
            <Field label="Other stakeholder allocation">
              <input
                name="developer_consideration_other"
                value={state.developer_consideration_other}
                onChange={(e) => update({ developer_consideration_other: e.target.value })}
                placeholder="e.g. SPV 2 units"
                className={inputCls}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Landowner allocation summary">
                <input
                  name="landowner_allocation_summary"
                  value={state.landowner_allocation_summary}
                  onChange={(e) => update({ landowner_allocation_summary: e.target.value })}
                  placeholder="e.g. 6–10 completed units out of 100"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
        </div>
      </JvSection>

      {/* Development Intent & Timeline */}
      <JvSection num="7" title="Development Intent & Timeline" subtitle="What could be built and how soon it should move" complete={isCompleteIntent(state)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Project type">
            <select name="project_type" value={state.project_type} onChange={(e) => update({ project_type: e.target.value })} className={selectCls}>
              {PROJECT_TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Estimated scale">
            <input
              name="estimated_scale"
              value={state.estimated_scale}
              onChange={(e) => update({ estimated_scale: e.target.value })}
              placeholder="e.g. 100 units / 8 floors"
              className={inputCls}
            />
          </Field>
          <Field label="Preferred timeline">
            <select name="timeline" value={state.timeline} onChange={(e) => update({ timeline: e.target.value })} className={selectCls}>
              {TIMELINE_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Partnership requirements">
              <textarea
                name="partnership_requirements"
                value={state.partnership_requirements}
                onChange={(e) => update({ partnership_requirements: e.target.value })}
                rows={4}
                maxLength={1200}
                placeholder="What kind of partner is sought — capital, expertise, development capacity, equity split preference..."
                className={`${inputCls} resize-none`}
              />
              <p className={hintCls}>{state.partnership_requirements.length}/1200</p>
            </Field>
          </div>
        </div>
      </JvSection>
    </>
  );
}