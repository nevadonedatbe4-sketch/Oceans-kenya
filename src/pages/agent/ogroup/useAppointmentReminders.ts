import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppointmentReminderRow } from './calendarTypes';
import { logAppointmentActivity } from './appointmentActivity';

// ─────────────────────────────────────────────────────────────
// APPOINTMENT REMINDERS — multiple offsets per appointment.
// A reminder row is the source of truth; the delivery engine marks
// `sent_at` once it fires. Scoped by the participant RLS rule.
// ─────────────────────────────────────────────────────────────
export function useAppointmentReminders(appointmentId: string | null) {
  const [reminders, setReminders] = useState<AppointmentReminderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!appointmentId) { setReminders([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('og_appointment_reminders')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('minutes_before', { ascending: false });
      if (e) throw e;
      setReminders((data || []) as AppointmentReminderRow[]);
    } catch (err) {
      setError((err as Error).message || 'Unable to load reminders.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => { void load(); }, [load]);

  const addReminder = useCallback(
    async (minutesBefore: number, channel = 'in_app', actorId?: string | null) => {
      if (!appointmentId || minutesBefore <= 0) return;
      if (reminders.some((r) => r.minutes_before === minutesBefore && r.channel === channel)) return;
      const { error: e } = await supabase.from('og_appointment_reminders').insert({
        appointment_id: appointmentId,
        minutes_before: minutesBefore,
        channel,
        created_by: actorId ?? null,
      });
      if (e) throw e;
      await logAppointmentActivity({
        appointment_id: appointmentId,
        actor_id: actorId ?? null,
        action: 'reminder_added',
        summary: `${minutesBefore} minutes before`,
      });
      await load();
    },
    [appointmentId, reminders, load],
  );

  const removeReminder = useCallback(async (id: string) => {
    const { error: e } = await supabase.from('og_appointment_reminders').delete().eq('id', id);
    if (e) throw e;
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { reminders, loading, error, reload: load, addReminder, removeReminder };
}