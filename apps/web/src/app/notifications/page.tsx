'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  RefreshCw,
  Clock,
  ExternalLink,
  ClipboardCheck,
  Receipt,
  CreditCard,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Inbox,
  Calendar,
} from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  DataTable,
  formatDate,
  Skeleton,
  cn,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { useTablePagination } from '@/hooks/use-table-pagination';

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsFullPage() {
  const router = useRouter();
  const { activeCompanyId } = useCompany();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { page, pageSize, setPage, setPageSize } = useTablePagination({
    storageKey: 'notifications_page',
    defaultPageSize: 25,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listNotifications?.(100);
      const rows = (data || []).map((n: any) => ({
        id: n.id,
        title: n.title || 'Notification',
        message: n.message || '',
        type: n.type || 'SYSTEM',
        entityType: n.entityType,
        entityId: n.entityId,
        actionUrl: n.actionUrl,
        isRead: Boolean(n.isRead),
        createdAt: n.createdAt || new Date().toISOString(),
      }));
      setNotifications(rows);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCompanyId]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (selectedStatus === 'UNREAD' && n.isRead) return false;
      if (selectedStatus === 'READ' && !n.isRead) return false;
      if (selectedType !== 'ALL') {
        const typeStr = (n.type + ' ' + (n.entityType || '')).toUpperCase();
        if (!typeStr.includes(selectedType)) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
      }
      return true;
    });
  }, [notifications, selectedStatus, selectedType, searchTerm]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filtered.map((n) => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleMarkSelectedRead = async () => {
    const idsToMark = [...selectedIds];
    setNotifications((prev) =>
      prev.map((n) => (idsToMark.includes(n.id) ? { ...n, isRead: true } : n))
    );
    setSelectedIds([]);
    for (const id of idsToMark) {
      try {
        await apiClient.markNotificationRead?.(id);
      } catch {}
    }
  };

  const handleDeleteSelected = () => {
    const idsToDelete = new Set(selectedIds);
    setNotifications((prev) => prev.filter((n) => !idsToDelete.has(n.id)));
    setSelectedIds([]);
  };

  const columns: ColumnDef<NotificationRow>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          aria-label="Select all"
          checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="h-4 w-4 rounded border-default text-brand focus:ring-brand"
        />
      ),
      width: '40px',
      cell: (row) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.title}`}
          checked={selectedIds.includes(row.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => handleToggleSelect(row.id)}
          className="h-4 w-4 rounded border-default text-brand focus:ring-brand"
        />
      ),
    },
    {
      key: 'content',
      header: 'Notification Details',
      cell: (row) => {
        const actionUrl = row.actionUrl || (row.entityType === 'INVOICE' && row.entityId ? `/invoices/${row.entityId}` : null);
        return (
          <div className="flex items-start gap-3 py-1">
            <div className="mt-0.5">
              {row.type.includes('APPROVAL') ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-status-warning-subtle text-status-warning-text">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
              ) : row.type.includes('INVOICE') ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-subtle text-brand-text">
                  <Receipt className="h-4 w-4" />
                </div>
              ) : row.type.includes('PAYMENT') ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-status-success-subtle text-status-success-text">
                  <CreditCard className="h-4 w-4" />
                </div>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-sunken text-muted">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs', !row.isRead ? 'font-bold text-primary' : 'font-medium text-secondary')}>
                  {row.title}
                </span>
                {!row.isRead && (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                )}
              </div>
              <p className="text-xs text-muted line-clamp-2 mt-0.5">
                {row.message}
              </p>
              {actionUrl && (
                <Link
                  href={actionUrl}
                  className="text-[11px] font-semibold text-brand-text hover:underline inline-flex items-center gap-1 mt-1"
                >
                  View linked document <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Category',
      width: '130px',
      cell: (row) => (
        <Badge variant={!row.isRead ? 'brand' : 'neutral'} size="xs">
          {row.entityType || row.type.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Received',
      width: '160px',
      cell: (row) => (
        <span className="text-xs text-muted tabular-nums">
          {formatDate(row.createdAt, 'short')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      width: '100px',
      cell: (row) => (
        <span className={cn('text-xs font-medium', !row.isRead ? 'text-brand-text font-bold' : 'text-muted')}>
          {row.isRead ? 'Read' : 'Unread'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Notification Center</h1>
          <p className="text-xs text-secondary mt-1">
            Audit log of statutory alerts, maker-checker approvals, and operational updates.
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
          <Link href="/settings/notifications">
            <Button variant="outline" size="sm">
              Manage Rules
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid: Left Filter Rail + Right Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Rail: Filters */}
        <div className="rounded-2xl border border-default bg-surface p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted block">Status</label>
            <div className="flex flex-col gap-1">
              {(['ALL', 'UNREAD', 'READ'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(st)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    selectedStatus === st
                      ? 'bg-brand-subtle text-brand-text font-semibold'
                      : 'text-secondary hover:text-primary hover:bg-surface-sunken'
                  )}
                >
                  {st === 'ALL' ? 'All Alerts' : st === 'UNREAD' ? 'Unread Only' : 'Archived / Read'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-subtle">
            <label className="text-[11px] font-semibold text-muted block">Alert Type</label>
            <div className="flex flex-col gap-1">
              {[
                { label: 'All Categories', val: 'ALL' },
                { label: 'Invoices & Billing', val: 'INVOICE' },
                { label: 'Approvals & Tasks', val: 'APPROVAL' },
                { label: 'Banking & Payouts', val: 'PAYMENT' },
                { label: 'System & Security', val: 'SYSTEM' },
              ].map((cat) => (
                <button
                  key={cat.val}
                  type="button"
                  onClick={() => setSelectedType(cat.val)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    selectedType === cat.val
                      ? 'bg-brand-subtle text-brand-text font-semibold'
                      : 'text-secondary hover:text-primary hover:bg-surface-sunken'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Table + Search + Bulk Actions */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <Input
                placeholder="Search alerts by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in">
                <span className="text-xs text-secondary font-medium">
                  {selectedIds.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkSelectedRead}
                  leftIcon={<Check className="h-3 w-3" />}
                >
                  Mark Read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteSelected}
                  leftIcon={<Trash2 className="h-3 w-3 text-status-danger-text" />}
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            page={page}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            storageKey="notifications_full"
            isFiltered={selectedStatus !== 'ALL' || selectedType !== 'ALL' || Boolean(searchTerm.trim())}
            onClearFilters={() => {
              setSelectedStatus('ALL');
              setSelectedType('ALL');
              setSearchTerm('');
            }}
            emptyTitle="No notifications found"
            emptyDescription="There are no alert logs matching your active filters."
          />
        </div>
      </div>
    </div>
  );
}
