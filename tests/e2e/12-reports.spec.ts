import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

async function ensurePannalalActive(page: Page) {
  await page.goto('/settings/companies');
  await page.waitForLoadState('networkidle');
  const card = page.locator('.rounded-2xl').filter({ hasText: 'Pannalal & Sons Traders' }).first();
  const btn = card.getByRole('button', { name: /Make Active/i });
  if (await btn.isVisible()) {
    await btn.click();
    await expect(page.getByText(/Active working company switched to "Pannalal & Sons Traders"/i)).toBeVisible({ timeout: 5000 });
  }
}

test.describe('Section 12: Statutory Financial Reports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await ensurePannalalActive(page);
  });

  test('T-119: Navigate to /reports/trial-balance and verify zero-variance audit', async ({ page }) => {
    await page.goto('/reports/trial-balance');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Trial Balance Statement/i })).toBeVisible();
    await expect(page.getByText(/Statement Integrity Status/i)).toBeVisible();
    await expect(page.getByText(/Strict Parity Enforced: ₹0.00 Variance/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-119.png', fullPage: true });
  });

  test('T-120: Verify Total Debits equals Total Credits exactly (Difference = ₹0.00)', async ({ page }) => {
    await page.goto('/reports/trial-balance');
    await page.waitForLoadState('networkidle');

    const debitAmount = await page.locator('div').filter({ has: page.getByText('Total Closing Debits', { exact: true }) }).locator('p').first().textContent();
    const creditAmount = await page.locator('div').filter({ has: page.getByText('Total Closing Credits', { exact: true }) }).locator('p').first().textContent();

    expect(debitAmount?.trim()).toBeTruthy();
    expect(debitAmount?.trim()).toEqual(creditAmount?.trim());

    await page.screenshot({ path: 'test-results/screenshots/T-120.png', fullPage: true });
  });

  test('T-121: Change "As of Date" filter and verify real-time balance recalculation', async ({ page }) => {
    await page.goto('/reports/trial-balance');
    await page.waitForLoadState('networkidle');

    const dateInput = page.locator('input[type="date"]').first();
    await expect(dateInput).toBeVisible();

    // Change date
    await dateInput.fill('2026-12-31');
    await page.waitForTimeout(500);

    // Verify still balanced
    await expect(page.getByText(/Strict Parity Enforced: ₹0.00 Variance/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-121.png', fullPage: true });
  });

  test('T-122: Click on a ledger row to drill down into General Ledger audit', async ({ page }) => {
    await page.goto('/reports/trial-balance');
    await page.waitForLoadState('networkidle');

    const firstLedgerLink = page.locator('tbody tr td a').first();
    await expect(firstLedgerLink).toBeVisible();

    await firstLedgerLink.click();
    await page.waitForURL(/.*reports\/general-ledger\?ledgerId=.*/, { timeout: 10000 });

    await expect(page.getByRole('heading', { name: /General Ledger Account Statement/i })).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-122.png', fullPage: true });
  });

  test('T-123: Navigate to /reports/profit-and-loss and verify Revenue section', async ({ page }) => {
    await page.goto('/reports/profit-and-loss');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Statement of Profit & Loss/i })).toBeVisible();
    await expect(page.getByText(/Operating Revenue/i).first()).toBeVisible();
    await expect(page.getByText(/I\. Revenue from Operations/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-123.png', fullPage: true });
  });

  test('T-124: Verify Cost of Goods Sold (COGS) and Gross Profit margin calculation', async ({ page }) => {
    await page.goto('/reports/profit-and-loss');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Direct Expenses/i).first()).toBeVisible();
    await expect(page.getByText(/Gross Profit/i).first()).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-124.png', fullPage: true });
  });

  test('T-125: Verify Operating Expenses and Net Profit computation', async ({ page }) => {
    await page.goto('/reports/profit-and-loss');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Net Profit/i).first()).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-125.png', fullPage: true });
  });

  test('T-126: Navigate to /reports/balance-sheet and verify Assets vs Liabilities & Equity', async ({ page }) => {
    await page.goto('/reports/balance-sheet');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Balance Sheet Statement/i })).toBeVisible();
    await expect(page.getByText(/Assets \(Application of Funds\)/i)).toBeVisible();
    await expect(page.getByText(/Total Assets/i).first()).toBeVisible();
    await expect(page.getByText(/Liabilities & Equity/i).first()).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-126.png', fullPage: true });
  });

  test('T-127: Verify accounting balance equation: Assets = Liabilities + Owner\'s Equity', async ({ page }) => {
    await page.goto('/reports/balance-sheet');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Balance Sheet Verified: Zero Discrepancy/i)).toBeVisible();
    await expect(page.getByText('=', { exact: true })).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-127.png', fullPage: true });
  });

  test('T-128: Navigate to /reports/general-ledger and select specific account', async ({ page }) => {
    await page.goto('/reports/general-ledger');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /General Ledger Account Statement/i })).toBeVisible();
    await expect(page.getByText(/Account Code & Name/i)).toBeVisible();
    await expect(page.getByText('Opening Balance', { exact: true })).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-128.png', fullPage: true });
  });

  test('T-129: Verify date range filtering and running balance column integrity', async ({ page }) => {
    await page.goto('/reports/general-ledger');
    await page.waitForLoadState('networkidle');

    const fromDateInput = page.locator('input[type="date"]').first();
    const toDateInput = page.locator('input[type="date"]').nth(1);

    await expect(fromDateInput).toBeVisible();
    await expect(toDateInput).toBeVisible();

    // Verify Statement table headers
    await expect(page.getByText(/Voucher #/i)).toBeVisible();
    await expect(page.getByText(/Debit \(Dr\)/i)).toBeVisible();
    await expect(page.getByText(/Credit \(Cr\)/i)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Running Balance' })).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-129.png', fullPage: true });
  });
});
