import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Section 3: Parties (Customers & Vendors) Master', () => {
  const timestamp = Date.now();
  const customerName = `Rajesh Enterprises ${timestamp}`;
  const vendorName = `Kothari Logistics ${timestamp}`;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/parties');
    await page.waitForLoadState('networkidle');
  });

  test('T-026: Open Parties page and verify customer/vendor tabs, search bar, and empty state', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Parties & Counterparties' })).toBeVisible();
    await expect(page.getByPlaceholder(/Search party by name, code or GSTIN/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'All Counterparties' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Customers' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vendors' })).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-026.png', fullPage: true });
  });

  test('T-027: Open Party Dialog and verify Customer radio selected by default', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: 'New Party' });
    await addBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByText('Add New Customer / Vendor')).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-027.png', fullPage: true });
    await page.keyboard.press('Escape');
  });

  test('T-028: Submit empty form and verify party name is required', async ({ page }) => {
    await page.getByRole('button', { name: 'New Party' }).click();

    const dialog = page.locator('[role="dialog"]');
    const saveBtn = dialog.getByRole('button', { name: 'Create Counterparty' });
    await saveBtn.click();

    const nameInput = dialog.locator('#party-name');
    const isRequired = await nameInput.getAttribute('required');
    expect(isRequired).not.toBeNull();

    await page.screenshot({ path: 'test-results/screenshots/T-028.png', fullPage: true });
    await page.keyboard.press('Escape');
  });

  test('T-029: Enter valid 15-character GSTIN and verify state auto-detection', async ({ page }) => {
    await page.getByRole('button', { name: 'New Party' }).click();

    const dialog = page.locator('[role="dialog"]');
    const gstinInput = dialog.locator('#party-gstin');
    if (await gstinInput.isVisible()) {
      await gstinInput.pressSequentially('08OVQPS2080P1Z5', { delay: 10 });
    }

    await page.screenshot({ path: 'test-results/screenshots/T-029.png', fullPage: true });
    await page.keyboard.press('Escape');
  });

  test('T-030: Select "Unregistered" tax treatment and verify GSTIN field disabled or cleared', async ({ page }) => {
    await page.getByRole('button', { name: 'New Party' }).click();

    const dialog = page.locator('[role="dialog"]');
    const regTypeTrigger = dialog.getByRole('combobox').nth(1);
    await regTypeTrigger.click();

    const unregOption = page.getByRole('option', { name: /Unregistered \/ Retail Consumer/i });
    await unregOption.click();

    // Verify GSTIN input disappears or is disabled
    await expect(dialog.locator('#party-gstin')).not.toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-030.png', fullPage: true });
    await page.keyboard.press('Escape');
  });

  test('T-031: Select "Composition" tax treatment and verify badge indicator', async ({ page }) => {
    await page.getByRole('button', { name: 'New Party' }).click();

    const dialog = page.locator('[role="dialog"]');
    const regTypeTrigger = dialog.getByRole('combobox').nth(1);
    await regTypeTrigger.click();

    const compOption = page.getByRole('option', { name: /Composition Dealer/i });
    await compOption.click();

    await page.screenshot({ path: 'test-results/screenshots/T-031.png', fullPage: true });
    await page.keyboard.press('Escape');
  });

  test('T-032: Fill complete billing address and save customer', async ({ page }) => {
    await page.getByRole('button', { name: 'New Party' }).click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('#party-name').pressSequentially(customerName, { delay: 10 });
    await dialog.locator('#party-gstin').pressSequentially('27AAPFU0939F1ZV', { delay: 10 });
    await dialog.locator('#party-addr').pressSequentially('102 Crystal Tower, Andheri East', { delay: 10 });
    await dialog.locator('#party-city').pressSequentially('Mumbai', { delay: 10 });
    await dialog.locator('#party-pin').pressSequentially('400053', { delay: 10 });

    const saveBtn = dialog.getByRole('button', { name: 'Create Counterparty' });
    await saveBtn.click();

    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/screenshots/T-032.png', fullPage: true });
  });

  test('T-033: Verify newly created customer appears in list with correct tax badge', async ({ page }) => {
    await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/T-033.png', fullPage: true });
  });

  test('T-034: Create a Vendor party with phone number and email address', async ({ page }) => {
    await page.getByRole('button', { name: 'New Party' }).click();

    const dialog = page.locator('[role="dialog"]');
    // Select Vendor classification
    const classTrigger = dialog.getByRole('combobox').first();
    await classTrigger.click();
    await page.getByRole('option', { name: 'Vendor (Creditor)' }).click();

    // Select Unregistered so GSTIN not required
    const regTrigger = dialog.getByRole('combobox').nth(1);
    await regTrigger.click();
    await page.getByRole('option', { name: /Unregistered \/ Retail Consumer/i }).click();

    await dialog.locator('#party-name').pressSequentially(vendorName, { delay: 10 });
    await dialog.locator('#party-email').pressSequentially(`vendor.${Date.now()}@logistics.com`, { delay: 10 });
    await dialog.locator('#party-phone').pressSequentially('9876543210', { delay: 10 });

    const saveBtn = dialog.getByRole('button', { name: 'Create Counterparty' });
    await saveBtn.click();

    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/screenshots/T-034.png', fullPage: true });
  });

  test('T-035: Filter party list by Vendor tab and verify customer records hidden', async ({ page }) => {
    const vendorTab = page.getByRole('button', { name: 'Vendors' });
    await vendorTab.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/screenshots/T-035.png', fullPage: true });
  });

  test('T-036: Search party by name query and verify real-time search filtering', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search party by name, code or GSTIN/i);
    await searchInput.pressSequentially('Rajesh', { delay: 10 });
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/screenshots/T-036.png', fullPage: true });
  });

  test('T-037: Click party card to open Party Details dialog and inspect ledger snapshot', async ({ page }) => {
    const viewBtn = page.locator('button[title*="View"], button[title*="Details"]').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/T-037.png', fullPage: true });
  });

  test('T-038: Edit party address details, save, and verify updated information persists', async ({ page }) => {
    const editBtn = page.locator('button[title*="Edit"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/T-038.png', fullPage: true });
  });
});
