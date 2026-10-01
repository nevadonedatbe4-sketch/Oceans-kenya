import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppointmentTaskRow, TaskPriority } from './calendarTypes';
import { logAppointmentActivity } from './appointmentActivity';

export interface TaskInput {
  title: string;
  assignee_id?: string | null;
  due_at?: string | null;
  priority?: TaskPriority;
}

// ─────────────────────────────────────────────────────────────
// APPOINTMENT TASKS — "confirm viewing", "call applicant", etc.
// Scoped by the same RLS participant rule as the parent appointment.
// ─────────────────────────────────────────────────────────────
export function useAppointmentTasks(appointmentId: string | null) {
  const [tasks, setTasks] = useState<AppointmentTaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!appointmentId) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('og_appointment_tasks')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('is_done', { ascending: true })
        .order('due_at', { ascending: true, nullsFirst: false });
      if (e) throw e;
      setTasks((data || []) as AppointmentTaskRow[]);
    } catch (err) {
      setError((err as Error).message || 'Unable to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => { void load(); }, [load]);

  const addTask = useCallback(
    async (input: TaskInput, actorId?: string | null) => {
      if (!appointmentId || !input.title.trim()) return;
      const { error: e } = await supabase.from('og_appointment_tasks').insert({
        appointment_id: appointmentId,
        title: input.title.trim(),
        assignee_id: input.assignee_id ?? null,
        due_at: input.due_at ?? null,
        priority: input.priority ?? 'normal',
        created_by: actorId ?? null,
      });
      if (e) throw e;
      await logAppointmentActivity({
        appointment_id: appointmentId,
        actor_id: actorId ?? null,
        action: 'task_added',
        summary: input.title.trim(),
      });
      await load();
    },
    [appointmentId, load],
  );

  const toggleTask = useCallback(
    async (task: AppointmentTaskRow, actorId?: string | null) => {
      const next = !task.is_done;
      const { error: e } = await supabase
        .from('og_appointment_tasks')
        .update({ is_done: next, completed_at: next ? new Date().toISOString() : null })
        .eq('id', task.id);
      if (e) throw e;
      if (next) {
        await logAppointmentActivity({
          appointment_id: task.appointment_id,
          actor_id: actorId ?? null,
          action: 'task_completed',
          summary: task.title,
        });
      }
      await load();
    },
    [load],
  );

  const removeTask = useCallback(async (id: string) => {
    const { error: e } = await supabase.from('og_appointment_tasks').delete().eq('id', id);
    if (e) throw e;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pendingCount = tasks.filter((t) => !t.is_done).length;

  return { tasks, loading, error, reload: load, addTask, toggleTask, removeTask, pendingCount };
}