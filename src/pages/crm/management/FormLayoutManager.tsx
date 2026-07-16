import { useState } from 'react';
import ManagementLayout from '../ManagementLayout';

interface FormModule {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
}

const INITIAL_MODULES: FormModule[] = [
  { id: 'basic-info', label: 'Basic Information', description: 'Property title, listing type, property type and description', icon: 'ri-file-info-line', enabled: true },
  { id: 'price', label: 'Price', description: 'Main price, currency, frequency and optional secondary price', icon: 'ri-price-tag-3-line', enabled: true },
  { id: 'details', label: 'Property Details', description: 'Bedrooms, bathrooms, parking, land area, building size, property ID and tags', icon: 'ri-home-4-line', enabled: true },
  { id: 'media', label: 'Photos & Media', description: 'Upload photos, drag to reorder, set cover image, add video and floor plan links', icon: 'ri-image-2-line', enabled: true },
  { id: 'features', label: 'Features & Amenities', description: 'Indoor features, outdoor features, amenities and custom features', icon: 'ri-list-check', enabled: true },
  { id: 'location', label: 'Location', description: 'Country, city, area, neighborhood, address, coordinates and map', icon: 'ri-map-pin-2-line', enabled: true },
  { id: 'contact-publish', label: 'Contact & Publish', description: 'Agent assignment, listing status, SEO settings and publish actions', icon: 'ri-check-double-line', enabled: false },
];

export default function FormLayoutManagerPage() {
  const [modules, setModules] = useState<FormModule[]>(INITIAL_MODULES);
  const [saving, setSaving] = useState(false);

  const enabledModules = modules.filter((m) => m.enabled);
  const disabledModules = modules.filter((m) => !m.enabled);

  const toggleModule = (id: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const moveUp = (id: string) => {
    setModules((prev) => {
      const enabledList = prev.filter((m) => m.enabled);
      const disabledList = prev.filter((m) => !m.enabled);
      const idx = enabledList.findIndex((m) => m.id === id);
      if (idx <= 0) return prev;
      [enabledList[idx - 1], enabledList[idx]] = [enabledList[idx], enabledList[idx - 1]];
      return [...enabledList, ...disabledList];
    });
  };

  const moveDown = (id: string) => {
    setModules((prev) => {
      const enabledList = prev.filter((m) => m.enabled);
      const disabledList = prev.filter((m) => !m.enabled);
      const idx = enabledList.findIndex((m) => m.id === id);
      if (idx < 0 || idx >= enabledList.length - 1) return prev;
      [enabledList[idx], enabledList[idx + 1]] = [enabledList[idx + 1], enabledList[idx]];
      return [...enabledList, ...disabledList];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
  };

  return (
    <ManagementLayout
      title="Add New Property Form Layout Manager"
      description="Drag-and-drop each module to quickly organize your property submission form layout"
      icon={<i className="ri-clipboard-line text-[#1B4332] text-lg"></i>}
    >
      <div className="space-y-6 pb-10">
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex-1" />
          <div className="flex items-center gap-3 shrink-0 ml-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#163828] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {saving ? (
                <><i className="ri-loader-4-line animate-spin"></i> Saving...</>
              ) : (
                <><i className="ri-save-line"></i> Save Layout</>
              )}
            </button>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Enabled Modules */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-800">Enabled modules</p>
                  <p className="text-xs text-stone-400 mt-0.5">{enabledModules.length} active · drag to reorder</p>
                </div>
                <span className="flex items-center gap-1 text-xs text-stone-400">
                  <i className="ri-drag-move-2-line text-sm"></i>Drag to reorder
                </span>
              </div>
            </div>
            <div className="divide-y divide-stone-100 min-h-[80px]">
              {enabledModules.map((mod, index) => (
                <div
                  key={mod.id}
                  draggable
                  className="flex items-center gap-3 px-4 py-3.5 transition-all cursor-grab active:cursor-grabbing select-none bg-white hover:bg-[#f5f5f5]/60"
                >
                  <div className="w-4 h-4 flex items-center justify-center text-stone-300 shrink-0">
                    <i className="ri-drag-move-2-line text-base"></i>
                  </div>
                  <div className="w-6 h-6 flex items-center justify-center bg-[#1B4332]/10 text-[#1B4332] rounded-full text-[11px] font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center bg-[#1B4332]/8 rounded-lg shrink-0">
                    <i className={`${mod.icon} text-[#1B4332] text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 leading-tight">{mod.label}</p>
                    <p className="text-xs text-stone-400 truncate mt-0.5">{mod.description}</p>
                  </div>
                  <div className="flex flex-col gap-0 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveUp(mod.id)}
                      disabled={index === 0}
                      className="w-5 h-4 flex items-center justify-center text-stone-300 hover:text-stone-600 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <i className="ri-arrow-up-s-line text-sm"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(mod.id)}
                      disabled={index === enabledModules.length - 1}
                      className="w-5 h-4 flex items-center justify-center text-stone-300 hover:text-stone-600 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <i className="ri-arrow-down-s-line text-sm"></i>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className="relative w-9 h-5 rounded-full bg-[#1B4332] transition-colors cursor-pointer shrink-0"
                    title="Disable module"
                  >
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"></span>
                  </button>
                </div>
              ))}
              {enabledModules.length === 0 && (
                <div className="flex items-center justify-center py-10 text-sm text-stone-400">
                  No enabled modules. Toggle a module from the disabled list.
                </div>
              )}
            </div>
          </div>

          {/* Disabled Modules */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <div>
                <p className="text-sm font-semibold text-stone-800">Disabled modules</p>
                <p className="text-xs text-stone-400 mt-0.5">{disabledModules.length} hidden · toggle to enable</p>
              </div>
            </div>
            <div className="divide-y divide-stone-100 min-h-[80px]">
              {disabledModules.map((mod) => (
                <div
                  key={mod.id}
                  className="flex items-center gap-3 px-4 py-3.5 bg-[#f5f5f5]/40 hover:bg-[#f5f5f5] transition-colors"
                >
                  <div className="w-4 h-4 shrink-0"></div>
                  <div className="w-6 h-6 flex items-center justify-center bg-stone-100 rounded-full shrink-0">
                    <i className="ri-eye-off-line text-stone-400 text-[11px]"></i>
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center bg-stone-100 rounded-lg shrink-0">
                    <i className={`${mod.icon} text-stone-400 text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-400 leading-tight">{mod.label}</p>
                    <p className="text-xs text-stone-300 truncate mt-0.5">{mod.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className="relative w-9 h-5 rounded-full bg-stone-200 transition-colors cursor-pointer shrink-0"
                    title="Enable module"
                  >
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"></span>
                  </button>
                </div>
              ))}
              {disabledModules.length === 0 && (
                <div className="flex items-center justify-center py-10 text-sm text-stone-400">
                  All modules are enabled.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-[#1B4332]/5 border border-[#1B4332]/10 rounded-xl">
          <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
            <i className="ri-information-line text-[#1B4332] text-base"></i>
          </div>
          <p className="text-sm text-stone-600">
            <span className="font-medium text-stone-700">How this works — </span>
            The Add Property multi-step form reads this saved configuration on every load. Each enabled module becomes one step in the wizard, in the exact order shown on the left. Changes take effect immediately after saving — no code edits required.
          </p>
        </div>
      </div>
    </ManagementLayout>
  );
}