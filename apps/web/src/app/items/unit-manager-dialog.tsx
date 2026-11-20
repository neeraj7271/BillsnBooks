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
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
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
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Create / Edit Unit Form */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              {editingCode ? (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                  Edit Custom Unit: <span className="font-mono text-blue-600">{editingCode}</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  Create New Custom Unit
                </>
              )}
            </span>

            {editingCode && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
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
                    editingCode ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-80' : ''
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Saved Company Units ({customUnits.length})
            </span>
            <span className="text-[11px] text-slate-400">Available across all item creation forms</span>
          </div>

          {customUnits.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
              No custom units registered yet. Create your first unit above, or use statutory standard GST units below.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              {customUnits.map((u) => (
                <div key={u.code} className="p-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {u.code}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">{u.name}</span>
                    </div>
                    {u.description && <p className="text-[11px] text-slate-400 mt-0.5">{u.description}</p>}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      title={`Edit unit ${u.code}`}
                      onClick={() => handleStartEdit(u)}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
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
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            Statutory GST Standard Units Reference ({GST_STATUTORY_UOM_LIST.length} units pre-loaded)
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
            {GST_STATUTORY_UOM_LIST.map((su) => (
              <div key={su.code} className="flex items-center gap-1.5 truncate">
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                  {su.code}
                </span>
                <span className="text-slate-400 truncate">— {su.name.split(' (')[0]}</span>
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

