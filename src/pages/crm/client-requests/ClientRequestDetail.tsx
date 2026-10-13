import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/authz';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useAgentDirectory } from '@/hooks/useClientRequests';
import { useClientRequest } from '@/hooks/useClientRequests';
import { updateMatch, saveRequest, logActivity, type ClientMatch } from '@/lib/clientRequestsApi';
import {
  statusMeta, priorityMeta, transactionLabel, categoryLabel, typeLabel, furnishingStateLabel,
  sourceLabel, REQUEST_STATUSES, CONTACT_METHODS, isOverdue,
} from '@/lib/clientRequests';
import MatchCard from '@/pages/crm/client-requests/components/MatchCard';
import MatchCompareModal from '@/pages/crm/client-requests/components/MatchCompareModal';
import ShareShortlistMenu from '@/pages/crm/client-requests/components/ShareShortlistMenu';
import RequestFormModal from '@/pages/crm/client-requests/components/RequestFormModal';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import { showToast } from '@/pages/crm/components/CRMToast';
import { REJECTION_REASONS } from '@/pages/crm/client-requests/constants';
import { format, relative } from '@/pages/crm/client-requests/format';

const FEEDBACK_OPTIONS = [
  { value: 'interested', label: 'Client interested' },
  { value: 'viewing_requested', label: 'Viewing requested' },
  { value: 'offer', label: 'Offer made' },
  { value: 'rejected', label: 'Client not interested' },
];

