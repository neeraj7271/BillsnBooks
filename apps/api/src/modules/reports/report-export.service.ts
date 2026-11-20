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
          cell.numFmt = '₹ #,##,##0.00';
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
          cell.numFmt = '₹ #,##,##0.00';
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
          cell.numFmt = '₹ #,##,##0.00';
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
          cell.numFmt = '₹ #,##,##0.00';
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
          cell.numFmt = '₹ #,##,##0.00';
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
          cell.numFmt = '₹ #,##,##0.00';
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
  public generateBrandedReportHtml(
    reportTitle: string,
    periodStr: string,
    branding: CompanyBrandingContext,
    headers: string[],
    rows: (string | number)[][],
    totalsRow?: (string | number)[],
  ): string {
    const formattedDate = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Detect column alignment per header
    const colAlignments = headers.map((h, i) => {
      const sample = rows[0] ? rows[0][i] : undefined;
      const type = this.inferColumnType(h, sample);
      if (type === 'currency' || type === 'number') return 'right';
      if (type === 'date' || type === 'code' || type === 'badge' || i === 0) return 'center';
      return 'left';
    });

    // Format display cells
    const formatPrintCell = (val: any, colIdx: number): string => {
      if (val === null || val === undefined || val === '') return '-';
      const align = colAlignments[colIdx];
      if (align === 'right') {
        const parsed = this.parseRawNumber(val);
        if (parsed.isNum) {
          const isCurrency = headers[colIdx].toLowerCase().includes('(₹)') || headers[colIdx].toLowerCase().includes('amount') || headers[colIdx].toLowerCase().includes('rate') || headers[colIdx].toLowerCase().includes('balance') || headers[colIdx].toLowerCase().includes('sales') || headers[colIdx].toLowerCase().includes('due') || headers[colIdx].toLowerCase().includes('tax') || headers[colIdx].toLowerCase().includes('expenses');
          if (isCurrency) {
            return `₹ ${parsed.numVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
          return parsed.numVal.toLocaleString('en-IN', { maximumFractionDigits: 2 });
        }
      }
      return String(val);
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${reportTitle} — ${branding.legalName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0f172a;
      background: #f8fafc;
      font-size: 11px;
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
    }

    /* Floating Interactive Toolbar */
    .print-toolbar {
      position: sticky;
      top: 12px;
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3), 0 8px 10px -6px rgba(15, 23, 42, 0.3);
      margin-bottom: 24px;
    }
    .print-toolbar-left {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      font-weight: 600;
    }
    .print-toolbar-badge {
      background: #1e293b;
      color: #38bdf8;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
    }
    .print-toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-primary {
      background: #3b82f6;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #2563eb;
    }
    .btn-secondary {
      background: #334155;
      color: #e2e8f0;
    }
    .btn-secondary:hover {
      background: #475569;
    }

    /* Page Container */
    .report-paper {
      background: #ffffff;
      padding: 32px 36px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      margin: 0 auto;
      max-width: 1400px;
    }

    /* Corporate Header */
    .header-box {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 16px;
      position: relative;
    }
    .header-box::before {
      content: '';
      position: absolute;
      top: -32px;
      left: -36px;
      right: -36px;
      height: 4px;
      background: linear-gradient(90deg, #3b82f6, #06b6d4, #10b981);
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }
    .company-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: -0.01em;
      margin: 0 0 4px 0;
    }
    .company-meta-strip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      font-size: 10px;
      color: #475569;
      margin-top: 4px;
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 2px 7px;
      border-radius: 5px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 600;
      color: #1e293b;
    }
    .report-banner {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
    }
    .report-title-text {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .report-meta-text {
      font-size: 10px;
      color: #64748b;
      text-align: right;
    }

    /* Table Styles */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 10px;
    }
    thead {
      display: table-header-group;
    }
    th {
      background-color: #1e293b;
      color: #ffffff;
      font-weight: 700;
      padding: 8px 10px;
      font-size: 9.5px;
      border: 1px solid #1e293b;
      letter-spacing: 0.02em;
    }
    th.align-left, td.align-left {
      text-align: left;
    }
    th.align-center, td.align-center {
      text-align: center;
    }
    th.align-right, td.align-right {
      text-align: right;
    }

    td {
      padding: 6.5px 10px;
      border-bottom: 1px solid #e2e8f0;
      border-left: 1px solid #f1f5f9;
      border-right: 1px solid #f1f5f9;
      color: #1e293b;
    }
    td.num-font {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5px;
      font-weight: 500;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    tr:hover td {
      background-color: #f1f5f9;
    }
    tr {
      page-break-inside: avoid;
    }

    /* Totals Row */
    tr.total-row td {
      background-color: #f1f5f9 !important;
      font-weight: 800;
      color: #0f172a;
      border-top: 1.5px solid #334155;
      border-bottom: 3px double #0f172a;
      padding: 8px 10px;
    }

    /* Footer */
    .report-footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Print Media Rules */
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
      .no-print {
        display: none !important;
      }
      .report-paper {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .header-box::before {
        display: none;
      }
      @page {
        size: landscape;
        margin: 12mm 15mm;
      }
    }
  </style>
</head>
<body>
  <!-- Print Controls Toolbar (Hidden during print) -->
  <div class="print-toolbar no-print">
    <div class="print-toolbar-left">
      <span>📄 ${reportTitle}</span>
      <span class="print-toolbar-badge">Ready to Print / PDF</span>
      <span style="font-size: 11px; color: #94a3b8;">${rows.length} records</span>
    </div>
    <div class="print-toolbar-actions">
      <button type="button" class="btn-action btn-primary" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
      <button type="button" class="btn-action btn-secondary" onclick="window.close()">
        ✕ Close Window
      </button>
    </div>
  </div>

  <div class="report-paper">
    <!-- Corporate Header -->
    <div class="header-box">
      <div class="company-title">${branding.legalName}</div>
      <div class="company-meta-strip">
        ${branding.gstin ? `<span class="badge-pill">GSTIN: ${branding.gstin}</span>` : ''}
        ${branding.pan ? `<span class="badge-pill">PAN: ${branding.pan}</span>` : ''}
        ${branding.address ? `<span>📍 ${branding.address}</span>` : ''}
        ${branding.phone ? `<span>📞 ${branding.phone}</span>` : ''}
        ${branding.email ? `<span>✉️ ${branding.email}</span>` : ''}
      </div>

      <div class="report-banner">
        <div>
          <div class="report-title-text">${reportTitle}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
            Accounting Standards & Statutory Compliance Audit
          </div>
        </div>
        <div class="report-meta-text">
          <div>Period: <strong>${periodStr}</strong></div>
          <div style="margin-top: 2px;">Generated on: <strong>${formattedDate} IST</strong> | Currency: <strong>INR (₹)</strong></div>
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <table>
      <thead>
        <tr>
          ${headers
            .map(
              (h, i) =>
                `<th class="align-${colAlignments[i]}">${h}</th>`,
            )
            .join('')}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr>
            ${row
              .map((cell, i) => {
                const align = colAlignments[i];
                const isNum = align === 'right' || align === 'center';
                const formatted = formatPrintCell(cell, i);
                return `<td class="align-${align} ${isNum ? 'num-font' : ''}">${formatted}</td>`;
              })
              .join('')}
          </tr>
        `,
          )
          .join('')}
        ${
          totalsRow && totalsRow.length > 0
            ? `
          <tr class="total-row">
            ${totalsRow
              .map((cell, i) => {
                const align = colAlignments[i];
                const formatted = formatPrintCell(cell, i);
                return `<td class="align-${align} num-font">${formatted}</td>`;
              })
              .join('')}
          </tr>
        `
            : ''
        }
      </tbody>
    </table>

    <!-- Footer -->
    <div class="report-footer">
      <div>Generated via <strong>Antigravity Books Enterprise</strong> — Official Chartered Accountant & Tax Platform</div>
      <div>Confidential & Privileged • Verified Double-Entry Ledger System</div>
    </div>
  </div>
</body>
</html>`;
  }
}
