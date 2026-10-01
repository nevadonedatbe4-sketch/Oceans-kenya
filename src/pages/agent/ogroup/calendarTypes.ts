// ─────────────────────────────────────────────────────────────
// CANONICAL APPOINTMENT MODEL — shared by the Agent and Admin calendar.
//
// There is ONE appointment record (`og_appointments`) and ONE set of
// types/labels. Both portals import from here so nothing diverges.
//
// `og_availability.weekday` is an INTEGER (0 = Monday … 6 = Sunday).
// Postgres `time` columns are 'HH:MM:SS'. Timestamps are ISO (UTC).
// ─────────────────────────────────────────────────────────────

export type AppointmentKind = 'viewing' | 'appraisal' | 'general';
export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'rescheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show';
export type AttendeeResponse = 'pending' | 'accepted' | 'declined';
export type CalendarView = 'day' | '3day' | 'week' | 'month' | 'agenda';
/** 'my' = the agent's own working calendar; 'company' = the organisation-wide calendar. */
export type CalendarScope = 'my' | 'company';

export const CALENDAR_VIEWS: { value: CalendarView; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: '3day', label: '3 day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'agenda', label: 'Agenda' },
];

export type AppointmentIntention =
  | 'buying'
  | 'renting'
  | 'investment'
  | 'viewing_only'
  | 'not_specified';

export type AppointmentOutcome =
  | 'interested'
  | 'very_interested'
  | 'considering'
  | 'not_interested'
  | 'needs_follow_up'
  | 'offer_expected'
  | 'application_expected';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  until?: string | null;
  count?: number | null;
  byWeekday?: number[];
}

export interface CalendarAppointment {
  id: string;
  title: string;
  kind: AppointmentKind;
  event_type_id: string | null;
  description: string | null;
  client_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  contact_ids: string[];
  property_id: string | null;
  property_title: string | null;
  lead_id: string | null;
  created_by: string | null;
  assigned_agent_id: string | null;
  assigned_user_id: string | null;
  status: AppointmentStatus;
  starts_at: string;
  ends_at: string;
  timezone: string;
  location_type: string;
  location_text: string | null;
  meeting_point: string | null;
  notes: string | null;
  reminder_minutes: number;
  recurrence: string | null;
  recurrence_rule: RecurrenceRule | null;
  recurrence_parent_id: string | null;
  intention: AppointmentIntention | null;
  outcome: AppointmentOutcome | null;
  viewing_instructions: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  /** Private appointments block availability but hide their details from non-participants. */
  is_private?: boolean;
  /** True when this row was returned to a non-participant with its details hidden. */
  masked?: boolean;
  attendees?: AttendeeRow[];
  is_attendee?: boolean;
}

export interface AttendeeRow {
  id: string;
  appointment_id: string;
  user_id: string;
  response: AttendeeResponse;
  responded_at: string | null;
  name?: string;
  avatar?: string | null;
}

export interface AvailabilityRow {
  id: string;
  user_id: string;
  weekday: number; // 0 = Monday … 6 = Sunday
  start_time: string; // 'HH:MM:SS'
  end_time: string;
  is_working: boolean;
}

export interface TimeOffRow {
  id: string;
  user_id: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
}

export interface EventTypeRow {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  duration_minutes: number;
  team_type: string;
  team_member_ids: string[] | null;
  enabled: boolean;
  created_by: string | null;
}

export interface AppointmentActivityRow {
  id: string;
  appointment_id: string;
  actor_id: string | null;
  action: string;
  summary: string | null;
  detail: Record<string, unknown> | null;
  is_private: boolean;
  created_at: string;
}

export interface AppointmentTaskRow {
  id: string;
  appointment_id: string;
  title: string;
  assignee_id: string | null;
  due_at: string | null;
  priority: TaskPriority;
  is_done: boolean;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AppointmentReminderRow {
  id: string;
  appointment_id: string;
  minutes_before: number;
  channel: string;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
}

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// JS getDay(): 0=Sun..6=Sat → map to our monday-first index (0 = Monday)
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function toWeekdayName(index: number): string {
  return WEEKDAYS[(index + 7) % 7];
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), -weekdayIndex(d));
}

export function monthsBetween(d: Date): Date[] {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const lead = weekdayIndex(first);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(addDays(first, i - lead));
  }
  return days;
}

export function toTimeInput(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** yyyy-mm-dd for a native date input. */
export function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtDateTimeDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Does [aStart,aEnd) overlap [bStart,bEnd)? */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}

