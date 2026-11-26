'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Settings, Eye, Edit3, Columns, GripVertical } from 'lucide-react';
import {
  FormPage,
  Button,
  Badge,
  Card,
  CardContent,
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
import { InvoicePreviewCard, type TemplateStyle } from './invoice-preview-card';
import { buildInvoicePreviewModel } from './invoice-preview-model';

export type ViewMode = 'edit' | 'split' | 'preview';

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

  // 3-mode View Toggle: Edit (default), Split, Preview
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [splitRatio, setSplitRatio] = useState<number>(55);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>('Modern');

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

  // Load view mode and split ratio preferences from localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('antigravity_invoice_view_mode') as ViewMode | null;
      if (savedMode && ['edit', 'split', 'preview'].includes(savedMode)) {
        setViewMode(savedMode);
      }
      const savedRatio = localStorage.getItem('antigravity_invoice_split_ratio');
      if (savedRatio) {
        const parsed = parseInt(savedRatio, 10);
        if (parsed >= 40 && parsed <= 70) setSplitRatio(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Monitor screen width (< 1280px disables split mode)
  useEffect(() => {
    const checkWidth = () => {
      const small = window.innerWidth < 1280;
      setIsSmallScreen(small);
      if (small && viewMode === 'split') {
        setViewMode('edit');
      }
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, [viewMode]);

  const handleSetViewMode = (newMode: ViewMode) => {
    if (newMode === 'split' && isSmallScreen) return;
    setViewMode(newMode);
    try {
      localStorage.setItem('antigravity_invoice_view_mode', newMode);
    } catch {
      // ignore
    }
  };

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

  // Keyboard shortcuts:
  // Cmd+Shift+P -> Preview mode
  // Cmd+Shift+E -> Edit mode
  // Cmd+S -> save draft
  // Cmd+Enter -> submit
  // Alt+N -> add line item
  // Alt+Backspace / Alt+D -> remove last line item
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleSetViewMode('preview');
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleSetViewMode('edit');
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSubmit(true);
      } else if (isCmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit(false);
      } else if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleAddLineItem();
      } else if (e.altKey && (e.key === 'Backspace' || e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        if (lineItems.length > 1) handleRemoveLineItem(lineItems.length - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lineItems, selectedPartyId, selectedBranchId, selectedFyId, invoiceDate, dueDate, posStateCode, documentType, taxClassification, customInvoiceNumber, isRcm, notes]);

  // Resizer mouse drag for split mode
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const startX = e.clientX;
    const startRatio = splitRatio;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - startX;
      const totalWidth = window.innerWidth;
      const deltaPercent = (deltaX / totalWidth) * 100;
      const newRatio = Math.max(40, Math.min(70, Math.round(startRatio + deltaPercent)));
      setSplitRatio(newRatio);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        localStorage.setItem('antigravity_invoice_split_ratio', String(splitRatio));
      } catch {
        // ignore
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const selectedParty = parties.find((p) => p.id === selectedPartyId);
  const displayInvoiceNo = customInvoiceNumber.trim() || autoInvoiceNumber || 'INV-DRAFT';

  // Shared Form Component
  const renderForm = () => (
    <Card className="shadow-xs">
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

        {/* Fieldset 3 — Line Items */}
        <fieldset className="p-5 rounded-2xl bg-surface border border-default space-y-4">
          <legend className="px-2 text-xs font-bold uppercase tracking-wider text-secondary">
            3. Billable Line Items & HSN Classification
          </legend>
          <InvoiceLineItems
            items={items}
            lineItems={lineItems}
            computedTotals={computedTotals}
            onSelectItemForLine={handleSelectItemForLine}
            onUpdateLineItem={handleUpdateLineItem}
            onAddLineItem={handleAddLineItem}
            onRemoveLineItem={handleRemoveLineItem}
          />
        </fieldset>

        {/* Fieldset 4 & 5 — Totals, Notes & Actions */}
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
  );

  // Shared Preview Component
  const renderPreview = (showBack: boolean = false) => {
    const previewModel = buildInvoicePreviewModel(
      {
        documentType,
        displayInvoiceNo,
        invoiceDate,
        dueDate,
        posStateCode,
        notes,
      },
      activeCompany,
      activeBranch,
      selectedParty,
      lineItems,
      computedTotals,
    );

    return (
      <InvoicePreviewCard
        templateStyle={templateStyle}
        setTemplateStyle={setTemplateStyle}
        previewModel={previewModel}
        activeCompany={activeCompany}
        showBackToEdit={showBack}
        onBackToEdit={() => handleSetViewMode('edit')}
      />
    );
  };

  return (
    <FormPage
      header={{
        title:
          mode === 'edit'
            ? 'Revise Tax Invoice'
            : cloneFrom
            ? 'Duplicate Tax Invoice'
            : 'New GST Tax Invoice',
        subtitle: `Generate Rule 46 tax invoice for ${activeCompany?.legalName || 'Active Entity'}.`,
        badge: <Badge variant="brand" size="sm">Rule 46</Badge>,
        actions: (
          <div className="flex items-center gap-3">
            {/* 3-way Segmented View Mode Toggle: Edit / Split / Preview */}
            <div className="inline-flex rounded-xl bg-surface-sunken p-1 border border-default shadow-2xs">
              <button
                type="button"
                onClick={() => handleSetViewMode('edit')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'edit'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-muted hover:text-primary'
                }`}
                title="Edit Mode: Form centered at full width (⌘⇧E)"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                disabled={isSmallScreen}
                onClick={() => handleSetViewMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'split'
                    ? 'bg-surface text-primary shadow-xs'
                    : isSmallScreen
                    ? 'text-muted/40 cursor-not-allowed'
                    : 'text-muted hover:text-primary'
                }`}
                title={
                  isSmallScreen
                    ? 'Enable wider viewport for Split view (≥1280px)'
                    : 'Split View: 2 columns with draggable resizer'
                }
              >
                <Columns className="h-3.5 w-3.5" />
                <span>Split</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'preview'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-muted hover:text-primary'
                }`}
                title="Preview Mode: Clean full preview with print actions (⌘⇧P)"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview</span>
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
      footer={null}
    >
      {error && (
        <div className="mb-4">
          <ErrorState error={error} />
        </div>
      )}

      {loading ? (
        <LoadingState rows={8} />
      ) : (
        <>
          {/* MODE 1: EDIT MODE (Form full width at max-w-4xl, Preview completely unmounted) */}
          {viewMode === 'edit' && (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {renderForm()}
            </div>
          )}

          {/* MODE 2: PREVIEW MODE (Preview centered at max-w-4xl, Form completely unmounted) */}
          {viewMode === 'preview' && (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {renderPreview(true)}
            </div>
          )}

          {/* MODE 3: SPLIT MODE (2 columns with draggable divider, only on wide screens) */}
          {viewMode === 'split' && (
            <div className="flex items-start gap-0 w-full relative">
              <div
                style={{ width: `${splitRatio}%` }}
                className="shrink-0 pr-4 space-y-6"
              >
                {renderForm()}
              </div>

              {/* Draggable Vertical Resizer */}
              <div
                onMouseDown={handleMouseDownResize}
                className="w-4 shrink-0 flex items-center justify-center cursor-col-resize select-none group py-12"
                title="Drag to resize form and preview"
              >
                <div className="w-1 h-32 rounded-full bg-border-strong group-hover:bg-brand group-hover:w-1.5 transition-all flex items-center justify-center">
                  <GripVertical className="h-4 w-4 text-muted group-hover:text-inverse opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div
                style={{ width: `${100 - splitRatio}%` }}
                className="shrink-0 pl-4 sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto space-y-6"
              >
                {renderPreview(false)}
              </div>
            </div>
          )}
        </>
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
