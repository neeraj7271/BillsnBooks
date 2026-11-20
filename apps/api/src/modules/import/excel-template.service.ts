import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { GST_STATUTORY_UOM_LIST } from '@platform/shared-types';

export type TemplateType =
  | 'sales-invoices'
  | 'purchase-bills'
  | 'bank-statement'
  | 'parties-master'
  | 'items-master';

@Injectable()
export class ExcelTemplateService {
  /**
   * Generates a pre-formatted Excel template workbook based on template type
   */
  public async generateTemplate(type: TemplateType): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Antigravity Accounting Platform';
    workbook.created = new Date();

    switch (type) {
      case 'sales-invoices':
        this.buildSalesInvoiceTemplate(workbook);
        break;
      case 'purchase-bills':
        this.buildPurchaseBillsTemplate(workbook);
        break;
      case 'bank-statement':
        this.buildBankStatementTemplate(workbook);
        break;
      case 'parties-master':
        this.buildPartiesMasterTemplate(workbook);
        break;
      case 'items-master':
        this.buildItemsMasterTemplate(workbook);
        break;
      default:
        throw new BadRequestException(`Unknown template type: ${type}`);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * 1. Sales Invoices Template (with full GST, Line Items, and Statutory Checks)
   */
  private buildSalesInvoiceTemplate(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Sales Invoices');
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.columns = [
      { header: 'Invoice No*', key: 'invoiceNo', width: 16 },
      { header: 'Invoice Date* (DD/MM/YYYY)', key: 'invoiceDate', width: 22 },
      { header: 'Customer Name*', key: 'customerName', width: 28 },
      { header: 'Customer GSTIN', key: 'customerGstin', width: 18 },
      { header: 'Place of Supply* (State Code)', key: 'pos', width: 24 },
      { header: 'Item Name*', key: 'itemName', width: 25 },
      { header: 'HSN / SAC Code', key: 'hsn', width: 16 },
      { header: 'Quantity*', key: 'quantity', width: 12 },
      { header: 'Unit (UQC)*', key: 'uqc', width: 14 },
      { header: 'Unit Price / Rate*', key: 'rate', width: 16 },
      { header: 'Discount Amount', key: 'discount', width: 16 },
      { header: 'Tax Rate %*', key: 'taxRate', width: 14 },
      { header: 'Reverse Charge (Y/N)', key: 'rcm', width: 20 },
    ];

    this.styleHeaderRow(sheet);

    // Sample data rows
    const sampleRows = [
      {
        invoiceNo: 'INV-2026-001',
        invoiceDate: '01/11/2026',
        customerName: 'Tata Consultancy Services Ltd',
        customerGstin: '27AAACT2727Q1ZW',
        pos: '27',
        itemName: 'Cloud Software License',
        hsn: '998311',
        quantity: 10,
        uqc: 'NOS',
        rate: 5000,
        discount: 0,
        taxRate: 18,
        rcm: 'N',
      },
      {
        invoiceNo: 'INV-2026-002',
        invoiceDate: '02/11/2026',
        customerName: 'Infosys Limited',
        customerGstin: '29AAACI4567M1Z3',
        pos: '29',
        itemName: 'Consulting Hours',
        hsn: '998313',
        quantity: 40,
        uqc: 'HRS',
        rate: 2500,
        discount: 2000,
        taxRate: 18,
        rcm: 'N',
      },
    ];

    sampleRows.forEach((r) => sheet.addRow(r));
    this.styleDataRows(sheet, 2, 3);

    // Add Instructions Sheet
    const infoSheet = workbook.addWorksheet('Instructions & Validations');
    infoSheet.columns = [
      { header: 'Field Name', key: 'field', width: 24 },
      { header: 'Mandatory', key: 'mandatory', width: 14 },
      { header: 'Rules & Allowed Values', key: 'rules', width: 60 },
    ];
    this.styleHeaderRow(infoSheet);

    const instructions = [
      { field: 'Invoice No*', mandatory: 'YES', rules: 'Unique invoice identifier. Multi-line items can share the same Invoice No.' },
      { field: 'Invoice Date*', mandatory: 'YES', rules: 'Date in DD/MM/YYYY or YYYY-MM-DD format.' },
      { field: 'Customer Name*', mandatory: 'YES', rules: 'Customer name. If new, it will be automatically created in the Pre-Flight step.' },
      { field: 'Customer GSTIN', mandatory: 'NO', rules: '15-character statutory GSTIN with valid Mod-36 checksum (Mandatory for B2B).' },
      { field: 'Place of Supply*', mandatory: 'YES', rules: '2-digit Indian State Code (e.g. 27 for Maharashtra, 29 for Karnataka).' },
      { field: 'Item Name*', mandatory: 'YES', rules: 'Product or Service name. Auto-created if not found in Item Master.' },
      { field: 'HSN / SAC Code', mandatory: 'RECOMMENDED', rules: '4, 6 or 8 digits for goods, 6 digits starting with 99 for services.' },
      { field: 'Unit (UQC)*', mandatory: 'YES', rules: 'Valid GST UQC e.g. NOS, PCS, BOX, KGS, MTR, HRS, PAC, SET.' },
      { field: 'Tax Rate %*', mandatory: 'YES', rules: 'Valid GST Schedule rate: 0, 0.1, 0.25, 1.5, 3, 5, 12, 18, 28.' },
    ];
    instructions.forEach((i) => infoSheet.addRow(i));
    this.styleDataRows(infoSheet, 2, instructions.length + 1);
  }

  /**
   * 2. Purchase Bills Template
   */
  private buildPurchaseBillsTemplate(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Purchase Bills');
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.columns = [
      { header: 'Bill / Inv No*', key: 'billNo', width: 18 },
      { header: 'Bill Date* (DD/MM/YYYY)', key: 'billDate', width: 22 },
      { header: 'Vendor / Supplier Name*', key: 'vendorName', width: 28 },
      { header: 'Vendor GSTIN', key: 'vendorGstin', width: 18 },
      { header: 'Place of Supply* (State Code)', key: 'pos', width: 24 },
      { header: 'Item / Expense Name*', key: 'itemName', width: 25 },
      { header: 'HSN / SAC Code', key: 'hsn', width: 16 },
      { header: 'Quantity*', key: 'quantity', width: 12 },
      { header: 'Unit (UQC)*', key: 'uqc', width: 14 },
      { header: 'Rate / Price*', key: 'rate', width: 16 },
      { header: 'Discount Amount', key: 'discount', width: 16 },
      { header: 'Tax Rate %*', key: 'taxRate', width: 14 },
      { header: 'Reverse Charge (Y/N)', key: 'rcm', width: 20 },
    ];

    this.styleHeaderRow(sheet);

    const sampleRows = [
      {
        billNo: 'VEN-9841',
        billDate: '05/11/2026',
        vendorName: 'Dell India Enterprise Pvt Ltd',
        vendorGstin: '29AABCD1234E1Z1',
        pos: '27',
        itemName: 'Dell PowerEdge R750 Server',
        hsn: '8471',
        quantity: 2,
        uqc: 'NOS',
        rate: 220000,
        discount: 10000,
        taxRate: 18,
        rcm: 'N',
      },
    ];

    sampleRows.forEach((r) => sheet.addRow(r));
    this.styleDataRows(sheet, 2, 2);
  }

  /**
   * 3. Bank Statement Standard Template
   */
  private buildBankStatementTemplate(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Bank Statement');
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.columns = [
      { header: 'Date* (DD/MM/YYYY)', key: 'date', width: 20 },
      { header: 'Narration / Description*', key: 'narration', width: 45 },
      { header: 'Cheque / Ref No', key: 'refNo', width: 22 },
      { header: 'Withdrawal (Debit)', key: 'debit', width: 20 },
      { header: 'Deposit (Credit)', key: 'credit', width: 20 },
      { header: 'Closing Balance*', key: 'balance', width: 20 },
    ];

    this.styleHeaderRow(sheet);

    const sampleRows = [
      {
        date: '01/11/2026',
        narration: 'NEFT/N11026002931/TCS LTD PAYMENT',
        refNo: 'N11026002931',
        debit: 0,
        credit: 59000,
        balance: 259000,
      },
      {
        date: '03/11/2026',
        narration: 'UPI/631294829102/OFFICE EXPENSES',
        refNo: '631294829102',
        debit: 4500,
        credit: 0,
        balance: 254500,
      },
    ];

    sampleRows.forEach((r) => sheet.addRow(r));
    this.styleDataRows(sheet, 2, 3);
  }

  /**
   * 4. Parties Master Template
   */
  private buildPartiesMasterTemplate(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Parties Master');
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.columns = [
      { header: 'Party Name*', key: 'name', width: 28 },
      { header: 'Party Type* (CUSTOMER/VENDOR/BOTH)', key: 'partyType', width: 30 },
      { header: 'GSTIN', key: 'gstin', width: 18 },
      { header: 'PAN', key: 'pan', width: 16 },
      { header: 'State Code* (e.g. 27)', key: 'stateCode', width: 22 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Address Line 1', key: 'address1', width: 30 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'Pincode', key: 'pincode', width: 14 },
    ];

    this.styleHeaderRow(sheet);

    sheet.addRow({
      name: 'Adani Logistics Limited',
      partyType: 'CUSTOMER',
      gstin: '24AAACA0000A1Z5',
      pan: 'AAACA0000A',
      stateCode: '24',
      email: 'billing@adanilogistics.com',
      phone: '9876543210',
      address1: 'Adani Corporate House, Shantigram',
      city: 'Ahmedabad',
      pincode: '382421',
    });
    this.styleDataRows(sheet, 2, 2);
  }

  /**
   * 5. Items Master Template
   */
  private buildItemsMasterTemplate(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Items Master');
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.columns = [
      { header: 'Item Name*', key: 'name', width: 28 },
      { header: 'Item Type* (GOODS/SERVICE)', key: 'itemType', width: 24 },
      { header: 'HSN / SAC Code', key: 'hsn', width: 18 },
      { header: 'Unit (UQC)*', key: 'uqc', width: 16 },
      { header: 'Default Tax Rate %*', key: 'taxRate', width: 20 },
      { header: 'Default Sales Price', key: 'salesPrice', width: 20 },
      { header: 'Default Purchase Price', key: 'purchasePrice', width: 20 },
    ];

    this.styleHeaderRow(sheet);

    sheet.addRow({
      name: 'Industrial Valve 50mm',
      itemType: 'GOODS',
      hsn: '8481',
      uqc: 'NOS',
      taxRate: 18,
      salesPrice: 4200,
      purchasePrice: 3100,
    });
    sheet.addRow({
      name: 'Maintenance Support Retainer',
      itemType: 'SERVICE',
      hsn: '9987',
      uqc: 'MONTH',
      taxRate: 18,
      salesPrice: 25000,
      purchasePrice: 0,
    });
    this.styleDataRows(sheet, 2, 3);
  }

  // --- Styling Utilities ---
  private styleHeaderRow(sheet: ExcelJS.Worksheet): void {
    const headerRow = sheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }, // Slate 800
      };
      cell.font = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 10,
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      };
    });
  }

  private styleDataRows(sheet: ExcelJS.Worksheet, startRow: number, endRow: number): void {
    for (let r = startRow; r <= endRow; r++) {
      const row = sheet.getRow(r);
      row.height = 20;
      row.eachCell((cell) => {
        cell.font = {
          name: 'Segoe UI',
          size: 10,
          italic: true,
          color: { argb: 'FF475569' }, // Slate 600
        };
        cell.alignment = { vertical: 'middle' };
      });
    }
  }
}
