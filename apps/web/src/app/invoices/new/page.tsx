'use client';

import React, { Suspense } from 'react';
import {
  Settings,
  Eye,
  Edit3,
  Columns,
  GripVertical,
} from 'lucide-react';
import { BackButton } from '@/components/back-button';
import {
  Button,
  Badge,
  Card,
  CardContent,
  FormPage,
  LoadingState,
  ErrorState,
} from '@platform/ui';
import { InvoiceHeaderFields } from './invoice-header-fields';
import { InvoiceLineItems } from './invoice-line-items';
import { InvoiceSummary } from './invoice-summary';
import { InvoicePreviewCard } from './invoice-preview-card';
import { InvoiceSettingsDialog } from './invoice-settings-dialog';
import { buildInvoicePreviewModel } from './invoice-preview-model';
import { useInvoiceForm } from './use-invoice-form';

function NewInvoiceContent() {
  const form = useInvoiceForm();

  // Shared Form Component
  const renderForm = () => (
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-6 overflow-hidden">
        <InvoiceHeaderFields
          parties={form.parties}
          branches={form.branches}
          financialYears={form.financialYears}
          selectedPartyId={form.selectedPartyId}
          selectedBranchId={form.selectedBranchId}
          selectedFyId={form.selectedFyId}
          invoiceDate={form.invoiceDate}
          dueDate={form.dueDate}
          posStateCode={form.posStateCode}
          isIntraState={form.isIntraState}
          documentType={form.documentType}
          taxClassification={form.taxClassification}
          isRcm={form.isRcm}
          customInvoiceNumber={form.customInvoiceNumber}
          autoInvoiceNumber={form.autoInvoiceNumber}
          fetchingNumber={form.fetchingNumber}
          onOpenSettings={() => form.setSettingsOpen(true)}
          onPartyChange={form.handleSelectParty}
          onBranchChange={form.setSelectedBranchId}
          onFyChange={form.setSelectedFyId}
          onInvoiceDateChange={form.setInvoiceDate}
          onDueDateChange={form.setDueDate}
          onPosChange={form.setPosStateCode}
          onDocumentTypeChange={form.setDocumentType}
          onTaxClassificationChange={form.setTaxClassification}
          onRcmChange={form.setIsRcm}
        />

        {/* 3. Line Items Card */}
        <div className="p-5 rounded-xl bg-surface border border-subtle space-y-4 shadow-card overflow-hidden">
          <div className="flex items-center justify-between pb-1 border-b border-subtle">
            <h3 className="text-sm font-bold text-primary">Line Items</h3>
          </div>
          <InvoiceLineItems
            items={form.items}
            lineItems={form.lineItems}
            computedTotals={form.computedTotals}
            onSelectItemForLine={form.handleSelectItemForLine}
            onUpdateLineItem={form.handleUpdateLineItem}
            onAddLineItem={form.handleAddLineItem}
            onRemoveLineItem={form.handleRemoveLineItem}
          />
        </div>

        {/* Totals, Notes & Actions */}
        <InvoiceSummary
          computedTotals={form.computedTotals}
          isIntraState={form.isIntraState}
          notes={form.notes}
          submitting={form.submitting}
          submittingDraft={form.submittingDraft}
          onNotesChange={form.setNotes}
          onSubmit={() => form.handleSubmit(false)}
          onSaveDraft={() => form.handleSubmit(true)}
        />
      </CardContent>
    </Card>
  );

  // Shared Preview Component
  const renderPreview = (showBack: boolean = false) => {
    const previewModel = buildInvoicePreviewModel(
      {
        documentType: form.documentType,
        displayInvoiceNo: form.displayInvoiceNo,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        posStateCode: form.posStateCode,
        notes: form.notes,
      },
      form.activeCompany,
      form.activeBranch,
      form.selectedParty,
      form.lineItems,
      form.computedTotals,
    );

    return (
      <InvoicePreviewCard
        templateStyle={form.templateStyle}
        setTemplateStyle={form.setTemplateStyle}
        previewModel={previewModel}
        activeCompany={form.activeCompany}
        showBackToEdit={showBack}
        onBackToEdit={() => form.handleSetViewMode('edit')}
      />
    );
  };

  return (
    <FormPage
      header={{
        breadcrumbs: <BackButton variant="link" fallbackUrl="/invoices" label="Back to invoices" />,
        title:
          form.mode === 'edit'
            ? 'Revise Tax Invoice'
            : form.cloneFrom
            ? 'Duplicate Tax Invoice'
            : 'New GST Tax Invoice',
        subtitle: `Generate Rule 46 tax invoice for ${form.activeCompany?.legalName || 'Active Entity'}.`,
        badge: <Badge variant="brand" size="sm">Rule 46</Badge>,
        actions: (
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-xl bg-surface-sunken p-1">
              <button
                type="button"
                onClick={() => form.handleSetViewMode('edit')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  form.viewMode === 'edit'
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
                disabled={form.isSmallScreen}
                onClick={() => form.handleSetViewMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  form.viewMode === 'split'
                    ? 'bg-surface text-primary shadow-xs'
                    : form.isSmallScreen
                    ? 'text-muted/40 cursor-not-allowed'
                    : 'text-muted hover:text-primary'
                }`}
                title={
                  form.isSmallScreen
                    ? 'Enable wider viewport for Split view (≥1280px)'
                    : 'Split View: 2 columns with draggable resizer'
                }
              >
                <Columns className="h-3.5 w-3.5" />
                <span>Split</span>
              </button>

              <button
                type="button"
                onClick={() => form.handleSetViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  form.viewMode === 'preview'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-muted hover:text-primary'
                }`}
                title="Preview Mode: Clean full preview with print actions (⌘⇧P)"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview</span>
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => form.setSettingsOpen(true)}
              leftIcon={<Settings className="h-3.5 w-3.5" />}
            >
              Series Settings
            </Button>
          </div>
        ),
      }}
      footer={null}
    >
      {form.error && (
        <div className="mb-4">
          <ErrorState error={form.error} />
        </div>
      )}

      {form.loading ? (
        <LoadingState rows={8} />
      ) : (
        <>
          {/* MODE 1: EDIT MODE */}
          {form.viewMode === 'edit' && (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {renderForm()}
            </div>
          )}

          {/* MODE 2: PREVIEW MODE */}
          {form.viewMode === 'preview' && (
            <div className="max-w-[820px] mx-auto w-full space-y-6">
              {renderPreview(true)}
            </div>
          )}

          {/* MODE 3: SPLIT MODE */}
          {form.viewMode === 'split' && (
            <div className="flex items-start gap-0 w-full relative">
              <div
                style={{ width: `${form.splitRatio}%` }}
                className="shrink-0 min-w-0 pr-4 space-y-6"
              >
                {renderForm()}
              </div>

              {/* Draggable Vertical Resizer */}
              <div
                onMouseDown={form.handleMouseDownResize}
                className="w-4 shrink-0 flex items-center justify-center cursor-col-resize select-none group py-12"
                title="Drag to resize form and preview"
              >
                <div className="w-1 h-32 rounded-full bg-border-strong group-hover:bg-brand group-hover:w-1.5 transition-all flex items-center justify-center">
                  <GripVertical className="h-4 w-4 text-muted group-hover:text-inverse opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div
                data-testid="invoice-preview-scroll"
                style={{ width: `${100 - form.splitRatio}%` }}
                className="shrink-0 min-w-0 pl-4 sticky top-0 h-[calc(100vh-theme(spacing.14))] overflow-y-auto space-y-6"
              >
                {renderPreview(false)}
              </div>
            </div>
          )}
        </>
      )}

      <InvoiceSettingsDialog
        open={form.settingsOpen}
        onOpenChange={form.setSettingsOpen}
        companyId={form.activeCompanyId}
        docType={form.documentType}
        branchId={form.selectedBranchId}
        customInvoiceNumber={form.customInvoiceNumber}
        onCustomInvoiceNumberChange={form.setCustomInvoiceNumber}
        prefix={form.prefix}
        onPrefixChange={form.setPrefix}
        suffix={form.suffix}
        onSuffixChange={form.setSuffix}
        notes={form.notes}
        onNotesChange={form.setNotes}
        autoInvoiceNumber={form.autoInvoiceNumber}
        onSeriesUpdated={form.fetchNextInvoiceNumber}
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
