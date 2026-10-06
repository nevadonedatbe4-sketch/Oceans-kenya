import type { CalendarFilters } from './calendarTypes';

// ─────────────────────────────────────────────────────────────
// APPOINTMENT QUERY — the ONE place filters + search are turned
// into real Supabase predicates. Both the agent and admin
// calendars run through this so a filter is never "visual only".
// ─────────────────────────────────────────────────────────────

function escapeLike(term: string): string {
  return term.trim().replace(/[%,()]/g, ' ').trim();
}

/**
 * Apply the filter set to a Supabase query builder. Generic over the
 * builder type so it chains transparently for `.select()` results.
 */
export function applyAppointmentFilters<T>(query: T, filters: CalendarFilters): T {
   
  let q: any = query;

  if (filters.agentId !== 'all') q = q.eq('assigned_user_id', filters.agentId);
  if (filters.kind !== 'all') q = q.eq('kind', filters.kind);
  if (filters.status !== 'all') q = q.eq('status', filters.status);
  else if (!filters.includeCancelled) q = q.not('status', 'in', '("cancelled","no_show")');
  if (filters.propertyId !== 'all') q = q.eq('property_id', filters.propertyId);
  if (filters.contactId !== 'all') q = q.contains('contact_ids', [filters.contactId]);
  if (filters.recurringOnly) q = q.not('recurrence_rule', 'is', null);

  const loc = escapeLike(filters.location);
  if (loc) q = q.ilike('location_text', `%${loc}%`);

  const term = escapeLike(filters.search);
  if (term) {
    q = q.or(
      [
        `title.ilike.%${term}%`,
        `client_name.ilike.%${term}%`,
        `property_title.ilike.%${term}%`,
        `location_text.ilike.%${term}%`,
        `client_phone.ilike.%${term}%`,
        `client_email.ilike.%${term}%`,
      ].join(','),
    );
  }
  return q as T;
}