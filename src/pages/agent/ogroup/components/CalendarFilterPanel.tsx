import { useEffect, useState } from 'react';
import type { CalendarFilters } from '../calendarTypes';
import { EMPTY_FILTERS, filtersActive, KIND_LABELS, STATUS_LABELS } from '../calendarTypes';
import {
  listPropertyOptions, listContactOptions, contactDisplayName,
  type PropertyOption, type ContactOption,
} from '../appointmentLookups';

interface Props {
  filters: CalendarFilters;
  onChange: (f: CalendarFilters) => void;
  agents: { user_id: string; name: string }[];
  showAgent?: boolean;
  open: boolean;
}

const FIELD = 'bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 min-w-0 w-full';

/** Real filter panel — every control is pushed into the Supabase query. */
export default function CalendarFilterPanel({ filters, onChange, agents, showAgent = true, open }: Props) {
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void (async () => {
      try {
        const [p, c] = await Promise.all([listPropertyOptions(60), listContactOptions(80)]);
        if (active) { setProperties(p); setContacts(c); }
      } catch {
        if (active) { setProperties([]); setContacts([]); }
      }
    })();
    return () => { active = false; };
  }, [open]);

  if (!open) return null;

  const active = filtersActive(filters);
  const set = (patch: Partial<CalendarFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 flex items-center gap-1.5">
          <i className="ri-filter-3-line" /> Filters
          {active && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
        </p>
        {active && (
          <button onClick={() => onChange({ ...EMPTY_FILTERS })} className="text-xs font-medium text-neutral-500 hover:text-neutral-700 cursor-pointer whitespace-nowrap">Clear all</button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {showAgent && (
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">Agent</label>
            <select value={filters.agentId} onChange={(e) => set({ agentId: e.target.value })} className={FIELD}>
              <option value="all">All agents</option>
              {agents.map((a) => <option key={a.user_id} value={a.user_id}>{a.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-[11px] font-medium text-neutral-500 mb-1">Appointment type</label>
          <select value={filters.kind} onChange={(e) => set({ kind: e.target.value })} className={FIELD}>
            <option value="all">All types</option>
            {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-neutral-500 mb-1">Status</label>
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })} className={FIELD}>
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-neutral-500 mb-1">Location</label>
          <input value={filters.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Lavington" className={FIELD} />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-neutral-500 mb-1">Property</label>
          <select value={filters.propertyId} onChange={(e) => set({ propertyId: e.target.value })} className={FIELD}>
            <option value="all">Any property</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.title || 'Untitled listing'}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-neutral-500 mb-1">Applicant</label>
          <select value={filters.contactId} onChange={(e) => set({ contactId: e.target.value })} className={FIELD}>
            <option value="all">Any applicant</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{contactDisplayName(c)}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
            <input type="checkbox" checked={filters.recurringOnly} onChange={(e) => set({ recurringOnly: e.target.checked })} className="accent-teal-600 cursor-pointer" />
            Recurring only
          </label>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
            <input type="checkbox" checked={filters.includeCancelled} onChange={(e) => set({ includeCancelled: e.target.checked })} className="accent-teal-600 cursor-pointer" />
            Show cancelled
          </label>
        </div>
      </div>
    </div>
  );
}