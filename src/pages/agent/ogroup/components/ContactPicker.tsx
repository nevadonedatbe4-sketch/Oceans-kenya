import { useEffect, useRef, useState } from 'react';
import {
  searchContactsRanked,
  createContactDeduped,
  contactDisplayName,
  contactSubtitle,
  type ContactOption,
} from '../appointmentLookups';

interface Props {
  selected: ContactOption[];
  onChange: (contacts: ContactOption[]) => void;
  /** The acting user id — used both for contact ownership and to rank "My Contacts" first. */
  agentId?: string | null;
  label?: string;
}

const CONTACT_TYPES = ['Buyer', 'Tenant', 'Landlord', 'Seller', 'Other'];

const INPUT = 'w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-white';

/**
 * Search existing applicants, or add a new one — never creating a duplicate.
 *
 * Results are GROUPED:
 *   • My Contacts  — contacts the agent owns / manages
 *   • Shared contacts — the wider authorised pool
 */
export default function ContactPicker({ selected, onChange, agentId, label = 'Applicants / contacts' }: Props) {
  const [term, setTerm] = useState('');
  const [mineResults, setMineResults] = useState<ContactOption[]>([]);
  const [otherResults, setOtherResults] = useState<ContactOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [dedupeNote, setDedupeNote] = useState<string | null>(null);
  const skip = useRef(false);

  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', company: '', type: 'Buyer', notes: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const clearResults = () => { setMineResults([]); setOtherResults([]); };

  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    if (!open) return;
    if (term.trim().length < 2) { clearResults(); return; }
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const { mine, others } = await searchContactsRanked(term, agentId);
        if (active) { setMineResults(mine); setOtherResults(others); setLoading(false); }
      } catch {
        if (active) { clearResults(); setLoading(false); }
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [term, open, agentId]);

  const add = (c: ContactOption) => {
    if (!selected.some((s) => s.id === c.id)) onChange([...selected, c]);
    skip.current = true;
    setTerm('');
    clearResults();
    setOpen(false);
    setShowNew(false);
  };

  const remove = (id: string) => onChange(selected.filter((s) => s.id !== id));

  const saveNew = async () => {
    if (!form.first_name.trim()) { setErr('A first name is required.'); return; }
    if (!form.email.trim() && !form.phone.trim()) { setErr('Add an email or phone number.'); return; }
    setSaving(true);
    setErr(null);
    try {
      const { contact, deduped } = await createContactDeduped(
        {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          company: form.company.trim(),
          type: form.type,
          notes: form.notes.trim(),
        },
        agentId,
      );
      add(contact);
      setForm({ first_name: '', last_name: '', email: '', phone: '', company: '', type: 'Buyer', notes: '' });
      if (deduped) {
        setDedupeNote(`${contactDisplayName(contact)} already existed — linked the existing contact instead of duplicating.`);
        setTimeout(() => setDedupeNote(null), 5000);
      }
    } catch (e) {
      setErr((e as Error).message || 'Could not save the contact.');
    } finally {
      setSaving(false);
    }
  };

  const optionRow = (c: ContactOption, isMine: boolean) => (
    <button key={c.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(c)} className="w-full text-left px-3 py-2 hover:bg-neutral-50 cursor-pointer border-b border-neutral-50 last:border-b-0">
      <span className="flex items-center gap-2">
        <span className="block text-sm text-neutral-800 truncate">{contactDisplayName(c)}</span>
        {isMine && <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-teal-600 text-white font-semibold">My contact</span>}
      </span>
      <span className="block text-[11px] text-neutral-400 truncate">{contactSubtitle(c)}</span>
    </button>
  );

  const noResults = mineResults.length === 0 && otherResults.length === 0;

  return (
    <div>
      <label className="block text-xs font-medium text-neutral-500 mb-1">{label}</label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-medium text-teal-700">
              <i className="ri-user-3-line text-[11px]" />
              {contactDisplayName(c)}
              <button type="button" onClick={() => remove(c.id)} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-teal-100 cursor-pointer"><i className="ri-close-line text-[11px]" /></button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300 text-sm" />
        <input
          value={term}
          onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="Search by name, phone, email or company…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-white"
        />
        {open && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-neutral-100 rounded-lg shadow-xl max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-2.5 text-xs text-neutral-400 flex items-center gap-2"><i className="ri-loader-4-line animate-spin" /> Searching contacts…</div>
            ) : noResults ? (
              <div className="px-3 py-2.5 text-xs text-neutral-400">
                {term.trim().length < 2 ? 'Start typing to search existing contacts…' : 'No matching contacts.'}
              </div>
            ) : (
              <>
                {mineResults.length > 0 && (
                  <>
                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-teal-700 bg-teal-50/70">My Contacts</p>
                    {mineResults.map((c) => optionRow(c, true))}
                  </>
                )}
                {otherResults.length > 0 && (
                  <>
                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 bg-neutral-50">Shared contacts</p>
                    {otherResults.map((c) => optionRow(c, false))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <button type="button" onClick={() => setShowNew((v) => !v)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 cursor-pointer">
        <i className={showNew ? 'ri-subtract-line' : 'ri-add-line'} /> Add new contact
      </button>

      {dedupeNote && (
        <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-700 flex items-start gap-1.5">
          <i className="ri-information-line mt-0.5" /><span>{dedupeNote}</span>
        </div>
      )}

      {showNew && (
        <div className="mt-2 rounded-xl border border-neutral-100 bg-neutral-50/60 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="First name *" className={INPUT} />
            <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Last name" className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className={INPUT} />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company" className={INPUT} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={INPUT}>
              {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className={INPUT} />
          {err && <p className="text-[11px] text-red-500">{err}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowNew(false); setErr(null); }} className="px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 cursor-pointer whitespace-nowrap">Cancel</button>
            <button type="button" onClick={saveNew} disabled={saving} className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 cursor-pointer disabled:opacity-50 whitespace-nowrap">
              {saving ? 'Saving…' : 'Save contact'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}