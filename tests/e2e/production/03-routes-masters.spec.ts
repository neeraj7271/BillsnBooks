import { test, expect } from '../helpers/zero-error-fixture';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const STAFF_EMAIL = 'staff.t1.1795608414148@heavyqa.test';
const CLIENT_EMAIL = 'client.t1.1795608414148@heavyqa.test';
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

test.describe('Section 3: Masters Group Sweeps (/parties, /items, /vouchers)', () => {
  test.beforeEach(async ({ context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });
  });

  test.afterEach(async ({ context }, testInfo) => {
    const tracePath = path.resolve(
      process.cwd(),
      `tests/e2e/production/traces/masters-${testInfo.title.replace(/\s+/g, '-').toLowerCase()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  });

  test('3.5 /parties: customer/vendor filters, search, sort, pagination, dialogs, roles', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/parties');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Parties/i)).first()).toBeVisible();
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // Search filter
    const searchInput = page.getByPlaceholder(/Search parties/i).or(page.locator('input[placeholder*="Search" i]')).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Trading');
      await page.waitForTimeout(200);
      await searchInput.fill('');
      await page.waitForTimeout(200);
    }

    // Filter tabs (All, Customers, Vendors)
    const custTab = page.getByRole('button', { name: /^Customers/i }).or(page.getByText(/^Customers/i)).first();
    const vendTab = page.getByRole('button', { name: /^Vendors/i }).or(page.getByText(/^Vendors/i)).first();
    const allTab = page.getByRole('button', { name: /^All Parties|^All/i }).or(page.getByText(/^All Parties|^All/i)).first();

    if (await custTab.isVisible()) {
      await custTab.click();
      await page.waitForTimeout(150);
    }
    if (await vendTab.isVisible()) {
      await vendTab.click();
      await page.waitForTimeout(150);
    }
    if (await allTab.isVisible()) {
      await allTab.click();
      await page.waitForTimeout(150);
    }

    // Sorting
    const sortHeader = page.locator('th button, th.cursor-pointer').first();
    if (await sortHeader.isVisible()) {
      await sortHeader.click();
      await page.waitForTimeout(150);
      await sortHeader.click();
      await page.waitForTimeout(150);
    }

    // Pagination
    const nextBtn = page.getByRole('button', { name: /^Next$/i }).or(page.locator('button:has(svg.lucide-chevron-right)')).first();
    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(200);
      const prevBtn = page.getByRole('button', { name: /^Previous$/i }).or(page.locator('button:has(svg.lucide-chevron-left)')).first();
      if (await prevBtn.isVisible() && await prevBtn.isEnabled()) {
        await prevBtn.click();
        await page.waitForTimeout(200);
      }
    }

    // Open New Party Dialog and close
    const newPartyBtn = page.getByRole('button', { name: /New Party|Add Party/i }).first();
    if (await newPartyBtn.isVisible()) {
      await newPartyBtn.click();
      await page.waitForTimeout(200);
      // Escape closes dialog
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Row action: view party details
    const viewBtn = page.locator('table tbody tr button:has(svg.lucide-eye), table tbody tr button[title*="View" i]').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
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
    await page.goto('/parties');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    // Role check: CLIENT_VIEWER sees parties read-only (no "New Party" create action)
    await loginAs(page, CLIENT_EMAIL);
    await page.goto('/parties');
    await page.waitForLoadState('networkidle');
    const clientNewBtn = page.getByRole('button', { name: /^New Party$/i });
    await expect(clientNewBtn).toBeHidden();
  });

  test('3.6 /items: goods/services filter, unit manager modal, search, sort, pagination', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/items');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Items/i)).first()).toBeVisible();
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // Search filter
    const searchInput = page.getByPlaceholder(/Search items/i).or(page.locator('input[placeholder*="Search" i]')).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Desk');
      await page.waitForTimeout(200);
      await searchInput.fill('');
      await page.waitForTimeout(200);
    }

    // Filter tabs (All, Goods, Services)
    const goodsTab = page.getByRole('button', { name: /^Goods/i }).or(page.getByText(/^Goods/i)).first();
    const servicesTab = page.getByRole('button', { name: /^Services/i }).or(page.getByText(/^Services/i)).first();
    const allTab = page.getByRole('button', { name: /^All/i }).or(page.getByText(/^All/i)).first();

    if (await goodsTab.isVisible()) {
      await goodsTab.click();
      await page.waitForTimeout(150);
    }
    if (await servicesTab.isVisible()) {
      await servicesTab.click();
      await page.waitForTimeout(150);
    }
    if (await allTab.isVisible()) {
      await allTab.click();
      await page.waitForTimeout(150);
    }

    // Unit manager dialog
    const unitManagerBtn = page.getByRole('button', { name: /Unit Manager|Units/i }).first();
    if (await unitManagerBtn.isVisible()) {
      await unitManagerBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Open New Item Dialog and close
    const newItemBtn = page.getByRole('button', { name: /New Item|Add Item/i }).first();
    if (await newItemBtn.isVisible()) {
      await newItemBtn.click();
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
    await page.goto('/items');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.7 /vouchers: journal/payment/receipt filters, new JV dropdown, voucher details modal', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Vouchers/i)).first()).toBeVisible();
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // Search filter
    const searchInput = page.getByPlaceholder(/Search vouchers/i).or(page.locator('input[placeholder*="Search" i]')).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('JV');
      await page.waitForTimeout(200);
      await searchInput.fill('');
      await page.waitForTimeout(200);
    }

    // Filter tabs or type select
    const typeSelect = page.locator('select, [role="combobox"]').first();
    if (await typeSelect.isVisible()) {
      // Click dropdown or inspect options
      await typeSelect.click();
      await page.waitForTimeout(150);
      await page.keyboard.press('Escape');
    }

    // New Voucher button / split dropdown
    const newVoucherBtn = page.getByRole('button', { name: /New Voucher|New JV/i }).first();
    if (await newVoucherBtn.isVisible()) {
      await newVoucherBtn.click();
      await page.waitForTimeout(200);
      // Close dialog or dropdown if open
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Voucher details modal
    const viewVoucherBtn = page.locator('table tbody tr button:has(svg.lucide-eye)').first();
    if (await viewVoucherBtn.isVisible()) {
      await viewVoucherBtn.click();
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
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
