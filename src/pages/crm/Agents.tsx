import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo_url: string;
  bio: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  photo_url: '',
  bio: '',
  title: '',
};

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching agents:', error);
      addToast('Failed to load agents', 'error');
    } else {
      setAgents(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (editingAgent) {
      const { error } = await supabase
        .from('agents')
        .update(form)
        .eq('id', editingAgent.id);
      if (error) {
        addToast('Failed to update agent', 'error');
      } else {
        addToast('Agent updated', 'success');
      }
    } else {
      const { error } = await supabase.from('agents').insert(form);
      if (error) {
        addToast('Failed to add agent', 'error');
      } else {
        addToast('Agent added', 'success');
      }
    }

    setSaving(false);
    setModalOpen(false);
    setEditingAgent(null);
    setForm(emptyForm);
    fetchAgents();
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setForm({
      name: agent.name,
      email: agent.email || '',
      phone: agent.phone || '',
      photo_url: agent.photo_url || '',
      bio: agent.bio || '',
      title: agent.title || '',
    });
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingAgent(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) {
      addToast('Failed to delete agent', 'error');
    } else {
      addToast('Agent deleted', 'success');
    }
    setDeleteConfirm(null);
    fetchAgents();
  };

  const filtered = agents.filter(
    (a) =>
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8a99] text-sm" />
          <input
            type="text"
            placeholder="Search agents by name, email, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white"
          />
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-4 py-2.5 rounded-lg text-sm font-roboto transition-all cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" />
          Add Agent
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-[#0d5959] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#7a8a99] font-roboto mt-3">Loading agents...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e8edf2] py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#0d5959]/8 flex items-center justify-center mx-auto mb-3">
            <i className="ri-user-line text-[#0d5959] text-xl" />
          </div>
          <p className="text-sm text-[#7a8a99] font-roboto">
            {agents.length === 0 ? 'No agents yet. Add your first agent.' : 'No agents match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-xl border border-[#e8edf2] p-5 hover:border-[#0d5959]/20 transition-all group"
            >
              <div className="flex items-start gap-4">
                {agent.photo_url ? (
                  <img
                    src={agent.photo_url}
                    alt={agent.name}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#0d5959]/8 flex items-center justify-center flex-shrink-0">
                    <i className="ri-user-line text-[#0d5959] text-xl" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-jost text-[#001731] text-base">{agent.name}</p>
                  {agent.title && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <i className="ri-briefcase-line text-[#0d5959] text-xs" />
                      <p className="text-xs text-[#0d5959] font-roboto">{agent.title}</p>
                    </div>
                  )}
                  {agent.email && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <i className="ri-mail-line text-[#7a8a99] text-xs" />
                      <p className="text-xs text-[#7a8a99] font-roboto truncate">{agent.email}</p>
                    </div>
                  )}
                  {agent.phone && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <i className="ri-phone-line text-[#7a8a99] text-xs" />
                      <p className="text-xs text-[#7a8a99] font-roboto">{agent.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {agent.bio && (
                <p className="text-xs text-[#7a8a99] font-roboto mt-3 line-clamp-2">{agent.bio}</p>
              )}

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#e8edf2]/60">
                <button
                  onClick={() => handleEdit(agent)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-roboto text-[#7a8a99] hover:bg-[#f8fafc] hover:text-[#001731] transition-colors cursor-pointer"
                >
                  <i className="ri-edit-line text-xs" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(agent.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-roboto text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <i className="ri-delete-bin-line text-xs" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8edf2]">
              <h2 className="font-jost text-base text-[#001731]">
                {editingAgent ? 'Edit Agent' : 'Add Agent'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f8fafc] cursor-pointer"
              >
                <i className="ri-close-line text-[#7a8a99] text-lg" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
                  placeholder="e.g. Sarah Wanjiku"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                    placeholder="e.g. Senior Agent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                    placeholder="+2547..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                  placeholder="agent@oceans.co.ke"
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={form.photo_url}
                  onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] min-h-[80px] resize-none"
                  placeholder="Short bio..."
                  maxLength={500}
                />
                <p className="text-[10px] text-[#7a8a99] font-roboto mt-1 text-right">{form.bio.length}/500</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto text-[#7a8a99] hover:bg-[#f8fafc] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-sm font-roboto transition-all disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Saving...' : editingAgent ? 'Update Agent' : 'Add Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Agent?"
        message="This will permanently remove this agent. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}