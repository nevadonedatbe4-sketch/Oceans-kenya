import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import usePortalBase from '@/hooks/usePortalBase';
import { useGlobalPresence } from '@/hooks/useGlobalPresence';
import { useAttendance, type AttendanceEvent, type PunchOutcome } from './useAttendance';
import { ACCENTS, type AccentKey, CTA_COLOR, CTA_HOVER, fmtTime, fmtDur, fmtDate } from './checkInTheme';
import TodayCard from './components/TodayCard';
import BreakTypePicker from './components/BreakTypePicker';
import PunchInLocationModal from './components/PunchInLocationModal';
import AttendanceStatusStrip from './components/AttendanceStatusStrip';
import type { PunchLocation } from './attendanceLocation';

interface ApptRow {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  status: string;
  client_name: string | null;
  property_title: string | null;
}

const EVENT_COPY: Record<AttendanceEvent['type'], { title: string; sub: (e: AttendanceEvent) => string }> = {
  punch_in: { title: "You're punched in", sub: () => 'Shift started.' },
  punch_out: { title: "You're punched out", sub: (e) => `Worked today: ${fmtDur(e.workedSec || 0)}` },
  break_start: { title: 'Break started', sub: () => 'Enjoy your break.' },
  break_end: { title: 'Back on the clock', sub: (e) => `Break lasted ${fmtDur(e.addedBreakSec || 0)}` },
};

