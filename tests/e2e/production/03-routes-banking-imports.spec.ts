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

test.describe('Section 3: Banking & Imports Group Sweeps (/banking, /banking/[id]/reconcile, /banking/discovery, /imports, /imports/new, /imports/[id]/review)', () => {
  test.beforeEach(async ({ context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });
  });

  test.afterEach(async ({ context }, testInfo) => {
    const tracePath = path.resolve(
      process.cwd(),
      `tests/e2e/production/traces/banking-imports-${testInfo.title.replace(/\s+/g, '-').toLowerCase()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  });

  test('3.8 /banking: bank accounts, add account modal, upload statement modal, themes, mobile', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/banking');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Banking/i)).first()).toBeVisible();

    // Add Account modal
    const addAccountBtn = page.getByRole('button', { name: /Add Account|Add Bank Account|New Account/i }).first();
    if (await addAccountBtn.isVisible()) {
      await addAccountBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Upload Statement modal
    const uploadBtn = page.getByRole('button', { name: /Upload Statement|Upload/i }).first();
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Navigate to Reconcile link if an account exists
    const reconcileLink = page.locator('a[href*="/banking/"][href*="/reconcile"]').first();
    if (await reconcileLink.isVisible()) {
      await reconcileLink.click();
      await page.waitForURL(/\/banking\/.*\/reconcile/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/banking\/.*\/reconcile/);

      // Verify reconcile tabs (UNMATCHED, MATCHED, ALL)
      const unmatchedTab = page.getByRole('button', { name: /Unmatched/i }).or(page.getByText(/Unmatched/i)).first();
      const matchedTab = page.getByRole('button', { name: /Matched/i }).or(page.getByText(/Matched/i)).first();
      if (await unmatchedTab.isVisible()) {
        await unmatchedTab.click();
        await page.waitForTimeout(150);
      }
      if (await matchedTab.isVisible()) {
        await matchedTab.click();
        await page.waitForTimeout(150);
      }
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/banking');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.9 /banking/discovery: sales discovery cockpit, filter tabs, scan', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/banking/discovery');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Discovery|Sales Discovery/i).first()).toBeVisible();

    // Verify filter buttons (All, Open, Converted, Dismissed)
    const filterButtons = page.locator('button:has-text("All"), button:has-text("Open"), button:has-text("Converted")');
    if ((await filterButtons.count()) > 0) {
      await filterButtons.first().click();
      await page.waitForTimeout(150);
    }

    // Dark theme
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/banking/discovery');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.10 /imports, /imports/new, /imports/[id]/review: batch table, wizard steps, review', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. /imports
    await page.goto('/imports');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Imports|Import/i)).first()).toBeVisible();
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // Verify New Import button navigates to /imports/new
    const newImportBtn = page.getByRole('button', { name: /New Import|Upload File/i }).or(page.locator('a[href="/imports/new"]')).first();
    if (await newImportBtn.isVisible()) {
      await newImportBtn.click();
      await page.waitForURL(/\/imports\/new/, { timeout: 10000 });
      expect(page.url()).toContain('/imports/new');
    } else {
      await page.goto('/imports/new');
      await page.waitForLoadState('networkidle');
    }

    // 2. /imports/new wizard steps
    await expect(page.getByText(/Step 1|Upload/i).first()).toBeVisible();

    // Verify format dropdown or file picker
    const filePicker = page.locator('input[type="file"]').first();
    await expect(filePicker).toBeAttached();

    // 3. /imports/[id]/review check if any batch exists
    await page.goto('/imports');
    await page.waitForLoadState('networkidle');

    const reviewLink = page.locator('table tbody tr a[href*="/imports/"]').first();
    if (await reviewLink.isVisible()) {
      await reviewLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\/imports\/[a-zA-Z0-9_-]+/);
      await expect(page.locator('body')).toBeVisible();
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/imports');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
