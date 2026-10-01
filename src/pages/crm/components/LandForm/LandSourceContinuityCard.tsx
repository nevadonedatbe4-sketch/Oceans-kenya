import { useState } from 'react';
import type { LandFormState } from './types';
import LandSourceLink, { type SourceContact } from './LandSourceLink';
import CoListingAgentsField from '@/pages/crm/components/CoListingAgentsField';

interface Props {
  state: LandFormState;
  update: (p: Partial<LandFormState>) => void;
}

/* Dark continuity theme — the only dark card on the Review & Publish page. */
const DARK_BG = 'bg-[#0d1f2d]';
const DARK_BORDER = 'border-[#2c4a5e]';
const DARK_PANEL = 'bg-[#0a1f2c]';
const DARK_PANEL_BORDER = 'border-[#27414f]';

const inputClass =
  "w-full text-base font-medium border border-[#c9d4dc] px-3 py-2.5 text-[#0d1f2d] bg-white outline-none focus:border-[#088135] focus:ring-2 focus:ring-[#088135]/25 transition-all placeholder:text-[#8ba0ae] rounded-md";
const textareaClass = `${inputClass} resize-y min-h-[96px] leading-relaxed`;
const selectClass =
  "w-full text-base font-medium border border-[#c9d4dc] px-3 py-2.5 text-[#0d1f2d] bg-white outline-none focus:border-[#088135] focus:ring-2 focus:ring-[#088135]/25 transition-all placeholder:text-[#8ba0ae] cursor-pointer appearance-none rounded-md bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%230d1f2d%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px] pr-11";
const labelClass = 'block text-[16px] font-semibold tracking-wide text-[#e6f0f4] mb-2 leading-none';
const sectionTitleClass = 'text-[16px] font-bold uppercase tracking-wide text-[#e6f0f4] mb-3';

const SOURCE_OPTIONS = [
  { value: '', label: 'Where did this come from?' },
  { value: 'referral', label: 'Referral' },
  { value: 'walk_in', label: 'Walk-in / office' },
  { value: 'website', label: 'Website enquiry' },
  { value: 'social', label: 'Social media' },
  { value: 'cold_call', label: 'Cold outreach' },
  { value: 'listing_feed', label: 'Listing feed' },
  { value: 'other', label: 'Other' },
];

const SELLER_TYPE_OPTIONS = [
  { value: '', label: 'Select seller type' },
  { value: 'private_owner', label: 'Private owner' },
  { value: 'agent', label: 'Agent / broker' },
  { value: 'developer', label: 'Developer' },
  { value: 'family_estate', label: 'Family estate' },
  { value: 'institution', label: 'Institution' },
  { value: 'cooperative', label: 'Co-operative' },
];

const SELLER_TYPE_LABELS: Record<string, string> = {
  private_owner: 'Private owner',
  agent: 'Agent / broker',
  developer: 'Developer',
  family_estate: 'Family estate',
  institution: 'Institution',
  cooperative: 'Co-operative',
};

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Referral',
  walk_in: 'Walk-in / office',
  website: 'Website enquiry',
  social: 'Social media',
  cold_call: 'Cold outreach',
  listing_feed: 'Listing feed',
  other: 'Other',
};

/* Continuity fields the card owns — kept in a local draft so edits are only
   persisted to the CRM when the agent explicitly clicks Save. */
type ContinuityDraft = Pick<
  LandFormState,
  | 'sourceContactId'
  | 'ownerName'
  | 'ownerPhone'
  | 'ownerEmail'
  | 'sellerType'
  | 'ownershipRelationship'
  | 'internalContact'
  | 'sellerNotes'
  | 'source'
  | 'sourceName'
  | 'sourceLink'
  | 'dateSourced'
  | 'posterName'
  | 'posterPhone'
  | 'posterEmail'
  | 'posterCompany'
  | 'posterProfile'
  | 'posterAddress'
  | 'coListingAgents'
  | 'internalNotes'
  | 'commission'
  | 'negotiationFloor'
  | 'internalValuation'
  | 'legalConcerns'
  | 'followUpNotes'
>;

