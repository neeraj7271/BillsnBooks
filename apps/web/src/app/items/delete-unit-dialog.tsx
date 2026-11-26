import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@platform/ui';
import { Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

interface UomRow {
  code: string;
  name: string;
  category: string;
  isCustom: boolean;
  description?: string;
  usageCount: number;
}

interface Item {
  id: string;
  itemCode: string;
  name: string;
  uom: string;
}

interface DeleteUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: UomRow | null;
  assignedItems?: Item[];
  onSuccess: () => void;
}

export function DeleteUnitDialog({
  open,
  onOpenChange,
  unit,
  assignedItems = [],
  onSuccess,
}: DeleteUnitDialogProps) {
  const { activeCompanyId } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!unit) return null;

  const hasUsage = unit.usageCount > 0 || assignedItems.length > 0;

  const handleConfirmDelete = async () => {
    if (hasUsage) return;
    setLoading(true);
    setError(null);

    try {
      await apiClient.deleteCustomUnit(activeCompanyId, unit.code);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      let msg = 'Failed to delete custom unit';
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'object' && err !== null) {
        msg = (err as any).message || (err as any).error || JSON.stringify(err);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                hasUsage
                  ? 'bg-status-warning-subtle bg-status-warning text-status-warning-text text-status-warning-text border border-status-warning border-status-warning'
                  : 'bg-status-danger-subtle bg-status-danger text-status-danger-text text-status-danger-text border border-status-danger border-status-danger'
              }`}
            >
              {hasUsage ? <AlertTriangle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
            </div>
            <div>
              <DialogTitle>
                {hasUsage ? `Cannot Delete Unit "${unit.code}"` : `Delete Custom Unit "${unit.code}"?`}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {unit.name} ({unit.category})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-status-danger-subtle bg-status-danger border border-status-danger border-status-danger text-xs text-status-danger-text text-status-danger-text flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="py-2 text-xs space-y-3">
          {hasUsage ? (
            <div className="p-3 rounded-xl bg-status-warning-subtle bg-status-warning border border-status-warning border-status-warning text-status-warning-text text-status-warning-text space-y-2">
              <p className="font-medium">
                This unit is currently assigned to{' '}
                <strong>
                  {unit.usageCount} active catalog item{unit.usageCount === 1 ? '' : 's'}
                </strong>
                .
              </p>
              <p className="text-[11px] text-status-warning-text text-status-warning-text leading-relaxed">
                To protect data integrity across your accounting catalog, please edit the item(s) below and assign them to a different unit before deleting this unit.
              </p>
              {assignedItems.length > 0 && (
                <div className="mt-2 max-h-28 overflow-y-auto rounded-lg bg-white/70 bg-surface p-2 border border-status-warning border-status-warning divide-y divide-status-warning divide-strong text-[11px]">
                  {assignedItems.map((it) => (
                    <div key={it.id} className="py-1 flex items-center justify-between">
                      <span className="font-mono font-bold text-primary text-primary-inverse">
                        {it.itemCode}
                      </span>
                      <span className="text-secondary text-muted truncate max-w-[180px]">
                        {it.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-secondary text-muted leading-relaxed">
              Are you sure you want to delete custom unit{' '}
              <strong className="text-primary font-mono">{unit.code}</strong> (
              {unit.name})? This unit will be removed from your company&apos;s active measurement units.
            </p>
          )}
        </div>

        <DialogFooter>
          {hasUsage ? (
            <Button variant="primary" size="sm" onClick={() => onOpenChange(false)}>
              Understood
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                type="button"
                loading={loading}
                onClick={handleConfirmDelete}
              >
                Delete Unit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