/** Human duration label, e.g. 90 → '1h 30m'. */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// ── Labels & colours ─────────────────────────────────────────
export const KIND_LABELS: Record<AppointmentKind, string> = {
  viewing: 'Viewing',
  appraisal: 'Market appraisal',
  general: 'General appointment',
};

export const KIND_COLOR: Record<AppointmentKind, string> = {
  viewing: 'bg-teal-600',
  appraisal: 'bg-amber-500',
  general: 'bg-neutral-500',
};

export const KIND_ICON: Record<AppointmentKind, string> = {
  viewing: 'ri-home-4-line',
  appraisal: 'ri-line-chart-line',
  general: 'ri-calendar-event-line',
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  rescheduled: 'bg-teal-50 text-teal-700',
  completed: 'bg-neutral-100 text-neutral-500',
  cancelled: 'bg-red-50 text-red-600',
  no_show: 'bg-red-50 text-red-600',
};

export const INTENTION_LABELS: Record<AppointmentIntention, string> = {
  buying: 'Buying',
  renting: 'Renting',
  investment: 'Investment',
  viewing_only: 'Viewing only',
  not_specified: 'Not specified',
};

export const OUTCOME_LABELS: Record<AppointmentOutcome, string> = {
  interested: 'Interested',
  very_interested: 'Very interested',
  considering: 'Considering',
  not_interested: 'Not interested',
  needs_follow_up: 'Needs follow-up',
  offer_expected: 'Offer expected',
  application_expected: 'Application expected',
};

export const CANCELLATION_REASONS: { value: string; label: string }[] = [
  { value: 'client_cancelled', label: 'Client cancelled' },
  { value: 'agent_unavailable', label: 'Agent unavailable' },
  { value: 'property_unavailable', label: 'Property unavailable' },
  { value: 'applicant_unavailable', label: 'Applicant unavailable' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'other', label: 'Other' },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const TASK_PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'bg-neutral-100 text-neutral-500',
  normal: 'bg-teal-50 text-teal-700',
  high: 'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-600',
};

// Reminder offsets in minutes (multiple reminders allowed per appointment).
export const REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 1440, label: '1 day' },
];

export const DURATION_SHORTCUTS: { value: number; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

export function reminderLabel(minutes: number): string {
  if (minutes <= 0) return 'None';
  const found = REMINDER_OPTIONS.find((r) => r.value === minutes);
  if (found) return found.label;
  return formatDuration(minutes);
}

// ── Contact channels (last-contacted capture) ────────────────
export type ContactChannel = 'phone' | 'email' | 'whatsapp' | 'sms' | 'meeting' | 'other';

export const CHANNEL_LABELS: Record<ContactChannel, string> = {
  phone: 'Phone',
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  meeting: 'Meeting',
  other: 'Other',
};

export const CHANNEL_ICON: Record<ContactChannel, string> = {
  phone: 'ri-phone-line',
  email: 'ri-mail-line',
  whatsapp: 'ri-whatsapp-line',
  sms: 'ri-message-2-line',
  meeting: 'ri-group-line',
  other: 'ri-chat-1-line',
};

export const CHANNEL_OPTIONS: ContactChannel[] = ['phone', 'email', 'whatsapp', 'meeting'];

// ── Calendar filters (wired to the server query) ─────────────
export interface CalendarFilters {
  agentId: string; // 'all' | user id
  kind: string; // 'all' | AppointmentKind
  status: string; // 'all' | AppointmentStatus
  propertyId: string; // 'all' | property id
  contactId: string; // 'all' | contact id
  location: string; // free text over location_text
  recurringOnly: boolean;
  includeCancelled: boolean;
  search: string; // server-side text search
}

export const EMPTY_FILTERS: CalendarFilters = {
  agentId: 'all',
  kind: 'all',
  status: 'all',
  propertyId: 'all',
  contactId: 'all',
  location: '',
  recurringOnly: false,
  includeCancelled: true,
  search: '',
};

export function filtersActive(f: CalendarFilters): boolean {
  return (
    f.agentId !== 'all' ||
    f.kind !== 'all' ||
    f.status !== 'all' ||
    f.propertyId !== 'all' ||
    f.contactId !== 'all' ||
    !!f.location.trim() ||
    f.recurringOnly ||
    !f.includeCancelled ||
    !!f.search.trim()
  );
}