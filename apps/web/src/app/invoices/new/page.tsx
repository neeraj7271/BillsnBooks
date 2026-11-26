'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Settings, Eye, Edit3 } from 'lucide-react';
import {
  FormPage,
  Button,
  Badge,
  Card,
  CardContent,
  MoneyText,
  DateText,
  LoadingState,
  ErrorState,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { calculateInvoiceTotals, type LineItem } from './invoice-math';
import { InvoiceHeaderFields } from './invoice-header-fields';
import { InvoiceLineItems } from './invoice-line-items';
import { InvoiceSummary } from './invoice-summary';
import { InvoiceSettingsDialog } from './invoice-settings-dialog';

type TemplateStyle = 'Minimal' | 'Modern' | 'Tally';

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneFrom = searchParams.get('cloneFrom');
  const mode = searchParams.get('mode');

  const { activeCompanyId, activeCompany } = useCompany();

  const [parties, setParties] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [financialYears, setFinancialYears] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittingDraft, setSubmittingDraft] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>('Modern');
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

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
  const [notes, setNotes] = useState<string>(
    'Thank you for your business. Payment due within payment terms.'
  );

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

      const company =
        companiesRes?.find((c: any) => c.id === activeCompanyId) || companiesRes?.[0];
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
          // Fall through
        }
      } else if (docTypeParam) {
        setDocumentType(docTypeParam);
      }

      if (partiesRes?.length > 0) {
        handleSelectParty(partiesRes[0].id, partiesRes);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load master data');
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
      // ignore
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
    setLineItems((prev) => [
      ...prev,
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
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!selectedPartyId || !selectedBranchId || !selectedFyId) {
      setError('Please select customer, branch, and financial year.');
      return;
    }

    if (isDraft) setSubmittingDraft(true);
    else setSubmitting(true);
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

      const result =
        mode === 'edit' && cloneFrom
          ? await apiClient.updateInvoice(activeCompanyId, cloneFrom, payload)
          : await apiClient.createInvoice(activeCompanyId, payload);
      router.push(`/invoices/${result.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setSubmitting(false);
      setSubmittingDraft(false);
    }
  };

  // Keyboard shortcuts: Cmd+S (draft), Cmd+Enter (submit), Alt+N (add row), Alt+D (remove last row)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSubmit(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit(false);
      } else if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleAddLineItem();
      } else if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (lineItems.length > 1) handleRemoveLineItem(lineItems.length - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const selectedParty = parties.find((p) => p.id === selectedPartyId);
  const displayInvoiceNo = customInvoiceNumber.trim() || autoInvoiceNumber || 'INV-DRAFT';

  return (
    <FormPage
      header={{
        title:
          mode === 'edit'
            ? 'Revise Tax Invoice'
            : cloneFrom
            ? 'Duplicate Tax Invoice'
            : 'New GST Tax Invoice',
        subtitle: `Generate Rule 46 tax invoice for ${activeCompany?.legalName || 'Active Entity'} with live preview.`,
        badge: <Badge variant="brand" size="sm">Rule 46</Badge>,
        actions: (
          <div className="flex items-center gap-2">
            <div className="lg:hidden inline-flex rounded-lg bg-surface-sunken p-0.5 border border-default">
              <button
                type="button"
                onClick={() => setMobileTab('edit')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                  mobileTab === 'edit' ? 'bg-surface text-primary shadow-xs' : 'text-muted'
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                  mobileTab === 'preview' ? 'bg-surface text-primary shadow-xs' : 'text-muted'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
            </div>

            <Button variant="outline" size="sm" asChild leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
              <Link href="/invoices">Back</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setSettingsOpen(true)}
              leftIcon={<Settings className="h-3.5 w-3.5" />}
            >
              Series Settings
            </Button>
          </div>
        ),
      }}
      footer={
        <>
          <span className="hidden sm:inline text-caption text-muted mr-auto">
            Shortcuts: ⌘S Save Draft · ⌘↵ Submit · Alt+N Add Row · Alt+D Remove Row
          </span>
          <Button variant="outline" size="sm" onClick={() => router.push('/invoices')}>
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={submittingDraft}
            onClick={() => handleSubmit(true)}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={submitting}
            onClick={() => handleSubmit(false)}
          >
            Submit Invoice
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-4">
          <ErrorState error={error} />
        </div>
      )}

      {loading ? (
        <LoadingState rows={8} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 55%: Form */}
          <div className={`lg:col-span-7 space-y-6 ${mobileTab === 'preview' ? 'hidden lg:block' : ''}`}>
            <Card>
              <CardContent className="p-6 space-y-6">
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
          </div>

          {/* Right 45%: Sticky Live Invoice Preview */}
          <div className={`lg:col-span-5 lg:sticky lg:top-20 space-y-3 ${mobileTab === 'edit' ? 'hidden lg:block' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-overline uppercase text-muted">Live PDF Preview</span>
              <div className="inline-flex rounded-lg bg-surface-sunken p-0.5 border border-default">
                {(['Minimal', 'Modern', 'Tally'] as TemplateStyle[]).map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setTemplateStyle(tpl)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      templateStyle === tpl
                        ? 'bg-surface text-primary shadow-xs'
                        : 'text-muted hover:text-primary'
                    }`}
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden">
              <div
                className={`p-5 border-b border-subtle flex items-start justify-between ${
                  templateStyle === 'Modern'
                    ? 'bg-brand-subtle'
                    : templateStyle === 'Tally'
                    ? 'bg-surface-sunken'
                    : 'bg-surface'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-primary">
                    {activeCompany?.legalName || 'Your Company'}
                  </div>
                  {(activeBranch?.gstin || activeCompany?.pan) && (
                    <div className="font-mono text-[11px] text-secondary mt-0.5">
                      {activeBranch?.gstin ? `GSTIN: ${activeBranch.gstin}` : `PAN: ${activeCompany?.pan}`}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-wide text-brand-text">
                    {documentType.replace('_', ' ')}
                  </div>
                  <div className="font-mono text-xs font-semibold text-primary mt-0.5">
                    {displayInvoiceNo}
                  </div>
                </div>
              </div>

              <CardContent className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-subtle">
                  <div>
                    <div className="text-overline uppercase text-muted">Billed To</div>
                    <div className="font-semibold text-primary mt-1">
                      {selectedParty?.name || 'Select a customer'}
                    </div>
                    {selectedParty?.gstin && (
                      <div className="font-mono text-[11px] text-secondary">
                        GSTIN: {selectedParty.gstin}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <div>
                      <span className="text-muted">Date: </span>
                      <DateText date={invoiceDate} className="text-primary" />
                    </div>
                    <div>
                      <span className="text-muted">Due: </span>
                      <DateText date={dueDate} className="text-primary" />
                    </div>
                    <div className="text-muted">
                      POS: <span className="font-mono text-primary">{posStateCode}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-12 text-overline uppercase text-muted pb-1 border-b border-subtle">
                    <span className="col-span-6">Item</span>
                    <span className="col-span-2 text-right">Qty</span>
                    <span className="col-span-4 text-right">Amount</span>
                  </div>
                  {lineItems.map((l, idx) => {
                    const lineAmt =
                      (Number(l.quantity) || 0) *
                      (Number(l.unitPrice) || 0) *
                      (1 - (Number(l.discountPercent) || 0) / 100);
                    return (
                      <div key={idx} className="grid grid-cols-12 items-center text-xs">
                        <span className="col-span-6 truncate text-primary">
                          {l.description || `Line ${idx + 1}`}
                        </span>
                        <span className="col-span-2 text-right font-mono tabular-nums text-secondary">
                          {l.quantity}
                        </span>
                        <span className="col-span-4 text-right">
                          <MoneyText amount={lineAmt} className="text-primary" />
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-default space-y-1.5">
                  <div className="flex justify-between text-secondary">
                    <span>Taxable Value</span>
                    <MoneyText amount={computedTotals.subtotal} />
                  </div>
                  {isIntraState ? (
                    <>
                      <div className="flex justify-between text-secondary">
                        <span>CGST</span>
                        <MoneyText amount={computedTotals.totalCgst} />
                      </div>
                      <div className="flex justify-between text-secondary">
                        <span>SGST</span>
                        <MoneyText amount={computedTotals.totalSgst} />
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-secondary">
                      <span>IGST</span>
                      <MoneyText amount={computedTotals.totalIgst} />
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-subtle text-sm font-bold text-primary">
                    <span>Grand Total</span>
                    <MoneyText amount={computedTotals.grandTotal} />
                  </div>
                </div>

                {notes && (
                  <div className="pt-2 border-t border-subtle text-[11px] text-muted">
                    {notes}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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
    </FormPage>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<LoadingState rows={6} />}>
      <NewInvoiceContent />
    </Suspense>
  );
}
