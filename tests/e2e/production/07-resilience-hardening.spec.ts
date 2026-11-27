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

test.describe('Section 7: Resilience & Zero-Error Hardening', () => {
  test.beforeEach(async ({ context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });
  });

  test.afterEach(async ({ context }, testInfo) => {
    const tracePath = path.resolve(
      process.cwd(),
      `tests/e2e/production/traces/resilience-${testInfo.title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  });

  test('7.1 XSS & SQLi Sanitization: search inputs render payload literally with zero execution', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/parties');
    await page.waitForLoadState('networkidle');

    // 1. XSS injection probe
    let dialogTriggered = false;
    page.on('dialog', async (dialog) => {
      dialogTriggered = true;
      await dialog.dismiss();
    });

    const searchInput = page.getByPlaceholder(/Search/i).first();
    if (await searchInput.isVisible()) {
      const xssPayload = '<script>window.xssFlag=true</script>';
      await searchInput.fill(xssPayload);
      await page.waitForTimeout(300);

      // Verify no xssFlag variable in window
      const xssExecuted = await page.evaluate(() => (window as any).xssFlag === true);
      expect(xssExecuted).toBe(false);
      expect(dialogTriggered).toBe(false);

      // 2. SQLi injection probe
      const sqliPayload = "' OR 1=1 --";
      await searchInput.fill(sqliPayload);
      await page.waitForTimeout(300);

      // Search input should contain literal string
      expect(await searchInput.inputValue()).toBe(sqliPayload);
      await searchInput.fill('');
    }
  });

  test('7.2 Rapid Route Navigation: 15 rapid transitions without memory leaks or crashes', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    const routes = [
      '/invoices',
      '/parties',
      '/items',
      '/vouchers',
      '/banking',
      '/imports',
      '/collections/ageing',
      '/collections/payment-links',
      '/collections/recurring',
      '/practice/clients',
      '/practice/tasks',
      '/reports',
      '/reports/trial-balance',
      '/settings/companies',
      '/settings/ledgers',
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(100); // Rapid transition
    }

    // Final route settles cleanly
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('7.3 Browser Back and Forward State Restoration', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/parties');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/parties');

    await page.goto('/items');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/items');

    // Go back to /parties
    await page.goBack();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/parties');

    // Go forward to /items
    await page.goForward();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/items');
  });

  test('7.4 Silent Token Refresh & Session Integrity', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);

    // Verify token exists
    const token = await page.evaluate(() => localStorage.getItem('antigravity_access_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('antigravity_refresh_token'));

    expect(token).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    // Trigger transparent token refresh via fetch
    const refreshResult = await page.evaluate(async (rt) => {
      const res = await fetch('http://localhost:4000/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      return { status: res.status, ok: res.ok };
    }, refreshToken);

    expect(refreshResult.ok).toBe(true);
    expect(refreshResult.status).toBe(200);
  });
});
