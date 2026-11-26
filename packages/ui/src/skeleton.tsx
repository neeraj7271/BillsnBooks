import * as React from 'react';
import { cn } from './utils.js';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-surface-sunken bg-surface-raised', className)}
      {...props}
    />
  );
}

