import type { JVFormState } from './types';
import { Field, JvSection, inputCls, labelCls } from './ui';
import SeoStatusBadge from '@/pages/crm/components/SeoStatusBadge';
import SeoSearchPreview from '@/pages/crm/components/SeoSearchPreview';

interface Props {
  state: JVFormState;
  update: (p: Partial<JVFormState>) => void;
}

/* Sections B & C — SEO / desk metadata and the private Internal CRM block.
   These live near the bottom of the form, just before Continuity, so the
   public-facing metadata and private notes sit together at the end. */
export default function JVDeskCrmSteps({ state, update }: Props) {
  const seoCustomised = Boolean(state.seo_title.trim() || state.seo_description.trim());
  const seoEffectiveSlug = state.slug || 'joint-venture';
  const seoEffectiveTitle = state.seo_title || state.title || 'Joint Venture Opportunity';
  const seoEffectiveDescription = state.seo_description || state.public_summary || 'A joint venture land opportunity — explore the structure, terms and location and register your interest.';

  return (
    <>
      {/* SEO & publishing */}
      <JvSection num="B" title="SEO & Desk Options" subtitle="Search metadata and desk extras — publishing itself is handled by the Save Draft / Publish Later / Publish Now buttons" complete={Boolean(state.seo_title.trim() || state.public_summary.trim())} statusBadge={<SeoStatusBadge customised={seoCustomised} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="SEO title">
            <input
              name="seo_title"
              value={state.seo_title}
              onChange={(e) => update({ seo_title: e.target.value })}
              placeholder="e.g. JV Development Land Kiambu Road"
              className={inputCls}
            />
          </Field>
          <Field label="SEO description">
            <input
              name="seo_description"
              value={state.seo_description}
              onChange={(e) => update({ seo_description: e.target.value })}
              placeholder="Short meta description for search"
              className={inputCls}
            />
          </Field>
          <div className="sm:col-span-2 flex flex-wrap gap-x-8 gap-y-3 pt-1">
            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="is_featured"
                checked={state.is_featured}
                onChange={(e) => update({ is_featured: e.target.checked })}
                className="w-[18px] h-[18px] rounded text-[#001731] border-[#cdd5de] focus:ring-[#001731]"
              />
              <span className="text-[16px] font-roboto text-[#001731]">Featured on desk</span>
            </label>
          </div>
        </div>
        <div className="mt-4 p-4 border border-[#e2e7ec] bg-[#f8f9fb] rounded-md flex items-start gap-2.5">
          <i className="ri-lock-line text-[#001731] text-base mt-0.5" />
          <p className="text-[13px] font-roboto text-[#6b7684] leading-relaxed">
            Internal commercial terms — commission, negotiated structure, source &amp; continuity — stay in the CRM and are never read by the public desk unless explicitly marked public.
          </p>
        </div>
        <SeoSearchPreview slug={seoEffectiveSlug} title={seoEffectiveTitle} description={seoEffectiveDescription} breadcrumb="joint-ventures" />
      </JvSection>

      {/* Internal notes */}
      <JvSection num="C" title="Internal CRM" subtitle="Private notes & valuation context for the deal team only" complete={Boolean(state.internal_notes.trim() || state.internal_valuation_note.trim())}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Internal notes">
            <textarea
              name="internal_notes"
              value={state.internal_notes}
              onChange={(e) => update({ internal_notes: e.target.value })}
              rows={4}
              maxLength={1200}
              placeholder="Deal commentary, follow-ups, red flags, negotiation context..."
              className={`${inputCls} resize-none`}
            />
            <p className="text-right text-xs text-[#9aa4b1] font-roboto mt-1">{state.internal_notes.length}/1200</p>
          </Field>
          <Field label="Internal valuation note">
            <textarea
              name="internal_valuation_note"
              value={state.internal_valuation_note}
              onChange={(e) => update({ internal_valuation_note: e.target.value })}
              rows={4}
              maxLength={800}
              placeholder="Internal valuation rationale or range — never shown to the public"
              className={`${inputCls} resize-none`}
            />
            <p className="text-right text-xs text-[#9aa4b1] font-roboto mt-1">{state.internal_valuation_note.length}/800</p>
          </Field>
        </div>
        <div>
          <label className={labelCls}>Detailed base description</label>
          <textarea
            name="description"
            value={state.description}
            onChange={(e) => update({ description: e.target.value })}
            rows={4}
            maxLength={1500}
            placeholder="Full description of the land and the opportunity..."
            className={`${inputCls} resize-none`}
          />
          <p className="text-right text-xs text-[#9aa4b1] font-roboto mt-1">{state.description.length}/1500</p>
        </div>
      </JvSection>
    </>
  );
}