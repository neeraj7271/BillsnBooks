'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Plus, RefreshCw, Search, Eye, Edit, Trash2, AlertCircle, FileText, UploadCloud } from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  DataTable,
  MoneyText,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  type ColumnDef,
} from '@platform/ui';
import { formatPartyTaxIdentity, PartyRegistrationType } from '@platform/shared-types';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { PartyDialog } from './party-dialog';
import { PartyDetailsDialog } from './party-details-dialog';
import { ImportPartiesModal } from './import-parties-modal';

interface Party {
  id: string;
  partyCode?: string;
  name: string;
  tradeName?: string;
  partyType: 'CUSTOMER' | 'VENDOR' | 'BOTH';
  registrationType?: PartyRegistrationType;
  currency?: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingStateCode?: string;
  billingPincode?: string;
  currentBalance?: number;
  creditLimit?: number;
  paymentTermsDays?: number;
  isActive?: boolean;
  ledgerId?: string;
}

export default function PartiesPage() {
  const { activeCompanyId } = useCompany();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { page: currentPage, pageSize, setPage: setCurrentPage, setPageSize } = useTablePagination({
    storageKey: 'parties',
    defaultPageSize: 25,
  });

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [selectedPartyForEdit, setSelectedPartyForEdit] = useState<Party | null>(null);
  const [selectedPartyForView, setSelectedPartyForView] = useState<Party | null>(null);

  // Deletion modal state
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadParties();
  }, [filterType, activeCompanyId]);

  const loadParties = async () => {
    setLoading(true);
    try {
      const typeParam = filterType !== 'ALL' ? filterType : undefined;
      const data = await apiClient.listParties(activeCompanyId, typeParam);
      setParties(data || []);
    } catch (err: unknown) {
      console.error('Failed to list parties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedPartyForEdit(null);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (party: Party) => {
    setSelectedPartyForEdit(party);
    setShowAddEditModal(true);
  };

  const handleOpenDelete = (party: Party) => {
    setPartyToDelete(party);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!partyToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await apiClient.deleteParty(activeCompanyId, partyToDelete.id);
      setPartyToDelete(null);
      await loadParties();
    } catch (err: unknown) {
      let msg = 'Failed to delete counterparty';
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'object' && err !== null) {
        msg = (err as any).message || (err as any).error || JSON.stringify(err);
      }
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredParties = parties.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.tradeName && p.tradeName.toLowerCase().includes(term)) ||
      (p.gstin && p.gstin.toLowerCase().includes(term)) ||
      (p.partyCode && p.partyCode.toLowerCase().includes(term))
    );
  });

  const paginatedParties = filteredParties.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns: ColumnDef<Party>[] = [
    {
      key: 'name',
      header: 'Party / Business Entity',
      cell: (p) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-primary">{p.name}</span>
            {p.partyCode && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-sunken text-muted font-medium">
                {p.partyCode}
              </span>
            )}
          </div>
          {p.tradeName && <div className="text-[11px] text-muted">{p.tradeName}</div>}
        </div>
      ),
    },
    {
      key: 'partyType',
      header: 'Type',
      cell: (p) => (
        <Badge
          variant={p.partyType === 'CUSTOMER' ? 'brand' : p.partyType === 'VENDOR' ? 'warning' : 'neutral'}
          size="xs"
        >
          {p.partyType}
        </Badge>
      ),
    },
    {
      key: 'taxRegistration',
      header: 'GST Registration & Tax Identity',
      cell: (p) => {
        const identity = formatPartyTaxIdentity(p.registrationType, p.gstin);
        return (
          <div className="space-y-1">
            <Badge variant={identity.badgeVariant} size="xs">
              {identity.badgeLabel}
            </Badge>
            {identity.showGstin && p.gstin ? (
              <div className="font-mono text-xs font-semibold text-secondary">
                {p.gstin}
              </div>
            ) : null}
            {p.pan && (
              <div className="text-[10px] font-mono text-muted">
                PAN: {p.pan}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'location',
      header: 'Location / State',
      cell: (p) => (
        <div className="text-xs text-secondary">
          <div>{p.billingCity || '—'}</div>
          <div className="text-[10px] text-muted">{p.billingState || 'India'} ({p.billingStateCode || '27'})</div>
        </div>
      ),
    },
    {
      key: 'balance',
      header: 'Current Balance',
      align: 'right',
      cell: (p) => <MoneyText amount={p.currentBalance || 0} showDrCr colorCode="dr-cr" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={
              p.ledgerId
                ? `/reports/general-ledger?ledgerId=${p.ledgerId}`
                : `/reports/general-ledger?partyName=${encodeURIComponent(p.name)}`
            }
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted hover:text-brand-text hover:bg-brand-subtle transition"
            title="View Statement of Account / General Ledger"
          >
            <FileText className="h-3.5 w-3.5" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted hover:text-status-info-text hover:bg-status-info-subtle"
            title="View full party profile"
            onClick={() => setSelectedPartyForView(p)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted hover:text-status-success-text hover:bg-status-success-subtle"
            title="Edit counterparty"
            onClick={() => handleOpenEdit(p)}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted hover:text-status-danger-text hover:bg-status-danger-subtle"
            title="Delete / Deactivate"
            onClick={() => handleOpenDelete(p)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
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
              Parties & Counterparties
            </h1>
            <Badge variant="neutral" size="sm">{filteredParties.length} Entities</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Customers (Debtors) and Vendors (Creditors) master ledger with statutory GSTIN validation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadParties} loading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} leftIcon={<UploadCloud className="h-3.5 w-3.5" />}>
            Import
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            New Party
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search party by name, code or GSTIN..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            leftAddon={<Search className="h-3.5 w-3.5" />}
            size="sm"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-surface-sunken rounded-xl">
          {['ALL', 'CUSTOMER', 'VENDOR'].map((t) => (
            <button
              key={t}
              onClick={() => {
                setFilterType(t);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterType === t
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {t === 'ALL' ? 'All Counterparties' : t === 'CUSTOMER' ? 'Customers' : 'Vendors'}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredParties}
        loading={loading}
        page={currentPage}
        pageSize={pageSize}
        totalItems={filteredParties.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        storageKey="parties"
        emptyTitle="No parties yet"
        emptyDescription="Add a customer or vendor to start billing."
        emptyAction={{ label: 'Add Party', onClick: () => setShowAddEditModal(true) }}
        isFiltered={filterType !== 'ALL' || Boolean(searchTerm.trim())}
        onClearFilters={() => {
          setFilterType('ALL');
          setSearchTerm('');
        }}
      />

      {/* Create / Edit Dialog */}
      <PartyDialog
        open={showAddEditModal}
        companyId={activeCompanyId}
        initialData={selectedPartyForEdit}
        onOpenChange={setShowAddEditModal}
        onSuccess={loadParties}
      />

      {/* View Details Dialog */}
      <PartyDetailsDialog
        party={selectedPartyForView}
        open={!!selectedPartyForView}
        onOpenChange={(open) => !open && setSelectedPartyForView(null)}
        onEdit={(party) => {
          setSelectedPartyForView(null);
          handleOpenEdit(party);
        }}
        onDelete={(party) => {
          setSelectedPartyForView(null);
          handleOpenDelete(party);
        }}
      />

      {/* Delete / Deactivate Confirmation Dialog */}
      <Dialog open={!!partyToDelete} onOpenChange={(open) => !open && setPartyToDelete(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Remove Counterparty</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &apos;{partyToDelete?.name}&apos; ({partyToDelete?.partyCode || 'Counterparty'})?
            </DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <div className="p-3.5 rounded-xl bg-status-danger-subtle border border-default text-xs text-status-danger-text space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-status-danger-text" />
                Accounting Protection Alert
              </div>
              <p>{deleteError}</p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-surface-sunken border border-default text-xs text-secondary">
              <span className="font-semibold text-primary block mb-1">
                Double-Entry Accounting Safeguard:
              </span>
              If this party has posted vouchers or invoices, removal is safely blocked to protect ledger integrity. If no transactions exist, it will be deactivated and removed from active directories.
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setPartyToDelete(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              loading={deleteLoading}
              onClick={handleConfirmDelete}
            >
              Confirm Removal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportPartiesModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSuccess={loadParties}
      />
    </div>
  );
}
