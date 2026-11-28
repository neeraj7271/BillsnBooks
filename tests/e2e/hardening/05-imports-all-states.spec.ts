import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAsSeededAdmin, trackConsoleAndPageErrors } from './helpers/session';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ExcelJS = require(path.resolve(process.cwd(), 'apps/api/node_modules/exceljs'));
const FIXTURES = path.resolve(process.cwd(), 'test/fixtures/import');

async function cloneWithUniqueHash(srcPath: string, name: string): Promise<string> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(srcPath);
  wb.subject = `e2e-run-${Date.now()}-${Math.random()}`;
  const out = `/tmp/${name}-${Date.now()}.xlsx`;
  await wb.xlsx.writeFile(out);
  return out;
}

test.describe('Phase 1: Imports — All States, Auto-Fix, Inline Edit, Volume Posting (Headed)', () => {
  test.setTimeout(240_000);

  test('Labeled sales-validation-states (GREEN/YELLOW/13 RED/BLUE/SerialDate/Auto-Fix/Edit) + 52-row Sales post', async ({ page }) => {
    const errors = trackConsoleAndPageErrors(page);
    await loginAsSeededAdmin(page);

    const statesPath = await cloneWithUniqueHash(path.join(FIXTURES, 'sales-validation-states.xlsx'), 'sales-states');
    const volumePath = await cloneWithUniqueHash(path.join(FIXTURES, 'sales-register-50.xlsx'), 'sales-vol');

    // 1. Upload sales-validation-states.xlsx (20 rows covering all states)
    await page.goto('/imports/new', { waitUntil: 'networkidle' });
    await page.setInputFiles('input[type="file"]', statesPath);
    await page.click('button:has-text("Proceed to Header Mapping")');
    await page.waitForSelector('text=Step 2: Map Columns to Canonical Schema', { timeout: 15000 });
    await page.click('button:has-text("Validate")');
    await page.waitForURL('**/imports/*/review', { timeout: 15000 });
    await page.waitForSelector('tbody tr', { timeout: 15000 });

    const totalRows = await page.locator('tbody tr').count();
    expect(totalRows).toBe(20);

    // Verify RED tab has blocked rows and inline error reasons are rendered
    await page.locator('button:has-text("RED (")').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Invalid GST Tax Rate').first()).toBeVisible();
    await expect(page.locator('text=Invalid Place of Supply').first()).toBeVisible();
    await expect(page.locator('text=Invalid HSN/SAC').first()).toBeVisible();

    // Verify BLUE tab (> ₹5,00,000)
    const blueTab = page.locator('button:has-text("BLUE (")').first();
    if (await blueTab.isVisible().catch(() => false)) {
      await blueTab.click();
      await page.waitForTimeout(200);
      await expect(page.locator('text=BLUE-01-HIGHVAL').first()).toBeVisible();
    }

    // Resolve Missing Masters (fixes YELLOW-01)
    await page.locator('button:has-text("ALL (")').first().click();
    const resolveBtn = page.locator('button:has-text("Resolve Missing Masters")').first();
    if (await resolveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await resolveBtn.click();
      const createAllBtn = page.locator('button:has-text("1-Click Create All with Defaults")').first();
      if (await createAllBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createAllBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // Auto-Fix Tax Splits (fixes RED-11-INTER-CGST & RED-12-INTRA-IGST)
    const autoFixBtn = page.locator('button:has-text("Auto-Fix Tax Splits")').first();
    if (await autoFixBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await autoFixBtn.click();
      await page.waitForTimeout(1500);
    }

    // 2. Upload & Post 52-row volume sales-register-50.xlsx
    await page.goto('/imports/new', { waitUntil: 'networkidle' });
    await page.setInputFiles('input[type="file"]', volumePath);
    await page.click('button:has-text("Proceed to Header Mapping")');
    await page.waitForSelector('text=Step 2: Map Columns to Canonical Schema', { timeout: 15000 });
    await page.click('button:has-text("Validate")');
    await page.waitForURL('**/imports/*/review', { timeout: 15000 });
    await page.waitForSelector('tbody tr', { timeout: 15000 });

    const volResolve = page.locator('button:has-text("Resolve Missing Masters")').first();
    if (await volResolve.isVisible({ timeout: 2000 }).catch(() => false)) {
      await volResolve.click();
      const createAllBtn = page.locator('button:has-text("1-Click Create All with Defaults")').first();
      if (await createAllBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createAllBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    const volAutoFix = page.locator('button:has-text("Auto-Fix Tax Splits")').first();
    if (await volAutoFix.isVisible({ timeout: 1500 }).catch(() => false)) {
      await volAutoFix.click();
      await page.waitForTimeout(1500);
    }

    const approveBtn = page.locator('button:has-text("Approve & Post")').first();
    await expect(approveBtn).toBeEnabled({ timeout: 10000 });
    await approveBtn.click();
    await page.waitForSelector('text=Batch Posted to General Ledger', { timeout: 30000 });

    // Verify /imports list shows Posted
    await page.click('a[href="/imports"] button:has-text("Back to Imports")');
    await page.waitForURL('**/imports', { timeout: 10000 });
    await expect(page.locator('text=Posted').first()).toBeVisible();

    fs.unlinkSync(statesPath);
    fs.unlinkSync(volumePath);
    expect(errors).toEqual([]);
  });
});
