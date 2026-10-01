import { supabase } from '@/lib/supabase';

export interface SourceContactLookup {
  contactId?: string | null;
  name: string;
  email: string;
  phone: string;
  type?: string;
  source?: string;
}

function escapeLike(v: string): string {
  return v.replace(/[%_]/g, (m) => `\\${m}`);
}

/**
 * Unified Source & Seller/Owner Continuity resolver.
 *
 * Guarantees a single consistent concept across every listing type:
 * Source/Owner/Seller → CRM Contact → Listing.
 *
 * 1. If a contact is already linked, keep it (persists through draft/save/edit/reload).
 * 2. If nothing is entered, return null.
 * 3. Search existing contacts first to avoid duplicate records.
 * 4. No match → auto-create a contact and link it.
 */
export async function resolveSourceContact(input: SourceContactLookup): Promise<string | null> {
  const name = (input.name || '').trim();
  const email = (input.email || '').trim();
  const phone = (input.phone || '').trim();
  const hasIdentity = Boolean(name || email || phone);

  // Already linked — keep the link intact.
  if (input.contactId) return input.contactId;

  // Nothing to match on — no source contact.
  if (!hasIdentity) return null;

  let query = supabase.from('contacts').select('*');
  if (email) {
    query = query.eq('email', email);
  } else {
    const ors: string[] = [];
    if (name) ors.push(`name.ilike.%${escapeLike(name)}%`);
    if (phone) ors.push(`phone.ilike.%${escapeLike(phone)}%`);
    query = query.or(ors.length ? ors.join(',') : `name.ilike.%${escapeLike(name)}%`);
  }
  const { data } = await query.limit(3).maybeSingle();
  if (data) return String(data.id);

  // No existing match — create a new contact and link it.
  const nameValue = name || phone || email;
  const { data: created, error } = await supabase
    .from('contacts')
    .insert({
      name: nameValue ? nameValue : 'Unknown Source',
      email: email || null,
      phone: phone || null,
      type: input.type || 'seller',
      source: input.source || null,
      tags: input.source ? [input.source] : null,
    })
    .select('id')
    .single();
  if (error || !created) return null;
  return String(created.id);
}