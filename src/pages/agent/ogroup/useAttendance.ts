import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { pushNotification } from './useNotifications';
import {
  detectPunchLocation,
  getBrowserPosition,
  hasGeolocationPermission,
  isValidCoords,
  type PunchLocation,
} from './attendanceLocation';

/** Fallback maximum shift length (minutes) when a policy has no value set. */
export const MAX_SHIFT_MINUTES_DEFAULT = 720;

/**
 * Attendance is a SEPARATE system from online presence.
 *
 * The authoritative state ALWAYS comes from the server (`og-checkin`), which
 * reads the durable attendance records. This hook never infers punch state from
 * presence, session, local storage, or browser activity — it only mirrors what
 * the server reports. There is NO automatic punch-out anywhere.
 *
 * state:
 *   'off_clock'  → no open session
 *   'punched_in' → open session, working
 *   'on_break'   → open session, on break
 */
export type AttendanceState = 'off_clock' | 'punched_in' | 'on_break';

export interface AttendanceSession {
  id: string;
  user_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  status: 'working' | 'completed' | 'break';
  break_sec: number | null;
  break_started_at: string | null;
  break_type: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  location_method: string | null;
  location_source: string | null;
  clock_in_accuracy: number | null;
  clock_in_location_label: string | null;
  clock_out_location_label: string | null;
  flagged_geofence: boolean;
  hours_worked_sec: number | null;
  late_sec: number | null;
  overtime_sec: number | null;
  early_depart_sec: number | null;
  timesheet_status: string | null;
  note: string | null;
}

export interface BreakType {
  id: string;
  name: string;
  paid: boolean;
}

export interface AttendancePolicy {
  mode: string;
  work_start_time: string | null;
  work_end_time: string | null;
  lateness_grace_min: number | null;
  overtime_threshold_min: number | null;
  break_minutes: number | null;
  max_shift_minutes: number | null;
}

export interface WorkSchedule {
  start_time: string;
  end_time: string;
  break_minutes: number;
  work_days: number[];
}

export interface AttendanceEvent {
  type: 'punch_in' | 'punch_out' | 'break_start' | 'break_end';
  at: string;
  workedSec?: number;
  breakSec?: number;
  addedBreakSec?: number;
}

/** The `og-checkin` response payload on a successful action. */
export interface AttendancePayload {
  session: AttendanceSession | null;
  todays: AttendanceSession[];
  policy: AttendancePolicy | null;
  schedule: WorkSchedule | null;
  breakTypes: BreakType[];
  openShift: { active: boolean; abandoned: boolean };
  /** Sessions the server auto-closed because they reached the max shift length. */
  autoClosed?: AttendanceSession[];
  event?: AttendanceEvent['type'];
  at?: string;
  workedSec?: number;
  breakSec?: number;
  addedBreakSec?: number;
}

/**
 * Structured result of an attendance action. A failed action never throws — it
 * returns the server's real code + message so the UI can react precisely (e.g.
 * GEOFENCE_NOTE_REQUIRED opens the "add a reason" step).
 */
export interface PunchOutcome {
  ok: boolean;
  code?: string;
  message?: string;
  distanceM?: number;
  radiusM?: number;
}

