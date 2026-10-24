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
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-11 px-5 text-sm gap-2.5 font-semibold shadow-xs',
  };

  const variantStyles = {
    primary:
      'bg-emerald-600 hover:bg-emerald-700 text-white font-medium border border-emerald-500/40 shadow-xs hover:shadow-emerald-500/20 hover:shadow-sm',
    secondary:
      'bg-white dark:bg-slate-800 text-[#111111] dark:text-slate-100 border border-[#E5E5E5] dark:border-slate-700 hover:bg-[#F9FAFB] dark:hover:bg-slate-750 shadow-xs',
    outline:
      'bg-transparent border border-[#E5E5E5] dark:border-slate-700 text-[#111111] dark:text-slate-200 hover:bg-[#F9FAFB] dark:hover:bg-slate-800',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-xs',
    ghost:
      'bg-transparent text-[#6B6B6B] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5',
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
