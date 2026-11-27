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
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, LoadingState, MonoCopyable } from '@platform/ui';
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
            <h1 className="text-2xl font-black tracking-tight text-primary">
              Company & Tenant Directory
            </h1>
            <Badge variant="brand" size="sm">
              Multi-Tenant
            </Badge>
          </div>
          <p className="mt-1 text-sm text-secondary">
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
        <div className="p-4 rounded-2xl border border-default bg-surface shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Registered Companies
            </div>
            <div className="text-xl font-black text-primary mt-0.5">
              {companies.length}
            </div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-status-info-subtle text-status-info-text flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-default bg-surface shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Operating Branches & GSTINs
            </div>
            <div className="text-xl font-black text-primary mt-0.5">
              {totalBranches}
            </div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-status-success-subtle text-status-success-text flex items-center justify-center">
            <MapPin className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-default bg-surface shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Working Workspace Entity
            </div>
            <div className="text-sm font-bold text-primary truncate max-w-[170px] mt-0.5">
              {companies.find((c) => c.id === workingCompanyId)?.legalName || 'No Company Selected'}
            </div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-status-warning-subtle text-status-warning-text flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-status-success-subtle border border-default text-xs text-status-success-text font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-status-success-text shrink-0" />
            <span>{success}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="text-xs text-status-success-text hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-status-danger-subtle border border-default text-xs text-status-danger-text font-medium flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-status-danger-text hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Companies List */}
      <div className="space-y-4">
        {loading ? (
          <LoadingState variant="cards" rows={4} />
        ) : companies.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-default bg-surface p-8 shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-status-info-subtle text-status-info-text">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-primary">
              No Companies Registered in this Tenant
            </h3>
            <p className="mt-1 text-xs text-secondary max-w-sm mx-auto">
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
        ) : (
          companies.map((company) => {
            const isWorking = company.id === workingCompanyId;
          const branches = company.branches || [];

          return (
            <Card
              key={company.id}
              className={`overflow-hidden border transition shadow-xs ${
                isWorking
                  ? 'border-focus ring-2 ring-focus-ring/20'
                  : 'border-default'
              } bg-surface`}
            >
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 px-6 border-b border-subtle bg-surface-sunken gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-status-info-subtle text-status-info-text border border-default flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base font-extrabold text-primary">
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
                    <div className="text-xs text-secondary font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>PAN:</span>
                      <MonoCopyable value={company.pan || company.panEncrypted || '—'} label="Company PAN" className="text-xs" />
                      <span>• Trade:</span>
                      <span className="font-semibold text-primary font-sans">
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
                      className="text-brand-text border-default hover:bg-brand-subtle"
                      title="Set as currently active company across all navigation menus"
                    >
                      Make Active
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-8 px-2 text-secondary hover:text-brand-text hover:bg-brand-subtle"
                    title="View full 360° company profile and audit details"
                    onClick={() => setSelectedCompanyForView(company)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Details
                  </Button>

                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-8 px-2 text-secondary hover:text-status-success-text hover:bg-status-success-subtle"
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

              <CardContent className="p-6 space-y-4 bg-surface">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2.5">
                    Operating Branches & State GSTIN Units ({branches.length}):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {branches.map((branch: any) => (
                      <div
                        key={branch.id}
                        className="p-4 rounded-xl border border-default bg-surface-sunken text-xs space-y-2 hover:border-strong transition-colors shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary text-sm">
                            {branch.branchName || branch.name || 'Main Office'}
                          </span>
                          {branch.isHeadOffice && (
                            <Badge variant="brand" size="xs">
                              Head Office
                            </Badge>
                          )}
                        </div>
                        <div className="font-mono text-xs text-secondary flex items-center gap-1">
                          <span className="text-muted text-[11px] uppercase tracking-wider">
                            GSTIN:
                          </span>
                          {branch.gstin ? (
                            <MonoCopyable value={branch.gstin} label="Branch GSTIN" className="text-xs" />
                          ) : (
                            <span className="font-semibold text-muted italic font-sans">
                              Unregistered
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-secondary flex items-center gap-1.5 pt-0.5">
                          <MapPin className="h-3.5 w-3.5 text-brand-text shrink-0" />
                          <span>
                            Jurisdiction:{' '}
                            <strong className="text-primary">
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
        }))}
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
