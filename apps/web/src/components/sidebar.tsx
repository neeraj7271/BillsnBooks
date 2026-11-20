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
          title: 'Billing & Sales',
          items: [
            { label: 'Overview Cockpit', href: '/', icon: Layers },
            { label: 'Tax Invoices', href: '/invoices', icon: Receipt },
            { label: 'Approval Inbox', href: '/approvals', icon: CheckSquare },
            { label: 'Customers & Vendors', href: '/parties', icon: Users },
            { label: 'Items & Products', href: '/items', icon: Boxes },
            { label: 'Bulk Import Register', href: '/imports', icon: FileSpreadsheet },
          ],
        },
        {
          title: 'Collections & Payments',
          items: [
            { label: 'Payment Links & Settl.', href: '/collections/payment-links', icon: CreditCard },
            { label: 'AR Ageing Analysis', href: '/collections/ageing', icon: BarChart3 },
            { label: 'Recurring Schedules', href: '/collections/recurring', icon: CalendarClock },
          ],
        },
        {
          title: 'Setup & Branding',
          items: [
            { label: 'Global System Settings', href: '/settings', icon: Settings },
            { label: 'Invoice & Branding', href: '/settings/invoice-branding', icon: Sliders },
            { label: 'Document Numbering', href: '/settings/numbering', icon: Hash },
            { label: 'Notifications & Alerts', href: '/settings/notifications', icon: Bell },
            { label: 'Companies & Branches', href: '/settings/companies', icon: Building2 },
          ],
        },
      ]
    : [
        {
          title: 'Operations',
          items: [
            { label: 'Overview Cockpit', href: '/', icon: Layers },
            { label: 'Tax Invoices', href: '/invoices', icon: Receipt },
            { label: 'Approval Inbox', href: '/approvals', icon: CheckSquare },
            { label: 'Banking & BRS', href: '/banking', icon: CreditCard },
            { label: 'Sales Discovery', href: '/banking/discovery', icon: Compass },
            { label: 'Bulk Import Register', href: '/imports', icon: FileSpreadsheet },
            { label: 'Vouchers & Journals', href: '/vouchers', icon: ArrowRightLeft },
            { label: 'Customers & Vendors', href: '/parties', icon: Users },
            { label: 'Items & Products', href: '/items', icon: Boxes },
          ],
        },
        {
          title: 'Collections & Automation',
          items: [
            { label: 'AR Ageing Analysis', href: '/collections/ageing', icon: BarChart3 },
            { label: 'Recurring Schedules', href: '/collections/recurring', icon: CalendarClock },
            { label: 'Payment Links & Settl.', href: '/collections/payment-links', icon: CreditCard },
          ],
        },
        {
          title: 'Practice & Portal',
          items: [
            { label: 'Client Directory', href: '/practice/clients', icon: Building2 },
            { label: 'Compliance Tasks', href: '/practice/tasks', icon: CheckSquare },
            { label: 'Statutory Calendar', href: '/practice/calendar', icon: CalendarClock },
            { label: 'Client Documents', href: '/practice/documents', icon: FileSpreadsheet },
          ],
        },
        {
          title: 'Reports & Analytics',
          items: [
            { label: 'All Reports Hub', href: '/reports', icon: FileSpreadsheet },
            { label: 'Customer-Wise Sales', href: '/reports/customer-sales', icon: Users },
            { label: 'Item-Wise Sales', href: '/reports/item-sales', icon: Boxes },
            { label: 'Purchases & Expenses', href: '/reports/expenses', icon: Receipt },
            { label: 'Cash & Bank Audit', href: '/reports/cash-bank-audit', icon: Landmark },
            { label: 'Payables & Vendors', href: '/reports/payables', icon: Users },
            { label: 'Trial Balance', href: '/reports/trial-balance', icon: Scale },
            { label: 'Profit & Loss (P&L)', href: '/reports/profit-and-loss', icon: BarChart3 },
            { label: 'Balance Sheet', href: '/reports/balance-sheet', icon: PieChart },
            { label: 'General Ledger', href: '/reports/general-ledger', icon: FileText },
          ],
        },
        {
          title: 'Setup & Governance',
          items: [
            { label: 'Global System Settings', href: '/settings', icon: Settings },
            { label: 'Chart of Accounts', href: '/settings/ledgers', icon: BookOpen },
            { label: 'Companies & Branches', href: '/settings/companies', icon: Building2 },
            { label: 'Invoice & Branding', href: '/settings/invoice-branding', icon: Sliders },
            { label: 'Document Numbering', href: '/settings/numbering', icon: Hash },
            { label: 'Notifications & Alerts', href: '/settings/notifications', icon: Bell },
            { label: 'Month-End Period Locks', href: '/settings/periods', icon: CalendarClock },
            ...(tallyEnabled
              ? [
                  {
                    label: 'Tally Prime Bridge',
                    href: '/settings/tally',
                    icon: Server,
                    statusDot: tallyOnline ? 'bg-emerald-500' : 'bg-amber-500',
                  },
                ]
              : []),
          ],
        },
      ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto overflow-x-hidden bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors duration-200">
      {/* Sidebar Header: Brand & Collapse Trigger */}
      <div className="flex flex-col border-b border-slate-100 dark:border-slate-800/80 p-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-bold shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                    Antigravity
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-900/60 leading-tight">
                    Books
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold leading-none">
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
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition shadow-xs"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Active Company Pill (shown when expanded) */}
        {!isCollapsed && (
          <Link
            href="/settings/companies"
            className="mt-4 flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-2.5 text-xs text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-600 transition"
          >
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-bold block text-slate-900 dark:text-slate-100 truncate">
                {activeCompany?.legalName || 'Acme Solutions'}
              </span>
              <span className="font-mono text-[10px] text-slate-400 block truncate">
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
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition group"
                  title={`Click to ${isSectionCollapsed ? 'expand' : 'collapse'} ${sec.title}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{sec.title}</span>
                    <span className="text-[9px] font-mono text-slate-400/80 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                      ({sec.items.length})
                    </span>
                    {hasActiveChild && isSectionCollapsed && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                    )}
                  </div>
                  <div className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform">
                    {isSectionCollapsed ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </button>
              ) : (
                <div className="my-2 border-t border-slate-100 dark:border-slate-800/80" />
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
                          className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold tracking-wide transition-all duration-150 ${
                            isActive
                              ? 'bg-blue-50 text-blue-600 font-bold dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                          } ${isCollapsed ? 'justify-center px-0' : ''}`}
                        >
                          <Icon
                            className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                              isActive
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                            }`}
                          />

                          {!isCollapsed && (
                            <div className="flex flex-1 items-center justify-between min-w-0">
                              <span className="truncate">{item.label}</span>
                              {item.badge && (
                                <span className="rounded bg-blue-100 dark:bg-blue-950 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
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
                          <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/item:flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 z-50 whitespace-nowrap shadow-xl border border-slate-700">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="text-[9px] bg-blue-600 px-1 rounded text-white font-semibold">
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
      <div className="border-t border-slate-100 dark:border-slate-800/80 p-3">
        {tallyEnabled ? (
          <Link
            href="/settings/tally"
            className={`flex items-center gap-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-2 text-xs transition hover:border-slate-300 dark:hover:border-slate-700 ${
              isCollapsed ? 'justify-center p-2' : ''
            }`}
            title="Tally Bridge Connection Status"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                tallyOnline ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] truncate">
                  Tally Connector: {tallyOnline ? 'ONLINE' : 'STANDBY'}
                </span>
                <span className="font-mono text-[10px] text-slate-400 block truncate">
                  localhost:9000
                </span>
              </div>
            )}
          </Link>
        ) : invoicingOnly ? (
          <div
            className={`flex items-center gap-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-2 text-xs ${
              isCollapsed ? 'justify-center p-2' : ''
            }`}
            title="Invoicing & Billing Only Mode"
          >
            <span className="h-2 w-2 rounded-full shrink-0 bg-emerald-500 shadow-xs shadow-emerald-500/50" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] truncate">
                  Mode: Invoicing Only
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  Streamlined Billing
                </span>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`flex items-center gap-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-2 text-xs ${
              isCollapsed ? 'justify-center p-2' : ''
            }`}
            title="Standalone Cloud Accounting Active"
          >
            <span className="h-2 w-2 rounded-full shrink-0 bg-blue-500 shadow-xs shadow-blue-500/50" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] truncate">
                  Mode: Standalone Cloud
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
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
