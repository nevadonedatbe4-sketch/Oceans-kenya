import { useState } from 'react';
import type { LandFormState } from './types';
import { SectionCard, SectionHeader, Field, inputCls } from './fields';
import LandSourceContinuityCard from './LandSourceContinuityCard';
import SeoStatusBadge from '@/pages/crm/components/SeoStatusBadge';
import SeoSearchPreview from '@/pages/crm/components/SeoSearchPreview';
import AgentAssignmentPanel from '@/pages/crm/components/AgentAssignmentPanel';

interface Props { state: LandFormState; update: (p: Partial<LandFormState>) => void; agents: { id: string; name: string; title?: string | null }[]; }

/* SEO — optional, collapsible panel. Details sit behind a clickable header,
   collapsed by default so the Review & Publish step stays lean. */
function SeoPanel({ state, update }: Props) {
  const [open, setOpen] = useState(false);

  const customised = Boolean(state.seoTitle || state.seoDescription);
  const effectiveTitle = state.seoTitle || state.title || 'Land listing';
  const effectiveDescription = state.seoDescription || state.shortDescription || state.description || 'Development-ready land with services, titled and ready to view.';
  const effectiveSlug = state.slug || 'land-listing';

  return (
    <div className="rounded-xl border border-[#088135]/25 bg-white overflow-hidden flex flex-col h-full">
      {/* Collapsed header — main header with toggle */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#f6f8f9] transition-colors cursor-pointer text-left"
      >
        <div className="w-9 h-9 flex items-center justify-center shrink-0 bg-[#088135] rounded-lg">
          <i className="ri-seo-line text-white text-base" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold text-[#0d1f2d] tracking-wide">SEO</h4>
            <SeoStatusBadge customised={customised} />
          </div>
          <p className="text-[13px] text-[#7a8a99] mt-0.5 truncate">
            {open ? 'Search metadata for the public listing page' : 'Auto-generated from this listing — expand to override.'}
          </p>
        </div>
        <i className={`ri-arrow-down-s-line text-[#233340] text-xl transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 py-5 space-y-4 border-t border-[#088135]/20">
          <Field label="SEO title" hint="Recommended ≤ 60 characters">
            <input value={state.seoTitle} onChange={(e) => update({ seoTitle: e.target.value })} placeholder="e.g. Prime 2-Acre Land, Karen Nairobi" maxLength={90} className={inputCls} />
          </Field>
          <Field label="SEO description" hint="Recommended 120–160 characters">
            <textarea value={state.seoDescription} onChange={(e) => update({ seoDescription: e.target.value })} rows={4} maxLength={200} placeholder="e.g. 2-acre development-ready plot in Karen with all services..." className={`${inputCls} resize-none`} />
          </Field>
          <SeoSearchPreview slug={effectiveSlug} title={effectiveTitle} description={effectiveDescription} breadcrumb="land" />
        </div>
      )}
    </div>
  );
}

export default function LandWizardPublishStep({ state, update, agents }: Props) {
  return (
    <SectionCard>
      <SectionHeader step={9} title="Review & Publish" subtitle="Finalise the listing, verify your SEO, then submit or publish" />

      {/* Agent assignment — collapsible, collapsed by default */}
      <div className="mb-6">
        <AgentAssignmentPanel
          agents={agents}
          value={state.agentIds}
          onChange={(ids) => update({ agentIds: ids })}
          variant="green"
        />
      </div>

      {/* Horizontal strip — Source & Seller Continuity first, then the optional SEO panel.
          Each sits full-width now so the continuity form and SEO get room to breathe. */}
      <div className="grid grid-cols-1 gap-6 items-stretch">
        <LandSourceContinuityCard state={state} update={update} />
        <SeoPanel state={state} update={update} />
      </div>

      <div className="rounded-lg border border-[#088135]/25 bg-[#088135]/5 p-5 space-y-2.5 mt-6">
        <h4 className="font-jost text-[15px] font-semibold text-[#0d1f2d]">Before you publish</h4>
        <ul className="space-y-2">
          <li className="flex items-start gap-2.5 text-[16px] font-roboto text-[#0d1f2d]">
            <i className="ri-checkbox-circle-line text-[#088135] text-lg mt-0.5" />
            <span>Review the summary below — title, offer, price, size and location.</span>
          </li>
          <li className="flex items-start gap-2.5 text-[16px] font-roboto text-[#0d1f2d]">
            <i className="ri-checkbox-circle-line text-[#088135] text-lg mt-0.5" />
            <span>Confirm the address hierarchy and map pin are correct.</span>
          </li>
          <li className="flex items-start gap-2.5 text-[16px] font-roboto text-[#0d1f2d]">
            <i className="ri-checkbox-circle-line text-[#088135] text-lg mt-0.5" />
            <span>Save Draft at any point, or click Publish (admins) / Submit for Approval (agents).</span>
          </li>
        </ul>
      </div>
    </SectionCard>
  );
}