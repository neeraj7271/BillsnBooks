import { FileParserService } from '../src/modules/import/file-parser.service';

describe('FileParserService', () => {
  let service: FileParserService;

  beforeEach(() => {
    service = new FileParserService();
  });

  it('computes deterministic SHA-256 file hashes', () => {
    const buffer1 = Buffer.from('InvoiceNo,Date,Party\nINV01,2024-10-31,Acme');
    const buffer2 = Buffer.from('InvoiceNo,Date,Party\nINV01,2024-10-31,Acme');
    const buffer3 = Buffer.from('Different content');

    const hash1 = service.computeHash(buffer1);
    const hash2 = service.computeHash(buffer2);
    const hash3 = service.computeHash(buffer3);

    expect(hash1).toEqual(hash2);
    expect(hash1).not.toEqual(hash3);
    expect(hash1).toHaveLength(64);
  });

  it('parses CSV buffers and extracts headers and sample rows', async () => {
    const csvContent = `Invoice No,Date,Customer Name,Taxable Value,CGST,SGST,Total
INV-001,2024-10-15,Tata Motors,10000,900,900,11800
INV-002,2024-10-16,Reliance Retail,20000,1800,1800,23600`;

    const result = await service.parseBuffer(Buffer.from(csvContent), 'sales_register.csv');

    expect(result.headers).toEqual([
      'Invoice No',
      'Date',
      'Customer Name',
      'Taxable Value',
      'CGST',
      'SGST',
      'Total',
    ]);
    expect(result.allRows).toHaveLength(2);
    expect(result.sampleRows).toHaveLength(2);
    expect(result.allRows[0]['Invoice No']).toBe('INV-001');
    expect(result.allRows[0]['Customer Name']).toBe('Tata Motors');
  });

  it('heuristically auto-detects canonical column mappings', () => {
    const headers = [
      'Bill No',
      'Txn Date',
      'Buyer Name',
      'Party GSTIN',
      'Base Amount',
      'CGST Val',
      'SGST Val',
      'Net Amount',
    ];

    const mapping = service.autoDetectMapping(headers);

    expect(mapping['voucherNumber']).toBe('Bill No');
    expect(mapping['date']).toBe('Txn Date');
    expect(mapping['partyName']).toBe('Buyer Name');
    expect(mapping['partyGstin']).toBe('Party GSTIN');
    expect(mapping['taxableAmount']).toBe('Base Amount');
    expect(mapping['cgstAmount']).toBe('CGST Val');
    expect(mapping['sgstAmount']).toBe('SGST Val');
    expect(mapping['totalAmount']).toBe('Net Amount');
  });
});

