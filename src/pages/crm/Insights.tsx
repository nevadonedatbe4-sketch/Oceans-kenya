import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';

interface DateRange {
  label: string;
  from: string;
  to: string;
}

interface AnalyticsData {
  leadsOverTime: { date: string; count: number }[];
  dealsOverTime: { date: string; count: number }[];
  leadSources: { source: string; count: number }[];
  leadStages: { stage: string; count: number }[];
  propertyStatus: { status: string; count: number }[];
  propertyPurpose: { purpose: string; count: number }[];
  topProperties: { id: string; title: string; views: number }[];
  totalPipelineValue: number;
  dealsWon: number;
  dealsLost: number;
  totalProperties: number;
  forRentCount: number;
  forSaleCount: number;
  featuredCount: number;
  newListingsCount: number;
}

const dateRangeOptions: Record<string, DateRange> = {
  today: { label: 'Today', from: new Date().toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
  '7days': { label: '7 Days', from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
  '30days': { label: '30 Days', from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
  '90days': { label: '90 Days', from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
  'thisyear': { label: 'This Year', from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
  'all': { label: 'All Time', from: '2020-01-01', to: new Date().toISOString().split('T')[0] },
};

export default function Insights() {
  const [rangeKey, setRangeKey] = useState('30days');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const getRange = useCallback((): DateRange => {
    if (isCustom && customFrom && customTo) {
      return { label: 'Custom', from: customFrom, to: customTo };
    }
    return dateRangeOptions[rangeKey];
  }, [isCustom, customFrom, customTo, rangeKey]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const range = getRange();

    try {
      // Leads over time
      const { data: leadsData } = await supabase
        .from('leads')
        .select('created_at')
        .gte('created_at', `${range.from}T00:00:00`)
        .lte('created_at', `${range.to}T23:59:59`)
        .order('created_at', { ascending: true });

      // Deals over time
      const { data: dealsData } = await supabase
        .from('deals')
        .select('created_at, status')
        .gte('created_at', `${range.from}T00:00:00`)
        .lte('created_at', `${range.to}T23:59:59`)
        .order('created_at', { ascending: true });

      // Lead sources
      const { data: sourcesData } = await supabase
        .from('leads')
        .select('source')
        .gte('created_at', `${range.from}T00:00:00`)
        .lte('created_at', `${range.to}T23:59:59`);

      // Lead stages
      const { data: stagesData } = await supabase
        .from('leads')
        .select('status');

      // Property status
      const { data: propStatusData } = await supabase
        .from('listings')
        .select('status');

      // Property purpose
      const { data: propPurposeData } = await supabase
        .from('listings')
        .select('status');

      // Counts
      const { count: totalProperties } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true });
      const { count: forRentCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'for_rent');
      const { count: forSaleCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'for_sale');
      const { count: newListingsCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${range.from}T00:00:00`)
        .lte('created_at', `${range.to}T23:59:59`);
      const { count: dealsWon } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'closed_won');
      const { count: dealsLost } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'closed_lost');

      // Pipeline value
      const { data: pipelineData } = await supabase
        .from('deals')
        .select('price')
        .in('status', ['prospect', 'negotiation', 'offer', 'due_diligence']);
      const totalPipelineValue = (pipelineData || []).reduce((sum, d) => sum + (Number(d.price) || 0), 0);

      // Top properties (by view count from analytics_events)
      const { data: topProps } = await supabase
        .from('analytics_events')
        .select('property_id, listing_id')
        .eq('event_type', 'property_view')
        .gte('created_at', `${range.from}T00:00:00`)
        .lte('created_at', `${range.to}T23:59:59`);

      const viewCounts = new Map<string, number>();
      (topProps || []).forEach((e) => {
        const id = e.property_id || e.listing_id;
        if (id) viewCounts.set(id, (viewCounts.get(id) || 0) + 1);
      });

      let topProperties: { id: string; title: string; views: number }[] = [];
      if (viewCounts.size > 0) {
        const sortedIds = Array.from(viewCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const { data: listingsData } = await supabase
          .from('listings')
          .select('id, title')
          .in('id', sortedIds.map((s) => s[0]));
        const titleMap = new Map((listingsData || []).map((l) => [l.id, l.title]));
        topProperties = sortedIds.map(([id, views]) => ({
          id,
          title: titleMap.get(id) || 'Unknown',
          views,
        }));
      }

      // Aggregate leads over time
      const leadsMap = new Map<string, number>();
      (leadsData || []).forEach((l) => {
        const d = l.created_at.split('T')[0];
        leadsMap.set(d, (leadsMap.get(d) || 0) + 1);
      });
      const leadsOverTime = Array.from(leadsMap.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

      // Aggregate deals over time
      const dealsMap = new Map<string, number>();
      (dealsData || []).forEach((d) => {
        const date = d.created_at.split('T')[0];
        dealsMap.set(date, (dealsMap.get(date) || 0) + 1);
      });
      const dealsOverTime = Array.from(dealsMap.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

      // Lead sources
      const sourceMap = new Map<string, number>();
      (sourcesData || []).forEach((s) => {
        const src = s.source || 'Unknown';
        sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
      });
      const leadSources = Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);

      // Lead stages
      const stageMap = new Map<string, number>();
      (stagesData || []).forEach((s) => {
        stageMap.set(s.status, (stageMap.get(s.status) || 0) + 1);
      });
      const leadStages = Array.from(stageMap.entries()).map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count);

      // Property status
      const statusMap = new Map<string, number>();
      (propStatusData || []).forEach((s) => {
        statusMap.set(s.status, (statusMap.get(s.status) || 0) + 1);
      });
      const propertyStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);

      // Property purpose (treat status as purpose for now)
      const purposeMap = new Map<string, number>();
      (propPurposeData || []).forEach((s) => {
        const purpose = s.status === 'for_sale' ? 'For Sale' : s.status === 'for_rent' ? 'For Rent' : s.status === 'sold' ? 'Sold' : s.status === 'rented' ? 'Rented' : 'Other';
        purposeMap.set(purpose, (purposeMap.get(purpose) || 0) + 1);
      });
      const propertyPurpose = Array.from(purposeMap.entries()).map(([purpose, count]) => ({ purpose, count })).sort((a, b) => b.count - a.count);

      setData({
        leadsOverTime,
        dealsOverTime,
        leadSources,
        leadStages,
        propertyStatus,
        propertyPurpose,
        topProperties,
        totalPipelineValue,
        dealsWon: dealsWon || 0,
        dealsLost: dealsLost || 0,
        totalProperties: totalProperties || 0,
        forRentCount: forRentCount || 0,
        forSaleCount: forSaleCount || 0,
        featuredCount: 0, // not in schema
        newListingsCount: newListingsCount || 0,
      });
    } catch (err) {
      console.error('Analytics error:', err);
      addToast('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, [getRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (val: number) => {
    if (val >= 1000000000) return `KSh ${(val / 1000000000).toFixed(1)}B`;
    if (val >= 1000000) return `KSh ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `KSh ${(val / 1000).toFixed(0)}K`;
    return `KSh ${val}`;
  };

  const maxBarValue = (items: { count: number }[]) => Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="space-y-6">
      {/* Date Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(dateRangeOptions).map(([key, range]) => (
            <button
              key={key}
              onClick={() => { setRangeKey(key); setIsCustom(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-roboto transition-all cursor-pointer whitespace-nowrap ${
                !isCustom && rangeKey === key
                  ? 'bg-[#0d5959] text-white'
                  : 'bg-white border border-[#e8edf2] text-[#7a8a99] hover:text-[#001731]'
              }`}
            >
              {range.label}
            </button>
          ))}
          <button
            onClick={() => setIsCustom(!isCustom)}
            className={`px-3 py-1.5 rounded-full text-xs font-roboto transition-all cursor-pointer whitespace-nowrap ${
              isCustom
                ? 'bg-[#0d5959] text-white'
                : 'bg-white border border-[#e8edf2] text-[#7a8a99] hover:text-[#001731]'
            }`}
          >
            Custom
          </button>
        </div>
        {isCustom && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => { setCustomFrom(e.target.value); setRangeKey('custom'); }}
              className="px-3 py-1.5 border border-[#e8edf2] rounded-lg text-xs font-roboto focus:outline-none focus:border-[#0d5959]"
            />
            <span className="text-xs font-roboto text-[#7a8a99]">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => { setCustomTo(e.target.value); setRangeKey('custom'); }}
              className="px-3 py-1.5 border border-[#e8edf2] rounded-lg text-xs font-roboto focus:outline-none focus:border-[#0d5959]"
            />
            <button
              onClick={() => fetchAnalytics()}
              className="px-3 py-1.5 bg-[#0d5959] text-white rounded-lg text-xs font-roboto cursor-pointer whitespace-nowrap"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#e8edf2] p-5">
              <div className="h-3 w-24 bg-[#f8fafc] rounded animate-pulse mb-2" />
              <div className="h-7 w-16 bg-[#f8fafc] rounded animate-pulse" />
            </div>
          ))
        ) : data ? (
          <>
            <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden p-5">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0d5959]" />
              <p className="text-xs font-roboto text-[#7a8a99] uppercase tracking-wider">New Leads</p>
              <p className="text-2xl font-roboto font-bold text-[#001731] mt-1">{data.leadsOverTime.reduce((sum, l) => sum + l.count, 0)}</p>
              <p className="text-xs font-roboto text-[#7a8a99] mt-1">In selected period</p>
            </div>
            <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden p-5">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#001731]" />
              <p className="text-xs font-roboto text-[#7a8a99] uppercase tracking-wider">Pipeline Value</p>
              <p className="text-2xl font-roboto font-bold text-[#001731] mt-1">{formatCurrency(data.totalPipelineValue)}</p>
              <p className="text-xs font-roboto text-[#7a8a99] mt-1">Active deals</p>
            </div>
            <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden p-5">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0d5959]" />
              <p className="text-xs font-roboto text-[#7a8a99] uppercase tracking-wider">New Listings</p>
              <p className="text-2xl font-roboto font-bold text-[#001731] mt-1">{data.newListingsCount}</p>
              <p className="text-xs font-roboto text-[#7a8a99] mt-1">In selected period</p>
            </div>
            <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden p-5">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#001731]" />
              <p className="text-xs font-roboto text-[#7a8a99] uppercase tracking-wider">Win / Loss</p>
              <p className="text-2xl font-roboto font-bold text-[#001731] mt-1">{data.dealsWon} / {data.dealsLost}</p>
              <p className="text-xs font-roboto text-[#7a8a99] mt-1">All time</p>
            </div>
          </>
        ) : null}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Lead Sources */}
        <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden p-5">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0d5959]" />
          <h3 className="font-jost text-sm font-medium text-[#001731] mb-4">Lead Sources</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2 w-20 bg-[#f8fafc] rounded animate-pulse" />
                  <div className="h-2 flex-1 bg-[#f8fafc] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : data?.leadSources.length === 0 ? (
            <p className="text-sm font-roboto text-[#7a8a99]">No lead source data</p>
          ) : (
            <div className="space-y-3">
              {data?.leadSources.map((s) => {
                const max = maxBarValue(data.leadSources);
                const pct = (s.count / max) * 100;
                return (
                  <div key={s.source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-roboto text-[#001731] capitalize">{s.source}</span>
                      <span className="text-xs font-roboto text-[#7a8a99]">{s.count}</span>
                    </div>
                    <div className="h-2 w-full bg-[#f8fafc] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#0d5959] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lead Stages */}
        <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden p-5">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#001731]" />
          <h3 className="font-jost text-sm font-medium text-[#001731] mb-4">Lead Stages</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2 w-20 bg-[#f8fafc] rounded animate-pulse" />
                  <div className="h-2 flex-1 bg-[#f8fafc] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : data?.leadStages.length === 0 ? (
            <p className="text-sm font-roboto text-[#7a8a99]">No lead stage data</p>
          ) : (
            <div className="space-y-3">
              {data?.leadStages.map((s) => {
                const max = maxBarValue(data.leadStages);
                const pct = (s.count / max) * 100;
                return (
                  <div key={s.stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-roboto text-[#001731] capitalize">{s.stage}</span>
                      <span className="text-xs font-roboto text-[#7a8a99]">{s.count}</span>
                    </div>
                    <div className="h-2 w-full bg-[#f8fafc] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#001731] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Property Status */}
        <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden p-5">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0d5959]" />
          <h3 className="font-jost text-sm font-medium text-[#001731] mb-4">Property Status</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2 w-20 bg-[#f8fafc] rounded animate-pulse" />
                  <div className="h-2 flex-1 bg-[#f8fafc] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : data?.propertyStatus.length === 0 ? (
            <p className="text-sm font-roboto text-[#7a8a99]">No property data</p>
          ) : (
            <div className="space-y-3">
              {data?.propertyStatus.map((s) => {
                const max = maxBarValue(data.propertyStatus);
                const pct = (s.count / max) * 100;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-roboto text-[#001731] capitalize">{s.status.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-roboto text-[#7a8a99]">{s.count}</span>
                    </div>
                    <div className="h-2 w-full bg-[#f8fafc] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#0d5959] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Property Purpose */}
        <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden p-5">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#001731]" />
          <h3 className="font-jost text-sm font-medium text-[#001731] mb-4">Property Purpose</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2 w-20 bg-[#f8fafc] rounded animate-pulse" />
                  <div className="h-2 flex-1 bg-[#f8fafc] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : data?.propertyPurpose.length === 0 ? (
            <p className="text-sm font-roboto text-[#7a8a99]">No property data</p>
          ) : (
            <div className="space-y-3">
              {data?.propertyPurpose.map((s) => {
                const max = maxBarValue(data.propertyPurpose);
                const pct = (s.count / max) * 100;
                return (
                  <div key={s.purpose}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-roboto text-[#001731]">{s.purpose}</span>
                      <span className="text-xs font-roboto text-[#7a8a99]">{s.count}</span>
                    </div>
                    <div className="h-2 w-full bg-[#f8fafc] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#001731] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Properties */}
      <div className="relative bg-white rounded-xl border border-[#e8edf2] overflow-hidden p-5">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0d5959]" />
        <h3 className="font-jost text-sm font-medium text-[#001731] mb-4">Top Properties by Views</h3>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-2 w-40 bg-[#f8fafc] rounded animate-pulse" />
                <div className="h-2 flex-1 bg-[#f8fafc] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : data?.topProperties.length === 0 ? (
          <p className="text-sm font-roboto text-[#7a8a99]">No property view data yet. Views will be tracked from analytics events.</p>
        ) : (
          <div className="space-y-3">
            {data?.topProperties.map((p) => {
              const max = Math.max(...data.topProperties.map((tp) => tp.views), 1);
              const pct = (p.views / max) * 100;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-roboto text-[#001731]">{p.title}</span>
                    <span className="text-xs font-roboto text-[#7a8a99]">{p.views} views</span>
                  </div>
                  <div className="h-2 w-full bg-[#f8fafc] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#0d5959] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}