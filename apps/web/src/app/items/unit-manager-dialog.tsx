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
  Badge,
} from '@platform/ui';
import { Scale, Plus, Trash2, CheckCircle2, AlertCircle, BookOpen, Edit3, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { GST_STATUTORY_UOM_LIST } from '@platform/shared-types';

interface UnitManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnitsUpdated?: () => void;
  onUnitCreated?: (unitCode: string) => void;
}

export function UnitManagerDialog({
  open,
  onOpenChange,
  onUnitsUpdated,
  onUnitCreated,
}: UnitManagerDialogProps) {
  const { activeCompanyId } = useCompany();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [customUnits, setCustomUnits] = useState<Array<{ code: string; name: string; description?: string }>>([]);

  // Form State (Create or Edit)
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    if (open) {
      loadUnits();
      resetForm();
    }
  }, [open, activeCompanyId]);

  const resetForm = () => {
    setError(null);
    setSuccessMsg(null);
    setEditingCode(null);
    setNewCode('');
    setNewName('');
    setNewDesc('');
  };

  const loadUnits = async () => {
    setFetching(true);
    try {
      const data = await apiClient.listUnits(activeCompanyId);
      setCustomUnits(data?.custom || []);
    } catch (err: unknown) {
      console.error('Failed to load units:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleStartEdit = (u: { code: string; name: string; description?: string }) => {
    setError(null);
    setSuccessMsg(null);
    setEditingCode(u.code);
    setNewCode(u.code);
    setNewName(u.name);
    setNewDesc(u.description || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (editingCode) {
        // Update existing unit
        await apiClient.updateCustomUnit(activeCompanyId, editingCode, {
          name: newName.trim(),
          description: newDesc.trim() || undefined,
        });

        setSuccessMsg(`Custom unit '${editingCode}' updated successfully!`);
        resetForm();
      } else {
        // Create new unit
        const createdCode = newCode.trim().toUpperCase();
        await apiClient.createCustomUnit(activeCompanyId, {
          code: createdCode,
          name: newName.trim(),
          description: newDesc.trim() || undefined,
        });

        setSuccessMsg(`Custom unit '${createdCode}' created successfully!`);
        resetForm();
        if (onUnitCreated) onUnitCreated(createdCode);
      }

      await loadUnits();
      if (onUnitsUpdated) onUnitsUpdated();
    } catch (err: unknown) {
      let msg = editingCode ? 'Failed to update unit' : 'Failed to create unit';
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

  const handleDelete = async (code: string) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.deleteCustomUnit(activeCompanyId, code);
      setSuccessMsg(`Unit '${code}' removed.`);
      if (editingCode === code) resetForm();
      await loadUnits();
      if (onUnitsUpdated) onUnitsUpdated();
    } catch (err: unknown) {
      let msg = 'Failed to delete unit';
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'object' && err !== null) {
        msg = (err as any).message || (err as any).error || JSON.stringify(err);
      }
      setError(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-subtle bg-brand/60 flex items-center justify-center text-brand-text text-brand">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Units of Measurement (UOM Master)</DialogTitle>
              <DialogDescription>
                Define and manage reusable custom measurement units for your products, goods, and consulting services.
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

        {successMsg && (
          <div className="p-3 rounded-xl bg-status-success-subtle bg-status-success border border-status-success border-status-success text-xs text-status-success-text text-status-success-text flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Create / Edit Unit Form */}
        <div className="rounded-xl border border border-strong p-4 bg-canvas bg-surface space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary text-primary-inverse flex items-center gap-1.5">
              {editingCode ? (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-brand-text" />
                  Edit Custom Unit: <span className="font-mono text-brand-text">{editingCode}</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-brand-text" />
                  Create New Custom Unit
                </>
              )}
            </span>

            {editingCode && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-muted hover:text-secondary flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Unit Code (UOM / UQC)" required id="unit-code">
                <Input
                  id="unit-code"
                  required
                  maxLength={12}
                  disabled={!!editingCode}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TRIP, BATCH, BUNDLE"
                  className={`font-mono uppercase text-xs ${
                    editingCode ? 'bg-surface-sunken bg-surface-raised cursor-not-allowed opacity-80' : ''
                  }`}
                />
              </FormField>

              <FormField label="Unit Full Name" required id="unit-name">
                <Input
                  id="unit-name"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Transport Trip / Freight Run"
                  className="text-xs"
                />
              </FormField>
            </div>

            <FormField label="Specification / Notes (Optional)" id="unit-desc">
              <Input
                id="unit-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Commercial logistics delivery per trip"
                className="text-xs"
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-1">
              {editingCode && (
                <Button variant="outline" size="sm" type="button" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                type="submit"
                loading={loading}
                leftIcon={editingCode ? <Edit3 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              >
                {editingCode ? 'Save Unit Changes' : 'Create & Save Unit'}
              </Button>
            </div>
          </form>
        </div>

        {/* Saved Custom Units */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary text-muted">
              Saved Company Units ({customUnits.length})
            </span>
            <span className="text-[11px] text-muted">Available across all item creation forms</span>
          </div>

          {customUnits.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border border-strong text-center text-xs text-muted">
              No custom units registered yet. Create your first unit above, or use statutory standard GST units below.
            </div>
          ) : (
            <div className="divide-y divide-subtle divide-strong border border border-strong rounded-xl overflow-hidden bg-white bg-surface">
              {customUnits.map((u) => (
                <div key={u.code} className="p-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-brand-subtle bg-brand text-brand-text text-brand">
                        {u.code}
                      </span>
                      <span className="font-semibold text-primary dark:text-white">{u.name}</span>
                    </div>
                    {u.description && <p className="text-[11px] text-muted mt-0.5">{u.description}</p>}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted hover:text-status-success-text hover:bg-status-success-subtle hover:bg-status-success"
                      title={`Edit unit ${u.code}`}
                      onClick={() => handleStartEdit(u)}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted hover:text-status-danger-text hover:bg-status-danger-subtle hover:bg-status-danger"
                      title={`Delete unit ${u.code}`}
                      onClick={() => handleDelete(u.code)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Standard GST Reference Units */}
        <div className="space-y-2 pt-2 border-t border-subtle border-strong">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-muted" />
            Statutory GST Standard Units Reference ({GST_STATUTORY_UOM_LIST.length} units pre-loaded)
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-canvas bg-surface rounded-xl border border border-strong text-[11px]">
            {GST_STATUTORY_UOM_LIST.map((su) => (
              <div key={su.code} className="flex items-center gap-1.5 truncate">
                <span className="font-mono font-semibold text-secondary text-muted">
                  {su.code}
                </span>
                <span className="text-muted truncate">— {su.name.split(' (')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

