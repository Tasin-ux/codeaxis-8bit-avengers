import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

interface ConfirmDialogProps extends ConfirmOptions {
  isOpen: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidth="sm">
    <div className="flex gap-3.5">
      <div
        className={
          variant === 'danger'
            ? 'shrink-0 w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center ring-1 ring-red-100 ring-inset'
            : 'shrink-0 w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center ring-1 ring-teal-100 ring-inset'
        }
      >
        <AlertTriangle className="w-4.5 h-4.5" />
      </div>
      <p className="text-sm text-stone-600 leading-relaxed pt-1.5">{message}</p>
    </div>
    <div className="flex justify-end gap-2 mt-6">
      <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button
        variant={variant === 'danger' ? 'danger' : 'primary'}
        size="sm"
        onClick={onConfirm}
        loading={loading}
      >
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);

/**
 * Replaces native `confirm()` with an in-app dialog.
 *
 *   const { ask, dialog } = useConfirm();
 *   ...
 *   if (!(await ask({ title: 'Delete?', message: '...' }))) return;
 *   ...
 *   return <>{dialog}</>;
 */
export function useConfirm() {
  const [state, setState] = React.useState<
    (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  >(null);
  const [loading, setLoading] = React.useState(false);

  const ask = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ ...options, resolve });
      }),
    []
  );

  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
    setLoading(false);
  };

  const dialog = state ? (
    <ConfirmDialog
      {...state}
      isOpen
      loading={loading}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null;

  return { ask, dialog, setLoading };
}
