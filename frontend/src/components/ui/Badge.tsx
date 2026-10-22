import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'cyan';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variantStyles = {
    default: 'bg-theme-card text-theme-secondary border border-theme',
    success: 'bg-theme-success-muted text-theme-success border border-emerald-500/30',
    warning: 'bg-theme-warning-muted text-theme-warning border border-amber-500/30',
    danger: 'bg-theme-danger-muted text-theme-danger border border-red-500/30',
    info: 'bg-theme-info-muted text-theme-info border border-sky-500/30',
    cyan: 'bg-theme-accent-muted text-theme-accent border border-[var(--accent)]/40',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
