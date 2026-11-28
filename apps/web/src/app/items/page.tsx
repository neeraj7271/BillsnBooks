'use client';
import { logger } from '@/lib/logger';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  UploadCloud,
  Scale,
} from 'lucide-react';
import {
  Button,
  Badge,
  Select,
  ListPage,
  MoneyText,
  type ColumnDef,
  toast,
} from '@platform/ui';
import { GST_STATUTORY_UOM_LIST, normalizeGstUqc } from '@platform/shared-types';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { ItemDialog } from './item-dialog';
import { ItemDetailsDialog } from './item-details-dialog';
import { UnitManagerDialog } from './unit-manager-dialog';
import { UnitDetailsDialog } from './unit-details-dialog';
import { EditUnitDialog } from './edit-unit-dialog';
import { DeleteUnitDialog } from './delete-unit-dialog';
import { ImportItemsModal } from './import-items-modal';
import { DeleteItemDialog } from './delete-item-dialog';
import { ItemsUnitsTab, type UomRow } from './items-units-tab';

interface Item {
  id: string;
  itemCode: string;
  name: string;
  itemType: 'GOODS' | 'SERVICES';
  hsnSacCode: string;
  uom: string;
  unitPrice: number;
  gstRatePercent: number;
  cessRatePercent?: number;
  description?: string;
  isActive?: boolean;
}

