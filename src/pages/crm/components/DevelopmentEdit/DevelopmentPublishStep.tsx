import { useState } from 'react';
import { DevelopmentFormState } from './types';
import { formatPrice, generateSlug, DEVELOPMENT_STATUSES } from './types';
import { inputBase, labelClass, SectionHeader, ToggleRow } from './ui';
import SeoStatusBadge from '@/pages/crm/components/SeoStatusBadge';
import SeoSearchPreview from '@/pages/crm/components/SeoSearchPreview';
import AgentAssignmentPanel from '@/pages/crm/components/AgentAssignmentPanel';

interface Props {
  form: DevelopmentFormState;
  update: (patch: Partial<DevelopmentFormState>) => void;
  isEdit: boolean;
  saving: boolean;
  onSave: (publish: boolean) => void;
  agents: { id: string; name: string; title?: string | null }[];
}

function statusLabel(v: string): string {
  return DEVELOPMENT_STATUSES.find((s) => s.value === v)?.label || v;
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-wider text-[#a8b7c9]">{children}</p>;
}
function Value({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-bold text-white mt-0.5">{children}</p>;
}

export default function DevelopmentPublishStep({ form, update, saving, onSave, agents }: Props) {
  const [seoOpen, setSeoOpen] = useState(false);
  const unitCount = form.unitTypes.filter((u) => u.name.trim()).length;
  const seoCustomised = Boolean(form.seoTitle || form.seoDescription);
  const seoEffectiveSlug = form.slug || generateSlug(form.title) || 'new-development';
  const seoEffectiveTitle = form.seoTitle || form.title || 'New Development';
  const seoEffectiveDescription = form.seoDescription || `Explore ${form.title || 'this new development'}${form.location ? ` in ${form.location}` : ''}. View unit types, pricing and availability and contact the developer.`;
  const completion = form.completionStartYear || form.completionEndYear
    ? `${form.completionStartYear || '—'}–${form.completionEndYear || '—'}`
    : 'TBA';

  const prep = (n: string) => (n ? Number(n).toLocaleString() : '—');

  return (
    <div className="w-full space-y-8">
      <SectionHeader icon="ri-file-list-line" title="Review & Publish" subtitle="Confirm the details before going live" />

      {/* Summary */}
      <div className="border border-[#1d3f63] bg-[#001731] p-5 md:p-6">
        <div className="flex items-start gap-4 mb-5">
          {form.mainImage ? (
            <img src={form.mainImage} alt="" className="w-24 h-24 object-cover flex-shrink-0" />
          ) : (
            <div className="w-24 h-24 flex items-center justify-center flex-shrink-0 border border-[#d1d5db] bg-[#f4f6f8]">
              <i className="ri-building-line text-2xl text-[#5a6a7a]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">{form.title || 'Untitled Development'}</h2>
            <p className="text-sm text-[#a8b7c9] mt-0.5">{form.location || form.address || 'No location set'}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold border ${form.isPublished ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {form.isPublished ? 'Published' : 'Draft'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border border-[#1d3f63] text-[#a8b7c9]">
                <i className="ri-building-line" /> {form.propertyType}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border border-[#1d3f63] text-[#a8b7c9]">
                <i className="ri-time-line" /> {statusLabel(form.developmentStatus)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-[#1d3f63]">
          <div><Label>From Price ({form.currency})</Label><Value>{formatPrice(form.price, form.currency)}</Value></div>
          <div><Label>Total Units</Label><Value>{form.totalUnits || '—'}</Value></div>
          <div><Label>Floors</Label><Value>{form.floors || '—'}</Value></div>
          <div><Label>Completion</Label><Value>{completion}</Value></div>
        </div>

        <div className="py-4 border-t border-[#1d3f63]">
          <Label>Unit Types ({unitCount})</Label>
          {form.unitTypes.filter((u) => u.name.trim()).length > 0 ? (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1d3f63] text-left">
                    <th className="py-2 pr-3"><Label>Unit Type</Label></th>
                    <th className="py-2 pr-3"><Label>Size</Label></th>
                    <th className="py-2 pr-3"><Label>Price Range</Label></th>
                    <th className="py-2"><Label>Availability</Label></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {form.unitTypes.filter((u) => u.name.trim()).map((u) => (
                    <tr key={u.id}>
                      <td className="py-2 pr-3">
                        <span className="font-semibold text-white">{u.name}{u.variant ? ` ${u.variant}` : ''}</span>
                        <span className="block text-[11px] text-[#a8b7c9]">{u.bedrooms} {u.bedrooms === 1 ? 'bed' : 'beds'} · {u.bathrooms} bath</span>
                      </td>
                      <td className="py-2 pr-3 text-[#c3cfdd]">{u.sizeMin ? `${prep(u.sizeMin)}–${u.sizeMax ? prep(u.sizeMax) : ''} ${u.sizeUnit}` : '—'}</td>
                      <td className="py-2 pr-3 text-[#c3cfdd]">
                        {u.priceMin ? (u.priceMax ? `${formatPrice(u.priceMin, u.currency)} – ${formatPrice(u.priceMax, u.currency)}` : `From ${formatPrice(u.priceMin, u.currency)}`) : '—'}
                      </td>
                      <td className="py-2 text-[#c3cfdd]">{u.availableUnits ? `${u.availableUnits} available` : 'Available'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[#a8b7c9] mt-1">No unit types added yet.</p>
          )}
        </div>

        {form.amenities.length > 0 && (
          <div className="py-4 border-t border-[#1d3f63] flex flex-wrap gap-1.5">
            {form.amenities.map((a) => <span key={a} className="px-2 py-0.5 text-xs font-bold border border-[#1d3f63] text-[#e2e8f0]">{a}</span>)}
          </div>
        )}

        {form.paymentPlan.depositPercent || form.paymentPlan.installments ? (
          <div className="py-4 border-t border-[#1d3f63] grid grid-cols-2 gap-4">
            <div><Label>Deposit</Label><Value>{form.paymentPlan.depositPercent ? `${form.paymentPlan.depositPercent}%` : '—'}</Value></div>
            <div><Label>Installments</Label><Value>{form.paymentPlan.installments || '—'}</Value></div>
          </div>
        ) : null}

        <div className="py-4 border-t border-[#1d3f63]">
          <Label>Public URL</Label>
          <Value>/{form.slug || generateSlug(form.title) || 'new-development'}</Value>
        </div>

        {/* Source & Continuity summary */}
        <div className="py-4 border-t border-[#1d3f63]">
          <Label>Source / {form.ownerName ? 'Developer / Owner' : 'Source'}</Label>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {form.ownerName ? (
              <Value>
                {form.ownerName}
                {form.sourceContactId && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#d3bb6e]/15 text-[#e6cf87]">
                    <i className="ri-link-m text-[11px]" /> Linked Contact
                  </span>
                )}
              </Value>
            ) : (
              <Value>Not set</Value>
            )}
            {form.sourceName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border border-[#1d3f63] text-[#a8b7c9]">
                <i className="ri-focus-3-line text-[11px]" /> {form.sourceName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Agent Assignment — shared collapsible panel, collapsed by default */}
      <AgentAssignmentPanel
        agents={agents}
        value={form.agentIds}
        onChange={(ids) => update({ agentIds: ids })}
        variant="teal"
      />

      {/* SEO — auto-filled from the development; collapsed by default */}
      <div className="border border-[#d1d5db] bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setSeoOpen((o) => !o)}
          aria-expanded={seoOpen}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#f6f7f9] transition-colors cursor-pointer"
        >
          <div className="w-9 h-9 flex items-center justify-center shrink-0 bg-[#0d1f2d]">
            <i className="ri-search-eye-line text-white text-base" />
          </div>
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-base font-semibold text-[#0d1f2d] tracking-wide">SEO</span>
              <SeoStatusBadge customised={seoCustomised} />
            </span>
            <span className="block text-xs text-[#7a8a99] mt-0.5">Auto-generated from this development — expand to override.</span>
          </span>
          <i className={`ri-arrow-down-s-line text-xl text-[#7a8a99] transition-transform ${seoOpen ? 'rotate-180' : ''}`} />
        </button>
        {seoOpen && (
          <div className="border-t border-[#e8ecf0] p-5 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>SEO Title</label>
                <input
                  type="text"
                  value={form.seoTitle}
                  onChange={(e) => update({ seoTitle: e.target.value })}
                  className={inputBase}
                  placeholder="Auto from name if left blank"
                />
              </div>
              <div>
                <label className={labelClass}>SEO Description</label>
                <input
                  type="text"
                  value={form.seoDescription}
                  onChange={(e) => update({ seoDescription: e.target.value })}
                  className={inputBase}
                  placeholder="Auto from description if left blank"
                />
              </div>
            </div>
            <div className="mt-6">
              <SeoSearchPreview
                slug={seoEffectiveSlug}
                title={seoEffectiveTitle}
                description={seoEffectiveDescription}
                breadcrumb="new-developments"
              />
            </div>
          </div>
        )}
      </div>

      {/* Toogles */}
      <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
        <ToggleRow enabled={form.isFeatured} setEnabled={(v) => update({ isFeatured: v })} label="Featured Development" desc="Highlight this project in the featured carousel" icon="ri-star-line" />
        <ToggleRow enabled={form.isPublished} setEnabled={(v) => update({ isPublished: v })} label="Published" desc="Live on the public new developments page" icon="ri-eye-line" />
      </div>

      {/* Actions */}
      <div className="border border-[#d1d5db] bg-white p-5 md:p-6 space-y-3">
        <button onClick={() => onSave(false)} disabled={saving} className="w-full flex items-center justify-center gap-2 px-5 py-3 border-2 border-[#0d1f2d] text-sm font-bold text-[#0d1f2d] hover:bg-[#f6f7f9] transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap">
          {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />} Save Draft
        </button>
        <button onClick={() => onSave(true)} disabled={saving} className="w-full flex items-center justify-center gap-2 px-5 py-3 text-white text-sm font-bold bg-[#0d5959] hover:bg-[#0a4545] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap">
          {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-send-plane-line" />} {form.isPublished ? 'Update & Publish' : 'Publish Development'}
        </button>
      </div>
    </div>
  );
}