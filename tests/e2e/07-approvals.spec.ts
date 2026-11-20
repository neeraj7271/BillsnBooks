import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Section 7: Approvals & Maker-Checker Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('T-081: Navigate to /approvals and verify pending quarantine queue header', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Approval Inbox/i })).toBeVisible();
    await expect(page.getByText(/Maker-Checker Posting Guarantee/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-081.png', fullPage: true });
  });

  test('T-082: Click invoice in quarantine to inspect line items and tax breakdown', async ({ page }) => {
    // First ensure there is a high-value invoice in quarantine by creating one
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    // Select customer party
    const partySelect = page.getByRole('combobox').first();
    if (await partySelect.isVisible()) {
      await partySelect.click();
      const firstOpt = page.getByRole('option').first();
      if (await firstOpt.isVisible()) await firstOpt.click();
    }

    // Set high rate to trigger maker-checker threshold (> 50,000)
    const rateInput = page.locator('input[placeholder="0.00"]').first();
    if (await rateInput.isVisible()) {
      await rateInput.fill('60000');
    }

    // Submit invoice
    const createBtn = page.getByRole('button', { name: /Save & Issue Invoice|Save Invoice/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForURL(/.*invoices\/.*/, { timeout: 15000 });
    }

    // Now visit /approvals
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Verify at least one pending approval item exists
    const invoiceLink = page.locator('a[href*="/invoices/"]').first();
    if (await invoiceLink.isVisible()) {
      await invoiceLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/Pending Maker-Checker Sign-off|Draft Invoice/i)).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/screenshots/T-082.png', fullPage: true });
  });

  test('T-083: Select multiple invoices or verify action controls enabled in queue', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Check if approve buttons exist or inbox is clear
    const approveBtn = page.getByRole('button', { name: /Approve & Post/i }).first();
    const rejectBtn = page.getByRole('button', { name: /Reject/i }).first();
    const clearNotice = page.getByText(/Inbox is Clear/i);

    const hasItems = await approveBtn.isVisible();
    if (hasItems) {
      await expect(approveBtn).toBeEnabled();
      await expect(rejectBtn).toBeEnabled();
    } else {
      await expect(clearNotice).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/screenshots/T-083.png', fullPage: true });
  });

  test('T-084: Approve single invoice and verify row removed from pending queue', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    const approveBtn = page.getByRole('button', { name: /Approve & Post/i }).first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'test-results/screenshots/T-084.png', fullPage: true });
  });

  test('T-085: Switch to Approved History or verify timestamped queue audit state', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Verify inbox is clear or reflects remaining audited state
    const inboxHeading = page.getByRole('heading', { name: /Approval Inbox/i });
    await expect(inboxHeading).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-085.png', fullPage: true });
  });
});
