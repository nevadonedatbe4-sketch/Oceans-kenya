import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';

interface Deal {
  id: string;
  title: string;
  status: string;
  price: number | null;
  commission: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  property_id: string | null;
  agent_id: string | null;
  client_id: string | null;
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
  prospect: 'bg-[#0d5959]/8 text-[#0d5959]',
  negotiation: 'bg-amber-50 text-amber-700',
  offer: 'bg-sky-50 text-sky-700',
  due_diligence: 'bg-[#001731]/8 text-[#001731]',
  closed_won: 'bg-emerald-50 text-emerald-700',
  closed_lost: 'bg-red-50 text-red-700',
};

export default function Deals() {
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

  const fetchDeals = useCallback(async () => {
    setLoading(true);

    let countQuery = supabase.from('deals').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (stageFilter !== 'all') {
      countQuery = countQuery.eq('status', stageFilter);
      dataQuery = dataQuery.eq('status', stageFilter);
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
  }, [page, pageSize, stageFilter, search]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleStageChange = async (id: string, newStage: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from('deals').update({ status: newStage }).eq('id', id);
    if (error) {
      addToast('Failed to update stage', 'error');
    } else {
      setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStage } : d)));
      addToast(`Deal moved to ${stageLabels[newStage]}`, 'success');
    }
    setUpdatingId(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('deals').delete().eq('id', id);
    if (error) {
      addToast('Failed to delete deal', 'error');
    } else {
      setDeals((prev) => prev.filter((d) => d.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      addToast('Deal deleted', 'success');
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
    }
    setEditDeal(null);
  };

  const formatCurrency = (val: number | null) => {
    if (!val) return '—';
    if (val >= 1000000) return `KSh ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `KSh ${(val / 1000).toFixed(0)}K`;
    return `KSh ${val}`;
  };

  // Pipeline summary
  const pipelineValue = deals
    .filter((d) => ['prospect', 'negotiation', 'offer', 'due_diligence'].includes(d.status))
    .reduce((sum, d) => sum + (Number(d.price) || 0), 0);
  const closedValue = deals
    .filter((d) => d.status === 'closed_won')
    .reduce((sum, d) => sum + (Number(d.price) || 0), 0);
  const totalCommission = deals.reduce((sum, d) => sum + (Number(d.commission) || 0), 0);

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden p-5">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0d5959]" />
          <p className="text-xs font-roboto text-[#7a8a99] uppercase tracking-wider">Pipeline Value</p>
          <p className="text-2xl font-prata text-[#001731] mt-1">{formatCurrency(pipelineValue)}</p>
          <p className="text-xs font-roboto text-[#7a8a99] mt-1">Active deals</p>
        </div>
        <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden p-5">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#001731]" />
          <p className="text-xs font-roboto text-[#7a8a99] uppercase tracking-wider">Closed Value</p>
          <p className="text-2xl font-prata text-[#001731] mt-1">{formatCurrency(closedValue)}</p>
          <p className="text-xs font-roboto text-[#7a8a99] mt-1">Won deals</p>
        </div>
        <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden p-5">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0d5959]" />
          <p className="text-xs font-roboto text-[#7a8a99] uppercase tracking-wider">Total Commission</p>
          <p className="text-2xl font-prata text-[#001731] mt-1">{formatCurrency(totalCommission)}</p>
          <p className="text-xs font-roboto text-[#7a8a99] mt-1">All time</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 w-full lg:w-auto">
          <div className="relative flex-1 max-w-md">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8a99] text-sm" />
            <input
              type="text"
              placeholder="Search deals by title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer"
          >
            <option value="all">All Stages</option>
            {dealStages.map((s) => (
              <option key={s} value={s}>{stageLabels[s]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-roboto text-[#7a8a99]">{total} total deals</span>
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white rounded-xl border border-[#e8edf2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e8edf2]">
                <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider">Property</th>
                <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider">Value</th>
                <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider hidden md:table-cell">Commission</th>
                <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider">Stage</th>
                <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider hidden sm:table-cell">Date</th>
                <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8edf2]/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 md:px-5 py-3">
                      <div className="h-3.5 w-32 bg-[#f8fafc] rounded animate-pulse" />
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <div className="h-3.5 w-20 bg-[#f8fafc] rounded animate-pulse" />
                    </td>
                    <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                      <div className="h-3.5 w-16 bg-[#f8fafc] rounded animate-pulse" />
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <div className="h-5 w-20 bg-[#f8fafc] rounded animate-pulse" />
                    </td>
                    <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                      <div className="h-3 w-20 bg-[#f8fafc] rounded animate-pulse" />
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <div className="h-8 w-16 bg-[#f8fafc] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : deals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 md:px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-[#0d5959]/8 flex items-center justify-center">
                        <i className="ri-briefcase-3-line text-[#0d5959] text-xl" />
                      </div>
                      <p className="text-sm font-roboto text-[#7a8a99]">
                        {total === 0 ? 'No deals yet. Add your first deal.' : 'No deals match your filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                deals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-[#f8fafc]/60 transition-colors group">
                    <td className="px-4 md:px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#0d5959]/8 flex items-center justify-center flex-shrink-0">
                          <i className="ri-briefcase-3-line text-[#0d5959] text-sm" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-roboto text-[#001731] font-medium">{deal.title || 'Untitled Deal'}</p>
                          <p className="text-xs font-roboto text-[#7a8a99] line-clamp-1">{deal.notes || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <button
                        onClick={() => handleEditPrice(deal)}
                        className="text-sm font-roboto text-[#001731] font-medium hover:text-[#0d5959] transition-colors cursor-pointer"
                      >
                        {formatCurrency(deal.price)}
                      </button>
                    </td>
                    <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                      <span className="text-sm font-roboto text-[#0d5959] font-medium">{formatCurrency(deal.commission)}</span>
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <div className="relative">
                        <select
                          value={deal.status || 'prospect'}
                          onChange={(e) => handleStageChange(deal.id, e.target.value)}
                          disabled={updatingId === deal.id}
                          className={`text-xs font-roboto px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-1 focus:ring-[#0d5959]/20 ${stageColors[deal.status || 'prospect'] || 'bg-gray-100 text-gray-600'}`}
                        >
                          {dealStages.map((s) => (
                            <option key={s} value={s} className="bg-white text-gray-700">{stageLabels[s]}</option>
                          ))}
                        </select>
                        {updatingId === deal.id && (
                          <i className="ri-loader-4-line animate-spin text-[#0d5959] text-xs ml-1 inline-block" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                      <span className="text-xs font-roboto text-[#7a8a99]">
                        {new Date(deal.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleEditPrice(deal)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#0d5959]/8 text-[#7a8a99] hover:text-[#0d5959] transition-colors cursor-pointer"
                          title="Edit price"
                        >
                          <i className="ri-edit-line text-sm" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(deal.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#7a8a99] hover:text-red-600 transition-colors cursor-pointer"
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

      {/* Edit Price Modal */}
      {editDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditDeal(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-jost text-base text-[#001731] mb-4">Edit Deal Value</h3>
            <p className="text-sm font-roboto text-[#7a8a99] mb-4">{editDeal.title}</p>
            <div className="mb-4">
              <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Price (KES)</label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEditDeal(null)}
                className="flex-1 px-4 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto text-[#7a8a99] hover:bg-[#f8fafc] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrice}
                className="flex-1 px-4 py-2.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-sm font-roboto transition-all cursor-pointer"
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
    </div>
  );
}