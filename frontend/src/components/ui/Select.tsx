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
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-[13px] font-medium text-[#111111] mb-1.5"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`h-9 w-full bg-[#FFFFFF] text-[#111111] border rounded-[6px] px-3 text-[14px] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-[#B91C1C]' : 'border-[#E5E5E5]'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-[#111111]">
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="mt-1 text-[13px] text-[#B91C1C]">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-[13px] text-[#6B6B6B]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
