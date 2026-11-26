'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ReportPage,
  DataTable,
  MoneyText,
  Badge,
  Card,
  CardContent,
  Input,
  Button,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { ShareDialog } from '../share-dialog';

export default function TrialBalancePage() {
  const { activeCompanyId } = useCompany();
  const [data, setData] = useState<any | null>(null);
  const [prevData, setPrevData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedNature, setSelectedNature] = useState('ALL');
  const [compareMode, setCompareMode] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const loadTrialBalance = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getTrialBalance(activeCompanyId, asOfDate);
      setData(res);
      if (compareMode) {
        const prevD = new Date(asOfDate);
        prevD.setMonth(prevD.getMonth() - 1);
        const prevRes = await apiClient.getTrialBalance(activeCompanyId, prevD.toISOString().split('T')[0]);
        setPrevData(prevRes);
      } else {
        setPrevData(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Trial Balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrialBalance();
  }, [asOfDate, activeCompanyId, compareMode]);

  useEffect(() => {
    if (!activeCompanyId) return;
    apiClient
      .getReportsCatalog(activeCompanyId)
      .then((items) => {
        const match = items?.find((it: any) => it.reportKey === 'TRIAL_BALANCE');
        if (match) setIsFavorite(Boolean(match.isFavorite));
      })
      .catch(() => {});
  }, [activeCompanyId]);

  const rows = useMemo(() => {
    const base = data?.rows || [];
    return base.filter((r: any) => selectedNature === 'ALL' || r.nature === selectedNature);
  }, [data, selectedNature]);

  const prevByCode = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of prevData?.rows || []) map.set(r.ledgerCode, r);
    return map;
  }, [prevData]);

  const columns: ColumnDef<any>[] = [
    { key: 'ledgerCode', header: 'Code', cell: (r) => <span className="font-mono text-caption text-muted">{r.ledgerCode}</span> },
    {
      key: 'ledgerName',
      header: 'Ledger Account',
      sortable: true,
      cell: (r) => (
        <Link href={`/reports/general-ledger?ledgerId=${r.ledgerId}`} className="font-medium text-brand-text hover:underline">
          {r.ledgerName}
        </Link>
      ),
    },
    { key: 'groupName', header: 'Group', cell: (r) => <Badge variant="neutral" size="xs">{r.groupName}</Badge> },
    { key: 'closingDebit', header: 'Closing Dr', align: 'right', sortable: true, cell: (r) => <MoneyText amount={r.closingDebit || 0} /> },
    { key: 'closingCredit', header: 'Closing Cr', align: 'right', sortable: true, cell: (r) => <MoneyText amount={r.closingCredit || 0} /> },
    ...(compareMode
      ? [
          {
            key: 'prevPeriod',
            header: 'Prev Month Net',
            align: 'right' as const,
            cell: (r: any) => {
              const pr = prevByCode.get(r.ledgerCode);
              const net = pr ? Number(pr.closingDebit || 0) - Number(pr.closingCredit || 0) : 0;
              return <MoneyText amount={net} negative={net < 0} />;
            },
          },
        ]
      : []),
  ];

  const handleExportCSV = () => {
    if (!data) return;
    const headers = ['Code', 'Ledger', 'Group', 'Nature', 'Closing Dr', 'Closing Cr'];
    const csv = [
      headers.join(','),
      ...rows.map((r: any) => [r.ledgerCode, `"${r.ledgerName}"`, `"${r.groupName}"`, r.nature, r.closingDebit, r.closingCredit].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Trial_Balance_${asOfDate}.csv`;
    a.click();
  };

  return (
    <>
      <ReportPage
        title="Trial Balance"
        description="Closing debit & credit balances across all active chart of accounts ledgers."
        isFavorite={isFavorite}
        onToggleFavorite={async () => {
          setIsFavorite((v) => !v);
          await apiClient.toggleFavoriteReport(activeCompanyId, 'TRIAL_BALANCE').catch(() => {});
        }}
        compareMode={compareMode}
        onToggleCompare={() => setCompareMode((v) => !v)}
        onExportExcel={handleExportCSV}
        onPrintPdf={() => window.print()}
        onShare={() => setShareOpen(true)}
        loading={loading}
        error={error}
        onRetry={loadTrialBalance}
        isEmpty={rows.length === 0}
        dateControls={
          <>
            <label className="text-caption font-semibold text-secondary flex items-center gap-2">
              As of
              <Input type="date" size="sm" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-40" />
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'] as const).map((n) => (
                <Button key={n} size="xs" variant={selectedNature === n ? 'primary' : 'outline'} onClick={() => setSelectedNature(n)}>
                  {n}
                </Button>
              ))}
            </div>
          </>
        }
        summary={
          data && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card><CardContent className="p-4"><div className="text-caption text-muted">Total Closing Debit</div><div className="mt-1 text-h2"><MoneyText amount={data.totalClosingDebit || 0} align="left" /></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-caption text-muted">Total Closing Credit</div><div className="mt-1 text-h2"><MoneyText amount={data.totalClosingCredit || 0} align="left" /></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-caption text-muted">Reconciliation</div><div className="mt-1"><Badge variant={data.isBalanced ? 'success' : 'danger'} size="sm">{data.isBalanced ? 'Balanced (Dr = Cr)' : `Diff: ${data.netDifference}`}</Badge></div></CardContent></Card>
            </div>
          )
        }
      >
        <DataTable columns={columns} data={rows} stickyHeader />
      </ReportPage>

      <ShareDialog
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        companyId={activeCompanyId}
        reportKey="TRIAL_BALANCE"
        reportTitle="Trial Balance"
        filters={{ asOfDate }}
      />
    </>
  );
}
