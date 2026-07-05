export const SYNC_CHANNEL = 'oceans_sync';
export const SYNC_KEY = 'oceans_sync_timestamp';

export function broadcastSync() {
  const timestamp = Date.now().toString();
  localStorage.setItem(SYNC_KEY, timestamp);

  try {
    const bc = new BroadcastChannel(SYNC_CHANNEL);
    bc.postMessage({ type: 'sync', timestamp });
    bc.close();
  } catch {
    // BroadcastChannel not supported, localStorage event handles it
  }
}

export function listenForSync(callback: () => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === SYNC_KEY) {
      callback();
    }
  };

  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'sync') {
      callback();
    }
  };

  window.addEventListener('storage', handleStorage);

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(SYNC_CHANNEL);
    bc.addEventListener('message', handleMessage);
  } catch {
    // BroadcastChannel not supported
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    if (bc) {
      bc.removeEventListener('message', handleMessage);
      bc.close();
    }
  };
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(SYNC_KEY);
}