export default function ClientRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/agent') ? '/agent' : '/admin';
  const isAdmin = isAdminRole(user?.role);
  const { agentId } = useAgentProfile();
  const agents = useAgentDirectory();
  const agentName = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a.name])), [agents]);

  const { request, matches, activity, loading, computing, error, refresh, recompute, hardReset, patchMatch } = useClientRequest(id, { autoCompute: true });

  const [editOpen, setEditOpen] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<ClientMatch | null>(null);
  const [feedbackType, setFeedbackType] = useState('interested');
  const [feedbackText, setFeedbackText] = useState('');
  const [excludeTarget, setExcludeTarget] = useState<ClientMatch | null>(null);
  const [busy, setBusy] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState('price');
  const [showHardReset, setShowHardReset] = useState(false);

  const actor = { id: user?.id ?? null, name: user?.name || user?.email || 'User' };

  const visibleMatches = useMemo(() => {
    return matches
      .filter((m) => !m.excluded)
      .filter((m) => (shortlistOnly ? m.shortlisted : true))
      .filter((m) => (m.status === 'unavailable' ? true : m.match_score >= minScore))
      .sort((a, b) => {
        if (a.shortlisted !== b.shortlisted) return a.shortlisted ? -1 : 1;
        if (a.status === 'unavailable' && b.status !== 'unavailable') return 1;
        if (b.status === 'unavailable' && a.status !== 'unavailable') return -1;
        return b.match_score - a.match_score;
      });
  }, [matches, minScore, shortlistOnly]);

  const shortlistCount = matches.filter((m) => m.shortlisted && !m.excluded).length;
  const sharedCount = matches.filter((m) => m.shared_with_client).length;

  const compareSelected = useMemo(() => matches.filter((m) => compareIds.includes(m.id)), [matches, compareIds]);
  const toggleCompare = (m: ClientMatch) => setCompareIds((prev) => (
    prev.includes(m.id) ? prev.filter((x) => x !== m.id) : (prev.length >= 4 ? prev : [...prev, m.id])
  ));

  const guard = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    try { await fn(); showToast(okMsg, 'success'); await refresh(); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Action failed', 'error'); }
    finally { setBusy(false); }
  };

  // Soft, instant shortlist toggle: mark the card in place immediately and
  // persist quietly in the background — no page reload, no loading flash.
  const handleShortlist = async (m: ClientMatch) => {
    const next = !m.shortlisted;
    const nextStatus = next ? 'shortlisted' : 'suggested';
    patchMatch(m.id, { shortlisted: next, status: nextStatus });
    try {
      await updateMatch(m.id, { shortlisted: next, status: nextStatus });
      await logActivity(request!.id, next ? 'shortlisted' : 'unshortlisted', m.listing_title || '', undefined, actor);
    } catch (err) {
      patchMatch(m.id, { shortlisted: m.shortlisted, status: m.status });
      showToast(err instanceof Error ? err.message : 'Could not update shortlist', 'error');
    }
  };

  // Soft, instant "shared with client" mark: same in-place behaviour.
  const handleShare = async (m: ClientMatch) => {
    const sharedAt = new Date().toISOString();
    patchMatch(m.id, { shared_with_client: true, shared_at: sharedAt, status: 'shared' });
    try {
      await updateMatch(m.id, { shared_with_client: true, shared_at: sharedAt, status: 'shared' });
      await logActivity(request!.id, 'shared_with_client', `Marked “${m.listing_title}” as shared with the client`, undefined, actor);
      if (request!.status === 'new' || request!.status === 'matching') {
        await saveRequest({ status: 'shared' }, request!.id);
      }
    } catch (err) {
      patchMatch(m.id, { shared_with_client: m.shared_with_client, shared_at: m.shared_at, status: m.status });
      showToast(err instanceof Error ? err.message : 'Could not mark as shared', 'error');
    }
  };

  const submitFeedback = () => guard(async () => {
    if (!feedbackTarget) return;
    const rejected = feedbackType === 'rejected';
    await updateMatch(feedbackTarget.id, {
      client_feedback: feedbackText.trim() || FEEDBACK_OPTIONS.find((f) => f.value === feedbackType)?.label || 'Feedback recorded',
      client_feedback_at: new Date().toISOString(),
      status: feedbackType,
      rejection_reason: rejected ? feedbackReason : null,
    });
    const reasonSuffix = rejected ? ` (${REJECTION_REASONS.find((r) => r.value === feedbackReason)?.label || feedbackReason})` : '';
    await logActivity(request!.id, 'client_feedback', `${feedbackType.replace(/_/g, ' ')}${reasonSuffix} — ${feedbackTarget.listing_title}`, undefined, actor);
    if (feedbackType === 'viewing_requested') await saveRequest({ status: 'viewing' }, request!.id);
    setFeedbackTarget(null); setFeedbackText(''); setFeedbackType('interested'); setFeedbackReason('price');
  }, 'Client feedback recorded');

  const confirmExclude = () => guard(async () => {
    if (!excludeTarget) return;
    await updateMatch(excludeTarget.id, { excluded: true });
    await logActivity(request!.id, 'excluded', `Excluded “${excludeTarget.listing_title}” from this request`, undefined, actor);
    setExcludeTarget(null);
  }, 'Property excluded');

  const changeStatus = (status: string) => guard(async () => {
    await saveRequest({ status }, request!.id);
    await logActivity(request!.id, 'status_changed', `Status set to ${statusMeta(status).label}`, undefined, actor);
  }, 'Status updated');

  // Hard reset: wipe every stored match (shortlists, shares, feedback, exclusions)
  // and rebuild a completely fresh ranked set from the live inventory.
  const confirmHardReset = () => guard(async () => {
    await hardReset();
    await logActivity(request!.id, 'matches_reset', 'Matches hard-reset — shortlists cleared and rebuilt fresh from the live inventory', undefined, actor);
    setShowHardReset(false);
  }, 'Matches reset and rebuilt fresh');

  const changeAssignee = (agentValue: string) => guard(async () => {
    await saveRequest({ assigned_agent_id: agentValue || null }, request!.id);
    await logActivity(request!.id, 'reassigned', agentValue ? `Assigned to ${agentName[agentValue] || 'agent'}` : 'Unassigned', undefined, actor);
  }, 'Assignment updated');

  const saveFollowUp = (value: string) => guard(async () => {
    await saveRequest({ next_follow_up_at: value ? new Date(value).toISOString() : null }, request!.id);
    await logActivity(request!.id, 'follow_up', value ? `Follow-up scheduled` : 'Follow-up cleared', undefined, actor);
  }, 'Follow-up updated');

  if (loading) {
    return <div className="p-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-lg bg-stone-100 animate-pulse" />)}</div>;
  }
  if (error || !request) {
    return (
      <div className="p-10 text-center">
        <i className="ri-error-warning-line text-4xl text-red-500" />
        <p className="text-sm text-stone-600 mt-2">{error || 'Request not found.'}</p>
        <Link to={`${basePath}/client-requests`} className="inline-block mt-3 px-4 py-2 rounded-md bg-stone-800 text-white text-sm cursor-pointer">Back to list</Link>
      </div>
    );
  }

  const sm = statusMeta(request.status);
  const pm = priorityMeta(request.priority);
  const overdue = isOverdue(request.next_follow_up_at, request.status);

  return (
    <div className="space-y-5">
      <Link to={`${basePath}/client-requests`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#0f766e] cursor-pointer">
        <i className="ri-arrow-left-line" /> All client requests
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg border border-stone-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold text-stone-500">{request.reference || 'CR-—'}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.className}`}>{sm.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pm.className}`}>{pm.label} priority</span>
              {overdue && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue follow-up</span>}
            </div>
            <h1 className="font-semibold text-stone-900 mt-1.5">{request.title || 'Untitled request'}</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {request.client_name} · {transactionLabel(request.transaction_type)} {categoryLabel(request.property_category)}
              {(request.locations || []).length ? ` · ${request.locations!.join(', ')}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-50 cursor-pointer whitespace-nowrap">
              <i className="ri-edit-line" /> Edit
            </button>
            <button onClick={recompute} disabled={computing} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d5f59] disabled:opacity-60 cursor-pointer whitespace-nowrap">
              <i className={computing ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'} /> {computing ? 'Matching…' : 'Refresh matches'}
            </button>
            <button
              onClick={() => setShowHardReset(true)}
              disabled={computing}
              title="Clear all shortlists and rebuild every match fresh from the live inventory"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-restart-line" /> Hard refresh
            </button>
          </div>
        </div>

        {/* Status / assign / follow-up strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-stone-100">
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Status</label>
            <select value={request.status || 'new'} onChange={(e) => changeStatus(e.target.value)} disabled={busy} className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm cursor-pointer">
              {REQUEST_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Assigned agent</label>
            <select value={request.assigned_agent_id || ''} onChange={(e) => changeAssignee(e.target.value)} disabled={!isAdmin || busy} className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm cursor-pointer disabled:bg-stone-50">
              <option value="">— Unassigned —</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Next follow-up</label>
            <input
              type="datetime-local"
              defaultValue={request.next_follow_up_at ? request.next_follow_up_at.slice(0, 16) : ''}
              onBlur={(e) => { if (e.target.value !== (request.next_follow_up_at ? request.next_follow_up_at.slice(0, 16) : '')) saveFollowUp(e.target.value); }}
              className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Matches */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-stone-400">
              Matching properties
              <span className="ml-2 text-sm font-normal text-stone-400">{visibleMatches.length} shown · {shortlistCount} shortlisted · {sharedCount} shared</span>
            </h2>
            <ShareShortlistMenu request={request} matches={matches} />
          </div>

          {compareIds.length > 0 && (
            <div className="flex items-center justify-between gap-3 bg-[#001731] text-white rounded-lg px-4 py-2.5">
              <span className="text-sm font-medium">
                <i className="ri-checkbox-multiple-line mr-1.5" />
                {compareIds.length} selected for comparison{compareIds.length >= 4 ? ' (max 4)' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCompareIds([])}
                  className="text-xs font-medium text-white/70 hover:text-white cursor-pointer whitespace-nowrap"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowCompareModal(true)}
                  disabled={compareIds.length < 2}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-[#001731] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-layout-column-line" /> Compare {compareIds.length}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white rounded-lg border border-stone-200 p-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs font-semibold text-stone-500 whitespace-nowrap">Min score</label>
              <input type="range" min={0} max={100} step={10} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="flex-1 cursor-pointer" />
              <span className="text-sm font-semibold text-stone-700 w-8">{minScore}</span>
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={shortlistOnly} onChange={(e) => setShortlistOnly(e.target.checked)} />
              Shortlisted only
            </label>
          </div>

          {computing && visibleMatches.length === 0 ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-lg bg-stone-100 animate-pulse" />)}</div>
          ) : visibleMatches.length === 0 ? (
            <div className="bg-white rounded-lg border border-stone-200 p-8 text-center">
              <i className="ri-search-eye-line text-4xl text-stone-300" />
              <p className="text-sm text-stone-600 mt-2 font-medium">No eligible properties found for this request.</p>
              <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                Nothing in the current inventory satisfies the client’s mandatory requirements. Consider relaxing a hard
                requirement or widening the location — matches are only ever drawn from real, published listings.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleMatches.map((m) => (
                <MatchCard key={m.id} match={m} requestCurrency={request.currency} requestBudgetMax={request.budget_max} onShortlist={handleShortlist} onShare={handleShare} onFeedback={setFeedbackTarget} onExclude={setExcludeTarget} isCompared={compareIds.includes(m.id)} onToggleCompare={toggleCompare} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2"><i className="ri-user-line text-[#0f766e]" /> Client</h3>
            <div className="space-y-1.5 text-sm">
              <p className="font-medium text-stone-900">{request.client_name || '—'}</p>
              {request.client_phone && <p className="text-stone-600"><i className="ri-phone-line mr-1.5" />{request.client_phone}</p>}
              {request.client_email && <p className="text-stone-600 break-all"><i className="ri-mail-line mr-1.5" />{request.client_email}</p>}
              <p className="text-stone-600"><i className="ri-chat-3-line mr-1.5" />Prefers {CONTACT_METHODS.find((c) => c.value === request.preferred_contact_method)?.label || 'Phone'}</p>
              <p className="text-stone-500 text-xs pt-1">Source: {sourceLabel(request.source)}</p>
              {request.contact_id && <p className="text-xs text-[#0f766e]"><i className="ri-link mr-1" />Linked to CRM contact</p>}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2"><i className="ri-file-list-3-line text-[#0f766e]" /> Requirements</h3>
            <dl className="space-y-1.5 text-sm">
              <Row label="Transaction" value={transactionLabel(request.transaction_type)} />
              <Row label="Category" value={categoryLabel(request.property_category)} />
              {!!(request.property_subtypes?.length || request.property_subtype) && (
                <Row
                  label="Type(s)"
                  value={(request.property_subtypes?.length ? request.property_subtypes : [request.property_subtype as string])
                    .map((t) => typeLabel(t)).join(', ')}
                />
              )}
              <Row label="Locations" value={(request.locations || []).length ? request.locations!.join(', ') : 'Any'} />
              {request.allow_alternatives && (
                <Row label="Nearby" value={request.location_radius_km ? `Within ${request.location_radius_km} km` : 'Open to nearby areas'} />
              )}
              <Row label="Budget" value={request.budget_max ? `${request.currency || ''} ${Number(request.budget_max).toLocaleString()}` : '—'} />
              {request.bedrooms_min != null && <Row label="Bedrooms" value={`${request.bedrooms_min}+`} />}
              {request.bathrooms_min != null && <Row label="Bathrooms" value={`${request.bathrooms_min}+`} />}
              {(request.furnishing_options?.length ?? 0) > 0 ? (
                <Row label="Furnishing" value={request.furnishing_options!.map((f) => furnishingStateLabel(f)).join(', ')} />
              ) : request.furnishing && request.furnishing !== 'any' ? (
                <Row label="Furnishing" value={typeLabel(request.furnishing)} />
              ) : null}
              {request.move_in_flexible && <Row label="Move-in" value={request.move_in_flexible} />}
              {!request.move_in_flexible && request.move_in_date && <Row label="Move-in" value={format(request.move_in_date, false)} />}
            </dl>
            {!!request.preferred_amenities?.length && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-stone-500 mb-1.5">Preferred amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {request.preferred_amenities.map((a) => <span key={a} className="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{a}</span>)}
                </div>
              </div>
            )}
            {!!request.hard_criteria?.length && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-stone-500 mb-1.5">Mandatory (hard gates)</p>
                <div className="flex flex-wrap gap-1.5">
                  {request.hard_criteria.map((a) => <span key={a} className="text-[11px] bg-[#001731] text-white px-2 py-0.5 rounded-full capitalize">{a}</span>)}
                </div>
              </div>
            )}
            {request.additional_requirements && (
              <p className="text-xs text-stone-600 mt-3 leading-snug border-t border-stone-100 pt-3">{request.additional_requirements}</p>
            )}
            {request.internal_notes && (
              <div className="mt-3 pt-3 border-t border-stone-100">
                <p className="text-xs font-semibold text-stone-500 mb-1">Internal notes</p>
                <p className="text-xs text-stone-600 leading-snug">{request.internal_notes}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2"><i className="ri-history-line text-[#0f766e]" /> Activity</h3>
            {activity.length === 0 ? (
              <p className="text-xs text-stone-400">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#0f766e]/10 text-[#0f766e] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="ri-record-circle-line text-xs" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-stone-700 font-medium capitalize">{a.action.replace(/_/g, ' ')}</p>
                      {a.detail && <p className="text-xs text-stone-500 break-words">{a.detail}</p>}
                      <p className="text-[10px] text-stone-400 mt-0.5">{a.actor_name || 'System'} · {relative(a.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Feedback modal */}
      {feedbackTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001731]/70" onClick={() => setFeedbackTarget(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-md p-5">
            <h3 className="font-semibold text-stone-900">Record client feedback</h3>
            <p className="text-xs text-stone-500 mt-0.5 mb-3 truncate">{feedbackTarget.listing_title}</p>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Outcome</label>
            <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm mb-3">
              {FEEDBACK_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            {feedbackType === 'rejected' && (
              <>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Reason for rejection</label>
                <select value={feedbackReason} onChange={(e) => setFeedbackReason(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm mb-3">
                  {REJECTION_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </>
            )}
            <label className="block text-xs font-semibold text-stone-600 mb-1">Notes (max 500 chars)</label>
            <textarea rows={3} maxLength={500} value={feedbackText} onChange={(e) => setFeedbackText(e.target.value.slice(0, 500))} className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setFeedbackTarget(null)} className="px-4 py-2 rounded-md border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 cursor-pointer">Cancel</button>
              <button onClick={submitFeedback} disabled={busy} className="px-4 py-2 rounded-md bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d5f59] disabled:opacity-60 cursor-pointer">Save feedback</button>
            </div>
          </div>
        </div>
      )}

      {showCompareModal && compareSelected.length > 0 && (
        <MatchCompareModal
          matches={compareSelected}
          requestCurrency={request.currency}
          requestBudgetMax={request.budget_max}
          onClose={() => setShowCompareModal(false)}
          onRemove={(m) => setCompareIds((prev) => prev.filter((x) => x !== m.id))}
        />
      )}

      <ConfirmModal
        open={!!excludeTarget}
        title="Exclude this property?"
        message={`“${excludeTarget?.listing_title || ''}” will be removed from this request’s matches.`}
        confirmLabel="Exclude"
        onConfirm={confirmExclude}
        onCancel={() => setExcludeTarget(null)}
      />

      <ConfirmModal
        open={showHardReset}
        title="Hard refresh matches?"
        message="This clears every shortlist, share, exclusion and piece of client feedback on this request, then rebuilds the matches fresh from the live inventory. This cannot be undone."
        confirmLabel="Reset & rebuild"
        onConfirm={confirmHardReset}
        onCancel={() => setShowHardReset(false)}
      />

      <RequestFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => refresh()}
        initial={request}
        isAdmin={isAdmin}
        currentAgentId={agentId}
        currentUserId={user?.id ?? null}
        currentUserName={user?.name || user?.email || 'User'}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-stone-800 font-medium text-right">{value}</dd>
    </div>
  );
}