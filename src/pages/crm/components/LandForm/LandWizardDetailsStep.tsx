import type { LandFormState } from './types';
import { Field, SectionCard, SectionHeader, SelectField, CheckboxPills, inputCls } from './fields';
import {
  SIZE_UNIT_OPTIONS, DIMENSION_UNIT_OPTIONS, TERRAIN_OPTIONS,
  PLOT_SHAPE_OPTIONS,
  LAND_CLASSIFICATION_OPTIONS, TENURE_OPTIONS, TITLE_DOC_OPTIONS, VERIFICATION_STATUS_OPTIONS,
  convertSize, formatSizeValue,
} from '@/pages/crm/landConstants';

interface Props { state: LandFormState; update: (p: Partial<LandFormState>) => void; }

export default function LandWizardDetailsStep({ state, update }: Props) {
  const size = parseFloat(state.landSize);
  const unit = state.landSizeUnit || 'acres';
  const equiv: { to: string; val: number | null }[] = [
    { to: 'acres', val: unit === 'acres' ? size : convertSize(size, unit, 'acres') },
    { to: 'hectares', val: unit === 'hectares' ? size : convertSize(size, unit, 'hectares') },
    { to: 'sqm', val: unit === 'sqm' ? size : convertSize(size, unit, 'sqm') },
  ];

  return (
    <SectionCard>
      <SectionHeader step={4} title="Property Details" subtitle="How big is the land, what does it look like, and what title does it hold?" />
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Land size" required hint="Supports decimals (e.g. 0.25, 1.75, 12.5)">
            <input
              type="number"
              step="any"
              min="0"
              value={state.landSize}
              onChange={(e) => update({ landSize: e.target.value })}
              placeholder="e.g. 2.5"
              className={inputCls}
            />
          </Field>
          <Field label="Unit">
            <SelectField value={unit} onChange={(v) => update({ landSizeUnit: v })} options={SIZE_UNIT_OPTIONS} />
          </Field>
        </div>

        {size > 0 && (
          <div className="flex flex-wrap gap-2">
            {equiv.filter((e) => e.val !== null && e.to !== unit).map((e) => (
              <span key={e.to} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0d5959]/8 text-[#0d5959] text-[13px] font-roboto font-medium">
                <i className="ri-arrow-right-s-line" />
                ≈ {formatSizeValue(e.val as number, e.to)}
              </span>
            ))}
          </div>
        )}

        {/* Optional plot dimensions */}
        <div className="border-t border-[#d6dbe1] pt-6">
          <h4 className="font-jost text-[16px] font-semibold text-[#111827] mb-4">Plot Dimensions (optional)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="Plot length">
              <input type="number" step="any" min="0" value={state.plotLength} onChange={(e) => update({ plotLength: e.target.value })} placeholder="e.g. 50" className={inputCls} />
            </Field>
            <Field label="Plot width">
              <input type="number" step="any" min="0" value={state.plotWidth} onChange={(e) => update({ plotWidth: e.target.value })} placeholder="e.g. 100" className={inputCls} />
            </Field>
            <Field label="Dim. unit">
              <SelectField value={state.plotDimUnit} onChange={(v) => update({ plotDimUnit: v })} options={DIMENSION_UNIT_OPTIONS} />
            </Field>
            <Field label="Plot shape">
              <SelectField value={state.plotShape} onChange={(v) => update({ plotShape: v })} options={PLOT_SHAPE_OPTIONS.map((o) => ({ value: o, label: o }))} placeholder="Select plot shape" />
            </Field>
          </div>
          {state.plotLength && state.plotWidth && (
            <p className="text-[14px] font-roboto text-[#0d5959] mt-2.5">
              <i className="ri-ruler-2-line" /> {state.plotLength} × {state.plotWidth} {state.plotDimUnit || 'ft'}
            </p>
          )}
        </div>

        {/* Terrain — dropdown control */}
        <CheckboxPills
          label="Terrain"
          hint="Select all that apply"
          options={TERRAIN_OPTIONS}
          value={state.terrain}
          onChange={(v) => update({ terrain: v })}
          placeholder="Select terrain"
        />

        {/* Tenure & documents */}
        <div className="border-t border-[#d6dbe1] pt-6">
          <h4 className="font-jost text-[16px] font-semibold text-[#111827] mb-4">Tenure & Documentation</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tenure">
              <SelectField value={state.tenure} onChange={(v) => update({ tenure: v })} options={TENURE_OPTIONS.filter((o) => o.value !== '')} placeholder="Select tenure" />
            </Field>
            <Field label="Ownership / land classification">
              <SelectField value={state.landClassification} onChange={(v) => update({ landClassification: v })} options={LAND_CLASSIFICATION_OPTIONS.filter((o) => o.value !== '')} placeholder="Classification" />
            </Field>
            <Field label="Title / documentation">
              <SelectField value={state.titleDocument} onChange={(v) => update({ titleDocument: v })} options={TITLE_DOC_OPTIONS.filter((o) => o.value !== '')} placeholder="Title / documentation" />
            </Field>
            <Field label="Verification status">
              <SelectField value={state.verificationStatus} onChange={(v) => update({ verificationStatus: v })} options={VERIFICATION_STATUS_OPTIONS.filter((o) => o.value !== '')} placeholder="Verification status" />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Title / deed details" hint="Title No., encumbrances, lease term, etc.">
              <input value={state.titleInfo} onChange={(e) => update({ titleInfo: e.target.value })} placeholder="e.g. Title No. IR 12345, clean title, 99-year lease from 2021" className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Land Use & JV Potential is a dedicated step — see LandWizardUsePotentialStep */}
      </div>
    </SectionCard>
  );
}