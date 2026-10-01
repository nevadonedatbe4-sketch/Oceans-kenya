import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────
// APPOINTMENT LOOKUPS — live searches used by the unified
// appointment form (properties + applicants/contacts), plus the
// de-duplicating "add new contact" path so the calendar never
// creates a second contact for an email/phone it already knows.
//
// NOTE: `contacts.agent_id` references `agents.id` (NOT the user id)
// and agent RLS checks against it — so we always resolve the real
// agent row before writing, otherwise the insert would be rejected.
// ─────────────────────────────────────────────────────────────

export interface PropertyOption {
  id: string;
  title: string | null;
  slug: string | null;
  location: string | null;
  property_type: string | null;
  price: number | null;
  currency: string | null;
  purpose: string | null;
  cover_image?: string | null;
  main_image?: string | null;
  /** The `agents.id` that owns the listing (used to rank "My Listings" first). */
  agent_id?: string | null;
}

export interface ContactOption {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  type: string | null;
}

export interface NewContactInput {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  type?: string;
  notes?: string;
}

const CONTACT_COLS = 'id,name,first_name,last_name,email,phone,company,type';

export function contactDisplayName(c: ContactOption): string {
  const full = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  return c.name || full || c.email || c.phone || 'Contact';
}

export function contactSubtitle(c: ContactOption): string {
  return [c.company, c.email, c.phone].filter(Boolean).join(' · ') || 'No contact details';
}

/** Live search over existing properties (listings) by title / location / reference. */
export async function searchProperties(term: string, limit = 8): Promise<PropertyOption[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const { data, error } = await supabase
    .from('listings')
    .select(PROPERTY_COLS)
    .or(`title.ilike.${like},location.ilike.${like},neighbourhood.ilike.${like}`)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as PropertyOption[];
}

/** Fetch a single listing summary (used to hydrate a saved appointment's property). */
export async function fetchPropertySummary(id: string): Promise<PropertyOption | null> {
  if (!id) return null;
  const { data } = await supabase.from('listings').select(PROPERTY_COLS).eq('id', id).maybeSingle();
  return (data as PropertyOption) || null;
}

