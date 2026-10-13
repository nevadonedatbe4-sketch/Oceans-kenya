import { supabase } from '@/lib/supabase';

/**
 * Per-recipient read tracking for leads & enquiries.
 *
 * The legacy `is_read` column on `leads`/`enquiries` is a SINGLE shared flag, so
 * it can't tell "the admin read this" apart from "the assigned agent read this".
 * These helpers write the per-recipient `lead_reads` / `enquiry_reads` overlay
 * that the `og_unread_badges` RPC counts from, so read state is independent per
 * user (an admin opening a lead never clears the agent's unread, and vice-versa).
 *
 * All writes are idempotent (upsert with ignoreDuplicates / scoped delete), so
 * repeated clicks, retries or reconnects can never inflate or corrupt a count.
 */

export async function markEnquiriesRead(userId: string, ids: string[]): Promise<void> {
  if (!userId || ids.length === 0) return;
  const rows = ids.map((enquiry_id) => ({ enquiry_id, user_id: userId }));
  const { error } = await supabase
    .from('enquiry_reads')
    .upsert(rows, { onConflict: 'enquiry_id,user_id', ignoreDuplicates: true });
  if (error) console.error('markEnquiriesRead failed:', error);
}

export async function markEnquiriesUnread(userId: string, ids: string[]): Promise<void> {
  if (!userId || ids.length === 0) return;
  const { error } = await supabase
    .from('enquiry_reads')
    .delete()
    .eq('user_id', userId)
    .in('enquiry_id', ids);
  if (error) console.error('markEnquiriesUnread failed:', error);
}

export async function markLeadsRead(userId: string, ids: string[]): Promise<void> {
  if (!userId || ids.length === 0) return;
  const rows = ids.map((lead_id) => ({ lead_id, user_id: userId }));
  const { error } = await supabase
    .from('lead_reads')
    .upsert(rows, { onConflict: 'lead_id,user_id', ignoreDuplicates: true });
  if (error) console.error('markLeadsRead failed:', error);
}

export async function markLeadsUnread(userId: string, ids: string[]): Promise<void> {
  if (!userId || ids.length === 0) return;
  const { error } = await supabase
    .from('lead_reads')
    .delete()
    .eq('user_id', userId)
    .in('lead_id', ids);
  if (error) console.error('markLeadsUnread failed:', error);
}