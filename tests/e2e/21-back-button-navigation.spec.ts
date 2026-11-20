import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Section 21: Enhanced Back Navigation & History Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('E2E-NAV-01: Navigate from Reports hub into General Ledger and verify Back button returns to previous page', async ({ page }) => {
    // 1. Start on Reports Hub
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // 2. Click into General Ledger from the catalog
    const glLink = page.locator('a[href="/reports/general-ledger"]').first();
    await glLink.click();
    await page.waitForLoadState('networkidle');

    // Verify on General Ledger page
    await expect(page).toHaveURL(/\/reports\/general-ledger/);
    await expect(page.getByRole('heading', { name: /General Ledger Account Statement/i })).toBeVisible();

    // Verify Page Header Back Button is present
    const pageBackBtn = page.locator('button[title*="Go back to previous page"]').first();
    await expect(pageBackBtn).toBeVisible();

    // 3. Click the Back button
    await pageBackBtn.click();
    await page.waitForLoadState('networkidle');

    // Verify returned to /reports
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole('heading', { name: /Reports & Business Intelligence/i })).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/E2E-NAV-01.png', fullPage: true });
  });

  test('E2E-NAV-02: Test top navbar Back button across multiple pages', async ({ page }) => {
    // 1. Start on Reports Hub
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // 2. Go to Customer Sales
    const csLink = page.locator('a[href="/reports/customer-sales"]').first();
    await csLink.click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/reports\/customer-sales/);

    // 3. Click the navbar Back button
    const navbarBackBtn = page.locator('header button[aria-label="Go back to previous page"]');
    await expect(navbarBackBtn).toBeVisible();
    await navbarBackBtn.click();
    await page.waitForLoadState('networkidle');

    // Verify returned to /reports
    await expect(page).toHaveURL(/\/reports$/);

    await page.screenshot({ path: 'test-results/screenshots/E2E-NAV-02.png', fullPage: true });
  });

  test('E2E-NAV-03: Interactive breadcrumb navigation on General Ledger', async ({ page }) => {
    // Go directly to General Ledger
    await page.goto('/reports/general-ledger');
    await page.waitForLoadState('networkidle');

    // Check breadcrumb Reports link
    const breadcrumbReportsLink = page.locator('header a[href="/reports"]');
    await expect(breadcrumbReportsLink).toBeVisible();
    await breadcrumbReportsLink.click();
    await page.waitForLoadState('networkidle');

    // Verify navigated to /reports
    await expect(page).toHaveURL(/\/reports$/);

    await page.screenshot({ path: 'test-results/screenshots/E2E-NAV-03.png', fullPage: true });
  });

  test('E2E-NAV-04: Cross-module history retention - navigating from Vouchers to General Ledger and clicking Back', async ({ page }) => {
    // Start on Vouchers module
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/vouchers$/);

    // Navigate to General Ledger
    await page.goto('/reports/general-ledger');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/reports\/general-ledger/);

    // Click Back button - should return user straight to /vouchers without having to restart from scratch
    const pageBackBtn = page.locator('button[title*="Go back to previous page"]').first();
    await pageBackBtn.click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/vouchers$/);
    await page.screenshot({ path: 'test-results/screenshots/E2E-NAV-04.png', fullPage: true });
  });
});
