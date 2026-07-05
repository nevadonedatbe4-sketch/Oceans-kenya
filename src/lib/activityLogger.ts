import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface ActivityLogEntry {
  user_id: string;
  user_name: string;
  action: string;
  module: string;
  record_id?: string;
  record_title?: string;
  before_value?: Record<string, unknown>;
  after_value?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function logActivity(entry: ActivityLogEntry) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: entry.user_id,
      user_name: entry.user_name,
      action: entry.action,
      module: entry.module,
      record_id: entry.record_id || null,
      record_title: entry.record_title || null,
      before_value: entry.before_value || null,
      after_value: entry.after_value || null,
      metadata: entry.metadata || null,
    });
  } catch (err) {
    console.error('Activity log failed:', err);
  }
}

export function useActivityLogger() {
  const { user } = useAuth();

  const log = async (
    action: string,
    module: string,
    recordId?: string,
    recordTitle?: string,
    beforeValue?: Record<string, unknown>,
    afterValue?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) => {
    if (!user) return;
    await logActivity({
      user_id: user.id,
      user_name: user.name || user.email || 'Unknown',
      action,
      module,
      record_id: recordId,
      record_title: recordTitle,
      before_value: beforeValue,
      after_value: afterValue,
      metadata,
    });
  };

  return { log };
}

// Pre-built action helpers
export async function logPropertyCreated(
  userId: string, userName: string, propertyId: string, title: string
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'created', module: 'properties', record_id: propertyId, record_title: title });
}

export async function logPropertyEdited(
  userId: string, userName: string, propertyId: string, title: string, before: Record<string, unknown>, after: Record<string, unknown>
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'edited', module: 'properties', record_id: propertyId, record_title: title, before_value: before, after_value: after });
}

export async function logPropertyDeleted(
  userId: string, userName: string, propertyId: string, title: string
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'deleted', module: 'properties', record_id: propertyId, record_title: title });
}

export async function logPropertyPublished(
  userId: string, userName: string, propertyId: string, title: string, published: boolean
) {
  await logActivity({ user_id: userId, user_name: userName, action: published ? 'published' : 'unpublished', module: 'properties', record_id: propertyId, record_title: title });
}

export async function logPropertyFeatured(
  userId: string, userName: string, propertyId: string, title: string, featured: boolean
) {
  await logActivity({ user_id: userId, user_name: userName, action: featured ? 'featured' : 'unfeatured', module: 'properties', record_id: propertyId, record_title: title });
}

export async function logLeadCreated(
  userId: string, userName: string, leadId: string, leadName: string
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'created', module: 'leads', record_id: leadId, record_title: leadName });
}

export async function logLeadUpdated(
  userId: string, userName: string, leadId: string, leadName: string, before: Record<string, unknown>, after: Record<string, unknown>
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'updated', module: 'leads', record_id: leadId, record_title: leadName, before_value: before, after_value: after });
}

export async function logLeadDeleted(
  userId: string, userName: string, leadId: string, leadName: string
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'deleted', module: 'leads', record_id: leadId, record_title: leadName });
}

export async function logLeadAssigned(
  userId: string, userName: string, leadId: string, leadName: string, agentName: string
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'assigned', module: 'leads', record_id: leadId, record_title: leadName, metadata: { agent_name: agentName } });
}

export async function logDealCreated(
  userId: string, userName: string, dealId: string, title: string
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'created', module: 'deals', record_id: dealId, record_title: title });
}

export async function logDealUpdated(
  userId: string, userName: string, dealId: string, title: string, before: Record<string, unknown>, after: Record<string, unknown>
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'updated', module: 'deals', record_id: dealId, record_title: title, before_value: before, after_value: after });
}

export async function logDealDeleted(
  userId: string, userName: string, dealId: string, title: string
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'deleted', module: 'deals', record_id: dealId, record_title: title });
}

export async function logNeighbourhoodCreated(
  userId: string, userName: string, id: string, name: string
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'created', module: 'neighbourhoods', record_id: id, record_title: name });
}

export async function logNeighbourhoodEdited(
  userId: string, userName: string, id: string, name: string, before: Record<string, unknown>, after: Record<string, unknown>
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'edited', module: 'neighbourhoods', record_id: id, record_title: name, before_value: before, after_value: after });
}

export async function logNeighbourhoodDeleted(
  userId: string, userName: string, id: string, name: string
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'deleted', module: 'neighbourhoods', record_id: id, record_title: name });
}

export async function logImageUploaded(
  userId: string, userName: string, mediaId: string, fileName: string
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'uploaded', module: 'media', record_id: mediaId, record_title: fileName });
}

export async function logAgentCreated(
  userId: string, userName: string, agentId: string, agentName: string
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'created', module: 'agents', record_id: agentId, record_title: agentName });
}

export async function logAgentUpdated(
  userId: string, userName: string, agentId: string, agentName: string
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'updated', module: 'agents', record_id: agentId, record_title: agentName });
}

export async function logAgentDeleted(
  userId: string, userName: string, agentId: string, agentName: string
) {
  await logActivity({ user_id: userId, user_name: userName, action: 'deleted', module: 'agents', record_id: agentId, record_title: agentName });
}