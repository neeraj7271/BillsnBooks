import { test, expect } from '@playwright/test';
import { API_URL, loginAsSeededAdmin, getAuthHeaders, trackConsoleAndPageErrors } from './helpers/session';

test.describe('Phase 1: Reports, Equilibrium & Sharing (Headed)', () => {
  test.setTimeout(180_000);

  test('Reports hub, TB & Balance Sheet equilibrium, P&L, GL, Sales, Audit, Export XLSX, and Share Token', async ({ page }) => {
    const errors = trackConsoleAndPageErrors(page);
    await loginAsSeededAdmin(page);
    const { token, tenantId, companyId } = await getAuthHeaders(page);
    const hdrs = { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId };

    // 1. Reports Hub (/reports)
    await page.goto('/reports', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Trial Balance').first()).toBeVisible();

    // 2. Trial Balance (/reports/trial-balance) + API equilibrium check
    await page.goto('/reports/trial-balance', { waitUntil: 'networkidle' });
    await expect(page.locator('text=/Trial Balance/i').first()).toBeVisible();
    const tbRes = await fetch(`${API_URL}/companies/${companyId}/reports/trial-balance`, { headers: hdrs });
    expect(tbRes.status).toBe(200);
    const tbJson: any = await tbRes.json();
    const tb = tbJson.data ?? tbJson;
    expect(tb.isBalanced).toBe(true);
    expect(Math.abs(Number(tb.totalClosingDebit) - Number(tb.totalClosingCredit))).toBeLessThan(0.01);

    // 3. Balance Sheet (/reports/balance-sheet) + Assets = Liabilities + Equity
    await page.goto('/reports/balance-sheet', { waitUntil: 'networkidle' });
    await expect(page.locator('text=/Balance Sheet/i').first()).toBeVisible();
    const bsRes = await fetch(`${API_URL}/companies/${companyId}/reports/balance-sheet`, { headers: hdrs });
    expect(bsRes.status).toBe(200);
    const bsJson: any = await bsRes.json();
    const bs = bsJson.data ?? bsJson;
    expect(bs.isBalanced).toBe(true);
    expect(Math.abs(Number(bs.variance || 0))).toBeLessThan(0.01);

    // 4. P&L, General Ledger, Customer Sales, Item Sales, Expenses, Payables, Cash-Bank Audit
    for (const route of [
      '/reports/profit-and-loss',
      '/reports/general-ledger',
      '/reports/customer-sales',
      '/reports/item-sales',
      '/reports/expenses',
      '/reports/payables',
      '/reports/cash-bank-audit',
    ]) {
      await page.goto(route, { waitUntil: 'networkidle' });
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    }

    // 5. Export XLSX check
    const expRes = await fetch(`${API_URL}/companies/${companyId}/reports/TRIAL_BALANCE/export?format=xlsx`, {
      headers: hdrs,
    });
    expect(expRes.status).toBe(200);
    const buf = await expRes.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(1000);

    // 6. Share Token generation & public /reports/shared/[token] render
    const shareRes = await fetch(`${API_URL}/companies/${companyId}/reports/TRIAL_BALANCE/share`, {
      method: 'POST',
      headers: { ...hdrs, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresInDays: 7, format: 'PDF' }),
    });
    expect(shareRes.status).toBeLessThan(300);
    const shareJson: any = await shareRes.json();
    const shareData = shareJson.data ?? shareJson;
    expect(shareData.token).toMatch(/^rpt_/);

    await page.goto(`/reports/shared/${shareData.token}`, { waitUntil: 'networkidle' });
    await expect(page.locator('text=/Trial Balance/i').first()).toBeVisible({ timeout: 10000 });

    expect(errors).toEqual([]);
  });
});
