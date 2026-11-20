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
        <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold">
                  {item.itemCode}
                </span>
                <Badge variant={isService ? 'brand' : 'neutral'} size="xs">
                  {isService ? 'Professional Service (SAC)' : 'Physical Goods / Product (HSN)'}
                </Badge>
                <Badge variant={item.isActive !== false ? 'success' : 'neutral'} size="xs">
                  {item.isActive !== false ? 'Active' : 'Deactivated'}
                </Badge>
              </div>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {item.name}
              </h2>
              {item.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>

            <div className="text-right whitespace-nowrap">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Standard Rate
              </span>
              <div className="text-lg font-bold">
                <MoneyText amount={Number(item.unitPrice || 0)} />
                <span className="text-xs text-slate-400 font-normal uppercase ml-1">
                  / {item.uom}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Statutory Tax Classification */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <FileText className="w-4 h-4 text-blue-500" />
              Statutory GST Classification & Tariff Codes
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <span className="text-[11px] text-slate-400 block">
                  {isService ? 'SAC Code (Services)' : 'HSN Code (Goods)'}
                </span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {item.hsnSacCode || '—'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">GST Rate Slab</span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {item.gstRatePercent}%
                  {Number(item.gstRatePercent) === 0 ? ' (Exempt / Nil-Rated)' : ''}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Compensation Cess</span>
                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white mt-0.5 block">
                  {item.cessRatePercent ? `${item.cessRatePercent}%` : '0.00%'}
                </span>
              </div>
            </div>
          </div>

          {/* Commercial & Measurement Parameters */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Scale className="w-4 h-4 text-emerald-500" />
              Measurement & Commercial Parameters
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block">Unit of Measurement (UOM)</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {item.uom}
                  </span>
                  <span className="text-slate-500">Statutory GST Quantity Code</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block">Default Unit Selling Price</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  ₹{Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/40 space-y-1">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                Billing Item Specification / Memo
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {item.description}
              </p>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onDelete(item);
            }}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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

