import { useCRMToasts } from './CRMToast';

export function CRMToastContainer() {
  const { toasts: activeToasts } = useCRMToasts();

  if (activeToasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
      {activeToasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-sm transition-all animate-fade-in ${
            toast.type === 'success'
              ? 'bg-accent text-white'
              : toast.type === 'error'
              ? 'bg-[#dc2626] text-white'
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
