import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PASS = 'HeavyQaPass@2026!';
const EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';

test.describe('A11y verification', () => {
  test('Axe-core passes on /invoices/new in light and dark mode with 0 serious violations', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    // Light mode
    const lightResults = await new AxeBuilder({ page }).analyze();
    const lightSerious = lightResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(lightSerious).toEqual([]);

    // Dark mode
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    const darkResults = await new AxeBuilder({ page }).analyze();
    const darkSerious = darkResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(darkSerious).toEqual([]);

    console.log('0 serious axe-core violations found in both themes!');
  });
});
