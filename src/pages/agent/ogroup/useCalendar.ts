import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type {
  CalendarAppointment,
  AttendeeRow,
  AvailabilityRow,
  TimeOffRow,
  EventTypeRow,
  AppointmentStatus,
  AttendeeResponse,
  RecurrenceRule,
  CalendarFilters,
} from './calendarTypes';
import { overlaps, startOfDay, endOfDay, minutesBetween, weekdayIndex } from './calendarTypes';
import { applyAppointmentFilters } from './appointmentQuery';
import { logAppointmentActivity, type AppointmentAction } from './appointmentActivity';
import { buildOccurrences, type RecurringEditScope } from './recurrence';
import { mirrorAppointmentToTimelines } from './crmActivities';
import {
  notifyCreated, notifyChanged, notifyRescheduled, notifyCancelled,
} from './appointmentNotify';
import { sendAppointmentEmail } from './appointmentEmails';

export interface CalendarDraft {
  id?: string;
  title: string;
  kind: string;
  description?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  contact_ids?: string[];
  property_id?: string | null;
  property_title?: string | null;
  starts_at: string;
  ends_at: string;
  timezone?: string;
  location_type: string;
  location_text?: string | null;
  meeting_point?: string | null;
  notes?: string | null;
  reminder_minutes: number;
  reminders?: number[];
  intention?: string | null;
  outcome?: string | null;
  viewing_instructions?: string | null;
  recurrence_rule?: RecurrenceRule | null;
  assigned_user_id?: string | null;
  attendeeIds?: string[];
  /** Private appointments block availability but hide their details from non-participants. */
  is_private?: boolean;
  /** Set from "Keep anyway" — bypasses the conflict/working-hours guard. */
  allowConflict?: boolean;
}

export interface ConflictHit {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  reason?: 'agent' | 'property' | 'contact';
}

export function draftToPatch(draft: CalendarDraft): Record<string, unknown> {
  return {
    title: draft.title,
    kind: draft.kind,
    description: draft.description || null,
    client_name: draft.client_name || null,
    client_phone: draft.client_phone || null,
    client_email: draft.client_email || null,
    contact_ids: draft.contact_ids || [],
    property_id: draft.property_id || null,
    property_title: draft.property_title || null,
    starts_at: draft.starts_at,
    ends_at: draft.ends_at,
    timezone: draft.timezone || 'Africa/Nairobi',
    location_type: draft.location_type,
    location_text: draft.location_text || null,
    meeting_point: draft.meeting_point || null,
    notes: draft.notes || null,
    reminder_minutes: draft.reminder_minutes,
    intention: draft.intention || null,
    outcome: draft.outcome || null,
    viewing_instructions: draft.viewing_instructions || null,
    recurrence_rule: draft.recurrence_rule ?? null,
    recurrence: draft.recurrence_rule ? draft.recurrence_rule.frequency : null,
    is_private: !!draft.is_private,
  };
}

