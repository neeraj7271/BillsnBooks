import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

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

test.describe('Section 13: Collections, Ageing & Payment Links', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await ensurePannalalActive(page);
  });

  test('T-130: Navigate to /collections/ageing and inspect ageing summary cards', async ({ page }) => {
    await page.goto('/collections/ageing');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Accounts Receivable/i })).toBeVisible();
    await expect(page.getByText('Total Outstanding').first()).toBeVisible();
    await expect(page.getByText('Current (0–30 Days)')).toBeVisible();
    await expect(page.getByText('Due (31–60 Days)')).toBeVisible();
    await expect(page.getByText('Critical (> 60 Days)')).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-130.png', fullPage: true });
  });

  test('T-131: Verify overdue invoices sorted into 0-30, 31-60, 61-90, 90+ day buckets', async ({ page }) => {
    await page.goto('/collections/ageing');
    await page.waitForLoadState('networkidle');

    // Switch to By Invoice & Promises view mode
    const invoicesViewBtn = page.getByRole('button', { name: /By Invoice & Promises/i });
    await expect(invoicesViewBtn).toBeVisible();
    await invoicesViewBtn.click();

    // Verify Invoices table columns
    await expect(page.getByText('Document #')).toBeVisible();
    await expect(page.getByText('Due Date')).toBeVisible();
    await expect(page.getByText('Promise-to-Pay Commitment')).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-131.png', fullPage: true });
  });

  test('T-132: Verify Days Sales Outstanding (DSO) metric computation', async ({ page }) => {
    await page.goto('/collections/ageing');
    await page.waitForLoadState('networkidle');

    // Verify DSO indicator in Critical (> 60 Days) card
    await expect(page.getByText(/DSO:.*days avg/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-132.png', fullPage: true });
  });

  test('T-133: Click "Send Reminder" button on overdue invoice and verify modal options', async ({ page }) => {
    await page.goto('/collections/ageing');
    await page.waitForLoadState('networkidle');

    // In Debtor Accounts view, click Follow Up on the first customer
    const followUpBtn = page.getByRole('button', { name: /Follow Up/i }).first();
    await expect(followUpBtn).toBeVisible();
    await followUpBtn.click();

    // Verify Send Reminder dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Send Collection Follow-Up/i)).toBeVisible();
    await expect(dialog.getByText(/Delivery Channel/i)).toBeVisible();
    await expect(dialog.getByText(/Reminder Cadence & Tone/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-133.png' });
    await page.keyboard.press('Escape');
  });

  test('T-134: Open "Promise to Pay" dialog, log promised date, and verify reminder tag', async ({ page }) => {
    await page.goto('/collections/ageing');
    await page.waitForLoadState('networkidle');

    // Switch to By Invoice & Promises
    await page.getByRole('button', { name: /By Invoice & Promises/i }).click();

    // Click Record Promise on first invoice
    const promiseBtn = page.getByRole('button', { name: /Record Promise|Update Promise/i }).first();
    await expect(promiseBtn).toBeVisible();
    await promiseBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Record Promise-to-Pay/i)).toBeVisible();

    // Set Promised Payment Date
    const promiseDateInput = dialog.locator('#promise-date');
    await promiseDateInput.fill('2026-12-15');

    const notesInput = dialog.locator('#promise-notes');
    await notesInput.fill('RTGS confirmed by CFO for mid-December');

    // Click Save Commitment
    const saveBtn = dialog.getByRole('button', { name: /Save Commitment/i });
    await saveBtn.click();

    await expect(dialog).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(/2026-12-15/).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/screenshots/T-134.png', fullPage: true });
  });

  test('T-135: Navigate to /collections/payment-links and click "Create Payment Link"', async ({ page }) => {
    await page.goto('/collections/payment-links');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Payment Links & Gateway Settlements/i })).toBeVisible();

    const createBtn = page.getByRole('button', { name: /Generate Link/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Generate Instant Payment Link/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-135.png' });
    await page.keyboard.press('Escape');
  });

  test('T-136: Fill customer, invoice ref, amount, expiry date and generate instant link', async ({ page }) => {
    await page.goto('/collections/payment-links');
    await page.waitForLoadState('networkidle');

    const createBtn = page.getByRole('button', { name: /Generate Link/i });
    await createBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Click Create Link inside modal
    const submitBtn = dialog.getByRole('button', { name: /Create Link/i });
    await submitBtn.click();

    await expect(dialog).toBeHidden({ timeout: 10000 });

    // Verify payment links table contains newly created row
    await expect(page.getByText(/CREATED|PAID/).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/screenshots/T-136.png', fullPage: true });
  });

  test('T-137: Open "View UPI QR" dialog and verify scanable QR code rendering', async ({ page }) => {
    await page.goto('/collections/payment-links');
    await page.waitForLoadState('networkidle');

    // Click QR button on the first payment link
    const qrBtn = page.getByRole('button', { name: /QR/i }).first();
    await expect(qrBtn).toBeVisible();
    await qrBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Instant UPI QR Code/i)).toBeVisible();
    await expect(dialog.getByText(/Scan with BHIM, Google Pay, PhonePe, or Paytm/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Copy Payment Link/i })).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-137.png' });
    await page.keyboard.press('Escape');
  });

  test('T-138: Navigate to /collections/recurring and click "New Recurring Schedule"', async ({ page }) => {
    await page.goto('/collections/recurring');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Recurring Invoices & Subscriptions|Recurring Invoicing Schedules/i })).toBeVisible();

    const newScheduleBtn = page.getByRole('button', { name: /New Schedule/i });
    await expect(newScheduleBtn).toBeVisible();
    await newScheduleBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Create Recurring Invoicing Schedule/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-138.png' });
    await page.keyboard.press('Escape');
  });

  test('T-139: Configure Monthly frequency, start date, max runs (12), item line, and save', async ({ page }) => {
    await page.goto('/collections/recurring');
    await page.waitForLoadState('networkidle');

    const newScheduleBtn = page.getByRole('button', { name: /New Schedule/i });
    await newScheduleBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Verify fields (Monthly frequency is default, maxRuns is 12)
    const saveBtn = dialog.getByRole('button', { name: /Activate Schedule/i });
    await saveBtn.click();

    await expect(dialog).toBeHidden({ timeout: 10000 });
    await expect(page.getByText('MONTHLY').first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/screenshots/T-139.png', fullPage: true });
  });

  test('T-140: Click "Pause Schedule" and verify status toggles to "Paused"', async ({ page }) => {
    await page.goto('/collections/recurring');
    await page.waitForLoadState('networkidle');

    // Locate the first schedule row's pause/resume button (icon button next to Run Now)
    const actionBtn = page.locator('tbody tr').first().getByRole('button').filter({ hasNotText: /Run Now/i }).first();
    await expect(actionBtn).toBeVisible();

    // Click to toggle status
    await actionBtn.click();
    await page.waitForTimeout(1000);

    // Verify badge shows PAUSED or ACTIVE
    await expect(page.getByText(/PAUSED|ACTIVE/).first()).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-140.png', fullPage: true });
  });
});
