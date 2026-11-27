import { test, expect } from '../helpers/zero-error-fixture';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const OUT_DIR = path.resolve(process.cwd(), 'docs/ui-review-theme');
const STAGE = process.env.THEME_STAGE === 'old' ? 'old' : 'new';

async function loginAs(page: any) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(PARTNER_EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole('button', { name: /^Sign In$/i }).click();
  await page.waitForURL((u: URL) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });
  await page.evaluate((cid: string) => {
    localStorage.setItem('antigravity_active_company_id', cid);
  }, CO1_ID);
}

async function capturePage(page: any, name: string, checkContrast: boolean) {
  // Light mode
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}-light-${STAGE}.png`), fullPage: false });
  if (checkContrast) {
    const lightAxe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(lightAxe.violations, `Light contrast violations on ${name}`).toEqual([]);
  }

  // Dark mode
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}-dark-${STAGE}.png`), fullPage: false });
  if (checkContrast) {
    const darkAxe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(darkAxe.violations, `Dark contrast violations on ${name}`).toEqual([]);
  }

  await page.evaluate(() => document.documentElement.classList.remove('dark'));
}

test.describe(`Theme Review Capture (${STAGE})`, () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  });

  test(`Capture 6 views in Light + Dark (${STAGE})`, async ({ page }) => {
    await loginAs(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    const runContrast = STAGE === 'new';

    // 1. Dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await capturePage(page, 'dashboard', runContrast);

    // 2. Invoices list
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');
    await capturePage(page, 'invoices', runContrast);

    // 3. New Invoice
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');
    await capturePage(page, 'invoices-new', runContrast);

    // 4. Trial Balance report
    await page.goto('/reports/trial-balance');
    await page.waitForLoadState('networkidle');
    await capturePage(page, 'trial-balance', runContrast);

    // 5. Practice page (/practice/jobs)
    await page.goto('/practice/jobs');
    await page.waitForLoadState('networkidle');
    await capturePage(page, 'practice', runContrast);

    // 6. Dialog open
    await page.getByRole('button', { name: /^New Job$/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await capturePage(page, 'dialog', runContrast);
  });
});
