'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Layers,
  Briefcase,
  CreditCard,
  Compass,
  FileSpreadsheet,
  ArrowRightLeft,
  Scale,
  BarChart3,
  PieChart,
  CalendarClock,
  BookOpen,
  Building2,
  Server,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Users,
  Boxes,
  CheckSquare,
  Receipt,
  Hash,
  Sliders,
  Settings,
  Bell,
  Landmark,
  FileText,
  Sparkles,
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
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
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
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!tallyEnabled) {
      setTallyOnline(false);
      return;
    }
    apiClient
      .getTallyConnector()
      .then((conn) => setTallyOnline(conn?.status === 'ONLINE'))
      .catch(() => setTallyOnline(false));
  }, [tallyEnabled]);

  useEffect(() => {
    onCloseMobile();
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('antigravity_sidebar_collapsed_sections');
      if (stored) setCollapsedSections(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem('antigravity_sidebar_collapsed_sections', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const navSections: SidebarSection[] = invoicingOnly
    ? [
        {
          title: 'Sales',
          items: [
            { label: 'Home', href: '/', icon: Layers },
            { label: 'Invoices', href: '/invoices', icon: FileText },
            { label: 'Parties', href: '/parties', icon: Users },
            { label: 'Items', href: '/items', icon: Boxes },
            { label: 'Imports', href: '/imports', icon: FileSpreadsheet },
          ],
        },
        {
          title: 'Reports',
          items: [{ label: 'Reports', href: '/reports', icon: BarChart3 }],
        },
        {
          title: 'Setup',
          items: [
            { label: 'Settings', href: '/settings', icon: Sliders },
            { label: 'Companies', href: '/settings/companies', icon: Building2 },
            { label: 'Branding', href: '/settings/invoice-branding', icon: Sparkles },
            { label: 'Numbering', href: '/settings/numbering', icon: Hash },
          ],
        },
      ]
    : [
        {
          title: 'Sales',
          items: [
            { label: 'Home', href: '/', icon: Layers },
            { label: 'Invoices', href: '/invoices', icon: FileText },
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
            { label: 'Banking', href: '/banking', icon: Landmark },
            { label: 'Discovery', href: '/banking/discovery', icon: Compass },
            { label: 'Payment Links', href: '/collections/payment-links', icon: CreditCard },
            { label: 'Ageing', href: '/collections/ageing', icon: Receipt },
            { label: 'Recurring', href: '/collections/recurring', icon: CalendarClock },
          ],
        },
        {
          title: 'Reports',
          items: [
            { label: 'Reports', href: '/reports', icon: BarChart3 },
            { label: 'Trial Balance', href: '/reports/trial-balance', icon: Scale },
            { label: 'P&L', href: '/reports/profit-and-loss', icon: PieChart },
            { label: 'Balance Sheet', href: '/reports/balance-sheet', icon: BookOpen },
            { label: 'Period Locks', href: '/settings/periods', icon: CalendarClock },
          ],
        },
        {
          title: 'Practice',
          items: [
            { label: 'Practice Hub', href: '/practice', icon: Briefcase },
            { label: 'Jobs Pipeline', href: '/practice/jobs', icon: Layers },
            { label: 'Clients', href: '/practice/clients', icon: Building2 },
            { label: 'Workload', href: '/practice/workload', icon: Users },
            { label: 'Tasks', href: '/practice/tasks', icon: CheckSquare },
            { label: 'Calendar', href: '/practice/calendar', icon: CalendarClock },
            { label: 'Documents', href: '/practice/documents', icon: FileSpreadsheet },
            { label: 'Services', href: '/practice/settings/services', icon: Boxes },
            { label: 'Workflows', href: '/practice/settings/workflows', icon: Sliders },
            { label: 'Custom Fields', href: '/practice/settings/custom-fields', icon: Hash },
          ],
        },
        {
          title: 'Setup',
          items: [
            { label: 'Settings', href: '/settings', icon: Settings },
            { label: 'Companies', href: '/settings/companies', icon: Building2 },
            { label: 'Branding', href: '/settings/invoice-branding', icon: Sparkles },
            { label: 'Numbering', href: '/settings/numbering', icon: Hash },
            { label: 'Notifications', href: '/settings/notifications', icon: Bell },
            ...(tallyEnabled
              ? [{ label: 'Tally', href: '/settings/tally', icon: Server, badge: tallyOnline ? 'Online' : 'Offline' }]
              : []),
          ],
        },
      ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderContent = (mobile = false) => {
    const collapsed = !mobile && isCollapsed;
    return (
      <div className="flex h-full flex-col bg-surface border-r border-subtle">
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-subtle shrink-0">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-brand text-inverse flex items-center justify-center font-bold text-xs shrink-0">
              AB
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-primary truncate">Antigravity Books</div>
                {activeCompany?.legalName && (
                  <div className="text-[11px] text-muted truncate">{activeCompany.legalName}</div>
                )}
              </div>
            )}
          </Link>

          {mobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="h-11 w-11 -mr-2 flex items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-surface-sunken"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-primary hover:bg-surface-sunken transition-colors"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
          {navSections.map((section) => {
            const isSectionCollapsed = !collapsed && collapsedSections[section.title];
            return (
              <div key={section.title} className="space-y-1">
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-3 py-1 text-overline uppercase text-muted hover:text-secondary transition-colors"
                  >
                    <span>{section.title}</span>
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${isSectionCollapsed ? '-rotate-90' : ''}`}
                    />
                  </button>
                )}

                {!isSectionCollapsed && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = isActive(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          className={`flex items-center gap-3 h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
                            active
                              ? 'bg-brand-subtle text-brand-text border-l-[3px] border-brand font-semibold'
                              : 'text-secondary hover:bg-surface-sunken hover:text-primary'
                          } ${collapsed ? 'justify-center px-0' : ''}`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                          {!collapsed && item.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-sunken text-muted">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        data-testid="sidebar"
        className={`hidden lg:block shrink-0 h-full transition-all duration-200 ${
          isCollapsed ? 'w-[60px]' : 'w-[260px]'
        }`}
      >
        <div className="h-full">{renderContent(false)}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-surface-overlay backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[260px] max-w-[85vw] h-full shadow-lg">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
