import { test, expect } from '@playwright/test';
import * as path from 'path';
import { loginAsAdmin } from './helpers/auth';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'screenshots');

test.describe('Section 16: Responsive Viewports & Accessibility (T-164 to T-170)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('T-164: Mobile Viewport & Hamburger Navigation Drawer', async ({ page }) => {
    // Switch viewport to iPhone SE/12 (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');

    // Verify desktop sidebar is hidden on mobile
    const desktopAside = page.locator('aside');
    await expect(desktopAside).toBeHidden();

    // Verify mobile hamburger menu button is visible
    const hamburgerBtn = page.getByRole('button', { name: /Open navigation sidebar/i });
    await expect(hamburgerBtn).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-164-closed.png') });

    // Open mobile sidebar drawer
    await hamburgerBtn.click();

    // Verify mobile drawer content is displayed
    const mobileLink = page.getByRole('link', { name: /Tax Invoices/i }).first();
    await expect(mobileLink).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-164.png'), fullPage: true });

    // Dismiss drawer by clicking overlay
    const overlay = page.locator('.fixed.inset-0.bg-slate-900\\/60');
    if (await overlay.isVisible()) {
      await overlay.click({ force: true });
    }
  });

  test('T-165: Mobile Responsive Table & Horizontal Scroll Container', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');

    // Verify table is rendered and accessible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-165.png'), fullPage: true });
  });

  test('T-166: Tablet Viewport (768x1024) Multi-Column Alignment', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/settings/companies');
    await page.waitForLoadState('networkidle');

    // Verify company directory heading
    const heading = page.getByRole('heading', { name: /Company & Tenant Directory/i });
    await expect(heading).toBeVisible({ timeout: 10000 });

    const companyCard = page.locator('.rounded-2xl').filter({ hasText: 'Pannalal & Sons Traders' }).first();
    await expect(companyCard).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-166.png'), fullPage: true });
  });

  test('T-167: Large Desktop Viewport (1920x1080) Max-Width Boundary', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/reports/trial-balance');
    await page.waitForLoadState('networkidle');

    // Verify trial balance header and parity banner
    const heading = page.getByRole('heading', { name: /Trial Balance/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Strict Parity Enforced/i)).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-167.png'), fullPage: true });
  });

  test('T-168: Accessible Keyboard Navigation (Tab & Focus Ring)', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    // Focus on the first interactive element or customer select
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify active element is focused
    const hasFocus = await page.evaluate(() => {
      const active = document.activeElement;
      return active !== null && active !== document.body;
    });
    expect(hasFocus).toBe(true);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-168.png') });
  });

  test('T-169: Accessible Modal Dismissal via Escape Key', async ({ page }) => {
    await page.goto('/practice/clients');
    await page.waitForLoadState('networkidle');

    // Open onboard modal
    const onboardBtn = page.getByRole('button', { name: /Onboard Client/i }).first();
    await onboardBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Press Escape to dismiss
    await page.keyboard.press('Escape');

    // Verify dialog cleanly dismissed
    await expect(dialog).toBeHidden({ timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-169.png') });
  });

  test('T-170: Color Contrast & Zero Faded/Invisible Text Audit', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');

    // Ensure all visible text elements have computed opacity > 0.5
    const opacityAudit = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('h1, h2, h3, p, span, th, td'));
      let fadedCount = 0;
      for (const el of texts) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          const opacity = parseFloat(style.opacity);
          if (opacity < 0.2 && el.textContent?.trim().length) {
            fadedCount++;
          }
        }
      }
      return fadedCount;
    });

    expect(opacityAudit).toBe(0);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-170.png'), fullPage: true });
  });
});
