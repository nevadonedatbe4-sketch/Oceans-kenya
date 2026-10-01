import type { JVFormState, LandOption } from './types';
import { Field, JvSection, CheckboxGrid, InheritedChip, inputCls, selectCls } from './ui';
import {
  LAND_TITLE_STATUS_OPTIONS, LAND_PRIMARY_USE_OPTIONS, LAND_SECONDARY_USES,
  LAND_SUITABLE_FOR, LAND_DEVELOPMENT_POTENTIAL, LAND_DEVELOPMENT_CHARACTERISTICS,
  LAND_ROAD_ACCESS_OPTIONS, LAND_WATER_OPTIONS, LAND_ELECTRICITY_OPTIONS,
  LAND_SIZE_UNIT_OPTIONS, LAND_DIM_UNIT_OPTIONS, LAND_PLOT_SHAPE_OPTIONS,
  LAND_TENURE_OPTIONS, LAND_CLASSIFICATION_OPTIONS,
  convertLandSize, formatLandSize,
} from '@/pages/crm/jvOpportunityConstants';

interface Props {
  state: JVFormState;
  update: (p: Partial<JVFormState>) => void;
  landOptions: LandOption[];
  onLinkLand: (id: string) => void;
  linkingLand?: boolean;
  inheritedFields?: Set<string>;
}

