import type { LandFormState } from './types';
import { Field, SectionCard, SectionHeader, SearchableSelect, inputCls } from './fields';
import LandMapPicker from '@/pages/crm/components/LandMapPicker';

interface Props { state: LandFormState; update: (p: Partial<LandFormState>) => void; }

const KENYAN_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay',
  'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu',
  'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru',
  'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans-Nzoia',
  'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
];

/* Broad → precise geographic hierarchy. The user flows from Country down
   to the exact property address, so nothing is out of order. */
export default function LandWizardLocationStep({ state, update }: Props) {
  return (
    <SectionCard>
      <SectionHeader step={8} title="Location & Full Address" subtitle="From country down to the exact property location" />
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Country">
            <input value={state.country} onChange={(e) => update({ country: e.target.value })} placeholder="e.g. Kenya" className={inputCls} />
          </Field>
          <Field label="Region / State / Province" hint="e.g. Rift Valley, Coast, Nairobi">
            <input value={state.region} onChange={(e) => update({ region: e.target.value })} placeholder="e.g. Nairobi City" className={inputCls} />
          </Field>
          <Field label="County" required>
            <SearchableSelect value={state.county} onChange={(v) => update({ county: v })} options={KENYAN_COUNTIES} placeholder="Select county" />
          </Field>
          <Field label="Sub-County" hint="e.g. Kabete">
            <input value={state.subCounty} onChange={(e) => update({ subCounty: e.target.value })} placeholder="e.g. Kabete" className={inputCls} />
          </Field>
          <Field label="City / Town" hint="e.g. Nairobi">
            <input value={state.city} onChange={(e) => update({ city: e.target.value })} placeholder="e.g. Nairobi" className={inputCls} />
          </Field>
          <Field label="Area / Neighbourhood" hint="e.g. Karen">
            <input value={state.area} onChange={(e) => update({ area: e.target.value })} placeholder="e.g. Karen" className={inputCls} />
          </Field>
          <Field label="Estate / Village / Locality" hint="e.g. Bogani">
            <input value={state.neighbourhood} onChange={(e) => update({ neighbourhood: e.target.value })} placeholder="e.g. Bogani" className={inputCls} />
          </Field>
        </div>

        <Field label="Street / Road" hint="The road the plot fronts, e.g. 2km off Kiambu Road">
          <input value={state.street} onChange={(e) => update({ street: e.target.value })} placeholder="e.g. Kiambu Road, Karen Bogani Road" className={inputCls} />
        </Field>

        <Field label="Full property address" hint="The complete, precise address for the record">
          <input value={state.address} onChange={(e) => update({ address: e.target.value })} placeholder="e.g. Plot 1234, Bogani, Karen, Nairobi" className={inputCls} />
        </Field>

        <Field label="Closest landmark" hint="A well-known reference point, where applicable">
          <input value={state.landmark} onChange={(e) => update({ landmark: e.target.value })} placeholder="e.g. Opposite Karen Country Club" className={inputCls} />
        </Field>

        <div className="border-t border-[#d6dbe1] pt-6">
          <LandMapPicker
            latitude={state.latitude}
            longitude={state.longitude}
            onCoords={(lat, lng) => update({ latitude: lat, longitude: lng })}
            mapPrecision={state.mapPrecision}
            onMapPrecision={(v) => update({ mapPrecision: v })}
            showExact={state.showExact}
            onShowExact={(v) => update({ showExact: v })}
          />
        </div>
      </div>
    </SectionCard>
  );
}