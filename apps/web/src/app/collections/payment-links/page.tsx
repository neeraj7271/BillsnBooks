'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Badge,
  DataTable,
  Card,
  type ColumnDef,
} from '@platform/ui';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Scale,
  Copy,
  ExternalLink,
  CheckCircle2,
  Clock,
  QrCode as QrIcon,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { CreateLinkDialog } from './create-link-dialog';
import { ReconcileSettlementDialog } from './reconcile-settlement-dialog';
import { UpiQrDialog } from './upi-qr-dialog';
import {
  PaymentLinkStatus,
  type PaymentLinkDto,
  type GatewaySettlementDto,
} from '@platform/shared-types';

export default function PaymentLinksPage() {
  const { activeCompanyId } = useCompany();
  const [links, setLinks] = useState<PaymentLinkDto[]>([]);
  const [settlements, setSettlements] = useState<GatewaySettlementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openSettleModal, setOpenSettleModal] = useState(false);
  const [selectedQrLink, setSelectedQrLink] = useState<PaymentLinkDto | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lData, sData] = await Promise.all([
        apiClient.listPaymentLinks(activeCompanyId),
        apiClient.listGatewaySettlements(activeCompanyId),
      ]);
      setLinks(lData || []);
      setSettlements(sData || []);
    } catch (err: unknown) {
      console.error('Failed to load payment links & settlements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCompanyId]);

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSimulatePayment = async (link: PaymentLinkDto) => {
    setActionLoadingId(link.id);
    try {
      await apiClient.simulatePaymentCallback(undefined, link.linkId);
      await loadData();
    } catch (err: unknown) {
      console.error('Payment callback failed', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatInr = (val: string | number) =>
    Number(val || 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    });

  const linkColumns: ColumnDef<PaymentLinkDto>[] = [
    {
      header: 'Invoice & Customer',
      key: 'invoiceNumber',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white">
            {row.invoiceNumber || 'INV-DIRECT'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {row.partyName || 'Customer'}
          </div>
        </div>
      ),
    },
    {
      header: 'Amount',
      key: 'amount',
      cell: (row) => (
        <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
          {formatInr(row.amount)}
        </span>
      ),
    },
    {
      header: 'Gateway',
      key: 'provider',
      cell: (row) => (
        <Badge variant="neutral" size="sm">
          {row.provider}
        </Badge>
      ),
    },
    {
      header: 'Payment Link',
      key: 'shortUrl',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-blue-600 dark:text-blue-400 truncate max-w-[160px]">
            {row.shortUrl}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(row.shortUrl, row.id)}
            className="h-6 w-6 p-0"
          >
            {copiedId === row.id ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            ) : (
              <Copy className="h-3 w-3 text-slate-400" />
            )}
          </Button>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      cell: (row) => (
        <Badge
          variant={row.status === PaymentLinkStatus.PAID ? 'success' : 'brand'}
          size="sm"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Action',
      key: 'id',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedQrLink(row)}
            className="h-7 px-2 text-xs gap-1 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
            title="Scan UPI QR Code"
          >
            <QrIcon className="h-3 w-3" />
            <span>QR</span>
          </Button>

          {row.status === PaymentLinkStatus.CREATED ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSimulatePayment(row)}
              loading={actionLoadingId === row.id}
              leftIcon={<CreditCard className="h-3 w-3 text-emerald-600" />}
              className="h-7 text-xs"
            >
              Simulate Pay
            </Button>
          ) : (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Paid
            </span>
          )}
        </div>
      ),
    },
  ];

  const settlementColumns: ColumnDef<GatewaySettlementDto>[] = [
    {
      header: 'Settlement ID & Date',
      key: 'settlementId',
      cell: (row) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">
            {row.settlementId}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {row.settlementDate} • {row.provider}
          </div>
        </div>
      ),
    },
    {
      header: 'Gross Collections',
      key: 'grossAmount',
      cell: (row) => (
        <span className="font-bold text-slate-900 dark:text-white tabular-nums text-xs">
          {formatInr(row.grossAmount)}
        </span>
      ),
    },
    {
      header: 'Fee & GST',
      key: 'feeAmount',
      cell: (row) => (
        <span className="text-rose-600 dark:text-rose-400 font-medium tabular-nums text-xs">
          -{formatInr(Number(row.feeAmount) + Number(row.taxOnFee))}
        </span>
      ),
    },
    {
      header: 'Net Bank Payout',
      key: 'netCreditAmount',
      cell: (row) => (
        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums text-xs">
          {formatInr(row.netCreditAmount)}
        </span>
      ),
    },
    {
      header: 'Bank Ref (UTR)',
      key: 'bankReference',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {row.bankReference || '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      cell: (row) => (
        <Badge variant="success" size="sm">
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Payment Links & Gateway Settlements
            </h1>
            <Badge variant="brand" size="sm">Collections</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Instant UPI & Card payment links with automated gross vs fee vs net double-entry reconciliations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            loading={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenSettleModal(true)}
            leftIcon={<Scale className="h-3.5 w-3.5" />}
          >
            Reconcile Payout
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setOpenCreateModal(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Generate Link
          </Button>
        </div>
      </div>

      {/* Payment Links Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Active & Settled Payment Links
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {links.length} total generated
          </span>
        </div>
        <DataTable
          columns={linkColumns}
          data={links}
          loading={loading}
          emptyTitle="No Payment Links"
          emptyDescription="Click 'Generate Link' to send an instant payment request."
        />
      </div>

      {/* Gateway Settlement Reconciliation Log */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Gateway Settlement Ledger Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Balanced canonical vouchers booked into Bank, Gateway Clearing, and Processing Charges
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {settlements.length} reconciled payouts
          </span>
        </div>
        <DataTable
          columns={settlementColumns}
          data={settlements}
          loading={loading}
          emptyTitle="No Settlements Logged"
          emptyDescription="Click 'Reconcile Payout' to record and post a gateway settlement voucher."
        />
      </div>

      {/* Dialogs */}
      <CreateLinkDialog
        open={openCreateModal}
        onOpenChange={setOpenCreateModal}
        onSuccess={loadData}
      />
      <ReconcileSettlementDialog
        open={openSettleModal}
        onOpenChange={setOpenSettleModal}
        onSuccess={loadData}
      />
      <UpiQrDialog
        open={!!selectedQrLink}
        onOpenChange={(open) => !open && setSelectedQrLink(null)}
        paymentLink={selectedQrLink}
      />
    </div>
  );
}
