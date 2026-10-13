import { supabase } from '@/lib/supabase';

/**
 * THE client-side notification writer.
 *
 * Notifications are created ONLY here (client side) and in trusted Edge
 * Functions (server side, e.g. crm-ingest). Every write is scoped to a real,
 * verified recipient so a notification can never land on the wrong user, on the
 * administrator by default, or on all agents.
 */

export interface NotifyResult {
  notified: boolean;
  /** Why no row was created (so callers can distinguish a real failure from a
   *  harmless dedupe hit). */
  reason?: 'no_user' | 'duplicate' | 'insert_failed';
}

/**
 * Resolve the authenticated user id behind an agent record.
 * `agents.user_id` is the single authoritative link between an agent profile and
 * the auth account that should receive agent notifications.
 */
async function resolveAgentUserId(agentId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('user_id')
    .eq('id', agentId)
    .maybeSingle();
  if (error) {
    console.error('[notifications] resolveAgentUserId failed:', error);
    return null;
  }
  return data?.user_id ?? null;
}

/**
 * Create exactly one "lead assigned" notification for the agent who was given
 * the lead.
 *
 * Idempotent: if an unread assignment notification already exists for the same
 * (lead, recipient) it is a no-op, so retries, double submits, and repeated
 * reassignment to the same agent can never inflate the agent's unread count.
 * A genuinely different assignment (a different agent) still notifies the new
 * recipient.
 */
export async function notifyLeadAssigned(params: {
  leadId: string;
  leadName?: string;
  agentId: string;
}): Promise<NotifyResult> {
  const { leadId, agentId } = params;
  const leadName = (params.leadName || '').trim() || 'A new lead';

  const recipientId = await resolveAgentUserId(agentId);
  if (!recipientId) {
    // The agent profile is not yet linked to an auth account — we cannot address
    // a notification to anyone, and we must NOT fall back to notifying everyone.
    console.error('[notifications] lead assignment undeliverable: agent has no linked user account', agentId);
    return { notified: false, reason: 'no_user' };
  }

  // Idempotency guard: at most one unread assignment notification per lead+recipient.
  const { data: existing, error: dupError } = await supabase
    .from('notifications')
    .select('id')
    .eq('recipient_id', recipientId)
    .eq('lead_id', leadId)
    .eq('type', 'lead_assigned')
    .eq('is_read', false)
    .limit(1);
  if (dupError) {
    console.error('[notifications] lead assignment dedupe check failed:', dupError);
    return { notified: false, reason: 'insert_failed' };
  }
  if (existing && existing.length > 0) {
    return { notified: false, reason: 'duplicate' };
  }

  const { error } = await supabase.from('notifications').insert({
    recipient_id: recipientId,
    type: 'lead_assigned',
    title: 'New lead assigned to you',
    body: `${leadName} has been assigned to you.`,
    lead_id: leadId,
    link: '/agent/leads',
    is_read: false,
  });
  if (error) {
    console.error('[notifications] lead assignment insert failed:', error);
    return { notified: false, reason: 'insert_failed' };
  }
  return { notified: true };
}