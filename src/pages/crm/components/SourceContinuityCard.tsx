import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export interface ContinuityValues {
  contactId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  ownerRole: string;
  source: string;
  contactRef: string;
  sourceNotes: string;
}

interface Props {
  values: ContinuityValues;
  onChange: (patch: Partial<ContinuityValues>) => void;
  sellerLabel: string; // 'Seller' | 'Owner' | 'Developer'
  sellerTypeOptions?: { value: string; label: string }[];
  sourceOptions?: { value: string; label: string }[];
  roleOptions?: { value: string; label: string }[];
}

/* Dark continuity theme — the only dark card on the Review & Publish page. */
const DARK_BG = 'bg-[#0d1f2d]';
const DARK_BORDER = 'border-[#2c4a5e]';
const DARK_PANEL = 'bg-[#0a1f2c]';
const DARK_PANEL_BORDER = 'border-[#27414f]';

const LABEL = 'block text-[#e6f0f4] font-roboto text-[14px] font-semibold mb-2';
const INPUT =
  'w-full border border-[#2c4a5e] px-4 py-3 text-[17px] font-roboto text-[#eaf2f6] placeholder:text-[#7d93a3] focus:outline-none focus:border-[#088135] focus:ring-2 focus:ring-[#088135]/30 rounded-lg bg-[#0a1f2c]';
const TEXTAREA = `${INPUT} resize-none`;
const SELECT =
  `${INPUT} appearance-none cursor-pointer ` +
  "bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a9c0cf%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px] pr-11";

const DEFAULT_SELLER_TYPES = [
  { value: '', label: 'Select type' },
  { value: 'private_owner', label: 'Private owner' },
  { value: 'agent', label: 'Agent / broker' },
  { value: 'developer', label: 'Developer' },
  { value: 'family_estate', label: 'Family estate' },
  { value: 'institution', label: 'Institution' },
  { value: 'company', label: 'Company' },
];

const DEFAULT_SOURCE_OPTIONS = [
  { value: '', label: 'Where did this come from?' },
  { value: 'referral', label: 'Referral' },
  { value: 'walk_in', label: 'Walk-in / office' },
  { value: 'website', label: 'Website enquiry' },
  { value: 'social', label: 'Social media' },
  { value: 'cold_call', label: 'Cold outreach' },
  { value: 'listing_feed', label: 'Listing feed' },
  { value: 'other', label: 'Other' },
];

function DarkSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string;
}) {
  const hasValue = options.some((o) => o.value === value);
  return (
    <select value={hasValue ? value : ''} onChange={(e) => onChange(e.target.value)} className={SELECT}>
      <option value="" className="bg-[#0d1f2d] text-[#7d93a3]">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#0d1f2d] text-[#eaf2f6]">{o.label}</option>
      ))}
    </select>
  );
}

interface SourceContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  type: string | null;
  source: string | null;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) || '';
  const last = parts[1]?.charAt(0) || '';
  return (first + last).toUpperCase() || '?';
}

