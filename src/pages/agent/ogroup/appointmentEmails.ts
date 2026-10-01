import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────
// APPOINTMENT EMAIL CONFIRMATIONS
//
// Calls the `send-appointment-confirmation` edge function, which sends
// the applicant + assigned-agent confirmations using the organisation's
// own branding and records every attempt in `og_appointment_emails`.
//
// EMAIL IS NEVER ALLOWED TO FAIL THE APPOINTMENT. The appointment is
// committed first; only then do we attempt delivery. A delivery failure
// is surfaced as a notice, never as an error.
// ─────────────────────────────────────────────────────────────

export type AppointmentEmailEvent = 'confirmation' | 'rescheduled' | 'cancelled' | 'reassigned';

export interface EmailDeliveryResult {
  recipient: string;
  type: 'applicant' | 'agent';
  email: string | null;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}

export interface AppointmentEmailOutcome {
  configured: boolean;
  results: EmailDeliveryResult[];
  notice: string | null;
}

function siteUrl(): string {
  try {
    return window.location.origin;
  } catch {
    return '';
  }
}

/**
 * Send the confirmation/notification email for an appointment.
 * Resolves (never rejects) — email problems must not surface as errors.
 */
export async function sendAppointmentEmail(
  appointmentId: string,
  event: AppointmentEmailEvent,
  previousStartsAt?: string,
): Promise<AppointmentEmailOutcome> {
  try {
    const { data, error } = await supabase.functions.invoke('send-appointment-confirmation', {
      body: { appointment_id: appointmentId, event, previous_starts_at: previousStartsAt || null, site_url: siteUrl() },
    });
    if (error) {
      return {
        configured: false,
        results: [],
        notice: 'Appointment saved. Confirmation email could not be delivered.',
      };
    }
    const configured = !!data?.configured;
    const results = (data?.results || []) as EmailDeliveryResult[];
    const failed = results.some((r) => r.status === 'failed');
    const skipped = results.some((r) => r.status === 'skipped');
    let notice: string | null = null;
    if (failed || !configured) {
      notice = 'Appointment saved — confirmation email could not be delivered.';
    } else if (skipped) {
      notice = 'Appointment saved. Confirmation email could not be sent because a recipient has no email address.';
    }
    return { configured, results, notice };
  } catch {
    return {
      configured: false,
      results: [],
      notice: 'Appointment saved — confirmation email could not be delivered.',
    };
  }
}

export interface AppointmentEmailRow {
  id: string;
  appointment_id: string;
  event: string;
  recipient_type: string;
  recipient_email: string | null;
  recipient_name: string | null;
  subject: string | null;
  status: string;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

/** Appointment communication history (sent / failed) for the drawer. */
export function useAppointmentEmails(appointmentId: string | null) {
  const [items, setItems] = useState<AppointmentEmailRow[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!appointmentId) { setItems([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('og_appointment_emails')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) throw error;
      setItems((data || []) as AppointmentEmailRow[]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => { void reload(); }, [reload]);

  return { items, loading, reload };
}