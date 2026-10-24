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
      className={`bg-white border border-[#E5E5E5] rounded-[6px] p-4 sm:p-6 transition-colors duration-150 ${
        hoverable ? 'hover:border-[#CCCCCC]' : ''
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
  <div className={`flex items-start justify-between gap-4 mb-4 pb-3 border-b border-[#E5E5E5] ${className}`}>
    <div>
      <h3 className="text-base font-semibold text-[#111111] leading-tight">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-[#6B6B6B] mt-1">{subtitle}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
