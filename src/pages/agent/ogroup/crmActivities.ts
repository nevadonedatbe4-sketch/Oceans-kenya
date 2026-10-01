import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ContactChannel } from './calendarTypes';
import { CHANNEL_LABELS } from './calendarTypes';

// ─────────────────────────────────────────────────────────────
// CRM ACTIVITIES — ONE connected timeline table.
//
// An appointment must never be an isolated calendar object. When a
// viewing is scheduled / completed / cancelled we write a row here
// under `property`, `contact` and `agent` so the property timeline,
// applicant timeline and agent activity all reflect it.
//
// Staff-scoped (og_is_staff) so an agent can read agency activity
// without the admin-only lock on `activity_logs`.
// ─────────────────────────────────────────────────────────────

export type CrmEntityType = 'property' | 'contact' | 'agent';

export interface CrmActivityRow {
  id: string;
  entity_type: CrmEntityType;
  entity_id: string;
  appointment_id: string | null;
  action: string;
  channel: string | null;
  summary: string | null;
  actor_id: string | null;
  created_at: string;
}

export const CRM_ACTION_LABELS: Record<string, string> = {
  viewing_scheduled: 'Viewing scheduled',
  viewing_completed: 'Viewing completed',
  viewing_cancelled: 'Viewing cancelled',
  appointment_scheduled: 'Appointment scheduled',
  appointment_completed: 'Appointment completed',
  appointment_cancelled: 'Appointment cancelled',
  appointment_created: 'Appointment created',
  appointment_reassigned: 'Appointment reassigned',
  feedback_recorded: 'Feedback recorded',
  contacted: 'Contacted',
};

export const CRM_ACTION_ICON: Record<string, string> = {
  viewing_scheduled: 'ri-home-4-line',
  viewing_completed: 'ri-checkbox-circle-line',
  viewing_cancelled: 'ri-close-circle-line',
  appointment_scheduled: 'ri-calendar-event-line',
  appointment_completed: 'ri-checkbox-circle-line',
  appointment_cancelled: 'ri-close-circle-line',
  appointment_created: 'ri-add-circle-line',
  appointment_reassigned: 'ri-user-shared-line',
  feedback_recorded: 'ri-flag-line',
  contacted: 'ri-phone-line',
};

export interface LogCrmInput {
  entity_type: CrmEntityType;
  entity_id: string;
  appointment_id?: string | null;
  action: string;
  channel?: string | null;
  summary?: string | null;
  actor_id?: string | null;
}

/** Best-effort timeline write. Never blocks the primary action. */
export async function logCrmActivity(input: LogCrmInput): Promise<void> {
  try {
    await supabase.from('og_crm_activities').insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      appointment_id: input.appointment_id ?? null,
      action: input.action,
      channel: input.channel ?? null,
      summary: input.summary ?? null,
      actor_id: input.actor_id ?? null,
    });
  } catch {
    // Timeline writes are non-critical to the user's immediate action.
  }
}

/**
 * Record a touch on a contact: writes the channel-tagged timeline entry AND
 * refreshes `last_contact_at` / `last_contact_channel` (history is never
 * overwritten — the timeline keeps every previous entry).
 */
export async function recordContactTouch(input: {
  contactId: string;
  channel: ContactChannel;
  appointmentId?: string | null;
  summary?: string | null;
  actorId?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await logCrmActivity({
    entity_type: 'contact',
    entity_id: input.contactId,
    appointment_id: input.appointmentId ?? null,
    action: 'contacted',
    channel: input.channel,
    summary: input.summary || `Contacted via ${CHANNEL_LABELS[input.channel] || input.channel}`,
    actor_id: input.actorId ?? null,
  });
  try {
    await supabase
      .from('contacts')
      .update({ last_contact_at: now, last_contact_channel: input.channel })
      .eq('id', input.contactId);
  } catch {
    // Non-fatal.
  }
}

export interface ContactSnapshot {
  last_contact_at: string | null;
  last_contact_channel: string | null;
}

/** Latest last-contacted info for a contact (channel + timestamp). */
export async function fetchContactSnapshot(contactId: string): Promise<ContactSnapshot | null> {
  const { data } = await supabase
    .from('contacts')
    .select('last_contact_at,last_contact_channel')
    .eq('id', contactId)
    .maybeSingle();
  return (data as ContactSnapshot | null) || null;
}

/** Loads one entity's timeline, newest first, live. */
export function useEntityTimeline(entityType: CrmEntityType | null, entityId: string | null) {
  const [items, setItems] = useState<CrmActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!entityType || !entityId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('og_crm_activities')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(40);
      if (e) throw e;
      setItems((data || []) as CrmActivityRow[]);
    } catch (err) {
      setError((err as Error).message || 'Unable to load the timeline.');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { void load(); }, [load]);
  return { items, loading, error, reload: load };
}

/**
 * Mirror an appointment lifecycle change onto the connected timelines.
 * Called from create / status / reschedule paths so nothing diverges.
 */
export async function mirrorAppointmentToTimelines(input: {
  appointmentId: string;
  kind: string;
  action: 'scheduled' | 'completed' | 'cancelled' | 'created' | 'reassigned' | 'feedback';
  title: string;
  propertyId?: string | null;
  contactIds?: string[] | null;
  agentId?: string | null;
  actorId?: string | null;
}): Promise<void> {
  const isViewing = input.kind === 'viewing';
  const map: Record<string, string> = {
    scheduled: isViewing ? 'viewing_scheduled' : 'appointment_scheduled',
    completed: isViewing ? 'viewing_completed' : 'appointment_completed',
    cancelled: isViewing ? 'viewing_cancelled' : 'appointment_cancelled',
    created: 'appointment_created',
    reassigned: 'appointment_reassigned',
    feedback: 'feedback_recorded',
  };
  const action = map[input.action] || 'appointment_scheduled';
  const summary = `${input.title}`;

  const writes: LogCrmInput[] = [];
  if (input.propertyId) {
    writes.push({ entity_type: 'property', entity_id: input.propertyId, appointment_id: input.appointmentId, action, summary, actor_id: input.actorId });
  }
  (input.contactIds || []).forEach((cid) => {
    writes.push({ entity_type: 'contact', entity_id: cid, appointment_id: input.appointmentId, action, summary, actor_id: input.actorId });
  });
  if (input.agentId) {
    writes.push({ entity_type: 'agent', entity_id: input.agentId, appointment_id: input.appointmentId, action, summary, actor_id: input.actorId });
  }
  await Promise.all(writes.map(logCrmActivity));
}