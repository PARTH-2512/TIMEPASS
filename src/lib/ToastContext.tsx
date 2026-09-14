import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X, ShieldAlert, Radio, Eye } from 'lucide-react';
import { soundManager } from './audio';

export type ToastType = 'success' | 'alert' | 'info' | 'error';
export type AlertPriority = 'high' | 'medium' | 'low';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  timestamp: string;
  // Alert specific fields
  alertType?: string;
  priority?: AlertPriority;
  plateNumber?: string;
  cameraName?: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, 'id' | 'timestamp'>) => {
      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newToast: ToastItem = { ...toast, id, timestamp };

      setToasts((prev) => [newToast, ...prev].slice(0, 5));

      // Play audio chime based on alert priority or success
      if (toast.type === 'alert') {
        const prio = toast.priority || 'high';
        soundManager.playAlertChime(prio);
      } else if (toast.type === 'success') {
        soundManager.playSuccessTone();
      }

      const duration = toast.duration ?? (toast.type === 'alert' ? 8000 : 5000);
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      {/* Toast Floating Container */}
      <div
        id="toast-notification-container"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const isAlert = toast.type === 'alert';
          const priority = toast.priority || 'high';

          // Color themes for light and dark modes
          let containerClasses = '';
          let badgeClasses = '';

          if (isAlert) {
            if (priority === 'high') {
              containerClasses =
                'border-rose-500/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl shadow-rose-950/20 dark:shadow-rose-950/50 ring-1 ring-rose-500/30';
              badgeClasses = 'bg-rose-500 text-white font-black animate-pulse';
            } else if (priority === 'medium') {
              containerClasses =
                'border-amber-500/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl shadow-amber-950/20 dark:shadow-amber-950/50 ring-1 ring-amber-500/30';
              badgeClasses = 'bg-amber-500 text-slate-950 font-bold';
            } else {
              containerClasses =
                'border-sky-500/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl ring-1 ring-sky-500/30';
              badgeClasses = 'bg-sky-500 text-white font-bold';
            }
          } else if (toast.type === 'success') {
            containerClasses =
              'border-emerald-500/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl ring-1 ring-emerald-500/30';
          } else if (toast.type === 'error') {
            containerClasses =
              'border-rose-500/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl ring-1 ring-rose-500/30';
          } else {
            containerClasses =
              'border-sky-500/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl ring-1 ring-sky-500/30';
          }

          return (
            <div
              key={toast.id}
              id={`toast-${toast.id}`}
              className={`pointer-events-auto relative p-4 rounded-2xl border transition-all duration-300 transform translate-y-0 backdrop-blur-md ${containerClasses}`}
            >
              {/* Alert Header Ribbon */}
              {isAlert && (
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Radio className="w-3.5 h-3.5 text-rose-500 animate-ping shrink-0" />
                    <span className="text-rose-600 dark:text-rose-400 font-extrabold text-[11px]">
                      Real-Time Security Alert
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {toast.priority && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] tracking-wider uppercase ${badgeClasses}`}>
                        {toast.priority} Priority
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {toast.timestamp}
                    </span>
                  </div>
                </div>
              )}

              {/* Main Content Area */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {isAlert ? (
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                  ) : toast.type === 'success' ? (
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : toast.type === 'error' ? (
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                      <XCircle className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                      <Info className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                        {toast.title}
                      </span>
                      {!isAlert && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {toast.timestamp}
                        </span>
                      )}
                    </div>

                    {/* Alert Type pill if present */}
                    {toast.alertType && (
                      <div className="flex items-center gap-2 my-0.5">
                        <span className="inline-flex items-center text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/60">
                          Type: {toast.alertType}
                        </span>
                        {toast.plateNumber && (
                          <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs">
                            {toast.plateNumber}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                      {toast.message}
                    </p>

                    {/* Camera Location Tag if present */}
                    {toast.cameraName && (
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        Node: {toast.cameraName}
                      </span>
                    )}

                    {/* Interactive Action Buttons */}
                    <div className="flex items-center gap-2 mt-2">
                      {toast.actionLabel && toast.onAction && (
                        <button
                          id={`toast-action-${toast.id}`}
                          onClick={() => {
                            toast.onAction?.();
                            removeToast(toast.id);
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-950/30 flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {toast.actionLabel}
                        </button>
                      )}

                      <button
                        id={`toast-dismiss-btn-${toast.id}`}
                        onClick={() => removeToast(toast.id)}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dismiss Icon Button */}
                <button
                  id={`toast-close-${toast.id}`}
                  onClick={() => removeToast(toast.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                  aria-label="Dismiss notification"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
