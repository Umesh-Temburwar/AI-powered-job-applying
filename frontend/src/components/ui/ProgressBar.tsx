import React from 'react';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  statusLabel?: string;
  showPercentage?: boolean;
  color?: 'cyan' | 'emerald' | 'amber' | 'red';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  statusLabel,
  showPercentage = true,
  color = 'cyan',
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  const colorStyles = {
    cyan: 'bg-[var(--accent)]',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage || statusLabel) && (
        <div className="flex items-center justify-between text-xs font-medium mb-1.5 text-theme-secondary">
          <span>{label || statusLabel}</span>
          {showPercentage && <span className="font-semibold text-theme-primary">{clamped}%</span>}
        </div>
      )}
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-theme">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${colorStyles[color]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
