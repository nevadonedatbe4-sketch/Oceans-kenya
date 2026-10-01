import RichTextEditor from '@/components/feature/RichTextEditor';
import type { LandFormState } from './types';
import { Field, SectionCard, SectionHeader, SelectField, inputCls } from './fields';
import {
  LAND_TYPE_OPTIONS, LAND_TYPE_LABELS, OFFER_TYPE_OPTIONS,
  LAND_TYPES_FOR_SALE, LAND_TYPES_FOR_RENT_LEASE, slugifyValue,
} from '@/pages/crm/landConstants';

interface Props { state: LandFormState; update: (p: Partial<LandFormState>) => void; }

/** Offer type drives the land-type options shown, so the form stays short & relevant. */
function landTypesForOffer(offerType: string) {
  const allowed =
    offerType === 'rent' || offerType === 'lease' ? LAND_TYPES_FOR_RENT_LEASE : LAND_TYPES_FOR_SALE;
  return LAND_TYPE_OPTIONS.filter((o) => o.value === '' || allowed.includes(o.value));
}

export default function LandWizardBasicsStep({ state, update }: Props) {
  const landTypes = landTypesForOffer(state.offerType);

  return (
    <SectionCard>
      <SectionHeader step={1} title="Basic Information" subtitle="What is this land, and why does it matter?" />
      <div className="space-y-5">
        <Field label="Listing title" required hint="A short, compelling name — the public slug is generated automatically">
          <input
            value={state.title}
            onChange={(e) => update({ title: e.target.value, slug: state.slugTouched ? state.slug : slugifyValue(e.target.value) })}
            placeholder="e.g. Prime 2-Acre Development Land, Karen"
            className={inputCls}
          />
        </Field>

        <Field label="Full description" hint="What makes this land worthwhile — headings, colours and lists show on the public listing">
          <RichTextEditor
            value={state.description}
            onChange={(html) => update({ description: html })}
            minHeight={180}
            placeholder="Full listing detail — boundaries, access, neighbouring uses..."
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Offer type" required hint={state.offerType === 'rent' || state.offerType === 'lease' ? 'For rent/lease we suggest a narrower set of land categories' : 'Choose what is being offered'}>
            <SelectField
              value={state.offerType}
              onChange={(v) => update({ offerType: v, landType: '' })}
              options={OFFER_TYPE_OPTIONS.filter((o) => o.value !== '')}
              placeholder="Select offer type"
            />
          </Field>
          <Field label="Land type" required hint={state.landType ? `${LAND_TYPE_LABELS[state.landType] || state.landType} selected` : 'Only relevant categories are shown based on offer type'}>
            <SelectField
              value={state.landType}
              onChange={(v) => update({ landType: v })}
              options={landTypes.filter((o) => o.value !== '')}
              placeholder="Select land type"
            />
          </Field>
        </div>
      </div>
    </SectionCard>
  );
}