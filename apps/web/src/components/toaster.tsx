'use client';

import * as React from 'react';
import { Toaster as UIToaster, toast, confirmDialog } from '@platform/ui';

export function Toaster() {
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__toast = toast;
      (window as any).__confirmDialog = confirmDialog;
    }
  }, []);

  return <UIToaster />;
}
