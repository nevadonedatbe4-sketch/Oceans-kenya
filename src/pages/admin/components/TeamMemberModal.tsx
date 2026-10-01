import { useEffect, useState, type ReactNode } from 'react';
import {
  MEMBER_STATUSES,
  ROLE_SUGGESTIONS,
  TEAM_SUGGESTIONS,
  type TeamMember,
  type TeamMemberInput,
} from '@/hooks/useTeamMembers';

interface Props {
  open: boolean;
  member: TeamMember | null;
  teams: string[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: TeamMemberInput) => void;
}

const EMPTY: TeamMemberInput = {
  name: '',
  role: '',
  team: '',
  email: '',
  phone: '',
  status: 'active',
  notes: '',
};

export default function TeamMemberModal({ open, member, teams, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<TeamMemberInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      member
        ? {
            name: member.name || '',
            role: member.role || '',
            team: member.team || '',
            email: member.email || '',
            phone: member.phone || '',
            status: member.status || 'active',
            notes: member.notes || '',
          }
        : EMPTY,
    );
  }, [open, member]);

  if (!open) return null;

  const set = <K extends keyof TeamMemberInput>(key: K, value: TeamMemberInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    if (!form.name.trim()) {
      setError('A name is required.');
      return;
    }
    onSubmit({
      ...form,
      name: form.name.trim(),
      role: form.role.trim(),
      team: form.team.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim(),
    });
  };

  // Merge saved teams with the built-in suggestions for the datalist.
  const teamOptions = Array.from(new Set([...teams, ...TEAM_SUGGESTIONS]));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#001731]/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#00ddb4]/15 text-[#0d5959]">
              <i className="ri-user-add-line text-lg" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-neutral-800">
                {member ? 'Edit team member' : 'Add team member'}
              </h3>
              <p className="text-xs text-neutral-400">Internal staff only — never a client contact.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">{error}</div>
          )}

          <Field label="Full name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Grace Poglod"
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-700 placeholder:text-neutral-400 bg-white focus:outline-none focus:border-[#00ddb4] focus:ring-1 focus:ring-[#00ddb4]/40"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Team / department">
              <input
                type="text"
                list="team-options"
                value={form.team}
                onChange={(e) => set('team', e.target.value)}
                placeholder="e.g. Sales"
                className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-700 placeholder:text-neutral-400 bg-white focus:outline-none focus:border-[#00ddb4] focus:ring-1 focus:ring-[#00ddb4]/40"
              />
              <datalist id="team-options">
                {teamOptions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>

            <Field label="Role">
              <input
                type="text"
                list="role-options"
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="e.g. Lettings Manager"
                className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-700 placeholder:text-neutral-400 bg-white focus:outline-none focus:border-[#00ddb4] focus:ring-1 focus:ring-[#00ddb4]/40"
              />
              <datalist id="role-options">
                {ROLE_SUGGESTIONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-700 placeholder:text-neutral-400 bg-white focus:outline-none focus:border-[#00ddb4] focus:ring-1 focus:ring-[#00ddb4]/40"
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+254 700 000 000"
                className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-700 placeholder:text-neutral-400 bg-white focus:outline-none focus:border-[#00ddb4] focus:ring-1 focus:ring-[#00ddb4]/40"
              />
            </Field>
          </div>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-700 bg-white focus:outline-none focus:border-[#00ddb4] focus:ring-1 focus:ring-[#00ddb4]/40 cursor-pointer"
            >
              {MEMBER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Responsibilities, coverage areas, anything worth noting…"
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-700 placeholder:text-neutral-400 bg-white focus:outline-none focus:border-[#00ddb4] focus:ring-1 focus:ring-[#00ddb4]/40 resize-none"
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 px-5 py-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#00ddb4] hover:bg-[#00c9a4] disabled:opacity-60 text-[#001731] rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            {submitting ? (
              <i className="ri-loader-4-line animate-spin text-base" />
            ) : (
              <i className={member ? 'ri-save-line text-base' : 'ri-add-line text-base'} />
            )}
            {member ? 'Save changes' : 'Add member'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-neutral-500 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}