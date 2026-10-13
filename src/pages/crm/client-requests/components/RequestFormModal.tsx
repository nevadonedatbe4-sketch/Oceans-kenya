import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TRANSACTION_TYPES, PROPERTY_CATEGORIES, PROPERTY_SUBTYPES, FURNISHING_STATES,
  REQUEST_SOURCES, CONTACT_METHODS, PRIORITIES, REQUEST_STATUSES, HARD_CRITERIA_OPTIONS,
  PROPERTY_TYPES_BY_CATEGORY, typeLabel,
} from '@/lib/clientRequests';
import { AMENITY_OPTIONS } from '@/pages/crm/client-requests/constants';
import { saveRequest, logActivity, computeMatches, type ClientRequest } from '@/lib/clientRequestsApi';
import { useAgentDirectory } from '@/hooks/useClientRequests';
import PhoneInput from '@/components/base/PhoneInput';
import { convertCurrency } from '@/lib/fxRates';
import useFxRates from '@/hooks/useFxRates';

interface ContactLite {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  budget: number | null;
}

interface RequestFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (request: ClientRequest) => void;
  initial?: ClientRequest | null;
  isAdmin: boolean;
  currentAgentId: string | null;
  currentUserId: string | null;
  currentUserName: string;
}

interface FormState {
  client_name: string;
  client_phone: string;
  client_email: string;
  preferred_contact_method: string;
  contact_id: string;
  source: string;
  assigned_agent_id: string;
  title: string;
  transaction_type: string;
  property_category: string;
  property_subtypes: string[];
  locations: string[];
  allow_alternatives: boolean;
  budget_min: string;
  budget_max: string;
  currency: string;
  bedrooms_min: string;
  bathrooms_min: string;
  size_min: string;
  furnishing_options: string[];
  radius_km: string;
  preferred_amenities: string[];
  move_in_mode: 'date' | 'flexible';
  move_in_date: string;
  move_in_flexible: string;
  financing_notes: string;
  additional_requirements: string;
  priority: string;
  status: string;
  next_follow_up_at: string;
  date_received: string;
  consent_given: boolean;
  internal_notes: string;
  hard_criteria: string[];
}

const emptyForm = (agentId: string | null): FormState => ({
  client_name: '', client_phone: '', client_email: '', preferred_contact_method: 'phone',
  contact_id: '', source: 'manual', assigned_agent_id: agentId || '', title: '',
  transaction_type: 'rent', property_category: 'residential', property_subtypes: [],
  locations: [], allow_alternatives: true, budget_min: '', budget_max: '', currency: 'KES',
  bedrooms_min: '', bathrooms_min: '', size_min: '', furnishing_options: [], radius_km: '5', preferred_amenities: [],
  move_in_mode: 'flexible', move_in_date: '', move_in_flexible: '', financing_notes: '',
  additional_requirements: '', priority: 'normal',
  status: 'new', next_follow_up_at: '', date_received: new Date().toISOString().slice(0, 10),
  consent_given: false, internal_notes: '', hard_criteria: ['transaction', 'category', 'budget', 'furnishing'],
});

