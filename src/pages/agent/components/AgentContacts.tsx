import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Plus, Search, Mail, Phone, Tag, Trash2, Pencil, Save, X, Users, MessageSquare } from 'lucide-react';

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

const emptyForm = { name: '', email: '', phone: '', source: '', tags: '', notes: '' };

export default function AgentContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const filtered = contacts.filter((c) => {
    const q = query.toLowerCase();
    return !q || [c.name, c.email, c.phone, c.source, c.tags].filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', source: c.source || '', tags: c.tags || '', notes: c.notes || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setToast({ type: 'error', text: 'Please enter a contact name.' });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      if (editing) {
        await supabase.from('agent_contacts').update({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          source: form.source.trim() || null,
          tags: form.tags.trim() || null,
          notes: form.notes.trim() || null,
          updated_at: new Date().toISOString(),
        }).eq('id', editing.id);
        setToast({ type: 'success', text: 'Contact updated.' });
      } else {
        await supabase.from('agent_contacts').insert({
          user_id: user?.id,
          agent_id: user?.id,
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          source: form.source.trim() || null,
          tags: form.tags.trim() || null,
          notes: form.notes.trim() || null,
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
      setToast({ type: 'success', text: 'Contact removed.' });
    } catch (err: any) {
      setToast({ type: 'error', text: err?.message || 'Failed to delete contact.' });
    } finally {
      setDeletingId(null);
    }
  };

  const inputCls = 'w-full px-3.5 py-2.5 rounded-md border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-gray-400';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-[#e4e9e6] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#eef2f0] flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-accent" />
            </div>
            <div>
              <h3 className="font-roboto font-semibold text-[#1a1a2e]">My contact book</h3>
              <p className="text-sm text-gray-500 font-roboto">Your personal database of clients, buyers and sellers.</p>
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts…" className="w-full sm:w-56 pl-9 pr-3 py-2 rounded-md border border-gray-200 text-sm font-roboto text-[#1f2937] bg-white outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-gray-400" />
            </div>
            <button onClick={openAdd} className="inline-flex items-center gap-2 bg-accent hover:bg-[#0a4a4a] text-white px-4 py-2 rounded-md text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap">
              <Plus size={16} /> Add contact
            </button>
          </div>
        </div>

        {toast && (
          <div className={`mx-6 my-4 flex items-start gap-2 text-sm px-4 py-3 rounded-lg font-roboto ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {toast.type === 'success' ? <Users size={16} className="mt-0.5 flex-shrink-0" /> : <X size={16} className="mt-0.5 flex-shrink-0" />}
            {toast.text}
          </div>
        )}

        {error ? (
          <div className="p-8 text-center">
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
            <p className="font-roboto font-semibold text-[#1a1a2e]">{query ? 'No contacts match your search.' : 'No contacts yet.'}</p>
            <p className="text-sm text-gray-500 font-roboto mt-1">{query ? 'Try a different keyword.' : 'Add buyers, sellers and clients to keep your personal database organised.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-roboto font-semibold uppercase tracking-wider text-gray-400 border-b border-[#eef2f0]">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Tags</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f0]">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#fafbfa] transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-accent font-roboto font-bold text-sm">{c.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-roboto font-semibold text-sm text-[#1f2937] truncate">{c.name}</p>
                          {c.notes && <p className="text-xs text-gray-400 font-roboto truncate max-w-[220px]">{c.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1.5 text-sm font-roboto text-gray-600">{c.email || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1.5 text-sm font-roboto text-gray-600">{c.phone || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {c.source ? <span className="inline-flex px-2 py-0.5 rounded bg-[#f0f2f1] text-xs font-roboto font-medium text-gray-600">{c.source}</span> : <span className="text-gray-400 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {c.tags ? (
                        <div className="flex flex-wrap gap-1">
                          {c.tags.split(',').map((t) => (
                            <span key={t} className="inline-flex px-2 py-0.5 rounded bg-accent/10 text-[11px] font-roboto font-medium text-accent">{t.trim()}</span>
                          ))}
                        </div>
                      ) : <span className="text-gray-400 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#eef2f0] flex items-center justify-between">
              <h3 className="font-roboto font-semibold text-[#1a1a2e]">{editing ? 'Edit contact' : 'Add contact'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Contact name" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@example.com" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+254 7xx xxx xxx" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Source</label>
                  <input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="e.g. Listing enquiry" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tags (comma-sep)</label>
                  <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="buyer, serious, westlands" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} maxLength={500} placeholder="Personal notes about this contact…" className={`${inputCls} resize-none`} />
              </div>
              {toast && (
                <div className={`flex items-start gap-2 text-sm px-4 py-3 rounded-lg font-roboto ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  <MessageSquare size={15} className="mt-0.5 flex-shrink-0" />
                  {toast.text}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-md text-sm font-roboto font-semibold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 bg-accent hover:bg-[#0a4a4a] text-white px-4 py-2.5 rounded-md text-sm font-roboto font-semibold transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Saving…' : 'Save contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}