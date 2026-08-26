import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import { logLeadUpdated, logLeadDeleted, logLeadAssigned, logLeadCreated } from '@/lib/activityLogger';
import type { Lead, Agent, LeadCounts } from './leads/types';
import { statusOptions, statusLabels, statusColors, clientTypeOptions, clientTypeLabels } from './leads/types';
import LeadTable from './leads/components/LeadTable';
import LeadDetailPanel from './leads/components/LeadDetailPanel';

export default function Leads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { agentId, loading: agentLoading } = useAgentProfile();
  const isAgent = user?.role === 'agent';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<LeadCounts>({ all: 0, new: 0, contacted: 0, viewing: 0, negotiating: 0, converted: 0, lost: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [clientTypeFilter, setClientTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    source: 'website',
    status: 'new',
    client_type: '',
    move_in_date: '',
    budget: '',
    notes: '',
    message: '',
  });
  const [adding, setAdding] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const handleAddLead = async () => {
    if (!addForm.first_name.trim() || !addForm.last_name.trim() || !addForm.email.trim()) {
      addToast('First name, last name and email are required', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(addForm.email.trim())) {
      addToast('Please enter a valid email address', 'error');
      return;
    }
    setAdding(true);
    const payload = {
      first_name: addForm.first_name.trim(),
      last_name: addForm.last_name.trim(),
      email: addForm.email.trim(),
      phone: addForm.phone.trim() || null,
      source: addForm.source,
      status: addForm.status,
      client_type: addForm.client_type || null,
      move_in_date: addForm.move_in_date.trim() || null,
      budget: addForm.budget ? Number(addForm.budget) : null,
      notes: addForm.notes.trim() || null,
      message: addForm.message.trim() || null,
      agent_id: isAgent ? agentId : null,
      is_read: false,
      priority: 'normal',
      is_starred: false,
      is_important: false,
      is_archived: false,
      is_spam: false,
    };
    const { data, error } = await supabase.from('leads').insert(payload).select().single();
    if (error) {
      console.error('Add lead failed:', error);
      addToast(error.message || 'Unable to create lead. Please check the required fields and try again.', 'error');
    } else {
      setLeads((prev) => [data, ...prev]);
      setTotal((prev) => prev + 1);
      if (user) {
        logLeadCreated(user.id, user.name || user.email, data.id, `${data.first_name} ${data.last_name}`);
      }
      addToast('Lead added successfully', 'success');
      setAddForm({
        first_name: '', last_name: '', email: '', phone: '', source: 'website', status: 'new',
        client_type: '', move_in_date: '', budget: '', notes: '', message: '',
      });
      setAddModal(false);
      fetchCounts();
    }
    setAdding(false);
  };

  const fetchAgents = useCallback(async () => {
    const { data } = await supabase.from('agents').select('id, name').order('name');
    setAgents(data || []);
  }, []);

  const fetchCounts = useCallback(async () => {
    if (isAgent && agentLoading) return;
    const statuses = ['new', 'contacted', 'viewing', 'negotiating', 'converted', 'lost'];
    const countPromises = statuses.map((s) => {
      let q = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', s);
      if (isAgent && agentId) q = q.eq('agent_id', agentId);
      return q;
    });
    let allQ = supabase.from('leads').select('*', { count: 'exact', head: true });
    if (isAgent && agentId) allQ = allQ.eq('agent_id', agentId);
    const [{ count: allCount }, ...results] = await Promise.all([allQ, ...countPromises]);
    const newCounts: LeadCounts = {
      all: allCount ?? 0,
      new: 0, contacted: 0, viewing: 0, negotiating: 0, converted: 0, lost: 0,
    };
    results.forEach((res, i) => {
      newCounts[statuses[i] as keyof LeadCounts] = res.count ?? 0;
    });
    setCounts(newCounts);
  }, [isAgent, agentId, agentLoading]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    if (isAgent && agentLoading) return;

    let countQuery = supabase.from('leads').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (isAgent && agentId) {
      countQuery = countQuery.eq('agent_id', agentId);
      dataQuery = dataQuery.eq('agent_id', agentId);
    }

    if (statusFilter !== 'all') {
      countQuery = countQuery.eq('status', statusFilter);
      dataQuery = dataQuery.eq('status', statusFilter);
    }
    if (agentFilter !== 'all') {
      countQuery = countQuery.eq('agent_id', agentFilter);
      dataQuery = dataQuery.eq('agent_id', agentFilter);
    }
    if (sourceFilter !== 'all') {
      countQuery = countQuery.eq('source', sourceFilter);
      dataQuery = dataQuery.eq('source', sourceFilter);
    }
    if (clientTypeFilter !== 'all') {
      countQuery = countQuery.eq('client_type', clientTypeFilter);
      dataQuery = dataQuery.eq('client_type', clientTypeFilter);
    }
    if (search.trim()) {
      const term = search.trim();
      const orQuery = `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,notes.ilike.%${term}%,message.ilike.%${term}%`;
      countQuery = countQuery.or(orQuery);
      dataQuery = dataQuery.or(orQuery);
    }

    const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);

    if (error) {
      console.error('Error fetching leads:', error);
      addToast('Failed to load leads', 'error');
    } else {
      setLeads(data || []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, statusFilter, agentFilter, sourceFilter, clientTypeFilter, search, isAgent, agentId, agentLoading]);

  useEffect(() => {
    fetchAgents();
    fetchCounts();
  }, [fetchAgents, fetchCounts]);

  useLayoutEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    setUpdatingId(id);
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', id);
    if (error) {
      console.error('Update lead status failed:', error);
      addToast(error.message || 'Unable to update status. Please try again.', 'error');
    } else {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
      if (user) {
        logLeadUpdated(user.id, user.name || user.email, id, `${lead.first_name} ${lead.last_name}`, { status: lead.status }, { status: newStatus });
      }
      addToast(`Lead marked as ${newStatus}`, 'success');
      fetchCounts();
    }
    setUpdatingId(null);
    setActionMenu(null);
  };

  const handleToggleRead = async (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const nextRead = !lead.is_read;
    setUpdatingId(id);
    const { error } = await supabase.from('leads').update({ is_read: nextRead }).eq('id', id);
    if (error) {
      console.error('Toggle read failed:', error);
      addToast(error.message || 'Unable to update read status. Please try again.', 'error');
    } else {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, is_read: nextRead } : l)));
      addToast(nextRead ? 'Lead marked as read' : 'Lead marked as unread', 'success');
      fetchCounts();
    }
    setUpdatingId(null);
    setActionMenu(null);
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    if (!lead.is_read) {
      handleToggleRead(lead.id);
    }
  };

  const handleAssignAgent = async (leadId: string, agentId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const agent = agentId ? agents.find((a) => a.id === agentId) : null;
    setUpdatingId(leadId);
    const { error } = await supabase.from('leads').update({ agent_id: agentId || null }).eq('id', leadId);
    if (error) {
      console.error('Assign agent failed:', error);
      addToast(error.message || 'Unable to assign agent. Please try again.', 'error');
    } else {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, agent_id: agentId || null } : l)));
      if (user) {
        logLeadAssigned(user.id, user.name || user.email, leadId, `${lead.first_name} ${lead.last_name}`, agent?.name || 'Unassigned');
      }
      addToast(`Assigned to ${agent?.name || 'Unassigned'}`, 'success');
    }
    setUpdatingId(null);
    setAssignModal(null);
    setActionMenu(null);
  };

  const handleAddNote = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    setUpdatingId(leadId);
    const { error } = await supabase.from('leads').update({ notes: noteText }).eq('id', leadId);
    if (error) {
      addToast('Failed to add note', 'error');
    } else {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, notes: noteText } : l)));
      addToast('Note added', 'success');
    }
    setUpdatingId(null);
    setNoteModal(null);
    setNoteText('');
    setActionMenu(null);
  };

  const handleDelete = async (id: string) => {
    const lead = leads.find((l) => l.id === id);
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) {
        addToast('Failed to delete lead', 'error');
        setDeleteConfirm(null);
        setActionMenu(null);
        return;
      }
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (user && lead) {
        logLeadDeleted(user.id, user.name || user.email, id, `${lead.first_name} ${lead.last_name}`);
      }
      addToast('Lead deleted', 'success');
      fetchCounts();
    } catch (err) {
      console.error('Delete lead error:', err);
      addToast('Failed to delete lead', 'error');
    }
    setDeleteConfirm(null);
    setActionMenu(null);
  };

  const toggleLeadSelect = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllLeads = () => {
    if (selectedLeadIds.size === leads.length && leads.length > 0) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map((l) => l.id)));
    }
  };

  const handleBulkDeleteLeads = async () => {
    if (selectedLeadIds.size === 0) {
      addToast('No leads selected', 'error');
      setBulkDeleteConfirm(false);
      return;
    }
    const ids = Array.from(selectedLeadIds);
    try {
      const { error } = await supabase.from('leads').delete().in('id', ids);
      if (error) {
        addToast('Failed to delete leads', 'error');
        setBulkDeleteConfirm(false);
        return;
      }
      setLeads((prev) => prev.filter((l) => !selectedLeadIds.has(l.id)));
      setTotal((prev) => Math.max(0, prev - selectedLeadIds.size));
      addToast(`${selectedLeadIds.size} leads deleted`, 'success');
      setSelectedLeadIds(new Set());
      fetchCounts();
    } catch (err) {
      console.error('Bulk delete leads error:', err);
      addToast('Failed to delete leads', 'error');
    }
    setBulkDeleteConfirm(false);
  };

  useEffect(() => {
    setSelectedLeadIds(new Set());
  }, [statusFilter, search, page, agentFilter, sourceFilter, clientTypeFilter]);

  const handleExportCSV = async () => {
    setExporting(true);
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    const rows = (data || []).map((lead) => ({
      Name: `${lead.first_name} ${lead.last_name}`,
      Email: lead.email,
      Phone: lead.phone || '',
      Status: lead.status,
      ClientType: lead.client_type || '',
      Source: lead.source || '',
      Budget: lead.budget || '',
      MoveInDate: lead.move_in_date || '',
      Notes: lead.notes || '',
      Message: lead.message || '',
      Agent: agents.find((a) => a.id === lead.agent_id)?.name || '',
      Created: new Date(lead.created_at).toLocaleDateString('en-GB'),
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => `"${String(r[h as keyof typeof r] || '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    addToast('CSV exported successfully', 'success');
  };

  const handleUpdateLead = (updated: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    if (selectedLead?.id === updated.id) {
      setSelectedLead(updated);
    }
  };

  const sources = ['all', ...Array.from(new Set(leads.map((l) => l.source).filter(Boolean)))].sort();

  return (
    <div className="space-y-5">
      {/* Counter Tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'all', label: 'All Inquiries' },
          { key: 'new', label: 'New' },
          { key: 'contacted', label: 'Contacted' },
          { key: 'viewing', label: 'Tour Requests' },
          { key: 'negotiating', label: 'Negotiating' },
          { key: 'converted', label: 'Converted' },
          { key: 'lost', label: 'Lost' },
        ] as { key: string; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === tab.key
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-background-200 text-foreground-600 hover:text-foreground-900'
            }`}
          >
            {tab.label}
            <span className="ml-1.5">{counts[tab.key as keyof LeadCounts]}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 w-full lg:w-auto flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
            <input
              type="text"
              placeholder="Search leads by name, email, phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 bg-white"
            />
          </div>
          <select
            value={agentFilter}
            onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 bg-white cursor-pointer"
          >
            <option value="all">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 bg-white cursor-pointer"
          >
            {sources.map((s) => (
              <option key={s} value={s} className="capitalize">{s === 'all' ? 'All Sources' : s}</option>
            ))}
          </select>
          <select
            value={clientTypeFilter}
            onChange={(e) => { setClientTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 bg-white cursor-pointer"
          >
            <option value="all">All Types</option>
            {clientTypeOptions.map((ct) => (
              <option key={ct} value={ct}>{clientTypeLabels[ct]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-golden text-golden rounded-lg text-xs font-semibold hover:bg-golden hover:text-white transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <i className="ri-download-line" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={() => setAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line" />
            Add Lead
          </button>
          <span className="text-xs text-foreground-500">{total} total</span>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedLeadIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm font-semibold text-red-700">{selectedLeadIds.size} selected</span>
          <button
            onClick={() => setBulkDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-delete-bin-line" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Lead Table */}
      <LeadTable
        leads={leads}
        loading={loading}
        selectedLeadIds={selectedLeadIds}
        onToggleSelect={toggleLeadSelect}
        onToggleSelectAll={toggleSelectAllLeads}
        onSelectLead={handleSelectLead}
        onStatusChange={handleStatusChange}
        onAssignAgent={handleAssignAgent}
        updatingId={updatingId}
        actionMenu={actionMenu}
        onActionMenu={setActionMenu}
        onAssign={(leadId) => { setAssignModal(leadId); setActionMenu(null); }}
        onAddNote={(leadId, currentNotes) => { setNoteModal(leadId); setNoteText(currentNotes || ''); setActionMenu(null); }}
        onDelete={(leadId) => { setDeleteConfirm(leadId); setActionMenu(null); }}
        onToggleRead={handleToggleRead}
        agents={agents}
      />

      {!loading && leads.length > 0 && (
        <CRMPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      )}

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          agents={agents}
          onClose={() => setSelectedLead(null)}
          onUpdateLead={handleUpdateLead}
          userId={user?.id}
          userName={user?.name || user?.email}
        />
      )}

      {/* Assign Agent Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssignModal(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
            <h3 className="text-base font-semibold text-foreground-900 mb-4">Assign Agent</h3>
            <div className="space-y-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAssignAgent(assignModal, agent.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-background-50 transition-colors text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 text-xs font-semibold">{agent.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground-900">{agent.name}</span>
                </button>
              ))}
              {agents.length === 0 && (
                <p className="text-sm text-foreground-500 text-center py-4">No agents available. Add agents first.</p>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-background-200">
              <button
                onClick={() => setAssignModal(null)}
                className="w-full px-4 py-2.5 border border-background-200 rounded-lg text-sm font-medium text-foreground-600 hover:bg-background-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setNoteModal(null); setNoteText(''); }} />
          <div className="relative bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
            <h3 className="text-base font-semibold text-foreground-900 mb-4">Add Note</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full px-3 py-2.5 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 min-h-[100px] resize-none"
              placeholder="Enter note..."
              maxLength={500}
            />
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => { setNoteModal(null); setNoteText(''); }}
                className="flex-1 px-4 py-2.5 border border-background-200 rounded-lg text-sm font-medium text-foreground-600 hover:bg-background-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddNote(noteModal)}
                className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-all cursor-pointer"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Lead?"
        message="This will permanently remove this lead. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmModal
        open={bulkDeleteConfirm}
        title={`Delete ${selectedLeadIds.size} Leads?`}
        message={`This will permanently remove all ${selectedLeadIds.size} selected leads. This action cannot be undone.`}
        confirmLabel="Delete All"
        confirmVariant="danger"
        onConfirm={handleBulkDeleteLeads}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      {/* Add Lead Modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddModal(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-background-200">
              <h2 className="text-base font-semibold text-foreground-900">Add New Lead</h2>
              <button onClick={() => setAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 cursor-pointer">
                <i className="ri-close-line text-foreground-600 text-lg" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">First Name *</label>
                  <input
                    type="text"
                    value={addForm.first_name}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, first_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    value={addForm.last_name}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Email *</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  placeholder="+254 712 345 678"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Source</label>
                  <select
                    value={addForm.source}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 bg-white cursor-pointer"
                  >
                    <option value="website">Website</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="referral">Referral</option>
                    <option value="social">Social</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="manual">Manual</option>
                    <option value="property_portal">Property Portal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 bg-white cursor-pointer"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s} className="capitalize">{statusLabels[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Client Type</label>
                  <select
                    value={addForm.client_type}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, client_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 bg-white cursor-pointer"
                  >
                    <option value="">Select...</option>
                    {clientTypeOptions.map((ct) => (
                      <option key={ct} value={ct}>{clientTypeLabels[ct]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Move-in / Available</label>
                  <input
                    type="text"
                    value={addForm.move_in_date}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, move_in_date: e.target.value }))}
                    placeholder="e.g. ASAP, September"
                    className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Budget</label>
                <input
                  type="number"
                  value={addForm.budget}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, budget: e.target.value }))}
                  className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Description / Inquiry</label>
                <textarea
                  value={addForm.message}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 min-h-[80px] resize-none"
                  placeholder="What is the lead looking for?"
                  maxLength={500}
                />
                <p className="text-[10px] text-foreground-500 mt-1">{addForm.message.length}/500</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 min-h-[80px] resize-none"
                  placeholder="Additional notes..."
                  maxLength={500}
                />
                <p className="text-[10px] text-foreground-500 mt-1">{addForm.notes.length}/500</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-background-200 rounded-lg text-sm font-medium text-foreground-600 hover:bg-background-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLead}
                  disabled={adding}
                  className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add Lead'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}