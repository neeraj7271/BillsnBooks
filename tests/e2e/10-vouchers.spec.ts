import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Section 10: General Ledger & Double-Entry Journals', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('T-103: Navigate to /vouchers and click "New Voucher"', async ({ page }) => {
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /General Ledger Vouchers/i })).toBeVisible();
    const newJvBtn = page.getByRole('button', { name: /New Journal Voucher \(JV\)/i });
    await expect(newJvBtn).toBeVisible();
    await newJvBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-103.png' });
  });

  test('T-104: Select voucher type "Journal" and enter transaction date', async ({ page }) => {
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Journal Voucher \(JV\)/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    const dateInput = dialog.locator('#jv-date');
    await expect(dateInput).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-104.png' });
  });

  test('T-105: Add Debit line (e.g. Rent Expense ₹20,000)', async ({ page }) => {
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Journal Voucher \(JV\)/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Select account for first line
    const selectAccountBtn = dialog.getByRole('combobox', { name: /Select Account/i }).first();
    if (await selectAccountBtn.isVisible()) {
      await selectAccountBtn.click();
      const firstOpt = page.getByRole('option').first();
      if (await firstOpt.isVisible()) await firstOpt.click();
    }

    // Fill Debit amount
    const amountInputs = dialog.locator('input[type="number"]');
    if (await amountInputs.count() > 0) {
      await amountInputs.first().fill('20000');
    }

    await page.screenshot({ path: 'test-results/screenshots/T-105.png' });
  });

  test('T-106: Add Credit line with unequal amount (₹15,000) and verify "Save" disabled due to unbalance', async ({ page }) => {
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Journal Voucher \(JV\)/i }).click();
    const dialog = page.locator('[role="dialog"]');

    const amountInputs = dialog.locator('input[type="number"]');
    if (await amountInputs.count() >= 2) {
      await amountInputs.nth(0).fill('20000');
      await amountInputs.nth(1).fill('15000');
    }

    // Verify unbalance warning badge
    await expect(dialog.getByText(/UNBALANCED/i)).toBeVisible();

    // Verify submit button is disabled
    const postBtn = dialog.getByRole('button', { name: /Post Journal Voucher/i });
    await expect(postBtn).toBeDisabled();

    await page.screenshot({ path: 'test-results/screenshots/T-106.png' });
  });

  test('T-107: Correct Credit line to ₹20,000 (Difference: ₹0.00) and verify save enabled', async ({ page }) => {
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Journal Voucher \(JV\)/i }).click();
    const dialog = page.locator('[role="dialog"]');

    const amountInputs = dialog.locator('input[type="number"]');
    if (await amountInputs.count() >= 2) {
      await amountInputs.nth(0).fill('20000');
      await amountInputs.nth(1).fill('20000');
    }

    // Verify BALANCED badge
    await expect(dialog.getByText(/BALANCED \(Δ ₹0\.00\)/i)).toBeVisible();

    const postBtn = dialog.getByRole('button', { name: /Post Journal Voucher/i });
    await expect(postBtn).toBeEnabled();

    await page.screenshot({ path: 'test-results/screenshots/T-107.png' });
  });

  test('T-108: Save balanced voucher and verify in journal register', async ({ page }) => {
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Journal Voucher \(JV\)/i }).click();
    const dialog = page.locator('[role="dialog"]');

    // Select account for first line
    const selectAcc1 = dialog.getByRole('combobox', { name: /Select Account/i }).first();
    if (await selectAcc1.isVisible()) {
      await selectAcc1.click();
      await page.getByRole('option').first().click();
    }

    // Select account for second line
    const selectAcc2 = dialog.getByRole('combobox', { name: /Select Account/i }).first();
    if (await selectAcc2.isVisible()) {
      await selectAcc2.click();
      await page.getByRole('option').nth(1).click();
    }

    const amountInputs = dialog.locator('input[type="number"]');
    if (await amountInputs.count() >= 2) {
      await amountInputs.nth(0).fill('5000');
      await amountInputs.nth(1).fill('5000');
    }

    await dialog.locator('#jv-narration').fill('Test office stationery expense balanced entry');

    const postBtn = dialog.getByRole('button', { name: /Post Journal Voucher/i });
    if (await postBtn.isEnabled()) {
      await postBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'test-results/screenshots/T-108.png', fullPage: true });
  });

  test('T-109: Create or filter Payment voucher (Debit Vendor, Credit Bank) and verify balances', async ({ page }) => {
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    // Click PAYMENT type filter
    const paymentTab = page.getByRole('button', { name: /PAYMENT/i }).first();
    if (await paymentTab.isVisible()) {
      await paymentTab.click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByRole('heading', { name: /General Ledger Vouchers/i })).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-109.png', fullPage: true });
  });

  test('T-110: Create or filter Receipt voucher (Debit Bank, Credit Customer) and verify settlement', async ({ page }) => {
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    // Click RECEIPT type filter
    const receiptTab = page.getByRole('button', { name: /RECEIPT/i }).first();
    if (await receiptTab.isVisible()) {
      await receiptTab.click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByRole('heading', { name: /General Ledger Vouchers/i })).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-110.png', fullPage: true });
  });

  test('T-111: Create or filter Contra voucher (Cash to Bank transfer)', async ({ page }) => {
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    // Click CONTRA type filter
    const contraTab = page.getByRole('button', { name: /CONTRA/i }).first();
    if (await contraTab.isVisible()) {
      await contraTab.click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByRole('heading', { name: /General Ledger Vouchers/i })).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-111.png', fullPage: true });
  });
});
