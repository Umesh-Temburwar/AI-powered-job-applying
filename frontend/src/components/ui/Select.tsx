import React, { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, id, className = '', ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full font-mono">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold text-[var(--text-primary)] uppercase mb-1.5"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`h-9 w-full bg-[var(--bg-input)] text-[var(--text-primary)] border-2 rounded-none px-3 text-[13px] transition-colors duration-150 focus:outline-none focus:border-[var(--border-color-focus)] disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-[var(--color-danger)]' : 'border-[var(--border-color)]'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-[var(--bg-card)] text-[var(--text-primary)]"
            >
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
