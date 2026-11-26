'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  Sun,
  Moon,
  Building2,
  Search,
  Command,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  CheckCircle2,
  Sparkles,
  User,
  Shield,
  Settings,
  LogOut,
  ExternalLink,
  ChevronDown,
  Check,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { useTheme } from './theme-provider';
import { useCompany } from '@/lib/company-context';
import { apiClient } from '@/lib/api-client';
import { CommandPalette } from './command-palette';
import { Badge } from '@platform/ui';

export interface TopHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
}

export function TopHeader({
  isCollapsed,
  onToggleCollapse,
  onOpenMobile,
}: TopHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const { companies, activeCompany, activeCompanyId, setActiveCompanyId } = useCompany();
  const [tallyOnline, setTallyOnline] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showCompanyMenu, setShowCompanyMenu] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('Administrator');
  const [userEmail, setUserEmail] = useState<string>('admin@workspace.com');

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const companyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('antigravity_user_name');
      const storedEmail = localStorage.getItem('antigravity_user_email');
      if (storedName) setUserName(storedName);
      if (storedEmail) setUserEmail(storedEmail);
    }
  }, []);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (name.slice(0, 2) || 'AD').toUpperCase();
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      // Best-effort server-side refresh-token revocation before clearing local state.
      void apiClient.logout();
      localStorage.removeItem('antigravity_tenant_id');
      localStorage.removeItem('antigravity_user_id');
      localStorage.removeItem('antigravity_user_name');
      localStorage.removeItem('antigravity_user_email');
      localStorage.removeItem('antigravity_access_token');
      localStorage.removeItem('antigravity_refresh_token');
      localStorage.removeItem('antigravity_active_company_id');
      window.location.href = '/auth/login';
    }
  };

  useEffect(() => {
    apiClient
      .getTallyConnector()
      .then((conn) => {
        setTallyOnline(conn?.status === 'ONLINE');
      })
      .catch(() => setTallyOnline(false));

    loadNotifications();
  }, []);

  // Global keyboard shortcuts: Cmd+K (Command Palette) & Cmd+Shift+C (Company Switcher)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setShowCompanyMenu((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener to dismiss dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        companyRef.current &&
        !companyRef.current.contains(event.target as Node)
      ) {
        setShowCompanyMenu(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = () => {
    apiClient
      .listNotifications(10)
      .then((data) => setNotifications(data || []))
      .catch(() => setNotifications([]));
  };

  const handleMarkAllRead = async () => {
    await apiClient.markAllNotificationsRead();
    loadNotifications();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Compute clean breadcrumb text from pathname
  const getBreadcrumb = () => {
    if (pathname === '/') return 'Overview Cockpit';
    if (pathname.startsWith('/invoices/new')) return 'Billing / New Tax Invoice';
    if (pathname.startsWith('/invoices')) return 'Billing / Tax Invoices';
    if (pathname.startsWith('/approvals')) return 'Governance / Approval Inbox';
    if (pathname.startsWith('/parties')) return 'Masters / Customers & Vendors';
    if (pathname.startsWith('/items')) return 'Masters / Items & Products';
    if (pathname.startsWith('/banking/discovery')) return 'Banking / Sales Discovery';
    if (pathname.startsWith('/banking')) return 'Banking & BRS';
    if (pathname.startsWith('/imports/new')) return 'Imports / New Register';
    if (pathname.startsWith('/imports')) return 'Imports Register';
    if (pathname.startsWith('/vouchers')) return 'Vouchers & Ledger';
    if (pathname.startsWith('/reports/customer-sales')) return 'Reports / Customer-Wise Sales';
    if (pathname.startsWith('/reports/item-sales')) return 'Reports / Product & Item-Wise Sales';
    if (pathname.startsWith('/reports/expenses')) return 'Reports / Purchases & Expenses';
    if (pathname.startsWith('/reports/cash-bank-audit')) return 'Reports / Cash & Bank Audit';
    if (pathname.startsWith('/reports/payables')) return 'Reports / Payables & Master Hygiene';
    if (pathname.startsWith('/reports/shared')) return 'Reports / Shared Document';
    if (pathname.startsWith('/reports/trial-balance')) return 'Reports / Trial Balance';
    if (pathname.startsWith('/reports/profit-and-loss')) return 'Reports / Profit & Loss';
    if (pathname.startsWith('/reports/balance-sheet')) return 'Reports / Balance Sheet';
    if (pathname.startsWith('/reports/general-ledger')) return 'Reports / General Ledger';
    if (pathname === '/reports') return 'Reports & Analytics Hub';
    if (pathname.startsWith('/settings/ledgers')) return 'Masters / Chart of Accounts';
    if (pathname.startsWith('/settings/companies')) return 'Masters / Companies & Branches';
    if (pathname.startsWith('/settings/notifications')) return 'Settings / Notifications & Alerts';
    if (pathname.startsWith('/settings/periods')) return 'Governance / Period Locks';
    if (pathname.startsWith('/settings/tally')) return 'Integration / Tally Prime Bridge';
    return 'Antigravity Books';
  };

  return (
    <>
      <header className="print:hidden sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border border-strong bg-white/90 bg-surface backdrop-blur-md px-4 sm:px-6 transition-colors duration-200">
        {/* Left Section: Mobile Menu, Sidebar Toggle, Breadcrumb & Company Pill */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={onOpenMobile}
            aria-label="Open navigation sidebar"
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg border border border-strong bg-white bg-surface text-secondary text-muted hover:bg-canvas shadow-xs"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border border-strong bg-white bg-surface text-muted hover:text-primary text-muted hover:text-primary transition shadow-xs"
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          {/* Universal Back Button */}
          {pathname !== '/' && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back();
                } else if (pathname.startsWith('/reports/')) {
                  router.push('/reports');
                } else {
                  router.push('/');
                }
              }}
              title="Go back to previous page"
              aria-label="Go back to previous page"
              className="flex h-8 items-center gap-1.5 px-2.5 rounded-lg border border border-strong bg-white bg-surface text-secondary hover:text-primary text-muted hover:text-primary hover:bg-canvas hover:bg-surface-raised transition shadow-xs text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Back</span>
            </button>
          )}

          {/* Breadcrumb Indicator with Interactive Navigation */}
          {pathname.startsWith('/reports/') ? (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium">
              <Link
                href="/reports"
                className="text-muted hover:text-brand-text text-muted hover:text-brand transition"
              >
                Reports
              </Link>
              <span className="text-muted text-secondary">/</span>
              <span className="font-bold text-primary">
                {getBreadcrumb().replace(/^Reports \/ /, '')}
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-bold text-primary">
                {getBreadcrumb()}
              </span>
            </div>
          )}

          {/* Active Company Switcher Dropdown */}
          <div ref={companyRef} className="relative min-w-0">
            <button
              type="button"
              onClick={() => setShowCompanyMenu(!showCompanyMenu)}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface-sunken px-2.5 py-1 text-caption text-secondary hover:border-focus transition shadow-xs max-w-full"
              title={
                activeCompany?.branches?.[0]
                  ? `Branch: ${activeCompany.branches[0].name || 'Head Office'} (State ${activeCompany.branches[0].stateCode || 'IN'}) • Cmd+Shift+C`
                  : 'Click to switch active company (Cmd+Shift+C)'
              }
            >
              <Building2 className="h-3.5 w-3.5 text-brand-text shrink-0" />
              <span className="font-semibold text-primary truncate max-w-[90px] sm:max-w-[200px]">
                {activeCompany?.legalName || 'Select Company'}
              </span>
              {activeCompany?.pan && (
                <span className="hidden md:inline font-mono text-[11px] text-muted">
                  • {activeCompany.pan}
                </span>
              )}
              <ChevronDown className="h-3 w-3 text-muted ml-0.5 shrink-0" />
            </button>

            {showCompanyMenu && (
              <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl border border border-strong bg-white bg-surface p-2 shadow-2xl z-50">
                <div className="px-3 py-2 border-b border-subtle border-strong mb-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Switch Active Legal Entity
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {companies.length} tenant organization(s) registered
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {companies.map((c) => {
                    const isSelected = c.id === activeCompanyId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setActiveCompanyId(c.id);
                          setShowCompanyMenu(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition ${
                          isSelected
                            ? 'bg-brand-subtle/80 bg-brand/40 border border-focus border-focus'
                            : 'hover:bg-canvas hover:bg-surface-raised'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="font-bold text-xs text-primary truncate">
                            {c.legalName}
                          </div>
                          <div className="font-mono text-[10px] text-muted">
                            {c.branches?.[0]?.gstin || c.pan || 'Multi-branch'} ({c.branches?.length || 0} branches)
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-brand-text text-brand shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1.5 mt-1 border-t border-subtle border-strong">
                  <Link
                    href="/settings/companies"
                    onClick={() => setShowCompanyMenu(false)}
                    className="flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-brand-text text-brand hover:bg-brand-subtle hover:bg-brand/30 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Manage or Register Company</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Global Search, Theme Toggle, Notifications, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Shortcut Pill */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            aria-label="Open command palette"
            title="Press Cmd+K to open search"
            className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 py-1.5 text-caption text-muted shadow-xs cursor-pointer hover:border-strong transition"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-caption text-muted">Quick search...</span>
            <kbd className="rounded border border-border bg-surface-raised px-1.5 py-0.2 font-mono text-[10px] font-semibold text-muted">
              ⌘K
            </kbd>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle light or dark theme"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border border-strong bg-white bg-surface text-secondary text-muted hover:bg-canvas hover:bg-surface-raised transition-colors shadow-xs"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-status-warning-text transition-transform hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 text-secondary transition-transform hover:-rotate-12" />
            )}
          </button>

          {/* Live Notifications Popover */}
          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="View notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-xl border border border-strong bg-white bg-surface text-secondary text-muted hover:bg-canvas hover:bg-surface-raised transition-colors shadow-xs"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border border-strong bg-white bg-surface p-3 shadow-2xl z-50">
                <div className="flex items-center justify-between pb-2 border-b border-subtle border-strong mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">Activity & Notifications</span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-brand-subtle bg-brand/40 text-brand-text text-brand px-1.5 py-0.5 text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-brand-text text-brand hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted">
                      No recent notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl border text-xs transition ${
                          n.isRead
                            ? 'border-subtle border-strong bg-canvas bg-surface-raised text-muted'
                            : 'border-focus border-focus bg-brand-subtle/40 bg-brand/20 text-primary text-primary-inverse'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-primary leading-tight">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-muted shrink-0">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-secondary text-muted line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Dropdown */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label="User account menu"
              className="flex items-center gap-2 pl-1 border-l border border-strong group focus:outline-none"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-brand to-brand text-xs font-black text-white shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                {getInitials(userName)}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-primary leading-tight">
                  {userName}
                </span>
                <span className="text-[10px] text-muted leading-tight">
                  SuperAdmin
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted hidden xl:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border border-strong bg-white bg-surface p-2 shadow-2xl z-50 animate-in fade-in duration-100">
                <div className="px-3 py-2 border-b border-subtle border-strong">
                  <div className="text-xs font-bold text-primary">
                    {userName}
                  </div>
                  <div className="text-[11px] text-muted font-mono truncate max-w-[210px]">
                    {userEmail}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="rounded bg-status-success-subtle bg-status-success text-status-success-text text-status-success-text border border-status-success border-status-success px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Active Session
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href="/settings/companies"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-secondary text-muted hover:bg-surface-sunken hover:bg-surface-raised transition"
                  >
                    <Building2 className="h-3.5 w-3.5 text-muted" />
                    <span>Company & Branches</span>
                  </Link>

                  <Link
                    href="/settings/ledgers"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-secondary text-muted hover:bg-surface-sunken hover:bg-surface-raised transition"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted" />
                    <span>Chart of Accounts</span>
                  </Link>

                  <Link
                    href="/auth/signup"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-brand-text text-brand hover:bg-brand-subtle hover:bg-brand/40 transition font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Sign Up New Tenant</span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-subtle border-strong">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-status-danger-text text-status-danger-text hover:bg-status-danger-subtle hover:bg-status-danger transition font-medium"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out & Clear Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Interactive Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </>
  );
}
