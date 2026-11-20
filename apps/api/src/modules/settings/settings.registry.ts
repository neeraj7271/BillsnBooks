import { z } from 'zod';
import { SettingCategory, SettingScope, SettingDefinition } from '@platform/shared-types';

export interface RegisteredSettingDefinition<T = any> extends SettingDefinition<T> {
  schema: z.ZodType<T>;
}

export class SettingsRegistry {
  private static definitions: Map<string, RegisteredSettingDefinition> = new Map();

  static register<T>(definition: RegisteredSettingDefinition<T>): void {
    this.definitions.set(definition.key, definition);
  }

  static get(key: string): RegisteredSettingDefinition | undefined {
    return this.definitions.get(key);
  }

  static getAll(): RegisteredSettingDefinition[] {
    return Array.from(this.definitions.values());
  }

  static getByCategory(category: SettingCategory): RegisteredSettingDefinition[] {
    return this.getAll().filter((d) => d.category === category);
  }

  static validate(key: string, value: any): { success: boolean; data?: any; error?: string } {
    const definition = this.get(key);
    if (!definition) {
      return { success: false, error: `Unrecognized setting key: "${key}"` };
    }
    const result = definition.schema.safeParse(value);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      return { success: false, error: messages.join(', ') };
    }
    return { success: true, data: result.data };
  }
}

// ==========================================
// Financial & Period Lock Settings
// ==========================================
SettingsRegistry.register({
  key: 'financial.fy_lock_date',
  type: 'string',
  defaultValue: null,
  category: SettingCategory.FINANCIAL,
  description: 'Cutoff date before which no vouchers or invoices may be posted or edited (YYYY-MM-DD)',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: true,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: true,
  schema: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format').nullable(),
});

SettingsRegistry.register({
  key: 'financial.cash_accounting_enabled',
  type: 'boolean',
  defaultValue: false,
  category: SettingCategory.FINANCIAL,
  description: 'Enable Cash basis accounting instead of standard Accrual basis',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: true,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: true,
  schema: z.boolean(),
});

SettingsRegistry.register({
  key: 'financial.base_currency',
  type: 'string',
  defaultValue: 'INR',
  category: SettingCategory.FINANCIAL,
  description: 'Operating functional currency code (ISO 4217)',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: true,
  isLockedAfterFirstUse: true,
  impactsIssuedDocuments: true,
  schema: z.string().min(3).max(3),
});

SettingsRegistry.register({
  key: 'financial.rounding_method',
  type: 'enum',
  defaultValue: 'ROUND_HALF_UP',
  category: SettingCategory.FINANCIAL,
  description: 'Rounding method for line-item tax calculations',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  options: ['ROUND_HALF_UP', 'ROUND_UP', 'ROUND_DOWN'],
  schema: z.enum(['ROUND_HALF_UP', 'ROUND_UP', 'ROUND_DOWN']),
});

SettingsRegistry.register({
  key: 'financial.decimal_places',
  type: 'number',
  defaultValue: 2,
  category: SettingCategory.FINANCIAL,
  description: 'Number of decimal places displayed and rounded for currency amounts (0 to 4)',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.number().int().min(0).max(4),
});

// ==========================================
// GST & Statutory Settings
// ==========================================
SettingsRegistry.register({
  key: 'tax.e_invoice_threshold',
  type: 'number',
  defaultValue: 50000000,
  category: SettingCategory.TAX,
  description: 'Annual turnover threshold in INR above which e-invoicing is mandatory (default: 5 Cr)',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: true,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.number().positive(),
});

SettingsRegistry.register({
  key: 'tax.e_way_bill_threshold',
  type: 'number',
  defaultValue: 50000,
  category: SettingCategory.TAX,
  description: 'Invoice value threshold in INR requiring mandatory e-Way Bill generation (default: 50,000)',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.number().positive(),
});

SettingsRegistry.register({
  key: 'tax.default_place_of_supply',
  type: 'string',
  defaultValue: '27',
  category: SettingCategory.TAX,
  description: 'Default 2-digit Indian State Code for Place of Supply if party state is unknown',
  allowedScopes: [SettingScope.COMPANY, SettingScope.BRANCH],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.string().length(2),
});

SettingsRegistry.register({
  key: 'tax.rcm_applicable',
  type: 'boolean',
  defaultValue: false,
  category: SettingCategory.TAX,
  description: 'Enable Reverse Charge Mechanism defaults on purchase vouchers and unregistered supplier transactions',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.boolean(),
});

// ==========================================
// Document, Invoice & Print Template Settings
// ==========================================
SettingsRegistry.register({
  key: 'document.default_template',
  type: 'enum',
  defaultValue: 'classic',
  category: SettingCategory.DOCUMENT,
  description: 'Default layout template for rendered and printed invoices',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH, SettingScope.DOC_TYPE],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  options: ['classic', 'modern', 'compact', 'thermal', 'detailed_gst'],
  schema: z.enum(['classic', 'modern', 'compact', 'thermal', 'detailed_gst']),
});

SettingsRegistry.register({
  key: 'document.show_bank_details',
  type: 'boolean',
  defaultValue: true,
  category: SettingCategory.DOCUMENT,
  description: 'Show bank account coordinates and IFSC on printed tax invoices',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.boolean(),
});

SettingsRegistry.register({
  key: 'document.show_qr_code',
  type: 'boolean',
  defaultValue: true,
  category: SettingCategory.DOCUMENT,
  description: 'Display dynamic UPI payment QR code on customer invoices',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.boolean(),
});

SettingsRegistry.register({
  key: 'document.terms_and_conditions',
  type: 'string',
  defaultValue: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is overdue.\n3. Subject to local jurisdiction.',
  category: SettingCategory.DOCUMENT,
  description: 'Standard terms and conditions printed on invoices and bills of supply',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH, SettingScope.DOC_TYPE],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.string().max(2000),
});

