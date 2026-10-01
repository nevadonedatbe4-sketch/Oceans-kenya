import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import JVProjects from '@/pages/crm/JVProjects';
import JVFaqs from '@/pages/crm/JVFaqs';
import JVOpportunities from '@/pages/crm/JVOpportunities';

interface JVSubmission {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  submission_type: 'landowner' | 'jv_proposal' | 'investor';
  land_location: string | null;
  land_size: string | null;
  title_status: string | null;
  preferred_structure: string | null;
  budget_range: string | null;
  preferred_location: string | null;
  preferred_use: string | null;
  timeline: string | null;
  message: string | null;
  status: 'new' | 'reviewed' | 'contacted' | 'archived';
  images: string[] | null;
  created_at: string;
}

type ActiveTab = 'listings' | 'submissions' | 'projects' | 'faqs';

const STATUS_OPTIONS = ['new', 'reviewed', 'contacted', 'archived'] as const;
const STATUS_LABELS: Record<string, string> = { new: 'New', reviewed: 'Reviewed', contacted: 'Contacted', archived: 'Archived' };
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-[#e8edf2] text-[#001731]',
  reviewed: 'bg-[#fff5e6] text-[#f58300]',
  contacted: 'bg-[#e6f4ea] text-[#088135]',
  archived: 'bg-[#f0f2f4] text-[#6b7684]',
};
const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  landowner: 'Land Listing',
  jv_proposal: 'JV Submission',
  investor: 'Capital Venture',
};

const TITLE_STATUS_LABELS: Record<string, string> = {
  freehold: 'Freehold', leasehold: 'Leasehold', mailo: 'Mailo',
  kibanja: 'Kibanja / Customary', in_process: 'In Process',
};
const STRUCTURE_LABELS: Record<string, string> = {
  revenue_share: 'JV — Revenue Share', equity_split: 'JV — Equity Split',
  lease_to_jv: 'Lease-to-JV', outright_sale: 'Outright Sale', advise: 'Not Sure — Advise',
};
const BUDGET_LABELS: Record<string, string> = {
  below_100m: 'Below 100M', '100m_500m': '100M – 500M', '500m_1b': '500M – 1B',
  '1b_5b': '1B – 5B', above_5b: 'Above 5B',
};
const USE_LABELS: Record<string, string> = {
  agriculture: 'Agriculture / Agri-processing', residential: 'Residential Estate',
  commercial: 'Commercial', mixed_use: 'Mixed-use', outright_purchase: 'Outright Purchase Only',
};
const TIMELINE_LABELS: Record<string, string> = {
  within_30_days: 'Within 30 Days', '1_3_months': '1–3 Months',
  '3_6_months': '3–6 Months', exploring: 'Exploring Options',
};

const tabBtnBase = 'px-5 py-2.5 rounded-none text-[15px] font-roboto transition-all cursor-pointer whitespace-nowrap';
const tabBtnInactive = 'bg-white text-[#6b7684] hover:text-[#001731] shadow-[inset_0_0_0_1px_#cdd5de]';
const tabBtnSelected = 'bg-[#001731] text-white font-semibold';