function toDraft(state: LandFormState): ContinuityDraft {
  return {
    sourceContactId: state.sourceContactId,
    ownerName: state.ownerName,
    ownerPhone: state.ownerPhone,
    ownerEmail: state.ownerEmail,
    sellerType: state.sellerType,
    ownershipRelationship: state.ownershipRelationship,
    internalContact: state.internalContact,
    sellerNotes: state.sellerNotes,
    source: state.source,
    sourceName: state.sourceName,
    sourceLink: state.sourceLink,
    dateSourced: state.dateSourced,
    posterName: state.posterName,
    posterPhone: state.posterPhone,
    posterEmail: state.posterEmail,
    posterCompany: state.posterCompany,
    posterProfile: state.posterProfile,
    posterAddress: state.posterAddress,
    coListingAgents: state.coListingAgents,
    internalNotes: state.internalNotes,
    commission: state.commission,
    negotiationFloor: state.negotiationFloor,
    internalValuation: state.internalValuation,
    legalConcerns: state.legalConcerns,
    followUpNotes: state.followUpNotes,
  };
}

function toPatch(d: ContinuityDraft): Partial<LandFormState> {
  return { ...d };
}

function hasContinuityData(state: LandFormState): boolean {
  const d = toDraft(state);
  return Object.values(d).some((v) => typeof v === 'string' && v.trim() !== '') || d.coListingAgents.length > 0;
}

function formatDate(v: string): string {
  if (!v) return '';
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* Build the saved summary — only shows fields that actually hold a value. */
function summaryItems(state: LandFormState): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  const push = (label: string, value: string) => {
    if (value && value.trim()) items.push({ label, value: value.trim() });
  };

  push('Source', state.sourceName);
  push('Source Link', state.sourceLink);
  push('Source Type', SOURCE_LABELS[state.source]);
  push('Date Sourced', formatDate(state.dateSourced));
  push('Original Poster', state.posterName);
  push('Poster Phone', state.posterPhone);
  push('Poster Email', state.posterEmail);
  push('Poster Company', state.posterCompany);
  push('Poster Profile', state.posterProfile);
  push('Poster Address', state.posterAddress);
  push('Seller / Owner', state.ownerName);
  push('Seller Phone', state.ownerPhone);
  push('Seller Email', state.ownerEmail);
  push('Seller Type', SELLER_TYPE_LABELS[state.sellerType]);
  push('Ownership Relationship', state.ownershipRelationship);
  push('Internal Contact Ref', state.internalContact);
  push('Seller Notes', state.sellerNotes);
  push('Internal Notes', state.internalNotes);
  push('Commission', state.commission);
  push('Negotiation Floor', state.negotiationFloor);
  push('Internal Valuation', state.internalValuation);
  push('Legal Concerns', state.legalConcerns);
  push('Follow-up Notes', state.followUpNotes);

  return items;
}

