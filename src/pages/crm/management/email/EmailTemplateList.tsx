import { useMemo, useState } from 'react';
import { EMAIL_CATEGORIES, type EmailTemplate } from '@/lib/emailTemplate';

interface EmailTemplateListProps {
  templates: EmailTemplate[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onToggleActive: (tpl: EmailTemplate) => void;
}

export default function EmailTemplateList({
  templates,
  selectedKey,
  onSelect,
  onToggleActive,
}: EmailTemplateListProps) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? templates.filter(
          (t) => t.name.toLowerCase().includes(q) || t.key.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q),
        )
      : templates;

    const order = [...EMAIL_CATEGORIES.map((c) => c.key)];
    const groups: { key: string; label: string; icon: string; items: EmailTemplate[] }[] = [];

    order.forEach((cat) => {
      const items = filtered.filter((t) => t.category === cat);
      if (items.length === 0) return;
      const meta = EMAIL_CATEGORIES.find((c) => c.key === cat)!;
      groups.push({ key: cat, label: meta.label, icon: meta.icon, items });
    });

    // Any template whose category is not in the catalogue falls into "Other".
    const known = new Set(order);
    const others = filtered.filter((t) => !known.has(t.category));
    if (others.length) {
      groups.push({ key: 'other', label: 'Other', icon: 'ri-mail-line', items: others });
    }
    return groups;
  }, [templates, query]);

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-3">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm"></i>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates..."
          className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-[13px] font-roboto focus:outline-none focus:border-[#1B4332] bg-white"
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-4">
        {grouped.length === 0 && (
          <p className="text-[13px] font-roboto text-stone-400 text-center py-10">No templates match your search.</p>
        )}
        {grouped.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-1.5 px-1 mb-1.5">
              <i className={`${group.icon} text-stone-400 text-[13px]`}></i>
              <span className="text-[11px] font-roboto font-semibold text-stone-400 uppercase tracking-[0.12em]">
                {group.label}
              </span>
            </div>
            <div className="space-y-1">
              {group.items.map((tpl) => {
                const isActive = tpl.key === selectedKey;
                return (
                  <div
                    key={tpl.id}
                    className={`group flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                      isActive ? 'border-[#1B4332]/30 bg-[#1B4332]/5' : 'border-transparent hover:bg-stone-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(tpl.key)}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <p className={`text-[13px] font-roboto font-medium truncate ${isActive ? 'text-[#1B4332]' : 'text-stone-700'}`}>
                        {tpl.name}
                      </p>
                      <p className="text-[11px] font-roboto text-stone-400 truncate">{tpl.subject || 'No subject'}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleActive(tpl)}
                      title={tpl.is_active ? 'Active — click to disable' : 'Inactive — click to enable'}
                      className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                        tpl.is_active ? 'text-[#1B4332]' : 'text-stone-300'
                      }`}
                    >
                      <i className={tpl.is_active ? 'ri-toggle-fill text-lg' : 'ri-toggle-line text-lg'}></i>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 3px; }
      `}</style>
    </div>
  );
}