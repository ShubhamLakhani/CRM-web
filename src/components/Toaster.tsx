'use client';

import React from 'react';
import { useToastStore, Toast as ToastType } from '../store/toastStore';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: ToastType;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-l-4 border-l-emerald-500';
      case 'error':
        return 'border-l-4 border-l-rose-500';
      case 'warning':
        return 'border-l-4 border-l-amber-500';
      case 'info':
      default:
        return 'border-l-4 border-l-blue-500';
    }
  };

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl border border-border bg-card/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-right-4 ${getBorderColor()}`}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="text-xs font-semibold text-foreground leading-relaxed break-words pr-2">
          {toast.message}
        </div>
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer flex-shrink-0"
        aria-label="Close notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
