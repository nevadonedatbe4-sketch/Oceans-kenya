import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { ContactGroup, ContactRecord } from '@/pages/crm/contacts/contactGroups';
import {
  CONTACT_TYPES,
  NOT_ASSIGNED_ID,
  getInitials,
  tagValue,
  visibleTags,
} from '@/pages/crm/contacts/contactGroups';

export interface ContactFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  company: string;
  jobTitle: string;
  groupId: string;
  type: string;
  tags: string[];
  address: string;
  website: string;
  notes: string;
}

interface ContactFormModalProps {
  open: boolean;
  contact: ContactRecord | null;
  groups: ContactGroup[];
  defaultGroupId: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => Promise<boolean> | void;
}

function splitName(contact: ContactRecord | null) {
  if (!contact) return { first: '', last: '' };
  if (contact.first_name || contact.last_name) {
    return { first: contact.first_name || '', last: contact.last_name || '' };
  }
  const parts = (contact.name || '').trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] || '', last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

function initForm(contact: ContactRecord | null, defaultGroupId: string): ContactFormData {
  const { first, last } = splitName(contact);
  return {
    firstName: first,
    lastName: last,
    phone: contact?.phone || '',
    email: contact?.email || '',
    company: contact?.company || '',
    jobTitle: tagValue(contact?.tags, 'title:'),
    groupId: defaultGroupId,
    type: contact?.type || 'client',
    tags: visibleTags(contact?.tags),
    address: contact?.location || '',
    website: tagValue(contact?.tags, 'web:'),
    notes: contact?.notes || '',
  };
}

/** Grouped section wrapper with a clear heading. */
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[#eef1f4] first:border-t-0 pt-5 mt-5 first:pt-0 first:mt-0">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0d5959]/10 text-[#0d5959] flex-shrink-0">
          <i className={`${icon} text-lg`} />
        </span>
        <h4 className="admin-subheading text-[#001731]">{title}</h4>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block admin-label font-medium text-[#001731] mb-1.5">
      {children} {required && <span className="text-[#dc2626]">*</span>}
    </label>
  );
}

const inputBase =
  'w-full px-3.5 py-2.5 border rounded-lg font-roboto transition-colors focus:outline-none focus:ring-1 bg-white';
const inputOk = 'border-[#e5e7eb] focus:border-[#0d5959] focus:ring-[#0d5959]/25';
const inputErr = 'border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]/25';

/**
 * Add / Edit contact form.
 *
 * Fields are grouped into three clearly separated sections (Basic /
 * Organization / Additional) instead of one long wall of inputs.
 */
