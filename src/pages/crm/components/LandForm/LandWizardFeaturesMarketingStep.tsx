import type { ReactNode } from 'react';
import type { LandFormState } from './types';
import { Field, SectionCard, SectionHeader, SelectField, FlatCheckboxList, CheckboxPills } from './fields';
import {
  LAND_ENVIRONMENT_OPTIONS, WATER_FEATURES, TERRAIN_TOPGRAPHY_OPTIONS, MARKETING_LABELS,
} from '@/pages/crm/landConstants';

interface Props { state: LandFormState; update: (p: Partial<LandFormState>) => void; }

function GroupTitle({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-md bg-[#088135]/10 text-[#088135] flex items-center justify-center flex-shrink-0">
        <i className={`${icon} text-base`} />
      </span>
      <h4 className="font-jost text-base font-semibold text-[#0d1f2d]">{children}</h4>
    </div>
  );
}

export default function LandWizardFeaturesMarketingStep({ state, update }: Props) {
  return (
    <SectionCard>
      <SectionHeader step={5} title="General Features & Marketing" subtitle="The character of the land and how it is marketed" />
      <div className="space-y-8">
        {/* Property / Land Features */}
        <div>
          <GroupTitle icon="ri-parking-box-line">Property / Land Features</GroupTitle>
          <div className="space-y-6 mt-4">
            <FlatCheckboxList
              label="Land Character / Environment"
              hint="Select all that apply"
              options={LAND_ENVIRONMENT_OPTIONS}
              value={state.landEnvironment}
              onChange={(v) => update({ landEnvironment: v })}
            />
            <CheckboxPills
              label="Water & Landscape Features"
              hint="Water bodies, views and land contours"
              options={WATER_FEATURES}
              value={state.waterFeatures}
              onChange={(v) => update({ waterFeatures: v })}
              placeholder="Select water & landscape features"
            />
            <Field label="Topography / soil">
              <SelectField
                value={state.topography}
                onChange={(v) => update({ topography: v })}
                options={TERRAIN_TOPGRAPHY_OPTIONS.map((o) => ({ value: o, label: o }))}
                placeholder="Topography / soil type"
              />
            </Field>
          </div>
        </div>

        <div className="border-t border-[#d6dbe1]" />

        {/* Marketing / Selling Points */}
        <div>
          <GroupTitle icon="ri-megaphone-line">Marketing / Selling Points</GroupTitle>
          <div className="space-y-6 mt-4">
            <CheckboxPills
              label="Marketing labels"
              hint="These are marketing labels, not land classifications"
              options={MARKETING_LABELS}
              value={state.marketingLabels}
              onChange={(v) => update({ marketingLabels: v })}
              placeholder="Select marketing labels"
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}