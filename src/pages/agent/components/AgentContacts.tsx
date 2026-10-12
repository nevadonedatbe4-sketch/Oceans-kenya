import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Plus, Search, Trash2, Pencil, X, Users } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  tags: string | null;
  notes: string | null;
  created_at: string;
}

interface ContactMeta {
  kind: string;
  company: string;
  jobTitle: string;
  address: string;
  website: string;
  plainTags: string[];
}

type SortKey = 'name' | 'updated';

/**
 * "Kind of contact" — the role this person plays in the agent's world.
 * Mirrors the admin CRM contact-role palette (no blue/purple).
 */
const CONTACT_KINDS = [
  { value: 'client', label: 'Client / Buyer', icon: 'ri-user-line', color: '#6b7280' },
  { value: 'seller', label: 'Seller', icon: 'ri-home-smile-line', color: '#0d5959' },
  { value: 'landlord', label: 'Landlord', icon: 'ri-home-2-line', color: '#0d5959' },
  { value: 'tenant', label: 'Tenant', icon: 'ri-user-received-line', color: '#c2410c' },
  { value: 'agent', label: 'Agent Colleague', icon: 'ri-user-star-line', color: '#be123c' },
  { value: 'lawyer', label: 'Lawyer', icon: 'ri-scales-3-line', color: '#4b5563' },
  { value: 'caretaker', label: 'Caretaker', icon: 'ri-user-settings-line', color: '#c2410c' },
  { value: 'property_manager', label: 'Property Manager', icon: 'ri-building-2-line', color: '#b08d2a' },
  { value: 'developer', label: 'Developer', icon: 'ri-building-4-line', color: '#92400e' },
  { value: 'surveyor', label: 'Surveyor', icon: 'ri-ruler-2-line', color: '#088135' },
  { value: 'valuer', label: 'Valuer', icon: 'ri-line-chart-line', color: '#088135' },
  { value: 'banker', label: 'Banker / Mortgage', icon: 'ri-bank-line', color: '#b08d2a' },
  { value: 'contractor', label: 'Contractor / Artisan', icon: 'ri-tools-line', color: '#92400e' },
  { value: 'supplier', label: 'Supplier', icon: 'ri-truck-line', color: '#4b5563' },
  { value: 'other', label: 'Other', icon: 'ri-user-3-line', color: '#6b7280' },
];

const FALLBACK_KIND = { value: '', label: 'Not set', icon: 'ri-user-3-line', color: '#9ca3af' };

function kindInfo(value: string) {
  return CONTACT_KINDS.find((k) => k.value === value) || FALLBACK_KIND;
}

/**
 * Structured values are stored as prefixed tags so the extra fields survive
 * without a database change — the same trick the admin contact form uses for
 * Job title and Website.
 */
const STRUCT_PREFIXES = ['kind:', 'co:', 'title:', 'addr:', 'web:'];

function splitTags(raw: string | null | undefined): string[] {
  return (raw || '').split(',').map((t) => t.trim()).filter(Boolean);
}

function tagValue(list: string[], prefix: string): string {
  const found = list.find((t) => t.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : '';
}

function visibleTags(list: string[]): string[] {
  return list.filter((t) => !STRUCT_PREFIXES.some((p) => t.startsWith(p)));
}

function contactMeta(c: Contact): ContactMeta {
  const list = splitTags(c.tags);
  return {
    kind: tagValue(list, 'kind:'),
    company: tagValue(list, 'co:'),
    jobTitle: tagValue(list, 'title:'),
    address: tagValue(list, 'addr:'),
    website: tagValue(list, 'web:'),
    plainTags: visibleTags(list),
  };
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  kind: '',
  company: '',
  jobTitle: '',
  address: '',
  website: '',
  source: '',
  tags: '',
  notes: '',
};

const PAGE_STEP = 25;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'updated', label: 'Updated' },
];

/** Grouped section wrapper with a clear heading — mirrors the admin contact form. */
function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section className="border-t border-[#eef1f4] first:border-t-0 pt-5 mt-5 first:pt-0 first:mt-0">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0d5959]/10 text-[#0d5959] flex-shrink-0">
          <i className={`${icon} text-lg`} />
        </span>
        <h4 className="admin-subheading text-[#001731]">{title}</h4>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block admin-label font-medium text-[#001731] mb-1.5">
      {children} {required && <span className="text-[#dc2626]">*</span>}
    </label>
  );
}

