'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { calculateInvoiceTotals, type LineItem } from './invoice-math';
import { type TemplateStyle } from './invoice-preview-card';

export type ViewMode = 'edit' | 'split' | 'preview';

export function useInvoiceForm() {
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

  // Layout View Modes
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [splitRatio, setSplitRatio] = useState<number>(55);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>('Minimal');

  // Form State
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedFyId, setSelectedFyId] = useState<string>('');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]!);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0]!;
  });
  const [posStateCode, setPosStateCode] = useState<string>('27');
  const [documentType, setDocumentType] = useState<string>('TAX_INVOICE');
  const [taxClassification, setTaxClassification] = useState<string>('STANDARD_RATED');
  const [isRcm, setIsRcm] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>(
    'Thank you for your business. Payment is due within statutory net payment terms.'
  );

  // Numbering Series
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

  // Keyboard shortcuts
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
  }, [
    lineItems,
    selectedPartyId,
    selectedBranchId,
    selectedFyId,
    invoiceDate,
    dueDate,
    posStateCode,
    documentType,
    taxClassification,
    customInvoiceNumber,
    isRcm,
    notes,
  ]);

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

  return {
    cloneFrom,
    mode,
    activeCompanyId,
    activeCompany,
    parties,
    items,
    branches,
    financialYears,
    loading,
    submitting,
    submittingDraft,
    error,
    viewMode,
    splitRatio,
    isSmallScreen,
    templateStyle,
    setTemplateStyle,
    selectedBranchId,
    setSelectedBranchId,
    selectedFyId,
    setSelectedFyId,
    selectedPartyId,
    invoiceDate,
    setInvoiceDate,
    dueDate,
    setDueDate,
    posStateCode,
    setPosStateCode,
    documentType,
    setDocumentType,
    taxClassification,
    setTaxClassification,
    isRcm,
    setIsRcm,
    notes,
    setNotes,
    customInvoiceNumber,
    setCustomInvoiceNumber,
    autoInvoiceNumber,
    fetchingNumber,
    prefix,
    setPrefix,
    suffix,
    setSuffix,
    settingsOpen,
    setSettingsOpen,
    lineItems,
    handleSetViewMode,
    handleSelectParty,
    activeBranch,
    isIntraState,
    computedTotals,
    handleSelectItemForLine,
    handleUpdateLineItem,
    handleAddLineItem,
    handleRemoveLineItem,
    handleSubmit,
    handleMouseDownResize,
    selectedParty,
    displayInvoiceNo,
    fetchNextInvoiceNumber,
  };
}
