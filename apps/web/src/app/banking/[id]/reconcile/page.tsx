'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button, Badge, LoadingState } from '@platform/ui';
import { BackButton } from '@/components/back-button';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { BankStatementFeed } from './bank-statement-feed';
import { MatchCandidates } from './match-candidates';

function ReconciliationWorkbenchContent() {
  const { activeCompanyId } = useCompany();
  const params = useParams();
  const searchParams = useSearchParams();
  const bankAccountId = params.id as string;
  const initialTxnId = searchParams.get('txnId');

  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<'UNMATCHED' | 'MATCHED' | 'ALL'>('UNMATCHED');

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listBankTransactions(bankAccountId, filter);
      setTransactions(data || []);

      if (data && data.length > 0) {
        const found = initialTxnId ? data.find((t: any) => t.id === initialTxnId) : data[0];
        setSelectedTxn(found || data[0]);
      } else {
        setSelectedTxn(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load transactions';
      setActionError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [bankAccountId, filter]);

  useEffect(() => {
    if (!selectedTxn || selectedTxn.matchStatus === 'MATCHED') {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    setActionError(null);
    apiClient
      .getMatchSuggestions(selectedTxn.id)
      .then((s) => setSuggestions(s || []))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to fetch suggestions';
        setActionError(msg);
      })
      .finally(() => setLoadingSuggestions(false));
  }, [selectedTxn?.id]);

  const handleMatch = async (voucherId: string) => {
    if (!selectedTxn) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await apiClient.matchTransaction(selectedTxn.id, voucherId);
      setActionSuccess('Transaction successfully reconciled!');
      await loadTransactions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reconciliation match failed';
      setActionError(msg);
    }
  };

  const handleUnmatch = async () => {
    if (!selectedTxn) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await apiClient.unmatchTransaction(selectedTxn.id);
      setActionSuccess('Reconciliation link unlinked successfully.');
      await loadTransactions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to unlink match';
      setActionError(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <BackButton variant="link" fallbackUrl="/banking" label="Back to banking" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-primary">
                Bank Reconciliation Workbench (BRS)
              </h1>
              <Badge variant="brand" size="sm">2-Way Match</Badge>
            </div>
            <p className="text-xs text-secondary">
              Interactive matching engine comparing statement feeds against general ledger cash vouchers.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={loadTransactions} loading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
          Refresh Feed
        </Button>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-status-success-subtle border border-subtle text-xs text-status-success-text font-medium">
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-xl bg-status-danger-subtle border border-subtle text-xs text-status-danger-text font-medium">
          {actionError}
        </div>
      )}

      {loading ? (
        <LoadingState rows={8} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <BankStatementFeed
              transactions={transactions}
              selectedTxnId={selectedTxn?.id || null}
              filter={filter}
              onFilterChange={setFilter}
              onSelectTxn={setSelectedTxn}
            />
          </div>

          <div className="lg:col-span-7">
            <MatchCandidates
              selectedTxn={selectedTxn}
              suggestions={suggestions}
              loadingSuggestions={loadingSuggestions}
              onMatch={handleMatch}
              onUnmatch={handleUnmatch}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReconciliationWorkbenchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 space-y-4">
          <LoadingState rows={8} />
        </div>
      }
    >
      <ReconciliationWorkbenchContent />
    </Suspense>
  );
}
