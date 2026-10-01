import { pushNotification } from './useNotifications';
import type { CalendarAppointment } from './calendarTypes';
import { KIND_LABELS } from './calendarTypes';

// ─────────────────────────────────────────────────────────────
// APPOINTMENT NOTIFICATIONS — one place that decides WHO gets
// told and WHAT they're told when an appointment changes. Reuses
// the existing `notifications` table + pushNotification helper, so
// there is no second notification system.
// ─────────────────────────────────────────────────────────────

const CALENDAR_LINK = '/agent/calendar';

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Everyone who should hear about this appointment: assignee + attendees. */
export function appointmentRecipients(
  a: Pick<CalendarAppointment, 'assigned_user_id' | 'attendees'>,
  opts: { includeAssignee?: boolean } = {},
): string[] {
  const ids = new Set<string>();
  if (opts.includeAssignee !== false && a.assigned_user_id) ids.add(a.assigned_user_id);
  (a.attendees || []).forEach((at) => ids.add(at.user_id));
  return [...ids];
}

interface NotifyInput {
  recipients: string[];
  actorId?: string | null;
  title: string;
  body: string;
  link?: string;
  contactId?: string | null;
}

export async function notifyAppointment(input: NotifyInput): Promise<void> {
  const targets = [...new Set(input.recipients.filter((r) => r && r !== input.actorId))];
  if (!targets.length) return;
  await Promise.all(
    targets.map((rid) =>
      pushNotification({
        recipient_id: rid,
        type: 'appointment',
        title: input.title,
        body: input.body,
        link: input.link || CALENDAR_LINK,
        contact_id: input.contactId ?? null,
      }),
    ),
  );
}

export function notifyCreated(a: CalendarAppointment, actorId?: string | null, extraRecipients: string[] = []): Promise<void> {
  return notifyAppointment({
    recipients: [...appointmentRecipients(a), ...extraRecipients],
    actorId,
    title: a.assigned_user_id && a.assigned_user_id !== actorId ? 'New appointment assigned' : 'New appointment created',
    body: `${a.title} · ${fmtWhen(a.starts_at)}`,
    contactId: a.contact_ids?.[0] ?? null,
  });
}

export function notifyChanged(a: CalendarAppointment, actorId?: string | null, detail?: string): Promise<void> {
  return notifyAppointment({
    recipients: appointmentRecipients(a),
    actorId,
    title: 'Appointment updated',
    body: `${a.title}${detail ? ` · ${detail}` : ''}`,
    contactId: a.contact_ids?.[0] ?? null,
  });
}

export function notifyRescheduled(a: CalendarAppointment, actorId?: string | null, fromIso?: string): Promise<void> {
  const from = fromIso ? fmtWhen(fromIso) : '';
  return notifyAppointment({
    recipients: appointmentRecipients(a),
    actorId,
    title: 'Appointment rescheduled',
    body: `${a.title}${from ? ` moved from ${from}` : ''} to ${fmtWhen(a.starts_at)}`,
    contactId: a.contact_ids?.[0] ?? null,
  });
}

export function notifyCancelled(a: CalendarAppointment, actorId?: string | null, reason?: string): Promise<void> {
  return notifyAppointment({
    recipients: appointmentRecipients(a),
    actorId,
    title: 'Appointment cancelled',
    body: `${KIND_LABELS[a.kind] || 'Appointment'} “${a.title}” has been cancelled${reason ? ` — ${reason}` : ''}.`,
    contactId: a.contact_ids?.[0] ?? null,
  });
}

export function notifyReassigned(a: CalendarAppointment, actorId?: string | null): Promise<void> {
  return notifyAppointment({
    recipients: [a.assigned_user_id || ''].filter(Boolean),
    actorId,
    title: 'Appointment reassigned',
    body: `${a.title} · ${fmtWhen(a.starts_at)}`,
    contactId: a.contact_ids?.[0] ?? null,
  });
}