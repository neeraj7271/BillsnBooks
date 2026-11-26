'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Layers,
  CreditCard,
  Compass,
  FileSpreadsheet,
  ArrowRightLeft,
  Scale,
  BarChart3,
  PieChart,
  FileText,
  CalendarClock,
  BookOpen,
  Building2,
  Server,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  X,
  ExternalLink,
  Users,
  Boxes,
  CheckSquare,
  Receipt,
  Hash,
  Sliders,
  Settings,
  Bell,
  Landmark,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface SidebarNavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  statusDot?: string;
}

interface SidebarSection {
  title: string;
  items: SidebarNavItem[];
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { activeCompany, tallyEnabled, invoicingOnly } = useCompany();
  const [tallyOnline, setTallyOnline] = useState<boolean>(true);

  useEffect(() => {
    if (!tallyEnabled) {
      setTallyOnline(false);
      return;
    }
    apiClient
      .getTallyConnector()
      .then((conn) => {
        setTallyOnline(conn?.status === 'ONLINE');
      })
      .catch(() => setTallyOnline(false));
  }, [tallyEnabled]);

  // Close mobile sidebar on route transition
  useEffect(() => {
    onCloseMobile();
  }, [pathname]);

  // Manage collapsible sections (persisted to localStorage)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('antigravity_sidebar_collapsed_sections');
      if (stored) {
        setCollapsedSections(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem(
          'antigravity_sidebar_collapsed_sections',
          JSON.stringify(next),
        );
      } catch {
        // Ignore localStorage write errors
      }
      return next;
    });
  };

  const navigationSections: SidebarSection[] = invoicingOnly
    ? [
        {
          title: 'Sales',
          items: [
            { label: 'Home', href: '/', icon: Layers },
            { label: 'Invoices', href: '/invoices', icon: Receipt },
            { label: 'Approvals', href: '/approvals', icon: CheckSquare },
            { label: 'Parties', href: '/parties', icon: Users },
            { label: 'Items', href: '/items', icon: Boxes },
            { label: 'Imports', href: '/imports', icon: FileSpreadsheet },
          ],
        },
        {
          title: 'Money',
          items: [
            { label: 'Payment Links', href: '/collections/payment-links', icon: CreditCard },
            { label: 'Ageing', href: '/collections/ageing', icon: BarChart3 },
            { label: 'Recurring', href: '/collections/recurring', icon: CalendarClock },
          ],
        },
        {
          title: 'Setup',
          items: [
            { label: 'Settings', href: '/settings', icon: Settings },
            { label: 'Branding', href: '/settings/invoice-branding', icon: Sliders },
            { label: 'Numbering', href: '/settings/numbering', icon: Hash },
            { label: 'Notifications', href: '/settings/notifications', icon: Bell },
            { label: 'Companies', href: '/settings/companies', icon: Building2 },
          ],
        },
      ]
    : [
        {
          title: 'Sales',
          items: [
            { label: 'Home', href: '/', icon: Layers },
            { label: 'Invoices', href: '/invoices', icon: Receipt },
            { label: 'Approvals', href: '/approvals', icon: CheckSquare },
            { label: 'Parties', href: '/parties', icon: Users },
            { label: 'Items', href: '/items', icon: Boxes },
            { label: 'Imports', href: '/imports', icon: FileSpreadsheet },
          ],
        },
        {
          title: 'Money',
          items: [
            { label: 'Vouchers', href: '/vouchers', icon: ArrowRightLeft },
            { label: 'Banking', href: '/banking', icon: CreditCard },
            { label: 'Discovery', href: '/banking/discovery', icon: Compass },
            { label: 'Payment Links', href: '/collections/payment-links', icon: CreditCard },
            { label: 'Ageing', href: '/collections/ageing', icon: BarChart3 },
            { label: 'Recurring', href: '/collections/recurring', icon: CalendarClock },
          ],
        },
        {
          title: 'Reports',
          items: [
            { label: 'Reports', href: '/reports', icon: FileSpreadsheet },
            { label: 'Customer-Wise Sales', href: '/reports/customer-sales', icon: Users },
            { label: 'Item-Wise Sales', href: '/reports/item-sales', icon: Boxes },
            { label: 'Purchases & Expenses', href: '/reports/expenses', icon: Receipt },
            { label: 'Cash & Bank Audit', href: '/reports/cash-bank-audit', icon: Landmark },
            { label: 'Payables & Vendors', href: '/reports/payables', icon: Users },
            { label: 'Trial Balance', href: '/reports/trial-balance', icon: Scale },
            { label: 'P&L', href: '/reports/profit-and-loss', icon: BarChart3 },
            { label: 'Balance Sheet', href: '/reports/balance-sheet', icon: PieChart },
            { label: 'General Ledger', href: '/reports/general-ledger', icon: FileText },
          ],
        },
        {
          title: 'Practice',
          items: [
            { label: 'Clients', href: '/practice/clients', icon: Building2 },
            { label: 'Tasks', href: '/practice/tasks', icon: CheckSquare },
            { label: 'Calendar', href: '/practice/calendar', icon: CalendarClock },
            { label: 'Documents', href: '/practice/documents', icon: FileSpreadsheet },
          ],
        },
        {
          title: 'Setup',
          items: [
            { label: 'Settings', href: '/settings', icon: Settings },
            { label: 'Chart of Accounts', href: '/settings/ledgers', icon: BookOpen },
            { label: 'Companies', href: '/settings/companies', icon: Building2 },
            { label: 'Branding', href: '/settings/invoice-branding', icon: Sliders },
            { label: 'Numbering', href: '/settings/numbering', icon: Hash },
            { label: 'Notifications', href: '/settings/notifications', icon: Bell },
            { label: 'Period Locks', href: '/settings/periods', icon: CalendarClock },
            ...(tallyEnabled
              ? [
                  {
                    label: 'Tally',
                    href: '/settings/tally',
                    icon: Server,
                    statusDot: tallyOnline ? 'bg-status-success' : 'bg-status-warning',
                  },
                ]
              : []),
          ],
        },
      ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto overflow-x-hidden bg-white bg-surface border-r border border-strong transition-colors duration-200">
      {/* Sidebar Header: Brand & Collapse Trigger */}
      <div className="flex flex-col border-b border-subtle border-strong p-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand via-brand to-brand text-white font-bold shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-primary dark:text-white leading-tight">
                    Antigravity
                  </span>
                  <span className="text-[10px] font-bold text-brand-text text-brand bg-brand-subtle bg-brand px-1.5 py-0.2 rounded border border-focus border-focus leading-tight">
                    Books
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted text-muted font-semibold leading-none">
                  Enterprise Financial OS
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border border-strong bg-canvas bg-surface-raised text-muted hover:text-primary dark:hover:text-white transition shadow-xs"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden text-muted hover:text-secondary hover:text-primary-inverse"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Active Company Pill (shown when expanded) */}
        {!isCollapsed && (
          <Link
            href="/settings/companies"
            className="mt-4 flex items-center gap-2.5 rounded-xl border border border-strong bg-canvas bg-surface-raised p-2.5 text-xs text-secondary text-muted hover:border-focus hover:border-focus transition"
          >
            <Building2 className="h-4 w-4 text-brand-text text-brand shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-bold block text-primary text-primary-inverse truncate">
                {activeCompany?.legalName || 'Acme Solutions'}
              </span>
              <span className="font-mono text-[10px] text-muted block truncate">
                {activeCompany?.branches?.[0]?.gstin || (activeCompany?.pan ? `PAN: ${activeCompany.pan}` : 'Unregistered')}
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 space-y-4 px-3 py-4">
        {navigationSections.map((sec) => {
          const isSectionCollapsed = Boolean(collapsedSections[sec.title]);
          const hasActiveChild = sec.items.some(
            (item) =>
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href)),
          );

          return (
            <div key={sec.title} className="space-y-1">
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(sec.title)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-muted text-muted hover:text-secondary hover:text-muted rounded-lg hover:bg-surface-sunken/70 hover:bg-surface-raised transition group"
                  title={`Click to ${isSectionCollapsed ? 'expand' : 'collapse'} ${sec.title}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{sec.title}</span>
                    <span className="text-[9px] font-mono text-muted group-hover:text-secondary group-hover:text-muted">
                      ({sec.items.length})
                    </span>
                    {hasActiveChild && isSectionCollapsed && (
                      <span className="h-1.5 w-1.5 rounded-full bg-brand bg-brand-subtle" />
                    )}
                  </div>
                  <div className="text-muted group-hover:text-secondary group-hover:text-primary-inverse transition-transform">
                    {isSectionCollapsed ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </button>
              ) : (
                <div className="my-2 border-t border-subtle border-strong" />
              )}

              {/* Show items if section is open, or if the entire sidebar is in collapsed icon mode */}
              {(!isSectionCollapsed || isCollapsed) && (
                <div className="space-y-0.5 animate-in fade-in duration-100">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/' &&
                        pathname.startsWith(item.href) &&
                        !navigationSections.some((s) =>
                          s.items.some(
                            (other) =>
                              other.href !== item.href &&
                              other.href.startsWith(item.href) &&
                              (pathname === other.href ||
                                pathname.startsWith(other.href + '/')),
                          ),
                        ));

                    return (
                      <div key={item.href} className="relative group/item">
                        <Link
                          href={item.href}
                          className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 text-body-sm font-medium transition-colors duration-150 ${
                            isActive
                              ? 'border-l-2 border-brand bg-brand-subtle text-brand-text font-semibold'
                              : 'text-secondary hover:bg-surface-sunken hover:text-primary'
                          } ${isCollapsed ? 'justify-center px-0' : ''}`}
                        >
                          <Icon
                            className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                              isActive
                                ? 'text-brand-text text-brand'
                                : 'text-muted text-muted group-hover:text-secondary group-hover:text-muted'
                            }`}
                          />

                          {!isCollapsed && (
                            <div className="flex flex-1 items-center justify-between min-w-0">
                              <span className="truncate">{item.label}</span>
                              {item.badge && (
                                <span className="rounded bg-brand-subtle bg-brand px-1.5 py-0.2 text-[9px] font-bold text-brand-text text-brand border border-focus border-focus">
                                  {item.badge}
                                </span>
                              )}
                              {item.statusDot && (
                                <span
                                  className={`h-2 w-2 rounded-full shrink-0 ${item.statusDot} ${
                                    tallyOnline ? 'animate-pulse' : ''
                                  }`}
                                />
                              )}
                            </div>
                          )}
                        </Link>

                        {/* Floating Tooltip when collapsed */}
                        {isCollapsed && (
                          <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/item:flex items-center gap-1.5 rounded-lg bg-surface bg-surface-raised text-white text-[11px] font-bold px-2.5 py-1 z-50 whitespace-nowrap shadow-xl border border-strong">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="text-[9px] bg-brand px-1 rounded text-white font-semibold">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer: System Status */}
      <div className="border-t border-subtle border-strong p-3">
        {tallyEnabled ? (
          <Link
            href="/settings/tally"
            className={`flex items-center gap-2.5 rounded-xl border border border-strong bg-canvas bg-surface-raised p-2 text-xs transition hover:border hover:border-strong ${
              isCollapsed ? 'justify-center p-2' : ''
            }`}
            title="Tally Bridge Connection Status"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                tallyOnline ? 'bg-status-success shadow-xs shadow-emerald-500/50 animate-pulse' : 'bg-status-warning'
              }`}
            />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <span className="font-bold text-primary text-primary-inverse block text-[11px] truncate">
                  Tally Connector: {tallyOnline ? 'ONLINE' : 'STANDBY'}
                </span>
                <span className="font-mono text-[10px] text-muted block truncate">
                  localhost:9000
                </span>
              </div>
            )}
          </Link>
        ) : invoicingOnly ? (
          <div
            className={`flex items-center gap-2.5 rounded-xl border border border-strong bg-canvas bg-surface-raised p-2 text-xs ${
              isCollapsed ? 'justify-center p-2' : ''
            }`}
            title="Invoicing & Billing Only Mode"
          >
            <span className="h-2 w-2 rounded-full shrink-0 bg-status-success shadow-xs shadow-emerald-500/50" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <span className="font-bold text-primary text-primary-inverse block text-[11px] truncate">
                  Mode: Invoicing Only
                </span>
                <span className="text-[10px] text-muted block truncate">
                  Streamlined Billing
                </span>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`flex items-center gap-2.5 rounded-xl border border border-strong bg-canvas bg-surface-raised p-2 text-xs ${
              isCollapsed ? 'justify-center p-2' : ''
            }`}
            title="Standalone Cloud Accounting Active"
          >
            <span className="h-2 w-2 rounded-full shrink-0 bg-brand shadow-xs shadow-blue-500/50" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <span className="font-bold text-primary text-primary-inverse block text-[11px] truncate">
                  Mode: Standalone Cloud
                </span>
                <span className="text-[10px] text-muted block truncate">
                  Zero Tally Overhead
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`print:hidden hidden lg:block sticky top-0 h-screen shrink-0 transition-all duration-200 ease-in-out z-30 ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="print:hidden lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-surface backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