export default function ContactFormModal({
  open,
  contact,
  groups,
  defaultGroupId,
  submitting,
  onClose,
  onSubmit,
}: ContactFormModalProps) {
  const [form, setForm] = useState<ContactFormData>(initForm(contact, defaultGroupId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initForm(contact, defaultGroupId));
      setErrors({});
      setTagInput('');
    }
  }, [open, contact, defaultGroupId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (patch: Partial<ContactFormData>) => setForm((f) => ({ ...f, ...patch }));

  const addTag = () => {
    const value = tagInput.trim();
    if (!value || form.tags.includes(value)) {
      setTagInput('');
      return;
    }
    set({ tags: [...form.tags, value] });
    setTagInput('');
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim() && !form.lastName.trim()) e.firstName = 'A first or last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ ...form });
  };

  const initials = getInitials(`${form.firstName} ${form.lastName}`.trim() || 'New');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-[#001731]/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={contact ? 'Edit contact' : 'Add contact'}
        className="relative bg-white rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-[#eef1f4]">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#0d5959]/10 text-[#0d5959] flex-shrink-0">
              <i className={`${contact ? 'ri-edit-line' : 'ri-user-add-line'} text-lg`} />
            </span>
            <h2 className="admin-heading text-[#001731]">{contact ? 'Edit Contact' : 'Add New Contact'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#001731]/55 hover:text-[#001731] hover:bg-[#001731]/8 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 md:px-6 py-5">
          <Section title="Basic Information" icon="ri-user-line">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#0d5959]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#0d5959] text-xl font-bold">{initials}</span>
              </div>
              <div>
                <p className="admin-label font-medium text-[#001731]">Photo / initials</p>
                <p className="admin-meta text-[#001731]/50">Initials are generated automatically from the name.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>First name</Label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => set({ firstName: e.target.value })}
                  placeholder="e.g. Jane"
                  className={`${inputBase} ${errors.firstName ? inputErr : inputOk}`}
                />
                {errors.firstName && <p className="admin-meta text-[#dc2626] mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <Label>Last name</Label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => set({ lastName: e.target.value })}
                  placeholder="e.g. Muthoni"
                  className={`${inputBase} ${inputOk}`}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                  placeholder="e.g. +254 700 123 456"
                  className={`${inputBase} ${inputOk}`}
                />
              </div>
              <div>
                <Label required>Email</Label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="e.g. jane@example.com"
                  className={`${inputBase} ${errors.email ? inputErr : inputOk}`}
                />
                {errors.email && <p className="admin-meta text-[#dc2626] mt-1">{errors.email}</p>}
              </div>
            </div>
          </Section>

          <Section title="Organization" icon="ri-building-2-line">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Company</Label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => set({ company: e.target.value })}
                  placeholder="e.g. ABC Holdings"
                  className={`${inputBase} ${inputOk}`}
                />
              </div>
              <div>
                <Label>Job title</Label>
                <input
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) => set({ jobTitle: e.target.value })}
                  placeholder="e.g. Director"
                  className={`${inputBase} ${inputOk}`}
                />
              </div>
              <div>
                <Label>Category / Group</Label>
                <select
                  value={form.groupId}
                  onChange={(e) => set({ groupId: e.target.value })}
                  className={`${inputBase} ${inputOk} cursor-pointer`}
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Contact type (role)</Label>
                <select
                  value={form.type}
                  onChange={(e) => set({ type: e.target.value })}
                  className={`${inputBase} ${inputOk} cursor-pointer`}
                >
                  {CONTACT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Tags</Label>
              <div className={`${inputBase} ${inputOk} flex flex-wrap items-center gap-2 py-2`}>
                {form.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full admin-meta bg-[#001731]/8 text-[#001731] capitalize"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => set({ tags: form.tags.filter((x) => x !== t) })}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-[#001731]/15 cursor-pointer"
                      aria-label={`Remove ${t}`}
                    >
                      <i className="ri-close-line text-sm" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  onBlur={addTag}
                  placeholder={form.tags.length ? 'Add tag…' : 'e.g. vip, hot-lead'}
                  className="flex-1 min-w-[120px] bg-transparent border-0 focus:outline-none font-roboto admin-label py-1"
                />
              </div>
            </div>
          </Section>

          <Section title="Additional Information" icon="ri-information-line">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Address</Label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => set({ address: e.target.value })}
                  placeholder="e.g. Westlands, Nairobi"
                  className={`${inputBase} ${inputOk}`}
                />
              </div>
              <div>
                <Label>Website</Label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => set({ website: e.target.value })}
                  placeholder="e.g. https://example.com"
                  className={`${inputBase} ${inputOk}`}
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <textarea
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
                placeholder="Any relevant notes about this contact…"
                rows={4}
                maxLength={500}
                className={`${inputBase} ${inputOk} resize-none`}
              />
              <p className="admin-meta text-[#001731]/45 mt-1 text-right">{form.notes.length}/500</p>
            </div>
          </Section>
        </form>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 px-5 md:px-6 py-4 border-t border-[#eef1f4] bg-[#f7f9fb]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg admin-label font-medium text-[#001731] border border-[#001731]/20 hover:bg-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg admin-label font-semibold text-white bg-[#001731] hover:bg-[#0d5959] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <i className="ri-check-line text-base" />
                {contact ? 'Save Changes' : 'Add Contact'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}