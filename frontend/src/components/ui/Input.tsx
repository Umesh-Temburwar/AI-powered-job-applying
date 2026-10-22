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
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-[#111111] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[#6B6B6B]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-9 bg-white text-[#111111] border rounded-[6px] px-3 text-sm transition-colors duration-150 placeholder:text-[#888888] focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-transparent disabled:bg-[#FAFAFA] disabled:opacity-60 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} ${
              error ? 'border-[#B91C1C] focus:ring-[#B91C1C]' : 'border-[#E5E5E5]'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center text-[#6B6B6B]">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-[#B91C1C]">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-[#6B6B6B]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
