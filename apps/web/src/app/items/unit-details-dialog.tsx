import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
} from '@platform/ui';
import { Scale, Lock, ShieldCheck, Box, Edit3 } from 'lucide-react';

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
  unitPrice: number;
  gstRatePercent: number;
  uom: string;
}

interface UnitDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: UomRow | null;
  assignedItems?: Item[];
  onEdit?: (unit: UomRow) => void;
}

export function UnitDetailsDialog({
  open,
  onOpenChange,
  unit,
  assignedItems = [],
  onEdit,
}: UnitDetailsDialogProps) {
  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold">{unit.name}</DialogTitle>
                <Badge variant={unit.isCustom ? 'brand' : 'neutral'} size="xs">
                  {unit.isCustom ? 'Company Custom Unit' : 'Statutory GST UQC'}
                </Badge>
              </div>
              <DialogDescription className="text-xs">
                Code:{' '}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {unit.code}
                </span>{' '}
                • Category: {unit.category}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Unit Code (UOM / UQC)</span>
              <div className="mt-0.5 font-mono font-bold text-slate-900 dark:text-white text-sm">
                {unit.code}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Category</span>
              <div className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                {unit.category}
              </div>
            </div>

            <div className="col-span-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Full Description / Title</span>
              <div className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                {unit.name}
              </div>
            </div>

            {unit.description && (
              <div className="col-span-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Specification / Notes</span>
                <div className="mt-0.5 text-slate-600 dark:text-slate-400">
                  {unit.description}
                </div>
              </div>
            )}
          </div>

          {/* Statutory Status */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2.5">
            {unit.isCustom ? (
              <Box className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                {unit.isCustom ? 'Commercial Custom Measurement' : 'Statutory GST Portal Compliance'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {unit.isCustom
                  ? 'Custom company unit for operational tracking. Mapped to statutory "OTH (Others)" or primary UQC during GST e-Invoicing & e-Way Bill generation.'
                  : `Standard statutory Unit Quantity Code (UQC: ${unit.code}) mandated by the Indian GST Council and fully compliant with e-Invoicing schemas.`}
              </p>
            </div>
          </div>

          {/* Catalog Usage Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Catalog Items Using This Unit ({assignedItems.length})
              </span>
              <Badge variant={assignedItems.length > 0 ? 'success' : 'neutral'} size="xs">
                {assignedItems.length === 1 ? '1 Active Item' : `${assignedItems.length} Active Items`}
              </Badge>
            </div>

            {assignedItems.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                No catalog goods or services are currently assigned to this measurement unit.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {assignedItems.map((it) => (
                  <div key={it.id} className="p-2.5 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                          {it.itemCode}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {it.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        ₹{Number(it.unitPrice).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">{it.gstRatePercent}% GST</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {unit.isCustom && onEdit && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={() => {
                onOpenChange(false);
                onEdit(unit);
              }}
            >
              Edit Unit
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

