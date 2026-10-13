// ─────────────────────────────────────────────────────────────
// CONTACTS GROUPS — shared data layer for the CRM contact directory.
//
// Reusable across every Contacts surface (list, sidebar nav, mobile
// group panel, edit form) so grouping, counts and filtering always
// agree.
//
// Group definitions + contact→group assignments are stored client-side
// (localStorage) because the `contacts` table has no group/folder column
// and adding one requires a DB migration. Contacts themselves still load
// from the real `contacts` table — only the grouping layer is local.
// ─────────────────────────────────────────────────────────────

export interface ContactRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  type: string | null;
  /** Precise CRM role (landlord, agent, …). The DB `type` column only accepts
   * a limited set of values, so the real role is kept here. */
  role?: string | null;
  category?: string | null;
  company?: string | null;
  location?: string | null;
  status?: string | null;
  lead_status?: string | null;
  tags: string[] | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface ContactGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** Built-in groups cannot be deleted (Not Assigned is always required). */
  builtin?: boolean;
}

/** Always present — collects every contact with no explicit group. */
export const NOT_ASSIGNED_ID = 'unassigned';

/** Virtual pseudo-groups used by the nav (not real contact groups). */
export const VIEW_ALL = 'all';
export const VIEW_GROUPS = 'groups';

/** Built-in group palette — role groups, tinted from the CRM palette (no blue/purple). */
export const DEFAULT_GROUPS: ContactGroup[] = [
  { id: 'renters', name: 'Renters', icon: 'ri-key-2-line', color: '#0d5959', builtin: true },
  { id: 'buyers', name: 'Buyers', icon: 'ri-shopping-bag-3-line', color: '#be123c', builtin: true },
  { id: 'sellers', name: 'Sellers', icon: 'ri-home-smile-line', color: '#b08d2a', builtin: true },
  { id: 'landlords', name: 'Landlords', icon: 'ri-home-2-line', color: '#0d5959', builtin: true },
  { id: 'caretakers', name: 'Caretakers', icon: 'ri-user-settings-line', color: '#c2410c', builtin: true },
  { id: 'agents', name: 'Agents', icon: 'ri-user-star-line', color: '#be123c', builtin: true },
  { id: 'property-managers', name: 'Property Managers', icon: 'ri-building-2-line', color: '#b08d2a', builtin: true },
  { id: 'lawyers', name: 'Lawyers', icon: 'ri-scales-3-line', color: '#4b5563', builtin: true },
  { id: 'surveyors', name: 'Surveyors', icon: 'ri-ruler-2-line', color: '#088135', builtin: true },
  { id: 'developers', name: 'Developers', icon: 'ri-building-4-line', color: '#92400e', builtin: true },
  { id: NOT_ASSIGNED_ID, name: 'Not Assigned', icon: 'ri-question-line', color: '#9ca3af', builtin: true },
];

/**
 * Client-side ("lead") roles. These are the roles a simple lead form shows —
 * a person enquiring about renting / buying / selling, not a business. They
 * never need company or job-title details.
 */
export const LEAD_ROLE_VALUES = ['client', 'renter', 'buyer', 'seller'];

/** True when a role belongs to the simple lead form (no organisation fields). */
export function isLeadRole(role: string | null | undefined): boolean {
  return LEAD_ROLE_VALUES.includes((role || '').toLowerCase());
}

/** Contact role options (drives the role badge, form select + group suggestion). */
export const CONTACT_TYPES = [
  { value: 'renter', label: 'Renter', icon: 'ri-key-2-line', color: '#0d5959' },
  { value: 'buyer', label: 'Buyer', icon: 'ri-shopping-bag-3-line', color: '#be123c' },
  { value: 'seller', label: 'Seller', icon: 'ri-home-smile-line', color: '#b08d2a' },
  { value: 'landlord', label: 'Landlord', icon: 'ri-home-2-line', color: '#0d5959' },
  { value: 'caretaker', label: 'Caretaker', icon: 'ri-user-settings-line', color: '#c2410c' },
  { value: 'agent', label: 'Agent', icon: 'ri-user-star-line', color: '#be123c' },
  { value: 'property_manager', label: 'Property Manager', icon: 'ri-building-2-line', color: '#b08d2a' },
  { value: 'lawyer', label: 'Lawyer', icon: 'ri-scales-3-line', color: '#4b5563' },
  { value: 'surveyor', label: 'Surveyor', icon: 'ri-ruler-2-line', color: '#088135' },
  { value: 'developer', label: 'Developer', icon: 'ri-building-4-line', color: '#92400e' },
  { value: 'client', label: 'Client', icon: 'ri-user-line', color: '#6b7280' },
];

