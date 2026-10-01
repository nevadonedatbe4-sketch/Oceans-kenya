import { useState } from 'react';

interface TagListFieldProps {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Quick-pick suggestions shown as one-tap chips under the input. */
  suggestions?: string[];
  hint?: string;
}

/**
 * A reusable "add many" tag list. Type a value (or tap a suggestion) and it
 * becomes a removable chip. Used for the Services offered on a place.
 */
export default function TagListField({
  label,
  value,
  onChange,
  placeholder = 'Type and press Enter…',
  suggestions = [],
  hint,
}: TagListFieldProps) {
  const [draft, setDraft] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    // Case-insensitive de-dup so "Delivery" and "delivery" never both appear.
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  };

  const removeTag = (tag: string) => onChange(value.filter((v) => v !== tag));

  const unusedSuggestions = suggestions.filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div>
      <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">{label}</label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-md bg-[#eef7f5] text-[#0d5959] text-xs font-semibold"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-[#0d5959]/10 cursor-pointer"
                aria-label={`Remove ${tag}`}
              >
                <i className="ri-close-line text-sm" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(draft);
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
        />
        <button
          type="button"
          onClick={() => addTag(draft)}
          disabled={!draft.trim()}
          className="flex items-center gap-1 px-3 py-2.5 rounded-lg border border-[#0d5959]/25 text-[#0d5959] text-sm font-medium hover:bg-[#eef7f5] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <i className="ri-add-line" /> Add
        </button>
      </div>

      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="px-2 py-0.5 rounded-full border border-[#e8edf2] text-[11px] text-[#7a8a99] hover:border-[#0d5959]/30 hover:text-[#0d5959] transition-colors cursor-pointer"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {hint && <p className="text-[11px] text-[#9ca3af] mt-1.5">{hint}</p>}
    </div>
  );
}