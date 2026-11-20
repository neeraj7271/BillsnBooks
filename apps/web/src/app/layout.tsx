import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '../components/app-shell';
import { ThemeProvider } from '../components/theme-provider';
import { CompanyProvider } from '../lib/company-context';

export const metadata: Metadata = {
  title: 'Antigravity Books | Enterprise Accounting Operations Platform',
  description: 'Authoritative Double-Entry Accounting, Statutory GST Rules & Tally Bridge',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <CompanyProvider>
            <AppShell>{children}</AppShell>
          </CompanyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