/**
 * Lead sources — how a contact first reached out. Stored in the `source`
 * column (nullable, no DB constraint) so any of these values is safe.
 */
export const LEAD_SOURCES = [
  { value: 'phone-call', label: 'Phone call', icon: 'ri-phone-line' },
  { value: 'referral', label: 'Referral', icon: 'ri-share-forward-line' },
  { value: 'walk-in', label: 'Walk-in', icon: 'ri-store-2-line' },
  { value: 'website', label: 'Website', icon: 'ri-global-line' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'ri-whatsapp-line' },
  { value: 'social', label: 'Social media', icon: 'ri-instagram-line' },
  { value: 'email', label: 'Email', icon: 'ri-mail-line' },
  { value: 'manual', label: 'Manual entry', icon: 'ri-pencil-line' },
];

export function sourceInfo(value: string | null | undefined) {
  return LEAD_SOURCES.find((s) => s.value === value) || null;
}

/** True when the given source value is one of the known options. */
export function isKnownSource(value: string | null | undefined): boolean {
  return LEAD_SOURCES.some((s) => s.value === value);
}

export function typeInfo(type: string | null | undefined) {
  return CONTACT_TYPES.find((t) => t.value === type) || CONTACT_TYPES[CONTACT_TYPES.length - 1];
}

/**
 * The `contacts.type` column is guarded by a DB CHECK constraint that only
 * allows a fixed set of values. The CRM exposes richer roles, so a chosen role
 * is written to the dedicated `role` column while `type` is kept within the
 * allowed set.
 */
export const DB_CONTACT_TYPES = ['client', 'landlord', 'buyer', 'seller', 'vendor', 'partner'];

/** Map a CRM role onto a value the DB `type` check constraint accepts. */
export function toDbType(role: string | null | undefined): string {
  const r = (role || '').toLowerCase();
  switch (r) {
    case 'landlord':
      return 'landlord';
    case 'agent':
    case 'property_manager':
    case 'lawyer':
    case 'developer':
      return 'partner';
    case 'caretaker':
    case 'surveyor':
      return 'vendor';
    case 'renter':
      return 'client';
    case 'buyer':
    case 'seller':
    case 'vendor':
    case 'partner':
    case 'client':
      return r;
    default:
      return 'client';
  }
}

/** The CRM role for a contact: the dedicated `role` column wins, else a valid `type`. */
export function roleOf(contact: ContactRecord): string {
  const explicit = (contact.role || '').toLowerCase();
  if (CONTACT_TYPES.some((t) => t.value === explicit)) return explicit;
  const t = (contact.type || '').toLowerCase();
  if (CONTACT_TYPES.some((x) => x.value === t)) return t;
  return 'client';
}

const GROUPS_KEY = 'crm_contact_groups_v2';
const ASSIGNMENTS_KEY = 'crm_contact_assignments_v2';

/** Custom group icon/colour suggestions for newly created groups. */
const NEW_GROUP_STYLES: { icon: string; color: string }[] = [
  { icon: 'ri-folder-add-line', color: '#0d5959' },
  { icon: 'ri-group-line', color: '#be123c' },
  { icon: 'ri-bookmark-3-line', color: '#b08d2a' },
  { icon: 'ri-archive-2-line', color: '#c2410c' },
  { icon: 'ri-price-tag-3-line', color: '#7c3aed' },
  { icon: 'ri-stack-line', color: '#6b7280' },
];

