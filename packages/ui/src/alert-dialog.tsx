import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { Button } from './button';
import { Input } from './input';

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  tone?: 'danger' | 'warning' | 'info';
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  promptPlaceholder?: string;
  onConfirm: (promptValue?: string) => void;
  onCancel?: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  tone = 'danger',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  promptPlaceholder,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [promptVal, setPromptVal] = React.useState('');

  React.useEffect(() => {
    if (open) setPromptVal('');
  }, [open]);

  const confirmVariant = {
    danger: 'danger',
    warning: 'primary',
    info: 'primary',
  }[tone] as 'danger' | 'primary';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPortal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in-0" />
        <AlertDialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl rounded-2xl animate-in fade-in-0 zoom-in-95">
          <div className="flex flex-col space-y-2 text-left">
            <AlertDialogPrimitive.Title className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </AlertDialogPrimitive.Description>
          </div>

          {promptPlaceholder !== undefined && (
            <div className="mt-2">
              <Input
                autoFocus
                placeholder={promptPlaceholder}
                value={promptVal}
                onChange={(e) => setPromptVal(e.target.value)}
                size="md"
              />
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => {
                onOpenChange(false);
                onCancel?.();
              }}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={confirmVariant}
              size="sm"
              loading={loading}
              onClick={() => onConfirm(promptVal)}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPortal>
    </AlertDialog>
  );
}
