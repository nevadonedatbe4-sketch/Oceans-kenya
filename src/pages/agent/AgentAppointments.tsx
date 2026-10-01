import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { CalendarAppointment, AppointmentStatus } from '@/pages/agent/ogroup/calendarTypes';
import { fmtTime, KIND_LABELS, KIND_COLOR, STATUS_LABELS, STATUS_COLOR } from '@/pages/agent/ogroup/calendarTypes';
import { logAppointmentActivity } from '@/pages/agent/ogroup/appointmentActivity';
import AppointmentDetailDrawer from '@/pages/agent/ogroup/components/AppointmentDetailDrawer';
import AppointmentForm from '@/pages/agent/ogroup/components/AppointmentForm';
import { QuickSetButton } from '@/pages/agent/ogroup/components/QuickSetButton';
import { useCalendar, draftToPatch, type CalendarDraft } from '@/pages/agent/ogroup/useCalendar';
import { fetchStaffMap } from '@/pages/agent/ogroup/staffDirectory';

// ─────────────────────────────────────────────────────────────
// AGENT CRM — APPOINTMENTS
//
// An operational view of the SAME canonical `og_appointments` record.
// Not a calendar copy: "Upcoming" (workload) + "Follow-ups" (viewings
// completed recently that still need action).
// ─────────────────────────────────────────────────────────────

