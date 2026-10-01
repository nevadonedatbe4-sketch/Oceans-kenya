import type { JVFormState } from './types';
import { Field, JvSection, inputCls } from './ui';
import { isCompleteOverview } from './jvCompletion';

interface Props {
  state: JVFormState;
  update: (p: Partial<JVFormState>) => void;
  onTitleChange: (v: string) => void;
}

export default function JVOverviewStep({ state, update, onTitleChange }: Props) {
  return (
    <>
      {/* Opportunity overview */}
      <JvSection num="A" title="Opportunity Overview" subtitle="Name the deal, set its pipeline stage and write the public summary" defaultOpen required complete={isCompleteOverview(state)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Opportunity title" required>
              <input
                required
                name="title"
                value={state.title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="e.g. 8-Acre Kiambu — Land for 100-Unit Development"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Brief / public summary" hint="Approved summary that may appear on the JV Desk. Kept separate from internal commercial terms.">
              <textarea
                name="public_summary"
                value={state.public_summary}
                onChange={(e) => update({ public_summary: e.target.value })}
                rows={3}
                maxLength={1000}
                placeholder="General opportunity summary — location, size, development potential, indicative structure... (no confidential terms)"
                className={`${inputCls} resize-none`}
              />
              <p className="text-right text-xs text-[#9aa4b1] font-roboto mt-1">{state.public_summary.length}/1000</p>
            </Field>
          </div>
        </div>
      </JvSection>
    </>
  );
}