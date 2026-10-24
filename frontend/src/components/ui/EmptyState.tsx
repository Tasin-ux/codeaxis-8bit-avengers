import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="text-center py-14 px-6">
      {icon && (
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-500 ring-1 ring-stone-200 ring-inset [&_svg]:w-5 [&_svg]:h-5">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      <p className="mt-1.5 text-[13px] text-stone-500 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button onClick={onAction} size="sm">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