const FOLLOW_UP_OUTCOMES = ['needs_follow_up', 'interested', 'very_interested', 'considering', 'offer_expected', 'application_expected'];

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function relativeDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function AgentAppointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'upcoming' | 'followups'>('upcoming');
  /** Distinguish appointments the agent created from ones assigned to them by someone else. */
  const [origin, setOrigin] = useState<'all' | 'created' | 'assigned'>('all');
  const [rows, setRows] = useState<CalendarAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);
  // Editing an already-scheduled appointment without leaving this page.
  const [editor, setEditor] = useState<{ open: boolean; existing: CalendarAppointment | null }>({ open: false, existing: null });
  const { findConflicts, isWithinWorkingHours } = useCalendar();
  const [staffNames, setStaffNames] = useState<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('og_appointments')
        .select('*')
        .or(`assigned_user_id.eq.${user.id},created_by.eq.${user.id}`)
        .order('starts_at', { ascending: true })
        .limit(300);
      if (err) throw err;
      setRows((data || []) as CalendarAppointment[]);
    } catch (e) {
      setError((e as Error).message || 'Could not load your appointments.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  // Resolve teammate names so "Assigned by …" can name the actual person.
  useEffect(() => {
    let active = true;
    void fetchStaffMap()
      .then((map) => {
        if (!active) return;
        const names = new Map<string, string>();
        map.forEach((row, id) => names.set(id, row.name || 'Team member'));
        setStaffNames(names);
      })
      .catch(() => { /* names are optional */ });
    return () => { active = false; };
  }, []);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return rows
      .filter((a) => a.status !== 'cancelled' && a.status !== 'no_show' && new Date(a.ends_at || a.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [rows]);

  const followUps = useMemo(() => {
    return rows
      .filter((a) => a.status === 'completed' && FOLLOW_UP_OUTCOMES.includes(String(a.outcome || '')))
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
      .slice(0, 40);
  }, [rows]);

  const filteredUpcoming = useMemo(() => {
    if (origin === 'created') return upcoming.filter((a) => a.created_by === user?.id);
    if (origin === 'assigned') return upcoming.filter((a) => a.created_by !== user?.id);
    return upcoming;
  }, [upcoming, origin, user?.id]);

  const groupedUpcoming = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    filteredUpcoming.slice(0, 60).forEach((a) => {
      const k = dayKey(a.starts_at);
      map.set(k, [...(map.get(k) || []), a]);
    });
    return [...map.values()];
  }, [filteredUpcoming]);

  /** Whether an appointment was created by the agent themselves, or assigned by someone else. */
  const originOf = (a: CalendarAppointment): { label: string; icon: string } => {
    if (a.created_by && a.created_by === user?.id) return { label: 'Created by you', icon: 'ri-user-line' };
    const nm = a.created_by ? staffNames.get(a.created_by) : null;
    return nm
      ? { label: `Assigned by ${nm}`, icon: 'ri-user-received-line' }
      : { label: 'Assigned to you', icon: 'ri-user-received-line' };
  };

  const handleStatus = async (a: CalendarAppointment, status: AppointmentStatus, reason?: string) => {
    const patch: Record<string, unknown> = { status };
    const now = new Date().toISOString();
    if (status === 'confirmed') patch.confirmed_at = now;
    if (status === 'completed') patch.completed_at = now;
    if (status === 'cancelled') { patch.cancelled_at = now; patch.cancelled_by = user?.id; if (reason) patch.cancellation_reason = reason; }
    const { error: err } = await supabase.from('og_appointments').update(patch).eq('id', a.id);
    if (err) throw err;
    await logAppointmentActivity({ appointment_id: a.id, actor_id: user?.id, action: status === 'cancelled' ? 'cancelled' : status === 'completed' ? 'completed' : 'edited', summary: status === 'cancelled' && reason ? `Cancelled — ${reason}` : undefined });
    setRows((prev) => prev.map((r) => (r.id === a.id ? { ...r, status } : r)));
    setSelected((prev) => (prev && prev.id === a.id ? { ...prev, status } : prev));
  };

  const handleOutcome = async (a: CalendarAppointment, outcome: string) => {
    const { error: err } = await supabase.from('og_appointments').update({ outcome }).eq('id', a.id);
    if (err) throw err;
    await logAppointmentActivity({ appointment_id: a.id, actor_id: user?.id, action: 'outcome', summary: outcome });
    setRows((prev) => prev.map((r) => (r.id === a.id ? ({ ...r, outcome } as CalendarAppointment) : r)));
    setSelected((prev) => (prev && prev.id === a.id ? ({ ...prev, outcome } as CalendarAppointment) : prev));
  };

  // Open the full appointment form (prefilled with the existing record) so an
  // already-scheduled appointment can be re-edited field by field and saved.
  const openEditor = (a: CalendarAppointment) => {
    setSelected(null);
    setEditor({ open: true, existing: a });
  };

  const handleSaveEdit = async (draft: CalendarDraft) => {
    const id = draft.id;
    if (!id) throw new Error('This appointment could not be found.');
    const patch = draftToPatch(draft);
    const { error: err } = await supabase.from('og_appointments').update(patch).eq('id', id);
    if (err) throw err;
    await logAppointmentActivity({
      appointment_id: id,
      actor_id: user?.id,
      action: 'edited',
      summary: 'Appointment details updated',
    });
    setRows((prev) => prev.map((r) => (r.id === id ? ({ ...r, ...patch } as unknown as CalendarAppointment) : r)));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-neutral-400">Appointments</h1>
          <p className="text-sm text-neutral-400/80 mt-0.5">Your upcoming workload and follow-ups — one canonical record, no duplicates.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <QuickSetButton label="Quick Set Appointment" />
          <div className="flex gap-0.5 bg-neutral-50 rounded-full p-1">
            <button onClick={() => setTab('upcoming')} className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap ${tab === 'upcoming' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
              Upcoming{upcoming.length ? ` · ${upcoming.length}` : ''}
            </button>
            <button onClick={() => setTab('followups')} className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap ${tab === 'followups' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
              Follow-ups{followUps.length ? ` · ${followUps.length}` : ''}
            </button>
          </div>
        </div>
      </div>

      {tab === 'upcoming' && !loading && !error && (
        <div className="flex gap-0.5 bg-neutral-50 rounded-full p-1 w-fit">
          {([
            { v: 'all', label: 'All my appointments' },
            { v: 'created', label: 'Created by me' },
            { v: 'assigned', label: 'Assigned to me' },
          ] as const).map((o) => (
            <button key={o.v} onClick={() => setOrigin(o.v)} className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap ${origin === o.v ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>{o.label}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400"><i className="ri-loader-4-line animate-spin text-xl" /></div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-neutral-100 p-6 text-center">
          <i className="ri-error-warning-line text-2xl text-amber-500" />
          <p className="text-sm text-neutral-600 mt-2">{error}</p>
          <button onClick={() => void load()} className="mt-3 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 cursor-pointer whitespace-nowrap">Retry</button>
        </div>
      ) : tab === 'upcoming' ? (
        groupedUpcoming.length === 0 ? (
          <EmptyPanel icon="ri-calendar-check-line" title="Nothing upcoming" body={origin === 'all' ? 'You have no scheduled appointments. Create one from your calendar.' : 'No appointments match this filter.'} />
        ) : (
          <div className="space-y-5">
            {groupedUpcoming.map((group) => (
              <div key={group[0].id}>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">{relativeDay(group[0].starts_at)}</p>
                <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 overflow-hidden">
                  {group.map((a) => <AppointmentRow key={a.id} a={a} onOpen={() => setSelected(a)} origin={originOf(a)} />)}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        followUps.length === 0 ? (
          <EmptyPanel icon="ri-list-check-2" title="No follow-ups needed" body="Viewings you complete with a follow-up outcome will appear here." />
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 overflow-hidden">
            {followUps.map((a) => <AppointmentRow key={a.id} a={a} onOpen={() => setSelected(a)} showOutcome />)}
          </div>
        )
      )}

      <AppointmentDetailDrawer
        appointment={selected}
        currentUserId={user?.id}
        resolveName={() => 'You'}
        canManage
        onClose={() => setSelected(null)}
        onEdit={openEditor}
        onReschedule={openEditor}
        onDuplicate={() => navigate('/agent/calendar')}
        onStatus={handleStatus}
        onOutcome={handleOutcome}
        onRespond={async () => {}}
      />

      <AppointmentForm
        open={editor.open}
        onClose={() => setEditor({ open: false, existing: null })}
        existing={editor.existing}
        currentUserId={user?.id}
        conflictChecker={findConflicts}
        workingHoursChecker={isWithinWorkingHours}
        onSave={handleSaveEdit}
      />
    </div>
  );
}

function AppointmentRow({ a, onOpen, showOutcome, origin }: { a: CalendarAppointment; onOpen: () => void; showOutcome?: boolean; origin?: { label: string; icon: string } }) {
  return (
    <button onClick={onOpen} className="w-full flex items-center gap-3 text-left p-4 hover:bg-neutral-50 cursor-pointer">
      <span className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-white ${KIND_COLOR[a.kind] || 'bg-neutral-400'}`}>
        <i className={a.kind === 'viewing' ? 'ri-home-4-line' : a.kind === 'appraisal' ? 'ri-line-chart-line' : 'ri-calendar-event-line'} />
      </span>
      <div className="w-16 flex-shrink-0 text-right">
        <p className="text-sm font-semibold text-neutral-700">{fmtTime(a.starts_at)}</p>
        <p className="text-[10px] text-neutral-400">{fmtTime(a.ends_at)}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 truncate">{a.title}</p>
        <p className="text-[11px] text-neutral-400 truncate">
          {[a.property_title, a.client_name].filter(Boolean).join(' · ') || KIND_LABELS[a.kind]}
        </p>
        {origin && (
          <p className="text-[10px] text-neutral-400 mt-0.5 inline-flex items-center gap-1">
            <i className={origin.icon} />{origin.label}
          </p>
        )}
      </div>
      {showOutcome && a.outcome && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium whitespace-nowrap capitalize">{String(a.outcome).replace(/_/g, ' ')}</span>
      )}
      <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLOR[a.status] || 'bg-neutral-100 text-neutral-500'}`}>{STATUS_LABELS[a.status] || a.status}</span>
      <i className="ri-arrow-right-s-line text-neutral-300" />
    </button>
  );
}

function EmptyPanel({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 flex flex-col items-center justify-center py-20 text-center px-6">
      <span className="w-14 h-14 flex items-center justify-center rounded-full bg-neutral-50 text-neutral-300"><i className={`${icon} text-2xl`} /></span>
      <p className="text-sm font-medium text-neutral-600 mt-3">{title}</p>
      <p className="text-xs text-neutral-400 mt-1 max-w-xs">{body}</p>
    </div>
  );
}