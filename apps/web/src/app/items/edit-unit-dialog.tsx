import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormField,
  Input,
  Button,
} from '@platform/ui';
import { Edit3, AlertCircle } from 'lucide-react';
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

interface EditUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: UomRow | null;
  onSuccess: () => void;
}

export function EditUnitDialog({
  open,
  onOpenChange,
  unit,
  onSuccess,
}: EditUnitDialogProps) {
  const { activeCompanyId } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open && unit) {
      setName(unit.name || '');
      setDescription(unit.description || '');
      setError(null);
    }
  }, [open, unit]);

  if (!unit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Unit Name / Description is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.updateCustomUnit(activeCompanyId, unit.code, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      let msg = 'Failed to update custom unit';
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
            <div className="h-9 w-9 rounded-xl bg-brand-subtle bg-brand/60 border border-focus border-focus flex items-center justify-center text-brand-text text-brand">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Edit Custom Unit</DialogTitle>
              <DialogDescription className="text-xs">
                Update display name and specifications for unit{' '}
                <span className="font-mono font-bold text-primary dark:text-white">
                  {unit.code}
                </span>
                .
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-secondary text-muted block mb-1">
              Unit Code (UOM / UQC)
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs px-3 py-1.5 rounded-lg bg-surface-sunken bg-surface-raised text-secondary text-muted border border border-strong">
                {unit.code}
              </span>
              <span className="text-[11px] text-muted">
                (Unique identifier; code is immutable to preserve reference integrity)
              </span>
            </div>
          </div>

          <FormField label="Unit Full Name / Title" required id="edit-unit-name">
            <Input
              id="edit-unit-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Transport Freight Trip"
              className="text-xs"
            />
          </FormField>

          <FormField label="Specification / Notes (Optional)" id="edit-unit-desc">
            <Input
              id="edit-unit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Per single haul delivery"
              className="text-xs"
            />
          </FormField>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={loading}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

