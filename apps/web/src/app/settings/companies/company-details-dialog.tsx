import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
} from '@platform/ui';
import {
  Building2,
  CheckCircle2,
  MapPin,
  Calendar,
  Layers,
  Edit,
  ArrowRightLeft,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { INDIAN_GST_STATES } from '@platform/shared-types';

interface CompanyBranch {
  id: string;
  branchName?: string;
  name?: string;
  gstin?: string;
  stateCode: string;
  addressLine1?: string;
  pincode?: string;
  isHeadOffice?: boolean;
}

interface FinancialYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isClosed?: boolean;
}

interface Company {
  id: string;
  legalName: string;
  tradeName?: string;
  pan?: string;
  panEncrypted?: string;
  defaultCurrency: string;
  isActive?: boolean;
  branches?: CompanyBranch[];
  financialYears?: FinancialYear[];
}

interface CompanyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  isActiveCompany: boolean;
  onSwitchCompany?: (companyId: string) => void;
  onEditCompany?: (company: Company) => void;
}

export function CompanyDetailsDialog({
  open,
  onOpenChange,
  company,
  isActiveCompany,
  onSwitchCompany,
  onEditCompany,
}: CompanyDetailsDialogProps) {
  if (!company) return null;

  const panValue = company.pan || company.panEncrypted || '—';
  const branches = company.branches || [];
  const financialYears = company.financialYears || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-status-info-subtle border border-default flex items-center justify-center text-status-info-text font-bold shadow-xs">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg font-black">{company.legalName}</DialogTitle>
                  {isActiveCompany ? (
                    <Badge variant="success" size="xs" dot>
                      Currently Active Working Company
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="xs">
                      Registered Legal Entity
                    </Badge>
                  )}
                  <Badge variant="brand" size="xs" className="font-mono">
                    {company.defaultCurrency || 'INR'}
                  </Badge>
                </div>
                <DialogDescription className="text-xs">
                  {company.tradeName && company.tradeName !== company.legalName ? (
                    <>
                      Trade Name: <strong className="text-primary">{company.tradeName}</strong> •{' '}
                    </>
                  ) : null}
                  Entity Reference: <span className="font-mono text-muted">{company.id.slice(0, 18)}...</span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Statutory Credentials Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface-sunken border border-default">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Permanent Account No (PAN)
              </span>
              <div className="mt-1 font-mono font-bold text-primary text-sm">
                {panValue}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Operating Base Currency
              </span>
              <div className="mt-1 font-semibold text-primary">
                {company.defaultCurrency || 'INR'} (Indian Rupee)
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Multi-Tenant Isolation
              </span>
              <div className="mt-1 font-semibold text-status-success-text flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Isolated Ledger
              </div>
            </div>
          </div>

          {/* Operating Branches & GSTIN Units */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-text" />
                Operating Branches & GSTIN Units ({branches.length})
              </span>
              <span className="text-[11px] text-muted">Independent state tax filing nodes</span>
            </div>

            {branches.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-default text-center text-muted">
                No branches configured.
              </div>
            ) : (
              <div className="space-y-2">
                {branches.map((b) => {
                  const stateInfo = INDIAN_GST_STATES[b.stateCode];
                  return (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl border border-default bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">
                            {b.branchName || b.name || 'Head Office'}
                          </span>
                          {b.isHeadOffice && (
                            <Badge variant="brand" size="xs">
                              Head Office
                            </Badge>
                          )}
                          <span className="text-[11px] px-1.5 py-0.2 rounded bg-surface-sunken text-secondary font-medium">
                            {stateInfo?.name || 'State'} (Code {b.stateCode})
                          </span>
                        </div>
                        {b.addressLine1 && (
                          <div className="text-[11px] text-secondary">
                            {b.addressLine1}
                            {b.pincode ? ` - ${b.pincode}` : ''}
                          </div>
                        )}
                      </div>

                      <div className="sm:text-right shrink-0">
                        <div className="text-[10px] text-muted uppercase font-semibold">GSTIN</div>
                        <div className="font-mono font-bold text-primary text-xs">
                          {b.gstin || <span className="text-muted font-normal">Unregistered</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Accounting Configuration & Financial Years */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-text" />
                Accounting Periods & Financial Years ({financialYears.length})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {financialYears.length === 0 ? (
                <div className="col-span-2 p-3 rounded-xl border border-dashed border-default text-center text-muted">
                  Standard Indian Financial Year (April 1 to March 31) auto-provisioned.
                </div>
              ) : (
                financialYears.map((fy) => (
                  <div
                    key={fy.id}
                    className="p-3 rounded-xl border border-default bg-surface flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-primary">{fy.name}</div>
                      <div className="text-[10px] text-muted font-mono">
                        {fy.startDate} → {fy.endDate}
                      </div>
                    </div>
                    <Badge variant={fy.isClosed ? 'neutral' : 'success'} size="xs">
                      {fy.isClosed ? 'Closed Period' : 'Active Accounting Year'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            {!isActiveCompany && onSwitchCompany && (
              <Button
                variant="outline"
                size="sm"
                className="text-brand-text border-default hover:bg-brand-subtle"
                leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                onClick={() => {
                  onSwitchCompany(company.id);
                  onOpenChange(false);
                }}
              >
                Switch to this Company
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEditCompany && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit className="w-3.5 h-3.5" />}
                onClick={() => {
                  onOpenChange(false);
                  onEditCompany(company);
                }}
              >
                Edit Company
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