/**
 * AGENT PORTAL — My Contacts.
 * The agent's OWN private contact book (agent_contacts), presented with the
 * exact same table treatment as the admin CRM Contacts table so the agent CRM
 * is visually consistent: dark navy header row, checkbox selection, bulk bar,
 * avatar rows and load-more pagination. The Add/Edit dialog mirrors the admin
 * ContactFormModal (icon header, grouped sections, tag chips, footer bar).
 *
 * Contacts now carry a "kind of contact" role plus company / job title /
 * address / website. These extra fields are stored as structured prefixed tags
 * inside the existing `tags` column (no schema change required).
 */
export default function AgentContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('agent_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (fetchError) throw new Error(fetchError.message);
      setContacts(data || []);
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err?.message || 'Failed to load contacts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = contacts.filter((c) => {
      if (kindFilter && contactMeta(c).kind !== kindFilter) return false;
      if (!q) return true;
      const haystack = [c.name, c.email, c.phone, c.source, c.tags, c.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
    const sorted = [...base].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    return sortDir === 'asc' ? sorted : sorted.reverse();
  }, [contacts, query, kindFilter, sortKey, sortDir]);

  const shown = filtered.slice(0, visibleCount);
  const remaining = filtered.length - shown.length;
  const allShownSelected = shown.length > 0 && shown.every((c) => selectedIds.has(c.id));

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return 'ri-arrow-up-down-line text-white/45';
    return sortDir === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc';
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = (checked: boolean) => setSelectedIds(checked ? new Set(shown.map((c) => c.id)) : new Set());

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setTagInput('');
    setModalOpen(true);
  };

  const openEdit = (c: Contact) => {
    const meta = contactMeta(c);
    setEditing(c);
    setForm({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      kind: meta.kind,
      company: meta.company,
      jobTitle: meta.jobTitle,
      address: meta.address,
      website: meta.website,
      source: c.source || '',
      tags: meta.plainTags.join(', '),
      notes: c.notes || '',
    });
    setErrors({});
    setTagInput('');
    setModalOpen(true);
  };

  /** Combine the visible tags + the structured fields into the stored tags string. */
  const buildTagsValue = () => {
    const parts = splitTags(form.tags);
    if (form.kind) parts.push(`kind:${form.kind}`);
    if (form.company.trim()) parts.push(`co:${form.company.trim()}`);
    if (form.jobTitle.trim()) parts.push(`title:${form.jobTitle.trim()}`);
    if (form.address.trim()) parts.push(`addr:${form.address.trim()}`);
    if (form.website.trim()) parts.push(`web:${form.website.trim()}`);
    return parts.length ? parts.join(', ') : null;
  };

  const handleSave = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'A contact name is required';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSaving(true);
    setToast(null);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        source: form.source.trim() || null,
        tags: buildTagsValue(),
        notes: form.notes.trim() || null,
      };
      if (editing) {
        await supabase.from('agent_contacts').update({
          ...payload,
          updated_at: new Date().toISOString(),
        }).eq('id', editing.id);
        setToast({ type: 'success', text: 'Contact updated.' });
      } else {
        await supabase.from('agent_contacts').insert({
          user_id: user?.id,
          agent_id: user?.id,
          ...payload,
        });
        setToast({ type: 'success', text: 'Contact added to your book.' });
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setToast({ type: 'error', text: err?.message || 'Failed to save contact.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setToast(null);
    try {
      await supabase.from('agent_contacts').delete().eq('id', id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setToast({ type: 'success', text: 'Contact removed.' });
    } catch (err: any) {
      setToast({ type: 'error', text: err?.message || 'Failed to delete contact.' });
    } finally {
      setDeletingId(null);
    }
  };

  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkDeleting(true);
    setToast(null);
    try {
      const { error: delErr } = await supabase.from('agent_contacts').delete().in('id', ids);
      if (delErr) throw new Error(delErr.message);
      setContacts((prev) => prev.filter((c) => !ids.includes(c.id)));
      setSelectedIds(new Set());
      setToast({ type: 'success', text: `Deleted ${ids.length} contact${ids.length === 1 ? '' : 's'}.` });
    } catch (err: any) {
      setToast({ type: 'error', text: err?.message || 'Failed to delete contacts.' });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Admin-mirrored form field styling.
  const inputBase = 'w-full px-3.5 py-2.5 border rounded-lg font-roboto transition-colors focus:outline-none focus:ring-1 bg-white';
  const inputOk = 'border-[#e5e7eb] focus:border-[#0d5959] focus:ring-[#0d5959]/25';
  const inputErr = 'border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]/25';

  const tagList = splitTags(form.tags);
  const initials = (form.name.trim() || 'New').split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');

  const addTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    const existing = splitTags(form.tags);
    if (existing.includes(value)) {
      setTagInput('');
      return;
    }
    setForm((f) => ({ ...f, tags: [...existing, value].join(', ') }));
    setTagInput('');
  };

  const removeTag = (t: string) => {
    const next = splitTags(form.tags).filter((x) => x !== t);
    setForm((f) => ({ ...f, tags: next.join(', ') }));
  };

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`flex items-start gap-2 text-sm px-4 py-3 rounded-lg font-roboto ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.type === 'success' ? <Users size={16} className="mt-0.5 flex-shrink-0" /> : <X size={16} className="mt-0.5 flex-shrink-0" />}
          {toast.text}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setVisibleCount(PAGE_STEP); }}
            placeholder="Search contacts…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-gray-400"
          />
        </div>
        <div className="relative sm:w-56">
          <i className="ri-filter-3-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
          <select
            value={kindFilter}
            onChange={(e) => { setKindFilter(e.target.value); setVisibleCount(PAGE_STEP); }}
            className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent cursor-pointer appearance-none"
          >
            <option value="">All kinds</option>
            {CONTACT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
        </div>
        <button onClick={openAdd} className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-[#0a4a4a] text-white px-4 py-2.5 rounded-md text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap sm:ml-auto">
          <Plus size={16} /> Add contact
        </button>
      </div>

      {/* Card + table */}
      <section className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3 bg-[#f7f9fb] border-b border-[#eef1f4]">
            <span className="text-xs font-semibold text-[#001731]">
              {selectedIds.size} of {filtered.length} contacts selected.
            </span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 ml-auto">
              <span className="text-xs font-semibold text-[#001731]/60">Bulk Actions:</span>
              <button
                type="button"
                onClick={bulkDelete}
                disabled={bulkDeleting}
                className="text-sm font-semibold text-[#dc2626] underline-offset-2 hover:underline transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-sm font-medium text-[#001731] underline-offset-2 hover:underline transition-colors cursor-pointer whitespace-nowrap"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {error ? (
          <div className="p-10 text-center">
            <p className="text-sm font-roboto text-red-600">{error}</p>
            <button onClick={load} className="mt-3 inline-flex items-center gap-2 text-sm font-roboto font-semibold text-accent hover:underline cursor-pointer">Retry</button>
          </div>
        ) : loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="font-roboto font-semibold text-[#1a1a2e]">{query || kindFilter ? 'No contacts match your filters.' : 'No contacts yet.'}</p>
            <p className="text-sm text-gray-500 font-roboto mt-1">{query || kindFilter ? 'Try a different keyword or kind.' : 'Add buyers, sellers and clients to keep your personal database organised.'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto big-scroll-x">
              <table className="w-full min-w-[1020px] border-collapse">
                <thead>
                  <tr className="bg-[#001731] text-white">
                    <th className="w-12 pl-4 pr-2 py-4 align-middle">
                      <input
                        type="checkbox"
                        checked={allShownSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                        aria-label="Select all contacts"
                        className="w-4 h-4 accent-white cursor-pointer"
                      />
                    </th>
                    <th className="py-4 pr-4 text-left align-middle">
                      <button type="button" onClick={() => handleSort('name')} className="inline-flex items-center gap-1.5 uppercase tracking-wide text-xs font-bold text-white hover:text-white/80 transition-colors cursor-pointer whitespace-nowrap">
                        Name <i className={`${sortIcon('name')} text-base`} />
                      </button>
                    </th>
                    <th className="py-4 pr-4 text-left align-middle"><span className="uppercase tracking-wide text-xs font-bold text-white">Kind</span></th>
                    <th className="py-4 pr-4 text-left align-middle"><span className="uppercase tracking-wide text-xs font-bold text-white">Phone</span></th>
                    <th className="py-4 pr-4 text-left align-middle"><span className="uppercase tracking-wide text-xs font-bold text-white">Email Address</span></th>
                    <th className="py-4 pr-4 text-left align-middle"><span className="uppercase tracking-wide text-xs font-bold text-white">Source</span></th>
                    <th className="py-4 pr-4 text-left align-middle"><span className="uppercase tracking-wide text-xs font-bold text-white">Tags</span></th>
                    <th className="py-4 pr-4 text-left align-middle">
                      <button type="button" onClick={() => handleSort('updated')} className="inline-flex items-center gap-1.5 uppercase tracking-wide text-xs font-bold text-white hover:text-white/80 transition-colors cursor-pointer whitespace-nowrap">
                        Updated <i className={`${sortIcon('updated')} text-base`} />
                      </button>
                    </th>
                    <th className="w-24 pr-4 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1f4]">
                  {shown.map((c) => {
                    const meta = contactMeta(c);
                    const info = kindInfo(meta.kind);
                    const subtitle = [meta.company, meta.jobTitle].filter(Boolean).join(' · ') || c.notes;
                    return (
                      <tr key={c.id} className={`transition-colors ${selectedIds.has(c.id) ? 'bg-[#001731]/[0.04]' : 'hover:bg-[#f7f9fb]'}`}>
                        <td className="pl-4 pr-2 py-3.5 align-middle">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            aria-label={`Select ${c.name}`}
                            className="w-4 h-4 rounded border-[#d0d0d0] text-[#0d5959] focus:ring-[#0d5959] cursor-pointer"
                          />
                        </td>
                        <td className="pr-4 py-3.5 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#0d5959]/10 flex items-center justify-center flex-shrink-0">
                              <span className="font-roboto font-bold text-sm text-[#0d5959]">{c.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-roboto font-semibold text-sm text-[#001731] truncate">{c.name}</p>
                              {subtitle && <p className="text-xs text-gray-400 font-roboto truncate max-w-[220px]">{subtitle}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="pr-4 py-3.5 align-middle">
                          {meta.kind ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-roboto font-semibold whitespace-nowrap"
                              style={{ backgroundColor: `${info.color}1a`, color: info.color }}
                            >
                              <i className={`${info.icon} text-xs`} /> {info.label}
                            </span>
                          ) : <span className="text-gray-400 text-sm">—</span>}
                        </td>
                        <td className="pr-4 py-3.5 align-middle text-sm font-roboto text-[#1f2937] whitespace-nowrap">{c.phone || '—'}</td>
                        <td className="pr-4 py-3.5 align-middle text-sm font-roboto text-[#1f2937] whitespace-nowrap">{c.email || '—'}</td>
                        <td className="pr-4 py-3.5 align-middle">
                          {c.source
                            ? <span className="inline-flex px-2 py-0.5 rounded bg-[#001731]/5 text-xs font-roboto font-medium text-[#001731] capitalize">{c.source}</span>
                            : <span className="text-gray-400 text-sm">—</span>}
                        </td>
                        <td className="pr-4 py-3.5 align-middle">
                          {meta.plainTags.length ? (
                            <div className="flex flex-wrap gap-1">
                              {meta.plainTags.map((t) => (
                                <span key={t} className="inline-flex px-2 py-0.5 rounded bg-[#0d5959]/10 text-[11px] font-roboto font-medium text-[#0d5959]">{t}</span>
                              ))}
                            </div>
                          ) : <span className="text-gray-400 text-sm">—</span>}
                        </td>
                        <td className="pr-4 py-3.5 align-middle text-sm font-roboto text-gray-500 whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="pr-4 py-3.5 align-middle text-right">
                          <div className="inline-flex items-center gap-1">
                            <button onClick={() => openEdit(c)} className="p-2 rounded-md text-gray-400 hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer" title="Edit">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id} className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer" title="Delete">
                              {deletingId === c.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-5 py-3.5 border-t border-[#eef1f4]">
              <span className="text-xs text-[#001731]/55">Showing {shown.length} of {filtered.length} contacts</span>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((v) => v + PAGE_STEP)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-[#001731] border border-[#001731]/20 hover:bg-[#001731] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-add-line text-lg" />
                  Load {Math.min(remaining, PAGE_STEP)} more
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {/* Add / Edit modal — mirrors the admin ContactFormModal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-[#001731]/50" onClick={() => setModalOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editing ? 'Edit contact' : 'Add contact'}
            className="relative bg-white rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-[#eef1f4]">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#0d5959]/10 text-[#0d5959] flex-shrink-0">
                  <i className={`${editing ? 'ri-edit-line' : 'ri-user-add-line'} text-lg`} />
                </span>
                <h2 className="admin-heading text-[#001731]">{editing ? 'Edit Contact' : 'Add New Contact'}</h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-[#001731]/55 hover:text-[#001731] hover:bg-[#001731]/8 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 md:px-6 py-5">
              <Section title="Basic Information" icon="ri-user-line">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#0d5959]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#0d5959] text-xl font-bold">{initials}</span>
                  </div>
                  <div>
                    <p className="admin-label font-medium text-[#001731]">Photo / initials</p>
                    <p className="admin-meta text-[#001731]/50">Initials are generated automatically from the name.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label required>Name</Label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => set({ name: e.target.value })}
                      placeholder="e.g. Jane Muthoni"
                      className={`${inputBase} ${errors.name ? inputErr : inputOk}`}
                    />
                    {errors.name && <p className="admin-meta text-[#dc2626] mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => set({ phone: e.target.value })}
                      placeholder="e.g. +254 700 123 456"
                      className={`${inputBase} ${inputOk}`}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => set({ email: e.target.value })}
                      placeholder="e.g. jane@example.com"
                      className={`${inputBase} ${errors.email ? inputErr : inputOk}`}
                    />
                    {errors.email && <p className="admin-meta text-[#dc2626] mt-1">{errors.email}</p>}
                  </div>
                </div>
              </Section>

              <Section title="Role & Organization" icon="ri-building-2-line">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Kind of contact</Label>
                    <div className="relative">
                      <select
                        value={form.kind}
                        onChange={(e) => set({ kind: e.target.value })}
                        className={`${inputBase} ${inputOk} cursor-pointer appearance-none pr-9`}
                      >
                        <option value="">Select a kind…</option>
                        {CONTACT_KINDS.map((k) => (
                          <option key={k.value} value={k.value}>{k.label}</option>
                        ))}
                      </select>
                      <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
                    </div>
                    <p className="admin-meta text-[#001731]/45 mt-1">e.g. Lawyer, Agent colleague, Caretaker, Landlord, Tenant.</p>
                  </div>
                  <div>
                    <Label>Company</Label>
                    <input
                      type="text"
                      value={form.company}
                      onChange={(e) => set({ company: e.target.value })}
                      placeholder="e.g. ABC Holdings"
                      className={`${inputBase} ${inputOk}`}
                    />
                  </div>
                  <div>
                    <Label>Job title</Label>
                    <input
                      type="text"
                      value={form.jobTitle}
                      onChange={(e) => set({ jobTitle: e.target.value })}
                      placeholder="e.g. Director"
                      className={`${inputBase} ${inputOk}`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Source</Label>
                    <input
                      type="text"
                      value={form.source}
                      onChange={(e) => set({ source: e.target.value })}
                      placeholder="e.g. Listing enquiry, referral"
                      className={`${inputBase} ${inputOk}`}
                    />
                  </div>
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className={`${inputBase} ${inputOk} flex flex-wrap items-center gap-2 py-2`}>
                    {tagList.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full admin-meta bg-[#001731]/8 text-[#001731] capitalize"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-[#001731]/15 cursor-pointer"
                          aria-label={`Remove ${t}`}
                        >
                          <i className="ri-close-line text-sm" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      onBlur={addTag}
                      placeholder={tagList.length ? 'Add tag…' : 'e.g. vip, hot-lead'}
                      className="flex-1 min-w-[120px] bg-transparent border-0 focus:outline-none font-roboto admin-label py-1"
                    />
                  </div>
                </div>
              </Section>

              <Section title="Additional Information" icon="ri-information-line">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Address</Label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => set({ address: e.target.value })}
                      placeholder="e.g. Westlands, Nairobi"
                      className={`${inputBase} ${inputOk}`}
                    />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <input
                      type="url"
                      value={form.website}
                      onChange={(e) => set({ website: e.target.value })}
                      placeholder="e.g. https://example.com"
                      className={`${inputBase} ${inputOk}`}
                    />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => set({ notes: e.target.value })}
                    placeholder="Any relevant notes about this contact…"
                    rows={4}
                    maxLength={500}
                    className={`${inputBase} ${inputOk} resize-none`}
                  />
                  <p className="admin-meta text-[#001731]/45 mt-1 text-right">{form.notes.length}/500</p>
                </div>
              </Section>

              {toast && toast.type === 'error' && (
                <div className="flex items-start gap-2 text-sm px-4 py-3 rounded-lg font-roboto bg-red-50 text-red-700 border border-red-200 mt-5">
                  <i className="ri-error-warning-line text-base mt-0.5 flex-shrink-0" />
                  {toast.text}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 px-5 md:px-6 py-4 border-t border-[#eef1f4] bg-[#f7f9fb]">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg admin-label font-medium text-[#001731] border border-[#001731]/20 hover:bg-white transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg admin-label font-semibold text-white bg-[#001731] hover:bg-[#0d5959] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <i className="ri-check-line text-base" />
                    {editing ? 'Save Changes' : 'Add Contact'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}