export default function JVLandStep({ state, update, landOptions, onLinkLand, linkingLand, inheritedFields }: Props) {
  const inh = (k: string) => inheritedFields?.has(k) ?? false;
  const sizeVal = parseFloat(state.land_size_value);
  const unit = state.land_size_unit || 'acres';
  const equiv: { to: string; val: number | null }[] = [
    { to: 'acres', val: unit === 'acres' ? sizeVal : convertLandSize(sizeVal, unit, 'acres') },
    { to: 'hectares', val: unit === 'hectares' ? sizeVal : convertLandSize(sizeVal, unit, 'hectares') },
    { to: 'sqm', val: unit === 'sqm' ? sizeVal : convertLandSize(sizeVal, unit, 'sqm') },
    { to: 'sqft', val: unit === 'sqft' ? sizeVal : convertLandSize(sizeVal, unit, 'sqft') },
  ];

  const isLinked = state.land_record_mode === 'link';

  return (
    <>
      {/* Land Record + Property Details */}
      <JvSection
        num="1"
        title="Land & Property Details"
        subtitle="Reference or enter the land — size, dimensions, tenure and physical profile"
        required
        complete={Boolean(state.land_listing_id) || (state.land_record_mode === 'manual' && Boolean((state.land_size_value || state.land_size) && (state.land_location || state.land_county)))}
      >
        {/* Land record mode — link existing vs manual */}
        <Field label="Land Record" hint="Link an existing Land CRM record, or enter the land details directly. You do not have to register land first.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { value: 'link', label: 'Link Existing Land Record', icon: 'ri-link-m' },
              { value: 'manual', label: 'Enter Land Details Manually', icon: 'ri-edit-line' },
            ].map((mode) => {
              const active = state.land_record_mode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => update({ land_record_mode: mode.value })}
                  className={`flex items-center gap-3 px-4 py-3 border rounded-none text-left transition-all cursor-pointer ${
                    active ? 'border-[#001731] bg-[#001731]/5 text-[#001731]' : 'border-[#cdd5de] bg-white text-[#001731] hover:border-[#001731]/40'
                  }`}
                >
                  <i className={mode.icon} />
                  <span className="text-[16px] font-roboto font-semibold flex-1">{mode.label}</span>
                  <i className={active ? 'ri-radio-button-fill' : 'ri-radio-button-line'} />
                </button>
              );
            })}
          </div>
        </Field>

        {/* Linked record picker — highlighted "add/link" panel so it stands out */}
        {isLinked && (
          <div className="space-y-3">
            <div className="border border-[#001731]/25 border-l-4 border-l-[#001731] bg-[#eef3fa] rounded-md p-4 sm:p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="w-9 h-9 flex items-center justify-center rounded-full bg-[#001731] text-white flex-shrink-0">
                  <i className="ri-add-line text-xl" />
                </span>
                <div className="min-w-0">
                  <p className="text-[16px] font-roboto font-bold text-[#001731] leading-tight">Link to land listing</p>
                  <p className="text-[14px] font-roboto text-[#5a6b80] mt-0.5 leading-relaxed">Choose a record to pull its details into the fields below. The land record is only read — saving this JV listing never changes it.</p>
                </div>
              </div>
              <select
                name="land_listing_id"
                value={state.land_listing_id}
                onChange={(e) => onLinkLand(e.target.value)}
                className={selectCls}
              >
                <option value="">No linked land listing</option>
                {landOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title || 'Untitled Land'}{l.location ? ` — ${l.location}` : ''}{l.state_region ? `, ${l.state_region}` : ''}
                  </option>
                ))}
              </select>
            </div>
            {linkingLand && (
              <p className="text-[14px] font-roboto text-[#001731]">
                <i className="ri-loader-4-line animate-spin mr-1" />Pulling details from the linked land record…
              </p>
            )}
            {!linkingLand && state.land_listing_id && inheritedFields && inheritedFields.size > 0 && (
              <div className="flex items-start gap-2.5 p-3.5 border border-[#cdeadd] bg-[#f1faf5] rounded-md">
                <i className="ri-download-2-line text-[#088135] text-base mt-0.5" />
                <p className="text-[14px] font-roboto text-[#0b5d2e] leading-relaxed">
                  Details below were prefilled from the linked land listing — review them and edit anything specific to this JV arrangement. Fields marked <InheritedChip show /> came from the land record.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Land details — always shown. In link mode these are prefilled from the
            linked land record and remain fully editable. */}
        <div className="space-y-6">
          {/* Land size + unit + auto conversions */}
          <div>
            <p className="text-[16px] font-roboto font-bold text-[#001731] uppercase tracking-wide mb-3">Property Details — Land Size</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Land size" hint="Supports decimals (e.g. 0.25, 1.75, 12.5)" inherited={inh('land_size_value')}>
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="land_size_value"
                  value={state.land_size_value}
                  onChange={(e) => update({ land_size_value: e.target.value })}
                  placeholder="e.g. 2.5"
                  className={inputCls}
                />
              </Field>
              <Field label="Unit" inherited={inh('land_size_unit')}>
                <select
                  name="land_size_unit"
                  value={state.land_size_unit}
                  onChange={(e) => update({ land_size_unit: e.target.value })}
                  className={selectCls}
                >
                  {LAND_SIZE_UNIT_OPTIONS.filter((o) => o.value !== '').map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            {sizeVal > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {equiv.filter((e) => e.val !== null && e.to !== unit).map((e) => (
                  <span key={e.to} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#001731]/5 text-[#001731] text-[14px] font-roboto font-medium">
                    <i className="ri-arrow-right-s-line" />≈ {formatLandSize(e.val as number, e.to)}
                  </span>
                ))}
              </div>
            )}
            {state.land_size && (
              <Field label="Free-text size" hint="Only if you prefer to describe size differently (e.g. '1.75 acres')." inherited={inh('land_size')}>
                <input
                  name="land_size"
                  value={state.land_size}
                  onChange={(e) => update({ land_size: e.target.value })}
                  placeholder="e.g. 8 acres"
                  className={inputCls}
                />
              </Field>
            )}
          </div>

          {/* Plot dimensions (optional) */}
          <div className="border-t border-[#e2e7ec] pt-5">
            <p className="text-[16px] font-roboto font-bold text-[#001731] uppercase tracking-wide mb-3">Plot Dimensions (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="Plot length" inherited={inh('plot_length')}>
                <input type="number" step="any" min="0" name="plot_length" value={state.plot_length} onChange={(e) => update({ plot_length: e.target.value })} placeholder="e.g. 50" className={inputCls} />
              </Field>
              <Field label="Plot width" inherited={inh('plot_width')}>
                <input type="number" step="any" min="0" name="plot_width" value={state.plot_width} onChange={(e) => update({ plot_width: e.target.value })} placeholder="e.g. 100" className={inputCls} />
              </Field>
              <Field label="Dimension unit" inherited={inh('plot_dim_unit')}>
                <select name="plot_dim_unit" value={state.plot_dim_unit} onChange={(e) => update({ plot_dim_unit: e.target.value })} className={selectCls}>
                  {LAND_DIM_UNIT_OPTIONS.filter((o) => o.value !== '').map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Plot shape" inherited={inh('plot_shape')}>
                <select name="plot_shape" value={state.plot_shape} onChange={(e) => update({ plot_shape: e.target.value })} className={selectCls}>
                  {LAND_PLOT_SHAPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            {state.plot_length && state.plot_width && (
              <p className="text-[14px] font-roboto text-[#001731] mt-2.5">
                <i className="ri-ruler-2-line" /> {state.plot_length} × {state.plot_width} {state.plot_dim_unit || 'ft'}
              </p>
            )}
          </div>

          {/* Tenure & characteristics */}
          <div className="border-t border-[#e2e7ec] pt-5">
            <p className="text-[16px] font-roboto font-bold text-[#001731] uppercase tracking-wide mb-3">Land Tenure & Character</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Land tenure" inherited={inh('land_tenure')}>
                <select name="land_tenure" value={state.land_tenure} onChange={(e) => update({ land_tenure: e.target.value })} className={selectCls}>
                  {LAND_TENURE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ownership classification" inherited={inh('land_classification')}>
                <select name="land_classification" value={state.land_classification} onChange={(e) => update({ land_classification: e.target.value })} className={selectCls}>
                  {LAND_CLASSIFICATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Title status" inherited={inh('land_title_status')}>
                <select name="land_title_status" value={state.land_title_status} onChange={(e) => update({ land_title_status: e.target.value })} className={selectCls}>
                  {LAND_TITLE_STATUS_OPTIONS.filter((o) => o.value !== '').map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Manual land description">
                <input
                  name="manual_land_description"
                  value={state.manual_land_description}
                  onChange={(e) => update({ manual_land_description: e.target.value })}
                  placeholder="Boundaries, current use, survey notes..."
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Location — separate from the measurements, placed LAST */}
        <div className={`${isLinked ? '' : 'mt-6 pt-5 border-t border-[#e2e7ec]'} space-y-4`}>
          <p className="text-[16px] font-roboto font-bold text-[#001731] uppercase tracking-wide">Location</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Location" required inherited={inh('land_location')}>
              <input name="land_location" value={state.land_location} onChange={(e) => update({ land_location: e.target.value })} placeholder="e.g. Kiambu Road, Nairobi" className={inputCls} />
            </Field>
            <Field label="County / region" required inherited={inh('land_county')}>
              <input name="land_county" value={state.land_county} onChange={(e) => update({ land_county: e.target.value })} placeholder="e.g. Kiambu" className={inputCls} />
            </Field>
            <Field label="Area / neighbourhood" inherited={inh('land_area')}>
              <input name="land_area" value={state.land_area} onChange={(e) => update({ land_area: e.target.value })} placeholder="e.g. Ruiru, Karen" className={inputCls} />
            </Field>
          </div>
        </div>
      </JvSection>

      {/* Access / Infrastructure */}
      <JvSection
        num="2"
        title="Access, Infrastructure & Due Diligence"
        subtitle="Road access and services on the site"
        complete={Boolean(state.land_road_access) || state.land_water.length > 0 || state.land_electricity.length > 0}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Road access" inherited={inh('land_road_access')}>
            <select name="land_road_access" value={state.land_road_access} onChange={(e) => update({ land_road_access: e.target.value })} className={selectCls}>
              <option value="">Select road access</option>
              {LAND_ROAD_ACCESS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </div>
        <CheckboxGrid label="Water supply" inherited={inh('land_water')} options={LAND_WATER_OPTIONS} value={state.land_water} onChange={(v) => update({ land_water: v })} cols={2} />
        <CheckboxGrid label="Electricity" inherited={inh('land_electricity')} options={LAND_ELECTRICITY_OPTIONS} value={state.land_electricity} onChange={(v) => update({ land_electricity: v })} cols={2} />
      </JvSection>

      {/* Land Use & Development Potential */}
      <JvSection
        num="3"
        title="Land Use & Development Potential"
        subtitle="What the land is zoned for and what the site could become"
        complete={Boolean(state.land_primary_use) || state.land_secondary_uses.length > 0 || state.land_development_potential.length > 0}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Primary land use" inherited={inh('land_primary_use')}>
              <select name="land_primary_use" value={state.land_primary_use} onChange={(e) => update({ land_primary_use: e.target.value })} className={selectCls}>
                {LAND_PRIMARY_USE_OPTIONS.filter((o) => o.value !== '').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Zoning / permitted use" hint="Official zoning and permitted use where confirmed." inherited={inh('land_zoning')}>
              <input name="land_zoning" value={state.land_zoning} onChange={(e) => update({ land_zoning: e.target.value })} placeholder="e.g. Residential multi-storey, F.A.R. 2.4" className={inputCls} />
            </Field>
          </div>
          <CheckboxGrid label="Secondary / potential uses" inherited={inh('land_secondary_uses')} options={LAND_SECONDARY_USES} value={state.land_secondary_uses} onChange={(v) => update({ land_secondary_uses: v })} />
          <CheckboxGrid label="Suitable for" inherited={inh('land_suitable_for')} options={LAND_SUITABLE_FOR} value={state.land_suitable_for} onChange={(v) => update({ land_suitable_for: v })} />
          <CheckboxGrid label="Development potential" inherited={inh('land_development_potential')} options={LAND_DEVELOPMENT_POTENTIAL} value={state.land_development_potential} onChange={(v) => update({ land_development_potential: v })} />
          <CheckboxGrid label="Development characteristics" hint="Stored independently from the other development-potential selections." options={LAND_DEVELOPMENT_CHARACTERISTICS} value={state.land_development_characteristics} onChange={(v) => update({ land_development_characteristics: v })} cols={2} />
          <Field label="Development description" hint="What the site could become — kept separate from the base description." inherited={inh('land_development_description')}>
            <textarea name="land_development_description" value={state.land_development_description} onChange={(e) => update({ land_development_description: e.target.value })} rows={3} maxLength={800} placeholder="e.g. Ideal for a 25-unit gated community; flat, serviced and ready for development." className={`${inputCls} resize-none`} />
          </Field>
        </div>
      </JvSection>
    </>
  );
}