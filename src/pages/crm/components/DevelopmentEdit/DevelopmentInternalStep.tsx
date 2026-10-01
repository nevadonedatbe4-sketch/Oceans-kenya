import { useState } from 'react';
import {
  DevelopmentFormState,
  DeveloperProject,
  CONTACT_ROLES,
  makeDeveloperProject,
} from './types';
import { inputBase, selectClass, labelClass, hintClass, SectionHeader, CollapsibleCard } from './ui';
import CoListingAgentsField from '@/pages/crm/components/CoListingAgentsField';
import { describeCoListingAgents } from '@/pages/crm/components/coListingAgents';

const textareaClass = `${inputBase} min-h-[96px] resize-y leading-relaxed`;

const ROLE_LABELS: Record<string, string> = Object.fromEntries(CONTACT_ROLES.map((r) => [r.value, r.label]));

function formatContinuityDate(v: string): string {
  if (!v) return '';
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props {
  form: DevelopmentFormState;
  update: (patch: Partial<DevelopmentFormState>) => void;
}

/**
 * Internal continuity — agency-only. Reuses the listing form's
 * "Source & Contact (Private)" block so team members keep every contact
 * reachable without leaking these details to the public site.
 */
export default function DevelopmentInternalStep({ form, update }: Props) {
  const [open, setOpen] = useState(true);

  // Internal continuity — held in a local draft so nothing persists until Save
  const [saved, setSaved] = useState<boolean>(() =>
    Boolean(
      form.sourceName || form.sourceUrl || form.sourcePoster || form.dateSourced ||
      form.ownerName || form.ownerPhone || form.ownerEmail ||
      form.developerName || form.developerPhone || form.developerEmail ||
      form.caretakerName || form.caretakerPhone || form.sourceNotes ||
      form.commissionTracking || form.availabilityReality ||
      form.developerProjects.length || form.coListingAgents.length
    )
  );
  const [draft, setDraft] = useState(() => ({
    sourceName: form.sourceName,
    sourceUrl: form.sourceUrl,
    sourcePoster: form.sourcePoster,
    dateSourced: form.dateSourced,
    ownerRole: form.ownerRole,
    ownerName: form.ownerName,
    ownerPhone: form.ownerPhone,
    ownerEmail: form.ownerEmail,
    developerName: form.developerName,
    developerPhone: form.developerPhone,
    developerEmail: form.developerEmail,
    caretakerRole: form.caretakerRole,
    caretakerName: form.caretakerName,
    caretakerPhone: form.caretakerPhone,
    commissionTracking: form.commissionTracking,
    availabilityReality: form.availabilityReality,
    sourceNotes: form.sourceNotes,
    coListingAgents: form.coListingAgents,
  }));
  const setD = (patch: Partial<typeof draft>) => setDraft((p) => ({ ...p, ...patch }));

  const handleSave = () => {
    update({ ...draft });
    setSaved(true);
    setOpen(false);
  };

  const handleEdit = () => {
    setDraft({
      sourceName: form.sourceName,
      sourceUrl: form.sourceUrl,
      sourcePoster: form.sourcePoster,
      dateSourced: form.dateSourced,
      ownerRole: form.ownerRole,
      ownerName: form.ownerName,
      ownerPhone: form.ownerPhone,
      ownerEmail: form.ownerEmail,
      developerName: form.developerName,
      developerPhone: form.developerPhone,
      developerEmail: form.developerEmail,
      caretakerRole: form.caretakerRole,
      caretakerName: form.caretakerName,
      caretakerPhone: form.caretakerPhone,
      commissionTracking: form.commissionTracking,
      availabilityReality: form.availabilityReality,
      sourceNotes: form.sourceNotes,
      coListingAgents: form.coListingAgents,
    });
    setSaved(false);
    setOpen(true);
  };

  const summaryItems = [
    { label: 'Source', value: form.sourceName },
    { label: 'Source Link', value: form.sourceUrl },
    { label: 'Original Poster', value: form.sourcePoster },
    { label: 'Date Sourced', value: formatContinuityDate(form.dateSourced) },
    { label: 'Other Agents', value: describeCoListingAgents(form.coListingAgents) },
    { label: 'Owner Role', value: ROLE_LABELS[form.ownerRole] },
    { label: 'Owner', value: form.ownerName },
    { label: 'Owner Phone', value: form.ownerPhone },
    { label: 'Owner Email', value: form.ownerEmail },
    { label: 'Developer', value: form.developerName },
    { label: 'Developer Phone', value: form.developerPhone },
    { label: 'Developer Email', value: form.developerEmail },
    { label: 'Caretaker Role', value: ROLE_LABELS[form.caretakerRole] },
    { label: 'Caretaker', value: form.caretakerName },
    { label: 'Caretaker Phone', value: form.caretakerPhone },
    { label: 'Commission', value: form.commissionTracking },
    { label: 'Availability', value: form.availabilityReality },
    { label: 'Projects', value: form.developerProjects.length ? `${form.developerProjects.length} project${form.developerProjects.length > 1 ? 's' : ''}` : '' },
    { label: 'Notes', value: form.sourceNotes },
  ].filter((i) => i.value && String(i.value).trim());

  const setProjects = (projects: DeveloperProject[]) =>
    update({ developerProjects: projects });

  const addProject = () =>
    setProjects([...form.developerProjects, makeDeveloperProject()]);

  const updateProject = (id: string, field: keyof DeveloperProject, value: string) =>
    setProjects(form.developerProjects.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const removeProject = (id: string) =>
    setProjects(form.developerProjects.filter((p) => p.id !== id));

  return (
    <div className="w-full space-y-5">
      <SectionHeader
        icon="ri-shield-keyhole-line"
        title="Internal Continuity (Agency Only)"
        subtitle="Owner, caretaker, developer & source contact — visible to your team only, never shown on the public site"
      />

      <div className="border border-[#088135]/40 bg-[#e6f4ea] overflow-hidden rounded-xl">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-6 py-5 hover:bg-[#dff1e5] transition-colors cursor-pointer text-left"
        >
          <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg bg-[#088135]/15">
            <i className="ri-shield-keyhole-line text-sm text-[#088135]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-[#088135] uppercase tracking-widest">Private contact & notes</p>
            <p className="text-[12px] text-[#7a8a99] mt-0.5 leading-relaxed">
              Agents leave, numbers change — this keeps every development contactable. Only logged-in team members ever see this.
            </p>
          </div>
          {saved && !open && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#088135] bg-[#088135]/10 border border-[#088135]/25 px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
              <i className="ri-check-line text-xs" /> Saved
            </span>
          )}
          <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-lg bg-white text-[#065a27]">
            <i className={`${open ? 'ri-arrow-up-wide-fill' : 'ri-arrow-down-wide-fill'} text-lg`} />
          </div>
        </button>

        {open && (
          <div className="px-6 py-6">
            {saved ? (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <i className="ri-checkbox-circle-line text-[#088135] text-base" />
                <p className="text-[16px] font-bold text-[#088135] uppercase tracking-widest">Internal Continuity</p>
              </div>
              {summaryItems.length === 0 ? (
                <p className="text-[13px] text-[#7a8a99] leading-relaxed">No continuity details saved yet.</p>
              ) : (
                <div className="rounded-lg border border-[#088135]/25 bg-white divide-y divide-[#eef5f0]">
                  {summaryItems.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-4 px-4 py-3">
                      <span className="text-[12px] font-semibold text-[#7a8a99] uppercase tracking-wide shrink-0">{item.label}</span>
                      <span className="text-[13px] font-medium text-[#0d1f2d] text-right break-words whitespace-nowrap">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={handleEdit}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#088135] hover:bg-[#065a27] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-edit-line text-base" /> Edit continuity
              </button>
            </div>
            ) : (
            <div>
            {/* Source */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className={labelClass}>Source Name</label>
                <input
                  type="text"
                  value={draft.sourceName}
                  onChange={(e) => setD({ sourceName: e.target.value })}
                  placeholder="e.g. Facebook group, website, referral"
                  className={inputBase}
                />
              </div>
              <div>
                <label className={labelClass}>Source Link</label>
                <input
                  type="url"
                  value={draft.sourceUrl}
                  onChange={(e) => setD({ sourceUrl: e.target.value })}
                  placeholder="https://facebook.com/groups/…"
                  className={inputBase}
                />
              </div>
              <div>
                <label className={labelClass}>Original Poster</label>
                <input
                  type="text"
                  value={draft.sourcePoster}
                  onChange={(e) => setD({ sourcePoster: e.target.value })}
                  placeholder="Name of the person who listed it"
                  className={inputBase}
                />
              </div>
              <div>
                <label className={labelClass}>Date Sourced</label>
                <input
                  type="date"
                  value={draft.dateSourced}
                  onChange={(e) => setD({ dateSourced: e.target.value })}
                  className={inputBase}
                />
              </div>
            </div>

            {/* Other agents who also listed this development */}
            <CoListingAgentsField
              value={draft.coListingAgents}
              onChange={(v) => setD({ coListingAgents: v })}
            />

            {/* Owner / Landlord */}
            <div className="mb-6">
              <p className="text-[16px] font-bold text-[#0d1f2d] mb-3">Landlord / Owner</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className={labelClass}>Role</label>
                  <select
                    value={draft.ownerRole}
                    onChange={(e) => setD({ ownerRole: e.target.value })}
                    className={selectClass}
                  >
                    {CONTACT_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    type="text"
                    value={draft.ownerName}
                    onChange={(e) => setD({ ownerName: e.target.value })}
                    placeholder="Landlord name"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    value={draft.ownerPhone}
                    onChange={(e) => setD({ ownerPhone: e.target.value })}
                    placeholder="+254 7xx xxx xxx"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={draft.ownerEmail}
                    onChange={(e) => setD({ ownerEmail: e.target.value })}
                    placeholder="landlord@email.com"
                    className={inputBase}
                  />
                </div>
              </div>
            </div>

            {/* Property Developer & Projects */}
            <div className="mb-6">
              <p className="text-[16px] font-bold text-[#0d1f2d] mb-3">Property Developer</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
                <div>
                  <label className={labelClass}>Developer Name</label>
                  <input
                    type="text"
                    value={draft.developerName}
                    onChange={(e) => setD({ developerName: e.target.value })}
                    placeholder="e.g. ABC Developments Ltd."
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    value={draft.developerPhone}
                    onChange={(e) => setD({ developerPhone: e.target.value })}
                    placeholder="+254 7xx xxx xxx"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={draft.developerEmail}
                    onChange={(e) => setD({ developerEmail: e.target.value })}
                    placeholder="developer@email.com"
                    className={inputBase}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-semibold text-[#4a5568]">Projects ({form.developerProjects.length})</p>
                <button
                  type="button"
                  onClick={addProject}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0d5959] hover:text-[#0a4545] cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-add-line text-sm" />
                  Add Project
                </button>
              </div>

              {form.developerProjects.length === 0 && (
                <div className="border border-dashed border-[#e8edf2] rounded-lg px-4 py-4 text-center">
                  <p className="text-[12px] text-[#9ba5b1]">No projects yet. Add a project to link this development to a specific phase or block.</p>
                </div>
              )}

              {form.developerProjects.map((project, idx) => (
                <div key={project.id} className="border border-[#e8ecf0] rounded-lg p-4 mb-3 bg-[#fafbfc]" data-internal-project>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[12px] font-bold text-[#0d1f2d] uppercase tracking-wide">Project {idx + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeProject(project.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#dc2626] hover:text-[#b91c1c] cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-delete-bin-line text-sm" />
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <label className="block text-[16px] font-semibold text-[#4a5568] mb-1.5">Project Name</label>
                      <input
                        type="text"
                        value={project.project_name}
                        onChange={(e) => updateProject(project.id, 'project_name', e.target.value)}
                        placeholder="e.g. Phase 2 Towers"
                        className={inputBase}
                      />
                    </div>
                    <div>
                      <label className="block text-[16px] font-semibold text-[#4a5568] mb-1.5">Property Address</label>
                      <input
                        type="text"
                        value={project.property_address}
                        onChange={(e) => updateProject(project.id, 'property_address', e.target.value)}
                        placeholder="e.g. Plot 12, Riverside Drive"
                        className={inputBase}
                      />
                    </div>
                    <div>
                      <label className="block text-[16px] font-semibold text-[#4a5568] mb-1.5">Area / Location</label>
                      <input
                        type="text"
                        value={project.area_location}
                        onChange={(e) => updateProject(project.id, 'area_location', e.target.value)}
                        placeholder="e.g. Westlands, Nairobi"
                        className={inputBase}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[16px] font-semibold text-[#4a5568] mb-1.5">Contact Name</label>
                      <input
                        type="text"
                        value={project.contact_name}
                        onChange={(e) => updateProject(project.id, 'contact_name', e.target.value)}
                        placeholder="Project contact"
                        className={inputBase}
                      />
                    </div>
                    <div>
                      <label className="block text-[16px] font-semibold text-[#4a5568] mb-1.5">Contact Phone</label>
                      <input
                        type="tel"
                        value={project.contact_phone}
                        onChange={(e) => updateProject(project.id, 'contact_phone', e.target.value)}
                        placeholder="+254 7xx xxx xxx"
                        className={inputBase}
                      />
                    </div>
                    <div>
                      <label className="block text-[16px] font-semibold text-[#4a5568] mb-1.5">Contact Email</label>
                      <input
                        type="email"
                        value={project.contact_email}
                        onChange={(e) => updateProject(project.id, 'contact_email', e.target.value)}
                        placeholder="project@email.com"
                        className={inputBase}
                      />
                    </div>
                    <div>
                      <label className="block text-[16px] font-semibold text-[#4a5568] mb-1.5">Contact Address</label>
                      <input
                        type="text"
                        value={project.contact_address}
                        onChange={(e) => updateProject(project.id, 'contact_address', e.target.value)}
                        placeholder="Office / site address"
                        className={inputBase}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Caretaker */}
            <div className="mb-6">
              <p className="text-[16px] font-bold text-[#0d1f2d] mb-3">Caretaker / On-site Contact</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={labelClass}>Role</label>
                  <select
                    value={draft.caretakerRole}
                    onChange={(e) => setD({ caretakerRole: e.target.value })}
                    className={selectClass}
                  >
                    {CONTACT_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    type="text"
                    value={draft.caretakerName}
                    onChange={(e) => setD({ caretakerName: e.target.value })}
                    placeholder="Caretaker / on-site contact"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    value={draft.caretakerPhone}
                    onChange={(e) => setD({ caretakerPhone: e.target.value })}
                    placeholder="+254 7xx xxx xxx"
                    className={inputBase}
                  />
                </div>
              </div>
            </div>

            {/* Agency-only internal data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className={labelClass}>Commission Structure</label>
                <input
                  type="text"
                  value={draft.commissionTracking}
                  onChange={(e) => setD({ commissionTracking: e.target.value })}
                  placeholder="e.g. 2% of sale price, or fixed 500,000"
                  className={inputBase}
                />
              </div>
              <div>
                <label className={labelClass}>Availability Reality (true stock)</label>
                <input
                  type="text"
                  value={draft.availabilityReality}
                  onChange={(e) => setD({ availabilityReality: e.target.value })}
                  placeholder="e.g. only 12 of 48 units actually unsold"
                  className={inputBase}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={labelClass}>Negotiation & Internal Notes</label>
              <textarea
                value={draft.sourceNotes}
                onChange={(e) => setD({ sourceNotes: e.target.value })}
                maxLength={500}
                placeholder="Negotiation notes, access instructions, viewing arrangements, red flags…"
                className={textareaClass}
              />
              <p className="text-[12px] text-[#9ba5b1] mt-1.5 text-right">{draft.sourceNotes.length}/500</p>
            </div>
              <button
                type="button"
                onClick={handleSave}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#088135] hover:bg-[#065a27] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-save-line text-base" /> Save internal continuity
              </button>
            </div>
            )}
          </div>
        )}
      </div>

      <CollapsibleCard icon="ri-lock-line" title="Why this stays private" defaultOpen={false}>
        <div className="pt-3">
          <p className={hintClass}>
            Fields in this section are stored in the database but are <span className="font-semibold text-[#0d1f2d]">never read by the public site</span>.
            Only logged-in admin &amp; agent users see them. Developer name &amp; contact shown here are for your team — the public
            page only displays what you explicitly enable via the marketing toggles.
          </p>
        </div>
      </CollapsibleCard>
    </div>
  );
}