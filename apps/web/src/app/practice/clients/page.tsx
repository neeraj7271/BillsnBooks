'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Plus, RefreshCw, Search, CheckSquare, FileSpreadsheet } from 'lucide-react';
import {
  ListPage,
  Button,
  Badge,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { ClientDialog } from './client-dialog';
import { ClientStatsCards } from './client-stats-cards';

interface ClientItem {
  id: string;
  clientCode: string;
  companyName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  engagementType: string;
  serviceTier: string;
  healthStatus: string;
  openTaskCount: number;
  pendingDocCount: number;
  createdAt: string;
}

export default function ClientsDirectoryPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openOnboardModal, setOpenOnboardModal] = useState(false);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listPracticeClients();
      setClients(data || []);
    } catch (err: unknown) {
      console.error('Failed to load practice clients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = clients.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(term) ||
      c.clientCode.toLowerCase().includes(term) ||
      c.primaryContactName.toLowerCase().includes(term)
    );
  });

  const columns: ColumnDef<ClientItem>[] = [
    {
      header: 'Client',
      key: 'companyName',
      cell: (row) => (
        <div>
          <div className="font-bold text-primary dark:text-white">{row.companyName}</div>
          <div className="text-[11px] font-mono text-muted text-muted">{row.clientCode}</div>
        </div>
      ),
    },
    {
      header: 'Primary Contact',
      key: 'primaryContactName',
      cell: (row) => (
        <div>
          <div className="font-medium text-primary text-primary-inverse">{row.primaryContactName}</div>
          <div className="text-xs text-muted text-muted">{row.primaryContactEmail}</div>
        </div>
      ),
    },
    {
      header: 'Engagement',
      key: 'engagementType',
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-secondary text-muted">
            {row.engagementType.replace('_', ' ')}
          </span>
          <span className="text-[10px] font-mono uppercase text-muted">
            Tier: {row.serviceTier}
          </span>
        </div>
      ),
    },
    {
      header: 'Compliance Health',
      key: 'healthStatus',
      cell: (row) => (
        <Badge
          variant={
            row.healthStatus === 'HEALTHY'
              ? 'success'
              : row.healthStatus === 'ACTION_REQUIRED'
              ? 'warning'
              : 'danger'
          }
          size="sm"
        >
          {row.healthStatus === 'HEALTHY' ? 'Healthy' : 'Action Needed'}
        </Badge>
      ),
    },
    {
      header: 'Tasks',
      key: 'openTaskCount',
      cell: (row) => (
        <Link
          href={`/practice/tasks?clientId=${row.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-text text-brand hover:underline"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          {row.openTaskCount} Open
        </Link>
      ),
    },
    {
      header: 'Documents',
      key: 'pendingDocCount',
      cell: (row) => (
        <Link
          href={`/practice/documents?clientId=${row.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary text-muted hover:text-primary dark:hover:text-white"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          {row.pendingDocCount} Pending
        </Link>
      ),
    },
  ];

  return (
    <>
      <ListPage<ClientItem>
        header={{
          title: 'CA Firm Practice Command',
          subtitle: 'Multi-client governance, statutory task allocation, and client document portal.',
          badge: <Badge variant="brand" size="sm">CA Practice</Badge>,
          actions: (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadClients}
                loading={loading}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setOpenOnboardModal(true)}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Onboard Client
              </Button>
            </div>
          ),
        }}
        kpis={<ClientStatsCards clients={clients} />}
        toolbar={{
          searchValue: searchTerm,
          onSearchChange: setSearchTerm,
          searchPlaceholder: 'Search by client name, code, contact...',
        }}
        columns={columns}
        data={filteredClients}
        loading={loading}
        onRetry={loadClients}
        empty={{
          title: 'No clients onboarded yet',
          description: 'Onboard your first enterprise client entity to start managing statutory deadlines.',
        }}
        tableProps={{ stickyHeader: true }}
      />

      <ClientDialog
        open={openOnboardModal}
        onOpenChange={setOpenOnboardModal}
        onSuccess={loadClients}
      />
    </>
  );
}
