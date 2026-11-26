'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, RefreshCw, Eye, Edit, Trash2 } from 'lucide-react';
import {
  Button,
  Badge,
  MoneyText,
  ListPage,
  ConfirmDialog,
  type ColumnDef,
} from '@platform/ui';
import { PartyRegistrationType } from '@platform/shared-types';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { PartyDialog } from './party-dialog';
import { PartyDetailsDialog } from './party-details-dialog';

interface Party {
  id: string;
  partyCode?: string;
  name: string;
  tradeName?: string;
  partyType: 'CUSTOMER' | 'VENDOR' | 'BOTH';
  registrationType?: PartyRegistrationType;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  billingState?: string;
  billingStateCode?: string;
  currentBalance?: number;
  isActive?: boolean;
}

export default function PartiesPage() {
  const { activeCompanyId } = useCompany();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('ALL');
  const [gstFilter, setGstFilter] = useState<'ALL' | 'HAS_GSTIN' | 'MISSING_GSTIN'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [selectedPartyForEdit, setSelectedPartyForEdit] = useState<Party | null>(null);
  const [selectedPartyForView, setSelectedPartyForView] = useState<Party | null>(null);
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);

  const pageSize = 15;

  const loadParties = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listParties(activeCompanyId, filterType !== 'ALL' ? filterType : undefined);
      setParties(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompanyId) loadParties();
  }, [filterType, activeCompanyId]);

  const filtered = useMemo(() => {
    return parties.filter((p) => {
      if (gstFilter === 'HAS_GSTIN' && !p.gstin) return false;
      if (gstFilter === 'MISSING_GSTIN' && p.gstin) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.partyCode || '').toLowerCase().includes(q) ||
          (p.gstin || '').toLowerCase().includes(q) ||
          (p.pan || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [parties, gstFilter, searchTerm]);

  const columns: ColumnDef<Party>[] = [
    { key: 'partyCode', header: 'Code', cell: (r) => <span className="font-mono text-caption text-muted">{r.partyCode || '—'}</span> },
    { key: 'name', header: 'Name', sortable: true, cell: (r) => <span className="font-semibold text-primary">{r.name}</span> },
    {
      key: 'partyType',
      header: 'Type',
      cell: (r) => (
        <Badge variant={r.partyType === 'CUSTOMER' ? 'brand' : r.partyType === 'VENDOR' ? 'warning' : 'info'} size="xs">
          {r.partyType}
        </Badge>
      ),
    },
    {
      key: 'gstin',
      header: 'Tax Identity',
      cell: (r) => (
        <span className="font-mono text-caption text-secondary">
          {r.gstin || r.registrationType || 'UNREGISTERED'}
        </span>
      ),
    },
    { key: 'billingState', header: 'State', cell: (r) => <span className="text-body-sm text-secondary">{r.billingState || r.billingStateCode || '—'}</span> },
    { key: 'currentBalance', header: 'Balance', align: 'right', cell: (r) => <MoneyText amount={r.currentBalance ?? 0} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="xs" aria-label={`View ${r.name}`} onClick={() => setSelectedPartyForView(r)}><Eye className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="xs" aria-label={`Edit ${r.name}`} onClick={() => { setSelectedPartyForEdit(r); setShowAddEditModal(true); }}><Edit className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="xs" aria-label={`Delete ${r.name}`} onClick={() => setPartyToDelete(r)}><Trash2 className="h-3.5 w-3.5 text-status-danger-text" /></Button>
        </div>
      ),
    },
  ];

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <ListPage
        header={{
          title: 'Parties',
          subtitle: 'Customers, vendors, GSTIN/PAN compliance, and ledger balances.',
          badge: <Badge variant="neutral" size="sm">{filtered.length} parties</Badge>,
          actions: (
            <Button variant="outline" size="sm" onClick={loadParties} aria-label="Refresh parties">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          ),
        }}
        toolbar={{
          searchValue: searchTerm,
          onSearchChange: (v) => { setSearchTerm(v); setPage(1); },
          searchPlaceholder: 'Search party name, code, GSTIN, PAN...',
          filters: (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['ALL', 'CUSTOMER', 'VENDOR', 'BOTH'] as const).map((t) => (
                <Button key={t} size="xs" variant={filterType === t ? 'primary' : 'outline'} onClick={() => { setFilterType(t); setPage(1); }}>{t}</Button>
              ))}
              {(['ALL', 'HAS_GSTIN', 'MISSING_GSTIN'] as const).map((g) => (
                <Button key={g} size="xs" variant={gstFilter === g ? 'secondary' : 'ghost'} onClick={() => { setGstFilter(g); setPage(1); }}>
                  {g === 'ALL' ? 'All KYC' : g === 'HAS_GSTIN' ? 'Has GSTIN' : 'No GSTIN'}
                </Button>
              ))}
            </div>
          ),
          primaryAction: (
            <Button variant="primary" size="sm" onClick={() => { setSelectedPartyForEdit(null); setShowAddEditModal(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Party
            </Button>
          ),
        }}
        data={paged}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={loadParties}
        hasActiveFilters={Boolean(searchTerm || filterType !== 'ALL' || gstFilter !== 'ALL')}
        empty={{ icon: <Users className="h-5 w-5" />, title: 'No parties yet', description: 'Add a customer or vendor to start invoicing.' }}
        filteredEmpty={{ title: 'No matching parties', description: 'Try clearing your search or KYC filters.' }}
        tableProps={{ page, pageSize, totalItems: filtered.length, onPageChange: setPage }}
      />

      <PartyDialog open={showAddEditModal} onOpenChange={(o) => { setShowAddEditModal(o); if (!o) setSelectedPartyForEdit(null); }} onSuccess={loadParties} companyId={activeCompanyId} initialData={selectedPartyForEdit} />
      <PartyDetailsDialog
        open={Boolean(selectedPartyForView)}
        onOpenChange={(o) => { if (!o) setSelectedPartyForView(null); }}
        party={selectedPartyForView}
        onEdit={(p) => { setSelectedPartyForView(null); setSelectedPartyForEdit(p); setShowAddEditModal(true); }}
        onDelete={(p) => { setSelectedPartyForView(null); setPartyToDelete(p); }}
      />
      <ConfirmDialog
        open={Boolean(partyToDelete)}
        onOpenChange={(o) => { if (!o) setPartyToDelete(null); }}
        onConfirm={async () => {
          if (partyToDelete) {
            await apiClient.deleteParty(activeCompanyId, partyToDelete.id);
            setPartyToDelete(null);
            loadParties();
          }
        }}
        title="Delete Party"
        description={`Delete "${partyToDelete?.name}"?`}
        tone="danger"
      />
    </>
  );
}
