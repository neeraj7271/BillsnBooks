'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from './utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  shortcut?: string;
  className?: string;
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={400}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 400,
  shortcut,
  className,
}: TooltipProps) {
  if (!content) return <>{children}</>;

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={4}
            className={cn(
              'z-50 overflow-hidden rounded-lg px-2.5 py-1 text-xs font-medium max-w-[240px] text-center shadow-md animate-in fade-in-0 zoom-in-95',
              'bg-primary text-inverse border border-default/40',
              className
            )}
          >
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span>{content}</span>
              {shortcut && (
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-sunken/30 text-inverse/90 border border-default/30">
                  {shortcut}
                </kbd>
              )}
            </div>
            <TooltipPrimitive.Arrow className="fill-primary" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
