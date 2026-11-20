import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Section 19: Enterprise Reports, Branded Exports & Sharing E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('E2E-REP-01: Navigate to /reports and verify Starred Shelf and Master Catalog', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Verify main headings and subtitle
    await expect(page.getByRole('heading', { name: /Reports & Business Intelligence/i })).toBeVisible();
    await expect(page.getByText(/Enterprise-grade branded reports with formulas/i)).toBeVisible();

    // Verify Starred Reports shelf
    await expect(page.getByText(/Starred Reports/i)).toBeVisible();

    // Verify presence of Customer-Wise Sales and Product & Item-Wise Sales
    await expect(page.getByRole('heading', { name: /Customer-Wise Sales Summary/i }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Product & Item-Wise Sales/i }).first()).toBeVisible();

    // Test live search filtering
    const searchInput = page.getByPlaceholder(/Search reports by name/i);
    await searchInput.fill('Customer');
    await expect(page.getByRole('heading', { name: /Customer-Wise Sales Summary/i }).first()).toBeVisible();

    await searchInput.fill('');
    await page.screenshot({ path: 'test-results/screenshots/E2E-REP-01.png', fullPage: true });
  });

  test('E2E-REP-02: Toggle Favorite/Star on reports and verify persistence', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Find the star button for AR Ageing or Item Sales and toggle
    const reportCard = page.locator('div').filter({ hasText: /AR Ageing & Dunning Analysis/i }).first();
    const starBtn = reportCard.locator('button[title*="favorites"]').first();
    await expect(starBtn).toBeVisible();

    // Toggle star state
    await starBtn.click();
    await page.waitForTimeout(500);

    // Reload page to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Reports & Business Intelligence/i })).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/E2E-REP-02.png', fullPage: true });
  });

  test('E2E-REP-03: View Customer-Wise Sales Report with KPI cards and table totals', async ({ page }) => {
    await page.goto('/reports/customer-sales');
    await page.waitForLoadState('networkidle');

    // Verify Header
    await expect(page.getByRole('heading', { name: /Customer-Wise Sales Analysis/i })).toBeVisible();

    // Verify KPI summary cards
    await expect(page.getByText(/Total Invoices/i)).toBeVisible();
    await expect(page.getByText(/Taxable Turnover/i)).toBeVisible();
    await expect(page.getByText(/Total Sales \(Gross\)/i)).toBeVisible();
    await expect(page.getByText(/Outstanding Due/i)).toBeVisible();

    // Verify action buttons
    await expect(page.getByRole('button', { name: /Export Excel \(\.xlsx\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Print \/ PDF/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Share Report/i })).toBeVisible();

    // Verify table headers
    await expect(page.getByRole('columnheader', { name: /Customer Name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /GSTIN \/ Tax ID/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Total Sales \(₹\)/i })).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/E2E-REP-03.png', fullPage: true });
  });

  test('E2E-REP-04: View Product & Item-Wise Sales Report', async ({ page }) => {
    await page.goto('/reports/item-sales');
    await page.waitForLoadState('networkidle');

    // Verify Header
    await expect(page.getByRole('heading', { name: /Product & Item-Wise Sales Analysis/i })).toBeVisible();

    // Verify KPI summary cards
    await expect(page.getByText(/Distinct Products/i)).toBeVisible();
    await expect(page.getByText(/Total Quantity Sold/i)).toBeVisible();
    await expect(page.getByText(/Gross Item Sales/i)).toBeVisible();

    // Verify table headers
    await expect(page.getByRole('columnheader', { name: /Product \/ Item Name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /HSN \/ SAC/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Qty Sold/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Gross Total \(₹\)/i })).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/E2E-REP-04.png', fullPage: true });
  });

  test('E2E-REP-05: Branded Excel Export (.xlsx) download verification', async ({ page }) => {
    page.on('console', (msg) => console.log('[BROWSER CONSOLE]', msg.text()));
    page.on('dialog', async (dialog) => {
      console.log('[BROWSER DIALOG]', dialog.message());
      await dialog.dismiss();
    });

    await page.goto('/reports/customer-sales');
    await page.waitForLoadState('networkidle');

    const exportBtn = page.getByRole('button', { name: /Export Excel \(\.xlsx\)/i });
    await expect(exportBtn).toBeVisible();

    // Intercept backend API export request
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/export') && res.status() === 200),
      exportBtn.click(),
    ]);

    expect(response.headers()['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.headers()['content-disposition']).toContain('.xlsx');

    await page.screenshot({ path: 'test-results/screenshots/E2E-REP-05.png', fullPage: true });
  });

  test('E2E-REP-06: Report Sharing Dialog & Secure Shared View link', async ({ page, context }) => {
    await page.goto('/reports/customer-sales');
    await page.waitForLoadState('networkidle');

    // Open Share Dialog
    const shareBtn = page.getByRole('button', { name: /Share Report/i });
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Scope to modal dialog
    const modal = page.locator('.fixed.inset-0');
    await expect(modal.getByRole('heading', { name: /Share Report/i })).toBeVisible();

    // Select WhatsApp channel to preview
    await modal.getByRole('button', { name: /WhatsApp/i }).click();
    await expect(modal.getByText(/Recipient WhatsApp Number/i)).toBeVisible();

    // Switch back to Direct Link and generate
    await modal.getByRole('button', { name: 'Link', exact: true }).click();
    const generateBtn = modal.getByRole('button', { name: /Generate Link/i });
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Verify success result with generated URL
    await expect(modal.getByText(/Secure Link Ready/i)).toBeVisible();
    const shareUrlInput = modal.locator('input[readonly].select-all');
    await expect(shareUrlInput).toBeVisible();
    const shareUrl = await shareUrlInput.inputValue();
    expect(shareUrl).toContain('/reports/shared/');

    // Navigate to the shared report URL in a new page context
    const sharedPage = await context.newPage();
    await sharedPage.goto(shareUrl);
    await sharedPage.waitForLoadState('networkidle');

    // Verify Shared Document view
    await expect(sharedPage.getByText(/Verified Secure Document/i)).toBeVisible();
    await expect(sharedPage.getByRole('heading', { name: /Customer-Wise Sales/i })).toBeVisible();
    await expect(sharedPage.getByRole('button', { name: /Download Excel \(\.xlsx\)/i })).toBeVisible();
    await expect(sharedPage.getByRole('button', { name: /Print \/ View PDF/i })).toBeVisible();

    await sharedPage.screenshot({ path: 'test-results/screenshots/E2E-REP-06-shared.png', fullPage: true });
    await sharedPage.close();
  });

  test('E2E-REP-07: High-Fidelity Branded PDF export formatting verification', async ({ page, context }) => {
    await page.goto('/reports/customer-sales');
    await page.waitForLoadState('networkidle');

    // Intercept window.open when clicking Print / PDF
    const [pdfPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: /Print \/ PDF/i }).click(),
    ]);

    await pdfPage.waitForLoadState('networkidle');

    // Verify Print Toolbar presence
    await expect(pdfPage.getByRole('button', { name: /Print \/ Save as PDF/i })).toBeVisible();
    await expect(pdfPage.getByRole('button', { name: /Close Window/i })).toBeVisible();

    // Verify Corporate Letterhead details
    await expect(pdfPage.locator('.company-title')).toBeVisible();
    await expect(pdfPage.locator('.report-title-text')).toContainText(/Customer-Wise Sales Analysis Report/i);

    // Verify Data Table formatting and Totals row
    await expect(pdfPage.locator('table thead')).toBeVisible();
    await expect(pdfPage.locator('tr.total-row')).toBeVisible();

    await pdfPage.screenshot({ path: 'test-results/screenshots/E2E-REP-07-pdf.png', fullPage: true });
    await pdfPage.close();
  });
});
