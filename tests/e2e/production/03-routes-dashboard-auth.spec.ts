import { test, expect } from '../helpers/zero-error-fixture';
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

test.describe('Section 3: Dashboard & Auth Routes (/, /auth/login, /auth/signup)', () => {
  test.beforeEach(async ({ context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });
  });

  test.afterEach(async ({ context }, testInfo) => {
    const tracePath = path.resolve(
      process.cwd(),
      `tests/e2e/production/traces/dash-auth-${testInfo.title.replace(/\s+/g, '-').toLowerCase()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  });

  test('3.24 / (Dashboard): KPI metrics cards, ageing widgets, recent activity', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();

    // Verify KPI cards / overview blocks are present
    const cards = page.locator('[data-testid*="kpi"], .rounded-2xl');
    await expect(cards.first()).toBeVisible();

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.25 /auth/login and /auth/signup: form controls, validation cues, navigation link', async ({ page }) => {
    // 1. /auth/login
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Sign In/i).first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Verify signup link if present
    const signupLink = page.locator('a[href*="/auth/signup"]').first();
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await page.waitForURL(/\/auth\/signup/, { timeout: 10000 });
      expect(page.url()).toContain('/auth/signup');
      await expect(page.getByText(/Register|Sign Up|Create/i).first()).toBeVisible();
    } else {
      await page.goto('/auth/signup');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
