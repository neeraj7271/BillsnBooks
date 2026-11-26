'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Hash,
  Plus,
  RefreshCw,
  Edit,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  DataTable,
  FormField,
  Input,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

interface NumberingSeries {
  id: string;
  docType: string;
  seriesCode: string;
  formatPattern: string;
  seqPadding: number;
  startSeq: number;
  currentSeq: number;
  resetFrequency: string;
  isManual: boolean;
  isActive: boolean;
  branchId?: string;
}

export default function NumberingSettingsPage() {
  const { activeCompanyId } = useCompany();
  const [seriesList, setSeriesList] = useState<NumberingSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<NumberingSeries | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [docType, setDocType] = useState('TAX_INVOICE');
  const [seriesCode, setSeriesCode] = useState('INV');
  const [formatPattern, setFormatPattern] = useState('{SERIES}-{SEQ}');
  const [seqPadding, setSeqPadding] = useState(5);
  const [startSeq, setStartSeq] = useState(1);
  const [resetFrequency, setResetFrequency] = useState('ANNUAL_FY');
  const [branchId, setBranchId] = useState('');

  useEffect(() => {
    loadData();
  }, [activeCompanyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [seriesRes, compRes] = await Promise.all([
        apiClient.listNumberingSeries(activeCompanyId),
        apiClient.listCompanies(),
      ]);

      setSeriesList(seriesRes || []);
      const comp = compRes?.find((c: any) => c.id === activeCompanyId) || compRes?.[0];
      if (comp?.branches?.length > 0) {
        setBranches(comp.branches);
      }
    } catch (err: unknown) {
      console.error('Failed to load numbering series:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDocTypeChange = (dt: string) => {
    setDocType(dt);
    if (!selectedSeries) {
      const codeMap: Record<string, string> = {
        TAX_INVOICE: 'INV',
        CREDIT_NOTE: 'CN',
        DEBIT_NOTE: 'DN',
        PURCHASE_ORDER: 'PO',
        PURCHASE_VOUCHER: 'PV',
        PROFORMA_INVOICE: 'PI',
        DELIVERY_CHALLAN: 'DC',
        SALES_VOUCHER: 'SV',
        JOURNAL_VOUCHER: 'JV',
        PAYMENT_VOUCHER: 'PMT',
        RECEIPT_VOUCHER: 'RCP',
      };
      if (codeMap[dt]) setSeriesCode(codeMap[dt]!);
    }
  };

  const handleOpenCreate = () => {
    setSelectedSeries(null);
    setDocType('TAX_INVOICE');
    setSeriesCode('INV');
    setFormatPattern('{SERIES}-{SEQ}');
    setSeqPadding(5);
    setStartSeq(1);
    setResetFrequency('ANNUAL_FY');
    setBranchId(branches[0]?.id || '');
    setModalOpen(true);
  };

  const handleOpenEdit = (s: NumberingSeries) => {
    setSelectedSeries(s);
    setDocType(s.docType);
    setSeriesCode(s.seriesCode);
    setFormatPattern(s.formatPattern);
    setSeqPadding(s.seqPadding || 5);
    setStartSeq(s.startSeq || 1);
    setResetFrequency(s.resetFrequency || 'ANNUAL_FY');
    setBranchId(s.branchId || '');
    setModalOpen(true);
  };

  const previewFormatted = formatPattern
    .replace('{SERIES}', seriesCode)
    .replace('{BRANCH}', 'HO')
    .replace('{FY}', '26-27')
    .replace('{SEQ}', String(startSeq).padStart(seqPadding, '0'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (selectedSeries) {
        await apiClient.updateNumberingSeries(activeCompanyId, selectedSeries.id, {
          seriesCode,
          formatPattern,
          seqPadding,
          startSeq,
          resetFrequency,
        });
      } else {
        await apiClient.createNumberingSeries(activeCompanyId, {
          branchId: branchId || undefined,
          docType,
          seriesCode,
          formatPattern,
          seqPadding,
          startSeq,
          resetFrequency,
          isManual: false,
        });
      }
      setModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to save numbering series:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<NumberingSeries>[] = [
    {
      key: 'docType',
      header: 'Document Type',
      width: '160px',
      cell: (s) => (
        <Badge variant="brand" size="xs">
          {s.docType}
        </Badge>
      ),
    },
    {
      key: 'seriesCode',
      header: 'Series Code',
      width: '120px',
      cell: (s) => <span className="font-mono font-bold text-xs">{s.seriesCode}</span>,
    },
    {
      key: 'formatPattern',
      header: 'Pattern Template',
      cell: (s) => <code className="text-xs bg-surface-sunken px-2 py-0.5 rounded font-mono">{s.formatPattern}</code>,
    },
    {
      key: 'preview',
      header: 'Sample Formatted Output',
      cell: (s) => {
        const sample = s.formatPattern
          .replace('{SERIES}', s.seriesCode)
          .replace('{BRANCH}', 'HO')
          .replace('{FY}', '26-27')
          .replace('{SEQ}', String(s.currentSeq || 1).padStart(s.seqPadding || 5, '0'));
        return <span className="font-mono font-bold text-xs text-brand-text">{sample}</span>;
      },
    },
    {
      key: 'currentSeq',
      header: 'Current Sequence',
      align: 'right',
      width: '130px',
      cell: (s) => <span className="font-mono font-semibold">{s.currentSeq || 0}</span>,
    },
    {
      key: 'resetFrequency',
      header: 'Reset Policy',
      width: '130px',
      cell: (s) => (
        <span className="text-xs text-secondary">
          {s.resetFrequency === 'ANNUAL_FY' ? 'Every FY' : s.resetFrequency === 'MONTHLY' ? 'Monthly' : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '90px',
      cell: (s) => (
        <Button variant="outline" size="xs" onClick={() => handleOpenEdit(s)} leftIcon={<Edit className="w-3 h-3" />}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon-sm" asChild>
            <Link href="/settings/companies" aria-label="Back to Companies">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-primary">
                Document Numbering & Sequences
              </h1>
              <Badge variant="brand" size="sm">Gap-Free Rule 46</Badge>
            </div>
            <p className="mt-1 text-sm text-secondary">
              Configure consecutive numbering series, statutory prefixes, and sequence token rules across documents.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} loading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            New Numbering Series
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-2xl bg-status-info-subtle border border-default flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-status-info-text shrink-0 mt-0.5" />
        <div className="text-xs text-secondary leading-relaxed">
          <span className="font-bold text-primary block mb-0.5">
            Statutory GST Numbering Invariant (Rule 46(b)):
          </span>
          All Tax Invoices, Credit Notes, and Delivery Challans must follow unique, consecutive numbering containing only alphanumeric and special characters (`-`, `/`). Gap-free sequence tracking prevents audit disallowances.
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={seriesList}
        loading={loading}
        emptyTitle="No custom numbering series found"
        emptyDescription="Configure your first numbering series to override default invoice sequences."
      />

      {/* Series Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="md" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedSeries ? `Edit Series: ${selectedSeries.seriesCode}` : 'Create New Document Numbering Series'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define the format pattern, prefix tokens, and sequence padding.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Document Type" required>
                <Select
                  value={docType}
                  onValueChange={handleDocTypeChange}
                  options={[
                    { label: 'Tax Invoice (Standard GST)', value: 'TAX_INVOICE' },
                    { label: 'Credit Note (Sales Return / Sec 34)', value: 'CREDIT_NOTE' },
                    { label: 'Debit Note (Purchase Return / Sec 34)', value: 'DEBIT_NOTE' },
                    { label: 'Purchase Order (Procurement)', value: 'PURCHASE_ORDER' },
                    { label: 'Purchase Voucher (Internal / RCM)', value: 'PURCHASE_VOUCHER' },
                    { label: 'Proforma Invoice (Estimate)', value: 'PROFORMA_INVOICE' },
                    { label: 'Delivery Challan (Rule 55)', value: 'DELIVERY_CHALLAN' },
                    { label: 'Sales Voucher', value: 'SALES_VOUCHER' },
                    { label: 'Journal Voucher (JV)', value: 'JOURNAL_VOUCHER' },
                    { label: 'Payment Voucher', value: 'PAYMENT_VOUCHER' },
                    { label: 'Receipt Voucher', value: 'RECEIPT_VOUCHER' },
                  ]}
                />
              </FormField>

              <FormField label="Series Code" required id="series-code">
                <Input
                  id="series-code"
                  value={seriesCode}
                  onChange={(e) => setSeriesCode(e.target.value.toUpperCase())}
                  placeholder="e.g. INV, PST, CN"
                  className="font-mono uppercase text-xs"
                />
              </FormField>
            </div>

            <FormField label="Format Pattern Template" required id="format-pattern">
              <Input
                id="format-pattern"
                value={formatPattern}
                onChange={(e) => setFormatPattern(e.target.value)}
                placeholder="{SERIES}/{FY}/{SEQ} or {SERIES}-{SEQ}"
                className="font-mono text-xs"
              />
            </FormField>

            <div className="p-3 rounded-xl bg-surface-sunken border border-default text-xs">
              <span className="text-[11px] text-secondary font-bold uppercase block mb-1">
                Supported Tokens:
              </span>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono text-primary">
                <span className="px-1.5 py-0.5 rounded bg-surface border border-default">`{'{SERIES}'}`</span>
                <span className="px-1.5 py-0.5 rounded bg-surface border border-default">`{'{FY}'}`</span>
                <span className="px-1.5 py-0.5 rounded bg-surface border border-default">`{'{BRANCH}'}`</span>
                <span className="px-1.5 py-0.5 rounded bg-surface border border-default">`{'{SEQ}'}`</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Sequence Padding (Digits)" required id="seq-pad">
                <Input
                  id="seq-pad"
                  type="number"
                  min={1}
                  max={8}
                  value={seqPadding}
                  onChange={(e) => setSeqPadding(parseInt(e.target.value, 10) || 5)}
                  className="font-mono text-xs"
                />
              </FormField>

              <FormField label="Reset Policy" required>
                <Select
                  value={resetFrequency}
                  onValueChange={setResetFrequency}
                  options={[
                    { label: 'Annual (Every Financial Year)', value: 'ANNUAL_FY' },
                    { label: 'Monthly Reset', value: 'MONTHLY' },
                    { label: 'Never (Continuous)', value: 'NEVER' },
                  ]}
                />
              </FormField>
            </div>

            <div className="p-3 rounded-xl bg-status-info-subtle border border-default flex items-center justify-between">
              <span className="text-xs font-bold text-primary">Live Sample Output:</span>
              <span className="font-mono font-black text-sm text-status-info-text">
                {previewFormatted}
              </span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submitting}>
                Save Series
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

