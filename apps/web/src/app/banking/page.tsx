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
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
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
          <div className="font-semibold text-slate-900 dark:text-white">{tx.description}</div>
          {tx.referenceNumber && <div className="font-mono text-[10px] text-slate-400">Ref: {tx.referenceNumber}</div>}
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
          className={tx.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-900 dark:text-white font-bold'}
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
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Institutional Banking & BRS
            </h1>
            <Badge variant="brand" size="sm">Automated Feed</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs text-rose-600 font-medium">
          {error}
        </div>
      )}

      {/* Account Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          return (
            <Card
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-slate-300'}`}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{acc.bankName}</span>
                  </div>
                  <Badge variant={isSelected ? 'brand' : 'neutral'} size="xs">{acc.accountType}</Badge>
                </div>
                <div className="font-mono text-[11px] text-slate-500">A/C: {acc.accountNumber}</div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                  <span className="text-[11px] text-slate-400">Ledger Balance:</span>
                  <MoneyText amount={acc.currentBalance || 0} className="font-bold text-sm" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Transactions Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Statement Transactions ({transactions.length})
          </h3>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {['ALL', 'MATCHED', 'UNMATCHED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
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
