import { ExcelTemplateService } from './excel-template.service';
import * as ExcelJS from 'exceljs';

describe('ExcelTemplateService', () => {
  let service: ExcelTemplateService;

  beforeEach(() => {
    service = new ExcelTemplateService();
  });

  it('should generate sales-invoices template with correct headers and instructions', async () => {
    const buffer = await service.generateTemplate('sales-invoices');
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);

    const workbook = new ExcelJS.Workbook();
    // @ts-ignore
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.length).toBe(2);
    const salesSheet = workbook.getWorksheet('Sales Invoices');
    expect(salesSheet).toBeDefined();

    const headerValues = salesSheet!.getRow(1).values as string[];
    expect(headerValues).toContain('Invoice No*');
    expect(headerValues).toContain('Customer Name*');
    expect(headerValues).toContain('Customer GSTIN');
    expect(headerValues).toContain('Place of Supply* (State Code)');
    expect(headerValues).toContain('Tax Rate %*');

    const infoSheet = workbook.getWorksheet('Instructions & Validations');
    expect(infoSheet).toBeDefined();
  });

  it('should generate bank-statement template with correct columns', async () => {
    const buffer = await service.generateTemplate('bank-statement');
    const workbook = new ExcelJS.Workbook();
    // @ts-ignore
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet('Bank Statement');
    expect(sheet).toBeDefined();
    const headers = sheet!.getRow(1).values as string[];
    expect(headers).toContain('Date* (DD/MM/YYYY)');
    expect(headers).toContain('Narration / Description*');
    expect(headers).toContain('Closing Balance*');
  });

  it('should generate parties and items master templates', async () => {
    const partyBuffer = await service.generateTemplate('parties-master');
    const itemBuffer = await service.generateTemplate('items-master');

    expect(partyBuffer.length).toBeGreaterThan(500);
    expect(itemBuffer.length).toBeGreaterThan(500);
  });
});
