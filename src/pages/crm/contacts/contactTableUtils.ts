// ─────────────────────────────────────────────────────────────
// CONTACTS TABLE — shared helpers for the CRM contact-list view.
//
// Filtering, sorting, status derivation, CSV export and date
// formatting live here so the table, the bulk bar and the toolbar
// all agree on exactly the same rules.
// ─────────────────────────────────────────────────────────────

import type { ContactRecord } from '@/pages/crm/contacts/contactGroups';
import { typeInfo } from '@/pages/crm/contacts/contactGroups';

export interface FilterRow {
  id: string;
  field: string;
  value: string;
}

export type MatchMode = 'all' | 'any';

export type SortKey = 'name' | 'phone' | 'email' | 'source' | 'updated' | 'status';
export type SortDir = 'asc' | 'desc';

/** Fields the "Select New Filter" dropdown can filter on. */
export const FILTER_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'source', label: 'Source' },
  { value: 'type', label: 'Type' },
];

function fieldValue(contact: ContactRecord, field: string): string {
  switch (field) {
    case 'name':
      return contact.name || '';
    case 'email':
      return contact.email || '';
    case 'phone':
      return contact.phone || '';
    case 'company':
      return contact.company || '';
    case 'source':
      return contact.source || '';
    case 'type':
      return contact.type || '';
    default:
      return '';
  }
}

/** Apply the "Contacts that match ALL / ANY" filter rows. */
export function applyFilters(
  contacts: ContactRecord[],
  filters: FilterRow[],
  mode: MatchMode,
): ContactRecord[] {
  const active = filters.filter((f) => f.field && f.value.trim());
  if (active.length === 0) return contacts;
  return contacts.filter((c) => {
    const tests = active.map((f) =>
      fieldValue(c, f.field).toLowerCase().includes(f.value.trim().toLowerCase()),
    );
    return mode === 'all' ? tests.every(Boolean) : tests.some(Boolean);
  });
}

/** Sort a copy of the rows by the given column + direction. */
export function sortContacts(rows: ContactRecord[], key: SortKey, dir: SortDir): ContactRecord[] {
  const mult = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let av = '';
    let bv = '';
    if (key === 'name') {
      av = a.name || '';
      bv = b.name || '';
    } else if (key === 'phone') {
      av = a.phone || '';
      bv = b.phone || '';
    } else if (key === 'email') {
      av = a.email || '';
      bv = b.email || '';
    } else if (key === 'source') {
      av = a.source || '';
      bv = b.source || '';
    } else if (key === 'status') {
      av = statusInfo(a).label;
      bv = statusInfo(b).label;
    } else {
      av = a.created_at || '';
      bv = b.created_at || '';
    }
    return av.localeCompare(bv) * mult;
  });
}

const STATUS_STYLES: Record<string, string> = {
  subscribed: '#088135',
  active: '#088135',
  unsubscribed: '#dc2626',
  inactive: '#dc2626',
  pending: '#b08d2a',
  new: '#0d5959',
  contacted: '#0d5959',
};

export interface StatusInfo {
  label: string;
  color: string;
}

/** Status pill text + colour: explicit status wins, else the contact type. */
export function statusInfo(contact: ContactRecord): StatusInfo {
  const raw = (contact.status || contact.lead_status || '').trim();
  if (raw) {
    const key = raw.toLowerCase();
    return {
      label: raw.charAt(0).toUpperCase() + raw.slice(1),
      color: STATUS_STYLES[key] || '#6b7280',
    };
  }
  const info = typeInfo(contact.type);
  return { label: info.label, color: info.color };
}

/** "property_detail" → "Property Detail" for the Source column. */
export function prettySource(src: string | null | undefined): string {
  if (!src) return '—';
  return src.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

/** Readable short date, e.g. "Wed, 23 Jun 2021". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const CSV_COLUMNS: { key: string; label: string; get: (c: ContactRecord) => string }[] = [
  { key: 'name', label: 'Name', get: (c) => c.name || '' },
  { key: 'email', label: 'Email', get: (c) => c.email || '' },
  { key: 'phone', label: 'Phone', get: (c) => c.phone || '' },
  { key: 'company', label: 'Company', get: (c) => c.company || '' },
  { key: 'type', label: 'Type', get: (c) => (c.type ? typeInfo(c.type).label : '') },
  { key: 'source', label: 'Source', get: (c) => c.source || '' },
  { key: 'created', label: 'Created', get: (c) => (c.created_at ? new Date(c.created_at).toISOString() : '') },
];

export function toCsv(rows: ContactRecord[]): string {
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [CSV_COLUMNS.map((c) => c.label).join(',')];
  rows.forEach((r) => lines.push(CSV_COLUMNS.map((c) => esc(c.get(r))).join(',')));
  return lines.join('\n');
}

/** Trigger a client-side CSV download. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}