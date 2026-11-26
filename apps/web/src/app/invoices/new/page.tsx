'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Settings, Eye, Printer } from 'lucide-react';
import { Button, Badge, Card, CardContent, LoadingState } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { calculateInvoiceTotals, type LineItem } from './invoice-math';
import { InvoiceHeaderFields } from './invoice-header-fields';
import { InvoiceLineItems } from './invoice-line-items';
import { InvoiceSummary } from './invoice-summary';
import { InvoiceSettingsDialog } from './invoice-settings-dialog';
import {
  type InvoiceTemplateId,
  TallyClassicTemplate,
  ModernBrandTemplate,
  MinimalCompactTemplate,
} from '../[id]/templates';

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneFrom = searchParams.get('cloneFrom');
  const mode = searchParams.get('mode'); // 'edit' or undefined

  const { activeCompanyId, activeCompany } = useCompany();

  const [parties, setParties] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [financialYears, setFinancialYears] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittingDraft, setSubmittingDraft] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<InvoiceTemplateId>('TALLY_CLASSIC');
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState<boolean>(false);

  // Form State
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedFyId, setSelectedFyId] = useState<string>('');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]!);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!
  );
  const [posStateCode, setPosStateCode] = useState<string>('27');
  const [documentType, setDocumentType] = useState<string>('TAX_INVOICE');
  const [taxClassification, setTaxClassification] = useState<string>('TAXABLE');
  const [isRcm, setIsRcm] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('Thank you for your business. Payment due within payment terms.');

  // Invoice Numbering Settings
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState<string>('');
  const [autoInvoiceNumber, setAutoInvoiceNumber] = useState<string>('');
  const [fetchingNumber, setFetchingNumber] = useState<boolean>(false);
  const [prefix, setPrefix] = useState<string>('INV-');
  const [suffix, setSuffix] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      description: '',
      hsnSacCode: '998311',
      quantity: 1,
      uom: 'NOS',
      unitPrice: 10000,
      discountPercent: 0,
      gstRatePercent: 18,
    },
  ]);

  useEffect(() => {
    loadMasters();
  }, [activeCompanyId, cloneFrom]);

  const loadMasters = async () => {
    setLoading(true);
    try {
      const [partiesRes, itemsRes, companiesRes] = await Promise.all([
        apiClient.listParties(activeCompanyId, 'CUSTOMER'),
        apiClient.listItems(activeCompanyId),
        apiClient.listCompanies(),
      ]);

      setParties(partiesRes || []);
      setItems(itemsRes || []);

      const company = companiesRes?.find((c: any) => c.id === activeCompanyId) || companiesRes?.[0];
      if (company) {
        if (company.branches?.length > 0) {
          setBranches(company.branches);
          setSelectedBranchId(company.branches[0].id);
        }
        if (company.financialYears?.length > 0) {
          setFinancialYears(company.financialYears);
          setSelectedFyId(company.financialYears[0].id);
        }
      }

      // Check if cloning, editing, or issuing a credit/debit note against an existing invoice
      const docTypeParam = searchParams.get('docType');
      if (cloneFrom) {
        try {
          const sourceInv = await apiClient.getInvoice(activeCompanyId, cloneFrom);
          if (sourceInv) {
            if (sourceInv.partyId) setSelectedPartyId(sourceInv.partyId);
            if (sourceInv.branchId) setSelectedBranchId(sourceInv.branchId);
            if (sourceInv.financialYearId) setSelectedFyId(sourceInv.financialYearId);
            if (sourceInv.placeOfSupplyStateCode) setPosStateCode(sourceInv.placeOfSupplyStateCode);
            if (mode === 'edit' && sourceInv.invoiceNumber) {
              setCustomInvoiceNumber(sourceInv.invoiceNumber);
            }
            if (docTypeParam) {
              setDocumentType(docTypeParam);
              if (docTypeParam === 'CREDIT_NOTE') {
                setNotes(`Credit Note issued under Section 34 against Original Tax Invoice #${sourceInv.invoiceNumber || ''}.`);
              } else if (docTypeParam === 'DEBIT_NOTE') {
                setNotes(`Debit Note issued under Section 34 against Original Tax Invoice #${sourceInv.invoiceNumber || ''}.`);
              }
            } else if (sourceInv.documentType) {
              setDocumentType(sourceInv.documentType);
            }
            if (sourceInv.taxClassification) setTaxClassification(sourceInv.taxClassification);
            if (sourceInv.isRcm !== undefined) setIsRcm(sourceInv.isRcm);
            if (!docTypeParam && sourceInv.notes) setNotes(sourceInv.notes);
            if (sourceInv.items?.length > 0) {
              setLineItems(
                sourceInv.items.map((it: any) => ({
                  itemId: it.itemId,
                  description: it.description,
                  hsnSacCode: it.hsnSacCode,
                  quantity: parseFloat(it.quantity) || 1,
                  uom: it.uom || 'NOS',
                  unitPrice: parseFloat(it.unitPrice) || 0,
                  discountPercent: parseFloat(it.discountPercent) || 0,
                  gstRatePercent: parseFloat(it.gstRatePercent) || 18,
                }))
              );
            }
            return;
          }
        } catch {
          // Fall through to default selection
        }
      } else if (docTypeParam) {
        setDocumentType(docTypeParam);
      }

      if (partiesRes?.length > 0) {
        handleSelectParty(partiesRes[0].id, partiesRes);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load master data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompanyId && mode !== 'edit') {
      fetchNextInvoiceNumber();
    }
  }, [activeCompanyId, documentType, selectedBranchId, invoiceDate, mode]);

  const fetchNextInvoiceNumber = async () => {
    try {
      setFetchingNumber(true);
      const res = await apiClient.getNextInvoiceNumber(
        activeCompanyId,
        documentType,
        selectedBranchId || undefined,
        invoiceDate
      );
      if (res?.invoiceNumber) {
        setAutoInvoiceNumber(res.invoiceNumber);
      }
    } catch {
      // Keep previous or fallback
    } finally {
      setFetchingNumber(false);
    }
  };

  const handleSelectParty = (partyId: string, partyList = parties) => {
    setSelectedPartyId(partyId);
    const p = partyList.find((x) => x.id === partyId);
    if (p) {
      if (p.billingStateCode) setPosStateCode(p.billingStateCode);
      if (p.paymentTermsDays) {
        const d = new Date(invoiceDate);
        d.setDate(d.getDate() + p.paymentTermsDays);
        setDueDate(d.toISOString().split('T')[0]!);
      }
    }
  };

  const activeBranch = branches.find((b) => b.id === selectedBranchId);
  const supplierState = activeBranch?.stateCode || '27';
  const isIntraState = supplierState === posStateCode;

  const computedTotals = calculateInvoiceTotals(lineItems, isIntraState);

  const handleSelectItemForLine = (index: number, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const updated = [...lineItems];
    updated[index] = {
      ...updated[index]!,
      itemId: item.id,
      description: item.name,
      hsnSacCode: item.hsnSacCode,
      uom: item.uom,
      unitPrice: parseFloat(item.unitPrice || '0'),
      gstRatePercent: parseFloat(item.gstRatePercent || '18'),
    };
    setLineItems(updated);
  };

  const handleUpdateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index]!, [field]: value };
    setLineItems(updated);
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: '',
        hsnSacCode: '998311',
        quantity: 1,
        uom: 'NOS',
        unitPrice: 0,
        discountPercent: 0,
        gstRatePercent: 18,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!selectedPartyId || !selectedBranchId || !selectedFyId) {
      setError('Please select customer, branch, and financial year.');
      return;
    }

    if (isDraft) {
      setSubmittingDraft(true);
    } else {
      setSubmitting(true);
    }
    setError(null);

    try {
      const payload = {
        branchId: selectedBranchId,
        financialYearId: selectedFyId,
        partyId: selectedPartyId,
        invoiceDate,
        dueDate,
        placeOfSupplyStateCode: posStateCode,
        documentType,
        taxClassification,
        customInvoiceNumber: customInvoiceNumber.trim() || undefined,
        isRcm,
        isDraft,
        notes,
        items: lineItems.map((line) => ({
          itemId: line.itemId,
          description: line.description || 'Consulting / Goods',
          hsnSacCode: line.hsnSacCode,
          quantity: String(line.quantity),
          uom: line.uom,
          unitPrice: String(line.unitPrice),
          discountPercent: String(line.discountPercent),
          gstRatePercent: String(line.gstRatePercent),
        })),
      };

      let result;
      if (mode === 'edit' && cloneFrom) {
        result = await apiClient.updateInvoice(activeCompanyId, cloneFrom, payload);
      } else {
        result = await apiClient.createInvoice(activeCompanyId, payload);
      }
      router.push(`/invoices/${result.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create invoice';
      setError(msg);
    } finally {
      setSubmitting(false);
      setSubmittingDraft(false);
    }
  };

  const selectedPartyObj = parties.find((p) => p.id === selectedPartyId);
  const previewInvoice = {
    id: 'preview',
    invoiceNumber: customInvoiceNumber.trim() || autoInvoiceNumber || 'INV-PREVIEW',
    invoiceDate,
    dueDate,
    branchId: selectedBranchId,
    documentType,
    placeOfSupplyStateCode: posStateCode,
    supplyType: isIntraState ? 'INTRA_STATE' : 'INTER_STATE',
    status: 'DRAFT',
    notes,
    party: selectedPartyObj,
    partyNameSnapshot: selectedPartyObj?.name || 'Select Customer',
    partyGstinSnapshot: selectedPartyObj?.gstin,
    subtotalAmount: computedTotals.subtotal,
    cgstAmount: computedTotals.totalCgst,
    sgstAmount: computedTotals.totalSgst,
    igstAmount: computedTotals.totalIgst,
    roundOffAmount: computedTotals.roundOff,
    totalAmount: computedTotals.grandTotal,
    items: lineItems.map((l, idx) => ({
      id: `line-${idx}`,
      description: l.description || 'Item',
      hsnSacCode: l.hsnSacCode,
      quantity: l.quantity,
      uom: l.uom,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      gstRatePercent: l.gstRatePercent,
      taxableAmount: Number(l.quantity || 0) * Number(l.unitPrice || 0),
      totalAmount: Number(l.quantity || 0) * Number(l.unitPrice || 0) * (1 + Number(l.gstRatePercent || 0) / 100),
    })),
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSubmit(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit(false);
      } else if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleAddLineItem();
      } else if (e.altKey && e.key.toLowerCase() === 'd' && lineItems.length > 1) {
        e.preventDefault();
        handleRemoveLineItem(lineItems.length - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon-sm" asChild aria-label="Back to invoices">
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h1 text-primary">
                {mode === 'edit' ? 'Revise Tax Invoice' : cloneFrom ? 'Duplicate Tax Invoice' : 'New GST Tax Invoice'}
              </h1>
              <Badge variant="brand" size="sm">Rule 46</Badge>
              {activeCompany && (
                <Badge variant="neutral" size="sm" className="font-semibold text-primary">
                  {activeCompany.tradeName || activeCompany.legalName}
                </Badge>
              )}
              {mode === 'edit' && <Badge variant="warning" size="sm">Revision Mode</Badge>}
              {!mode && cloneFrom && <Badge variant="info" size="sm">Duplicated Draft</Badge>}
            </div>
            <p className="text-caption text-muted">
              Shortcuts: ⌘S Save Draft • ⌘↵ Submit • Alt+N Add Row • Alt+D Delete Row
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="xl:hidden"
            onClick={() => setMobilePreviewOpen((v) => !v)}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            {mobilePreviewOpen ? 'Hide Preview' : 'Preview'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setSettingsOpen(true)}
            leftIcon={<Settings className="h-3.5 w-3.5 text-brand-text" />}
          >
            Invoice &amp; Series Settings
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-status-danger-subtle border border-status-danger text-caption text-status-danger-text font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <Card className="xl:col-span-7">
          <CardContent className="p-5 sm:p-6 space-y-6">
            <InvoiceHeaderFields
              parties={parties}
              branches={branches}
              financialYears={financialYears}
              selectedPartyId={selectedPartyId}
              selectedBranchId={selectedBranchId}
              selectedFyId={selectedFyId}
              invoiceDate={invoiceDate}
              dueDate={dueDate}
              posStateCode={posStateCode}
              isIntraState={isIntraState}
              documentType={documentType}
              taxClassification={taxClassification}
              isRcm={isRcm}
              customInvoiceNumber={customInvoiceNumber}
              autoInvoiceNumber={autoInvoiceNumber}
              fetchingNumber={fetchingNumber}
              onOpenSettings={() => setSettingsOpen(true)}
              onPartyChange={handleSelectParty}
              onBranchChange={setSelectedBranchId}
              onFyChange={setSelectedFyId}
              onInvoiceDateChange={setInvoiceDate}
              onDueDateChange={setDueDate}
              onPosChange={setPosStateCode}
              onDocumentTypeChange={setDocumentType}
              onTaxClassificationChange={setTaxClassification}
              onRcmChange={setIsRcm}
            />

            <InvoiceLineItems
              items={items}
              lineItems={lineItems}
              computedTotals={computedTotals}
              onSelectItemForLine={handleSelectItemForLine}
              onUpdateLineItem={handleUpdateLineItem}
              onAddLineItem={handleAddLineItem}
              onRemoveLineItem={handleRemoveLineItem}
            />

            <InvoiceSummary
              computedTotals={computedTotals}
              isIntraState={isIntraState}
              notes={notes}
              submitting={submitting}
              submittingDraft={submittingDraft}
              onNotesChange={setNotes}
              onSubmit={() => handleSubmit(false)}
              onSaveDraft={() => handleSubmit(true)}
            />
          </CardContent>
        </Card>

        {/* Live PDF Preview Pane (QuickBooks-style 45% split) */}
        <div className={`xl:col-span-5 xl:sticky xl:top-20 space-y-3 ${mobilePreviewOpen ? 'block' : 'hidden xl:block'}`}>
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-border bg-surface">
            <span className="text-caption font-semibold text-secondary px-2">Live Preview</span>
            <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-lg">
              {([
                { id: 'MINIMAL_COMPACT', label: 'Minimal' },
                { id: 'MODERN_BRAND', label: 'Modern' },
                { id: 'TALLY_CLASSIC', label: 'Tally' },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPreviewTemplate(t.id)}
                  className={`px-2.5 py-1 rounded-md text-caption font-medium transition ${
                    previewTemplate === t.id ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-primary'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3 overflow-auto max-h-[72vh] shadow-xs">
            <div className="origin-top-left scale-[0.72] w-[138%]">
              {previewTemplate === 'TALLY_CLASSIC' && (
                <TallyClassicTemplate invoice={previewInvoice} company={activeCompany} settings={{}} />
              )}
              {previewTemplate === 'MODERN_BRAND' && (
                <ModernBrandTemplate invoice={previewInvoice} company={activeCompany} settings={{}} />
              )}
              {previewTemplate === 'MINIMAL_COMPACT' && (
                <MinimalCompactTemplate invoice={previewInvoice} company={activeCompany} settings={{}} />
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print
            </Button>
            <Button type="button" variant="outline" size="sm" loading={submittingDraft} onClick={() => handleSubmit(true)}>
              Save as Draft
            </Button>
            <Button type="button" variant="primary" size="sm" loading={submitting} onClick={() => handleSubmit(false)}>
              Submit Invoice
            </Button>
          </div>
        </div>
      </div>

      <InvoiceSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        companyId={activeCompanyId}
        docType={documentType}
        branchId={selectedBranchId}
        customInvoiceNumber={customInvoiceNumber}
        onCustomInvoiceNumberChange={setCustomInvoiceNumber}
        prefix={prefix}
        onPrefixChange={setPrefix}
        suffix={suffix}
        onSuffixChange={setSuffix}
        notes={notes}
        onNotesChange={setNotes}
        autoInvoiceNumber={autoInvoiceNumber}
        onSeriesUpdated={fetchNextInvoiceNumber}
      />
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<LoadingState variant="detail" />}>
      <NewInvoiceContent />
    </Suspense>
  );
}
