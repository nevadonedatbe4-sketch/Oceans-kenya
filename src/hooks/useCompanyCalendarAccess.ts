import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Whether the current user may open the ORGANISATION-WIDE Company Calendar.
 *
 * This is NOT a role check — company-calendar access is a per-user grant held
 * in `og_calendar_access.can_manage_company_calendar` (Admins / Super Admins
 * always qualify). It is the same source of truth the database enforces, so the
 * UI can never show a link the data layer would refuse.
 *
 * Returns `checked` so callers can avoid flashing a "restricted" state before
 * the permission has actually resolved.
 */
export function useCompanyCalendarAccess(): { allowed: boolean; checked: boolean } {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setAllowed(false);
      setChecked(true);
      return;
    }
    let active = true;
    setChecked(false);
    void (async () => {
      try {
        const { data } = await supabase.rpc('og_can_manage_company_calendar');
        if (active) setAllowed(!!data);
      } catch {
        if (active) setAllowed(false);
      } finally {
        if (active) setChecked(true);
      }
    })();
    return () => { active = false; };
  }, [user?.id]);

  return { allowed, checked };
}