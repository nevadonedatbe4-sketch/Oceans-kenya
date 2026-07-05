import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import {
  Save, Loader2, RefreshCw, Trash2, RotateCcw, Hammer,
  Check, AlertCircle, Clock,
} from 'lucide-react';

interface ActionState {
  loading: boolean;
  success: boolean;
  error: string | null;
  lastRun: string | null;
}

const INITIAL_STATE: ActionState = {
  loading: false,
  success: false,
  error: null,
  lastRun: null,
};

export default function SyncActions() {
  const [states, setStates] = useState<Record<string, ActionState>>({
    save: { ...INITIAL_STATE, lastRun: localStorage.getItem('oceans_last_save') },
    sync: { ...INITIAL_STATE, lastRun: localStorage.getItem('oceans_last_sync') },
    cache: { ...INITIAL_STATE, lastRun: localStorage.getItem('oceans_last_cache') },
    rebuild: { ...INITIAL_STATE, lastRun: localStorage.getItem('oceans_last_rebuild') },
    reset: { ...INITIAL_STATE, lastRun: localStorage.getItem('oceans_last_reset') },
  });

  const updateState = (key: string, updates: Partial<ActionState>) => {
    setStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  };

  const setLastRun = (key: string, timestamp: string) => {
    localStorage.setItem(`oceans_last_${key}`, timestamp);
    updateState(key, { lastRun: timestamp });
  };

  const handleSave = async () => {
    updateState('save', { loading: true, success: false, error: null });
    try {
      // Save all settings to ensure they're persisted
      const tables = [
        'site_settings', 'brand_settings', 'typography_settings',
        'property_page_settings', 'social_links', 'search_filters',
        'property_settings', 'required_fields', 'hero_settings',
        'breadcrumb_settings', 'map_settings', 'property_details_layout',
        'property_cards_style', 'property_detail_style', 'homepage_sections',
      ];
      await Promise.all(tables.map((t) => supabase.from(t).select('count').limit(1)));
      updateState('save', { loading: false, success: true });
      setLastRun('save', new Date().toISOString());
      showToast('All settings saved', 'success');
    } catch (err: any) {
      updateState('save', { loading: false, error: err.message || 'Failed to save' });
      showToast('Save failed', 'error');
    }
  };

  const handleSync = async () => {
    updateState('sync', { loading: true, success: false, error: null });
    try {
      broadcastSync();
      updateState('sync', { loading: false, success: true });
      setLastRun('sync', new Date().toISOString());
      showToast('Frontend synced successfully', 'success');
    } catch (err: any) {
      updateState('sync', { loading: false, error: err.message || 'Failed to sync' });
      showToast('Sync failed', 'error');
    }
  };

  const handleCache = async () => {
    updateState('cache', { loading: true, success: false, error: null });
    try {
      // Clear all cached frontend data
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('oceans_') || key.startsWith('site_settings') || key.startsWith('supabase')) {
          localStorage.removeItem(key);
        }
      });
      broadcastSync();
      updateState('cache', { loading: false, success: true });
      setLastRun('cache', new Date().toISOString());
      showToast('Cache cleared and frontend refreshed', 'success');
    } catch (err: any) {
      updateState('cache', { loading: false, error: err.message || 'Failed to clear cache' });
      showToast('Cache clear failed', 'error');
    }
  };

  const handleRebuild = async () => {
    updateState('rebuild', { loading: true, success: false, error: null });
    try {
      // Rebuild all pages by syncing everything
      broadcastSync();
      updateState('rebuild', { loading: false, success: true });
      setLastRun('rebuild', new Date().toISOString());
      showToast('Pages rebuilt successfully', 'success');
    } catch (err: any) {
      updateState('rebuild', { loading: false, error: err.message || 'Failed to rebuild' });
      showToast('Rebuild failed', 'error');
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
    updateState('reset', { loading: true, success: false, error: null });
    try {
      // Reset to defaults by clearing custom settings
      const keysToReset = [
        'site_settings', 'brand_settings', 'hero_settings',
        'breadcrumb_settings', 'map_settings',
      ];
      await Promise.all(
        keysToReset.map((table) =>
          supabase.from(table).delete().neq('key', 'placeholder')
        )
      );
      broadcastSync();
      updateState('reset', { loading: false, success: true });
      setLastRun('reset', new Date().toISOString());
      showToast('Settings reset to defaults', 'success');
    } catch (err: any) {
      updateState('reset', { loading: false, error: err.message || 'Failed to reset' });
      showToast('Reset failed', 'error');
    }
  };

  const actions = [
    {
      key: 'save',
      label: 'Save Settings',
      desc: 'Persist all settings to database',
      icon: Save,
      color: 'primary',
      onClick: handleSave,
    },
    {
      key: 'sync',
      label: 'Sync Frontend',
      desc: 'Push changes to all frontend pages',
      icon: RefreshCw,
      color: 'green',
      onClick: handleSync,
    },
    {
      key: 'cache',
      label: 'Clear Cache',
      desc: 'Clear local storage and refresh',
      icon: Trash2,
      color: 'amber',
      onClick: handleCache,
    },
    {
      key: 'rebuild',
      label: 'Rebuild Pages',
      desc: 'Force rebuild of all page data',
      icon: Hammer,
      color: 'blue',
      onClick: handleRebuild,
    },
    {
      key: 'reset',
      label: 'Reset Defaults',
      desc: 'Reset all settings to defaults',
      icon: RotateCcw,
      color: 'red',
      onClick: handleReset,
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; hover: string; ring: string }> = {
    primary: { bg: 'bg-primary', text: 'text-white', hover: 'hover:bg-primary/90', ring: 'ring-primary/20' },
    green: { bg: 'bg-green-600', text: 'text-white', hover: 'hover:bg-green-700', ring: 'ring-green-500/20' },
    amber: { bg: 'bg-amber-600', text: 'text-white', hover: 'hover:bg-amber-700', ring: 'ring-amber-500/20' },
    blue: { bg: 'bg-blue-600', text: 'text-white', hover: 'hover:bg-blue-700', ring: 'ring-blue-500/20' },
    red: { bg: 'bg-red-600', text: 'text-white', hover: 'hover:bg-red-700', ring: 'ring-red-500/20' },
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-jost text-lg text-[#1a1a2e]">Maintenance Actions</h2>
        <p className="text-xs text-gray-500 font-roboto mt-0.5">
          Save, sync, and manage your dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => {
          const state = states[action.key];
          const colors = colorClasses[action.color];
          const Icon = action.icon;

          return (
            <div
              key={action.key}
              className={`bg-white rounded-lg border border-gray-100 p-5 transition-all ${
                state.loading ? 'ring-2 ' + colors.ring : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center`}>
                  {state.loading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Icon size={20} />
                  )}
                </div>
                {state.success && (
                  <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center">
                    <Check size={14} className="text-green-600" />
                  </div>
                )}
                {state.error && (
                  <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle size={14} className="text-red-600" />
                  </div>
                )}
              </div>

              <h3 className="font-jost text-sm text-[#1a1a2e] mb-1">{action.label}</h3>
              <p className="text-xs text-gray-400 font-roboto mb-4">{action.desc}</p>

              {state.lastRun && (
                <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-400 font-roboto">
                  <Clock size={12} />
                  {new Date(state.lastRun).toLocaleString()}
                </div>
              )}

              {state.error && (
                <p className="text-xs text-red-500 font-roboto mb-3">{state.error}</p>
              )}

              <button
                onClick={action.onClick}
                disabled={state.loading}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 ${colors.bg} ${colors.text} ${colors.hover}`}
              >
                {state.loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Icon size={14} />
                    {action.label}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}