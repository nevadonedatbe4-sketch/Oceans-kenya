import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Lead, Agent, ConversationMessage, ActivityLog } from '../types';
import { clientTypeOptions, clientTypeLabels, clientTypeColors, statusOptions, statusLabels, statusColors } from '../types';
import { addToast } from '@/pages/crm/components/CRMToast';

interface LeadDetailPanelProps {
  lead: Lead;
  agents: Agent[];
  onClose: () => void;
  onUpdateLead: (updated: Lead) => void;
  userId: string | undefined;
  userName: string | undefined;
}

export default function LeadDetailPanel({ lead, agents, onClose, onUpdateLead, userId, userName }: LeadDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'messages' | 'activity'>('details');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    client_type: lead.client_type || '',
    move_in_date: lead.move_in_date || '',
    budget: lead.budget ? String(lead.budget) : '',
    notes: lead.notes || '',
    status: lead.status,
    next_follow_up_at: lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : '',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return 'Unassigned';
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name || 'Unknown';
  };

  const getInitials = (l: Lead) => {
    const f = l.first_name?.charAt(0) || '';
    const n = l.last_name?.charAt(0) || '';
    return (f + n).toUpperCase() || '?';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatBudget = (budget: number | null) => {
    if (!budget) return '—';
    if (budget >= 1000000) return `$${(budget / 1000000).toFixed(1)}M`;
    if (budget >= 1000) return `$${(budget / 1000).toFixed(0)}K`;
    return `$${budget.toLocaleString()}`;
  };

  const fetchConversation = useCallback(async () => {
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', lead.id)
      .maybeSingle();

    if (conv) {
      setConversationId(conv.id);
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          lead_id: lead.id,
          subject: `Lead: ${lead.first_name} ${lead.last_name}`,
          status: 'active',
          agent_id: lead.agent_id,
        })
        .select('id')
        .single();
      if (newConv) setConversationId(newConv.id);
    }
  }, [lead.id, lead.first_name, lead.last_name, lead.agent_id]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (!error) setMessages(data || []);
    setLoadingMessages(false);
  }, [conversationId]);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('module', 'leads')
      .eq('record_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (!error) setActivities(data || []);
    setLoadingActivities(false);
  }, [lead.id]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  useEffect(() => {
    if (conversationId) fetchMessages();
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    if (activeTab === 'messages' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, messages.length]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId || !userId) return;
    setSendingMessage(true);

    const { error } = await supabase.from('conversation_messages').insert({
      conversation_id: conversationId,
      sender_type: 'agent',
      sender_name: userName || 'Agent',
      sender_id: userId,
      body: messageText.trim(),
      delivery_status: 'sent',
    });

    if (!error) {
      setMessageText('');
      await supabase
        .from('leads')
        .update({
          last_activity_at: new Date().toISOString(),
          reply_status: 'replied',
        })
        .eq('id', lead.id);
      fetchMessages();
      fetchActivities();
      addToast('Message sent', 'success');
    } else {
      addToast('Failed to send message', 'error');
    }
    setSendingMessage(false);
  };

  const handleSaveEdit = async () => {
    const updates: Partial<Lead> = {};
    if (editForm.client_type) updates.client_type = editForm.client_type;
    if (editForm.move_in_date) updates.move_in_date = editForm.move_in_date;
    if (editForm.budget) updates.budget = Number(editForm.budget);
    if (editForm.notes) updates.notes = editForm.notes;
    if (editForm.status !== lead.status) updates.status = editForm.status;
    if (editForm.next_follow_up_at) updates.next_follow_up_at = editForm.next_follow_up_at;

    const { error } = await supabase.from('leads').update(updates).eq('id', lead.id);
    if (!error) {
      onUpdateLead({ ...lead, ...updates });
      setEditing(false);
      addToast('Lead updated', 'success');
      fetchActivities();
    } else {
      addToast('Failed to update lead', 'error');
    }
  };

  const handleQuickStatusChange = async (newStatus: string) => {
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id);
    if (!error) {
      onUpdateLead({ ...lead, status: newStatus });
      addToast(`Status updated to ${statusLabels[newStatus]}`, 'success');
      fetchActivities();
    }
  };

  const activityIcon = (action: string) => {
    if (action.includes('created')) return 'ri-add-circle-line';
    if (action.includes('updated')) return 'ri-edit-line';
    if (action.includes('deleted')) return 'ri-delete-bin-line';
    if (action.includes('assigned')) return 'ri-user-add-line';
    if (action.includes('message') || action.includes('reply')) return 'ri-message-3-line';
    return 'ri-history-line';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0] bg-[#f7f8fa]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0d5959]/8 flex items-center justify-center">
              <span className="text-[#0d5959] text-sm font-inter font-bold">{getInitials(lead)}</span>
            </div>
            <div>
              <h2 className="text-sm font-inter font-semibold text-[#001731]">
                {lead.first_name} {lead.last_name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-inter font-semibold capitalize ${statusColors[lead.status] || 'bg-[#f7f8fa] text-[#636363]'}`}>
                  {statusLabels[lead.status] || lead.status}
                </span>
                {lead.client_type && (
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-inter font-semibold capitalize ${clientTypeColors[lead.client_type] || 'bg-[#f7f8fa] text-[#636363]'}`}>
                    {clientTypeLabels[lead.client_type] || lead.client_type}
                  </span>
                )}
                {lead.is_important && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-inter font-semibold bg-[#fef2f2] text-red-600">
                    <i className="ri-flag-fill mr-1" /> Important
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 text-xs font-inter font-medium text-[#636363] hover:text-[#001731] hover:bg-[#f7f8fa] rounded-lg transition-colors cursor-pointer"
              >
                <i className="ri-edit-line mr-1" /> Edit
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f8fa] cursor-pointer">
              <i className="ri-close-line text-[#636363] text-lg" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#f0f0f0] px-6">
          {(['details', 'messages', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-xs font-inter font-semibold capitalize transition-colors relative cursor-pointer ${
                activeTab === tab ? 'text-[#0d5959]' : 'text-[#9ca3af] hover:text-[#636363]'
              }`}
            >
              {tab === 'messages' && (
                <span className="mr-1">
                  <i className="ri-message-3-line" />
                </span>
              )}
              {tab === 'activity' && (
                <span className="mr-1">
                  <i className="ri-history-line" />
                </span>
              )}
              {tab === 'details' && (
                <span className="mr-1">
                  <i className="ri-file-list-line" />
                </span>
              )}
              {tab}
              {tab === 'messages' && messages.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0d5959]/8 text-[#0d5959] text-[10px] font-inter font-bold">
                  {messages.length}
                </span>
              )}
              {tab === 'activity' && activities.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#001731]/8 text-[#001731] text-[10px] font-inter font-bold">
                  {activities.length}
                </span>
              )}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d5959]" />
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-inter font-semibold text-[#636363] uppercase tracking-wider mb-1.5">Client Type</label>
                      <select
                        value={editForm.client_type}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, client_type: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer"
                      >
                        <option value="">Select...</option>
                        {clientTypeOptions.map((ct) => (
                          <option key={ct} value={ct}>{clientTypeLabels[ct]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-inter font-semibold text-[#636363] uppercase tracking-wider mb-1.5">Pipeline Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer"
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>{statusLabels[s]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-inter font-semibold text-[#636363] uppercase tracking-wider mb-1.5">Move-in / Available</label>
                      <input
                        type="text"
                        value={editForm.move_in_date}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, move_in_date: e.target.value }))}
                        placeholder="e.g. ASAP, September, Immediately"
                        className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-inter font-semibold text-[#636363] uppercase tracking-wider mb-1.5">Budget</label>
                      <input
                        type="number"
                        value={editForm.budget}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, budget: e.target.value }))}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-inter font-semibold text-[#636363] uppercase tracking-wider mb-1.5">Next Follow-up</label>
                    <input
                      type="datetime-local"
                      value={editForm.next_follow_up_at}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, next_follow_up_at: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-inter font-semibold text-[#636363] uppercase tracking-wider mb-1.5">Notes</label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] min-h-[100px] resize-none"
                      maxLength={500}
                    />
                    <p className="text-[10px] font-inter text-[#9ca3af] mt-1">{editForm.notes.length}/500</p>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setEditing(false)}
                      className="flex-1 px-4 py-2 border border-[#f0f0f0] rounded-lg text-sm font-inter font-medium text-[#636363] hover:bg-[#f7f8fa] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-4 py-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-sm font-inter font-medium transition-colors cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-[#f7f8fa] rounded-lg p-3">
                      <p className="text-[10px] font-inter font-semibold text-[#9ca3af] uppercase tracking-wider">Email</p>
                      <p className="text-xs font-inter font-medium text-[#001731] mt-1">{lead.email}</p>
                    </div>
                    <div className="bg-[#f7f8fa] rounded-lg p-3">
                      <p className="text-[10px] font-inter font-semibold text-[#9ca3af] uppercase tracking-wider">Phone</p>
                      <p className="text-xs font-inter font-medium text-[#001731] mt-1">{lead.phone || '—'}</p>
                    </div>
                    <div className="bg-[#f7f8fa] rounded-lg p-3">
                      <p className="text-[10px] font-inter font-semibold text-[#9ca3af] uppercase tracking-wider">Lead Source</p>
                      <p className="text-xs font-inter font-medium text-[#001731] mt-1 capitalize">{lead.source || '—'}</p>
                    </div>
                    <div className="bg-[#f7f8fa] rounded-lg p-3">
                      <p className="text-[10px] font-inter font-semibold text-[#9ca3af] uppercase tracking-wider">Assigned Agent</p>
                      <p className="text-xs font-inter font-medium text-[#001731] mt-1">{getAgentName(lead.agent_id)}</p>
                    </div>
                    <div className="bg-[#f7f8fa] rounded-lg p-3">
                      <p className="text-[10px] font-inter font-semibold text-[#9ca3af] uppercase tracking-wider">Budget</p>
                      <p className="text-xs font-inter font-medium text-[#001731] mt-1">{formatBudget(lead.budget)}</p>
                    </div>
                    <div className="bg-[#f7f8fa] rounded-lg p-3">
                      <p className="text-[10px] font-inter font-semibold text-[#9ca3af] uppercase tracking-wider">Move-in / Available</p>
                      <p className="text-xs font-inter font-medium text-[#001731] mt-1">{lead.move_in_date || '—'}</p>
                    </div>
                    <div className="bg-[#f7f8fa] rounded-lg p-3">
                      <p className="text-[10px] font-inter font-semibold text-[#9ca3af] uppercase tracking-wider">Client Type</p>
                      <p className="text-xs font-inter font-medium text-[#001731] mt-1 capitalize">{lead.client_type || '—'}</p>
                    </div>
                    <div className="bg-[#f7f8fa] rounded-lg p-3">
                      <p className="text-[10px] font-inter font-semibold text-[#9ca3af] uppercase tracking-wider">Priority</p>
                      <p className="text-xs font-inter font-medium text-[#001731] mt-1 capitalize">{lead.priority || 'Normal'}</p>
                    </div>
                    <div className="bg-[#f7f8fa] rounded-lg p-3">
                      <p className="text-[10px] font-inter font-semibold text-[#9ca3af] uppercase tracking-wider">Received</p>
                      <p className="text-xs font-inter font-medium text-[#001731] mt-1">{formatDate(lead.created_at)}</p>
                    </div>
                    {lead.next_follow_up_at && (
                      <div className="bg-[#f7f8fa] rounded-lg p-3">
                        <p className="text-[10px] font-inter font-semibold text-[#9ca3af] uppercase tracking-wider">Next Follow-up</p>
                        <p className="text-xs font-inter font-medium text-[#001731] mt-1">{formatDate(lead.next_follow_up_at)}</p>
                      </div>
                    )}
                  </div>

                  {lead.message && (
                    <div>
                      <p className="text-[10px] font-inter font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">Initial Inquiry</p>
                      <div className="bg-[#f7f8fa] rounded-lg p-3">
                        <p className="text-xs font-inter text-[#001731] leading-relaxed">{lead.message}</p>
                      </div>
                    </div>
                  )}

                  {lead.notes && (
                    <div>
                      <p className="text-[10px] font-inter font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">Notes</p>
                      <div className="bg-[#f7f8fa] rounded-lg p-3">
                        <p className="text-xs font-inter text-[#001731] leading-relaxed">{lead.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Quick Status Actions */}
                  <div>
                    <p className="text-[10px] font-inter font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">Quick Status Update</p>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleQuickStatusChange(s)}
                          disabled={lead.status === s}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-inter font-semibold capitalize transition-colors cursor-pointer disabled:opacity-50 ${
                            lead.status === s
                              ? statusColors[s]
                              : 'bg-[#f7f8fa] text-[#636363] hover:bg-[#f0f0f0]'
                          }`}
                        >
                          {statusLabels[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-inter font-semibold text-[#001731]">
                  Communication Thread
                </p>
                {lead.reply_status && (
                  <span className={`text-[10px] font-inter px-2 py-0.5 rounded-full ${
                    lead.reply_status === 'replied' ? 'bg-[#e6f4ea] text-[#088135]' : 'bg-[#fff5e6] text-[#f58300]'
                  }`}>
                    {lead.reply_status === 'replied' ? 'Replied' : 'Pending Reply'}
                  </span>
                )}
              </div>

              <div className="bg-[#f7f8fa] rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <i className="ri-loader-4-line animate-spin text-[#0d5959] text-lg" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-full bg-[#f7f8fa] flex items-center justify-center mx-auto mb-2">
                      <i className="ri-message-3-line text-[#9ca3af] text-lg" />
                    </div>
                    <p className="text-xs font-inter text-[#636363]">No messages yet.</p>
                    <p className="text-[10px] font-inter text-[#9ca3af] mt-1">Start a conversation below.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.sender_type === 'agent'
                          ? 'bg-[#0d5959] text-white'
                          : 'bg-white border border-[#f0f0f0] text-[#001731]'
                      }`}>
                        <p className="text-xs font-inter leading-relaxed">{msg.body}</p>
                        <div className={`flex items-center gap-1 mt-1 ${
                          msg.sender_type === 'agent' ? 'text-white/70' : 'text-[#9ca3af]'
                        }`}>
                          <span className="text-[10px] font-inter">{msg.sender_name}</span>
                          <span className="text-[10px] font-inter">·</span>
                          <span className="text-[10px] font-inter">{formatDate(msg.created_at)}</span>
                          {msg.sender_type === 'agent' && msg.delivery_status === 'sent' && (
                            <i className="ri-check-double-line text-[10px] ml-1" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Send Message */}
              <div className="flex items-end gap-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message to this lead..."
                  className="flex-1 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] min-h-[60px] resize-none"
                  maxLength={500}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendingMessage || !conversationId}
                  className="px-4 py-2.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-xs font-inter font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {sendingMessage ? (
                    <i className="ri-loader-4-line animate-spin" />
                  ) : (
                    <>
                      <i className="ri-send-plane-fill mr-1" /> Send
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <p className="text-xs font-inter font-semibold text-[#001731]">
                Activity Log
              </p>
              {loadingActivities ? (
                <div className="flex items-center justify-center py-8">
                  <i className="ri-loader-4-line animate-spin text-[#0d5959] text-lg" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 rounded-full bg-[#f7f8fa] flex items-center justify-center mx-auto mb-2">
                    <i className="ri-history-line text-[#9ca3af] text-lg" />
                  </div>
                  <p className="text-xs font-inter text-[#636363]">No activity recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 p-3 bg-[#f7f8fa] rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-[#f0f0f0] flex items-center justify-center flex-shrink-0">
                        <i className={`${activityIcon(act.action)} text-[#636363] text-xs`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-inter font-medium text-[#001731]">
                            {act.action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </p>
                          <span className="text-[10px] font-inter text-[#9ca3af] whitespace-nowrap">
                            {formatDate(act.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] font-inter text-[#636363] mt-0.5">
                          by {act.user_name || 'System'}
                        </p>
                        {act.after_value && Object.keys(act.after_value).length > 0 && (
                          <div className="mt-1.5 text-[10px] font-inter text-[#9ca3af]">
                            {Object.entries(act.after_value).map(([key, value]) => (
                              <span key={key} className="inline-block mr-2">
                                {key}: <span className="font-medium text-[#636363]">{String(value)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}