export default function SourceContinuityCard({
  values,
  onChange,
  sellerLabel,
  sellerTypeOptions = DEFAULT_SELLER_TYPES,
  sourceOptions = DEFAULT_SOURCE_OPTIONS,
  roleOptions = DEFAULT_SELLER_TYPES,
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const [linkOpen, setLinkOpen] = useState(false);
  const [contacts, setContacts] = useState<SourceContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const linkedName = values.contactId ? values.ownerName : '';
  const linkedEmail = values.contactId ? values.ownerEmail : '';
  const linkedPhone = values.contactId ? values.ownerPhone : '';

  const runSearch = async (term: string) => {
    setLoading(true);
    let q = supabase.from('contacts').select('*').order('created_at', { ascending: false }).limit(80);
    if (term.trim()) {
      const t = term.trim();
      q = q.or(`name.ilike.%${t}%,email.ilike.%${t}%,phone.ilike.%${t}%`);
    }
    const { data } = await q;
    setContacts(data || []);
    setLoading(false);
  };

  const openLink = () => {
    setLinkOpen(true);
    runSearch('');
  };

  const handleLink = (contact: SourceContact | null) => {
    if (contact) {
      onChange({
        contactId: contact.id,
        ownerName: contact.name || values.ownerName,
        ownerEmail: contact.email || values.ownerEmail,
        ownerPhone: contact.phone || values.ownerPhone,
        source: contact.source || values.source,
        contactRef: contact.name || values.contactRef,
      });
    } else {
      onChange({ contactId: '' });
    }
  };

  const summary = linkedName
    ? `Linked: ${linkedName} · CRM Contact`
    : 'No source linked';

  return (
    <div className={`${DARK_BG} ${DARK_BORDER} border rounded-xl overflow-hidden flex flex-col h-full`}>
      {/* Collapsed header — compact summary */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#12293a] transition-colors cursor-pointer text-left"
      >
        <div className="w-9 h-9 flex items-center justify-center shrink-0 bg-[#088135] rounded-lg">
          <i className="ri-link-m text-white text-base" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-jost text-[15px] font-bold text-white uppercase tracking-[0.4px]">Source &amp; Continuity</h4>
          <p className="text-[13px] font-roboto text-[#a9c0cf] mt-0.5 truncate">
            {open ? `Private continuity between ${sellerLabel.toLowerCase()} → contact → listing` : summary}
          </p>
        </div>
        <i className={`ri-arrow-down-s-line text-[#a9c0cf] text-xl transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 py-5 space-y-6 border-t border-white/10">
          {/* Link to Source */}
          <div>
            <label className={LABEL}>{sellerLabel} / Source</label>
            {linkedName ? (
              <div className="rounded-lg border border-[#2c4a5e] bg-[#0a1f2c] p-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/contacts')}
                    className="w-11 h-11 rounded-full bg-[#088135] flex items-center justify-center shrink-0 hover:bg-[#065a27] transition-colors cursor-pointer"
                    title="Open in CRM Contacts"
                  >
                    <span className="text-white text-sm font-bold">{getInitials(linkedName)}</span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => navigate('/admin/contacts')}
                      className="text-[17px] font-roboto font-semibold text-[#eaf2f6] hover:text-[#5eea9a] transition-colors cursor-pointer text-left"
                    >
                      {linkedName}
                    </button>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#088135]/30 text-[#5eea9a] text-[12px] font-roboto font-semibold">
                      <i className="ri-link-m" /> Linked Contact
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {linkedEmail && (
                        <p className="flex items-center gap-1.5 text-[14px] font-roboto text-[#8fa9b8]">
                          <i className="ri-mail-line text-[13px]" /> {linkedEmail}
                        </p>
                      )}
                      {linkedPhone && (
                        <p className="flex items-center gap-1.5 text-[14px] font-roboto text-[#8fa9b8]">
                          <i className="ri-phone-line text-[13px]" /> {linkedPhone}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate('/admin/contacts')}
                        className="mt-1 inline-flex items-center gap-1 text-[12px] font-roboto font-semibold text-[#8ad6ea] hover:text-white transition-colors cursor-pointer"
                      >
                        <i className="ri-external-link-line text-[11px]" /> Open in CRM Contacts
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLink(null)}
                    className="p-1.5 rounded-md text-[#8fa9b8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Unlink source"
                  >
                    <i className="ri-link-unlink-m text-base" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#2c4a5e] bg-[#0a1f2c] p-4 text-center">
                <i className="ri-link-m text-[#8fa9b8] text-xl" />
                <p className="mt-1 text-[14px] font-roboto text-[#8fa9b8]">No source linked yet</p>
              </div>
            )}
            <button
              type="button"
              onClick={openLink}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#088135] border border-[#088135]/60 text-white text-[15px] font-roboto font-semibold hover:bg-[#065a27] transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-link-m text-base" />
              {linkedName ? 'Change Source' : 'Link to Source'}
            </button>
            <p className="mt-2 text-[13px] font-roboto text-[#a9c0cf] leading-relaxed">
              Link the originating contact record to keep the {sellerLabel.toLowerCase()} → contact → listing chain intact. Entering a {sellerLabel.toLowerCase()} with no match auto-creates a CRM contact.
            </p>
          </div>

          {/* Linked source details */}
          <div className={`rounded-lg border ${DARK_PANEL_BORDER} ${DARK_PANEL} p-4`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 flex items-center justify-center rounded-md bg-[#088135]/25">
                <i className="ri-user-line text-[13px] text-[#5eea9a]" />
              </span>
              <p className="text-[13px] font-roboto font-bold uppercase tracking-wide text-[#8fa9b8]">{sellerLabel} details</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Name / contact</label>
                <input value={values.ownerName} onChange={(e) => onChange({ ownerName: e.target.value })} placeholder="e.g. John Doe" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Phone</label>
                <input value={values.ownerPhone} onChange={(e) => onChange({ ownerPhone: e.target.value })} placeholder="+254 7XX XXX XXX" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Email</label>
                <input type="email" value={values.ownerEmail} onChange={(e) => onChange({ ownerEmail: e.target.value })} placeholder="owner@email.com" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Type</label>
                <DarkSelect value={values.ownerRole} onChange={(v) => onChange({ ownerRole: v })} options={roleOptions.filter((o) => o.value !== '')} placeholder="Select type" />
              </div>
              <div>
                <label className={LABEL}>Source</label>
                <DarkSelect value={values.source} onChange={(v) => onChange({ source: v })} options={sourceOptions.filter((o) => o.value !== '')} placeholder="Lead source" />
              </div>
              <div>
                <label className={LABEL}>Internal contact reference</label>
                <input value={values.contactRef} onChange={(e) => onChange({ contactRef: e.target.value })} placeholder="e.g. Linked to Contact ID #1234" className={INPUT} />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL}>Source notes</label>
                <textarea value={values.sourceNotes} onChange={(e) => onChange({ sourceNotes: e.target.value })} rows={2} maxLength={600} placeholder="Motivation, constraints, private instructions..." className={TEXTAREA} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link picker modal */}
      {linkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLinkOpen(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-lg mx-auto overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0d5959]/10 flex items-center justify-center">
                  <i className="ri-link-m text-[#0d5959] text-base" />
                </div>
                <div>
                  <h4 className="font-jost text-base font-semibold text-[#0d1f2d]">Link to Source</h4>
                  <p className="text-[12px] font-roboto text-[#7a8a99]">Choose an existing contact as this listing's source / {sellerLabel.toLowerCase()}</p>
                </div>
              </div>
              <button onClick={() => setLinkOpen(false)} className="p-1.5 rounded-md text-[#7a8a99] hover:text-[#0d1f2d] hover:bg-[#f7f8fa] transition-colors cursor-pointer">
                <i className="ri-close-line text-lg" />
              </button>
            </div>

            <div className="p-4 border-b border-[#e5e7eb]">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#9ba5b1] text-sm" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); runSearch(e.target.value); }}
                  placeholder="Search contacts by name, email or phone…"
                  className="w-full pl-9 pr-4 py-2.5 border border-[#e5e7eb] rounded-lg text-sm font-roboto text-[#0d1f2d] focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white placeholder:text-[#9ba5b1]"
                />
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto p-2">
              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f7f8fa] animate-pulse" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-28 bg-[#f7f8fa] rounded animate-pulse" />
                        <div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-[#0d5959]/8 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-contacts-line text-[#0d5959] text-xl" />
                  </div>
                  <p className="text-sm font-roboto text-[#636363]">No contacts match</p>
                  <p className="text-[12px] font-roboto text-[#9ba5b1] mt-0.5">Save the listing and a contact auto-creates from the {sellerLabel.toLowerCase()} details.</p>
                </div>
              ) : (
                contacts.map((c) => {
                  const isSelected = c.id === values.contactId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { handleLink(c); setLinkOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                        isSelected ? 'bg-[#0d5959]/10' : 'hover:bg-[#f7f8fa]/70'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#0d5959]/8 flex items-center justify-center shrink-0">
                        <span className="text-[#0d5959] text-xs font-semibold">{getInitials(c.name)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-roboto text-[#0d1f2d] font-medium truncate">{c.name}</p>
                        <p className="text-[12px] font-roboto text-[#636363] truncate">
                          {[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact info'}
                        </p>
                      </div>
                      {isSelected && <i className="ri-check-line text-[#0d5959] text-base shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-4 py-3 border-t border-[#e5e7eb] text-[12px] font-roboto text-[#9ba5b1]">
              Linking to a source preserves the {sellerLabel.toLowerCase()} → contact → listing continuity and avoids duplicate records.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}