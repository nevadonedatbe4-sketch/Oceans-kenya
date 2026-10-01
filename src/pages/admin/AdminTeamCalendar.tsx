import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeamAppointments, type RosterAgent } from '@/hooks/useTeamAppointments';
import { agentColor } from '@/pages/agent/ogroup/agentColors';
import AppointmentForm from '@/pages/agent/ogroup/components/AppointmentForm';
import AppointmentTypeStep from '@/pages/agent/ogroup/components/AppointmentTypeStep';
import AppointmentDetailDrawer from '@/pages/agent/ogroup/components/AppointmentDetailDrawer';
import CalendarFilterPanel from '@/pages/agent/ogroup/components/CalendarFilterPanel';
import CalendarAccessModal from '@/pages/admin/components/CalendarAccessModal';
import { MonthView, MultiDayView, DayView, AgendaView, EmptyState } from '@/pages/agent/ogroup/components/CalendarViews';
import type { CalendarDraft } from '@/pages/agent/ogroup/useCalendar';
import type { RecurringEditScope } from '@/pages/agent/ogroup/recurrence';
import {
  type CalendarAppointment, type CalendarView, type AppointmentStatus, type AppointmentKind, type CalendarFilters,
  startOfDay, endOfDay, addDays, startOfWeek, addMonths, fmtTime,
  KIND_LABELS, STATUS_LABELS, EMPTY_FILTERS, filtersActive, CALENDAR_VIEWS,
} from '@/pages/agent/ogroup/calendarTypes';

function agentName(roster: RosterAgent[], id: string | null): string {
  if (!id) return 'Unassigned';
  return roster.find((r) => r.user_id === id)?.name || 'Team member';
}

function rangeFor(a: Date, v: CalendarView): [Date, Date] {
  if (v === 'day') return [startOfDay(a), endOfDay(a)];
  if (v === '3day') return [startOfDay(a), addDays(startOfDay(a), 3)];
  if (v === 'week') { const s = startOfWeek(a); return [s, addDays(s, 7)]; }
  if (v === 'month') { const s = new Date(a.getFullYear(), a.getMonth(), 1); return [s, addMonths(s, 1)]; }
  return [startOfDay(a), addDays(startOfDay(a), 30)];
}

