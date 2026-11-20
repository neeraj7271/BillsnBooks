import { TallyGatewayService } from '../src/modules/tally/tally-gateway.service';
import { TallyPostingStatus } from '@platform/shared-types';

describe('TallyGatewayService', () => {
  let service: TallyGatewayService;

  beforeEach(() => {
    // UnitOfWorkService can be mocked as null for pure XML formatting & verification tests
    service = new TallyGatewayService(null as any);
  });

  it('generates valid standard Tally XML envelope with debits and credits', () => {
    const xml = service.generateTallyXmlEnvelope({
      voucherType: 'Sales',
      voucherNumber: 'INV-2024-001',
      voucherDate: '2024-10-31',
      narration: 'October bulk invoice',
      entries: [
        { ledgerName: 'Tata Motors Commercial Ltd', isDebit: true, amount: '11800.00' },
        { ledgerName: 'Domestic Sales Account', isDebit: false, amount: '10000.00' },
        { ledgerName: 'Output CGST Account', isDebit: false, amount: '900.00' },
        { ledgerName: 'Output SGST Account', isDebit: false, amount: '900.00' },
      ],
    });

    expect(xml).toContain('<ENVELOPE>');
    expect(xml).toContain('<TALLYREQUEST>Import Data</TALLYREQUEST>');
    expect(xml).toContain('<VOUCHER VCHTYPE="Sales"');
    expect(xml).toContain('<VOUCHERNUMBER>INV-2024-001</VOUCHERNUMBER>');
    expect(xml).toContain('<PARTYLEDGERNAME>Tata Motors Commercial Ltd</PARTYLEDGERNAME>');
    expect(xml).toContain('<LEDGERNAME>Tata Motors Commercial Ltd</LEDGERNAME>');
    expect(xml).toContain('<AMOUNT>-11800.00</AMOUNT>');
    expect(xml).toContain('<LEDGERNAME>Domestic Sales Account</LEDGERNAME>');
    expect(xml).toContain('<AMOUNT>10000.00</AMOUNT>');
  });

  it('verifies committed voucher from Tally daybook response (Read-Back Protocol)', () => {
    const tallyResponseXml = `
      <ENVELOPE>
        <BODY>
          <DATA>
            <VOUCHER>
              <GUID>TALLY-GUID-998877</GUID>
              <VOUCHERNUMBER>INV-2024-001</VOUCHERNUMBER>
              <AMOUNT>-11800.00</AMOUNT>
            </VOUCHER>
          </DATA>
        </BODY>
      </ENVELOPE>
    `;

    const result = service.verifyCommittedVoucher(
      { voucherNumber: 'INV-2024-001', totalAmount: 11800 },
      tallyResponseXml,
    );

    expect(result.isVerified).toBe(true);
    expect(result.status).toBe(TallyPostingStatus.VERIFIED);
    expect(result.tallyGuid).toBe('TALLY-GUID-998877');
    expect(result.tallyVoucherNumber).toBe('INV-2024-001');
  });

  it('flags DISCREPANCY when Tally amount differs from cloud voucher', () => {
    const tallyResponseXml = `
      <ENVELOPE>
        <BODY>
          <DATA>
            <VOUCHER>
              <GUID>TALLY-GUID-998877</GUID>
              <VOUCHERNUMBER>INV-2024-001</VOUCHERNUMBER>
              <AMOUNT>-10000.00</AMOUNT>
            </VOUCHER>
          </DATA>
        </BODY>
      </ENVELOPE>
    `;

    const result = service.verifyCommittedVoucher(
      { voucherNumber: 'INV-2024-001', totalAmount: 11800 },
      tallyResponseXml,
    );

    expect(result.isVerified).toBe(false);
    expect(result.status).toBe(TallyPostingStatus.DISCREPANCY);
    expect(result.discrepancies?.[0]).toContain('Amount discrepancy');
  });
});

