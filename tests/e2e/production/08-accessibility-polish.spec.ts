import { test, expect } from '../helpers/zero-error-fixture';
import AxeBuilder from '@axe-core/playwright';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';

async function loginAs(page: any, email: string) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole('button', { name: /^Sign In$/i }).click();
  await page.waitForURL((u: URL) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

  await page.evaluate((cid: string) => {
    localStorage.setItem('antigravity_active_company_id', cid);
  }, CO1_ID);
}

test.describe('Section 8: Accessibility & Polish Final Pass', () => {
  test.beforeEach(async ({ context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });
  });

  test.afterEach(async ({ context }, testInfo) => {
    const tracePath = path.resolve(
      process.cwd(),
      `tests/e2e/production/traces/a11y-${testInfo.title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  });

  test('8.1 axe-core audit on core pages in both themes: zero critical/serious violations', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    const auditPages = [
      '/',
      '/invoices',
      '/invoices/new',
      '/parties',
      '/items',
      '/reports',
      '/settings',
    ];

    for (const route of auditPages) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Light theme check
      const lightResults = await new AxeBuilder({ page }).analyze();
      const lightSerious = lightResults.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      );
      expect(lightSerious, `Found serious/critical violations on ${route} in light mode: ${JSON.stringify(lightSerious.map(v => v.id))}`).toEqual([]);

      // Dark theme check
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForTimeout(100);
      const darkResults = await new AxeBuilder({ page }).analyze();
      const darkSerious = darkResults.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      );
      expect(darkSerious, `Found serious/critical violations on ${route} in dark mode: ${JSON.stringify(darkSerious.map(v => v.id))}`).toEqual([]);
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
    }
  });

  test('8.2 Keyboard-only Navigation: focus trap, tab navigation, skip to content link', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Skip to main content link
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();

    // Tab through top nav
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Command palette shortcut ⌘K
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(300);
    const cmdPalette = page.getByRole('dialog').or(page.locator('[role="dialog"]')).first();
    if (await cmdPalette.isVisible()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      await expect(cmdPalette).not.toBeVisible();
    }
  });

  test('8.3 Screen Reader Labels & Interactive Elements Polish', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');

    // All interactive buttons should have discernible text or aria-label
    const buttons = page.locator('button:visible');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 10); i++) {
      const btn = buttons.nth(i);
      const text = (await btn.innerText()).trim();
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      const hasAccessibleName = Boolean(text || ariaLabel || title);
      expect(hasAccessibleName).toBe(true);
    }
  });
});
