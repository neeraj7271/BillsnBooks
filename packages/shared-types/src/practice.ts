export enum EngagementType {
  RETAINER = 'RETAINER',
  AUDIT = 'AUDIT',
  BOOKKEEPING = 'BOOKKEEPING',
  GST_COMPLIANCE = 'GST_COMPLIANCE',
  TAX_FILING = 'TAX_FILING',
}

export enum ServiceTier {
  STANDARD = 'STANDARD',
  ENTERPRISE = 'ENTERPRISE',
  PRIORITY = 'PRIORITY',
}

export enum ClientHealthStatus {
  HEALTHY = 'HEALTHY',
  ACTION_REQUIRED = 'ACTION_REQUIRED',
  OVERDUE = 'OVERDUE',
}

export enum StaffRole {
  PARTNER = 'PARTNER',
  MANAGER = 'MANAGER',
  SENIOR_ACCOUNTANT = 'SENIOR_ACCOUNTANT',
  ARTICLE_TRAINEE = 'ARTICLE_TRAINEE',
}

export enum TaskCategory {
  GST = 'GST',
  TDS = 'TDS',
  INCOME_TAX = 'INCOME_TAX',
  ROC = 'ROC',
  AUDIT = 'AUDIT',
  ACCOUNTING = 'ACCOUNTING',
}

export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_REVIEW = 'PENDING_REVIEW',
  FILED = 'FILED',
  OVERDUE = 'OVERDUE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum DocumentRequestType {
  BANK_STATEMENT = 'BANK_STATEMENT',
  SALES_REGISTER = 'SALES_REGISTER',
  PURCHASE_BILLS = 'PURCHASE_BILLS',
  EXPENSE_VOUCHERS = 'EXPENSE_VOUCHERS',
  CHALLAN = 'CHALLAN',
  OTHER = 'OTHER',
}

export enum DocumentRequestStatus {
  REQUESTED = 'REQUESTED',
  UPLOADED = 'UPLOADED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export interface FirmClientDto {
  id: string;
  tenantId: string;
  companyId: string;
  companyName?: string;
  pan?: string;
  gstin?: string;
  clientCode: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  engagementType: EngagementType;
  serviceTier: ServiceTier;
  isPortalEnabled: boolean;
  healthStatus: ClientHealthStatus;
  openTaskCount?: number;
  pendingDocCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFirmClientDto {
  companyId: string;
  clientCode: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  engagementType?: EngagementType;
  serviceTier?: ServiceTier;
}

export interface StaffAssignmentDto {
  id: string;
  tenantId: string;
  clientId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role: StaffRole;
  isLead: boolean;
  assignedAt: string;
}

export interface ComplianceTaskDto {
  id: string;
  tenantId: string;
  clientId: string;
  clientName?: string;
  title: string;
  description?: string;
  category: TaskCategory;
  statutoryPeriod: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToUserId?: string;
  assignedToName?: string;
  reviewedByUserId?: string;
  filingAcknowledgmentNumber?: string;
  completedAt?: string;
  commentsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplianceTaskDto {
  clientId: string;
  title: string;
  description?: string;
  category: TaskCategory;
  statutoryPeriod: string;
  dueDate: string;
  priority?: TaskPriority;
  assignedToUserId?: string;
}

export interface TaskCommentDto {
  id: string;
  tenantId: string;
  taskId: string;
  userId: string;
  userName?: string;
  comment: string;
  isInternalOnly: boolean;
  createdAt: string;
}

export interface ClientDocumentRequestDto {
  id: string;
  tenantId: string;
  clientId: string;
  clientName?: string;
  title: string;
  description?: string;
  documentType: DocumentRequestType;
  period: string;
  status: DocumentRequestStatus;
  dueDate?: string;
  fileUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentRequestDto {
  clientId: string;
  title: string;
  description?: string;
  documentType: DocumentRequestType;
  period: string;
  dueDate?: string;
}

