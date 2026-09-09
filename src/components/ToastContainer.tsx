import React from 'react';
import { CheckCircle2, AlertTriangle, Info, AlertOctagon, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const getToastStyles = () => {
          switch (toast.type) {
            case 'success':
              return {
                icon: CheckCircle2,
                containerClass: 'bg-emerald-900/95 text-white border-emerald-700 shadow-emerald-950/40',
                iconClass: 'text-emerald-400',
              };
            case 'error':
              return {
                icon: AlertOctagon,
                containerClass: 'bg-rose-900/95 text-white border-rose-700 shadow-rose-950/40',
                iconClass: 'text-rose-400',
              };
            case 'warning':
              return {
                icon: AlertTriangle,
                containerClass: 'bg-amber-900/95 text-white border-amber-700 shadow-amber-950/40',
                iconClass: 'text-amber-400',
              };
            case 'info':
            default:
              return {
                icon: Info,
                containerClass: 'bg-slate-900/95 text-white border-slate-700 shadow-slate-950/40',
                iconClass: 'text-blue-400',
              };
          }
        };

        const config = getToastStyles();
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${config.containerClass}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconClass}`} />
            <div className="flex-1 text-xs">
              <div className="font-bold">{toast.title}</div>
              {toast.description && (
                <div className="text-slate-300 mt-0.5 leading-relaxed">{toast.description}</div>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
