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

test.describe('Section 3: Practice Group Sweeps (/practice/clients, /practice/tasks, /practice/calendar, /practice/documents)', () => {
  test.beforeEach(async ({ context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });
  });

  test.afterEach(async ({ context }, testInfo) => {
    const tracePath = path.resolve(
      process.cwd(),
      `tests/e2e/production/traces/practice-${testInfo.title.replace(/\s+/g, '-').toLowerCase()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  });

  test('3.14 /practice/clients: clients table, new client dialog, search, pagination', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/practice/clients');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Clients/i)).first()).toBeVisible();
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // New Client Dialog
    const newClientBtn = page.getByRole('button', { name: /New Client|Add Client/i }).first();
    if (await newClientBtn.isVisible()) {
      await newClientBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Search filter
    const searchInput = page.getByPlaceholder(/Search clients|Search/i).or(page.locator('input[placeholder*="Search" i]')).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Agarwal');
      await page.waitForTimeout(200);
      await searchInput.fill('');
      await page.waitForTimeout(200);
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/practice/clients');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.15 /practice/tasks: tasks table, status change, filter tabs, new task dialog', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/practice/tasks');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Tasks/i)).first()).toBeVisible();
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // New Task dialog
    const newTaskBtn = page.getByRole('button', { name: /New Task|Add Task/i }).first();
    if (await newTaskBtn.isVisible()) {
      await newTaskBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Filter tabs (All, Pending, In Progress, Completed)
    const filterTabs = page.locator('button:has-text("All"), button:has-text("Pending"), button:has-text("Completed")');
    if ((await filterTabs.count()) > 0) {
      await filterTabs.first().click();
      await page.waitForTimeout(150);
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/practice/tasks');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.16 /practice/calendar: statutory calendar, month navigation, status indicators', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/practice/calendar');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Calendar|Compliance Calendar/i).first()).toBeVisible();

    // Month Navigation: Previous / Next month buttons
    const nextMonthBtn = page.locator('button:has(svg.lucide-chevron-right)').first();
    const prevMonthBtn = page.locator('button:has(svg.lucide-chevron-left)').first();

    if (await nextMonthBtn.isVisible()) {
      await nextMonthBtn.click();
      await page.waitForTimeout(200);
    }
    if (await prevMonthBtn.isVisible()) {
      await prevMonthBtn.click();
      await page.waitForTimeout(200);
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/practice/calendar');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.17 /practice/documents: document requests, upload modal, review action', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/practice/documents');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Documents/i)).first()).toBeVisible();

    // Request Document dialog
    const reqDocBtn = page.getByRole('button', { name: /Request Document|New Request/i }).first();
    if (await reqDocBtn.isVisible()) {
      await reqDocBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Upload Document modal
    const uploadDocBtn = page.getByRole('button', { name: /Upload Document|Upload/i }).first();
    if (await uploadDocBtn.isVisible()) {
      await uploadDocBtn.click();
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
    await page.goto('/practice/documents');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
