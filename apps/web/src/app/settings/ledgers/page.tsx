'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  Lock,
  Landmark,
  Layers,
  Sparkles,
  Trash2,
  List,
  GitBranch,
} from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  DataTable,
  MoneyText,
  Card,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { LedgerDialog } from './ledger-dialog';
import { GroupDialog } from './group-dialog';

interface LedgerItem {
  id: string;
  code: string;
  name: string;
  systemKey?: string | null;
  isSystem: boolean;
  isLocked: boolean;
  isActive: boolean;
  isBankOrCash: boolean;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  gstTaxType?: string | null;
  gstRate?: number | null;
  tallyLedgerName?: string | null;
  scheduleIiiMapping?: string | null;
  group?: {
    id: string;
    code: string;
    name: string;
    nature: string;
    report?: string;
  };
}

interface TreeNode {
  id: string;
  code: string;
  name: string;
  systemKey?: string | null;
  isSystem: boolean;
  isLocked: boolean;
  isActive: boolean;
  nature: string;
  report: string;
  normalBalance: string;
  affectsGrossProfit: boolean;
  tallyGroupName?: string | null;
  scheduleIiiMapping?: string | null;
  subGroups: TreeNode[];
  ledgers: LedgerItem[];
}

export default function ChartOfAccountsPage() {
  const { activeCompanyId } = useCompany();
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [flatLedgers, setFlatLedgers] = useState<LedgerItem[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNature, setSelectedNature] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'TREE' | 'FLAT'>('TREE');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Modal states
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<string | undefined>(undefined);
  const [seeding, setSeeding] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [treeRes, ledgersRes, groupsRes] = await Promise.all([
        apiClient.getLedgerTree(activeCompanyId),
        apiClient.listLedgers(activeCompanyId),
        apiClient.listLedgerGroups(activeCompanyId),
      ]);
      setTreeData(treeRes || []);
      setFlatLedgers(ledgersRes || []);
      setGroups(groupsRes || []);

      // Default expand root nodes
      if (treeRes && treeRes.length > 0) {
        const rootIds = new Set<string>();
        treeRes.forEach((n: TreeNode) => {
          rootIds.add(n.id);
          n.subGroups.forEach((sg: TreeNode) => rootIds.add(sg.id));
        });
        setExpandedNodes(rootIds);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load chart of accounts';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCompanyId]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleOpenAddLedger = (groupId?: string) => {
    setTargetGroupId(groupId);
    setLedgerModalOpen(true);
  };

  const handleOpenAddGroup = (parentGroupId?: string) => {
    setTargetGroupId(parentGroupId);
    setGroupModalOpen(true);
  };

  const handleDeleteLedger = async (ledger: LedgerItem) => {
    if (ledger.currentBalance && Math.abs(ledger.currentBalance) > 0) {
      if (
        !confirm(
          `WARNING: Ledger "${ledger.name}" has an active running balance of ₹${Math.abs(ledger.currentBalance).toLocaleString('en-IN')}.\n\nDeleting an account with posted voucher transactions will violate double-entry balancing invariants.\n\nAre you sure you want to attempt deletion?`
        )
      ) {
        return;
      }
    } else if (!confirm(`Are you sure you want to delete ledger "${ledger.name}"?`)) {
      return;
    }
    try {
      await apiClient.deleteLedger(activeCompanyId, ledger.id);
      setSuccess(`Ledger "${ledger.name}" deleted successfully.`);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete ledger');
    }
  };

  const handleDeleteGroup = async (group: TreeNode) => {
    if (!confirm(`Are you sure you want to delete group "${group.name}"?`)) return;
    try {
      await apiClient.deleteLedgerGroup(activeCompanyId, group.id);
      setSuccess(`Group "${group.name}" deleted successfully.`);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete group');
    }
  };

  const handleSeedStandardCoa = async (template = 'TRADER') => {
    setSeeding(true);
    setError(null);
    try {
      const res = await apiClient.seedLedgers(activeCompanyId, template);
      setSuccess(
        `Standard Statutory Chart of Accounts seeded successfully (${res.groupsCreated} groups, ${res.ledgersCreated} ledgers created).`,
      );
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to seed chart of accounts');
    } finally {
      setSeeding(false);
    }
  };

  // Group tree nodes by Nature
  const natureGroups = useMemo(() => {
    const map: Record<string, TreeNode[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      INCOME: [],
      EXPENSE: [],
    };

    treeData.forEach((node) => {
      if (map[node.nature]) {
        map[node.nature].push(node);
      } else {
        map['ASSET'].push(node);
      }
    });

    return map;
  }, [treeData]);

  // Flat view columns
  const flatColumns: ColumnDef<LedgerItem>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '100px',
      cell: (l) => <span className="font-mono font-bold text-xs text-brand-text">{l.code}</span>,
    },
    {
      key: 'name',
      header: 'Account Name',
      cell: (l) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary">{l.name}</span>
          {l.isBankOrCash && <Badge variant="brand" size="xs">Bank / Cash</Badge>}
          {l.isLocked && (
            <span title="Locked System Account">
              <Lock className="h-3 w-3 text-muted inline" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'group',
      header: 'Group & Classification',
      cell: (l) => (
        <span className="text-xs text-secondary">{l.group?.name || 'Unassigned'}</span>
      ),
    },
    {
      key: 'nature',
      header: 'Nature',
      cell: (l) => {
        const nat = l.group?.nature || 'ASSET';
        const variant =
          nat === 'ASSET' || nat === 'EXPENSE'
            ? 'brand'
            : nat === 'INCOME'
            ? 'success'
            : 'warning';
        return <Badge variant={variant} size="xs">{nat}</Badge>;
      },
    },
    {
      key: 'balance',
      header: 'Current Balance',
      align: 'right',
      cell: (l) => (
        <MoneyText
          amount={l.currentBalance}
          currency={l.currency || 'INR'}
          className="text-xs font-semibold"
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (l) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/reports/general-ledger?ledgerId=${l.id}`}
            className="p-1 text-muted hover:text-brand-text hover:bg-brand-subtle rounded transition"
            title="View General Ledger Statement"
          >
            <BookOpen className="h-3.5 w-3.5" />
          </Link>
          {!l.isLocked ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleDeleteLedger(l)}
              className="text-status-danger-text hover:bg-status-danger-subtle"
              title="Delete ledger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const filteredFlatLedgers = flatLedgers.filter((l) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = l.name.toLowerCase().includes(term) || l.code.toLowerCase().includes(term);
    const matchesNature = selectedNature === 'ALL' || l.group?.nature === selectedNature;
    return matchesSearch && matchesNature;
  });

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.subGroups.length > 0 || node.ledgers.length > 0;
    const matchesSearch =
      !searchQuery ||
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.code.includes(searchQuery);

    return (
      <div key={node.id} className="text-xs">
        {/* Group Header Row */}
        <div
          className={`group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-row-hover transition ${
            depth > 0 ? 'ml-6 border-l border-default pl-3' : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => toggleNode(node.id)}
              className="text-muted hover:text-primary p-0.5 rounded"
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )
              ) : (
                <span className="w-3.5 inline-block" />
              )}
            </button>

            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-brand-text shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-muted shrink-0" />
            )}

            <span className="font-mono font-semibold text-brand-text text-[11px]">
              {node.code}
            </span>

            <span className="font-bold text-primary truncate">
              {node.name}
            </span>

            {node.affectsGrossProfit && (
              <Badge variant="warning" size="xs">Trading A/c</Badge>
            )}

            {node.isLocked && (
              <span title="Locked System Primary Group">
                <Lock className="h-3 w-3 text-muted" />
              </span>
            )}

            <span className="text-[10px] text-muted">
              ({node.ledgers.length} ledgers, {node.subGroups.length} sub-groups)
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleOpenAddLedger(node.id)}
              className="text-[10px] h-6 px-1.5 text-brand-text"
            >
              <Plus className="h-3 w-3 mr-0.5" /> Ledger
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleOpenAddGroup(node.id)}
              className="text-[10px] h-6 px-1.5 text-secondary"
            >
              <Plus className="h-3 w-3 mr-0.5" /> Sub-Group
            </Button>
            {!node.isLocked && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleDeleteGroup(node)}
                className="h-6 w-6 p-0 text-status-danger-text hover:bg-status-danger-subtle"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Children (Sub-Groups & Ledgers) */}
        {isExpanded && (
          <div className="space-y-0.5 my-0.5">
            {/* Sub-groups */}
            {node.subGroups.map((sg) => renderTreeNode(sg, depth + 1))}

            {/* Ledgers under this group */}
            {node.ledgers.map((l) => (
              <div
                key={l.id}
                className={`group flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-brand-subtle text-secondary transition ${
                  depth > 0 ? 'ml-12 border-l border-default pl-3' : 'ml-6'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-muted shrink-0" />
                  <span className="font-mono text-[11px] text-secondary font-medium">
                    {l.code}
                  </span>
                  <span className="font-medium text-primary truncate">
                    {l.name}
                  </span>
                  {l.isBankOrCash && (
                    <Badge variant="brand" size="xs">
                      <Landmark className="h-2.5 w-2.5 mr-0.5" /> Bank/Cash
                    </Badge>
                  )}
                  {l.gstTaxType && (
                    <Badge variant="info" size="xs">{l.gstTaxType}</Badge>
                  )}
                  {l.isLocked && (
                    <span title="Locked System Ledger">
                      <Lock className="h-3 w-3 text-muted" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <MoneyText
                    amount={l.currentBalance}
                    currency={l.currency || 'INR'}
                    className="font-mono text-xs font-semibold"
                  />
                  <Link
                    href={`/reports/general-ledger?ledgerId=${l.id}`}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-brand-text hover:bg-brand-subtle rounded transition"
                    title="View General Ledger Statement"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                  </Link>
                  {!l.isLocked ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleDeleteLedger(l)}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-status-danger-text hover:bg-status-danger-subtle"
                      title="Delete ledger"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  ) : (
                    <span className="w-6" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-default pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-primary tracking-tight">
              Chart of Accounts (COA)
            </h1>
            <Badge variant="brand" size="xs">Auto-Managed Numbering</Badge>
          </div>
          <p className="text-xs text-secondary mt-1">
            Standard double-entry statutory accounts with automatic 4-digit code allocation (1000–4999).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {flatLedgers.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              loading={seeding}
              onClick={() => handleSeedStandardCoa('TRADER')}
            >
              <Sparkles className="h-4 w-4 mr-1.5 text-brand-text" /> Seed Standard Accounts
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => handleOpenAddGroup()}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Group
          </Button>

          <Button variant="primary" size="sm" onClick={() => handleOpenAddLedger()}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Ledger
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-status-danger-subtle border border-default text-xs font-medium text-status-danger-text flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-status-danger-text font-bold ml-2">✕</button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-status-success-subtle border border-default text-xs font-medium text-status-success-text flex items-center justify-between">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} className="text-status-success-text font-bold ml-2">✕</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-surface border border-default rounded-xl">
          <p className="text-xs font-medium text-secondary">Total Ledger Groups</p>
          <p className="text-xl font-black text-primary mt-1">{groups.length}</p>
          <span className="text-[10px] text-status-info-text font-medium">Standard 28 Tally Groups</span>
        </Card>

        <Card className="p-4 bg-surface border border-default rounded-xl">
          <p className="text-xs font-medium text-secondary">Standard Active Ledgers</p>
          <p className="text-xl font-black text-primary mt-1">{flatLedgers.length}</p>
          <span className="text-[10px] text-status-success-text font-medium">Auto-Numbered (1000–4999)</span>
        </Card>

        <Card className="p-4 bg-surface border border-default rounded-xl">
          <p className="text-xs font-medium text-secondary">Bank & Cash Ledgers</p>
          <p className="text-xl font-black text-primary mt-1">
            {flatLedgers.filter((l) => l.isBankOrCash).length}
          </p>
          <span className="text-[10px] text-muted">BRS & Cash Rules Active</span>
        </Card>

        <Card className="p-4 bg-surface border border-default rounded-xl">
          <p className="text-xs font-medium text-secondary">System Locked Ledgers</p>
          <p className="text-xl font-black text-primary mt-1">
            {flatLedgers.filter((l) => l.isLocked).length}
          </p>
          <span className="text-[10px] text-brand-text font-medium">Protected against deletion</span>
        </Card>
      </div>

      {/* Toolbar: Search, Nature Filters, View Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-default">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, account, or group..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Nature filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].map((nat) => (
              <button
                key={nat}
                type="button"
                onClick={() => setSelectedNature(nat)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition ${
                  selectedNature === nat
                    ? 'bg-brand text-inverse shadow-sm'
                    : 'text-secondary hover:bg-surface-sunken'
                }`}
              >
                {nat === 'ALL' ? 'All Natures' : nat}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center border border-default rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('TREE')}
              className={`p-1.5 rounded transition ${
                viewMode === 'TREE'
                  ? 'bg-surface-sunken text-brand-text font-bold'
                  : 'text-muted hover:text-primary'
              }`}
              title="Hierarchy Tree View"
            >
              <GitBranch className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('FLAT')}
              className={`p-1.5 rounded transition ${
                viewMode === 'FLAT'
                  ? 'bg-surface-sunken text-brand-text font-bold'
                  : 'text-muted hover:text-primary'
              }`}
              title="Flat Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button variant="ghost" size="sm" onClick={loadData} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'TREE' ? (
        <div className="space-y-4">
          {['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']
            .filter((nat) => selectedNature === 'ALL' || selectedNature === nat)
            .map((natureKey) => {
              const nodes = natureGroups[natureKey] || [];
              if (nodes.length === 0) return null;

              const titleMap: Record<string, string> = {
                ASSET: 'Assets (Codes 1000–1999)',
                LIABILITY: 'Liabilities (Codes 2100–2499)',
                EQUITY: 'Capital & Reserves (Codes 2000–2099)',
                INCOME: 'Income & Revenue (Codes 3000–3999)',
                EXPENSE: 'Expenses & Costs (Codes 4000–4999)',
              };

              return (
                <Card
                  key={natureKey}
                  className="p-4 bg-surface border border-default rounded-xl"
                >
                  <div className="flex items-center justify-between border-b border-subtle pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-brand-text" />
                      <h2 className="text-xs font-black uppercase tracking-wider text-primary">
                        {titleMap[natureKey]}
                      </h2>
                    </div>
                    <Badge variant="neutral" size="xs">
                      {nodes.length} Primary Groups
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    {nodes.map((node) => renderTreeNode(node, 0))}
                  </div>
                </Card>
              );
            })}
        </div>
      ) : (
        <DataTable
          columns={flatColumns}
          data={filteredFlatLedgers}
          loading={loading}
          emptyTitle="No ledgers match your criteria."
        />
      )}

      {/* Dialogs */}
      <LedgerDialog
        open={ledgerModalOpen}
        groups={groups}
        defaultGroupId={targetGroupId}
        onOpenChange={setLedgerModalOpen}
        onSuccess={(name) => {
          setSuccess(`Ledger "${name}" created with auto-assigned code.`);
          loadData();
        }}
      />

      <GroupDialog
        open={groupModalOpen}
        groups={groups}
        defaultParentGroupId={targetGroupId}
        onOpenChange={setGroupModalOpen}
        onSuccess={(name) => {
          setSuccess(`Group "${name}" created with auto-assigned code.`);
          loadData();
        }}
      />
    </div>
  );
}
