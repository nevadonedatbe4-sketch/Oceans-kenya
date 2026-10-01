import { useState } from 'react';
import { DEFAULT_LABELS } from '@/pages/crm/messageSystem';

interface LabelPickerModalProps {
  currentLabels: string[] | null;
  onClose: () => void;
  onApply: (labels: string[]) => void;
}

export default function LabelPickerModal({ currentLabels, onClose, onApply }: LabelPickerModalProps) {
  const [selected, setSelected] = useState<string[]>(currentLabels || []);
  const [custom, setCustom] = useState('');

  const toggle = (label: string) => {
    setSelected((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));
  };

  const addCustom = () => {
    const v = custom.trim();
    if (v && !selected.includes(v)) setSelected((prev) => [...prev, v]);
    setCustom('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground-900">Apply labels</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 cursor-pointer"
          >
            <i className="ri-close-line text-foreground-600 text-lg" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {DEFAULT_LABELS.map((label) => {
            const active = selected.includes(label);
            return (
              <button
                key={label}
                onClick={() => toggle(label)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-primary-600 text-white'
                    : 'bg-background-100 text-foreground-600 border border-background-200 hover:bg-background-200'
                }`}
              >
                {active && <i className="ri-check-line mr-1" />}
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Add a custom label..."
            className="flex-1 px-3 py-2 border border-background-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 bg-white"
          />
          <button
            onClick={addCustom}
            className="px-3 py-2 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-100 cursor-pointer whitespace-nowrap"
          >
            Add
          </button>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-background-200 rounded-lg text-sm font-medium text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(selected)}
            className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}