import {
  RecurringFrequency,
  RecurringScheduleStatus,
  PaymentLinkProvider,
  PaymentLinkStatus,
  GatewaySettlementStatus,
  ReminderChannel,
  ReminderCadence,
  ReminderStatus,
} from './enums.js';

export interface ArAgeingSummaryDto {
  totalOutstanding: string | number;
  current0To30: string | number;
  days31To60: string | number;
  days61To90: string | number;
  days90Plus: string | number;
  dsoDays: number;
  partiesCount: number;
  asOfDate: string;
}

export interface PartyAgeingDto {
  partyId: string;
  partyName: string;
  tradeName?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  totalDue: string | number;
  current0To30: string | number;
  days31To60: string | number;
  days61To90: string | number;
  days90Plus: string | number;
  oldestInvoiceDate: string;
  invoicesCount: number;
}

export interface RecurringScheduleTemplateItem {
  itemId?: string;
  description: string;
  hsnSacCode: string;
  quantity: number | string;
  uom?: string;
  unitPrice: number | string;
  discountPercent?: number | string;
  gstRatePercent?: number | string;
}

export interface RecurringScheduleTemplate {
  items: RecurringScheduleTemplateItem[];
  notes?: string;
  termsAndConditions?: string;
  placeOfSupplyStateCode: string;
  supplyType?: string;
}

export interface RecurringScheduleDto {
  id: string;
  tenantId: string;
  companyId: string;
  branchId: string;
  partyId: string;
  partyName?: string;
  frequency: RecurringFrequency;
  status: RecurringScheduleStatus;
  nextRunDate: string;
  lastRunDate?: string;
  endDate?: string;
  templatePayload: RecurringScheduleTemplate;
  totalRuns: number;
  maxRuns?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringScheduleDto {
  branchId: string;
  partyId: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  maxRuns?: number;
  template: RecurringScheduleTemplate;
}

export interface PaymentLinkDto {
  id: string;
  tenantId: string;
  companyId: string;
  invoiceId: string;
  partyId: string;
  partyName?: string;
  invoiceNumber?: string;
  provider: PaymentLinkProvider;
  linkId: string;
  shortUrl: string;
  amount: string | number;
  currency: string;
  status: PaymentLinkStatus;
  paidAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CreatePaymentLinkDto {
  invoiceId: string;
  provider?: PaymentLinkProvider;
  expiresInDays?: number;
}

export interface GatewaySettlementDto {
  id: string;
  tenantId: string;
  companyId: string;
  settlementId: string;
  provider: PaymentLinkProvider;
  settlementDate: string;
  grossAmount: string | number;
  feeAmount: string | number;
  taxOnFee: string | number;
  netCreditAmount: string | number;
  bankReference?: string;
  voucherId?: string;
  status: GatewaySettlementStatus;
  createdAt: string;
}

export interface ReconcileSettlementDto {
  provider: PaymentLinkProvider;
  settlementId: string;
  settlementDate: string;
  grossAmount: number | string;
  feeAmount: number | string;
  taxOnFee: number | string;
  netCreditAmount: number | string;
  bankReference: string;
  bankLedgerId?: string;
}

export interface CollectionReminderDto {
  id: string;
  tenantId: string;
  companyId: string;
  invoiceId: string;
  partyId: string;
  invoiceNumber?: string;
  partyName?: string;
  channel: ReminderChannel;
  cadence: ReminderCadence;
  recipient: string;
  messageBody: string;
  status: ReminderStatus;
  sentAt: string;
  createdAt: string;
}

export interface SendReminderDto {
  invoiceId: string;
  channel: ReminderChannel;
  cadence: ReminderCadence;
  customMessage?: string;
}

