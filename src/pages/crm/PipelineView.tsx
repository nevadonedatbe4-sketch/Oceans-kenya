import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';

interface Deal {
  id: string;
  title: string;
  status: string;
  price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  property_id: string | null;
  agent_id: string | null;
  client_id: string | null;
}

interface Agent {
  id: string;
  name: string;
  avatar_url: string | null;
  photo_url: string | null;
  title: string | null;
}

interface AgentWorkload {
  agent: Agent;
  total: number;
  active: number;
  value: number;
  wonValue: number;
}

interface StageConfig {
  key: string;
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  dotColor: string;
}

const stages: StageConfig[] = [
  {
    key: 'prospect',
    label: 'Prospect',
    color: 'text-[#084545]',
    borderColor: 'border-[#0d5959]/30',
    bgColor: 'bg-[#0d5959]/8',
    dotColor: 'bg-[#0d5959]',
  },
  {
    key: 'negotiation',
    label: 'Negotiation',
    color: 'text-[#f58300]',
    borderColor: 'border-[#f58300]/30',
    bgColor: 'bg-[#fff5e6]',
    dotColor: 'bg-[#f58300]',
  },
  {
    key: 'offer',
    label: 'Offer',
    color: 'text-[#023655]',
    borderColor: 'border-[#023655]/30',
    bgColor: 'bg-[#e8f4f8]',
    dotColor: 'bg-[#023655]',
  },
  {
    key: 'due_diligence',
    label: 'Due Diligence',
    color: 'text-[#001731]',
    borderColor: 'border-[#001731]/30',
    bgColor: 'bg-[#001731]/8',
    dotColor: 'bg-[#001731]',
  },
  {
    key: 'closed_won',
    label: 'Closed Won',
    color: 'text-[#088135]',
    borderColor: 'border-[#088135]/30',
    bgColor: 'bg-[#e6f4ea]',
    dotColor: 'bg-[#088135]',
  },
  {
    key: 'closed_lost',
    label: 'Closed Lost',
    color: 'text-[#dc2626]',
    borderColor: 'border-[#dc2626]/30',
    bgColor: 'bg-[#fef2f2]',
    dotColor: 'bg-[#dc2626]',
  },
];

const allStageKeys = stages.map((s) => s.key);

