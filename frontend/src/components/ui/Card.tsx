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
      className={`bg-white dark:bg-slate-900/60 border border-[#E5E5E5] dark:border-slate-800/80 rounded-xl p-4 sm:p-6 transition-all duration-200 shadow-xs ${
        hoverable ? 'hover:border-emerald-500/40 dark:hover:border-emerald-500/50 hover:shadow-md hover:-translate-y-0.5' : ''
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
  <div className={`flex items-start justify-between gap-4 mb-4 pb-3 border-b border-[#E5E5E5] dark:border-slate-800/80 ${className}`}>
    <div>
      <h3 className="text-base font-semibold text-[#111111] dark:text-slate-100 leading-tight">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-[#6B6B6B] dark:text-slate-400 mt-1">{subtitle}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
