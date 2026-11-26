'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  Sun,
  Moon,
  Building2,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Check,
  Settings,
} from 'lucide-react';
import { useTheme } from './theme-provider';
import { useCompany } from '@/lib/company-context';
import { apiClient } from '@/lib/api-client';
import { CommandPalette } from './command-palette';
import { NotificationCenter } from './notification-center';

export interface TopHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
}

export function TopHeader({ onOpenMobile }: TopHeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { companies, activeCompany, activeCompanyId, setActiveCompanyId } = useCompany();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [userName, setUserName] = useState('Administrator');
  const [userEmail, setUserEmail] = useState('admin@workspace.com');

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((v) => !v);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setShowCompanyMenu((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setShowCompanyMenu(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!activeCompanyId) return;
    apiClient
      .listNotifications?.(20)
      ?.then((list: any[]) => setNotifications(list || []))
      .catch(() => {});
  }, [activeCompanyId]);

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
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

  const initials = (() => {
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (userName.slice(0, 2) || 'AD').toUpperCase();
  })();

  const breadcrumbLabel = (() => {
    if (pathname === '/') return 'Dashboard';
    return pathname
      .split('/')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s.replace(/-/g, ' '))
      .join(' / ');
  })();

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-surface border-b border-subtle shadow-xs px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + Company Switcher */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobile}
            aria-label="Open navigation menu"
            className="lg:hidden h-11 w-11 -ml-2 flex items-center justify-center rounded-lg text-secondary hover:text-primary hover:bg-surface-sunken"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div ref={companyRef} className="relative">
            <button
              type="button"
              onClick={() => setShowCompanyMenu((v) => !v)}
              title="Switch company (⌘⇧C)"
              className="flex items-center gap-2 h-9 max-w-[240px] px-3 rounded-lg border border-default bg-surface hover:bg-surface-sunken text-left transition-colors"
            >
              <Building2 className="h-4 w-4 text-brand-text shrink-0" />
              <span className="text-xs font-semibold text-primary truncate">
                {activeCompany?.legalName || 'Select Company'}
              </span>
              {activeCompany?.pan && (
                <span className="hidden sm:inline font-mono text-[10px] text-muted shrink-0">
                  {activeCompany.pan}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-muted shrink-0" />
            </button>

            {showCompanyMenu && (
              <div className="absolute left-0 mt-1.5 w-72 rounded-xl border border-default bg-surface-raised p-1.5 shadow-lg z-50">
                <div className="px-2.5 py-1 text-overline uppercase text-muted">
                  Active Entity (⌘⇧C)
                </div>
                <div className="max-h-64 overflow-y-auto space-y-0.5">
                  {companies.map((c) => {
                    const selected = c.id === activeCompanyId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setActiveCompanyId(c.id);
                          setShowCompanyMenu(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                          selected
                            ? 'bg-brand-subtle text-brand-text font-semibold'
                            : 'text-primary hover:bg-surface-sunken'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate">{c.legalName}</div>
                          {c.pan && (
                            <div className="font-mono text-[10px] text-muted">PAN: {c.pan}</div>
                          )}
                        </div>
                        {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <span className="hidden md:inline text-xs text-muted capitalize truncate">
            {breadcrumbLabel}
          </span>
        </div>

        {/* Right: Command Search + Notifications + Theme + Profile */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            aria-label="Open command search"
            className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs text-secondary hover:text-primary hover:bg-surface-sunken transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface-sunken border border-default text-muted">
              ⌘K
            </kbd>
          </button>

          <NotificationCenter />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="h-9 w-9 flex items-center justify-center rounded-lg text-secondary hover:text-primary hover:bg-surface-sunken transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((v) => !v)}
              aria-label="Account menu"
              className="h-9 px-2 flex items-center gap-2 rounded-lg hover:bg-surface-sunken transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-brand text-inverse flex items-center justify-center text-xs font-semibold">
                {initials}
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-default bg-surface-raised p-1.5 shadow-lg z-50 space-y-1">
                <div className="px-2.5 py-2 border-b border-subtle">
                  <div className="text-xs font-semibold text-primary truncate">{userName}</div>
                  <div className="text-[11px] text-muted truncate">{userEmail}</div>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-secondary hover:bg-surface-sunken hover:text-primary"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Workspace Settings</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-status-danger-text hover:bg-status-danger-subtle"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </>
  );
}
