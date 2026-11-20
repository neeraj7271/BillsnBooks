'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, RefreshCw, Compass } from 'lucide-react';
import {
  Button,
  Badge,
  DataTable,
  MoneyText,
  DateText,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { ConversionDialog } from './conversion-dialog';

interface Ticket {
  id: string;
  source: string;
  status: 'OPEN' | 'CONVERTED' | 'DISMISSED';
  suggestedAction: string;
  confidenceScore: number;
  transaction?: {
    transactionDate: string;
    description: string;
    amount: number;
    extractedPartyName?: string;
  };
}

export default function SalesDiscoveryCockpitPage() {
  const { activeCompanyId } = useCompany();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketsData, ledgersData] = await Promise.all([
        apiClient.listDiscoveryTickets(statusFilter),
        apiClient.listLedgers(activeCompanyId),
      ]);
      setTickets(ticketsData || []);
      setLedgers(ledgersData || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tickets';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, activeCompanyId]);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.scanDiscoveryTickets();
      setSuccess(`Scan complete: Discovered ${res.createdCount} unbilled deposit(s).`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Discovery scan failed';
      setError(msg);
    } finally {
      setScanning(false);
    }
  };

  const columns: ColumnDef<Ticket>[] = [
    {
      key: 'date',
      header: 'Deposit Date',
      width: '110px',
      cell: (t) => <DateText date={t.transaction?.transactionDate} />,
    },
    {
      key: 'party',
      header: 'Extracted Entity & Narrative',
      cell: (t) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white">
            {t.transaction?.extractedPartyName || 'Unknown Depositor'}
          </div>
          <div className="text-[11px] text-slate-400">{t.transaction?.description}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (t) => <MoneyText amount={t.transaction?.amount || 0} className="font-bold text-emerald-600 dark:text-emerald-400" />,
    },
    {
      key: 'confidence',
      header: 'Confidence',
      align: 'center',
      cell: (t) => (
        <Badge variant={t.confidenceScore > 80 ? 'success' : 'brand'} size="xs">
          {t.confidenceScore}% AI Confidence
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (t) => (
        <Badge variant={t.status === 'CONVERTED' ? 'success' : 'warning'} size="xs" dot>
          {t.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      cell: (t) =>
        t.status === 'OPEN' ? (
          <Button
            variant="primary"
            size="xs"
            onClick={() => {
              setActiveTicket(t);
              setConvertModalOpen(true);
            }}
            leftIcon={<Sparkles className="h-3 w-3" />}
          >
            Convert
          </Button>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Reconciled</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon-sm" asChild aria-label="Back to banking">
            <Link href="/banking">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Unbilled Deposits & Sales Discovery
              </h1>
              <Badge variant="brand" size="sm">Rule-Engine</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Heuristic detector flagging incoming bank credits without matching customer invoices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleScan} loading={scanning} leftIcon={<Compass className="h-3.5 w-3.5" />}>
            Run Discovery Scan
          </Button>
        </div>
      </div>

      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs text-emerald-700 font-medium">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs text-rose-600 font-medium">
          {error}
        </div>
      )}

      {/* Filter and Table */}
      <div className="space-y-3">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          {['ALL', 'OPEN', 'CONVERTED'].map((st) => (
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

        <DataTable
          columns={columns}
          data={tickets}
          loading={loading}
          emptyTitle="No discovery tickets found"
          emptyDescription="Run a discovery scan on new statement uploads to identify unbilled deposits."
        />
      </div>

      <ConversionDialog
        open={convertModalOpen}
        ticket={activeTicket}
        ledgers={ledgers}
        onOpenChange={setConvertModalOpen}
        onSuccess={(msg) => {
          setSuccess(msg);
          loadData();
        }}
      />
    </div>
  );
}
