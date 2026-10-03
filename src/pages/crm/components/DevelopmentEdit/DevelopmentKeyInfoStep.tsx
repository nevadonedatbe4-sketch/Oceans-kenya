import { DevelopmentFormState } from './types';
import { inputBase, labelClass, hintClass, SectionHeader, CollapsibleCard } from './ui';

interface Props {
  form: DevelopmentFormState;
  update: (patch: Partial<DevelopmentFormState>) => void;
}

/**
 * Project-level "Key information" & "Utilities" for a development.
 *
 * These are the exact rows shown in the public development page's Key
 * information / Utilities & more details blocks. Every value is stored on the
 * `developments` record itself, so the public page reads straight from the CRM
 * DB - a field left blank shows the honest "Ask agent" fallback.
 */
export default function DevelopmentKeyInfoStep({ form, update }: Props) {
  return (
    <div className="w-full space-y-5">
      <SectionHeader
        icon="ri-file-list-3-line"
        title="Key Information & Utilities"
        subtitle="Ownership, costs and services for the whole development — shown on the public project page"
      />

      <CollapsibleCard icon="ri-key-2-line" title="Ownership & Key Information" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <div>
            <label className={labelClass}>Tenure</label>
            <input
              type="text"
              value={form.tenure}
              onChange={(e) => update({ tenure: e.target.value })}
              className={inputBase}
              placeholder="e.g. Freehold, Leasehold, Share of Freehold"
            />
          </div>
          <div>
            <label className={labelClass}>Service Charge (per year)</label>
            <input
              type="number"
              value={form.serviceCharge}
              onChange={(e) => update({ serviceCharge: e.target.value })}
              className={inputBase}
              placeholder={`e.g. 120000 (${form.currency})`}
            />
          </div>
          <div>
            <label className={labelClass}>Council Tax Band</label>
            <input
              type="text"
              value={form.councilTaxBand}
              onChange={(e) => update({ councilTaxBand: e.target.value })}
              className={inputBase}
              placeholder="e.g. Band D"
            />
          </div>
          <div>
            <label className={labelClass}>Ground Rent</label>
            <input
              type="text"
              value={form.groundRent}
              onChange={(e) => update({ groundRent: e.target.value })}
              className={inputBase}
              placeholder="e.g. 25,000 per year"
            />
          </div>
          <div>
            <label className={labelClass}>Ground Rent Review</label>
            <input
              type="text"
              value={form.groundRentReview}
              onChange={(e) => update({ groundRentReview: e.target.value })}
              className={inputBase}
              placeholder="e.g. Every 10 years / RPI-linked"
            />
          </div>
          <div>
            <label className={labelClass}>Lease Length</label>
            <input
              type="text"
              value={form.leaseLength}
              onChange={(e) => update({ leaseLength: e.target.value })}
              className={inputBase}
              placeholder="e.g. 99 years from 2024"
            />
          </div>
        </div>
        <p className={hintClass}>
          Leave a field blank to display “Ask agent” on the public page — we never guess ownership or cost details.
        </p>
      </CollapsibleCard>

      <CollapsibleCard icon="ri-plug-line" title="Utilities & Services" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
          <div>
            <label className={labelClass}>Water</label>
            <input
              type="text"
              value={form.waterSupply}
              onChange={(e) => update({ waterSupply: e.target.value })}
              className={inputBase}
              placeholder="e.g. Mains / Borehole"
            />
          </div>
          <div>
            <label className={labelClass}>Electricity</label>
            <input
              type="text"
              value={form.electricity}
              onChange={(e) => update({ electricity: e.target.value })}
              className={inputBase}
              placeholder="e.g. Mains / Solar backup"
            />
          </div>
          <div>
            <label className={labelClass}>Heating</label>
            <input
              type="text"
              value={form.heating}
              onChange={(e) => update({ heating: e.target.value })}
              className={inputBase}
              placeholder="e.g. Central / Split units"
            />
          </div>
          <div>
            <label className={labelClass}>Sewerage</label>
            <input
              type="text"
              value={form.sewerage}
              onChange={(e) => update({ sewerage: e.target.value })}
              className={inputBase}
              placeholder="e.g. Mains sewer / Septic"
            />
          </div>
          <div>
            <label className={labelClass}>Broadband</label>
            <input
              type="text"
              value={form.broadband}
              onChange={(e) => update({ broadband: e.target.value })}
              className={inputBase}
              placeholder="e.g. Fibre available"
            />
          </div>
          <div>
            <label className={labelClass}>Broadband Speed</label>
            <input
              type="text"
              value={form.broadbandSpeed}
              onChange={(e) => update({ broadbandSpeed: e.target.value })}
              className={inputBase}
              placeholder="e.g. Up to 100 Mbps"
            />
          </div>
          <div>
            <label className={labelClass}>Mobile Coverage</label>
            <input
              type="text"
              value={form.mobileCoverage}
              onChange={(e) => update({ mobileCoverage: e.target.value })}
              className={inputBase}
              placeholder="e.g. Good / 4G & 5G"
            />
          </div>
          <div>
            <label className={labelClass}>Parking</label>
            <input
              type="text"
              value={form.parkingNotes}
              onChange={(e) => update({ parkingNotes: e.target.value })}
              className={inputBase}
              placeholder="e.g. Secure basement parking, 1 bay per unit"
            />
          </div>
        </div>
        <p className={hintClass}>
          These details appear in the “Utilities &amp; more details” block. Blank rows will show “Ask agent”.
        </p>
      </CollapsibleCard>
    </div>
  );
}