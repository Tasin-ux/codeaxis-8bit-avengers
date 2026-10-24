import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`relative w-full ${maxWidthStyles[maxWidth]} rounded-xl bg-white text-left shadow-2xl ring-1 ring-stone-900/5 transition-all z-10`}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <h3 className="text-[15px] font-semibold text-stone-900">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-md p-1 -m-1 transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
};
