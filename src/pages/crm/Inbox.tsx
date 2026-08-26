import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';

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

interface EnquiryCounts {
  all: number;
  unread: number;
  starred: number;
  archived: number;
}

const COLORS = {
  navy: '#001731',
  gray: '#88929e',
  border: '#e5e7eb',
  golden: '#c9a84c',
};

type TabKey = 'all' | 'unread' | 'starred' | 'archived';

export default function Inbox() {
  const { user } = useAuth();
  const { agentId, loading: agentLoading } = useAgentProfile();
  const isAgent = user?.role === 'agent';

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<EnquiryCounts>({ all: 0, unread: 0, starred: 0, archived: 0 });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabKey>('all');
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const applyAgentFilter = (q: any) => (isAgent && agentId ? q.eq('agent_id', agentId) : q);

  const fetchCounts = useCallback(async () => {
    if (isAgent && agentLoading) return;
    const base = () => supabase.from('enquiries').select('*', { count: 'exact', head: true });
    const allQ = applyAgentFilter(base().neq('status', 'archived'));
    const unreadQ = applyAgentFilter(base().eq('is_read', false).neq('status', 'archived'));
    const starredQ = applyAgentFilter(base().eq('is_starred', true).neq('status', 'archived'));
    const archivedQ = applyAgentFilter(base().eq('status', 'archived'));

    const [allR, unreadR, starredR, archivedR] = await Promise.all([allQ, unreadQ, starredQ, archivedQ]);
    setCounts({
      all: allR.count ?? 0,
      unread: unreadR.count ?? 0,
      starred: starredR.count ?? 0,
      archived: archivedR.count ?? 0,
    });
  }, [isAgent, agentId, agentLoading]);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    if (isAgent && agentLoading) return;
    let q = supabase.from('enquiries').select('*').order('created_at', { ascending: false }).limit(100);

    if (isAgent && agentId) q = q.eq('agent_id', agentId);

    if (tab === 'unread') q = q.eq('is_read', false).neq('status', 'archived');
    else if (tab === 'starred') q = q.eq('is_starred', true).neq('status', 'archived');
    else if (tab === 'archived') q = q.eq('status', 'archived');
    else q = q.neq('status', 'archived');

    if (search.trim()) {
      const term = search.trim();
      q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,message.ilike.%${term}%,property_title.ilike.%${term}%`);
    }

    const { data, error } = await q;
    if (error) {
      addToast('Failed to load messages', 'error');
      setEnquiries([]);
    } else {
      setEnquiries(data || []);
    }
    setLoading(false);
  }, [tab, search, isAgent, agentId, agentLoading]);

  useLayoutEffect(() => {
    fetchCounts();
    fetchEnquiries();
  }, [fetchCounts, fetchEnquiries]);

  const fetchThread = async (enquiryId: string) => {
    setThreadLoading(true);
    const { data: conv } = await supabase.from('conversations').select('id').eq('enquiry_id', enquiryId).maybeSingle();
    if (!conv) {
      setConversationId(null);
      setThread([]);
      setThreadLoading(false);
      return;
    }
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
    await fetchThread(enquiry.id);
    if (!enquiry.is_read) {
      await supabase.from('enquiries').update({ is_read: true }).eq('id', enquiry.id);
      setEnquiries((prev) => prev.map((e) => (e.id === enquiry.id ? { ...e, is_read: true } : e)));
      fetchCounts();
    }
  };

  const handleToggleRead = async (id: string, read: boolean) => {
    setUpdatingId(id);
    const { error } = await supabase.from('enquiries').update({ is_read: read }).eq('id', id);
    if (error) addToast('Failed to update', 'error');
    else {
      setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, is_read: read } : e)));
      if (selected?.id === id) setSelected((prev) => (prev ? { ...prev, is_read: read } : null));
      fetchCounts();
    }
    setUpdatingId(null);
  };

  const handleToggleStar = async (id: string, starred: boolean) => {
    const { error } = await supabase.from('enquiries').update({ is_starred: starred }).eq('id', id);
    if (error) addToast('Failed to update', 'error');
    else {
      setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, is_starred: starred } : e)));
      if (selected?.id === id) setSelected((prev) => (prev ? { ...prev, is_starred: starred } : null));
      fetchCounts();
    }
  };

  const handleArchive = async (id: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from('enquiries').update({ status: 'archived' }).eq('id', id);
    if (error) addToast('Failed to archive', 'error');
    else {
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
      if (selected?.id === id) setSelected(null);
      addToast('Conversation archived', 'success');
      fetchCounts();
    }
    setUpdatingId(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('enquiries').delete().eq('id', id);
    if (error) addToast('Failed to delete', 'error');
    else {
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
      if (selected?.id === id) setSelected(null);
      addToast('Conversation deleted', 'success');
      fetchCounts();
    }
    setDeleteConfirm(null);
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
          delivery_status: 'note',
        });
      }
      await supabase.from('enquiries').update({ status: 'replied', is_read: true }).eq('id', selected.id);
      addToast('Reply saved to conversation', 'success');
      setReplyText('');
      setEnquiries((prev) => prev.map((e) => (e.id === selected.id ? { ...e, status: 'replied', is_read: true } : e)));
      await fetchThread(selected.id);
      fetchCounts();
    } catch {
      addToast('Failed to save reply', 'error');
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

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' });
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'unread', label: 'Unread', count: counts.unread },
    { key: 'starred', label: 'Starred', count: counts.starred },
    { key: 'archived', label: 'Archived', count: counts.archived },
  ];

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 65px - 48px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: COLORS.navy }}>Inbox</h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.gray }}>
            {counts.unread > 0
              ? `${counts.unread} unread · ${counts.all} total`
              : `${counts.all} conversation${counts.all !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 flex-shrink-0 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelected(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              tab === t.key ? 'bg-[#001731] text-white' : 'bg-white border text-[#636363] hover:text-[#001731]'
            }`}
            style={{ borderColor: tab === t.key ? 'transparent' : COLORS.border }}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20 text-white' : 'bg-[#f7f8fa] text-[#636363]'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Split panel */}
      <div className="flex flex-1 bg-white rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
        {/* Left: list */}
        <div className={`${selected ? 'hidden md:flex md:flex-col md:w-[380px]' : 'flex flex-col flex-1'} border-r`} style={{ borderColor: COLORS.border }}>
          <div className="p-3 border-b flex-shrink-0" style={{ borderColor: COLORS.border }}>
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.gray }} />
              <input
                type="text"
                placeholder="Search name, email, property..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#f7f8fa] rounded-lg text-sm focus:outline-none focus:bg-white focus:ring-1"
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
                  {search ? 'No messages match your search' : tab === 'archived' ? 'No archived conversations' : 'Your inbox is empty'}
                </p>
                <p className="text-xs mt-1 text-center" style={{ color: COLORS.gray }}>
                  {search ? 'Try a different search term' : 'New enquiries will appear here automatically'}
                </p>
              </div>
            ) : (
              enquiries.map((enquiry) => (
                <button
                  key={enquiry.id}
                  onClick={() => handleSelect(enquiry)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 border-b text-left transition-colors cursor-pointer ${
                    selected?.id === enquiry.id
                      ? 'bg-[#001731]/5'
                      : !enquiry.is_read
                        ? 'bg-[#f7f8fa]/50 hover:bg-[#f7f8fa]'
                        : 'hover:bg-[#f7f8fa]/50'
                  }`}
                  style={{ borderColor: '#f0f0f0' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: !enquiry.is_read ? '#001731' : '#e5e7eb' }}
                  >
                    <span className={`text-sm font-semibold ${!enquiry.is_read ? 'text-white' : 'text-[#636363]'}`}>
                      {getInitials(enquiry)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${!enquiry.is_read ? 'font-bold' : 'font-semibold'}`} style={{ color: COLORS.navy }}>
                        {fullName(enquiry)}
                      </p>
                      <span className="text-[10px] font-medium flex-shrink-0" style={{ color: COLORS.gray }}>
                        {formatTime(enquiry.created_at)}
                      </span>
                    </div>
                    {enquiry.property_title && (
                      <p className="text-xs truncate mt-0.5 font-medium" style={{ color: COLORS.golden }}>
                        {enquiry.property_title}
                      </p>
                    )}
                    <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${!enquiry.is_read ? 'font-medium text-[#001731]' : 'text-[#636363]'}`}>
                      {enquiry.message || 'No message'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {enquiry.source && (
                        <span className="text-[10px] capitalize px-1.5 py-0.5 rounded bg-[#f7f8fa]" style={{ color: COLORS.gray }}>
                          {enquiry.source}
                        </span>
                      )}
                      {enquiry.is_starred && <i className="ri-star-fill text-[#f5b50a] text-xs" />}
                      {!enquiry.is_read && <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#dc2626' }} />}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: detail */}
        {selected ? (
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0" style={{ borderColor: COLORS.border }}>
              <button
                onClick={() => setSelected(null)}
                className="md:hidden flex items-center gap-1.5 text-sm font-medium cursor-pointer hover:opacity-70"
                style={{ color: COLORS.navy }}
              >
                <i className="ri-arrow-left-line" /> Back
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => handleToggleRead(selected.id, !selected.is_read)}
                  disabled={updatingId === selected.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer whitespace-nowrap hover:bg-[#f7f8fa]"
                  style={{ borderColor: COLORS.border, color: COLORS.navy }}
                >
                  <i className={selected.is_read ? 'ri-mail-unread-line' : 'ri-mail-open-line'} />
                  <span className="ml-1">{selected.is_read ? 'Mark Unread' : 'Mark Read'}</span>
                </button>
                <button
                  onClick={() => handleToggleStar(selected.id, !selected.is_starred)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer hover:bg-[#f7f8fa] whitespace-nowrap"
                  style={{ borderColor: COLORS.border, color: selected.is_starred ? '#f5b50a' : COLORS.navy }}
                >
                  <i className={selected.is_starred ? 'ri-star-fill' : 'ri-star-line'} />
                </button>
                <button
                  onClick={() => handleArchive(selected.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer hover:bg-[#f7f8fa] whitespace-nowrap"
                  style={{ borderColor: COLORS.border, color: COLORS.navy }}
                >
                  <i className="ri-archive-line" />
                  <span className="ml-1">Archive</span>
                </button>
                <button
                  onClick={() => setDeleteConfirm(selected.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer hover:bg-[#fef2f2] whitespace-nowrap"
                  style={{ borderColor: COLORS.border, color: '#dc2626' }}
                >
                  <i className="ri-delete-bin-line" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-5">
              {/* Sender info */}
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: !selected.is_read ? '#001731' : '#e5e7eb' }}
                >
                  <span className={`text-base font-semibold ${!selected.is_read ? 'text-white' : 'text-[#636363]'}`}>
                    {getInitials(selected)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold" style={{ color: COLORS.navy }}>{fullName(selected)}</h2>
                  {selected.email && <p className="text-sm" style={{ color: COLORS.gray }}>{selected.email}</p>}
                  {selected.phone && <p className="text-sm" style={{ color: COLORS.gray }}>{selected.phone}</p>}
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: COLORS.gray }}>
                  {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold ${selected.is_read ? 'bg-[#e5e7eb] text-[#636363]' : 'bg-[#dc2626] text-white'}`}>
                  {selected.is_read ? 'Read' : 'Unread'}
                </span>
                {selected.source && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold capitalize bg-[#f7f8fa] text-[#636363]">
                    {selected.source}
                  </span>
                )}
                {selected.property_title && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold bg-[#fef3e2] text-[#b8860b]">
                    {selected.property_title}
                  </span>
                )}
              </div>

              {/* Conversation thread */}
              <div className="space-y-4">
                {threadLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[#001731]/20 border-t-[#001731] rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Original enquiry message */}
                    <div className="bg-[#f7f8fa] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold" style={{ color: COLORS.navy }}>{fullName(selected)}</span>
                        <span className="text-[10px]" style={{ color: COLORS.gray }}>Customer</span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.navy }}>
                        {selected.message || 'No message content.'}
                      </p>
                    </div>

                    {thread.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-xl p-4 ${msg.sender_type === 'agent' ? 'bg-[#0d5959]/5 ml-8' : 'bg-[#f7f8fa] mr-8'}`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold" style={{ color: COLORS.navy }}>
                            {msg.sender_name || (msg.sender_type === 'agent' ? 'Agent' : 'Customer')}
                          </span>
                          <span className="text-[10px]" style={{ color: COLORS.gray }}>{msg.sender_type === 'agent' ? 'Agent' : 'Customer'}</span>
                          <span className="text-[10px] ml-auto" style={{ color: COLORS.gray }}>{formatTime(msg.created_at)}</span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.navy }}>{msg.body}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Reply */}
            <div className="p-4 border-t flex-shrink-0" style={{ borderColor: COLORS.border, backgroundColor: '#fafbfc' }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply... (saved to this conversation)"
                rows={2}
                maxLength={1000}
                className="w-full px-4 py-2.5 bg-white border rounded-lg text-sm focus:outline-none resize-none"
                style={{ borderColor: COLORS.border, color: COLORS.navy }}
              />
              <div className="flex items-center justify-end mt-2">
                <button
                  onClick={handleReply}
                  disabled={replySending || !replyText.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer text-white hover:opacity-90 whitespace-nowrap disabled:opacity-50"
                  style={{ backgroundColor: COLORS.navy }}
                >
                  {replySending ? 'Saving...' : 'Send Reply'}
                </button>
              </div>
            </div>
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

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Conversation?"
        message="This permanently removes this enquiry and its thread. This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div>
  );
}