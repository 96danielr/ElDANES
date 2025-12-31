import React from 'react';
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
      button: 'bg-rose-600 hover:bg-rose-500 text-white',
      icon: 'text-rose-500',
      border: 'border-rose-500/20'
    },
    warning: {
      button: 'bg-amber-600 hover:bg-amber-500 text-white',
      icon: 'text-amber-500',
      border: 'border-amber-500/20'
    },
    info: {
      button: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      icon: 'text-indigo-500',
      border: 'border-indigo-500/20'
    }
  };

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-[60px] backdrop-saturate-150 z-[300] flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md rounded-[1.75rem] overflow-hidden border-blue-200/30 animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-[0_25px_80px_rgba(59,130,246,0.2),0_0_60px_rgba(59,130,246,0.15)]">
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl bg-blue-50/50 ${styles.border} border`}>
              <AlertTriangle size={24} className={styles.icon} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black tracking-tight text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-50/50 rounded-lg text-slate-600 transition-all"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-blue-200/30">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${styles.button}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

