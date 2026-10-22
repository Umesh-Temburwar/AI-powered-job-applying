import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'cyan' | 'accent';
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
    sm: 'text-[12px] gap-1.5',
    md: 'text-[13px] gap-1.5',
  };

  const dotStyles = {
    default: 'bg-[#6B6B6B]',
    success: 'bg-[#166534]',
    warning: 'bg-[#B45309]',
    danger: 'bg-[#B91C1C]',
    info: 'bg-[#166534]',
    cyan: 'bg-[#166534]',
    accent: 'bg-[#166534]',
  };

  const textStyles = {
    default: 'text-[#6B6B6B]',
    success: 'text-[#166534]',
    warning: 'text-[#B45309]',
    danger: 'text-[#B91C1C]',
    info: 'text-[#166534]',
    cyan: 'text-[#166534]',
    accent: 'text-[#166534]',
  };

  return (
    <span
      className={`inline-flex items-center font-medium ${sizeStyles[size]} ${textStyles[variant]} ${className}`}
      {...props}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]} shrink-0`} />
      {children}
    </span>
  );
};
