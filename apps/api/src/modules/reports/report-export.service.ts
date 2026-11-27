import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  CustomerSalesReport,
  ItemSalesReport,
  StatementOfAccountReport,
} from '@platform/shared-types';

export interface CompanyBrandingContext {
  legalName: string;
  pan?: string | null;
  gstin?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  logoDataUri?: string | null;
}

export interface PrintHtmlOptions {
  forPdf?: boolean;
  watermark?: string;
  rowKinds?: Array<'normal' | 'group' | 'subtotal'>;
  subtitle?: string;
}

export type ColumnType = 'text' | 'number' | 'currency' | 'date' | 'code' | 'badge';

export interface ReportColumnDef {
  header: string;
  key?: string;
  type?: ColumnType;
  width?: number;
}

@Injectable()
export class ReportExportService {
  /**
   * Apply consistent branded corporate letterhead to any ExcelJS worksheet
   */
  private applyCorporateLetterhead(
    sheet: ExcelJS.Worksheet,
    branding: CompanyBrandingContext,
    reportTitle: string,
    periodStr: string,
    columnCount: number,
  ): void {
    const endCol = Math.max(columnCount, 6);

    // 1. Company Legal Name Banner
    sheet.mergeCells(1, 1, 1, endCol);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = branding.legalName.toUpperCase();
    titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF0F172A' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(1).height = 26;

    // 2. Company Statutory Details (GSTIN, PAN, Address, Contact)
    sheet.mergeCells(2, 1, 2, endCol);
    const subCell = sheet.getCell(2, 1);
    const statutoryDetails = [
      branding.gstin ? `GSTIN: ${branding.gstin}` : null,
      branding.pan ? `PAN: ${branding.pan}` : null,
      branding.address || null,
      branding.phone ? `Tel: ${branding.phone}` : null,
      branding.email ? `Email: ${branding.email}` : null,
    ]
      .filter(Boolean)
      .join('  •  ');
    subCell.value = statutoryDetails || 'Enterprise Statutory & Financial Books';
    subCell.font = { name: 'Calibri', size: 9, color: { argb: 'FF475569' } };
    subCell.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(2).height = 18;

    // 3. Report Name & Subtitle
    sheet.mergeCells(3, 1, 3, endCol);
    const reportNameCell = sheet.getCell(3, 1);
    reportNameCell.value = reportTitle.toUpperCase();
    reportNameCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    reportNameCell.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(3).height = 22;

    // 4. Period & Generated At timestamp
    sheet.mergeCells(4, 1, 4, endCol);
    const periodCell = sheet.getCell(4, 1);
    periodCell.value = `Period: ${periodStr}   |   Generated: ${new Date().toLocaleString('en-IN')} IST   |   Currency: INR (₹)   |   Status: Final Reconciled`;
    periodCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
    periodCell.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(4).height = 18;

    // Blank row spacer
    sheet.getRow(5).height = 10;
  }

