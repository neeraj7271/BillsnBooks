'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Command,
  ArrowRight,
  Layers,
  Receipt,
  CheckSquare,
  CreditCard,
  Compass,
  FileSpreadsheet,
  ArrowRightLeft,
  Users,
  Boxes,
  Scale,
  BarChart3,
  PieChart,
  FileText,
  BookOpen,
  Building2,
  CalendarClock,
  Server,
  Sun,
  Moon,
  Plus,
  X,
} from 'lucide-react';
import { useTheme } from './theme-provider';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Reports' | 'Actions' | 'Masters';
  icon: any;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    // Actions
    {
      id: 'create-invoice',
      title: 'Create Tax Invoice',
      category: 'Actions',
      icon: Plus,
      action: () => {
        router.push('/invoices/new');
        onClose();
      },
    },
    {
      id: 'toggle-theme',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      category: 'Actions',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => {
        toggleTheme();
        onClose();
      },
    },

    // Operations Navigation
    {
      id: 'nav-overview',
      title: 'Overview Cockpit',
      category: 'Navigation',
      icon: Layers,
      action: () => {
        router.push('/');
        onClose();
      },
    },
    {
      id: 'nav-invoices',
      title: 'Tax Invoices List',
      category: 'Navigation',
      icon: Receipt,
      action: () => {
        router.push('/invoices');
        onClose();
      },
    },
    {
      id: 'nav-approvals',
      title: 'Approval Inbox (Maker-Checker)',
      category: 'Navigation',
      icon: CheckSquare,
      action: () => {
        router.push('/approvals');
        onClose();
      },
    },
    {
      id: 'nav-banking',
      title: 'Banking & BRS Dashboard',
      category: 'Navigation',
      icon: CreditCard,
      action: () => {
        router.push('/banking');
        onClose();
      },
    },
    {
      id: 'nav-discovery',
      title: 'Unbilled Sales Discovery',
      category: 'Navigation',
      icon: Compass,
      action: () => {
        router.push('/banking/discovery');
        onClose();
      },
    },
    {
      id: 'nav-imports',
      title: 'Bulk Import Register',
      category: 'Navigation',
      icon: FileSpreadsheet,
      action: () => {
        router.push('/imports');
        onClose();
      },
    },
    {
      id: 'nav-vouchers',
      title: 'Vouchers & Canonical Journals',
      category: 'Navigation',
      icon: ArrowRightLeft,
      action: () => {
        router.push('/vouchers');
        onClose();
      },
    },

    // Reports
    {
      id: 'rep-tb',
      title: 'Trial Balance Report',
      category: 'Reports',
      icon: Scale,
      action: () => {
        router.push('/reports/trial-balance');
        onClose();
      },
    },
    {
      id: 'rep-pnl',
      title: 'Profit & Loss (P&L) Statement',
      category: 'Reports',
      icon: BarChart3,
      action: () => {
        router.push('/reports/profit-and-loss');
        onClose();
      },
    },
    {
      id: 'rep-bs',
      title: 'Balance Sheet Statement',
      category: 'Reports',
      icon: PieChart,
      action: () => {
        router.push('/reports/balance-sheet');
        onClose();
      },
    },
    {
      id: 'rep-gl',
      title: 'General Ledger Account Statement',
      category: 'Reports',
      icon: FileText,
      action: () => {
        router.push('/reports/general-ledger');
        onClose();
      },
    },

    // Masters & Governance
    {
      id: 'mst-parties',
      title: 'Customers & Vendors Directory',
      category: 'Masters',
      icon: Users,
      action: () => {
        router.push('/parties');
        onClose();
      },
    },
    {
      id: 'mst-items',
      title: 'Items & Products Catalog',
      category: 'Masters',
      icon: Boxes,
      action: () => {
        router.push('/items');
        onClose();
      },
    },
    {
      id: 'mst-coa',
      title: 'Chart of Accounts (COA)',
      category: 'Masters',
      icon: BookOpen,
      action: () => {
        router.push('/settings/ledgers');
        onClose();
      },
    },
    {
      id: 'mst-companies',
      title: 'Companies & Multi-Branch Setup',
      category: 'Masters',
      icon: Building2,
      action: () => {
        router.push('/settings/companies');
        onClose();
      },
    },
    {
      id: 'mst-periods',
      title: 'Month-End Period Locks',
      category: 'Masters',
      icon: CalendarClock,
      action: () => {
        router.push('/settings/periods');
        onClose();
      },
    },
    {
      id: 'mst-tally',
      title: 'Tally Prime Connector Bridge',
      category: 'Masters',
      icon: Server,
      action: () => {
        router.push('/settings/tally');
        onClose();
      },
    },
  ];

  const filtered = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const term = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(term) ||
      cmd.category.toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex]!.action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 bg-surface-overlay backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-default bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-subtle px-4 py-3 bg-surface-sunken">
          <Search className="h-4 w-4 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, page, or report to jump..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
          />
          <kbd className="hidden sm:inline-block rounded border border-default bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-border-subtle">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted">
              No matching commands or pages found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-colors ${
                    isSelected
                      ? 'bg-brand text-inverse font-semibold shadow-xs'
                      : 'text-secondary hover:bg-surface-sunken hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? 'text-inverse' : 'text-muted'
                      }`}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-brand-hover text-inverse'
                          : 'bg-surface-sunken text-muted'
                      }`}
                    >
                      {item.category}
                    </span>
                    <ArrowRight
                      className={`h-3 w-3 ${
                        isSelected ? 'text-inverse' : 'text-muted'
                      }`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="border-t border-subtle px-4 py-2 bg-surface-sunken text-[11px] text-muted flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-mono text-[10px] text-muted">Antigravity Command Palette</span>
        </div>
      </div>
    </div>
  );
}