SettingsRegistry.register({
  key: 'document.authorized_signatory_title',
  type: 'string',
  defaultValue: 'Authorised Signatory',
  category: SettingCategory.DOCUMENT,
  description: 'Label printed beneath the signature block',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.string().max(100),
});

SettingsRegistry.register({
  key: 'document.show_signature',
  type: 'boolean',
  defaultValue: true,
  category: SettingCategory.DOCUMENT,
  description: 'Show authorized signatory block or DSC stamp on printed tax invoices',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.boolean(),
});

SettingsRegistry.register({
  key: 'document.upi_id',
  type: 'string',
  defaultValue: null,
  category: SettingCategory.DOCUMENT,
  description: 'UPI Virtual Payment Address (VPA) for dynamic payment QR code',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.string().nullable(),
});

// ==========================================
// Branding & Presentation
// ==========================================
SettingsRegistry.register({
  key: 'branding.logo_url',
  type: 'string',
  defaultValue: null,
  category: SettingCategory.BRANDING,
  description: 'Public URL or base64 Data URI for company invoice header logo',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.string().nullable(),
});

SettingsRegistry.register({
  key: 'branding.signature_url',
  type: 'string',
  defaultValue: null,
  category: SettingCategory.BRANDING,
  description: 'Public URL or base64 Data URI for authorized signature or DSC stamp',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.string().nullable(),
});

SettingsRegistry.register({
  key: 'branding.signature_type',
  type: 'enum',
  defaultValue: 'IMAGE',
  category: SettingCategory.BRANDING,
  description: 'Signature mode: physical handwritten image/stamp or DSC digital signature',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  options: ['IMAGE', 'DSC'],
  schema: z.enum(['IMAGE', 'DSC']),
});

SettingsRegistry.register({
  key: 'branding.dsc_signer_name',
  type: 'string',
  defaultValue: null,
  category: SettingCategory.BRANDING,
  description: 'Name of DSC certificate holder for electronic signature',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.string().nullable(),
});

SettingsRegistry.register({
  key: 'branding.dsc_designation',
  type: 'string',
  defaultValue: 'Authorised Signatory',
  category: SettingCategory.BRANDING,
  description: 'Designation of the DSC certificate holder',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.string().nullable(),
});

SettingsRegistry.register({
  key: 'branding.dsc_cert_details',
  type: 'string',
  defaultValue: null,
  category: SettingCategory.BRANDING,
  description: 'DSC Certification authority and validity details',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY, SettingScope.BRANCH],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.string().nullable(),
});

SettingsRegistry.register({
  key: 'branding.primary_color',
  type: 'string',
  defaultValue: '#2563eb',
  category: SettingCategory.BRANDING,
  description: 'Primary accent color for invoice headers, borders, and highlights (HEX)',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color code'),
});

// ==========================================
// Notifications & Dispatch
// ==========================================
SettingsRegistry.register({
  key: 'notifications.default_channel',
  type: 'enum',
  defaultValue: 'EMAIL',
  category: SettingCategory.NOTIFICATIONS,
  description: 'Primary channel for outbound customer communications',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  options: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'],
  schema: z.enum(['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP']),
});

SettingsRegistry.register({
  key: 'notifications.quiet_hours_enabled',
  type: 'boolean',
  defaultValue: true,
  category: SettingCategory.NOTIFICATIONS,
  description: 'Enforce statutory quiet hours (no non-urgent SMS/WhatsApp between 21:00 and 09:00)',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.boolean(),
});

// ==========================================
// Master Auto-Codes & Workflow
// ==========================================
SettingsRegistry.register({
  key: 'workflow.require_maker_checker',
  type: 'boolean',
  defaultValue: false,
  category: SettingCategory.WORKFLOW,
  description: 'Enforce dual authorization: vouchers and invoices must be approved before posting',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: true,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.boolean(),
});

SettingsRegistry.register({
  key: 'workflow.auto_generate_customer_codes',
  type: 'boolean',
  defaultValue: true,
  category: SettingCategory.WORKFLOW,
  description: 'Automatically assign sequential customer codes (e.g. CUST-00001)',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.boolean(),
});

SettingsRegistry.register({
  key: 'workflow.auto_generate_vendor_codes',
  type: 'boolean',
  defaultValue: true,
  category: SettingCategory.WORKFLOW,
  description: 'Automatically assign sequential supplier codes (e.g. VEND-00001)',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.boolean(),
});

SettingsRegistry.register({
  key: 'workflow.auto_generate_item_codes',
  type: 'boolean',
  defaultValue: true,
  category: SettingCategory.WORKFLOW,
  description: 'Automatically assign sequential stock item SKU codes (e.g. ITEM-00001)',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.boolean(),
});

// ==========================================
// Integrations & Operating Modes
// ==========================================
SettingsRegistry.register({
  key: 'integration.tally_enabled',
  type: 'boolean',
  defaultValue: false,
  category: SettingCategory.WORKFLOW,
  description: 'Enable Tally Prime 2-way synchronization, bridge agent, XML exports, and Tally ledger aliases',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.boolean(),
});

SettingsRegistry.register({
  key: 'portal.invoicing_only',
  type: 'boolean',
  defaultValue: false,
  category: SettingCategory.WORKFLOW,
  description: 'Streamline interface for invoicing and GST compliance only (hides journal/contra accounting vouchers)',
  allowedScopes: [SettingScope.PLATFORM, SettingScope.COMPANY],
  isSensitive: false,
  isLockedAfterFirstUse: false,
  impactsIssuedDocuments: false,
  schema: z.boolean(),
});