export default function OGroupCheckIn() {
  const { user } = useAuth();
  const portalBase = usePortalBase();
  const navigate = useNavigate();
  const presence = useGlobalPresence();
  const {
    session, todays, policy, schedule, breakTypes, openShift, state,
    loading, busy, error, lastEvent, autoClosed,
    punchIn, punchOut, startBreak, endBreak, clearError, clearEvent, clearAutoClosed,
  } = useAttendance(`${portalBase}/check-in`);

  const [now, setNow] = useState(Date.now());
  const [appts, setAppts] = useState<ApptRow[]>([]);
  const [punchNote, setPunchNote] = useState('');
  const [autoClosedNotice, setAutoClosedNotice] = useState<{ clockOutAt: string | null } | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>({});
  const dismissAlert = (key: string) => setDismissedAlerts((prev) => ({ ...prev, [key]: true }));
  const [noteOpen, setNoteOpen] = useState(false);
  const [breakPickerOpen, setBreakPickerOpen] = useState(false);
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [corrReason, setCorrReason] = useState('');
  const [corrTime, setCorrTime] = useState('');
  const [corrBusy, setCorrBusy] = useState(false);
  const [toast, setToast] = useState<AttendanceEvent | null>(null);
  const [accent, setAccent] = useState<AccentKey>(() => (localStorage.getItem('og-punch-accent') === 'teal' ? 'teal' : 'navy'));

  useEffect(() => { localStorage.setItem('og-punch-accent', accent); }, [accent]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // Surface the server confirmation as a toast, then clear it.
  useEffect(() => {
    if (!lastEvent) return;
    setToast(lastEvent);
    clearEvent();
    if (lastEvent.type === 'punch_in') { setPunchNote(''); setNoteOpen(false); }
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent]);

  // The server auto-closes a shift the moment it reaches the maximum length.
  // Surface it once so the agent understands why they were punched out.
  useEffect(() => {
    if (autoClosed.length === 0) return;
    const last = autoClosed[autoClosed.length - 1];
    setAutoClosedNotice({ clockOutAt: last.clock_out_at });
    clearAutoClosed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoClosed]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const end = new Date(today); end.setHours(23, 59, 59, 999);
      const { data } = await supabase
        .from('og_appointments')
        .select('id,title,kind,starts_at,ends_at,status,client_name,property_title')
        .eq('assigned_user_id', user.id)
        .gte('starts_at', today.toISOString())
        .lte('starts_at', end.toISOString())
        .order('starts_at', { ascending: true });
      setAppts((data || []) as ApptRow[]);
    })();
  }, [user]);

  // Elapsed since punch-in (ticking). This is display-only — derived from the
  // authoritative clock_in_at, never a separate source of truth.
  const elapsed = useMemo(() => {
    if (!session || session.status === 'completed') return 0;
    return Math.max(0, Math.floor((now - new Date(session.clock_in_at).getTime()) / 1000));
  }, [session, now]);

  const theme = ACCENTS[accent];
  const presenceState = user ? presence[user.id]?.state : undefined;

  const liveClock = new Date(now).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const liveDate = new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || '').trim().split(/\s+/)[0] || 'there';

  const todayTotal = todays.reduce((s, t) => s + (t.hours_worked_sec || 0), 0);
  const maxShiftSec = (policy?.max_shift_minutes ?? 720) * 60;
  const approachingLimit = state !== 'off_clock' && maxShiftSec > 0 && elapsed >= maxShiftSec - 3600;

  const submitCorrection = async () => {
    if (!corrReason.trim()) return;
    setCorrBusy(true);
    try {
      await supabase.from('og_attendance_corrections').insert({
        user_id: user?.id,
        session_id: session?.id || null,
        requested_clock_out_at: corrTime ? new Date(corrTime).toISOString() : null,
        reason: corrReason.trim(),
      });
      setCorrectionOpen(false);
      setCorrReason(''); setCorrTime('');
      setToast({ type: 'punch_out', at: new Date().toISOString() });
    } finally { setCorrBusy(false); }
  };

  // Only ever runs from the punch-in dialog's explicit confirm - never from
  // sign-in, page load, refresh or session restoration. `loc` is null when the
  // device could not provide a fix; the punch still proceeds and the server
  // records the saved office location.
  const confirmPunchIn = async (loc: PunchLocation | null, note?: string): Promise<PunchOutcome> => {
    const res = await punchIn(note || punchNote || undefined, loc || undefined);
    if (res.ok) {
      setPunchModalOpen(false);
      setPunchNote('');
      setNoteOpen(false);
      return { ok: true };
    }
    return { ok: false, code: res.code, message: res.message, distanceM: res.distanceM, radiusM: res.radiusM };
  };

  const mapSrc = session?.clock_in_latitude
    ? `https://maps.google.com/maps?q=${session.clock_in_latitude},${session.clock_in_longitude}&z=16&output=embed`
    : 'https://maps.google.com/maps?q=-1.2921,36.8219&z=14&output=embed';

  const statePill = state === 'on_break'
    ? { text: 'On break', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' }
    : state === 'punched_in'
      ? { text: 'Punched in', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
      : { text: 'Off clock', cls: 'bg-neutral-50 text-neutral-500 border-neutral-200', dot: 'bg-neutral-400' };

  return (
    <div className="bg-white rounded-3xl p-4 md:p-7 space-y-6">
      {/* ============ TOP BAR ============ */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Back" className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer">
            <i className="ri-arrow-left-line" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Punch Clock</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Attendance &amp; time tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Punch state (attendance — the authoritative state) */}
          <span className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${statePill.cls}`}>
            <span className={`relative flex w-2 h-2`}>
              {state !== 'off_clock' && <span className={`absolute inline-flex w-full h-full rounded-full ${statePill.dot} opacity-60 animate-ping`} />}
              <span className={`relative inline-flex w-2 h-2 rounded-full ${statePill.dot}`} />
            </span>
            {statePill.text}
          </span>
          {/* Presence (online — a SEPARATE system) */}
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border bg-neutral-50 text-neutral-500 border-neutral-200" title="Online status is separate from attendance">
            <span className={`w-1.5 h-1.5 rounded-full ${presenceState === 'online' ? 'bg-emerald-500' : presenceState === 'away' ? 'bg-amber-400' : 'bg-neutral-300'}`} />
            {presenceState === 'online' ? 'Online' : presenceState === 'away' ? 'Away' : 'Offline'}
          </span>

          <div className="inline-flex items-center gap-1 rounded-full bg-neutral-100 p-1" role="group" aria-label="Accent colour">
            {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
              <button key={k} type="button" onClick={() => setAccent(k)} title={`${ACCENTS[k].label} accent`} aria-pressed={accent === k}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${accent === k ? 'ring-2 ring-offset-2 ring-neutral-400 scale-105' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}>
                <span className={`w-4 h-4 rounded-full ${ACCENTS[k].dot}`} />
              </button>
            ))}
          </div>

          <button onClick={() => setCorrectionOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#012144] hover:underline underline-offset-2 cursor-pointer whitespace-nowrap transition-colors">
            <i className="ri-error-warning-line" /> Request correction
          </button>
        </div>
      </div>

      {/* ============ HERO ============ */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.card} text-white p-6 md:p-8`}>
        <span className="pointer-events-none absolute -top-20 -right-12 w-60 h-60 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-white/5" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="min-w-0">
            <p className="text-sm text-white/80 font-medium">{greeting}, {firstName}</p>
            <p className="digital-lux mt-3">{liveClock}</p>
            <p className="text-sm text-white/70 mt-2">{liveDate}</p>
            <div className="mt-6 flex items-center gap-5 flex-wrap">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/55 font-semibold">Punched in at</p>
                <p className="text-lg font-semibold tabular-nums mt-0.5">{state !== 'off_clock' && session ? fmtTime(session.clock_in_at) : '—:—'}</p>
              </div>
              <span className="w-px h-9 bg-white/20" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/55 font-semibold">Elapsed</p>
                <p className="text-lg font-semibold tabular-nums mt-0.5">{state !== 'off_clock' ? fmtDur(elapsed) : '0h 0m'}</p>
              </div>
              <span className="w-px h-9 bg-white/20" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/55 font-semibold">Today</p>
                <p className="text-lg font-semibold tabular-nums mt-0.5">{fmtDur(todayTotal)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 flex-shrink-0 mx-auto md:mx-0">
            {state === 'off_clock' ? (
              <>
                <button onClick={() => setPunchModalOpen(true)} disabled={busy} aria-label="Punch in"
                  className="group relative w-40 h-40 md:w-44 md:h-44 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-60 transition-transform duration-200 hover:scale-[1.03] active:scale-95">
                  <span className="absolute inset-0 rounded-full border-2 border-dashed border-white/30" />
                  <span className="absolute inset-3 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors" />
                  <span className={`relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-white ring-4 ring-white/25 flex flex-col items-center justify-center ${theme.btnText}`}>
                    {busy ? <i className="ri-loader-4-line animate-spin text-3xl" /> : (
                      <>
                        <i className="ri-fingerprint-2-line text-3xl" />
                        <span className="text-xs font-bold tracking-widest mt-1">PUNCH IN</span>
                      </>
                    )}
                  </span>
                </button>
                <p className="text-[11px] text-white/70 text-center max-w-[190px]">Tap to punch in. Your shift is recorded right away — location is optional.</p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-36 h-36 md:w-40 md:h-40 flex items-center justify-center">
                  <span className={`absolute inset-0 rounded-full border-2 border-dashed ${state === 'on_break' ? 'border-amber-300' : 'border-emerald-300'}`} />
                  <div className={`w-28 h-28 md:w-32 md:h-32 rounded-full flex flex-col items-center justify-center text-center ${state === 'on_break' ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                    <i className={`text-2xl ${state === 'on_break' ? 'ri-cup-line' : 'ri-checkbox-circle-line'}`} />
                    <p className="text-xs font-semibold mt-1 px-2">{state === 'on_break' ? 'On break' : 'Active'}</p>
                  </div>
                </div>
                {state === 'on_break' ? (
                  <button onClick={() => endBreak()} disabled={busy} className={`px-7 py-2.5 rounded-full bg-white ${theme.btnText} font-bold text-sm hover:bg-white/90 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50`}>End break</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setBreakPickerOpen(true)} disabled={busy} className="px-4 py-2.5 rounded-full bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"><i className="ri-cup-line mr-1" />Break</button>
                    <button onClick={() => punchOut(punchNote || undefined)} disabled={busy} className={`px-5 py-2.5 rounded-full bg-white ${theme.btnText} font-bold text-sm hover:bg-white/90 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50`}>Punch out</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ INDEPENDENT STATUSES ============ */}
      <AttendanceStatusStrip signedIn={!!user} state={state} timesheetActive={state !== 'off_clock'} />

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 border border-red-100 p-3.5 text-red-600">
          <i className="ri-error-warning-line mt-0.5" />
          <p className="flex-1 text-sm font-medium">{error}</p>
          <button onClick={clearError} className="text-red-400 cursor-pointer"><i className="ri-close-line" /></button>
        </div>
      )}

      {openShift.abandoned && !dismissedAlerts[`open-${session?.id || 'shift'}`] && (
        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-amber-800">
          <i className="ri-alarm-warning-line mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">You have an open shift</p>
            <p className="text-xs mt-0.5">You punched in on {session ? fmtDate(session.clock_in_at) : ''} at {session ? fmtTime(session.clock_in_at) : ''} and never punched out. Punch out below, or request a correction.</p>
          </div>
          <button onClick={() => dismissAlert(`open-${session?.id || 'shift'}`)} aria-label="Dismiss" className="text-amber-500 hover:text-amber-700 transition-colors cursor-pointer flex-shrink-0"><i className="ri-close-line" /></button>
        </div>
      )}

      {autoClosedNotice && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 border border-red-200 p-3.5 text-red-700">
          <i className="ri-error-warning-line mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">You were automatically punched out</p>
            <p className="text-xs mt-0.5">Your shift reached the {Math.round(maxShiftSec / 3600)}-hour limit and was closed at {autoClosedNotice.clockOutAt ? fmtTime(autoClosedNotice.clockOutAt) : '—'}. An admin can review it.</p>
          </div>
          <button onClick={() => setAutoClosedNotice(null)} className="text-red-400 cursor-pointer"><i className="ri-close-line" /></button>
        </div>
      )}

      {approachingLimit && !dismissedAlerts[`limit-${session?.id || 'shift'}`] && (
        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-amber-800">
          <i className="ri-timer-line mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Approaching the {Math.round(maxShiftSec / 3600)}-hour limit</p>
            <p className="text-xs mt-0.5">You&apos;ll be automatically punched out in {fmtDur(Math.max(0, maxShiftSec - elapsed))}. Punch out sooner if you&apos;re done.</p>
          </div>
          <button onClick={() => dismissAlert(`limit-${session?.id || 'shift'}`)} aria-label="Dismiss" className="text-amber-500 hover:text-amber-700 transition-colors cursor-pointer flex-shrink-0"><i className="ri-close-line" /></button>
        </div>
      )}

      {/* ============ TODAY CARD ============ */}
      <TodayCard session={session} state={state} policy={policy} schedule={schedule} now={now} busy={busy} theme={theme} />

      {/* ============ NOTE + MAP ============ */}
      <div className="rounded-2xl border border-neutral-200 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <i className={`text-base ${session?.clock_in_latitude ? 'ri-map-pin-2-fill text-emerald-600' : 'ri-map-pin-2-line text-neutral-400'}`} />
            {session?.clock_in_latitude ? 'Punch-in location' : 'No location on record yet'}
          </span>
          <span className="text-xs font-medium text-neutral-400">{session?.clock_in_location_label || (session?.location_source ? session.location_source.replace(/_/g, ' ') : '')}</span>
        </div>

        <div className="relative w-full h-[200px] md:h-[280px] rounded-2xl overflow-hidden bg-neutral-100">
          <iframe title="Punch location" src={mapSrc} className="w-full h-full border-0" referrerPolicy="no-referrer-when-downgrade" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Punch note (optional)</p>
          {noteOpen || punchNote ? (
            <textarea value={punchNote} autoFocus onChange={(e) => setPunchNote(e.target.value)} onBlur={() => { if (!punchNote.trim()) setNoteOpen(false); }}
              rows={2} maxLength={200} placeholder="e.g. Working from Westlands office"
              className="mt-2 w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200 resize-none" />
          ) : (
            <button onClick={() => setNoteOpen(true)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors cursor-pointer">
              <i className="ri-add-line" /> Add a note
            </button>
          )}
        </div>
      </div>

      {/* ============ STATS ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`rounded-2xl border p-4 ${theme.softBg} ${theme.softBorder}`}>
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme.tileIcon}`}><i className="ri-time-line" /></span>
          <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mt-3">Total today</p>
          <p className="text-xl font-bold text-neutral-900 tabular-nums mt-0.5">{fmtDur(todayTotal)}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-100 text-amber-700"><i className="ri-alarm-warning-line" /></span>
          <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mt-3">Late today</p>
          <p className="text-xl font-bold text-neutral-900 tabular-nums mt-0.5">{fmtDur(todays.reduce((s, t) => s + (t.late_sec || 0), 0))}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700"><i className="ri-timer-flash-line" /></span>
          <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mt-3">Overtime today</p>
          <p className="text-xl font-bold text-neutral-900 tabular-nums mt-0.5">{fmtDur(todays.reduce((s, t) => s + (t.overtime_sec || 0), 0))}</p>
        </div>
      </div>

      {/* ============ APPOINTMENTS ============ */}
      <div className="rounded-2xl border border-neutral-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <i className={`ri-calendar-schedule-line ${theme.softText}`} />
          <p className="text-sm font-semibold text-neutral-800">Today&apos;s appointments</p>
        </div>
        {appts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-300 mb-2"><i className="ri-calendar-line text-xl" /></span>
            <p className="text-sm text-neutral-400">Nothing scheduled today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {appts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50/60 transition-all p-2.5">
                <span className={`w-12 text-xs font-bold ${theme.softText} flex-shrink-0 tabular-nums`}>{fmtTime(a.starts_at)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{a.title}</p>
                  <p className="text-xs text-neutral-400 truncate">{a.client_name || a.property_title ? [a.client_name, a.property_title].filter(Boolean).join(' · ') : a.kind}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${a.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : a.status === 'scheduled' ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-500'}`}>{a.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ SESSIONS ============ */}
      <div className="rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <i className={`ri-history-line ${theme.softText}`} />
            <p className="text-sm font-semibold text-neutral-800">Today&apos;s sessions</p>
          </div>
          <button onClick={() => navigate(`${portalBase}/timesheet`)} className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer whitespace-nowrap">
            My Timesheet <i className="ri-arrow-right-line" />
          </button>
        </div>
        {todays.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-neutral-400">No sessions recorded yet today</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">In</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Out</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Break</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Worked</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {todays.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 hover:bg-neutral-50/70 transition-colors">
                    <td className="px-4 py-3 text-neutral-700 tabular-nums">{fmtTime(s.clock_in_at)}</td>
                    <td className="px-4 py-3 text-neutral-700 tabular-nums">{s.clock_out_at ? fmtTime(s.clock_out_at) : '—'}</td>
                    <td className="px-4 py-3 text-neutral-700 tabular-nums">{s.break_sec ? fmtDur(s.break_sec) : '—'}</td>
                    <td className="px-4 py-3 text-neutral-700 tabular-nums">{s.hours_worked_sec != null ? fmtDur(s.hours_worked_sec) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : s.status === 'break' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />{s.status === 'working' ? 'open' : s.status}
                        </span>
                        {!!s.note && s.note.includes('Auto punched out:') && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600" title="Closed automatically at the maximum shift length">
                            <i className="ri-timer-flash-line" /> Auto {Math.round(maxShiftSec / 3600)}h
                          </span>
                        )}
                        {s.flagged_geofence && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700" title="Punched in outside the office area">
                            <i className="ri-map-pin-user-line" /> Outside area
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-neutral-400 py-2">
          <i className="ri-loader-4-line animate-spin" /> Loading attendance…
        </div>
      )}

      {breakPickerOpen && (
        <BreakTypePicker breakTypes={breakTypes} busy={busy} onCancel={() => setBreakPickerOpen(false)}
          onSelect={(name, id) => { setBreakPickerOpen(false); startBreak(name, id); }} />
      )}

      {punchModalOpen && (
        <PunchInLocationModal busy={busy} onCancel={() => setPunchModalOpen(false)} onConfirm={confirmPunchIn} />
      )}

      {correctionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCorrectionOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-5 border border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-neutral-900">Request attendance correction</h3>
              <button onClick={() => setCorrectionOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer"><i className="ri-close-line text-xl" /></button>
            </div>
            <p className="text-xs text-neutral-500 mb-3">e.g. you forgot to clock out. An Admin will review and approve or reject this.</p>
            <label className="text-xs font-semibold text-neutral-600">Reason</label>
            <textarea value={corrReason} onChange={(e) => setCorrReason(e.target.value)} rows={3} maxLength={300} placeholder="Forgot to clock out" className="mt-1 w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 resize-none" />
            <label className="text-xs font-semibold text-neutral-600 block mt-3">Requested clock-out time (optional)</label>
            <input type="datetime-local" value={corrTime} onChange={(e) => setCorrTime(e.target.value)} className="mt-1 w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setCorrectionOpen(false)} className="px-4 py-2 rounded-lg text-sm text-neutral-500 hover:bg-neutral-50 cursor-pointer">Cancel</button>
              <button onClick={submitCorrection} disabled={corrBusy || !corrReason.trim()} style={{ backgroundColor: CTA_COLOR }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = CTA_HOVER; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = CTA_COLOR; }}
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap">
                {corrBusy ? 'Submitting...' : 'Submit request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white rounded-2xl px-5 py-3 shadow-lg flex items-center gap-3 max-w-[90vw]">
          <i className="ri-checkbox-circle-fill text-emerald-400 text-xl" />
          <div>
            <p className="text-sm font-semibold">{EVENT_COPY[toast.type].title} · {fmtTime(toast.at)}</p>
            <p className="text-xs text-white/70">{EVENT_COPY[toast.type].sub(toast)}</p>
          </div>
        </div>
      )}
    </div>
  );
}