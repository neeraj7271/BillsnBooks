'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import {
  Select,
  Input,
  MoneyText,
  DateText,
  Badge,
  Card,
  CardContent,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { BackButton } from '@/components/back-button';

function GeneralLedgerContent() {
  const searchParams = useSearchParams();
  const paramLedgerId = searchParams.get('ledgerId');
  const paramPartyName = searchParams.get('partyName');

  const { activeCompanyId } = useCompany();
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('');
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>('2024-04-01');
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]!);

  useEffect(() => {
    apiClient
      .listLedgers(activeCompanyId)
      .then((data) => {
        const list = data || [];
        setLedgers(list);
        if (list.length > 0) {
          let targetId = '';
          if (paramLedgerId && list.some((l: any) => l.id === paramLedgerId)) {
            targetId = paramLedgerId;
          } else if (paramPartyName) {
            const cleanParty = paramPartyName.toLowerCase().trim();
            const match = list.find((l: any) => l.name.toLowerCase().includes(cleanParty));
            if (match) targetId = match.id;
          }
          setSelectedLedgerId(targetId || list[0].id);
        } else {
          setSelectedLedgerId('');
          setReport(null);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to list ledgers';
        setError(msg);
      });
  }, [activeCompanyId, paramLedgerId, paramPartyName]);

  const loadReport = async () => {
    if (!selectedLedgerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getGeneralLedger(
        activeCompanyId,
        selectedLedgerId,
        fromDate,
        toDate
      );
      setReport(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch general ledger report';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedLedgerId, fromDate, toDate]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <BackButton fallbackUrl="/reports" label="Back" />
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                General Ledger Account Statement
              </h1>
              <Badge variant="brand" size="sm">Audit Trail</Badge>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Chronological audit trail of all debit and credit entries with real-time running balances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-56">
            <Select
              size="sm"
              value={selectedLedgerId}
              onValueChange={setSelectedLedgerId}
              options={ledgers.map((l) => ({
                label: `${l.name} (${l.code})`,
                value: l.id,
              }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              size="sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-36"
            />
            <span className="text-xs text-slate-400">to</span>
            <Input
              type="date"
              size="sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-36"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900 flex items-center gap-3 text-rose-700 dark:text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="text-sm font-semibold">{error}</div>
        </div>
      )}

      {/* Account Info Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Code & Name</div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-1 truncate">
                {report.ledger?.name || 'Selected Account'}
              </div>
              <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {report.ledger?.code}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Opening Balance</div>
              <div className="mt-1">
                <MoneyText
                  amount={report.openingBalance || 0}
                  showDrCr
                  colorCode="dr-cr"
                  className="text-base font-black"
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">As of {fromDate}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Period Net Movement</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xs text-slate-500">Dr:</span>
                <span className="font-mono text-xs font-bold text-emerald-600">
                  ₹{Number(report.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-500 ml-1">Cr:</span>
                <span className="font-mono text-xs font-bold text-blue-600">
                  ₹{Number(report.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Total {report.entries?.length || 0} line entries</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Closing Balance</div>
              <div className="mt-1">
                <MoneyText
                  amount={report.closingBalance || 0}
                  showDrCr
                  colorCode="dr-cr"
                  className="text-base font-black"
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">As of {toDate}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ledger Entries Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-500">
                  <th className="py-2.5 px-4 font-bold uppercase tracking-wider w-24">Date</th>
                  <th className="py-2.5 px-4 font-bold uppercase tracking-wider w-36">Voucher #</th>
                  <th className="py-2.5 px-4 font-bold uppercase tracking-wider w-24">Type</th>
                  <th className="py-2.5 px-4 font-bold uppercase tracking-wider">Particulars / Narration</th>
                  <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-right w-32">Debit (Dr)</th>
                  <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-right w-32">Credit (Cr)</th>
                  <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-right w-36">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Opening Balance Row */}
                <tr className="bg-slate-50/40 dark:bg-slate-900/20 font-semibold text-slate-600 dark:text-slate-400">
                  <td className="py-2 px-4 font-mono text-[11px]">{fromDate}</td>
                  <td className="py-2 px-4 font-mono text-[11px] text-slate-400">—</td>
                  <td className="py-2 px-4">
                    <Badge variant="neutral" size="xs">OPN</Badge>
                  </td>
                  <td className="py-2 px-4 italic">Opening Balance b/f</td>
                  <td className="py-2 px-4 text-right">—</td>
                  <td className="py-2 px-4 text-right">—</td>
                  <td className="py-2 px-4 text-right font-mono font-bold">
                    <MoneyText amount={report?.openingBalance || 0} showDrCr colorCode="dr-cr" />
                  </td>
                </tr>

                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      Loading general ledger transactions...
                    </td>
                  </tr>
                ) : !report?.entries || report.entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 italic">
                      No posted transactions recorded for this account in the selected date range.
                    </td>
                  </tr>
                ) : (
                  report.entries.map((entry: any, idx: number) => {
                    const isDebit = entry.entryType === 'DEBIT';
                    return (
                      <tr
                        key={entry.id || idx}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition"
                      >
                        <td className="py-2 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {entry.voucherDate ? String(entry.voucherDate).split('T')[0] : '—'}
                        </td>
                        <td className="py-2 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {entry.voucherNumber || '—'}
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant="neutral" size="xs">
                            {entry.voucherType || 'VOUCHER'}
                          </Badge>
                        </td>
                        <td className="py-2 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {entry.particulars || entry.narration || 'Journal Entry'}
                          </div>
                          {entry.lineNarration && entry.lineNarration !== entry.particulars && (
                            <div className="text-[11px] text-slate-400">{entry.lineNarration}</div>
                          )}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {isDebit ? `₹${Number(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          {!isDebit ? `₹${Number(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-bold">
                          <MoneyText
                            amount={entry.runningBalance || 0}
                            showDrCr
                            colorCode="dr-cr"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Closing Balance Row */}
                {report && (
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                    <td className="py-2.5 px-4 font-mono text-[11px]">{toDate}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">—</td>
                    <td className="py-2.5 px-4">
                      <Badge variant="brand" size="xs">CLS</Badge>
                    </td>
                    <td className="py-2.5 px-4 font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Closing Balance c/f
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-600">
                      ₹{Number(report.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-blue-600">
                      ₹{Number(report.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black">
                      <MoneyText amount={report.closingBalance || 0} showDrCr colorCode="dr-cr" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GeneralLedgerPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-slate-400">
          Loading General Ledger...
        </div>
      }
    >
      <GeneralLedgerContent />
    </Suspense>
  );
}
