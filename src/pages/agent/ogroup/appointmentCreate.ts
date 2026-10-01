import { supabase } from '@/lib/supabase';
import type { AttendeeRow, AttendeeResponse, CalendarAppointment } from './calendarTypes';
import type { CalendarDraft, ConflictHit } from './useCalendar';
import { buildOccurrences } from './recurrence';
import { logAppointmentActivity } from './appointmentActivity';
import { mirrorAppointmentToTimelines } from './crmActivities';
import { notifyCreated } from './appointmentNotify';
import { sendAppointmentEmail } from './appointmentEmails';

// ─────────────────────────────────────────────────────────────
// QUICK SET APPOINTMENT — standalone creation path.
//
// This is used by the GLOBAL Quick Set action (launchable from anywhere),
// which cannot mount the calendar hook. It performs the exact same
// canonical commit sequence as the calendar: conflict check → insert →
// activity log → CRM timelines → attendees → notify → confirmation email.
// The appointment is ONE canonical `og_appointments` record either way.
// ─────────────────────────────────────────────────────────────

function toPatch(draft: CalendarDraft): Record<string, unknown> {
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

/** Server-side conflict check (agent / property / applicant) for Quick Set. */
export async function findQuickConflicts(draft: CalendarDraft, userId?: string | null): Promise<ConflictHit[]> {
  const owner = draft.assigned_user_id || userId || null;
  let q = supabase
    .from('og_appointments')
    .select('id,title,starts_at,ends_at,property_id,contact_ids,assigned_user_id')
    .lt('starts_at', draft.ends_at)
    .gt('ends_at', draft.starts_at)
    .not('status', 'in', '("cancelled","no_show")');
  if (draft.id) q = q.neq('id', draft.id);
  const { data, error } = await q;
  if (error) return [];
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
}

export interface QuickCreateResult {
  appointment: CalendarAppointment | null;
  /** Non-fatal email delivery notice (never blocks the save). */
  notice: string | null;
}

/**
 * Create one canonical appointment from anywhere. Email is attempted ONLY
 * after the row is committed, and never rolls the appointment back.
 */
export async function createAppointmentQuick(userId: string, draft: CalendarDraft): Promise<QuickCreateResult> {
  const assignee = draft.assigned_user_id || userId;

  if (!draft.allowConflict) {
    const conflicts = await findQuickConflicts(draft, userId);
    if (conflicts.length) {
      const t = new Date(conflicts[0].starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      throw new Error(`Time clashes with ${conflicts[0].title} (${t}). Pick a free slot or choose "Keep anyway".`);
    }
  }

  const { data, error } = await supabase
    .from('og_appointments')
    .insert({ ...toPatch(draft), created_by: userId, assigned_user_id: assignee, status: 'scheduled' })
    .select('*')
    .single();
  if (error) throw error;
  const parent = data as CalendarAppointment;

  if (draft.recurrence_rule) {
    const occ = buildOccurrences(draft.starts_at, draft.ends_at, draft.recurrence_rule);
    const children = occ.slice(1).map((o) => ({
      ...toPatch(draft),
      starts_at: o.starts_at,
      ends_at: o.ends_at,
      created_by: userId,
      assigned_user_id: assignee,
      status: 'scheduled',
      recurrence_parent_id: parent.id,
    }));
    if (children.length) await supabase.from('og_appointments').insert(children);
  }

  const offsets = (draft.reminders && draft.reminders.length ? draft.reminders : [draft.reminder_minutes]).filter((m) => m > 0);
  if (offsets.length) {
    await supabase.from('og_appointment_reminders').insert(
      offsets.map((m) => ({ appointment_id: parent.id, minutes_before: m, channel: 'in_app', created_by: userId })),
    );
  }

  await logAppointmentActivity({
    appointment_id: parent.id,
    actor_id: userId,
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
    actorId: userId,
  });

  const attendees: AttendeeRow[] = (draft.attendeeIds || []).map((uid) => ({
    id: uid,
    appointment_id: parent.id,
    user_id: uid,
    response: 'pending' as AttendeeResponse,
    responded_at: null,
  }));

  if (draft.attendeeIds?.length) {
    await supabase.from('og_appointment_attendees').insert(
      draft.attendeeIds.map((uid) => ({ appointment_id: parent.id, user_id: uid, response: 'pending' })),
    );
  }

  await notifyCreated({ ...parent, attendees }, userId, draft.attendeeIds || []);

  // Confirmation email is attempted ONLY after the appointment is committed.
  const email = await sendAppointmentEmail(parent.id, 'confirmation');
  return { appointment: parent, notice: email.notice };
}