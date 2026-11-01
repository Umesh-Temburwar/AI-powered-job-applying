import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, id, className = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined);

    return (
      <div className="w-full font-mono">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-[var(--text-primary)] uppercase mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-9 bg-[var(--bg-input)] text-[var(--text-primary)] border-2 rounded-none px-3 text-sm transition-colors duration-150 placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-color-focus)] disabled:opacity-60 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} ${
              error ? 'border-[var(--color-danger)]' : 'border-[var(--border-color)]'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center text-[var(--text-secondary)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
