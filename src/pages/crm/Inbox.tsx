import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import BulkActionBar from '@/pages/crm/components/BulkActionBar';
import LabelPickerModal from '@/pages/crm/components/LabelPickerModal';
import ForwardModal from '@/pages/crm/components/ForwardModal';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { MESSAGE_TABS, EMPTY_COUNTS, type MessageTabKey, type MessageCounts } from './messageSystem';

interface Enquiry {
  id: string;
  contact_id: string | null;
  lead_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  subject: string | null;
  source: string | null;
  form_name: string | null;
  property_title: string | null;
  agent_id: string | null;
  status: string;
  priority: string;
  is_read: boolean;
  is_starred: boolean;
  is_important: boolean;
  is_archived: boolean;
  is_spam: boolean;
  labels: string[] | null;
  is_trashed: boolean;
  created_at: string;
}

interface ThreadMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string | null;
  body: string;
  created_at: string;
}

const COLORS = {
  navy: '#001731',
  gray: '#88929e',
  border: '#e5e7eb',
  golden: '#c9a84c',
  teal: '#0d5959',
};

export default function Inbox() {
  const { user } = useAuth();
  const { agentId, loading: agentLoading } = useAgentProfile();
  const isAgent = user?.role === 'agent';

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<MessageCounts>(EMPTY_COUNTS);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<MessageTabKey>('all');
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replySentFlash, setReplySentFlash] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Bulk + actions state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [emptyTrashConfirm, setEmptyTrashConfirm] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [labelTarget, setLabelTarget] = useState<'bulk' | 'single' | null>(null);
  const [forwardTarget, setForwardTarget] = useState<Enquiry | null>(null);
  const [loadError, setLoadError] = useState(false);

  const applyAgentFilter = (q: any) => (isAgent ? q.eq('agent_id', agentId) : q);

  const fetchCounts = useCallback(async () => {
    if (isAgent) {
      if (agentLoading) return;
      // SECURITY: an agent with no resolved ownership id sees zero, never global.
      if (!agentId) { setCounts(EMPTY_COUNTS); return; }
    }
    const q = applyAgentFilter(supabase.from('enquiries').select('is_read,is_starred,is_important,is_spam,is_archived,is_trashed,status'));
    const { data } = await q;
    const rows = (data || []) as Enquiry[];
    const c: MessageCounts = { ...EMPTY_COUNTS };
    for (const r of rows) {
      if (r.is_trashed) { c.trash++; continue; }
      if (r.is_spam) { c.spam++; continue; }
      if (r.is_archived) { c.archived++; continue; }
      c.all++;
      if (!r.is_read) c.unread++; else c.read++;
      if (r.is_starred) c.starred++;
      if (r.is_important) c.important++;
      if (r.status === 'replied') c.sent++;
    }
    setCounts(c);
  }, [isAgent, agentId, agentLoading]);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    if (isAgent) {
      if (agentLoading) return;
      // SECURITY: never run an unscoped enquiry query for an agent.
      if (!agentId) { setEnquiries([]); setLoading(false); return; }
    }
    let q = supabase.from('enquiries').select('*').order('created_at', { ascending: false }).limit(200);
    if (isAgent) q = q.eq('agent_id', agentId);

    if (tab === 'trash') q = q.eq('is_trashed', true);
    else if (tab === 'spam') q = q.eq('is_spam', true).eq('is_trashed', false);
    else if (tab === 'archived') q = q.eq('is_archived', true).eq('is_spam', false).eq('is_trashed', false);
    else {
      q = q.eq('is_trashed', false).eq('is_spam', false).eq('is_archived', false);
      if (tab === 'unread') q = q.eq('is_read', false);
      else if (tab === 'read') q = q.eq('is_read', true);
      else if (tab === 'starred') q = q.eq('is_starred', true);
      else if (tab === 'important') q = q.eq('is_important', true);
      else if (tab === 'sent') q = q.eq('status', 'replied');
    }

    if (search.trim()) {
      const term = search.trim();
      q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,message.ilike.%${term}%,property_title.ilike.%${term}%`);
    }

    const { data, error } = await q;
    if (error) {
      addToast('Failed to load messages', 'error');
      setLoadError(true);
    } else {
      setEnquiries(data || []);
      setLoadError(false);
    }
    setLoading(false);
  }, [tab, search, isAgent, agentId, agentLoading]);

  useLayoutEffect(() => {
    fetchCounts();
    fetchEnquiries();
  }, [fetchCounts, fetchEnquiries]);

  // Live cross-CRM sync: a new website message or a reply sent from any CRM
  // updates the list, the counts, and the currently open thread immediately.
  useRealtimeRefresh({
    channelName: 'crm-inbox-live',
    tables: ['enquiries', 'conversation_messages'],
    enabled: !agentLoading,
    onChange: () => {
      fetchEnquiries();
      fetchCounts();
      if (selected) fetchThread(selected.id);
    },
  });

  useEffect(() => {
    setSelectedIds(new Set());
    setSelected(null);
  }, [tab, search]);

  const patchLocal = (ids: string[], patch: Partial<Enquiry>) => {
    setEnquiries((prev) => prev.map((e) => (ids.includes(e.id) ? { ...e, ...patch } : e)));
    if (selected && ids.includes(selected.id)) setSelected((prev) => (prev ? { ...prev, ...patch } : null));
  };

  const updateEnquiries = async (ids: string[], patch: Record<string, unknown>, toast?: string) => {
    setUpdatingId(ids.length === 1 ? ids[0] : 'bulk');
    const { error } = await supabase.from('enquiries').update(patch).in('id', ids);
    if (error) addToast('Failed to update', 'error');
    else {
      patchLocal(ids, patch as Partial<Enquiry>);
      if (toast) addToast(toast, 'success');
      fetchCounts();
    }
    setUpdatingId(null);
  };

  const fetchThread = async (enquiryId: string) => {
    setThreadLoading(true);
    const { data: conv } = await supabase.from('conversations').select('id').eq('enquiry_id', enquiryId).maybeSingle();
    if (!conv) { setConversationId(null); setThread([]); setThreadLoading(false); return; }
    setConversationId(conv.id);
    const { data: msgs } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });
    setThread(msgs || []);
    setThreadLoading(false);
  };

  const handleSelect = async (enquiry: Enquiry) => {
    setSelected(enquiry);
    setActionMenu(null);
    await fetchThread(enquiry.id);
    if (!enquiry.is_read) {
      await supabase.from('enquiries').update({ is_read: true }).eq('id', enquiry.id);
      patchLocal([enquiry.id], { is_read: true });
      fetchCounts();
    }
  };

  const toggleRead = (id: string, read: boolean) => updateEnquiries([id], { is_read: read });
  const toggleStar = (id: string, starred: boolean) => updateEnquiries([id], { is_starred: starred });
  const toggleImportant = (id: string, important: boolean) => updateEnquiries([id], { is_important: important });
  const markSpam = (id: string) => updateEnquiries([id], { is_spam: true, is_archived: false }, 'Marked as spam');
  const archive = (id: string) => updateEnquiries([id], { is_archived: true, is_spam: false }, 'Conversation archived');
  const restore = (id: string) => updateEnquiries([id], { is_trashed: false, is_spam: false, is_archived: false }, 'Restored');
  const moveToTrash = (id: string) => updateEnquiries([id], { is_trashed: true, trashed_at: new Date().toISOString() }, 'Moved to trash');

  const permanentDelete = async (ids: string[]) => {
    const { error } = await supabase.from('enquiries').delete().in('id', ids);
    if (error) addToast('Failed to delete', 'error');
    else {
      setEnquiries((prev) => prev.filter((e) => !ids.includes(e.id)));
      if (selected && ids.includes(selected.id)) setSelected(null);
      setSelectedIds(new Set());
      addToast(`${ids.length} conversation${ids.length !== 1 ? 's' : ''} permanently deleted`, 'success');
      fetchCounts();
    }
  };

  // Bulk actions
  const selectedRows = enquiries.filter((e) => selectedIds.has(e.id));
  const allStarred = selectedRows.length > 0 && selectedRows.every((e) => e.is_starred);
  const allImportant = selectedRows.length > 0 && selectedRows.every((e) => e.is_important);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === enquiries.length && enquiries.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(enquiries.map((e) => e.id)));
  };

  const bulkUpdate = (patch: Record<string, unknown>, toast?: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    updateEnquiries(ids, patch, toast);
    setSelectedIds(new Set());
  };

  const openLabelPicker = (target: 'bulk' | 'single', id?: string) => {
    if (target === 'single' && id) setLabelTarget('single');
    else setLabelTarget('bulk');
    setLabelPickerOpen(true);
    setActionMenu(null);
  };

  const applyLabels = async (labels: string[]) => {
    if (labelTarget === 'single' && selected) {
      await updateEnquiries([selected.id], { labels }, 'Labels updated');
    } else {
      await bulkUpdate({ labels }, 'Labels updated');
    }
    setLabelPickerOpen(false);
    setLabelTarget(null);
  };

  const handleForward = async (recipient: string, note: string) => {
    if (!forwardTarget) throw new Error('No message selected');
    const { error: fnError, data } = await supabase.functions.invoke('forward-message', {
      body: {
        to: recipient,
        subject: forwardTarget.subject || forwardTarget.property_title || 'Enquiry',
        senderName: [forwardTarget.first_name, forwardTarget.last_name].filter(Boolean).join(' ') || forwardTarget.email || 'Unknown',
        body: forwardTarget.message || '',
        note,
      },
    });
    if (fnError || (data && data.error)) {
      throw new Error(data?.error || fnError?.message || 'Failed to forward');
    }
    // Record the forward in the conversation thread for history.
    let convId = conversationId;
    if (!convId) {
      const { data: existing } = await supabase.from('conversations').select('id').eq('enquiry_id', forwardTarget.id).maybeSingle();
      if (existing) convId = existing.id;
      else {
        const { data: created } = await supabase
          .from('conversations')
          .insert({
            contact_id: forwardTarget.contact_id,
            lead_id: forwardTarget.lead_id,
            enquiry_id: forwardTarget.id,
            subject: forwardTarget.subject || forwardTarget.property_title || 'Enquiry',
            status: 'open',
            agent_id: forwardTarget.agent_id,
          })
          .select('id')
          .single();
        if (created) convId = created.id;
      }
    }
    if (convId) {
      await supabase.from('conversation_messages').insert({
        conversation_id: convId,
        sender_type: 'agent',
        sender_name: user?.name || user?.email || 'Agent',
        agent_id: agentId || null,
        body: `Forwarded to ${recipient}${note ? `\nNote: ${note}` : ''}`,
        delivery_status: 'sent',
      });
    }
    await supabase.from('enquiries').update({ status: 'replied', is_read: true }).eq('id', forwardTarget.id);
    patchLocal([forwardTarget.id], { status: 'replied', is_read: true });
    fetchCounts();
    addToast(`Message forwarded to ${recipient}`, 'success');
    if (selected?.id === forwardTarget.id) await fetchThread(forwardTarget.id);
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplySending(true);
    try {
      let convId = conversationId;
      if (!convId) {
        const { data: existing } = await supabase.from('conversations').select('id').eq('enquiry_id', selected.id).maybeSingle();
        if (existing) convId = existing.id;
        else {
          const { data: created } = await supabase
            .from('conversations')
            .insert({
              contact_id: selected.contact_id,
              lead_id: selected.lead_id,
              enquiry_id: selected.id,
              subject: selected.subject || selected.property_title || 'Enquiry',
              status: 'open',
              agent_id: selected.agent_id,
            })
            .select('id')
            .single();
          if (created) convId = created.id;
        }
      }
      if (convId) {
        await supabase.from('conversation_messages').insert({
          conversation_id: convId,
          sender_type: 'agent',
          sender_name: user?.name || user?.email || 'Agent',
          agent_id: agentId || null,
          body: replyText.trim(),
          delivery_status: 'sent',
        });
      }
      await supabase.from('enquiries').update({ status: 'replied', is_read: true }).eq('id', selected.id);
      addToast('Reply sent', 'success');
      setReplyText('');
      setReplySentFlash(true);
      window.setTimeout(() => setReplySentFlash(false), 3500);
      patchLocal([selected.id], { status: 'replied', is_read: true });
      await fetchThread(selected.id);
      fetchCounts();
    } catch {
      addToast('Failed to send reply', 'error');
    } finally {
      setReplySending(false);
    }
  };

  const fullName = (e: Enquiry) => [e.first_name, e.last_name].filter(Boolean).join(' ') || (e.email || 'Unknown');
  const getInitials = (e: Enquiry) => {
    const f = e.first_name?.charAt(0) || '';
    const l = e.last_name?.charAt(0) || '';
    return (f + l).toUpperCase() || '?';
  };
  const isClient = (labels: string[] | null | undefined) =>
    (labels || []).some((l) => l.trim().toLowerCase() === 'client');

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' });
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const inTrash = tab === 'trash';
  const inSpam = tab === 'spam';

  // The customer's original message is stored on the enquiry AND duplicated as the
  // first customer message in the conversation thread. Skip that duplicate so it
  // doesn't render twice in the detail view.
  let skippedOriginal = false;
  const visibleThread = thread.filter((msg) => {
    if (!skippedOriginal && msg.sender_type === 'customer' && selected && msg.body === selected.message) {
      skippedOriginal = true;
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 65px - 48px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: COLORS.navy }}>Inbox</h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.gray }}>
            {counts.unread > 0 ? `${counts.unread} unread · ${counts.all} total` : `${counts.all} conversation${counts.all !== 1 ? 's' : ''}`}
          </p>
        </div>
        {inTrash && counts.trash > 0 && (
          <button
            onClick={() => setEmptyTrashConfirm(true)}
            className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-delete-bin-6-line mr-1" /> Empty trash
          </button>
        )}
      </div>

      {/* Tabs - horizontally scrollable single row so they never wrap into a tower on mobile */}
      {loadError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#f58300]/20 bg-[#fff5e6] px-4 py-2.5 flex-shrink-0">
          <i className="ri-error-warning-line text-[#f58300] text-sm" />
          <p className="text-xs sm:text-sm font-inter text-[#f58300]">Couldn&apos;t load messages. Showing the last known state.</p>
          <button
            onClick={() => { fetchEnquiries(); fetchCounts(); }}
            className="ml-auto text-xs font-inter font-medium text-[#f58300] underline hover:text-amber-900 cursor-pointer whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}
      <div className="flex items-center gap-1.5 mb-4 flex-shrink-0 overflow-x-auto tab-scroll -mx-1 px-1">
        {MESSAGE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelected(null); }}
            className={`px-3.5 py-2 rounded-full admin-label font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
              tab === t.key ? 'bg-[#001731] text-white' : 'bg-white border text-[#636363] hover:text-[#001731]'
            }`}
            style={{ borderColor: tab === t.key ? 'transparent' : COLORS.border }}
          >
            <i className={t.icon} />
            {t.label}
            <span className={`admin-meta px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20 text-white' : 'bg-[#f7f8fa] text-[#636363]'}`}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {!isAgent && selectedIds.size > 0 && (
        <div className="mb-3 flex-shrink-0">
          <BulkActionBar
            count={selectedIds.size}
            starActive={allStarred}
            importantActive={allImportant}
            onRead={() => bulkUpdate({ is_read: true }, 'Marked as read')}
            onUnread={() => bulkUpdate({ is_read: false }, 'Marked as unread')}
            onToggleStar={() => bulkUpdate({ is_starred: !allStarred }, allStarred ? 'Unstarred' : 'Starred')}
            onToggleImportant={() => bulkUpdate({ is_important: !allImportant }, allImportant ? 'Important removed' : 'Marked as important')}
            onSpam={() => bulkUpdate({ is_spam: true, is_archived: false }, 'Marked as spam')}
            onArchive={() => bulkUpdate({ is_archived: true, is_spam: false }, 'Archived')}
            onDelete={() => { setBulkDeleteConfirm(true); }}
            onLabel={() => openLabelPicker('bulk')}
            onClear={() => setSelectedIds(new Set())}
          />
        </div>
      )}

      {/* Split panel */}
      <div className="flex flex-1 bg-white rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
        {/* Left: list */}
        <div className={`${selected ? 'hidden md:flex md:flex-col md:w-[380px]' : 'flex flex-col flex-1'} border-r`} style={{ borderColor: COLORS.border }}>
          <div className="p-3 border-b flex-shrink-0 flex items-center gap-2" style={{ borderColor: COLORS.border }}>
            {!isAgent && (
              <input
                type="checkbox"
                checked={selectedIds.size === enquiries.length && enquiries.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-[#d0d0d0] text-[#0d5959] focus:ring-[#0d5959] cursor-pointer flex-shrink-0"
              />
            )}
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.gray }} />
              <input
                type="text"
                placeholder="Search name, email, property..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#f7f8fa] rounded-lg text-base focus:outline-none focus:bg-white focus:ring-1"
                style={{ color: COLORS.navy }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3.5 border-b" style={{ borderColor: '#f0f0f0' }}>
                  <div className="w-10 h-10 rounded-full bg-[#f7f8fa] animate-pulse flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-3.5 w-28 bg-[#f7f8fa] rounded animate-pulse" />
                    <div className="h-3 w-48 bg-[#f7f8fa] rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : enquiries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 px-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#e6f4ea' }}>
                  <i className="ri-mail-line text-[#088135] text-2xl" />
                </div>
                <p className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                  {search
                    ? 'No messages match your search'
                    : inTrash ? 'Trash is empty' : inSpam ? 'No spam messages' : tab === 'archived' ? 'No archived conversations' : 'Your inbox is empty'}
                </p>
                <p className="text-sm mt-1 text-center" style={{ color: COLORS.gray }}>
                  {search ? 'Try a different search term' : 'New enquiries will appear here automatically'}
                </p>
              </div>
            ) : (
              enquiries.map((enquiry) => {
                const unread = !enquiry.is_read && !inTrash;
                const isSel = selected?.id === enquiry.id;
                return (
                  <div
                    key={enquiry.id}
                    className={`w-full flex items-start gap-2.5 px-3 py-3.5 border-b text-left transition-colors ${
                      isSel ? 'bg-[#001731]/5' : unread ? 'bg-[#0d5959]/[0.06] hover:bg-[#0d5959]/[0.1]' : 'hover:bg-[#f7f8fa]/50'
                    }`}
                    style={{ borderColor: '#f0f0f0' }}
                  >
                    {!isAgent && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(enquiry.id)}
                        onChange={() => toggleSelect(enquiry.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 mt-1 rounded border-[#d0d0d0] text-[#0d5959] focus:ring-[#0d5959] cursor-pointer flex-shrink-0"
                      />
                    )}
                    <button onClick={() => handleSelect(enquiry)} className="flex-1 min-w-0 flex items-start gap-3 cursor-pointer text-left">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: unread ? '#001731' : '#e5e7eb' }}
                      >
                        <span className={`text-sm font-semibold ${unread ? 'text-white' : 'text-[#636363]'}`}>{getInitials(enquiry)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${unread ? 'font-bold' : 'font-semibold'}`} style={{ color: COLORS.navy }}>
                            {fullName(enquiry)}
                          </p>
                          <span className="admin-meta font-medium flex-shrink-0" style={{ color: COLORS.gray }}>
                            {formatTime(enquiry.created_at)}
                          </span>
                        </div>
                        {enquiry.property_title && (
                          <p className="text-sm truncate mt-0.5 font-medium" style={{ color: COLORS.golden }}>{enquiry.property_title}</p>
                        )}
                        <p className={`text-sm mt-1 line-clamp-2 leading-relaxed whitespace-normal break-words ${unread ? 'font-medium text-[#001731]' : 'text-[#636363]'}`}>
                          {enquiry.message || 'No message'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {enquiry.source && (
                            <span className="admin-meta capitalize px-1.5 py-0.5 rounded bg-[#f7f8fa]" style={{ color: COLORS.gray }}>{enquiry.source}</span>
                          )}
                          {isClient(enquiry.labels) && (
                            <span className="inline-flex items-center gap-0.5 admin-meta font-bold px-1.5 py-0.5 rounded-full bg-[#088135] text-white">
                              <i className="ri-user-star-line" /> Client
                            </span>
                          )}
                          {enquiry.labels?.map((l) =>
                            l.trim().toLowerCase() === 'client' ? null : (
                              <span key={l} className="admin-meta font-semibold px-1.5 py-0.5 rounded bg-[#0d5959]/10 text-[#0d5959]">{l}</span>
                            )
                          )}
                          {enquiry.is_starred && <i className="ri-star-fill text-[#f5b50a] text-sm" />}
                          {enquiry.is_important && <i className="ri-flag-fill text-[#dc2626] text-sm" />}
                          {unread && <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#dc2626' }} />}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                      <button
                        onClick={() => toggleStar(enquiry.id, !enquiry.is_starred)}
                        data-tip={enquiry.is_starred ? 'Unstar' : 'Star'}
                        className="has-tip w-6 h-6 flex items-center justify-center rounded hover:bg-[#f7f8fa] cursor-pointer"
                      >
                        <i className={`${enquiry.is_starred ? 'ri-star-fill text-yellow-500' : 'ri-star-line text-yellow-500'} text-sm`} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === enquiry.id ? null : enquiry.id); }}
                        data-tip="More actions"
                        className="has-tip w-6 h-6 flex items-center justify-center rounded hover:bg-[#f7f8fa] cursor-pointer relative"
                      >
                        <i className="ri-more-2-fill text-[#9ca3af] text-sm" />
                        {actionMenu === enquiry.id && (
                          <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-[#f0f0f0] shadow-lg min-w-[180px] py-1">
                            <button onClick={() => { toggleRead(enquiry.id, !enquiry.is_read); setActionMenu(null); }} className="menu-item">
                              <i className={`${enquiry.is_read ? 'ri-mail-unread-line' : 'ri-mail-open-line'} text-blue-500`} /> {enquiry.is_read ? 'Mark unread' : 'Mark read'}
                            </button>
                            <button onClick={() => { toggleImportant(enquiry.id, !enquiry.is_important); setActionMenu(null); }} className="menu-item">
                              <i className="ri-flag-line text-red-500" /> {enquiry.is_important ? 'Remove important' : 'Mark important'}
                            </button>
                            <button onClick={() => { openLabelPicker('single', enquiry.id); }} className="menu-item">
                              <i className="ri-price-tag-3-line text-purple-500" /> Label as
                            </button>
                            {!isAgent && (
                              <button onClick={() => { setForwardTarget(enquiry); setActionMenu(null); }} className="menu-item">
                                <i className="ri-share-forward-line text-teal-600" /> Forward
                              </button>
                            )}
                            <div className="border-t border-[#f0f0f0] my-1" />
                            {inTrash || inSpam ? (
                              <>
                                <button onClick={() => { restore(enquiry.id); setActionMenu(null); }} className="menu-item">
                                  <i className="ri-arrow-go-back-line text-green-500" /> Restore
                                </button>
                                <button onClick={() => { permanentDelete([enquiry.id]); setActionMenu(null); }} className="menu-item text-red-600">
                                  <i className="ri-delete-bin-line" /> Delete forever
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { markSpam(enquiry.id); setActionMenu(null); }} className="menu-item">
                                  <i className="ri-spam-2-line text-orange-500" /> Mark spam
                                </button>
                                <button onClick={() => { archive(enquiry.id); setActionMenu(null); }} className="menu-item">
                                  <i className="ri-archive-line text-gray-500" /> Archive
                                </button>
                                <button onClick={() => { moveToTrash(enquiry.id); setActionMenu(null); }} className="menu-item text-red-600">
                                  <i className="ri-delete-bin-line" /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: detail */}
        {selected ? (
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0" style={{ borderColor: COLORS.border }}>
              <button onClick={() => setSelected(null)} className="md:hidden flex items-center gap-1.5 text-sm font-medium cursor-pointer hover:opacity-70" style={{ color: COLORS.navy }}>
                <i className="ri-arrow-left-line" /> Back
              </button>
              <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
                <button onClick={() => toggleRead(selected.id, !selected.is_read)} disabled={updatingId === selected.id} className="icon-action">
                  <i className={`${selected.is_read ? 'ri-mail-unread-line' : 'ri-mail-open-line'} text-blue-500`} />
                  <span className="ml-1">{selected.is_read ? 'Mark Unread' : 'Mark Read'}</span>
                </button>
                <button onClick={() => toggleStar(selected.id, !selected.is_starred)} data-tip={selected.is_starred ? 'Unstar' : 'Star'} className="has-tip icon-action" style={{ color: selected.is_starred ? '#f5b50a' : COLORS.navy }}>
                  <i className={`${selected.is_starred ? 'ri-star-fill' : 'ri-star-line'} text-yellow-500`} />
                </button>
                <button onClick={() => toggleImportant(selected.id, !selected.is_important)} data-tip={selected.is_important ? 'Remove important' : 'Mark important'} className="has-tip icon-action" style={{ color: selected.is_important ? '#dc2626' : COLORS.navy }}>
                  <i className={`${selected.is_important ? 'ri-flag-fill' : 'ri-flag-line'} text-red-500`} />
                </button>
                {!isAgent && (
                  <button onClick={() => setForwardTarget(selected)} className="icon-action"><i className="ri-share-forward-line text-teal-600" /><span className="ml-1">Forward</span></button>
                )}
                {inTrash || inSpam ? (
                  <>
                    <button onClick={() => restore(selected.id)} className="icon-action"><i className="ri-arrow-go-back-line text-green-500" /><span className="ml-1">Restore</span></button>
                    <button onClick={() => permanentDelete([selected.id])} data-tip="Delete forever" className="has-tip icon-action" style={{ color: '#dc2626' }}><i className="ri-delete-bin-line" /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => markSpam(selected.id)} data-tip="Mark as spam" className="has-tip icon-action"><i className="ri-spam-2-line text-orange-500" /></button>
                    <button onClick={() => archive(selected.id)} data-tip="Archive" className="has-tip icon-action"><i className="ri-archive-line text-gray-500" /></button>
                    <button onClick={() => moveToTrash(selected.id)} data-tip="Move to trash" className="has-tip icon-action" style={{ color: '#dc2626' }}><i className="ri-delete-bin-line" /></button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: !selected.is_read ? '#001731' : '#e5e7eb' }}>
                  <span className={`text-base font-semibold ${!selected.is_read ? 'text-white' : 'text-[#636363]'}`}>{getInitials(selected)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold" style={{ color: COLORS.navy }}>{fullName(selected)}</h2>
                  {selected.email && <p className="text-sm" style={{ color: COLORS.gray }}>{selected.email}</p>}
                  {selected.phone && <p className="text-sm" style={{ color: COLORS.gray }}>{selected.phone}</p>}
                </div>
                <span className="text-sm flex-shrink-0" style={{ color: COLORS.gray }}>
                  {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded admin-meta font-bold ${selected.is_read ? 'bg-[#e5e7eb] text-[#636363]' : 'bg-[#dc2626] text-white'}`}>
                  {selected.is_read ? 'Read' : 'Unread'}
                </span>
                {selected.is_important && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded admin-meta font-bold bg-[#fef2f2] text-[#dc2626]">
                    <i className="ri-flag-fill mr-1" /> Important
                  </span>
                )}
                {selected.is_spam && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded admin-meta font-bold bg-[#fff5e6] text-[#f58300]">Spam</span>
                )}
                {selected.source && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded admin-meta font-bold capitalize bg-[#f7f8fa] text-[#636363]">{selected.source}</span>
                )}
                {isClient(selected.labels) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full admin-meta font-bold bg-[#088135] text-white shadow-sm">
                    <i className="ri-user-star-line" /> Client
                  </span>
                )}
                {selected.labels?.map((l) =>
                  l.trim().toLowerCase() === 'client' ? null : (
                    <span key={l} className="inline-flex items-center px-2.5 py-1 rounded admin-meta font-bold bg-[#0d5959]/10 text-[#0d5959]">{l}</span>
                  )
                )}
                {selected.property_title && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded admin-meta font-bold bg-[#fef3e2] text-[#b8860b]">{selected.property_title}</span>
                )}
              </div>

              <div className="space-y-4">
                {threadLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[#001731]/20 border-t-[#001731] rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="bg-[#f7f8fa] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold" style={{ color: COLORS.navy }}>{fullName(selected)}</span>
                        <span className="admin-meta" style={{ color: COLORS.gray }}>Customer</span>
                      </div>
                      <p className="text-base leading-relaxed whitespace-pre-wrap break-words" style={{ color: COLORS.navy }}>{selected.message || 'No message content.'}</p>
                    </div>
                    {visibleThread.map((msg) => (
                      <div key={msg.id} className={`rounded-xl p-4 ${msg.sender_type === 'agent' ? 'bg-[#0d5959]/5 ml-8' : 'bg-[#f7f8fa] mr-8'}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                            {msg.sender_name || (msg.sender_type === 'agent' ? 'Agent' : 'Customer')}
                          </span>
                          <span className="admin-meta" style={{ color: COLORS.gray }}>{msg.sender_type === 'agent' ? 'Agent' : 'Customer'}</span>
                          <span className="admin-meta ml-auto" style={{ color: COLORS.gray }}>{formatTime(msg.created_at)}</span>
                        </div>
                        <p className="text-base leading-relaxed whitespace-pre-wrap break-words" style={{ color: COLORS.navy }}>{msg.body}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Reply (hidden in trash/spam) */}
            {!inTrash && !inSpam && (
              <div className="p-4 border-t flex-shrink-0" style={{ borderColor: COLORS.border, backgroundColor: '#fafbfc' }}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows={2}
                  maxLength={1000}
                  className="w-full px-4 py-2.5 bg-white border rounded-lg text-base focus:outline-none resize-none"
                  style={{ borderColor: COLORS.border, color: COLORS.navy }}
                />
                <div className="flex items-center justify-end gap-3 mt-2">
                  {replySentFlash && (
                    <span className="flash-in inline-flex items-center gap-1.5 text-sm font-medium text-[#088135]">
                      <i className="ri-checkbox-circle-fill text-base" /> Reply sent
                    </span>
                  )}
                  <button
                    onClick={handleReply}
                    disabled={replySending || !replyText.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer text-white bg-[#0d5959] hover:bg-[#0a4747] whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {replySending ? (
                      <span className="inline-flex items-center gap-1.5">
                        <i className="ri-loader-4-line animate-spin" /> Sending...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <i className="ri-send-plane-fill" /> Send Reply
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center flex-1">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: '#f0f4f8' }}>
              <i className="ri-mail-line text-3xl" style={{ color: COLORS.gray }} />
            </div>
            <p className="text-base font-semibold" style={{ color: COLORS.navy }}>Select a conversation</p>
            <p className="text-sm mt-1.5 text-center max-w-[260px]" style={{ color: COLORS.gray }}>
              Choose a message to read the full thread and reply
            </p>
          </div>
        )}
      </div>

      {/* Confirm: bulk delete (to trash) */}
      <ConfirmModal
        open={bulkDeleteConfirm}
        title={`Move ${selectedIds.size} to Trash?`}
        message="These conversations will be moved to Trash. You can restore them from there."
        confirmLabel="Move to Trash"
        confirmVariant="danger"
        onConfirm={() => { bulkUpdate({ is_trashed: true, trashed_at: new Date().toISOString() }, 'Moved to trash'); setBulkDeleteConfirm(false); }}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      {/* Confirm: empty trash */}
      <ConfirmModal
        open={emptyTrashConfirm}
        title="Empty Trash?"
        message="This permanently deletes all conversations in Trash. This cannot be undone."
        confirmLabel="Empty Trash"
        confirmVariant="danger"
        onConfirm={async () => {
          const ids = enquiries.map((e) => e.id);
          if (ids.length) await permanentDelete(ids);
          setEmptyTrashConfirm(false);
        }}
        onCancel={() => setEmptyTrashConfirm(false)}
      />

      {!isAgent && labelPickerOpen && (
        <LabelPickerModal
          currentLabels={labelTarget === 'single' && selected ? selected.labels : null}
          onClose={() => { setLabelPickerOpen(false); setLabelTarget(null); }}
          onApply={applyLabels}
        />
      )}

      {!isAgent && forwardTarget && (
        <ForwardModal
          subject={forwardTarget.subject || forwardTarget.property_title || 'Enquiry'}
          originalSender={fullName(forwardTarget)}
          body={forwardTarget.message || ''}
          onClose={() => setForwardTarget(null)}
          onForward={handleForward}
        />
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        .tab-scroll::-webkit-scrollbar { display: none; }
        .tab-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .menu-item { width: 100%; text-align: left; padding: 9px 12px; font-size: 14px; line-height: 1.4; color: #001731; display: flex; align-items: center; gap: 8px; transition: background 0.15s; cursor: pointer; white-space: nowrap; }
        .menu-item:hover { background: #f7f8fa; }
        .icon-action { padding: 7px 11px; border-radius: 8px; font-size: 14px; line-height: 1.4; font-weight: 500; border: 1px solid #e5e7eb; transition: all 0.15s; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; color: #001731; }
        .icon-action:hover { background: #f7f8fa; }
        .has-tip { position: relative; }
        .has-tip::after {
          content: attr(data-tip);
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #001731;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.3;
          letter-spacing: 0.01em;
          white-space: nowrap;
          padding: 5px 9px;
          border-radius: 6px;
          opacity: 0;
          pointer-events: none;
          transform: translateY(-4px);
          transition: opacity 0.15s ease, transform 0.15s ease;
          z-index: 50;
        }
        .has-tip::before {
          content: '';
          position: absolute;
          top: calc(100% + 3px);
          right: 12px;
          border: 5px solid transparent;
          border-bottom-color: #001731;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease;
          z-index: 50;
        }
        .has-tip:hover::after { opacity: 1; transform: translateY(0); }
        .has-tip:hover::before { opacity: 1; }
        .has-tip:disabled::after, .has-tip:disabled::before { opacity: 0; }
        @keyframes flashIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
        .flash-in { animation: flashIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}