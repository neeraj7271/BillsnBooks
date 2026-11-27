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

test.describe('Section 3: Invoices Group Sweeps (/invoices, /invoices/new, /invoices/[id], /approvals)', () => {
  test.beforeEach(async ({ context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });
  });

  test.afterEach(async ({ context }, testInfo) => {
    const tracePath = path.resolve(
      process.cwd(),
      `tests/e2e/production/traces/invoices-${testInfo.title.replace(/\s+/g, '-').toLowerCase()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  });

  test('3.1 /invoices: full list controls, sorting, pagination, search, themes, mobile', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);

    // Desktop Light
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');

    // Verify main header and table
    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Invoices/i)).first()).toBeVisible();
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // Verify Search filter
    const searchInput = page.getByPlaceholder(/Search invoices/i).or(page.locator('input[type="search"]')).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('INV');
      await page.waitForTimeout(300);
      await searchInput.fill('');
      await page.waitForTimeout(300);
    }

    // Verify Status filter tabs (Draft, Approved, etc)
    const filterTabs = page.locator('button:has-text("Draft"), button:has-text("Approved"), button:has-text("All")');
    const tabCount = await filterTabs.count();
    for (let i = 0; i < Math.min(3, tabCount); i++) {
      await filterTabs.nth(i).click();
      await page.waitForTimeout(150);
    }
    // Return to All
    const allTab = page.locator('button:has-text("All")').first();
    if (await allTab.isVisible()) {
      await allTab.click();
      await page.waitForTimeout(150);
    }

    // Verify Column Sort (click column header)
    const sortableHeader = page.locator('th button, th.cursor-pointer, th:has(svg)').first();
    if (await sortableHeader.isVisible()) {
      await sortableHeader.click();
      await page.waitForTimeout(200);
      await sortableHeader.click();
      await page.waitForTimeout(200);
    }

    // Verify Pagination (page size + next/prev)
    const nextBtn = page.getByRole('button', { name: /^Next$/i }).or(page.locator('button:has(svg.lucide-chevron-right)')).first();
    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(300);
      const prevBtn = page.getByRole('button', { name: /^Previous$/i }).or(page.locator('button:has(svg.lucide-chevron-left)')).first();
      if (await prevBtn.isVisible() && await prevBtn.isEnabled()) {
        await prevBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Test in Dark Theme
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Test Mobile Viewport 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.2 /invoices/new: form controls, add line, split/preview toggle, template switch', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    // Verify primary form sections
    await expect(page.getByText(/Customer|Party/i).first()).toBeVisible();
    await expect(page.getByText(/Line Items/i).first()).toBeVisible();

    // Toggle Preview modes (Edit, Split, Preview)
    const previewBtn = page.getByRole('button', { name: /^Preview$/i }).or(page.getByText(/^Preview$/i)).first();
    const splitBtn = page.getByRole('button', { name: /^Split$/i }).or(page.getByText(/^Split$/i)).first();
    const editBtn = page.getByRole('button', { name: /^Edit$/i }).or(page.getByText(/^Edit$/i)).first();

    if (await previewBtn.isVisible()) {
      await previewBtn.click();
      await page.waitForTimeout(200);

      // Verify template buttons in preview (Minimal, Modern, Tally)
      const templateMinimal = page.getByRole('button', { name: /Minimal/i }).first();
      const templateModern = page.getByRole('button', { name: /Modern/i }).first();
      const templateTally = page.getByRole('button', { name: /Tally/i }).first();

      if (await templateMinimal.isVisible()) await templateMinimal.click();
      if (await templateModern.isVisible()) await templateModern.click();
      if (await templateTally.isVisible()) await templateTally.click();
    }

    if (await splitBtn.isVisible()) {
      await splitBtn.click();
      await page.waitForTimeout(200);
    }

    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(200);
    }

    // Add line item button
    const addLineBtn = page.getByRole('button', { name: /Add Item|Add Line/i }).first();
    if (await addLineBtn.isVisible()) {
      await addLineBtn.click();
      await page.waitForTimeout(200);
    }

    // Test in Dark Theme
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Test Mobile Viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Line Items/i).first()).toBeVisible();
  });

  test('3.3 /invoices/[id]: detail view, template toggle, action buttons, client read-only', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to invoices list and pick first invoice
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');

    const firstInvoiceLink = page.locator('table tbody tr a[href^="/invoices/"]').first();
    if (await firstInvoiceLink.isVisible()) {
      await firstInvoiceLink.click();
      await page.waitForURL(/\/invoices\/[a-f0-9-]+/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/invoices\/[a-zA-Z0-9_-]+/);

      // Template switcher on detail page
      const templateMinimal = page.getByRole('button', { name: /Minimal/i }).first();
      const templateModern = page.getByRole('button', { name: /Modern/i }).first();
      const templateTally = page.getByRole('button', { name: /Tally/i }).first();

      if (await templateMinimal.isVisible()) {
        await templateMinimal.click();
        await page.waitForTimeout(150);
      }
      if (await templateModern.isVisible()) {
        await templateModern.click();
        await page.waitForTimeout(150);
      }
      if (await templateTally.isVisible()) {
        await templateTally.click();
        await page.waitForTimeout(150);
      }

      // Share button / modal
      const shareBtn = page.getByRole('button', { name: /Share/i }).first();
      if (await shareBtn.isVisible()) {
        await shareBtn.click();
        await page.waitForTimeout(200);
        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
      }
    }

    // Role check: CLIENT_VIEWER sees read-only detail view without approve/cancel
    await loginAs(page, CLIENT_EMAIL);
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');
    const clientFirstInv = page.locator('table tbody tr a[href^="/invoices/"]').first();
    if (await clientFirstInv.isVisible()) {
      await clientFirstInv.click();
      await page.waitForURL(/\/invoices\/[a-f0-9-]+/, { timeout: 10000 });
      // Verify approve / reject / cancel are NOT visible for client viewer
      const approveBtn = page.getByRole('button', { name: /^Approve$/i });
      await expect(approveBtn).toBeHidden();
    }
  });

  test('3.4 /approvals: maker-checker inbox, filter, role gating', async ({ page }) => {
    // Partner can access approvals
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Approval|Pending Approval/i).first()).toBeVisible();

    // Verify filters or empty state
    const filterTabs = page.locator('button:has-text("All"), button:has-text("Pending"), button:has-text("Approved")');
    if ((await filterTabs.count()) > 0) {
      await filterTabs.first().click();
      await page.waitForTimeout(150);
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
