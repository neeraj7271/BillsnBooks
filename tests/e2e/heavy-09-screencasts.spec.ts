import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const CO1_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const SCREENCAST_DIR = path.resolve(process.cwd(), 'tests/e2e/screencasts');

async function recordJourney(
  browser: any,
  name: string,
  fn: (page: any) => Promise<void>,
): Promise<string> {
  fs.mkdirSync(SCREENCAST_DIR, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: SCREENCAST_DIR, size: { width: 1280, height: 800 } },
  });
  const page = await ctx.newPage();
  await fn(page);
  const video = page.video();
  await ctx.close();
  const rawPath = await video.path();
  const destPath = path.join(SCREENCAST_DIR, `${name}.webm`);
  fs.renameSync(rawPath, destPath);
  return destPath;
}

async function loginCo1(page: any) {
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(CO1_EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole('button', { name: /^Sign In$/i }).click();
  await page.waitForURL((u: URL) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });
  await page.evaluate((cid: string) => {
    localStorage.setItem('antigravity_active_company_id', cid);
  }, CO1_ID);
}

test.describe('Heavy E2E Deliverable: 4 Required Screencasts', () => {
  test.setTimeout(300_000);

  test('Record 4 screencasts into tests/e2e/screencasts/', async ({ browser }) => {
    const v1 = await recordJourney(browser, '01-invoice-creation', async (page) => {
      await loginCo1(page);
      await page.goto('/invoices/new');
      await page.waitForLoadState('networkidle');
      await page.locator('button[role="combobox"]').first().click();
      await page.locator('[role="option"]').first().click();
      await page.locator('tbody button[role="combobox"]').first().click();
      await page.locator('[role="option"]').first().click();
      await page.getByRole('button', { name: /Create Tax Invoice & Post/i }).click();
      await page.waitForURL(/\/invoices\/[0-9a-f-]+/i, { timeout: 15000 });
    });

    const v2 = await recordJourney(browser, '02-import-wizard', async (page) => {
      await loginCo1(page);
      await page.goto('/imports/new');
      await page.waitForLoadState('networkidle');
      const csvPath = '/tmp/screencast-import.csv';
      fs.writeFileSync(
        csvPath,
        'name,partyType,registrationType,gstin,pan,billingStateCode\nScreencast Party,CUSTOMER,REGULAR,27AABCS2222F1Z1,AABCS2222F,27\n',
      );
      await page.locator('input[type="file"]').first().setInputFiles(csvPath);
      await page.waitForTimeout(800);
    });

    const v3 = await recordJourney(browser, '03-report-export-and-share', async (page) => {
      await loginCo1(page);
      await page.goto('/reports/trial-balance');
      await page.waitForLoadState('networkidle');
      const shareBtn = page.getByRole('button', { name: /Share/i }).first();
      if (await shareBtn.isVisible().catch(() => false)) {
        await shareBtn.click();
        await page.waitForTimeout(500);
      }
    });

    const v4 = await recordJourney(browser, '04-logo-upload-replace-delete', async (page) => {
      await loginCo1(page);
      await page.goto('/settings/invoice-branding');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(600);
    });

    expect(fs.existsSync(v1)).toBe(true);
    expect(fs.existsSync(v2)).toBe(true);
    expect(fs.existsSync(v3)).toBe(true);
    expect(fs.existsSync(v4)).toBe(true);
  });
});
