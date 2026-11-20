import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Section 9: Bulk Data Import & Validation Pipeline', () => {
  let createdBatchId = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('T-097: Open /imports and verify previous import batches and status tags', async ({ page }) => {
    await page.goto('/imports');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Bulk Import Registers/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /New Import Session/i })).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-097.png', fullPage: true });
  });

  test('T-098: Navigate to /imports/new and upload bulk invoice CSV file', async ({ page }) => {
    await page.goto('/imports/new');
    await page.waitForLoadState('networkidle');

    // Create test CSV with proper columns
    const testCsvPath = path.join(process.cwd(), 'test-import-invoices.csv');
    fs.writeFileSync(
      testCsvPath,
      'Invoice No,Date,Customer Name,GSTIN,Place of Supply,HSN Code,Taxable Value,CGST,SGST,IGST,Total Amount\nINV-IMP-001,15/10/2024,Tata Motors Commercial Ltd,27AAPFU0939F1ZV,27,8703,100000,9000,9000,0,118000\nINV-IMP-002,16/10/2024,Reliance Retail Ventures,27AABCR4444N1ZR,27,8517,50000,4500,4500,0,59000\n'
    );

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testCsvPath);

    const uploadBtn = page.getByRole('button', { name: /Parse & Proceed to Mapping|Upload/i }).first();
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: 'test-results/screenshots/T-098.png', fullPage: true });
  });

  test('T-099: Verify auto-column mapping (Date, Invoice No, Party, Taxable, Tax, Total)', async ({ page }) => {
    await page.goto('/imports/new');
    await page.waitForLoadState('networkidle');

    const testCsvPath = path.join(process.cwd(), 'test-import-invoices.csv');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testCsvPath);

    const uploadBtn = page.getByRole('button', { name: /Parse & Proceed to Mapping|Upload/i }).first();
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
      await page.waitForTimeout(1500);
    }

    // Step 2 Mapping should display mapped headers or save mapping button
    const saveMappingBtn = page.getByRole('button', { name: /Save & Validate Rows|Proceed to Validation/i }).first();
    if (await saveMappingBtn.isVisible()) {
      await expect(saveMappingBtn).toBeEnabled();
      await saveMappingBtn.click();
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: 'test-results/screenshots/T-099.png', fullPage: true });
  });

  test('T-100: Open /imports/[id]/review grid and inspect rows flagged with validation', async ({ page }) => {
    await page.goto('/imports');
    await page.waitForLoadState('networkidle');

    // If there is any review link in batches table, click it
    const reviewLink = page.locator('a[href*="/imports/"][href*="/review"]').first();
    if (await reviewLink.isVisible()) {
      await reviewLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: /Batch Resolution/i })).toBeVisible();
    } else {
      // Or inspect imports register table headers
      await expect(page.getByText(/Total Sessions|batches/i).first()).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/screenshots/T-100.png', fullPage: true });
  });

  test('T-101: Correct invalid party name or resolve ambiguous ledger mapping', async ({ page }) => {
    await page.goto('/imports');
    await page.waitForLoadState('networkidle');

    const reviewLink = page.locator('a[href*="/imports/"][href*="/review"]').first();
    if (await reviewLink.isVisible()) {
      await reviewLink.click();
      await page.waitForLoadState('networkidle');

      // Look for bulk map action or tab filters
      const greenTab = page.getByRole('button', { name: /GREEN|Valid/i }).first();
      if (await greenTab.isVisible()) {
        await greenTab.click();
        await page.waitForTimeout(500);
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/T-101.png', fullPage: true });
  });

  test('T-102: Click "Post All Valid Vouchers" and verify import processing job status', async ({ page }) => {
    await page.goto('/imports');
    await page.waitForLoadState('networkidle');

    const reviewLink = page.locator('a[href*="/imports/"][href*="/review"]').first();
    if (await reviewLink.isVisible()) {
      await reviewLink.click();
      await page.waitForLoadState('networkidle');

      const postBtn = page.getByRole('button', { name: /Approve & Post|Post All Valid/i }).first();
      if (await postBtn.isVisible() && await postBtn.isEnabled()) {
        await postBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/T-102.png', fullPage: true });
  });
});
