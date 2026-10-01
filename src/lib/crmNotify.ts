import { supabase } from '@/lib/supabase';

export type CrmNotifyEvent = 'new_lead' | 'new_message' | 'deal_created' | 'deal_status' | 'lead_assigned';

export interface CrmNotifyPayload {
  event: CrmNotifyEvent;
  agent_id?: string | null;
  deal_id?: string;
  deal_title?: string;
  deal_status?: string;
  property_price?: number | string | null;
  lead_id?: string;
  lead_name?: string;
  message_preview?: string;
  property_title?: string;
  property_location?: string;
  property_url?: string;
}

/**
 * Fire-and-forget CRM notification email.
 *
 * The underlying record is already saved by the time this runs, so a failed
 * notification must never surface as a failed user action. The router
 * (`crm-notify`) resolves the recipient, sends the matching editable template
 * and records the outcome in the Email Management delivery log. Errors are
 * logged to the console and remain visible in that log.
 */
export function notifyCrm(payload: CrmNotifyPayload): void {
  void supabase.functions
    .invoke('crm-notify', { body: payload })
    .catch((err) => {
      console.error('crm-notify failed:', err);
    });
}