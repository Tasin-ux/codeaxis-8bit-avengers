import React from 'react';
import { cn } from '../../lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  bodyClassName,
  title,
  subtitle,
  action,
  footer,
}) => {
  // Callers historically passed `className="... p-0"` to strip body padding;
  // honor it so tables don't get double padding.
  const flush = /\bp-0\b/.test(className || '');

  return (
    <div
      className={cn(
        'bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden',
        className
      )}
    >
      {(title || subtitle || action) && (
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-stone-900">{title}</h3>}
            {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('p-5', flush && 'p-0', bodyClassName)}>{children}</div>
      {footer && (
        <div className="px-5 py-3 bg-stone-50 border-t border-stone-100">{footer}</div>
      )}
    </div>
  );
};
