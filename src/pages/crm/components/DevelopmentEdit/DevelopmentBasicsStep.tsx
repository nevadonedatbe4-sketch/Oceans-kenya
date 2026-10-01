import RichTextEditor from '@/components/feature/RichTextEditor';
import {
  DevelopmentFormState,
  PROPERTY_TYPE_OPTIONS,
  DEVELOPMENT_STATUSES,
} from './types';
import { inputBase, selectClass, labelClass, hintClass, SectionHeader, CollapsibleCard, CounterBox } from './ui';

interface Props {
  form: DevelopmentFormState;
  update: (patch: Partial<DevelopmentFormState>) => void;
}

export default function DevelopmentBasicsStep({ form, update }: Props) {
  return (
    <div className="w-full space-y-5">
      <SectionHeader icon="ri-building-2-line" title="Development Overview" subtitle="Name, location and developer details" />

      <CollapsibleCard icon="ri-edit-2-line" title="Identity" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>Development Name *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update({ title: e.target.value, slug: form.slug || '' })}
              className={inputBase}
              placeholder="e.g. Riverside Azure"
            />
          </div>
          <div>
            <label className={labelClass}>Property Type</label>
            <select
              value={form.propertyType}
              onChange={(e) => update({ propertyType: e.target.value })}
              className={selectClass}
            >
              {PROPERTY_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Development Status</label>
            <select
              value={form.developmentStatus}
              onChange={(e) => update({ developmentStatus: e.target.value })}
              className={selectClass}
            >
              {DEVELOPMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard icon="ri-map-pin-2-line" title="Location" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>Area / Location *</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => update({ location: e.target.value })}
              className={inputBase}
              placeholder="e.g. Riverside Drive, Westlands"
            />
          </div>
          <div>
            <label className={labelClass}>Neighbourhood</label>
            <input
              type="text"
              value={form.neighbourhood}
              onChange={(e) => update({ neighbourhood: e.target.value })}
              className={inputBase}
              placeholder="e.g. Westlands"
            />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => update({ address: e.target.value })}
              className={inputBase}
              placeholder="Street address"
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => update({ city: e.target.value })}
              className={inputBase}
              placeholder="e.g. Nairobi"
            />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => update({ country: e.target.value })}
              className={inputBase}
            />
          </div>
          <div>
            <label className={labelClass}>Latitude</label>
            <input
              type="text"
              value={form.latitude}
              onChange={(e) => update({ latitude: e.target.value })}
              className={inputBase}
              placeholder="-1.2800"
            />
          </div>
          <div>
            <label className={labelClass}>Longitude</label>
            <input
              type="text"
              value={form.longitude}
              onChange={(e) => update({ longitude: e.target.value })}
              className={inputBase}
              placeholder="36.8200"
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard icon="ri-user-3-line" title="Developer" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>Developer Name</label>
            <input
              type="text"
              value={form.developerName}
              onChange={(e) => update({ developerName: e.target.value })}
              className={inputBase}
              placeholder="e.g. Azure Development Ltd"
            />
            <p className={hintClass}>Shown publicly only when the "Show developer name" marketing toggle is on. Contact details are stored privately in the Internal step.</p>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard icon="ri-building-3-line" title="Build Details" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <CounterBox
            label="Floors"
            value={form.floors}
            onDec={() => update({ floors: Math.max(0, form.floors - 1) })}
            onInc={() => update({ floors: form.floors + 1 })}
          />
          <CounterBox
            label="Total Units"
            value={form.totalUnits}
            onDec={() => update({ totalUnits: Math.max(0, form.totalUnits - 1) })}
            onInc={() => update({ totalUnits: form.totalUnits + 1 })}
          />
          <div>
            <label className={labelClass}>Completion Start Year</label>
            <input
              type="number"
              value={form.completionStartYear}
              onChange={(e) => update({ completionStartYear: e.target.value })}
              className={inputBase}
              placeholder="e.g. 2028"
            />
          </div>
          <div>
            <label className={labelClass}>Completion End Year</label>
            <input
              type="number"
              value={form.completionEndYear}
              onChange={(e) => update({ completionEndYear: e.target.value })}
              className={inputBase}
              placeholder="e.g. 2029"
            />
          </div>
        </div>
        <p className={hintClass}>Leave blank to plan as off-plan, or use both years for a delivery window (e.g. 2028–2029).</p>
      </CollapsibleCard>

      <CollapsibleCard icon="ri-file-text-line" title="Description" defaultOpen={false}>
        <div className="pt-3">
          <label className={labelClass}>Development Description</label>
          <RichTextEditor
            value={form.description}
            onChange={(html) => update({ description: html })}
            minHeight={200}
            placeholder="Describe the development, its concept, location advantages and standout features…"
          />
        </div>
      </CollapsibleCard>
    </div>
  );
}