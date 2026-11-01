import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-[var(--bg-card)] border-2 border-[var(--border-color)] text-[var(--text-primary)] retro-shadow-sm p-4 sm:p-6 transition-all duration-150 ${
        hoverable ? 'hover:translate-x-[-1px] hover:translate-y-[-1px] hover:retro-shadow' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => (
  <div className={`flex items-start justify-between gap-4 mb-4 pb-3 border-b-2 border-[var(--border-color)] ${className}`}>
    <div>
      <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight font-mono uppercase">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">{subtitle}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