export function useAttendance(notificationLink: string = '/agent/check-in') {
  const { user } = useAuth();
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [todays, setTodays] = useState<AttendanceSession[]>([]);
  const [policy, setPolicy] = useState<AttendancePolicy | null>(null);
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [breakTypes, setBreakTypes] = useState<BreakType[]>([]);
  const [openShift, setOpenShift] = useState<{ active: boolean; abandoned: boolean }>({ active: false, abandoned: false });
  const [autoClosed, setAutoClosed] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<AttendanceEvent | null>(null);
  const skipFirstNotify = useRef(true);
  // Guards against double-firing a punch (double-click, retries, React
  // StrictMode). Combined with the server-side race guard this guarantees a
  // single open shift per user.
  const punchingRef = useRef(false);

  const invoke = useCallback(async (action: string, payload?: { location?: PunchLocation; note?: string; break_type?: string; break_type_id?: string; device?: Record<string, unknown> }): Promise<PunchOutcome & { payload?: AttendancePayload }> => {
    setBusy(true);
    setError(null);
    setErrorCode(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('og-checkin', {
        body: {
          action,
          note: payload?.note,
          break_type: payload?.break_type,
          break_type_id: payload?.break_type_id,
          device: payload?.device,
          location: payload?.location
            ? {
              lat: payload.location.lat,
              lng: payload.location.lng,
              accuracy: payload.location.accuracy,
              label: payload.location.label,
              source: payload.location.source,
            }
            : undefined,
        },
      });
      // A non-2xx response (e.g. GEOFENCE_NOTE_REQUIRED) arrives as `fnErr` with
      // the body on `error.context`; a 2xx arrives as `data`. Read both so the
      // real error code + details are never swallowed.
      let body: unknown = data;
      if (fnErr && (fnErr as { context?: Response }).context) {
        try { body = await (fnErr as { context: Response }).context.json(); } catch { /* keep data */ }
      }
      const j = (body as Record<string, unknown>) || {};
      if (fnErr || j.error) {
        const code = (j.error as string) || 'ERROR';
        const msg = (j.message as string) || code || 'Something went wrong. Please try again.';
        setErrorCode(code);
        // A geofence hit is a normal workflow prompt, not a failure banner.
        if (code !== 'GEOFENCE_NOTE_REQUIRED') setError(msg);
        return { ok: false, code, message: msg, distanceM: j.distanceM as number | undefined, radiusM: j.radiusM as number | undefined };
      }
      const r = j as unknown as AttendancePayload;
      setSession(r.session || null);
      setTodays(r.todays || []);
      setPolicy(r.policy || null);
      setSchedule(r.schedule || null);
      setBreakTypes(r.breakTypes || []);
      setOpenShift(r.openShift || { active: false, abandoned: false });
      setAutoClosed(r.autoClosed || []);
      if (r.event) {
        setLastEvent({ type: r.event, at: r.at || new Date().toISOString(), workedSec: r.workedSec, breakSec: r.breakSec, addedBreakSec: r.addedBreakSec });
        if ((r.event === 'punch_in' || r.event === 'punch_out') && user?.id) {
          void pushNotification({
            recipient_id: user.id,
            type: 'attendance',
            title: r.event === 'punch_in' ? 'You punched in' : 'You punched out',
            body: r.event === 'punch_in' ? 'Your shift has started.' : 'Your shift has ended.',
            link: notificationLink,
          });
        }
      }
      return { ok: true, payload: r };
    } catch {
      setError('Could not reach the attendance service.');
      setErrorCode('NETWORK');
      return { ok: false, code: 'NETWORK', message: 'Could not reach the attendance service.' };
    } finally {
      setBusy(false);
    }
  }, [notificationLink, user?.id]);

  const status = useCallback(async () => invoke('status'), [invoke]);

  // Punch-in location is BEST-EFFORT. It only runs when the user explicitly
  // confirms a punch-in. Signing in, page load, refresh, session restoration
  // and presence NEVER call this.
  //
  // If the device can't return coordinates we STILL punch in — the server
  // stands in with the saved office location so the shift is always recorded. A
  // missing location must never block an agent from starting their shift.
  const punchIn = useCallback(async (note?: string, location?: PunchLocation): Promise<PunchOutcome> => {
    if (punchingRef.current) return { ok: false, code: 'IN_FLIGHT', message: 'A punch is already in progress.' };

    let loc = location;
    if (!loc || !isValidCoords(loc.lat, loc.lng)) {
      const det = await detectPunchLocation();
      if (isValidCoords(det.location.lat, det.location.lng)) loc = det.location;
    }

    const device = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: (typeof navigator !== 'undefined' && (navigator as unknown as { platform?: string }).platform) || '',
      secureContext: typeof window !== 'undefined' ? window.isSecureContext : null,
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })(),
    };

    punchingRef.current = true;
    try {
      return await invoke('punch_in', { location: loc, note, device });
    } finally {
      punchingRef.current = false;
    }
  }, [invoke]);

  // Punch-out never PROMPTS for location: it only attaches coordinates when the
  // permission is already granted, so ending a shift can't surprise the user
  // with a location dialog. Attendance state never depends on this.
  const punchOut = useCallback(async (note?: string) => {
    let loc: PunchLocation | undefined;
    if (await hasGeolocationPermission()) {
      const pos = await getBrowserPosition(9000);
      if (pos && isValidCoords(pos.lat, pos.lng)) {
        loc = { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, label: '', source: 'browser_geolocation' };
      }
    }
    await invoke('punch_out', { location: loc, note });
  }, [invoke]);

  const startBreak = useCallback((breakType?: string, breakTypeId?: string) => invoke('break_start', { break_type: breakType, break_type_id: breakTypeId }), [invoke]);
  const endBreak = useCallback(() => invoke('break_end'), [invoke]);

  // Read-only polling — refreshes the authoritative state, NEVER mutates it.
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    void invoke('status').finally(() => setLoading(false));
    const t = setInterval(() => void invoke('status'), 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') void invoke('status'); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [user, invoke]);

  useEffect(() => { skipFirstNotify.current = false; }, []);

  const state: AttendanceState = !session ? 'off_clock' : session.status === 'break' ? 'on_break' : 'punched_in';

  return {
    session, todays, policy, schedule, breakTypes, openShift, state,
    loading, busy, error, errorCode, lastEvent, autoClosed,
    punchIn, punchOut, startBreak, endBreak, refresh: status,
    clearError: () => { setError(null); setErrorCode(null); },
    clearEvent: () => setLastEvent(null),
    clearAutoClosed: () => setAutoClosed([]),
  };
}