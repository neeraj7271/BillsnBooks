'use client';

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Scale,
  Lock,
} from 'lucide-react';
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
  isActive?: boolean;
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

  // Items State
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [itemsPage, setItemsPage] = useState<number>(1);

  // Units State
  const [units, setUnits] = useState<UomRow[]>([]);
  const [unitsLoading, setUnitsLoading] = useState<boolean>(false);
  const [unitFilter, setUnitFilter] = useState<'ALL' | 'CUSTOM' | 'STATUTORY'>('ALL');
  const [unitSearch, setUnitSearch] = useState<string>('');
  const [unitsPage, setUnitsPage] = useState<number>(1);

  const pageSize = 10;

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
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
      console.error('Failed to list items:', err);
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
      console.error('Failed to list units:', err);
    } finally {
      setUnitsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedItemForEdit(null);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (it: Item) => {
    setSelectedItemForEdit(it);
    setShowAddEditModal(true);
  };

  const handleOpenDelete = (it: Item) => {
    setItemToDelete(it);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await apiClient.deleteItem(activeCompanyId, itemToDelete.id);
      setItemToDelete(null);
      await loadItems();
      await loadUnits();
    } catch (err: unknown) {
      let msg = 'Failed to delete item';
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

  const handleDeleteCustomUnit = async (code: string) => {
    try {
      await apiClient.deleteCustomUnit(activeCompanyId, code);
      await loadUnits();
    } catch (err: unknown) {
      let msg = 'Failed to delete unit';
      if (err instanceof Error) msg = err.message;
      else if (typeof err === 'object' && err !== null) msg = (err as any).message || JSON.stringify(err);
      alert(msg);
    }
  };

  // Filtered & Paginated Items
  const filteredItems = items.filter((it) => {
    if (filterType !== 'ALL' && it.itemType !== filterType) return false;
    const term = searchTerm.toLowerCase();
    return (
      it.name.toLowerCase().includes(term) ||
      it.itemCode.toLowerCase().includes(term) ||
      it.hsnSacCode.toLowerCase().includes(term)
    );
  });

  const paginatedItems = filteredItems.slice(
    (itemsPage - 1) * pageSize,
    itemsPage * pageSize
  );

  // Filtered & Paginated Units
  const filteredUnits = units.filter((u) => {
    if (unitFilter === 'CUSTOM' && !u.isCustom) return false;
    if (unitFilter === 'STATUTORY' && u.isCustom) return false;
    const term = unitSearch.toLowerCase();
    return (
      u.code.toLowerCase().includes(term) ||
      u.name.toLowerCase().includes(term) ||
      (u.description && u.description.toLowerCase().includes(term))
    );
  });

  const paginatedUnits = filteredUnits.slice(
    (unitsPage - 1) * pageSize,
    unitsPage * pageSize
  );

  // Columns for Items Table
  const itemColumns: ColumnDef<Item>[] = [
    {
      key: 'itemCode',
      header: 'SKU / Code',
      width: '120px',
      cell: (it) => (
        <span className="font-mono font-bold text-xs text-status-info-text">
          {it.itemCode}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Item & Description',
      cell: (it) => (
        <div>
          <div className="font-bold text-primary">{it.name}</div>
          {it.description && (
            <div className="text-[11px] text-muted truncate max-w-xs">{it.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'itemType',
      header: 'Classification',
      cell: (it) => (
        <Badge variant={it.itemType === 'SERVICES' ? 'brand' : 'neutral'} size="xs">
          {it.itemType}
        </Badge>
      ),
    },
    {
      key: 'hsnSacCode',
      header: 'HSN / SAC',
      cell: (it) => (
        <span className="font-mono text-xs text-secondary font-medium">
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

  // Columns for Units Table
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
            onClick={() => setSelectedUnitForView(u)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>

          {u.isCustom ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted hover:text-status-success-text hover:bg-status-success-subtle"
              title={`Edit custom unit ${u.code}`}
              onClick={() => setSelectedUnitForEdit(u)}
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
              onClick={() => setSelectedUnitForDelete(u)}
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
            setUnitsPage(1);
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
        /* ITEMS VIEW */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-primary">
                  Item & Service Master
                </h1>
                <Badge variant="neutral" size="sm">{filteredItems.length} Products</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                Catalog of billable goods and professional services with statutory HSN/SAC codes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadItems} loading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
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
              <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Add Item
              </Button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search by name, SKU or HSN..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setItemsPage(1);
                }}
                leftAddon={<Search className="h-3.5 w-3.5" />}
                size="sm"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-surface-sunken rounded-xl">
              {['ALL', 'SERVICES', 'GOODS'].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setFilterType(t);
                    setItemsPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    filterType === t
                      ? 'bg-surface text-primary shadow-xs'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  {t === 'ALL' ? 'All Items' : t === 'SERVICES' ? 'Services' : 'Goods'}
                </button>
              ))}
            </div>
          </div>

          {/* Data Table with Pagination */}
          <DataTable
            columns={itemColumns}
            data={paginatedItems}
            loading={loading}
            page={itemsPage}
            pageSize={pageSize}
            totalItems={filteredItems.length}
            onPageChange={setItemsPage}
            emptyTitle="No items in catalog"
            emptyDescription="Create your first billable item or service to begin issuing invoices."
          />
        </div>
      ) : (
        /* UNITS VIEW */
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
              <Button variant="outline" size="sm" onClick={loadUnits} loading={unitsLoading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
                Refresh
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowUnitModal(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
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
            data={paginatedUnits}
            loading={unitsLoading}
            page={unitsPage}
            pageSize={pageSize}
            totalItems={filteredUnits.length}
            onPageChange={setUnitsPage}
            emptyTitle="No units found"
            emptyDescription="No measurement units match your search criteria."
          />
        </div>
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

      {/* Delete / Deactivate Confirmation Dialog */}
      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Remove Catalog Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &apos;{itemToDelete?.name}&apos; ({itemToDelete?.itemCode})?
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
                Double-Entry Accounting & Statutory Safeguard:
              </span>
              If this item has been used on issued invoices, deletion is safely blocked to protect billing registers. If unused, it will be deactivated and removed from active catalogs.
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setItemToDelete(null)}
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
    </div>
  );
}