const formatCurrency = (val: number | null) => {
  if (!val || val === 0) return '—';
  if (val >= 1000000) return `KSh ${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `KSh ${(val / 1000).toFixed(0)}K`;
  return `KSh ${val}`;
};

export default function PipelineView() {
  const { user } = useAuth();
  const { agentId, loading: agentLoading } = useAgentProfile();
  const navigate = useNavigate();
  const isAgent = user?.role === 'agent';
  const [deals, setDeals] = useState<Deal[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAgentId, setFilterAgentId] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', price: '', notes: '', status: 'prospect', assignedAgentId: '' });
  const [adding, setAdding] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [assigningDealId, setAssigningDealId] = useState<string | null>(null);
  const [showWorkload, setShowWorkload] = useState(false);

  const fetchAgents = useCallback(async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('id, name, avatar_url, photo_url, title')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (!error && data) {
      setAgents(data);
    }
  }, []);

  const fetchDeals = useCallback(async () => {
    if (isAgent && agentLoading) return;
    setLoading(true);
    let query = supabase
      .from('deals')
      .select('*')
      .order('updated_at', { ascending: false });

    if (isAgent && agentId) {
      query = query.eq('agent_id', agentId);
    }
    if (!isAgent && filterAgentId) {
      query = query.eq('agent_id', filterAgentId);
    }
    if (search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching deals:', error);
      addToast('Failed to load deals', 'error');
      setDeals([]);
    } else {
      setDeals(data || []);
    }
    setLoading(false);
  }, [isAgent, agentId, search, filterAgentId, agentLoading]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  useEffect(() => {
    fetchAgents();
  }, []);

  const getAgentById = (id: string | null) => {
    if (!id) return null;
    return agents.find((a) => a.id === id) || null;
  };

  const handleStageChange = async (id: string, newStage: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('deals').update({ status: newStage }).eq('id', id);
      if (error) {
        console.error('Update deal stage failed:', error);
        addToast(error.message || 'Unable to update stage. Please try again.', 'error');
      } else {
        setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStage } : d)));
        const stageLabel = stages.find((s) => s.key === newStage)?.label || newStage;
        addToast(`Deal moved to ${stageLabel}`, 'success');
      }
    } catch (err) {
      console.error('Stage change error:', err);
      addToast('Failed to update stage', 'error');
    }
    setUpdatingId(null);
  };

  const handleAssignAgent = async (dealId: string, newAgentId: string | null) => {
    try {
      const { error } = await supabase
        .from('deals')
        .update({ agent_id: newAgentId })
        .eq('id', dealId);
      if (error) {
        console.error('Assign deal agent failed:', error);
        addToast(error.message || 'Unable to update assignment. Please try again.', 'error');
      } else {
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, agent_id: newAgentId } : d))
        );
        if (selectedDeal && selectedDeal.id === dealId) {
          setSelectedDeal((prev) => (prev ? { ...prev, agent_id: newAgentId } : null));
        }
        const agentName = newAgentId ? getAgentById(newAgentId)?.name : null;
        addToast(agentName ? `Assigned to ${agentName}` : 'Deal unassigned', 'success');
      }
    } catch (err) {
      console.error('Assign agent error:', err);
      addToast('Failed to update assignment', 'error');
    }
    setAssigningDealId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('deals').delete().eq('id', id);
      if (error) {
        addToast('Failed to delete deal', 'error');
        setDeleteConfirm(null);
        return;
      }
      setDeals((prev) => prev.filter((d) => d.id !== id));
      addToast('Deal deleted', 'success');
    } catch (err) {
      console.error('Delete deal error:', err);
      addToast('Failed to delete deal', 'error');
    }
    setDeleteConfirm(null);
  };

  const handleAddDeal = async () => {
    if (!addForm.title.trim()) {
      addToast('Deal title is required', 'error');
      return;
    }
    setAdding(true);
    const payload: Record<string, unknown> = {
      title: addForm.title.trim(),
      price: addForm.price ? Number(addForm.price) : 0,
      status: addForm.status,
      notes: addForm.notes.trim() || null,
      agent_id: isAgent ? agentId : (addForm.assignedAgentId || null),
    };
    const { data, error } = await supabase.from('deals').insert(payload).select().single();
    if (error) {
      console.error('Add deal failed:', error);
      addToast(error.message || 'Unable to create deal. Please check the required fields and try again.', 'error');
    } else {
      setDeals((prev) => [data, ...prev]);
      addToast('Deal added successfully', 'success');
      setAddForm({ title: '', price: '', notes: '', status: 'prospect', assignedAgentId: '' });
      setAddModal(false);
    }
    setAdding(false);
  };

  // Drag and drop handlers
  const onDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggingId(dealId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
  };

  const onDragOverStage = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOverStage(stageKey);
  };

  const onDrop = async (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    if (!draggingId || !stageKey) {
      setDragOverStage(null);
      return;
    }
    const deal = deals.find((d) => d.id === draggingId);
    if (!deal || deal.status === stageKey) {
      setDraggingId(null);
      setDragOverStage(null);
      return;
    }
    await handleStageChange(draggingId, stageKey);
    setDraggingId(null);
    setDragOverStage(null);
  };

  const dealsByStage = (stageKey: string) =>
    deals.filter((d) => d.status === stageKey);

  const stageValue = (stageKey: string) =>
    dealsByStage(stageKey).reduce((sum, d) => sum + (Number(d.price) || 0), 0);

  const totalDeals = deals.length;
  const totalValue = deals.reduce((sum, d) => sum + (Number(d.price) || 0), 0);
  const wonValue = deals
    .filter((d) => d.status === 'closed_won')
    .reduce((sum, d) => sum + (Number(d.price) || 0), 0);
  const activeDeals = deals.filter((d) =>
    ['prospect', 'negotiation', 'offer', 'due_diligence'].includes(d.status)
  ).length;

  // Agent workload computation
  const agentWorkload: AgentWorkload[] = useMemo(() => {
    return agents
      .map((agent) => {
        const agentDeals = deals.filter((d) => d.agent_id === agent.id);
        const agentActive = agentDeals.filter((d) =>
          ['prospect', 'negotiation', 'offer', 'due_diligence'].includes(d.status)
        );
        const agentWon = agentDeals.filter((d) => d.status === 'closed_won');
        return {
          agent,
          total: agentDeals.length,
          active: agentActive.length,
          value: agentDeals.reduce((s, d) => s + (Number(d.price) || 0), 0),
          wonValue: agentWon.reduce((s, d) => s + (Number(d.price) || 0), 0),
        };
      })
      .filter((w) => w.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [agents, deals]);

  const agentsWithDeals = agentWorkload.length;

  const renderAgentAvatar = (agent: Agent | null, size: string) => {
    if (!agent) {
      return (
        <div className={`${size} rounded-full bg-[#0d5959]/15 flex items-center justify-center`}>
          <i className="ri-user-line text-[#0d5959]" style={{ fontSize: `calc(${size === 'w-5 h-5' ? '10px' : '12px'})` }} />
        </div>
      );
    }
    const imgSrc = agent.avatar_url || agent.photo_url;
    if (imgSrc) {
      return (
        <div className={`${size} rounded-full overflow-hidden bg-[#0d5959]/15`}>
          <img src={imgSrc} alt={agent.name} className="w-full h-full object-cover" />
        </div>
      );
    }
    const initials = agent.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    return (
      <div className={`${size} rounded-full bg-[#0d5959]/15 flex items-center justify-center`}>
        <span className="text-[#0d5959] font-inter font-semibold" style={{ fontSize: `calc(${size === 'w-5 h-5' ? '8px' : '10px'})` }}>
          {initials}
        </span>
      </div>
    );
  };

  const selectedFilterAgent = filterAgentId ? getAgentById(filterAgentId) : null;

  return (
    <div className="space-y-5">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-xl p-4">
          <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">Total Deals</p>
          <p className="text-xl font-inter font-bold text-white lg:text-[#001731] mt-1">{totalDeals}</p>
        </div>
        <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-xl p-4">
          <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">Active in Pipeline</p>
          <p className="text-xl font-inter font-bold text-white lg:text-[#001731] mt-1">{activeDeals}</p>
        </div>
        <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-xl p-4">
          <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">Pipeline Value</p>
          <p className="text-xl font-inter font-bold text-white lg:text-[#001731] mt-1">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-xl p-4">
          <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">Won Value</p>
          <p className="text-xl font-inter font-bold text-[#5eead4] lg:text-[#088135] mt-1">{formatCurrency(wonValue)}</p>
        </div>
        {!isAgent && (
          <button
            onClick={() => setShowWorkload(!showWorkload)}
            className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-xl p-4 text-left hover:border-[#5eead4] lg:hover:border-[#0d5959] transition-all cursor-pointer w-full"
          >
            <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363] flex items-center gap-1">
              Team Members
              <i className={showWorkload ? 'ri-arrow-up-s-line text-[10px]' : 'ri-arrow-down-s-line text-[10px]'} />
            </p>
            <p className="text-xl font-inter font-bold text-white lg:text-[#001731] mt-1">{agentsWithDeals}</p>
          </button>
        )}
      </div>

      {/* Agent Workload Breakdown */}
      {showWorkload && !isAgent && agentWorkload.length > 0 && (
        <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-xl p-4">
          <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363] uppercase tracking-wider mb-3">
            Agent Workload
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {agentWorkload.map((w) => (
              <button
                key={w.agent.id}
                onClick={() => setFilterAgentId(filterAgentId === w.agent.id ? '' : w.agent.id)}
                className={`flex items-center gap-3 rounded-lg p-3 border transition-all cursor-pointer text-left ${
                  filterAgentId === w.agent.id
                    ? 'border-[#5eead4] lg:border-[#0d5959] bg-[#0d5959]/10 lg:bg-[#0d5959]/5'
                    : 'border-[#1c3a5e] lg:border-[#f0f0f0] bg-[#001731] lg:bg-[#f7f8fa] hover:border-[#5eead4] lg:hover:border-[#0d5959]'
                }`}
              >
                {renderAgentAvatar(w.agent, 'w-9 h-9')}
                <div className="min-w-0">
                  <p className="text-xs font-inter font-semibold text-white lg:text-[#001731] truncate">
                    {w.agent.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-inter text-[#6b7280] lg:text-[#636363]">
                      {w.total} deals
                    </span>
                    {w.active > 0 && (
                      <span className="text-[10px] font-inter text-[#5eead4] lg:text-[#0d5959]">
                        {w.active} active
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-inter text-[#6b7280] lg:text-[#636363] mt-0.5">
                    {formatCurrency(w.value)}
                  </p>
                </div>
                {filterAgentId === w.agent.id && (
                  <i className="ri-filter-3-fill text-[#5eead4] lg:text-[#0d5959] text-xs ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-lg w-full">
          <div className="relative flex-1">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] lg:text-[#636363] text-sm" />
            <input
              type="text"
              placeholder="Search deals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#1c3a5e] lg:border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-[#001731] lg:bg-white text-white lg:text-[#001731] placeholder:text-[#6b7280] lg:placeholder:text-[#636363]"
            />
          </div>

          {/* Agent Filter Dropdown */}
          {!isAgent && (
            <div className="relative">
              <select
                value={filterAgentId}
                onChange={(e) => setFilterAgentId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-[#1c3a5e] lg:border-[#f0f0f0] rounded-lg text-sm font-inter bg-[#001731] lg:bg-white text-white lg:text-[#001731] cursor-pointer focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
              >
                <option value="">All agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b7280] lg:text-[#636363] text-xs pointer-events-none" />
              {filterAgentId && (
                <button
                  onClick={() => setFilterAgentId('')}
                  className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-[#0d5959] text-white flex items-center justify-center cursor-pointer hover:bg-[#0d5959]/80 transition-colors"
                >
                  <i className="ri-close-line text-[8px]" />
                </button>
              )}
            </div>
          )}

          {/* Active filter pill */}
          {!isAgent && selectedFilterAgent && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-inter bg-[#0d5959]/10 text-[#084545] border border-[#0d5959]/20 whitespace-nowrap">
              {renderAgentAvatar(selectedFilterAgent, 'w-4 h-4')}
              {selectedFilterAgent.name}
              <button onClick={() => setFilterAgentId('')} className="cursor-pointer hover:text-[#001731]">
                <i className="ri-close-line text-[10px]" />
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/crm/deals"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-inter font-medium text-[#5eead4] lg:text-[#084545] hover:text-[#5eead4] lg:hover:text-[#001731] transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-list-check text-sm" />
            List View
          </Link>
          <button
            onClick={() => setAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-xs sm:text-sm font-inter font-medium transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line" />
            Add Deal
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-[1024px]">
          {stages.map((stage) => {
            const stageDeals = dealsByStage(stage.key);
            const stageVal = stageValue(stage.key);
            const isDropTarget = dragOverStage === stage.key;
            return (
              <div
                key={stage.key}
                className={`flex-1 min-w-[260px] max-w-[320px] rounded-xl border transition-all ${
                  isDropTarget
                    ? 'border-[#5eead4] lg:border-[#0d5959] bg-[#0d5959]/10 lg:bg-[#0d5959]/5'
                    : 'border-[#1c3a5e] lg:border-[#f0f0f0] bg-[#012144] lg:bg-white'
                }`}
                onDragOver={(e) => onDragOverStage(e, stage.key)}
                onDrop={(e) => onDrop(e, stage.key)}
              >
                {/* Column Header */}
                <div className="px-4 py-3 border-b border-[#1c3a5e] lg:border-[#f0f0f0]">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
                    <h3 className="text-sm font-inter font-semibold text-white lg:text-[#001731]">
                      {stage.label}
                    </h3>
                    <span className="ml-auto text-xs font-inter text-[#6b7280] lg:text-[#636363]">
                      {stageDeals.length}
                    </span>
                  </div>
                  <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363] mt-1">
                    {formatCurrency(stageVal)}
                  </p>
                </div>

                {/* Cards */}
                <div className="p-3 space-y-3 min-h-[120px]">
                  {loading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="bg-[#001731] lg:bg-[#f7f8fa] border border-[#1c3a5e] lg:border-[#f0f0f0] rounded-lg p-3 space-y-2">
                        <div className="h-3.5 w-28 bg-[#012a52] lg:bg-[#e8edf2] rounded animate-pulse" />
                        <div className="h-3 w-20 bg-[#012a52] lg:bg-[#e8edf2] rounded animate-pulse" />
                      </div>
                    ))
                  ) : stageDeals.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">No deals</p>
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const assignedAgent = getAgentById(deal.agent_id);
                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, deal.id)}
                          onDragEnd={onDragEnd}
                          onClick={() => setSelectedDeal(deal)}
                          className={`bg-[#001731] lg:bg-[#f7f8fa] border border-[#1c3a5e] lg:border-[#f0f0f0] rounded-lg p-3 cursor-pointer hover:border-[#5eead4] lg:hover:border-[#0d5959] transition-all group ${
                            draggingId === deal.id ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-inter font-semibold text-white lg:text-[#001731] line-clamp-2">
                              {deal.title || 'Untitled Deal'}
                            </p>
                            {updatingId === deal.id && (
                              <i className="ri-loader-4-line animate-spin text-[#5eead4] lg:text-[#084545] text-xs" />
                            )}
                          </div>
                          <p className="text-xs font-inter text-[#5eead4] lg:text-[#0d5959] font-semibold mt-1.5">
                            {formatCurrency(deal.price)}
                          </p>
                          {deal.notes && (
                            <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363] mt-1.5 line-clamp-2">
                              {deal.notes}
                            </p>
                          )}

                          {/* Agent Assignment on Card */}
                          <div className="mt-2 pt-2 border-t border-[#1c3a5e] lg:border-[#f0f0f0]">
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              {!isAgent ? (
                                <button
                                  onClick={() =>
                                    setAssigningDealId(assigningDealId === deal.id ? null : deal.id)
                                  }
                                  className="flex items-center gap-1.5 text-[10px] text-[#6b7280] lg:text-[#636363] hover:text-[#5eead4] lg:hover:text-[#0d5959] transition-colors cursor-pointer group/agent w-full"
                                >
                                  {renderAgentAvatar(assignedAgent, 'w-5 h-5')}
                                  <span className="truncate max-w-[100px]">
                                    {assignedAgent?.name || 'Unassigned'}
                                  </span>
                                  <i className="ri-arrow-down-s-line text-[10px] ml-auto opacity-0 group-hover/agent:opacity-100 transition-opacity" />
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5 text-[10px] text-[#6b7280] lg:text-[#636363]">
                                  {renderAgentAvatar(assignedAgent, 'w-5 h-5')}
                                  <span className="truncate max-w-[100px]">
                                    {assignedAgent?.name || 'Unassigned'}
                                  </span>
                                </div>
                              )}

                              {/* Agent Dropdown */}
                              {assigningDealId === deal.id && !isAgent && (
                                <div className="absolute bottom-full left-0 mb-1 w-44 bg-white border border-[#f0f0f0] rounded-lg shadow-lg z-20 py-1 max-h-44 overflow-y-auto">
                                  <button
                                    onClick={() => handleAssignAgent(deal.id, null)}
                                    className={`w-full text-left px-3 py-2 text-xs text-[#636363] hover:bg-[#f7f8fa] cursor-pointer flex items-center gap-2 ${
                                      !deal.agent_id ? 'bg-[#f7f8fa]' : ''
                                    }`}
                                  >
                                    <div className="w-5 h-5 rounded-full bg-[#f0f0f0] flex items-center justify-center">
                                      <i className="ri-user-unfollow-line text-[10px] text-[#636363]" />
                                    </div>
                                    Unassigned
                                  </button>
                                  {agents.map((agent) => (
                                    <button
                                      key={agent.id}
                                      onClick={() => handleAssignAgent(deal.id, agent.id)}
                                      className={`w-full text-left px-3 py-2 text-xs text-[#001731] hover:bg-[#f7f8fa] cursor-pointer flex items-center gap-2 ${
                                        deal.agent_id === agent.id ? 'bg-[#0d5959]/8' : ''
                                      }`}
                                    >
                                      {renderAgentAvatar(agent, 'w-5 h-5')}
                                      <span className="truncate">{agent.name}</span>
                                      {deal.agent_id === agent.id && (
                                        <i className="ri-check-line text-[#0d5959] text-xs ml-auto" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Date + Stage */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1c3a5e] lg:border-[#f0f0f0]">
                            <span className="text-[10px] font-inter text-[#6b7280] lg:text-[#636363]">
                              {new Date(deal.updated_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                            <select
                              value={deal.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleStageChange(deal.id, e.target.value);
                              }}
                              className="text-[10px] font-inter px-1.5 py-0.5 rounded border border-[#1c3a5e] lg:border-[#f0f0f0] bg-[#001731] lg:bg-white text-white lg:text-[#001731] cursor-pointer focus:outline-none focus:border-[#0d5959]"
                            >
                              {allStageKeys.map((s) => (
                                <option key={s} value={s}>
                                  {stages.find((st) => st.key === s)?.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deal Detail Panel */}
      {selectedDeal && (() => {
        const detailAgent = getAgentById(selectedDeal.agent_id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedDeal(null)} />
            <div className="relative bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
                <h2 className="font-inter text-base font-semibold text-[#001731]">Deal Details</h2>
                <button onClick={() => setSelectedDeal(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f8fa] cursor-pointer">
                  <i className="ri-close-line text-[#636363] text-lg" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-[#0d5959]/8 flex items-center justify-center">
                    <i className="ri-briefcase-3-line text-[#084545] text-xl" />
                  </div>
                  <div>
                    <h3 className="font-inter text-base font-semibold text-[#001731]">{selectedDeal.title || 'Untitled Deal'}</h3>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-inter capitalize mt-1 ${
                      stages.find((s) => s.key === selectedDeal.status)?.bgColor || 'bg-[#f7f8fa]'
                    } ${stages.find((s) => s.key === selectedDeal.status)?.color || 'text-[#636363]'}`}>
                      {stages.find((s) => s.key === selectedDeal.status)?.label || selectedDeal.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#f7f8fa] rounded-lg p-3">
                    <p className="text-xs font-inter text-[#636363] uppercase tracking-wider">Deal Value</p>
                    <p className="text-sm font-inter text-[#001731] mt-1">{formatCurrency(selectedDeal.price)}</p>
                  </div>
                  <div className="bg-[#f7f8fa] rounded-lg p-3">
                    <p className="text-xs font-inter text-[#636363] uppercase tracking-wider">Stage</p>
                    <p className="text-sm font-inter text-[#001731] mt-1">
                      {stages.find((s) => s.key === selectedDeal.status)?.label || selectedDeal.status}
                    </p>
                  </div>

                  {/* Assigned Agent */}
                  <div className="col-span-2 bg-[#f7f8fa] rounded-lg p-3">
                    <p className="text-xs font-inter text-[#636363] uppercase tracking-wider mb-2">Assigned To</p>
                    {!isAgent ? (
                      <div className="relative">
                        <select
                          value={selectedDeal.agent_id || ''}
                          onChange={(e) => {
                            const val = e.target.value || null;
                            handleAssignAgent(selectedDeal.id, val);
                          }}
                          className="w-full pl-3 pr-8 py-2 border border-[#f0f0f0] rounded-lg text-sm font-inter bg-white cursor-pointer focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 text-[#001731]"
                        >
                          <option value="">Unassigned</option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name}{agent.title ? ` — ${agent.title}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {renderAgentAvatar(detailAgent, 'w-8 h-8')}
                        <div>
                          <p className="text-sm font-inter text-[#001731] font-medium">
                            {detailAgent?.name || 'Unassigned'}
                          </p>
                          {detailAgent?.title && (
                            <p className="text-xs font-inter text-[#636363]">{detailAgent.title}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#f7f8fa] rounded-lg p-3">
                    <p className="text-xs font-inter text-[#636363] uppercase tracking-wider">Created</p>
                    <p className="text-sm font-inter text-[#001731] mt-1">
                      {new Date(selectedDeal.created_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div className="bg-[#f7f8fa] rounded-lg p-3">
                    <p className="text-xs font-inter text-[#636363] uppercase tracking-wider">Updated</p>
                    <p className="text-sm font-inter text-[#001731] mt-1">
                      {new Date(selectedDeal.updated_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>

                {selectedDeal.notes && (
                  <div>
                    <p className="text-xs font-inter text-[#636363] uppercase tracking-wider mb-2">Notes</p>
                    <div className="bg-[#f7f8fa] rounded-lg p-3">
                      <p className="text-sm font-inter text-[#001731] leading-relaxed">{selectedDeal.notes}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setSelectedDeal(null);
                      navigate(`/crm/deals`);
                    }}
                    className="flex-1 px-4 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter text-[#636363] hover:bg-[#f7f8fa] transition-all cursor-pointer"
                  >
                    Go to Deals
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirm(selectedDeal.id);
                      setSelectedDeal(null);
                    }}
                    className="px-4 py-2.5 border border-red-200 rounded-lg text-sm font-inter text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedDeal(null)}
                    className="flex-1 px-4 py-2.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-sm font-inter transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Deal?"
        message="This will permanently remove this deal from the pipeline. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Add Deal Modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddModal(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
              <h2 className="font-inter text-base font-semibold text-[#001731]">Add New Deal</h2>
              <button onClick={() => setAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f8fa] cursor-pointer">
                <i className="ri-close-line text-[#636363] text-lg" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">Deal Title *</label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
                  placeholder="e.g. Ocean View Villa Sale"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">Deal Value (KES)</label>
                  <input
                    type="number"
                    value={addForm.price}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">Stage</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer"
                  >
                    {stages.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Agent Selector in Add Modal */}
              {!isAgent && (
                <div>
                  <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">Assign To</label>
                  <select
                    value={addForm.assignedAgentId}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, assignedAgentId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer text-[#001731]"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}{agent.title ? ` — ${agent.title}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">Notes</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] min-h-[80px] resize-none"
                  placeholder="Notes about this deal..."
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
                  onClick={handleAddDeal}
                  disabled={adding}
                  className="flex-1 px-4 py-2.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-sm font-inter transition-all cursor-pointer disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add Deal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}