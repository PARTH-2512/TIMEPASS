import React from 'react';
import { api } from '../../lib/api';

interface ConfidenceBadgeProps {
  score?: number | null; // 0 - 100
  labelPrefix?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  score,
  labelPrefix = '',
  showPercentage = true,
  size = 'md',
}) => {
  const thresholds = api.getThresholds();
  const safeScore = typeof score === 'number' && !Number.isNaN(score) ? score : 0;

  let level: 'High' | 'Medium' | 'Low';
  let badgeClasses = '';

  if (safeScore >= thresholds.high) {
    level = 'High';
    badgeClasses = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  } else if (safeScore >= thresholds.medium) {
    level = 'Medium';
    badgeClasses = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
  } else {
    level = 'Low';
    badgeClasses = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
  }

  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-1.5 py-0.5'
      : size === 'lg'
      ? 'text-xs px-3 py-1 font-semibold'
      : 'text-[11px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono rounded-md border ${badgeClasses} ${sizeClasses}`}
      title={`Configured threshold: High >= ${thresholds.high}%, Medium >= ${thresholds.medium}%`}
    >
      <span className="font-sans font-medium">{labelPrefix}{level} confidence</span>
      {showPercentage && <span className="opacity-80">({safeScore.toFixed(1)}%)</span>}
    </span>
  );
};
