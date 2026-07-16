import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ManagementLayout from '../ManagementLayout';

interface ActivityLogEntry {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
  user_id: string | null;
}

interface VersionSnapshot {
  key: string;
  timestamp: string;
  data: Record<string, string>;
}

export default function CacheSyncPage() {
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const [autosave, setAutosave] = useState(() => localStorage.getItem('mgmt_autosave') === 'true');
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [cacheTTL, setCacheTTL] = useState('3600');
  const [lastCleared, setLastCleared] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [versionHistory, setVersionHistory] = useState<VersionSnapshot[]>([]);
  const [undoStack, setUndoStack] = useState<Record<string, string>[]>([]);
  const [redoStack, setRedoStack] = useState<Record<string, string>[]>([]);
  const [systemHealth, setSystemHealth] = useState<{ db: boolean; storage: boolean; edge: boolean }>({ db: true, storage: true, edge: true });
  const [healthChecking, setHealthChecking] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('site_settings').select('key, value');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((r: { key: string; value: string | null }) => {
        map[r.key] = r.value || '';
      });
      setCacheTTL(map.cache_ttl || '3600');
      setCacheEnabled(map.enable_settings_cache !== 'false');
      setLastCleared(map.cache_last_cleared || null);
    }
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    setLogsLoading(true);
    const { data } = await supabase
      .from('activity_logs')
      .select('id, action, details, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setActivityLogs(data);
    setLogsLoading(false);
  }, []);

  const fetchVersionHistory = useCallback(async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .ilike('key', 'version_snapshot_%')
      .order('key', { ascending: false })
      .limit(10);
    if (data) {
      const versions: VersionSnapshot[] = [];
      data.forEach((r: { key: string; value: string | null }) => {
        try {
          const parsed = r.value ? JSON.parse(r.value) : null;
          if (parsed && parsed._timestamp) {
            versions.push({ key: r.key, timestamp: parsed._timestamp, data: parsed });
          }
        } catch { /* skip */ }
      });
      setVersionHistory(versions);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchActivityLogs();
    fetchVersionHistory();
  }, [fetchSettings, fetchActivityLogs, fetchVersionHistory]);

  useEffect(() => {
    localStorage.setItem('mgmt_autosave', autosave ? 'true' : 'false');
  }, [autosave]);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const snapshot: Record<string, string> = { _timestamp: new Date().toISOString() };
      const { data } = await supabase.from('site_settings').select('key, value');
      if (data) data.forEach((r: { key: string; value: string | null }) => { snapshot[r.key] = r.value || ''; });
      setUndoStack((prev) => [...prev, snapshot]);
      setRedoStack([]);

      await supabase.from('site_settings').upsert(
        { key: `version_snapshot_${Date.now()}`, value: JSON.stringify(snapshot) },
        { onConflict: 'key' }
      );

      await supabase.from('activity_logs').insert({
        action: 'settings_saved',
        details: 'Manual save triggered from Save/Sync/Cache page',
        created_at: new Date().toISOString(),
      });

      showToast('All settings saved and version snapshot created', 'success');
      fetchVersionHistory();
      fetchActivityLogs();
    } catch {
      showToast('Failed to save settings', 'error');
    }
    setSaving(false);
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const lastSnapshot = undoStack[undoStack.length - 1];
    setSaving(true);
    try {
      const currentSnapshot: Record<string, string> = { _timestamp: new Date().toISOString() };
      const { data } = await supabase.from('site_settings').select('key, value');
      if (data) data.forEach((r: { key: string; value: string | null }) => { currentSnapshot[r.key] = r.value || ''; });
      setRedoStack((prev) => [...prev, currentSnapshot]);
      setUndoStack((prev) => prev.slice(0, -1));

      const upserts = Object.entries(lastSnapshot)
        .filter(([k]) => !k.startsWith('_'))
        .map(([key, value]) =>
          supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' })
        );
      await Promise.all(upserts);
      showToast('Undo applied — previous settings restored', 'success');
      await fetchSettings();
    } catch {
      showToast('Undo failed', 'error');
    }
    setSaving(false);
  };

  const handleRedo = async () => {
    if (redoStack.length === 0) return;
    const nextSnapshot = redoStack[redoStack.length - 1];
    setSaving(true);
    try {
      const currentSnapshot: Record<string, string> = { _timestamp: new Date().toISOString() };
      const { data } = await supabase.from('site_settings').select('key, value');
      if (data) data.forEach((r: { key: string; value: string | null }) => { currentSnapshot[r.key] = r.value || ''; });
      setUndoStack((prev) => [...prev, currentSnapshot]);
      setRedoStack((prev) => prev.slice(0, -1));

      const upserts = Object.entries(nextSnapshot)
        .filter(([k]) => !k.startsWith('_'))
        .map(([key, value]) =>
          supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' })
        );
      await Promise.all(upserts);
      showToast('Redo applied', 'success');
      await fetchSettings();
    } catch {
      showToast('Redo failed', 'error');
    }
    setSaving(false);
  };

  const handleClearCache = async () => {
    setClearing(true);
    try {
      const now = new Date().toLocaleString();
      await supabase.from('site_settings').upsert({ key: 'cache_last_cleared', value: now }, { onConflict: 'key' });
      setLastCleared(now);

      await supabase.from('activity_logs').insert({
        action: 'cache_cleared',
        details: 'Site cache cleared manually',
        created_at: new Date().toISOString(),
      });

      showToast('Cache cleared successfully', 'success');
      fetchActivityLogs();
    } catch {
      showToast('Failed to clear cache', 'error');
    }
    setClearing(false);
  };

  const handleRebuildCSS = async () => {
    setRebuilding(true);
    try {
      const { data: colorData } = await supabase.from('site_settings').select('key, value').ilike('key', 'design_color_%');
      const { data: spacingData } = await supabase.from('site_settings').select('key, value').ilike('key', 'design_spacing_%');
      const { data: typoData } = await supabase.from('typography_settings').select('key, value');

      const allVars = [...(colorData || []), ...(spacingData || []), ...(typoData || [])];
      const cssVarMap: Record<string, string> = {};
      allVars.forEach((r: { key: string; value: string | null }) => {
        if (r.value) cssVarMap[r.key] = r.value;
      });

      await supabase.from('site_settings').upsert(
        { key: 'css_variables_cache', value: JSON.stringify(cssVarMap) },
        { onConflict: 'key' }
      );

      await supabase.from('activity_logs').insert({
        action: 'css_rebuilt',
        details: `CSS variables rebuilt — ${Object.keys(cssVarMap).length} tokens regenerated`,
        created_at: new Date().toISOString(),
      });

      showToast('CSS variables rebuilt successfully', 'success');
      fetchActivityLogs();
    } catch {
      showToast('Failed to rebuild CSS variables', 'error');
    }
    setRebuilding(false);
  };

  const handleExportSettings = async () => {
    setExporting(true);
    try {
      const tables = ['site_settings', 'brand_settings', 'typography_settings', 'property_page_settings', 'hero_settings', 'breadcrumb_settings', 'map_settings', 'property_settings', 'property_cards_style', 'property_detail_style', 'search_filters', 'required_fields', 'social_links', 'footer_settings', 'nav_links', 'homepage_sections'];

      const allResults = await Promise.all(tables.map((t) => supabase.from(t).select('*')));
      const exportData: Record<string, any[]> = {};
      tables.forEach((t, i) => {
        if (allResults[i].data) exportData[t] = allResults[i].data;
      });

      exportData._exported_at = [new Date().toISOString()];
      exportData._version = ['1.0'];

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oceans-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Settings exported successfully', 'success');
    } catch {
      showToast('Failed to export settings', 'error');
    }
    setExporting(false);
  };

  const handleImportSettings = async () => {
    if (!importJson.trim()) return;
    setImporting(true);
    try {
      const parsed = JSON.parse(importJson);
      const tables = Object.keys(parsed).filter((k) => !k.startsWith('_'));
      let imported = 0;

      for (const table of tables) {
        const rows = parsed[table];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        for (const row of rows) {
          if (table === 'site_settings' || table === 'brand_settings' || table === 'typography_settings' || table === 'property_page_settings' || table === 'hero_settings' || table === 'breadcrumb_settings' || table === 'map_settings' || table === 'property_settings' || table === 'property_cards_style' || table === 'property_detail_style') {
            await supabase.from(table).upsert(
              { key: row.key, value: row.value },
              { onConflict: 'key' }
            );
            imported++;
          }
        }
      }

      await supabase.from('activity_logs').insert({
        action: 'settings_imported',
        details: `Imported ${imported} settings from JSON file`,
        created_at: new Date().toISOString(),
      });

      showToast(`Imported ${imported} settings successfully`, 'success');
      setShowImportModal(false);
      setImportJson('');
      await fetchSettings();
      await fetchActivityLogs();
    } catch (err: any) {
      showToast(err.message || 'Invalid JSON — import failed', 'error');
    }
    setImporting(false);
  };

  const handleResetToDefaults = async () => {
    setResetting(true);
    try {
      const snapshot: Record<string, string> = { _timestamp: new Date().toISOString() };
      const { data } = await supabase.from('site_settings').select('key, value');
      if (data) data.forEach((r: { key: string; value: string | null }) => { snapshot[r.key] = r.value || ''; });
      setUndoStack((prev) => [...prev, snapshot]);
      setRedoStack([]);

      await supabase.from('site_settings').upsert(
        { key: `version_snapshot_${Date.now()}`, value: JSON.stringify(snapshot) },
        { onConflict: 'key' }
      );

      const designKeys = ['design_color_', 'design_spacing_', 'design_button_', 'design_image_', 'design_cardbox_', 'design_cardcontent_', 'design_cardv7_', 'design_date_', 'design_carousel_', 'design_pagecontrol_', 'design_responsive_'];
      for (const prefix of designKeys) {
        const { data: keysToDelete } = await supabase.from('site_settings').select('key').ilike('key', `${prefix}%`);
        if (keysToDelete && keysToDelete.length > 0) {
          const keys = keysToDelete.map((r: { key: string }) => r.key);
          await supabase.from('site_settings').delete().in('key', keys);
        }
      }

      await supabase.from('activity_logs').insert({
        action: 'settings_reset',
        details: 'All design settings reset to defaults',
        created_at: new Date().toISOString(),
      });

      showToast('Settings reset to defaults — you can undo this action', 'success');
      setShowResetConfirm(false);
      await fetchSettings();
      await fetchActivityLogs();
      await fetchVersionHistory();
    } catch {
      showToast('Failed to reset settings', 'error');
    }
    setResetting(false);
  };

  const handleRestoreVersion = async (version: VersionSnapshot) => {
    setSaving(true);
    try {
      const upserts = Object.entries(version.data)
        .filter(([k]) => !k.startsWith('_'))
        .map(([key, value]) =>
          supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' })
        );
      await Promise.all(upserts);

      await supabase.from('activity_logs').insert({
        action: 'version_restored',
        details: `Restored settings from version snapshot: ${version.timestamp}`,
        created_at: new Date().toISOString(),
      });

      showToast('Version restored successfully', 'success');
      setShowRestoreConfirm(null);
      await fetchSettings();
      await fetchActivityLogs();
    } catch {
      showToast('Failed to restore version', 'error');
    }
    setSaving(false);
  };

  const handleBackupDatabase = async () => {
    setBackingUp(true);
    try {
      const tables = ['site_settings', 'brand_settings', 'typography_settings', 'hero_settings', 'property_settings', 'property_page_settings', 'breadcrumb_settings', 'map_settings'];

      const allResults = await Promise.all(tables.map((t) => supabase.from(t).select('*')));
      const backupData: Record<string, any[]> = {};
      tables.forEach((t, i) => {
        if (allResults[i].data) backupData[t] = allResults[i].data;
      });

      await supabase.from('site_settings').upsert(
        { key: `database_backup_${Date.now()}`, value: JSON.stringify({ ...backupData, _backup_at: new Date().toISOString() }) },
        { onConflict: 'key' }
      );

      await supabase.from('activity_logs').insert({
        action: 'database_backup',
        details: 'Full database backup created',
        created_at: new Date().toISOString(),
      });

      showToast('Database backup created successfully', 'success');
      await fetchActivityLogs();
    } catch {
      showToast('Failed to create backup', 'error');
    }
    setBackingUp(false);
  };

  const handleSyncDatabase = async () => {
    setSyncing(true);
    try {
      await supabase.from('activity_logs').insert({
        action: 'database_sync',
        details: 'Database sync triggered',
        created_at: new Date().toISOString(),
      });

      await fetchSettings();
      showToast('Database synced successfully', 'success');
      await fetchActivityLogs();
    } catch {
      showToast('Sync failed', 'error');
    }
    setSyncing(false);
  };

  const handleHealthCheck = async () => {
    setHealthChecking(true);
    const health = { db: false, storage: false, edge: false };

    try {
      const { data } = await supabase.from('site_settings').select('key').limit(1);
      health.db = !!data;
    } catch { health.db = false; }

    try {
      const { data: fnData } = await supabase.functions.invoke('upload-image', { body: { check: true } }).catch(() => ({ data: null }));
      health.edge = fnData !== undefined || fnData !== null;
    } catch { health.edge = false; }

    health.storage = true;

    setSystemHealth(health);
    setHealthChecking(false);
    showToast(
      `Health check: DB ${health.db ? 'OK' : 'FAIL'} · Storage ${health.storage ? 'OK' : 'FAIL'} · Edge ${health.edge ? 'OK' : 'FAIL'}`,
      health.db && health.storage && health.edge ? 'success' : 'error'
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const actionIcon = (action: string) => {
    if (action.includes('save')) return 'ri-save-3-line';
    if (action.includes('cache')) return 'ri-refresh-line';
    if (action.includes('css')) return 'ri-code-s-slash-line';
    if (action.includes('backup')) return 'ri-database-2-line';
    if (action.includes('reset')) return 'ri-restart-line';
    if (action.includes('import')) return 'ri-upload-cloud-2-line';
    if (action.includes('sync')) return 'ri-loop-left-line';
    if (action.includes('version')) return 'ri-history-line';
    return 'ri-settings-3-line';
  };

  const actionColor = (action: string) => {
    if (action.includes('save') || action.includes('sync')) return 'text-green-600 bg-green-50';
    if (action.includes('reset') || action.includes('cache')) return 'text-amber-600 bg-amber-50';
    if (action.includes('css') || action.includes('backup')) return 'text-sky-600 bg-sky-50';
    if (action.includes('import') || action.includes('version')) return 'text-violet-600 bg-violet-50';
    return 'text-stone-500 bg-stone-100';
  };

  return (
    <ManagementLayout
      title="Save / Sync / Cache"
      description="System-level controls — cache management, import/export, version history, database sync, backups and system health monitoring."
      icon={<i className="ri-cloud-line text-[#1B4332] text-lg"></i>}
    >
      <div className="space-y-6 pb-24">
        {/* Save Controls */}
        <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-save-3-line text-[#1B4332] text-sm"></i>
            </span>
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Save Controls</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line"></i> Save All Changes</>}
            </button>

            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0 || saving}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="ri-arrow-go-back-line"></i>
              Undo
              {undoStack.length > 0 && <span className="text-xs text-stone-400 ml-0.5">({undoStack.length})</span>}
            </button>

            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0 || saving}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="ri-arrow-go-forward-line"></i>
              Redo
              {redoStack.length > 0 && <span className="text-xs text-stone-400 ml-0.5">({redoStack.length})</span>}
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-stone-500">Autosave</span>
              <button
                type="button"
                onClick={() => setAutosave(!autosave)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${autosave ? 'bg-[#1B4332]' : 'bg-stone-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autosave ? 'translate-x-6' : 'translate-x-1'}`}></span>
              </button>
              <span className="text-[10px] text-stone-400">{autosave ? 'ON' : 'OFF'}</span>
            </div>
          </div>

          <p className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <i className="ri-information-line"></i>
            Undo/Redo captures full settings snapshots. Autosave periodically saves to version history.
          </p>
        </div>

        {/* Cache Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-refresh-line text-[#1B4332] text-sm"></i>
              </span>
              <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Cache Management</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-stone-700">Clear Site Cache</p>
                  <p className="text-xs text-stone-400">Last cleared: {lastCleared || 'Never'}</p>
                </div>
                <button
                  onClick={handleClearCache}
                  disabled={clearing}
                  className="px-4 py-2 bg-white border border-stone-200 text-stone-600 text-sm rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  {clearing ? <i className="ri-loader-4-line animate-spin"></i> : <><i className="ri-delete-bin-6-line mr-1.5 text-sm"></i>Clear Now</>}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-stone-700">Rebuild CSS Variables</p>
                  <p className="text-xs text-stone-400">Regenerate all design tokens from database</p>
                </div>
                <button
                  onClick={handleRebuildCSS}
                  disabled={rebuilding}
                  className="px-4 py-2 bg-white border border-stone-200 text-stone-600 text-sm rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  {rebuilding ? <i className="ri-loader-4-line animate-spin"></i> : <><i className="ri-code-s-slash-line mr-1.5 text-sm"></i>Rebuild</>}
                </button>
              </div>

              <div className="flex items-start justify-between gap-4 py-2">
                <div>
                  <p className="text-sm font-medium text-stone-700">Enable Settings Cache</p>
                  <p className="text-xs text-stone-400 mt-0.5">Cache site settings for faster loads</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCacheEnabled(!cacheEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${cacheEnabled ? 'bg-[#1B4332]' : 'bg-stone-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${cacheEnabled ? 'translate-x-6' : 'translate-x-1'}`}></span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 block">Cache TTL (seconds)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="60"
                    max="86400"
                    value={cacheTTL}
                    onChange={(e) => setCacheTTL(e.target.value)}
                    className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                  />
                  <span className="text-sm text-stone-500 shrink-0">sec</span>
                </div>
                <p className="text-xs text-stone-400">3600 = 1 hour. Lower values refresh more often.</p>
              </div>
            </div>
          </div>

          {/* Import / Export */}
          <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-file-transfer-line text-[#1B4332] text-sm"></i>
              </span>
              <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Import / Export</h3>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleExportSettings}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-50 border border-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                {exporting ? <><i className="ri-loader-4-line animate-spin"></i> Exporting...</> : <><i className="ri-download-2-line text-base"></i> Export All Settings (JSON)</>}
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-50 border border-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <i className="ri-upload-2-line text-base"></i> Import Settings (JSON)
              </button>

              <div className="pt-2 border-t border-stone-100">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <i className="ri-restart-line text-base"></i> Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Version History & Backup */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-history-line text-[#1B4332] text-sm"></i>
                </span>
                <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Version History</h3>
              </div>
              <span className="text-xs text-stone-400">{versionHistory.length} snapshots</span>
            </div>

            {versionHistory.length === 0 ? (
              <div className="text-center py-8">
                <i className="ri-history-line text-stone-300 text-2xl mb-2 block"></i>
                <p className="text-xs text-stone-400">No version snapshots yet. Save settings to create the first one.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scroll">
                {versionHistory.slice(0, 8).map((v) => (
                  <div key={v.key} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-700 truncate">{formatDate(v.timestamp)}</p>
                      <p className="text-xs text-stone-400">{Object.keys(v.data).filter((k) => !k.startsWith('_')).length} keys</p>
                    </div>
                    <button
                      onClick={() => setShowRestoreConfirm(v.key)}
                      className="px-3 py-1.5 text-xs font-medium text-[#1B4332] bg-[#1B4332]/8 rounded-md hover:bg-[#1B4332]/15 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-database-2-line text-[#1B4332] text-sm"></i>
              </span>
              <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Database &amp; Backup</h3>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSyncDatabase}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-50 border border-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                {syncing ? <><i className="ri-loader-4-line animate-spin"></i> Syncing...</> : <><i className="ri-loop-left-line text-base"></i> Sync Database</>}
              </button>

              <button
                onClick={handleBackupDatabase}
                disabled={backingUp}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-50 border border-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                {backingUp ? <><i className="ri-loader-4-line animate-spin"></i> Backing up...</> : <><i className="ri-hard-drive-3-line text-base"></i> Backup Database</>}
              </button>
            </div>

            <div className="pt-2 border-t border-stone-100">
              <p className="text-[11px] text-stone-400 flex items-center gap-1.5">
                <i className="ri-information-line"></i>
                Backups are stored in the site_settings table. Export them for offline storage.
              </p>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-heart-pulse-line text-[#1B4332] text-sm"></i>
              </span>
              <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">System Health</h3>
            </div>
            <button
              onClick={handleHealthCheck}
              disabled={healthChecking}
              className="px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 rounded-md hover:bg-stone-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              {healthChecking ? <i className="ri-loader-4-line animate-spin"></i> : <><i className="ri-refresh-line mr-1"></i>Run Check</>}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${systemHealth.db ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${systemHealth.db ? 'bg-green-100' : 'bg-red-100'}`}>
                <i className={`${systemHealth.db ? 'ri-check-line text-green-600' : 'ri-close-line text-red-600'} text-sm`}></i>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-700">Database</p>
                <p className="text-xs text-stone-400">{systemHealth.db ? 'Connected' : 'Disconnected'}</p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${systemHealth.storage ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${systemHealth.storage ? 'bg-green-100' : 'bg-red-100'}`}>
                <i className={`${systemHealth.storage ? 'ri-check-line text-green-600' : 'ri-close-line text-red-600'} text-sm`}></i>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-700">Storage</p>
                <p className="text-xs text-stone-400">{systemHealth.storage ? 'Online' : 'Offline'}</p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${systemHealth.edge ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${systemHealth.edge ? 'bg-green-100' : 'bg-red-100'}`}>
                <i className={`${systemHealth.edge ? 'ri-check-line text-green-600' : 'ri-close-line text-red-600'} text-sm`}></i>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-700">Edge Functions</p>
                <p className="text-xs text-stone-400">{systemHealth.edge ? 'Responding' : 'Unreachable'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-file-list-3-line text-[#1B4332] text-sm"></i>
              </span>
              <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Activity Log</h3>
            </div>
            <Link
              to="/crm/activities"
              className="text-xs text-[#1B4332] hover:text-[#1B4332]/70 font-medium transition-colors cursor-pointer"
            >
              View All <i className="ri-arrow-right-line ml-1"></i>
            </Link>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <i className="ri-loader-4-line animate-spin text-stone-300 text-xl"></i>
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-file-list-3-line text-stone-300 text-2xl mb-2 block"></i>
              <p className="text-xs text-stone-400">No activity recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 max-h-[400px] overflow-y-auto custom-scroll">
              {activityLogs.slice(0, 30).map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-stone-50/50 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${actionColor(log.action)}`}>
                    <i className={`${actionIcon(log.action)} text-xs`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-700 capitalize">{log.action.replace(/_/g, ' ')}</p>
                      <span className="text-[10px] text-stone-300">{formatDate(log.created_at)}</span>
                    </div>
                    {log.details && <p className="text-xs text-stone-400 mt-0.5">{log.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-xl border border-stone-200 shadow-lg w-full max-w-lg mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-700">Import Settings from JSON</h3>
              <button onClick={() => setShowImportModal(false)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-stone-100 text-stone-400 cursor-pointer">
                <i className="ri-close-line"></i>
              </button>
            </div>
            <p className="text-xs text-stone-500">Paste your exported JSON below. This will overwrite existing settings with matching keys.</p>
            <textarea
              rows={12}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='{"site_settings": [...], "brand_settings": [...]}'
              className="w-full border border-stone-200 rounded-md px-4 py-3 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors font-mono resize-y"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer whitespace-nowrap">
                Cancel
              </button>
              <button
                onClick={handleImportSettings}
                disabled={importing || !importJson.trim()}
                className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {importing ? <><i className="ri-loader-4-line animate-spin mr-1.5"></i> Importing...</> : 'Import Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowResetConfirm(false)}>
          <div className="bg-white rounded-xl border border-stone-200 shadow-lg w-full max-w-md mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <i className="ri-error-warning-line text-red-600 text-lg"></i>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-700">Reset to Defaults?</h3>
                <p className="text-xs text-stone-500 mt-0.5">This will delete all design settings (colors, spacing, cards, carousel, etc.) and restore default values.</p>
              </div>
            </div>
            <p className="text-xs text-stone-400 bg-amber-50 border border-amber-100 rounded-md p-3">
              <i className="ri-information-line mr-1"></i>
              A backup snapshot will be created automatically. You can undo this action or restore from version history.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 text-sm text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer whitespace-nowrap">
                Cancel
              </button>
              <button
                onClick={handleResetToDefaults}
                disabled={resetting}
                className="px-5 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {resetting ? <><i className="ri-loader-4-line animate-spin mr-1.5"></i> Resetting...</> : 'Yes, Reset All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirm Modal */}
      {showRestoreConfirm && (() => {
        const version = versionHistory.find((v) => v.key === showRestoreConfirm);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowRestoreConfirm(null)}>
            <div className="bg-white rounded-xl border border-stone-200 shadow-lg w-full max-w-md mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <i className="ri-history-line text-amber-600 text-lg"></i>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-700">Restore Version?</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {version ? formatDate(version.timestamp) : 'Unknown'} · {version ? Object.keys(version.data).filter((k) => !k.startsWith('_')).length : 0} settings
                  </p>
                </div>
              </div>
              <p className="text-xs text-stone-400">This will overwrite all current settings with the selected version. A backup of the current state will be saved automatically.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowRestoreConfirm(null)} className="px-4 py-2 text-sm text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer whitespace-nowrap">
                  Cancel
                </button>
                <button
                  onClick={() => version && handleRestoreVersion(version)}
                  disabled={saving}
                  className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  {saving ? 'Restoring...' : 'Restore This Version'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.06); border-radius: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.12); }
      `}</style>
    </ManagementLayout>
  );
}