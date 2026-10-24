import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'danger-ghost' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const variants = {
    primary:
      'bg-ink text-white hover:bg-stone-800 focus-visible:ring-teal-500 shadow-xs',
    secondary:
      'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50 focus-visible:ring-teal-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-xs',
    'danger-ghost':
      'text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-400',
    ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-stone-400',
    outline:
      'border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 focus-visible:ring-teal-500',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-md',
    md: 'text-sm px-4 py-2 gap-2 rounded-md',
    lg: 'text-[15px] px-5 py-2.5 gap-2 rounded-md',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};
