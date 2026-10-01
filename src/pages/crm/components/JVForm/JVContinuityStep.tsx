import type { JVFormState } from './types';
import { Field, JvSection, inputCls, selectCls } from './ui';
import CoListingAgentsField from '@/pages/crm/components/CoListingAgentsField';
import { CONTINUITY_TYPE_OPTIONS, SOURCE_TYPE_OPTIONS } from '@/pages/crm/jvOpportunityConstants';
import { isCompleteOwner, isCompleteContinuity } from './jvCompletion';

interface Props {
  state: JVFormState;
  update: (p: Partial<JVFormState>) => void;
}

/* Continuity & Source — a soft light-blue, clearly-identifiable INTERNAL /
   PRIVATE CRM block. Merge ownership + private verification here.
   Never auto-published. */
export default function JVContinuityStep({ state, update }: Props) {
  return (
    <JvSection
      num="D"
      title="Continuity & Source — Private"
      subtitle="Ownership, source, continuity and internal verification — CRM only, never on the public listing"
      dark
      defaultOpen
      complete={isCompleteOwner(state) || isCompleteContinuity(state)}
    >
      <div className="space-y-6">
        {/* Ownership — private */}
        <div>
          <p className={`text-[16px] font-roboto font-semibold uppercase tracking-wide mb-3 ${'text-[#001731]'}`}>Ownership</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Owner / partner name">
              <input name="owner_name" value={state.owner_name} onChange={(e) => update({ owner_name: e.target.value })} placeholder="e.g. Grace Wanjiru" className={inputCls} />
            </Field>
            <Field label="Phone / WhatsApp">
              <input type="tel" name="owner_phone" value={state.owner_phone} onChange={(e) => update({ owner_phone: e.target.value })} placeholder="+254 7XX XXX XXX" className={inputCls} />
            </Field>
            <Field label="Email">
              <input type="email" name="owner_email" value={state.owner_email} onChange={(e) => update({ owner_email: e.target.value })} placeholder="owner@email.com" className={inputCls} />
            </Field>
          </div>
        </div>

        <div className="border-t border-[#cfe0f2]" />

        {/* Source */}
        <div>
          <p className="text-[16px] font-roboto font-semibold text-[#001731] uppercase tracking-wide mb-3">Source &amp; Referral</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Source">
              <select name="source" value={state.source} onChange={(e) => update({ source: e.target.value })} className={selectCls}>
                {SOURCE_TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Source detail name">
              <input name="source_detail_name" value={state.source_detail_name} onChange={(e) => update({ source_detail_name: e.target.value })} placeholder="e.g. Facebook group, website, referral" className={inputCls} />
            </Field>
            <Field label="Source contact">
              <input name="source_contact" value={state.source_contact} onChange={(e) => update({ source_contact: e.target.value })} placeholder="Name / phone / email of source" className={inputCls} />
            </Field>
            <Field label="Source company">
              <input name="source_company" value={state.source_company} onChange={(e) => update({ source_company: e.target.value })} placeholder="e.g. ABC Realtors" className={inputCls} />
            </Field>
            <Field label="Source relationship">
              <input name="source_relationship" value={state.source_relationship} onChange={(e) => update({ source_relationship: e.target.value })} placeholder="e.g. Direct owner, trustee, broker" className={inputCls} />
            </Field>
            <Field label="Referral details">
              <input name="referral_details" value={state.referral_details} onChange={(e) => update({ referral_details: e.target.value })} placeholder="Who referred / context" className={inputCls} />
            </Field>
          </div>

          {/* Other agents who also posted this opportunity */}
          <CoListingAgentsField
            value={state.co_listing_agents}
            onChange={(v) => update({ co_listing_agents: v })}
          />
        </div>

        <div className="border-t border-[#cfe0f2]" />

        {/* Continuity */}
        <div>
          <p className="text-[16px] font-roboto font-semibold text-[#001731] uppercase tracking-wide mb-3">Continuity &amp; Relationship</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Continuity">
              <select name="continuity_type" value={state.continuity_type} onChange={(e) => update({ continuity_type: e.target.value })} className={selectCls}>
                {CONTINUITY_TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Relationship owner">
              <input name="relationship_owner" value={state.relationship_owner} onChange={(e) => update({ relationship_owner: e.target.value })} placeholder="e.g. Grace W." className={inputCls} />
            </Field>
            <Field label="Previous listing / reference">
              <input name="previous_reference" value={state.previous_reference} onChange={(e) => update({ previous_reference: e.target.value })} placeholder="e.g. LAND-2023-0042" className={inputCls} />
            </Field>
            <Field label="Previous CRM record">
              <input name="previous_crm_record" value={state.previous_crm_record} onChange={(e) => update({ previous_crm_record: e.target.value })} placeholder="e.g. Contact / Listing ID" className={inputCls} />
            </Field>
            <Field label="Previous agent / source">
              <input name="previous_agent" value={state.previous_agent} onChange={(e) => update({ previous_agent: e.target.value })} placeholder="Who brought the opportunity previously" className={inputCls} />
            </Field>
          </div>
        </div>

        <div className="border-t border-[#cfe0f2]" />

        {/* Internal notes */}
        <div>
          <p className="text-[16px] font-roboto font-semibold text-[#001731] uppercase tracking-wide mb-3">Internal Notes &amp; Verification</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Continuity notes">
              <textarea name="continuity_notes" value={state.continuity_notes} onChange={(e) => update({ continuity_notes: e.target.value })} rows={3} maxLength={800} placeholder="History of the relationship, prior dealings, context..." className={`${inputCls} resize-none`} />
            </Field>
            <Field label="Source notes">
              <textarea name="source_notes" value={state.source_notes} onChange={(e) => update({ source_notes: e.target.value })} rows={3} maxLength={600} placeholder="Notes about the source of this opportunity..." className={`${inputCls} resize-none`} />
            </Field>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 bg-white rounded-md">
          <i className="ri-lock-line text-[#001731] text-base mt-0.5" />
          <p className="text-[13px] font-roboto text-[#001731] leading-relaxed">
            Ownership, contact, source and continuity data stays private in the CRM and is never rendered on the public JV desk.
          </p>
        </div>
      </div>
    </JvSection>
  );
}