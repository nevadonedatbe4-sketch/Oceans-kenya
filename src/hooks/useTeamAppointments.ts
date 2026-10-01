import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type {
  CalendarAppointment, AttendeeRow, AppointmentStatus, RecurrenceRule, CalendarFilters, AttendeeResponse,
} from '@/pages/agent/ogroup/calendarTypes';
import { logAppointmentActivity } from '@/pages/agent/ogroup/appointmentActivity';
import { buildOccurrences, type RecurringEditScope } from '@/pages/agent/ogroup/recurrence';
import { applyAppointmentFilters } from '@/pages/agent/ogroup/appointmentQuery';
import { mirrorAppointmentToTimelines } from '@/pages/agent/ogroup/crmActivities';
import {
  notifyAppointment, appointmentRecipients, notifyRescheduled, notifyCancelled, notifyReassigned,
} from '@/pages/agent/ogroup/appointmentNotify';
import { sendAppointmentEmail } from '@/pages/agent/ogroup/appointmentEmails';

export interface RosterAgent {
  user_id: string;
  name: string;
  avatar: string | null;
  role: string | null;
}

export interface TeamAppointmentDraft {
  id?: string;
  title: string;
  kind: string;
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  contact_ids?: string[];
  property_id?: string | null;
  property_title?: string | null;
  assigned_user_id: string;
  starts_at: string;
  ends_at: string;
  timezone?: string;
  location_type: string;
  location_text?: string | null;
  meeting_point?: string | null;
  notes?: string | null;
  viewing_instructions?: string | null;
  intention?: string | null;
  reminder_minutes: number;
  reminders?: number[];
  recurrence_rule?: RecurrenceRule | null;
  attendeeIds?: string[];
  allowConflict?: boolean;
}

export interface TeamConflictHit {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  reason?: 'agent' | 'property' | 'contact';
}

function toPatch(draft: TeamAppointmentDraft): Record<string, unknown> {
  return {
    title: draft.title,
    kind: draft.kind,
    client_name: draft.client_name || null,
    client_phone: draft.client_phone || null,
    client_email: draft.client_email || null,
    contact_ids: draft.contact_ids || [],
    property_id: draft.property_id || null,
    property_title: draft.property_title || null,
    assigned_user_id: draft.assigned_user_id,
    starts_at: draft.starts_at,
    ends_at: draft.ends_at,
    timezone: draft.timezone || 'Africa/Nairobi',
    location_type: draft.location_type,
    location_text: draft.location_text || null,
    meeting_point: draft.meeting_point || null,
    notes: draft.notes || null,
    reminder_minutes: draft.reminder_minutes,
    intention: draft.intention || null,
    viewing_instructions: draft.viewing_instructions || null,
    recurrence_rule: draft.recurrence_rule ?? null,
    recurrence: draft.recurrence_rule ? draft.recurrence_rule.frequency : null,
  };
}

