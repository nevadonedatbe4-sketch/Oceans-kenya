import { useState } from 'react';
import { Agent, isLandType, DeveloperProject } from './types';
import SeoPanel from './SeoPanel';
import AgentAssignmentPanel from '@/pages/crm/components/AgentAssignmentPanel';
import CoListingAgentsField from '@/pages/crm/components/CoListingAgentsField';
import { CoListingAgent, describeCoListingAgents } from '@/pages/crm/components/coListingAgents';

interface Props {
  agents: Agent[];
  agentIds: string[];
  setAgentIds: (v: string[]) => void;
  isFeatured: boolean;
  setIsFeatured: (v: boolean) => void;
  onPublish: () => void;
  title: string;
  propertyType: string;
  neighbourhood: string;
  price: string;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
  purpose: string;
  slug?: string;
  setSlug?: (v: string) => void;
  seoTitle?: string;
  setSeoTitle?: (v: string) => void;
  seoDescription?: string;
  setSeoDescription?: (v: string) => void;
  seoImage?: string;
  setSeoImage?: (v: string) => void;
  mainImage?: string;
  isAgentRequired?: boolean;
  // Private source & contact continuity
  ownerName: string;
  setOwnerName: (v: string) => void;
  ownerPhone: string;
  setOwnerPhone: (v: string) => void;
  ownerEmail: string;
  setOwnerEmail: (v: string) => void;
  ownerRole: string;
  setOwnerRole: (v: string) => void;
  sourceName: string;
  setSourceName: (v: string) => void;
  sourceUrl: string;
  setSourceUrl: (v: string) => void;
  sourcePoster: string;
  setSourcePoster: (v: string) => void;
  coListingAgents: CoListingAgent[];
  setCoListingAgents: (v: CoListingAgent[]) => void;
  caretakerName: string;
  setCaretakerName: (v: string) => void;
  caretakerPhone: string;
  setCaretakerPhone: (v: string) => void;
  caretakerRole: string;
  setCaretakerRole: (v: string) => void;
  developerName: string;
  setDeveloperName: (v: string) => void;
  developerPhone: string;
  setDeveloperPhone: (v: string) => void;
  developerEmail: string;
  setDeveloperEmail: (v: string) => void;
  developerProjects: DeveloperProject[];
  setDeveloperProjects: (v: DeveloperProject[] | ((prev: DeveloperProject[]) => DeveloperProject[])) => void;
  dateSourced: string;
  setDateSourced: (v: string) => void;
  sourceNotes: string;
  setSourceNotes: (v: string) => void;
  // Save handlers
  onSaveProject?: () => Promise<void>;
  saving?: boolean;
  isAgent?: boolean;
}

const PURPOSE_LABELS: Record<string, string> = {
  sale: 'For Sale',
  rent: 'For Rent',
  joint_ventures: 'Joint Venture',
  new_development: 'New Development',
  short_stay: 'Short Stay',
  sold: 'Sold',
  rented: 'Rented',
};

const TYPE_LABELS: Record<string, string> = {
  house: 'House',
  apartment: 'Apartment',
  villa: 'Villa',
  townhouse: 'Townhouse',
  penthouse: 'Penthouse',
  studio: 'Studio',
  detached: 'Detached',
  'semi-detached': 'Semi-Detached',
  terraced: 'Terraced',
  flat: 'Flat',
  bungalow: 'Bungalow',
  condominium_apartment: 'Condo / Condominium Apartment',
  apartment_block: 'Apartment Block',
  commercial: 'Commercial',
  office: 'Office',
  land: 'Land',
  'farms_/_land': 'Farms / Land',
  park_home: 'Park Home',
};

