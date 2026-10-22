import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-[6px] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-10 px-5 text-sm gap-2',
  };

  const variantStyles = {
    primary:
      'bg-[#166534] hover:bg-[#14532D] text-white font-medium border border-[#166534]',
    secondary:
      'bg-white text-[#111111] border border-[#E5E5E5] hover:bg-[#FAFAFA]',
    outline:
      'bg-transparent border border-[#E5E5E5] text-[#111111] hover:bg-[#FAFAFA]',
    danger:
      'bg-[#B91C1C] hover:bg-[#991B1B] text-white border border-[#B91C1C]',
    ghost:
      'bg-transparent text-[#6B6B6B] hover:text-[#111111] hover:bg-[#FAFAFA]',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-current shrink-0 mr-1.5" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && (
        <span className="inline-flex shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};
