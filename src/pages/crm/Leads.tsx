import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import { logLeadUpdated, logLeadDeleted, logLeadAssigned, logLeadCreated } from '@/lib/activityLogger';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  source: string | null;
  budget: number | null;
  notes: string | null;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Agent {
  id: string;
  name: string;
}

interface LeadCounts {
  all: number;
  new: number;
  contacted: number;
  viewing: number;
  negotiating: number;
  converted: number;
  lost: number;
}

const statusOptions = ['new', 'contacted', 'viewing', 'negotiating', 'converted', 'lost'];

const statusColors: Record<string, string> = {
  new: 'bg-[#0d5959]/8 text-[#0d5959]',
  contacted: 'bg-[#001731]/8 text-[#001731]',
  viewing: 'bg-[#fff5e6] text-[#f58300]',
  negotiating: 'bg-[#e8f4f8] text-[#023655]',
  converted: 'bg-[#e6f4ea] text-[#088135]',
  lost: 'bg-[#fef2f2] text-[#dc2626]',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  viewing: 'Viewing',
  negotiating: 'Negotiating',
  converted: 'Converted',
  lost: 'Lost',
};

export default function Leads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { agentId } = useAgentProfile();
  const isAgent = user?.role === 'agent';
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<LeadCounts>({ all: 0, new: 0, contacted: 0, viewing: 0, negotiating: 0, converted: 0, lost: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
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
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', email: '', phone: '', source: 'website', status: 'new', budget: '', notes: '' });
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
      budget: addForm.budget ? Number(addForm.budget) : null,
      notes: addForm.notes.trim() || null,
      agent_id: isAgent ? agentId : null,
      is_read: false,
    };
    const { data, error } = await supabase.from('leads').insert(payload).select().single();
    if (error) {
      addToast('Failed to add lead', 'error');
    } else {
      setLeads((prev) => [data, ...prev]);
      setTotal((prev) => prev + 1);
      if (user) {
        logLeadCreated(user.id, user.name || user.email, data.id, `${data.first_name} ${data.last_name}`);
      }
      addToast('Lead added successfully', 'success');
      setAddForm({ first_name: '', last_name: '', email: '', phone: '', source: 'website', status: 'new', budget: '', notes: '' });
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
  }, [isAgent, agentId]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);

    let countQuery = supabase.from('leads').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Agent filter — agents only see their own leads
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
    if (search.trim()) {
      const term = search.trim();
      const orQuery = `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,notes.ilike.%${term}%`;
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
  }, [page, pageSize, statusFilter, agentFilter, sourceFilter, search, isAgent, agentId]);

  useEffect(() => {
    fetchAgents();
    fetchCounts();
  }, [fetchAgents, fetchCounts]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    setUpdatingId(id);
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', id);
    if (error) {
      addToast('Failed to update status', 'error');
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

  const handleAssignAgent = async (leadId: string, agentId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    const agent = agents.find((a) => a.id === agentId);
    if (!lead || !agent) return;
    setUpdatingId(leadId);
    const { error } = await supabase.from('leads').update({ agent_id: agentId }).eq('id', leadId);
    if (error) {
      addToast('Failed to assign agent', 'error');
    } else {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, agent_id: agentId } : l)));
      if (user) {
        logLeadAssigned(user.id, user.name || user.email, leadId, `${lead.first_name} ${lead.last_name}`, agent.name);
      }
      addToast(`Assigned to ${agent.name}`, 'success');
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
  }, [statusFilter, search, page, agentFilter, sourceFilter]);

  const handleExportCSV = async () => {
    setExporting(true);
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    const rows = (data || []).map((lead) => ({
      Name: `${lead.first_name} ${lead.last_name}`,
      Email: lead.email,
      Phone: lead.phone || '',
      Status: lead.status,
      Source: lead.source || '',
      Budget: lead.budget || '',
      Notes: lead.notes || '',
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

  const getInitials = (lead: Lead) => {
    const f = lead.first_name?.charAt(0) || '';
    const l = lead.last_name?.charAt(0) || '';
    return (f + l).toUpperCase() || '?';
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return 'Unassigned';
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name || 'Unknown';
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
            className={`px-3 py-1.5 rounded-full text-xs font-inter transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === tab.key
                ? 'bg-[#0d5959] text-white'
                : 'bg-white border border-[#f0f0f0] text-[#636363] hover:text-[#001731]'
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
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#636363] text-sm" />
            <input
              type="text"
              placeholder="Search leads by name, email, phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white"
            />
          </div>
          <select
            value={agentFilter}
            onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer"
          >
            <option value="all">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer"
          >
            {sources.map((s) => (
              <option key={s} value={s} className="capitalize">{s === 'all' ? 'All Sources' : s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[#f0f0f0] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-xs font-inter cursor-pointer transition-all ${
                viewMode === 'list' ? 'bg-[#0d5959] text-white' : 'bg-white text-[#636363] hover:text-[#001731]'
              }`}
            >
              <i className="ri-list-check mr-1" /> List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-2 text-xs font-inter cursor-pointer transition-all ${
                viewMode === 'board' ? 'bg-[#0d5959] text-white' : 'bg-white text-[#636363] hover:text-[#001731]'
              }`}
            >
              <i className="ri-layout-grid-line mr-1" /> Board
            </button>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-xs font-inter text-[#636363] hover:text-[#001731] hover:bg-[#f7f8fa] transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <i className="ri-download-line" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={() => setAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-xs font-inter font-medium transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line" />
            Add Lead
          </button>
          <span className="text-xs font-inter text-[#636363]">{total} total leads</span>
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

      {/* Board View */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {statusOptions.map((stage) => (
            <div key={stage} className="bg-white rounded-xl overflow-hidden">
              <div className="bg-[#0d5959]/5 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-inter font-medium text-[#001731] capitalize">{statusLabels[stage]}</span>
                <span className={`text-xs font-inter px-2 py-0.5 rounded-full ${statusColors[stage]}`}>
                  {counts[stage as keyof LeadCounts]}
                </span>
              </div>
              <div className="p-3 space-y-3 min-h-[200px]">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-[#f7f8fa] rounded-lg p-3 space-y-2">
                      <div className="h-3 w-28 bg-[#f7f8fa] rounded animate-pulse" />
                      <div className="h-2.5 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                    </div>
                  ))
                ) : (
                  leads.filter((l) => l.status === stage).map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-[#f7f8fa] rounded-lg p-3 hover:bg-[#0d5959]/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#0d5959]/8 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#0d5959] text-xs font-semibold">{getInitials(lead)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-inter text-[#001731] font-medium truncate">{lead.first_name} {lead.last_name}</p>
                          <p className="text-xs font-inter text-[#636363] truncate">{lead.email}</p>
                          {lead.budget && (
                            <p className="text-xs font-inter text-[#0d5959] mt-1">Budget: KSh {lead.budget.toLocaleString()}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-inter text-[#636363]">{getAgentName(lead.agent_id)}</span>
                            <span className="text-[10px] font-inter text-[#636363]">{lead.source || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {(!loading && leads.filter((l) => l.status === stage).length === 0) && (
                  <p className="text-xs font-inter text-[#636363] text-center py-4">No leads in this stage</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-xl overflow-hidden">
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-0">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 py-4 border-b border-[#1c3a5e]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#012a52] animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-28 bg-[#012a52] rounded animate-pulse" />
                      <div className="h-3 w-20 bg-[#012a52] rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))
            ) : leads.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-[#0d5959]/20 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-user-add-line text-[#5eead4] text-xl" />
                </div>
                <p className="text-sm font-inter text-[#6b7280]">
                  {total === 0 ? 'No leads yet.' : 'No leads match your filters.'}
                </p>
                {total === 0 && (
                  <button
                    onClick={() => setAddModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-sm font-inter font-medium transition-all cursor-pointer mt-3"
                  >
                    <i className="ri-add-line" />
                    Create Lead
                  </button>
                )}
              </div>
            ) : (
              leads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="px-4 py-4 border-b border-[#1c3a5e] cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#0d5959]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#5eead4] text-xs font-semibold">{getInitials(lead)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-inter text-white font-medium">{lead.first_name} {lead.last_name}</p>
                        <p className="text-xs font-inter text-[#6b7280] truncate max-w-[180px]">{lead.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-inter px-2 py-0.5 rounded-full flex-shrink-0 ${
                      lead.status === 'converted' ? 'bg-[#088135]/20 text-[#5eead4]' :
                      lead.status === 'lost' ? 'bg-[#dc2626]/20 text-red-300' :
                      lead.status === 'viewing' ? 'bg-[#f58300]/20 text-[#f58300]' :
                      lead.status === 'negotiating' ? 'bg-[#023655]/30 text-[#e8f4f8]' :
                      lead.status === 'contacted' ? 'bg-[#001731]/30 text-white' :
                      'bg-[#0d5959]/30 text-[#5eead4]'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {lead.phone && (
                      <span className="text-xs font-inter text-[#6b7280]">
                        <i className="ri-phone-line mr-1" />{lead.phone}
                      </span>
                    )}
                    <span className="text-xs font-inter text-[#6b7280] capitalize">{lead.source || '—'}</span>
                    <span className="text-xs font-inter text-[#6b7280] ml-auto">
                      {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f0f0f0]">
                  <th className="px-2 md:px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.size === leads.length && leads.length > 0}
                      onChange={toggleSelectAllLeads}
                      className="w-4 h-4 rounded border-gray-300 text-[#0d5959] focus:ring-[#0d5959] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-inter font-medium text-[#636363] uppercase tracking-wider">Lead</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-inter font-medium text-[#636363] uppercase tracking-wider hidden sm:table-cell">Contact</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-inter font-medium text-[#636363] uppercase tracking-wider hidden md:table-cell">Source</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-inter font-medium text-[#636363] uppercase tracking-wider">Status</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-inter font-medium text-[#636363] uppercase tracking-wider hidden md:table-cell">Assigned</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-inter font-medium text-[#636363] uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-inter font-medium text-[#636363] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8edf2]/60">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 md:px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#f7f8fa] animate-pulse" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-28 bg-[#f7f8fa] rounded animate-pulse" />
                            <div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                        <div className="space-y-1.5">
                          <div className="h-3 w-24 bg-[#f7f8fa] rounded animate-pulse" />
                          <div className="h-3 w-16 bg-[#f7f8fa] rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                        <div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                      </td>
                      <td className="px-4 md:px-5 py-3">
                        <div className="h-5 w-16 bg-[#f7f8fa] rounded animate-pulse" />
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                        <div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                        <div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                      </td>
                      <td className="px-4 md:px-5 py-3">
                        <div className="h-8 w-8 bg-[#f7f8fa] rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 md:px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-[#0d5959]/8 flex items-center justify-center">
                          <i className="ri-user-add-line text-[#0d5959] text-xl" />
                        </div>
                        <p className="text-sm font-inter text-[#636363]">
                          {total === 0 ? 'No leads yet.' : 'No leads match your filters.'}
                        </p>
                        {total === 0 && (
                          <button
                            onClick={() => setAddModal(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-sm font-inter font-medium transition-all cursor-pointer mt-2"
                          >
                            <i className="ri-add-line" />
                            Create Lead
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-[#f7f8fa]/60 transition-colors group cursor-pointer">
                      <td className="px-2 md:px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.has(lead.id)}
                          onChange={() => toggleLeadSelect(lead.id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#0d5959] focus:ring-[#0d5959] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 md:px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0d5959]/8 flex items-center justify-center flex-shrink-0">
                            <span className="text-[#0d5959] text-xs font-semibold">{getInitials(lead)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-inter text-[#001731] font-medium">{lead.first_name} {lead.last_name}</p>
                            <p className="text-xs font-inter text-[#636363] truncate max-w-[180px]">{lead.message || lead.notes || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-1.5 text-xs font-inter text-[#636363]">
                              <i className="ri-mail-line text-xs" />
                              <span className="truncate max-w-[140px]">{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1.5 text-xs font-inter text-[#636363]">
                              <i className="ri-phone-line text-xs" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                        <span className="text-xs font-inter text-[#636363]">{lead.source || '—'}</span>
                      </td>
                      <td className="px-4 md:px-5 py-3">
                        <div className="relative">
                          <select
                            value={lead.status || 'new'}
                            onChange={(e) => { e.stopPropagation(); handleStatusChange(lead.id, e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            disabled={updatingId === lead.id}
                            className={`text-xs font-inter px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-1 focus:ring-[#0d5959]/20 ${statusColors[lead.status || 'new'] || 'bg-[#f7f8fa] text-[#636363]'}`}
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s} className="capitalize bg-white text-[#636363]">{s}</option>
                            ))}
                          </select>
                          {updatingId === lead.id && (
                            <i className="ri-loader-4-line animate-spin text-[#0d5959] text-xs ml-1 inline-block" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                        <span className="text-xs font-inter text-[#636363]">{getAgentName(lead.agent_id)}</span>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                        <span className="text-xs font-inter text-[#636363]">
                          {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 md:px-5 py-3">
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === lead.id ? null : lead.id); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#0d5959]/8 text-[#636363] hover:text-[#0d5959] transition-colors cursor-pointer"
                          >
                            <i className="ri-more-2-line text-sm" />
                          </button>
                          {actionMenu === lead.id && (
                            <div className="absolute right-0 top-full mt-1 z-10 bg-white rounded-lg border border-[#f0f0f0] shadow-lg min-w-[160px] py-1">
                              <button
                                onClick={() => { setSelectedLead(lead); setActionMenu(null); }}
                                className="w-full text-left px-3 py-2 text-xs font-inter text-[#001731] hover:bg-[#f7f8fa] transition-colors cursor-pointer"
                              >
                                <i className="ri-eye-line mr-2" /> View Lead
                              </button>
                              <button
                                onClick={() => { setAssignModal(lead.id); setActionMenu(null); }}
                                className="w-full text-left px-3 py-2 text-xs font-inter text-[#001731] hover:bg-[#f7f8fa] transition-colors cursor-pointer"
                              >
                                <i className="ri-user-add-line mr-2" /> Assign Agent
                              </button>
                              <button
                                onClick={() => { setNoteModal(lead.id); setNoteText(lead.notes || ''); setActionMenu(null); }}
                                className="w-full text-left px-3 py-2 text-xs font-inter text-[#001731] hover:bg-[#f7f8fa] transition-colors cursor-pointer"
                              >
                                <i className="ri-sticky-note-line mr-2" /> Add Note
                              </button>
                              <button
                                onClick={() => { setDeleteConfirm(lead.id); setActionMenu(null); }}
                                className="w-full text-left px-3 py-2 text-xs font-inter text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <i className="ri-delete-bin-line mr-2" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && leads.length > 0 && (
            <CRMPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {/* Lead Detail Panel */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedLead(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
              <h2 className="font-inter text-base text-[#001731]">Lead Details</h2>
              <button onClick={() => setSelectedLead(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f8fa] cursor-pointer">
                <i className="ri-close-line text-[#636363] text-lg" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#0d5959]/8 flex items-center justify-center">
                  <span className="text-[#0d5959] text-lg font-semibold">{getInitials(selectedLead)}</span>
                </div>
                <div>
                  <h3 className="font-inter text-base text-[#001731]">{selectedLead.first_name} {selectedLead.last_name}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-inter capitalize mt-1 ${statusColors[selectedLead.status] || 'bg-[#f7f8fa] text-[#636363]'}`}>
                    {selectedLead.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#f7f8fa] rounded-lg p-3">
                  <p className="text-xs font-inter text-[#636363] uppercase tracking-wider">Email</p>
                  <p className="text-sm font-inter text-[#001731] mt-1">{selectedLead.email}</p>
                </div>
                <div className="bg-[#f7f8fa] rounded-lg p-3">
                  <p className="text-xs font-inter text-[#636363] uppercase tracking-wider">Phone</p>
                  <p className="text-sm font-inter text-[#001731] mt-1">{selectedLead.phone || '—'}</p>
                </div>
                <div className="bg-[#f7f8fa] rounded-lg p-3">
                  <p className="text-xs font-inter text-[#636363] uppercase tracking-wider">Source</p>
                  <p className="text-sm font-inter text-[#001731] mt-1">{selectedLead.source || '—'}</p>
                </div>
                <div className="bg-[#f7f8fa] rounded-lg p-3">
                  <p className="text-xs font-inter text-[#636363] uppercase tracking-wider">Assigned</p>
                  <p className="text-sm font-inter text-[#001731] mt-1">{getAgentName(selectedLead.agent_id)}</p>
                </div>
                <div className="bg-[#f7f8fa] rounded-lg p-3">
                  <p className="text-xs font-inter text-[#636363] uppercase tracking-wider">Budget</p>
                  <p className="text-sm font-inter text-[#001731] mt-1">{selectedLead.budget ? `KSh ${selectedLead.budget.toLocaleString()}` : '—'}</p>
                </div>
                <div className="bg-[#f7f8fa] rounded-lg p-3">
                  <p className="text-xs font-inter text-[#636363] uppercase tracking-wider">Received</p>
                  <p className="text-sm font-inter text-[#001731] mt-1">{new Date(selectedLead.created_at).toLocaleDateString('en-GB')}</p>
                </div>
              </div>

              {selectedLead.notes && (
                <div>
                  <p className="text-xs font-inter text-[#636363] uppercase tracking-wider mb-2">Notes</p>
                  <div className="bg-[#f7f8fa] rounded-lg p-3">
                    <p className="text-sm font-inter text-[#001731] leading-relaxed">{selectedLead.notes}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => { setAssignModal(selectedLead.id); setSelectedLead(null); }}
                  className="flex-1 px-4 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter text-[#636363] hover:bg-[#f7f8fa] transition-all cursor-pointer"
                >
                  <i className="ri-user-add-line mr-1" /> Assign
                </button>
                <button
                  onClick={() => { setSelectedLead(null); }}
                  className="flex-1 px-4 py-2.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-sm font-inter transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Agent Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssignModal(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-inter text-base text-[#001731] mb-4">Assign Agent</h3>
            <div className="space-y-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAssignAgent(assignModal, agent.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f7f8fa] transition-colors text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0d5959]/8 flex items-center justify-center">
                    <span className="text-[#0d5959] text-xs font-semibold">{agent.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm font-inter text-[#001731]">{agent.name}</span>
                </button>
              ))}
              {agents.length === 0 && (
                <p className="text-sm font-inter text-[#636363] text-center py-4">No agents available. Add agents first.</p>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-[#f0f0f0]">
              <button
                onClick={() => setAssignModal(null)}
                className="w-full px-4 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter text-[#636363] hover:bg-[#f7f8fa] transition-all cursor-pointer"
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
            <h3 className="font-inter text-base text-[#001731] mb-4">Add Note</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] min-h-[100px] resize-none"
              placeholder="Enter note..."
              maxLength={500}
            />
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => { setNoteModal(null); setNoteText(''); }}
                className="flex-1 px-4 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter text-[#636363] hover:bg-[#f7f8fa] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddNote(noteModal)}
                className="flex-1 px-4 py-2.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-sm font-inter transition-all cursor-pointer"
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
          <div className="relative bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
              <h2 className="font-inter text-base font-semibold text-[#001731]">Add New Lead</h2>
              <button onClick={() => setAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f8fa] cursor-pointer">
                <i className="ri-close-line text-[#636363] text-lg" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">First Name *</label>
                  <input
                    type="text"
                    value={addForm.first_name}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, first_name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    value={addForm.last_name}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">Email *</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
                  placeholder="+254 712 345 678"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">Source</label>
                  <select
                    value={addForm.source}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, source: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer"
                  >
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="social">Social</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s} className="capitalize">{statusLabels[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">Budget (KES)</label>
                <input
                  type="number"
                  value={addForm.budget}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, budget: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">Notes</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] min-h-[80px] resize-none"
                  placeholder="Additional notes..."
                  maxLength={500}
                />
                <p className="text-xs font-inter text-[#636363] mt-1">{addForm.notes.length}/500</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter text-[#636363] hover:bg-[#f7f8fa] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLead}
                  disabled={adding}
                  className="flex-1 px-4 py-2.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-sm font-inter transition-all cursor-pointer disabled:opacity-50"
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