import {
  ECO_BLOCK_TYPES,
  createEcoBlock,
  SERVICE_PROVIDER_PRESETS,
  SERVICE_CATEGORY_OPTIONS,
  type EcoBlock,
  type EcoBlockType,
} from '@/lib/ecosystemBlocks';

interface EcoBlocksEditorProps {
  value: EcoBlock[];
  onChange: (blocks: EcoBlock[]) => void;
}

const toList = (v: string): string[] =>
  v.split(',').map((s) => s.trim()).filter(Boolean);

function blockMeta(type: EcoBlockType) {
  return ECO_BLOCK_TYPES.find((b) => b.type === type) || ECO_BLOCK_TYPES[0];
}

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary bg-white';
const labelClass =
  'block text-[13px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1';

/**
 * EcoBlocksEditor - per-article configuration for the "ecosystem" layer.
 *
 * Lets an editor attach live listings, live developments and a live service
 * provider directory to any article, with plain-language fields. Everything is
 * stored on `blog_posts.eco_blocks` as jsonb, so the front end renders exactly
 * what is configured here and nothing else.
 */
export default function EcoBlocksEditor({ value, onChange }: EcoBlocksEditorProps) {
  const presentTypes = value.map((b) => b.type);
  const available = ECO_BLOCK_TYPES.filter((b) => !presentTypes.includes(b.type));

  const addBlock = (type: EcoBlockType) => onChange([...value, createEcoBlock(type)]);
  const removeBlock = (type: EcoBlockType) => onChange(value.filter((b) => b.type !== type));
  const patchBlock = (type: EcoBlockType, patch: Record<string, unknown>) =>
    onChange(value.map((b) => (b.type === type ? ({ ...b, ...patch } as EcoBlock) : b)));

  return (
    <div className="rounded-md border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
      <div>
        <p className="text-[12px] font-roboto font-semibold text-primary uppercase tracking-wider">
          Ecosystem blocks
        </p>
        <p className="text-[13px] text-gray-500 font-roboto mt-0.5">
          Turn this article into a live ecosystem - each block pulls real listings, developments or
          directory services straight into the page.
        </p>
      </div>

      {value.length === 0 && (
        <p className="text-[13px] text-gray-400 font-roboto italic">No blocks yet - add one below.</p>
      )}

      <div className="space-y-3">
        {value.map((block) => {
          const meta = blockMeta(block.type);
          return (
            <div key={block.type} className="rounded-md border border-gray-200 bg-white p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-8 h-8 flex items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                    <i className={`${meta.icon} text-base`}></i>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-roboto font-semibold text-[#1a1a2e] truncate">{meta.label}</p>
                    <p className="text-[12px] text-gray-400 font-roboto truncate">{meta.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={block.enabled}
                      onChange={(e) => patchBlock(block.type, { enabled: e.target.checked })}
                      className="accent-primary cursor-pointer"
                    />
                    <span className="text-[12px] font-roboto font-medium text-gray-500">Active</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeBlock(block.type)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 cursor-pointer"
                    aria-label={`Remove ${meta.label}`}
                  >
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                </div>
              </div>

              {/* Heading + subheading */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Heading</label>
                  <input
                    type="text"
                    value={block.heading}
                    onChange={(e) => patchBlock(block.type, { heading: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Subheading</label>
                  <input
                    type="text"
                    value={block.subheading}
                    onChange={(e) => patchBlock(block.type, { subheading: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              {block.type === 'services' ? (
                <>
                  <div>
                    <label className={labelClass}>Quick presets</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SERVICE_PROVIDER_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          title={p.description}
                          onClick={() =>
                            patchBlock('services', {
                              categories: Array.from(new Set([...block.categories, ...p.categories])),
                            })
                          }
                          className="px-2.5 py-1 rounded-full border border-primary/20 text-[12px] font-roboto font-medium text-primary hover:bg-primary/5 cursor-pointer whitespace-nowrap"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Categories to draw from</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SERVICE_CATEGORY_OPTIONS.map((c) => {
                        const on = block.categories.includes(c.key);
                        return (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() =>
                              patchBlock('services', {
                                categories: on
                                  ? block.categories.filter((x) => x !== c.key)
                                  : [...block.categories, c.key],
                              })
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[12px] font-roboto font-medium cursor-pointer whitespace-nowrap ${
                              on
                                ? 'bg-primary text-white border-primary'
                                : 'border-gray-200 text-gray-600 hover:border-primary/40'
                            }`}
                          >
                            <i className={`${c.icon} text-[12px]`}></i>
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[12px] text-gray-400 font-roboto mt-1">
                      Leave empty to use a sensible default service set.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Subcategory keys (optional)</label>
                      <input
                        type="text"
                        value={block.subcategories.join(', ')}
                        onChange={(e) => patchBlock('services', { subcategories: toList(e.target.value) })}
                        placeholder="moving_company, legal_services"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Areas (optional)</label>
                      <input
                        type="text"
                        value={block.areas.join(', ')}
                        onChange={(e) => patchBlock('services', { areas: toList(e.target.value) })}
                        placeholder="Karen, Lavington"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="max-w-[200px]">
                    <label className={labelClass}>Max providers</label>
                    <input
                      type="number"
                      min={1}
                      value={block.limit}
                      onChange={(e) => patchBlock('services', { limit: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={labelClass}>
                      Areas (blank uses the guide&apos;s own areas)
                    </label>
                    <input
                      type="text"
                      value={block.areas.join(', ')}
                      onChange={(e) => patchBlock(block.type, { areas: toList(e.target.value) })}
                      placeholder="Karen, Lavington, Runda"
                      className={inputClass}
                    />
                  </div>
                  {block.type === 'developments' && (
                    <div className="max-w-[200px]">
                      <label className={labelClass}>Max developments</label>
                      <input
                        type="number"
                        min={1}
                        value={block.limit}
                        onChange={(e) => patchBlock('developments', { limit: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {available.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[12px] font-roboto font-semibold text-gray-500 uppercase tracking-wider">
            Add block:
          </span>
          {available.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => addBlock(t.type)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary/25 text-primary text-[13px] font-roboto font-semibold hover:bg-primary/5 cursor-pointer whitespace-nowrap"
            >
              <i className={`${t.icon} text-sm`}></i>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}