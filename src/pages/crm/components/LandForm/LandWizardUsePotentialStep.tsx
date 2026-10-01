import type { LandFormState } from './types';
import { SectionCard, SectionHeader, Field, SelectField, CheckboxPills, ToggleField, inputCls } from './fields';
import {
  PRIMARY_LAND_USE_OPTIONS, SECONDARY_POTENTIAL_USES, SUITABLE_FOR_OPTIONS, DEVELOPMENT_INDICATORS,
} from '@/pages/crm/landConstants';

interface Props { state: LandFormState; update: (p: Partial<LandFormState>) => void; }

export default function LandWizardUsePotentialStep({ state, update }: Props) {
  return (
    <SectionCard>
      <SectionHeader step={7} title="Land Use & Development Potential" subtitle="What the land is zoned for and what the site could become" />
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Primary land use">
            <SelectField
              value={state.primaryLandUse || state.zoning}
              onChange={(v) => update({ primaryLandUse: v, zoning: v })}
              options={PRIMARY_LAND_USE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              placeholder="Primary land use"
            />
          </Field>
          <Field label="Zoning / permitted use" hint="Official zoning and permitted use where confirmed">
            <input value={state.permittedUse} onChange={(e) => update({ permittedUse: e.target.value })} placeholder="e.g. Residential multi-storey, F.A.R. 2.4" className={inputCls} />
          </Field>
        </div>

        <CheckboxPills
          label="Secondary / potential uses"
          options={SECONDARY_POTENTIAL_USES}
          value={state.secondaryPotentialUses}
          onChange={(v) => update({ secondaryPotentialUses: v })}
          placeholder="Select secondary uses"
        />
        <CheckboxPills
          label="Suitable for"
          options={SUITABLE_FOR_OPTIONS}
          value={state.suitableFor}
          onChange={(v) => update({ suitableFor: v })}
          placeholder="Select what it suits"
        />
        <CheckboxPills
          label="Development potential"
          options={DEVELOPMENT_INDICATORS}
          value={state.developmentIndicators}
          onChange={(v) => update({ developmentIndicators: v })}
          placeholder="Select development potential"
        />

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <ToggleField label="Subdivision potential" checked={state.subdivisionPotential} onChange={(v) => update({ subdivisionPotential: v })} />
          <ToggleField label="Agricultural" checked={state.agriculturalPotential} onChange={(v) => update({ agriculturalPotential: v })} />
          <ToggleField label="Commercial" checked={state.commercialPotential} onChange={(v) => update({ commercialPotential: v })} />
          <ToggleField label="Residential" checked={state.residentialPotential} onChange={(v) => update({ residentialPotential: v })} />
        </div>

        <Field label="Development description" hint="What the site could become — kept separate from the base description">
          <textarea value={state.developmentPotential} onChange={(e) => update({ developmentPotential: e.target.value })} rows={3} maxLength={800} placeholder="e.g. Ideal for a 25-unit gated community; flat, serviced and ready for development." className={`${inputCls} resize-none`} />
        </Field>
      </div>
    </SectionCard>
  );
}