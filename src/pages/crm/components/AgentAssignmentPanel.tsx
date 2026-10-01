import { useState } from 'react';

/**
 * AgentAssignmentPanel — the single shared "Agent Assignment" block used by
 * every CRM listing form (Listings, Land, Developments, Joint Ventures).
 *
 * Behaviour is identical everywhere: collapsed by default, a clickable header
 * that shows a live summary ("2 agents assigned" / "Not assigned"), and a
 * multi-select agent picker with removable chips when expanded — matching the
 * SEO / Source & Contact collapsible panels.
 *
 * The visual language follows the host form via `variant`:
 *   • teal  → general Listings + Developments (teal on light cards)
 *   • green → Land form (vivid green)
 *   • navy  → Joint Venture form (rectangular navy)
 */

export interface AgentOption {
  id: string;
  name: string;
  title?: string | null;
}

export type AgentPanelVariant = 'teal' | 'green' | 'navy';

interface Theme {
  container: string;
  hover: string;
  headPad: string;
  iconBox: string;
  title: string;
  subtitle: string;
  chevron: string;
  body: string;
  label: string;
  input: string;
  hint: string;
  chip: string;
  chipIcon: string;
  menu: string;
  row: string;
  checkbox: string;
  name: string;
  role: string;
  check: string;
  countPill: string;
  emptyPill: string;
  summaryPill: string;
  lockBox: string;
  lockIcon: string;
  lockValue: string;
}

