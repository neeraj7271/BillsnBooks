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
      return <Receipt className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
    }
    if (reportKey.startsWith('PURCHASES_')) {
      return <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
    }
    if (reportKey.startsWith('CASH_') || reportKey.startsWith('BANK_') || reportKey.startsWith('INTER_')) {
      return <Landmark className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
    }
    if (reportKey.startsWith('PAYABLES_') || reportKey.startsWith('ADVANCE_')) {
      return <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
    }
    if (reportKey.startsWith('LEDGERS_')) {
      return <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    }
    switch (reportKey) {
      case 'CUSTOMER_SALES':
        return <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'ITEM_SALES':
        return <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case 'AR_AGEING':
        return <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'TRIAL_BALANCE':
        return <Scale className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'PROFIT_LOSS':
        return <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'BALANCE_SHEET':
        return <PieChart className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case 'GENERAL_LEDGER':
        return <BookOpen className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />;
      case 'BRS_STATEMENT':
        return <Landmark className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
      default:
        return <FileSpreadsheet className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 px-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Reports & Business Intelligence
            </h1>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
              {catalog.length} Master Reports
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Enterprise-grade branded reports with formulas, multi-format export, and client sharing
          </p>
        </div>

        {/* View Density Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/60 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Compact List View"
          >
            <List className="h-3.5 w-3.5" />
            <span className="text-[11px] hidden sm:inline">Dense List</span>
          </button>
        </div>
      </div>

      {/* 2. ⭐ Starred / Favorites Shelf (Compact Horizontal Grid) */}
      {starredReports.length > 0 && (
        <section className="bg-amber-50/30 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              <span>Starred Reports ({starredReports.length})</span>
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Quick Access</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {starredReports.map((report) => (
              <Link
                key={report.reportKey}
                href={report.href}
                className="group relative flex items-center justify-between p-2.5 px-3 rounded-lg border border-amber-200/60 dark:border-amber-900/40 bg-white dark:bg-slate-900 shadow-xs hover:shadow-sm hover:border-amber-400 dark:hover:border-amber-700 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-md bg-amber-50 dark:bg-slate-800 shrink-0">
                    {getReportIcon(report.reportKey)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                      {report.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate">
                      {report.category}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleToggleFavorite(e, report.reportKey)}
                  title="Unpin from favorites"
                  className="p-1 rounded text-amber-500 hover:bg-amber-50 shrink-0 ml-1.5"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                </button>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. Catalog Control Toolbar: Category Chips + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2.5 px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelectedCategory(c.key)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition ${
                selectedCategory === c.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports by name, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* 4. Master Catalog View (Grid Mode or Dense List Mode) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredCatalog.map((report) => (
            <div
              key={report.reportKey}
              className="flex flex-col justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    {getReportIcon(report.reportKey)}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, report.reportKey)}
                    title={report.isFavorite ? 'Unpin from favorites' : 'Pin to favorites'}
                    className={`p-1 rounded-md transition ${
                      report.isFavorite
                        ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        : 'text-slate-300 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        report.isFavorite ? 'fill-amber-400' : ''
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-2.5">
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {report.category}
                  </span>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {report.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  XLSX · PDF
                </span>
                <Link
                  href={report.href}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
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
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90 font-semibold text-slate-700 dark:text-slate-300">
              <tr>
                <th className="py-2.5 px-3.5 w-10 text-center">★</th>
                <th className="py-2.5 px-3.5">Report Title</th>
                <th className="py-2.5 px-3.5">Category</th>
                <th className="py-2.5 px-3.5">Description</th>
                <th className="py-2.5 px-3.5 text-center">Formats</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredCatalog.map((report) => (
                <tr key={report.reportKey} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-2 px-3.5 text-center">
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, report.reportKey)}
                      title={report.isFavorite ? 'Unpin from favorites' : 'Pin to favorites'}
                      className="text-slate-300 hover:text-amber-500"
                    >
                      <Star className={`h-3.5 w-3.5 ${report.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>
                  </td>
                  <td className="py-2 px-3.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 shrink-0">
                        {getReportIcon(report.reportKey)}
                      </div>
                      <Link href={report.href} className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 transition">
                        {report.title}
                      </Link>
                    </div>
                  </td>
                  <td className="py-2 px-3.5">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {report.category}
                    </span>
                  </td>
                  <td className="py-2 px-3.5 text-slate-500 dark:text-slate-400 text-[11px] max-w-md truncate">
                    {report.description}
                  </td>
                  <td className="py-2 px-3.5 text-center font-mono text-[10px] text-slate-400">
                    XLSX · PDF
                  </td>
                  <td className="py-2 px-3.5 text-right">
                    <Link
                      href={report.href}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md transition"
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
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
          <FileSpreadsheet className="h-8 w-8 text-slate-400 mx-auto" />
          <h4 className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            No matching reports found
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Try searching with different keywords or select All Reports.
          </p>
        </div>
      )}
    </div>
  );
}