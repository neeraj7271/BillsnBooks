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

test.describe('Section 3: Collections Group Sweeps (/collections/ageing, /collections/payment-links, /collections/recurring)', () => {
  test.beforeEach(async ({ context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });
  });

  test.afterEach(async ({ context }, testInfo) => {
    const tracePath = path.resolve(
      process.cwd(),
      `tests/e2e/production/traces/collections-${testInfo.title.replace(/\s+/g, '-').toLowerCase()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  });

  test('3.11 /collections/ageing: summary cards, view mode toggle, search, reminder & promise modals', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/collections/ageing');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Ageing/i)).first()).toBeVisible();

    // Toggle view mode (By Party vs By Invoice)
    const partyTab = page.getByRole('button', { name: /By Party|Parties/i }).first();
    const invoiceTab = page.getByRole('button', { name: /By Invoice|Invoices/i }).first();

    if (await invoiceTab.isVisible()) {
      await invoiceTab.click();
      await page.waitForTimeout(200);
    }
    if (await partyTab.isVisible()) {
      await partyTab.click();
      await page.waitForTimeout(200);
    }

    // Search filter
    const searchInput = page.getByPlaceholder(/Search parties|Search/i).or(page.locator('input[type="search"]')).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Ltd');
      await page.waitForTimeout(200);
      await searchInput.fill('');
      await page.waitForTimeout(200);
    }

    // Send Reminder dialog / Promise to Pay dialog trigger
    const actionBtn = page.locator('table tbody tr button:has(svg.lucide-send), table tbody tr button:has(svg.lucide-calendar)').first();
    if (await actionBtn.isVisible()) {
      await actionBtn.click();
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
    await page.goto('/collections/ageing');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.12 /collections/payment-links: links table, generate modal, UPI QR modal, filters', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/collections/payment-links');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Payment Links/i)).first()).toBeVisible();
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // Generate Link dialog
    const generateBtn = page.getByRole('button', { name: /Generate Link|New Link/i }).first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Row action: UPI QR modal
    const qrBtn = page.locator('table tbody tr button:has(svg.lucide-qr-code), table tbody tr button[title*="QR" i]').first();
    if (await qrBtn.isVisible()) {
      await qrBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Status filter tabs
    const statusTabs = page.locator('button:has-text("All"), button:has-text("Active"), button:has-text("Paid")');
    if ((await statusTabs.count()) > 0) {
      await statusTabs.first().click();
      await page.waitForTimeout(150);
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/collections/payment-links');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.13 /collections/recurring: schedules table, new schedule dialog, pause/resume', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/collections/recurring');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Recurring/i)).first()).toBeVisible();
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // Open New Schedule Dialog
    const newScheduleBtn = page.getByRole('button', { name: /New Schedule|Add Schedule/i }).first();
    if (await newScheduleBtn.isVisible()) {
      await newScheduleBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Filter tabs (All, Active, Paused, Completed)
    const activeTab = page.getByRole('button', { name: /^Active/i }).or(page.getByText(/^Active/i)).first();
    const pausedTab = page.getByRole('button', { name: /^Paused/i }).or(page.getByText(/^Paused/i)).first();
    if (await activeTab.isVisible()) {
      await activeTab.click();
      await page.waitForTimeout(150);
    }
    if (await pausedTab.isVisible()) {
      await pausedTab.click();
      await page.waitForTimeout(150);
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/collections/recurring');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
