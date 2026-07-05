import { useEffect, useState, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let listeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

export function addToast(message: string, type: Toast['type'] = 'success') {
  const id = `${Date.now()}-${Math.random()}`;
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 3000);
}

export function useCRMToasts() {
  const [state, setState] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    addToast(message, type);
  }, []);

  return { toasts: state, showToast };
}

// Named export for convenience
export const showToast = addToast;

export function CRMToastContainer() {
  const { toasts: activeToasts } = useCRMToasts();

  if (activeToasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
      {activeToasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-roboto transition-all animate-fade-in ${
            toast.type === 'success'
              ? 'bg-[#0d5959] text-white'
              : toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-[#001731] text-white'
          }`}
        >
          <i
            className={`${
              toast.type === 'success'
                ? 'ri-check-line'
                : toast.type === 'error'
                ? 'ri-error-warning-line'
                : 'ri-information-line'
            } text-base`}
          />
          {toast.message}
        </div>
      ))}
    </div>
  );
}