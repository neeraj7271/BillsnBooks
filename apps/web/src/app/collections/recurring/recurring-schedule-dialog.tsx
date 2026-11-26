'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Select,
  type SelectOption,
  toast,
} from '@platform/ui';
import {
  CalendarClock,
  Plus,
  Trash2,
  AlertCircle,
  Eye,
  ArrowLeft,
  Check,
  Pause,
  Play,
  FileText,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { RecurringFrequency } from '@platform/shared-types';
import { MinimalCompactTemplate } from '@/app/invoices/[id]/templates/minimal-compact-template';

export interface ScheduleLineItem {
  id: string;
  description: string;
  hsnSacCode: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  gstRatePercent: number;
}

interface RecurringScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialSchedule?: any;
}

export function RecurringScheduleDialog({
  open,
  onOpenChange,
  onSuccess,
  initialSchedule,
}: RecurringScheduleDialogProps) {
  const isEditing = Boolean(initialSchedule);
  const [parties, setParties] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);

  // Form Fields
  const [partyId, setPartyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>(RecurringFrequency.MONTHLY);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [maxRuns, setMaxRuns] = useState<string>('12');

  const [items, setItems] = useState<ScheduleLineItem[]>([
    {
      id: 'item-1',
      description: 'Monthly Retainer Cloud Accounting & Bookkeeping',
      hsnSacCode: '998222',
      quantity: 1,
      uom: 'NOS',
      unitPrice: 25000,
      gstRatePercent: 18,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIsConfirmStep(false);
      setPreviewDrawerOpen(false);
      setError(null);

      Promise.all([
        apiClient.listParties(),
        apiClient.listCompanies(),
        apiClient.listPeriods().catch(() => []),
      ])
        .then(([pList, cList, perList]) => {
          const customers = (pList || []).filter(
            (p: any) => p.partyType === 'CUSTOMER' || p.partyType === 'BOTH'
          );
          setParties(customers);
          setCompanies(cList || []);
          setPeriods(perList || []);

          if (initialSchedule) {
            setPartyId(initialSchedule.partyId || '');
            setBranchId(initialSchedule.branchId || '');
            setFrequency(initialSchedule.frequency || RecurringFrequency.MONTHLY);
            setStartDate(initialSchedule.startDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
            setEndDate(initialSchedule.endDate ? initialSchedule.endDate.split('T')[0] : '');
            setMaxRuns(initialSchedule.maxRuns ? String(initialSchedule.maxRuns) : '');

            if (initialSchedule.templatePayload?.items?.length > 0) {
              setItems(
                initialSchedule.templatePayload.items.map((it: any, idx: number) => ({
                  id: `item-${idx + 1}`,
                  description: it.description || '',
                  hsnSacCode: it.hsnSacCode || '998222',
                  quantity: it.quantity || 1,
                  uom: it.uom || 'NOS',
                  unitPrice: it.unitPrice || 0,
                  gstRatePercent: it.gstRatePercent !== undefined ? it.gstRatePercent : 18,
                }))
              );
            }
          } else {
            if (customers[0] && !partyId) setPartyId(customers[0].id);
            const branch = cList?.[0]?.branches?.[0];
            if (branch && !branchId) setBranchId(branch.id);
          }
        })
        .catch(() => {});
    }
  }, [open, initialSchedule]);

  const frequencyOptions: SelectOption[] = [
    { label: 'Weekly Schedule', value: RecurringFrequency.WEEKLY },
    { label: 'Monthly Schedule', value: RecurringFrequency.MONTHLY },
    { label: 'Quarterly Retainer', value: RecurringFrequency.QUARTERLY },
    { label: 'Annual Subscription', value: RecurringFrequency.ANNUAL },
  ];

  const partyOptions: SelectOption[] = parties.map((p) => ({
    label: `${p.name} (${p.gstin || 'Unregistered'})`,
    value: p.id,
  }));

  // Calculations for Line Items
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalGst = 0;
    items.forEach((it) => {
      const lineTaxable = it.quantity * it.unitPrice;
      const lineGst = lineTaxable * (it.gstRatePercent / 100);
      subtotal += lineTaxable;
      totalGst += lineGst;
    });
    return {
      subtotal,
      totalGst,
      grandTotal: subtotal + totalGst,
    };
  }, [items]);

  // Compute Next Run Dates
  const upcomingDates = useMemo(() => {
    if (!startDate) return [];
    try {
      const dates: string[] = [];
      const parts = startDate.split('-').map(Number);
      const baseYear = parts[0];
      const baseMonth = parts[1] - 1;
      const baseDay = parts[2];

      for (let i = 0; i < 4; i++) {
        const d = new Date(baseYear, baseMonth, baseDay);
        if (frequency === RecurringFrequency.WEEKLY) {
          d.setDate(d.getDate() + i * 7);
        } else if (frequency === RecurringFrequency.MONTHLY) {
          d.setMonth(d.getMonth() + i);
        } else if (frequency === RecurringFrequency.QUARTERLY) {
          d.setMonth(d.getMonth() + i * 3);
        } else if (frequency === RecurringFrequency.ANNUAL) {
          d.setFullYear(d.getFullYear() + i);
        }
        dates.push(
          d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        );
      }
      return dates;
    } catch {
      return [];
    }
  }, [startDate, frequency]);

  // Check if first invoice date is in a locked period
  const isPeriodLocked = useMemo(() => {
    if (!startDate || periods.length === 0) return false;
    const start = new Date(startDate).getTime();
    return periods.some((p: any) => {
      if (p.status !== 'LOCKED') return false;
      const pStart = new Date(p.startDate).getTime();
      const pEnd = new Date(p.endDate).getTime();
      return start >= pStart && start <= pEnd;
    });
  }, [startDate, periods]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: '',
        hsnSacCode: '998222',
        quantity: 1,
        uom: 'NOS',
        unitPrice: 0,
        gstRatePercent: 18,
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItem = (idx: number, field: keyof ScheduleLineItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx]!, [field]: value };
      return copy;
    });
  };

  const selectedParty = parties.find((p) => p.id === partyId);
  const activeCompany = companies[0] || null;

  // Validation
  const isValid =
    Boolean(partyId) &&
    Boolean(startDate) &&
    items.length > 0 &&
    items.every((it) => it.description.trim() !== '' && it.unitPrice > 0) &&
    !isPeriodLocked;

  const handleActivate = async () => {
    if (!isValid) {
      setError('Please resolve all validation errors before activating.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const posCode = selectedParty?.billingStateCode || '27';
      const payload = {
        branchId: branchId || activeCompany?.branches?.[0]?.id || 'd0000000-0000-4000-8000-000000000001',
        partyId,
        frequency,
        startDate,
        endDate: endDate ? endDate : undefined,
        maxRuns: maxRuns ? parseInt(maxRuns, 10) : undefined,
        template: {
          items: items.map((it) => ({
            description: it.description,
            hsnSacCode: it.hsnSacCode,
            quantity: it.quantity || 1,
            uom: it.uom || 'NOS',
            unitPrice: it.unitPrice,
            discountPercent: 0,
            gstRatePercent: it.gstRatePercent,
          })),
          placeOfSupplyStateCode: posCode,
          notes: 'Auto-recurring billing agreement',
        },
      };

      await apiClient.createRecurringSchedule(undefined, payload);
      toast.success('Recurring invoicing schedule activated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create recurring schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (newStatus: 'ACTIVE' | 'PAUSED') => {
    if (!initialSchedule?.id) return;
    setLoading(true);
    try {
      await apiClient.updateRecurringScheduleStatus(undefined, initialSchedule.id, newStatus);
      toast.success(
        `Schedule ${newStatus === 'PAUSED' ? 'paused' : 'resumed'} successfully`
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update schedule status');
    } finally {
      setLoading(false);
    }
  };

  // Preview Invoice Model for Drawer
  const previewInvoice = useMemo(() => {
    return {
      invoiceNumber: 'REC-PREVIEW-001',
      invoiceDate: startDate,
      dueDate: startDate,
      status: 'APPROVED',
      party: selectedParty || {
        name: 'Selected Customer',
        gstin: '27AABCT1234A1Z5',
        billingAddressLine1: 'Client Headquarters, BKC',
        billingCity: 'Mumbai',
        billingState: 'Maharashtra',
        billingPincode: '400051',
      },
      partyNameSnapshot: selectedParty?.name || 'Selected Customer',
      partyGstinSnapshot: selectedParty?.gstin || '27AABCT1234A1Z5',
      companyLegalNameSnapshot: activeCompany?.legalName || 'HeavyQA T1 Co1 Pvt Ltd',
      companyPanSnapshot: activeCompany?.pan || 'AABTH1201D',
      items: items.map((it, idx) => ({
        id: `preview-item-${idx}`,
        description: it.description || 'Consulting & Accounting Services',
        hsnSacCode: it.hsnSacCode || '998222',
        quantity: it.quantity,
        uom: it.uom,
        unitPrice: it.unitPrice,
        discountPercent: 0,
        gstRatePercent: it.gstRatePercent,
        taxableAmount: it.quantity * it.unitPrice,
        amount: it.quantity * it.unitPrice * (1 + it.gstRatePercent / 100),
        totalAmount: it.quantity * it.unitPrice * (1 + it.gstRatePercent / 100),
      })),
      subtotalAmount: totals.subtotal,
      cgstAmount: totals.totalGst / 2,
      sgstAmount: totals.totalGst / 2,
      igstAmount: 0,
      totalAmount: totals.grandTotal,
    };
  }, [items, selectedParty, activeCompany, startDate, totals]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl bg-surface border border-default rounded-2xl p-6 max-h-[90vh] overflow-y-auto shadow-xl"
          data-testid="recurring-schedule-dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-primary flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-brand" />
              {isConfirmStep
                ? 'Review & Confirm Recurring Schedule'
                : isEditing
                ? 'Edit Recurring Invoicing Schedule'
                : 'Create Recurring Invoicing Schedule'}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="mt-3 p-3 bg-status-danger-subtle text-status-danger-text text-xs rounded-xl border border-status-danger flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!isConfirmStep ? (
            /* STEP 1: Form Inputs with Plain-English Labels & Helper Text */
            <div className="mt-4 space-y-4">
              {/* Customer Account */}
              <div>
                <label
                  htmlFor="bill-to-customer"
                  className="block text-xs font-semibold text-primary"
                >
                  Bill to Customer
                </label>
                <div className="mt-1">
                  <Select
                    id="bill-to-customer"
                    aria-label="Bill to Customer"
                    value={partyId}
                    onValueChange={setPartyId}
                    options={
                      partyOptions.length > 0
                        ? partyOptions
                        : [{ label: 'Loading customers...', value: '' }]
                    }
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted">Who receives the recurring invoice.</p>
              </div>

              {/* Frequency and Start Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="billing-frequency"
                    className="block text-xs font-semibold text-primary"
                  >
                    Billing Frequency
                  </label>
                  <div className="mt-1">
                    <Select
                      id="billing-frequency"
                      aria-label="Billing Frequency"
                      value={frequency}
                      onValueChange={(val) => setFrequency(val as RecurringFrequency)}
                      options={frequencyOptions}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    How often an invoice is generated.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="first-invoice-date"
                    className="block text-xs font-semibold text-primary"
                  >
                    First Invoice Date
                  </label>
                  <Input
                    id="first-invoice-date"
                    aria-label="First Invoice Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 text-xs"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    The first invoice runs on this date.
                  </p>
                </div>
              </div>

              {/* Number of Invoices and Stop After */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="number-of-invoices"
                    className="block text-xs font-semibold text-primary"
                  >
                    Number of Invoices
                  </label>
                  <Input
                    id="number-of-invoices"
                    aria-label="Number of Invoices"
                    type="number"
                    placeholder="12"
                    value={maxRuns}
                    onChange={(e) => setMaxRuns(e.target.value)}
                    className="mt-1 text-xs"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    Total invoices this schedule will create. Leave blank for unlimited until End Date.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="stop-after"
                    className="block text-xs font-semibold text-primary"
                  >
                    Stop After (Optional)
                  </label>
                  <Input
                    id="stop-after"
                    aria-label="Stop After (Optional)"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 text-xs"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    No invoices are generated past this date.
                  </p>
                </div>
              </div>

              {/* Line Items Section */}
              <div className="p-4 bg-surface-sunken rounded-2xl border border-default space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">What's on each invoice</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleAddItem}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    + Add another line
                  </Button>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-surface rounded-xl border border-subtle space-y-2 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted uppercase">
                        Line {idx + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          aria-label={`Delete line ${idx + 1}`}
                          className="text-muted hover:text-status-danger p-1 rounded-md transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`item-desc-${idx}`}
                        className="block text-[11px] font-semibold text-secondary"
                      >
                        Description
                      </label>
                      <Input
                        id={`item-desc-${idx}`}
                        aria-label="Description"
                        placeholder="Appears on the printed invoice line"
                        value={item.description}
                        onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                        className="mt-1 text-xs"
                      />
                      <p className="mt-0.5 text-[10px] text-muted">
                        Appears on the printed invoice line.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label
                          htmlFor={`item-hsn-${idx}`}
                          className="block text-[11px] font-semibold text-secondary"
                        >
                          HSN / SAC Code
                        </label>
                        <Input
                          id={`item-hsn-${idx}`}
                          aria-label="HSN / SAC Code"
                          placeholder="998222"
                          value={item.hsnSacCode}
                          onChange={(e) => handleUpdateItem(idx, 'hsnSacCode', e.target.value)}
                          className="mt-1 text-xs font-mono"
                        />
                        <p className="mt-0.5 text-[10px] text-muted">
                          Six- or eight-digit GST classification.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor={`item-rate-${idx}`}
                          className="block text-[11px] font-semibold text-secondary"
                        >
                          Unit Price (₹)
                        </label>
                        <Input
                          id={`item-rate-${idx}`}
                          aria-label="Unit Price (₹)"
                          type="number"
                          placeholder="25000"
                          value={item.unitPrice === 0 ? '' : item.unitPrice}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                          className="mt-1 text-xs font-mono"
                        />
                        <p className="mt-0.5 text-[10px] text-muted">Amount before GST, per invoice.</p>
                      </div>

                      <div>
                        <label
                          htmlFor={`item-gst-${idx}`}
                          className="block text-[11px] font-semibold text-secondary"
                        >
                          GST Rate (%)
                        </label>
                        <Select
                          id={`item-gst-${idx}`}
                          aria-label="GST Rate (%)"
                          value={String(item.gstRatePercent)}
                          onValueChange={(val) =>
                            handleUpdateItem(idx, 'gstRatePercent', parseFloat(val))
                          }
                          options={[
                            { label: '0%', value: '0' },
                            { label: '5%', value: '5' },
                            { label: '12%', value: '12' },
                            { label: '18%', value: '18' },
                            { label: '28%', value: '28' },
                          ]}
                        />
                        <p className="mt-0.5 text-[10px] text-muted">Standard GST rate slab.</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Locked Period Warning */}
              {isPeriodLocked && (
                <div
                  data-testid="locked-period-warning"
                  className="p-3 bg-status-danger-subtle text-status-danger-text text-xs rounded-xl border border-status-danger flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    The period for {upcomingDates[0] || startDate} is locked. The first run would fail.
                    Pick a later date or unlock the period.
                  </span>
                </div>
              )}

              {/* Live "Next run" Summary Chip Row */}
              <div
                data-testid="recurring-next-run-preview"
                className="p-4 bg-surface rounded-2xl border border-default space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-secondary">Next invoice:</span>
                  <span className="font-bold text-primary font-mono">{upcomingDates[0] || '—'}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-secondary">Then:</span>
                  <span className="text-secondary text-right">
                    {upcomingDates.slice(1).join(', ') || '—'} …
                  </span>
                </div>

                <div className="pt-2 border-t border-subtle flex items-center justify-between text-xs">
                  <span className="font-semibold text-secondary">Total schedule:</span>
                  <span className="font-bold text-primary">
                    {maxRuns ? `${maxRuns} invoices` : 'Unlimited runs'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-secondary">Per invoice:</span>
                  <span className="font-bold text-brand font-mono">
                    ₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    <span className="text-[11px] text-muted font-normal ml-1">
                      (₹ {totals.subtotal.toLocaleString('en-IN')} + GST ₹{' '}
                      {totals.totalGst.toLocaleString('en-IN')})
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: Two-Step Confirmation Summary */
            <div className="mt-4 space-y-4" data-testid="recurring-confirm-step">
              <div className="p-4 bg-surface-sunken rounded-2xl border border-default space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-subtle">
                  <div>
                    <span className="text-[11px] font-bold text-muted uppercase">Customer</span>
                    <h4 className="text-sm font-bold text-primary">{selectedParty?.name || 'Customer'}</h4>
                    <span className="text-xs font-mono text-secondary">
                      GSTIN: {selectedParty?.gstin || 'Unregistered'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewDrawerOpen(true)}
                    leftIcon={<Eye className="h-3.5 w-3.5" />}
                  >
                    Preview first invoice
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted block text-[11px]">Frequency:</span>
                    <span className="font-semibold text-primary capitalize">
                      {frequency.toLowerCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">First Invoice Date:</span>
                    <span className="font-semibold text-primary font-mono">{upcomingDates[0]}</span>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Total Runs:</span>
                    <span className="font-semibold text-primary">
                      {maxRuns ? `${maxRuns} invoices` : 'Unlimited'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Total per invoice:</span>
                    <span className="font-bold text-primary font-mono">
                      ₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Summary Table */}
              <div className="border border-default rounded-xl overflow-hidden text-xs">
                <div className="bg-surface-sunken px-3 py-2 font-bold text-secondary text-[11px] border-b border-default">
                  Invoice Line Items Summary
                </div>
                <div className="divide-y divide-border-subtle bg-surface">
                  {items.map((it, idx) => (
                    <div key={it.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-primary">{it.description}</p>
                        <span className="text-[11px] font-mono text-muted">
                          HSN: {it.hsnSacCode} · Qty: {it.quantity} {it.uom}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-primary">
                          ₹ {it.unitPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[10px] text-muted font-mono">
                          +{it.gstRatePercent}% GST
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dialog Footer Actions */}
          <DialogFooter className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-subtle">
            {isEditing && (
              <div className="flex items-center gap-2">
                {initialSchedule.status === 'ACTIVE' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={loading}
                    onClick={() => handleStatusToggle('PAUSED')}
                    leftIcon={<Pause className="h-3.5 w-3.5 text-status-warning" />}
                  >
                    Pause schedule
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={loading}
                    onClick={() => handleStatusToggle('ACTIVE')}
                    leftIcon={<Play className="h-3.5 w-3.5 text-status-success" />}
                  >
                    Resume schedule
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {!isConfirmStep ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={!isValid}
                    title={!isValid ? 'Please fill all required fields correctly' : 'Review & Activate'}
                    onClick={() => setIsConfirmStep(true)}
                    leftIcon={<Check className="h-3.5 w-3.5" />}
                  >
                    Activate Schedule
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsConfirmStep(false)}
                    leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                  >
                    Back to edit
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={loading}
                    onClick={handleActivate}
                  >
                    Activate
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* First Invoice Preview Modal / Drawer */}
      {previewDrawerOpen && (
        <Dialog open={previewDrawerOpen} onOpenChange={setPreviewDrawerOpen}>
          <DialogContent
            className="max-w-4xl bg-surface border border-default rounded-2xl p-6 max-h-[95vh] overflow-y-auto shadow-2xl"
            data-testid="recurring-first-invoice-drawer"
          >
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-primary flex items-center justify-between">
                <span>First Generated Invoice Preview</span>
                <span className="text-xs font-mono text-muted">Minimalist Compact Template</span>
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 bg-canvas/30 rounded-xl border border-subtle flex justify-center">
              <div className="w-full max-w-[760px] aspect-[1/1.414] bg-white text-black p-8 rounded-sm shadow-md">
                <MinimalCompactTemplate
                  invoice={previewInvoice}
                  company={activeCompany}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewDrawerOpen(false)}
              >
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
