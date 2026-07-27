import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';

interface Agent {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  bio: string | null;
  title: string | null;
  is_active: boolean;
  created_at: string;
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
  const [inviting, setInviting] = useState(false);

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
      // Edit existing agent — update agents table only
      const { error } = await supabase
        .from('agents')
        .update({
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          title: form.title || null,
          bio: form.bio || null,
          photo_url: form.photo_url || null,
        })
        .eq('id', editingAgent.id);
      if (error) {
        addToast('Failed to update agent', 'error');
      } else {
        addToast('Agent updated', 'success');
        setModalOpen(false);
        setEditingAgent(null);
        setForm(emptyForm);
        fetchAgents();
      }
      setSaving(false);
      return;
    }

    // Add new agent — create auth user + profile + agent record via edge function
    if (!form.email) {
      addToast('Email is required to create an agent account', 'error');
      setSaving(false);
      return;
    }

    setInviting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      addToast('You must be logged in', 'error');
      setSaving(false);
      setInviting(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: form.email,
            role: 'agent',
            name: form.name,
            title: form.title || 'Agent',
            phone: form.phone || null,
            bio: form.bio || null,
            photo_url: form.photo_url || null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        addToast(data?.error || 'Failed to create agent account', 'error');
      } else {
        addToast(data?.message || 'Agent created! They can sign in at /crm/login and use Forgot Password.', 'success');
        setModalOpen(false);
        setEditingAgent(null);
        setForm(emptyForm);
        fetchAgents();
      }
    } catch (err: any) {
      addToast(err?.message || 'Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
      setInviting(false);
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setForm({
      name: agent.name || '',
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

  const handleToggleActive = async (agent: Agent) => {
    const newStatus = !agent.is_active;
    const { error } = await supabase
      .from('agents')
      .update({ is_active: newStatus })
      .eq('id', agent.id);
    if (error) {
      addToast('Failed to update status', 'error');
    } else {
      addToast(newStatus ? 'Agent activated' : 'Agent deactivated', 'success');
      fetchAgents();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) {
      addToast('Failed to delete agent', 'error');
    } else {
      addToast('Agent removed from team', 'success');
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

  const activeCount = agents.filter((a) => a.is_active).length;
  const linkedCount = agents.filter((a) => !!a.user_id).length;

  return (
    <div className="space-y-5">
      {/* Header + Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-jost text-lg text-white lg:text-[#1a1a1a]">Team & Agents</h2>
          <p className="text-xs text-[#6b7280] lg:text-[#9ca3af] font-roboto mt-0.5">
            Manage your real estate team — each agent gets their own login and dashboard
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg text-sm font-roboto transition-all cursor-pointer whitespace-nowrap"
        >
          <i className="ri-user-add-line" />
          Add Agent
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#012144] lg:bg-white rounded-lg p-4">
          <p className="text-2xl font-jost text-white lg:text-[#1a1a1a]">{agents.length}</p>
          <p className="text-xs text-[#6b7280] lg:text-[#9ca3af] font-roboto mt-0.5">Team Members</p>
        </div>
        <div className="bg-[#012144] lg:bg-white rounded-lg p-4">
          <p className="text-2xl font-jost text-green-400 lg:text-green-600">{activeCount}</p>
          <p className="text-xs text-[#6b7280] lg:text-[#9ca3af] font-roboto mt-0.5">Active</p>
        </div>
        <div className="bg-[#012144] lg:bg-white rounded-lg p-4">
          <p className="text-2xl font-jost text-amber-400 lg:text-amber-600">{agents.length - activeCount}</p>
          <p className="text-xs text-[#6b7280] lg:text-[#9ca3af] font-roboto mt-0.5">Inactive</p>
        </div>
        <div className="bg-[#012144] lg:bg-white rounded-lg p-4">
          <p className="text-2xl font-jost text-[#5eead4] lg:text-primary">{linkedCount}</p>
          <p className="text-xs text-[#6b7280] lg:text-[#9ca3af] font-roboto mt-0.5">With Login</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] lg:text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search agents by name, email, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-[#1c3a5e] lg:border-gray-200 bg-[#012144] lg:bg-white rounded-lg text-sm font-roboto text-white lg:text-[#1a1a1a] placeholder:text-[#6b7280] lg:placeholder:text-gray-400 focus:outline-none focus:border-[#5eead4] lg:focus:border-primary"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400 font-roboto mt-3">Loading team...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#012144] lg:bg-white rounded-lg py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-white/10 lg:bg-primary/8 flex items-center justify-center mx-auto mb-3">
            <i className="ri-team-line text-[#5eead4] lg:text-primary text-xl" />
          </div>
          <p className="text-sm text-[#9ca3af] font-roboto font-medium">
            {agents.length === 0 ? 'No agents on your team yet' : 'No agents match your search'}
          </p>
          <p className="text-xs text-[#6b7280] lg:text-gray-400 font-roboto mt-1">
            {agents.length === 0 ? 'Add your first agent to build your real estate team' : 'Try a different search term'}
          </p>
          {agents.length === 0 && (
            <button
              onClick={handleAdd}
              className="mt-4 inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg text-sm font-roboto transition-all cursor-pointer"
            >
              <i className="ri-user-add-line" />
              Add Your First Agent
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map((agent) => (
              <div key={agent.id} className="bg-[#012144] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {agent.photo_url ? (
                    <img src={agent.photo_url} alt={agent.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-semibold">{(agent.name || '?').charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-roboto font-medium text-white truncate">{agent.name}</p>
                    <p className="text-xs text-[#6b7280] font-roboto truncate">{agent.email}</p>
                    {agent.title && <p className="text-xs text-[#9ca3af] font-roboto">{agent.title}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleToggleActive(agent)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-roboto font-medium cursor-pointer transition-colors ${
                      agent.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${agent.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                    {agent.is_active ? 'Active' : 'Inactive'}
                  </button>
                  {agent.user_id ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-roboto font-medium bg-[#5eead4]/15 text-[#5eead4]">
                      <i className="ri-shield-check-line text-xs" />
                      Login Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-roboto font-medium bg-amber-500/15 text-amber-400">
                      <i className="ri-shield-line text-xs" />
                      No Account
                    </span>
                  )}
                  {agent.phone && <span className="text-xs text-[#6b7280] font-roboto">{agent.phone}</span>}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-[#1c3a5e]">
                  <button
                    onClick={() => handleEdit(agent)}
                    className="flex-1 py-2 text-xs font-roboto text-[#9ca3af] hover:text-white rounded-lg border border-[#1c3a5e] hover:bg-white/5 cursor-pointer transition-colors flex items-center justify-center gap-1"
                  >
                    <i className="ri-edit-line text-sm" /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(agent.id)}
                    className="flex-1 py-2 text-xs font-roboto text-red-400 hover:text-red-300 rounded-lg border border-red-500/20 hover:bg-red-500/5 cursor-pointer transition-colors flex items-center justify-center gap-1"
                  >
                    <i className="ri-delete-bin-line text-sm" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block bg-white rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#9ca3af] uppercase tracking-wider">Agent</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#9ca3af] uppercase tracking-wider hidden sm:table-cell">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#9ca3af] uppercase tracking-wider hidden md:table-cell">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#9ca3af] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#9ca3af] uppercase tracking-wider">Login</th>
                    <th className="px-4 py-3 text-left text-xs font-roboto text-[#9ca3af] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((agent) => (
                    <tr key={agent.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {agent.photo_url ? (
                            <img
                              src={agent.photo_url}
                              alt={agent.name}
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-primary text-sm font-semibold">
                                {(agent.name || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-roboto font-medium text-[#1a1a1a] truncate">{agent.name}</p>
                            <p className="text-xs text-gray-400 font-roboto truncate">{agent.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-gray-600 font-roboto">{agent.title || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-[#9ca3af] font-roboto">{agent.phone || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(agent)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-roboto font-medium uppercase cursor-pointer transition-colors ${
                            agent.is_active
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                          title={agent.is_active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${agent.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                          {agent.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {agent.user_id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-roboto font-medium bg-primary/8 text-primary">
                            <i className="ri-shield-check-line text-xs" />
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-roboto font-medium bg-amber-50 text-amber-700">
                            <i className="ri-shield-line text-xs" />
                            No Account
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(agent)}
                            className="p-1.5 hover:bg-gray-100 rounded-md cursor-pointer text-gray-400 hover:text-primary transition-colors"
                            title="Edit agent"
                          >
                            <i className="ri-edit-line text-sm" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(agent.id)}
                            className="p-1.5 hover:bg-red-50 rounded-md cursor-pointer text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove from team"
                          >
                            <i className="ri-delete-bin-line text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty state helper at bottom when table has data */}
      {!loading && filtered.length > 0 && (
        <div className="bg-[#012144] lg:bg-primary/5 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 lg:bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="ri-information-line text-[#5eead4] lg:text-primary text-sm" />
            </div>
            <div>
              <p className="text-sm font-roboto font-medium text-white lg:text-[#1a1a1a]">How the team system works</p>
              <ul className="mt-1.5 space-y-1 text-xs text-[#9ca3af] font-roboto">
                <li>• Each agent with <strong>Login Enabled</strong> has their own dashboard showing only their listings, leads, and deals</li>
                <li>• New agents sign in at <strong>/crm/login</strong> and use <strong>Forgot Password</strong> to set their password</li>
                <li>• Toggle an agent <strong>Inactive</strong> to temporarily revoke dashboard access without deleting their account</li>
                <li>• Agents marked <strong>Inactive</strong> won't appear on the public website's agent listings</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0] sticky top-0 bg-white z-10">
              <h2 className="font-jost text-base text-[#1a1a1a]">
                {editingAgent ? 'Edit Agent' : 'Add New Agent'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <i className="ri-close-line text-gray-400 text-lg" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingAgent && (
                <div className="bg-primary/5 rounded-lg border border-primary/10 p-3">
                  <p className="text-xs text-gray-600 font-roboto">
                    <i className="ri-information-line text-primary inline mr-1" />
                    This will create a full agent account with login access. They can sign in at <strong>/crm/login</strong> and use <strong>Forgot Password</strong> to set their password.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-roboto text-[#9ca3af] uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto focus:outline-none focus:border-primary"
                  placeholder="e.g. Sarah Wanjiku"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-roboto text-[#9ca3af] uppercase tracking-wider mb-1.5">
                    Email {editingAgent ? '' : '*'}
                  </label>
                  <input
                    type="email"
                    required={!editingAgent}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    disabled={!!editingAgent}
                    className={`w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto focus:outline-none focus:border-primary ${
                      editingAgent ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''
                    }`}
                    placeholder="agent@oceans.co.ke"
                  />
                  {editingAgent && (
                    <p className="text-[10px] text-gray-400 font-roboto mt-1">Email cannot be changed after creation</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-roboto text-[#9ca3af] uppercase tracking-wider mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto focus:outline-none focus:border-primary"
                    placeholder="e.g. Senior Agent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-roboto text-[#9ca3af] uppercase tracking-wider mb-1.5">
                  Phone
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto focus:outline-none focus:border-primary"
                  placeholder="+2547..."
                />
              </div>

              <div>
                <label className="block text-xs font-roboto text-[#9ca3af] uppercase tracking-wider mb-1.5">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={form.photo_url}
                  onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto focus:outline-none focus:border-primary"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-roboto text-[#9ca3af] uppercase tracking-wider mb-1.5">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto focus:outline-none focus:border-primary min-h-[80px] resize-none"
                  placeholder="Short bio about this agent..."
                  maxLength={500}
                />
                <p className="text-[10px] text-gray-400 font-roboto mt-1 text-right">{form.bio.length}/500</p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-roboto text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-roboto transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  {saving ? (
                    <span className="flex items-center gap-2 justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {inviting ? 'Creating Account...' : 'Saving...'}
                    </span>
                  ) : editingAgent ? (
                    'Update Agent'
                  ) : (
                    'Create Agent Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        title="Remove Agent from Team?"
        message="This will remove the agent from your team. Their login account will remain active but they won't appear in the team list. Are you sure?"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
        confirmLabel="Remove Agent"
        confirmVariant="danger"
      />
    </div>
  );
}