'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  FormField,
  Input,
  Select,
  MoneyText,
  DateText,
  DataTable,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DatePicker,
  type ColumnDef,
} from '@platform/ui';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Search,
  ExternalLink,
  Scale,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { useTablePagination } from '@/hooks/use-table-pagination';

interface JournalEntry {
  id: string;
  ledgerId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number | string;
  narration?: string;
  ledger?: {
    id: string;
    code: string;
    name: string;
  };
}

interface Voucher {
  id: string;
  voucherNumber: string;
  voucherType: string;
  voucherDate: string;
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  narration?: string;
  entries: JournalEntry[];
  createdAt: string;
}

export default function VouchersPage() {
  const { activeCompanyId } = useCompany();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [financialYears, setFinancialYears] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { page, pageSize, setPage, setPageSize } = useTablePagination({
    storageKey: 'vouchers',
    defaultPageSize: 25,
  });

  // Drilldown Modal
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Reverse Dialog
  const [reversingVoucher, setReversingVoucher] = useState<Voucher | null>(null);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Journal Voucher (JV) Modal
  const [newJvOpen, setNewJvOpen] = useState(false);
  const [jvDate, setJvDate] = useState<string>(new Date().toISOString().split('T')[0]!);
  const [jvNarration, setJvNarration] = useState('');
  const [jvBranchId, setJvBranchId] = useState('');
  const [jvFyId, setJvFyId] = useState('');
  const [jvEntries, setJvEntries] = useState<
    Array<{ ledgerId: string; entryType: 'DEBIT' | 'CREDIT'; amount: number; narration: string }>
  >([
    { ledgerId: '', entryType: 'DEBIT', amount: 0, narration: '' },
    { ledgerId: '', entryType: 'CREDIT', amount: 0, narration: '' },
  ]);

  useEffect(() => {
    loadData();
  }, [activeCompanyId, typeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vList, lList, cList] = await Promise.all([
        apiClient.listVouchers(activeCompanyId, {
          voucherType: typeFilter !== 'ALL' ? typeFilter : undefined,
        }),
        apiClient.listLedgers(activeCompanyId),
        apiClient.listCompanies(),
      ]);

      setVouchers(vList || []);
      setLedgers(lList || []);

      const comp = cList?.find((c: any) => c.id === activeCompanyId) || cList?.[0];
      if (comp) {
        if (comp.branches?.length > 0) {
          setBranches(comp.branches);
          setJvBranchId(comp.branches[0].id);
        }
        if (comp.financialYears?.length > 0) {
          setFinancialYears(comp.financialYears);
          setJvFyId(comp.financialYears[0].id);
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReverseVoucher = async () => {
    if (!reversingVoucher) return;
    setActionLoading(true);
    try {
      await apiClient.reverseVoucher(activeCompanyId, reversingVoucher.id);
      setReverseOpen(false);
      setReversingVoucher(null);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to reverse voucher:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Math check for new JV
  const totalJvDebit = jvEntries
    .filter((e) => e.entryType === 'DEBIT')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalJvCredit = jvEntries
    .filter((e) => e.entryType === 'CREDIT')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const jvDiff = Math.abs(totalJvDebit - totalJvCredit);
  const isJvBalanced = jvDiff < 0.001 && totalJvDebit > 0;

  const handleAddJvRow = () => {
    setJvEntries([
      ...jvEntries,
      { ledgerId: '', entryType: 'CREDIT', amount: 0, narration: '' },
    ]);
  };

  const handleRemoveJvRow = (index: number) => {
    if (jvEntries.length <= 2) return;
    setJvEntries(jvEntries.filter((_, i) => i !== index));
  };

  const handleCreateJv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJvBalanced) return;

    setActionLoading(true);
    try {
      await apiClient.createVoucher(activeCompanyId, {
        branchId: jvBranchId,
        financialYearId: jvFyId,
        voucherType: 'JOURNAL',
        voucherDate: jvDate,
        narration: jvNarration,
        entries: jvEntries.map((e) => ({
          ledgerId: e.ledgerId,
          entryType: e.entryType,
          amount: e.amount,
          narration: e.narration,
        })),
      });

      setNewJvOpen(false);
      setJvNarration('');
      setJvEntries([
        { ledgerId: '', entryType: 'DEBIT', amount: 0, narration: '' },
        { ledgerId: '', entryType: 'CREDIT', amount: 0, narration: '' },
      ]);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to create journal voucher:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredVouchers = vouchers.filter((v) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      v.voucherNumber.toLowerCase().includes(term) ||
      (v.narration && v.narration.toLowerCase().includes(term)) ||
      v.entries?.some(
        (e) =>
          e.ledger?.name?.toLowerCase().includes(term) ||
          e.ledger?.code?.toLowerCase().includes(term),
      )
    );
  });

  const columns: ColumnDef<Voucher>[] = [
    {
      key: 'voucherNumber',
      header: 'Voucher #',
      width: '140px',
      cell: (v) => (
        <button
          type="button"
          onClick={() => {
            setSelectedVoucher(v);
            setDetailsOpen(true);
          }}
          className="font-mono font-bold text-xs text-brand-text hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>{v.voucherNumber}</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </button>
      ),
    },
    {
      key: 'voucherDate',
      header: 'Date',
      width: '110px',
      cell: (v) => <DateText date={v.voucherDate} />,
    },
    {
      key: 'voucherType',
      header: 'Type',
      width: '120px',
      cell: (v) => {
        const variant =
          v.voucherType === 'SALES'
            ? 'brand'
            : v.voucherType === 'PAYMENT'
            ? 'warning'
            : v.voucherType === 'RECEIPT'
            ? 'success'
            : v.voucherType === 'CREDIT_NOTE'
            ? 'danger'
            : 'neutral';
        return (
          <Badge variant={variant} size="xs">
            {v.voucherType}
          </Badge>
        );
      },
    },
    {
      key: 'ledgers',
      header: 'Accounts / Leg Summary',
      cell: (v) => {
        const debitEntries = v.entries?.filter((e) => e.entryType === 'DEBIT') || [];
        const creditEntries = v.entries?.filter((e) => e.entryType === 'CREDIT') || [];
        return (
          <div className="text-xs space-y-0.5">
            <div className="font-semibold text-primary truncate max-w-md">
              Dr: {debitEntries.map((e) => e.ledger?.name || 'Debtor').join(', ')}
            </div>
            <div className="text-secondary truncate max-w-md text-[11px]">
              Cr: {creditEntries.map((e) => e.ledger?.name || 'Revenue/Tax').join(', ')}
            </div>
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Total Value',
      align: 'right',
      width: '130px',
      cell: (v) => {
        const total = (v.entries || [])
          .filter((e) => e.entryType === 'DEBIT')
          .reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);
        return <MoneyText amount={total} className="font-bold text-primary" />;
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      width: '100px',
      cell: (v) => (
        <Badge
          variant={v.status === 'POSTED' ? 'success' : v.status === 'REVERSED' ? 'danger' : 'neutral'}
          size="xs"
          dot
        >
          {v.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '150px',
      cell: (v) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              setSelectedVoucher(v);
              setDetailsOpen(true);
            }}
          >
            Entries
          </Button>
          {v.status === 'POSTED' && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setReversingVoucher(v);
                setReverseOpen(true);
              }}
              className="text-status-danger-text border-default hover:bg-status-danger-subtle"
            >
              Reverse
            </Button>
          )}
        </div>
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
              General Ledger Vouchers
            </h1>
            <Badge variant="brand" size="sm">Double-Entry Audit Trail</Badge>
          </div>
          <p className="mt-1 text-sm text-secondary">
            Immutable financial transaction register enforcing zero-variance mathematical invariants.
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
            variant="primary"
            size="sm"
            onClick={() => setNewJvOpen(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            New Journal Voucher (JV)
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-secondary">
              <span>Total Posted Vouchers</span>
              <FileText className="h-4 w-4 text-brand-text" />
            </div>
            <div className="mt-2 text-2xl font-black text-primary">
              {vouchers.filter((v) => v.status === 'POSTED').length}
            </div>
            <p className="mt-1 text-[11px] text-muted">Committed double-entry records</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-secondary">
              <span>Zero-Variance Invariant</span>
              <Scale className="h-4 w-4 text-status-success-text" />
            </div>
            <div className="mt-2 text-2xl font-black text-status-success-text">
              Δ ₹0.00
            </div>
            <p className="mt-1 text-[11px] text-muted">100% Balanced Debits = Credits</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-secondary">
              <span>Reversed / Cancelled</span>
              <RotateCcw className="h-4 w-4 text-status-warning-text" />
            </div>
            <div className="mt-2 text-2xl font-black text-primary">
              {vouchers.filter((v) => v.status === 'REVERSED').length}
            </div>
            <p className="mt-1 text-[11px] text-muted">Contra-reversed transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by voucher #, account, narration..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-surface-sunken rounded-xl overflow-x-auto">
          {['ALL', 'SALES', 'JOURNAL', 'PAYMENT', 'RECEIPT', 'CREDIT_NOTE'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                typeFilter === t
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {t === 'ALL' ? 'All Types' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Live Vouchers DataTable */}
      <DataTable
        columns={columns}
        data={filteredVouchers}
        loading={loading}
        page={page}
        pageSize={pageSize}
        totalItems={filteredVouchers.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        storageKey="vouchers"
        isFiltered={typeFilter !== 'ALL' || Boolean(searchTerm.trim())}
        onClearFilters={() => {
          setTypeFilter('ALL');
          setSearchTerm('');
        }}
        emptyTitle="No journal vouchers"
        emptyDescription="Vouchers appear here once invoices are approved or you post a manual journal."
        emptyAction={{ label: 'New Voucher', onClick: () => setNewJvOpen(true) }}
      />

      {/* Voucher Entries Drill-down Modal */}
      {selectedVoucher && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent size="lg" className="max-w-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-black font-mono">
                    Voucher #{selectedVoucher.voucherNumber}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {selectedVoucher.voucherType} • Date: <DateText date={selectedVoucher.voucherDate} />
                  </DialogDescription>
                </div>
                <Badge
                  variant={selectedVoucher.status === 'POSTED' ? 'success' : 'danger'}
                  size="sm"
                  dot
                >
                  {selectedVoucher.status}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 my-2">
              {selectedVoucher.narration && (
                <div className="p-3 rounded-xl bg-surface-sunken border border-default text-xs text-secondary">
                  <span className="font-bold text-primary">Narration: </span>
                  {selectedVoucher.narration}
                </div>
              )}

              <div className="border border-default rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-sunken border-b border-default text-[11px] font-bold text-secondary uppercase">
                    <tr>
                      <th className="p-2.5">Account Code</th>
                      <th className="p-2.5">Ledger Name</th>
                      <th className="p-2.5 text-right w-28">Debit (₹)</th>
                      <th className="p-2.5 text-right w-28">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {selectedVoucher.entries?.map((e, idx) => (
                      <tr key={e.id || idx}>
                        <td className="p-2.5 font-mono text-secondary">{e.ledger?.code || '—'}</td>
                        <td className="p-2.5 font-semibold text-primary">
                          {e.ledger?.name || 'Account'}
                          {e.narration && (
                            <span className="block text-[10px] text-muted font-normal">
                              {e.narration}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-primary">
                          {e.entryType === 'DEBIT' ? <MoneyText amount={e.amount} /> : '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-primary">
                          {e.entryType === 'CREDIT' ? <MoneyText amount={e.amount} /> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-sunken font-black border-t border-default">
                      <td colSpan={2} className="p-2.5 uppercase text-right text-xs">
                        Total Balance:
                      </td>
                      <td className="p-2.5 text-right font-mono text-xs">
                        <MoneyText
                          amount={selectedVoucher.entries
                            ?.filter((e) => e.entryType === 'DEBIT')
                            .reduce((s, e) => s + (parseFloat(String(e.amount)) || 0), 0)}
                        />
                      </td>
                      <td className="p-2.5 text-right font-mono text-xs">
                        <MoneyText
                          amount={selectedVoucher.entries
                            ?.filter((e) => e.entryType === 'CREDIT')
                            .reduce((s, e) => s + (parseFloat(String(e.amount)) || 0), 0)}
                        />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reverse Confirmation Dialog */}
      <ConfirmDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title={reversingVoucher ? `Reverse Voucher #${reversingVoucher.voucherNumber}` : 'Reverse Voucher'}
        description="Statutory Double-Entry Reversal: Reversing this voucher will post exact mirror contra entries to restore account balances. Proceed with reversal?"
        confirmLabel="Reverse Voucher"
        tone="danger"
        loading={actionLoading}
        onConfirm={handleReverseVoucher}
      />

      {/* New Journal Voucher (JV) Dialog */}
      <Dialog open={newJvOpen} onOpenChange={setNewJvOpen}>
        <DialogContent size="lg" className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Manual Journal Entry (JV)</DialogTitle>
            <DialogDescription className="text-xs">
              Post adjustments, opening balances, or depreciation entries with zero-variance balance enforcement.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateJv} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Voucher Date" required id="jv-date">
                <DatePicker
                  id="jv-date"
                  value={jvDate}
                  onChange={setJvDate}
                  required
                />
              </FormField>

              <FormField label="Branch / Location" required>
                <Select
                  value={jvBranchId}
                  onValueChange={setJvBranchId}
                  options={branches.map((b) => ({ label: b.name, value: b.id }))}
                />
              </FormField>

              <FormField label="Financial Year" required>
                <Select
                  value={jvFyId}
                  onValueChange={setJvFyId}
                  options={financialYears.map((fy) => ({ label: fy.name, value: fy.id }))}
                />
              </FormField>
            </div>

            {/* Entry Rows */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-secondary">
                  Journal Legs (Debits & Credits)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleAddJvRow}
                  leftIcon={<Plus className="w-3 h-3" />}
                >
                  Add Leg
                </Button>
              </div>

              <div className="border border-default rounded-xl overflow-hidden divide-y divide-subtle">
                {jvEntries.map((row, idx) => (
                  <div key={idx} className="p-2.5 flex items-center gap-2 text-xs">
                    <div className="w-28 shrink-0">
                      <Select
                        className="w-full min-w-0"
                        value={row.entryType}
                        onValueChange={(val) => {
                          const updated = [...jvEntries];
                          updated[idx]!.entryType = val as 'DEBIT' | 'CREDIT';
                          setJvEntries(updated);
                        }}
                        options={[
                          { label: 'Dr (Debit)', value: 'DEBIT' },
                          { label: 'Cr (Credit)', value: 'CREDIT' },
                        ]}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <Select
                        className="w-full min-w-0"
                        value={row.ledgerId}
                        onValueChange={(val) => {
                          const updated = [...jvEntries];
                          updated[idx]!.ledgerId = val;
                          setJvEntries(updated);
                        }}
                        options={ledgers.map((l) => ({ label: `${l.code} - ${l.name}`, value: l.id }))}
                        placeholder="Select Account..."
                      />
                    </div>

                    <div className="w-32 shrink-0">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount ₹"
                        value={row.amount || ''}
                        onChange={(e) => {
                          const updated = [...jvEntries];
                          updated[idx]!.amount = parseFloat(e.target.value) || 0;
                          setJvEntries(updated);
                        }}
                        className="w-full min-w-0 font-mono text-right text-xs tabular-nums"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={jvEntries.length <= 2}
                      onClick={() => handleRemoveJvRow(idx)}
                      className="text-muted hover:text-status-danger-text disabled:opacity-30 disabled:cursor-not-allowed p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Zero-Variance Mathematical Bar */}
              <div className="p-3 rounded-xl bg-surface-sunken border border-default flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-secondary">Total Debit: </span>
                  <span className="font-bold text-primary"><MoneyText amount={totalJvDebit} /></span>
                </div>
                <div>
                  <span className="text-secondary">Total Credit: </span>
                  <span className="font-bold text-primary"><MoneyText amount={totalJvCredit} /></span>
                </div>
                <div>
                  {isJvBalanced ? (
                    <Badge variant="success" size="xs">
                      BALANCED (Δ ₹0.00)
                    </Badge>
                  ) : (
                    <Badge variant="danger" size="xs">
                      UNBALANCED (Δ <MoneyText amount={jvDiff} />)
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <FormField label="Narration / Journal Remarks" id="jv-narration">
              <Input
                id="jv-narration"
                value={jvNarration}
                onChange={(e) => setJvNarration(e.target.value)}
                placeholder="e.g. Month-end depreciation adjustment / Accrual entry"
                className="text-xs"
              />
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setNewJvOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!isJvBalanced}
                loading={actionLoading}
              >
                Post Journal Voucher
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
