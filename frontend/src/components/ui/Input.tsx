import React from 'react';
import { cn } from '../../lib/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-medium text-stone-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'block w-full rounded-md border bg-white text-sm text-stone-900 placeholder:text-stone-400 transition-[border-color,box-shadow] py-2',
              'focus:outline-none focus:ring-4',
              icon ? 'pl-10' : 'pl-3',
              'pr-3',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                : 'border-stone-300 focus:border-teal-600 focus:ring-teal-500/15',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-stone-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
