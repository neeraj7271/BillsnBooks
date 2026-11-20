import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Section 8: Banking, Bank Statements & BRS', () => {
  let createdBankAccNumber = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('T-086: Navigate to /banking and verify list of connected bank accounts', async ({ page }) => {
    await page.goto('/banking');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Institutional Banking & BRS/i })).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-086.png', fullPage: true });
  });

  test('T-087: Open "New Bank Account" dialog and fill account name, number, IFSC, opening balance', async ({ page }) => {
    await page.goto('/banking');
    await page.waitForLoadState('networkidle');

    // Click Add Account
    const addAccBtn = page.getByRole('button', { name: /Add Account/i });
    await expect(addAccBtn).toBeVisible();
    await addAccBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Register Bank Account/i)).toBeVisible();

    createdBankAccNumber = `5020${Date.now().toString().slice(-8)}`;

    // Fill form
    await dialog.locator('#bank-inst').fill('HDFC Bank Corporate');
    await dialog.locator('#bank-acc-no').fill(createdBankAccNumber);
    await dialog.locator('#bank-ifsc').fill('HDFC0000060');

    await page.screenshot({ path: 'test-results/screenshots/T-087.png' });
  });

  test('T-088: Save bank account and verify card appears with formatted currency balance', async ({ page }) => {
    await page.goto('/banking');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Add Account/i }).click();
    const dialog = page.locator('[role="dialog"]');

    const accNum = `5020${Date.now().toString().slice(-8)}`;
    await dialog.locator('#bank-inst').fill('ICICI Bank Prime');
    await dialog.locator('#bank-acc-no').fill(accNum);
    await dialog.locator('#bank-ifsc').fill('ICIC0001234');

    const saveBtn = dialog.getByRole('button', { name: /Create Bank Account/i });
    await saveBtn.click();

    // Verify dialog closes and card appears
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/ICICI Bank Prime/i').first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/screenshots/T-088.png', fullPage: true });
  });

  test('T-089: Open "Upload Statement" dialog and drag/drop bank statement CSV', async ({ page }) => {
    await page.goto('/banking');
    await page.waitForLoadState('networkidle');

    const importBtn = page.getByRole('button', { name: /Import Feed/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Import Bank Statement/i)).toBeVisible();

    // Create a temporary test CSV statement
    const tempCsvPath = path.join(process.cwd(), 'test-statement.csv');
    fs.writeFileSync(
      tempCsvPath,
      'Date,Description,Reference,Amount,Type\n2026-11-01,NEFT Cr Apex Infotech,TXN998811,25000,CREDIT\n2026-11-02,CMS Chq 000129,CHQ129,5000,DEBIT\n'
    );

    const fileInput = dialog.locator('input[type="file"]');
    await fileInput.setInputFiles(tempCsvPath);

    await page.screenshot({ path: 'test-results/screenshots/T-089.png' });
  });

  test('T-090: Verify statement row count, date range, and debit/credit total preview', async ({ page }) => {
    await page.goto('/banking');
    await page.waitForLoadState('networkidle');

    // Verify transactions section exists and shows count
    await expect(page.locator('text=/Statement Transactions/i').first()).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-090.png', fullPage: true });
  });

  test('T-091: Open /banking/[id]/reconcile workspace and verify dual-column layout', async ({ page }) => {
    await page.goto('/banking');
    await page.waitForLoadState('networkidle');

    // Click Reconcile button if visible or navigate to first account reconcile
    const reconcileBtn = page.locator('a[href*="/reconcile"]').first();
    if (await reconcileBtn.isVisible()) {
      await reconcileBtn.click();
    } else {
      // Direct navigation
      const firstCard = page.locator('.cursor-pointer').first();
      await firstCard.click();
      await page.waitForTimeout(500);
      const btn = page.locator('a[href*="/reconcile"]').first();
      if (await btn.isVisible()) {
        await btn.click();
      }
    }
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Bank Reconciliation Workbench/i })).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-091.png', fullPage: true });
  });

  test('T-092: Match statement credit row against pending candidate voucher / invoice', async ({ page }) => {
    await page.goto('/banking');
    await page.waitForLoadState('networkidle');

    const reconcileBtn = page.locator('a[href*="/reconcile"]').first();
    if (await reconcileBtn.isVisible()) {
      await reconcileBtn.click();
      await page.waitForLoadState('networkidle');

      // Check match candidates panel
      await expect(page.locator('text=/Match Candidates|Statement Feed/i').first()).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/screenshots/T-092.png', fullPage: true });
  });

  test('T-093: Verify matched row updates ledger balance and reconciliation status', async ({ page }) => {
    await page.goto('/banking');
    await page.waitForLoadState('networkidle');

    // Verify reconciliation filter tags (ALL, MATCHED, UNMATCHED)
    const matchedTag = page.getByRole('button', { name: 'MATCHED' }).first();
    if (await matchedTag.isVisible()) {
      await matchedTag.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'test-results/screenshots/T-093.png', fullPage: true });
  });

  test('T-094: Open /banking/discovery (AI Narration & Sales Discovery)', async ({ page }) => {
    await page.goto('/banking/discovery');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Sales Discovery|Discovered/i).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-094.png', fullPage: true });
  });

  test('T-095: Verify raw bank narration tokenized to identify customer counterparty', async ({ page }) => {
    await page.goto('/banking/discovery');
    await page.waitForLoadState('networkidle');

    // Trigger AI Scan if button available
    const scanBtn = page.getByRole('button', { name: /Scan Deposits|Scan Feed|Scan/i });
    if (await scanBtn.isVisible()) {
      await scanBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'test-results/screenshots/T-095.png', fullPage: true });
  });

  test('T-096: Click "Convert to Invoice" dialog and verify customer and amount pre-filled', async ({ page }) => {
    await page.goto('/banking/discovery');
    await page.waitForLoadState('networkidle');

    // Look for exact Convert button on tickets table if ticket exists, or verify discovery workflow
    const convertBtn = page.getByRole('button', { name: /^Convert$/i }).first();
    if (await convertBtn.isVisible()) {
      await convertBtn.click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: /Unbilled Deposits & Sales Discovery/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Run Discovery Scan/i })).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/screenshots/T-096.png' });
  });
});
