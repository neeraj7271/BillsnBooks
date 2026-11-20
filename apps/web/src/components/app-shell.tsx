'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { TopHeader } from './top-header';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const isAuthRoute = pathname.startsWith('/auth');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('antigravity_sidebar_collapsed');
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      }

      const token = localStorage.getItem('antigravity_access_token');
      if (!isAuthRoute && !token) {
        setIsAuthenticated(false);
        router.replace('/auth/login');
        return;
      }
      setIsAuthenticated(true);
    } catch {
      // Ignore localStorage read errors
    } finally {
      setMounted(true);
    }
  }, [pathname, isAuthRoute, router]);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('antigravity_sidebar_collapsed', String(next));
      } catch {
        // Ignore localStorage write errors
      }
      return next;
    });
  };

  // 1. Auth routes (/auth/login, /auth/signup) render completely standalone without Shell chrome
  if (isAuthRoute) {
    return (
      <main className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {children}
      </main>
    );
  }

  // 2. Prevent unauthenticated flash while checking auth
  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  // 3. Authenticated protected routes
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 print:bg-white print:text-slate-950 print:min-h-0 print:block">
      {/* Collapsible Left Sidebar */}
      <div className="print:hidden">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </div>

      {/* Main View Area: Top Header + Page Content */}
      <div className="flex flex-1 flex-col min-w-0 print:block print:w-full print:p-0">
        <div className="print:hidden">
          <TopHeader
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleCollapse}
            onOpenMobile={() => setMobileOpen(true)}
          />
        </div>
        <main className="flex-1 w-full min-w-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:p-0 print:m-0 print:w-full print:max-w-none print:overflow-visible">
          <div className="max-w-7xl mx-auto w-full print:max-w-none print:w-full print:p-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
