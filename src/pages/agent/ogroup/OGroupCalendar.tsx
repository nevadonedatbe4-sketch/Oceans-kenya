import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCalendar, type CalendarDraft } from './useCalendar';
import { useAuth } from '@/hooks/useAuth';
import { fetchStaffDirectory, type StaffRow } from './staffDirectory';
import { agentColor } from './agentColors';
import {
  type CalendarAppointment, type CalendarView, type CalendarScope, type AppointmentStatus,
  type AppointmentKind, type CalendarFilters,
  startOfDay, endOfDay, addDays, startOfWeek, addMonths,
  fmtTime, KIND_LABELS, KIND_COLOR, STATUS_LABELS, STATUS_COLOR,
  EMPTY_FILTERS, filtersActive, CALENDAR_VIEWS,
} from './calendarTypes';
import type { RecurringEditScope } from './recurrence';
import AppointmentForm from './components/AppointmentForm';
import AppointmentTypeStep from './components/AppointmentTypeStep';
import AppointmentDetailDrawer from './components/AppointmentDetailDrawer';
import AvailabilityEditor from './components/AvailabilityEditor';
import CalendarFilterPanel from './components/CalendarFilterPanel';
import CompanyScheduleGrid from './components/CompanyScheduleGrid';
import { MonthView, MultiDayView, DayView, AgendaView, EmptyState } from './components/CalendarViews';

type CompanyMode = 'calendar' | 'schedule';

function rangeFor(a: Date, v: CalendarView): [Date, Date] {
  if (v === 'day') return [startOfDay(a), endOfDay(a)];
  if (v === '3day') return [startOfDay(a), addDays(startOfDay(a), 3)];
  if (v === 'week') { const s = startOfWeek(a); return [s, addDays(s, 7)]; }
  if (v === 'month') { const s = new Date(a.getFullYear(), a.getMonth(), 1); return [s, addMonths(s, 1)]; }
  return [startOfDay(a), addDays(startOfDay(a), 30)]; // agenda
}

