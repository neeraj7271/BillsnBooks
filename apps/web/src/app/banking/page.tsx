'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { UploadCloud, Landmark, Plus, ChevronRight } from 'lucide-react';
import {
  ListPage,
  Button,
  Badge,
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
  const [transactions, setTransactions] = useState<BankTxn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newAccModalOpen, setNewAccModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const accList = await apiClient.listBankAccounts(activeCompanyId);
      setAccounts(accList || []);
      const activeId =
        selectedAccountId && accList?.some((a: any) => a.id === selectedAccountId)
          ? selectedAccountId
          : accList?.[0]?.id || '';
      setSelectedAccountId(activeId);

      if (activeId) {
        const txnsData = await apiClient.listBankTransactions(activeId, statusFilter);
        setTransactions(txnsData || []);
      } else {
        setTransactions([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch banking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAccountId, statusFilter, activeCompanyId]);

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      tx.description.toLowerCase().includes(q) ||
      (tx.referenceNumber && tx.referenceNumber.toLowerCase().includes(q))
    );
  });

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
          <div className="font-medium text-primary">{tx.description}</div>
          {tx.referenceNumber && (
            <div className="font-mono text-caption text-muted">Ref: {tx.referenceNumber}</div>
          )}
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
          className={
            tx.type === 'CREDIT'
              ? 'text-status-success-text font-semibold'
              : 'text-primary font-semibold'
          }
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
    <>
      <ListPage<BankTxn>
        header={{
          title: 'Banking & BRS',
          subtitle: 'Statement ingestion and 2-way bank reconciliation against general ledger cash books.',
          badge: <Badge variant="brand" size="sm">Automated Feed</Badge>,
          actions: (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewAccModalOpen(true)}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Add Account
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadModalOpen(true)}
                leftIcon={<UploadCloud className="h-3.5 w-3.5" />}
              >
                Import Feed
              </Button>
              {selectedAccountId && (
                <Button
                  variant="primary"
                  size="sm"
                  asChild
                  rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                >
                  <Link href={`/banking/${selectedAccountId}/reconcile`}>Reconcile</Link>
                </Button>
              )}
            </div>
          ),
        }}
        kpis={
          accounts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const isSelected = acc.id === selectedAccountId;
                return (
                  <Card
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-focus-ring border-focus' : 'hover:border-strong'
                    }`}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4 text-brand-text" />
                          <span className="font-semibold text-xs text-primary">{acc.bankName}</span>
                        </div>
                        <Badge variant={isSelected ? 'brand' : 'neutral'} size="xs">
                          {acc.accountType}
                        </Badge>
                      </div>
                      <div className="font-mono text-caption text-muted">A/C: {acc.accountNumber}</div>
                      <div className="pt-2 border-t border-border-subtle flex justify-between items-baseline">
                        <span className="text-caption text-muted">Ledger Balance:</span>
                        <MoneyText amount={acc.currentBalance || 0} className="font-semibold text-sm" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : undefined
        }
        toolbar={{
          searchValue: searchTerm,
          onSearchChange: setSearchTerm,
          searchPlaceholder: 'Search statement description or reference...',
          filters: (
            <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-lg">
              {['ALL', 'MATCHED', 'UNMATCHED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    statusFilter === st
                      ? 'bg-surface text-primary shadow-xs'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          ),
        }}
        columns={columns}
        data={filteredTransactions}
        loading={loading}
        error={error}
        onRetry={loadData}
        empty={{
          title: 'No statement transactions',
          description: 'Upload an MT940 or CSV bank feed to begin reconciliation.',
        }}
        tableProps={{ stickyHeader: true }}
      />

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
    </>
  );
}