const toForm = (r: ClientRequest): FormState => ({
  client_name: r.client_name || '', client_phone: r.client_phone || '', client_email: r.client_email || '',
  preferred_contact_method: r.preferred_contact_method || 'phone', contact_id: r.contact_id || '',
  source: r.source || 'manual', assigned_agent_id: r.assigned_agent_id || '', title: r.title || '',
  transaction_type: r.transaction_type || 'rent', property_category: r.property_category || 'residential',
  property_subtypes: (r.property_subtypes && r.property_subtypes.length ? r.property_subtypes : (r.property_subtype ? [r.property_subtype] : [])),
  locations: r.locations || [], allow_alternatives: r.allow_alternatives ?? true,
  budget_min: r.budget_min != null ? String(r.budget_min) : '', budget_max: r.budget_max != null ? String(r.budget_max) : '',
  currency: r.currency || 'KES', bedrooms_min: r.bedrooms_min != null ? String(r.bedrooms_min) : '',
  bathrooms_min: r.bathrooms_min != null ? String(r.bathrooms_min) : '', size_min: r.size_min != null ? String(r.size_min) : '',
  furnishing_options: (r.furnishing_options && r.furnishing_options.length ? r.furnishing_options : (r.furnishing && r.furnishing !== 'any' ? [r.furnishing] : [])),
  radius_km: r.location_radius_km != null ? String(r.location_radius_km) : '5',
  preferred_amenities: r.preferred_amenities || [],
  move_in_mode: r.move_in_flexible ? 'flexible' : 'date',
  move_in_date: r.move_in_date ? r.move_in_date.slice(0, 10) : '',
  move_in_flexible: r.move_in_flexible || '', financing_notes: r.financing_notes || '',
  additional_requirements: r.additional_requirements || '', priority: r.priority || 'normal',
  status: r.status || 'new', next_follow_up_at: r.next_follow_up_at ? r.next_follow_up_at.slice(0, 16) : '',
  date_received: r.date_received ? r.date_received.slice(0, 10) : new Date().toISOString().slice(0, 10),
  consent_given: r.consent_given ?? false, internal_notes: r.internal_notes || '',
  hard_criteria: r.hard_criteria || [],
});

const inputCls = 'w-full px-3 py-2 border border-stone-300 rounded-md text-sm text-stone-800 focus:border-[#0f766e] focus:outline-none';
const labelCls = 'block text-xs font-semibold text-stone-600 mb-1';