export default function OGroupCalendar() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<CalendarView>('week');
  const [scope, setScope] = useState<CalendarScope>(() => (searchParams.get('scope') === 'company' ? 'company' : 'my'));
  const [companyMode, setCompanyMode] = useState<CompanyMode>(() => (searchParams.get('mode') === 'schedule' ? 'schedule' : 'calendar'));
  const [anchor, setAnchor] = useState(new Date());
  const [tab, setTab] = useState<'calendar' | 'availability'>(() => (searchParams.get('tab') === 'availability' ? 'availability' : 'calendar'));
  const [filters, setFilters] = useState<CalendarFilters>({ ...EMPTY_FILTERS });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; existing?: CalendarAppointment | null; start?: Date; assignee?: string; kind?: AppointmentKind }>({ open: false });
  const [typeStep, setTypeStep] = useState<{ open: boolean; start?: Date; assignee?: string }>({ open: false });
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [roster, setRoster] = useState<StaffRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CalendarAppointment[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;

  const {
    appointments, availability, timeOff, loading, canManageCompany, companyAccessChecked, emailNotice, clearEmailNotice,
    loadRanges, loadCompanyRange, serverSearch, findConflicts, isWithinWorkingHours,
    createAppointment, updateAppointment, updateAppointmentScoped, reschedule,
    setStatus, setOutcome, respondToInvite,
    saveAvailability, addTimeOff, removeTimeOff,
  } = useCalendar();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  // Surface a non-fatal email delivery notice after the appointment already saved.
  useEffect(() => {
    if (emailNotice) { showToast(emailNotice); clearEmailNotice(); }
  }, [emailNotice]);

  useEffect(() => {
    let active = true;
    void fetchStaffDirectory().then((r) => { if (active) setRoster(r); }).catch(() => { if (active) setRoster([]); });
    return () => { active = false; };
  }, []);

  // A user without the company-calendar permission always stays on My Calendar.
  useEffect(() => {
    if (!companyAccessChecked) return;
    if (!canManageCompany && scope === 'company') setScope('my');
  }, [canManageCompany, scope, companyAccessChecked]);

  // The Schedule (working schedule & availability) tab is URL-addressable so the
  // sidebar can deep-link straight into it.
  useEffect(() => {
    setTab(searchParams.get('tab') === 'availability' ? 'availability' : 'calendar');
  }, [searchParams]);

  const scopedFilters = useMemo<CalendarFilters>(() => (
    scope === 'my'
      ? { ...filters, agentId: user?.id || 'all' }
      : filters
  ), [filters, scope, user?.id]);

  // The Schedule grid only needs the anchor day; otherwise follow the view.
  const loadingView: CalendarView = scope === 'company' && companyMode === 'schedule' ? 'day' : view;

  useEffect(() => {
    if (tab !== 'calendar') return;
    const [s, e] = rangeFor(anchor, loadingView);
    if (scope === 'company') void loadCompanyRange(s, e);
    else void loadRanges(s, e, scopedFilters);
  }, [view, loadingView, anchor, tab, scope, scopedFilters, loadRanges, loadCompanyRange]);

  // Debounced server-side search.
  useEffect(() => {
    if (searchTerm.trim().length < 2) { setSearchResults([]); return; }
    let active = true;
    const t = window.setTimeout(async () => {
      const rows = await serverSearch(searchTerm);
      if (active) setSearchResults(rows);
    }, 300);
    return () => { active = false; window.clearTimeout(t); };
  }, [searchTerm, serverSearch]);

  const nav = (dir: number) => {
    const a = new Date(anchorRef.current);
    if (loadingView === 'day') setAnchor(addDays(a, dir));
    else if (loadingView === '3day') setAnchor(addDays(a, dir * 3));
    else if (loadingView === 'week') setAnchor(addDays(a, dir * 7));
    else if (loadingView === 'agenda') setAnchor(addDays(a, dir * 30));
    else setAnchor(addMonths(a, dir));
  };

  const goToday = () => setAnchor(new Date());

  const [rangeStart, rangeEnd] = rangeFor(anchor, loadingView);

  const days = useMemo(() => {
    const [s, e] = rangeFor(anchor, loadingView);
    const count = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
    return Array.from({ length: count }, (_, i) => addDays(s, i));
  }, [anchor, loadingView]);

  const monthCells = useMemo(() => {
    const first = startOfDay(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    const lead = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => addDays(first, i - lead));
  }, [anchor]);

  const refreshRange = () => {
    const [s, e] = rangeFor(anchorRef.current, loadingView);
    if (scope === 'company') void loadCompanyRange(s, e);
    else void loadRanges(s, e, scopedFilters);
  };

  const nameOf = (id: string | null) => (id && id === user?.id ? 'You' : roster.find((r) => r.user_id === id)?.name || 'Team member');

  const openResult = (a: CalendarAppointment) => {
    setAnchor(new Date(a.starts_at));
    setSelected(a);
    setSearchOpen(false);
    setSearchTerm('');
  };

  const save = async (draft: CalendarDraft, sc?: RecurringEditScope) => {
    if (draft.id) {
      if (sc) await updateAppointmentScoped(draft.id, draft, sc);
      else await updateAppointment(draft.id, draft);
    } else {
      await createAppointment(draft);
    }
  };

  const canMove = (a: CalendarAppointment) => !a.masked && (scope === 'my' || a.assigned_user_id === user?.id || a.created_by === user?.id);

  const dropAt = async (day: Date, hour?: number) => {
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    const old = new Date(appt.starts_at);
    const next = new Date(day);
    next.setHours(hour ?? old.getHours(), hour != null ? 0 : old.getMinutes(), 0, 0);
    if (next.toISOString() === appt.starts_at) return;
    setBusyAction(id);
    try {
      await reschedule(id, next.toISOString());
      showToast('Appointment rescheduled.');
      refreshRange();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleStatus = async (a: CalendarAppointment, status: AppointmentStatus, reason?: string) => {
    setBusyAction(a.id);
    try {
      await setStatus(a.id, status, reason);
      setSelected((prev) => (prev && prev.id === a.id ? { ...prev, status } : prev));
      showToast(status === 'confirmed' ? 'Appointment confirmed.' : status === 'completed' ? 'Marked complete.' : status === 'cancelled' ? 'Appointment cancelled.' : 'Status updated.');
    } catch (e) {
      showToast((e as Error).message);
    } finally { setBusyAction(null); }
  };

  const handleOutcome = async (a: CalendarAppointment, outcome: string) => {
    setBusyAction(a.id);
    try {
      await setOutcome(a.id, outcome);
      setSelected((prev) => (prev && prev.id === a.id ? { ...prev, outcome } as CalendarAppointment : prev));
      showToast('Outcome recorded.');
    } finally { setBusyAction(null); }
  };

  const respond = async (a: CalendarAppointment, resp: 'accepted' | 'declined') => {
    setBusyAction(a.id);
    try { await respondToInvite(a.id, resp); showToast(resp === 'accepted' ? 'Invite accepted.' : 'Invite declined.'); }
    finally { setBusyAction(null); }
  };

  const rangeLabel = () => {
    if (loadingView === 'day') return anchor.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    if (loadingView === 'agenda') return `Next 30 days from ${anchor.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    if (loadingView === '3day') {
      const e = addDays(anchor, 2);
      return `${anchor.getDate()} ${anchor.toLocaleDateString('en-GB', { month: 'short' })} – ${e.getDate()} ${e.toLocaleDateString('en-GB', { month: 'short' })}, ${e.getFullYear()}`;
    }
    if (loadingView === 'week') {
      const s = startOfWeek(anchor); const e = addDays(s, 6);
      return `${s.getDate()} ${s.toLocaleDateString('en-GB', { month: 'short' })} – ${e.getDate()} ${e.toLocaleDateString('en-GB', { month: 'short' })}, ${e.getFullYear()}`;
    }
    return anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  const openEdit = (a: CalendarAppointment) => setModal({ open: true, existing: a });
  const openDuplicate = (a: CalendarAppointment) => setModal({
    open: true,
    existing: { ...a, id: '', title: `${a.title} (copy)`, recurrence_rule: null, recurrence_parent_id: null, status: 'scheduled', attendees: [] },
  });

  const openSlot = (agentId: string, day: Date, hour: number) => {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    setTypeStep({ open: true, start, assignee: agentId });
  };

  // The type chooser runs BEFORE the form so it can shape the fields and routing.
  const continueNew = (kind: AppointmentKind, assigneeId?: string) => {
    setModal({ open: true, start: typeStep.start, kind, assignee: assigneeId || typeStep.assignee });
    setTypeStep({ open: false });
  };

  const viewProps = {
    events: appointments,
    current: anchor,
    onSelect: setSelected,
    onDayClick: (d: Date) => { setAnchor(d); setView('day'); },
    dragId,
    onDragStart: (a: CalendarAppointment) => { if (canMove(a)) setDragId(a.id); },
    onDragEnd: () => setDragId(null),
    onDropDay: (d: Date) => void dropAt(d),
    onDropHour: (d: Date, h: number) => void dropAt(d, h),
    getAgentColor: (id: string | null) => agentColor(id),
    getAgentName: nameOf,
  };

  const agentPicks = roster.map((r) => ({ user_id: r.user_id, name: r.name || 'Agent', avatar: r.avatar_url }));
  const showSchedule = scope === 'company' && companyMode === 'schedule';

  // Direct navigation to the Company Calendar without the permission → refuse it
  // (the DB already refuses the data; this mirrors that in the UI).
  if (companyAccessChecked && searchParams.get('scope') === 'company' && !canManageCompany) {
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-neutral-100 p-10 text-center max-w-lg mx-auto mt-10">
          <span className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <i className="ri-lock-2-line text-2xl" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-neutral-800">Access restricted</h2>
          <p className="mt-1.5 text-sm text-neutral-500">
            Your account has access to your own calendar only. Company-wide scheduling is limited to Admins and authorised Appointment Setters.
          </p>
          <Link to="/agent/calendar" className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 cursor-pointer whitespace-nowrap">
            <i className="ri-calendar-line" />Go to My Calendar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-neutral-400">Calendar</h1>
          <p className="text-sm text-neutral-400/80 mt-0.5">
            {scope === 'my' ? 'Your personal working calendar' : 'The organisation-wide calendar'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tab === 'calendar' && (
            <button onClick={() => setTypeStep({ open: true })} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 cursor-pointer whitespace-nowrap">
              <i className="ri-add-line mr-1" />New appointment
            </button>
          )}
          <div className="flex gap-1.5">
            <button onClick={() => setTab('calendar')} className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap ${tab === 'calendar' ? 'bg-neutral-800 text-white' : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'}`}>My Calendar</button>
            <button onClick={() => setTab('availability')} className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap ${tab === 'availability' ? 'bg-neutral-800 text-white' : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'}`}>Schedule</button>
          </div>
        </div>
      </div>

      {tab === 'availability' ? (
        <AvailabilityEditor availability={availability} timeOff={timeOff} onSaveAvailability={saveAvailability} onAddTimeOff={addTimeOff} onRemoveTimeOff={removeTimeOff} />
      ) : (
        <>
          {/* Control bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-0.5 bg-neutral-50 rounded-full p-1">
                <button onClick={() => setScope('my')} className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap ${scope === 'my' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>My calendar</button>
                {canManageCompany && (
                  <button onClick={() => setScope('company')} className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap ${scope === 'company' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>Company calendar</button>
                )}
              </div>
              {scope === 'company' && (
                <div className="flex gap-0.5 bg-neutral-50 rounded-full p-1">
                  {(['calendar', 'schedule'] as CompanyMode[]).map((m) => (
                    <button key={m} onClick={() => setCompanyMode(m)} className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer capitalize whitespace-nowrap ${companyMode === m ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>{m}</button>
                  ))}
                </div>
              )}
              {!showSchedule && (
                <button onClick={() => setFiltersOpen((v) => !v)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap ${filtersOpen || filtersActive(filters) ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'}`}>
                  <i className="ri-filter-3-line" /> Filters
                  {filtersActive(filters) && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                </button>
              )}
            </div>
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300 text-sm" />
              <input
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
                placeholder="Search appointments, clients, properties…"
                className="w-64 pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
              />
              {searchOpen && searchTerm.trim().length >= 2 && (
                <div className="absolute z-40 right-0 mt-1 w-80 bg-white border border-neutral-100 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-neutral-400">No matching appointments.</p>
                  ) : searchResults.map((a) => (
                    <button key={a.id} onMouseDown={(e) => e.preventDefault()} onClick={() => openResult(a)} className="w-full text-left px-3 py-2.5 hover:bg-neutral-50 cursor-pointer border-b border-neutral-50 last:border-b-0">
                      <span className="block text-sm text-neutral-800 truncate">{a.title}</span>
                      <span className="block text-[11px] text-neutral-400 truncate">
                        {new Date(a.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {fmtTime(a.starts_at)} · {a.client_name || a.property_title || KIND_LABELS[a.kind]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!showSchedule && (
            <CalendarFilterPanel filters={filters} onChange={setFilters} agents={agentPicks} showAgent={scope === 'company'} open={filtersOpen} />
          )}

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => nav(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-600 border border-neutral-100 cursor-pointer"><i className="ri-arrow-left-s-line" /></button>
              <button onClick={goToday} className="px-3 py-1.5 rounded-lg bg-white border border-neutral-100 text-base font-medium text-[#012144] hover:bg-neutral-50 cursor-pointer whitespace-nowrap">Today</button>
              <button onClick={() => nav(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-600 border border-neutral-100 cursor-pointer"><i className="ri-arrow-right-s-line" /></button>
              <h2 className="text-base font-medium text-neutral-400 ml-1">{rangeLabel()}</h2>
            </div>
            {!showSchedule && (
              <div className="flex gap-0.5 bg-neutral-50 rounded-full p-1 overflow-x-auto">
                {CALENDAR_VIEWS.map((v) => (
                  <button key={v.value} onClick={() => setView(v.value)} className={`px-3.5 py-1.5 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap ${view === v.value ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>{v.label}</button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
            <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-neutral-400"><i className="ri-loader-4-line animate-spin text-xl" /></div>
              ) : showSchedule ? (
                <CompanyScheduleGrid
                  events={appointments}
                  day={anchor}
                  agents={agentPicks}
                  onSelect={setSelected}
                  onSlotClick={openSlot}
                  getAgentColor={(id) => agentColor(id)}
                />
              ) : appointments.length === 0 ? (
                <EmptyState icon="ri-calendar-line" title="Your calendar is clear" body="No appointments are scheduled for this period. Create one or adjust your filters." />
              ) : view === 'month' ? (
                <MonthView {...viewProps} cells={monthCells} />
              ) : view === 'week' || view === '3day' ? (
                <MultiDayView {...viewProps} days={days} />
              ) : view === 'agenda' ? (
                <AgendaView
                  events={appointments}
                  onSelect={setSelected}
                  getAgentName={nameOf}
                  onEdit={canManageCompany || scope === 'my' ? openEdit : undefined}
                  onReschedule={canManageCompany || scope === 'my' ? openEdit : undefined}
                  onCancel={canManageCompany || scope === 'my' ? (a) => { setSelected(a); } : undefined}
                />
              ) : (
                <DayView {...viewProps} />
              )}
            </div>

            <div className="space-y-4">
              <UpNextPanel appointments={appointments} onSelect={setSelected} onNew={() => setTypeStep({ open: true })} rangeStart={rangeStart} rangeEnd={rangeEnd} />
            </div>
          </div>
        </>
      )}

      <AppointmentTypeStep
        open={typeStep.open}
        onClose={() => setTypeStep({ open: false })}
        agents={scope === 'company' ? agentPicks : undefined}
        defaultAssigneeId={typeStep.assignee}
        currentUserId={user?.id}
        onContinue={continueNew}
      />

      <AppointmentForm
        open={modal.open}
        onClose={() => setModal({ open: false })}
        existing={modal.existing}
        defaults={{ start: modal.start ?? new Date(), kind: modal.kind }}
        currentUserId={user?.id}
        agents={scope === 'company' ? agentPicks : undefined}
        defaultAssigneeId={modal.assignee}
        conflictChecker={findConflicts}
        workingHoursChecker={isWithinWorkingHours}
        onSave={async (draft, sc) => {
          await save(draft, sc);
          refreshRange();
        }}
      />

      <AppointmentDetailDrawer
        appointment={selected}
        currentUserId={user?.id}
        resolveName={nameOf}
        canManage={!selected?.masked}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
        onReschedule={openEdit}
        onDuplicate={openDuplicate}
        onStatus={handleStatus}
        onOutcome={handleOutcome}
        onRespond={respond}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-neutral-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg">{toast}</div>
      )}
    </div>
  );
}

function UpNextPanel({ appointments, onSelect, onNew, rangeStart, rangeEnd }: {
  appointments: CalendarAppointment[];
  onSelect: (a: CalendarAppointment) => void;
  onNew: () => void;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const upcoming = appointments
    .filter((a) => a.status !== 'cancelled' && a.status !== 'no_show' && new Date(a.ends_at) > new Date())
    .filter((a) => new Date(a.starts_at) >= rangeStart && new Date(a.starts_at) < rangeEnd)
    .slice(0, 6);
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-neutral-800">Up next</h3>
        <button onClick={onNew} className="text-xs text-teal-700 hover:text-teal-800 cursor-pointer font-medium">+ New</button>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-xs text-neutral-400">Nothing scheduled in this view.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((a) => (
            <button key={a.id} onClick={() => onSelect(a)} className="w-full flex items-center gap-2.5 text-left rounded-lg p-2 hover:bg-neutral-50 cursor-pointer">
              <span className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-white ${a.masked ? 'bg-neutral-300' : (KIND_COLOR[a.kind] || 'bg-neutral-400')}`}><i className={a.masked ? 'ri-lock-line text-sm' : 'ri-calendar-event-line text-sm'} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-700 truncate">{a.title}</p>
                <p className="text-[10px] text-neutral-400">{new Date(a.starts_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtTime(a.starts_at)}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLOR[a.status] || 'bg-neutral-100 text-neutral-500'}`}>{STATUS_LABELS[a.status] || a.status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}