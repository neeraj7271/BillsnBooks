import { test, expect } from '../helpers/zero-error-fixture';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const API_BASE = 'http://localhost:4000';
const PDF_DIR = path.resolve(process.cwd(), 'docs/report-pdfs');

const ALL_28_REPORTS = [
  'CUSTOMER_SALES',
  'ITEM_SALES',
  'AR_AGEING',
  'TRIAL_BALANCE',
  'PROFIT_LOSS',
  'BALANCE_SHEET',
  'GENERAL_LEDGER',
  'BRS_STATEMENT',
  'EXPENSES_MONTHLY',
  'EXPENSES_VENDOR',
  'EXPENSES_CATEGORY',
  'EXPENSES_REGISTER',
  'PURCHASES_ITEM',
  'CASH_NEGATIVE',
  'BANK_NEGATIVE',
  'INTER_BANK',
  'CASH_WITHDRAWALS',
  'CASH_DEPOSITS',
  'CASH_EXPENSES',
  'CASH_PAYMENTS_OVER_10K',
  'CASH_RECEIPTS_OVER_2L',
  'PAYABLES_SUMMARY',
  'PAYABLES_AGEING',
  'ADVANCE_TO_VENDORS',
  'LEDGERS_MISSING_PAN',
  'LEDGERS_MISSING_GSTIN',
  'LEDGERS_SQUARED_OFF',
  'LEDGERS_STAGNANT',
];

const SAMPLE_SAVE_KEYS = new Set([
  'TRIAL_BALANCE',
  'PROFIT_LOSS',
  'BALANCE_SHEET',
  'CUSTOMER_SALES',
  'AR_AGEING',
  'GENERAL_LEDGER',
]);

async function loginAs(page: any, email: string) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole('button', { name: /^Sign In$/i }).click();
  await page.waitForURL((u: URL) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });
  await page.evaluate((cid: string) => {
    localStorage.setItem('antigravity_active_company_id', cid);
  }, CO1_ID);
}

test.describe('Part C: Professional Server-Side Report PDFs', () => {
  test.setTimeout(120_000);

  test.beforeAll(() => {
    fs.mkdirSync(PDF_DIR, { recursive: true });
  });

  test('C.1 All 28 reports export real application/pdf buffers with %PDF magic header', async ({ page, request }) => {
    await loginAs(page, PARTNER_EMAIL);
    const token = await page.evaluate(() => localStorage.getItem('antigravity_access_token'));
    expect(token).toBeTruthy();

    for (const reportKey of ALL_28_REPORTS) {
      const res = await request.get(
        `${API_BASE}/v1/companies/${CO1_ID}/reports/${reportKey}/export?format=pdf&fromDate=2024-04-01&toDate=2026-11-30`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(res.status(), `PDF export failed for ${reportKey}`).toBe(200);
      expect(res.headers()['content-type']).toContain('application/pdf');
      const body = await res.body();
      expect(body.subarray(0, 5).toString('utf8')).toBe('%PDF-');
      expect(body.length).toBeGreaterThan(5000);

      if (SAMPLE_SAVE_KEYS.has(reportKey)) {
        fs.writeFileSync(path.join(PDF_DIR, `${reportKey.toLowerCase()}.pdf`), body);
      }
    }
  });

  test('C.2 UI Print/PDF button on Trial Balance & Balance Sheet downloads real PDF', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/reports/trial-balance');
    await page.waitForLoadState('networkidle');
    const dl1Promise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Print \/ PDF/i }).first().click();
    const dl1 = await dl1Promise;
    expect(dl1.suggestedFilename()).toMatch(/\.pdf$/i);

    await page.goto('/reports/balance-sheet');
    await page.waitForLoadState('networkidle');
    const dl2Promise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Print \/ PDF/i }).first().click();
    const dl2 = await dl2Promise;
    expect(dl2.suggestedFilename()).toMatch(/\.pdf$/i);
  });
});
