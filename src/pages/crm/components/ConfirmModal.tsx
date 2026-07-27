interface ConfirmModalProps {
  open?: boolean;
  isOpen?: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open && !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl w-full max-w-sm shadow-lg p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center">
          {confirmVariant === 'danger' ? (
            <i className="ri-error-warning-line text-[#dc2626] text-2xl" />
          ) : (
            <i className="ri-question-line text-accent text-2xl" />
          )}
        </div>
        <h3 className="font-prata text-lg text-stone-900 mb-1.5">{title}</h3>
        <p className="text-sm text-stone-500 mb-6">{message}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-all cursor-pointer whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm text-white transition-all cursor-pointer whitespace-nowrap ${
              confirmVariant === 'danger'
                ? 'bg-[#dc2626] hover:bg-[#b91c1c]'
                : 'bg-accent hover:bg-accent/90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}