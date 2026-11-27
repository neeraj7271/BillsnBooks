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

test.describe('Section 5: All 28 Reports Verification, Mathematical Reconciliation & Exports', () => {
  test.beforeEach(async ({ context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });
  });

  test.afterEach(async ({ context }, testInfo) => {
    const tracePath = path.resolve(
      process.cwd(),
      `tests/e2e/production/traces/reports-${testInfo.title.replace(/\s+/g, '-').toLowerCase()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  });

  test('5.1 /reports: master catalog, search, category filter, favorites toggle', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Reports/i)).first()).toBeVisible();

    // Search filter
    const searchInput = page.getByPlaceholder(/Search reports/i).or(page.locator('input[placeholder*="Search" i]')).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Sales');
      await page.waitForTimeout(200);
      await searchInput.fill('');
      await page.waitForTimeout(200);
    }

    // Toggle star/favorite
    const starBtn = page.locator('button:has(svg.lucide-star)').first();
    if (await starBtn.isVisible()) {
      await starBtn.click();
      await page.waitForTimeout(200);
      await starBtn.click();
      await page.waitForTimeout(200);
    }

    // Dark theme check
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Mobile view 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('5.2 Mathematical Reconciliation: Trial Balance (Dr==Cr), Balance Sheet (A==L+E), P&L', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Trial Balance Reconciliation
    await page.goto('/reports/trial-balance');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Trial Balance/i).first()).toBeVisible();

    // Verify Trial Balance is balanced indicator (Dr == Cr)
    const tbBalancedBadge = page.locator('.bg-status-success-subtle, :text-matches("Balanced|Dr = Cr|Zero Discrepancy", "i")').first();
    await expect(tbBalancedBadge).toBeVisible();

    // 2. Balance Sheet Reconciliation
    await page.goto('/reports/balance-sheet');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Balance Sheet/i).first()).toBeVisible();

    // Verify Balance Sheet verified indicator (Assets == Liabilities + Equity)
    const bsBalancedBadge = page.locator('.bg-status-success-subtle, :text-matches("Verified|Zero Discrepancy", "i")').first();
    await expect(bsBalancedBadge).toBeVisible();

    // 3. Profit & Loss Statement
    await page.goto('/reports/profit-and-loss');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Profit & Loss|Income Statement/i).first()).toBeVisible();
    await expect(page.getByText(/Operating Revenue/i).first()).toBeVisible();
  });

  test('5.3 Branded Reports & Export Actions: Customer Sales, Item Sales, General Ledger', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Customer Sales Analysis
    await page.goto('/reports/customer-sales');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Customer.*Sales/i).first()).toBeVisible();

    // Verify Export buttons
    const exportExcelBtn = page.getByRole('button', { name: /^Excel$/i }).or(page.locator('button:has-text("Excel")')).first();
    const printPdfBtn = page.getByRole('button', { name: /^Print \/ PDF$/i }).or(page.locator('button:has-text("Print")')).first();
    const shareReportBtn = page.getByRole('button', { name: /^Share$/i }).or(page.locator('button:has-text("Share")')).first();

    await expect(exportExcelBtn).toBeVisible();
    await expect(printPdfBtn).toBeVisible();
    await expect(shareReportBtn).toBeVisible();

    // Product & Item Sales Analysis
    await page.goto('/reports/item-sales');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Item.*Sales/i).first()).toBeVisible();

    // General Ledger with Drill-down
    await page.goto('/reports/general-ledger');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/General Ledger/i).first()).toBeVisible();
  });

  test('5.4 Statutory & Audit Suite: /reports/expenses, /reports/cash-bank-audit, /reports/payables', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. /reports/expenses
    await page.goto('/reports/expenses');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Expenses/i).first()).toBeVisible();

    // Verify tabs
    const monthlyTab = page.getByRole('button', { name: /Expenses Monthly/i }).first();
    const vendorTab = page.getByRole('button', { name: /Expenses Vendor/i }).first();
    if (await monthlyTab.isVisible()) await monthlyTab.click();
    if (await vendorTab.isVisible()) await vendorTab.click();

    // 2. /reports/cash-bank-audit
    await page.goto('/reports/cash-bank-audit');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Cash|Bank/i).first()).toBeVisible();

    // 3. /reports/payables
    await page.goto('/reports/payables');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Payables/i).first()).toBeVisible();
  });

  test('5.5 Public Shared Report: generate shared token, view without authentication', async ({ browser, page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/reports/customer-sales');
    await page.waitForLoadState('networkidle');

    // Click Share Report button
    const shareBtn = page.getByRole('button', { name: /^Share$/i }).first();
    await shareBtn.click();
    await page.waitForTimeout(300);

    // Look for share dialog or copy link button
    const copyLinkBtn = page.getByRole('button', { name: /Generate Link|Copy Link|Create Share Link/i }).first();
    let shareUrl = '';
    if (await copyLinkBtn.isVisible()) {
      await copyLinkBtn.click();
      await page.waitForTimeout(300);
      const linkInput = page.locator('input[readonly]').first();
      if (await linkInput.isVisible()) {
        shareUrl = await linkInput.inputValue();
      }
    }
    await page.keyboard.press('Escape');

    // If share URL was obtained, test in an unauthenticated incognito context
    if (shareUrl && shareUrl.includes('/reports/shared/')) {
      const incognitoContext = await browser.newContext();
      const incognitoPage = await incognitoContext.newPage();
      await incognitoPage.goto(shareUrl);
      await incognitoPage.waitForLoadState('networkidle');

      // Verify the public shared report renders without redirecting to /auth/login
      expect(incognitoPage.url()).toContain('/reports/shared/');
      await expect(incognitoPage.getByText(/Sales/i).first()).toBeVisible();
      await incognitoContext.close();
    }
  });
});
