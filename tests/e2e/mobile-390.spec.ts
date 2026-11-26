import { test, expect } from '@playwright/test';

const PASS = 'HeavyQaPass@2026!';
const EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';

test.describe('Mobile 390x844 viewport verification', () => {
  test('Zero page-level horizontal overflow on mobile 390x844', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    await page.setViewportSize({ width: 390, height: 844 });

    const pages = ['/invoices/new', '/invoices', '/parties', '/items', '/reports', '/settings'];
    for (const p of pages) {
      await page.goto(p);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    }

    console.log('Zero page-level horizontal overflow on mobile 390x844 verified across all tested pages!');
  });
});