export default function ItemsPage() {
  const { activeCompanyId } = useCompany();
  const [mainView, setMainView] = useState<'ITEMS' | 'UNITS'>('ITEMS');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserRole(localStorage.getItem('antigravity_user_role') || '');
    }
  }, []);
  const isReadOnly = userRole === 'CLIENT_VIEWER';

  // Items State
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { page: itemsPage, pageSize, setPage: setItemsPage, setPageSize } = useTablePagination({
    storageKey: 'items',
    defaultPageSize: 25,
  });

  // Units State
  const [units, setUnits] = useState<UomRow[]>([]);
  const [unitsLoading, setUnitsLoading] = useState<boolean>(false);

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<Item | null>(null);
  const [selectedItemForView, setSelectedItemForView] = useState<Item | null>(null);
  const [showUnitModal, setShowUnitModal] = useState<boolean>(false);
  const [lastCreatedUnit, setLastCreatedUnit] = useState<string | null>(null);

  // Unit Modals state
  const [selectedUnitForView, setSelectedUnitForView] = useState<UomRow | null>(null);
  const [selectedUnitForEdit, setSelectedUnitForEdit] = useState<UomRow | null>(null);
  const [selectedUnitForDelete, setSelectedUnitForDelete] = useState<UomRow | null>(null);

  // Deletion modal state
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, [activeCompanyId]);

  const loadAll = async () => {
    await Promise.all([loadItems(), loadUnits()]);
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listItems(activeCompanyId);
      setItems(data || []);
    } catch (err: unknown) {
      logger.error('Failed to list items:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async () => {
    setUnitsLoading(true);
    try {
      const data = await apiClient.listUnits(activeCompanyId);
      const customList = data?.custom || [];
      const standardList = data?.standard || GST_STATUTORY_UOM_LIST;

      const combined: UomRow[] = [
        ...customList.map((c: any) => ({
          code: c.code,
          name: c.name,
          category: 'CUSTOM',
          isCustom: true,
          description: c.description,
          usageCount: items.filter((it) => it.uom === c.code).length,
        })),
        ...standardList.map((s: any) => ({
          code: s.code,
          name: s.name,
          category: s.category || 'STANDARD',
          isCustom: false,
          description: 'Official statutory GST e-Invoicing UQC code',
          usageCount: items.filter((it) => it.uom === s.code || normalizeGstUqc(it.uom) === s.code).length,
        })),
      ];
      setUnits(combined);
    } catch (err: unknown) {
      logger.error('Failed to list units:', err);
    } finally {
      setUnitsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedItemForEdit(null);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (item: Item) => {
    setSelectedItemForEdit(item);
    setShowAddEditModal(true);
  };

  const handleOpenDelete = (item: Item) => {
    setItemToDelete(item);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await apiClient.deleteItem(activeCompanyId, itemToDelete.id);
      toast.success(`Item '${itemToDelete.name}' removed from catalog.`);
      setItemToDelete(null);
      await loadItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete item';
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchesSearch =
        it.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.hsnSacCode.includes(searchTerm);
      const matchesType = filterType === 'ALL' || it.itemType === filterType;
      return matchesSearch && matchesType;
    });
  }, [items, searchTerm, filterType]);

  const itemColumns: ColumnDef<Item>[] = [
    {
      key: 'itemCode',
      header: 'Code / SKU',
      width: '120px',
      cell: (it) => (
        <span className="font-mono font-bold text-xs text-status-info-text">
          {it.itemCode}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name & Specification',
      cell: (it) => (
        <div>
          <button
            type="button"
            onClick={() => setSelectedItemForView(it)}
            className="font-bold text-primary hover:text-brand-text hover:underline text-left block"
          >
            {it.name}
          </button>
          {it.description && (
            <div className="text-[11px] text-muted line-clamp-1">{it.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'itemType',
      header: 'Type',
      width: '100px',
      cell: (it) => (
        <Badge variant={it.itemType === 'GOODS' ? 'neutral' : 'brand'} size="xs">
          {it.itemType}
        </Badge>
      ),
    },
    {
      key: 'hsnSacCode',
      header: 'HSN / SAC',
      width: '110px',
      cell: (it) => (
        <span className="font-mono text-xs text-secondary">
          {it.hsnSacCode}
        </span>
      ),
    },
    {
      key: 'gstRatePercent',
      header: 'GST Rate',
      align: 'right',
      cell: (it) => (
        <span className="font-mono text-xs font-semibold">
          {it.gstRatePercent}%
        </span>
      ),
    },
    {
      key: 'unitPrice',
      header: 'Rate / UOM',
      align: 'right',
      cell: (it) => (
        <div className="text-right">
          <MoneyText amount={it.unitPrice} />
          <span className="text-[10px] text-muted ml-1 uppercase font-mono">/ {it.uom}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (it) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted hover:text-status-info-text hover:bg-status-info-subtle"
            title="View full item profile"
            onClick={() => setSelectedItemForView(it)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted hover:text-status-success-text hover:bg-status-success-subtle"
            title="Edit item"
            onClick={() => handleOpenEdit(it)}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted hover:text-status-danger-text hover:bg-status-danger-subtle"
            title="Delete / Deactivate"
            onClick={() => handleOpenDelete(it)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-default pb-3">
        <button
          type="button"
          onClick={() => {
            setMainView('ITEMS');
            setItemsPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
            mainView === 'ITEMS'
              ? 'bg-status-info-subtle text-status-info-text shadow-xs'
              : 'text-muted hover:text-primary'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Products & Services Catalog</span>
          <span className="text-xs px-1.5 py-0.2 rounded-full bg-surface text-status-info-text font-semibold">
            {items.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMainView('UNITS');
            loadUnits();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
            mainView === 'UNITS'
              ? 'bg-status-info-subtle text-status-info-text shadow-xs'
              : 'text-muted hover:text-primary'
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>Units of Measure (UOM Master)</span>
          <span className="text-xs px-1.5 py-0.2 rounded-full bg-surface-sunken text-secondary font-semibold">
            {units.length}
          </span>
        </button>
      </div>

      {mainView === 'ITEMS' ? (
        <ListPage
          header={{
            title: 'Item & Service Master',
            subtitle: 'Catalog of billable goods and professional services with statutory HSN/SAC codes.',
            badge: <Badge variant="neutral" size="sm">{filteredItems.length} Products</Badge>,
            actions: (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadItems}
                  loading={loading}
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                >
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMainView('UNITS')}
                  leftIcon={<Scale className="h-3.5 w-3.5" />}
                >
                  View Units Table
                </Button>
                {!isReadOnly && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImportModal(true)}
                      leftIcon={<UploadCloud className="h-3.5 w-3.5" />}
                    >
                      Import
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenCreate}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                    >
                      Add Item
                    </Button>
                  </>
                )}
              </div>
            ),
          }}
          toolbar={{
            searchValue: searchTerm,
            onSearchChange: (val) => {
              setSearchTerm(val);
              setItemsPage(1);
            },
            searchPlaceholder: 'Search by name, SKU or HSN...',
            filters: (
              <Select
                size="sm"
                value={filterType}
                onValueChange={(val) => {
                  setFilterType(val);
                  setItemsPage(1);
                }}
                options={[
                  { label: 'All Items', value: 'ALL' },
                  { label: 'Goods Only', value: 'GOODS' },
                  { label: 'Services Only', value: 'SERVICES' },
                ]}
              />
            ),
          }}
          data={filteredItems}
          columns={itemColumns}
          loading={loading}
          hasActiveFilters={filterType !== 'ALL' || Boolean(searchTerm.trim())}
          empty={{
            title: 'No items yet',
            description: 'Add goods or services you sell.',
            action: { label: 'Add Item', onClick: handleOpenCreate },
          }}
          filteredEmpty={{
            title: 'No matching items found',
            description: 'Try adjusting your search criteria or item type filter.',
            action: {
              label: 'Clear Filters',
              onClick: () => {
                setFilterType('ALL');
                setSearchTerm('');
              },
            },
          }}
          tableProps={{
            page: itemsPage,
            pageSize,
            onPageChange: setItemsPage,
            onPageSizeChange: setPageSize,
          }}
        />
      ) : (
        <ItemsUnitsTab
          units={units}
          loading={unitsLoading}
          pageSize={pageSize}
          onRefresh={loadUnits}
          onCreateUnit={() => setShowUnitModal(true)}
          onViewUnit={(u) => setSelectedUnitForView(u)}
          onEditUnit={(u) => setSelectedUnitForEdit(u)}
          onDeleteUnit={(u) => setSelectedUnitForDelete(u)}
        />
      )}

      {/* Create / Edit Dialog */}
      <ItemDialog
        open={showAddEditModal}
        companyId={activeCompanyId}
        initialData={selectedItemForEdit}
        createdUnit={lastCreatedUnit}
        onOpenChange={setShowAddEditModal}
        onSuccess={loadAll}
        onOpenUnitManager={() => setShowUnitModal(true)}
      />

      {/* Units of Measure Dialog */}
      <UnitManagerDialog
        open={showUnitModal}
        onOpenChange={setShowUnitModal}
        onUnitsUpdated={loadAll}
        onUnitCreated={(code) => {
          setLastCreatedUnit(code);
        }}
      />

      {/* View Details Dialog */}
      <ItemDetailsDialog
        item={selectedItemForView}
        open={!!selectedItemForView}
        onOpenChange={(open) => !open && setSelectedItemForView(null)}
        onEdit={(it) => {
          setSelectedItemForView(null);
          handleOpenEdit(it);
        }}
        onDelete={(it) => {
          setSelectedItemForView(null);
          handleOpenDelete(it);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteItemDialog
        item={itemToDelete}
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        deleteLoading={deleteLoading}
        deleteError={deleteError}
        onConfirm={handleConfirmDelete}
      />
      {/* Unit Details Dialog (View) */}
      <UnitDetailsDialog
        open={!!selectedUnitForView}
        onOpenChange={(open) => !open && setSelectedUnitForView(null)}
        unit={selectedUnitForView}
        assignedItems={
          selectedUnitForView
            ? items.filter(
                (it) =>
                  it.uom === selectedUnitForView.code ||
                  normalizeGstUqc(it.uom) === selectedUnitForView.code,
              )
            : []
        }
        onEdit={(u) => setSelectedUnitForEdit(u)}
      />

      {/* Edit Unit Dialog */}
      <EditUnitDialog
        open={!!selectedUnitForEdit}
        onOpenChange={(open) => !open && setSelectedUnitForEdit(null)}
        unit={selectedUnitForEdit}
        onSuccess={async () => {
          await loadUnits();
          await loadItems();
        }}
      />

      {/* Delete Unit Dialog */}
      <DeleteUnitDialog
        open={!!selectedUnitForDelete}
        onOpenChange={(open) => !open && setSelectedUnitForDelete(null)}
        unit={selectedUnitForDelete}
        assignedItems={
          selectedUnitForDelete
            ? items.filter(
                (it) =>
                  it.uom === selectedUnitForDelete.code ||
                  normalizeGstUqc(it.uom) === selectedUnitForDelete.code,
              )
            : []
        }
        onSuccess={async () => {
          await loadUnits();
          await loadItems();
        }}
      />

      <ImportItemsModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSuccess={loadItems}
      />
    </div>
  );
}
