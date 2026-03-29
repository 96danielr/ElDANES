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
      button: 'bg-danger/15 hover:bg-danger/25 text-danger border border-danger/30',
      icon: 'text-danger',
      border: 'border-danger/30'
    },
    warning: {
      button: 'bg-warning/15 hover:bg-warning/25 text-warning border border-warning/30',
      icon: 'text-warning',
      border: 'border-warning/30'
    },
    info: {
      button: 'bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30',
      icon: 'text-accent',
      border: 'border-accent/30'
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
        background: 'var(--bg-overlay)',
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
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border-default)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '400px',
          padding: '24px',
        }}
      >
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-3 rounded-xl bg-white/8 ${styles.border} border`}>
            <AlertTriangle size={24} className={styles.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">{title}</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-[10px] uppercase tracking-wider bg-white/8 hover:bg-white/12 text-[var(--text-secondary)] transition-all"
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
