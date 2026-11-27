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

test.describe('Section 4.6: Recurring Schedules Journey', () => {
  test.setTimeout(900000); // 15 minutes

  test.beforeAll(() => {
    fs.mkdirSync(POPULATED_DIR, { recursive: true });
    fs.mkdirSync(TRACE_DIR, { recursive: true });
  });

  test('4.6: Create 80 recurring schedules via the rewritten 2-step dialog', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    await loginUser(page, PARTNER_EMAIL);

    console.log('[Recurring Journey] Navigating to /collections/recurring...');
    await page.goto('/collections/recurring');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);

    const TARGET_SCHEDULES = 80;

    for (let i = 0; i < TARGET_SCHEDULES; i++) {
      console.log(`[Recurring Journey] Opening dialog for schedule ${i + 1}/${TARGET_SCHEDULES}...`);
      const newScheduleBtn = page.getByRole('button', { name: 'New Schedule' });
      await newScheduleBtn.click();

      const schedDialog = page.locator('[data-testid="recurring-schedule-dialog"]');
      await expect(schedDialog).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(200);

      // Rotate frequency
      if (i % 3 === 1) {
        const freqBtn = page.locator('#billing-frequency');
        await freqBtn.click();
        await page.waitForTimeout(100);
        const opt = page.getByRole('option', { name: /Quarterly/i });
        if (await opt.isVisible({ timeout: 1000 }).catch(() => false)) await opt.click();
      } else if (i % 3 === 2) {
        const freqBtn = page.locator('#billing-frequency');
        await freqBtn.click();
        await page.waitForTimeout(100);
        const opt = page.getByRole('option', { name: /Annual/i });
        if (await opt.isVisible({ timeout: 1000 }).catch(() => false)) await opt.click();
      }

      // Fill Number of Invoices
      const numInvoices = (6 + (i % 7) * 2).toString();
      await page.getByLabel('Number of Invoices').fill(numInvoices);

      // Fill Description and Price
      const descInput = page.getByLabel('Description').first();
      await descInput.fill(`Retainer Services - Tier ${((i % 4) + 1)} SLA`);

      const priceInput = page.getByLabel('Unit Price (₹)').first();
      await priceInput.fill((15000 + (i % 15) * 2500).toString());

      // Click Activate Schedule (Step 1 -> Step 2)
      const activateStep1 = page.getByRole('button', { name: 'Activate Schedule' });
      await expect(activateStep1).toBeEnabled({ timeout: 5000 });
      await activateStep1.click();

      // Step 2 Confirm
      const confirmStep = page.locator('[data-testid="recurring-confirm-step"]');
      await expect(confirmStep).toBeVisible({ timeout: 5000 });

      // Click final Activate in dialog footer
      const finalActivateBtn = schedDialog.getByRole('button', { name: /^Activate$/i });
      await finalActivateBtn.click();

      await expect(schedDialog).toBeHidden({ timeout: 10000 });

      if ((i + 1) % 20 === 0) {
        console.log(`[Recurring Journey] Created ${i + 1}/80 recurring schedules via rewritten dialog.`);
      }
    }

    console.log('[Recurring Journey] All 80 recurring schedules created.');

    // Pause a subset of schedules for status variety
    const pauseButtons = page.locator('tbody tr td:last-child button:nth-child(3)');
    const count = await pauseButtons.count();
    for (let p = 0; p < Math.min(16, count); p++) {
      try {
        await pauseButtons.nth(p).click();
        await page.waitForTimeout(200);
      } catch {
        // ignore
      }
    }

    // Save dialog filled and confirm screenshots in populated directory
    await page.getByRole('button', { name: 'New Schedule' }).click();
    await page.waitForTimeout(400);

    // Light
    await page.screenshot({ path: path.join(POPULATED_DIR, '16-recurring-dialog-filled.png') });
    // Dark
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(POPULATED_DIR, '16-recurring-dialog-filled-dark.png') });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Step 2 confirm
    await page.getByRole('button', { name: 'Activate Schedule' }).click();
    await page.waitForTimeout(400);

    // Light
    await page.screenshot({ path: path.join(POPULATED_DIR, '17-recurring-confirm.png') });
    // Dark
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(POPULATED_DIR, '17-recurring-confirm-dark.png') });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    await page.keyboard.press('Escape');

    // Stop and save tracing
    await context.tracing.stop({ path: path.join(TRACE_DIR, 'recurring-raw.zip') });
    await context.close();

    // Repack trace
    try {
      execSync(`
        mkdir -p /tmp/trace-rec &&
        unzip -q -o ${path.join(TRACE_DIR, 'recurring-raw.zip')} -d /tmp/trace-rec &&
        cd /tmp/trace-rec &&
        zip -9 -q ${path.join(TRACE_DIR, 'recurring.zip')} trace.trace trace.network &&
        rm -rf /tmp/trace-rec ${path.join(TRACE_DIR, 'recurring-raw.zip')}
      `);
      console.log('[Recurring Journey] Repacked recurring trace successfully.');
    } catch {
      if (fs.existsSync(path.join(TRACE_DIR, 'recurring-raw.zip'))) {
        fs.renameSync(path.join(TRACE_DIR, 'recurring-raw.zip'), path.join(TRACE_DIR, 'recurring.zip'));
      }
    }
  });
});
