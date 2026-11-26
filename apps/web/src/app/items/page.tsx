'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Boxes, Plus, RefreshCw, Eye, Edit, Trash2, Scale } from 'lucide-react';
import {
  Button,
  Badge,
  MoneyText,
  ListPage,
  ConfirmDialog,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { GST_STATUTORY_UOM_LIST, normalizeGstUqc } from '@platform/shared-types';
import { ItemDialog } from './item-dialog';
import { ItemDetailsDialog } from './item-details-dialog';
import { UnitManagerDialog } from './unit-manager-dialog';
import { UnitDetailsDialog } from './unit-details-dialog';
import { EditUnitDialog } from './edit-unit-dialog';
import { DeleteUnitDialog } from './delete-unit-dialog';

interface Item {
  id: string;
  itemCode: string;
  name: string;
  description?: string;
  hsnSacCode: string;
  itemType: 'GOODS' | 'SERVICES';
  uom: string;
  unitPrice: number;
  gstRatePercent: number;
  cessRatePercent?: number;
}

interface UomRow {
  code: string;
  name: string;
  category: string;
  isCustom: boolean;
  description?: string;
  usageCount: number;
}

export default function ItemsPage() {
  const { activeCompanyId } = useCompany();
  const [mainView, setMainView] = useState<'ITEMS' | 'UNITS'>('ITEMS');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [gstFilter, setGstFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPage, setItemsPage] = useState(1);

  const [units, setUnits] = useState<UomRow[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitsPage, setUnitsPage] = useState(1);

  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<Item | null>(null);
  const [selectedItemForView, setSelectedItemForView] = useState<Item | null>(null);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [selectedUnitForView, setSelectedUnitForView] = useState<UomRow | null>(null);
  const [selectedUnitForEdit, setSelectedUnitForEdit] = useState<UomRow | null>(null);
  const [selectedUnitForDelete, setSelectedUnitForDelete] = useState<UomRow | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const pageSize = 15;

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listItems(activeCompanyId);
      setItems(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async () => {
    setUnitsLoading(true);
    try {
      const unitsRes = await apiClient.listUnits(activeCompanyId);
      const customList: UomRow[] = (unitsRes?.custom || []).map((u: any) => ({
        code: u.code,
        name: u.name,
        category: u.category || 'Custom',
        isCustom: true,
        description: u.description,
        usageCount: items.filter((it) => normalizeGstUqc(it.uom) === normalizeGstUqc(u.code)).length,
      }));
      const statutory: UomRow[] = GST_STATUTORY_UOM_LIST.map((u) => ({
        code: u.code,
        name: u.name,
        category: u.category,
        isCustom: false,
        usageCount: items.filter((it) => normalizeGstUqc(it.uom) === u.code).length,
      }));
      setUnits([...customList, ...statutory]);
    } finally {
      setUnitsLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompanyId) loadItems();
  }, [activeCompanyId]);

  useEffect(() => {
    if (mainView === 'UNITS' && activeCompanyId) loadUnits();
  }, [mainView, activeCompanyId]);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (filterType !== 'ALL' && it.itemType !== filterType) return false;
      if (gstFilter !== 'ALL' && String(it.gstRatePercent) !== gstFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          it.name.toLowerCase().includes(q) ||
          it.itemCode.toLowerCase().includes(q) ||
          (it.hsnSacCode || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, filterType, gstFilter, searchTerm]);

  const filteredUnits = useMemo(() => {
    if (!unitSearch.trim()) return units;
    const q = unitSearch.toLowerCase();
    return units.filter((u) => u.code.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
  }, [units, unitSearch]);

  const itemColumns: ColumnDef<Item>[] = [
    { key: 'itemCode', header: 'Code', sortable: true, cell: (r) => <span className="font-mono text-caption text-muted">{r.itemCode}</span> },
    { key: 'name', header: 'Item Name', sortable: true, cell: (r) => <span className="font-semibold text-primary">{r.name}</span> },
    { key: 'itemType', header: 'Type', cell: (r) => <Badge variant={r.itemType === 'GOODS' ? 'info' : 'brand'} size="xs">{r.itemType}</Badge> },
    { key: 'hsnSacCode', header: 'HSN / SAC', cell: (r) => <span className="font-mono text-body-sm">{r.hsnSacCode}</span> },
    { key: 'uom', header: 'UOM', cell: (r) => <Badge variant="neutral" size="xs">{r.uom}</Badge> },
    { key: 'gstRatePercent', header: 'GST %', align: 'right', cell: (r) => <span className="font-mono tabular-nums">{r.gstRatePercent}%</span> },
    { key: 'unitPrice', header: 'Price', align: 'right', sortable: true, cell: (r) => <MoneyText amount={r.unitPrice} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="xs" aria-label={`View ${r.name}`} onClick={() => setSelectedItemForView(r)}><Eye className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="xs" aria-label={`Edit ${r.name}`} onClick={() => { setSelectedItemForEdit(r); setShowAddEditModal(true); }}><Edit className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="xs" aria-label={`Delete ${r.name}`} onClick={() => setItemToDelete(r)}><Trash2 className="h-3.5 w-3.5 text-status-danger-text" /></Button>
        </div>
      ),
    },
  ];

  const unitColumns: ColumnDef<UomRow>[] = [
    { key: 'code', header: 'UQC Code', cell: (u) => <span className="font-mono font-semibold text-primary">{u.code}</span> },
    { key: 'name', header: 'Unit Name', cell: (u) => <span>{u.name}</span> },
    { key: 'category', header: 'Category', cell: (u) => <Badge variant="neutral" size="xs">{u.category}</Badge> },
    { key: 'usageCount', header: 'Items', align: 'right', cell: (u) => <span className="font-mono tabular-nums">{u.usageCount}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="xs" aria-label={`View unit ${u.code}`} onClick={() => setSelectedUnitForView(u)}><Eye className="h-3.5 w-3.5" /></Button>
          {u.isCustom && (
            <>
              <Button variant="ghost" size="xs" aria-label={`Edit unit ${u.code}`} onClick={() => setSelectedUnitForEdit(u)}><Edit className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="xs" aria-label={`Delete unit ${u.code}`} onClick={() => setSelectedUnitForDelete(u)}><Trash2 className="h-3.5 w-3.5 text-status-danger-text" /></Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const pagedItems = filteredItems.slice((itemsPage - 1) * pageSize, itemsPage * pageSize);
  const pagedUnits = filteredUnits.slice((unitsPage - 1) * pageSize, unitsPage * pageSize);

  return (
    <>
      <ListPage
        header={{
          title: mainView === 'ITEMS' ? 'Items & Products' : 'Units of Measure',
          subtitle: 'HSN/SAC catalog, GST slabs, and statutory UQC units.',
          badge: <Badge variant="neutral" size="sm">{mainView === 'ITEMS' ? `${filteredItems.length} items` : `${filteredUnits.length} units`}</Badge>,
          actions: (
            <>
              <Button variant="outline" size="sm" onClick={() => setMainView(mainView === 'ITEMS' ? 'UNITS' : 'ITEMS')}>
                <Scale className="h-3.5 w-3.5 mr-1.5" />
                {mainView === 'ITEMS' ? 'Units View' : 'Items View'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowUnitModal(true)}>
                Manage Units
              </Button>
              <Button variant="outline" size="sm" onClick={loadItems} aria-label="Refresh items">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </>
          ),
        }}
        toolbar={{
          searchValue: mainView === 'ITEMS' ? searchTerm : unitSearch,
          onSearchChange: mainView === 'ITEMS' ? (v) => { setSearchTerm(v); setItemsPage(1); } : (v) => { setUnitSearch(v); setUnitsPage(1); },
          searchPlaceholder: mainView === 'ITEMS' ? 'Search code, name, or HSN...' : 'Search UQC code or unit...',
          filters: mainView === 'ITEMS' ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['ALL', 'GOODS', 'SERVICES'] as const).map((t) => (
                <Button key={t} size="xs" variant={filterType === t ? 'primary' : 'outline'} onClick={() => { setFilterType(t); setItemsPage(1); }}>{t}</Button>
              ))}
              {(['ALL', '0', '5', '12', '18', '28'] as const).map((g) => (
                <Button key={g} size="xs" variant={gstFilter === g ? 'secondary' : 'ghost'} onClick={() => { setGstFilter(g); setItemsPage(1); }}>{g === 'ALL' ? 'All GST' : `${g}%`}</Button>
              ))}
            </div>
          ) : undefined,
          primaryAction: (
            <Button variant="primary" size="sm" onClick={() => { setSelectedItemForEdit(null); setShowAddEditModal(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Item
            </Button>
          ),
        }}
        data={(mainView === 'ITEMS' ? pagedItems : pagedUnits) as any[]}
        columns={(mainView === 'ITEMS' ? itemColumns : unitColumns) as any[]}
        loading={mainView === 'ITEMS' ? loading : unitsLoading}
        error={error}
        onRetry={loadItems}
        hasActiveFilters={Boolean(searchTerm || filterType !== 'ALL' || gstFilter !== 'ALL')}
        empty={{ icon: <Boxes className="h-5 w-5" />, title: 'No items yet', description: 'Create your first product or service to bill faster.' }}
        filteredEmpty={{ title: 'No matching items', description: 'Adjust your search or GST slab filters.' }}
        tableProps={{
          page: mainView === 'ITEMS' ? itemsPage : unitsPage,
          pageSize,
          totalItems: mainView === 'ITEMS' ? filteredItems.length : filteredUnits.length,
          onPageChange: mainView === 'ITEMS' ? setItemsPage : setUnitsPage,
        }}
      />

      <ItemDialog open={showAddEditModal} onOpenChange={(o) => { setShowAddEditModal(o); if (!o) setSelectedItemForEdit(null); }} onSuccess={loadItems} companyId={activeCompanyId} initialData={selectedItemForEdit} />
      <ItemDetailsDialog
        open={Boolean(selectedItemForView)}
        onOpenChange={(o) => { if (!o) setSelectedItemForView(null); }}
        item={selectedItemForView}
        onEdit={(it) => { setSelectedItemForView(null); setSelectedItemForEdit(it); setShowAddEditModal(true); }}
        onDelete={(it) => { setSelectedItemForView(null); setItemToDelete(it); }}
      />
      <UnitManagerDialog open={showUnitModal} onOpenChange={setShowUnitModal} onUnitCreated={() => { loadUnits(); }} />
      <UnitDetailsDialog open={Boolean(selectedUnitForView)} onOpenChange={(o) => { if (!o) setSelectedUnitForView(null); }} unit={selectedUnitForView} />
      <EditUnitDialog open={Boolean(selectedUnitForEdit)} onOpenChange={(o) => { if (!o) setSelectedUnitForEdit(null); }} onSuccess={loadUnits} unit={selectedUnitForEdit} />
      <DeleteUnitDialog open={Boolean(selectedUnitForDelete)} onOpenChange={(o) => { if (!o) setSelectedUnitForDelete(null); }} onSuccess={loadUnits} unit={selectedUnitForDelete} />
      <ConfirmDialog
        open={Boolean(itemToDelete)}
        onOpenChange={(o) => { if (!o) setItemToDelete(null); }}
        onConfirm={async () => {
          if (itemToDelete) {
            await apiClient.deleteItem(activeCompanyId, itemToDelete.id);
            setItemToDelete(null);
            loadItems();
          }
        }}
        title="Delete Item"
        description={`Delete "${itemToDelete?.name}"? This cannot be undone.`}
        tone="danger"
      />
    </>
  );
}
