import {
  CoListingAgent,
  makeCoListingAgent,
} from './coListingAgents';

interface Props {
  value: CoListingAgent[];
  onChange: (v: CoListingAgent[]) => void;
  /** 'dark' is used inside the dark continuity card on the Land form. */
  theme?: 'light' | 'dark';
}

const inputLight =
  'w-full text-base font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] rounded-md';

const inputDark =
  'w-full text-base font-medium border border-[#c9d4dc] px-3 py-2.5 text-[#0d1f2d] bg-white outline-none focus:border-[#088135] focus:ring-2 focus:ring-[#088135]/25 transition-all placeholder:text-[#8ba0ae] rounded-md';

export default function CoListingAgentsField({ value, onChange, theme = 'light' }: Props) {
  const isDark = theme === 'dark';
  const inputClass = isDark ? inputDark : inputLight;
  const labelClass = isDark
    ? 'block text-[12px] font-semibold text-[#c9d4dc] mb-1.5'
    : 'block text-[12px] font-semibold text-[#4a5568] mb-1.5';
  const titleClass = isDark
    ? 'text-[16px] font-bold text-[#e6f0f4] tracking-wide'
    : 'text-[16px] font-bold text-[#0d1f2d]';
  const mutedClass = isDark ? 'text-[#8fa9b8]' : 'text-[#9ba5b1]';
  const addBtnClass = isDark
    ? 'inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#5eea9a] hover:text-white cursor-pointer whitespace-nowrap'
    : 'inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0d5959] hover:text-[#0a4545] cursor-pointer whitespace-nowrap';
  const rowClass = isDark
    ? 'border border-[#2c4a5e] rounded-lg p-4 mb-3 bg-[#0a1f2c]'
    : 'border border-[#e8ecf0] rounded-lg p-4 mb-3 bg-[#fafbfc]';
  const rowTitleClass = isDark
    ? 'text-[12px] font-bold text-[#e6f0f4] uppercase tracking-wide'
    : 'text-[12px] font-bold text-[#0d1f2d] uppercase tracking-wide';
  const removeClass = isDark
    ? 'inline-flex items-center gap-1 text-[11px] font-semibold text-[#ff9a9a] hover:text-white cursor-pointer whitespace-nowrap'
    : 'inline-flex items-center gap-1 text-[11px] font-semibold text-[#dc2626] hover:text-[#b91c1c] cursor-pointer whitespace-nowrap';
  const emptyClass = isDark
    ? 'border border-dashed border-[#2c4a5e] rounded-lg px-4 py-4 text-center'
    : 'border border-dashed border-[#e8edf2] rounded-lg px-4 py-4 text-center';

  const addRow = () => onChange([...value, makeCoListingAgent()]);

  const updateRow = (id: string, field: keyof CoListingAgent, v: string) =>
    onChange(value.map((a) => (a.id === id ? { ...a, [field]: v } : a)));

  const removeRow = (id: string) => onChange(value.filter((a) => a.id !== id));

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className={titleClass}>Also listed by other agents/Sources</p>
        </div>
        <button type="button" onClick={addRow} className={addBtnClass}>
          <i className="ri-add-line text-sm" />
          Add agent
        </button>
      </div>

      {value.length === 0 && (
        <div className={emptyClass}>
          <p className={`text-[12px] ${mutedClass}`}>
            No other agents added. Click "Add agent" if this property is listed elsewhere too.
          </p>
        </div>
      )}

      {value.map((agent, idx) => (
        <div key={agent.id} className={rowClass}>
          <div className="flex items-center justify-between mb-3">
            <p className={rowTitleClass}>Other Agent {idx + 1}</p>
            <button type="button" onClick={() => removeRow(agent.id)} className={removeClass}>
              <i className="ri-delete-bin-line text-sm" />
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div>
              <label className={labelClass}>Agent name</label>
              <input type="text" value={agent.name} onChange={(e) => updateRow(agent.id, 'name', e.target.value)} placeholder="e.g. John Kamau" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" value={agent.phone} onChange={(e) => updateRow(agent.id, 'phone', e.target.value)} placeholder="+254 7xx xxx xxx" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={agent.email} onChange={(e) => updateRow(agent.id, 'email', e.target.value)} placeholder="agent@email.com" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div className="md:col-span-2">
              <label className={labelClass}>Listing link</label>
              <input type="url" value={agent.link} onChange={(e) => updateRow(agent.id, 'link', e.target.value)} placeholder="https://…" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Date they listed it</label>
              <input type="date" value={agent.dateListed} onChange={(e) => updateRow(agent.id, 'dateListed', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Their asking price / note</label>
            <input type="text" value={agent.priceNote} onChange={(e) => updateRow(agent.id, 'priceNote', e.target.value)} placeholder="e.g. KSh 25M — slightly higher, negotiable" className={inputClass} />
          </div>
        </div>
      ))}
    </div>
  );
}