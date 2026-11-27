'use client';

import React, { useState, useMemo } from 'react';
import {
  Button,
  Badge,
  Input,
  DataTable,
  type ColumnDef,
} from '@platform/ui';
import {
  Plus,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Trash2,
  Lock,
} from 'lucide-react';

export interface UomRow {
  code: string;
  name: string;
  category: string;
  isCustom: boolean;
  description?: string;
  usageCount: number;
}

interface ItemsUnitsTabProps {
  units: UomRow[];
  loading: boolean;
  pageSize: number;
  onRefresh: () => void;
  onCreateUnit: () => void;
  onViewUnit: (u: UomRow) => void;
  onEditUnit: (u: UomRow) => void;
  onDeleteUnit: (u: UomRow) => void;
}

export function ItemsUnitsTab({
  units,
  loading,
  pageSize,
  onRefresh,
  onCreateUnit,
  onViewUnit,
  onEditUnit,
  onDeleteUnit,
}: ItemsUnitsTabProps) {
  const [unitFilter, setUnitFilter] = useState<'ALL' | 'CUSTOM' | 'STATUTORY'>('ALL');
  const [unitSearch, setUnitSearch] = useState<string>('');
  const [unitsPage, setUnitsPage] = useState<number>(1);

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const matchesSearch =
        u.code.toLowerCase().includes(unitSearch.toLowerCase()) ||
        u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
        (u.description && u.description.toLowerCase().includes(unitSearch.toLowerCase()));

      let matchesFilter = true;
      if (unitFilter === 'CUSTOM') matchesFilter = u.isCustom;
      if (unitFilter === 'STATUTORY') matchesFilter = !u.isCustom;

      return matchesSearch && matchesFilter;
    });
  }, [units, unitSearch, unitFilter]);

  const unitColumns: ColumnDef<UomRow>[] = [
    {
      key: 'code',
      header: 'Unit Code (UOM / UQC)',
      width: '160px',
      cell: (u) => (
        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-status-info-subtle text-status-info-text">
          {u.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Unit Description / Full Name',
      cell: (u) => (
        <div>
          <span className="font-bold text-primary">{u.name}</span>
          {u.description && <div className="text-[11px] text-muted">{u.description}</div>}
        </div>
      ),
    },
    {
      key: 'origin',
      header: 'Origin / Type',
      cell: (u) => (
        <Badge variant={u.isCustom ? 'brand' : 'neutral'} size="xs">
          {u.isCustom ? 'Company Custom Unit' : 'Statutory GST UQC'}
        </Badge>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (u) => (
        <span className="font-mono text-[11px] text-muted uppercase px-1.5 py-0.5 rounded bg-surface-sunken">
          {u.category}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Catalog Usage',
      align: 'center',
      cell: (u) => (
        <Badge variant={u.usageCount > 0 ? 'success' : 'neutral'} size="xs">
          {u.usageCount} {u.usageCount === 1 ? 'Item' : 'Items'} Using
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted hover:text-status-info-text hover:bg-status-info-subtle"
            title="View unit details and catalog usage"
            onClick={() => onViewUnit(u)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>

          {u.isCustom ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted hover:text-status-success-text hover:bg-status-success-subtle"
              title={`Edit custom unit ${u.code}`}
              onClick={() => onEditUnit(u)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="h-8 w-8 p-0 text-muted opacity-50 cursor-not-allowed"
              title="Statutory GST standard units are system-locked and cannot be modified"
            >
              <Lock className="h-3 w-3" />
            </Button>
          )}

          {u.isCustom ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted hover:text-status-danger-text hover:bg-status-danger-subtle"
              title={`Delete custom unit ${u.code}`}
              onClick={() => onDeleteUnit(u)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="h-8 w-8 p-0 text-muted opacity-40 cursor-not-allowed"
              title="Statutory GST standard units cannot be deleted"
            >
              <Trash2 className="h-3 w-3" />
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
              Units of Measurement (UOM Master)
            </h1>
            <Badge variant="neutral" size="sm">{filteredUnits.length} Units</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Official statutory GST e-Invoicing UQC codes and custom company units.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            loading={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateUnit}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Create New Unit
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search unit by code or name..."
            value={unitSearch}
            onChange={(e) => {
              setUnitSearch(e.target.value);
              setUnitsPage(1);
            }}
            leftAddon={<Search className="h-3.5 w-3.5" />}
            size="sm"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-surface-sunken rounded-xl">
          {[
            { label: 'All Units', value: 'ALL' },
            { label: 'Custom Units', value: 'CUSTOM' },
            { label: 'Statutory GST', value: 'STATUTORY' },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setUnitFilter(t.value as any);
                setUnitsPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                unitFilter === t.value
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table with Pagination */}
      <DataTable
        columns={unitColumns}
        data={filteredUnits}
        loading={loading}
        page={unitsPage}
        pageSize={pageSize}
        totalItems={filteredUnits.length}
        onPageChange={setUnitsPage}
        storageKey="items_units"
        isFiltered={unitFilter !== 'ALL' || Boolean(unitSearch.trim())}
        onClearFilters={() => {
          setUnitFilter('ALL');
          setUnitSearch('');
        }}
        emptyTitle="No units found"
        emptyDescription="No measurement units match your search criteria."
      />
    </div>
  );
}