export default function AdminTeamCalendar() {
  const { user } = useAuth();
  const {
    appointments, roster, loading, error,
    loadRange, serverSearch, findConflicts, reschedule,
    createAppointment, updateAppointment, setStatus, setOutcome, respondToInvite,
  } = useTeamAppointments();

  const [view, setView] = useState<CalendarView>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [filters, setFilters] = useState<CalendarFilters>({ ...EMPTY_FILTERS });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);
  const [modal, setModal] = useState<{ open: boolean; existing?: CalendarAppointment | null; start?: Date; kind?: AppointmentKind; assignee?: string }>({ open: false });
  const [typeStep, setTypeStep] = useState<boolean>(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CalendarAppointment[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  useEffect(() => {
    const [s, e] = rangeFor(anchor, view);
    void loadRange(s, e, filters);
  }, [view, anchor, filters, loadRange]);

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
    if (view === 'day') setAnchor(addDays(a, dir));
    else if (view === '3day') setAnchor(addDays(a, dir * 3));
    else if (view === 'week') setAnchor(addDays(a, dir * 7));
    else if (view === 'agenda') setAnchor(addDays(a, dir * 30));
    else setAnchor(addMonths(a, dir));
  };

  const goToday = () => setAnchor(new Date());

  const [rangeStart, rangeEnd] = rangeFor(anchor, view);

  const refreshRange = () => {
    const [s, e] = rangeFor(anchorRef.current, view);
    void loadRange(s, e, filters);
  };

  const days = useMemo(() => {
    const [s, e] = rangeFor(anchor, view);
    const count = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
    return Array.from({ length: count }, (_, i) => addDays(s, i));
  }, [anchor, view]);

  const monthCells = useMemo(() => {
    const first = startOfDay(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    const lead = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => addDays(first, i - lead));
  }, [anchor]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      today: appointments.filter((a) => startOfDay(new Date(a.starts_at)).toDateString() === new Date().toDateString()).length,
      upcoming: appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show' && new Date(a.ends_at).getTime() > now).length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      cancelled: appointments.filter((a) => a.status === 'cancelled' || a.status === 'no_show').length,
      viewings: appointments.filter((a) => a.kind === 'viewing' && a.status !== 'cancelled' && a.status !== 'no_show').length,
    };
  }, [appointments]);

  const rangeLabel = () => {
    if (view === 'day') return anchor.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    if (view === 'agenda') return `Next 30 days from ${anchor.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    if (view === '3day') {
      const e = addDays(anchor, 2);
      return `${anchor.getDate()} ${anchor.toLocaleDateString('en-GB', { month: 'short' })} – ${e.getDate()} ${e.toLocaleDateString('en-GB', { month: 'short' })}, ${e.getFullYear()}`;
    }
    if (view === 'week') {
      const s = startOfWeek(anchor); const e = addDays(s, 6);
      return `${s.getDate()} ${s.toLocaleDateString('en-GB', { month: 'short' })} – ${e.getDate()} ${e.toLocaleDateString('en-GB', { month: 'short' })}, ${e.getFullYear()}`;
    }
    return anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  const save = async (draft: CalendarDraft, scope?: RecurringEditScope) => {
    const assigned = draft.assigned_user_id || roster[0]?.user_id;
    if (!assigned) throw new Error('Assign an agent to this appointment.');
    const teamDraft = {
      id: draft.id,
      title: draft.title,
      kind: draft.kind,
      client_name: draft.client_name ?? null,
      client_phone: draft.client_phone ?? null,
      client_email: draft.client_email ?? null,
      contact_ids: draft.contact_ids || [],
      property_id: draft.property_id ?? null,
      property_title: draft.property_title ?? null,
      assigned_user_id: assigned,
      starts_at: draft.starts_at,
      ends_at: draft.ends_at,
      location_type: draft.location_type,
      location_text: draft.location_text ?? null,
      meeting_point: draft.meeting_point ?? null,
      notes: draft.notes ?? null,
      viewing_instructions: draft.viewing_instructions ?? null,
      intention: draft.intention ?? null,
      reminder_minutes: draft.reminder_minutes,
      reminders: draft.reminders,
      recurrence_rule: draft.recurrence_rule ?? null,
      attendeeIds: draft.attendeeIds,
      allowConflict: draft.allowConflict,
    };
    if (draft.id) await updateAppointment(draft.id, teamDraft, scope || 'this');
    else await createAppointment(teamDraft);
    setModal({ open: false });
    refreshRange();
    showToast(draft.id ? 'Appointment updated.' : 'Appointment scheduled.');
  };

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

  const openEdit = (a: CalendarAppointment) => setModal({ open: true, existing: a });

  // The type chooser runs BEFORE the form so it can shape the fields and routing.
  const continueNew = (kind: AppointmentKind, assigneeId?: string) => {
    setModal({ open: true, kind, assignee: assigneeId });
    setTypeStep(false);
  };
  const openDuplicate = (a: CalendarAppointment) => setModal({
    open: true,
    existing: { ...a, id: '', title: `${a.title} (copy)`, recurrence_rule: null, recurrence_parent_id: null, status: 'scheduled', attendees: [] },
  });

  const openResult = (a: CalendarAppointment) => {
    setAnchor(new Date(a.starts_at));
    setSelected(a);
    setSearchOpen(false);
    setSearchTerm('');
  };

  const nameOf = (id: string | null) => agentName(roster, id);

  const viewProps = {
    events: appointments,
    current: anchor,
    onSelect: setSelected,
    onDayClick: (d: Date) => { setAnchor(d); setView('day'); },
    dragId,
    onDragStart: (a: CalendarAppointment) => setDragId(a.id),
    onDragEnd: () => setDragId(null),
    onDropDay: (d: Date) => void dropAt(d),
    onDropHour: (d: Date, h: number) => void dropAt(d, h),
    getAgentColor: (id: string | null) => agentColor(id),
    getAgentName: nameOf,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-white">Team Calendar</h1>
          <p className="text-lg font-medium text-neutral-300 mt-1">All team appointments & viewings across the agency</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAccessOpen(true)} className="px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-600 text-sm font-medium hover:bg-neutral-50 cursor-pointer whitespace-nowrap">
            <i className="ri-shield-user-line mr-1" />Appointment setters
          </button>
          <button onClick={() => setTypeStep(true)} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 cursor-pointer whitespace-nowrap">
            <i className="ri-add-line mr-1" />New appointment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Today" value={stats.today} tone="neutral" />
        <StatCard label="Upcoming" value={stats.upcoming} tone="teal" />
        <StatCard label="Viewings" value={stats.viewings} tone="neutral" />
        <StatCard label="Completed" value={stats.completed} tone="emerald" />
        <StatCard label="Cancelled" value={stats.cancelled} tone="red" />
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setFiltersOpen((v) => !v)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap ${filtersOpen || filtersActive(filters) ? 'border-teal-500 bg-teal-600 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'}`}>
            <i className="ri-filter-3-line" /> Filters
            {filtersActive(filters) && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>
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
              <div className="absolute z-40 left-0 mt-1 w-80 bg-white border border-neutral-100 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-neutral-400">No matching appointments.</p>
                ) : searchResults.map((a) => (
                  <button key={a.id} onMouseDown={(e) => e.preventDefault()} onClick={() => openResult(a)} className="w-full text-left px-3 py-2.5 hover:bg-neutral-50 cursor-pointer border-b border-neutral-50 last:border-b-0">
                    <span className="block text-sm text-neutral-800 truncate">{a.title}</span>
                    <span className="block text-[11px] text-neutral-400 truncate">
                      {agentName(roster, a.assigned_user_id)} · {new Date(a.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {fmtTime(a.starts_at)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CalendarFilterPanel filters={filters} onChange={setFilters} agents={roster.map((r) => ({ user_id: r.user_id, name: r.name }))} showAgent open={filtersOpen} />

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600 flex items-start gap-2">
          <i className="ri-error-warning-line mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white border border-white cursor-pointer"><i className="ri-arrow-left-s-line" /></button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg bg-white text-[#012144] text-lg font-medium hover:bg-white/90 cursor-pointer whitespace-nowrap">Today</button>
          <button onClick={() => nav(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white border border-white cursor-pointer"><i className="ri-arrow-right-s-line" /></button>
          <h2 className="text-lg font-medium text-neutral-100 ml-1 whitespace-nowrap">{rangeLabel()}</h2>
        </div>
        <div className="flex gap-0.5 bg-neutral-50 border border-neutral-100 rounded-full p-1 overflow-x-auto">
          {CALENDAR_VIEWS.map((v) => (
            <button key={v.value} onClick={() => setView(v.value)} className={`px-3.5 py-1.5 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap transition-colors ${view === v.value ? 'bg-teal-600 text-white shadow-sm' : 'text-neutral-500 hover:text-teal-700 hover:bg-teal-50'}`}>{v.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-neutral-400"><i className="ri-loader-4-line animate-spin text-xl" /></div>
          ) : appointments.length === 0 ? (
            <EmptyState icon="ri-calendar-line" title="No appointments here" body="Nothing matches the current view and filters. Clear filters or create an appointment." />
          ) : view === 'month' ? (
            <MonthView {...viewProps} cells={monthCells} />
          ) : view === 'week' || view === '3day' ? (
            <MultiDayView {...viewProps} days={days} />
          ) : view === 'agenda' ? (
            <AgendaView
              events={appointments}
              onSelect={setSelected}
              getAgentName={nameOf}
              onEdit={openEdit}
              onReschedule={openEdit}
              onCancel={(a) => setSelected(a)}
            />
          ) : (
            <DayView {...viewProps} />
          )}
        </div>

        <div className="space-y-4">
          <UpNextPanel appointments={appointments} roster={roster} onSelect={setSelected} rangeStart={rangeStart} rangeEnd={rangeEnd} />
        </div>
      </div>

      <AppointmentTypeStep
        open={typeStep}
        onClose={() => setTypeStep(false)}
        agents={roster.map((r) => ({ user_id: r.user_id, name: r.name }))}
        defaultAssigneeId={modal.assignee}
        currentUserId={user?.id}
        onContinue={continueNew}
      />

      <AppointmentForm
        open={modal.open}
        onClose={() => setModal({ open: false })}
        existing={modal.existing}
        defaults={{ start: modal.start ?? new Date(), kind: modal.kind }}
        currentUserId={user?.id}
        agents={roster}
        defaultAssigneeId={modal.assignee}
        conflictChecker={findConflicts}
        onSave={save}
      />

      <AppointmentDetailDrawer
        appointment={selected}
        currentUserId={user?.id}
        resolveName={(id) => agentName(roster, id)}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
        onReschedule={openEdit}
        onDuplicate={openDuplicate}
        onStatus={handleStatus}
        onOutcome={handleOutcome}
        onRespond={respondToInvite}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-neutral-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg">{toast}</div>
      )}

      <CalendarAccessModal
        open={accessOpen}
        onClose={() => setAccessOpen(false)}
        agents={roster.map((r) => ({ user_id: r.user_id, name: r.name }))}
      />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  const map: Record<string, string> = {
    neutral: 'bg-neutral-50 border-neutral-100',
    teal: 'bg-teal-50 border-teal-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    red: 'bg-red-50 border-red-100',
  };
  return (
    <div className={`rounded-xl border p-4 ${map[tone] || map.neutral}`}>
      <p className="text-base text-neutral-500">{label}</p>
      <p className="text-2xl font-medium text-neutral-800">{value}</p>
    </div>
  );
}

function UpNextPanel({ appointments, roster, onSelect, rangeStart, rangeEnd }: {
  appointments: CalendarAppointment[];
  roster: RosterAgent[];
  onSelect: (a: CalendarAppointment) => void;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const upcoming = appointments
    .filter((a) => a.status !== 'cancelled' && a.status !== 'no_show' && new Date(a.ends_at) > new Date())
    .filter((a) => new Date(a.starts_at) >= rangeStart && new Date(a.starts_at) < rangeEnd)
    .slice(0, 6);
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-4">
      <h3 className="text-sm font-medium text-neutral-800 mb-3">Up next</h3>
      {upcoming.length === 0 ? (
        <p className="text-xs text-neutral-400">Nothing scheduled in this view.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((a) => (
            <button key={a.id} onClick={() => onSelect(a)} className="w-full flex items-center gap-2.5 text-left rounded-lg p-2 hover:bg-neutral-50 cursor-pointer">
              <span className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: agentColor(a.assigned_user_id) || undefined }}>
                <i className="ri-calendar-event-line text-sm" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-700 truncate">{a.title}</p>
                <p className="text-[10px] text-neutral-400">{agentName(roster, a.assigned_user_id)} · {new Date(a.starts_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} {fmtTime(a.starts_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}