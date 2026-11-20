export enum TallyConnectorStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR',
}

export enum TallyPostingStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  DISCREPANCY = 'DISCREPANCY',
  FAILED = 'FAILED',
  UNCERTAIN = 'UNCERTAIN',
}

export interface TallyConnectorDTO {
  id: string;
  tenantId: string;
  companyId: string;
  machineName: string;
  connectorVersion: string;
  tallyVersion: string;
  tallyPort: number;
  status: TallyConnectorStatus;
  lastHeartbeatAt: string;
  activeTallyCompany?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TallyMasterDTO {
  id: string;
  companyId: string;
  name: string;
  parentGroup: string;
  gstin?: string | null;
  state?: string | null;
  openingBalance: number;
  isParty: boolean;
  syncedAt: string;
}

export interface TallyPostingLogDTO {
  id: string;
  batchId: string;
  voucherId: string;
  tallyGuid?: string | null;
  tallyVoucherNumber?: string | null;
  postingStatus: TallyPostingStatus;
  payloadSent?: Record<string, any> | null;
  readBackData?: Record<string, any> | null;
  verificationStatus: string;
  errorMessage?: string | null;
  sentAt?: string | null;
  verifiedAt?: string | null;
}

