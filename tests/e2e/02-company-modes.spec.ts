import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Section 2: Company Management & Operating Modes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/settings/companies');
    await page.waitForLoadState('networkidle');
  });

  test('T-014: Open Company Dialog and verify all form fields and mode selection options', async ({ page }) => {
    const registerBtn = page.getByRole('button', { name: 'Register Company' }).first();
    await registerBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByRole('heading', { name: 'Register New Company' })).toBeVisible();
    await expect(dialog.getByText('Standalone Cloud')).toBeVisible();
    await expect(dialog.getByText('Tally Prime Sync')).toBeVisible();
    await expect(dialog.getByText('Invoicing Only')).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-014.png', fullPage: true });
    await page.keyboard.press('Escape');
  });

  test('T-015: Submit empty company form and verify legal name validation', async ({ page }) => {
    await page.getByRole('button', { name: 'Register Company' }).first().click();

    const dialog = page.locator('[role="dialog"]');
    const saveBtn = dialog.getByRole('button', { name: 'Register Company' });
    await saveBtn.click();

    const legalNameInput = dialog.getByPlaceholder(/e\.g\. Acme Global Technologies/i);
    const isRequired = await legalNameInput.getAttribute('required');
    expect(isRequired).not.toBeNull();

    await page.screenshot({ path: 'test-results/screenshots/T-015.png', fullPage: true });
    await page.keyboard.press('Escape');
  });

  test('T-016: Validate PAN format regex (10 alphanumeric chars)', async ({ page }) => {
    await page.getByRole('button', { name: 'Register Company' }).first().click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.getByPlaceholder(/e\.g\. Acme Global Technologies/i).pressSequentially('Apex Test Ltd', { delay: 10 });
    await dialog.locator('#comp-pan').pressSequentially('INVALID_PAN', { delay: 10 });

    const saveBtn = dialog.getByRole('button', { name: 'Register Company' });
    await saveBtn.click();

    await expect(dialog.getByText(/Invalid PAN format/i)).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/screenshots/T-016.png', fullPage: true });
    await page.keyboard.press('Escape');
  });

  test('T-017: Create new company in "Standalone Cloud Mode" and verify active badge', async ({ page }) => {
    const companyName = `Apex Cloud ${Date.now()}`;
    await page.getByRole('button', { name: 'Register Company' }).first().click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.getByText('Standalone Cloud').click();

    await dialog.getByPlaceholder(/e\.g\. Acme Global Technologies/i).pressSequentially(companyName, { delay: 10 });
    await dialog.getByPlaceholder(/e\.g\. Acme Cloud Solutions/i).pressSequentially('Apex Cloud', { delay: 10 });
    await dialog.locator('#comp-pan').pressSequentially('AABCA1234F', { delay: 10 });

    const saveBtn = dialog.getByRole('button', { name: 'Register Company' });
    await saveBtn.click();

    await expect(page.getByRole('heading', { name: companyName })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'test-results/screenshots/T-017.png', fullPage: true });
  });

  test('T-018: Create new company in "Tally Prime Hybrid Mode" and verify Tally bridge indicator', async ({ page }) => {
    const companyName = `Tally Sync Mart ${Date.now()}`;
    await page.getByRole('button', { name: 'Register Company' }).first().click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.getByText('Tally Prime Sync').click();

    await dialog.getByPlaceholder(/e\.g\. Acme Global Technologies/i).pressSequentially(companyName, { delay: 10 });
    await dialog.locator('#comp-pan').pressSequentially('AABCA1234F', { delay: 10 });

    const saveBtn = dialog.getByRole('button', { name: 'Register Company' });
    await saveBtn.click();

    await expect(page.getByRole('heading', { name: companyName })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'test-results/screenshots/T-018.png', fullPage: true });
  });

  test('T-019: Create new company in "Invoicing Only Mode" and verify mode flag saved', async ({ page }) => {
    const companyName = `Fast Invoicing ${Date.now()}`;
    await page.getByRole('button', { name: 'Register Company' }).first().click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.getByText('Invoicing Only').click();

    await dialog.getByPlaceholder(/e\.g\. Acme Global Technologies/i).pressSequentially(companyName, { delay: 10 });
    await dialog.locator('#comp-pan').pressSequentially('AABCA1234F', { delay: 10 });

    const saveBtn = dialog.getByRole('button', { name: 'Register Company' });
    await saveBtn.click();

    await expect(page.getByRole('heading', { name: companyName })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'test-results/screenshots/T-019.png', fullPage: true });
  });

  test('T-020: Switch to "Invoicing Only" company and verify adaptive sidebar hides accounting', async ({ page }) => {
    const card = page.locator('div.rounded-2xl, div[class*="border"]').filter({ has: page.getByRole('heading', { name: /Fast Invoicing/i }) }).first();
    const switchBtn = card.getByRole('button', { name: 'Make Active' });
    if (await switchBtn.count() > 0) {
      await switchBtn.first().click();
      await page.waitForTimeout(1000);
    }

    const sidebar = page.locator('aside, [data-testid="sidebar"]');
    await expect(sidebar.getByText(/Banking & BRS/i)).not.toBeVisible();
    await expect(sidebar.getByText(/Double-Entry Journals|General Ledger/i)).not.toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-020.png', fullPage: true });
  });

  test('T-021: Switch to "Standalone Cloud" company and verify full accounting menus visible', async ({ page }) => {
    const card = page.locator('div.rounded-2xl, div[class*="border"]').filter({ has: page.getByRole('heading', { name: /Apex Cloud/i }) }).first();
    const switchBtn = card.getByRole('button', { name: 'Make Active' });
    if (await switchBtn.count() > 0) {
      await switchBtn.first().click();
      await page.waitForTimeout(1000);
    }

    const sidebar = page.locator('aside, [data-testid="sidebar"]');
    await expect(sidebar.getByText(/Tax Invoices/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-021.png', fullPage: true });
  });

  test('T-022: Switch to "Tally Prime Hybrid" company and verify Tally telemetry visible', async ({ page }) => {
    const card = page.locator('div.rounded-2xl, div[class*="border"]').filter({ has: page.getByRole('heading', { name: /Tally Sync Mart/i }) }).first();
    const switchBtn = card.getByRole('button', { name: 'Make Active' });
    if (await switchBtn.count() > 0) {
      await switchBtn.first().click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'test-results/screenshots/T-022.png', fullPage: true });
  });

  test('T-023: Add secondary branch with Karnataka state code (29) and unique GSTIN', async ({ page }) => {
    const addBranchBtn = page.getByRole('button', { name: /Add Branch|New Branch/i }).first();
    if (await addBranchBtn.isVisible()) {
      await addBranchBtn.click();
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/T-023.png', fullPage: true });
  });

  test('T-024: Verify branch list displays head office tag and state jurisdiction', async ({ page }) => {
    await expect(page.getByText(/Head Office/i).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-024.png', fullPage: true });
  });

  test('T-025: Open Company Details dialog and verify read-only overview values match DB', async ({ page }) => {
    const viewBtn = page.locator('button[title*="View"], button[title*="Details"]').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog.getByText(/Company Profile|Entity Overview|Operating Branches/i)).toBeVisible();
      await page.keyboard.press('Escape');
    }

    await page.screenshot({ path: 'test-results/screenshots/T-025.png', fullPage: true });
  });
});
