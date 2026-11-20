'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  MapPin,
  Calendar,
  RefreshCw,
  Eye,
  Edit,
  ArrowRightLeft,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { CompanyDialog } from './company-dialog';
import { CompanyDetailsDialog } from './company-details-dialog';
import { BranchDialog } from './branch-dialog';
import { INDIAN_GST_STATES } from '@platform/shared-types';

export default function CompaniesPage() {
  const {
    activeCompanyId: workingCompanyId,
    setActiveCompanyId: setWorkingCompanyId,
    refreshCompanies,
  } = useCompany();

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals state
  const [newCompanyModalOpen, setNewCompanyModalOpen] = useState(false);
  const [selectedCompanyForEdit, setSelectedCompanyForEdit] = useState<any | null>(null);
  const [selectedCompanyForView, setSelectedCompanyForView] = useState<any | null>(null);

  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchTargetCompanyId, setBranchTargetCompanyId] = useState<string | null>(null);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listCompanies();
      setCompanies(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load companies';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const openAddBranch = (companyId: string) => {
    setBranchTargetCompanyId(companyId);
    setBranchModalOpen(true);
  };

  const handleSwitchWorkingCompany = (companyId: string, legalName: string) => {
    setWorkingCompanyId(companyId);
    setSuccess(`Active working company switched to "${legalName}". All ledger operations, invoices, and catalog masters are now scoped to this entity.`);
  };

  const totalBranches = companies.reduce(
    (acc, c) => acc + (c.branches?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Company & Tenant Directory
            </h1>
            <Badge variant="brand" size="sm">
              Multi-Tenant
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Isolated enterprise legal entities with dedicated Chart of Accounts, state GSTIN nodes, and ledger segregation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCompanies}
            loading={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setNewCompanyModalOpen(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Register Company
          </Button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Registered Companies
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {companies.length}
            </div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Operating Branches & GSTINs
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {totalBranches}
            </div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <MapPin className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Working Workspace Entity
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[170px] mt-0.5">
              {companies.find((c) => c.id === workingCompanyId)?.legalName || 'No Company Selected'}
            </div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="text-xs text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-rose-600 hover:text-rose-800 dark:hover:text-rose-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Companies List */}
      <div className="space-y-4">
        {companies.length === 0 && !loading && (
          <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              No Companies Registered in this Tenant
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Get started by registering your first enterprise legal entity, head office, and statutory state GSTIN node.
            </p>
            <div className="mt-5">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setNewCompanyModalOpen(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Register First Company
              </Button>
            </div>
          </div>
        )}

        {companies.map((company) => {
          const isWorking = company.id === workingCompanyId;
          const branches = company.branches || [];

          return (
            <Card
              key={company.id}
              className={`overflow-hidden border transition shadow-xs ${
                isWorking
                  ? 'border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/10 dark:ring-blue-500/20'
                  : 'border-slate-200/80 dark:border-slate-800'
              } bg-white dark:bg-slate-900`}
            >
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 px-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50 flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">
                        {company.legalName}
                      </CardTitle>
                      {isWorking ? (
                        <Badge variant="success" size="xs" dot>
                          Active Working Entity
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="xs">
                          Registered
                        </Badge>
                      )}
                      <Badge variant="brand" size="xs" className="font-mono">
                        {company.defaultCurrency || 'INR'}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      PAN:{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {company.pan || company.panEncrypted || '—'}
                      </span>{' '}
                      • Trade:{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {company.tradeName || company.legalName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Company Action Controls */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                  {!isWorking && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleSwitchWorkingCompany(company.id, company.legalName)}
                      leftIcon={<ArrowRightLeft className="h-3 w-3" />}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950/50"
                      title="Set as currently active company across all navigation menus"
                    >
                      Make Active
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-8 px-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-blue-950/40"
                    title="View full 360° company profile and audit details"
                    onClick={() => setSelectedCompanyForView(company)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Details
                  </Button>

                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-8 px-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-950/40"
                    title="Edit company legal credentials, PAN, currency or head office"
                    onClick={() => setSelectedCompanyForEdit(company)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => openAddBranch(company.id)}
                    leftIcon={<Plus className="h-3 w-3" />}
                  >
                    Add Branch
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4 bg-white dark:bg-slate-900">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                    Operating Branches & State GSTIN Units ({branches.length}):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {branches.map((branch: any) => (
                      <div
                        key={branch.id}
                        className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-xs space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {branch.branchName || branch.name || 'Main Office'}
                          </span>
                          {branch.isHeadOffice && (
                            <Badge variant="brand" size="xs">
                              Head Office
                            </Badge>
                          )}
                        </div>
                        <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">
                            GSTIN:
                          </span>{' '}
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {branch.gstin || 'Unregistered'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
                          <MapPin className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                          <span>
                            Jurisdiction:{' '}
                            <strong className="text-slate-700 dark:text-slate-200">
                              {INDIAN_GST_STATES[branch.stateCode]?.name || 'State'} (Code{' '}
                              {branch.stateCode})
                            </strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New Company Registration Dialog */}
      <CompanyDialog
        open={newCompanyModalOpen}
        onOpenChange={setNewCompanyModalOpen}
        onSuccess={(name) => {
          setSuccess(`Company "${name}" registered with auto-provisioned Chart of Accounts!`);
          loadCompanies();
          refreshCompanies();
        }}
      />

      {/* Edit Company Dialog */}
      <CompanyDialog
        open={!!selectedCompanyForEdit}
        onOpenChange={(open) => !open && setSelectedCompanyForEdit(null)}
        initialData={selectedCompanyForEdit}
        onSuccess={(name) => {
          setSuccess(`Company "${name}" profile updated successfully.`);
          loadCompanies();
          refreshCompanies();
          setSelectedCompanyForEdit(null);
        }}
      />

      {/* Company 360° Details Dialog */}
      <CompanyDetailsDialog
        open={!!selectedCompanyForView}
        onOpenChange={(open) => !open && setSelectedCompanyForView(null)}
        company={selectedCompanyForView}
        isActiveCompany={selectedCompanyForView?.id === workingCompanyId}
        onSwitchCompany={(id) => {
          handleSwitchWorkingCompany(id, selectedCompanyForView?.legalName);
        }}
        onEditCompany={(comp) => {
          setSelectedCompanyForView(null);
          setSelectedCompanyForEdit(comp);
        }}
      />

      {/* Add Branch Dialog */}
      <BranchDialog
        open={branchModalOpen}
        companyId={branchTargetCompanyId}
        onOpenChange={setBranchModalOpen}
        onSuccess={(name) => {
          setSuccess(`Branch "${name}" added successfully.`);
          loadCompanies();
          refreshCompanies();
        }}
      />
    </div>
  );
}
