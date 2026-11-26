import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const REVIEW_DIR = path.resolve(process.cwd(), 'docs/ui-review-v2');
const BASE_DIR = path.resolve(process.cwd(), 'tests/e2e/baselines/v3');

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
  '/reports/profit-and-loss',
  '/reports/balance-sheet',
  '/settings',
  '/settings/companies',
  '/settings/invoice-branding',
  '/settings/periods',
  '/settings/ledgers',
  '/settings/tally',
  '/settings/numbering',
];

test.describe('UX Refresh V3 Verification & Axe-Core Suite', () => {
  test.setTimeout(360_000);

  test('Verify light/dark/mobile, axe-core AA contrast, and export user-review screenshots', async ({ page }) => {
    fs.mkdirSync(REVIEW_DIR, { recursive: true });
    fs.mkdirSync(BASE_DIR, { recursive: true });

    const pageErrors: string[] = [];
    const seriousAxeViolations: Array<{ route: string; theme: string; id: string; impact: string; help: string }> = [];

    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });
    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    page.on('pageerror', (err) => pageErrors.push(err.message));

    for (const r of ROUTES) {
      const slug = r === '/' ? 'dashboard' : r.replace(/^\//, '').replace(/\//g, '_');

      // 1. Light Desktop (1440x900)
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(r);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(BASE_DIR, `${slug}-light-desktop.png`) });

      const lightAxe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      for (const v of lightAxe.violations) {
        if (v.impact === 'serious' || v.impact === 'critical') {
          seriousAxeViolations.push({ route: r, theme: 'light', id: v.id, impact: v.impact, help: v.help });
        }
      }

      // 2. Dark Desktop (1440x900)
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(BASE_DIR, `${slug}-dark-desktop.png`) });

      const darkAxe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      for (const v of darkAxe.violations) {
        if (v.impact === 'serious' || v.impact === 'critical') {
          seriousAxeViolations.push({ route: r, theme: 'dark', id: v.id, impact: v.impact, help: v.help });
        }
      }

      // 3. Light Mobile (390x844)
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(BASE_DIR, `${slug}-light-mobile.png`) });

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 8);
      expect(overflow, `Mobile horizontal overflow on ${r}`).toBeFalsy();
    }

    // Export required 3 user-review pages to docs/ui-review-v2/
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'dashboard-light-desktop.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'dashboard-dark-desktop.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'dashboard-light-mobile.png'), fullPage: true });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'invoice-create-light-desktop.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'invoice-create-dark-desktop.png'), fullPage: true });

    await page.goto('/reports/trial-balance');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'trial-balance-light-desktop.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'trial-balance-dark-desktop.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.pdf({ path: path.join(REVIEW_DIR, 'trial-balance-print.pdf'), format: 'A4', printBackground: false });

    fs.writeFileSync(
      path.join(REVIEW_DIR, 'axe-summary.json'),
      JSON.stringify({ totalRoutes: ROUTES.length, seriousOrCriticalCount: seriousAxeViolations.length, violations: seriousAxeViolations }, null, 2)
    );

    expect(pageErrors, `Page errors: ${pageErrors.join('; ')}`).toEqual([]);
    expect(seriousAxeViolations, `Axe serious/critical violations: ${JSON.stringify(seriousAxeViolations)}`).toEqual([]);
  });
});