export default function RequestFormModal({
  open, onClose, onSaved, initial, isAdmin, currentAgentId, currentUserId, currentUserName,
}: RequestFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm(currentAgentId));
  const [contacts, setContacts] = useState<ContactLite[]>([]);
  const [locInput, setLocInput] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agents = useAgentDirectory();
  const rates = useFxRates();
  const typeOptions = useMemo(
    () => PROPERTY_TYPES_BY_CATEGORY[form.property_category as keyof typeof PROPERTY_TYPES_BY_CATEGORY] || [],
    [form.property_category],
  );

  useEffect(() => {
    if (!open) return;
    setForm(initial ? toForm(initial) : emptyForm(currentAgentId));
    setError(null);
    (async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, name, email, phone, location, budget')
        .order('name')
        .limit(300);
      setContacts((data || []) as ContactLite[]);
      // Preferred locations may only be chosen from the areas already zoned in
      // the system (published neighbourhoods); anything else is typed in.
      const { data: hoods } = await supabase
        .from('neighbourhoods')
        .select('name')
        .eq('is_published', true)
        .order('name');
      setAreaOptions(((hoods || []) as { name: string }[]).map((h) => h.name).filter(Boolean));
    })();
  }, [open, initial, currentAgentId]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  // One amount expressed in another currency (kept blank when empty/invalid).
  const convertAmount = (value: string, from: string, to: string): string => {
    if (!value) return value;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return value;
    return String(convertCurrency(n, from, to, rates));
  };

  // Switching the request's currency CONVERTS the budget range with it, so the
  // numbers always stay in the currency shown — no silent relabelling.
  const changeCurrency = (next: string) => setForm((f) => ({
    ...f,
    currency: next,
    budget_min: convertAmount(f.budget_min, f.currency, next),
    budget_max: convertAmount(f.budget_max, f.currency, next),
  }));

  const addLocation = (value: string) => {
    const v = value.trim();
    if (!v) return;
    if (!form.locations.some((l) => l.toLowerCase() === v.toLowerCase())) set('locations', [...form.locations, v]);
    setLocInput('');
  };

  const toggleType = (value: string) => {
    setForm((f) => ({
      ...f,
      property_subtypes: f.property_subtypes.includes(value)
        ? f.property_subtypes.filter((t) => t !== value)
        : [...f.property_subtypes, value],
    }));
  };

  /** Map a typed label onto a canonical type value when it matches one. */
  const canonicalType = (raw: string): string => {
    const q = raw.trim().toLowerCase();
    const match = PROPERTY_SUBTYPES.find((s) => s.value === q || s.label.toLowerCase() === q);
    return match ? match.value : raw.trim();
  };

  const addCustomType = () => {
    const v = canonicalType(typeInput);
    if (!v) return;
    setForm((f) => (f.property_subtypes.includes(v) ? f : { ...f, property_subtypes: [...f.property_subtypes, v] }));
    setTypeInput('');
  };

  const toggleIn = (key: 'preferred_amenities' | 'hard_criteria', value: string) => {
    setForm((f) => {
      const arr = f[key];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...f, [key]: next };
    });
  };

  const applyContact = (id: string) => {
    const c = contacts.find((x) => x.id === id);
    if (!c) { set('contact_id', ''); return; }
    setForm((f) => ({
      ...f,
      contact_id: c.id,
      client_name: f.client_name || c.name || '',
      client_email: f.client_email || c.email || '',
      client_phone: f.client_phone || c.phone || '',
      locations: f.locations.length ? f.locations : (c.location ? [c.location] : []),
      budget_max: f.budget_max || (c.budget != null ? String(c.budget) : ''),
    }));
  };

  const validate = (): string | null => {
    if (!form.client_name.trim()) return 'Client name is required.';
    if (!form.client_phone.trim() && !form.client_email.trim()) return 'Provide at least a phone number or an email address.';
    if (form.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.client_email)) return 'That email address looks invalid.';
    const min = form.budget_min ? Number(form.budget_min) : null;
    const max = form.budget_max ? Number(form.budget_max) : null;
    if (min != null && max != null && min > max) return 'Minimum budget cannot exceed the maximum budget.';
    if (form.move_in_mode === 'date' && form.move_in_date && Number.isNaN(new Date(form.move_in_date).getTime())) return 'The move-in date is invalid.';
    return null;
  };

  const submit = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<ClientRequest> = {
        client_name: form.client_name.trim(),
        client_phone: form.client_phone.trim() || null,
        client_email: form.client_email.trim() || null,
        preferred_contact_method: form.preferred_contact_method,
        contact_id: form.contact_id || null,
        source: form.source,
        assigned_agent_id: form.assigned_agent_id || null,
        title: form.title.trim() || `${form.client_name.trim()} — ${form.property_category}`,
        transaction_type: form.transaction_type,
        property_category: form.property_category,
        property_subtype: form.property_subtypes[0] || null,
        property_subtypes: form.property_subtypes,
        locations: form.locations,
        allow_alternatives: form.allow_alternatives,
        budget_min: form.budget_min ? Number(form.budget_min) : null,
        budget_max: form.budget_max ? Number(form.budget_max) : null,
        currency: form.currency,
        bedrooms_min: form.bedrooms_min ? Number(form.bedrooms_min) : null,
        bathrooms_min: form.bathrooms_min ? Number(form.bathrooms_min) : null,
        size_min: form.size_min ? Number(form.size_min) : null,
        furnishing: form.furnishing_options[0] || 'any',
        furnishing_options: form.furnishing_options,
        location_radius_km: form.allow_alternatives ? (Number(form.radius_km) || null) : null,
        preferred_amenities: form.preferred_amenities,
        move_in_date: form.move_in_mode === 'date' ? (form.move_in_date || null) : null,
        move_in_flexible: form.move_in_mode === 'flexible' ? (form.move_in_flexible.trim() || null) : null,
        financing_notes: form.financing_notes.trim() || null,
        additional_requirements: form.additional_requirements.trim() || null,
        hard_criteria: form.hard_criteria,
        priority: form.priority,
        status: form.status,
        next_follow_up_at: form.next_follow_up_at ? new Date(form.next_follow_up_at).toISOString() : null,
        date_received: form.date_received,
        consent_given: form.consent_given,
        internal_notes: form.internal_notes.trim() || null,
      };
      if (!initial) {
        payload.created_by = currentUserId;
        if (!isAdmin && !payload.assigned_agent_id) payload.assigned_agent_id = currentAgentId;
      }
      const saved = await saveRequest(payload, initial?.id);
      await logActivity(
        saved.id,
        initial ? 'updated' : 'created',
        initial ? 'Request details updated' : 'Client request created',
        undefined,
        { id: currentUserId, name: currentUserName },
      );
      await computeMatches(saved);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-0 md:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-[#001731]/70" onClick={onClose} />
      <div className="relative bg-white rounded-none md:rounded-xl w-full max-w-3xl my-0 md:my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h3 className="font-semibold text-stone-900">{initial ? 'Edit Client Request' : 'New Client Request'}</h3>
            <p className="text-xs text-stone-500">
              {initial ? `Reference ${initial.reference || ''}` : 'Record the client’s requirements — matching runs automatically on save.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-stone-100 cursor-pointer text-stone-500">
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 text-red-700 text-sm">
              <i className="ri-error-warning-line" /> {error}
            </div>
          )}

          {/* Client information */}
          <section>
            <h4 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
              <i className="ri-user-line text-[#0f766e]" /> Client information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-3">
                <label className={labelCls}>Link existing CRM contact</label>
                <select className={inputCls} value={form.contact_id} onChange={(e) => applyContact(e.target.value)}>
                  <option value="">— New client (no existing contact) —</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.name} {c.email ? `· ${c.email}` : ''}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Client name *</label><input className={inputCls} value={form.client_name} onChange={(e) => set('client_name', e.target.value)} /></div>
              <div>
                <label className={labelCls}>Phone</label>
                <PhoneInput
                  value={form.client_phone}
                  onChange={(v) => set('client_phone', v)}
                  placeholder="712 345 678"
                  inputClassName="flex-1 min-w-0 px-3 py-2 border border-l-0 border-stone-300 rounded-r-md text-sm text-stone-800 focus:border-[#0f766e] focus:outline-none"
                  buttonClassName="flex items-center gap-1.5 px-3 py-2 border border-stone-300 border-r-0 rounded-l-md bg-white text-sm text-stone-800 focus:outline-none focus:border-[#0f766e] cursor-pointer whitespace-nowrap"
                />
              </div>
              <div><label className={labelCls}>Email</label><input className={inputCls} value={form.client_email} onChange={(e) => set('client_email', e.target.value)} /></div>
              <div>
                <label className={labelCls}>Preferred contact</label>
                <select className={inputCls} value={form.preferred_contact_method} onChange={(e) => set('preferred_contact_method', e.target.value)}>
                  {CONTACT_METHODS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Source</label>
                <select className={inputCls} value={form.source} onChange={(e) => set('source', e.target.value)}>
                  {REQUEST_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Assigned agent</label>
                <select className={inputCls} value={form.assigned_agent_id} onChange={(e) => set('assigned_agent_id', e.target.value)} disabled={!isAdmin}>
                  <option value="">— Unassigned —</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Property requirements */}
          <section>
            <h4 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
              <i className="ri-home-4-line text-[#0f766e]" /> Property requirements
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Transaction</label>
                <select className={inputCls} value={form.transaction_type} onChange={(e) => set('transaction_type', e.target.value)}>
                  {TRANSACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select className={inputCls} value={form.property_category} onChange={(e) => set('property_category', e.target.value)}>
                  {PROPERTY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className={labelCls}>Preferred property type(s) — tick one or more, or add your own</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {typeOptions.map((t) => {
                    const active = form.property_subtypes.includes(t);
                    return (
                      <label
                        key={t}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer transition-all ${
                          active ? 'bg-[#0f766e]/10 border-[#0f766e] text-[#0f766e] font-medium' : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleType(t)}
                          className="w-4 h-4 accent-[#0f766e] cursor-pointer"
                        />
                        {typeLabel(t)}
                      </label>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    className={inputCls}
                    placeholder="Add a type not listed (e.g. Serviced Apartment, Penthouse Duplex)"
                    value={typeInput}
                    onChange={(e) => setTypeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomType(); } }}
                  />
                  <button type="button" onClick={addCustomType} className="px-3 py-2 rounded-md bg-stone-800 text-white text-sm cursor-pointer whitespace-nowrap">Add</button>
                </div>
                {form.property_subtypes.filter((t) => !typeOptions.includes(t)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.property_subtypes.filter((t) => !typeOptions.includes(t)).map((t) => (
                      <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0f766e]/10 text-[#0f766e] text-xs font-medium">
                        {typeLabel(t)}
                        <button type="button" onClick={() => toggleType(t)} className="cursor-pointer"><i className="ri-close-line" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-3">
                <label className={labelCls}>Preferred location(s) — pick a zoned area, or type any other area to add</label>
                <div className="flex items-center gap-2">
                  <input
                    className={inputCls}
                    list="cr-area-options"
                    placeholder="e.g. Karen"
                    value={locInput}
                    onChange={(e) => setLocInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLocation(locInput); } }}
                  />
                  <datalist id="cr-area-options">{areaOptions.map((a) => <option key={a} value={a} />)}</datalist>
                  <button onClick={() => addLocation(locInput)} className="px-3 py-2 rounded-md bg-stone-800 text-white text-sm cursor-pointer whitespace-nowrap">Add</button>
                </div>
                {form.locations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.locations.map((l) => (
                      <span key={l} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0f766e]/10 text-[#0f766e] text-xs font-medium">
                        {l}
                        <button onClick={() => set('locations', form.locations.filter((x) => x !== l))} className="cursor-pointer"><i className="ri-close-line" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-2 mt-2 text-xs text-stone-600 cursor-pointer">
                  <input type="checkbox" checked={form.allow_alternatives} onChange={(e) => set('allow_alternatives', e.target.checked)} />
                  Client is open to nearby / alternative locations
                </label>
                {form.allow_alternatives && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <label className="text-xs text-stone-600 whitespace-nowrap">Search radius</label>
                    <select className={`${inputCls} max-w-[220px]`} value={form.radius_km} onChange={(e) => set('radius_km', e.target.value)}>
                      <option value="0">Exact area only (no radius)</option>
                      <option value="1">Within 1 km</option>
                      <option value="3">Within 3 km</option>
                      <option value="5">Within 5 km</option>
                      <option value="10">Within 10 km</option>
                      <option value="25">Within 25 km</option>
                    </select>
                    <span className="text-[11px] text-stone-400">Nearby listings are matched by real distance from the area.</span>
                  </div>
                )}
              </div>

              <div><label className={labelCls}>Budget min</label><input className={inputCls} type="number" value={form.budget_min} onChange={(e) => set('budget_min', e.target.value)} /></div>
              <div><label className={labelCls}>Budget max</label><input className={inputCls} type="number" value={form.budget_max} onChange={(e) => set('budget_max', e.target.value)} /></div>
              <div>
                <label className={labelCls}>Currency</label>
                <select className={inputCls} value={form.currency} onChange={(e) => changeCurrency(e.target.value)}>
                  {['KES', 'USD', 'GBP', 'EUR'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div><label className={labelCls}>Bedrooms (min)</label><input className={inputCls} type="number" value={form.bedrooms_min} onChange={(e) => set('bedrooms_min', e.target.value)} /></div>
              <div><label className={labelCls}>Bathrooms (min)</label><input className={inputCls} type="number" value={form.bathrooms_min} onChange={(e) => set('bathrooms_min', e.target.value)} /></div>
              <div><label className={labelCls}>Min size (sqm / acres)</label><input className={inputCls} type="number" value={form.size_min} onChange={(e) => set('size_min', e.target.value)} /></div>

              <div className="md:col-span-3">
                <label className={labelCls}>Furnishing — tick every state the client will accept</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {FURNISHING_STATES.map((f) => {
                    const active = form.furnishing_options.includes(f.value);
                    return (
                      <label
                        key={f.value}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer transition-all ${
                          active ? 'bg-[#0f766e]/10 border-[#0f766e] text-[#0f766e] font-medium' : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => setForm((prev) => ({
                            ...prev,
                            furnishing_options: prev.furnishing_options.includes(f.value)
                              ? prev.furnishing_options.filter((x) => x !== f.value)
                              : [...prev.furnishing_options, f.value],
                          }))}
                          className="w-4 h-4 accent-[#0f766e] cursor-pointer"
                        />
                        {f.label}
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-stone-400 mt-1.5">Leave all unticked to accept any furnishing.</p>
              </div>
              <div className="md:col-span-3">
                <label className={labelCls}>Move-in / occupation timeline</label>
                <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-md w-fit mb-2">
                  <button
                    type="button"
                    onClick={() => set('move_in_mode', 'date')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap ${form.move_in_mode === 'date' ? 'bg-[#0f766e] text-white' : 'text-stone-600 hover:text-stone-800'}`}
                  >
                    Specific date
                  </button>
                  <button
                    type="button"
                    onClick={() => set('move_in_mode', 'flexible')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap ${form.move_in_mode === 'flexible' ? 'bg-[#0f766e] text-white' : 'text-stone-600 hover:text-stone-800'}`}
                  >
                    Flexible
                  </button>
                </div>
                {form.move_in_mode === 'date' ? (
                  <input className={inputCls} type="date" value={form.move_in_date} onChange={(e) => set('move_in_date', e.target.value)} />
                ) : (
                  <>
                    <input
                      className={inputCls}
                      placeholder="e.g. Flexible, ASAP, next week, 3 months from now"
                      value={form.move_in_flexible}
                      onChange={(e) => set('move_in_flexible', e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['ASAP', 'Flexible', 'Within 1 month', 'Next month', 'Within 3 months', 'Within 6 months'].map((preset) => (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => set('move_in_flexible', preset)}
                          className="px-2.5 py-1 rounded-full text-xs border border-stone-200 bg-white text-stone-600 hover:border-stone-300 cursor-pointer whitespace-nowrap"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="md:col-span-3">
                <label className={labelCls}>Preferred amenities</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-2 border border-stone-200 rounded-md">
                  {AMENITY_OPTIONS.map((a) => {
                    const active = form.preferred_amenities.includes(a);
                    return (
                      <label
                        key={a}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer transition-all ${
                          active ? 'bg-[#0f766e]/10 border-[#0f766e] text-[#0f766e] font-medium' : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleIn('preferred_amenities', a)}
                          className="w-4 h-4 accent-[#0f766e] cursor-pointer"
                        />
                        {a}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-3"><label className={labelCls}>Financing / payment notes</label><input className={inputCls} value={form.financing_notes} onChange={(e) => set('financing_notes', e.target.value)} /></div>
              <div className="md:col-span-3">
                <label className={labelCls}>Additional requirements (max 500 chars)</label>
                <textarea
                  className={inputCls}
                  rows={3}
                  maxLength={500}
                  value={form.additional_requirements}
                  onChange={(e) => set('additional_requirements', e.target.value.slice(0, 500))}
                />
              </div>
            </div>
          </section>

          {/* Hard requirements */}
          <section>
            <h4 className="text-sm font-bold text-stone-800 mb-1">Mandatory requirements (hard gates)</h4>
            <p className="text-xs text-stone-500 mb-3">A property failing any selected criterion can never rank as a match.</p>
            <div className="flex flex-wrap gap-2">
              {HARD_CRITERIA_OPTIONS.map((h) => (
                <button
                  key={h.value}
                  onClick={() => toggleIn('hard_criteria', h.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                    form.hard_criteria.includes(h.value)
                      ? 'bg-[#001731] text-white border-[#001731]'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </section>

          {/* Request management */}
          <section>
            <h4 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
              <i className="ri-settings-3-line text-[#0f766e]" /> Request management
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2"><label className={labelCls}>Request title</label><input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} /></div>
              <div>
                <label className={labelCls}>Priority</label>
                <select className={inputCls} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {REQUEST_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Date received</label><input className={inputCls} type="date" value={form.date_received} onChange={(e) => set('date_received', e.target.value)} /></div>
              <div><label className={labelCls}>Next follow-up</label><input className={inputCls} type="datetime-local" value={form.next_follow_up_at} onChange={(e) => set('next_follow_up_at', e.target.value)} /></div>
              <div className="md:col-span-3">
                <label className={labelCls}>Internal notes</label>
                <textarea className={inputCls} rows={2} value={form.internal_notes} onChange={(e) => set('internal_notes', e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer md:col-span-3">
                <input type="checkbox" checked={form.consent_given} onChange={(e) => set('consent_given', e.target.checked)} />
                Client has consented to being contacted about matching properties
              </label>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-stone-200 sticky bottom-0 bg-white rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2.5 rounded-md border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 cursor-pointer whitespace-nowrap">Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d5f59] disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            {saving ? <><i className="ri-loader-4-line animate-spin" /> Saving…</> : <><i className="ri-sparkling-line" /> {initial ? 'Save & re-match' : 'Create & match'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}