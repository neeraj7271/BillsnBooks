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
  MoneyText,
} from '@platform/ui';
import {
  Boxes,
  Tag,
  Percent,
  FileText,
  Edit,
  Trash2,
  Clock,
  Layers,
  Scale,
} from 'lucide-react';

interface ItemDetailsProps {
  item: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export function ItemDetailsDialog({
  item,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ItemDetailsProps) {
  if (!item) return null;

  const isService = item.itemType === 'SERVICES';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-2xl overflow-hidden p-0 gap-0">
        {/* Header Banner */}
        <div className="p-6 bg-canvas bg-surface border-b border border-strong">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-brand-subtle bg-brand/60 text-brand-text text-brand font-bold">
                  {item.itemCode}
                </span>
                <Badge variant={isService ? 'brand' : 'neutral'} size="xs">
                  {isService ? 'Professional Service (SAC)' : 'Physical Goods / Product (HSN)'}
                </Badge>
                <Badge variant={item.isActive !== false ? 'success' : 'neutral'} size="xs">
                  {item.isActive !== false ? 'Active' : 'Deactivated'}
                </Badge>
              </div>

              <h2 className="text-xl font-bold text-primary mt-1">
                {item.name}
              </h2>
              {item.description && (
                <p className="text-xs text-muted text-muted line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>

            <div className="text-right whitespace-nowrap">
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider block">
                Standard Rate
              </span>
              <div className="text-lg font-bold">
                <MoneyText amount={Number(item.unitPrice || 0)} />
                <span className="text-xs text-muted font-normal uppercase ml-1">
                  / {item.uom}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Statutory Tax Classification */}
          <div className="rounded-xl border border border-strong p-4 bg-white bg-surface space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary text-muted">
              <FileText className="w-4 h-4 text-brand-text" />
              Statutory GST Classification & Tariff Codes
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <span className="text-[11px] text-muted block">
                  {isService ? 'SAC Code (Services)' : 'HSN Code (Goods)'}
                </span>
                <span className="font-mono text-sm font-bold text-primary mt-0.5 block">
                  {item.hsnSacCode || '—'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-muted block">GST Rate Slab</span>
                <span className="font-mono text-sm font-bold text-primary mt-0.5 block">
                  {item.gstRatePercent}%
                  {Number(item.gstRatePercent) === 0 ? ' (Exempt / Nil-Rated)' : ''}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-muted block">Compensation Cess</span>
                <span className="font-mono text-sm font-semibold text-primary mt-0.5 block">
                  {item.cessRatePercent ? `${item.cessRatePercent}%` : '0.00%'}
                </span>
              </div>
            </div>
          </div>

          {/* Commercial & Measurement Parameters */}
          <div className="rounded-xl border border border-strong p-4 bg-white bg-surface space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary text-muted">
              <Scale className="w-4 h-4 text-status-success-text" />
              Measurement & Commercial Parameters
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] text-muted block">Unit of Measurement (UOM)</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-sunken bg-surface-raised text-primary text-primary-inverse">
                    {item.uom}
                  </span>
                  <span className="text-muted">Statutory GST Quantity Code</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-muted block">Default Unit Selling Price</span>
                <div className="font-semibold text-primary text-primary-inverse text-sm">
                  ₹{Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="rounded-xl border border border-strong p-4 bg-white bg-surface space-y-1">
              <span className="text-[11px] text-muted uppercase tracking-wider font-semibold block">
                Billing Item Specification / Memo
              </span>
              <p className="text-xs text-secondary text-muted whitespace-pre-wrap">
                {item.description}
              </p>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-canvas bg-surface border-t border border-strong flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onDelete(item);
            }}
            className="text-status-danger-text hover:text-status-danger-text hover:bg-status-danger-subtle hover:bg-status-danger"
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Deactivate / Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(item);
              }}
              leftIcon={<Edit className="w-4 h-4" />}
            >
              Edit Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

