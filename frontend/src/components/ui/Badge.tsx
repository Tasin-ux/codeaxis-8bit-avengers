import React from 'react';
import { cn } from '../../lib/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gray' | 'red' | 'orange' | 'amber' | 'emerald' | 'blue' | 'teal' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  size = 'md',
  className,
}) => {
  const variants = {
    gray: 'bg-stone-100 text-stone-600 ring-stone-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    teal: 'bg-teal-50 text-teal-700 ring-teal-200',
    purple: 'bg-purple-50 text-purple-700 ring-purple-200',
  };

  const sizes = {
    sm: 'text-[11px] px-1.5 py-px',
    md: 'text-[11px] px-2 py-0.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-md ring-1 ring-inset whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};
