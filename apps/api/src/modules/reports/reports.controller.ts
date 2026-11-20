import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Request,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportExportService } from './report-export.service';
import { ReportShareService } from './report-share.service';
import { ReportShareRequestDto } from '@platform/shared-types';

@Controller('v1')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly exportService: ReportExportService,
    private readonly shareService: ReportShareService,
  ) {}

  private getContext(req: any) {
    const tenantId =
      req.query?.tenantId ||
      req.user?.tenantId ||
      req.headers['x-tenant-id'] ||
      'a0000000-0000-4000-8000-000000000001';
    const userId =
      req.query?.userId ||
      req.user?.id ||
      req.headers['x-user-id'] ||
      'b0000000-0000-4000-8000-000000000001';
    return { tenantId, userId };
  }

  // --- Catalog & Favorites ---

  @Get('companies/:companyId/reports/catalog')
  async listCatalog(
    @Param('companyId') companyId: string,
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.reportsService.listReportCatalogWithFavorites(tenantId, companyId, userId);
  }

  @Post('companies/:companyId/reports/favorites/:key/toggle')
  async toggleFavorite(
    @Param('companyId') companyId: string,
    @Param('key') key: string,
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.reportsService.toggleFavoriteReport(tenantId, companyId, userId, key);
  }

  // --- Customer & Item Sales Intelligence ---

  @Get('companies/:companyId/reports/customer-sales')
  async getCustomerSales(
    @Param('companyId') companyId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.reportsService.getCustomerSalesReport(tenantId, companyId, fromDate, toDate);
  }

  @Get('companies/:companyId/reports/item-sales')
  async getItemSales(
    @Param('companyId') companyId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.reportsService.getItemSalesReport(tenantId, companyId, fromDate, toDate);
  }

  // --- Purchases & Expenses Endpoints ---

  @Get('companies/:companyId/reports/expenses/monthly')
  async getExpensesMonthly(
    @Param('companyId') companyId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.reportsService.getExpensesMonthlyReport(tenantId, companyId, fromDate, toDate);
  }

  @Get('companies/:companyId/reports/expenses/vendor')
  async getExpensesVendor(
    @Param('companyId') companyId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.reportsService.getExpensesVendorReport(tenantId, companyId, fromDate, toDate);
  }

  @Get('companies/:companyId/reports/expenses/category')
  async getExpensesCategory(
    @Param('companyId') companyId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.reportsService.getExpensesCategoryReport(tenantId, companyId, fromDate, toDate);
  }

  @Get('companies/:companyId/reports/expenses/register')
  async getExpensesRegister(
    @Param('companyId') companyId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('voucherType') voucherType: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.reportsService.getExpensesRegisterReport(
      tenantId,
      companyId,
      fromDate,
      toDate,
      voucherType,
    );
  }

  @Get('companies/:companyId/reports/purchases/items')
  async getPurchasesItems(
    @Param('companyId') companyId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.reportsService.getPurchasesItemReport(tenantId, companyId, fromDate, toDate);
  }

  // --- Cash & Bank Audit Endpoints ---

  @Get('companies/:companyId/reports/cash-bank-audit')
  async getCashBankAudit(
    @Param('companyId') companyId: string,
    @Query('auditType') auditType: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.reportsService.getCashBankAuditReport(
      tenantId,
      companyId,
      auditType || 'cash-negative',
      fromDate,
      toDate,
    );
  }

  // --- Vendor Payables & Master Hygiene Endpoints ---

  @Get('companies/:companyId/reports/payables/summary')
  async getPayablesSummary(
    @Param('companyId') companyId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.reportsService.getPayablesSummaryReport(tenantId, companyId, fromDate, toDate);
  }

  @Get('companies/:companyId/reports/payables/ageing')
  async getPayablesAgeing(
    @Param('companyId') companyId: string,
    @Query('asOfDate') asOfDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.reportsService.getPayablesAgeingReport(tenantId, companyId, asOfDate);
  }

  @Get('companies/:companyId/reports/ledger-hygiene')
  async getLedgerHygiene(
    @Param('companyId') companyId: string,
    @Query('hygieneType') hygieneType: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.reportsService.getLedgerHygieneReport(
      tenantId,
      companyId,
      hygieneType || 'squared-off',
    );
  }

  // --- Financial Statements (Existing) ---

  @Get('companies/:companyId/reports/trial-balance')
  async getTrialBalance(
    @Param('companyId') companyId: string,
    @Query('asOfDate') asOfDate: string,
    @Query('fromDate') fromDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    const date = asOfDate || new Date().toISOString().split('T')[0];
    return await this.reportsService.getTrialBalance(tenantId, companyId, date, fromDate);
  }

  @Get('companies/:companyId/reports/general-ledger')
  async getGeneralLedger(
    @Param('companyId') companyId: string,
    @Query('ledgerId') ledgerId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    const today = new Date().toISOString().split('T')[0];
    const from = fromDate || '2024-04-01';
    const to = toDate || today;
    return await this.reportsService.getGeneralLedger(tenantId, companyId, ledgerId, from, to);
  }

  @Get('companies/:companyId/reports/profit-and-loss')
  async getProfitAndLoss(
    @Param('companyId') companyId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    const today = new Date().toISOString().split('T')[0];
    const from = fromDate || '2024-04-01';
    const to = toDate || today;
    return await this.reportsService.getProfitAndLoss(tenantId, companyId, from, to);
  }

  @Get('companies/:companyId/reports/balance-sheet')
  async getBalanceSheet(
    @Param('companyId') companyId: string,
    @Query('asOfDate') asOfDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    const date = asOfDate || new Date().toISOString().split('T')[0];
    return await this.reportsService.getBalanceSheet(tenantId, companyId, date);
  }

  // --- Export (Excel / HTML-PDF) ---

  @Get('companies/:companyId/reports/:reportKey/export')
  async exportReport(
    @Param('companyId') companyId: string,
    @Param('reportKey') reportKey: string,
    @Query('format') format: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { tenantId } = this.getContext(req);
    const branding = await this.reportsService.getCompanyBranding(tenantId, companyId);
    const isExcel = (format || 'xlsx').toLowerCase().includes('xls');
    const rKeyUpper = reportKey.toUpperCase();

    // 1. Customer-Wise Sales Report
    if (rKeyUpper === 'CUSTOMER_SALES') {
      const data = await this.reportsService.getCustomerSalesReport(tenantId, companyId, fromDate, toDate);
      if (isExcel) {
        const buffer = await this.exportService.exportCustomerSalesExcel(data, branding);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Customer_Sales_Report_${Date.now()}.xlsx"`);
        return res.send(buffer);
      } else {
        const headers = ['#', 'Customer Name', 'GSTIN', 'POS', 'Invoices', 'Taxable (₹)', 'Taxes (₹)', 'Total Sales (₹)', 'Outstanding (₹)'];
        const rows = data.rows.map((r, i) => [
          i + 1,
          r.partyName,
          r.gstin || 'Unregistered',
          r.stateCode || '27',
          r.invoiceCount,
          r.taxableAmount,
          r.totalTax,
          r.totalAmount,
          r.outstandingBalance,
        ]);
        const totals = ['', 'TOTALS', '', '', data.totalInvoices, data.totalTaxable, data.totalTax, data.totalSales, data.totalOutstanding];
        const html = this.exportService.generateBrandedReportHtml('Customer-Wise Sales Analysis Report', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    // 2. Product & Item-Wise Sales Report
    if (rKeyUpper === 'ITEM_SALES') {
      const data = await this.reportsService.getItemSalesReport(tenantId, companyId, fromDate, toDate);
      if (isExcel) {
        const buffer = await this.exportService.exportItemSalesExcel(data, branding);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Item_Sales_Report_${Date.now()}.xlsx"`);
        return res.send(buffer);
      } else {
        const headers = ['#', 'Product Name', 'Code', 'HSN/SAC', 'UOM', 'Qty Sold', 'Avg Price (₹)', 'Taxable (₹)', 'Tax (₹)', 'Total (₹)'];
        const rows = data.rows.map((r, i) => [
          i + 1,
          r.itemName,
          r.itemCode || 'N/A',
          r.hsnSacCode || 'N/A',
          r.uom,
          r.quantitySold,
          r.avgSellingPrice,
          r.taxableAmount,
          r.totalTax,
          r.totalAmount,
        ]);
        const totals = ['', 'TOTALS', '', '', '', data.totalQuantity, '', data.totalTaxable, data.totalTax, data.totalSales];
        const html = this.exportService.generateBrandedReportHtml('Product & Item-Wise Sales Analysis Report', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    // 3. Expenses Monthly Trend
    if (rKeyUpper === 'EXPENSES_MONTHLY') {
      const data = await this.reportsService.getExpensesMonthlyReport(tenantId, companyId, fromDate, toDate);
      const headers = ['#', 'Month', 'Vouchers', 'Direct Expenses (₹)', 'Indirect Expenses (₹)', 'Total Expenses (₹)', 'MoM Trend %'];
      const rows = data.rows.map((r, i) => [
        i + 1,
        r.month,
        r.voucherCount,
        r.directExpenses,
        r.indirectExpenses,
        r.totalExpenses,
        r.variationPercentage !== undefined ? `${r.variationPercentage > 0 ? '+' : ''}${r.variationPercentage}%` : '-',
      ]);
      const totals = ['', 'TOTALS', '', '', '', data.totalExpenses, ''];
      if (isExcel) {
        const buffer = await this.exportService.exportGenericReportExcel('Expenses Monthly Trend Report', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Expenses_Monthly_${Date.now()}.xlsx"`);
        return res.send(buffer);
      } else {
        const html = this.exportService.generateBrandedReportHtml('Expenses Monthly Trend Report', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    // 4. Expenses Vendor-Wise
    if (rKeyUpper === 'EXPENSES_VENDOR') {
      const data = await this.reportsService.getExpensesVendorReport(tenantId, companyId, fromDate, toDate);
      const headers = ['#', 'Vendor / Payee Name', 'Vouchers', 'Total Expense (₹)', 'Spend Share %', 'TDS Status'];
      const rows = data.rows.map((r, i) => [
        i + 1,
        r.vendorName,
        r.voucherCount,
        r.totalAmount,
        `${r.percentageOfTotal}%`,
        r.tdsApplicable ? 'Check Sec 194C/J' : 'Normal',
      ]);
      const totals = ['', 'TOTALS', '', data.totalExpenses, '100%', ''];
      if (isExcel) {
        const buffer = await this.exportService.exportGenericReportExcel('Expenses Vendor-Wise Report', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Expenses_VendorWise_${Date.now()}.xlsx"`);
        return res.send(buffer);
      } else {
        const html = this.exportService.generateBrandedReportHtml('Expenses Vendor-Wise Report', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    // 5. Expenses Category-Wise
    if (rKeyUpper === 'EXPENSES_CATEGORY') {
      const data = await this.reportsService.getExpensesCategoryReport(tenantId, companyId, fromDate, toDate);
      const headers = ['#', 'Expense Category / Ledger', 'Nature', 'Vouchers', 'Total Expense (₹)', '% of Spend'];
      const rows = data.rows.map((r, i) => [
        i + 1,
        r.categoryName,
        r.nature,
        r.voucherCount,
        r.totalAmount,
        `${r.percentageOfTotal}%`,
      ]);
      const totals = ['', 'TOTALS', '', '', data.totalExpenses, '100%'];
      if (isExcel) {
        const buffer = await this.exportService.exportGenericReportExcel('Expenses Category-Wise Report', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Expenses_CategoryWise_${Date.now()}.xlsx"`);
        return res.send(buffer);
      } else {
        const html = this.exportService.generateBrandedReportHtml('Expenses Category-Wise Report', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    // 6. Expenses Register
    if (rKeyUpper === 'EXPENSES_REGISTER') {
      const data = await this.reportsService.getExpensesRegisterReport(tenantId, companyId, fromDate, toDate);
      const headers = ['#', 'Voucher Date', 'Voucher No', 'Voucher Type', 'Ledger Name', 'Particulars / Narration', 'Amount (₹)'];
      const rows = data.rows.map((r, i) => [
        i + 1,
        r.voucherDate,
        r.voucherNumber,
        r.voucherType,
        r.ledgerName,
        r.narration || '-',
        r.amount,
      ]);
      const totals = ['', 'TOTALS', '', '', '', '', data.totalExpenses];
      if (isExcel) {
        const buffer = await this.exportService.exportGenericReportExcel('Expenses Register Audit Trail', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Expenses_Register_${Date.now()}.xlsx"`);
        return res.send(buffer);
      } else {
        const html = this.exportService.generateBrandedReportHtml('Expenses Register Audit Trail', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    // 7. Purchases Item-Wise
    if (rKeyUpper === 'PURCHASES_ITEM') {
      const data = await this.reportsService.getPurchasesItemReport(tenantId, companyId, fromDate, toDate);
      const headers = ['#', 'Item / Product Name', 'HSN / SAC', 'UOM', 'Qty Purchased', 'Avg Price (₹)', 'Taxable (₹)', 'Total Purchase (₹)'];
      const rows = data.rows.map((r, i) => [
        i + 1,
        r.itemName,
        r.hsnSacCode || '-',
        r.uom || 'NOS',
        r.quantityPurchased,
        r.avgPurchasePrice,
        r.taxableAmount,
        r.totalAmount,
      ]);
      const totals = ['', 'TOTALS', '', '', '', '', '', data.totalPurchases];
      if (isExcel) {
        const buffer = await this.exportService.exportGenericReportExcel('Purchases Item-Wise Analysis Report', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Purchases_ItemWise_${Date.now()}.xlsx"`);
        return res.send(buffer);
      } else {
        const html = this.exportService.generateBrandedReportHtml('Purchases Item-Wise Analysis Report', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    // 8. Vendor Payables Summary
    if (rKeyUpper === 'PAYABLES_SUMMARY') {
      const data = await this.reportsService.getPayablesSummaryReport(tenantId, companyId, fromDate, toDate);
      const headers = ['#', 'Vendor / Creditor Name', 'Primary Group', 'PAN', 'GSTIN', 'Opening Balance (₹)', 'Debit Paid (₹)', 'Credit Bills (₹)', 'Closing Balance (₹)', 'Net Due (₹)'];
      const rows = data.rows.map((r, i) => [
        i + 1,
        r.ledgerName,
        r.primaryGroup,
        r.pan || 'N/A',
        r.gstin || 'Unregistered',
        r.openingBalance,
        r.debitAmount,
        r.creditAmount,
        r.closingBalance,
        r.netPayable,
      ]);
      const totals = ['', 'TOTALS', '', '', '', '', '', '', '', data.totalPayable];
      if (isExcel) {
        const buffer = await this.exportService.exportGenericReportExcel('Vendor Payables Summary Report', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Payables_Summary_${Date.now()}.xlsx"`);
        return res.send(buffer);
      } else {
        const html = this.exportService.generateBrandedReportHtml('Vendor Payables Summary Report', `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    // 9. Vendor Payables Ageing
    if (rKeyUpper === 'PAYABLES_AGEING') {
      const data = await this.reportsService.getPayablesAgeingReport(tenantId, companyId, toDate);
      const headers = ['#', 'Vendor / Creditor Name', 'PAN', '0-30 Days (₹)', '31-60 Days (₹)', '61-90 Days (₹)', '>90 Days (₹)', 'Total Outstanding (₹)'];
      const rows = data.rows.map((r, i) => [
        i + 1,
        r.vendorName,
        r.pan || 'N/A',
        r.current_0_30,
        r.bracket_31_60,
        r.bracket_61_90,
        r.bracket_90_plus,
        r.totalOutstanding,
      ]);
      const totals = ['', 'TOTALS', '', '', '', '', '', data.totalOutstanding];
      if (isExcel) {
        const buffer = await this.exportService.exportGenericReportExcel('Vendor Payables Ageing Report', `As of ${toDate || 'today'}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Payables_Ageing_${Date.now()}.xlsx"`);
        return res.send(buffer);
      } else {
        const html = this.exportService.generateBrandedReportHtml('Vendor Payables Ageing Report', `As of ${toDate || 'today'}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    // 10. Cash & Bank Governance & Statutory Limits
    if (
      rKeyUpper.startsWith('CASH_') ||
      rKeyUpper.startsWith('BANK_') ||
      rKeyUpper.startsWith('INTER_')
    ) {
      const auditType = reportKey.toLowerCase().replace('_', '-');
      const data = await this.reportsService.getCashBankAuditReport(tenantId, companyId, auditType, fromDate, toDate);
      const isNegative = auditType.includes('negative');

      const headers = isNegative
        ? ['#', 'Date', 'Account Name', 'Voucher Type', 'Voucher Number', 'Particulars / Narration', 'Amount (₹)', 'Balance After (₹)', 'Audit Finding']
        : ['#', 'Date', 'Account Name', 'Voucher Type', 'Voucher Number', 'Particulars / Narration', 'Amount (₹)', 'Audit Finding'];

      const rows: (string | number)[][] = data.rows.map((r, i) => {
        if (isNegative) {
          return [
            i + 1,
            r.date,
            r.accountName,
            r.voucherType,
            r.voucherNumber,
            r.particulars,
            r.amount,
            r.balanceAfterTransaction !== undefined ? r.balanceAfterTransaction : 0,
            r.violationReason || (r.statutoryLimitExceeded ? 'EXCEEDED' : 'VERIFIED'),
          ];
        }
        return [
          i + 1,
          r.date,
          r.accountName,
          r.voucherType,
          r.voucherNumber,
          r.particulars,
          r.amount,
          r.violationReason || (r.statutoryLimitExceeded ? 'EXCEEDED' : 'VERIFIED'),
        ];
      });

      const totals: (string | number)[] = isNegative
        ? ['', 'TOTALS', '', '', '', '', data.totalAmount, '', '']
        : ['', 'TOTALS', '', '', '', '', data.totalAmount, ''];

      const cleanTitle = `${reportKey.replace(/_/g, ' ')} Statutory Audit Report`;
      if (isExcel) {
        const buffer = await this.exportService.exportGenericReportExcel(cleanTitle, `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${reportKey}_${Date.now()}.xlsx"`);
        return res.send(buffer);
      } else {
        const html = this.exportService.generateBrandedReportHtml(cleanTitle, `${data.fromDate} to ${data.toDate}`, branding, headers, rows, totals);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    // 11. Master Data Hygiene Reports
    if (rKeyUpper.startsWith('LEDGERS_')) {
      const hygieneType = reportKey.toLowerCase().replace('ledgers_', '').replace(/_/g, '-');
      const data = await this.reportsService.getLedgerHygieneReport(tenantId, companyId, hygieneType);
      const headers = ['#', 'Ledger / Account Name', 'Primary Group', 'Opening Balance (₹)', 'Closing Balance (₹)', 'Issue Type', 'Audit Finding'];
      const rows: (string | number)[][] = data.rows.map((r, i) => [
        i + 1,
        r.ledgerName,
        r.groupName,
        r.openingBalance,
        r.closingBalance,
        r.issueType,
        r.description,
      ]);
      const cleanTitle = `${data.hygieneType.replace(/-/g, ' ').toUpperCase()} Hygiene Audit Report`;
      if (isExcel) {
        const buffer = await this.exportService.exportGenericReportExcel(cleanTitle, 'Current Financial Year', branding, headers, rows);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${reportKey}_${Date.now()}.xlsx"`);
        return res.send(buffer);
      } else {
        const html = this.exportService.generateBrandedReportHtml(cleanTitle, 'Current Financial Year', branding, headers, rows);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    throw new NotFoundException(`Report ${reportKey} export is not supported`);
  }

  // --- Sharing & Collaboration ---

  @Post('companies/:companyId/reports/:reportKey/share')
  async shareReport(
    @Param('companyId') companyId: string,
    @Param('reportKey') reportKey: string,
    @Body() body: ReportShareRequestDto,
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    const cat = ReportsService.MASTER_REPORTS_CATALOG.find((c) => c.reportKey === reportKey);
    const title = (body as any).reportTitle || cat?.title || reportKey;
    let host = process.env.APP_URL || 'http://localhost:3000';
    try {
      const originHeader = req.headers['origin'] || req.headers['referer'];
      if (originHeader) {
        host = new URL(originHeader).origin;
      }
    } catch {
      // fallback
    }
    return await this.shareService.createReportShare(
      tenantId,
      companyId,
      userId,
      {
        ...body,
        reportKey,
        reportTitle: title,
      },
      host,
    );
  }

  @Get('reports/shared/:token')
  async getSharedReport(@Param('token') token: string) {
    const share = await this.shareService.resolveSharedReport(token);
    return {
      success: true,
      reportKey: share.reportKey,
      reportTitle: share.reportTitle,
      format: share.format,
      filters: share.filters,
      expiresAt: share.expiresAt,
      downloadCount: share.downloadCount,
    };
  }
}
