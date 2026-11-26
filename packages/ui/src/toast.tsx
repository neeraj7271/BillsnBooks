'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from './utils';
import { ConfirmDialogContainer } from './confirm-dialog';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toastsState: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach((listener) => listener([...toastsState]));
}

export function removeToast(id: string) {
  toastsState = toastsState.filter((t) => t.id !== id);
  notify();
}

function addToast(type: ToastType, message: string, duration: number) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const item: ToastItem = { id, type, message, duration };
  // Max 3 stacked; older toasts collapse
  toastsState = [item, ...toastsState].slice(0, 3);
  notify();
  return id;
}

export const toast = {
  success: (msg: string) => addToast('success', msg, 3000),
  error: (msg: string) => addToast('error', msg, 5000),
  warning: (msg: string) => addToast('warning', msg, 4000),
  info: (msg: string) => addToast('info', msg, 4000),
};

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    listeners.add(setToasts);
    setToasts([...toastsState]);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-status-success shrink-0 mt-0.5" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-status-danger shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-status-warning shrink-0 mt-0.5" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />;
    }
  };

  return (
    <>
      <ToastPrimitive.Provider swipeDirection="right">
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.duration}
            onOpenChange={(open) => {
              if (!open) removeToast(t.id);
            }}
            data-testid={`toast-${t.type}`}
            className={cn(
              'group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-xl border p-3.5 shadow-md transition-all',
              'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full',
              t.type === 'success' && 'border-status-success/30 bg-surface text-primary shadow-xs',
              t.type === 'error' && 'border-status-danger/30 bg-surface text-primary shadow-xs',
              t.type === 'warning' && 'border-status-warning/30 bg-surface text-primary shadow-xs',
              t.type === 'info' && 'border-default bg-surface text-primary shadow-xs'
            )}
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              {getIcon(t.type)}
              <div className="text-xs font-medium text-primary leading-snug break-words">
                {t.message}
              </div>
            </div>
            <ToastPrimitive.Close
              aria-label="Close notification"
              className="rounded-md p-0.5 text-muted hover:text-primary transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed top-4 right-4 z-50 flex max-h-screen w-full flex-col gap-2 p-4 pointer-events-none sm:max-w-[380px]" />
      </ToastPrimitive.Provider>
      <ConfirmDialogContainer />
    </>
  );
}