const CONTACT_ROLES = [
  { value: 'landlord', label: 'Landlord / Owner' },
  { value: 'caretaker', label: 'Caretaker / On-site Contact' },
  { value: 'poster', label: 'Original Poster' },
  { value: 'agent', label: 'Agent' },
  { value: 'other', label: 'Other' },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(CONTACT_ROLES.map((r) => [r.value, r.label]));

function formatContinuityDate(v: string): string {
  if (!v) return '';
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Design tokens ── */
const selectClass =
  "w-full text-base font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] cursor-pointer appearance-none rounded-md bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237a8a99%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px] pr-11";

const inputClass = "w-full text-base font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] rounded-md";

const textareaClass = "w-full text-base font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] rounded-md resize-y min-h-[96px]";

const labelClass = 'block text-[16px] font-bold tracking-wide text-[#0d1f2d] uppercase mb-2.5 leading-none';
const hintClass = 'text-[15px] text-[#4a5568] mt-2 leading-relaxed';

/* ── Section Header ── */
const SectionHeader = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="mb-7">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
        <i className={`${icon} text-white text-base`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-semibold text-[#0d1f2d] tracking-wide">{title}</h4>
        <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
    <div className="h-px bg-[#e5e7eb] mt-4" />
  </div>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="border border-[#e8ecf0] bg-white rounded-xl">
    <div className="px-6 py-6">{children}</div>
  </div>
);

/* ── Toggle ── */
const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
  <label className="relative inline-flex items-center cursor-pointer shrink-0">
    <input type="checkbox" className="sr-only" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
    <div className={`w-12 h-7 rounded-full transition-colors px-0.5 flex items-center ${enabled ? 'bg-[#0d5959]' : 'bg-[#d1d5db]'}`}>
      <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </label>
);

export default function SettingsStep({
  agents, agentIds, setAgentIds, isFeatured, setIsFeatured,
  title, propertyType, neighbourhood, price, currency,
  bedrooms, bathrooms, amenities, images, purpose,
  slug, setSlug, seoTitle, setSeoTitle, seoDescription, setSeoDescription,
  seoImage, setSeoImage, mainImage,
  isAgentRequired,
  ownerName, setOwnerName, ownerPhone, setOwnerPhone, ownerEmail, setOwnerEmail,
  ownerRole, setOwnerRole, caretakerRole, setCaretakerRole,
  sourceName, setSourceName, sourceUrl, setSourceUrl, sourcePoster, setSourcePoster,
  coListingAgents, setCoListingAgents,
  caretakerName, setCaretakerName, caretakerPhone, setCaretakerPhone,
  developerName, setDeveloperName, developerPhone, setDeveloperPhone, developerEmail, setDeveloperEmail,
  developerProjects, setDeveloperProjects,
  dateSourced, setDateSourced, sourceNotes, setSourceNotes,
  onSaveProject, saving, isAgent,
}: Props) {
  const displayTitle = title || 'Untitled Draft';
  const displayType = TYPE_LABELS[propertyType] || propertyType || '—';
  const displayLocation = neighbourhood || 'Not set';
  const formattedPrice = price ? `${currency} ${Number(price).toLocaleString()}` : 'Not set';
  const photoCount = images.length;
  const amenityCount = amenities.length;
  const purposeLabel = PURPOSE_LABELS[purpose] || purpose;
  const isLand = isLandType(propertyType);
  const isNewDevelopment = purpose === 'new_development';
  const [contactOpen, setContactOpen] = useState(false);
  // Track which projects have been saved (by index, since IDs can be unstable)
  const [savedProjectIds, setSavedProjectIds] = useState<Set<string>>(new Set());
  const [savingProjectId, setSavingProjectId] = useState<string | null>(null);

  // Source & Contact (Private) — held in a local draft so nothing persists until Save
  const [contactSaved, setContactSaved] = useState<boolean>(() =>
    Boolean(
      sourceName || sourceUrl || sourcePoster || dateSourced ||
      ownerName || ownerPhone || ownerEmail ||
      developerName || developerPhone || developerEmail ||
      caretakerName || caretakerPhone || sourceNotes ||
      developerProjects.length || coListingAgents.length
    )
  );
  const [contactDraft, setContactDraft] = useState({
    sourceName, sourceUrl, sourcePoster, dateSourced, coListingAgents,
    ownerRole, ownerName, ownerPhone, ownerEmail,
    developerName, developerPhone, developerEmail,
    caretakerRole, caretakerName, caretakerPhone,
    sourceNotes,
  });
  const setContinuity = (patch: Partial<typeof contactDraft>) =>
    setContactDraft((p) => ({ ...p, ...patch }));

  const persistContinuity = () => {
    setSourceName(contactDraft.sourceName);
    setSourceUrl(contactDraft.sourceUrl);
    setSourcePoster(contactDraft.sourcePoster);
    setDateSourced(contactDraft.dateSourced);
    setCoListingAgents(contactDraft.coListingAgents);
    setOwnerRole(contactDraft.ownerRole);
    setOwnerName(contactDraft.ownerName);
    setOwnerPhone(contactDraft.ownerPhone);
    setOwnerEmail(contactDraft.ownerEmail);
    setDeveloperName(contactDraft.developerName);
    setDeveloperPhone(contactDraft.developerPhone);
    setDeveloperEmail(contactDraft.developerEmail);
    setCaretakerRole(contactDraft.caretakerRole);
    setCaretakerName(contactDraft.caretakerName);
    setCaretakerPhone(contactDraft.caretakerPhone);
    setSourceNotes(contactDraft.sourceNotes);
  };

  const handleContinuitySave = () => {
    persistContinuity();
    setContactSaved(true);
    setContactOpen(false);
  };

  const handleContinuityEdit = () => {
    setContactDraft({
      sourceName, sourceUrl, sourcePoster, dateSourced, coListingAgents,
      ownerRole, ownerName, ownerPhone, ownerEmail,
      developerName, developerPhone, developerEmail,
      caretakerRole, caretakerName, caretakerPhone,
      sourceNotes,
    });
    setContactSaved(false);
    setContactOpen(true);
  };

  const continuityItems = [
    { label: 'Source', value: sourceName },
    { label: 'Source Link', value: sourceUrl },
    { label: 'Original Poster', value: sourcePoster },
    { label: 'Date Sourced', value: formatContinuityDate(dateSourced) },
    { label: 'Other Agents', value: describeCoListingAgents(coListingAgents) },
    { label: 'Owner Role', value: ROLE_LABELS[ownerRole] },
    { label: 'Owner', value: ownerName },
    { label: 'Owner Phone', value: ownerPhone },
    { label: 'Owner Email', value: ownerEmail },
    { label: 'Developer', value: developerName },
    { label: 'Developer Phone', value: developerPhone },
    { label: 'Developer Email', value: developerEmail },
    { label: 'Caretaker Role', value: ROLE_LABELS[caretakerRole] },
    { label: 'Caretaker', value: caretakerName },
    { label: 'Caretaker Phone', value: caretakerPhone },
    { label: 'Projects', value: developerProjects.length ? `${developerProjects.length} project${developerProjects.length > 1 ? 's' : ''}` : '' },
    { label: 'Notes', value: sourceNotes },
  ].filter((i) => i.value && String(i.value).trim());

  const addProject = () => {
    setSavedProjectIds((prev) => {
      const next = new Set(prev);
      return next;
    });
    setDeveloperProjects((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        project_name: '',
        property_address: '',
        area_location: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        contact_address: '',
      },
    ]);
  };

  const updateProject = (id: string, field: keyof DeveloperProject, value: string) => {
    setDeveloperProjects((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeProject = (id: string) => {
    setDeveloperProjects((prev) => prev.filter((p) => p.id !== id));
    setSavedProjectIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSaveProject = async (id: string) => {
    if (!onSaveProject) return;
    setSavingProjectId(id);
    try {
      await onSaveProject();
      if (id === 'all') {
        // Mark all current projects as saved
        setSavedProjectIds((prev) => {
          const next = new Set(prev);
          developerProjects.forEach((p) => next.add(p.id));
          return next;
        });
      } else {
        setSavedProjectIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
    } catch {
      // toast handled by parent
    } finally {
      setSavingProjectId(null);
    }
  };

  return (
    <div className="w-full space-y-5">

      {/* Agent Assignment — shared collapsible panel, collapsed by default */}
      <AgentAssignmentPanel
        agents={agents}
        value={agentIds}
        onChange={setAgentIds}
        required={isAgentRequired !== false}
        locked={isAgent}
        lockedName={agents.find((a) => a.id === (agentIds[0] || ''))?.name || 'You (auto-assigned)'}
        variant="teal"
      />

      {/* Source & Contact (Private) — admin-only internal continuity */}
      {!isAgent ? (
      <>
      <SectionHeader
        icon="ri-lock-line"
        title="Source & Contact"
        subtitle="Landlord, caretaker & original source — visible to your team only, never on the public site"
      />
      <div className="border border-[#088135]/40 bg-[#e6f4ea] overflow-hidden rounded-xl">
        <button
          type="button"
          onClick={() => setContactOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-6 py-5 hover:bg-[#dff1e5] transition-colors cursor-pointer text-left"
        >
          <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg bg-[#088135]/15">
            <i className="ri-shield-keyhole-line text-sm text-[#088135]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#088135] uppercase tracking-widest">internal Property source</p>
            <p className="text-[12px] text-[#7a8a99] mt-0.5 leading-relaxed">
              Agents leave, numbers change — this keeps every listing contactable. Only logged-in team members ever see this.
            </p>
          </div>
          {contactSaved && !contactOpen && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#088135] bg-[#088135]/10 border border-[#088135]/25 px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
              <i className="ri-check-line text-xs" /> Saved
            </span>
          )}
          <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-lg bg-white text-[#065a27]">
            <i className={`${contactOpen ? 'ri-arrow-up-wide-fill' : 'ri-arrow-down-wide-fill'} text-lg`} />
          </div>
        </button>

        {contactOpen && (
        <div className="px-6 py-6">
          {contactSaved ? (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <i className="ri-checkbox-circle-line text-[#088135] text-base" />
                <p className="text-[13px] font-bold text-[#088135] uppercase tracking-widest">Internal Continuity</p>
              </div>
              {continuityItems.length === 0 ? (
                <p className="text-[13px] text-[#7a8a99] leading-relaxed">No continuity details saved yet.</p>
              ) : (
                <div className="rounded-lg border border-[#088135]/25 bg-white divide-y divide-[#eef5f0]">
                  {continuityItems.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-4 px-4 py-3">
                      <span className="text-[12px] font-semibold text-[#7a8a99] uppercase tracking-wide shrink-0">{item.label}</span>
                      <span className="text-[13px] font-medium text-[#0d1f2d] text-right break-words whitespace-nowrap">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={handleContinuityEdit}
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
              <label className="block text-[16px] font-bold tracking-wide text-[#0d1f2d] mb-2">Source Name</label>
              <input type="text" value={contactDraft.sourceName} onChange={(e) => setContinuity({ sourceName: e.target.value })} placeholder="e.g. Facebook group, website, referral" className={inputClass} />
            </div>
            <div>
              <label className="block text-[16px] font-bold tracking-wide text-[#0d1f2d] mb-2">Source Link</label>
              <input type="url" value={contactDraft.sourceUrl} onChange={(e) => setContinuity({ sourceUrl: e.target.value })} placeholder="https://facebook.com/groups/…" className={inputClass} />
            </div>
            <div>
              <label className="block text-[16px] font-bold tracking-wide text-[#0d1f2d] mb-2">Original Poster</label>
              <input type="text" value={contactDraft.sourcePoster} onChange={(e) => setContinuity({ sourcePoster: e.target.value })} placeholder="Name of the person who listed it" className={inputClass} />
            </div>
            <div>
              <label className="block text-[16px] font-bold tracking-wide text-[#0d1f2d] mb-2">Date Sourced</label>
              <input type="date" value={contactDraft.dateSourced} onChange={(e) => setContinuity({ dateSourced: e.target.value })} className={inputClass} />
            </div>
          </div>

          {/* Other agents who also listed this property */}
          <CoListingAgentsField
            value={contactDraft.coListingAgents}
            onChange={(v) => setContinuity({ coListingAgents: v })}
          />

          {/* Landlord */}
          <div className="mb-6">
            <p className="text-[16px] font-bold text-[#0d1f2d] mb-3">Landlord / Owner</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Role</label>
                <select value={contactDraft.ownerRole} onChange={(e) => setContinuity({ ownerRole: e.target.value })} className={selectClass}>
                  {CONTACT_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Name</label>
                <input type="text" value={contactDraft.ownerName} onChange={(e) => setContinuity({ ownerName: e.target.value })} placeholder="Landlord name" className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Phone</label>
                <input type="tel" value={contactDraft.ownerPhone} onChange={(e) => setContinuity({ ownerPhone: e.target.value })} placeholder="+254 7xx xxx xxx" className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Email</label>
                <input type="email" value={contactDraft.ownerEmail} onChange={(e) => setContinuity({ ownerEmail: e.target.value })} placeholder="landlord@email.com" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Property Developer & Projects */}
          <div className="mb-6">
            <p className="text-[13px] font-bold text-[#0d1f2d] mb-3">Property Developer</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Developer Name</label>
                <input type="text" value={contactDraft.developerName} onChange={(e) => setContinuity({ developerName: e.target.value })} placeholder="e.g. ABC Developments Ltd." className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Phone</label>
                <input type="tel" value={contactDraft.developerPhone} onChange={(e) => setContinuity({ developerPhone: e.target.value })} placeholder="+254 7xx xxx xxx" className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Email</label>
                <input type="email" value={contactDraft.developerEmail} onChange={(e) => setContinuity({ developerEmail: e.target.value })} placeholder="developer@email.com" className={inputClass} />
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold text-[#4a5568]">Projects ({developerProjects.length})</p>
              <div className="flex items-center gap-2">
                {onSaveProject && developerProjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSaveProject('all')}
                    disabled={saving || savingProjectId !== null}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0d5959] hover:text-[#0a4545] cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {savingProjectId === 'all' ? (
                      <i className="ri-loader-4-line animate-spin text-sm" />
                    ) : (
                      <i className="ri-save-line text-sm" />
                    )}
                    Save All Projects
                  </button>
                )}
                <button
                  type="button"
                  onClick={addProject}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0d5959] hover:text-[#0a4545] cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-add-line text-sm" />
                  Add Project
                </button>
              </div>
            </div>

            {developerProjects.map((project, idx) => {
              const isSaved = savedProjectIds.has(project.id);
              const isSavingThis = savingProjectId === project.id;
              return (
                <div key={project.id} className={`border rounded-lg p-4 mb-3 bg-[#fafbfc] transition-all ${isSaved ? 'border-[#0d5959] ring-1 ring-[#0d5959]/20' : 'border-[#e8ecf0]'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-bold text-[#0d1f2d] uppercase tracking-wide">Project {idx + 1}</p>
                      {isSaved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0d5959] bg-[#0d5959]/10 px-2 py-0.5 rounded-full">
                          <i className="ri-check-line" /> Saved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {onSaveProject && (
                        <button
                          type="button"
                          onClick={() => handleSaveProject(project.id)}
                          disabled={isSavingThis || saving}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0d5959] hover:text-[#0a4545] cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          {isSavingThis ? (
                            <i className="ri-loader-4-line animate-spin text-sm" />
                          ) : (
                            <i className="ri-save-line text-sm" />
                          )}
                          {isSavingThis ? 'Saving...' : 'Save Project'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeProject(project.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#dc2626] hover:text-[#b91c1c] cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-delete-bin-line text-sm" />
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Project Name</label>
                      <input type="text" value={project.project_name} onChange={(e) => updateProject(project.id, 'project_name', e.target.value)} placeholder="e.g. Riverside Residences" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Property Address</label>
                      <input type="text" value={project.property_address} onChange={(e) => updateProject(project.id, 'property_address', e.target.value)} placeholder="e.g. Plot 12, Riverside Drive" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Area / Location</label>
                      <input type="text" value={project.area_location} onChange={(e) => updateProject(project.id, 'area_location', e.target.value)} placeholder="e.g. Westlands, Nairobi" className={inputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Contact Name</label>
                      <input type="text" value={project.contact_name} onChange={(e) => updateProject(project.id, 'contact_name', e.target.value)} placeholder="Project contact" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Contact Phone</label>
                      <input type="tel" value={project.contact_phone} onChange={(e) => updateProject(project.id, 'contact_phone', e.target.value)} placeholder="+254 7xx xxx xxx" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Contact Email</label>
                      <input type="email" value={project.contact_email} onChange={(e) => updateProject(project.id, 'contact_email', e.target.value)} placeholder="project@email.com" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Contact Address</label>
                      <input type="text" value={project.contact_address} onChange={(e) => updateProject(project.id, 'contact_address', e.target.value)} placeholder="Office / site address" className={inputClass} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Caretaker */}
          <div className="mb-6">
            <p className="text-[13px] font-bold text-[#0d1f2d] mb-3">Caretaker / On-site Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Role</label>
                <select value={contactDraft.caretakerRole} onChange={(e) => setContinuity({ caretakerRole: e.target.value })} className={selectClass}>
                  {CONTACT_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Name</label>
                <input type="text" value={contactDraft.caretakerName} onChange={(e) => setContinuity({ caretakerName: e.target.value })} placeholder="Caretaker / on-site contact" className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Phone</label>
                <input type="tel" value={contactDraft.caretakerPhone} onChange={(e) => setContinuity({ caretakerPhone: e.target.value })} placeholder="+254 7xx xxx xxx" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[13px] font-bold tracking-wide text-[#0d1f2d] mb-2">Notes</label>
            <textarea
              value={contactDraft.sourceNotes}
              onChange={(e) => setContinuity({ sourceNotes: e.target.value })}
              maxLength={500}
              placeholder="Access instructions, viewing arrangements, commission structure, red flags…"
              className={textareaClass}
            />
            <p className="text-[12px] text-[#9ba5b1] mt-1.5 text-right">{contactDraft.sourceNotes.length}/500</p>
              <button
                type="button"
                onClick={handleContinuitySave}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#088135] hover:bg-[#065a27] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-save-line text-base" /> Save continuity
              </button>
            </div>
            </div>
          )}
        </div>
        )}
      </div>
      </>
      ) : null}

      {/* Featured Property — admin-only content control */}
      {!isAgent ? (
        <>
      <SectionHeader
        icon="ri-star-line"
        title="Featured Property"
        subtitle="Mark this listing to appear in featured sections"
      />
      <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
        <div className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-[#fafbfc] transition-colors">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-lg border border-[#e8ecf0] bg-[#f4f6f8]">
              <i className="ri-star-line text-sm text-[#5a6a7a]" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[#1a1e24]">
                {isFeatured ? 'Featured Listing' : 'Standard Listing'}
              </p>
              <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed">
                {isFeatured
                  ? 'This property will appear in featured sections'
                  : 'Toggle on to feature this property across the site'}
              </p>
            </div>
          </div>
          <Toggle enabled={isFeatured} onChange={setIsFeatured} />
        </div>
      </div>
        </>
      ) : null}

      {/* SEO & Social Preview — overrides the auto-generated metadata */}
      <SeoPanel
        title={title}
        propertyType={propertyType}
        neighbourhood={neighbourhood}
        price={price}
        currency={currency}
        bedrooms={bedrooms}
        bathrooms={bathrooms}
        purpose={purpose}
        mainImage={mainImage}
        slug={slug || ''}
        setSlug={setSlug || (() => {})}
        seoTitle={seoTitle || ''}
        setSeoTitle={setSeoTitle || (() => {})}
        seoDescription={seoDescription || ''}
        setSeoDescription={setSeoDescription || (() => {})}
        seoImage={seoImage || ''}
        setSeoImage={setSeoImage || (() => {})}
      />

      {/* Property Summary */}
      <SectionHeader
        icon="ri-file-list-line"
        title="Property Summary"
        subtitle="Review your listing before publishing"
      />
      <div className="bg-[#001731] border-l-2 border-[#d3bb6e] overflow-hidden rounded-xl">
        <div className="px-6 py-6">
          <div className="flex items-center gap-2 mb-6">
            <i className="ri-file-list-line text-[#d3bb6e] text-sm" />
            <p className="text-[13px] font-bold text-[#d3bb6e] uppercase tracking-widest">Summary</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
            {(isLand
              ? [
                  { label: 'Title', value: displayTitle },
                  { label: 'Type', value: displayType },
                  { label: 'Location', value: displayLocation },
                  { label: 'Price', value: formattedPrice },
                  { label: 'Purpose', value: purposeLabel },
                ]
              : [
                  { label: 'Title', value: displayTitle },
                  { label: 'Type', value: displayType },
                  { label: 'Location', value: displayLocation },
                  { label: 'Price', value: formattedPrice },
                  { label: 'Bedrooms', value: String(bedrooms) },
                  { label: 'Bathrooms', value: String(bathrooms) },
                ]
            ).map(({ label, value }) => (
              <div key={label}>
                <span className="text-[11px] font-bold text-[#d3bb6e]/60 uppercase tracking-widest">{label}</span>
                <p className="text-[15px] font-semibold text-white mt-1.5 truncate" title={value}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-[#d3bb6e]/20 flex items-center gap-2.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-md ${
              photoCount === 0 ? 'bg-red-500/10 text-red-300' : 'bg-[#16a34a]/10 text-[#86efac]'
            }`}>
              <i className="ri-image-line" />
              {photoCount === 0 ? 'No photos' : `${photoCount} photo${photoCount !== 1 ? 's' : ''}`}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-md ${
              amenityCount > 0 ? 'bg-[#16a34a]/10 text-[#86efac]' : 'bg-white/10 text-white/40'
            }`}>
              <i className="ri-list-check" />
              {amenityCount} amenit{amenityCount !== 1 ? 'ies' : 'y'}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-md ${
              isFeatured ? 'bg-[#d3bb6e]/10 text-[#d3bb6e]' : 'bg-white/10 text-white/40'
            }`}>
              <i className="ri-star-line" />
              {isFeatured ? 'Featured' : 'Not Featured'}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-md ${
              isNewDevelopment ? 'bg-[#d3bb6e]/10 text-[#d3bb6e]' : 'bg-white/10 text-white/40'
            }`}>
              <i className="ri-building-line" />
              {isNewDevelopment ? 'New Dev' : 'Not New Dev'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-md bg-white/10 text-white/70">
              <i className="ri-price-tag-3-line" />
              {purposeLabel}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}