import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { parse as csvParse } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';
import { CANONICAL_IMPORT_FIELDS, ColumnMappingConfig } from '@platform/shared-types';

export interface ParsedFileResult {
  fileHashSha256: string;
  fileSizeBytes: number;
  headers: string[];
  sampleRows: Record<string, any>[];
  allRows: Record<string, any>[];
}

@Injectable()
export class FileParserService {
  /**
   * Computes SHA-256 hash of a file buffer to guarantee deduplication
   */
  public computeHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Parse CSV or Excel buffer into structured records
   */
  public async parseBuffer(
    buffer: Buffer,
    fileName: string,
  ): Promise<ParsedFileResult> {
    const fileHashSha256 = this.computeHash(buffer);
    const fileSizeBytes = buffer.length;
    const lowerName = fileName.toLowerCase();

    let allRows: Record<string, any>[] = [];
    let headers: string[] = [];

    if (lowerName.endsWith('.csv') || lowerName.endsWith('.tsv') || lowerName.endsWith('.txt')) {
      const delimiter = lowerName.endsWith('.tsv') ? '\t' : ',';
      const content = buffer.toString('utf-8');
      
      const records = csvParse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter,
        relax_column_count: true,
      });

      allRows = records as Record<string, any>[];
      if (allRows.length > 0) {
        headers = Object.keys(allRows[0]);
      }
    } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      const workbook = new ExcelJS.Workbook();
      // @ts-ignore
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException('Excel workbook has no sheets.');
      }

      const rows: any[][] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, _rowNumber) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        rows.push(values);
      });

      if (rows.length < 2) {
        throw new BadRequestException('Excel sheet must contain at least a header row and one data row.');
      }

      headers = rows[0].map((h) => String(h || '').trim()).filter(Boolean);
      for (let i = 1; i < rows.length; i++) {
        const rowData = rows[i];
        const record: Record<string, any> = {};
        let hasValue = false;
        headers.forEach((h, colIdx) => {
          const val = rowData[colIdx];
          const stringVal = val === null || val === undefined ? '' : String(val).trim();
          record[h] = stringVal;
          if (stringVal !== '') hasValue = true;
        });
        if (hasValue) {
          allRows.push(record);
        }
      }
    } else {
      throw new BadRequestException(
        `Unsupported file format: ${fileName}. Please upload an .xlsx or .csv file.`,
      );
    }

    if (allRows.length === 0) {
      throw new BadRequestException('Uploaded file does not contain any readable data rows.');
    }

    const sampleRows = allRows.slice(0, 5);

    return {
      fileHashSha256,
      fileSizeBytes,
      headers,
      sampleRows,
      allRows,
    };
  }

  /**
   * Heuristic column auto-detection based on canonical aliases
   */
  public autoDetectMapping(headers: string[]): ColumnMappingConfig {
    const mapping: ColumnMappingConfig = {};
    const normalizedHeaders = headers.map((h) => ({
      original: h,
      clean: h.toLowerCase().replace(/[^a-z0-9]/g, ''),
    }));

    for (const canonical of CANONICAL_IMPORT_FIELDS) {
      // 1. Exact match first
      let match = normalizedHeaders.find((nh) =>
        canonical.aliases.some(
          (alias) => nh.clean === alias.toLowerCase().replace(/[^a-z0-9]/g, ''),
        ),
      );

      // 2. Substring match fallback (excluding gstin collision for party name)
      if (!match) {
        match = normalizedHeaders.find((nh) => {
          if (canonical.key === 'partyName' && nh.clean.includes('gstin')) {
            return false;
          }
          return canonical.aliases.some((alias) => {
            const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
            return nh.clean.includes(cleanAlias);
          });
        });
      }

      if (match) {
        mapping[canonical.key] = match.original;
      }
    }

    return mapping;
  }
}
