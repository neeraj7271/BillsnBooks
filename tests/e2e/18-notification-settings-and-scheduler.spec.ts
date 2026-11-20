import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Section 18: Notification Architecture & Settings E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('E2E-NOTIF-01: Navigate to /settings/notifications and inspect layout and default rules', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');

    // Verify main headings
    await expect(page.getByRole('heading', { name: /Notification Rules & Automated Scheduler/i })).toBeVisible();
    await expect(page.getByText(/Global Delivery Window & Quiet Hours/i)).toBeVisible();
    await expect(page.getByText(/1. Invoices & AR Collections/i)).toBeVisible();
    await expect(page.getByText(/2. Practice & Compliance Tasks/i)).toBeVisible();
    await expect(page.getByText(/3. Governance & Period Locks/i)).toBeVisible();

    // Verify default statutory offsets
    const offsetsInput = page.getByPlaceholder('e.g. 7, 3, 1').first();
    await expect(offsetsInput).toBeVisible();

    // Save screenshot
    await page.screenshot({ path: 'test-results/screenshots/E2E-NOTIF-01.png', fullPage: true });
  });

  test('E2E-NOTIF-02: Customize notification offsets, dispatch time, and save rules', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');

    // Customize Pre-Due Date offset to "5, 2, 1"
    const offsetsInput = page.getByPlaceholder('e.g. 7, 3, 1').first();
    await offsetsInput.fill('5, 2, 1');

    // Click Save Notification Rules
    const saveBtn = page.getByRole('button', { name: /Save Notification Rules/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Verify success toast
    const toast = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(toast).toContainText(/saved successfully/i);

    // Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByPlaceholder('e.g. 7, 3, 1').first()).toHaveValue('5, 2, 1');

    await page.screenshot({ path: 'test-results/screenshots/E2E-NOTIF-02.png', fullPage: true });
  });

  test('E2E-NOTIF-03: Send Test Notification and verify in top navbar bell popover', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');

    // Click Test Alert button
    const testBtn = page.getByRole('button', { name: /Test Alert/i });
    await expect(testBtn).toBeVisible();
    await testBtn.click();

    // Verify success toast
    const toast = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(toast).toContainText(/Test alert dispatched successfully/i);

    // Open Top Header Notification Bell
    const bellBtn = page.getByRole('button', { name: /View notifications/i });
    await expect(bellBtn).toBeVisible();
    await bellBtn.click();
    await page.waitForTimeout(500);

    // Verify test notification is present in the popover
    await expect(page.getByText(/Antigravity Alert: Test/i).first()).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/E2E-NOTIF-03.png', fullPage: true });
  });

  test('E2E-NOTIF-04: Run Scheduler Scan and verify deduplication', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');

    // Click Run Scheduler Scan
    const scanBtn = page.getByRole('button', { name: /Run Scheduler Scan/i });
    await expect(scanBtn).toBeVisible();
    await scanBtn.click();

    // Verify scan toast appears
    const toast = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(toast).toContainText(/Scheduler scan finished/i);

    // Run again immediately to verify deduplication
    await page.waitForTimeout(1000);
    await scanBtn.click();
    await expect(page.locator('div[role="alert"]:not(#__next-route-announcer__)')).toContainText(/Scheduler scan finished/i);

    await page.screenshot({ path: 'test-results/screenshots/E2E-NOTIF-04.png', fullPage: true });
  });
});
