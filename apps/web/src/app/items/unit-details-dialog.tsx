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
      <DialogContent size="sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-status-info-subtle border border-default flex items-center justify-center text-status-info-text">
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
                <span className="font-mono font-bold text-primary">
                  {unit.code}
                </span>{' '}
                • Category: {unit.category}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-sunken border border-default">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase">Unit Code (UOM / UQC)</span>
              <div className="mt-0.5 font-mono font-bold text-primary text-sm">
                {unit.code}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-muted uppercase">Category</span>
              <div className="mt-0.5 font-medium text-primary">
                {unit.category}
              </div>
            </div>

            <div className="col-span-2">
              <span className="text-[11px] font-semibold text-muted uppercase">Full Description / Title</span>
              <div className="mt-0.5 font-medium text-primary">
                {unit.name}
              </div>
            </div>

            {unit.description && (
              <div className="col-span-2">
                <span className="text-[11px] font-semibold text-muted uppercase">Specification / Notes</span>
                <div className="mt-0.5 text-secondary">
                  {unit.description}
                </div>
              </div>
            )}
          </div>

          {/* Statutory Status */}
          <div className="p-3 rounded-xl border border-default bg-surface flex items-start gap-2.5">
            {unit.isCustom ? (
              <Box className="w-4 h-4 text-status-info-text shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-status-success-text shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-primary">
                {unit.isCustom ? 'Commercial Custom Measurement' : 'Statutory GST Portal Compliance'}
              </div>
              <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                {unit.isCustom
                  ? 'Custom company unit for operational tracking. Mapped to statutory "OTH (Others)" or primary UQC during GST e-Invoicing & e-Way Bill generation.'
                  : `Standard statutory Unit Quantity Code (UQC: ${unit.code}) mandated by the Indian GST Council and fully compliant with e-Invoicing schemas.`}
              </p>
            </div>
          </div>

          {/* Catalog Usage Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                Catalog Items Using This Unit ({assignedItems.length})
              </span>
              <Badge variant={assignedItems.length > 0 ? 'success' : 'neutral'} size="xs">
                {assignedItems.length === 1 ? '1 Active Item' : `${assignedItems.length} Active Items`}
              </Badge>
            </div>

            {assignedItems.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-default text-center text-muted text-xs">
                No catalog goods or services are currently assigned to this measurement unit.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-default divide-y divide-border-subtle">
                {assignedItems.map((it) => (
                  <div key={it.id} className="p-2.5 flex items-center justify-between gap-3 bg-surface">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-status-info-text">
                          {it.itemCode}
                        </span>
                        <span className="font-medium text-primary">
                          {it.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-semibold text-primary">
                        ₹{Number(it.unitPrice).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-muted">{it.gstRatePercent}% GST</div>
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

