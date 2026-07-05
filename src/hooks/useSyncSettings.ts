import { useEffect, useState, useCallback } from 'react';
import { listenForSync, getLastSyncTime } from '@/lib/syncEngine';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export function useSyncSettings() {
  const settings = useSiteSettings();
  const [lastSync, setLastSync] = useState<string | null>(getLastSyncTime());
  const [syncCount, setSyncCount] = useState(0);

  const handleSync = useCallback(() => {
    setLastSync(getLastSyncTime());
    setSyncCount((c) => c + 1);
    // Refresh all settings
    settings.refresh();
  }, [settings]);

  useEffect(() => {
    const unsubscribe = listenForSync(handleSync);
    return unsubscribe;
  }, [handleSync]);

  // Also refresh when window regains focus
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const currentSync = getLastSyncTime();
        if (currentSync && currentSync !== lastSync) {
          handleSync();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [lastSync, handleSync]);

  return {
    ...settings,
    lastSync,
    syncCount,
    handleSync,
  };
}