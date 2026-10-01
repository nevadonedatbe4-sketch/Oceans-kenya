import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────
// APPOINTMENT SETTERS
//
// "Appointment Setter" is NOT a stored profile role — it is a per-account
// capability held in `og_calendar_access.can_manage_company_calendar`, the
// exact grant the database enforces through og_can_manage_company_calendar().
//
// An Appointment Setter can: manage the Company Calendar, create & assign
// appointments for any agent, see every agent's availability, and reschedule
// or cancel anyone's appointments. Everything outside scheduling stays
// limited to the account's normal (Agent) access.
//
// Admins / Super Admins always hold this capability by role and do not need
// the grant; this hook reports the explicitly-designated setter accounts.
// ─────────────────────────────────────────────────────────────

export interface AppointmentSettersState {
  setterIds: string[];
  loading: boolean;
  error: string | null;
  isAppointmentSetter: (userId?: string | null) => boolean;
  setSetter: (userId: string, next: boolean, updatedBy?: string | null) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAppointmentSetters(): AppointmentSettersState {
  const [setterIds, setSetterIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('og_calendar_access')
        .select('user_id, can_manage_company_calendar')
        .eq('can_manage_company_calendar', true);
      if (e) throw e;
      setSetterIds((data || []).map((r) => (r as { user_id: string }).user_id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const isAppointmentSetter = useCallback(
    (userId?: string | null) => !!userId && setterIds.includes(userId),
    [setterIds],
  );

  const setSetter = useCallback(async (userId: string, next: boolean, updatedBy?: string | null) => {
    const { error: e } = await supabase
      .from('og_calendar_access')
      .upsert(
        {
          user_id: userId,
          can_manage_company_calendar: next,
          updated_by: updatedBy ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    if (e) throw e;
    setSetterIds((ids) => (next ? Array.from(new Set([...ids, userId])) : ids.filter((i) => i !== userId)));
  }, []);

  return { setterIds, loading, error, isAppointmentSetter, setSetter, refresh };
}