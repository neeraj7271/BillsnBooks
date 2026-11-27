'use client';
import { logger } from '@/lib/logger';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Eye,
  RotateCcw,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  Select,
  ListPage,
  MoneyText,
  DateText,
  ConfirmDialog,
  type ColumnDef,
  toast,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { VoucherDetailsDialog, type VoucherDetail } from './voucher-details-dialog';
import { NewJvDialog } from './new-jv-dialog';

interface VoucherEntry {
  id: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
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
  narration?: string;
  status: string;
  branchId?: string;
  financialYearId?: string;
  entries?: VoucherEntry[];
  createdAt: string;
}

export default function VouchersPage() {
  const { activeCompanyId } = useCompany();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [financialYears, setFinancialYears] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { page, pageSize, setPage, setPageSize } = useTablePagination({
    storageKey: 'vouchers',
    defaultPageSize: 25,
  });

  // Drill-down Details Dialog
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetail | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Reversal Dialog
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reversingVoucher, setReversingVoucher] = useState<Voucher | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New Journal Voucher (JV) Dialog
  const [newJvOpen, setNewJvOpen] = useState(false);

  useEffect(() => {
    loadAll();
  }, [activeCompanyId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [vData, lData, cList] = await Promise.all([
        apiClient.listVouchers(activeCompanyId),
        apiClient.listLedgers(activeCompanyId),
        apiClient.listCompanies(),
      ]);
      setVouchers(vData || []);
      setLedgers(lData || []);
      const comp = cList?.find((c: any) => c.id === activeCompanyId) || cList?.[0];
      if (comp) {
        setBranches(comp.branches || []);
        setFinancialYears(comp.financialYears || []);
      }
    } catch (err: unknown) {
      logger.error('Failed to load vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (v: Voucher) => {
    try {
      const fresh = await apiClient.getVoucher(activeCompanyId, v.id);
      setSelectedVoucher(fresh);
      setDetailsOpen(true);
    } catch (err: unknown) {
      toast.error('Failed to load voucher line details');
    }
  };

  const handleOpenReverse = (v: Voucher) => {
    setReversingVoucher(v);
    setReverseOpen(true);
  };

  const handleReverseVoucher = async () => {
    if (!reversingVoucher) return;
    setActionLoading(true);
    try {
      await apiClient.reverseVoucher(activeCompanyId, reversingVoucher.id);
      toast.success(`Voucher #${reversingVoucher.voucherNumber} reversed with contra entries.`);
      setReverseOpen(false);
      setReversingVoucher(null);
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Reversal failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchesSearch =
        v.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.narration && v.narration.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = typeFilter === 'ALL' || v.voucherType === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [vouchers, searchTerm, typeFilter, statusFilter]);

  // KPIs
  const totalAmountDebited = useMemo(() => {
    return vouchers.reduce((sum, v) => {
      const debitTotal =
        v.entries
          ?.filter((e) => e.entryType === 'DEBIT')
          .reduce((s, e) => s + (parseFloat(String(e.amount)) || 0), 0) || 0;
      return sum + debitTotal;
    }, 0);
  }, [vouchers]);

  const activeCount = useMemo(() => vouchers.filter((v) => v.status === 'POSTED').length, [vouchers]);
  const reversedCount = useMemo(() => vouchers.filter((v) => v.status === 'REVERSED').length, [vouchers]);

  const columns: ColumnDef<Voucher>[] = [
    {
      key: 'voucherNumber',
      header: 'Voucher Number',
      cell: (row) => (
        <div>
          <button
            type="button"
            onClick={() => handleOpenDetails(row)}
            className="font-mono font-bold text-brand-text hover:underline text-xs"
          >
            #{row.voucherNumber}
          </button>
          <div className="text-[11px] text-muted">
            <DateText date={row.voucherDate} />
          </div>
        </div>
      ),
    },
    {
      key: 'voucherType',
      header: 'Type & Classification',
      cell: (row) => {
        const typeVariants: Record<string, 'brand' | 'success' | 'warning' | 'neutral' | 'danger'> = {
          JOURNAL: 'brand',
          PAYMENT: 'warning',
          RECEIPT: 'success',
          CONTRA: 'neutral',
          SALES: 'brand',
          PURCHASE: 'neutral',
        };
        return (
          <div className="space-y-0.5">
            <Badge variant={typeVariants[row.voucherType] || 'neutral'} size="xs">
              {row.voucherType}
            </Badge>
            {row.entries && (
              <span className="text-[10px] text-muted block">
                {row.entries.length} double-entry line(s)
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'narration',
      header: 'Narration & Particulars',
      cell: (row) => (
        <span className="text-xs text-secondary line-clamp-1 italic max-w-sm">
          {row.narration || '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Debited Amount (₹)',
      align: 'right',
      cell: (row) => {
        const debitTotal =
          row.entries
            ?.filter((e) => e.entryType === 'DEBIT')
            .reduce((s, e) => s + (parseFloat(String(e.amount)) || 0), 0) || 0;
        return (
          <span className="font-mono font-bold text-xs text-primary">
            <MoneyText amount={debitTotal} />
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (row) => (
        <Badge
          variant={row.status === 'POSTED' ? 'success' : 'danger'}
          size="xs"
          dot
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => handleOpenDetails(row)}
            leftIcon={<Eye className="h-3 w-3" />}
          >
            Details
          </Button>

          {row.status === 'POSTED' && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleOpenReverse(row)}
              className="text-status-danger-text hover:bg-status-danger-subtle hover:border-status-danger"
              leftIcon={<RotateCcw className="h-3 w-3" />}
            >
              Reverse
            </Button>
          )}
        </div>
      ),
    },
  ];

  const kpis = (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <div className="p-4 rounded-2xl bg-surface border border-default shadow-xs flex items-center justify-between">
        <div>
          <span className="text-overline uppercase text-muted block">Total Vouchers</span>
          <span className="text-2xl font-black text-primary">{vouchers.length}</span>
        </div>
        <FileText className="h-6 w-6 text-brand-text opacity-80" />
      </div>

      <div className="p-4 rounded-2xl bg-surface border border-default shadow-xs flex items-center justify-between">
        <div>
          <span className="text-overline uppercase text-muted block">Posted & Balanced</span>
          <span className="text-2xl font-black text-status-success-text">{activeCount}</span>
        </div>
        <Badge variant="success" size="xs">Active</Badge>
      </div>

      <div className="p-4 rounded-2xl bg-surface border border-default shadow-xs flex items-center justify-between">
        <div>
          <span className="text-overline uppercase text-muted block">Reversals & Contras</span>
          <span className="text-2xl font-black text-status-danger-text">{reversedCount}</span>
        </div>
        <Badge variant="danger" size="xs">Audit Log</Badge>
      </div>

      <div className="p-4 rounded-2xl bg-surface border border-default shadow-xs flex items-center justify-between">
        <div>
          <span className="text-overline uppercase text-muted block">Aggregate Debits</span>
          <span className="text-xl font-black text-primary font-mono">
            <MoneyText amount={totalAmountDebited} />
          </span>
        </div>
        <Badge variant="neutral" size="xs">Double-Entry</Badge>
      </div>
    </div>
  );

  return (
    <>
      <ListPage
        header={{
          title: 'Day Book & Voucher Register',
          subtitle: 'Double-entry audit logs: Journal, Contra, Payment, and Receipt vouchers.',
          badge: <Badge variant="brand" size="sm">Rule 48 Invariance</Badge>,
          actions: (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadAll}
                loading={loading}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                leftIcon={<BookOpen className="h-3.5 w-3.5" />}
              >
                <Link href="/reports/general-ledger">General Ledger</Link>
              </Button>
              <div className="inline-flex rounded-lg shadow-2xs">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setNewJvOpen(true)}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  className="rounded-r-none border-r border-brand-hover/30"
                >
                  New Journal Voucher
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="primary"
                      size="sm"
                      className="rounded-l-none px-2"
                      aria-label="More voucher types"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => setNewJvOpen(true)}>
                      <Plus className="h-3.5 w-3.5 mr-2" /> Journal Voucher (JV)
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/banking" className="flex items-center w-full">
                        <Plus className="h-3.5 w-3.5 mr-2" /> Bank Contra / Transfer
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/reports/general-ledger" className="flex items-center w-full">
                        <BookOpen className="h-3.5 w-3.5 mr-2" /> General Ledger
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ),
        }}
        kpis={kpis}
        toolbar={{
          searchValue: searchTerm,
          onSearchChange: (val: string) => {
            setSearchTerm(val);
            setPage(1);
          },
          searchPlaceholder: 'Search voucher number or narration...',
          filters: (
            <div className="flex items-center gap-2">
              <Select
                size="sm"
                value={typeFilter}
                onValueChange={(val) => {
                  setTypeFilter(val);
                  setPage(1);
                }}
                options={[
                  { label: 'All Voucher Types', value: 'ALL' },
                  { label: 'Journal (JV)', value: 'JOURNAL' },
                  { label: 'Payment (PV)', value: 'PAYMENT' },
                  { label: 'Receipt (RV)', value: 'RECEIPT' },
                  { label: 'Contra (CV)', value: 'CONTRA' },
                  { label: 'Sales (SV)', value: 'SALES' },
                  { label: 'Purchase (PUR)', value: 'PURCHASE' },
                ]}
              />

              <Select
                size="sm"
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
                options={[
                  { label: 'All Statuses', value: 'ALL' },
                  { label: 'Posted', value: 'POSTED' },
                  { label: 'Reversed', value: 'REVERSED' },
                ]}
              />
            </div>
          ),
        }}
        data={filteredVouchers}
        columns={columns}
        loading={loading}
        hasActiveFilters={searchTerm !== '' || typeFilter !== 'ALL' || statusFilter !== 'ALL'}
        empty={{
          title: 'No vouchers recorded',
          description: 'Post manual journal entries (JV) or generate invoices to record posted vouchers.',
          action: { label: 'New Journal Voucher', onClick: () => setNewJvOpen(true) },
        }}
        filteredEmpty={{
          title: 'No matching vouchers found',
          description: 'Try adjusting your search terms or voucher type filter.',
          action: {
            label: 'Clear Filters',
            onClick: () => {
              setSearchTerm('');
              setTypeFilter('ALL');
              setStatusFilter('ALL');
            },
          },
        }}
        tableProps={{
          page,
          pageSize,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
      />

      <VoucherDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        voucher={selectedVoucher}
      />

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

      <NewJvDialog
        open={newJvOpen}
        onOpenChange={setNewJvOpen}
        branches={branches}
        financialYears={financialYears}
        ledgers={ledgers}
        companyId={activeCompanyId}
        onSuccess={loadAll}
      />
    </>
  );
}
