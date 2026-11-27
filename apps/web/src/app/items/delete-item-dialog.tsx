'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@platform/ui';
import { AlertCircle } from 'lucide-react';

interface DeleteItemDialogProps {
  item: { id: string; name: string; itemCode: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteLoading: boolean;
  deleteError: string | null;
  onConfirm: () => void;
}

export function DeleteItemDialog({
  item,
  open,
  onOpenChange,
  deleteLoading,
  deleteError,
  onConfirm,
}: DeleteItemDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Remove Catalog Item</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove &apos;{item.name}&apos; ({item.itemCode})?
          </DialogDescription>
        </DialogHeader>

        {deleteError ? (
          <div className="p-3.5 rounded-xl bg-status-danger-subtle text-xs text-status-danger-text space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-status-danger-text" />
              Accounting Protection Alert
            </div>
            <p>{deleteError}</p>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-surface-sunken text-xs text-secondary">
            <span className="font-semibold text-primary block mb-1">
              Double-Entry Accounting & Statutory Safeguard:
            </span>
            If this item has been used on issued invoices, deletion is safely blocked to protect billing registers. If unused, it will be deactivated and removed from active catalogs.
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            type="button"
            loading={deleteLoading}
            onClick={onConfirm}
          >
            Confirm Removal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
