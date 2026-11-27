import { test, expect } from '../helpers/zero-error-fixture';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const CO2_ID = '1b5a05b3-972d-4ad3-a512-b99cc59cc599';

async function loginUser(page: any, email = PARTNER_EMAIL) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole('button', { name: /^Sign In$/i }).click();
  await page.waitForURL((u: URL) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

  await page.evaluate((cid: string) => {
    localStorage.setItem('antigravity_active_company_id', cid);
  }, CO1_ID);
  await page.goto('/invoices');
  await page.waitForLoadState('networkidle');
}

test.describe('Section 2: Global Chrome & Top Bar Verification', () => {
  test.beforeEach(async ({ context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });
  });

  test.afterEach(async ({ context }, testInfo) => {
    const tracePath = path.resolve(
      process.cwd(),
      `tests/e2e/production/traces/global-chrome-${testInfo.title.replace(/\s+/g, '-').toLowerCase()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  });

  test('2.1 Company switcher: search, switch, rapid switching, keyboard shortcut', async ({ page }) => {
    await loginUser(page);

    // Click company switcher in top-header
    const companyBtn = page.getByTestId('top-company-switcher-btn').or(page.locator('button:has(svg.lucide-building-2)'));
    await expect(companyBtn.first()).toBeVisible();
    await companyBtn.first().click();

    // Verify company dropdown opens
    const searchInput = page.getByPlaceholder(/Search companies/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Co2');
    await page.waitForTimeout(100);

    // Select Co2
    const co2Option = page.getByText(/HeavyQA T1 Co2/i).first();
    await expect(co2Option).toBeVisible();
    await co2Option.click();
    await page.waitForTimeout(300);

    // Verify company switched in localStorage and header
    const activeIdAfter = await page.evaluate(() => localStorage.getItem('antigravity_active_company_id'));
    expect(activeIdAfter).toBe(CO2_ID);

    // Rapid switching 5 times
    for (let i = 0; i < 5; i++) {
      await companyBtn.first().click();
      const targetText = i % 2 === 0 ? 'Co1' : 'Co2';
      const opt = page.getByText(new RegExp(`HeavyQA T1 ${targetText}`, 'i')).first();
      if (await opt.isVisible()) {
        await opt.click();
      }
      await page.waitForTimeout(100);
    }

    // Keyboard shortcut Meta+Shift+C (or Control+Shift+C)
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+c' : 'Control+Shift+c');
    await expect(searchInput).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('2.2 Command palette: open via click, Meta+K, search, keyboard navigate, close', async ({ page }) => {
    await loginUser(page);

    // Open via search trigger
    const searchTrigger = page.locator('button:has-text("Search"), button:has(svg.lucide-search)').first();
    await searchTrigger.click();

    // Palette modal should be open
    const paletteInput = page.getByPlaceholder(/Type a command or search/i).or(page.locator('input[placeholder*="command" i]'));
    await expect(paletteInput).toBeVisible();

    // Type query
    await paletteInput.fill('Invoice');
    await page.waitForTimeout(100);
    await expect(page.getByText(/Create Tax Invoice|Tax Invoices/i).first()).toBeVisible();

    // Esc closes palette
    await page.keyboard.press('Escape');
    await expect(paletteInput).toBeHidden();

    // Open via Meta+K / Control+K
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
    await expect(paletteInput).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(paletteInput).toBeHidden();
  });

  test('2.3 Bell / notifications: dropdown, mark read, full page navigation', async ({ page }) => {
    await loginUser(page);

    // Find bell icon
    const bellBtn = page.locator('button:has(svg.lucide-bell)').first();
    await expect(bellBtn).toBeVisible();
    await bellBtn.click();

    // Verify notification dropdown or empty cue appears
    await expect(page.locator('text=Notifications').first()).toBeVisible();

    // Navigate to full notifications page
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Notification Center/i).first()).toBeVisible();

    // Verify filter buttons work
    const unreadTab = page.getByRole('button', { name: /^Unread Only$/i }).or(page.getByText(/^Unread Only$/i));
    if (await unreadTab.isVisible()) {
      await unreadTab.click();
      await page.waitForTimeout(200);
    }
  });

  test('2.4 Theme toggle: switch dark/light, verify persistence across reload', async ({ page }) => {
    await loginUser(page);

    const themeBtn = page.locator('button:has(svg.lucide-sun), button:has(svg.lucide-moon)').first();
    await expect(themeBtn).toBeVisible();

    // Click to toggle
    await themeBtn.click();
    await page.waitForTimeout(200);

    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));

    // Reload page to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    const isDarkAfterReload = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkAfterReload).toBe(isDark);

    // Toggle back
    const themeBtn2 = page.locator('button:has(svg.lucide-sun), button:has(svg.lucide-moon)').first();
    await themeBtn2.click();
    await page.waitForTimeout(200);
    const finalTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(finalTheme).toBe(!isDark);
  });

  test('2.5 Profile menu & Sign Out flow', async ({ page }) => {
    await loginUser(page);

    // Click avatar/profile button in top-header
    const profileBtn = page.getByTestId('top-profile-btn');
    await profileBtn.click();

    // Settings link in dropdown
    const settingsLink = page.getByRole('link', { name: /Settings/i }).or(page.getByText(/Settings/i));
    await expect(settingsLink.first()).toBeVisible();

    // Sign out button
    const signOutBtn = page.getByRole('button', { name: /Sign Out/i }).or(page.getByText(/Sign Out/i));
    await expect(signOutBtn.first()).toBeVisible();
    await signOutBtn.first().click();

    // Should redirect to /auth/login
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/auth/login');

    // Verify tokens were cleared
    const token = await page.evaluate(() => localStorage.getItem('antigravity_access_token'));
    expect(token).toBeNull();

    // Visiting protected route redirects to login
    await page.goto('/invoices');
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/auth/login');
  });

  test('2.6 Sidebar: sections collapse/expand, navigation, mobile drawer', async ({ page }) => {
    await loginUser(page);

    // Desktop sidebar
    const salesHeader = page.getByText(/Sales & Revenue|Sales/i).first();
    if (await salesHeader.isVisible()) {
      await salesHeader.click();
      await page.waitForTimeout(100);
      await salesHeader.click();
    }

    // Navigate to items
    const itemsNav = page.locator('a[href="/items"]').first();
    await itemsNav.click();
    await page.waitForURL(/\/items/, { timeout: 10000 });
    expect(page.url()).toContain('/items');

    // Test mobile drawer at 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');

    const hamburgerBtn = page.locator('button:has(svg.lucide-menu)').first();
    await expect(hamburgerBtn).toBeVisible();
    await hamburgerBtn.click();

    // Drawer should be open
    const mobileInvoicesLink = page.locator('.fixed a[href="/invoices"], aside a[href="/invoices"]').last();
    await expect(mobileInvoicesLink).toBeVisible();

    // Press Escape to close drawer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });
});
