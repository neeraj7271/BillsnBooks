import { Injectable, BadRequestException, Optional } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { DataSource } from 'typeorm';
import { BranchOrmEntity } from '../../infrastructure/persistence/entities/branch.orm-entity';

export type TemplateType =
  | 'sales-invoices'
  | 'purchase-bills'
  | 'bank-statement'
  | 'parties-master'
  | 'items-master';

const GSTIN_CHECKSUM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Computes a valid 15-character GSTIN with Mod-36 checksum matching @platform/gst-rules.
 */
function makeValidGstin(stateCode: string, pan: string, entity = '1'): string {
  const base14 = `${stateCode}${pan}${entity}Z`.toUpperCase();
  let factor = 1;
  let sum = 0;
  const len = GSTIN_CHECKSUM_CHARS.length;
  for (let i = 0; i < 14; i++) {
    const codePoint = GSTIN_CHECKSUM_CHARS.indexOf(base14[i]!);
    let digit = codePoint * factor;
    factor = factor === 2 ? 1 : 2;
    digit = Math.floor(digit / len) + (digit % len);
    sum += digit;
  }
  const remainder = sum % len;
  const checkIdx = (len - remainder) % len;
  return `${base14}${GSTIN_CHECKSUM_CHARS[checkIdx]}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class ExcelTemplateService {
  constructor(@Optional() private readonly dataSource?: DataSource) {}

  private async resolveCompanyState(companyId?: string): Promise<string> {
    if (!companyId || !this.dataSource) return '07';
    try {
      const branch = await this.dataSource.getRepository(BranchOrmEntity).findOne({
        where: { companyId },
        select: ['gstin'],
      });
      if (branch?.gstin && branch.gstin.length >= 2) {
        return branch.gstin.substring(0, 2);
      }
    } catch {
      // fallback
    }
    return '07';
  }

  /**
   * Generates a pre-formatted Excel template workbook based on template type.
   */
  public async generateTemplate(type: TemplateType, companyId?: string): Promise<Buffer> {
    const companyState = await this.resolveCompanyState(companyId);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Antigravity Accounting Platform';
    workbook.created = new Date();
    workbook.subject = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    switch (type) {
      case 'sales-invoices':
        this.buildSalesInvoiceTemplate(workbook, companyState);
        break;
      case 'purchase-bills':
        this.buildPurchaseBillsTemplate(workbook, companyState);
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
   * 1. Sales Invoices Template (24 realistic B2B + B2C rows across intra/inter-state & all GST slabs)
   */
  private buildSalesInvoiceTemplate(workbook: ExcelJS.Workbook, companyState: string): void {
    const sheet = workbook.addWorksheet('Sales Invoices');
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.columns = [
      { header: 'Invoice No*', key: 'invoiceNo', width: 16 },
      { header: 'Invoice Date* (DD/MM/YYYY)', key: 'invoiceDate', width: 22 },
      { header: 'Customer Name*', key: 'customerName', width: 30 },
      { header: 'Customer GSTIN', key: 'customerGstin', width: 19 },
      { header: 'Place of Supply* (State Code)', key: 'pos', width: 24 },
      { header: 'Item Name*', key: 'itemName', width: 26 },
      { header: 'HSN / SAC Code', key: 'hsn', width: 16 },
      { header: 'Quantity*', key: 'quantity', width: 12 },
      { header: 'Unit (UQC)*', key: 'uqc', width: 12 },
      { header: 'Unit Price / Rate*', key: 'rate', width: 16 },
      { header: 'Discount Amount', key: 'discount', width: 15 },
      { header: 'Taxable Amount*', key: 'taxableAmount', width: 16 },
      { header: 'CGST Amount', key: 'cgstAmount', width: 14 },
      { header: 'SGST Amount', key: 'sgstAmount', width: 14 },
      { header: 'IGST Amount', key: 'igstAmount', width: 14 },
      { header: 'Total Amount*', key: 'totalAmount', width: 16 },
      { header: 'Tax Rate %*', key: 'taxRate', width: 13 },
      { header: 'Reverse Charge (Y/N)', key: 'rcm', width: 18 },
    ];

    this.styleHeaderRow(sheet);

    const specs: Array<{
      no: string;
      date: string;
      name: string;
      gstin: string;
      pos: string;
      item: string;
      hsn: string;
      qty: number;
      uqc: string;
      rate: number;
      disc: number;
      taxRate: number;
    }> = [
      { no: 'INV-2026-001', date: '04/04/2026', name: 'Tata Consultancy Services Ltd', gstin: makeValidGstin('27', 'AAACT2727Q'), pos: '27', item: 'Enterprise Cloud License', hsn: '998311', qty: 10, uqc: 'NOS', rate: 12000, disc: 0, taxRate: 18 },
      { no: 'INV-2026-002', date: '11/04/2026', name: 'Infosys Limited', gstin: makeValidGstin('29', 'AAACI4567M'), pos: '29', item: 'SAP Advisory Consulting', hsn: '998313', qty: 40, uqc: 'HRS', rate: 2500, disc: 2000, taxRate: 18 },
      { no: 'INV-2026-003', date: '19/04/2026', name: 'Mahindra Logistics Ltd', gstin: makeValidGstin('27', 'AAACM3025E'), pos: '27', item: 'Fleet Telemetry Hardware', hsn: '85176290', qty: 25, uqc: 'NOS', rate: 4800, disc: 5000, taxRate: 18 },
      { no: 'INV-2026-004', date: '28/04/2026', name: 'Adani Wilmar Limited', gstin: makeValidGstin('24', 'AAACA6543L'), pos: '24', item: 'Printed Packaging Cartons', hsn: '4819', qty: 500, uqc: 'BOX', rate: 45, disc: 0, taxRate: 12 },
      { no: 'INV-2026-005', date: '06/05/2026', name: 'Zoho Corporation Pvt Ltd', gstin: makeValidGstin('33', 'AAACZ1234K'), pos: '33', item: 'Annual Security Audit', hsn: '998314', qty: 1, uqc: 'NOS', rate: 85000, disc: 0, taxRate: 18 },
      { no: 'INV-2026-006', date: '15/05/2026', name: 'Bajaj Auto Ancillaries', gstin: makeValidGstin('27', 'AABCB9087P'), pos: '27', item: 'CNC Precision Shafts', hsn: '8483', qty: 100, uqc: 'PCS', rate: 650, disc: 1000, taxRate: 18 },
      { no: 'INV-2026-007', date: '24/05/2026', name: 'Haldiram Snacks Pvt Ltd', gstin: makeValidGstin('07', 'AAACH4321B'), pos: '07', item: 'Refined Packaging Film', hsn: '3920', qty: 200, uqc: 'KGS', rate: 180, disc: 0, taxRate: 18 },
      { no: 'INV-2026-008', date: '03/06/2026', name: 'Apollo Hospitals Enterprise', gstin: makeValidGstin('36', 'AAACA7788R'), pos: '36', item: 'Diagnostic Consumables', hsn: '3004', qty: 120, uqc: 'BOX', rate: 420, disc: 400, taxRate: 5 },
      { no: 'INV-2026-009', date: '12/06/2026', name: 'Walk-in Retail Customer (B2C)', gstin: '', pos: '27', item: 'Printed Accounting Books', hsn: '4901', qty: 20, uqc: 'NOS', rate: 350, disc: 0, taxRate: 0 },
      { no: 'INV-2026-010', date: '21/06/2026', name: 'Wipro Enterprises Pvt Ltd', gstin: makeValidGstin('29', 'AAACW5566N'), pos: '29', item: 'LED Industrial Luminaires', hsn: '9405', qty: 60, uqc: 'NOS', rate: 1850, disc: 1000, taxRate: 12 },
      { no: 'INV-2026-011', date: '05/07/2026', name: 'Godrej Consumer Products', gstin: makeValidGstin('27', 'AAACG1122D'), pos: '27', item: 'Commercial Air Purifiers', hsn: '8421', qty: 8, uqc: 'NOS', rate: 28000, disc: 4000, taxRate: 28 },
      { no: 'INV-2026-012', date: '16/07/2026', name: 'ITC Infotech India Ltd', gstin: makeValidGstin('19', 'AAACI8899F'), pos: '19', item: 'Managed Cloud Support', hsn: '998315', qty: 3, uqc: 'NOS', rate: 45000, disc: 0, taxRate: 18 },
      { no: 'INV-2026-013', date: '27/07/2026', name: 'Pidilite Industries Ltd', gstin: makeValidGstin('27', 'AAACP3344H'), pos: '27', item: 'Industrial Solvent Drums', hsn: '3814', qty: 15, uqc: 'NOS', rate: 5200, disc: 0, taxRate: 18 },
      { no: 'INV-2026-014', date: '08/08/2026', name: 'FreshHarvest Agro Traders', gstin: makeValidGstin('09', 'AABCF6677J'), pos: '09', item: 'Organic Basmati Bulk', hsn: '1006', qty: 50, uqc: 'KGS', rate: 160, disc: 0, taxRate: 0 },
      { no: 'INV-2026-015', date: '19/08/2026', name: 'Havells India Limited', gstin: makeValidGstin('07', 'AAACH9900K'), pos: '07', item: 'MCB Distribution Panels', hsn: '8537', qty: 12, uqc: 'SET', rate: 14500, disc: 2000, taxRate: 18 },
      { no: 'INV-2026-016', date: '29/08/2026', name: 'Mehta Retail Mart (B2C)', gstin: '', pos: '27', item: 'Thermal POS Paper Rolls', hsn: '4811', qty: 100, uqc: 'PAC', rate: 95, disc: 0, taxRate: 12 },
      { no: 'INV-2026-017', date: '07/09/2026', name: 'Larsen & Toubro Ltd', gstin: makeValidGstin('27', 'AAACL0140P'), pos: '27', item: 'Structural Steel Brackets', hsn: '7308', qty: 80, uqc: 'NOS', rate: 1250, disc: 0, taxRate: 18 },
      { no: 'INV-2026-018', date: '18/09/2026', name: 'Titan Company Limited', gstin: makeValidGstin('33', 'AAACT5131A'), pos: '33', item: 'Display Showcase Glass', hsn: '7007', qty: 14, uqc: 'NOS', rate: 8200, disc: 800, taxRate: 28 },
      { no: 'INV-2026-019', date: '28/09/2026', name: 'Cipla Pharmaceuticals Ltd', gstin: makeValidGstin('27', 'AAACC1456G'), pos: '27', item: 'Cold Chain Sensors', hsn: '9025', qty: 30, uqc: 'NOS', rate: 3100, disc: 0, taxRate: 18 },
      { no: 'INV-2026-020', date: '09/10/2026', name: 'Blue Dart Express Ltd', gstin: makeValidGstin('27', 'AAACB2233C'), pos: '27', item: 'Barcode Label Printers', hsn: '8443', qty: 6, uqc: 'NOS', rate: 18500, disc: 1000, taxRate: 18 },
      { no: 'INV-2026-021', date: '19/10/2026', name: 'Reliance Retail Ventures', gstin: makeValidGstin('24', 'AAACR5055K'), pos: '24', item: 'RFID Inventory Tags', hsn: '8523', qty: 1000, uqc: 'PCS', rate: 28, disc: 0, taxRate: 18 },
      { no: 'INV-2026-022', date: '29/10/2026', name: 'NewHorizon Unmapped Corp', gstin: makeValidGstin('29', 'AABCN4455L'), pos: '29', item: 'Custom ERP Integration', hsn: '998314', qty: 20, uqc: 'HRS', rate: 3500, disc: 0, taxRate: 18 },
      { no: 'INV-2026-023', date: '05/11/2026', name: 'Marico Consumer Care', gstin: makeValidGstin('27', 'AAACM7890M'), pos: '27', item: 'HDPE Bottle Caps', hsn: '3923', qty: 4000, uqc: 'PCS', rate: 12, disc: 500, taxRate: 18 },
      { no: 'INV-2026-024', date: '14/11/2026', name: 'Surya Roshni Lighting', gstin: makeValidGstin('07', 'AAACS2211Q'), pos: '07', item: 'Solar Street Light Poles', hsn: '9405', qty: 10, uqc: 'NOS', rate: 16500, disc: 0, taxRate: 5 },
    ];

    specs.forEach((s) => {
      const taxable = round2(s.qty * s.rate - s.disc);
      const taxTotal = round2((taxable * s.taxRate) / 100);
      const isInter = s.pos !== companyState;
      const igst = isInter ? taxTotal : 0;
      const cgst = isInter ? 0 : round2(taxTotal / 2);
      const sgst = isInter ? 0 : round2(taxTotal - cgst);
      const total = round2(taxable + cgst + sgst + igst);

      sheet.addRow({
        invoiceNo: s.no,
        invoiceDate: s.date,
        customerName: s.name,
        customerGstin: s.gstin,
        pos: s.pos,
        itemName: s.item,
        hsn: s.hsn,
        quantity: s.qty,
        uqc: s.uqc,
        rate: s.rate,
        discount: s.disc,
        taxableAmount: taxable,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: total,
        taxRate: s.taxRate,
        rcm: 'N',
      });
    });

    this.styleDataRows(sheet, 2, specs.length + 1);

    const infoSheet = workbook.addWorksheet('Instructions & Validations');
    infoSheet.columns = [
      { header: 'Field Name', key: 'field', width: 26 },
      { header: 'Mandatory', key: 'mandatory', width: 14 },
      { header: 'Rules & Allowed Values', key: 'rules', width: 64 },
    ];
    this.styleHeaderRow(infoSheet);

    const instructions = [
      { field: 'Invoice No*', mandatory: 'YES', rules: 'Unique invoice identifier. Multi-line items can share the same Invoice No.' },
      { field: 'Invoice Date*', mandatory: 'YES', rules: 'Date in DD/MM/YYYY or YYYY-MM-DD format.' },
      { field: 'Customer Name*', mandatory: 'YES', rules: 'Customer name. Unmatched masters are resolved in Step 3 Pre-Flight.' },
      { field: 'Customer GSTIN', mandatory: 'NO', rules: '15-char GSTIN with valid Mod-36 checksum (blank allowed for B2C).' },
      { field: 'Place of Supply*', mandatory: 'YES', rules: '2-digit Indian State Code (e.g. 27 Maharashtra, 29 Karnataka).' },
      { field: 'Taxable Amount*', mandatory: 'YES', rules: 'Qty × Rate - Discount before GST.' },
      { field: 'CGST / SGST / IGST', mandatory: 'YES', rules: 'Intra-state uses CGST+SGST; inter-state uses IGST.' },
      { field: 'Total Amount*', mandatory: 'YES', rules: 'Taxable Amount + CGST + SGST + IGST.' },
    ];
    instructions.forEach((i) => infoSheet.addRow(i));
    this.styleDataRows(infoSheet, 2, instructions.length + 1);
  }

  /**
   * 2. Purchase Bills Template (22 realistic vendor bills including RCM & ITC mix)
   */
  private buildPurchaseBillsTemplate(workbook: ExcelJS.Workbook, companyState: string): void {
    const sheet = workbook.addWorksheet('Purchase Bills');
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.columns = [
      { header: 'Bill / Inv No*', key: 'billNo', width: 18 },
      { header: 'Bill Date* (DD/MM/YYYY)', key: 'billDate', width: 22 },
      { header: 'Vendor / Supplier Name*', key: 'vendorName', width: 30 },
      { header: 'Vendor GSTIN', key: 'vendorGstin', width: 19 },
      { header: 'Place of Supply* (State Code)', key: 'pos', width: 24 },
      { header: 'Item / Expense Name*', key: 'itemName', width: 26 },
      { header: 'HSN / SAC Code', key: 'hsn', width: 16 },
      { header: 'Quantity*', key: 'quantity', width: 12 },
      { header: 'Unit (UQC)*', key: 'uqc', width: 12 },
      { header: 'Rate / Price*', key: 'rate', width: 15 },
      { header: 'Discount Amount', key: 'discount', width: 15 },
      { header: 'Taxable Amount*', key: 'taxableAmount', width: 16 },
      { header: 'CGST Amount', key: 'cgstAmount', width: 14 },
      { header: 'SGST Amount', key: 'sgstAmount', width: 14 },
      { header: 'IGST Amount', key: 'igstAmount', width: 14 },
      { header: 'Total Amount*', key: 'totalAmount', width: 16 },
      { header: 'Tax Rate %*', key: 'taxRate', width: 13 },
      { header: 'Reverse Charge (Y/N)', key: 'rcm', width: 18 },
    ];

    this.styleHeaderRow(sheet);

    const specs: Array<{
      no: string;
      date: string;
      name: string;
      gstin: string;
      pos: string;
      item: string;
      hsn: string;
      qty: number;
      uqc: string;
      rate: number;
      disc: number;
      taxRate: number;
      rcm: 'Y' | 'N';
    }> = [
      { no: 'VEN-9841', date: '05/04/2026', name: 'Dell India Enterprise Pvt Ltd', gstin: makeValidGstin('29', 'AABCD1234E'), pos: '29', item: 'Dell PowerEdge Server', hsn: '8471', qty: 1, uqc: 'NOS', rate: 210000, disc: 5000, taxRate: 18, rcm: 'N' },
      { no: 'AWS-2026-04', date: '10/04/2026', name: 'Amazon Web Services India', gstin: makeValidGstin('27', 'AAACA9981C'), pos: '27', item: 'Cloud Hosting & S3', hsn: '998315', qty: 1, uqc: 'NOS', rate: 48500, disc: 0, taxRate: 18, rcm: 'N' },
      { no: 'GTA-4410', date: '18/04/2026', name: 'SafeExpress Roadways (GTA)', gstin: '', pos: '27', item: 'Inbound Freight GTA (RCM)', hsn: '996511', qty: 1, uqc: 'NOS', rate: 18000, disc: 0, taxRate: 5, rcm: 'Y' },
      { no: 'RENT-0526', date: '01/05/2026', name: 'Nariman Commercial Spaces', gstin: makeValidGstin('27', 'AABCN7712D'), pos: '27', item: 'Mumbai Office Lease', hsn: '997212', qty: 1, uqc: 'NOS', rate: 95000, disc: 0, taxRate: 18, rcm: 'N' },
      { no: 'STN-1122', date: '09/05/2026', name: 'Navneet Stationery Mart', gstin: makeValidGstin('27', 'AAACN3214F'), pos: '27', item: 'A4 Copier Paper Boxes', hsn: '4802', qty: 40, uqc: 'BOX', rate: 320, disc: 0, taxRate: 12, rcm: 'N' },
      { no: 'LEG-0088', date: '17/05/2026', name: 'Deshmukh & Associates Advocates', gstin: '', pos: '27', item: 'Legal Retainer Fee (RCM)', hsn: '998211', qty: 1, uqc: 'NOS', rate: 35000, disc: 0, taxRate: 18, rcm: 'Y' },
      { no: 'TEL-0626', date: '02/06/2026', name: 'Bharti Airtel Limited', gstin: makeValidGstin('07', 'AAACB2894G'), pos: '07', item: 'Leased Fiber Internet', hsn: '998422', qty: 1, uqc: 'NOS', rate: 14999, disc: 0, taxRate: 18, rcm: 'N' },
      { no: 'HP-7721', date: '14/06/2026', name: 'HP India Sales Pvt Ltd', gstin: makeValidGstin('29', 'AAACH4455K'), pos: '29', item: 'LaserJet Pro Printers', hsn: '8443', qty: 4, uqc: 'NOS', rate: 24000, disc: 2000, taxRate: 18, rcm: 'N' },
      { no: 'AC-3319', date: '25/06/2026', name: 'Voltas Commercial Cooling', gstin: makeValidGstin('27', 'AAACV1199L'), pos: '27', item: 'Inverter Split AC 2T', hsn: '8415', qty: 3, uqc: 'NOS', rate: 52000, disc: 3000, taxRate: 28, rcm: 'N' },
      { no: 'COURIER-07', date: '06/07/2026', name: 'DTDC Express Limited', gstin: makeValidGstin('29', 'AAACD7891M'), pos: '29', item: 'Document Courier Charges', hsn: '996812', qty: 50, uqc: 'NOS', rate: 180, disc: 0, taxRate: 18, rcm: 'N' },
      { no: 'PANT-891', date: '19/07/2026', name: 'Tata Consumer Beverages', gstin: makeValidGstin('27', 'AAACT7711N'), pos: '27', item: 'Office Tea & Coffee Supply', hsn: '0902', qty: 30, uqc: 'KGS', rate: 450, disc: 0, taxRate: 5, rcm: 'N' },
      { no: 'SEC-0826', date: '04/08/2026', name: 'SIS Security Services Ltd', gstin: makeValidGstin('27', 'AAACS8812P'), pos: '27', item: 'Facility Guarding Services', hsn: '998525', qty: 2, uqc: 'NOS', rate: 26000, disc: 0, taxRate: 18, rcm: 'N' },
      { no: 'ZOH-4490', date: '16/08/2026', name: 'Zoho Books Subscriptions', gstin: makeValidGstin('33', 'AAACZ1234K'), pos: '33', item: 'CRM Team Licenses', hsn: '998314', qty: 15, uqc: 'NOS', rate: 1800, disc: 0, taxRate: 18, rcm: 'N' },
      { no: 'FUR-2201', date: '27/08/2026', name: 'Godrej Interio Furniture', gstin: makeValidGstin('27', 'AAACG1122D'), pos: '27', item: 'Ergonomic Task Chairs', hsn: '9401', qty: 10, uqc: 'NOS', rate: 11500, disc: 5000, taxRate: 18, rcm: 'N' },
      { no: 'POW-0926', date: '08/09/2026', name: 'Adani Electricity Mumbai', gstin: makeValidGstin('27', 'AAACA6543L'), pos: '27', item: 'Electricity Utility (Exempt)', hsn: '2716', qty: 1, uqc: 'NOS', rate: 22400, disc: 0, taxRate: 0, rcm: 'N' },
      { no: 'PRN-5520', date: '20/09/2026', name: 'PrintKraft Packaging Solutions', gstin: makeValidGstin('24', 'AAACP9012R'), pos: '24', item: 'Corrugated Dispatch Boxes', hsn: '4819', qty: 300, uqc: 'BOX', rate: 55, disc: 0, taxRate: 12, rcm: 'N' },
      { no: 'MKT-1026', date: '05/10/2026', name: 'Razorpay Software Pvt Ltd', gstin: makeValidGstin('29', 'AAACR7788S'), pos: '29', item: 'Payment Gateway Charges', hsn: '997159', qty: 1, uqc: 'NOS', rate: 19500, disc: 0, taxRate: 18, rcm: 'N' },
      { no: 'CAB-6612', date: '16/10/2026', name: 'Meru Mobility Tech', gstin: makeValidGstin('27', 'AAACM4411T'), pos: '27', item: 'Client Visit Cab Rentals', hsn: '996412', qty: 12, uqc: 'NOS', rate: 1400, disc: 0, taxRate: 5, rcm: 'N' },
      { no: 'CLN-1126', date: '28/10/2026', name: 'KleanPro Housekeeping LLP', gstin: makeValidGstin('27', 'AABCK2299V'), pos: '27', item: 'Office Deep Cleaning', hsn: '998533', qty: 1, uqc: 'NOS', rate: 16000, disc: 0, taxRate: 18, rcm: 'N' },
      { no: 'UPS-7710', date: '04/11/2026', name: 'Schneider Electric India', gstin: makeValidGstin('29', 'AAACS5522W'), pos: '29', item: 'APC Online UPS 3kVA', hsn: '8504', qty: 2, uqc: 'NOS', rate: 34000, disc: 0, taxRate: 18, rcm: 'N' },
      { no: 'AUD-1180', date: '11/11/2026', name: 'Mehta & Shah Chartered Accountants', gstin: makeValidGstin('27', 'AABFM8821X'), pos: '27', item: 'Statutory Tax Audit Fee', hsn: '998221', qty: 1, uqc: 'NOS', rate: 75000, disc: 0, taxRate: 18, rcm: 'N' },
      { no: 'NET-1199', date: '18/11/2026', name: 'Cisco Systems India Pvt Ltd', gstin: makeValidGstin('29', 'AAACC9191Y'), pos: '29', item: 'Meraki Firewall Appliance', hsn: '8517', qty: 1, uqc: 'NOS', rate: 62000, disc: 2000, taxRate: 18, rcm: 'N' },
    ];

    specs.forEach((s) => {
      const taxable = round2(s.qty * s.rate - s.disc);
      const taxTotal = round2((taxable * s.taxRate) / 100);
      const isInter = s.pos !== companyState;
      const igst = isInter ? taxTotal : 0;
      const cgst = isInter ? 0 : round2(taxTotal / 2);
      const sgst = isInter ? 0 : round2(taxTotal - cgst);
      const total = round2(taxable + cgst + sgst + igst);

      sheet.addRow({
        billNo: s.no,
        billDate: s.date,
        vendorName: s.name,
        vendorGstin: s.gstin,
        pos: s.pos,
        itemName: s.item,
        hsn: s.hsn,
        quantity: s.qty,
        uqc: s.uqc,
        rate: s.rate,
        discount: s.disc,
        taxableAmount: taxable,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: total,
        taxRate: s.taxRate,
        rcm: s.rcm,
      });
    });

    this.styleDataRows(sheet, 2, specs.length + 1);
  }

  /**
   * 3. Bank Statement Template (30 realistic NEFT/UPI/RTGS/Cheque entries with running balance)
   */
  private buildBankStatementTemplate(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Bank Statement');
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.columns = [
      { header: 'Date* (DD/MM/YYYY)', key: 'date', width: 20 },
      { header: 'Narration / Description*', key: 'narration', width: 48 },
      { header: 'Cheque / Ref No', key: 'refNo', width: 22 },
      { header: 'Withdrawal (Debit)', key: 'debit', width: 20 },
      { header: 'Deposit (Credit)', key: 'credit', width: 20 },
      { header: 'Closing Balance*', key: 'balance', width: 20 },
    ];

    this.styleHeaderRow(sheet);

    const txns: Array<{ date: string; narration: string; refNo: string; debit: number; credit: number }> = [
      { date: '01/10/2026', narration: 'NEFT/N1001/TATA CONSULTANCY SERVICES INV-001', refNo: 'NEFT26100101', debit: 0, credit: 141600 },
      { date: '02/10/2026', narration: 'UPI/6274910283/NARIMAN COMMERCIAL OFFICE RENT', refNo: 'UPI6274910283', debit: 112100, credit: 0 },
      { date: '04/10/2026', narration: 'RTGS/R261004/INFOSYS LTD INV-002 SETTLEMENT', refNo: 'RTGS26100499', debit: 0, credit: 115640 },
      { date: '05/10/2026', narration: 'ACH-DR/AMAZON WEB SERVICES CLOUD BILL', refNo: 'ACH26100511', debit: 57230, credit: 0 },
      { date: '07/10/2026', narration: 'CHQ/004512/TDS CHALLAN 281 DEPOSIT', refNo: 'CHQ004512', debit: 42500, credit: 0 },
      { date: '09/10/2026', narration: 'NEFT/N1009/MAHINDRA LOGISTICS PARTIAL PMT', refNo: 'NEFT26100902', debit: 0, credit: 135700 },
      { date: '11/10/2026', narration: 'UPI/6283910442/BHARTI AIRTEL FIBER LEASE', refNo: 'UPI6283910442', debit: 17699, credit: 0 },
      { date: '12/10/2026', narration: 'IMPS/6285119021/ADANI WILMAR INV-004', refNo: 'IMPS6285119021', debit: 0, credit: 25200 },
      { date: '14/10/2026', narration: 'UPI/6287001928/NAVNEET STATIONERY MART', refNo: 'UPI6287001928', debit: 14336, credit: 0 },
      { date: '16/10/2026', narration: 'NEFT/N1016/ZOHO CORP ANNUAL AUDIT PMT', refNo: 'NEFT26101644', debit: 0, credit: 100300 },
      { date: '18/10/2026', narration: 'CHQ/004513/SAFEEXPRESS FREIGHT GTA', refNo: 'CHQ004513', debit: 18000, credit: 0 },
      { date: '20/10/2026', narration: 'GSTPMT/CPIN2610209912/GSTR-3B LIABILITY', refNo: 'CPIN26102099', debit: 84200, credit: 0 },
      { date: '22/10/2026', narration: 'NEFT/N1022/BAJAJ AUTO ANCILLARIES', refNo: 'NEFT26102288', debit: 0, credit: 75520 },
      { date: '24/10/2026', narration: 'UPI/6294118832/DTDC EXPRESS COURIER', refNo: 'UPI6294118832', debit: 10620, credit: 0 },
      { date: '26/10/2026', narration: 'NEFT/N1026/HALDIRAM SNACKS INV-007', refNo: 'NEFT26102612', debit: 0, credit: 42480 },
      { date: '28/10/2026', narration: 'SAL/OCT2026/STAFF PAYROLL BATCH 01', refNo: 'SAL26102801', debit: 245000, credit: 0 },
      { date: '30/10/2026', narration: 'NEFT/N1030/WIPRO ENTERPRISES INV-010', refNo: 'NEFT26103055', debit: 0, credit: 123200 },
      { date: '31/10/2026', narration: 'BANK CHARGES / SMS & NEFT FEE OCT', refNo: 'CHG26103101', debit: 590, credit: 0 },
      { date: '02/11/2026', narration: 'NEFT/N1102/GODREJ CONSUMER PRODUCTS', refNo: 'NEFT26110218', debit: 0, credit: 281600 },
      { date: '04/11/2026', narration: 'UPI/6304112290/ADANI ELECTRICITY MUMBAI', refNo: 'UPI6304112290', debit: 22400, credit: 0 },
      { date: '06/11/2026', narration: 'RTGS/R261106/LARSEN & TOUBRO INV-017', refNo: 'RTGS26110633', debit: 0, credit: 118000 },
      { date: '08/11/2026', narration: 'CHQ/004514/SIS SECURITY SERVICES', refNo: 'CHQ004514', debit: 61360, credit: 0 },
      { date: '10/11/2026', narration: 'NEFT/N1110/PIDILITE INDUSTRIES INV-013', refNo: 'NEFT26111077', debit: 0, credit: 92040 },
      { date: '12/11/2026', narration: 'UPI/6312948291/MERU MOBILITY CAB HIRE', refNo: 'UPI6312948291', debit: 17640, credit: 0 },
      { date: '14/11/2026', narration: 'NEFT/N1114/TITAN COMPANY INV-018', refNo: 'NEFT26111421', debit: 0, credit: 145920 },
      { date: '16/11/2026', narration: 'ACH-DR/HP INDIA SALES PRINTERS', refNo: 'ACH26111604', debit: 110920, credit: 0 },
      { date: '18/11/2026', narration: 'IMPS/6318991023/CIPLA PHARMA INV-019', refNo: 'IMPS6318991023', debit: 0, credit: 109740 },
      { date: '20/11/2026', narration: 'GSTPMT/CPIN2611201144/GSTR-3B NOV', refNo: 'CPIN26112011', debit: 96500, credit: 0 },
      { date: '22/11/2026', narration: 'NEFT/N1122/RELIANCE RETAIL INV-021', refNo: 'NEFT26112266', debit: 0, credit: 33040 },
      { date: '25/11/2026', narration: 'NEFT/N1125/MEHTA & SHAH AUDIT FEE', refNo: 'NEFT26112589', debit: 88500, credit: 0 },
    ];

    let runningBalance = 500000;
    txns.forEach((t) => {
      runningBalance = round2(runningBalance + t.credit - t.debit);
      sheet.addRow({
        date: t.date,
        narration: t.narration,
        refNo: t.refNo,
        debit: t.debit,
        credit: t.credit,
        balance: runningBalance,
      });
    });

    this.styleDataRows(sheet, 2, txns.length + 1);
  }

  /**
   * 4. Parties Master Template (22 realistic customers/vendors with valid Mod-36 GSTINs)
   */
  private buildPartiesMasterTemplate(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Parties Master');
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.columns = [
      { header: 'Party Name*', key: 'name', width: 30 },
      { header: 'Party Type* (CUSTOMER/VENDOR/BOTH)', key: 'partyType', width: 30 },
      { header: 'GSTIN', key: 'gstin', width: 19 },
      { header: 'PAN', key: 'pan', width: 14 },
      { header: 'State Code* (e.g. 27)', key: 'stateCode', width: 20 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Address Line 1', key: 'address1', width: 32 },
      { header: 'City', key: 'city', width: 16 },
      { header: 'Pincode', key: 'pincode', width: 12 },
    ];

    this.styleHeaderRow(sheet);

    const parties: Array<[string, string, string, string, string, string, string, string, string]> = [
      ['Tata Consultancy Services Ltd', 'CUSTOMER', 'AAACT2727Q', '27', 'ap@tcs.com', '9820112233', 'TCS House, Fort', 'Mumbai', '400001'],
      ['Infosys Limited', 'CUSTOMER', 'AAACI4567M', '29', 'finance@infosys.com', '9845011223', 'Electronics City Phase 1', 'Bengaluru', '560100'],
      ['Mahindra Logistics Ltd', 'CUSTOMER', 'AAACM3025E', '27', 'billing@mahindralogistics.com', '9820445566', 'Arena Space, Jogeshwari', 'Mumbai', '400060'],
      ['Adani Wilmar Limited', 'BOTH', 'AAACA6543L', '24', 'accounts@adaniwilmar.in', '9825099887', 'Fortune House, Navrangpura', 'Ahmedabad', '380009'],
      ['Zoho Corporation Pvt Ltd', 'BOTH', 'AAACZ1234K', '33', 'billing@zohocorp.com', '9840033445', 'Estancia IT Park, Guduvanchery', 'Chennai', '603202'],
      ['Bajaj Auto Ancillaries', 'CUSTOMER', 'AABCB9087P', '27', 'ap@bajajanc.co.in', '9822011224', 'MIDC Chakan Industrial Area', 'Pune', '410501'],
      ['Haldiram Snacks Pvt Ltd', 'CUSTOMER', 'AAACH4321B', '07', 'finance@haldirams.com', '9811022334', 'Sector 62 Institutional Area', 'New Delhi', '110001'],
      ['Apollo Hospitals Enterprise', 'CUSTOMER', 'AAACA7788R', '36', 'procurement@apollohospitals.com', '9849044556', 'Jubilee Hills Road No 72', 'Hyderabad', '500033'],
      ['Wipro Enterprises Pvt Ltd', 'CUSTOMER', 'AAACW5566N', '29', 'vendor.pay@wipro.com', '9845122334', 'Sarjapur Road', 'Bengaluru', '560035'],
      ['Godrej Consumer Products', 'BOTH', 'AAACG1122D', '27', 'accounts@godrejcp.com', '9820556677', 'Pirojshanagar, Vikhroli', 'Mumbai', '400079'],
      ['ITC Infotech India Ltd', 'CUSTOMER', 'AAACI8899F', '19', 'billing@itcinfotech.com', '9830011225', 'Virginia House, Chowringhee', 'Kolkata', '700071'],
      ['Pidilite Industries Ltd', 'CUSTOMER', 'AAACP3344H', '27', 'finance@pidilite.com', '9820667788', 'Ramkrishna Mandir Rd, Andheri', 'Mumbai', '400059'],
      ['Havells India Limited', 'CUSTOMER', 'AAACH9900K', '07', 'ap@havells.com', '9811445566', 'QRG Towers, Okhla Phase 3', 'New Delhi', '110020'],
      ['Larsen & Toubro Ltd', 'CUSTOMER', 'AAACL0140P', '27', 'treasury@larsentoubro.com', '9820778899', 'L&T House, Ballard Estate', 'Mumbai', '400001'],
      ['Dell India Enterprise Pvt Ltd', 'VENDOR', 'AABCD1234E', '29', 'ar.india@dell.com', '9845233445', 'Divyashree Greens, Domlur', 'Bengaluru', '560071'],
      ['Amazon Web Services India', 'VENDOR', 'AAACA9981C', '27', 'aws-india-billing@amazon.com', '9820889900', 'BKC G-Block, Bandra East', 'Mumbai', '400051'],
      ['Bharti Airtel Limited', 'VENDOR', 'AAACB2894G', '07', 'enterprise.ar@airtel.com', '9810011223', 'Airtel Center, Nelson Mandela Rd', 'New Delhi', '110070'],
      ['HP India Sales Pvt Ltd', 'VENDOR', 'AAACH4455K', '29', 'billing@hp.com', '9845344556', '24 Salarpuria Arena, Hosur Rd', 'Bengaluru', '560030'],
      ['DTDC Express Limited', 'VENDOR', 'AAACD7891M', '29', 'corporate@dtdc.com', '9845455667', 'DTDC House, Victoria Road', 'Bengaluru', '560047'],
      ['SIS Security Services Ltd', 'VENDOR', 'AAACS8812P', '27', 'billing@sisindia.com', '9820990011', 'MIDC Central Rd, Andheri East', 'Mumbai', '400093'],
      ['Razorpay Software Pvt Ltd', 'VENDOR', 'AAACR7788S', '29', 'invoices@razorpay.com', '9845566778', 'SJR Cyber, Koramangala', 'Bengaluru', '560034'],
      ['Mehta & Shah Chartered Accountants', 'VENDOR', 'AABFM8821X', '27', 'office@mehtashahca.in', '9820123456', 'Maker Chambers V, Nariman Point', 'Mumbai', '400021'],
    ];

    parties.forEach(([name, partyType, pan, stateCode, email, phone, address1, city, pincode]) => {
      sheet.addRow({
        name,
        partyType,
        gstin: makeValidGstin(stateCode, pan),
        pan,
        stateCode,
        email,
        phone,
        address1,
        city,
        pincode,
      });
    });

    this.styleDataRows(sheet, 2, parties.length + 1);
  }

  /**
   * 5. Items Master Template (22 realistic GOODS and SERVICE items across all GST slabs)
   */
  private buildItemsMasterTemplate(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Items Master');
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.columns = [
      { header: 'Item Name*', key: 'name', width: 30 },
      { header: 'Item Type* (GOODS/SERVICE)', key: 'itemType', width: 24 },
      { header: 'HSN / SAC Code', key: 'hsn', width: 16 },
      { header: 'Unit (UQC)*', key: 'uqc', width: 14 },
      { header: 'Default Tax Rate %*', key: 'taxRate', width: 18 },
      { header: 'Default Sales Price', key: 'salesPrice', width: 18 },
      { header: 'Default Purchase Price', key: 'purchasePrice', width: 20 },
    ];

    this.styleHeaderRow(sheet);

    const items: Array<[string, 'GOODS' | 'SERVICE', string, string, number, number, number]> = [
      ['Industrial Valve 50mm', 'GOODS', '8481', 'NOS', 18, 4200, 3100],
      ['Enterprise Cloud License', 'SERVICE', '998311', 'NOS', 18, 12000, 0],
      ['SAP Advisory Consulting', 'SERVICE', '998313', 'HRS', 18, 2500, 0],
      ['Fleet Telemetry Hardware', 'GOODS', '85176290', 'NOS', 18, 4800, 3400],
      ['Printed Packaging Cartons', 'GOODS', '4819', 'BOX', 12, 45, 32],
      ['Annual Security Audit', 'SERVICE', '998314', 'NOS', 18, 85000, 0],
      ['CNC Precision Shafts', 'GOODS', '8483', 'PCS', 18, 650, 460],
      ['Refined Packaging Film', 'GOODS', '3920', 'KGS', 18, 180, 130],
      ['Diagnostic Consumables', 'GOODS', '3004', 'BOX', 5, 420, 290],
      ['Printed Accounting Books', 'GOODS', '4901', 'NOS', 0, 350, 210],
      ['LED Industrial Luminaires', 'GOODS', '9405', 'NOS', 12, 1850, 1320],
      ['Commercial Air Purifiers', 'GOODS', '8421', 'NOS', 28, 28000, 21500],
      ['Managed Cloud Support', 'SERVICE', '998315', 'MONTH', 18, 45000, 0],
      ['Industrial Solvent Drums', 'GOODS', '3814', 'NOS', 18, 5200, 3900],
      ['Organic Basmati Bulk', 'GOODS', '1006', 'KGS', 0, 160, 125],
      ['MCB Distribution Panels', 'GOODS', '8537', 'SET', 18, 14500, 10800],
      ['Thermal POS Paper Rolls', 'GOODS', '4811', 'PAC', 12, 95, 65],
      ['Structural Steel Brackets', 'GOODS', '7308', 'NOS', 18, 1250, 890],
      ['Display Showcase Glass', 'GOODS', '7007', 'NOS', 28, 8200, 6100],
      ['Cold Chain Sensors', 'GOODS', '9025', 'NOS', 18, 3100, 2200],
      ['Barcode Label Printers', 'GOODS', '8443', 'NOS', 18, 18500, 14200],
      ['Statutory Tax Audit Fee', 'SERVICE', '998221', 'NOS', 18, 75000, 75000],
    ];

    items.forEach(([name, itemType, hsn, uqc, taxRate, salesPrice, purchasePrice]) => {
      sheet.addRow({
        name,
        itemType,
        hsn,
        uqc,
        taxRate,
        salesPrice,
        purchasePrice,
      });
    });

    this.styleDataRows(sheet, 2, items.length + 1);
  }

  // --- Styling Utilities ---
  private styleHeaderRow(sheet: ExcelJS.Worksheet): void {
    const headerRow = sheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
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
          color: { argb: 'FF334155' },
        };
        cell.alignment = { vertical: 'middle' };
      });
    }
  }
}
