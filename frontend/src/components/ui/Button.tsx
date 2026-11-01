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
    'inline-flex items-center justify-center font-mono font-bold rounded-none transition-all duration-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm select-none';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-10 px-5 text-sm gap-2',
  };

  const variantStyles = {
    primary:
      'bg-[var(--accent)] text-[var(--accent-fg)] border-2 border-[var(--border-color)] retro-shadow-sm hover:opacity-95 active:translate-x-[1px] active:translate-y-[1px]',
    secondary:
      'bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] retro-shadow-sm hover:bg-[var(--bg-card-hover)] active:translate-x-[1px] active:translate-y-[1px]',
    outline:
      'bg-transparent border-2 border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] active:translate-x-[1px] active:translate-y-[1px]',
    danger:
      'bg-[var(--color-danger)] text-white border-2 border-[var(--border-color)] retro-shadow-sm hover:opacity-90 active:translate-x-[1px] active:translate-y-[1px]',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]',
  };

  return (
    <button
      disabled={disabled || isLoading}
      data-sound={variant === 'primary' ? 'success' : 'button'}
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
