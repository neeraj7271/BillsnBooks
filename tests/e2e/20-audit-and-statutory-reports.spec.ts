import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Section 20: Audit & Statutory Compliance Reports E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('E2E-AUDIT-01: Navigate to /reports/expenses and verify tabs, Remarks & Action banner', async ({ page }) => {
    await page.goto('/reports/expenses');
    await page.waitForLoadState('networkidle');

    // Verify Title & Subtitle
    await expect(page.getByRole('heading', { name: /Purchases & Operational Expenses Suite/i })).toBeVisible();

    // Verify all primary tabs matching Image 1
    await expect(page.getByRole('button', { name: 'Purchase Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Expenses Monthly' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Expenses VendorWise' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Expenses CategoryWise' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Expenses Register' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Purchases ItemWise' })).toBeVisible();
    await expect(page.getByRole('button', { name: /More Reports/i })).toBeVisible();

    // Verify Remarks & Action banner text from Image 1
    await expect(page.getByText(/Expenses incurred during the month/i)).toBeVisible();
    await expect(page.getByText(/Review the variation or trend of Expenses month on month/i)).toBeVisible();

    // Switch to Expenses VendorWise tab
    await page.getByRole('button', { name: 'Expenses VendorWise' }).click();
    await expect(page.getByText(/Vendor-wise expense aggregation for commercial review/i)).toBeVisible();

    // Switch to Purchases ItemWise tab
    await page.getByRole('button', { name: 'Purchases ItemWise' }).click();
    await expect(page.getByText(/SKU and product procurement volume and rate analysis/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/E2E-AUDIT-01.png', fullPage: true });
  });

  test('E2E-AUDIT-02: Test More Reports dropdown on /reports/expenses', async ({ page }) => {
    await page.goto('/reports/expenses');
    await page.waitForLoadState('networkidle');

    // Click More Reports dropdown
    const moreBtn = page.getByRole('button', { name: /More Reports/i });
    await moreBtn.click();

    // Verify dropdown items
    await expect(page.getByRole('button', { name: 'Expenses VoucherTypeWise' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ledgers-Negative Balance' })).toBeVisible();

    // Select Expenses VoucherTypeWise
    await page.getByRole('button', { name: 'Expenses VoucherTypeWise' }).click();
    await expect(page.getByRole('columnheader', { name: /Voucher No/i })).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/E2E-AUDIT-02.png', fullPage: true });
  });

  test('E2E-AUDIT-03: Navigate to /reports/cash-bank-audit and verify tabs and sanity banner', async ({ page }) => {
    await page.goto('/reports/cash-bank-audit');
    await page.waitForLoadState('networkidle');

    // Verify Title
    await expect(page.getByRole('heading', { name: /Cash & Bank Statutory Audit Suite/i })).toBeVisible();

    // Verify all primary tabs matching Image 2
    await expect(page.getByRole('button', { name: 'Cash - Negative Balance' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bank - Negative Balance' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inter Bank Transfers' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cash Withdrawals' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cash Deposits' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cash Expenses' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cash Income' })).toBeVisible();

    // Verify Remarks & Action banner text from Image 2
    await expect(page.getByText(/Cash Balance can never be negative, you cannot spend what you do not have/i)).toBeVisible();
    await expect(page.getByText(/Check for Missing Receipts or Duplicate Payments/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/E2E-AUDIT-03.png', fullPage: true });
  });

  test('E2E-AUDIT-04: Test Income Tax limits (Sec 40A(3) & 269ST) on /reports/cash-bank-audit', async ({ page }) => {
    await page.goto('/reports/cash-bank-audit');
    await page.waitForLoadState('networkidle');

    // Open More Reports dropdown
    await page.getByRole('button', { name: /More Reports/i }).click();

    // Verify Section 40A(3) option
    const sec40Btn = page.getByRole('button', { name: /Cash Payments > ₹10,000/i });
    await expect(sec40Btn).toBeVisible();
    await sec40Btn.click();

    // Verify banner updates to Sec 40A(3) statutory guidance
    await expect(page.getByText(/Sec 40A\(3\)/i)).toBeVisible();

    // Open More Reports dropdown again and select Sec 269ST
    await page.getByRole('button', { name: /More Reports/i }).click();
    const sec269Btn = page.getByRole('button', { name: /Cash Receipts ≥ ₹2 Lakh/i });
    await expect(sec269Btn).toBeVisible();
    await sec269Btn.click();

    // Verify banner updates to Sec 269ST penalty alert
    await expect(page.getByText(/Sec 269ST/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/E2E-AUDIT-04.png', fullPage: true });
  });

  test('E2E-AUDIT-05: Navigate to /reports/payables and verify tabs, Remarks & Action banner', async ({ page }) => {
    await page.goto('/reports/payables');
    await page.waitForLoadState('networkidle');

    // Verify Title
    await expect(page.getByRole('heading', { name: /Vendor Payables & Master Hygiene Suite/i })).toBeVisible();

    // Verify primary tabs matching Image 3
    await expect(page.getByRole('button', { name: 'Payables Summary' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Payables Ageing - Tally' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Payables Ageing - FIFO' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Advance to Vendors' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Receipts from Vendors' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Vendors booked through vouchers other than Purchase/i })).toBeVisible();

    // Verify Remarks & Action banner text from Image 3
    await expect(page.getByText(/Gives birdeye view of total outstanding from each vendor/i)).toBeVisible();
    await expect(page.getByText(/Confirm the dues and follow up for recovery/i)).toBeVisible();

    // Verify Table column headers matching Image 3
    await expect(page.getByRole('columnheader', { name: 'Sr. No.' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Ledger Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Primary Group' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Opening Balance' })).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/E2E-AUDIT-05.png', fullPage: true });
  });

  test('E2E-AUDIT-06: Test Master Hygiene dropdown (Missing PAN & GSTIN) on /reports/payables', async ({ page }) => {
    await page.goto('/reports/payables');
    await page.waitForLoadState('networkidle');

    // Open More Reports dropdown
    await page.getByRole('button', { name: /More Reports/i }).click();

    // Verify options
    await expect(page.getByRole('button', { name: 'Ledgers - Squared Off' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ledgers - Same Opening & Closing Balance' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ledgers - Not Used' })).toBeVisible();

    // Check PAN missing
    const panBtn = page.getByRole('button', { name: /PAN Unavailable/i });
    await expect(panBtn).toBeVisible();
    await panBtn.click();

    // Verify Section 206AA penal TDS banner
    await expect(page.getByText(/Section 206AA/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/E2E-AUDIT-06.png', fullPage: true });
  });

  test('E2E-AUDIT-07: Trigger Branded Excel export on /reports/expenses and verify response', async ({ page }) => {
    await page.goto('/reports/expenses');
    await page.waitForLoadState('networkidle');

    const exportBtn = page.getByRole('button', { name: /Export Excel \(\.xlsx\)/i });
    await expect(exportBtn).toBeVisible();

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/export') && res.status() === 200),
      exportBtn.click(),
    ]);

    expect(response.headers()['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.headers()['content-disposition']).toContain('.xlsx');

    await page.screenshot({ path: 'test-results/screenshots/E2E-AUDIT-07.png', fullPage: true });
  });
});
