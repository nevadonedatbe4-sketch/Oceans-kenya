import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';

interface Message {
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
}

interface MessageCounts {
  all: number;
  unread: number;
  read: number;
}

const COLORS = {
  navy: '#001731',
  navyLight: '#012144',
  gray: '#88929e',
  border: '#e5e7eb',
  bg: '#f7f8fa',
  golden: '#c9a84c',
};

export default function Inbox() {
  const { user } = useAuth();
  const { agentId } = useAgentProfile();
  const isAgent = user?.role === 'agent';

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<MessageCounts>({ all: 0, unread: 0, read: 0 });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [selected, setSelected] = useState<Message | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    let allQ = supabase.from('leads').select('*', { count: 'exact', head: true });
    let unreadQ = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('is_read', false);
    let readQ = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('is_read', true);

    if (isAgent && agentId) {
      allQ = allQ.eq('agent_id', agentId);
      unreadQ = unreadQ.eq('agent_id', agentId);
      readQ = readQ.eq('agent_id', agentId);
    }

    const [{ count: allCount }, { count: unreadCount }, { count: readCount }] =
      await Promise.all([allQ, unreadQ, readQ]);

    setCounts({
      all: allCount ?? 0,
      unread: unreadCount ?? 0,
      read: readCount ?? 0,
    });
  }, [isAgent, agentId]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (isAgent && agentId) {
      q = q.eq('agent_id', agentId);
    }

    if (tab === 'unread') {
      q = q.eq('is_read', false);
    }

    if (search.trim()) {
      const term = search.trim();
      q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,message.ilike.%${term}%`);
    }

    const { data, error } = await q;
    if (error) {
      addToast('Failed to load messages', 'error');
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  }, [tab, search, isAgent, agentId]);

  useEffect(() => {
    fetchCounts();
    fetchMessages();
  }, [fetchCounts, fetchMessages]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleMarkRead = async (id: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from('leads').update({ is_read: true }).eq('id', id);
    if (error) {
      addToast('Failed to mark as read', 'error');
    } else {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, is_read: true } : null);
      fetchCounts();
    }
    setUpdatingId(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) {
      addToast('Failed to delete', 'error');
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selected?.id === id) setSelected(null);
      addToast('Message deleted', 'success');
      fetchCounts();
    }
    setDeleteConfirm(null);
  };

  const getInitials = (m: Message) => {
    const f = m.first_name?.charAt(0) || '';
    const l = m.last_name?.charAt(0) || '';
    return (f + l).toUpperCase() || '?';
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' });
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const tabs = [
    { key: 'all' as const, label: 'All Messages', count: counts.all },
    { key: 'unread' as const, label: 'Unread', count: counts.unread },
  ];

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 65px - 48px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: COLORS.navy }}>Inbox</h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.gray }}>
            {counts.unread > 0
              ? `${counts.unread} unread message${counts.unread !== 1 ? 's' : ''} — ${counts.all} total`
              : `${counts.all} total message${counts.all !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelected(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              tab === t.key
                ? 'bg-[#001731] text-white'
                : 'bg-white border text-[#636363] hover:text-[#001731]'
            }`}
            style={{ borderColor: tab === t.key ? 'transparent' : COLORS.border }}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              tab === t.key ? 'bg-white/20 text-white' : 'bg-[#f7f8fa] text-[#636363]'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main content: split panel */}
      <div className="flex flex-1 bg-[#012144] lg:bg-white rounded-xl overflow-hidden" style={{ borderColor: COLORS.border, border: `1px solid ${COLORS.border}` }}>
        {/* Left Panel: Message List */}
        <div className={`${selected ? 'hidden md:flex md:flex-col md:w-[380px]' : 'flex flex-col flex-1'} border-r`} style={{ borderColor: COLORS.border }}>
          {/* Search */}
          <div className="p-3 border-b flex-shrink-0" style={{ borderColor: COLORS.border }}>
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.gray }} />
              <input
                type="text"
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#f7f8fa] rounded-lg text-sm focus:outline-none focus:bg-white focus:ring-1"
                style={{ color: COLORS.navy }}
              />
            </div>
          </div>

          {/* Message List */}
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
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 px-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#e6f4ea' }}>
                  <i className="ri-mail-line text-[#088135] text-2xl" />
                </div>
                <p className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                  {search ? 'No messages match your search' : 'Your inbox is empty'}
                </p>
                <p className="text-xs mt-1 text-center" style={{ color: COLORS.gray }}>
                  {search ? 'Try a different search term' : 'New messages will appear here'}
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => {
                    setSelected(msg);
                    if (!msg.is_read) handleMarkRead(msg.id);
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 border-b text-left transition-colors cursor-pointer ${
                    selected?.id === msg.id
                      ? 'bg-[#001731]/5'
                      : !msg.is_read
                        ? 'bg-[#f7f8fa]/50 hover:bg-[#f7f8fa]'
                        : 'hover:bg-[#f7f8fa]/50'
                  }`}
                  style={{ borderColor: '#f0f0f0' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: !msg.is_read ? '#001731' : '#e5e7eb' }}
                  >
                    <span className={`text-sm font-semibold ${!msg.is_read ? 'text-white' : 'text-[#636363]'}`}>
                      {getInitials(msg)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${!msg.is_read ? 'font-bold' : 'font-semibold'}`} style={{ color: COLORS.navy }}>
                        {msg.first_name} {msg.last_name}
                      </p>
                      <span className="text-[10px] font-medium flex-shrink-0" style={{ color: COLORS.gray }}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: COLORS.gray }}>
                      {msg.email}
                    </p>
                    <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${!msg.is_read ? 'font-medium text-[#001731]' : 'text-[#636363]'}`}>
                      {msg.message || 'No message'}
                    </p>
                    {!msg.is_read && (
                      <span className="inline-block w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: '#dc2626' }} />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Message Detail */}
        {selected ? (
          <div className="flex flex-col flex-1 min-w-0">
            {/* Detail Header */}
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
                  onClick={() => handleMarkRead(selected.id)}
                  disabled={selected.is_read || updatingId === selected.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                    selected.is_read ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#f7f8fa]'
                  }`}
                  style={{ borderColor: COLORS.border, color: COLORS.navy }}
                >
                  <i className="ri-mail-open-line mr-1" /> Mark Read
                </button>
                <button
                  onClick={() => setDeleteConfirm(selected.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer hover:bg-[#fef2f2] whitespace-nowrap"
                  style={{ borderColor: COLORS.border, color: '#dc2626' }}
                >
                  <i className="ri-delete-bin-line mr-1" /> Delete
                </button>
              </div>
            </div>

            {/* Detail Body */}
            <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-5">
              {/* Sender info card */}
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
                  <h2 className="text-base font-bold" style={{ color: COLORS.navy }}>
                    {selected.first_name} {selected.last_name}
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: COLORS.gray }}>{selected.email}</p>
                  {selected.phone && (
                    <p className="text-sm" style={{ color: COLORS.gray }}>{selected.phone}</p>
                  )}
                </div>
                <span className="text-xs" style={{ color: COLORS.gray }}>
                  {new Date(selected.created_at).toLocaleDateString('en-GB', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Meta badges */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold ${selected.is_read ? 'bg-[#e5e7eb] text-[#636363]' : 'bg-[#dc2626] text-white'}`}
                >
                  {selected.is_read ? 'Read' : 'Unread'}
                </span>
                {selected.source && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold capitalize bg-[#f7f8fa] text-[#636363]">
                    {selected.source}
                  </span>
                )}
              </div>

              {/* Message body */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: COLORS.gray }}>Message</h3>
                <div className="bg-[#f7f8fa] rounded-xl p-5">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.navy }}>
                    {selected.message || 'No message content.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Detail Footer: Quick Reply */}
            <div className="p-4 border-t flex-shrink-0" style={{ borderColor: COLORS.border, backgroundColor: '#fafbfc' }}>
              <p className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: COLORS.gray }}>
                Quick note (internal)
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Add a private note about this message..."
                  className="flex-1 px-4 py-2.5 bg-white border rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: COLORS.border, color: COLORS.navy }}
                />
                <button
                  className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer text-white hover:opacity-90 whitespace-nowrap"
                  style={{ backgroundColor: COLORS.navy }}
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state for right panel */
          <div className="hidden md:flex flex-col items-center justify-center flex-1">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: '#f0f4f8' }}>
              <i className="ri-mail-line text-3xl" style={{ color: COLORS.gray }} />
            </div>
            <p className="text-base font-semibold" style={{ color: COLORS.navy }}>Select a message</p>
            <p className="text-sm mt-1.5 text-center max-w-[260px]" style={{ color: COLORS.gray }}>
              Choose a message from the left panel to read its full content and reply
            </p>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Message?"
        message="This will permanently remove this message. This action cannot be undone."
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