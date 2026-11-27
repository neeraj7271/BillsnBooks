'use client';

import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { Button } from './button';

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

type ConfirmResolver = (value: boolean) => void;

interface ActiveConfirm extends ConfirmDialogOptions {
  id: string;
  resolve: ConfirmResolver;
}

let activeConfirmState: ActiveConfirm | null = null;
const confirmListeners = new Set<(active: ActiveConfirm | null) => void>();

function notifyConfirm() {
  confirmListeners.forEach((l) => l(activeConfirmState));
}

/**
 * Imperative confirm dialog returning a Promise that resolves to true (confirmed) or false (cancelled).
 * Theme-aware and keyboard-friendly (Esc = cancel, Enter = confirm).
 */
export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    activeConfirmState = {
      ...options,
      id: `confirm-${Date.now()}`,
      resolve: (result: boolean) => {
        activeConfirmState = null;
        notifyConfirm();
        resolve(result);
      },
    };
    notifyConfirm();
  });
}

/**
 * Global container mounted inside `<Toaster />` to display imperative `confirmDialog()` calls.
 */
export function ConfirmDialogContainer() {
  const [active, setActive] = React.useState<ActiveConfirm | null>(null);

  React.useEffect(() => {
    confirmListeners.add(setActive);
    setActive(activeConfirmState);
    return () => {
      confirmListeners.delete(setActive);
    };
  }, []);

  if (!active) return null;

  const isDanger = active.variant === 'danger';

  return (
    <AlertDialogPrimitive.Root
      open={true}
      onOpenChange={(open) => {
        if (!open) active.resolve(false);
      }}
    >
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-surface-overlay backdrop-blur-xs transition-opacity animate-in fade-in-0" />
        <AlertDialogPrimitive.Content
          data-testid="themed-confirm-dialog"
          className="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-[420px] translate-x-[-50%] translate-y-[-50%] gap-4 border border-subtle bg-surface-raised p-6 shadow-popover rounded-xl animate-in fade-in-0 zoom-in-95 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              active.resolve(false);
            }
          }}
        >
          <div className="flex flex-col space-y-2 text-left">
            <AlertDialogPrimitive.Title className="text-base font-semibold text-primary">
              {active.title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-xs text-muted leading-relaxed">
              {active.description}
            </AlertDialogPrimitive.Description>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => active.resolve(false)}
            >
              {active.cancelLabel || 'Cancel'}
            </Button>
            <Button
              type="button"
              variant={isDanger ? 'danger' : 'primary'}
              size="sm"
              autoFocus
              onClick={() => active.resolve(true)}
            >
              {active.confirmLabel || (isDanger ? 'Delete' : 'Confirm')}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

/**
 * Declarative ConfirmDialog component for backwards compatibility.
 */
export interface DeclarativeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  tone?: 'danger' | 'warning' | 'info';
  variant?: 'default' | 'danger';
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
  tone,
  variant,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  promptPlaceholder,
  onConfirm,
  onCancel,
}: DeclarativeConfirmDialogProps) {
  const [promptVal, setPromptVal] = React.useState('');

  React.useEffect(() => {
    if (open) setPromptVal('');
  }, [open]);

  const isDanger = variant === 'danger' || tone === 'danger';

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-surface-overlay backdrop-blur-xs transition-opacity animate-in fade-in-0" />
        <AlertDialogPrimitive.Content
          data-testid="declarative-confirm-dialog"
          className="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-[420px] translate-x-[-50%] translate-y-[-50%] gap-4 border border-subtle bg-surface-raised p-6 shadow-popover rounded-xl animate-in fade-in-0 zoom-in-95 focus:outline-none"
        >
          <div className="flex flex-col space-y-2 text-left">
            <AlertDialogPrimitive.Title className="text-base font-semibold text-primary">
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-xs text-muted leading-relaxed">
              {description}
            </AlertDialogPrimitive.Description>
          </div>

          {promptPlaceholder !== undefined && (
            <div className="mt-2">
              <input
                autoFocus
                placeholder={promptPlaceholder}
                value={promptVal}
                onChange={(e) => setPromptVal(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-default bg-surface text-primary text-xs placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-border-focus"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
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
              type="button"
              variant={isDanger ? 'danger' : 'primary'}
              size="sm"
              loading={loading}
              onClick={() => {
                onConfirm(promptVal);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
