/**
 * Client Requests — data access layer (the single API used by both portals).
 *
 * Everything goes through Supabase; RLS enforces who may read/write what.
 * The matching engine is applied here so the stored match rows are always
 * derived from the live inventory, never hand-typed.
 */

import { supabase } from '@/lib/supabase';
import { NON_PUBLIC_STATUSES } from '@/lib/publicListings';
import {
  normalizeListingRow,
  normalizeLandRow,
  scoreCandidate,
  MATCH_WEIGHTS,
  type CandidateProperty,
} from '@/lib/clientMatching';
import { fetchFxRates } from '@/lib/fxRates';
import { normalizeCategory } from '@/lib/clientRequests';
import { areaCentreFor } from '@/lib/areaCentres';

export interface ClientRequest {
  id: string;
  reference: string | null;
  title: string | null;
  contact_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  preferred_contact_method: string | null;
  source: string | null;
  transaction_type: string | null;
  property_category: string | null;
  property_subtype: string | null;
  /** Preferred property types (multi-choice). Takes precedence over property_subtype. */
  property_subtypes: string[] | null;
  locations: string[] | null;
  location_radius_km: number | null;
  allow_alternatives: boolean | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
  bedrooms_min: number | null;
  bathrooms_min: number | null;
  size_min: number | null;
  furnishing: string | null;
  /** Independent furnishing toggles (multi-choice). Takes precedence over furnishing. */
  furnishing_options: string[] | null;
  preferred_amenities: string[] | null;
  move_in_date: string | null;
  /** Free-text occupation timeline, e.g. "Flexible", "Next week", "3 months from now". */
  move_in_flexible: string | null;
  financing_notes: string | null;
  additional_requirements: string | null;
  hard_criteria: string[] | null;
  priority: string | null;
  status: string | null;
  assigned_agent_id: string | null;
  next_follow_up_at: string | null;
  date_received: string | null;
  consent_given: boolean | null;
  internal_notes: string | null;
  created_by: string | null;
  last_activity_at: string | null;
  matches_stale: boolean | null;
  match_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface ClientMatch {
  id: string;
  request_id: string;
  listing_id: string;
  listing_source: string;
  listing_slug: string | null;
  listing_title: string | null;
  listing_price: number | null;
  listing_currency: string | null;
  listing_image: string | null;
  listing_location: string | null;
  listing_category: string | null;
  match_score: number;
  match_label: string;
  satisfied_criteria: string[] | null;
  unmet_criteria: string[] | null;
  missing_info: string[] | null;
  shortlisted: boolean;
  excluded: boolean;
  shared_with_client: boolean;
  shared_at: string | null;
  client_feedback: string | null;
  client_feedback_at: string | null;
  rejection_reason: string | null;
  status: string;
  computed_at: string | null;
  updated_at: string | null;
}

export interface RequestActivity {
  id: string;
  request_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  detail: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

const REQUEST_COLUMNS = '*';
const NON_PUBLIC_LIST = `(${NON_PUBLIC_STATUSES.join(',')})`;

/* ── Reads ── */

export async function fetchRequests(): Promise<ClientRequest[]> {
  const { data, error } = await supabase
    .from('client_requests')
    .select(REQUEST_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ClientRequest[];
}

export async function fetchRequest(id: string): Promise<ClientRequest | null> {
  const { data, error } = await supabase
    .from('client_requests')
    .select(REQUEST_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as ClientRequest) || null;
}

export async function fetchMatches(requestId: string): Promise<ClientMatch[]> {
  const { data, error } = await supabase
    .from('client_request_matches')
    .select('*')
    .eq('request_id', requestId)
    .order('match_score', { ascending: false });
  if (error) throw error;
  return (data || []) as ClientMatch[];
}

export async function fetchActivity(requestId: string): Promise<RequestActivity[]> {
  const { data, error } = await supabase
    .from('client_request_activity')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as RequestActivity[];
}

/* ── Writes ── */

export async function saveRequest(payload: Partial<ClientRequest>, id?: string): Promise<ClientRequest> {
  if (id) {
    const { data, error } = await supabase
      .from('client_requests')
      .update(payload)
      .eq('id', id)
      .select(REQUEST_COLUMNS)
      .single();
    if (error) throw error;
    return data as ClientRequest;
  }
  const { data, error } = await supabase
    .from('client_requests')
    .insert(payload)
    .select(REQUEST_COLUMNS)
    .single();
  if (error) throw error;
  return data as ClientRequest;
}

export async function deleteRequest(id: string): Promise<void> {
  const { error } = await supabase.from('client_requests').delete().eq('id', id);
  if (error) throw error;
}

export async function logActivity(
  requestId: string,
  action: string,
  detail?: string,
  meta?: Record<string, unknown>,
  actor?: { id: string | null; name: string | null },
): Promise<void> {
  await supabase.from('client_request_activity').insert({
    request_id: requestId,
    action,
    detail: detail ?? null,
    meta: meta ?? null,
    actor_id: actor?.id ?? null,
    actor_name: actor?.name ?? null,
  });
  await supabase
    .from('client_requests')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', requestId);
}

export async function updateMatch(matchId: string, patch: Partial<ClientMatch>): Promise<void> {
  const { error } = await supabase
    .from('client_request_matches')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', matchId);
  if (error) throw error;
}

/* ── Candidate inventory ── */

/**
 * Load the eligible candidate properties for a request. Bounded by category +
 * purpose so we never pull the whole database, but the ENGINE still decides
 * eligibility — this is only a coarse pre-filter.
 */
export async function loadCandidates(req: Pick<ClientRequest,
  'property_category' | 'transaction_type'>): Promise<CandidateProperty[]> {
  const cat = normalizeCategory(req.property_category);
  const candidates: CandidateProperty[] = [];

  if (cat === 'land') {
    const { data, error } = await supabase
      .from('land_listings')
      .select('id,title,slug,land_type,sub_type,asking_price,currency,acreage,plot_size,neighbourhood,location,address,latitude,longitude,images,main_image,status,is_published,agent_id')
      .eq('is_published', true)
      .not('status', 'in', NON_PUBLIC_LIST)
      .limit(200);
    if (error) throw error;
    for (const row of data || []) candidates.push(normalizeLandRow(row as Record<string, unknown>));
    return candidates;
  }

  let query = supabase
    .from('listings')
    .select('id,title,slug,purpose,property_category,property_type,sub_type,price,currency,bedrooms,bathrooms,size,sqft,land_size,neighbourhood,location,address,latitude,longitude,furnished_status,amenities,images,main_image,status,is_published,agent_id')
    .eq('is_published', true)
    .not('status', 'in', NON_PUBLIC_LIST)
    .limit(400);

  if (cat === 'commercial') query = query.eq('property_category', 'commercial');
  else query = query.in('property_category', ['residential', 'new_development']);

  const purpose = req.transaction_type === 'rent' || req.transaction_type === 'lease' ? 'rent'
    : req.transaction_type === 'buy' || req.transaction_type === 'investment' ? 'sale'
    : null;
  if (purpose) query = query.eq('purpose', purpose);

  const { data, error } = await query;
  if (error) throw error;
  for (const row of data || []) candidates.push(normalizeListingRow(row as Record<string, unknown>));
  return candidates;
}

/* ── Matching ── */

const MAX_RESULTS = 40;

/**
 * Recompute a request's matches from the live inventory, persisting the ranked
 * result. Staff decisions (shortlist / shared / feedback / excluded) are
 * PRESERVED. A shortlisted property that is no longer eligible is flagged
 * `unavailable` rather than silently removed.
 */
export async function computeMatches(request: ClientRequest): Promise<ClientMatch[]> {
  const [candidates, rates] = await Promise.all([loadCandidates(request), fetchFxRates()]);

  // Resolve the client's requested locations to real coordinates so the engine
  // can match by DISTANCE (nearby areas), not only by exact name.
  const anchors = (request.locations || [])
    .filter(Boolean)
    .map((name) => {
      const centre = areaCentreFor(name);
      return centre ? { name, lat: centre.lat, lng: centre.lng } : null;
    })
    .filter(Boolean) as { name: string; lat: number; lng: number }[];
  const reqInput = { ...request, location_anchors: anchors, rates };

  const scored = candidates
    .map((property) => ({ property, outcome: scoreCandidate(reqInput, property) }))
    .filter((r) => r.outcome.eligible)
    .sort((a, b) => b.outcome.score - a.outcome.score);

  const eligible = scored.slice(0, MAX_RESULTS);

  const existing = await fetchMatches(request.id);
  const existingByKey = new Map(existing.map((m) => [`${m.listing_id}:${m.listing_source}`, m]));
  const keepKeys = new Set<string>();

  const rows = eligible.map(({ property, outcome }) => {
    const key = `${property.id}:${property.source}`;
    keepKeys.add(key);
    const prev = existingByKey.get(key);
    // Respect an explicit staff exclusion — never re-add an excluded property.
    return {
      request_id: request.id,
      listing_id: property.id,
      listing_source: property.source,
      listing_slug: property.slug,
      listing_title: property.title,
      listing_price: property.price,
      listing_currency: property.currency,
      listing_image: property.image,
      listing_location: property.neighbourhood || property.location || null,
      listing_category: property.category,
      match_score: outcome.score,
      match_label: outcome.label,
      satisfied_criteria: outcome.satisfied,
      unmet_criteria: outcome.unmet,
      missing_info: outcome.missingInfo,
      shortlisted: prev?.shortlisted ?? false,
      excluded: prev?.excluded ?? false,
      shared_with_client: prev?.shared_with_client ?? false,
      shared_at: prev?.shared_at ?? null,
      client_feedback: prev?.client_feedback ?? null,
      client_feedback_at: prev?.client_feedback_at ?? null,
      rejection_reason: prev?.rejection_reason ?? null,
      status: prev?.status ?? 'suggested',
      computed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }).filter((r) => r.excluded !== true || true); // excluded rows are still written (kept hidden downstream)

  if (rows.length > 0) {
    const { error } = await supabase
      .from('client_request_matches')
      .upsert(rows, { onConflict: 'request_id,listing_id,listing_source' });
    if (error) throw error;
  }

  // Handle properties that dropped out of the eligible set.
  for (const m of existing) {
    const key = `${m.listing_id}:${m.listing_source}`;
    if (keepKeys.has(key)) continue;
    if (m.shortlisted || m.shared_with_client) {
      // Never silently substitute — flag it as unavailable and keep the history.
      await updateMatch(m.id, { status: 'unavailable', match_score: 0 });
    } else {
      await supabase.from('client_request_matches').delete().eq('id', m.id);
    }
  }

  // Matches are now current — clear the stale flag set by inventory triggers and
  // persist a live count of available (non-excluded, still-eligible) matches.
  const final = await fetchMatches(request.id);
  const availableCount = final.filter((m) => !m.excluded && m.status !== 'unavailable').length;
  await supabase
    .from('client_requests')
    .update({ matches_stale: false, match_count: availableCount })
    .eq('id', request.id);

  return final;
}

/**
 * Hard reset a request's matches: DROP every stored match row (including all
 * staff decisions — shortlists, shares, client feedback, rejections and
 * exclusions) and recompute a completely fresh ranked set from the live
 * inventory. Use when the brief has changed materially and the old working set
 * is no longer wanted.
 */
export async function resetAndRecomputeMatches(request: ClientRequest): Promise<ClientMatch[]> {
  const { error } = await supabase.from('client_request_matches').delete().eq('request_id', request.id);
  if (error) throw error;
  return computeMatches(request);
}

export { MATCH_WEIGHTS };