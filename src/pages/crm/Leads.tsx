import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import BulkActionBar from '@/pages/crm/components/BulkActionBar';
import LabelPickerModal from '@/pages/crm/components/LabelPickerModal';
import ForwardModal from '@/pages/crm/components/ForwardModal';
import { logLeadUpdated, logLeadDeleted, logLeadAssigned, logLeadCreated } from '@/lib/activityLogger';
import { notifyCrm } from '@/lib/crmNotify';
import { displayPersonName } from '@/lib/crmDisplay';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import type { Lead, Agent } from './leads/types';
import { statusOptions, statusLabels, clientTypeOptions, clientTypeLabels } from './leads/types';
import { MESSAGE_TABS, EMPTY_COUNTS, type MessageTabKey, type MessageCounts } from './messageSystem';
import LeadTable from './leads/components/LeadTable';
import LeadDetailPanel from './leads/components/LeadDetailPanel';

export default function Leads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { agentId, loading: agentLoading } = useAgentProfile();
  const isAgent = user?.role === 'agent';
  // Deep-link support: the Super Admin agent preview links here with ?agent=<id>
  // so the list lands pre-filtered to that agent.
  const [searchParams] = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<MessageCounts>(EMPTY_COUNTS);
  const [messageTab, setMessageTab] = useState<MessageTabKey>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState(searchParams.get('agent') || 'all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [clientTypeFilter, setClientTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
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
  const [emptyTrashConfirm, setEmptyTrashConfirm] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [labelTarget, setLabelTarget] = useState<'bulk' | 'single' | null>(null);
  const [forwardTarget, setForwardTarget] = useState<Lead | null>(null);
  const [loadError, setLoadError] = useState(false);

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
    if (isAgent && !agentId) {
      addToast('Your agent profile is not ready. Please contact support.', 'error');
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
      labels: [],
      is_trashed: false,
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
    // SECURITY: an agent must never see the full agent roster.
    // Agents only work on their own records, so the assign/roster UI is admin-only.
    if (isAgent) { setAgents([]); return; }
    const { data } = await supabase.from('agents').select('id, name').order('name');
    setAgents(data || []);
  }, [isAgent]);

  const fetchCounts = useCallback(async () => {
    if (isAgent) {
      if (agentLoading) return;
      // SECURITY: never run an unscoped query for an agent. If the ownership id
      // is not yet resolved, the agent sees exactly zero records — no global data.
      if (!agentId) { setCounts(EMPTY_COUNTS); return; }
    }
    let q = supabase.from('leads').select('is_read,is_starred,is_important,is_spam,is_archived,is_trashed,reply_status');
    if (isAgent) q = q.eq('agent_id', agentId);
    const { data } = await q;
    const rows = (data || []) as Lead[];
    const c: MessageCounts = { ...EMPTY_COUNTS };
    for (const r of rows) {
      if (r.is_trashed) { c.trash++; continue; }
      if (r.is_spam) { c.spam++; continue; }
      if (r.is_archived) { c.archived++; continue; }
      c.all++;
      if (!r.is_read) c.unread++; else c.read++;
      if (r.is_starred) c.starred++;
      if (r.is_important) c.important++;
      if (r.reply_status === 'replied') c.sent++;
    }
    setCounts(c);
  }, [isAgent, agentId, agentLoading]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    if (isAgent) {
      if (agentLoading) return;
      // SECURITY: without an authoritative ownership id an agent gets nothing.
      if (!agentId) { setLeads([]); setTotal(0); setLoading(false); return; }
    }

    let countQuery = supabase.from('leads').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (isAgent) {
      countQuery = countQuery.eq('agent_id', agentId);
      dataQuery = dataQuery.eq('agent_id', agentId);
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
    if (statusFilter !== 'all') {
      countQuery = countQuery.eq('status', statusFilter);
      dataQuery = dataQuery.eq('status', statusFilter);
    }

    if (messageTab === 'trash') {
      countQuery = countQuery.eq('is_trashed', true);
      dataQuery = dataQuery.eq('is_trashed', true);
    } else if (messageTab === 'spam') {
      countQuery = countQuery.eq('is_spam', true).eq('is_trashed', false);
      dataQuery = dataQuery.eq('is_spam', true).eq('is_trashed', false);
    } else if (messageTab === 'archived') {
      countQuery = countQuery.eq('is_archived', true).eq('is_spam', false).eq('is_trashed', false);
      dataQuery = dataQuery.eq('is_archived', true).eq('is_spam', false).eq('is_trashed', false);
    } else {
      countQuery = countQuery.eq('is_trashed', false).eq('is_spam', false).eq('is_archived', false);
      dataQuery = dataQuery.eq('is_trashed', false).eq('is_spam', false).eq('is_archived', false);
      if (messageTab === 'unread') { countQuery = countQuery.eq('is_read', false); dataQuery = dataQuery.eq('is_read', false); }
      else if (messageTab === 'read') { countQuery = countQuery.eq('is_read', true); dataQuery = dataQuery.eq('is_read', true); }
      else if (messageTab === 'starred') { countQuery = countQuery.eq('is_starred', true); dataQuery = dataQuery.eq('is_starred', true); }
      else if (messageTab === 'important') { countQuery = countQuery.eq('is_important', true); dataQuery = dataQuery.eq('is_important', true); }
      else if (messageTab === 'sent') { countQuery = countQuery.eq('reply_status', 'replied'); dataQuery = dataQuery.eq('reply_status', 'replied'); }
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
      setLoadError(true);
    } else {
      setLeads(data || []);
      setTotal(count ?? 0);
      setLoadError(false);
    }
    setLoading(false);
  }, [page, pageSize, messageTab, statusFilter, agentFilter, sourceFilter, clientTypeFilter, search, isAgent, agentId, agentLoading]);

  useEffect(() => {
    fetchAgents();
    fetchCounts();
  }, [fetchAgents, fetchCounts]);

  useLayoutEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Live cross-CRM sync: a new website enquiry or a status change elsewhere
  // reloads the list and the tab counts so nothing shown here goes stale.
  useRealtimeRefresh({
    channelName: 'crm-leads-live',
    tables: ['leads'],
    enabled: !agentLoading,
    onChange: () => { fetchLeads(); fetchCounts(); },
  });

  useEffect(() => {
    setSelectedLeadIds(new Set());
  }, [messageTab, statusFilter, search, page, agentFilter, sourceFilter, clientTypeFilter]);

  const patchLocal = (ids: string[], patch: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => (ids.includes(l.id) ? { ...l, ...patch } : l)));
    if (selectedLead && ids.includes(selectedLead.id)) setSelectedLead((prev) => (prev ? { ...prev, ...patch } : null));
  };

  const updateLeads = async (ids: string[], patch: Record<string, unknown>, toast?: string, logKey?: string) => {
    setUpdatingId(ids.length === 1 ? ids[0] : 'bulk');
    const { error } = await supabase.from('leads').update(patch).in('id', ids);
    if (error) {
      console.error('Update leads failed:', error);
      addToast(error.message || 'Unable to update. Please try again.', 'error');
    } else {
      patchLocal(ids, patch as Partial<Lead>);
      if (toast) addToast(toast, 'success');
      fetchCounts();
    }
    setUpdatingId(null);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    await updateLeads([id], { status: newStatus }, `Lead marked as ${newStatus}`);
    if (user) logLeadUpdated(user.id, user.name || user.email, id, `${lead.first_name} ${lead.last_name}`, { status: lead.status }, { status: newStatus });
    setActionMenu(null);
  };

  const handleToggleRead = async (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const nextRead = !lead.is_read;
    await updateLeads([id], { is_read: nextRead }, nextRead ? 'Lead marked as read' : 'Lead marked as unread');
    setActionMenu(null);
  };

  const handleToggleStar = (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    updateLeads([id], { is_starred: !lead.is_starred });
    setActionMenu(null);
  };

  const handleToggleImportant = (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    updateLeads([id], { is_important: !lead.is_important });
    setActionMenu(null);
  };

  const handleMarkSpam = (id: string) => {
    updateLeads([id], { is_spam: true, is_archived: false }, 'Marked as spam');
    setActionMenu(null);
  };

  const handleArchive = (id: string) => {
    updateLeads([id], { is_archived: true, is_spam: false }, 'Lead archived');
    setActionMenu(null);
  };

  const handleRestore = (id: string) => {
    updateLeads([id], { is_trashed: false, is_spam: false, is_archived: false }, 'Lead restored');
    setActionMenu(null);
  };

  const handleMoveToTrash = (id: string) => {
    updateLeads([id], { is_trashed: true, trashed_at: new Date().toISOString() }, 'Moved to trash');
    setActionMenu(null);
  };

  const handlePermanentDelete = async (ids: string[]) => {
    const lead = leads.find((l) => l.id === ids[0]);
    try {
      const { error } = await supabase.from('leads').delete().in('id', ids);
      if (error) {
        addToast('Failed to delete lead', 'error');
        return;
      }
      setLeads((prev) => prev.filter((l) => !ids.includes(l.id)));
      setTotal((prev) => Math.max(0, prev - ids.length));
      setSelectedLeadIds(new Set());
      if (selectedLead && ids.includes(selectedLead.id)) setSelectedLead(null);
      if (user && lead) logLeadDeleted(user.id, user.name || user.email, lead.id, `${lead.first_name} ${lead.last_name}`);
      addToast(`${ids.length} lead${ids.length !== 1 ? 's' : ''} permanently deleted`, 'success');
      fetchCounts();
    } catch (err) {
      console.error('Permanent delete error:', err);
      addToast('Failed to delete lead', 'error');
    }
    setActionMenu(null);
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    if (!lead.is_read) handleToggleRead(lead.id);
  };

  const handleAssignAgent = async (leadId: string, newAgentId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const agent = newAgentId ? agents.find((a) => a.id === newAgentId) : null;
    await updateLeads([leadId], { agent_id: newAgentId || null }, `Assigned to ${agent?.name || 'Unassigned'}`);
    if (user) logLeadAssigned(user.id, user.name || user.email, leadId, `${lead.first_name} ${lead.last_name}`, agent?.name || 'Unassigned');
    if (newAgentId) {
      notifyCrm({
        event: 'lead_assigned',
        lead_id: leadId,
        lead_name: `${lead.first_name} ${lead.last_name}`.trim(),
        agent_id: newAgentId,
      });
    }
    setAssignModal(null);
    setActionMenu(null);
  };

  const handleAddNote = async (leadId: string) => {
    await updateLeads([leadId], { notes: noteText }, 'Note added');
    setNoteModal(null);
    setNoteText('');
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
    if (selectedLeadIds.size === leads.length && leads.length > 0) setSelectedLeadIds(new Set());
    else setSelectedLeadIds(new Set(leads.map((l) => l.id)));
  };

  const selectedRows = leads.filter((l) => selectedLeadIds.has(l.id));
  const allStarred = selectedRows.length > 0 && selectedRows.every((l) => l.is_starred);
  const allImportant = selectedRows.length > 0 && selectedRows.every((l) => l.is_important);

  const bulkUpdate = (patch: Record<string, unknown>, toast?: string) => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;
    updateLeads(ids, patch, toast);
    setSelectedLeadIds(new Set());
  };

  const openLabelPicker = (target: 'bulk' | 'single', id?: string) => {
    setLabelTarget(target);
    setLabelPickerOpen(true);
    setActionMenu(null);
  };

  const applyLabels = async (labels: string[]) => {
    if (labelTarget === 'single' && selectedLead) {
      await updateLeads([selectedLead.id], { labels }, 'Labels updated');
    } else {
      await bulkUpdate({ labels }, 'Labels updated');
    }
    setLabelPickerOpen(false);
    setLabelTarget(null);
  };

  const handleForward = async (recipient: string, note: string) => {
    if (!forwardTarget) throw new Error('No lead selected');
    const senderName = displayPersonName(forwardTarget.first_name, forwardTarget.last_name);
    const { error: fnError, data } = await supabase.functions.invoke('forward-message', {
      body: {
        to: recipient,
        subject: `Lead: ${senderName}`,
        senderName,
        body: forwardTarget.message || forwardTarget.notes || '',
        note,
      },
    });
    if (fnError || (data && data.error)) {
      throw new Error(data?.error || fnError?.message || 'Failed to forward');
    }
    // Record forward in the conversation thread for history.
    const { data: conv } = await supabase.from('conversations').select('id').eq('lead_id', forwardTarget.id).maybeSingle();
    let convId = conv?.id;
    if (!convId) {
      const { data: created } = await supabase
        .from('conversations')
        .insert({ lead_id: forwardTarget.id, subject: `Lead: ${senderName}`, status: 'active', agent_id: forwardTarget.agent_id })
        .select('id')
        .single();
      if (created) convId = created.id;
    }
    if (convId) {
      await supabase.from('conversation_messages').insert({
        conversation_id: convId,
        sender_type: 'agent',
        sender_name: user?.name || user?.email || 'Agent',
        sender_id: user?.id,
        agent_id: agentId || null,
        body: `Forwarded to ${recipient}${note ? `\nNote: ${note}` : ''}`,
        delivery_status: 'sent',
      });
    }
    await supabase.from('leads').update({ reply_status: 'replied', is_read: true, last_activity_at: new Date().toISOString() }).eq('id', forwardTarget.id);
    patchLocal([forwardTarget.id], { reply_status: 'replied', is_read: true });
    fetchCounts();
    addToast(`Lead forwarded to ${recipient}`, 'success');
  };

  const handleExportCSV = async () => {
    setExporting(true);
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (isAgent) query = query.eq('agent_id', agentId);
    const { data } = await query;
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
    if (selectedLead?.id === updated.id) setSelectedLead(updated);
  };

  const sources = ['all', ...Array.from(new Set(leads.map((l) => l.source).filter(Boolean)))].sort();
  const inTrash = messageTab === 'trash';

  return (
    <div className="space-y-5">
      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-[#f58300]/20 bg-[#fff5e6] px-4 py-2.5">
          <i className="ri-error-warning-line text-[#f58300] text-sm" />
          <p className="text-xs sm:text-sm font-inter text-[#f58300]">Couldn&apos;t load leads. Showing the last known state.</p>
          <button
            onClick={() => { fetchLeads(); fetchCounts(); }}
            className="ml-auto text-xs font-inter font-medium text-[#f58300] underline hover:text-amber-900 cursor-pointer whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}
      {/* Management tabs - horizontally scrollable single row so they never wrap into a tower on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto tab-scroll -mx-1 px-1">
        {MESSAGE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setMessageTab(tab.key); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
              messageTab === tab.key
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-background-200 text-foreground-600 hover:text-foreground-900'
            }`}
          >
            <i className={tab.icon} />
            {tab.label}
            <span className="ml-1">{counts[tab.key]}</span>
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
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 bg-white cursor-pointer"
          >
            <option value="all">All Stages</option>
            {statusOptions.map((s) => (
              <option key={s} value={s} className="capitalize">{statusLabels[s]}</option>
            ))}
          </select>
          {!isAgent && (
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
          )}
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
          {inTrash && counts.trash > 0 && !isAgent && (
            <button
              onClick={() => setEmptyTrashConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="ri-delete-bin-6-line" />
              Empty Trash
            </button>
          )}
          {!isAgent && (
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-teal text-teal rounded-lg text-xs font-semibold hover:bg-teal hover:text-crm-navy transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <i className="ri-download-line" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          )}
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

      {/* Bulk actions bar — admin-only */}
      {!isAgent && selectedLeadIds.size > 0 && (
        <BulkActionBar
          count={selectedLeadIds.size}
          starActive={allStarred}
          importantActive={allImportant}
          onRead={() => bulkUpdate({ is_read: true }, 'Marked as read')}
          onUnread={() => bulkUpdate({ is_read: false }, 'Marked as unread')}
          onToggleStar={() => bulkUpdate({ is_starred: !allStarred }, allStarred ? 'Unstarred' : 'Starred')}
          onToggleImportant={() => bulkUpdate({ is_important: !allImportant }, allImportant ? 'Important removed' : 'Marked as important')}
          onSpam={() => bulkUpdate({ is_spam: true, is_archived: false }, 'Marked as spam')}
          onArchive={() => bulkUpdate({ is_archived: true, is_spam: false }, 'Archived')}
          onDelete={() => setBulkDeleteConfirm(true)}
          onLabel={() => openLabelPicker('bulk')}
          onClear={() => setSelectedLeadIds(new Set())}
        />
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
        onDelete={handleMoveToTrash}
        onPermanentDelete={(leadId) => handlePermanentDelete([leadId])}
        onRestore={handleRestore}
        onToggleRead={handleToggleRead}
        onToggleStar={handleToggleStar}
        onToggleImportant={handleToggleImportant}
        onMarkSpam={handleMarkSpam}
        onArchive={handleArchive}
        onOpenLabel={(leadId) => openLabelPicker('single', leadId)}
        onForward={(leadId) => { setForwardTarget(leads.find((l) => l.id === leadId) || null); setActionMenu(null); }}
        agents={agents}
        messageTab={messageTab}
        isAgent={isAgent}
      />

      {!loading && leads.length > 0 && (
        <CRMPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} tone="light" />
      )}

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

      {/* Assign Agent Modal — admin-only */}
      {!isAgent && assignModal && (
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
              <button onClick={() => setAssignModal(null)} className="w-full px-4 py-2.5 border border-background-200 rounded-lg text-sm font-medium text-foreground-600 hover:bg-background-50 transition-all cursor-pointer">
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
              <button onClick={() => { setNoteModal(null); setNoteText(''); }} className="flex-1 px-4 py-2.5 border border-background-200 rounded-lg text-sm font-medium text-foreground-600 hover:bg-background-50 transition-all cursor-pointer">
                Cancel
              </button>
              <button onClick={() => handleAddNote(noteModal)} className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-all cursor-pointer">
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={bulkDeleteConfirm}
        title={`Move ${selectedLeadIds.size} to Trash?`}
        message={`These leads will be moved to Trash. You can restore them from there.`}
        confirmLabel="Move to Trash"
        confirmVariant="danger"
        onConfirm={() => { bulkUpdate({ is_trashed: true, trashed_at: new Date().toISOString() }, 'Moved to trash'); setBulkDeleteConfirm(false); }}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      <ConfirmModal
        open={emptyTrashConfirm}
        title="Empty Trash?"
        message="This permanently deletes all leads in Trash. This cannot be undone."
        confirmLabel="Empty Trash"
        confirmVariant="danger"
        onConfirm={async () => {
          const ids = leads.map((l) => l.id);
          if (ids.length) await handlePermanentDelete(ids);
          setEmptyTrashConfirm(false);
        }}
        onCancel={() => setEmptyTrashConfirm(false)}
      />

      {!isAgent && labelPickerOpen && (
        <LabelPickerModal
          currentLabels={labelTarget === 'single' && selectedLead ? selectedLead.labels : null}
          onClose={() => { setLabelPickerOpen(false); setLabelTarget(null); }}
          onApply={applyLabels}
        />
      )}

      {/* Forward Modal — admin-only */}
      {!isAgent && forwardTarget && (
        <ForwardModal
          subject={`Lead: ${displayPersonName(forwardTarget.first_name, forwardTarget.last_name)}`}
          originalSender={displayPersonName(forwardTarget.first_name, forwardTarget.last_name)}
          body={forwardTarget.message || forwardTarget.notes || ''}
          onClose={() => setForwardTarget(null)}
          onForward={handleForward}
        />
      )}

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
                  <input type="text" value={addForm.first_name} onChange={(e) => setAddForm((prev) => ({ ...prev, first_name: e.target.value }))} className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20" placeholder="John" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Last Name *</label>
                  <input type="text" value={addForm.last_name} onChange={(e) => setAddForm((prev) => ({ ...prev, last_name: e.target.value }))} className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20" placeholder="Doe" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Email *</label>
                <input type="email" value={addForm.email} onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20" placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Phone</label>
                <input type="tel" value={addForm.phone} onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20" placeholder="+254 712 345 678" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Source</label>
                  <select value={addForm.source} onChange={(e) => setAddForm((prev) => ({ ...prev, source: e.target.value }))} className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 bg-white cursor-pointer">
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
                  <select value={addForm.status} onChange={(e) => setAddForm((prev) => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 bg-white cursor-pointer">
                    {statusOptions.map((s) => (
                      <option key={s} value={s} className="capitalize">{statusLabels[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Client Type</label>
                  <select value={addForm.client_type} onChange={(e) => setAddForm((prev) => ({ ...prev, client_type: e.target.value }))} className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 bg-white cursor-pointer">
                    <option value="">Select...</option>
                    {clientTypeOptions.map((ct) => (
                      <option key={ct} value={ct}>{clientTypeLabels[ct]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Move-in / Available</label>
                  <input type="text" value={addForm.move_in_date} onChange={(e) => setAddForm((prev) => ({ ...prev, move_in_date: e.target.value }))} placeholder="e.g. ASAP, September" className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Budget</label>
                <input type="number" value={addForm.budget} onChange={(e) => setAddForm((prev) => ({ ...prev, budget: e.target.value }))} className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20" placeholder="0" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Description / Inquiry</label>
                <textarea value={addForm.message} onChange={(e) => setAddForm((prev) => ({ ...prev, message: e.target.value }))} className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 min-h-[80px] resize-none" placeholder="What is the lead looking for?" maxLength={500} />
                <p className="text-[10px] text-foreground-500 mt-1">{addForm.message.length}/500</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={addForm.notes} onChange={(e) => setAddForm((prev) => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 min-h-[80px] resize-none" placeholder="Additional notes..." maxLength={500} />
                <p className="text-[10px] text-foreground-500 mt-1">{addForm.notes.length}/500</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button onClick={() => setAddModal(false)} className="flex-1 px-4 py-2.5 border border-background-200 rounded-lg text-sm font-medium text-foreground-600 hover:bg-background-50 transition-all cursor-pointer">Cancel</button>
                <button onClick={handleAddLead} disabled={adding} className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-50">
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