import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppointmentActivityRow } from './calendarTypes';

// ─────────────────────────────────────────────────────────────
// APPOINTMENT ACTIVITY — the single audit + diary stream.
//
// Every lifecycle mutation (created / edited / rescheduled /
// reassigned / confirmed / completed / cancelled / restored) and every
// diary note is written here. RLS mirrors og_appointments: only
// participants (or admins) can read or append. Writes are best-effort
// so they never block the primary appointment action.
// ─────────────────────────────────────────────────────────────

export type AppointmentAction =
  | 'created'
  | 'edited'
  | 'rescheduled'
  | 'reassigned'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'restored'
  | 'no_show'
  | 'outcome'
  | 'contacted'
  | 'note'
  | 'task_added'
  | 'task_completed'
  | 'reminder_added';

export const ACTION_LABELS: Record<string, string> = {
  created: 'Created',
  edited: 'Edited',
  rescheduled: 'Rescheduled',
  reassigned: 'Reassigned',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  restored: 'Restored',
  no_show: 'Marked no-show',
  outcome: 'Outcome recorded',
  contacted: 'Contacted',
  note: 'Note',
  task_added: 'Task added',
  task_completed: 'Task completed',
  reminder_added: 'Reminder added',
};

export const ACTION_ICON: Record<string, string> = {
  created: 'ri-add-circle-line',
  edited: 'ri-edit-line',
  rescheduled: 'ri-calendar-schedule-line',
  reassigned: 'ri-user-shared-line',
  confirmed: 'ri-check-double-line',
  completed: 'ri-checkbox-circle-line',
  cancelled: 'ri-close-circle-line',
  restored: 'ri-restart-line',
  no_show: 'ri-user-unfollow-line',
  outcome: 'ri-flag-line',
  contacted: 'ri-phone-line',
  note: 'ri-sticky-note-line',
  task_added: 'ri-list-check',
  task_completed: 'ri-check-line',
  reminder_added: 'ri-alarm-line',
};

export interface LogActivityInput {
  appointment_id: string;
  actor_id?: string | null;
  action: AppointmentAction;
  summary?: string | null;
  detail?: Record<string, unknown> | null;
  is_private?: boolean;
}

/** Best-effort audit/note write. Never throws — logging must not block the action. */
export async function logAppointmentActivity(input: LogActivityInput): Promise<void> {
  try {
    await supabase.from('og_appointment_activity').insert({
      appointment_id: input.appointment_id,
      actor_id: input.actor_id ?? null,
      action: input.action,
      summary: input.summary ?? null,
      detail: input.detail ?? null,
      is_private: input.is_private ?? false,
    });
  } catch {
    // Swallow — audit logging is non-critical to the user's immediate action.
  }
}

/** Loads the activity + diary stream for one appointment, live. */
export function useAppointmentActivity(appointmentId: string | null) {
  const [items, setItems] = useState<AppointmentActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!appointmentId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('og_appointment_activity')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false });
      if (e) throw e;
      setItems((data || []) as AppointmentActivityRow[]);
    } catch (err) {
      setError((err as Error).message || 'Unable to load appointment history.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!appointmentId) return;
    const channel = supabase.channel(`og-appt-activity-${appointmentId}`);
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'og_appointment_activity', filter: `appointment_id=eq.${appointmentId}` },
        () => { void load(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [appointmentId, load]);

  const addNote = useCallback(
    async (summary: string, actorId?: string | null, isPrivate = false) => {
      if (!appointmentId || !summary.trim()) return;
      await logAppointmentActivity({
        appointment_id: appointmentId,
        actor_id: actorId ?? null,
        action: 'note',
        summary: summary.trim(),
        is_private: isPrivate,
      });
      await load();
    },
    [appointmentId, load],
  );

  return { items, loading, error, reload: load, addNote };
}