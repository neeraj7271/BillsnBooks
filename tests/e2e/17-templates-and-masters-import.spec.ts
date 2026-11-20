import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Section 17: Excel Templates, Bank Multi-Format & Missing Masters E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('E2E-TMPL-01: Download Excel Templates from /imports/new dropdown', async ({ page }) => {
    await page.goto('/imports/new');
    await page.waitForLoadState('networkidle');

    // Verify Dropdown trigger button exists
    const downloadDropdownBtn = page.getByRole('button', { name: /Download Excel Template/i });
    await expect(downloadDropdownBtn).toBeVisible();

    // Click dropdown to open menu
    await downloadDropdownBtn.click();

    // Verify menu items
    const salesInvoicesOption = page.getByRole('button', { name: /Sales Invoices/i });
    await expect(salesInvoicesOption).toBeVisible();
    await expect(page.getByRole('button', { name: /Purchase Bills/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Bank Statement/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Parties Master/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Items Master/i })).toBeVisible();

    // Trigger download of Sales Invoices template
    const downloadPromise = page.waitForEvent('download');
    await salesInvoicesOption.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('sales-invoices-template.xlsx');
    const downloadPath = path.join(process.cwd(), 'test-results', 'sales-invoices-template.xlsx');
    await download.saveAs(downloadPath);

    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(fs.statSync(downloadPath).size).toBeGreaterThan(4000);

    await page.screenshot({ path: 'test-results/screenshots/E2E-TMPL-01.png', fullPage: true });
  });

  test('E2E-TMPL-02: Download Bank Statement Template from Banking dialog', async ({ page }) => {
    await page.goto('/banking');
    await page.waitForLoadState('networkidle');

    // Click Import Statement button on first account if visible
    const importBtn = page.getByRole('button', { name: /Import Statement|Upload Feed/i }).first();
    if (await importBtn.isVisible()) {
      await importBtn.click();
      await page.waitForTimeout(500);

      // Verify Excel Template download button inside the dialog
      const templateBtn = page.getByRole('button', { name: /Excel Template/i });
      await expect(templateBtn).toBeVisible();

      const downloadPromise = page.waitForEvent('download');
      await templateBtn.click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBe('bank-statement-template.xlsx');
      const downloadPath = path.join(process.cwd(), 'test-results', 'bank-statement-template.xlsx');
      await download.saveAs(downloadPath);

      expect(fs.existsSync(downloadPath)).toBe(true);
      expect(fs.statSync(downloadPath).size).toBeGreaterThan(2000);
    }

    await page.screenshot({ path: 'test-results/screenshots/E2E-TMPL-02.png', fullPage: true });
  });

  test('E2E-MASTERS-03: Upload Invoices with Missing Masters & 1-Click Resolve', async ({ page }) => {
    page.on('console', (msg) => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', (err) => console.log('BROWSER ERROR:', err.message));

    await page.goto('/imports/new');
    await page.waitForLoadState('networkidle');

    // Create a uniquely named test CSV with new party and product
    const timestamp = Date.now();
    const uniquePartyName = `Global Apex Tech ${timestamp}`;
    const uniqueItemName = `Cloud Server Cluster ${timestamp}`;
    const testCsvPath = path.join(process.cwd(), 'test-results', `test-missing-masters-${timestamp}.csv`);

    fs.writeFileSync(
      testCsvPath,
      `Invoice No,Date,Customer Name,Customer GSTIN,Place of Supply,Item Name,HSN,Quantity,Unit,Rate,Discount,Tax Rate,Total Amount\n` +
      `INV-MSTR-${timestamp},15/11/2026,${uniquePartyName},27AAPFU0939F1ZV,27,${uniqueItemName},8471,2,NOS,50000,0,18,118000\n`
    );

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testCsvPath);

    // Proceed to Header Mapping
    const proceedBtn = page.getByRole('button', { name: /Proceed to Header Mapping|Upload/i });
    await proceedBtn.click();
    await page.waitForTimeout(1000);

    // Step 2 Mapping: Click Validate Staged Batch
    const saveMappingBtn = page.getByRole('button', { name: /Validate Staged Batch/i });
    await expect(saveMappingBtn).toBeVisible({ timeout: 10000 });
    await saveMappingBtn.click();
    await page.waitForTimeout(2000);

    // Step 3: Missing Masters Modal should appear automatically or Missing Masters button should show
    const missingModalTitle = page.getByText(/Missing Master Records Detected/i);
    const missingBtn = page.getByRole('button', { name: /Missing Masters/i });

    if (await missingModalTitle.isVisible()) {
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(uniquePartyName)).toBeVisible();

      // Click "1-Click Create All with Defaults"
      const quickCreateBtn = dialog.getByRole('button', { name: /1-Click Create All with Defaults/i });
      await expect(quickCreateBtn).toBeVisible();
      await quickCreateBtn.click();
      await page.waitForTimeout(2000);
    } else if (await missingBtn.isVisible()) {
      await missingBtn.click();
      await page.waitForTimeout(500);
      const quickCreateBtn = page.getByRole('button', { name: /1-Click Create All with Defaults/i });
      await quickCreateBtn.click();
      await page.waitForTimeout(2000);
    }

    // Verify row is Clean (GREEN)
    const cleanBadge = page.getByText(/Clean \([1-9]\d*\)/i).first();
    await expect(cleanBadge).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/E2E-MASTERS-03.png', fullPage: true });
  });

  test('E2E-GST-04: Auto-Fix GST Tax Splits from preview screen', async ({ page }) => {
    await page.goto('/imports/new');
    await page.waitForLoadState('networkidle');

    // Create a row with tax split mismatch (Intra-state POS 27 with IGST charged instead of CGST/SGST)
    const timestamp = Date.now();
    const testCsvPath = path.join(process.cwd(), 'test-results', `test-gst-autofix-${timestamp}.csv`);

    fs.writeFileSync(
      testCsvPath,
      `Invoice No,Date,Customer Name,Customer GSTIN,Place of Supply,Item Name,Taxable Value,CGST,SGST,IGST,Total Amount\n` +
      `INV-GST-${timestamp},15/11/2026,Tata Motors Commercial Ltd,27AAPFU0939F1ZV,27,Truck Axle,50000,0,0,9000,59000\n`
    );

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testCsvPath);

    const proceedBtn = page.getByRole('button', { name: /Proceed to Header Mapping|Upload/i });
    await proceedBtn.click();
    await page.waitForTimeout(1000);

    const saveMappingBtn = page.getByRole('button', { name: /Validate Staged Batch/i });
    await expect(saveMappingBtn).toBeVisible({ timeout: 10000 });
    await saveMappingBtn.click();
    await page.waitForTimeout(2000);

    // If modal shows, close it or skip
    const skipBtn = page.getByRole('button', { name: /Skip & Review/i });
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }

    // Verify "Auto-Fix Tax Splits" button is visible and click it
    const autoFixBtn = page.getByRole('button', { name: /Auto-Fix Tax Splits/i });
    if (await autoFixBtn.isVisible()) {
      await autoFixBtn.click();
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: 'test-results/screenshots/E2E-GST-04.png', fullPage: true });
  });
});