export function useTeamAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [roster, setRoster] = useState<RosterAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const actorId = user?.id;

  const loadRoster = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id,name,avatar,role')
      .eq('status', 'active');
    setRoster((data || []).map((p) => ({
      user_id: p.user_id,
      name: p.name || 'Team member',
      avatar: p.avatar,
      role: p.role,
    })));
  }, []);

  const loadRange = useCallback(async (start: Date, end: Date, filters: CalendarFilters) => {
    setLoading(true);
    try {
      setError(null);
      const base = supabase
        .from('og_appointments')
        .select('*')
        .gte('starts_at', start.toISOString())
        .lt('starts_at', end.toISOString())
        .order('starts_at', { ascending: true });
      const { data, error: e } = await applyAppointmentFilters(base, filters);
      if (e) throw e;
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
      setAppointments(rows.map((r) => ({ ...r, attendees: att[r.id] || [] })));
    } catch (err) {
      setError((err as Error).message || 'Unable to load appointments. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const serverSearch = useCallback(async (term: string): Promise<CalendarAppointment[]> => {
    if (term.trim().length < 2) return [];
    const clean = term.trim().replace(/[%,()]/g, ' ').trim();
    const { data, error: e } = await supabase
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
    if (e) return [];
    return (data || []) as CalendarAppointment[];
  }, []);

  /** Server-side conflict check across agent / property / applicant. */
  const findConflicts = useCallback(async (draft: {
    id?: string; starts_at: string; ends_at: string; assigned_user_id?: string | null;
    property_id?: string | null; contact_ids?: string[];
  }): Promise<TeamConflictHit[]> => {
    let q = supabase
      .from('og_appointments')
      .select('id,title,starts_at,ends_at,property_id,contact_ids,assigned_user_id')
      .lt('starts_at', draft.ends_at)
      .gt('ends_at', draft.starts_at)
      .not('status', 'in', '("cancelled","no_show")');
    if (draft.id) q = q.neq('id', draft.id);
    const { data, error: e } = await q;
    if (e) return [];
    const rows = (data || []) as unknown as Array<{ id: string; title: string; starts_at: string; ends_at: string; property_id: string | null; contact_ids: string[] | null; assigned_user_id: string | null }>;
    const hits: TeamConflictHit[] = [];
    rows.forEach((r) => {
      if (draft.assigned_user_id && r.assigned_user_id === draft.assigned_user_id) {
        hits.push({ id: r.id, title: r.title, starts_at: r.starts_at, ends_at: r.ends_at, reason: 'agent' });
      } else if (draft.property_id && r.property_id === draft.property_id) {
        hits.push({ id: r.id, title: r.title, starts_at: r.starts_at, ends_at: r.ends_at, reason: 'property' });
      } else if (draft.contact_ids?.length && (r.contact_ids || []).some((cid) => draft.contact_ids!.includes(cid))) {
        hits.push({ id: r.id, title: r.title, starts_at: r.starts_at, ends_at: r.ends_at, reason: 'contact' });
      }
    });
    return hits;
  }, []);

  const insertSeries = useCallback(async (draft: TeamAppointmentDraft): Promise<CalendarAppointment> => {
    const { data, error: e } = await supabase
      .from('og_appointments')
      .insert({ ...toPatch(draft), created_by: actorId, status: 'scheduled' })
      .select('*')
      .single();
    if (e) throw e;
    const parent = data as CalendarAppointment;
    if (draft.recurrence_rule) {
      const occ = buildOccurrences(draft.starts_at, draft.ends_at, draft.recurrence_rule);
      const children = occ.slice(1).map((o) => ({
        ...toPatch(draft),
        starts_at: o.starts_at,
        ends_at: o.ends_at,
        created_by: actorId,
        status: 'scheduled',
        recurrence_parent_id: parent.id,
      }));
      if (children.length) await supabase.from('og_appointments').insert(children);
    }
    const offsets = (draft.reminders && draft.reminders.length ? draft.reminders : [draft.reminder_minutes]).filter((m) => m > 0);
    if (offsets.length) {
      await supabase.from('og_appointment_reminders').insert(
        offsets.map((m) => ({ appointment_id: parent.id, minutes_before: m, channel: 'in_app', created_by: actorId })),
      );
    }
    return parent;
  }, [actorId]);

  const createAppointment = useCallback(async (draft: TeamAppointmentDraft): Promise<CalendarAppointment> => {
    if (!draft.allowConflict) {
      const conflicts = await findConflicts(draft);
      if (conflicts.length) throw new Error(`Scheduling conflict with ${conflicts[0].title}. Resolve it or choose "Keep anyway".`);
    }
    const parent = await insertSeries(draft);
    await logAppointmentActivity({
      appointment_id: parent.id,
      actor_id: actorId,
      action: 'created',
      summary: `${draft.title} scheduled by admin`,
    });
    await mirrorAppointmentToTimelines({ appointmentId: parent.id, kind: draft.kind, action: 'created', title: draft.title, propertyId: draft.property_id, contactIds: draft.contact_ids, agentId: parent.assigned_user_id, actorId });
    if (draft.attendeeIds?.length) {
      await supabase.from('og_appointment_attendees').insert(
        draft.attendeeIds.map((uid) => ({ appointment_id: parent.id, user_id: uid, response: 'pending' })),
      );
    }
    await notifyAppointment({
      recipients: [draft.assigned_user_id, ...(draft.attendeeIds || [])],
      actorId,
      title: 'New appointment assigned',
      body: `${draft.title} · ${new Date(draft.starts_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      contactId: draft.contact_ids?.[0] ?? null,
    });
    // Confirmation emails are sent ONLY after the appointment is committed.
    await sendAppointmentEmail(parent.id, 'confirmation');
    return parent;
  }, [insertSeries, actorId, findConflicts]);

  const fetchSeries = useCallback(async (parentId: string): Promise<CalendarAppointment[]> => {
    const { data, error: e } = await supabase
      .from('og_appointments')
      .select('*')
      .or(`id.eq.${parentId},recurrence_parent_id.eq.${parentId}`)
      .order('starts_at', { ascending: true });
    if (e) throw e;
    return (data || []) as CalendarAppointment[];
  }, []);

  const updateAppointment = useCallback(async (
    id: string,
    draft: TeamAppointmentDraft,
    scope: RecurringEditScope = 'this',
  ): Promise<void> => {
    const prev = appointments.find((a) => a.id === id);
    const timeChanged = !!prev && (prev.starts_at !== draft.starts_at || prev.ends_at !== draft.ends_at);
    const reassigned = !!prev && prev.assigned_user_id !== draft.assigned_user_id;
    const recurring = !!prev && (!!prev.recurrence_parent_id || !!prev.recurrence_rule);

    if (!draft.allowConflict && !recurring) {
      const conflicts = await findConflicts({ id, starts_at: draft.starts_at, ends_at: draft.ends_at, assigned_user_id: draft.assigned_user_id, property_id: draft.property_id, contact_ids: draft.contact_ids });
      if (conflicts.length) throw new Error('Scheduling conflict — resolve it or choose "Keep anyway".');
    }

    if (!recurring || scope === 'this') {
      const { error: e } = await supabase
        .from('og_appointments')
        .update({ ...toPatch(draft), ...(timeChanged ? { status: 'rescheduled' as AppointmentStatus } : {}) })
        .eq('id', id);
      if (e) throw e;
      await logAppointmentActivity({ appointment_id: id, actor_id: actorId, action: timeChanged ? 'rescheduled' : 'edited', summary: timeChanged ? 'Time changed by admin' : 'Updated by admin' });
    } else {
      const parentId = prev!.recurrence_parent_id || prev!.id;
      const series = await fetchSeries(parentId);
      if (scope === 'series') {
        const delta = new Date(draft.starts_at).getTime() - new Date(prev!.starts_at).getTime();
        const patch = toPatch({ ...draft, recurrence_rule: draft.recurrence_rule ?? prev!.recurrence_rule });
        await Promise.all(series.map((row) => supabase.from('og_appointments').update({
          ...patch,
          starts_at: new Date(new Date(row.starts_at).getTime() + delta).toISOString(),
          ends_at: new Date(new Date(row.ends_at).getTime() + delta).toISOString(),
        }).eq('id', row.id)));
        await logAppointmentActivity({ appointment_id: prev!.id, actor_id: actorId, action: 'edited', summary: `Entire series updated (${series.length})` });
      } else {
        const cutoff = new Date(prev!.starts_at).getTime();
        const futureIds = series.filter((r) => new Date(r.starts_at).getTime() >= cutoff).map((r) => r.id);
        if (futureIds.length) await supabase.from('og_appointments').delete().in('id', futureIds);
        const rebuilt = await insertSeries({ ...draft, recurrence_rule: draft.recurrence_rule });
        await logAppointmentActivity({ appointment_id: rebuilt.id, actor_id: actorId, action: 'edited', summary: 'This and future appointments rescheduled' });
      }
    }

    const merged = { ...(prev ?? (null as unknown as CalendarAppointment)), ...draft, attendees: prev?.attendees || [] } as CalendarAppointment;
    if (reassigned && prev) {
      await notifyReassigned(merged, actorId);
      await logAppointmentActivity({ appointment_id: id, actor_id: actorId, action: 'reassigned', summary: `Reassigned to ${draft.assigned_user_id}` });
      await mirrorAppointmentToTimelines({ appointmentId: id, kind: draft.kind, action: 'reassigned', title: draft.title, propertyId: draft.property_id, contactIds: draft.contact_ids, agentId: draft.assigned_user_id, actorId });
      await sendAppointmentEmail(id, 'reassigned');
    } else if (timeChanged && prev) {
      await notifyRescheduled(merged, actorId, prev.starts_at);
      await sendAppointmentEmail(id, 'rescheduled', prev.starts_at);
    } else {
      await notifyAppointment({ recipients: appointmentRecipients(merged), actorId, title: 'Appointment updated', body: `${draft.title}`, contactId: draft.contact_ids?.[0] ?? null });
    }
  }, [appointments, actorId, fetchSeries, insertSeries, findConflicts]);

  /** Drag & drop reschedule for the team calendar. */
  const reschedule = useCallback(async (id: string, newStartIso: string): Promise<CalendarAppointment> => {
    const prev = appointments.find((a) => a.id === id);
    if (!prev) throw new Error('Appointment not found.');
    const durationMs = new Date(prev.ends_at).getTime() - new Date(prev.starts_at).getTime();
    const newStart = new Date(newStartIso);
    const newEnd = new Date(newStart.getTime() + durationMs);
    const conflicts = await findConflicts({ id, starts_at: newStart.toISOString(), ends_at: newEnd.toISOString(), assigned_user_id: prev.assigned_user_id, property_id: prev.property_id, contact_ids: prev.contact_ids });
    if (conflicts.length) throw new Error(`Cannot move — clashes with ${conflicts[0].title}.`);
    const { error: e } = await supabase
      .from('og_appointments')
      .update({ starts_at: newStart.toISOString(), ends_at: newEnd.toISOString(), status: 'rescheduled' as AppointmentStatus })
      .eq('id', id);
    if (e) throw e;
    await logAppointmentActivity({ appointment_id: id, actor_id: actorId, action: 'rescheduled', summary: 'Rescheduled by admin (drag & drop)', detail: { from: prev.starts_at, to: newStart.toISOString() } });
    await notifyRescheduled({ ...prev, starts_at: newStart.toISOString(), ends_at: newEnd.toISOString() }, actorId, prev.starts_at);
    await sendAppointmentEmail(id, 'rescheduled', prev.starts_at);
    const updated = { ...prev, starts_at: newStart.toISOString(), ends_at: newEnd.toISOString(), status: 'rescheduled' as AppointmentStatus };
    setAppointments((list) => list.map((a) => (a.id === id ? updated : a)));
    return updated;
  }, [appointments, actorId, findConflicts]);

  const setStatus = useCallback(async (id: string, status: AppointmentStatus, reason?: string): Promise<void> => {
    const prev = appointments.find((a) => a.id === id);
    const patch: Record<string, unknown> = { status };
    const now = new Date().toISOString();
    if (status === 'confirmed') patch.confirmed_at = now;
    if (status === 'completed') patch.completed_at = now;
    if (status === 'cancelled') { patch.cancelled_at = now; patch.cancelled_by = actorId; if (reason) patch.cancellation_reason = reason; }
    const { error: e } = await supabase.from('og_appointments').update(patch).eq('id', id);
    if (e) throw e;
    const actionMap: Partial<Record<AppointmentStatus, string>> = { confirmed: 'confirmed', completed: 'completed', cancelled: 'cancelled', no_show: 'no_show', rescheduled: 'rescheduled' };
    if (actionMap[status]) {
      await logAppointmentActivity({ appointment_id: id, actor_id: actorId, action: actionMap[status] as never, summary: status === 'cancelled' && reason ? `Cancelled — ${reason}` : undefined });
    }
    if (prev) {
      const merged = { ...prev, status };
      if (status === 'cancelled' || status === 'no_show') {
        await notifyCancelled(merged, actorId, reason);
        if (status === 'cancelled') await sendAppointmentEmail(id, 'cancelled');
        await mirrorAppointmentToTimelines({ appointmentId: id, kind: prev.kind, action: 'cancelled', title: prev.title, propertyId: prev.property_id, contactIds: prev.contact_ids, agentId: prev.assigned_user_id, actorId });
      } else if (status === 'completed') {
        await mirrorAppointmentToTimelines({ appointmentId: id, kind: prev.kind, action: 'completed', title: prev.title, propertyId: prev.property_id, contactIds: prev.contact_ids, agentId: prev.assigned_user_id, actorId });
      }
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }, [appointments, actorId]);

  const setOutcome = useCallback(async (id: string, outcome: string): Promise<void> => {
    const prev = appointments.find((a) => a.id === id);
    const { error: e } = await supabase.from('og_appointments').update({ outcome }).eq('id', id);
    if (e) throw e;
    await logAppointmentActivity({ appointment_id: id, actor_id: actorId, action: 'outcome', summary: outcome });
    if (prev) {
      await mirrorAppointmentToTimelines({ appointmentId: id, kind: prev.kind, action: 'feedback', title: `${prev.title} — ${outcome}`, propertyId: prev.property_id, contactIds: prev.contact_ids, agentId: prev.assigned_user_id, actorId });
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, outcome } as CalendarAppointment : a)));
  }, [appointments, actorId]);

  const respondToInvite = useCallback(async (appointmentId: string, response: AttendeeResponse): Promise<void> => {
    if (!actorId) return;
    const { error: e } = await supabase
      .from('og_appointment_attendees')
      .update({ response, responded_at: new Date().toISOString() })
      .eq('appointment_id', appointmentId)
      .eq('user_id', actorId);
    if (e) throw e;
    setAppointments((prev) => prev.map((a) => {
      if (a.id !== appointmentId) return a;
      const attendees = (a.attendees || []).map((at) => (at.user_id === actorId ? { ...at, response, responded_at: new Date().toISOString() } : at));
      return { ...a, attendees };
    }));
  }, [actorId]);

  useEffect(() => { void loadRoster(); }, [loadRoster]);

  return {
    appointments, roster, loading, error,
    loadRange, serverSearch, findConflicts, reschedule,
    createAppointment, updateAppointment, setStatus, setOutcome, respondToInvite,
  };
}