import React from 'react';
import { Search, ShieldAlert, Video, EyeOff } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'search' | 'alert' | 'camera' | 'sighting';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'search',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  const IconComponent =
    icon === 'alert'
      ? ShieldAlert
      : icon === 'camera'
      ? Video
      : icon === 'sighting'
      ? EyeOff
      : Search;

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center mb-4 text-slate-500 dark:text-slate-400 shadow-xs">
        <IconComponent className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-200 mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-5">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 shadow-xs transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
