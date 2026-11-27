'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { TopHeader } from './top-header';
import { PageErrorBoundary } from './error-boundary';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const isAuthRoute = pathname.startsWith('/auth');
  const isPublicRoute = isAuthRoute || pathname.startsWith('/reports/shared');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('antigravity_sidebar_collapsed');
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      }

      const token = localStorage.getItem('antigravity_access_token');
      if (!isPublicRoute && !token) {
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
  }, [pathname, isPublicRoute, router]);

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

  if (isPublicRoute) {
    return (
      <main id="main-content" className="min-h-screen w-full bg-canvas text-primary">
        {children}
      </main>
    );
  }

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-xs text-muted font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-primary print:bg-white print:text-black print:min-h-0 print:h-auto print:overflow-visible print:block">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-brand focus:text-inverse focus:text-xs focus:font-semibold"
      >
        Skip to main content
      </a>

      <div className="h-full shrink-0 print:hidden">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden print:block print:w-full print:p-0 print:h-auto print:overflow-visible">
        <div className="shrink-0 print:hidden">
          <TopHeader
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleCollapse}
            onOpenMobile={() => setMobileOpen(true)}
          />
        </div>
        <main
          id="main-content"
          className="flex-1 h-0 w-full min-w-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 print:p-0 print:m-0 print:w-full print:max-w-none print:overflow-visible print:h-auto"
        >
          <div className="max-w-7xl mx-auto w-full print:max-w-none print:w-full print:p-0">
            <PageErrorBoundary>{children}</PageErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
