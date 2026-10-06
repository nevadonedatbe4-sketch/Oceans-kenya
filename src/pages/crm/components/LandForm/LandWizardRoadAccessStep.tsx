import type { LandFormState } from './types';
import { Field, SectionCard, SectionHeader, SelectField, MultiSelectCheckbox, FlatCheckboxList } from './fields';
import {
  ROAD_ACCESS_OPTIONS, ROAD_FRONTAGE_OPTIONS, ACCESSIBILITY_OPTIONS,
  WATER_SUPPLY_OPTIONS, ELECTRICITY_OPTIONS, SEWERAGE_OPTIONS, CONNECTIVITY_OPTIONS,
} from '@/pages/crm/landConstants';

interface Props { state: LandFormState; update: (p: Partial<LandFormState>) => void; }

export default function LandWizardRoadAccessStep({ state, update }: Props) {
  return (
    <SectionCard>
      <SectionHeader step={6} title="Road Access & Infrastructure" subtitle="How do you get to it, and what services reach the site?" />
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Road access">
            <SelectField
              value={state.roadAccess}
              onChange={(v) => update({ roadAccess: v })}
              options={ROAD_ACCESS_OPTIONS.filter((o) => o.value !== '')}
              placeholder="Road access"
            />
          </Field>
          <Field label="Road frontage">
            <MultiSelectCheckbox
              label=""
              options={ROAD_FRONTAGE_OPTIONS}
              value={state.roadFrontage}
              onChange={(v) => update({ roadFrontage: v })}
              placeholder="Select frontage"
            />
          </Field>
        </div>

        <MultiSelectCheckbox
          label="Accessibility"
          options={ACCESSIBILITY_OPTIONS}
          value={state.accessibility}
          onChange={(v) => update({ accessibility: v })}
          placeholder="Select accessibility"
        />

        <FlatCheckboxList
          label="Water"
          options={WATER_SUPPLY_OPTIONS}
          value={state.waterSupply}
          onChange={(v) => update({ waterSupply: v })}
        />
        <FlatCheckboxList
          label="Electricity"
          options={ELECTRICITY_OPTIONS}
          value={state.electricity}
          onChange={(v) => update({ electricity: v })}
        />
        <FlatCheckboxList
          label="Connectivity"
          options={CONNECTIVITY_OPTIONS}
          value={state.connectivity}
          onChange={(v) => update({ connectivity: v })}
        />
        <FlatCheckboxList
          label="Sewage"
          options={SEWERAGE_OPTIONS}
          value={state.sewerage}
          onChange={(v) => update({ sewerage: v })}
        />
      </div>
    </SectionCard>
  );
}