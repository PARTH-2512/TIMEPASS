import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Surveillance Node Service Unavailable',
  message = 'Failed to fetch telemetry and ANPR records from the edge ingestion pipeline.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-rose-900/40 bg-rose-950/20 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-900/30 border border-rose-700/50 flex items-center justify-center mb-4 text-rose-400">
        <AlertOctagon className="w-7 h-7 animate-pulse" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-rose-200 mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-rose-300/80 max-w-md leading-relaxed mb-5">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-100 text-xs font-semibold border border-rose-700 shadow-md transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      )}
    </div>
  );
};