  /**
   * Style the table header row
   */
  private styleTableHeaderRow(row: ExcelJS.Row, colTypes?: ColumnType[]): void {
    row.height = 26;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }, // Slate 800
      };
      cell.font = {
        name: 'Calibri',
        size: 9.5,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };

      const cType = colTypes && colTypes[colNumber - 1];
      let align: ExcelJS.Alignment['horizontal'] = 'left';
      if (cType === 'currency' || cType === 'number') {
        align = 'right';
      } else if (cType === 'date' || cType === 'code' || cType === 'badge') {
        align = 'center';
      } else if (colNumber === 1) {
        align = 'center';
      }

      cell.alignment = {
        vertical: 'middle',
        horizontal: align,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
      };
    });
  }

  /**
   * Determine column type from header name and sample values
   */
  private inferColumnType(header: string, sampleVal?: any): ColumnType {
    const h = header.toLowerCase();
    if (h.includes('(₹)') || h.includes('amount') || h.includes('rate') || h.includes('turnover') || h.includes('balance') || h.includes('due') || h.includes('tax') || h.includes('sales') || h.includes('expenses') || h.includes('price')) {
      return 'currency';
    }
    if (h.includes('qty') || h.includes('count') || h.includes('invoices') || h.includes('vouchers') || h.includes('percentage') || h.includes('%') || h === 'sr. no.' || h === '#') {
      return 'number';
    }
    if (h.includes('date') || h.includes('month') || h.includes('period')) {
      return 'date';
    }
    if (h.includes('gstin') || h.includes('pan') || h.includes('code') || h.includes('hsn') || h.includes('sac') || h.includes('uom') || h.includes('pos')) {
      return 'code';
    }
    if (h.includes('status') || h.includes('type') || h.includes('check')) {
      return 'badge';
    }
    if (typeof sampleVal === 'number') {
      return 'number';
    }
    return 'text';
  }

  /**
   * Format cell value into raw numeric value if currency/numeric
   */
  private parseRawNumber(val: any): { isNum: boolean; numVal: number } {
    if (typeof val === 'number') {
      return { isNum: true, numVal: val };
    }
    if (typeof val === 'string') {
      const clean = val.replace(/₹|,|\s/g, '').trim();
      if (/^-?\d+(\.\d+)?$/.test(clean)) {
        return { isNum: true, numVal: parseFloat(clean) };
      }
    }
    return { isNum: false, numVal: 0 };
  }

  /**
   * Generate Branded Excel for Customer-Wise Sales Report
   */
  public async exportCustomerSalesExcel(
    report: CustomerSalesReport,
    branding: CompanyBrandingContext,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Antigravity Books';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Customer-Wise Sales');
    sheet.views = [{ state: 'frozen', ySplit: 6 }];

    const colDefs: ReportColumnDef[] = [
      { header: '#', width: 6, type: 'number' },
      { header: 'Customer / Counterparty Name', width: 34, type: 'text' },
      { header: 'Customer GSTIN', width: 18, type: 'code' },
      { header: 'State Code', width: 12, type: 'code' },
      { header: 'Invoices', width: 12, type: 'number' },
      { header: 'Taxable Turnover (₹)', width: 20, type: 'currency' },
      { header: 'CGST (₹)', width: 15, type: 'currency' },
      { header: 'SGST (₹)', width: 15, type: 'currency' },
      { header: 'IGST (₹)', width: 15, type: 'currency' },
      { header: 'Total Taxes (₹)', width: 18, type: 'currency' },
      { header: 'Total Invoiced (₹)', width: 22, type: 'currency' },
      { header: 'Outstanding Due (₹)', width: 22, type: 'currency' },
    ];

    sheet.columns = colDefs.map((c, i) => ({
      header: c.header,
      key: `col_${i}`,
      width: c.width,
    }));

    const colTypes = colDefs.map((c) => c.type || 'text');
    this.applyCorporateLetterhead(
      sheet,
      branding,
      'Customer-Wise Sales Analysis Report',
      `${report.fromDate} to ${report.toDate}`,
      colDefs.length,
    );

    this.styleTableHeaderRow(sheet.getRow(6), colTypes);

    let currentLine = 7;
    report.rows.forEach((r, idx) => {
      const dataRow = sheet.getRow(currentLine);
      dataRow.values = [
        idx + 1,
        r.partyName,
        r.gstin || 'Unregistered',
        r.stateCode || '27',
        r.invoiceCount,
        r.taxableAmount,
        r.cgstAmount,
        r.sgstAmount,
        r.igstAmount,
        r.totalTax,
        r.totalAmount,
        r.outstandingBalance,
      ];

      dataRow.height = 21;
      dataRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
        cell.font = { name: 'Calibri', size: 9.5 };
        const cType = colTypes[colNum - 1];

        if (cType === 'currency') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '₹ #,##,##0.00;(₹ #,##,##0.00);"-"';
        } else if (cType === 'number') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (cType === 'code' || colNum === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
          right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        };
      });

      if (idx % 2 === 1) {
        dataRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        });
      }

      currentLine++;
    });

    // Summary Totals Row with native Excel formulas
    const totalRow = sheet.getRow(currentLine);
    totalRow.height = 26;
    totalRow.values = [
      '',
      'TOTAL / GRAND TOTAL',
      '',
      '',
      { formula: `=SUM(E7:E${currentLine - 1})` },
      { formula: `=SUM(F7:F${currentLine - 1})` },
      { formula: `=SUM(G7:G${currentLine - 1})` },
      { formula: `=SUM(H7:H${currentLine - 1})` },
      { formula: `=SUM(I7:I${currentLine - 1})` },
      { formula: `=SUM(J7:J${currentLine - 1})` },
      { formula: `=SUM(K7:K${currentLine - 1})` },
      { formula: `=SUM(L7:L${currentLine - 1})` },
    ];

    totalRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' },
      };
      if (colNum >= 5) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (colNum >= 6) {
          cell.numFmt = '₹ #,##,##0.00;(₹ #,##,##0.00);"-"';
        } else {
          cell.numFmt = '#,##0';
        }
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF475569' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } }, // ICAI Double underline
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  /**
   * Generate Branded Excel for Item / Product-Wise Sales Report
   */
  public async exportItemSalesExcel(
    report: ItemSalesReport,
    branding: CompanyBrandingContext,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Antigravity Books';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Item-Wise Sales');
    sheet.views = [{ state: 'frozen', ySplit: 6 }];

    const colDefs: ReportColumnDef[] = [
      { header: '#', width: 6, type: 'number' },
      { header: 'Product / Item Name', width: 34, type: 'text' },
      { header: 'Item Code', width: 14, type: 'code' },
      { header: 'HSN / SAC Code', width: 16, type: 'code' },
      { header: 'UOM', width: 10, type: 'code' },
      { header: 'Quantity Sold', width: 16, type: 'number' },
      { header: 'Avg Price (₹)', width: 16, type: 'currency' },
      { header: 'Taxable Value (₹)', width: 20, type: 'currency' },
      { header: 'Tax Rate %', width: 12, type: 'number' },
      { header: 'Total Tax (₹)', width: 18, type: 'currency' },
      { header: 'Gross Sales (₹)', width: 22, type: 'currency' },
    ];

    sheet.columns = colDefs.map((c, i) => ({
      header: c.header,
      key: `col_${i}`,
      width: c.width,
    }));

    const colTypes = colDefs.map((c) => c.type || 'text');
    this.applyCorporateLetterhead(
      sheet,
      branding,
      'Product & Item-Wise Sales Analysis Report',
      `${report.fromDate} to ${report.toDate}`,
      colDefs.length,
    );

    this.styleTableHeaderRow(sheet.getRow(6), colTypes);

    let currentLine = 7;
    report.rows.forEach((r, idx) => {
      const dataRow = sheet.getRow(currentLine);
      dataRow.values = [
        idx + 1,
        r.itemName,
        r.itemCode || 'N/A',
        r.hsnSacCode || 'N/A',
        r.uom || 'NOS',
        r.quantitySold,
        r.avgSellingPrice,
        r.taxableAmount,
        r.gstRatePercent,
        r.totalTax,
        r.totalAmount,
      ];

      dataRow.height = 21;
      dataRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
        cell.font = { name: 'Calibri', size: 9.5 };
        const cType = colTypes[colNum - 1];

        if (cType === 'currency') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '₹ #,##,##0.00;(₹ #,##,##0.00);"-"';
        } else if (cType === 'number') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = colNum === 9 ? '0.00"%"' : '#,##0.00';
        } else if (cType === 'code' || colNum === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
          right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        };
      });

      if (idx % 2 === 1) {
        dataRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        });
      }

      currentLine++;
    });

    // Totals Row
    const totalRow = sheet.getRow(currentLine);
    totalRow.height = 26;
    totalRow.values = [
      '',
      'TOTAL / GRAND TOTAL',
      '',
      '',
      '',
      { formula: `=SUM(F7:F${currentLine - 1})` },
      '',
      { formula: `=SUM(H7:H${currentLine - 1})` },
      '',
      { formula: `=SUM(J7:J${currentLine - 1})` },
      { formula: `=SUM(K7:K${currentLine - 1})` },
    ];

    totalRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' },
      };
      if (colNum >= 6) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if ([8, 10, 11].includes(colNum)) {
          cell.numFmt = '₹ #,##,##0.00;(₹ #,##,##0.00);"-"';
        } else if (colNum === 6) {
          cell.numFmt = '#,##0.00';
        }
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF475569' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  /**
   * Generic Branded Excel Export with proper numeric cell types and auto-fit column widths
   */
  public async exportGenericReportExcel(
    title: string,
    period: string,
    branding: CompanyBrandingContext,
    headers: string[],
    rawRows: (string | number)[][],
    rawTotals?: (string | number)[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Antigravity Books';
    workbook.created = new Date();

    const cleanTitle = title.substring(0, 30).replace(/[:\/?*\[\]]/g, '');
    const sheet = workbook.addWorksheet(cleanTitle || 'Report');
    sheet.views = [{ state: 'frozen', ySplit: 6 }];

    // Classify column types
    const colTypes: ColumnType[] = headers.map((h, i) => {
      const sample = rawRows[0] ? rawRows[0][i] : undefined;
      return this.inferColumnType(h, sample);
    });

    // Compute column widths based on maximum length of headers and values
    const colWidths = headers.map((h, colIdx) => {
      let maxLen = h.length;
      for (let r = 0; r < Math.min(rawRows.length, 100); r++) {
        const valStr = String(rawRows[r]?.[colIdx] ?? '');
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      }
      return Math.min(Math.max(maxLen + 4, 12), 48);
    });

    sheet.columns = headers.map((h, i) => ({
      header: h,
      key: `col_${i}`,
      width: colWidths[i],
    }));

    const colCount = headers.length;
    this.applyCorporateLetterhead(sheet, branding, title, period, colCount);

    const headerRow = sheet.getRow(6);
    this.styleTableHeaderRow(headerRow, colTypes);

    let currentLine = 7;
    rawRows.forEach((r, idx) => {
      const dataRow = sheet.getRow(currentLine);
      dataRow.height = 21;

      // Convert cells to proper numbers when column is currency/number
      const processedValues = r.map((cellVal, colIdx) => {
        const cType = colTypes[colIdx];
        if (cType === 'currency' || cType === 'number') {
          const parsed = this.parseRawNumber(cellVal);
          if (parsed.isNum) return parsed.numVal;
        }
        return cellVal ?? '';
      });

      dataRow.values = processedValues;

      dataRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 9.5 };
        const cType = colTypes[colNumber - 1];

        if (cType === 'currency') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '₹ #,##,##0.00;(₹ #,##,##0.00);"-"';
        } else if (cType === 'number') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = typeof cell.value === 'number' && !Number.isInteger(cell.value) ? '#,##0.00' : '#,##0';
        } else if (cType === 'date' || cType === 'code' || cType === 'badge' || colNumber === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
          right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        };
      });

      if (idx % 2 === 1) {
        dataRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        });
      }

      currentLine++;
    });

    if (rawTotals && rawTotals.length > 0) {
      const totalRow = sheet.getRow(currentLine);
      totalRow.height = 26;

      const processedTotals = rawTotals.map((totVal, colIdx) => {
        const cType = colTypes[colIdx];
        if (cType === 'currency' || cType === 'number') {
          const parsed = this.parseRawNumber(totVal);
          if (parsed.isNum) return parsed.numVal;
        }
        return totVal ?? '';
      });

      totalRow.values = processedTotals;

      totalRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' },
        };
        const cType = colTypes[colNumber - 1];
        if (cType === 'currency') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '₹ #,##,##0.00;(₹ #,##,##0.00);"-"';
        } else if (cType === 'number') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = typeof cell.value === 'number' && !Number.isInteger(cell.value) ? '#,##0.00' : '#,##0';
        } else if (colNumber === 1 || cType === 'code') {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF475569' } },
          bottom: { style: 'double', color: { argb: 'FF0F172A' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };
      });
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  /**
   * Generate High-Fidelity Branded PDF (HTML print-preview with Print Toolbar,
   * proper tabular formatting, and ICAI accounting compliance)
   */
  public formatIndianCurrency(val: number): string {
    const abs = Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return val < 0 ? `(₹ ${abs})` : `₹ ${abs}`;
  }

  private renderSharedHeadAndHeader(
    reportTitle: string,
    periodStr: string,
    branding: CompanyBrandingContext,
    options?: PrintHtmlOptions,
    recordCountLabel?: string,
  ): { headHtml: string; headerHtml: string; watermarkHtml: string; toolbarHtml: string } {
    const formattedDate = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const esc = (s: any) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const headHtml = `
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(reportTitle)} — ${esc(branding.legalName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: ${options?.forPdf ? '#ffffff' : '#f8fafc'};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      font-size: 10.5px;
      line-height: 1.42;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .report-paper {
      background: #ffffff;
      padding: ${options?.forPdf ? '0' : '28px 34px'};
      margin: 0 auto;
      max-width: ${options?.forPdf ? '100%' : '1020px'};
      ${options?.forPdf ? '' : 'border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15,23,42,0.06); margin-top: 16px; margin-bottom: 24px;'}
    }
    .print-toolbar {
      position: sticky;
      top: 10px;
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0f172a;
      color: #fff;
      padding: 10px 18px;
      border-radius: 10px;
      max-width: 1020px;
      margin: 12px auto 0 auto;
    }
    .btn-action {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      background: #2563eb;
      color: #fff;
    }
    .watermark {
      position: fixed;
      top: 42%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-32deg);
      font-size: 72px;
      font-weight: 800;
      letter-spacing: 0.14em;
      color: rgba(15, 23, 42, 0.065);
      pointer-events: none;
      z-index: 0;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
      position: relative;
      z-index: 1;
    }
    .lh-left {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex: 1;
    }
    .lh-logo {
      max-height: 46px;
      max-width: 110px;
      object-fit: contain;
    }
    .company-title {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.01em;
      margin: 0 0 3px 0;
    }
    .company-sub {
      font-size: 9.5px;
      color: #475569;
      line-height: 1.45;
    }
    .stat-pill {
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 9px;
      font-weight: 600;
      color: #1e293b;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 1px 6px;
      margin-right: 6px;
      margin-top: 3px;
    }
    .lh-right {
      text-align: right;
      min-width: 210px;
    }
    .report-title-text {
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .report-meta {
      font-size: 9px;
      color: #475569;
      margin-top: 3px;
      line-height: 1.45;
    }
    .status-chip {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 9.5px;
      position: relative;
      z-index: 1;
    }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 700;
      padding: 7px 8px;
      font-size: 9px;
      border: 1px solid #0f172a;
      letter-spacing: 0.02em;
    }
    th.align-left, td.align-left { text-align: left; }
    th.align-center, td.align-center { text-align: center; }
    th.align-right, td.align-right { text-align: right; }
    td {
      padding: 5.5px 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: top;
    }
    td.num-font {
      font-variant-numeric: tabular-nums;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 9px;
      white-space: nowrap;
    }
    tbody tr:nth-child(even) td { background-color: #f8fafc; }
    tr.group-row td {
      background-color: #f1f5f9 !important;
      font-weight: 700;
      color: #0f172a;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      padding-top: 7px;
      padding-bottom: 6px;
    }
    tr.subtotal-row td {
      background-color: #f8fafc !important;
      font-weight: 700;
      color: #0f172a;
      border-top: 1px solid #64748b;
      border-bottom: 1px solid #94a3b8;
    }
    tr.total-row td {
      background-color: #f1f5f9 !important;
      font-weight: 800;
      color: #0f172a;
      border-top: 2px solid #0f172a;
      border-bottom: 3px double #0f172a;
      padding: 7px 8px;
    }
    .reconcile-banner {
      margin-top: 12px;
      padding: 7px 10px;
      border-radius: 6px;
      font-size: 9.5px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      border: 1px solid #a7f3d0;
      background: #ecfdf5;
      color: #065f46;
    }
    .reconcile-banner.warn {
      border-color: #fecaca;
      background: #fef2f2;
      color: #991b1b;
    }
    @page {
      size: A4 portrait;
      margin: 15mm 14mm 18mm 14mm;
    }
    @media print {
      .no-print { display: none !important; }
      body { background: #ffffff; }
      .report-paper { border: none; box-shadow: none; padding: 0; margin: 0; max-width: 100%; }
    }
  </style>`;

    const toolbarHtml = options?.forPdf
      ? ''
      : `
  <div class="print-toolbar no-print">
    <div><strong>${esc(reportTitle)}</strong> ${recordCountLabel ? `(${esc(recordCountLabel)})` : ''}</div>
    <button type="button" class="btn-action" onclick="window.print()">Print</button>
  </div>`;

    const watermarkHtml = options?.watermark
      ? `<div class="watermark">${esc(options.watermark)}</div>`
      : '';

    const headerHtml = `
    <div class="letterhead">
      <div class="lh-left">
        ${branding.logoDataUri ? `<img class="lh-logo" src="${branding.logoDataUri}" alt="Logo" />` : ''}
        <div>
          <div class="company-title">${esc(branding.legalName)}</div>
          <div class="company-sub">
            ${branding.address ? `<div>${esc(branding.address)}</div>` : ''}
            <div>
              ${branding.gstin ? `<span class="stat-pill">GSTIN: ${esc(branding.gstin)}</span>` : ''}
              ${branding.pan ? `<span class="stat-pill">PAN: ${esc(branding.pan)}</span>` : ''}
            </div>
            ${branding.phone || branding.email ? `<div>${[branding.phone ? `Tel: ${esc(branding.phone)}` : '', branding.email ? `Email: ${esc(branding.email)}` : ''].filter(Boolean).join(' · ')}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="lh-right">
        <div class="report-title-text">${esc(reportTitle)}</div>
        <div class="report-meta">
          <div>Period: <strong>${esc(periodStr)}</strong></div>
          <div>Generated: ${esc(formattedDate)} IST</div>
          <div>Currency: <strong>INR (₹)</strong></div>
        </div>
        <span class="status-chip">${options?.watermark ? esc(options.watermark) : 'Verified Statement'}</span>
      </div>
    </div>`;

    return { headHtml, headerHtml, watermarkHtml, toolbarHtml };
  }

  public generateBrandedReportHtml(
    reportTitle: string,
    periodStr: string,
    branding: CompanyBrandingContext,
    headers: string[],
    rows: (string | number)[][],
    totalsRow?: (string | number)[],
    options?: PrintHtmlOptions,
  ): string {
    const esc = (s: any) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const colAlignments = headers.map((h, i) => {
      const sample = rows[0] ? rows[0][i] : undefined;
      const type = this.inferColumnType(h, sample);
      if (type === 'currency' || type === 'number') return 'right';
      if (type === 'date' || type === 'code' || type === 'badge' || i === 0) return 'center';
      return 'left';
    });

    const formatPrintCell = (val: any, colIdx: number): string => {
      if (val === null || val === undefined || val === '') return '-';
      const align = colAlignments[colIdx];
      if (align === 'right') {
        const parsed = this.parseRawNumber(val);
        if (parsed.isNum) {
          const hdr = headers[colIdx].toLowerCase();
          const isCurrency =
            hdr.includes('(₹)') ||
            hdr.includes('amount') ||
            hdr.includes('rate') ||
            hdr.includes('balance') ||
            hdr.includes('sales') ||
            hdr.includes('due') ||
            hdr.includes('tax') ||
            hdr.includes('debit') ||
            hdr.includes('credit') ||
            hdr.includes('expenses');
          if (isCurrency) {
            return this.formatIndianCurrency(parsed.numVal);
          }
          return parsed.numVal.toLocaleString('en-IN', { maximumFractionDigits: 2 });
        }
      }
      return esc(val);
    };

    const { headHtml, headerHtml, watermarkHtml, toolbarHtml } = this.renderSharedHeadAndHeader(
      reportTitle,
      periodStr,
      branding,
      options,
      `${rows.length} records`,
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>${headHtml}</head>
<body>
  ${toolbarHtml}
  ${watermarkHtml}
  <div class="report-paper">
    ${headerHtml}
    <table>
      <thead>
        <tr>
          ${headers.map((h, i) => `<th class="align-${colAlignments[i]}">${esc(h)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((row, rIdx) => {
            const kind = options?.rowKinds?.[rIdx] || 'normal';
            const cls = kind === 'group' ? 'group-row' : kind === 'subtotal' ? 'subtotal-row' : '';
            return `<tr class="${cls}">
              ${row
                .map((cell, i) => {
                  const align = colAlignments[i];
                  const isNum = align === 'right' || align === 'center';
                  return `<td class="align-${align} ${isNum ? 'num-font' : ''}">${formatPrintCell(cell, i)}</td>`;
                })
                .join('')}
            </tr>`;
          })
          .join('')}
        ${
          totalsRow && totalsRow.length > 0
            ? `<tr class="total-row">
                ${totalsRow
                  .map((cell, i) => {
                    const align = colAlignments[i];
                    return `<td class="align-${align} num-font">${formatPrintCell(cell, i)}</td>`;
                  })
                  .join('')}
              </tr>`
            : ''
        }
      </tbody>
    </table>
  </div>
</body>
</html>`;
  }

  public generateTrialBalancePrintHtml(
    data: any,
    branding: CompanyBrandingContext,
    options?: PrintHtmlOptions,
  ): string {
    const headers = ['Code', 'Particulars (Ledger / Group)', 'Nature', 'Opening (₹)', 'Period Debit (₹)', 'Period Credit (₹)', 'Closing Debit (₹)', 'Closing Credit (₹)'];
    const rows: (string | number)[][] = (data.rows || []).map((r: any) => [
      r.ledgerCode,
      `${r.ledgerName} (${r.groupName})`,
      r.nature,
      Number(r.openingDebit || 0) - Number(r.openingCredit || 0),
      Number(r.periodDebit || 0),
      Number(r.periodCredit || 0),
      Number(r.closingDebit || 0),
      Number(r.closingCredit || 0),
    ]);
    const totals = [
      '',
      'GRAND TOTAL',
      '',
      '',
      Number(data.totalPeriodDebit || 0),
      Number(data.totalPeriodCredit || 0),
      Number(data.totalClosingDebit || 0),
      Number(data.totalClosingCredit || 0),
    ];
    return this.generateBrandedReportHtml(
      'Trial Balance (ICAI Standard)',
      `As at ${data.asOfDate || new Date().toISOString().split('T')[0]}`,
      branding,
      headers,
      rows,
      totals,
      options,
    );
  }

  public generateProfitAndLossPrintHtml(
    data: any,
    branding: CompanyBrandingContext,
    options?: PrintHtmlOptions,
  ): string {
    const headers = ['Schedule / Particulars', 'Group', 'Amount (₹)'];
    const rows: (string | number)[][] = [];
    const rowKinds: Array<'normal' | 'group' | 'subtotal'> = [];

    rows.push(['I. OPERATING & OTHER INCOME', '', '']);
    rowKinds.push('group');
    for (const item of data.incomes || []) {
      rows.push([item.ledgerName, item.groupName, Number(item.amount || 0)]);
      rowKinds.push('normal');
    }
    rows.push(['Total Income (I)', '', Number(data.totalIncome || 0)]);
    rowKinds.push('subtotal');

    rows.push(['II. EXPENSES', '', '']);
    rowKinds.push('group');
    for (const item of data.expenses || []) {
      rows.push([item.ledgerName, item.groupName, Number(item.amount || 0)]);
      rowKinds.push('normal');
    }
    rows.push(['Total Expenses (II)', '', Number(data.totalExpense || 0)]);
    rowKinds.push('subtotal');

    const totals = ['NET PROFIT / (LOSS) (I - II)', '', Number(data.netProfit || 0)];
    return this.generateBrandedReportHtml(
      'Statement of Profit & Loss (Schedule III)',
      `${data.fromDate} to ${data.toDate}`,
      branding,
      headers,
      rows,
      totals,
      { ...options, rowKinds },
    );
  }

  public generateBalanceSheetPrintHtml(
    data: any,
    branding: CompanyBrandingContext,
    options?: PrintHtmlOptions,
  ): string {
    const headers = ['Particulars (Schedule III)', 'Group', 'Amount (₹)'];
    const rows: (string | number)[][] = [];
    const rowKinds: Array<'normal' | 'group' | 'subtotal'> = [];

    rows.push(['I. EQUITY & LIABILITIES', '', '']);
    rowKinds.push('group');
    for (const item of data.equity || []) {
      rows.push([item.ledgerName, item.groupName || 'Equity', Number(item.amount || 0)]);
      rowKinds.push('normal');
    }
    for (const item of data.liabilities || []) {
      rows.push([item.ledgerName, item.groupName || 'Liability', Number(item.amount || 0)]);
      rowKinds.push('normal');
    }
    rows.push(['Total Equity & Liabilities', '', Number(data.totalLiabilitiesAndEquity || 0)]);
    rowKinds.push('subtotal');

    rows.push(['II. ASSETS', '', '']);
    rowKinds.push('group');
    for (const item of data.assets || []) {
      rows.push([item.ledgerName, item.groupName || 'Asset', Number(item.amount || 0)]);
      rowKinds.push('normal');
    }
    rows.push(['Total Assets', '', Number(data.totalAssets || 0)]);
    rowKinds.push('subtotal');

    const diff = Math.abs(Number(data.totalAssets || 0) - Number(data.totalLiabilitiesAndEquity || 0));
    const totals = [
      diff < 0.05 ? 'BALANCE SHEET TALLIED (A = L + E)' : 'BALANCE SHEET VARIANCE',
      '',
      Number(data.totalAssets || 0),
    ];

    return this.generateBrandedReportHtml(
      'Balance Sheet (Schedule III Vertical)',
      `As at ${data.asOfDate || new Date().toISOString().split('T')[0]}`,
      branding,
      headers,
      rows,
      totals,
      { ...options, rowKinds },
    );
  }
}
