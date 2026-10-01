/**
 * Shared model for "Also listed by other agents".
 *
 * A single property is often posted by the main poster PLUS 3–5 other
 * agents/agencies. This records those extra agents so every listing — house,
 * land, development or JV — keeps the same global continuity picture.
 */

export interface CoListingAgent {
  id: string;
  name: string;
  phone: string;
  email: string;
  link: string;
  dateListed: string;
  priceNote: string;
}

export function makeCoListingAgent(): CoListingAgent {
  return {
    id: `ca-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    phone: '',
    email: '',
    link: '',
    dateListed: '',
    priceNote: '',
  };
}

/** Normalise anything that came out of the database into a safe array. */
export function parseCoListingAgents(value: unknown): CoListingAgent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: typeof r.id === 'string' && r.id ? r.id : `ca-${Math.random().toString(36).slice(2, 9)}`,
        name: typeof r.name === 'string' ? r.name : '',
        phone: typeof r.phone === 'string' ? r.phone : '',
        email: typeof r.email === 'string' ? r.email : '',
        link: typeof r.link === 'string' ? r.link : '',
        dateListed: typeof r.dateListed === 'string' ? r.dateListed : '',
        priceNote: typeof r.priceNote === 'string' ? r.priceNote : '',
      };
    });
}

/** Strip editor-only ids and drop empty rows before persisting. */
export function toCoListingAgentsPayload(agents: CoListingAgent[]): Record<string, string>[] {
  return agents
    .map((a) => ({
      name: a.name.trim(),
      phone: a.phone.trim(),
      email: a.email.trim(),
      link: a.link.trim(),
      dateListed: a.dateListed.trim(),
      priceNote: a.priceNote.trim(),
    }))
    .filter((a) => Object.values(a).some((v) => v !== ''));
}

/** True when at least one agent row holds any value. */
export function hasCoListingAgents(agents: CoListingAgent[]): boolean {
  return toCoListingAgentsPayload(agents).length > 0;
}

/** Short human label, e.g. "3 other agents listed this". */
export function describeCoListingAgents(agents: CoListingAgent[]): string {
  const count = toCoListingAgentsPayload(agents).length;
  if (count === 0) return '';
  return `${count} other agent${count > 1 ? 's' : ''} listed this`;
}