import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export interface SourceContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  type: string | null;
  tags: string[] | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  sourceContactId: string;
  onLink: (contact: SourceContact | null) => void;
  linkedName?: string;
  linkedEmail?: string;
  linkedPhone?: string;
}

/* Mirrors the main CRM contact-type palette for consistent source chips. */
const TYPE_TINTS: Record<string, { color: string; label: string; icon: string }> = {
  client: { color: '#6b7280', label: 'Client', icon: 'ri-user-line' },
  landlord: { color: '#0d5959', label: 'Landlord', icon: 'ri-home-2-line' },
  buyer: { color: '#088135', label: 'Buyer', icon: 'ri-shopping-bag-3-line' },
  seller: { color: '#f58300', label: 'Seller', icon: 'ri-funds-line' },
  partner: { color: '#0ea5e9', label: 'Partner / Investor', icon: 'ri-user-star-line' },
  vendor: { color: '#ec4899', label: 'Vendor / Developer', icon: 'ri-tools-line' },
};

function getTypeTint(type: string | null) {
  return TYPE_TINTS[type || 'client'] || TYPE_TINTS.client;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) || '';
  const last = parts[1]?.charAt(0) || '';
  return (first + last).toUpperCase() || '?';
}

export default function LandSourceLink({ sourceContactId, onLink, linkedName, linkedEmail, linkedPhone }: Props) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<SourceContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<string>('');
  const navigate = useNavigate();

  const runSearch = async (term: string) => {
    searchRef.current = term;
    setLoading(true);
    let q = supabase.from('contacts').select('*').order('created_at', { ascending: false }).limit(80);
    if (term.trim()) {
      const t = term.trim();
      q = q.or(`name.ilike.%${t}%,email.ilike.%${t}%,phone.ilike.%${t}%`);
    }
    const { data } = await q;
    if (searchRef.current !== term) return; // drop stale responses
    setContacts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) runSearch('');
  }, [open]);

  const handleSelect = (c: SourceContact) => {
    onLink(c);
    setOpen(false);
  };

  const handleClear = () => {
    onLink(null);
  };

  const isLinked = Boolean(sourceContactId) && Boolean(linkedName);

  return (
    <div>
      {/* Linked source details */}
      {isLinked ? (
        <div className="rounded-lg border border-[#2c4a5e] bg-[#0a1f2c] p-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => { if (sourceContactId) navigate('/admin/contacts'); }}
              className="w-11 h-11 rounded-full bg-[#088135] flex items-center justify-center shrink-0 hover:bg-[#065a27] transition-colors cursor-pointer"
              title="Open in CRM Contacts"
            >
              <span className="text-white text-sm font-bold">{getInitials(linkedName || '')}</span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => { if (sourceContactId) navigate('/admin/contacts'); }}
                  className="text-[17px] font-roboto font-semibold text-[#eaf2f6] hover:text-[#5eea9a] transition-colors cursor-pointer text-left"
                >
                  {linkedName}
                </button>
                {linkedName && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#088135]/30 text-[#5eea9a] text-[12px] font-roboto font-semibold">
                    <i className="ri-link-m" /> Linked to Source
                  </span>
                )}
              </div>
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
                  onClick={() => { if (sourceContactId) navigate('/admin/contacts'); }}
                  className="mt-1 inline-flex items-center gap-1 text-[12px] font-roboto font-semibold text-[#8ad6ea] hover:text-white transition-colors cursor-pointer"
                >
                  <i className="ri-external-link-line text-[11px]" /> Open in CRM Contacts
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
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

      {/* Link to Source button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#088135] border border-[#088135]/60 text-white text-[15px] font-roboto font-semibold hover:bg-[#065a27] transition-colors cursor-pointer whitespace-nowrap"
      >
        <i className="ri-link-m text-base" />
        {isLinked ? 'Change Source' : 'Link to Source'}
      </button>

      {/* Source picker modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-lg mx-auto shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0d5959]/10 flex items-center justify-center">
                  <i className="ri-link-m text-[#0d5959] text-base" />
                </div>
                <div>
                  <h4 className="font-jost text-base font-semibold text-[#0d1f2d]">Link to Source</h4>
                  <p className="text-[12px] font-roboto text-[#7a8a99]">Choose an existing contact as this listing's source / seller</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-md text-[#7a8a99] hover:text-[#0d1f2d] hover:bg-[#f7f8fa] transition-colors cursor-pointer">
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
                  className="w-full pl-9 pr-4 py-2.5 border border-[#e5e7eb] rounded-lg text-base font-roboto text-[#0d1f2d] focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white placeholder:text-[#9ba5b1]"
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
                  <p className="text-[12px] font-roboto text-[#9ba5b1] mt-0.5">Try a different search, or add the contact in the CRM first.</p>
                </div>
              ) : (
                contacts.map((c) => {
                  const tint = getTypeTint(c.type);
                  const isSelected = c.id === sourceContactId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { if (!isSelected) handleSelect(c); else setOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                        isSelected ? 'bg-[#0d5959]/10' : 'hover:bg-[#f7f8fa]/70'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#0d5959]/8 flex items-center justify-center shrink-0">
                        <span className="text-[#0d5959] text-xs font-semibold">{getInitials(c.name)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-roboto text-[#0d1f2d] font-medium truncate">{c.name}</p>
                        <p className="text-[12px] font-roboto text-[#636363] truncate">
                          {[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact info'}
                        </p>
                      </div>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold shrink-0"
                        style={{ backgroundColor: `${tint.color}18`, color: tint.color }}
                      >
                        <i className={`${tint.icon} text-[9px]`} />
                        {tint.label}
                      </span>
                      {isSelected && <i className="ri-check-line text-[#0d5959] text-base shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-4 py-3 border-t border-[#e5e7eb] text-[12px] font-roboto text-[#9ba5b1]">
              Linking to a source preserves the seller → contact → listing continuity and avoids duplicate seller records.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}