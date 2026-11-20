export type ReportPeriod = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_FY' | 'CUSTOM';

export type ReportExportFormat = 'xlsx' | 'pdf' | 'csv';

export interface FavoriteReportDto {
  id?: string;
  reportKey: string;
  title: string;
  category: string;
  description: string;
  displayOrder: number;
  defaultPeriod: ReportPeriod;
  isFavorite: boolean;
  href: string;
}

export interface CustomerSalesRow {
  partyId: string;
  partyName: string;
  partyCode?: string;
  gstin?: string;
  stateCode?: string;
  invoiceCount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
}

export interface CustomerSalesReport {
  companyId: string;
  companyName: string;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  currency: string;
  totalInvoices: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  totalSales: number;
  totalOutstanding: number;
  rows: CustomerSalesRow[];
}

export interface ItemSalesRow {
  itemId: string;
  itemName: string;
  itemCode?: string;
  hsnSacCode?: string;
  uom: string;
  quantitySold: number;
  avgSellingPrice: number;
  taxableAmount: number;
  gstRatePercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface ItemSalesReport {
  companyId: string;
  companyName: string;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  currency: string;
  totalItemsSold: number;
  totalQuantity: number;
  totalTaxable: number;
  totalTax: number;
  totalSales: number;
  rows: ItemSalesRow[];
}

export interface StatementOfAccountRow {
  date: string;
  voucherType: string;
  voucherNumber: string;
  particulars: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface StatementOfAccountReport {
  companyId: string;
  companyName: string;
  partyId: string;
  partyName: string;
  partyGstin?: string;
  partyAddress?: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  openingBalanceType: 'DR' | 'CR';
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: 'DR' | 'CR';
  rows: StatementOfAccountRow[];
}

export interface ReportShareRequestDto {
  reportKey: string;
  reportTitle: string;
  format: 'PDF' | 'EXCEL' | 'BOTH';
  recipientEmail?: string;
  recipientPhone?: string;
  personalMessage?: string;
  expiresInDays?: number;
  filters?: Record<string, any>;
}

export interface ReportShareResponseDto {
  shareId: string;
  token: string;
  shareUrl: string;
  whatsappShareText: string;
  expiresAt: string;
  emailSent: boolean;
}

// --- Expenses & Purchases Suite DTOs ---

export interface ExpensesMonthlyRow {
  month: string; // e.g. "2026-04" or "Apr 2026"
  voucherCount: number;
  totalExpenses: number;
  directExpenses: number;
  indirectExpenses: number;
  variationPercentage?: number;
}

export interface ExpensesMonthlyReport {
  companyId: string;
  companyName: string;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  currency: string;
  totalExpenses: number;
  monthlyAverage: number;
  rows: ExpensesMonthlyRow[];
}

export interface ExpensesVendorRow {
  vendorId?: string;
  vendorName: string;
  voucherCount: number;
  totalAmount: number;
  percentageOfTotal: number;
  tdsApplicable?: boolean;
}

export interface ExpensesVendorReport {
  companyId: string;
  companyName: string;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  currency: string;
  totalExpenses: number;
  rows: ExpensesVendorRow[];
}

export interface ExpensesCategoryRow {
  groupId: string;
  categoryName: string;
  nature: string;
  voucherCount: number;
  totalAmount: number;
  percentageOfTotal: number;
}

export interface ExpensesCategoryReport {
  companyId: string;
  companyName: string;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  currency: string;
  totalExpenses: number;
  rows: ExpensesCategoryRow[];
}

export interface ExpensesRegisterRow {
  voucherId: string;
  voucherDate: string;
  voucherNumber: string;
  voucherType: string;
  ledgerName: string;
  categoryName: string;
  vendorName?: string;
  amount: number;
  narration?: string;
}

export interface ExpensesRegisterReport {
  companyId: string;
  companyName: string;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  currency: string;
  totalExpenses: number;
  voucherCount: number;
  rows: ExpensesRegisterRow[];
}

export interface PurchasesItemRow {
  itemId: string;
  itemName: string;
  itemCode?: string;
  hsnSacCode?: string;
  uom: string;
  quantityPurchased: number;
  avgPurchasePrice: number;
  taxableAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface PurchasesItemReport {
  companyId: string;
  companyName: string;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  currency: string;
  totalItemsPurchased: number;
  totalQuantity: number;
  totalTaxable: number;
  totalTax: number;
  totalPurchases: number;
  rows: PurchasesItemRow[];
}

// --- Cash & Bank Audit Suite DTOs ---

export interface CashBankAuditRow {
  date: string;
  accountName: string;
  voucherType: string;
  voucherNumber: string;
  particulars: string;
  counterAccountName?: string;
  amount: number;
  balanceAfterTransaction?: number;
  violationReason?: string;
  statutoryLimitExceeded?: boolean;
}

export interface CashBankAuditReport {
  companyId: string;
  companyName: string;
  reportType: string;
  remarks: string;
  actionGuidance: string;
  fromDate: string;
  toDate: string;
  totalCount: number;
  totalAmount: number;
  rows: CashBankAuditRow[];
}

// --- Payables & Master Hygiene Suite DTOs ---

export interface PayablesSummaryRow {
  ledgerId: string;
  ledgerName: string;
  primaryGroup: string;
  pan?: string;
  gstin?: string;
  openingBalance: number;
  debitAmount: number;
  creditAmount: number;
  closingBalance: number;
  netPayable: number;
}

export interface PayablesSummaryReport {
  companyId: string;
  companyName: string;
  remarks: string;
  actionGuidance: string;
  fromDate: string;
  toDate: string;
  totalPayable: number;
  totalVendors: number;
  rows: PayablesSummaryRow[];
}

export interface PayablesAgeingRow {
  vendorId: string;
  vendorName: string;
  pan?: string;
  gstin?: string;
  totalOutstanding: number;
  current_0_30: number;
  bracket_31_60: number;
  bracket_61_90: number;
  bracket_90_plus: number;
}

export interface PayablesAgeingReport {
  companyId: string;
  companyName: string;
  asOfDate: string;
  totalOutstanding: number;
  rows: PayablesAgeingRow[];
}

export interface LedgerHygieneRow {
  ledgerId: string;
  ledgerName: string;
  groupName: string;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  issueType: 'SQUARED_OFF' | 'NO_MOVEMENT' | 'NOT_USED' | 'PAN_MISSING' | 'GSTIN_MISSING' | 'NEGATIVE_BALANCE';
  description: string;
}

