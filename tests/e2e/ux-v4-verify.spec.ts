import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const REVIEW_DIR = path.resolve(process.cwd(), 'docs/ui-review-v3');

test.describe('UI Refresh V3 / V4 Verification Suite', () => {
  test.setTimeout(180_000);

  test.beforeAll(() => {
    fs.mkdirSync(REVIEW_DIR, { recursive: true });
  });

  test('Verify pinned sidebar, 3-mode invoice create, list pagination, and notification center', async ({ page }) => {
    // 1. Authenticate
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });
    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // --- REQUIREMENT 1: Pinned Sidebar Scroll Test ---
    await page.goto('/items');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const sidebar = page.locator('[data-testid="sidebar"]');
    const initialBox = await sidebar.boundingBox();
    expect(initialBox).not.toBeNull();
    expect(initialBox?.y).toBe(0);

    // Scroll <main> element down
    const mainContainer = page.locator('main');
    await mainContainer.evaluate((el) => {
      el.scrollTop = 1200;
    });
    await page.waitForTimeout(300);

    const scrolledBox = await sidebar.boundingBox();
    expect(scrolledBox?.y).toBe(0); // Sidebar stays pinned at y = 0
    await page.screenshot({ path: path.join(REVIEW_DIR, 'shell-scroll-sidebar-pinned.png') });

    // --- REQUIREMENT 2: Invoice Create 3-Way Mode ---
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Edit mode
    const editBtn = page.getByRole('button', { name: /^Edit$/i });
    const splitBtn = page.getByRole('button', { name: /^Split$/i });
    const previewBtn = page.getByRole('button', { name: /^Preview$/i });

    await editBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator('[data-testid="invoice-live-preview"]').count()).toBe(0);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'invoice-edit.png') });

    // Split mode
    await splitBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator('[data-testid="invoice-live-preview"]').isVisible()).toBe(true);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'invoice-split.png') });

    // Preview mode
    await previewBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator('[data-testid="invoice-live-preview"]').isVisible()).toBe(true);
    expect(await page.getByRole('button', { name: /Back to Edit/i }).isVisible()).toBe(true);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'invoice-preview.png') });

    // --- REQUIREMENT 3: Pagination Across List Pages ---
    // Invoices list
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(await page.locator('text=Showing').first().isVisible()).toBe(true);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'pagination-invoices.png') });

    // Items list
    await page.goto('/items');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(await page.locator('text=Showing').first().isVisible()).toBe(true);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'pagination-items.png') });

    // Reports list (Customer Sales)
    await page.goto('/reports/customer-sales');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(await page.locator('text=Showing').first().isVisible()).toBe(true);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'pagination-reports.png') });

    // --- REQUIREMENT 5: Notification Center ---
    // Bell Dropdown (Light)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const bellBtn = page.getByRole('button', { name: /^Notifications$/i });
    await bellBtn.click();
    await page.waitForTimeout(400);
    const notifDialog = page.locator('[role="dialog"][aria-label="Notification center"]');
    expect(await notifDialog.isVisible()).toBe(true);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'notifications-dropdown.png') });

    // Bell Dropdown (Dark)
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'notifications-dropdown-dark.png') });

    // Full Notifications Page (Light & Dark)
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'notifications-full-page.png') });

    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(REVIEW_DIR, 'notifications-full-page-dark.png') });
  });
});
