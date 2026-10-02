// OGroup Attendance — server-authoritative punch clock.
//
// ── DESIGN CONTRACT ────────────────────────────────────────────────────────
// Attendance is a SEPARATE system from online presence. Nothing here reads or
// writes presence. A punch is ONLY ever the result of an explicit user action.
//
// State machine (session.status):
//   OFF_CLOCK  → PUNCHED_IN ('working')
//   PUNCHED_IN → ON_BREAK ('break')  /  PUNCHED_OUT ('completed')
//   ON_BREAK   → PUNCHED_IN ('working')
//
// "Open session" = latest session for the user with clock_out_at IS NULL and
// status IN ('working','break'). This is the single source of truth.
//
// Every accepted transition appends an immutable row to og_attendance_events.
// Every rejected transition appends to og_attendance_errors.
// Timestamps, user id and derived fields are ALWAYS computed server-side.
// The ONLY automatic punch-out is the shift-length guard below (a shift that
// reaches the configured maximum length is closed at the cap).
import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Two clients: anon-key client ONLY for verifying the caller's JWT; the
// service-role client ONLY for privileged database work.
const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function secsBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 1000));
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const OPEN_STATUSES = ['working', 'break'];

/**
 * The ONE canonical mapping of an internal location source onto a value the
 * database accepts.
 *
 * `og_attendance_sessions.location_method` is CHECK-constrained
 * (`og_attendance_sessions_location_method_check`) and only accepts a small,
 * fixed set of technical values — NOT free-form origins like
 * 'browser_geolocation', 'office_fallback', 'unavailable', or a display
 * address. Writing the raw origin here is what violated that constraint and
 * broke every punch-in.
 *
 * The granular origin is preserved separately in `location_source`. Here we
 * only ever emit a value from the table's allowed set:
 *   - 'gps'  → usable coordinates exist (device fix OR office stand-in)
 *   - 'none' → no coordinates at all
 */
function toLocationMethod(hasCoords: boolean): 'gps' | 'none' {
  return hasCoords ? 'gps' : 'none';
}

/** Great-circle distance in metres. */
function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

interface GeofenceResult {
  /** True when the punch is OUTSIDE the allowed radius. */
  flagged: boolean;
  distanceM: number | null;
  radiusM: number | null;
}

/**
 * Org-wide remote work switch. Stored as a single row (id = 1) in
 * og_attendance_settings. When ON, the geofence is purely informational — a
 * punch from anywhere (Kololo, Nairobi, or fully remote) is treated as inside
 * and NEVER flagged. Defaults to TRUE when the row/table is absent, so a
 * missing configuration can never stop a team from working.
 */
async function remoteWorkAllowed(): Promise<boolean> {
  try {
    const { data } = await admin.from('og_attendance_settings').select('allow_remote').eq('id', 1).maybeSingle();
    if (data && typeof data.allow_remote === 'boolean') return data.allow_remote;
  } catch { /* table not created yet — fall through to the safe default */ }
  return true;
}

/**
 * Evaluate the configured geofence for a punch.
 *
 * Resolution order for the office: the per-user policy's office_location_id,
 * then the office marked is_default. A missing/disabled office or a 0 radius
 * NEVER flags a valid punch — absence of configuration must not block work.
 * Returns the measured distance too, so an out-of-range punch can explain why.
 *
 * Short-circuits to NOT-FLAGGED when org-wide remote work is on (the default)
 * or when the employee's policy mode is 'remote'.
 */
