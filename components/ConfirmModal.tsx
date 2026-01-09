import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      button: 'bg-[#f85149] hover:bg-[#f85149]/80 text-white',
      icon: 'text-[#f85149]',
      border: 'border-[#f85149]/30'
    },
    warning: {
      button: 'bg-[#d29922] hover:bg-[#d29922]/80 text-white',
      icon: 'text-[#d29922]',
      border: 'border-[#d29922]/30'
    },
    info: {
      button: 'bg-[#58a6ff] hover:bg-[#58a6ff]/80 text-white',
      icon: 'text-[#58a6ff]',
      border: 'border-[#58a6ff]/30'
    }
  };

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(1, 4, 9, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="animate-slide-up"
        style={{
          background: 'rgba(22, 27, 34, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(48, 54, 61, 0.5)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '400px',
          padding: '24px',
        }}
      >
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-3 rounded-xl bg-[#161b22] ${styles.border} border`}>
            <AlertTriangle size={24} className={styles.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-[#e6edf3] mb-2">{title}</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#21262d] rounded-lg text-[#8b949e] hover:text-[#e6edf3] transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-3 pt-4 border-t border-[#21262d]">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-[10px] uppercase tracking-wider bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-[10px] uppercase tracking-wider transition-all ${styles.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