export function styleForNewGroup(seed: number) {
  return NEW_GROUP_STYLES[seed % NEW_GROUP_STYLES.length];
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Load every group = built-ins (in order) + custom groups, de-duplicated. */
export function loadGroups(): ContactGroup[] {
  const custom = safeParse<ContactGroup[]>(
    typeof localStorage !== 'undefined' ? localStorage.getItem(GROUPS_KEY) : null,
    [],
  );
  const seen = new Set<string>();
  const merged: ContactGroup[] = [];
  DEFAULT_GROUPS.forEach((g) => {
    seen.add(g.id);
    merged.push(g);
  });
  custom.forEach((g) => {
    if (!g || !g.id || seen.has(g.id)) return;
    seen.add(g.id);
    merged.push({ ...g, builtin: false });
  });
  return merged;
}

export function saveCustomGroups(all: ContactGroup[]) {
  if (typeof localStorage === 'undefined') return;
  const custom = all.filter((g) => !g.builtin);
  localStorage.setItem(GROUPS_KEY, JSON.stringify(custom));
}

export function loadAssignments(): Record<string, string> {
  return safeParse<Record<string, string>>(
    typeof localStorage !== 'undefined' ? localStorage.getItem(ASSIGNMENTS_KEY) : null,
    {},
  );
}

export function saveAssignments(map: Record<string, string>) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(map));
}

/**
 * Best-effort default group for a contact that has no saved assignment.
 * Grounded in the contact's role — the admin can always move a contact
 * into another group.
 */
export function suggestGroupId(contact: ContactRecord): string {
  const type = roleOf(contact);
  switch (type) {
    case 'renter':
      return 'renters';
    case 'buyer':
      return 'buyers';
    case 'seller':
      return 'sellers';
    case 'landlord':
      return 'landlords';
    case 'caretaker':
      return 'caretakers';
    case 'agent':
      return 'agents';
    case 'property_manager':
      return 'property-managers';
    case 'lawyer':
      return 'lawyers';
    case 'surveyor':
      return 'surveyors';
    case 'developer':
      return 'developers';
    default:
      return NOT_ASSIGNED_ID;
  }
}

/** The effective group id for a contact: explicit assignment wins, else suggestion. */
export function groupForContact(contact: ContactRecord, assignments: Record<string, string>): string {
  const explicit = assignments[contact.id];
  if (explicit) return explicit;
  return suggestGroupId(contact);
}

export interface GroupWithCount extends ContactGroup {
  count: number;
  contacts: ContactRecord[];
}

/** Bucket contacts into every group (empty groups included) with counts. */
export function bucketContacts(
  contacts: ContactRecord[],
  groups: ContactGroup[],
  assignments: Record<string, string>,
): GroupWithCount[] {
  const map = new Map<string, ContactRecord[]>();
  groups.forEach((g) => map.set(g.id, []));
  const validIds = new Set(groups.map((g) => g.id));

  contacts.forEach((c) => {
    let gid = groupForContact(c, assignments);
    if (!validIds.has(gid)) gid = NOT_ASSIGNED_ID;
    map.get(gid)!.push(c);
  });

  return groups.map((g) => ({
    ...g,
    contacts: map.get(g.id) || [],
    count: (map.get(g.id) || []).length,
  }));
}

export function getInitials(name: string) {
  const parts = (name || '').trim().split(/\s+/);
  const first = parts[0]?.charAt(0) || '';
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase() || '?';
}

// ── Tag helpers ──────────────────────────────────────────────
// Structured (non-display) values are stored as prefixed tags so the
// extra form fields survive without a schema change.

const STRUCTURED_PREFIXES = ['grp:', 'title:', 'web:', 'src:'];

export function tagValue(tags: string[] | null | undefined, prefix: string): string {
  if (!tags) return '';
  const found = tags.find((t) => t.startsWith(prefix));
  return found ? found.slice(prefix.length) : '';
}

/** Tags that should actually be shown as chips (structured ones hidden). */
export function visibleTags(tags: string[] | null | undefined): string[] {
  if (!tags) return [];
  return tags.filter((t) => !STRUCTURED_PREFIXES.some((p) => t.startsWith(p)));
}

/** Merge plain tags + structured job-title / website / lead-detail values. */
export function buildTags(
  plain: string[],
  jobTitle: string,
  website: string,
  sourceDetail = '',
): string[] {
  const out = plain.map((t) => t.trim()).filter(Boolean);
  if (jobTitle.trim()) out.push(`title:${jobTitle.trim()}`);
  if (website.trim()) out.push(`web:${website.trim()}`);
  if (sourceDetail.trim()) out.push(`src:${sourceDetail.trim()}`);
  return out;
}