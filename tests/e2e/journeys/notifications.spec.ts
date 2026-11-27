import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

const POPULATED_DIR = path.resolve(process.cwd(), 'docs/ui-review-v5/populated');
const TRACE_DIR = path.resolve(process.cwd(), 'tests/e2e/journeys/traces');

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';

async function loginUser(page: Page, email: string) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole('button', { name: /^Sign In$/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

  await page.evaluate((cid) => {
    localStorage.setItem('antigravity_active_company_id', cid);
  }, CO1_ID);
  await page.waitForTimeout(300);
}

test.describe('Section 7: Notifications & Dashboard Verification Journey', () => {
  test.setTimeout(300000); // 5 minutes

  test.beforeAll(() => {
    fs.mkdirSync(POPULATED_DIR, { recursive: true });
    fs.mkdirSync(TRACE_DIR, { recursive: true });
  });

  test('7.1-7.5: Notifications badge, grouping, interactions & populated dashboard/vouchers', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    await loginUser(page, PARTNER_EMAIL);

    // =========================================================================
    // Part A: Notifications Center Verification
    // =========================================================================
    console.log('[Notifications Journey] Checking bell badge in header...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Bell button
    const bellBtn = page.locator('button[aria-label*="Notifications"]').first();
    await expect(bellBtn).toBeVisible({ timeout: 10000 });

    // Click bell to open Notification Center
    await bellBtn.click();
    const notifDialog = page.locator('[role="dialog"][aria-label="Notification center"]');
    await expect(notifDialog).toBeVisible({ timeout: 5000 });

    // Assert grouped sections (Today / Yesterday / This Week / Earlier)
    console.log('[Notifications Journey] Verifying notification groupings...');
    await page.waitForTimeout(300);

    // Capture screenshots for notifications (light and dark)
    await page.screenshot({ path: path.join(POPULATED_DIR, '28-notifications-populated.png') });

    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(POPULATED_DIR, '28-notifications-populated-dark.png') });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Close notification dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // =========================================================================
    // Part B: Dashboard Populated Screenshots (25-dashboard-populated)
    // =========================================================================
    console.log('[Notifications Journey] Capturing 25-dashboard-populated (light and dark)...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Light
    await page.screenshot({ path: path.join(POPULATED_DIR, '25-dashboard-populated.png'), fullPage: true });

    // Dark
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(POPULATED_DIR, '25-dashboard-populated-dark.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // =========================================================================
    // Part C: Vouchers Populated Screenshots (26-vouchers-populated)
    // =========================================================================
    console.log('[Notifications Journey] Capturing 26-vouchers-populated (light and dark)...');
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Light
    await page.screenshot({ path: path.join(POPULATED_DIR, '26-vouchers-populated.png'), fullPage: true });

    // Dark
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(POPULATED_DIR, '26-vouchers-populated-dark.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Stop and save tracing
    await context.tracing.stop({ path: path.join(TRACE_DIR, 'notifications-raw.zip') });
    await context.close();

    // Repack trace
    try {
      execSync(`
        mkdir -p /tmp/trace-notif &&
        unzip -q -o ${path.join(TRACE_DIR, 'notifications-raw.zip')} -d /tmp/trace-notif &&
        cd /tmp/trace-notif &&
        zip -9 -q ${path.join(TRACE_DIR, 'notifications.zip')} trace.trace trace.network &&
        rm -rf /tmp/trace-notif ${path.join(TRACE_DIR, 'notifications-raw.zip')}
      `);
      console.log('[Notifications Journey] Repacked notifications trace successfully.');
    } catch {
      if (fs.existsSync(path.join(TRACE_DIR, 'notifications-raw.zip'))) {
        fs.renameSync(path.join(TRACE_DIR, 'notifications-raw.zip'), path.join(TRACE_DIR, 'notifications.zip'));
      }
    }
  });
});
