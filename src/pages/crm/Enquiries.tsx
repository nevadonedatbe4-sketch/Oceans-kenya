import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';

interface Enquiry {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  source: string | null;
  listing_id: string | null;
  agent_id: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

interface Agent {
  id: string;
  name: string;
}

interface EnquiryCounts {
  all: number;
  unread: number;
  read: number;
  replied: number;
}

const statusColors: Record<string, string> = {
  new: 'bg-[#dc2626] text-white',
  read: 'bg-[#088135] text-white',
  replied: 'bg-[#0d5959] text-white',
  archived: 'bg-[#9ca3af] text-white',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  read: 'Read',
  replied: 'Replied',
  archived: 'Archived',
};

const COLORS = {
  navy: '#001731',
  gray: '#88929e',
  border: '#e5e7eb',
};

export default function Enquiries() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { agentId } = useAgentProfile();
  const isAgent = user?.role === 'agent';
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<EnquiryCounts>({ all: 0, unread: 0, read: 0, replied: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyModal, setReplyModal] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    const { data } = await supabase.from('agents').select('id, name').order('name');
    setAgents(data || []);
  }, []);

  const fetchCounts = useCallback(async () => {
    let allQ = supabase.from('leads').select('*', { count: 'exact', head: true });
    let unreadQ = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('is_read', false);
    let readQ = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('is_read', true);
    let repliedQ = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'replied');

    if (isAgent && agentId) {
      allQ = allQ.eq('agent_id', agentId);
      unreadQ = unreadQ.eq('agent_id', agentId);
      readQ = readQ.eq('agent_id', agentId);
      repliedQ = repliedQ.eq('agent_id', agentId);
    }

    const [{ count: allCount }, { count: unreadCount }, { count: readCount }, { count: repliedCount }] =
      await Promise.all([allQ, unreadQ, readQ, repliedQ]);

    setCounts({
      all: allCount ?? 0,
      unread: unreadCount ?? 0,
      read: readCount ?? 0,
      replied: repliedCount ?? 0,
    });
  }, [isAgent, agentId]);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);

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

    if (statusFilter === 'unread') {
      countQuery = countQuery.eq('is_read', false);
      dataQuery = dataQuery.eq('is_read', false);
    } else if (statusFilter === 'read') {
      countQuery = countQuery.eq('is_read', true);
      dataQuery = dataQuery.eq('is_read', true);
    } else if (statusFilter === 'replied') {
      countQuery = countQuery.eq('status', 'replied');
      dataQuery = dataQuery.eq('status', 'replied');
    } else if (statusFilter === 'archived') {
      countQuery = countQuery.eq('status', 'archived');
      dataQuery = dataQuery.eq('status', 'archived');
    }

    if (search.trim()) {
      const term = search.trim();
      const orQuery = `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,message.ilike.%${term}%`;
      countQuery = countQuery.or(orQuery);
      dataQuery = dataQuery.or(orQuery);
    }

    const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);

    if (error) {
      console.error('Error fetching enquiries:', error);
      addToast('Failed to load enquiries', 'error');
    } else {
      setEnquiries(data || []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, statusFilter, search, isAgent, agentId]);

  useEffect(() => {
    fetchAgents();
    fetchCounts();
  }, [fetchAgents, fetchCounts]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const handleMarkRead = async (id: string, read: boolean) => {
    setUpdatingId(id);
    const { error } = await supabase.from('leads').update({ is_read: read }).eq('id', id);
    if (error) {
      addToast('Failed to update status', 'error');
    } else {
      setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, is_read: read } : e)));
      addToast(read ? 'Marked as read' : 'Marked as unread', 'success');
      fetchCounts();
    }
    setUpdatingId(null);
  };

  const handleArchive = async (id: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from('leads').update({ status: 'archived' }).eq('id', id);
    if (error) {
      addToast('Failed to archive', 'error');
    } else {
      setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'archived' } : e)));
      addToast('Enquiry archived', 'success');
      fetchCounts();
    }
    setUpdatingId(null);
  };

  const handleReply = async (id: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from('leads').update({ status: 'replied', is_read: true }).eq('id', id);
    if (error) {
      addToast('Failed to update status', 'error');
    } else {
      setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'replied', is_read: true } : e)));
      addToast('Marked as replied', 'success');
      fetchCounts();
    }
    setUpdatingId(null);
    setReplyModal(null);
    setReplyText('');
  };

  const handleDelete = async (id: string) => {
    const { data, error } = await supabase.from('leads').delete().eq('id', id).select();
    if (error) {
      addToast(`Failed to delete: ${error.message}`, 'error');
    } else if (!data || data.length === 0) {
      addToast('Delete blocked by access rules. Check your permissions.', 'error');
    } else {
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      addToast('Enquiry deleted', 'success');
      fetchCounts();
    }
    setDeleteConfirm(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === enquiries.length && enquiries.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(enquiries.map((e) => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { data, error } = await supabase.from('leads').delete().in('id', ids).select();
    if (error) {
      addToast(`Failed to delete: ${error.message}`, 'error');
    } else {
      const deletedCount = data?.length ?? 0;
      if (deletedCount === 0) {
        addToast('Delete blocked by access rules. Check your permissions.', 'error');
      } else {
        setEnquiries((prev) => prev.filter((e) => !ids.includes(e.id)));
        setTotal((prev) => Math.max(0, prev - deletedCount));
        addToast(`${deletedCount} enquiries deleted`, 'success');
      }
      setSelectedIds(new Set());
      fetchCounts();
    }
    setBulkDeleteConfirm(false);
  };

  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, search, page]);

  const getInitials = (enquiry: Enquiry) => {
    const f = enquiry.first_name?.charAt(0) || '';
    const l = enquiry.last_name?.charAt(0) || '';
    return (f + l).toUpperCase() || '?';
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return 'Unassigned';
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name || 'Unknown';
  };

  const tabs = [
    { key: 'all', label: 'All Enquiries' },
    { key: 'unread', label: 'Unread' },
    { key: 'read', label: 'Read' },
    { key: 'replied', label: 'Replied' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: COLORS.navy }}>Enquiries &amp; Messages</h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.gray }}>Manage all property enquiries and contact messages</p>
        </div>
      </div>

      {/* Counter Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === tab.key
                ? 'bg-[#5eead4] text-[#001731] lg:bg-[#001731] lg:text-white'
                : 'bg-[#012144] border border-[#1c3a5e] text-[#6b7280] lg:bg-white lg:border-[#e5e7eb] lg:text-[#636363] hover:text-white lg:hover:text-[#001731]'
            }`}
          >
            {tab.label}
            <span className="ml-1.5">{counts[tab.key as keyof EnquiryCounts] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="relative flex-1 max-w-sm w-full">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6b7280] lg:text-[#88929e]" />
          <input
            type="text"
            placeholder="Search enquiries by name, email, message..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none bg-[#012144] lg:bg-white border-[#1c3a5e] lg:border-[#e5e7eb] text-white lg:text-[#001731] placeholder:text-[#6b7280] lg:placeholder:text-[#88929e]"
          />
        </div>
        <span className="text-xs font-medium text-[#6b7280] lg:text-[#88929e]">{total} total enquiries</span>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm font-semibold text-red-700">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => setBulkDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-delete-bin-line" />
            Delete Selected
          </button>
        </div>
      )}

      {/* List */}
      <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-lg overflow-hidden" style={{ borderColor: COLORS.border }}>
        {/* Mobile Cards */}
        <div className="lg:hidden space-y-0">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-4 py-4 border-b border-[#1c3a5e]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-[#012a52] animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-28 bg-[#012a52] rounded animate-pulse" />
                    <div className="h-3 w-20 bg-[#012a52] rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-3 w-48 bg-[#012a52] rounded animate-pulse" />
              </div>
            ))
          ) : enquiries.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-[#0d5959]/20 flex items-center justify-center mx-auto mb-3">
                <i className="ri-mail-line text-[#5eead4] text-xl" />
              </div>
              <p className="text-sm font-medium text-[#6b7280]">
                {total === 0 ? 'No enquiries yet. Messages will appear here when submitted.' : 'No enquiries match your filters.'}
              </p>
            </div>
          ) : (
            enquiries.map((enquiry) => {
              const displayStatus = enquiry.status === 'replied' ? 'replied' : enquiry.is_read ? 'read' : 'new';
              return (
                <div
                  key={enquiry.id}
                  onClick={() => setSelectedEnquiry(enquiry)}
                  className={`px-4 py-4 border-b border-[#1c3a5e] cursor-pointer ${!enquiry.is_read ? 'bg-[#001731]/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(enquiry.id)}
                        onChange={(e) => { e.stopPropagation(); toggleSelect(enquiry.id); }}
                        className="w-4 h-4 rounded border-gray-300 text-[#0d5959] focus:ring-[#0d5959] cursor-pointer shrink-0"
                      />
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: !enquiry.is_read ? '#dc2626' : '#1c3a5e' }}>
                        <span className={`text-xs font-semibold ${!enquiry.is_read ? 'text-white' : 'text-[#6b7280]'}`}>{getInitials(enquiry)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${!enquiry.is_read ? 'text-white' : 'text-[#6b7280]'}`}>
                          {enquiry.first_name} {enquiry.last_name}
                        </p>
                        <p className="text-xs text-[#6b7280] truncate">{enquiry.email}</p>
                      </div>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap flex-shrink-0 ${
                      displayStatus === 'new' ? 'bg-[#dc2626]/20 text-red-300' :
                      displayStatus === 'read' ? 'bg-[#088135]/20 text-[#5eead4]' :
                      displayStatus === 'replied' ? 'bg-[#0d5959]/30 text-[#5eead4]' :
                      'bg-[#1c3a5e] text-[#6b7280]'
                    }`}>
                      {statusLabels[displayStatus] || displayStatus}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed truncate mt-2 ${!enquiry.is_read ? 'font-medium text-[#e5e7eb]' : 'text-[#6b7280]'}`}>
                    {enquiry.message || 'No message provided'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {!enquiry.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(enquiry.id, true); }}
                        disabled={updatingId === enquiry.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-[#0d5959]/20 text-[#5eead4] transition-colors"
                      >
                        <i className="ri-mail-open-line text-xs" />
                        Read
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setReplyModal(enquiry.id); setReplyText(''); }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-[#0d5959]/20 text-[#5eead4] transition-colors"
                    >
                      <i className="ri-reply-line text-xs" />
                      Reply
                    </button>
                    <span className="text-xs text-[#6b7280] ml-auto">
                      {new Date(enquiry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: COLORS.border }}>
                <th className="px-2 md:px-3 py-3.5 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === enquiries.length && enquiries.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#0d5959] focus:ring-[#0d5959] cursor-pointer"
                  />
                </th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.gray }}>Sender</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.gray }}>Message Preview</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: COLORS.gray }}>Source</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.gray }}>Status</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: COLORS.gray }}>Date</th>
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.gray }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#f0f0f0' }}>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-2 md:px-3 py-4"><div className="h-4 w-4 bg-[#f7f8fa] rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#f7f8fa] animate-pulse" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-28 bg-[#f7f8fa] rounded animate-pulse" />
                          <div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-5 py-4"><div className="h-3 w-48 bg-[#f7f8fa] rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-4 hidden md:table-cell"><div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-4"><div className="h-5 w-16 bg-[#f7f8fa] rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-4 hidden md:table-cell"><div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" /></td>
                    <td className="px-4 md:px-5 py-4"><div className="h-8 w-20 bg-[#f7f8fa] rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 md:px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#e6f4ea' }}>
                        <i className="ri-mail-line text-[#088135] text-xl" />
                      </div>
                      <p className="text-sm font-medium" style={{ color: COLORS.gray }}>
                        {total === 0 ? 'No enquiries yet. Messages will appear here when submitted.' : 'No enquiries match your filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                enquiries.map((enquiry) => {
                  const displayStatus = enquiry.status === 'replied' ? 'replied' : enquiry.is_read ? 'read' : 'new';
                  return (
                    <tr
                      key={enquiry.id}
                      onClick={() => setSelectedEnquiry(enquiry)}
                      className={`hover:bg-[#f7f8fa]/80 transition-colors group cursor-pointer ${!enquiry.is_read ? 'bg-[#f7f8fa]/40' : ''}`}
                    >
                      <td className="px-2 md:px-3 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(enquiry.id)}
                          onChange={() => toggleSelect(enquiry.id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#0d5959] focus:ring-[#0d5959] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 md:px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: !enquiry.is_read ? '#dc2626' : '#e5e7eb' }}>
                            <span className={`text-xs font-semibold ${!enquiry.is_read ? 'text-white' : 'text-[#636363]'}`}>{getInitials(enquiry)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${!enquiry.is_read ? 'text-[#001731]' : 'text-[#636363]'}`}>
                              {enquiry.first_name} {enquiry.last_name}
                            </p>
                            <p className="text-xs truncate" style={{ color: COLORS.gray }}>{enquiry.email}</p>
                            {enquiry.phone && (
                              <p className="text-[11px] truncate" style={{ color: '#a0a0a0' }}>{enquiry.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-4 max-w-[320px]">
                        <p className={`text-xs leading-relaxed truncate ${!enquiry.is_read ? 'font-medium text-[#001731]' : 'text-[#636363]'}`}>
                          {enquiry.message || 'No message provided'}
                        </p>
                      </td>
                      <td className="px-4 md:px-5 py-4 hidden md:table-cell">
                        <span className="text-xs capitalize" style={{ color: COLORS.gray }}>{enquiry.source || '—'}</span>
                      </td>
                      <td className="px-4 md:px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap ${statusColors[displayStatus] || 'bg-[#f7f8fa] text-[#636363]'}`}>
                          {statusLabels[displayStatus] || displayStatus}
                        </span>
                      </td>
                      <td className="px-4 md:px-5 py-4 hidden md:table-cell">
                        <span className="text-xs" style={{ color: COLORS.gray }}>
                          {new Date(enquiry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 md:px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {!enquiry.is_read && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkRead(enquiry.id, true); }}
                              disabled={updatingId === enquiry.id}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors cursor-pointer hover:bg-[#f7f8fa] whitespace-nowrap"
                              style={{ borderColor: COLORS.border, color: COLORS.navy }}
                              title="Mark as read"
                            >
                              <i className="ri-mail-open-line text-xs" />
                              Read
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setReplyModal(enquiry.id); setReplyText(''); }}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors cursor-pointer hover:bg-[#f7f8fa] whitespace-nowrap"
                            style={{ borderColor: COLORS.border, color: COLORS.navy }}
                            title="Reply"
                          >
                            <i className="ri-reply-line text-xs" />
                            Reply
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleArchive(enquiry.id); }}
                            disabled={updatingId === enquiry.id}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors cursor-pointer hover:bg-[#f7f8fa] whitespace-nowrap"
                            style={{ borderColor: COLORS.border, color: COLORS.gray }}
                            title="Archive"
                          >
                            <i className="ri-archive-line text-xs" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(enquiry.id); }}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold border transition-colors cursor-pointer hover:bg-[#fef2f2] whitespace-nowrap"
                            style={{ borderColor: COLORS.border, color: '#dc2626' }}
                            title="Delete"
                          >
                            <i className="ri-delete-bin-line text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && enquiries.length > 0 && (
          <CRMPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Enquiry Detail Panel */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedEnquiry(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: COLORS.border }}>
              <h2 className="font-semibold text-base" style={{ color: COLORS.navy }}>Enquiry Details</h2>
              <button onClick={() => setSelectedEnquiry(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f8fa] cursor-pointer">
                <i className="ri-close-line text-lg" style={{ color: COLORS.gray }} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: !selectedEnquiry.is_read ? '#dc2626' : '#e5e7eb' }}>
                  <span className={`text-lg font-semibold ${!selectedEnquiry.is_read ? 'text-white' : 'text-[#636363]'}`}>{getInitials(selectedEnquiry)}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-base" style={{ color: COLORS.navy }}>{selectedEnquiry.first_name} {selectedEnquiry.last_name}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold capitalize mt-1 ${statusColors[selectedEnquiry.status === 'replied' ? 'replied' : selectedEnquiry.is_read ? 'read' : 'new'] || 'bg-[#f7f8fa] text-[#636363]'}`}>
                    {statusLabels[selectedEnquiry.status === 'replied' ? 'replied' : selectedEnquiry.is_read ? 'read' : 'new'] || selectedEnquiry.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#f7f8fa] rounded-lg p-3">
                  <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.gray }}>Email</p>
                  <p className="text-sm font-medium mt-1" style={{ color: COLORS.navy }}>{selectedEnquiry.email}</p>
                </div>
                <div className="bg-[#f7f8fa] rounded-lg p-3">
                  <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.gray }}>Phone</p>
                  <p className="text-sm font-medium mt-1" style={{ color: COLORS.navy }}>{selectedEnquiry.phone || '—'}</p>
                </div>
                <div className="bg-[#f7f8fa] rounded-lg p-3">
                  <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.gray }}>Source</p>
                  <p className="text-sm font-medium mt-1" style={{ color: COLORS.navy }}>{selectedEnquiry.source || '—'}</p>
                </div>
                <div className="bg-[#f7f8fa] rounded-lg p-3">
                  <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.gray }}>Received</p>
                  <p className="text-sm font-medium mt-1" style={{ color: COLORS.navy }}>{new Date(selectedEnquiry.created_at).toLocaleDateString('en-GB')}</p>
                </div>
              </div>

              {selectedEnquiry.message && (
                <div>
                  <p className="text-xs uppercase tracking-wider mb-2" style={{ color: COLORS.gray }}>Message</p>
                  <div className="bg-[#f7f8fa] rounded-lg p-4">
                    <p className="text-sm leading-relaxed" style={{ color: COLORS.navy }}>{selectedEnquiry.message}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                {!selectedEnquiry.is_read && (
                  <button
                    onClick={() => { handleMarkRead(selectedEnquiry.id, true); setSelectedEnquiry(null); }}
                    className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium transition-all cursor-pointer hover:bg-[#f7f8fa]"
                    style={{ borderColor: COLORS.border, color: COLORS.navy }}
                  >
                    <i className="ri-mail-open-line mr-1" /> Mark as Read
                  </button>
                )}
                <button
                  onClick={() => { setReplyModal(selectedEnquiry.id); setSelectedEnquiry(null); setReplyText(''); }}
                  className="flex-1 px-4 py-2.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-sm font-medium transition-all cursor-pointer"
                >
                  <i className="ri-reply-line mr-1" /> Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setReplyModal(null); setReplyText(''); }} />
          <div className="relative bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-semibold text-base mb-4" style={{ color: COLORS.navy }}>Reply to Enquiry</h3>
            <p className="text-xs mb-3" style={{ color: COLORS.gray }}>Mark this enquiry as replied. (Email sending coming soon.)</p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none min-h-[120px] resize-none"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
              placeholder="Type your reply..."
              maxLength={500}
            />
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => { setReplyModal(null); setReplyText(''); }}
                className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium transition-all cursor-pointer hover:bg-[#f7f8fa]"
                style={{ borderColor: COLORS.border, color: COLORS.navy }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReply(replyModal)}
                className="flex-1 px-4 py-2.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-sm font-medium transition-all cursor-pointer"
              >
                <i className="ri-reply-line mr-1" /> Send Reply
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Enquiry?"
        message="This will permanently remove this enquiry. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmModal
        open={bulkDeleteConfirm}
        title={`Delete ${selectedIds.size} Enquiries?`}
        message={`This will permanently remove all ${selectedIds.size} selected enquiries. This action cannot be undone.`}
        confirmLabel="Delete All"
        confirmVariant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />
    </div>
  );
}