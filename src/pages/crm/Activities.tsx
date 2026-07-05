import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { addToast } from '@/pages/crm/components/CRMToast';
import CRMPagination from '@/pages/crm/components/CRMPagination';

interface ActivityLog {
  id: string;
  user_name: string;
  action: string;
  module: string;
  record_id: string | null;
  record_title: string | null;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const actionStyles: Record<string, string> = {
  created: 'bg-emerald-50 text-emerald-700',
  edited: 'bg-sky-50 text-sky-700',
  updated: 'bg-sky-50 text-sky-700',
  deleted: 'bg-red-50 text-red-700',
  published: 'bg-emerald-50 text-emerald-700',
  unpublished: 'bg-gray-100 text-gray-600',
  featured: 'bg-amber-50 text-amber-700',
  unfeatured: 'bg-gray-100 text-gray-600',
  assigned: 'bg-[#001731]/8 text-[#001731]',
  uploaded: 'bg-[#0d5959]/8 text-[#0d5959]',
};

const moduleIcons: Record<string, string> = {
  properties: 'ri-building-line',
  leads: 'ri-user-add-line',
  deals: 'ri-briefcase-3-line',
  agents: 'ri-user-line',
  media: 'ri-image-line',
  neighbourhoods: 'ri-map-pin-line',
};

export default function Activities() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    let countQuery = supabase.from('activity_logs').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (moduleFilter !== 'all') {
      countQuery = countQuery.eq('module', moduleFilter);
      dataQuery = dataQuery.eq('module', moduleFilter);
    }
    if (actionFilter !== 'all') {
      countQuery = countQuery.eq('action', actionFilter);
      dataQuery = dataQuery.eq('action', actionFilter);
    }
    if (search.trim()) {
      const term = search.trim();
      countQuery = countQuery.or(`user_name.ilike.%${term}%,record_title.ilike.%${term}%,action.ilike.%${term}%`);
      dataQuery = dataQuery.or(`user_name.ilike.%${term}%,record_title.ilike.%${term}%,action.ilike.%${term}%`);
    }
    if (dateRange !== 'all') {
      const now = new Date();
      let fromDate = new Date();
      if (dateRange === 'today') {
        fromDate.setHours(0, 0, 0, 0);
      } else if (dateRange === '7days') {
        fromDate.setDate(now.getDate() - 7);
      } else if (dateRange === '30days') {
        fromDate.setDate(now.getDate() - 30);
      } else if (dateRange === '90days') {
        fromDate.setDate(now.getDate() - 90);
      }
      countQuery = countQuery.gte('created_at', fromDate.toISOString());
      dataQuery = dataQuery.gte('created_at', fromDate.toISOString());
    }

    const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);

    if (error) {
      console.error('Error fetching activity logs:', error);
      addToast('Failed to load activity logs', 'error');
    } else {
      setLogs(data || []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, moduleFilter, actionFilter, search, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const modules = ['all', 'properties', 'leads', 'deals', 'agents', 'media', 'neighbourhoods'];
  const actions = ['all', 'created', 'edited', 'updated', 'deleted', 'published', 'unpublished', 'featured', 'unfeatured', 'assigned', 'uploaded'];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 w-full lg:w-auto flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8a99] text-sm" />
            <input
              type="text"
              placeholder="Search activity by user, action, title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white"
            />
          </div>
          <select
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer"
          >
            {modules.map((m) => (
              <option key={m} value={m} className="capitalize">{m === 'all' ? 'All Modules' : m}</option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer"
          >
            {actions.map((a) => (
              <option key={a} value={a} className="capitalize">{a === 'all' ? 'All Actions' : a}</option>
            ))}
          </select>
          <select
            value={dateRange}
            onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
        </div>
        <span className="text-xs font-roboto text-[#7a8a99]">{total} total activities</span>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-xl border border-[#e8edf2] overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 md:px-5 py-4 border-b border-[#e8edf2]/60 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#f8fafc] animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-48 bg-[#f8fafc] rounded animate-pulse" />
                  <div className="h-2.5 w-32 bg-[#f8fafc] rounded animate-pulse" />
                </div>
                <div className="h-3 w-20 bg-[#f8fafc] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 md:px-5 py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-[#0d5959]/8 flex items-center justify-center">
                <i className="ri-history-line text-[#0d5959] text-xl" />
              </div>
              <p className="text-sm font-roboto text-[#7a8a99]">
                {total === 0 ? 'No activity yet. Actions will be logged here.' : 'No activity matches your filters.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#e8edf2]/60">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id;
              return (
                <div key={log.id} className="group">
                  <div
                    className="px-4 md:px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-[#f8fafc]/60 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#0d5959]/8 flex items-center justify-center flex-shrink-0">
                      <i className={`${moduleIcons[log.module] || 'ri-question-line'} text-[#0d5959] text-sm`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-roboto text-[#001731] font-medium">
                          {log.user_name}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-roboto capitalize whitespace-nowrap ${actionStyles[log.action] || 'bg-gray-100 text-gray-600'}`}>
                          {log.action}
                        </span>
                        <span className="text-xs font-roboto text-[#7a8a99] capitalize">
                          {log.module}
                        </span>
                        {log.record_title && (
                          <span className="text-sm font-roboto text-[#001731] truncate max-w-[200px]">
                            {log.record_title}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-roboto text-[#7a8a99]">
                          {formatDate(log.created_at)}
                        </span>
                        {(log.before_value || log.after_value || log.metadata) && (
                          <i className={`ri-arrow-down-s-line text-[#7a8a99] text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded && (log.before_value || log.after_value || log.metadata) && (
                    <div className="px-4 md:px-5 pb-4 pl-16 md:pl-20">
                      <div className="bg-[#f8fafc] rounded-lg p-4 space-y-3">
                        {log.before_value && (
                          <div>
                            <p className="text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1">Before</p>
                            <pre className="text-xs font-roboto text-[#001731] bg-white rounded p-2 overflow-x-auto">
                              {JSON.stringify(log.before_value, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.after_value && (
                          <div>
                            <p className="text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1">After</p>
                            <pre className="text-xs font-roboto text-[#001731] bg-white rounded p-2 overflow-x-auto">
                              {JSON.stringify(log.after_value, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.metadata && (
                          <div>
                            <p className="text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1">Metadata</p>
                            <pre className="text-xs font-roboto text-[#001731] bg-white rounded p-2 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && logs.length > 0 && (
          <CRMPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}