export default function LandSourceContinuityCard({ state, update }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ContinuityDraft>(() => toDraft(state));
  const [saved, setSaved] = useState<boolean>(() => hasContinuityData(state));

  const setD = (patch: Partial<ContinuityDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const linkedName = draft.sourceContactId ? (draft.ownerName || draft.internalContact || '') : '';
  const linkedEmail = draft.sourceContactId ? draft.ownerEmail : '';
  const linkedPhone = draft.sourceContactId ? draft.ownerPhone : '';

  const handleLink = (contact: SourceContact | null) => {
    if (contact) {
      // Preserve continuity: reuse the linked source's details without duplicating the seller.
      setD({
        sourceContactId: contact.id,
        ownerName: contact.name || draft.ownerName,
        ownerEmail: contact.email || draft.ownerEmail,
        ownerPhone: contact.phone || draft.ownerPhone,
        internalContact: contact.name || draft.internalContact,
        source: contact.source || draft.source,
      });
    } else {
      setD({ sourceContactId: '' });
    }
  };

  /* Save — persist the draft to the CRM, collapse, then show the summary. */
  const handleSave = () => {
    update(toPatch(draft));
    setSaved(true);
    setOpen(false);
  };

  /* Edit — rehydrate the draft from the persisted state and reopen the form. */
  const handleEdit = () => {
    setDraft(toDraft(state));
    setSaved(false);
    setOpen(true);
  };

  const items = summaryItems(state);
  const headerSubtitle = saved
    ? items.length > 0
      ? `Saved · ${items[0].value}${items[1] ? ` · ${items[1].value}` : ''}`
      : 'Continuity saved'
    : 'No continuity details saved yet';

  return (
    <div className={`${DARK_BG} ${DARK_BORDER} border overflow-hidden rounded-xl flex flex-col h-full`}>
      {/* Collapsed header — compact summary */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-6 py-5 hover:bg-[#12293a] transition-colors cursor-pointer text-left"
      >
        <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-lg bg-[#088135]">
          <i className="ri-shield-keyhole-line text-sm text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-bold text-white uppercase tracking-widest">Source &amp; Seller Continuity</h4>
          <p className="text-[12px] text-[#a9c0cf] mt-0.5 leading-relaxed truncate">
            {open ? 'Private continuity between seller → contact → listing' : headerSubtitle}
          </p>
        </div>
        {saved && !open && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5eea9a] bg-[#088135]/20 border border-[#2c4a5e] px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
            <i className="ri-check-line text-xs" /> Saved
          </span>
        )}
        <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-lg bg-[#12293a] text-[#a9c0cf]">
          <i className={`${open ? 'ri-arrow-up-wide-fill' : 'ri-arrow-down-wide-fill'} text-lg`} />
        </div>
      </button>

      {open && (
        <div className="px-6 py-6 border-t border-white/10">
          {saved ? (
            /* Saved summary — actual persisted values, populated fields only */
            <div>
              <div className="flex items-center gap-2 mb-5">
                <i className="ri-checkbox-circle-line text-[#5eea9a] text-base" />
                <h4 className="text-[13px] font-bold text-white uppercase tracking-widest">Internal Continuity</h4>
              </div>

              {items.length === 0 ? (
                <p className="text-[13px] text-[#a9c0cf] leading-relaxed">No continuity details saved yet.</p>
              ) : (
                <div className={`rounded-lg border ${DARK_PANEL_BORDER} ${DARK_PANEL} divide-y divide-[#27414f]`}>
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-4 px-4 py-3">
                      <span className="text-[12px] font-semibold text-[#8fa9b8] uppercase tracking-wide shrink-0">{item.label}</span>
                      <span className="text-[13px] font-medium text-[#eaf2f6] text-right break-words whitespace-nowrap">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center gap-2.5 p-4 rounded-lg border border-[#2c4a5e] bg-[#0a1f2c]">
                <i className="ri-lock-line text-[#5eea9a] text-base shrink-0" />
                <p className="text-[12px] text-[#a9c0cf] leading-relaxed">
                  This section is stored in the database but never read by the public site — only logged-in admin &amp; agent users see it.
                </p>
              </div>

              <button
                type="button"
                onClick={handleEdit}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#088135] hover:bg-[#065a27] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-edit-line text-base" />
                Edit continuity
              </button>
            </div>
          ) : (
            <div>
              {/* Linked source */}
              <div className="mb-6">
                <label className={labelClass}>Seller / Source</label>
                <LandSourceLink
                  sourceContactId={draft.sourceContactId}
                  onLink={handleLink}
                  linkedName={linkedName}
                  linkedEmail={linkedEmail}
                  linkedPhone={linkedPhone}
                />
                <p className="text-[12px] text-[#a9c0cf] mt-2 leading-relaxed">
                  Link the originating contact record to keep the seller → contact → listing chain intact. Changing it here re-points the listing without duplicating the seller.
                </p>
              </div>

              {/* Source details */}
              <div className="mb-6">
                <p className={sectionTitleClass}>Source Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Source Name</label>
                    <input
                      type="text"
                      value={draft.sourceName}
                      onChange={(e) => setD({ sourceName: e.target.value })}
                      placeholder="e.g. Facebook group, website, referral"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Source Link</label>
                    <input
                      type="url"
                      value={draft.sourceLink}
                      onChange={(e) => setD({ sourceLink: e.target.value })}
                      placeholder="https://facebook.com/groups/…"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Source Type</label>
                    <select
                      value={SOURCE_OPTIONS.some((o) => o.value === draft.source) ? draft.source : ''}
                      onChange={(e) => setD({ source: e.target.value })}
                      className={selectClass}
                    >
                      {SOURCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-white text-[#0d1f2d]">{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Date Sourced</label>
                    <input
                      type="date"
                      value={draft.dateSourced}
                      onChange={(e) => setD({ dateSourced: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Original poster / poster details */}
              <div className="mb-6">
                <p className={sectionTitleClass}>Original Poster / Poster Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Original Poster</label>
                    <input
                      type="text"
                      value={draft.posterName}
                      onChange={(e) => setD({ posterName: e.target.value })}
                      placeholder="Name of the person who listed it"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Poster Phone</label>
                    <input
                      type="tel"
                      value={draft.posterPhone}
                      onChange={(e) => setD({ posterPhone: e.target.value })}
                      placeholder="+254 7xx xxx xxx"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Poster Email</label>
                    <input
                      type="email"
                      value={draft.posterEmail}
                      onChange={(e) => setD({ posterEmail: e.target.value })}
                      placeholder="poster@email.com"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Poster Company / Agency</label>
                    <input
                      type="text"
                      value={draft.posterCompany}
                      onChange={(e) => setD({ posterCompany: e.target.value })}
                      placeholder="e.g. ABC Realtors"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Poster Profile / Social Link</label>
                    <input
                      type="url"
                      value={draft.posterProfile}
                      onChange={(e) => setD({ posterProfile: e.target.value })}
                      placeholder="https://…"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Poster Address</label>
                    <input
                      type="text"
                      value={draft.posterAddress}
                      onChange={(e) => setD({ posterAddress: e.target.value })}
                      placeholder="City, street, office"
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Internal Notes</label>
                    <textarea
                      value={draft.internalNotes}
                      onChange={(e) => setD({ internalNotes: e.target.value })}
                      maxLength={500}
                      placeholder="Private internal notes…"
                      className={textareaClass}
                    />
                    <p className="text-[12px] text-[#7d93a3] mt-1.5 text-right">{draft.internalNotes.length}/500</p>
                  </div>
                </div>

                {/* Other agents who also posted this land */}
                <CoListingAgentsField
                  theme="dark"
                  value={draft.coListingAgents}
                  onChange={(v) => setD({ coListingAgents: v })}
                />
              </div>

              {/* Seller / Owner details */}
              <div className="mb-6">
                <p className={sectionTitleClass}>Landlord / Seller</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Name / contact</label>
                    <input
                      value={draft.ownerName}
                      onChange={(e) => setD({ ownerName: e.target.value })}
                      placeholder="e.g. Jane Njeri"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Contact</label>
                    <input
                      value={draft.ownerPhone}
                      onChange={(e) => setD({ ownerPhone: e.target.value })}
                      placeholder="+254 7XX XXX XXX"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      value={draft.ownerEmail}
                      onChange={(e) => setD({ ownerEmail: e.target.value })}
                      placeholder="owner@email.com"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Seller type</label>
                    <select
                      value={SELLER_TYPE_OPTIONS.some((o) => o.value === draft.sellerType) ? draft.sellerType : ''}
                      onChange={(e) => setD({ sellerType: e.target.value })}
                      className={selectClass}
                    >
                      {SELLER_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-white text-[#0d1f2d]">{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Ownership relationship</label>
                    <input
                      value={draft.ownershipRelationship}
                      onChange={(e) => setD({ ownershipRelationship: e.target.value })}
                      placeholder="e.g. Direct owner, trustee, power of attorney"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Internal contact reference</label>
                    <input
                      value={draft.internalContact}
                      onChange={(e) => setD({ internalContact: e.target.value })}
                      placeholder="e.g. Linked to Contact ID #1234"
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Seller notes</label>
                    <textarea
                      value={draft.sellerNotes}
                      onChange={(e) => setD({ sellerNotes: e.target.value })}
                      rows={2}
                      maxLength={600}
                      placeholder="Motivation, constraints, private instructions..."
                      className={`${textareaClass} min-h-[72px]`}
                    />
                  </div>
                </div>
              </div>

              {/* Private internal CRM */}
              <div>
                <p className={sectionTitleClass}>Private Internal CRM</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Commission</label>
                    <input
                      value={draft.commission}
                      onChange={(e) => setD({ commission: e.target.value })}
                      placeholder="e.g. 3% + 16% VAT"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Negotiation floor</label>
                    <input
                      value={draft.negotiationFloor}
                      onChange={(e) => setD({ negotiationFloor: e.target.value })}
                      placeholder="e.g. KSh 22M"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Internal valuation</label>
                    <input
                      value={draft.internalValuation}
                      onChange={(e) => setD({ internalValuation: e.target.value })}
                      placeholder="e.g. KSh 24M"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Legal concerns</label>
                    <textarea
                      value={draft.legalConcerns}
                      onChange={(e) => setD({ legalConcerns: e.target.value })}
                      rows={2}
                      maxLength={600}
                      placeholder="Encumbrance, dispute, caveat..."
                      className={`${textareaClass} min-h-[72px]`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Follow-up notes</label>
                    <textarea
                      value={draft.followUpNotes}
                      onChange={(e) => setD({ followUpNotes: e.target.value })}
                      rows={2}
                      maxLength={600}
                      placeholder="Next steps / follow-up"
                      className={`${textareaClass} min-h-[72px]`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2.5 p-4 rounded-lg border border-[#2c4a5e] bg-[#0a1f2c]">
                <i className="ri-lock-line text-[#5eea9a] text-base shrink-0" />
                <p className="text-[12px] text-[#a9c0cf] leading-relaxed">
                  This section is stored in the database but never read by the public site — only logged-in admin &amp; agent users see it.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#088135] hover:bg-[#065a27] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-save-line text-base" />
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}