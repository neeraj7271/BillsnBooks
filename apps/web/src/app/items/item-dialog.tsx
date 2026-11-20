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
  CurrencyInput,
  Select,
  Combobox,
  Button,
} from '@platform/ui';
import { GST_STATUTORY_UOM_LIST, normalizeGstUqc } from '@platform/shared-types';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { Scale } from 'lucide-react';

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  companyId?: string;
  initialData?: any | null;
  onOpenUnitManager?: () => void;
  createdUnit?: string | null;
}

const INITIAL_ITEM_STATE = {
  itemCode: '',
  name: '',
  description: '',
  hsnSacCode: '',
  itemType: 'SERVICES',
  uom: 'NOS',
  unitPrice: 0,
  gstRatePercent: '18',
};

export function ItemDialog({
  open,
  onOpenChange,
  onSuccess,
  companyId,
  initialData,
  onOpenUnitManager,
  createdUnit,
}: ItemDialogProps) {
  const { activeCompanyId } = useCompany();
  const targetCompanyId = companyId || activeCompanyId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState(INITIAL_ITEM_STATE);
  const [customUnits, setCustomUnits] = useState<Array<{ code: string; name: string }>>([]);

  useEffect(() => {
    if (open) {
      loadUnits();
      if (initialData) {
        const rawUom = (initialData.uom || 'NOS').trim().toUpperCase();
        const normalizedUom = normalizeGstUqc(rawUom);

        // Normalize GST rate (e.g. "18.00" -> "18") so Radix Select matches option value exactly
        const parsedGst =
          initialData.gstRatePercent !== undefined && initialData.gstRatePercent !== null
            ? String(Math.round(Number(initialData.gstRatePercent)))
            : '18';

        setFormData({
          itemCode: initialData.itemCode || '',
          name: initialData.name || '',
          description: initialData.description || '',
          hsnSacCode: initialData.hsnSacCode || '',
          itemType: initialData.itemType || 'SERVICES',
          uom: normalizedUom,
          unitPrice: Number(initialData.unitPrice || 0),
          gstRatePercent: parsedGst,
        });
      } else {
        setFormData(INITIAL_ITEM_STATE);
      }
      setError(null);
    }
  }, [open, initialData, activeCompanyId]);

  useEffect(() => {
    if (createdUnit) {
      loadUnits();
      setFormData((prev) => ({ ...prev, uom: createdUnit }));
    }
  }, [createdUnit]);

  const loadUnits = async () => {
    try {
      const data = await apiClient.listUnits(targetCompanyId);
      setCustomUnits(data?.custom || []);
    } catch (err: unknown) {
      console.error('Failed to load custom units in dialog:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      itemCode: formData.itemCode.trim().toUpperCase(),
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      hsnSacCode: formData.hsnSacCode.trim(),
      itemType: formData.itemType,
      uom: formData.uom.trim().toUpperCase() || 'NOS',
      unitPrice: String(formData.unitPrice || 0),
      gstRatePercent: formData.gstRatePercent,
    };

    try {
      if (initialData?.id) {
        await apiClient.updateItem(targetCompanyId, initialData.id, payload);
      } else {
        await apiClient.createItem(targetCompanyId, payload);
      }

      setFormData(INITIAL_ITEM_STATE);
      setError(null);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      let msg = initialData ? 'Failed to update item' : 'Failed to create item';
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'object' && err !== null) {
        msg = (err as any).message || (err as any).error || JSON.stringify(err);
      } else if (typeof err === 'string') {
        msg = err;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Build combined options: Custom Company Units first, then Statutory GST standard units
  // Format with Code FIRST without any stars: e.g. "TRIP (Transport Freight Trip)"
  const customUnitOptions = customUnits.map((u) => ({
    label: `${u.code} (${u.name})`,
    value: u.code,
  }));

  const standardUnitOptions = GST_STATUTORY_UOM_LIST.map((u) => ({
    label: `${u.code} (${u.name})`,
    value: u.code,
  }));

  // If the item has a uom not in either list, include it so select doesn't break
  const allKnownCodes = new Set([
    ...customUnits.map((u) => u.code),
    ...GST_STATUTORY_UOM_LIST.map((u) => u.code),
  ]);

  const fallbackOption =
    formData.uom && !allKnownCodes.has(formData.uom)
      ? [{ label: `${formData.uom} (Custom Unit)`, value: formData.uom }]
      : [];

  const uomOptions = [
    ...fallbackOption,
    ...customUnitOptions,
    ...standardUnitOptions,
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Item / Service' : 'Add New Item / Service'}</DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update catalog item parameters, statutory HSN/SAC, pricing and tax rate.'
              : 'Register goods or professional service master with statutory HSN/SAC and GST slab.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs text-rose-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Item / SKU Code" required id="item-code">
              <Input
                id="item-code"
                required
                value={formData.itemCode}
                onChange={(e) => setFormData({ ...formData, itemCode: e.target.value.toUpperCase() })}
                placeholder="e.g. SRV-CONSULT-01"
                className="font-mono"
              />
            </FormField>

            <FormField label="Item Name" required id="item-name">
              <Input
                id="item-name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Cloud Infrastructure Consulting"
              />
            </FormField>
          </div>

          <FormField label="Description" id="item-desc">
            <Input
              id="item-desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enterprise cloud architecture and DevOps SLA"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type" required>
              <Select
                value={formData.itemType}
                onValueChange={(val) => setFormData({ ...formData, itemType: val })}
                options={[
                  { label: 'Services (SAC)', value: 'SERVICES' },
                  { label: 'Goods / Products (HSN)', value: 'GOODS' },
                ]}
              />
            </FormField>

            <FormField
              label={formData.itemType === 'SERVICES' ? 'SAC Code (Services)' : 'HSN Code (Goods)'}
              required
              id="item-hsn"
            >
              <Input
                id="item-hsn"
                required
                value={formData.hsnSacCode}
                onChange={(e) => setFormData({ ...formData, hsnSacCode: e.target.value })}
                placeholder={formData.itemType === 'SERVICES' ? '998311' : '851762'}
                className="font-mono"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Unit of Measure (UOM) <span className="text-rose-500">*</span>
              </label>
              <Combobox
                value={formData.uom}
                onValueChange={(val) => setFormData({ ...formData, uom: val })}
                options={uomOptions}
                placeholder="Select unit of measure..."
                searchPlaceholder="Search or paste unit (e.g. hours, kgs, trip)..."
                emptyText="No matching units found."
                topAction={
                  onOpenUnitManager
                    ? {
                        label: 'Create New Unit',
                        onSelect: onOpenUnitManager,
                      }
                    : undefined
                }
              />
            </div>

            <FormField label="Default Selling Rate (₹)" required id="item-rate">
              <CurrencyInput
                id="item-rate"
                value={formData.unitPrice}
                onChange={(val) => setFormData({ ...formData, unitPrice: val })}
              />
            </FormField>
          </div>

          <FormField label="GST Slab Rate" required>
            <Select
              value={formData.gstRatePercent}
              onValueChange={(val) => setFormData({ ...formData, gstRatePercent: val })}
              options={[
                { label: '0% (Exempt / Nil-Rated)', value: '0' },
                { label: '5% (Concessional Goods/Services)', value: '5' },
                { label: '12% (Standard Concessional)', value: '12' },
                { label: '18% (Standard Rate)', value: '18' },
                { label: '28% (Luxury / De-merit)', value: '28' },
              ]}
            />
          </FormField>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setFormData(INITIAL_ITEM_STATE);
                setError(null);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={loading}>
              {initialData ? 'Save Changes' : 'Save Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
