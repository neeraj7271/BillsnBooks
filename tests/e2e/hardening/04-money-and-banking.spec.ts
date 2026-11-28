import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { API_URL, loginAsSeededAdmin, getAuthHeaders, trackConsoleAndPageErrors } from './helpers/session';

const FIXTURES = path.resolve(process.cwd(), 'test/fixtures');

test.describe('Phase 1: Money, Vouchers, Banking & BRS (Headed)', () => {
  test.setTimeout(180_000);

  test('Manual balanced JV, unbalanced negative, reversal, bank statement 55-row upload, reconcile, and discovery', async ({ page }) => {
    const errors = trackConsoleAndPageErrors(page);
    await loginAsSeededAdmin(page);
    const { token, tenantId, companyId } = await getAuthHeaders(page);
    const hdrs = { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId, 'Content-Type': 'application/json' };

    // Fetch ledgers
    const ledRes = await fetch(`${API_URL}/companies/${companyId}/ledgers`, { headers: hdrs });
    const ledJson: any = await ledRes.json();
    const ledgers = ledJson.data ?? ledJson;
    const bankLedger = ledgers.find((l: any) => l.name.toLowerCase().includes('bank')) || ledgers[0];
    const expenseLedger = ledgers.find((l: any) => l.name.toLowerCase().includes('expense') || l.name.toLowerCase().includes('rent')) || ledgers[1];

    // 1. VOUCHERS (/vouchers)
    await page.goto('/vouchers', { waitUntil: 'networkidle' });
    await page.click('button:has-text("New Journal Voucher")');
    const dlg = page.locator('[role="dialog"]');
    await expect(dlg).toBeVisible();

    // Negative: Unbalanced JV (10000 vs 9500) -> UI shows UNBALANCED and disables submit
    const acctTriggers = dlg.locator('button[aria-label="Select Account..."]');
    await acctTriggers.nth(0).click();
    await page.locator('[role="option"]').nth(0).click();
    await page.waitForTimeout(200);
    await acctTriggers.nth(1).click();
    await page.locator('[role="option"]').nth(1).click();
    await page.waitForTimeout(200);

    const amtInputs = dlg.locator('input[placeholder="Amount ₹"]');
    await amtInputs.nth(0).fill('10000');
    await amtInputs.nth(1).fill('9500');
    await expect(dlg.locator('text=/UNBALANCED/i').first()).toBeVisible({ timeout: 5000 });
    await expect(dlg.locator('button:has-text("Post Journal Voucher")')).toBeDisabled();

    // Fix to balanced 10000 vs 10000 -> submit enabled & posts
    await amtInputs.nth(1).fill('10000');
    await dlg.locator('#jv-narration').fill('Monthly depreciation & bank adjustment');
    const postJvBtn = dlg.locator('button:has-text("Post Journal Voucher")');
    await expect(postJvBtn).toBeEnabled({ timeout: 5000 });
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/vouchers') && r.request().method() === 'POST', { timeout: 10000 }),
      postJvBtn.click(),
    ]);
    await expect(dlg).toBeHidden({ timeout: 10000 });

    // Also verify API-level voucher post & reversal equilibrium
    const fRes = await fetch(`${API_URL}/companies/${companyId}`, { headers: hdrs });
    const fJson: any = await fRes.json();
    const comp = fJson.data ?? fJson;
    const branchId = comp.branches?.[0]?.id;
    const fyId = comp.financialYears?.[0]?.id;

    const vRes = await fetch(`${API_URL}/companies/${companyId}/vouchers`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({
        branchId,
        financialYearId: fyId,
        voucherType: 'JOURNAL',
        voucherDate: '2024-05-10',
        narration: 'Hardening balanced JV',
        entries: [
          { ledgerId: expenseLedger.id, entryType: 'DEBIT', amount: '5000.00' },
          { ledgerId: bankLedger.id, entryType: 'CREDIT', amount: '5000.00' },
        ],
      }),
    });
    expect(vRes.status).toBe(201);
    const vJson: any = await vRes.json();
    const voucherId = (vJson.data ?? vJson).id;

    // Reverse the posted voucher
    const revRes = await fetch(`${API_URL}/companies/${companyId}/vouchers/${voucherId}/reverse`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ reason: 'E2E reversal test' }),
    });
    expect(revRes.status).toBeLessThan(300);

    // 2. BANKING (/banking) — Upload 55-row statement, duplicate rejection, Reconcile & Discovery
    await page.goto('/banking', { waitUntil: 'networkidle' });
    await expect(page.locator('text=/Banking|Accounts/i').first()).toBeVisible();

    const accRes = await fetch(`${API_URL}/banking/accounts`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({
        companyId,
        bankName: 'ICICI Bank Ltd',
        accountNumber: `000405${Date.now().toString().slice(-6)}`,
        ifscCode: 'ICIC0000004',
        accountType: 'CURRENT',
        ledgerId: bankLedger.id,
      }),
    });
    expect(accRes.status).toBeLessThan(300);
    const accJson: any = await accRes.json();
    const accId = (accJson.data ?? accJson).id;

    // Upload 55-row statement
    const stmtBuf = fs.readFileSync(path.join(FIXTURES, 'import/bank-statement-55.xlsx'));
    const stmtForm = new FormData();
    stmtForm.append('file', new Blob([stmtBuf]), 'bank-statement-55.xlsx');
    const upRes = await fetch(`${API_URL}/banking/accounts/${accId}/statement`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
      body: stmtForm,
    });
    expect(upRes.status).toBeLessThan(300);

    // Duplicate upload -> 409 Conflict
    const dupForm = new FormData();
    dupForm.append('file', new Blob([stmtBuf]), 'bank-statement-55.xlsx');
    const dupUp = await fetch(`${API_URL}/banking/accounts/${accId}/statement`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
      body: dupForm,
    });
    expect(dupUp.status).toBe(409);

    // Navigate to Reconcile & Discovery pages
    await page.goto(`/banking/${accId}/reconcile`, { waitUntil: 'networkidle' });
    await expect(page.locator('text=/Reconcil/i').first()).toBeVisible();

    await page.goto('/banking/discovery', { waitUntil: 'networkidle' });
    await expect(page.locator('text=/Discovery/i').first()).toBeVisible();

    expect(errors).toEqual([]);
  });
});
