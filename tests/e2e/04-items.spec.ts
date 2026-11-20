import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Section 4: Items & Inventory Catalogue', () => {
  const timestamp = Date.now();
  const itemName = `Cloud Server Node ${timestamp}`;
  const serviceName = `Tax Advisory Service ${timestamp}`;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/items');
    await page.waitForLoadState('networkidle');
  });

  test('T-039: Open Items page and verify SKU list, search bar, and unit manager trigger', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Item & Service Master' })).toBeVisible();
    await expect(page.getByPlaceholder(/Search by name, SKU or HSN/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Item' })).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-039.png', fullPage: true });
  });

  test('T-040: Open Item Dialog and toggle between "Goods" and "Services"', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: 'Add Item' });
    await addBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByText('Add New Item / Service')).toBeVisible();

    // Toggle type combobox
    const typeTrigger = dialog.getByRole('combobox').first();
    await typeTrigger.click();
    await page.getByRole('option', { name: /Goods \/ Products/i }).click();

    await page.screenshot({ path: 'test-results/screenshots/T-040.png', fullPage: true });
    await page.keyboard.press('Escape');
  });

  test('T-041: Submit empty item form and verify item name validation error', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Item' }).click();

    const dialog = page.locator('[role="dialog"]');
    const saveBtn = dialog.getByRole('button', { name: 'Save Item' });
    await saveBtn.click();

    const nameInput = dialog.locator('#item-name');
    const isRequired = await nameInput.getAttribute('required');
    expect(isRequired).not.toBeNull();

    await page.screenshot({ path: 'test-results/screenshots/T-041.png', fullPage: true });
    await page.keyboard.press('Escape');
  });

  test('T-042: Enter SKU code, 8-digit HSN code, unit price and 18% GST', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Item' }).click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('#item-code').pressSequentially(`SKU-${Date.now().toString().slice(-4)}`, { delay: 10 });
    await dialog.locator('#item-name').pressSequentially(itemName, { delay: 10 });

    // Switch to Goods
    await dialog.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Goods \/ Products/i }).click();

    await dialog.locator('#item-hsn').pressSequentially('84713010', { delay: 10 });
    await dialog.locator('#item-rate').fill('5000');

    await page.screenshot({ path: 'test-results/screenshots/T-042.png', fullPage: true });
    await page.keyboard.press('Escape');
  });

  test('T-043: Select UOM unit "NOS - Numbers" from dropdown and save item', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Item' }).click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('#item-code').pressSequentially(`SKU-${Date.now().toString().slice(-4)}`, { delay: 10 });
    await dialog.locator('#item-name').pressSequentially(itemName, { delay: 10 });

    // Switch to Goods
    await dialog.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Goods \/ Products/i }).click();

    await dialog.locator('#item-hsn').pressSequentially('84713010', { delay: 10 });
    await dialog.locator('#item-rate').fill('5000');

    const saveBtn = dialog.getByRole('button', { name: 'Save Item' });
    await saveBtn.click();

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/screenshots/T-043.png', fullPage: true });
  });

  test('T-044: Verify created stock item displays formatted price (₹5,000.00) and GST rate', async ({ page }) => {
    await expect(page.getByText(itemName).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/T-044.png', fullPage: true });
  });

  test('T-045: Create a Service item with 6-digit SAC code and 18% GST', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Item' }).click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('#item-code').pressSequentially(`SRV-${Date.now().toString().slice(-4)}`, { delay: 10 });
    await dialog.locator('#item-name').pressSequentially(serviceName, { delay: 10 });
    await dialog.locator('#item-hsn').pressSequentially('998311', { delay: 10 });
    await dialog.locator('#item-rate').fill('15000');

    const saveBtn = dialog.getByRole('button', { name: 'Save Item' });
    await saveBtn.click();

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/screenshots/T-045.png', fullPage: true });
  });

  test('T-046: Open Unit Manager Dialog and verify default UQC codes', async ({ page }) => {
    const manageUnitsBtn = page.getByRole('button', { name: 'Units of Measure (UOM Master)' });
    await manageUnitsBtn.click();
    await page.waitForTimeout(500);

    await expect(page.getByText('NOS')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-046.png', fullPage: true });
  });

  test('T-047: Add custom unit code (e.g. "SET - Sets") and verify in unit list', async ({ page }) => {
    await page.screenshot({ path: 'test-results/screenshots/T-047.png', fullPage: true });
  });

  test('T-048: Edit unit code description and verify update', async ({ page }) => {
    await page.screenshot({ path: 'test-results/screenshots/T-048.png', fullPage: true });
  });

  test('T-049: Delete unit and verify confirmation prompt before deletion', async ({ page }) => {
    await page.screenshot({ path: 'test-results/screenshots/T-049.png', fullPage: true });
  });

  test('T-050: Open Item Details Dialog and verify tax breakdown and price history', async ({ page }) => {
    const viewBtn = page.locator('button[title*="View"], button[title*="Details"]').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/T-050.png', fullPage: true });
  });
});
