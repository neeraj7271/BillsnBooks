export enum SettingScope {
  PLATFORM = 'PLATFORM',
  TENANT = 'TENANT',
  COMPANY = 'COMPANY',
  BRANCH = 'BRANCH',
  DOC_TYPE = 'DOC_TYPE',
  USER = 'USER',
}

export enum SettingCategory {
  FINANCIAL = 'FINANCIAL',
  TAX = 'TAX',
  DOCUMENT = 'DOCUMENT',
  BRANDING = 'BRANDING',
  NOTIFICATIONS = 'NOTIFICATIONS',
  SECURITY = 'SECURITY',
  WORKFLOW = 'WORKFLOW',
  LOCALISATION = 'LOCALISATION',
}

export interface SettingResolutionContext {
  tenantId?: string;
  companyId: string;
  branchId?: string;
  docType?: string;
  userId?: string;
}

export interface ResolvedSetting<T = any> {
  key: string;
  value: T;
  resolvedScope: SettingScope;
  scopeId?: string | null;
  isOverridden: boolean;
  defaultValue: T;
  category: SettingCategory;
  description: string;
  isSensitive: boolean;
  isLockedAfterFirstUse: boolean;
  impactsIssuedDocuments: boolean;
  allowedScopes: SettingScope[];
}

export interface SettingDefinition<T = any> {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'date' | 'enum';
  defaultValue: T;
  category: SettingCategory;
  description: string;
  allowedScopes: SettingScope[];
  isSensitive: boolean;
  isLockedAfterFirstUse: boolean;
  impactsIssuedDocuments: boolean;
  options?: string[];
}

export interface DocumentSnapshotPayload {
  templateVersion: string;
  templateLayout: string;
  companyName: string;
  companyPan: string;
  companyGstin: string;
  branchName?: string;
  branchAddress?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    accountHolder: string;
    branch?: string;
  };
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };
  termsAndConditions?: string;
  authorizedSignatoryTitle?: string;
  effectiveSettings: Record<string, any>;
  [key: string]: any;
}

export type ResetFrequency = 'NEVER' | 'YEARLY' | 'MONTHLY';

export type NumberAllocationStatus = 'ISSUED' | 'CANCELLED' | 'VOIDED';

export interface NumberingSeriesDto {
  id: string;
  tenantId: string;
  companyId: string;
  branchId?: string | null;
  docType: string;
  seriesCode: string;
  formatPattern: string;
  seqPadding: number;
  startSeq: number;
  currentSeq: number;
  resetFrequency: ResetFrequency;
  isManual: boolean;
  isLocked: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NumberAllocationDto {
  id: string;
  seriesId: string;
  companyId: string;
  docType: string;
  documentId: string;
  allocatedNumber: string;
  seqNumber: number;
  status: NumberAllocationStatus;
  cancellationReason?: string | null;
  allocatedAt: string;
  allocatedBy: string;
}

export interface GapReportItem {
  fromSeq: number;
  toSeq: number;
  missingCount: number;
}

export interface NumberPreviewResult {
  previewNumber: string;
  nextSeq: number;
  pattern: string;
  seriesCode: string;
}