export function useCalendar() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffRow[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  /** Whether the current user may open the organisation-wide Company Calendar. */
  const [canManageCompany, setCanManageCompany] = useState(false);
  /** True once the company-calendar permission RPC has resolved (avoids pre-check flashing). */
  const [companyAccessChecked, setCompanyAccessChecked] = useState(false);
  /** Non-fatal email delivery notice surfaced to the user after a save. */
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const activeUserId = user?.id;

  const loadAppointments = useCallback(async (start: Date, end: Date, filters: CalendarFilters) => {
    if (!activeUserId) return;
    try {
      const base = supabase
        .from('og_appointments')
        .select('*')
        .gte('starts_at', start.toISOString())
        .lt('starts_at', end.toISOString())
        .order('starts_at', { ascending: true });
      const { data, error } = await applyAppointmentFilters(base, filters);
      if (error) throw error;
      const rows = (data || []) as CalendarAppointment[];

      const ids = rows.map((r) => r.id);
      const att: Record<string, AttendeeRow[]> = {};
      if (ids.length) {
        const { data: attRows } = await supabase
          .from('og_appointment_attendees')
          .select('*')
          .in('appointment_id', ids);
        (attRows || []).forEach((a) => {
          att[a.appointment_id] = att[a.appointment_id] || [];
          att[a.appointment_id].push(a as AttendeeRow);
        });
      }
      setAppointments(rows.map((r) => ({
        ...r,
        attendees: att[r.id] || [],
        is_attendee: (att[r.id] || []).some((a) => a.user_id === activeUserId),
      })));
    } catch {
      // Non-fatal per-range load.
    }
  }, [activeUserId]);

  const loadRanges = useCallback(async (start: Date, end: Date, filters: CalendarFilters) => {
    setLoading(true);
    await Promise.all([loadAppointments(start, end, filters)]);
    setLoading(false);
  }, [loadAppointments]);

  /**
   * Company Calendar — the organisation-wide view, loaded through the
   * `og_company_calendar` RPC so tenant/agent isolation and private-
   * appointment masking are enforced by the database, not the browser.
   */
  const loadCompanyRange = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('og_company_calendar', {
        p_start: start.toISOString(),
        p_end: end.toISOString(),
      });
      if (error) throw error;
      type Payload = { payload: CalendarAppointment };
      const rows = ((data || []) as Payload[]).map((r) => r.payload).filter(Boolean);
      setAppointments(rows);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Server-side, agency-wide search (title / client / property / phone / email). */
  const serverSearch = useCallback(async (term: string): Promise<CalendarAppointment[]> => {
    if (!activeUserId || term.trim().length < 2) return [];
    const clean = term.trim().replace(/[%,()]/g, ' ').trim();
    const { data, error } = await supabase
      .from('og_appointments')
      .select('*')
      .or([
        `title.ilike.%${clean}%`,
        `client_name.ilike.%${clean}%`,
        `property_title.ilike.%${clean}%`,
        `client_phone.ilike.%${clean}%`,
        `client_email.ilike.%${clean}%`,
        `location_text.ilike.%${clean}%`,
      ].join(','))
      .order('starts_at', { ascending: false })
      .limit(25);
    if (error) return [];
    return (data || []) as CalendarAppointment[];
  }, [activeUserId]);

  const loadMeta = useCallback(async () => {
    if (!activeUserId) return;
    const [avail, toff, et] = await Promise.all([
      supabase.from('og_availability').select('*').eq('user_id', activeUserId),
      supabase.from('og_time_off').select('*').eq('user_id', activeUserId),
      supabase.from('og_event_types').select('*').eq('enabled', true),
    ]);
    setAvailability((avail.data || []) as AvailabilityRow[]);
    setTimeOff((toff.data || []) as TimeOffRow[]);
    setEventTypes((et.data || []) as EventTypeRow[]);
  }, [activeUserId]);

  useEffect(() => {
    if (!activeUserId) return;
    void loadMeta();
  }, [activeUserId, loadMeta]);

  // Resolve whether this user may open the Company Calendar (DB-enforced).
  useEffect(() => {
    if (!activeUserId) { setCompanyAccessChecked(true); return; }
    let active = true;
    setCompanyAccessChecked(false);
    void (async () => {
      try {
        const { data } = await supabase.rpc('og_can_manage_company_calendar');
        if (active) setCanManageCompany(!!data);
      } catch {
        if (active) setCanManageCompany(false);
      } finally {
        if (active) setCompanyAccessChecked(true);
      }
    })();
    return () => { active = false; };
  }, [activeUserId]);

  /**
   * Authoritative, server-side conflict check: agent double-booking,
   * property double-booking and applicant double-booking. Bounded to the
   * requested time window so it never scans the whole table.
   */
  const findConflicts = useCallback(async (draft: CalendarDraft): Promise<ConflictHit[]> => {
    const s = draft.starts_at;
    const e = draft.ends_at;
    let q = supabase
      .from('og_appointments')
      .select('id,title,starts_at,ends_at,kind,property_id,contact_ids,assigned_user_id')
      .lt('starts_at', e)
      .gt('ends_at', s)
      .not('status', 'in', '("cancelled","no_show")');
    if (draft.id) q = q.neq('id', draft.id);
    const { data, error } = await q;
    if (error) return [];
    const owner = draft.assigned_user_id || activeUserId;
    const rows = (data || []) as unknown as Array<{
      id: string; title: string; starts_at: string; ends_at: string;
      property_id: string | null; contact_ids: string[] | null; assigned_user_id: string | null;
    }>;
    const hits: ConflictHit[] = [];
    rows.forEach((r) => {
      if (owner && r.assigned_user_id === owner) {
        hits.push({ id: r.id, title: r.title, starts_at: r.starts_at, ends_at: r.ends_at, reason: 'agent' });
      } else if (draft.property_id && r.property_id === draft.property_id) {
        hits.push({ id: r.id, title: r.title, starts_at: r.starts_at, ends_at: r.ends_at, reason: 'property' });
      } else if (draft.contact_ids?.length && (r.contact_ids || []).some((cid) => draft.contact_ids!.includes(cid))) {
        hits.push({ id: r.id, title: r.title, starts_at: r.starts_at, ends_at: r.ends_at, reason: 'contact' });
      }
    });
    return hits;
  }, [activeUserId]);

  const isWithinWorkingHours = useCallback((draft: CalendarDraft): boolean => {
    const start = new Date(draft.starts_at);
    const end = new Date(draft.ends_at);
    const blockedByTimeOff = timeOff.some((t) => t.kind !== 'holiday' && overlaps(start, end, new Date(t.starts_at), new Date(t.ends_at)));
    if (blockedByTimeOff) return false;
    const wdIdx = weekdayIndex(start);
    const slot = availability.find((a) => a.weekday === wdIdx && a.is_working);
    if (slot) {
      const startMin = start.getHours() * 60 + start.getMinutes();
      const endMin = end.getHours() * 60 + end.getMinutes();
      const [sh, sm] = slot.start_time.split(':').map(Number);
      const [eh, em] = slot.end_time.split(':').map(Number);
      const slotStart = sh * 60 + sm;
      const slotEnd = eh * 60 + em;
      if (startMin < slotStart || endMin > slotEnd) return false;
    }
    return true;
  }, [availability, timeOff]);

  /** Insert a parent appointment + its recurring occurrences + reminders. */
  const insertSeries = useCallback(async (draft: CalendarDraft): Promise<CalendarAppointment> => {
    if (!activeUserId) throw new Error('Not authenticated');
    const assignee = draft.assigned_user_id || activeUserId;
    const { data, error } = await supabase
      .from('og_appointments')
      .insert({
        ...draftToPatch(draft),
        created_by: activeUserId,
        assigned_user_id: assignee,
        status: 'scheduled',
      })
      .select('*')
      .single();
    if (error) throw error;
    const parent = data as CalendarAppointment;

    if (draft.recurrence_rule) {
      const occ = buildOccurrences(draft.starts_at, draft.ends_at, draft.recurrence_rule);
      const children = occ.slice(1).map((o) => ({
        ...draftToPatch(draft),
        starts_at: o.starts_at,
        ends_at: o.ends_at,
        created_by: activeUserId,
        assigned_user_id: assignee,
        status: 'scheduled',
        recurrence_parent_id: parent.id,
      }));
      if (children.length) {
        await supabase.from('og_appointments').insert(children);
      }
    }

    const offsets = (draft.reminders && draft.reminders.length ? draft.reminders : [draft.reminder_minutes])
      .filter((m) => m > 0);
    if (offsets.length) {
      await supabase.from('og_appointment_reminders').insert(
        offsets.map((m) => ({ appointment_id: parent.id, minutes_before: m, channel: 'in_app', created_by: activeUserId })),
      );
    }
    return parent;
  }, [activeUserId]);

  const createAppointment = useCallback(async (draft: CalendarDraft): Promise<CalendarAppointment> => {
    if (!activeUserId) throw new Error('Not authenticated');
    if (!draft.allowConflict) {
      const conflicts = await findConflicts(draft);
      if (conflicts.length) {
        throw new Error(`Time clashes with ${conflicts[0].title} (${new Date(conflicts[0].starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}). Pick a free slot.`);
      }
      if (!isWithinWorkingHours(draft)) {
        throw new Error('This slot is outside your working hours or falls in scheduled time off.');
      }
    }
    const parent = await insertSeries(draft);

    await logAppointmentActivity({
      appointment_id: parent.id,
      actor_id: activeUserId,
      action: 'created',
      summary: `${draft.title} scheduled`,
    });
    await mirrorAppointmentToTimelines({
      appointmentId: parent.id,
      kind: draft.kind,
      action: 'created',
      title: draft.title,
      propertyId: draft.property_id,
      contactIds: draft.contact_ids,
      agentId: parent.assigned_user_id,
      actorId: activeUserId,
    });

    if (draft.attendeeIds?.length) {
      await supabase.from('og_appointment_attendees').insert(
        draft.attendeeIds.map((uid) => ({ appointment_id: parent.id, user_id: uid, response: 'pending' })),
      );
    }
    await notifyCreated(
      { ...parent, attendees: (draft.attendeeIds || []).map((uid) => ({ id: uid, appointment_id: parent.id, user_id: uid, response: 'pending' as AttendeeResponse, responded_at: null })) },
      activeUserId,
      draft.attendeeIds || [],
    );

    setAppointments((prev) => [...prev, { ...parent, attendees: [] }]);

    // Email confirmation is attempted ONLY after the appointment is committed.
    const email = await sendAppointmentEmail(parent.id, 'confirmation');
    if (email.notice) setEmailNotice(email.notice);
    return parent;
  }, [activeUserId, findConflicts, isWithinWorkingHours, insertSeries]);

  const updateAppointment = useCallback(async (id: string, draft: CalendarDraft): Promise<void> => {
    if (!draft.allowConflict) {
      const conflicts = await findConflicts({ ...draft, id });
      if (conflicts.length) throw new Error('Reschedule clashes with another appointment.');
      if (!isWithinWorkingHours(draft)) throw new Error('This slot is outside your working hours or time off.');
    }
    const prev = appointments.find((a) => a.id === id);
    const timeChanged = !!prev && (prev.starts_at !== draft.starts_at || prev.ends_at !== draft.ends_at);
    const { error } = await supabase
      .from('og_appointments')
      .update({
        ...draftToPatch(draft),
        ...(timeChanged ? { status: 'rescheduled' as AppointmentStatus } : {}),
      })
      .eq('id', id);
    if (error) throw error;

    const merged = { ...(prev ?? (null as unknown as CalendarAppointment)), ...draft, attendees: prev?.attendees || [] } as CalendarAppointment;
    if (timeChanged && prev) {
      await logAppointmentActivity({
        appointment_id: id,
        actor_id: activeUserId,
        action: 'rescheduled',
        summary: 'Time changed',
        detail: { from: prev.starts_at, to: draft.starts_at, from_end: prev.ends_at, to_end: draft.ends_at },
      });
      await notifyRescheduled(merged, activeUserId, prev.starts_at);
    } else {
      await logAppointmentActivity({
        appointment_id: id,
        actor_id: activeUserId,
        action: 'edited',
        summary: 'Appointment details updated',
      });
      await notifyChanged(merged, activeUserId);
    }
    // Only notify externally for meaningful changes (time / agent / property).
    // Internal note or task edits must NOT email the applicant.
    const agentChanged = !!prev && prev.assigned_user_id !== (draft.assigned_user_id || null);
    const propertyChanged = !!prev && prev.property_id !== (draft.property_id ?? null);
    if (timeChanged || agentChanged || propertyChanged) {
      const evt = timeChanged ? 'rescheduled' : agentChanged ? 'reassigned' : 'confirmation';
      const email = await sendAppointmentEmail(id, evt, timeChanged ? prev?.starts_at : undefined);
      if (email.notice) setEmailNotice(email.notice);
    }

    setAppointments((prevList) => prevList.map((a) => (
      a.id === id ? ({ ...a, ...draft, status: timeChanged ? 'rescheduled' : a.status } as CalendarAppointment) : a
    )));
  }, [appointments, activeUserId, findConflicts, isWithinWorkingHours]);

  const fetchSeries = useCallback(async (parentId: string): Promise<CalendarAppointment[]> => {
    const { data, error } = await supabase
      .from('og_appointments')
      .select('*')
      .or(`id.eq.${parentId},recurrence_parent_id.eq.${parentId}`)
      .order('starts_at', { ascending: true });
    if (error) throw error;
    return (data || []) as CalendarAppointment[];
  }, []);

  const updateAppointmentScoped = useCallback(async (
    id: string,
    draft: CalendarDraft,
    scope: RecurringEditScope,
  ): Promise<void> => {
    const prev = appointments.find((a) => a.id === id);
    if (!prev || (!prev.recurrence_parent_id && !prev.recurrence_rule)) {
      await updateAppointment(id, draft);
      return;
    }
    const parentId = prev.recurrence_parent_id || prev.id;
    const cutoff = new Date(prev.starts_at).getTime();

    if (scope === 'this') {
      await supabase
        .from('og_appointments')
        .update({ recurrence_parent_id: null, recurrence_rule: null, recurrence: null })
        .eq('id', id);
      await updateAppointment(id, { ...draft, recurrence_rule: null });
      await logAppointmentActivity({
        appointment_id: id,
        actor_id: activeUserId,
        action: 'edited',
        summary: 'This occurrence detached from the series',
      });
      return;
    }

    const series = await fetchSeries(parentId);

    if (scope === 'series') {
      const delta = new Date(draft.starts_at).getTime() - new Date(prev.starts_at).getTime();
      const patch = draftToPatch({ ...draft, recurrence_rule: draft.recurrence_rule ?? prev.recurrence_rule });
      await Promise.all(series.map((row) => {
        const s = new Date(row.starts_at).getTime();
        const e = new Date(row.ends_at).getTime();
        return supabase
          .from('og_appointments')
          .update({
            ...patch,
            starts_at: new Date(s + delta).toISOString(),
            ends_at: new Date(e + delta).toISOString(),
          })
          .eq('id', row.id);
      }));
      await logAppointmentActivity({
        appointment_id: prev.id,
        actor_id: activeUserId,
        action: 'edited',
        summary: `Entire series updated (${series.length} appointments)`,
      });
      return;
    }

    const futureIds = series.filter((r) => new Date(r.starts_at).getTime() >= cutoff).map((r) => r.id);
    if (futureIds.length) {
      const { error: delErr } = await supabase.from('og_appointments').delete().in('id', futureIds);
      if (delErr) throw delErr;
    }
    if (parentId !== id) {
      await supabase.from('og_appointments').update({ recurrence_rule: null, recurrence: null }).eq('id', parentId);
    }
    const rebuilt = await insertSeries({ ...draft, recurrence_rule: draft.recurrence_rule });
    await logAppointmentActivity({
      appointment_id: rebuilt.id,
      actor_id: activeUserId,
      action: 'edited',
      summary: 'This and future appointments rescheduled',
    });
  }, [appointments, activeUserId, updateAppointment, fetchSeries, insertSeries]);

  /**
   * Drag & drop reschedule — preserves duration, checks conflicts first,
   * logs the change and notifies participants. Throws on conflict so the
   * caller can revert the card and show why.
   */
  const reschedule = useCallback(async (id: string, newStartIso: string): Promise<CalendarAppointment> => {
    const prev = appointments.find((a) => a.id === id);
    if (!prev) throw new Error('Appointment not found.');
    const durationMs = new Date(prev.ends_at).getTime() - new Date(prev.starts_at).getTime();
    const newStart = new Date(newStartIso);
    const newEnd = new Date(newStart.getTime() + durationMs);
    const draft: CalendarDraft = {
      id,
      title: prev.title,
      kind: prev.kind,
      starts_at: newStart.toISOString(),
      ends_at: newEnd.toISOString(),
      location_type: prev.location_type,
      reminder_minutes: prev.reminder_minutes,
      assigned_user_id: prev.assigned_user_id,
      property_id: prev.property_id,
      contact_ids: prev.contact_ids,
    };
    const conflicts = await findConflicts(draft);
    if (conflicts.length) {
      throw new Error(`Cannot move — clashes with ${conflicts[0].title} (${new Date(conflicts[0].starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}).`);
    }
    const { error } = await supabase
      .from('og_appointments')
      .update({ starts_at: draft.starts_at, ends_at: draft.ends_at, status: 'rescheduled' as AppointmentStatus })
      .eq('id', id);
    if (error) throw error;
    await logAppointmentActivity({
      appointment_id: id,
      actor_id: activeUserId,
      action: 'rescheduled',
      summary: 'Rescheduled by drag & drop',
      detail: { from: prev.starts_at, to: draft.starts_at, from_end: prev.ends_at, to_end: draft.ends_at },
    });
    await notifyRescheduled({ ...prev, starts_at: draft.starts_at, ends_at: draft.ends_at }, activeUserId, prev.starts_at);
    const email = await sendAppointmentEmail(id, 'rescheduled', prev.starts_at);
    if (email.notice) setEmailNotice(email.notice);
    const updated = { ...prev, starts_at: draft.starts_at, ends_at: draft.ends_at, status: 'rescheduled' as AppointmentStatus };
    setAppointments((list) => list.map((a) => (a.id === id ? updated : a)));
    return updated;
  }, [appointments, activeUserId, findConflicts]);

  const setStatus = useCallback(async (
    id: string,
    status: AppointmentStatus,
    reason?: string,
  ): Promise<void> => {
    const prev = appointments.find((a) => a.id === id);
    const patch: Record<string, unknown> = { status };
    const now = new Date().toISOString();
    if (status === 'confirmed') patch.confirmed_at = now;
    if (status === 'completed') patch.completed_at = now;
    if (status === 'cancelled') {
      patch.cancelled_at = now;
      patch.cancelled_by = activeUserId;
      if (reason) patch.cancellation_reason = reason;
    }
    const { error } = await supabase.from('og_appointments').update(patch).eq('id', id);
    if (error) throw error;
    const actionMap: Partial<Record<AppointmentStatus, AppointmentAction>> = {
      confirmed: 'confirmed',
      completed: 'completed',
      cancelled: 'cancelled',
      no_show: 'no_show',
      rescheduled: 'rescheduled',
    };
    const action = actionMap[status];
    if (action) {
      await logAppointmentActivity({
        appointment_id: id,
        actor_id: activeUserId,
        action,
        summary: status === 'cancelled' && reason ? `Cancelled — ${reason}` : undefined,
      });
    }
    if (prev) {
      const merged = { ...prev, status };
      if (status === 'cancelled' || status === 'no_show') {
        await notifyCancelled(merged, activeUserId, reason);
        if (status === 'cancelled') {
          const email = await sendAppointmentEmail(id, 'cancelled');
          if (email.notice) setEmailNotice(email.notice);
        }
        await mirrorAppointmentToTimelines({ appointmentId: id, kind: prev.kind, action: 'cancelled', title: prev.title, propertyId: prev.property_id, contactIds: prev.contact_ids, agentId: prev.assigned_user_id, actorId: activeUserId });
      } else if (status === 'completed') {
        await mirrorAppointmentToTimelines({ appointmentId: id, kind: prev.kind, action: 'completed', title: prev.title, propertyId: prev.property_id, contactIds: prev.contact_ids, agentId: prev.assigned_user_id, actorId: activeUserId });
      }
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }, [appointments, activeUserId]);

  const setOutcome = useCallback(async (id: string, outcome: string): Promise<void> => {
    const prev = appointments.find((a) => a.id === id);
    const { error } = await supabase.from('og_appointments').update({ outcome }).eq('id', id);
    if (error) throw error;
    await logAppointmentActivity({ appointment_id: id, actor_id: activeUserId, action: 'outcome', summary: outcome });
    if (prev) {
      await mirrorAppointmentToTimelines({ appointmentId: id, kind: prev.kind, action: 'feedback', title: `${prev.title} — ${outcome}`, propertyId: prev.property_id, contactIds: prev.contact_ids, agentId: prev.assigned_user_id, actorId: activeUserId });
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, outcome } as CalendarAppointment : a)));
  }, [appointments, activeUserId]);

  const respondToInvite = useCallback(async (appointmentId: string, response: AttendeeResponse): Promise<void> => {
    if (!activeUserId) return;
    const { error } = await supabase
      .from('og_appointment_attendees')
      .update({ response, responded_at: new Date().toISOString() })
      .eq('appointment_id', appointmentId)
      .eq('user_id', activeUserId);
    if (error) throw error;
    setAppointments((prev) => prev.map((a) => {
      if (a.id !== appointmentId) return a;
      const attendees = (a.attendees || []).map((at) => (at.user_id === activeUserId ? { ...at, response, responded_at: new Date().toISOString() } : at));
      return { ...a, attendees };
    }));
  }, [activeUserId]);

  const saveAvailability = useCallback(async (rows: Omit<AvailabilityRow, 'id'>[]): Promise<void> => {
    if (!activeUserId) return;
    await supabase.from('og_availability').delete().eq('user_id', activeUserId);
    if (rows.length) {
      await supabase.from('og_availability').insert(rows.map((r) => ({ ...r, user_id: activeUserId })));
    }
    setAvailability(rows.map((r, i) => ({ ...r, id: `local-${i}`, user_id: activeUserId }) as AvailabilityRow));
  }, [activeUserId]);

  const addTimeOff = useCallback(async (row: Omit<TimeOffRow, 'id' | 'user_id'>): Promise<void> => {
    if (!activeUserId) return;
    const { data, error } = await supabase
      .from('og_time_off')
      .insert({ ...row, user_id: activeUserId })
      .select('*')
      .single();
    if (error) throw error;
    setTimeOff((prev) => [...prev, data as TimeOffRow]);
  }, [activeUserId]);

  const removeTimeOff = useCallback(async (id: string): Promise<void> => {
    await supabase.from('og_time_off').delete().eq('id', id);
    setTimeOff((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!activeUserId) return;
    const channel = supabase.channel('og-calendar');
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'og_appointments' }, () => { void loadMeta(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'og_appointments' }, () => { void loadMeta(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeUserId, loadMeta]);

  return {
    appointments, availability, timeOff, eventTypes, loading, canManageCompany, companyAccessChecked, emailNotice,
    clearEmailNotice: () => setEmailNotice(null),
    loadRanges, loadCompanyRange, serverSearch, findConflicts, isWithinWorkingHours,
    createAppointment, updateAppointment, updateAppointmentScoped, reschedule,
    setStatus, setOutcome, respondToInvite,
    saveAvailability, addTimeOff, removeTimeOff,
  };
}

export { minutesBetween, startOfDay, endOfDay };