/** Live search over applicants/contacts by name, phone, email or company. */
export async function searchContacts(term: string, limit = 8): Promise<ContactOption[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const { data, error } = await supabase
    .from('contacts')
    .select(CONTACT_COLS)
    .or(
      `name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like},company.ilike.${like}`,
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as ContactOption[];
}

/**
 * Property search with the AGENT'S OWN listings ranked FIRST.
 * "My Listings" = listings whose `agent_id` is the caller's own `agents` row.
 * Everything else is returned as "Other properties" (still RLS-filtered server-side).
 */
export async function searchPropertiesRanked(
  term: string,
  userId?: string | null,
  limit = 8,
): Promise<{ mine: PropertyOption[]; others: PropertyOption[] }> {
  const q = term.trim();
  if (q.length < 2) return { mine: [], others: [] };
  const like = `%${q}%`;
  const { data, error } = await supabase
    .from('listings')
    .select(PROPERTY_COLS)
    .or(`title.ilike.${like},location.ilike.${like},neighbourhood.ilike.${like}`)
    .order('updated_at', { ascending: false })
    .limit(limit * 2);
  if (error) throw error;
  const all = (data || []) as PropertyOption[];
  const agentRowId = await resolveAgentRowId(userId);
  if (!agentRowId) return { mine: [], others: all.slice(0, limit) };
  const mine = all.filter((p) => p.agent_id === agentRowId);
  const mineIds = new Set(mine.map((m) => m.id));
  const others = all.filter((p) => !mineIds.has(p.id));
  return { mine: mine.slice(0, limit), others: others.slice(0, limit) };
}

/**
 * Contact search with the AGENT'S OWN contacts ranked FIRST.
 * "My Contacts" = contacts whose `agent_id` is the caller's own `agents` row.
 */
export async function searchContactsRanked(
  term: string,
  userId?: string | null,
  limit = 8,
): Promise<{ mine: ContactOption[]; others: ContactOption[] }> {
  const q = term.trim();
  if (q.length < 2) return { mine: [], others: [] };
  const like = `%${q}%`;
  const { data, error } = await supabase
    .from('contacts')
    .select(`${CONTACT_COLS},agent_id`)
    .or(
      `name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like},company.ilike.${like}`,
    )
    .order('created_at', { ascending: false })
    .limit(limit * 2);
  if (error) throw error;
  const all = (data || []) as (ContactOption & { agent_id?: string | null })[];
  const agentRowId = await resolveAgentRowId(userId);
  if (!agentRowId) return { mine: [], others: all.slice(0, limit) };
  const mine = all.filter((c) => c.agent_id === agentRowId);
  const mineIds = new Set(mine.map((m) => m.id));
  const others = all.filter((c) => !mineIds.has(c.id));
  return { mine: mine.slice(0, limit), others: others.slice(0, limit) };
}

/** Fetch contacts by id (used to hydrate a saved appointment's applicants). */
export async function fetchContactsByIds(ids: string[]): Promise<ContactOption[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('contacts').select(CONTACT_COLS).in('id', ids);
  if (error) throw error;
  return (data || []) as ContactOption[];
}

/** De-dupe: is there already a contact with this email or phone? */
export async function findContactMatch(
  email?: string | null,
  phone?: string | null,
): Promise<ContactOption | null> {
  const filters: string[] = [];
  if (email && email.trim()) filters.push(`email.ilike.${email.trim()}`);
  if (phone && phone.trim()) filters.push(`phone.ilike.%${phone.trim().replace(/\s+/g, '')}%`);
  if (!filters.length) return null;
  const { data } = await supabase.from('contacts').select(CONTACT_COLS).or(filters.join(',')).limit(1);
  return (data && (data[0] as ContactOption)) || null;
}

/**
 * Resolve the `agents.id` row that belongs to a user id.
 * `contacts.agent_id` references `agents.id`, so we must translate the
 * logged-in user id before writing a contact — otherwise the agent RLS
 * `contacts_agent_own` policy (which checks the agents table) rejects it.
 */
export async function resolveAgentRowId(userId?: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase.from('agents').select('id').eq('user_id', userId).maybeSingle();
  return (data as { id?: string } | null)?.id || null;
}

/**
 * Create a contact — but never a duplicate. If an existing contact matches the
 * supplied email/phone, that record is returned instead of inserting a new one.
 */
export async function createContactDeduped(
  input: NewContactInput,
  userId?: string | null,
): Promise<{ contact: ContactOption; deduped: boolean }> {
  const existing = await findContactMatch(input.email, input.phone);
  if (existing) return { contact: existing, deduped: true };

  const agentRowId = await resolveAgentRowId(userId);
  const name = [input.first_name, input.last_name].filter(Boolean).join(' ').trim() || input.first_name;
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      name,
      first_name: input.first_name || null,
      last_name: input.last_name || null,
      email: input.email || null,
      phone: input.phone || null,
      company: input.company || null,
      type: input.type || null,
      notes: input.notes || null,
      agent_id: agentRowId,
      source: 'Appointment',
    })
    .select(CONTACT_COLS)
    .single();
  if (error) throw error;
  return { contact: data as ContactOption, deduped: false };
}

/** Lightweight option lists for the calendar filter panel. */
export async function listPropertyOptions(limit = 60): Promise<PropertyOption[]> {
  const { data } = await supabase
    .from('listings')
    .select(PROPERTY_COLS)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return (data || []) as PropertyOption[];
}

export async function listContactOptions(limit = 100): Promise<ContactOption[]> {
  const { data } = await supabase
    .from('contacts')
    .select(CONTACT_COLS)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []) as ContactOption[];
}

export function formatPrice(p: PropertyOption): string {
  if (p.price == null) return '';
  const cur = p.currency || 'KES';
  return `${cur} ${new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(p.price)}`;
}

/** Columns fetched for every property lookup (kept in one place). */
const PROPERTY_COLS = 'id,title,slug,location,property_type,price,currency,purpose,cover_image,main_image,agent_id';

/** Best available preview image for a listing (cover first, then main). */
export function propertyImage(p: Pick<PropertyOption, 'cover_image' | 'main_image'>): string | null {
  return p.cover_image || p.main_image || null;
}

/** One-line subtitle used to distinguish listings in search + previews. */
export function propertyMeta(p: PropertyOption): string {
  return [p.property_type, p.location, formatPrice(p)].filter(Boolean).join(' · ');
}