import { test, expect } from '@playwright/test';
import * as path from 'path';
import { Client } from 'pg';
import { loginAsAdmin } from './helpers/auth';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'screenshots');

async function resetSettingsData() {
  const client = new Client({ host: 'localhost', user: 'neeraj', database: 'accounting_platform' });
  try {
    await client.connect();
    await client.query("DELETE FROM numbering_series WHERE series_code = 'INV26'");
    await client.query('UPDATE accounting_periods SET is_locked = false WHERE is_locked = true');
  } catch (err) {
    console.error('Error resetting settings data:', err);
  } finally {
    await client.end();
  }
}

test.describe('Section 15: Global Settings, Numbering, Periods & Branding (T-152 to T-163)', () => {
  test.beforeAll(async () => {
    await resetSettingsData();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('T-152: Global Settings Overview & Modules Directory', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: /Global System Configuration/i });
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Verify presence of quick navigation and module cards
    await expect(page.getByText('Single pane of glass summarizing all system-wide parameters')).toBeVisible();
    await expect(page.getByText('Visual Module Cards')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-152.png'), fullPage: true });
  });

  test('T-153 to T-155: Numbering Sequences Configuration & Save', async ({ page }) => {
    // T-153: Navigate to /settings/numbering and inspect current invoice sequence
    await page.goto('/settings/numbering');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: /Document Numbering & Sequences/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Statutory GST Numbering Invariant/i)).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-153.png'), fullPage: true });

    // T-154: Open create series dialog and update prefix / format
    const newSeriesBtn = page.getByRole('button', { name: /New Numbering Series/i });
    await expect(newSeriesBtn).toBeVisible();
    await newSeriesBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /Create New Document Numbering Series/i })).toBeVisible();

    // Fill Series Code
    const seriesCodeInput = dialog.locator('#series-code');
    await seriesCodeInput.fill('INV26');

    // Fill Format Pattern
    const patternInput = dialog.locator('#format-pattern');
    await patternInput.fill('INV-26-27-{SEQ}');

    // Fill Sequence Padding
    const paddingInput = dialog.locator('#seq-pad');
    await paddingInput.fill('4');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-154.png') });

    // T-155: Save numbering configuration and verify series appears in table
    const saveBtn = dialog.getByRole('button', { name: /Save Series/i });
    await saveBtn.click();

    await expect(dialog).toBeHidden({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify series code and format pattern in table
    await expect(page.getByText('INV26').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('INV-26-27-{SEQ}').first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-155.png'), fullPage: true });
  });

  test('T-156 to T-159: Invoice Branding, DSC Configuration & UPI Payment Handle', async ({ page }) => {
    // T-156: Navigate to /settings/invoice-branding and inspect form
    await page.goto('/settings/invoice-branding');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: /Invoice Branding & Print Settings/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-156.png'), fullPage: true });

    // T-157: Upload or verify logo container
    await expect(page.getByRole('button', { name: /Upload Logo File/i })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-157.png') });

    // T-158: Configure DSC Authorised Signatory name, designation, and certificate details
    const dscToggle = page.getByRole('button', { name: /Digital Signature Certificate \(DSC\)/i });
    await dscToggle.click();

    const dscNameInput = page.getByPlaceholder(/e\.g\. Rajesh Kumar/i);
    await dscNameInput.fill('Rajesh Kumar CA');

    const dscDesigInput = page.getByPlaceholder(/Managing Director \/ Partner/i);
    await dscDesigInput.fill('Managing Partner & Signatory');

    const dscCertInput = page.getByPlaceholder(/Class 3 Organizational - eMudhra CA|Valid 2026-2028/i);
    if (await dscCertInput.isVisible()) {
      await dscCertInput.fill('Class-3 Digital Signature Certificate - eMudhra CA');
    }

    // Verify DSC stamp live preview updates
    await expect(page.getByText(/Digitally Signed by Rajesh Kumar CA/i)).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-158.png') });

    // T-159: Configure default UPI payment VPA handle and default terms
    const upiInput = page.getByPlaceholder(/acme@hdfcbank|paytm/i);
    await upiInput.fill('pannalal.traders@okhdfcbank');

    // Save All Settings
    const saveAllBtn = page.getByRole('button', { name: /Save All Settings/i }).first();
    await saveAllBtn.click();

    // Verify Settings Saved indicator
    await expect(page.getByText('Settings Saved')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-159.png'), fullPage: true });
  });

  test('T-160 to T-162: Financial Year Period Locks & Rejection of Retroactive Entry', async ({ page }) => {
    // T-160: Navigate to /settings/periods and inspect financial year periods
    await page.goto('/settings/periods');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: /Accounting Period Locks & Month-End Closing/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-160.png'), fullPage: true });

    // T-161: Lock a period (e.g. May 2026) and verify lock status
    const mayRow = page.locator('tr').filter({ hasText: 'May 2026' }).first();
    const lockBtn = mayRow.getByRole('button', { name: /Lock Month/i });
    await expect(lockBtn).toBeVisible({ timeout: 10000 });
    await lockBtn.click();

    await expect(page.getByText(/is now locked against retroactive voucher entry/i)).toBeVisible({ timeout: 10000 });
    await expect(mayRow.getByText('LOCKED', { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-161.png'), fullPage: true });

    // T-162: Attempt to post voucher dated in locked period (2026-05-15) and verify rejection
    const res = await page.request.post('http://localhost:4000/v1/companies/4d2845cd-4179-4aa3-9d24-cbdfd80ccf2b/vouchers', {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'e221a4bf-a35e-44af-945c-37163bb2c468',
        'x-user-id': 'b0000000-0000-4000-8000-000000000001',
      },
      data: {
        branchId: '3e46f351-fce0-4fe5-9c6e-b20fbbb83d74',
        financialYearId: 'ce1ffb0b-6b93-44e5-99cd-1a2b3e616494',
        voucherType: 'JOURNAL',
        voucherDate: '2026-05-15',
        narration: 'Backdated entry attempt into locked period',
        entries: [],
      },
    });

    // Rejection should be 400 Bad Request with period locked message
    expect(res.status()).toBe(400);
    const json = await res.json();
    const msg = json.error?.message || json.message;
    expect(msg).toMatch(/is locked/i);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-162.png') });

    // Unlock period to restore state
    const unlockBtn = mayRow.getByRole('button', { name: /Unlock Month/i });
    if (await unlockBtn.isVisible()) {
      await unlockBtn.click();
      await expect(page.getByText(/has been reopened/i)).toBeVisible({ timeout: 10000 });
      await expect(mayRow.getByText('OPEN', { exact: true })).toBeVisible();
    }
  });

  test('T-163: Raw Settings Inspector & Key-Value Overrides Persistence', async ({ page }) => {
    // Navigate to /settings and switch to Raw Key-Value tab
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const tabBtn = page.getByRole('button', { name: /All System Keys & Audit/i });
    await expect(tabBtn).toBeVisible({ timeout: 10000 });
    await tabBtn.click();

    // Search for branding.signature_type
    const searchInput = page.getByPlaceholder(/Search keys, categories, values/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('branding.signature_type');

    // Verify row displays the updated DSC value
    await expect(page.getByText('branding.signature_type')).toBeVisible();
    await expect(page.getByText('DSC')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-163.png'), fullPage: true });
  });
});
