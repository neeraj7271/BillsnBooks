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

test.describe('Section 3: Settings Group Sweeps (/settings, /settings/companies, /settings/ledgers, /settings/numbering, /settings/notifications, /settings/periods, /settings/invoice-branding, /settings/tally)', () => {
  test.beforeEach(async ({ context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });
  });

  test.afterEach(async ({ context }, testInfo) => {
    const tracePath = path.resolve(
      process.cwd(),
      `tests/e2e/production/traces/settings-${testInfo.title.replace(/\s+/g, '-').toLowerCase()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  });

  test('3.18 /settings: settings hub cards & navigation', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Settings/i)).first()).toBeVisible();

    // Verify presence of section cards
    await expect(page.locator('a[href*="/settings/companies"], a[href*="/settings/ledgers"]').first()).toBeVisible();

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.19 /settings/companies: company cards, company dialog, branch dialog, details', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/settings/companies');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Companies|Company/i).first()).toBeVisible();

    // Open Company dialog
    const addCoBtn = page.getByRole('button', { name: /Add Company|New Company/i }).first();
    if (await addCoBtn.isVisible()) {
      await addCoBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Open Branch dialog if branch button exists
    const addBranchBtn = page.getByRole('button', { name: /Add Branch|New Branch/i }).first();
    if (await addBranchBtn.isVisible()) {
      await addBranchBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/settings/companies');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.20 /settings/ledgers: chart of accounts, group & ledger dialogs', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Ledger|Chart of Accounts/i).first()).toBeVisible();

    // Group dialog
    const newGroupBtn = page.getByRole('button', { name: /New Group|Add Group/i }).first();
    if (await newGroupBtn.isVisible()) {
      await newGroupBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Ledger dialog
    const newLedgerBtn = page.getByRole('button', { name: /New Ledger|Add Ledger/i }).first();
    if (await newLedgerBtn.isVisible()) {
      await newLedgerBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.21 /settings/numbering: doc numbering series table & config', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/settings/numbering');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Numbering|Document Series/i).first()).toBeVisible();

    // New Series dialog
    const newSeriesBtn = page.getByRole('button', { name: /New Series|Add Series/i }).first();
    if (await newSeriesBtn.isVisible()) {
      await newSeriesBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/settings/numbering');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.22 /settings/notifications: toggles, test trigger', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Notification/i).first()).toBeVisible();

    // Toggle switch check
    const toggleSwitch = page.locator('button[role="switch"]').first();
    if (await toggleSwitch.isVisible()) {
      await toggleSwitch.click();
      await page.waitForTimeout(200);
      await toggleSwitch.click();
      await page.waitForTimeout(200);
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.23 /settings/periods, /settings/invoice-branding, /settings/tally', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. /settings/periods
    await page.goto('/settings/periods');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Period|Lock/i).first()).toBeVisible();

    // 2. /settings/invoice-branding
    await page.goto('/settings/invoice-branding');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Branding|Logo|Signature/i).first()).toBeVisible();

    // Template pickers
    const minimalTpl = page.getByRole('button', { name: /Minimal/i }).first();
    if (await minimalTpl.isVisible()) {
      await minimalTpl.click();
      await page.waitForTimeout(150);
    }

    // 3. /settings/tally
    await page.goto('/settings/tally');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Tally/i).first()).toBeVisible();

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/settings/invoice-branding');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
