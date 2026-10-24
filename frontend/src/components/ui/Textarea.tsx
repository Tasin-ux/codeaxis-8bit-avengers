import React from 'react';
import { cn } from '../../lib/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, id, rows = 4, ...props }, ref) => {
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
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            'block w-full rounded-md border bg-white text-sm text-stone-900 placeholder:text-stone-400 p-3 transition-[border-color,box-shadow]',
            'focus:outline-none focus:ring-4',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
              : 'border-stone-300 focus:border-teal-600 focus:ring-teal-500/15',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-stone-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