async function geofenceStatus(userId: string, lat: number, lng: number, allowRemote: boolean): Promise<GeofenceResult> {
  const none: GeofenceResult = { flagged: false, distanceM: null, radiusM: null };
  // Remote work enabled for everyone → the geofence never flags a punch.
  if (allowRemote) return none;
  try {
    const { data: policy } = await admin.from('og_attendance_policies')
      .select('allowed_radius_m, office_location_id, mode').eq('user_id', userId).maybeSingle();
    // An employee explicitly set to Remote is never tied to an office.
    if (policy?.mode === 'remote') return none;
    let office: { latitude: number | null; longitude: number | null; radius_m: number | null; enabled: boolean | null } | null = null;
    if (policy?.office_location_id) {
      const { data } = await admin.from('og_office_locations')
        .select('latitude, longitude, radius_m, enabled').eq('id', policy.office_location_id).maybeSingle();
      office = data;
    }
    if (!office) {
      const { data } = await admin.from('og_office_locations')
        .select('latitude, longitude, radius_m, enabled').eq('is_default', true).limit(1).maybeSingle();
      office = data;
    }
    if (!office || office.enabled === false) return none;
    if (office.latitude == null || office.longitude == null) return none;
    const radius = Number(policy?.allowed_radius_m || office.radius_m || 0);
    if (!radius || radius <= 0) return none;
    const distanceM = haversineM(lat, lng, Number(office.latitude), Number(office.longitude));
    return { flagged: distanceM > radius, distanceM: Math.round(distanceM), radiusM: radius };
  } catch {
    return none;
  }
}

// NOTE: there is deliberately NO office-stand-in fallback. A punch-in requires
// real coordinates now (device fix or a manually chosen place). The
// human-readable label is enrichment only and is never a requirement.

// ── Shift length guard ─────────────────────────────────────────────────────
// A shift may NEVER run longer than the configured maximum (default 12 hours).
// When the cap is reached the session is closed automatically AT the exact cap
// and tagged so an admin can review it. The limit is per-user and adjustable in
// Attendance Settings (og_attendance_policies.max_shift_minutes).
const DEFAULT_MAX_SHIFT_MINUTES = 720; // 12 hours
const AUTO_TIMEOUT_MARKER = 'auto_timeout';
// Prefix of the auto-close note. The UI detects an automatic punch-out from
// this, NOT from location_method (which is a CHECK-constrained enum and can
// never hold a punch-out reason).
const AUTO_CLOSE_NOTE_PREFIX = 'Auto punched out:';

