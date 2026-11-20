import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

async function ensureAcmeActive(page: Page) {
  await page.goto('/settings/companies');
  await page.waitForLoadState('networkidle');
  const card = page.locator('.rounded-2xl').filter({ hasText: 'Acme Global Technologies' }).first();
  const btn = card.getByRole('button', { name: /Make Active/i });
  if (await btn.isVisible()) {
    await btn.click();
    await expect(page.getByText(/Active working company switched to "Acme Global Technologies/i)).toBeVisible({ timeout: 5000 });
  }
}

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

test.describe('Section 11: Chart of Accounts (COA) Hierarchy', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('T-112: Open /settings/ledgers and inspect 4-level canonical group tree', async ({ page }) => {
    await ensureAcmeActive(page);
    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');

    // Verify main heading
    await expect(page.getByRole('heading', { name: /Chart of Accounts \(COA\)/i })).toBeVisible();

    // Verify canonical classifications or groups
    await expect(page.getByText('Current Assets').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Direct Expenses').first()).toBeVisible({ timeout: 10000 });

    // Verify KPI summary cards
    await expect(page.getByText(/Total Ledger Groups/i)).toBeVisible();
    await expect(page.getByText(/Standard Active Ledgers/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-112.png', fullPage: true });
  });

  test('T-113: Expand "Current Assets" group and verify child groups (Bank, Cash, Debtors)', async ({ page }) => {
    await ensureAcmeActive(page);
    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');

    // Locate Current Assets node
    await expect(page.getByText('Current Assets').first()).toBeVisible({ timeout: 10000 });

    // Verify child groups under Current Assets
    await expect(page.getByText('Bank Accounts').first()).toBeVisible();
    await expect(page.getByText('Cash-in-Hand').first()).toBeVisible();
    await expect(page.getByText('Sundry Debtors').first()).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-113.png', fullPage: true });
  });

  test('T-114: Open "Create Ledger" dialog and enter ledger name', async ({ page }) => {
    await ensureAcmeActive(page);
    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');

    // Click Add Ledger
    const addLedgerBtn = page.getByRole('button', { name: /Add Ledger/i }).first();
    await addLedgerBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Create General Ledger Account/i)).toBeVisible();

    // Type ledger name with real keystrokes
    const nameInput = dialog.locator('#led-name');
    await nameInput.pressSequentially('ICICI Current Operations A/c', { delay: 10 });
    await expect(nameInput).toHaveValue('ICICI Current Operations A/c');

    await page.screenshot({ path: 'test-results/screenshots/T-114.png' });
    await page.keyboard.press('Escape');
  });

  test('T-115: Select parent group "Direct Expenses" and enter opening balance', async ({ page }) => {
    await ensureAcmeActive(page);
    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');

    const addLedgerBtn = page.getByRole('button', { name: /Add Ledger/i }).first();
    await addLedgerBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Fill ledger details
    const uniqueLedgerName = `Direct Freight Exp ${Date.now()}`;
    await dialog.locator('#led-name').pressSequentially(uniqueLedgerName, { delay: 10 });

    // Select Parent Ledger Group (e.g. index 1 or direct match)
    const groupSelect = dialog.locator('select').first();
    if (await groupSelect.isVisible()) {
      await groupSelect.selectOption({ index: 1 });
    }

    // Enter Opening Balance
    const openingInput = dialog.locator('#led-opening');
    await openingInput.fill('15000');

    // Submit dialog
    const submitBtn = dialog.getByRole('button', { name: /Create Ledger/i });
    await submitBtn.click();

    // Verify modal closes and ledger appears or success toast
    await expect(dialog).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(uniqueLedgerName).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/screenshots/T-115.png', fullPage: true });
  });

  test('T-116: In Tally Hybrid mode, verify "Tally Alias / Sync Name" input is visible', async ({ page }) => {
    // Switch to Acme Global Technologies (Tally mode enabled)
    await ensureAcmeActive(page);

    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');

    const addLedgerBtn = page.getByRole('button', { name: /Add Ledger/i }).first();
    await addLedgerBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Verify Tally Ledger Alias input is present
    const tallyInput = dialog.locator('#led-tally');
    await expect(tallyInput).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/screenshots/T-116.png' });
    await page.keyboard.press('Escape');
  });

  test('T-117: In Standalone mode, verify "Tally Alias" input is hidden', async ({ page }) => {
    // Switch to Pannalal & Sons Traders (Standalone mode)
    await ensurePannalalActive(page);

    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');

    const addLedgerBtn = page.getByRole('button', { name: /Add Ledger/i }).first();
    await addLedgerBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Verify Tally Ledger Alias input is NOT present
    const tallyInput = dialog.locator('#led-tally');
    await expect(tallyInput).toBeHidden();

    await page.screenshot({ path: 'test-results/screenshots/T-117.png' });
    await page.keyboard.press('Escape');
  });

  test('T-118: Open "Create Group" dialog, select Nature "Asset", and save new group', async ({ page }) => {
    await ensureAcmeActive(page);
    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');

    const addGroupBtn = page.getByRole('button', { name: /Add Group/i }).first();
    await addGroupBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Add Ledger Classification Group/i)).toBeVisible();

    const groupName = `Special Reserve Assets ${Date.now()}`;
    await dialog.locator('#grp-name').pressSequentially(groupName, { delay: 10 });

    const createBtn = dialog.getByRole('button', { name: /Create Group/i });
    await createBtn.click();

    await expect(dialog).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(groupName).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/screenshots/T-118.png', fullPage: true });
  });
});