const THEMES: Record<AgentPanelVariant, Theme> = {
  teal: {
    container: 'border border-[#e8ecf0] bg-white rounded-xl overflow-hidden',
    hover: 'hover:bg-[#f6f8f9]',
    headPad: 'px-5 py-4',
    iconBox: 'w-10 h-10 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg',
    title: 'text-base font-semibold text-[#0d1f2d] tracking-wide',
    subtitle: 'text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed',
    chevron: 'text-[#7a8a99] hover:bg-[#f1f4f6] hover:text-[#0d1f2d]',
    body: 'px-6 py-6 border-t border-[#eef1f4]',
    label: 'block text-[16px] font-bold tracking-wide text-[#0d1f2d] uppercase mb-2.5 leading-none',
    input: 'w-full flex items-center justify-between gap-3 text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white cursor-pointer rounded-md',
    hint: 'text-[15px] text-[#4a5568] mt-2 leading-relaxed',
    chip: 'inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0d5959] bg-[#e8f5f5] border border-[#0d5959]/20 pl-3 pr-1.5 py-1 rounded-full',
    chipIcon: 'ri-user-star-line text-[13px]',
    menu: 'absolute z-20 left-0 right-0 mt-2 border border-[#e8edf2] bg-white rounded-lg shadow-lg max-h-72 overflow-y-auto',
    row: 'flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-[#f7fafa] transition-colors',
    checkbox: 'w-4 h-4 shrink-0 accent-[#0d5959] cursor-pointer',
    name: 'block text-base font-medium text-[#0d1f2d] truncate',
    role: 'block text-[12px] text-[#7a8a99] truncate',
    check: 'ri-check-line text-[#0d5959] text-sm shrink-0',
    summaryPill: 'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full whitespace-nowrap',
    countPill: 'text-[#0d5959] bg-[#e8f5f5]',
    emptyPill: 'text-[#7a8a99] bg-[#f1f4f6]',
    lockBox: 'flex items-center gap-3 px-4 py-3 border-2 border-[#e8edf2] rounded-md bg-[#f7fafa]',
    lockIcon: 'w-8 h-8 flex items-center justify-center shrink-0 rounded-full bg-[#0d5959]/10',
    lockValue: 'text-sm font-medium text-[#0d1f2d] truncate',
  },
  green: {
    container: 'rounded-xl border border-[#088135]/25 bg-white overflow-hidden',
    hover: 'hover:bg-[#f6f8f9]',
    headPad: 'px-4 py-4',
    iconBox: 'w-9 h-9 flex items-center justify-center shrink-0 bg-[#088135] rounded-lg',
    title: 'font-jost text-base font-semibold text-[#0d1f2d]',
    subtitle: 'text-[13px] font-roboto text-[#4b6a72] mt-0.5 leading-relaxed',
    chevron: 'text-[#233340] hover:bg-[#f1f4f6]',
    body: 'px-4 sm:px-6 py-5 border-t border-[#088135]/20 space-y-4',
    label: 'block text-[#111827] font-roboto text-[18px] font-semibold mb-2',
    input: 'w-full flex items-center justify-between gap-3 border border-[#aab4bf] px-4 py-3 text-[17px] font-roboto text-[#111827] bg-white focus:outline-none focus:border-[#088135] focus:ring-2 focus:ring-[#088135]/20 rounded-lg cursor-pointer',
    hint: 'text-[14px] font-roboto text-[#4b6a72] mt-2 leading-relaxed',
    chip: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#088135]/10 text-[#088135] text-[16px] font-roboto font-medium rounded-md',
    chipIcon: 'ri-user-star-line text-[13px]',
    menu: 'absolute z-20 mt-1 w-full bg-white border border-[#c2c9d2] rounded-lg max-h-72 overflow-auto shadow-lg',
    row: 'flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#088135]/5 transition-colors',
    checkbox: 'w-[18px] h-[18px] shrink-0 rounded text-[#088135] border-[#aab4bf] focus:ring-[#088135] cursor-pointer',
    name: 'block text-[17px] font-roboto text-[#111827] truncate',
    role: 'block text-[13px] font-roboto text-[#6b7684] truncate',
    check: 'ri-check-line text-[#088135] text-base shrink-0',
    summaryPill: 'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full whitespace-nowrap',
    countPill: 'text-[#088135] bg-[#088135]/10',
    emptyPill: 'text-[#6b7684] bg-[#eef2f5]',
    lockBox: 'flex items-center gap-3 px-4 py-3 border border-[#088135]/30 rounded-lg bg-[#088135]/5',
    lockIcon: 'w-8 h-8 flex items-center justify-center shrink-0 rounded-full bg-[#088135]/15',
    lockValue: 'text-[17px] font-roboto font-medium text-[#111827] truncate',
  },
  navy: {
    container: 'border border-[#e2e7ec] bg-white overflow-hidden',
    hover: 'hover:bg-[#f2f4f6]',
    headPad: 'px-4 sm:px-6 py-4 sm:py-5',
    iconBox: 'w-7 h-7 flex items-center justify-center shrink-0 bg-[#001731] rounded-none',
    title: 'font-jost text-[17px] font-bold text-[#001731]',
    subtitle: 'text-[14px] font-roboto text-[#6b7684] mt-0.5 leading-relaxed',
    chevron: 'text-[#6b7684] hover:bg-[#eef2f5]',
    body: 'px-4 sm:px-6 py-5 sm:py-6 border-t border-[#e2e7ec] space-y-5',
    label: 'block text-[16px] font-roboto font-bold text-[#001731] mb-1.5',
    input: 'w-full flex items-center justify-between gap-3 border border-[#cdd5de] bg-white px-3.5 py-2.5 text-[16px] font-roboto text-[#001731] focus:outline-none focus:border-[#001731] focus:ring-1 focus:ring-[#001731]/20 rounded-md cursor-pointer',
    hint: 'text-[14px] font-roboto text-[#6b7684] mt-1.5 leading-relaxed',
    chip: 'inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#001731] bg-[#001731]/5 text-[#001731] text-[14px] font-roboto font-medium rounded-md',
    chipIcon: 'ri-user-star-line text-[13px]',
    menu: 'absolute z-20 mt-1 w-full bg-white border border-[#cdd5de] rounded-md max-h-72 overflow-auto shadow-lg',
    row: 'flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#001731]/5 transition-colors',
    checkbox: 'w-[18px] h-[18px] shrink-0 rounded text-[#001731] border-[#cdd5de] focus:ring-[#001731] cursor-pointer',
    name: 'block text-[16px] font-roboto text-[#001731] truncate',
    role: 'block text-[13px] font-roboto text-[#6b7684] truncate',
    check: 'ri-check-line text-[#001731] text-base shrink-0',
    summaryPill: 'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-sm whitespace-nowrap',
    countPill: 'text-[#001731] bg-[#001731]/10',
    emptyPill: 'text-[#6b7684] bg-[#eef2f5]',
    lockBox: 'flex items-center gap-3 px-4 py-3 border border-[#001731]/25 bg-[#001731]/5',
    lockIcon: 'w-8 h-8 flex items-center justify-center shrink-0 bg-[#001731]/10',
    lockValue: 'text-[16px] font-roboto font-medium text-[#001731] truncate',
  },
};

