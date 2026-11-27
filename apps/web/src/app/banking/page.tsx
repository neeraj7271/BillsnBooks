'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
  Landmark,
  Plus,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  Button,
  Badge,
  DataTable,
  MoneyText,
  DateText,
  Card,
  CardContent,
  EmptyState,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { UploadStatementDialog } from './upload-statement-dialog';
import { NewAccountDialog } from './new-account-dialog';

interface BankTxn {
  id: string;
  transactionDate: string;
  description: string;
  referenceNumber?: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reconciliationStatus: 'MATCHED' | 'UNMATCHED';
}

export default function BankingOverviewPage() {
  const { activeCompanyId } = useCompany();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [brs, setBrs] = useState<any>(null);
  const [transactions, setTransactions] = useState<BankTxn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { page, pageSize, setPage, setPageSize } = useTablePagination({
    storageKey: 'banking',
    defaultPageSize: 25,
  });

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newAccModalOpen, setNewAccModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const accList = await apiClient.listBankAccounts(activeCompanyId);
      setAccounts(accList || []);
      const activeId = (selectedAccountId && accList?.some((a: any) => a.id === selectedAccountId))
        ? selectedAccountId
        : (accList?.[0]?.id || '');
      setSelectedAccountId(activeId);

      if (activeId) {
        const [brsData, txnsData] = await Promise.all([
          apiClient.getBRSSummary(activeId).catch(() => null),
          apiClient.listBankTransactions(activeId, statusFilter),
        ]);
        setBrs(brsData);
        setTransactions(txnsData || []);
      } else {
        setBrs(null);
        setTransactions([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch banking details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAccountId, statusFilter, activeCompanyId]);

  const columns: ColumnDef<BankTxn>[] = [
    {
      key: 'transactionDate',
      header: 'Value Date',
      width: '110px',
      cell: (tx) => <DateText date={tx.transactionDate} />,
    },
    {
      key: 'description',
      header: 'Narrative & Reference',
      cell: (tx) => (
        <div>
          <div className="font-semibold text-primary">{tx.description}</div>
          {tx.referenceNumber && <div className="font-mono text-[10px] text-muted">Ref: {tx.referenceNumber}</div>}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (tx) => (
        <MoneyText
          amount={tx.amount}
          className={tx.type === 'CREDIT' ? 'text-status-success-text font-bold' : 'text-primary font-bold'}
        />
      ),
    },
    {
      key: 'reconciliationStatus',
      header: 'Status',
      align: 'center',
      cell: (tx) => (
        <Badge variant={tx.reconciliationStatus === 'MATCHED' ? 'success' : 'warning'} size="xs" dot>
          {tx.reconciliationStatus}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-primary">
              Institutional Banking & BRS
            </h1>
            <Badge variant="brand" size="sm">Automated Feed</Badge>
          </div>
          <p className="mt-1 text-sm text-secondary">
            Statement ingestion and 2-way bank reconciliation against general ledger cash books.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setNewAccModalOpen(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            Add Account
          </Button>
          <Button variant="outline" size="sm" onClick={() => setUploadModalOpen(true)} leftIcon={<UploadCloud className="h-3.5 w-3.5" />}>
            Import Feed
          </Button>
          {selectedAccountId && (
            <Button variant="primary" size="sm" asChild rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
              <Link href={`/banking/${selectedAccountId}/reconcile`}>Reconcile</Link>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-status-danger-subtle border border-subtle text-xs text-status-danger-text font-medium">
          {error}
        </div>
      )}

      {/* Account Selector Cards */}
      {accounts.length === 0 && !loading ? (
        <EmptyState
          icon={<Landmark className="h-6 w-6 text-muted" />}
          title="No bank accounts"
          description="Add a bank account to upload statements and reconcile."
          action={{ label: 'Add Bank Account', onClick: () => setNewAccModalOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          return (
            <Card
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-focus-ring border-focus' : 'hover:border-strong'}`}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-brand-text" />
                    <span className="font-bold text-xs text-primary">{acc.bankName}</span>
                  </div>
                  <Badge variant={isSelected ? 'brand' : 'neutral'} size="xs">{acc.accountType}</Badge>
                </div>
                <div className="font-mono text-[11px] text-secondary">A/C: {acc.accountNumber}</div>
                <div className="pt-2 border-t border-subtle flex justify-between items-baseline">
                  <span className="text-[11px] text-muted">Ledger Balance:</span>
                  <MoneyText amount={acc.currentBalance || 0} className="font-bold text-sm" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}

      {/* Transactions Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
            Statement Transactions ({transactions.length})
          </h3>
          <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-xl">
            {['ALL', 'MATCHED', 'UNMATCHED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === st
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={transactions}
          loading={loading}
          page={page}
          pageSize={pageSize}
          totalItems={transactions.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          storageKey="banking"
          isFiltered={statusFilter !== 'ALL'}
          onClearFilters={() => setStatusFilter('ALL')}
          emptyTitle="No statement transactions"
          emptyDescription="Upload an MT940 or CSV bank feed to begin reconciliation."
        />
      </div>

      <UploadStatementDialog
        open={uploadModalOpen}
        accountId={selectedAccountId}
        onOpenChange={setUploadModalOpen}
        onSuccess={() => loadData()}
      />

      <NewAccountDialog
        open={newAccModalOpen}
        companyId={activeCompanyId}
        onOpenChange={setNewAccModalOpen}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
