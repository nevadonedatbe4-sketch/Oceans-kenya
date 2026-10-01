import { EMAIL_VARIABLES, extractTokens } from '@/lib/emailTemplate';

interface VariableChipsProps {
  /** Current template text, used to highlight which tokens are already in use. */
  text: string;
  onInsert: (token: string) => void;
}

/**
 * Dynamic variable palette. Shows the full token catalogue plus a marker for the
 * tokens currently used inside the template. Clicking inserts `{{token}}`.
 */
export default function VariableChips({ text, onInsert }: VariableChipsProps) {
  const used = new Set(extractTokens(text));

  return (
    <div className="rounded-lg border border-stone-200/70 bg-stone-50/60 p-3">
      <div className="flex items-center gap-2 mb-2">
        <i className="ri-braces-line text-stone-500 text-sm"></i>
        <p className="text-[11px] font-roboto font-semibold text-stone-500 uppercase tracking-[0.12em]">
          Dynamic variables
        </p>
        <span className="text-[11px] font-roboto text-stone-400 ml-auto">Click to insert</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {EMAIL_VARIABLES.map((v) => {
          const inUse = used.has(v.token);
          return (
            <button
              key={v.token}
              type="button"
              title={v.description}
              onClick={() => onInsert(v.token)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-roboto border transition-colors cursor-pointer whitespace-nowrap ${
                inUse
                  ? 'bg-[#1B4332]/10 border-[#1B4332]/25 text-[#1B4332]'
                  : 'bg-white border-stone-200 text-stone-600 hover:border-[#1B4332]/40 hover:text-[#1B4332]'
              }`}
            >
              {inUse && <i className="ri-check-line text-[11px]"></i>}
              {`{{${v.token}}}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}