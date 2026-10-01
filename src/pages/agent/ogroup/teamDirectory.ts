import { supabase } from '@/lib/supabase';
import { friendlyMessengerError } from './messengerData';
import { fetchStaffDirectory, type StaffRow } from './staffDirectory';
import type { TeamMember } from './types';

function emailKey(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function digits(value?: string | null): string {
  return (value || '').replace(/\D/g, '');
}

export { fetchStaffDirectory, fetchStaffMap } from './staffDirectory';
export type { StaffRow } from './staffDirectory';

/**
 * The internal OGroup team directory.
 *
 * Combines:
 *  - every registered staff member (active), and
 *  - the signed-in user's saved contacts (their personal contact book).
 *
 * Saved contacts that already belong to a registered account appear once, as
 * that teammate. Contacts with no account are surfaced as "external" entries so
 * the book is visible in the Messenger — they become chattable once they join.
 */
export async function fetchTeamDirectory(currentUserId: string): Promise<TeamMember[]> {
  const rows = await fetchStaffDirectory();
  const activeProfiles = rows
    .filter((p) => p.status === 'active')
    .filter((p) => p.user_id !== currentUserId);

  const members: TeamMember[] = activeProfiles.map((p) => ({
    user_id: p.user_id,
    name: p.name || p.email?.split('@')[0] || 'Team member',
    email: p.email || undefined,
    avatar_url: p.avatar_url || undefined,
    role: p.role || undefined,
    title: p.title || undefined,
    about: p.about || undefined,
    phone: p.phone || undefined,
    status: p.status || undefined,
    country: p.country || undefined,
    department: p.department || undefined,
    office: p.office || undefined,
  }));

  // Lookups so a saved contact can be matched to a real, chattable account.
  const byEmail = new Map<string, string>();
  const phoneIndex: { user_id: string; digits: string }[] = [];
  activeProfiles.forEach((p) => {
    if (p.email) byEmail.set(emailKey(p.email), p.user_id);
    const d = digits(p.phone);
    if (d.length >= 7) phoneIndex.push({ user_id: p.user_id, digits: d });
  });

  const { data: contacts } = await supabase
    .from('agent_contacts')
    .select('id, name, email, phone')
    .eq('user_id', currentUserId);

  const companions: TeamMember[] = [];
  (contacts || []).forEach((c) => {
    const eKey = emailKey(c.email);
    const dKey = digits(c.phone);

    let linkedId: string | null = eKey && byEmail.has(eKey) ? byEmail.get(eKey)! : null;
    if (!linkedId && dKey.length >= 7) {
      const hit = phoneIndex.find((p) => phonesMatch(p.digits, dKey));
      if (hit) linkedId = hit.user_id;
    }

    // Already listed as a team member → don't show a duplicate row.
    if (linkedId) return;

    companions.push({
      user_id: `contact:${c.id}`,
      name: c.name || 'Saved contact',
      email: c.email || undefined,
      phone: c.phone || undefined,
      role: 'contact',
      contact_id: c.id,
      external: true,
    });
  });

  companions.sort((a, b) => a.name.localeCompare(b.name));
  return [...members, ...companions];
}

/**
 * Resolve a manually entered contact (email / phone) to a registered account so
 * a chat can be started. Returns null when nobody matches yet.
 */
export async function resolveProfileByContact(
  email?: string | null,
  phone?: string | null,
): Promise<{ user_id: string; name: string } | null> {
  const eKey = emailKey(email);
  const dKey = digits(phone);
  if (!eKey && dKey.length < 7) return null;

  let data: StaffRow[] = [];
  try {
    data = await fetchStaffDirectory();
  } catch {
    return null;
  }

  const hit = data.find((p) => {
    if (eKey && emailKey(p.email) === eKey) return true;
    if (dKey.length >= 7 && phonesMatch(digits(p.phone), dKey)) return true;
    return false;
  });

  return hit ? { user_id: hit.user_id, name: hit.name || 'Teammate' } : null;
}

/**
 * Find (or create) the direct 1:1 conversation between two users.
 * Returns the conversation id.
 *
 * Runs inside a single SECURITY DEFINER function so the conversation and both
 * memberships are created atomically — no orphan conversations, and the
 * database (not the client) decides who is allowed to start a chat.
 */
export async function findOrCreateDirectConversation(
  userId: string,
  otherUserId: string,
): Promise<string> {
  if (!userId) throw new Error('Your session has expired. Please sign in again.');
  if (!otherUserId) throw new Error('Could not start this chat. Please try again.');

  const { data, error } = await supabase.rpc('og_create_direct_conversation', {
    p_other: otherUserId,
  });
  if (error) {
    console.error('[messenger] direct conversation rpc failed', error);
    throw new Error(friendlyMessengerError(error, 'Unable to open the team conversation. Please check your team access and try again.'));
  }
  if (!data) throw new Error('Could not start this chat. Please try again.');

  return data as string;
}

/**
 * Create a group conversation with a given set of members (by user id).
 * Atomic + validated server-side; the creator becomes the group admin.
 */
export async function createGroupConversation(
  userId: string,
  name: string,
  description: string,
  memberIds: string[],
  avatarUrl?: string | null,
): Promise<string> {
  if (!userId) throw new Error('Your session has expired. Please sign in again.');

  const otherMembers = Array.from(new Set(memberIds.filter((id) => id && id !== userId)));

  const { data, error } = await supabase.rpc('og_create_group_conversation', {
    p_name: name,
    p_description: description || null,
    p_member_ids: otherMembers,
    p_avatar_url: avatarUrl || null,
  });
  if (error) {
    console.error('[messenger] group conversation rpc failed', error);
    throw new Error(friendlyMessengerError(error, 'Unable to create this group. Please verify the selected members and try again.'));
  }
  if (!data) throw new Error('Could not create the group. Please try again.');

  return data as string;
}

/** Update a membership row (pin / mute / archive / mark-read). */
export async function updateMembership(
  conversation_id: string,
  userId: string,
  patch: { is_pinned?: boolean; muted_until?: string | null; archived_at?: string | null },
): Promise<void> {
  await supabase
    .from('og_conversation_members')
    .update(patch)
    .eq('conversation_id', conversation_id)
    .eq('user_id', userId);
}

/**
 * Two phone numbers are considered the same when their digits match (or share a 9-digit tail).
 */
function phonesMatch(a: string, b: string): boolean {
  if (a.length < 7 || b.length < 7) return false;
  if (a === b) return true;
  if (a.length >= 9 && b.length >= 9 && a.slice(-9) === b.slice(-9)) return true;
  return false;
}