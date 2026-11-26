import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const BASE_DIR = path.resolve(process.cwd(), 'tests/e2e/baselines/before');

const ROUTES = [
  '/',
  '/parties',
  '/items',
  '/invoices',
  '/invoices/new',
  '/vouchers',
  '/banking',
  '/approvals',
  '/imports',
  '/collections/ageing',
  '/practice/clients',
  '/practice/tasks',
  '/reports',
  '/reports/trial-balance',
  '/settings',
  '/settings/companies',
  '/settings/invoice-branding',
];

test.describe('UX Refresh Baseline Capture (Before)', () => {
  test.setTimeout(300_000);

  test('Capture pre-refresh light/dark desktop/mobile baselines', async ({ page }) => {
    fs.mkdirSync(BASE_DIR, { recursive: true });
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });
    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    for (const r of ROUTES) {
      const slug = r === '/' ? 'dashboard' : r.replace(/^\//, '').replace(/\//g, '_');
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(r);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.waitForTimeout(80);
      await page.screenshot({ path: path.join(BASE_DIR, `${slug}-light-desktop.png`) });

      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForTimeout(80);
      await page.screenshot({ path: path.join(BASE_DIR, `${slug}-dark-desktop.png`) });

      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(80);
      await page.screenshot({ path: path.join(BASE_DIR, `${slug}-light-mobile.png`) });
    }
    expect(fs.readdirSync(BASE_DIR).length).toBe(ROUTES.length * 3);
  });
});