export default function JointVenturesCRM() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const tab = searchParams.get('tab');
    return tab === 'submissions' || tab === 'projects' || tab === 'faqs' ? tab : 'listings';
  });

  /* ── JV Submissions ── */
  const [submissions, setSubmissions] = useState<JVSubmission[]>([]);
  const [subLoading, setSubLoading] = useState(true);
  const [subError, setSubError] = useState('');
  const [subFilterType, setSubFilterType] = useState('all');
  const [subFilterStatus, setSubFilterStatus] = useState('all');
  const [subSearch, setSubSearch] = useState('');
  const [subPage, setSubPage] = useState(1);
  const [subPageSize] = useState(10);
  const [subTotal, setSubTotal] = useState(0);
  const [subStats, setSubStats] = useState({ total: 0, newCount: 0, landowner: 0, jvProposal: 0, investor: 0 });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    setSubLoading(true);
    setSubError('');
    try {
      let countQuery = supabase.from('jv_submissions').select('*', { count: 'exact', head: true });
      let dataQuery = supabase.from('jv_submissions').select('*').order('created_at', { ascending: false }).range((subPage - 1) * subPageSize, subPage * subPageSize - 1);

      if (subFilterType !== 'all') {
        countQuery = countQuery.eq('submission_type', subFilterType);
        dataQuery = dataQuery.eq('submission_type', subFilterType);
      }
      if (subFilterStatus !== 'all') {
        countQuery = countQuery.eq('status', subFilterStatus);
        dataQuery = dataQuery.eq('status', subFilterStatus);
      }
      if (subSearch.trim()) {
        const term = subSearch.trim();
        countQuery = countQuery.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
        dataQuery = dataQuery.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);
      if (error) throw error;
      setSubmissions((data || []) as JVSubmission[]);
      setSubTotal(count ?? 0);

      const { data: allSubs } = await supabase.from('jv_submissions').select('submission_type, status');
      const subs = allSubs || [];
      setSubStats({
        total: subs.length,
        newCount: subs.filter((s) => s.status === 'new').length,
        landowner: subs.filter((s) => s.submission_type === 'landowner').length,
        jvProposal: subs.filter((s) => s.submission_type === 'jv_proposal').length,
        investor: subs.filter((s) => s.submission_type === 'investor').length,
      });
    } catch (err: unknown) {
      setSubError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setSubLoading(false);
    }
  }, [subPage, subPageSize, subFilterType, subFilterStatus, subSearch]);

  useEffect(() => {
    if (activeTab === 'submissions') fetchSubmissions();
  }, [fetchSubmissions, activeTab]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from('jv_submissions').update({ status: newStatus }).eq('id', id);
    if (error) {
      addToast('Failed to update status', 'error');
    } else {
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status: newStatus as JVSubmission['status'] } : s)));
      addToast(`Submission marked as ${STATUS_LABELS[newStatus] || newStatus}`, 'success');
    }
    setUpdatingId(null);
  };

  // Explicitly promote a submission into a JV Land Listing (never silent).
  const handleConvert = async (sub: JVSubmission) => {
    setUpdatingId(sub.id);
    try {
      const { data, error } = await supabase
        .from('jv_opportunities')
        .insert({
          title: sub.full_name || 'Converted JV Opportunity',
          slug: `${(sub.full_name || 'jv-opportunity').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}-${sub.id.slice(0, 6)}`,
          status: 'new',
          is_published: false,
          is_public_listing: false,
          land_location: sub.land_location || null,
          land_size: sub.land_size || null,
          land_title_status: sub.title_status || null,
          deal_structure: sub.preferred_structure || null,
          expected_roi: null,
          revenue_share: null,
          partnership_requirements: sub.message || null,
          timeline: sub.timeline || null,
          source: 'converted_submission',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) throw error;
      addToast('Converted to a JV Land Listing (internal draft)', 'success');
      broadcastSync();
      navigate(`/admin/jv-opportunities/edit/${data?.id}`);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to convert submission', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const subStatCards = [
    { label: 'Total Briefs', value: subStats.total, icon: 'ri-file-list-3-line' },
    { label: 'New', value: subStats.newCount, icon: 'ri-mail-unread-line' },
    { label: 'Land Listings', value: subStats.landowner, icon: 'ri-landscape-line' },
    { label: 'JV Submissions', value: subStats.jvProposal, icon: 'ri-building-2-line' },
    { label: 'Capital Ventures', value: subStats.investor, icon: 'ri-funds-line' },
  ];

  const tabs: { key: ActiveTab; label: string; icon: string }[] = [
    { key: 'listings', label: 'JV Land Listings', icon: 'ri-landscape-line' },
    { key: 'submissions', label: 'JV Submissions', icon: 'ri-file-list-3-line' },
    { key: 'projects', label: 'Projects Seeking Partners', icon: 'ri-building-2-line' },
    { key: 'faqs', label: 'FAQs', icon: 'ri-question-answer-line' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div>
          <h1 className="font-jost text-xl font-semibold text-[#001731]">JV &amp; Capital Desk</h1>
          <p className="text-sm font-roboto text-[#6b7684] mt-0.5">
            JV land listings, submissions, partner projects and capital opportunities — managed in one place
          </p>
        </div>
      </div>

      {/* Rectangular tab switcher */}
      <div className="flex flex-wrap gap-1.5 bg-[#f2f4f6] p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`${tabBtnBase} ${activeTab === tab.key ? tabBtnSelected : tabBtnInactive}`}
          >
            <i className={`${tab.icon} mr-1.5 text-xs`} />
            {tab.label}
            {tab.key === 'submissions' && subStats.newCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded bg-[#001731] text-white text-[10px] font-bold">
                {subStats.newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* JV LAND LISTINGS (the primary JV Desk inventory) */}
      {activeTab === 'listings' && <JVOpportunities />}

      {/* JV SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {subStatCards.map((stat) => (
              <div key={stat.label} className="bg-[#e8edf2] border border-[#cdd5de] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-[#001731]/10 flex items-center justify-center">
                  <i className={`${stat.icon} text-[#001731] text-lg`} />
                </div>
                <div>
                  <p className="text-xl font-semibold text-[#001731]">{stat.value}</p>
                  <p className="text-xs text-[#001731]/70 font-roboto">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#e2e7ec] p-4 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
              <div className="relative flex-1 max-w-md w-full">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7684] text-sm" />
                <input
                  type="text"
                  placeholder="Search name, email or phone..."
                  value={subSearch}
                  onChange={(e) => { setSubSearch(e.target.value); setSubPage(1); }}
                  className="w-full pl-9 pr-4 py-2.5 border border-[#cdd5de] rounded-md text-sm font-roboto focus:outline-none focus:border-[#001731] focus:ring-1 focus:ring-[#001731]/20 bg-white"
                />
              </div>
              <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
                <select
                  value={subFilterType}
                  onChange={(e) => { setSubFilterType(e.target.value); setSubPage(1); }}
                  className="px-3 py-2.5 border border-[#cdd5de] rounded-md text-sm font-roboto focus:outline-none bg-white cursor-pointer text-[#001731]"
                >
                  <option value="all">All Types</option>
                  <option value="landowner">Land Listings</option>
                  <option value="jv_proposal">JV Submissions</option>
                  <option value="investor">Capital Ventures</option>
                </select>
                <select
                  value={subFilterStatus}
                  onChange={(e) => { setSubFilterStatus(e.target.value); setSubPage(1); }}
                  className="px-3 py-2.5 border border-[#cdd5de] rounded-md text-sm font-roboto focus:outline-none bg-white cursor-pointer text-[#001731]"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="contacted">Contacted</option>
                  <option value="archived">Archived</option>
                </select>
                <button
                  onClick={() => navigate('/admin/joint-ventures/new')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-none bg-[#001731] hover:bg-white hover:shadow-[inset_0_0_0_1px_#001731] hover:text-[#001731] text-white text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-add-line" />
                  New Submission
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[#6b7684] font-roboto">
              <span>{subTotal} submissions</span>
              <span>Page {subPage} of {Math.max(1, Math.ceil(subTotal / subPageSize))}</span>
            </div>
          </div>

          {subLoading && (
            <div className="bg-white border border-[#e2e7ec] p-8 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-start gap-4 pb-4 border-b border-[#e2e7ec] last:border-0 last:pb-0">
                  <div className="w-10 h-10 rounded-md bg-[#f2f4f6]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-[#f2f4f6] rounded" />
                    <div className="h-3 w-64 bg-[#f2f4f6] rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!subLoading && subError && (
            <div className="bg-white border border-[#e2e7ec] py-14 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-md bg-red-50 flex items-center justify-center">
                  <i className="ri-error-warning-line text-red-400 text-2xl" />
                </div>
                <p className="text-sm font-roboto text-[#6b7684]">{subError}</p>
                <button onClick={fetchSubmissions} className="inline-flex items-center gap-2 text-sm font-roboto text-[#001731] hover:underline cursor-pointer mt-1">
                  <i className="ri-refresh-line" /> Try Again
                </button>
              </div>
            </div>
          )}

          {!subLoading && !subError && submissions.length === 0 && (
            <div className="bg-white border border-[#e2e7ec] py-14 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-md bg-[#001731]/5 flex items-center justify-center">
                  <i className="ri-file-list-3-line text-[#001731] text-2xl" />
                </div>
                <p className="text-sm font-roboto text-[#6b7684]">
                  {subTotal === 0 ? 'No submissions yet. They\'ll appear here once land, JV and capital briefs come in — or add one manually.' : 'No submissions match your filters.'}
                </p>
              </div>
            </div>
          )}

          {!subLoading && !subError && submissions.length > 0 && (
            <div className="bg-white border border-[#e2e7ec] overflow-hidden">
              <div className="divide-y divide-[#cbd5e1]">
                {submissions.map((sub) => {
                  const isExpanded = expandedId === sub.id;
                  const isLandowner = sub.submission_type === 'landowner';
                  const isJV = sub.submission_type === 'jv_proposal';
                  return (
                    <div key={sub.id} className="hover:bg-[#f8f9fb]/60 transition-colors">
                      <div onClick={() => setExpandedId(isExpanded ? null : sub.id)} className="flex items-start gap-4 p-4 cursor-pointer">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#001731]/5 text-[#001731]">
                          <i className={isLandowner ? 'ri-landscape-line text-lg' : isJV ? 'ri-building-2-line text-lg' : 'ri-funds-line text-lg'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-jost text-sm font-semibold text-[#001731]">{sub.full_name || 'Unnamed'}</h4>
                            <span className="text-[10px] font-roboto px-2 py-0.5 rounded bg-[#e8edf2] text-[#001731]">{SUBMISSION_TYPE_LABELS[sub.submission_type]}</span>
                            <span className={`text-[10px] font-roboto px-2 py-0.5 rounded ${STATUS_COLORS[sub.status]}`}>{STATUS_LABELS[sub.status]}</span>
                          </div>
                          <p className="text-xs font-roboto text-[#6b7684] mt-1">
                            {sub.email && <><i className="ri-mail-line mr-1" />{sub.email}</>}
                            {sub.email && sub.phone && <span className="mx-1.5">·</span>}
                            {sub.phone && <><i className="ri-phone-line mr-1" />{sub.phone}</>}
                          </p>
                          {!isExpanded && (
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {isLandowner && (
                                <>
                                  {sub.land_location && <span className="text-[10px] font-roboto text-[#6b7684] bg-[#f2f4f6] px-2 py-0.5 rounded"><i className="ri-map-pin-line mr-0.5" />{sub.land_location}</span>}
                                  {sub.land_size && <span className="text-[10px] font-roboto text-[#6b7684] bg-[#f2f4f6] px-2 py-0.5 rounded"><i className="ri-ruler-line mr-0.5" />{sub.land_size}</span>}
                                  {sub.title_status && <span className="text-[10px] font-roboto text-[#6b7684] bg-[#f2f4f6] px-2 py-0.5 rounded">{TITLE_STATUS_LABELS[sub.title_status] || sub.title_status}</span>}
                                </>
                              )}
                              {isJV && (
                                <>
                                  {sub.land_location && <span className="text-[10px] font-roboto text-[#6b7684] bg-[#f2f4f6] px-2 py-0.5 rounded"><i className="ri-map-pin-line mr-0.5" />{sub.land_location}</span>}
                                  {sub.budget_range && <span className="text-[10px] font-roboto text-[#6b7684] bg-[#f2f4f6] px-2 py-0.5 rounded"><i className="ri-money-dollar-circle-line mr-0.5" />{BUDGET_LABELS[sub.budget_range] || sub.budget_range}</span>}
                                </>
                              )}
                              {!isLandowner && !isJV && (
                                <>
                                  {sub.budget_range && <span className="text-[10px] font-roboto text-[#6b7684] bg-[#f2f4f6] px-2 py-0.5 rounded"><i className="ri-money-dollar-circle-line mr-0.5" />{BUDGET_LABELS[sub.budget_range] || sub.budget_range}</span>}
                                  {sub.preferred_use && <span className="text-[10px] font-roboto text-[#6b7684] bg-[#f2f4f6] px-2 py-0.5 rounded">{USE_LABELS[sub.preferred_use] || sub.preferred_use}</span>}
                                  {sub.timeline && <span className="text-[10px] font-roboto text-[#6b7684] bg-[#f2f4f6] px-2 py-0.5 rounded"><i className="ri-timer-line mr-0.5" />{TIMELINE_LABELS[sub.timeline] || sub.timeline}</span>}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px] font-roboto text-[#6b7684]">{formatDate(sub.created_at)}</span>
                          <i className={`text-[#6b7684] transition-transform ${isExpanded ? 'ri-arrow-up-wide-fill' : 'ri-arrow-down-wide-fill'}`} />
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 pl-[72px]">
                          <div className="bg-[#f8f9fb] border border-[#e2e7ec] p-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className="text-[10px] text-[#6b7684] font-roboto uppercase tracking-wider mb-0.5">{isLandowner ? 'Land Location' : 'Project Location'}</p>
                                <p className="text-[#001731] font-roboto text-sm">{sub.land_location || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#6b7684] font-roboto uppercase tracking-wider mb-0.5">Size</p>
                                <p className="text-[#001731] font-roboto text-sm">{sub.land_size || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#6b7684] font-roboto uppercase tracking-wider mb-0.5">{isLandowner ? 'Preferred Structure' : 'JV Structure'}</p>
                                <p className="text-[#001731] font-roboto text-sm">{STRUCTURE_LABELS[sub.preferred_structure || ''] || sub.preferred_structure || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#6b7684] font-roboto uppercase tracking-wider mb-0.5">Budget Range</p>
                                <p className="text-[#001731] font-roboto text-sm">{BUDGET_LABELS[sub.budget_range || ''] || sub.budget_range || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#6b7684] font-roboto uppercase tracking-wider mb-0.5">Preferred Use</p>
                                <p className="text-[#001731] font-roboto text-sm">{USE_LABELS[sub.preferred_use || ''] || sub.preferred_use || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#6b7684] font-roboto uppercase tracking-wider mb-0.5">Timeline</p>
                                <p className="text-[#001731] font-roboto text-sm">{TIMELINE_LABELS[sub.timeline || ''] || sub.timeline || '—'}</p>
                              </div>
                            </div>

                            {sub.message && (
                              <div>
                                <p className="text-[10px] text-[#6b7684] font-roboto uppercase tracking-wider mb-1">
                                  {isLandowner ? 'About the Land' : isJV ? 'Project Description' : 'What They\'re Looking For'}
                                </p>
                                <p className="text-[#001731] font-roboto text-sm leading-relaxed whitespace-pre-wrap">{sub.message}</p>
                              </div>
                            )}

                            <div className="border-t border-[#e2e7ec]" />
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-[#6b7684] font-roboto mr-1">Status:</span>
                                {STATUS_OPTIONS.map((opt) => (
                                  <button
                                    key={opt}
                                    onClick={() => handleStatusUpdate(sub.id, opt)}
                                    disabled={updatingId === sub.id || sub.status === opt}
                                    className={`text-[10px] font-roboto px-2.5 py-1 rounded cursor-pointer transition-all whitespace-nowrap shadow-[inset_0_0_0_1px_#cdd5de] ${sub.status === opt ? STATUS_COLORS[opt] + ' font-semibold' : 'bg-white text-[#6b7684] hover:text-[#001731]'}`}
                                  >
                                    {STATUS_LABELS[opt]}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center flex-wrap gap-2 justify-end">
                                <button
                                  onClick={() => handleConvert(sub)}
                                  disabled={updatingId === sub.id}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-none text-[11px] font-roboto font-semibold text-[#001731] bg-[#e8edf2] hover:bg-[#001731] hover:text-white transition-all cursor-pointer whitespace-nowrap"
                                >
                                  <i className="ri-arrow-up-circle-line" />
                                  Convert to JV Listing
                                </button>
                              </div>
                              <span className="text-[10px] text-[#6b7684] font-roboto">
                                Submitted {formatDateTime(sub.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!subLoading && !subError && submissions.length > 0 && (
            <CRMPagination page={subPage} pageSize={subPageSize} total={subTotal} onPageChange={setSubPage} tone="light" />
          )}
        </>
      )}

      {/* PROJECTS SEEKING PARTNERS */}
      {activeTab === 'projects' && <JVProjects />}

      {/* FAQS */}
      {activeTab === 'faqs' && <JVFaqs />}
    </div>
  );
}