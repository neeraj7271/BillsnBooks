'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Star,
  Search,
  ArrowUpRight,
  Filter,
  BarChart3,
  TrendingUp,
  Receipt,
  Users,
  Package,
  BookOpen,
  PieChart,
  Scale,
  Calendar,
  ShieldCheck,
  Share2,
  Download,
  Building2,
  Landmark,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

interface ReportCatalogItem {
  reportKey: string;
  title: string;
  category: string;
  description: string;
  href: string;
  isFavorite: boolean;
  displayOrder?: number;
  defaultPeriod?: string;
}

export default function ReportsHubPage() {
  const { activeCompanyId } = useCompany();
  const [catalog, setCatalog] = useState<ReportCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const items = await apiClient.getReportsCatalog(activeCompanyId);
      setCatalog(items || []);
    } catch (err) {
      console.error('Failed to load reports catalog', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [activeCompanyId]);

  const handleToggleFavorite = async (e: React.MouseEvent, reportKey: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic update
    setCatalog((prev) =>
      prev.map((item) =>
        item.reportKey === reportKey ? { ...item, isFavorite: !item.isFavorite } : item,
      ),
    );

    try {
      await apiClient.toggleFavoriteReport(activeCompanyId, reportKey);
    } catch (err) {
      console.error('Failed to toggle favorite', err);
      loadCatalog();
    }
  };

  const getReportIcon = (reportKey: string) => {
    if (reportKey.startsWith('EXPENSES_')) {
      return <Receipt className="h-4 w-4 text-status-warning-text" />;
    }
    if (reportKey.startsWith('PURCHASES_')) {
      return <Package className="h-4 w-4 text-brand-text" />;
    }
    if (reportKey.startsWith('CASH_') || reportKey.startsWith('BANK_') || reportKey.startsWith('INTER_')) {
      return <Landmark className="h-4 w-4 text-status-info-text" />;
    }
    if (reportKey.startsWith('PAYABLES_') || reportKey.startsWith('ADVANCE_')) {
      return <Users className="h-4 w-4 text-brand-text" />;
    }
    if (reportKey.startsWith('LEDGERS_')) {
      return <ShieldCheck className="h-4 w-4 text-status-warning-text" />;
    }
    switch (reportKey) {
      case 'CUSTOMER_SALES':
        return <Users className="h-4 w-4 text-status-info-text" />;
      case 'ITEM_SALES':
        return <Package className="h-4 w-4 text-brand-text" />;
      case 'AR_AGEING':
        return <TrendingUp className="h-4 w-4 text-status-warning-text" />;
      case 'TRIAL_BALANCE':
        return <Scale className="h-4 w-4 text-brand-text" />;
      case 'PROFIT_LOSS':
        return <BarChart3 className="h-4 w-4 text-status-success-text" />;
      case 'BALANCE_SHEET':
        return <PieChart className="h-4 w-4 text-status-danger-text" />;
      case 'GENERAL_LEDGER':
        return <BookOpen className="h-4 w-4 text-status-info-text" />;
      case 'BRS_STATEMENT':
        return <Landmark className="h-4 w-4 text-status-info-text" />;
      default:
        return <FileSpreadsheet className="h-4 w-4 text-secondary" />;
    }
  };

  const starredReports = useMemo(() => {
    return catalog.filter((r) => r.isFavorite);
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((r) => {
      const matchesCategory =
        selectedCategory === 'ALL' ||
        r.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reportKey.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [catalog, selectedCategory, searchQuery]);

  const categories = [
    { key: 'ALL', label: 'All Reports' },
    { key: 'Sales', label: 'Sales & Revenue' },
    { key: 'Purchases', label: 'Purchases & Expenses' },
    { key: 'Cash', label: 'Cash & Bank Audit' },
    { key: 'Payables', label: 'Payables & Vendors' },
    { key: 'Financial', label: 'Financial Statements' },
    { key: 'Hygiene', label: 'Master Data Hygiene' },
  ];

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-200">
      {/* 1. Sleek Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface p-3.5 px-4 rounded-xl border border-default shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-subtle border border-brand/20 text-brand-text">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-primary">
              Reports & Business Intelligence
            </h1>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-subtle text-brand-text border border-brand/20">
              {catalog.length} Master Reports
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Enterprise-grade branded reports with formulas, multi-format export, and client sharing
          </p>
        </div>

        {/* View Density Switcher */}
        <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-lg border border-default">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
              viewMode === 'grid'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-muted hover:text-primary'
            }`}
            title="Card Grid View"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="text-[11px] hidden sm:inline">Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
              viewMode === 'list'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-muted hover:text-primary'
            }`}
            title="Compact List View"
          >
            <List className="h-3.5 w-3.5" />
            <span className="text-[11px] hidden sm:inline">Dense List</span>
          </button>
        </div>
      </div>

      {/* 2. Starred / Favorites Shelf (Compact Horizontal Grid) */}
      {starredReports.length > 0 && (
        <section className="bg-status-warning-subtle/40 p-3 rounded-xl border border-status-warning/30">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-status-warning-text">
              <Star className="h-3.5 w-3.5 fill-current text-status-warning" />
              <span>Starred Reports ({starredReports.length})</span>
            </div>
            <span className="text-[10px] text-status-warning-text font-medium">Quick Access</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {starredReports.map((report) => (
              <Link
                key={report.reportKey}
                href={report.href}
                className="group relative flex items-center justify-between p-2.5 px-3 rounded-lg border border-status-warning/30 bg-surface shadow-xs hover:shadow-sm hover:border-status-warning transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-md bg-status-warning-subtle shrink-0">
                    {getReportIcon(report.reportKey)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-primary group-hover:text-brand-text truncate">
                      {report.title}
                    </h3>
                    <p className="text-[10px] text-muted truncate">
                      {report.category}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleToggleFavorite(e, report.reportKey)}
                  title="Unpin from favorites"
                  className="p-1 rounded text-status-warning-text hover:bg-status-warning-subtle shrink-0 ml-1.5"
                >
                  <Star className="h-3.5 w-3.5 fill-current" />
                </button>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. Catalog Control Toolbar: Category Chips + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2.5 px-3.5 rounded-xl bg-surface border border-default shadow-sm text-xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelectedCategory(c.key)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition ${
                selectedCategory === c.key
                  ? 'bg-brand text-inverse shadow-xs'
                  : 'bg-surface-sunken text-secondary hover:text-primary'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search reports by name, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-default bg-surface-sunken text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-focus-ring"
          />
        </div>
      </div>

      {/* 4. Master Catalog View (Grid Mode or Dense List Mode) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredCatalog.map((report) => (
            <div
              key={report.reportKey}
              className="flex flex-col justify-between p-3.5 rounded-xl border border-default bg-surface shadow-xs hover:shadow-sm hover:border-brand/50 transition"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-surface-sunken border border-subtle">
                    {getReportIcon(report.reportKey)}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, report.reportKey)}
                    title={report.isFavorite ? 'Unpin from favorites' : 'Pin to favorites'}
                    className={`p-1 rounded-md transition ${
                      report.isFavorite
                        ? 'text-status-warning-text hover:bg-status-warning-subtle'
                        : 'text-muted hover:text-status-warning-text hover:bg-surface-sunken'
                    }`}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        report.isFavorite ? 'fill-current' : ''
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-2.5">
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-surface-sunken text-secondary">
                    {report.category}
                  </span>
                  <h3 className="mt-1 text-sm font-semibold text-primary line-clamp-1">
                    {report.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-subtle flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted uppercase">
                  XLSX · PDF
                </span>
                <Link
                  href={report.href}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-text hover:opacity-80 transition"
                >
                  Generate
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Dense List View */
        <div className="overflow-hidden rounded-xl border border-default bg-surface shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-default bg-surface-sunken font-semibold text-secondary">
              <tr>
                <th className="py-2.5 px-3.5 w-10 text-center">★</th>
                <th className="py-2.5 px-3.5">Report Title</th>
                <th className="py-2.5 px-3.5">Category</th>
                <th className="py-2.5 px-3.5">Description</th>
                <th className="py-2.5 px-3.5 text-center">Formats</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredCatalog.map((report) => (
                <tr key={report.reportKey} className="hover:bg-row-hover transition">
                  <td className="py-2 px-3.5 text-center">
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, report.reportKey)}
                      title={report.isFavorite ? 'Unpin from favorites' : 'Pin to favorites'}
                      className="text-muted hover:text-status-warning-text"
                    >
                      <Star className={`h-3.5 w-3.5 ${report.isFavorite ? 'fill-current text-status-warning-text' : ''}`} />
                    </button>
                  </td>
                  <td className="py-2 px-3.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-surface-sunken shrink-0">
                        {getReportIcon(report.reportKey)}
                      </div>
                      <Link href={report.href} className="font-semibold text-primary hover:text-brand-text transition">
                        {report.title}
                      </Link>
                    </div>
                  </td>
                  <td className="py-2 px-3.5">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-sunken text-secondary">
                      {report.category}
                    </span>
                  </td>
                  <td className="py-2 px-3.5 text-muted text-[11px] max-w-md truncate">
                    {report.description}
                  </td>
                  <td className="py-2 px-3.5 text-center font-mono text-[10px] text-muted">
                    XLSX · PDF
                  </td>
                  <td className="py-2 px-3.5 text-right">
                    <Link
                      href={report.href}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-brand-text hover:bg-brand-subtle rounded-md transition"
                    >
                      Open
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredCatalog.length === 0 && !loading && (
        <div className="text-center py-12 border border-dashed border-default rounded-xl bg-surface">
          <FileSpreadsheet className="h-8 w-8 text-muted mx-auto" />
          <h4 className="mt-2 text-sm font-semibold text-secondary">
            No matching reports found
          </h4>
          <p className="text-xs text-muted mt-1">
            Try searching with different keywords or select All Reports.
          </p>
        </div>
      )}
    </div>
  );
}