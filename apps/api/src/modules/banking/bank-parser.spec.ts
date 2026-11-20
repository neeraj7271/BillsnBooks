import { BankParserService } from './bank-parser.service';
import { NarrationTokenizerService } from './narration-tokenizer.service';

describe('BankParserService', () => {
  let parser: BankParserService;
  let tokenizer: NarrationTokenizerService;

  beforeEach(() => {
    tokenizer = new NarrationTokenizerService();
    parser = new BankParserService(tokenizer);
  });

  it('should parse CSV bank statement and verify running balance continuity', async () => {
    const csvContent = `Date,Narration,Chq/Ref No,Withdrawal (Dr),Deposit (Cr),Balance
01/10/2026,NEFT-N12345678901-TATA MOTORS,N12345678901,,150000.00,1400000.00
03/10/2026,UPI/428394829104/OFFICE EXPENSES,428394829104,2500.00,,1397500.00
05/10/2026,GST ON BANK CHARGES,CHG001,177.00,,1397323.00`;

    const buffer = Buffer.from(csvContent, 'utf-8');
    const result = await parser.parseStatement(buffer, 'bank_statement_oct2026.csv');

    expect(result.totalTransactions).toBe(3);
    expect(result.openingBalance).toBe(1250000.00); // 1400000 - 150000 = 1250000
    expect(result.closingBalance).toBe(1397323.00);
    expect(result.totalCredits).toBe(150000.00);
    expect(result.totalDebits).toBe(2677.00);
    expect(result.isContinuityValid).toBe(true);

    const firstTxn = result.transactions[0];
    expect(firstTxn.paymentMode).toBe('NEFT');
    expect(firstTxn.referenceNumber).toBe('N12345678901');
    expect(firstTxn.extractedPartyName).toBe('TATA MOTORS');
    expect(firstTxn.creditAmount).toBe(150000.00);
    expect(firstTxn.continuityValid).toBe(true);
  });

  it('should flag continuity mismatch when running balance is broken', async () => {
    const brokenCsv = `Date,Narration,Chq/Ref No,Withdrawal (Dr),Deposit (Cr),Balance
01/10/2026,NEFT-N12345678901-TATA MOTORS,N12345678901,,1000.00,1000.00
02/10/2026,CHQ CLG / 000452 / ABC CORP,000452,500.00,,900.00`; // Balance should be 500, but says 900

    const buffer = Buffer.from(brokenCsv, 'utf-8');
    const result = await parser.parseStatement(buffer, 'broken_statement.csv');

    expect(result.totalTransactions).toBe(2);
    expect(result.isContinuityValid).toBe(false);
    expect(result.transactions[1].continuityValid).toBe(false);
  });

  it('should detect HDFC Bank statement and extract account & IFSC metadata', async () => {
    const hdfcCsv = `HDFC BANK LTD - ACCOUNT STATEMENT
Customer Name: RELIANCE RETAIL VENTURES
Account Number: 50200012345678
IFSC Code: HDFC0000123
Branch: FORT MUMBAI

Date,Narration,Chq/Ref No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
01/11/2026,UPI-982148124912-PAYMENT,982148124912,01/11/2026,,50000.00,1050000.00
02/11/2026,NEFT-N294829104-VENDOR,N294829104,02/11/2026,12000.00,,1038000.00`;

    const buffer = Buffer.from(hdfcCsv, 'utf-8');
    const result = await parser.parseStatement(buffer, 'hdfc_current_account.csv');

    expect(result.bankDetected).toBe('HDFC Bank');
    expect(result.accountNumber).toBe('50200012345678');
    expect(result.ifscCode).toBe('HDFC0000123');
    expect(result.totalTransactions).toBe(2);
    expect(result.isContinuityValid).toBe(true);
  });

  it('should detect SBI format and parse Txn Date & Description', async () => {
    const sbiCsv = `STATE BANK OF INDIA
Account No : 00000038492019482
IFSC : SBIN0000456

Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance
10-Nov-2026,10-Nov-2026,TRANSFER TO 984128492,TRANSFER,5000.00,,45000.00
11-Nov-2026,11-Nov-2026,INWARD RTGS PAYMENT,RTGS001,,25000.00,70000.00`;

    const buffer = Buffer.from(sbiCsv, 'utf-8');
    const result = await parser.parseStatement(buffer, 'sbi_statement.csv');

    expect(result.bankDetected).toBe('State Bank of India');
    expect(result.accountNumber).toBe('00000038492019482');
    expect(result.totalTransactions).toBe(2);
    expect(result.isContinuityValid).toBe(true);
  });

  it('should parse single amount column with Cr/Dr indicator', async () => {
    const kotakCsv = `Transaction Date,Narration,Chq / Ref No,Amount,Dr / Cr,Balance
05/11/2026,SALARY CREDIT,REF1001,40000.00,CR,80000.00
06/11/2026,ELECTRICITY BILL,REF1002,3000.00,DR,77000.00`;

    const buffer = Buffer.from(kotakCsv, 'utf-8');
    const result = await parser.parseStatement(buffer, 'kotak_statement.csv');

    expect(result.totalTransactions).toBe(2);
    expect(result.transactions[0].creditAmount).toBe(40000.00);
    expect(result.transactions[0].debitAmount).toBe(0);
    expect(result.transactions[1].debitAmount).toBe(3000.00);
    expect(result.transactions[1].creditAmount).toBe(0);
    expect(result.isContinuityValid).toBe(true);
  });
});
