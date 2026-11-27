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

test.describe('Section 4.5: Payment Links Journey', () => {
  test.setTimeout(900000); // 15 minutes

  test.beforeAll(() => {
    fs.mkdirSync(POPULATED_DIR, { recursive: true });
    fs.mkdirSync(TRACE_DIR, { recursive: true });
  });

  test('4.5: Create 200 payment collection links + simulate payments via UI', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    await loginUser(page, PARTNER_EMAIL);

    console.log('[Payment Links Journey] Navigating to /collections/payment-links...');
    await page.goto('/collections/payment-links');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // =========================================================================
    // Part A: Create 200 Payment Links via UI Generate Link modal
    // =========================================================================
    console.log('[Payment Links Journey] Creating 200 payment links via UI dialog...');

    const TARGET_LINKS = 200;
    for (let i = 0; i < TARGET_LINKS; i++) {
      const generateBtn = page.getByRole('button', { name: /Generate Link/i });
      await generateBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Wait for invoice to load and be selected
      const invoiceCombo = dialog.getByRole('combobox').first();
      await expect(invoiceCombo).toContainText('INV-', { timeout: 5000 });

      const createBtn = dialog.getByRole('button', { name: /Create Link/i });
      await createBtn.click();
      await expect(dialog).toBeHidden({ timeout: 10000 });

      if ((i + 1) % 25 === 0) {
        console.log(`[Payment Links Journey] Created ${i + 1}/200 payment links.`);
      }
    }

    console.log('[Payment Links Journey] Finished creating 200 payment links.');
    await page.waitForTimeout(500);

    // =========================================================================
    // Part B: Simulate Payment on 60 links via the UI "Simulate Pay" button
    // =========================================================================
    console.log('[Payment Links Journey] Simulating payments on 60 links via UI...');
    let paidCount = 0;

    for (let batch = 0; batch < 3; batch++) {
      const simulateBtns = await page.getByRole('button', { name: /Simulate Pay/i }).all();
      for (const btn of simulateBtns) {
        if (paidCount >= 60) break;
        try {
          if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(250);
            paidCount++;
          }
        } catch {
          // ignore
        }
      }
      if (paidCount < 60) {
        // Go to next page to simulate more
        const nextBtn = page.getByRole('button', { name: /Next/i });
        if (await nextBtn.isVisible() && !await nextBtn.isDisabled()) {
          await nextBtn.click();
          await page.waitForTimeout(400);
        } else {
          break;
        }
      }
    }
    console.log(`[Payment Links Journey] Simulated payments completed: ${paidCount} links marked PAID.`);

    // =========================================================================
    // Part C: Verify UPI QR Modal
    // =========================================================================
    await page.goto('/collections/payment-links');
    await page.waitForLoadState('networkidle');
    const qrBtn = page.getByRole('button', { name: /QR/i }).first();
    if (await qrBtn.isVisible()) {
      await qrBtn.click();
      const qrDialog = page.locator('[role="dialog"]');
      await expect(qrDialog).toBeVisible({ timeout: 5000 });
      await expect(qrDialog.getByText(/Instant UPI QR Code/i)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(qrDialog).toBeHidden({ timeout: 5000 });
    }

    // =========================================================================
    // Part D: Capture screenshots for Payment Links
    // =========================================================================
    await page.screenshot({
      path: path.join(POPULATED_DIR, 'payment-links-populated.png'),
      fullPage: true,
    });

    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(POPULATED_DIR, 'payment-links-populated-dark.png'),
      fullPage: true,
    });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Stop and save tracing
    await context.tracing.stop({ path: path.join(TRACE_DIR, 'payment-links-raw.zip') });
    await context.close();

    // Repack trace
    try {
      execSync(`
        mkdir -p /tmp/trace-pl &&
        unzip -q -o ${path.join(TRACE_DIR, 'payment-links-raw.zip')} -d /tmp/trace-pl &&
        cd /tmp/trace-pl &&
        zip -9 -q ${path.join(TRACE_DIR, 'payment-links.zip')} trace.trace trace.network &&
        rm -rf /tmp/trace-pl ${path.join(TRACE_DIR, 'payment-links-raw.zip')}
      `);
      console.log('[Payment Links Journey] Repacked payment-links trace successfully.');
    } catch {
      if (fs.existsSync(path.join(TRACE_DIR, 'payment-links-raw.zip'))) {
        fs.renameSync(path.join(TRACE_DIR, 'payment-links-raw.zip'), path.join(TRACE_DIR, 'payment-links.zip'));
      }
    }
  });
});
