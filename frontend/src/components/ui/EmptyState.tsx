import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-theme rounded-2xl bg-theme-card/30 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-theme-card flex items-center justify-center text-theme-secondary mb-4">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-theme-primary">{title}</h4>
      <p className="text-sm text-theme-secondary max-w-sm mt-1.5 mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
