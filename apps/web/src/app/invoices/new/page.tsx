'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Receipt, Settings, Hash, Copy, Edit } from 'lucide-react';
import { Button, Badge, Card, CardContent } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { calculateInvoiceTotals, type LineItem } from './invoice-math';
import { InvoiceHeaderFields } from './invoice-header-fields';
import { InvoiceLineItems } from './invoice-line-items';
import { InvoiceSummary } from './invoice-summary';
import { InvoiceSettingsDialog } from './invoice-settings-dialog';

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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon-sm" asChild aria-label="Back to invoices">
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                {mode === 'edit' ? 'Revise Tax Invoice' : cloneFrom ? 'Duplicate Tax Invoice' : 'New GST Tax Invoice'}
              </h1>
              <Badge variant="brand" size="sm">Rule 46</Badge>
              {activeCompany && (
                <Badge variant="neutral" size="sm" className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeCompany.tradeName || activeCompany.legalName}
                </Badge>
              )}
              {mode === 'edit' && <Badge variant="warning" size="sm">Revision Mode</Badge>}
              {!mode && cloneFrom && <Badge variant="info" size="sm">Duplicated Draft</Badge>}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate statutory tax invoice for <strong className="text-slate-700 dark:text-slate-300">{activeCompany?.legalName || 'Active Entity'}</strong> with automated Place of Supply determination.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => setSettingsOpen(true)}
          leftIcon={<Settings className="h-3.5 w-3.5 text-blue-500" />}
        >
          Invoice & Series Settings
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs text-rose-600 font-medium">
          {error}
        </div>
      )}

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
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-slate-400">
          Loading invoice editor...
        </div>
      }
    >
      <NewInvoiceContent />
    </Suspense>
  );
}
