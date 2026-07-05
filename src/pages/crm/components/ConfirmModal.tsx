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
      <div className="relative bg-white rounded-xl w-full max-w-sm shadow-xl p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center">
          {confirmVariant === 'danger' ? (
            <i className="ri-error-warning-line text-red-500 text-2xl" />
          ) : (
            <i className="ri-question-line text-[#0d5959] text-2xl" />
          )}
        </div>
        <h3 className="font-jost text-base text-[#001731] mb-1">{title}</h3>
        <p className="text-sm text-[#7a8a99] font-roboto mb-6">{message}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto text-[#7a8a99] hover:bg-[#f8fafc] transition-all cursor-pointer whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-roboto text-white transition-all cursor-pointer whitespace-nowrap ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#0d5959] hover:bg-[#0d5959]/90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}