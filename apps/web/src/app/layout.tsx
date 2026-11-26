import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppShell } from '../components/app-shell';
import { ThemeProvider } from '../components/theme-provider';
import { CompanyProvider } from '../lib/company-context';
import { Toaster } from '../components/toaster';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

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
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      data-density="compact"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-canvas font-sans text-primary antialiased selection:bg-brand selection:text-inverse transition-colors duration-200">
        <ThemeProvider>
          <CompanyProvider>
            <AppShell>{children}</AppShell>
            <Toaster />
          </CompanyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
