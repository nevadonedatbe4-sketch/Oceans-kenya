import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import { logDealCreated } from '@/lib/activityLogger';

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

interface DealStats {
  total: number;
  active: number;
  won: number;
  lost: number;
  totalValue: number;
  activeValue: number;
  wonValue: number;
  lostValue: number;
}

const dealStages = ['prospect', 'negotiation', 'offer', 'due_diligence', 'closed_won', 'closed_lost'];

const stageLabels: Record<string, string> = {
  prospect: 'Prospect',
  negotiation: 'Negotiation',
  offer: 'Offer',
  due_diligence: 'Due Diligence',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

const stageColors: Record<string, string> = {
  prospect: 'bg-[#0d5959]/8 text-[#084545]',
  negotiation: 'bg-[#fff5e6] text-[#f58300]',
  offer: 'bg-[#e8f4f8] text-[#023655]',
  due_diligence: 'bg-[#001731]/8 text-[#001731]',
  closed_won: 'bg-[#e6f4ea] text-[#088135]',
  closed_lost: 'bg-[#fef2f2] text-[#dc2626]',
};

const activeStages = ['prospect', 'negotiation', 'offer', 'due_diligence'];

export default function Deals() {
  const { user } = useAuth();
  const { agentId } = useAgentProfile();
  const isAgent = user?.role === 'agent';
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', price: '', notes: '', status: 'prospect' });
  const [adding, setAdding] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [dealStats, setDealStats] = useState<DealStats>({
    total: 0, active: 0, won: 0, lost: 0,
    totalValue: 0, activeValue: 0, wonValue: 0, lostValue: 0,
  });

  const handleAddDeal = async () => {
    if (!addForm.title.trim()) {
      addToast('Deal title is required', 'error');
      return;
    }
    setAdding(true);
    const payload = {
      title: addForm.title.trim(),
      price: addForm.price ? Number(addForm.price) : null,
      status: addForm.status,
      notes: addForm.notes.trim() || null,
      agent_id: isAgent ? agentId : null,
    };
    const { data, error } = await supabase.from('deals').insert(payload).select().single();
    if (error) {
      addToast('Failed to add deal', 'error');
    } else {
      setDeals((prev) => [data, ...prev]);
      setTotal((prev) => prev + 1);
      if (user) {
        logDealCreated(user.id, user.name || user.email, data.id, data.title || 'Untitled Deal');
      }
      addToast('Deal added successfully', 'success');
      setAddForm({ title: '', price: '', notes: '', status: 'prospect' });
      setAddModal(false);
      fetchDealStats();
    }
    setAdding(false);
  };

  const fetchDealStats = useCallback(async () => {
    let query = supabase.from('deals').select('status, price');
    if (isAgent && agentId) query = query.eq('agent_id', agentId);
    const { data } = await query;
    const all = data || [];
    const won = all.filter((d) => d.status === 'closed_won');
    const lost = all.filter((d) => d.status === 'closed_lost');
    const active = all.filter((d) => activeStages.includes(d.status));
    setDealStats({
      total: all.length,
      active: active.length,
      won: won.length,
      lost: lost.length,
      totalValue: all.reduce((s, d) => s + (Number(d.price) || 0), 0),
      activeValue: active.reduce((s, d) => s + (Number(d.price) || 0), 0),
      wonValue: won.reduce((s, d) => s + (Number(d.price) || 0), 0),
      lostValue: lost.reduce((s, d) => s + (Number(d.price) || 0), 0),
    });
  }, [isAgent, agentId]);

  const fetchDeals = useCallback(async () => {
    setLoading(true);

    let countQuery = supabase.from('deals').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (isAgent && agentId) {
      countQuery = countQuery.eq('agent_id', agentId);
      dataQuery = dataQuery.eq('agent_id', agentId);
    }
    if (stageFilter !== 'all') {
      if (stageFilter === 'active') {
        countQuery = countQuery.in('status', activeStages);
        dataQuery = dataQuery.in('status', activeStages);
      } else {
        countQuery = countQuery.eq('status', stageFilter);
        dataQuery = dataQuery.eq('status', stageFilter);
      }
    }
    if (search.trim()) {
      const term = search.trim();
      countQuery = countQuery.ilike('title', `%${term}%`);
      dataQuery = dataQuery.ilike('title', `%${term}%`);
    }

    const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);

    if (error) {
      console.error('Error fetching deals:', error);
      addToast('Failed to load deals', 'error');
    } else {
      setDeals(data || []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, stageFilter, search, isAgent, agentId]);

  useEffect(() => {
    fetchDeals();
    fetchDealStats();
  }, [fetchDeals, fetchDealStats]);

  useEffect(() => {
    setSelectedDealIds(new Set());
  }, [stageFilter, search, page]);

  const toggleDealSelect = (id: string) => {
    setSelectedDealIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllDeals = () => {
    if (selectedDealIds.size === deals.length && deals.length > 0) {
      setSelectedDealIds(new Set());
    } else {
      setSelectedDealIds(new Set(deals.map((d) => d.id)));
    }
  };

  const handleBulkDeleteDeals = async () => {
    if (selectedDealIds.size === 0) {
      addToast('No deals selected', 'error');
      setBulkDeleteConfirm(false);
      return;
    }
    const ids = Array.from(selectedDealIds);
    try {
      const { error } = await supabase.from('deals').delete().in('id', ids);
      if (error) {
        addToast('Failed to delete deals', 'error');
        setBulkDeleteConfirm(false);
        return;
      }
      setDeals((prev) => prev.filter((d) => !selectedDealIds.has(d.id)));
      setTotal((prev) => Math.max(0, prev - selectedDealIds.size));
      addToast(`${selectedDealIds.size} deals deleted`, 'success');
      setSelectedDealIds(new Set());
      fetchDealStats();
    } catch (err) {
      console.error('Bulk delete deals error:', err);
      addToast('Failed to delete deals', 'error');
    }
    setBulkDeleteConfirm(false);
  };

  const handleClearAllTestData = async () => {
    setClearingAll(true);
    let errors = 0;
    let totalDeleted = 0;

    try {
      const { error: leadsErr, count: leadsCount } = await supabase.from('leads').delete({ count: 'exact' }).neq('id', '00000000-0000-0000-0000-000000000000');
      if (leadsErr) errors++;
      else totalDeleted += leadsCount ?? 0;
    } catch {
      errors++;
    }

    try {
      const { error: dealsErr, count: dealsCount } = await supabase.from('deals').delete({ count: 'exact' }).neq('id', '00000000-0000-0000-0000-000000000000');
      if (dealsErr) errors++;
      else totalDeleted += dealsCount ?? 0;
    } catch {
      errors++;
    }

    try {
      const { error: contactsErr, count: contactsCount } = await supabase.from('contacts').delete({ count: 'exact' }).neq('id', '00000000-0000-0000-0000-000000000000');
      if (contactsErr) errors++;
      else totalDeleted += contactsCount ?? 0;
    } catch {
      errors++;
    }

    setClearingAll(false);
    setClearAllConfirm(false);

    if (errors > 0) {
      addToast(`Cleared ${totalDeleted} records with ${errors} error(s)`, 'error');
    } else {
      addToast(`All test data cleared: ${totalDeleted} records removed`, 'success');
    }

    fetchDeals();
    fetchDealStats();
  };

  const handleStageChange = async (id: string, newStage: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from('deals').update({ status: newStage }).eq('id', id);
    if (error) {
      addToast('Failed to update stage', 'error');
    } else {
      setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStage } : d)));
      addToast(`Deal moved to ${stageLabels[newStage]}`, 'success');
      fetchDealStats();
    }
    setUpdatingId(null);
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
      setTotal((prev) => Math.max(0, prev - 1));
      addToast('Deal deleted', 'success');
      fetchDealStats();
    } catch (err) {
      console.error('Delete deal error:', err);
      addToast('Failed to delete deal', 'error');
    }
    setDeleteConfirm(null);
  };

  const handleEditPrice = (deal: Deal) => {
    setEditDeal(deal);
    setEditPrice(String(deal.price || ''));
  };

  const handleSavePrice = async () => {
    if (!editDeal) return;
    const price = Number(editPrice) || 0;
    const { error } = await supabase.from('deals').update({ price }).eq('id', editDeal.id);
    if (error) {
      addToast('Failed to update price', 'error');
    } else {
      setDeals((prev) => prev.map((d) => (d.id === editDeal.id ? { ...d, price } : d)));
      addToast('Price updated', 'success');
      fetchDealStats();
    }
    setEditDeal(null);
  };

  const formatCurrency = (val: number | null) => {
    if (!val) return '—';
    if (val >= 1000000) return `KSh ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `KSh ${(val / 1000).toFixed(0)}K`;
    return `KSh ${val}`;
  };

  const winRate = dealStats.total > 0 ? Math.round((dealStats.won / dealStats.total) * 100) : 0;
  const lossRate = dealStats.total > 0 ? Math.round((dealStats.lost / dealStats.total) * 100) : 0;

  const tabs = [
    { key: 'all', label: 'All Deals', count: dealStats.total },
    { key: 'active', label: 'Active Deals', count: dealStats.active },
    { key: 'closed_won', label: 'Won Deals', count: dealStats.won },
    { key: 'closed_lost', label: 'Lost Deals', count: dealStats.lost },
  ];

  return (
    <div className="space-y-5">
      {/* Grouped Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deals Overview */}
        <div className="relative bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-xl overflow-hidden p-5">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0d5959]" />
          <h3 className="text-sm font-inter font-semibold text-white lg:text-[#001731] mb-4">Deals Overview</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">Total Deals</p>
              <p className="text-lg font-inter font-bold text-white lg:text-[#001731] mt-1">{dealStats.total}</p>
              <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363] mt-0.5">
                <i className="ri-arrow-up-line text-[#5eead4] lg:text-[#088135] text-xs" /> 100%
              </p>
            </div>
            <div>
              <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">Won Deals</p>
              <p className="text-lg font-inter font-bold text-white lg:text-[#001731] mt-1">{dealStats.won}</p>
              <p className="text-xs font-inter text-[#5eead4] lg:text-[#088135] mt-0.5">
                <i className="ri-arrow-up-line text-xs" /> {winRate}%
              </p>
            </div>
            <div>
              <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">Lost Deals</p>
              <p className="text-lg font-inter font-bold text-white lg:text-[#001731] mt-1">{dealStats.lost}</p>
              <p className="text-xs font-inter text-red-400 lg:text-red-500 mt-0.5">
                <i className="ri-arrow-down-line text-xs" /> {lossRate}%
              </p>
            </div>
          </div>
        </div>

        {/* Deals Value */}
        <div className="relative bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-xl overflow-hidden p-5">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#001731]" />
          <h3 className="text-sm font-inter font-semibold text-white lg:text-[#001731] mb-4">Deals Value</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">Total Value</p>
              <p className="text-lg font-inter font-bold text-white lg:text-[#001731] mt-1">{formatCurrency(dealStats.totalValue)}</p>
              <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363] mt-0.5">
                <i className="ri-arrow-up-line text-[#5eead4] lg:text-[#088135] text-xs" /> 100%
              </p>
            </div>
            <div>
              <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">Won Value</p>
              <p className="text-lg font-inter font-bold text-white lg:text-[#001731] mt-1">{formatCurrency(dealStats.wonValue)}</p>
              <p className="text-xs font-inter text-[#5eead4] lg:text-[#088135] mt-0.5">
                <i className="ri-arrow-up-line text-xs" /> {winRate}%
              </p>
            </div>
            <div>
              <p className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">Lost Value</p>
              <p className="text-lg font-inter font-bold text-white lg:text-[#001731] mt-1">{formatCurrency(dealStats.lostValue)}</p>
              <p className="text-xs font-inter text-red-400 lg:text-red-500 mt-0.5">
                <i className="ri-arrow-down-line text-xs" /> {lossRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Table Card */}
      <div className="bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-xl overflow-hidden">
        <div className="flex items-center border-b border-[#1c3a5e] lg:border-[#f0f0f0] px-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStageFilter(tab.key); setPage(1); }}
              className={`px-4 py-3 text-sm font-inter font-medium transition-all cursor-pointer whitespace-nowrap border-b-2 -mb-px ${
                stageFilter === tab.key
                  ? 'border-[#5eead4] text-[#5eead4] lg:border-[#0d5959] lg:text-[#0d5959]'
                  : 'border-transparent text-[#6b7280] lg:text-[#636363] hover:text-white lg:hover:text-[#001731]'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${stageFilter === tab.key ? 'text-[#5eead4] lg:text-[#0d5959]' : 'text-[#6b7280] lg:text-[#636363]'}`}>
                ({tab.count})
              </span>
            </button>
          ))}
        </div>

        {/* Toolbar inside card */}
        <div className="px-4 md:px-5 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-[#1c3a5e] lg:border-[#f0f0f0]">
          <div className="relative flex-1 max-w-md w-full">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] lg:text-[#636363] text-sm" />
            <input
              type="text"
              placeholder="Search deals by title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-[#1c3a5e] lg:border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-[#001731] lg:bg-white text-white lg:text-[#001731] placeholder:text-[#6b7280] lg:placeholder:text-[#636363]"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setClearAllConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 lg:border-red-300 rounded-lg text-xs sm:text-sm font-inter font-medium text-red-500 hover:bg-red-50 transition-all cursor-pointer whitespace-nowrap"
              title="Delete all leads, deals, and contacts"
            >
              <i className="ri-eraser-line text-sm" />
              Clear All Test Data
            </button>
            <Link
              to="/crm/pipeline"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-inter font-medium text-[#5eead4] lg:text-[#084545] hover:text-[#5eead4] lg:hover:text-[#001731] transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-funds-line text-sm" />
              Pipeline View
            </Link>
            <button
              onClick={() => setAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-xs sm:text-sm font-inter font-medium transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line" />
              Add Deal
            </button>
            <span className="text-xs font-inter text-[#6b7280] lg:text-[#636363]">{total} results</span>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedDealIds.size > 0 && (
          <div className="px-4 md:px-5 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-red-700">{selectedDealIds.size} selected</span>
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-delete-bin-line" />
              Delete Selected
            </button>
          </div>
        )}

        {/* Mobile Deal Cards */}
        <div className="lg:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#001731] border border-[#1c3a5e] rounded-xl p-4 space-y-2">
                <div className="h-3.5 w-32 bg-[#012a52] rounded animate-pulse" />
                <div className="h-3 w-20 bg-[#012a52] rounded animate-pulse" />
              </div>
            ))
          ) : deals.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-[#0d5959]/20 flex items-center justify-center mx-auto mb-3">
                <i className="ri-briefcase-3-line text-[#5eead4] text-xl" />
              </div>
              <p className="text-sm font-inter text-[#6b7280]">
                {total === 0 ? 'You don\'t have any deal listed.' : 'No deals match your filters.'}
              </p>
              {total === 0 && (
                <button
                  onClick={() => setAddModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-inter font-medium text-[#5eead4] hover:text-[#5eead4]/80 transition-colors cursor-pointer mt-2"
                >
                  Create a deal
                </button>
              )}
            </div>
          ) : (
            deals.map((deal) => (
              <div
                key={deal.id}
                onClick={() => setSelectedDeal(deal)}
                className="bg-[#001731] border border-[#1c3a5e] rounded-xl p-4 space-y-2.5 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#0d5959]/20 flex items-center justify-center flex-shrink-0">
                      <i className="ri-briefcase-3-line text-[#5eead4] text-sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-inter text-white font-semibold truncate">{deal.title || 'Untitled Deal'}</p>
                      <p className="text-xs font-inter text-[#6b7280] truncate">{deal.notes || '—'}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-inter px-2 py-0.5 rounded-full flex-shrink-0 ${
                    deal.status === 'closed_won' ? 'bg-[#088135]/20 text-[#5eead4]' :
                    deal.status === 'closed_lost' ? 'bg-[#dc2626]/20 text-red-300' :
                    deal.status === 'negotiation' ? 'bg-[#f58300]/20 text-[#f58300]' :
                    deal.status === 'offer' ? 'bg-[#023655]/30 text-[#e8f4f8]' :
                    'bg-[#0d5959]/30 text-[#5eead4]'
                  }`}>
                    {stageLabels[deal.status] || 'Prospect'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-inter text-white font-semibold">{formatCurrency(deal.price)}</span>
                  <span className="text-xs font-inter text-[#6b7280]">
                    {new Date(deal.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditPrice(deal); }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#0d5959]/20 text-[#5eead4] text-xs font-inter transition-colors"
                  >
                    <i className="ri-edit-line mr-1" /> Edit Price
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(deal.id); }}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 text-xs font-inter transition-colors"
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
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
                <th className="px-2 md:px-3 py-2.5 text-left">
                  <input
                    type="checkbox"
                    checked={selectedDealIds.size === deals.length && deals.length > 0}
                    onChange={toggleSelectAllDeals}
                    className="w-4 h-4 rounded border-gray-300 text-[#0d5959] focus:ring-[#0d5959] cursor-pointer"
                  />
                </th>
                <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider">Property</th>
                <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider">Value</th>
                <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider">Stage</th>
                <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider hidden sm:table-cell">Date</th>
                <th className="px-4 md:px-5 py-2.5 text-left text-xs font-inter font-semibold text-[#636363] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8edf2]/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-2 md:px-3 py-3">
                      <div className="w-4 h-4 bg-[#f7f8fa] rounded animate-pulse" />
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <div className="h-3.5 w-32 bg-[#f7f8fa] rounded animate-pulse" />
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <div className="h-3.5 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <div className="h-5 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                    </td>
                    <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                      <div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <div className="h-8 w-16 bg-[#f7f8fa] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : deals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 md:px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-[#0d5959]/8 flex items-center justify-center">
                        <i className="ri-briefcase-3-line text-[#084545] text-xl" />
                      </div>
                      <p className="text-sm font-inter text-[#636363]">
                        {total === 0 ? 'You don\'t have any deal listed.' : 'No deals match your filters.'}
                      </p>
                      {total === 0 && (
                        <button
                          onClick={() => setAddModal(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-inter font-medium text-[#0d5959] hover:text-[#084545] transition-colors cursor-pointer mt-1"
                        >
                          Create a deal
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                deals.map((deal) => (
                  <tr key={deal.id} onClick={() => setSelectedDeal(deal)} className="hover:bg-[#f7f8fa]/60 transition-colors group cursor-pointer">
                    <td className="px-2 md:px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedDealIds.has(deal.id)}
                        onChange={() => toggleDealSelect(deal.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#0d5959] focus:ring-[#0d5959] cursor-pointer"
                      />
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#0d5959]/8 flex items-center justify-center flex-shrink-0">
                          <i className="ri-briefcase-3-line text-[#084545] text-sm" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-inter text-[#001731] font-semibold">{deal.title || 'Untitled Deal'}</p>
                          <p className="text-xs font-inter text-[#636363] line-clamp-1">{deal.notes || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditPrice(deal); }}
                        className="text-sm font-inter text-[#001731] font-semibold hover:text-[#084545] transition-colors cursor-pointer"
                      >
                        {formatCurrency(deal.price)}
                      </button>
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <div className="relative">
                        <select
                          value={deal.status || 'prospect'}
                          onChange={(e) => { e.stopPropagation(); handleStageChange(deal.id, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          disabled={updatingId === deal.id}
                          className={`text-xs font-inter px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-1 focus:ring-[#0d5959]/20 ${stageColors[deal.status || 'prospect'] || 'bg-[#f7f8fa] text-[#636363]'}`}
                        >
                          {dealStages.map((s) => (
                            <option key={s} value={s} className="bg-white text-[#636363]">{stageLabels[s]}</option>
                          ))}
                        </select>
                        {updatingId === deal.id && (
                          <i className="ri-loader-4-line animate-spin text-[#084545] text-xs ml-1 inline-block" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                      <span className="text-xs font-inter text-[#636363]">
                        {new Date(deal.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditPrice(deal); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#0d5959]/8 text-[#636363] hover:text-[#084545] transition-colors cursor-pointer"
                          title="Edit price"
                        >
                          <i className="ri-edit-line text-sm" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(deal.id); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#636363] hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <i className="ri-delete-bin-line text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && deals.length > 0 && (
          <CRMPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Deal Detail Panel */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedDeal(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
              <h2 className="font-prata text-lg font-semibold text-stone-900">Deal Details</h2>
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
                  <h3 className="font-prata text-base text-stone-900">{selectedDeal.title || 'Untitled Deal'}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-inter capitalize mt-1 ${stageColors[selectedDeal.status] || 'bg-[#f7f8fa] text-[#636363]'}`}>
                    {stageLabels[selectedDeal.status] || selectedDeal.status}
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
                  <p className="text-sm font-inter text-[#001731] mt-1 capitalize">{stageLabels[selectedDeal.status] || selectedDeal.status}</p>
                </div>
                <div className="bg-[#f7f8fa] rounded-lg p-3">
                  <p className="text-xs font-inter text-[#636363] uppercase tracking-wider">Created</p>
                  <p className="text-sm font-inter text-[#001731] mt-1">{new Date(selectedDeal.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="bg-[#f7f8fa] rounded-lg p-3">
                  <p className="text-xs font-inter text-[#636363] uppercase tracking-wider">Updated</p>
                  <p className="text-sm font-inter text-[#001731] mt-1">{new Date(selectedDeal.updated_at).toLocaleDateString('en-GB')}</p>
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
                  onClick={() => { handleEditPrice(selectedDeal); setSelectedDeal(null); }}
                  className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-all cursor-pointer"
                >
                  <i className="ri-edit-line mr-1" /> Edit Price
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
      )}

      {/* Edit Price Modal */}
      {editDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditDeal(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-prata text-lg text-stone-900 mb-4">Edit Price</h3>
            <p className="text-sm font-inter text-[#636363] mb-4">{editDeal.title}</p>
            <div className="mb-4">
              <label className="block text-xs font-inter text-[#636363] uppercase tracking-wider mb-1.5">Price (KES)</label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-inter focus:outline-none focus:border-[#0d5959]"
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEditDeal(null)}
                className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrice}
                className="flex-1 px-4 py-2.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-sm font-inter transition-all cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Deal?"
        message="This will permanently remove this deal from the pipeline. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmModal
        open={bulkDeleteConfirm}
        title={`Delete ${selectedDealIds.size} Deals?`}
        message={`This will permanently remove all ${selectedDealIds.size} selected deals from the pipeline. This action cannot be undone.`}
        confirmLabel="Delete All"
        confirmVariant="danger"
        onConfirm={handleBulkDeleteDeals}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      {/* Clear All Test Data Modal */}
      {clearAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setClearAllConfirm(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-md shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <i className="ri-alert-line text-red-600 text-lg" />
              </div>
              <h3 className="font-prata text-lg text-stone-900">Clear All Test Data?</h3>
            </div>
            <p className="text-sm font-inter text-[#636363] mb-1">
              This will <strong className="text-red-600">permanently delete every record</strong> across all three tables:
            </p>
            <ul className="text-sm font-inter text-[#636363] list-disc list-inside mb-4 space-y-0.5">
              <li>All <strong>Leads</strong></li>
              <li>All <strong>Deals</strong></li>
              <li>All <strong>Contacts</strong></li>
            </ul>
            <p className="text-xs font-inter text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-5">
              <i className="ri-error-warning-line mr-1" />
              This nukes everything. Only use this to wipe mock/test data. Real data will be lost too if you keep it mixed in.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setClearAllConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllTestData}
                disabled={clearingAll}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-inter font-semibold transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {clearingAll ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Wiping...
                  </>
                ) : (
                  <>
                    <i className="ri-delete-bin-6-line" />
                    Delete Everything
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deal Modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddModal(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
              <h2 className="font-prata text-lg font-semibold text-stone-900">Add New Deal</h2>
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
                    {dealStages.map((s) => (
                      <option key={s} value={s}>{stageLabels[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
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
                  className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDeal}
                  disabled={adding}
                  className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm transition-all cursor-pointer disabled:opacity-50"
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