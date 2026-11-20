import {
  PartyType,
  PartyRegistrationType,
  RegistrationStatus,
  AddressType,
  VerificationStatus,
  ItemType,
  InvoiceStatus,
  DocumentType,
  TaxClassification,
  ApprovalStatus,
  ApprovalRequestType,
  NotificationType,
} from './enums.js';
import { SupplyType } from './gst.js';

export interface PartyAddressDto {
  id?: string;
  registrationId?: string;
  addressType: AddressType;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateCode: string;
  pincode: string;
  country: string;
  isDefaultBilling?: boolean;
  isDefaultShipping?: boolean;
}

export interface PartyRegistrationDto {
  id?: string;
  registrationType: PartyRegistrationType;
  gstin?: string;
  stateCode: string;
  legalName?: string;
  tradeName?: string;
  status?: RegistrationStatus;
  validFrom?: string;
  validTo?: string;
  verificationStatus?: VerificationStatus;
  verifiedAt?: string;
  verificationSource?: string;
}

export interface PartyDto {
  id?: string;
  tenantId?: string;
  companyId?: string;
  partyCode?: string;
  name: string;
  tradeName?: string;
  partyType: PartyType;
  registrationType?: PartyRegistrationType;
  currency?: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingStateCode: string;
  billingPincode?: string;
  shippingAddressLine1?: string;
  shippingCity?: string;
  shippingStateCode?: string;
  shippingPincode?: string;
  addresses?: PartyAddressDto[];
  registrations?: PartyRegistrationDto[];
  creditLimit?: string | number;
  paymentTermsDays?: number;
  ledgerId?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItemDto {
  id?: string;
  tenantId?: string;
  companyId?: string;
  itemCode: string;
  name: string;
  description?: string;
  hsnSacCode: string;
  itemType: ItemType;
  uom: string;
  unitPrice: string | number;
  gstRatePercent: string | number;
  cessRatePercent?: string | number;
  salesLedgerId?: string;
  purchaseLedgerId?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceItemDto {
  id?: string;
  itemId?: string;
  description: string;
  hsnSacCode: string;
  quantity: string | number;
  uom?: string;
  unitPrice: string | number;
  discountPercent?: string | number;
  discountAmount?: string | number;
  taxableAmount?: string | number;
  gstRatePercent?: string | number;
  cessRatePercent?: string | number;
  cgstAmount?: string | number;
  sgstAmount?: string | number;
  igstAmount?: string | number;
  cessAmount?: string | number;
  totalAmount?: string | number;
}

export interface CreateInvoiceDto {
  branchId: string;
  financialYearId: string;
  partyId: string;
  invoiceDate: string;
  dueDate: string;
  placeOfSupplyStateCode: string;
  documentType?: DocumentType;
  invoiceNumber?: string;
  customInvoiceNumber?: string;
  isRcm?: boolean;
  taxClassification?: TaxClassification;
  promiseToPayDate?: string;
  promiseToPayNotes?: string;
  notes?: string;
  termsAndConditions?: string;
  items: InvoiceItemDto[];
  idempotencyKey?: string;
  requireApproval?: boolean;
  isDraft?: boolean;
}

export interface InvoiceDto {
  id: string;
  tenantId: string;
  companyId: string;
  branchId: string;
  financialYearId: string;
  partyId: string;
  party?: PartyDto;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  documentType?: DocumentType;
  isRcm?: boolean;
  taxClassification?: TaxClassification;
  promiseToPayDate?: string;
  promiseToPayNotes?: string;
  supplyType: SupplyType;
  placeOfSupplyStateCode: string;
  subtotalAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  cessAmount: string;
  roundOffAmount: string;
  totalAmount: string;
  notes?: string;
  termsAndConditions?: string;
  voucherId?: string;
  partyNameSnapshot?: string;
  partyTradeNameSnapshot?: string;
  partyRegistrationTypeSnapshot?: PartyRegistrationType;
  partyGstinSnapshot?: string;
  partyPanSnapshot?: string;
  billingAddressSnapshot?: Record<string, any>;
  shippingAddressSnapshot?: Record<string, any>;
  taxRuleVersionSnapshot?: string;
  taxRateSourcesSnapshot?: Record<string, any>;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  items: InvoiceItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequestDto {
  id: string;
  tenantId: string;
  companyId: string;
  entityType: 'INVOICE' | 'VOUCHER' | 'BANK_TRANSACTION';
  entityId: string;
  requestType: ApprovalRequestType;
  requestedBy: string;
  requesterName?: string;
  status: ApprovalStatus;
  approverId?: string;
  actionTimestamp?: string;
  comments?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotificationDto {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'WHATSAPP' | 'SMS';

export interface NotificationSettingDto {
  id?: string;
  companyId: string;
  eventType: NotificationType | string;
  isEnabled: boolean;
  triggerType: 'INSTANT' | 'OFFSET_SCHEDULED';
  offsetsDays: number[];
  dispatchTime: string; // e.g. "09:30:00"
  timezone: string;
  enableInApp: boolean;
  enableEmail: boolean;
  enableWhatsapp: boolean;
  enableSms: boolean;
  includePaymentLink: boolean;
  updatedAt?: string;
}

export interface NotificationSettingsSummaryDto {
  companyId: string;
  timezone: string;
  dailyDispatchTime: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  rules: NotificationSettingDto[];
}