function maxShiftSecFor(policy: any): number {
  const mins = Number(policy?.max_shift_minutes);
  return (Number.isFinite(mins) && mins > 0 ? mins : DEFAULT_MAX_SHIFT_MINUTES) * 60;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
  if (authErr || !user) return json(401, { error: 'Unauthorized' });
  const userId = user.id;

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  const action: string = body?.action || 'status';
  const loc = body?.location || {};
  const note: string | null = typeof body?.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : null;
  // Resolved location label + source are stored VERBATIM from the client. A
  // punch is never blocked here for a missing location - the client only calls
  // punch_in once it has a usable location (device, geocoder, or an explicitly
  // chosen one), and this handler records exactly what it was given.
  const locLabel: string | null = typeof loc?.label === 'string' && loc.label.trim() ? loc.label.trim().slice(0, 300) : null;
  const locSource: string = typeof loc?.source === 'string' && loc.source.trim()
    ? loc.source.trim()
    : (loc?.lat != null ? 'browser_geolocation' : 'none');
  // Coordinates are re-validated here, not just on the client: a missing,
  // non-numeric, out-of-range or `0,0` placeholder fix is never stored.
  const latNum = Number(loc?.lat);
  const lngNum = Number(loc?.lng);
  const accuracyNum = loc?.accuracy != null && Number.isFinite(Number(loc.accuracy)) ? Number(loc.accuracy) : null;
  const coordsValid = Number.isFinite(latNum) && Number.isFinite(lngNum)
    && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180
    && !(latNum === 0 && lngNum === 0);

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  const { data: profile } = await admin.from('profiles').select('role').eq('user_id', userId).maybeSingle();
  const role = profile?.role || 'agent';
  const isAdmin = role === 'admin' || role === 'super_admin';

  async function logError(errorType: string, detail: string, targetUser: string | null = userId) {
    try { await admin.from('og_attendance_errors').insert({ user_id: targetUser, error_type: errorType, detail }); } catch { /* non-fatal */ }
  }

  async function logEvent(row: Record<string, unknown>) {
    try { await admin.from('og_attendance_events').insert(row); } catch { /* non-fatal */ }
  }

  async function logAudit(row: Record<string, unknown>) {
    try { await admin.from('og_attendance_audit').insert(row); } catch { /* non-fatal */ }
  }

  async function readOpenSession(targetUser: string) {
    const { data } = await admin.from('og_attendance_sessions')
      .select('*')
      .eq('user_id', targetUser)
      .is('clock_out_at', null)
      .in('status', OPEN_STATUSES)
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data || null;
  }

  /**
   * Auto punch-out guard. Closes every open session that has passed its user's
   * maximum shift length, at EXACTLY the cap (never beyond), tags it as an
   * automatic timeout and logs the event. Runs on every attendance call so a
   * forgotten shift self-heals the next time the agent touches attendance
   * (the 60s status poll) or an admin sweeps the org.
   */
  async function closeExpiredOpenSessions(scopeUserIds?: string[]): Promise<any[]> {
    let q = admin.from('og_attendance_sessions')
      .select('id, user_id, clock_in_at, break_sec, note')
      .is('clock_out_at', null)
      .in('status', OPEN_STATUSES);
    if (scopeUserIds && scopeUserIds.length) q = q.in('user_id', scopeUserIds);
    const { data: openRows } = await q;
    if (!openRows || openRows.length === 0) return [];
    const userIds = Array.from(new Set(openRows.map((r: any) => r.user_id)));
    const { data: policies } = await admin.from('og_attendance_policies')
      .select('user_id, max_shift_minutes, work_start_time, work_end_time, overtime_threshold_min')
      .in('user_id', userIds);
    const policyByUser = new Map<string, any>();
    (policies || []).forEach((p: any) => policyByUser.set(p.user_id, p));
    const closed: any[] = [];
    for (const row of openRows as any[]) {
      const policy = policyByUser.get(row.user_id);
      const capSec = maxShiftSecFor(policy);
      const capMs = new Date(row.clock_in_at).getTime() + capSec * 1000;
      if (now.getTime() < capMs) continue;
      const breakSec = row.break_sec || 0;
      const workedSec = Math.max(0, capSec - breakSec);
      const hours = Math.round(capSec / 3600);
      const autoNote = `${AUTO_CLOSE_NOTE_PREFIX} shift reached the ${hours}-hour limit.`;
      // `location_method` is a CHECK-constrained enum describing HOW the
      // clock-in coordinates were obtained ('gps' | 'manual' | 'none'). A
      // punch-out reason is NOT a location method, so it must NEVER be written
      // there — doing so violated og_attendance_sessions_location_method_check
      // and made the auto-close fail its first write every time. The reason is
      // recorded in `note` instead (detected by AUTO_CLOSE_NOTE_PREFIX).
      const closePatch: Record<string, unknown> = {
        clock_out_at: new Date(capMs).toISOString(),
        status: 'completed',
        break_started_at: null,
        hours_worked_sec: workedSec,
        overtime_sec: computeOvertime(workedSec, policy),
        timesheet_status: 'open',
        note: row.note ? `${row.note} · ${autoNote}` : autoNote,
      };
      const { data: updated, error: closeErr } = await admin.from('og_attendance_sessions')
        .update(closePatch).eq('id', row.id).select('*').single();
      if (closeErr) await logError('auto_close_failed', closeErr.message);
      await logEvent({ user_id: row.user_id, session_id: row.id, event_type: 'punch_out', occurred_at: new Date(capMs).toISOString(), note: autoNote, source: AUTO_TIMEOUT_MARKER });
      await logAudit({ session_id: row.id, user_id: row.user_id, action: 'auto_punch_out', field: 'clock_out_at', new_value: new Date(capMs).toISOString(), reason: autoNote });
      if (updated) closed.push(updated);
    }
    return closed;
  }

  function currentBreakSec(session: any): number {
    const base = session.break_sec || 0;
    if (session.status === 'break' && session.break_started_at) {
      return base + secsBetween(new Date(session.break_started_at), now);
    }
    return base;
  }

  async function statusPayload(targetUser: string, autoClosed: any[] = []) {
    const openSession = await readOpenSession(targetUser);
    const { data: todaysSessions } = await admin.from('og_attendance_sessions')
      .select('*').eq('user_id', targetUser).gte('clock_in_at', todayStart.toISOString())
      .order('clock_in_at', { ascending: true });
    const { data: policy } = await admin.from('og_attendance_policies').select('*').eq('user_id', targetUser).maybeSingle();
    const { data: breakTypes } = await admin.from('og_break_types').select('*').eq('enabled', true).order('sort_order', { ascending: true });
    const { data: schedule } = await admin.from('og_work_schedules').select('*').eq('user_id', targetUser).eq('enabled', true).maybeSingle();
    const openShiftAbandoned = !!openSession && !sameDay(new Date(openSession.clock_in_at), now);
    return {
      session: openSession,
      todays: todaysSessions || [],
      mode: policy?.mode || 'hybrid',
      policy: policy || null,
      schedule: schedule || null,
      breakTypes: breakTypes || [],
      openShift: { active: !!openSession, abandoned: openShiftAbandoned },
      autoClosed,
    };
  }

  try {
    if (action === 'status') {
      const autoClosed = await closeExpiredOpenSessions([userId]);
      return json(200, await statusPayload(userId, autoClosed));
    }

    // Self-heal: never let an over-length shift survive. Any open session past
    // its cap is closed BEFORE this action is evaluated.
    const autoClosed = await closeExpiredOpenSessions([userId]);
    const openSession = await readOpenSession(userId);

    if (action === 'punch_in') {
      if (openSession) {
        await logError('duplicate_punch_in', `Open session ${openSession.id} status=${openSession.status}`);
        return json(409, { error: 'ALREADY_PUNCHED_IN', message: 'You already have an open shift. Punch out first.' });
      }
      // Location is REQUIRED for a punch-in. The client only submits after the
      // user explicitly confirms a detected (device) or manually chosen place,
      // so valid coordinates must be present. Coordinates are the authoritative
      // evidence; the readable label is enrichment only. A coordinate-less punch
      // is rejected — there is NO office stand-in.
      if (!coordsValid) {
        await logError('location_required', `punch_in rejected without valid coords (lat=${loc?.lat}, lng=${loc?.lng}, source=${locSource})`);
        return json(400, { error: 'LOCATION_REQUIRED', message: 'We need your location to punch in. Enable location access and try again.' });
      }
      const effLat: number | null = latNum;
      const effLng: number | null = lngNum;
      const effAcc: number | null = accuracyNum;
      const effSource: string = locSource;
      const effLabel: string | null = locLabel;

      // The geofence is INFORMATIONAL only: an out-of-radius punch is recorded
      // and flagged for an admin to review, but it is NEVER blocked and never
      // asks the agent for a reason.
      const geo = (effLat != null && effLng != null)
        ? await geofenceStatus(userId, effLat, effLng, await remoteWorkAllowed())
        : { flagged: false, distanceM: null, radiusM: null };

      const { data, error } = await admin.from('og_attendance_sessions').insert({
        user_id: userId,
        clock_in_at: now.toISOString(),
        status: 'working',
        clock_in_latitude: effLat,
        clock_in_longitude: effLng,
        clock_in_accuracy: effAcc,
        // CHECK-constrained technical value — NEVER the granular origin.
        location_method: toLocationMethod(effLat != null && effLng != null),
        location_source: effSource,
        clock_in_location_label: effLabel,
        note,
        device_metadata: body.device || null,
        flagged_geofence: geo.flagged,
        timesheet_status: 'open',
      }).select('*').single();
      if (error) {
        // Never leak raw SQL/constraint text to an agent — log it, return a
        // truthful, layer-specific message instead.
        await logError('punch_in_failed', `punch_in insert rejected: ${error.message}`);
        return json(500, { error: 'DB_ERROR', message: "We couldn't start your attendance session. Please try again." });
      }

      // ── Race guard: at most ONE open session per user. Concurrent punches
      // (double-click, retries, multiple tabs) each insert, then every loser
      // removes its own row so exactly one shift survives.
      const { data: openRows } = await admin.from('og_attendance_sessions')
        .select('id')
        .eq('user_id', userId)
        .is('clock_out_at', null)
        .in('status', OPEN_STATUSES)
        .order('clock_in_at', { ascending: true })
        .order('id', { ascending: true });
      const winner = (openRows || [])[0];
      if (winner && winner.id !== data.id) {
        await admin.from('og_attendance_sessions').delete().eq('id', data.id);
        await logError('duplicate_punch_in', `Race: kept ${winner.id}, discarded ${data.id}`);
        return json(200, { ...(await statusPayload(userId, autoClosed)), event: 'punch_in', at: now.toISOString() });
      }

      await logEvent({ user_id: userId, session_id: data.id, event_type: 'punch_in', occurred_at: now.toISOString(), note, latitude: effLat, longitude: effLng, accuracy: effAcc, location_label: effLabel, source: effSource });
      await logAudit({ session_id: data.id, user_id: userId, action: 'punch_in', actor_id: userId });
      return json(200, { ...(await statusPayload(userId, autoClosed)), event: 'punch_in', at: now.toISOString() });
    }

    if (action === 'punch_out') {
      if (!openSession) {
        await logError('punch_out_without_shift', 'No open session');
        return json(400, { error: 'NO_SESSION', message: 'You are not punched in.' });
      }
      const abandoned = !sameDay(new Date(openSession.clock_in_at), now);
      if (openSession.status === 'break' && !abandoned) {
        await logError('invalid_transition', 'ON_BREAK → PUNCHED_OUT blocked');
        return json(409, { error: 'ON_BREAK', message: 'End your break before punching out.' });
      }
      const breakSec = currentBreakSec(openSession);
      const grossSec = secsBetween(new Date(openSession.clock_in_at), now);
      const workedSec = Math.max(0, grossSec - breakSec);

      const { data: policy } = await admin.from('og_attendance_policies').select('*').eq('user_id', userId).maybeSingle();
      const { data, error } = await admin.from('og_attendance_sessions').update({
        clock_out_at: now.toISOString(),
        status: 'completed',
        clock_out_latitude: coordsValid ? latNum : null,
        clock_out_longitude: coordsValid ? lngNum : null,
        clock_out_accuracy: coordsValid ? accuracyNum : null,
        clock_out_location_label: locLabel,
        break_sec: breakSec,
        break_started_at: null,
        hours_worked_sec: workedSec,
        overtime_sec: computeOvertime(workedSec, policy),
        late_sec: computeLate(openSession.clock_in_at, policy),
        early_depart_sec: computeEarly(now, policy),
        timesheet_status: 'open',
      }).eq('id', openSession.id).select('*').single();
      if (error) {
        await logError('punch_out_failed', `punch_out update rejected: ${error.message}`);
        return json(500, { error: 'DB_ERROR', message: "We couldn't close your attendance session. Please try again." });
      }
      await logEvent({ user_id: userId, session_id: data.id, event_type: 'punch_out', occurred_at: now.toISOString(), note, latitude: coordsValid ? latNum : null, longitude: coordsValid ? lngNum : null, accuracy: coordsValid ? accuracyNum : null, location_label: locLabel, source: abandoned ? 'web_recovered' : 'web' });
      await logAudit({ session_id: data.id, user_id: userId, action: 'punch_out', actor_id: userId });
      return json(200, { ...(await statusPayload(userId, autoClosed)), event: 'punch_out', at: now.toISOString(), workedSec, breakSec });
    }

    if (action === 'break_start') {
      if (!openSession) {
        await logError('break_without_shift', 'break_start with no open session');
        return json(400, { error: 'NO_SESSION', message: 'You must be punched in to start a break.' });
      }
      if (openSession.status === 'break') {
        await logError('invalid_transition', 'ON_BREAK → ON_BREAK blocked');
        return json(409, { error: 'ALREADY_ON_BREAK', message: 'You are already on a break.' });
      }
      const breakType = typeof body?.break_type === 'string' && body.break_type.trim() ? body.break_type.trim() : 'Other';
      const { data, error } = await admin.from('og_attendance_sessions').update({
        status: 'break',
        break_started_at: now.toISOString(),
        break_type: breakType,
      }).eq('id', openSession.id).select('*').single();
      if (error) return json(500, { error: error.message });
      await logEvent({ user_id: userId, session_id: data.id, event_type: 'break_start', occurred_at: now.toISOString(), break_type: breakType, break_type_id: body?.break_type_id ?? null, note, source: 'web' });
      return json(200, { ...(await statusPayload(userId, autoClosed)), event: 'break_start', at: now.toISOString() });
    }

    if (action === 'break_end') {
      if (!openSession) {
        await logError('break_end_without_shift', 'break_end with no open session');
        return json(400, { error: 'NO_SESSION', message: 'You are not punched in.' });
      }
      if (openSession.status !== 'break') {
        await logError('invalid_transition', 'not on break → break_end blocked');
        return json(409, { error: 'NOT_ON_BREAK', message: 'You are not on a break.' });
      }
      const added = openSession.break_started_at ? secsBetween(new Date(openSession.break_started_at), now) : 0;
      const { data, error } = await admin.from('og_attendance_sessions').update({
        status: 'working',
        break_sec: (openSession.break_sec || 0) + added,
        break_started_at: null,
      }).eq('id', openSession.id).select('*').single();
      if (error) return json(500, { error: error.message });
      await logEvent({ user_id: userId, session_id: data.id, event_type: 'break_end', occurred_at: now.toISOString(), break_type: openSession.break_type, note, source: 'web' });
      return json(200, { ...(await statusPayload(userId, autoClosed)), event: 'break_end', at: now.toISOString(), addedBreakSec: added });
    }

    if (action === 'submit_timesheet') {
      const from = body?.from as string;
      const to = body?.to as string;
      let q = admin.from('og_attendance_sessions').update({ timesheet_status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('user_id', userId).eq('status', 'completed').eq('timesheet_status', 'open');
      if (from) q = q.gte('clock_in_at', from);
      if (to) q = q.lte('clock_in_at', to);
      const { error } = await q;
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true, status: 'submitted' });
    }

    // ── ADMIN-ONLY ACTIONS ─────────────────────────────────────────────────
    if (!isAdmin) {
      await logError('permission_denied', `Non-admin attempted ${action}`);
      return json(403, { error: 'FORBIDDEN', message: 'Not permitted.' });
    }

    if (action === 'admin_sweep_expired') {
      const closed = await closeExpiredOpenSessions();
      return json(200, { ok: true, closed: closed.length });
    }

    if (action === 'admin_edit_time') {
      const sessionId = body?.session_id as string;
      const field = body?.field as string;
      const value = body?.value as string;
      const reason = (body?.reason as string) || '';
      if (!sessionId || !['clock_in', 'clock_out'].includes(field) || !value || !reason.trim()) {
        return json(400, { error: 'BAD_REQUEST', message: 'session_id, field, value and reason are required.' });
      }
      const { data: orig } = await admin.from('og_attendance_sessions').select('*').eq('id', sessionId).maybeSingle();
      if (!orig) return json(404, { error: 'NOT_FOUND' });
      const oldValue = field === 'clock_in' ? orig.clock_in_at : orig.clock_out_at;
      const patch: Record<string, unknown> = { [field]: new Date(value).toISOString() };
      const inAt = new Date(field === 'clock_in' ? patch[field] as string : orig.clock_in_at);
      const outAt = field === 'clock_out' ? new Date(patch[field] as string) : (orig.clock_out_at ? new Date(orig.clock_out_at) : null);
      if (outAt && outAt.getTime() > inAt.getTime()) {
        const gross = secsBetween(inAt, outAt);
        patch.hours_worked_sec = Math.max(0, gross - (orig.break_sec || 0));
      }
      if (field === 'clock_out' && !orig.clock_out_at) {
        patch.status = 'completed';
        patch.break_started_at = null;
      }
      const { data, error } = await admin.from('og_attendance_sessions').update(patch).eq('id', sessionId).select('*').single();
      if (error) return json(500, { error: error.message });
      await logAudit({ session_id: sessionId, user_id: orig.user_id, action: 'admin_edit_time', field, old_value: oldValue, new_value: patch[field] as string, reason, actor_id: userId });
      await logEvent({ user_id: orig.user_id, session_id: sessionId, event_type: field === 'clock_in' ? 'punch_in' : 'punch_out', occurred_at: patch[field] as string, note: `Admin edit: ${reason}`, source: 'admin', created_by: userId });
      return json(200, { session: data });
    }

    if (action === 'admin_review_correction') {
      const correctionId = body?.correction_id as string;
      const decision = body?.decision as string;
      const reviewerNote = (body?.note as string) || null;
      if (!correctionId || !['approved', 'rejected'].includes(decision)) {
        return json(400, { error: 'BAD_REQUEST' });
      }
      const { data: corr } = await admin.from('og_attendance_corrections').select('*').eq('id', correctionId).maybeSingle();
      if (!corr) return json(404, { error: 'NOT_FOUND' });
      await admin.from('og_attendance_corrections').update({ status: decision, reviewed_by: userId, reviewed_at: new Date().toISOString(), reviewer_note: reviewerNote }).eq('id', correctionId);
      if (decision === 'approved' && corr.session_id && corr.requested_clock_out_at) {
        const { data: sess } = await admin.from('og_attendance_sessions').select('*').eq('id', corr.session_id).maybeSingle();
        if (sess) {
          const inAt = new Date(sess.clock_in_at);
          const outAt = new Date(corr.requested_clock_out_at);
          const gross = secsBetween(inAt, outAt);
          await admin.from('og_attendance_sessions').update({
            clock_out_at: outAt.toISOString(),
            status: 'completed',
            hours_worked_sec: Math.max(0, gross - (sess.break_sec || 0)),
            break_started_at: null,
          }).eq('id', corr.session_id);
          await logAudit({ session_id: corr.session_id, user_id: corr.user_id, action: 'correction_approved', field: 'clock_out_at', old_value: sess.clock_out_at, new_value: outAt.toISOString(), reason: corr.reason, actor_id: userId });
        }
      }
      await logAudit({ session_id: corr.session_id, user_id: corr.user_id, action: `correction_${decision}`, reason: reviewerNote || corr.reason, actor_id: userId });
      return json(200, { ok: true, status: decision });
    }

    if (action === 'admin_timesheet_status') {
      const targetUser = body?.user_id as string;
      const statusValue = body?.status as string;
      const from = body?.from as string;
      const to = body?.to as string;
      if (!targetUser || !['approved', 'returned', 'submitted', 'open'].includes(statusValue)) {
        return json(400, { error: 'BAD_REQUEST' });
      }
      let q = admin.from('og_attendance_sessions').update(
        statusValue === 'approved'
          ? { timesheet_status: statusValue, approved_by: userId, approved_at: new Date().toISOString() }
          : { timesheet_status: statusValue },
      ).eq('user_id', targetUser).eq('status', 'completed');
      if (from) q = q.gte('clock_in_at', from);
      if (to) q = q.lte('clock_in_at', to);
      const { error } = await q;
      if (error) return json(500, { error: error.message });
      await logAudit({ user_id: targetUser, action: `timesheet_${statusValue}`, reason: body?.reason || null, actor_id: userId });
      return json(200, { ok: true, status: statusValue });
    }

    await logError('unknown_action', `Unknown action: ${action}`);
    return json(400, { error: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` });
  } catch (e: any) {
    await logError('server_error', e?.message || 'unknown');
    return json(500, { error: e?.message || 'Server error' });
  }
});

function computeOvertime(workedSec: number, policy: any): number {
  if (!policy) return Math.max(0, workedSec - 8 * 3600);
  if (policy.work_start_time && policy.work_end_time) {
    const [sh, sm] = String(policy.work_start_time).split(':').map(Number);
    const [eh, em] = String(policy.work_end_time).split(':').map(Number);
    const scheduledSec = ((eh * 60 + em) - (sh * 60 + sm)) * 60;
    const threshold = (policy.overtime_threshold_min || 0) * 60;
    return Math.max(0, workedSec - scheduledSec - threshold);
  }
  return Math.max(0, workedSec - 8 * 3600);
}

function computeLate(clockInIso: string, policy: any): number {
  if (!policy?.work_start_time) return 0;
  const start = new Date(clockInIso);
  const [h, m] = String(policy.work_start_time).split(':').map(Number);
  const scheduled = new Date(start); scheduled.setHours(h, m, 0, 0);
  const grace = (policy.lateness_grace_min || 0) * 60;
  return Math.max(0, secsBetween(scheduled, start) - grace);
}

function computeEarly(clockOutAt: Date, policy: any): number {
  if (!policy?.work_end_time) return 0;
  const [h, m] = String(policy.work_end_time).split(':').map(Number);
  const scheduled = new Date(clockOutAt); scheduled.setHours(h, m, 0, 0);
  return Math.max(0, secsBetween(clockOutAt, scheduled));
}
