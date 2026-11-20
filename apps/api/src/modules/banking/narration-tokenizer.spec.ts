import { NarrationTokenizerService } from './narration-tokenizer.service';

describe('NarrationTokenizerService', () => {
  let tokenizer: NarrationTokenizerService;

  beforeEach(() => {
    tokenizer = new NarrationTokenizerService();
  });

  it('should parse UPI narration with VPA and reference number', () => {
    const narration = 'UPI/428394829104/Payment from infosys@okaxis/ICICI';
    const result = tokenizer.tokenize(narration);

    expect(result.paymentMode).toBe('UPI');
    expect(result.referenceNumber).toBe('428394829104');
    expect(result.vpa).toBe('infosys@okaxis');
    expect(result.isBankChargeOrInterest).toBe(false);
  });

  it('should parse NEFT narration with UTR and counterparty name', () => {
    const narration = 'NEFT-N12345678901-TATA MOTORS LTD-HDFC0000060';
    const result = tokenizer.tokenize(narration);

    expect(result.paymentMode).toBe('NEFT');
    expect(result.referenceNumber).toBe('N12345678901');
    expect(result.extractedPartyName).toBe('TATA MOTORS LTD');
  });

  it('should parse RTGS narration with CMS UTR', () => {
    const narration = 'RTGS-CMS-CMS1234567890-RELIANCE IND-SBIN0001';
    const result = tokenizer.tokenize(narration);

    expect(result.paymentMode).toBe('RTGS');
    expect(result.referenceNumber).toBe('CMS1234567890');
    expect(result.extractedPartyName).toBe('RELIANCE IND');
  });

  it('should parse IMPS narration with reference number', () => {
    const narration = 'IMPS/P2A/329482910482/SHREE AUTOMOBILES/HDFC';
    const result = tokenizer.tokenize(narration);

    expect(result.paymentMode).toBe('IMPS');
    expect(result.referenceNumber).toBe('329482910482');
    expect(result.extractedPartyName).toBe('SHREE AUTOMOBILES');
  });

  it('should parse Cheque clearing narration', () => {
    const narration = 'CHQ CLG / 000452 / ABC CORP';
    const result = tokenizer.tokenize(narration);

    expect(result.paymentMode).toBe('CHEQUE');
    expect(result.referenceNumber).toBe('000452');
    expect(result.extractedPartyName).toBe('ABC CORP');
  });

  it('should detect Bank Charges and GST on charges', () => {
    const narration = 'GST ON BANK CHARGES - MONTHLY AMC';
    const result = tokenizer.tokenize(narration);

    expect(result.paymentMode).toBe('BANK_CHARGE');
    expect(result.isBankChargeOrInterest).toBe(true);
  });

  it('should detect Interest credits', () => {
    const narration = 'INTEREST CREDIT CAPITALIZED FOR Q2';
    const result = tokenizer.tokenize(narration);

    expect(result.paymentMode).toBe('INTEREST');
    expect(result.isBankChargeOrInterest).toBe(true);
  });
});