interface Props {
  agents: AgentOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  required?: boolean;
  locked?: boolean;
  lockedName?: string;
  variant?: AgentPanelVariant;
}

export default function AgentAssignmentPanel({
  agents,
  value,
  onChange,
  required = false,
  locked = false,
  lockedName,
  variant = 'teal',
}: Props) {
  const [open, setOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const t = THEMES[variant];

  const toggleAgent = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  const selectedNames = value
    .map((id) => agents.find((a) => a.id === id)?.name)
    .filter(Boolean) as string[];

  const summary = locked
    ? (lockedName || 'You (auto-assigned)')
    : value.length === 0
    ? 'Not assigned'
    : value.length === 1
    ? selectedNames[0] || '1 agent assigned'
    : `${value.length} agents assigned`;

  return (
    <div className={t.container}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`w-full flex items-center gap-4 text-left transition-colors cursor-pointer whitespace-normal ${t.hover} ${t.headPad}`}
      >
        <div className={t.iconBox}>
          <i className="ri-user-star-line text-white text-base" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={t.title}>Agent Assignment{required && !locked ? ' *' : ''}</span>
            <span className={`${t.summaryPill} ${value.length === 0 && !locked ? t.emptyPill : t.countPill}`}>
              <i className="ri-user-star-line text-[11px]" />
              {summary}
            </span>
          </div>
          <span className={`block ${t.subtitle}`}>
            {open
              ? 'Choose one or more agents to handle inquiries'
              : 'Assign one or more agents to handle inquiries — expand to change.'}
          </span>
        </div>
        <i className={`ri-arrow-down-s-line text-xl transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={t.body}>
          {locked ? (
            <>
              <div className={t.lockBox}>
                <span className={t.lockIcon}>
                  <i className="ri-user-star-line text-[#0d5959]" />
                </span>
                <p className={t.lockValue}>{lockedName || 'You (auto-assigned)'}</p>
                <span className="ml-auto text-[12px] font-semibold text-[#0d5959] bg-[#e8f5f5] px-2 py-0.5 rounded-full whitespace-nowrap">
                  Locked
                </span>
              </div>
              <p className={t.hint}>You are responsible for this listing. Administrators can reassign ownership if needed.</p>
            </>
          ) : (
            <>
              <label className={t.label}>Assigned Agent{required ? ' *' : ''}</label>

              <div className="relative">
                <button type="button" onClick={() => setDropOpen((v) => !v)} className={t.input}>
                  <span className={value.length === 0 ? 'opacity-50' : ''}>
                    {value.length === 0
                      ? 'No agent assigned'
                      : `${value.length} agent${value.length > 1 ? 's' : ''} assigned`}
                  </span>
                  <i className={`ri-arrow-down-wide-fill text-lg transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropOpen(false)} />
                    <div className={t.menu}>
                      <div className="px-2 py-1.5">
                        {agents.map((agent) => {
                          const checked = value.includes(agent.id);
                          return (
                            <label key={agent.id} className={t.row}>
                              <input type="checkbox" checked={checked} onChange={() => toggleAgent(agent.id)} className={t.checkbox} />
                              <span className="flex-1 min-w-0">
                                <span className={t.name}>{agent.name}</span>
                                {agent.title && <span className={t.role}>{agent.title}</span>}
                              </span>
                              {checked && <i className={t.check} />}
                            </label>
                          );
                        })}
                        {agents.length === 0 && (
                          <p className="px-3 py-3 text-[13px] text-[#9ba5b1]">No agents available</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {value.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {value.map((id) => {
                    const a = agents.find((x) => x.id === id);
                    if (!a) return null;
                    return (
                      <span key={id} className={t.chip}>
                        <span className="w-4 h-4 flex items-center justify-center shrink-0">
                          <i className={t.chipIcon} />
                        </span>
                        {a.name}
                        <button
                          type="button"
                          onClick={() => toggleAgent(id)}
                          className="w-5 h-5 flex items-center justify-center shrink-0 rounded-full hover:bg-black/10 transition-colors cursor-pointer"
                          aria-label={`Remove ${a.name}`}
                        >
                          <i className="ri-close-line text-sm" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <p className={t.hint}>Assign one or more agents — they'll all be shown on the property detail page.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}