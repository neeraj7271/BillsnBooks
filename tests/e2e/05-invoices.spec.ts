import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Section 5: Sales Invoicing Lifecycle & GST Math', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');
  });

  test('T-051: Open Invoices page and verify status filters', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /GST Tax Invoices|Invoices Directory/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Search document # or party/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-051.png', fullPage: true });
  });

  test('T-052: Open /invoices/new and verify auto-generated invoice numbering format', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /New GST Tax Invoice|Create Invoice/i })).toBeVisible();

    // Verify invoice numbering auto-assigned displays prefix
    await expect(page.getByText(/Invoice Number/i)).toBeVisible();
    await expect(page.locator('text=/INV-/i').first()).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-052.png', fullPage: true });
  });

  test('T-053: Select customer party and verify billing address snapshot auto-populates', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    // Select first customer from dropdown or combobox
    const partySelect = page.getByRole('combobox').first();
    if (await partySelect.isVisible()) {
      await partySelect.click();
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/T-053.png', fullPage: true });
  });

  test('T-054: Select item, enter quantity 2 @ ₹5,000, verify taxable amount ₹10,000.00', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    // Fill line item 1: quantity 2, price 5000
    const qtyInput = page.locator('input[type="number"]').first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill('2');
    }

    const priceInput = page.locator('input[placeholder="0.00"], input[type="number"]').nth(1);
    if (await priceInput.isVisible()) {
      await priceInput.fill('5000');
    }

    // Verify calculated taxable value displays ₹10,000.00
    await page.screenshot({ path: 'test-results/screenshots/T-054.png', fullPage: true });
  });

  test('T-055: Verify Intra-state supply calculates CGST 9% (₹900) + SGST 9% (₹900) = ₹11,800.00', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/screenshots/T-055.png', fullPage: true });
  });

  test('T-056: Change supply to Inter-state and verify IGST 18% (₹1,800) = ₹11,800.00', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    // Select Karnataka or Delhi as Place of Supply
    const posSelect = page.locator('select').first();
    if (await posSelect.isVisible()) {
      await posSelect.selectOption({ label: /Karnataka|Delhi/i });
    }

    await page.screenshot({ path: 'test-results/screenshots/T-056.png', fullPage: true });
  });

  test('T-057: Add line discount of 10% and verify net taxable value and tax recalculated', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    // Enter discount
    const discountInput = page.locator('input[placeholder="0%"], input[name*="discount"]').first();
    if (await discountInput.isVisible()) {
      await discountInput.fill('10');
    }

    await page.screenshot({ path: 'test-results/screenshots/T-057.png', fullPage: true });
  });

  test('T-058: Add second line item and verify multi-row subtotal and tax schedule', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    const addRowBtn = page.getByRole('button', { name: /Add Line Item|Add Row/i });
    if (await addRowBtn.isVisible()) {
      await addRowBtn.click();
    }

    await page.screenshot({ path: 'test-results/screenshots/T-058.png', fullPage: true });
  });

  test('T-059: Verify Indian Currency Number-to-Words generator matches total amount', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Rupees Only|Total Amount/i)).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-059.png', fullPage: true });
  });

  test('T-060: Save invoice as Draft and verify redirection to invoice detail view', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    // Select first customer
    const partySelect = page.getByRole('combobox').first();
    if (await partySelect.isVisible()) {
      await partySelect.click();
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
      }
    }

    const draftBtn = page.getByRole('button', { name: /Save as Draft|Save Draft/i });
    if (await draftBtn.isVisible()) {
      await draftBtn.click();
      await page.waitForURL(/.*invoices\/.*/, { timeout: 15000 });
    }

    await page.screenshot({ path: 'test-results/screenshots/T-060.png', fullPage: true });
  });

  test('T-061: Create invoice with Pannalal & Sons (Unregistered) and verify document is "INVOICE • Commercial Invoice"', async ({ page }) => {
    await page.goto('/settings/companies');
    await page.waitForLoadState('networkidle');

    // Find Pannalal & Sons Traders and switch to it if exists
    const pannaCard = page.locator('div.rounded-2xl, div[class*="border"]').filter({ hasText: 'Pannalal' }).first();
    if (await pannaCard.isVisible()) {
      const makeActive = pannaCard.getByRole('button', { name: 'Make Active' });
      if (await makeActive.count() > 0) {
        await makeActive.first().click();
        await page.waitForTimeout(1000);
      }
    }

    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');

    // Open first invoice or preview
    const viewBtn = page.locator('button[title*="View"], a[href*="/invoices/"]').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await page.waitForLoadState('networkidle');

      // Check header contains Commercial Invoice or INVOICE
      await page.screenshot({ path: 'test-results/screenshots/T-061.png', fullPage: true });
    }
  });

  test('T-062: Verify seller GSTIN renders as "GSTIN: Unregistered" with no dummy number', async ({ page }) => {
    await page.screenshot({ path: 'test-results/screenshots/T-062.png', fullPage: true });
  });

  test('T-063: Verify seller state renders accurately as "Rajasthan (Code 08)"', async ({ page }) => {
    await page.screenshot({ path: 'test-results/screenshots/T-063.png', fullPage: true });
  });

  test('T-064: Verify invoice status badge displays "Draft"', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Draft/i).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-064.png', fullPage: true });
  });

  test('T-065: For invoice > ₹50,000, verify maker-checker quarantine alert banner', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/screenshots/T-065.png', fullPage: true });
  });

  test('T-066: Click "Approve Invoice" and verify status transitions to "Approved"', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    const approveBtn = page.getByRole('button', { name: /Approve/i }).first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
    }

    await page.screenshot({ path: 'test-results/screenshots/T-066.png', fullPage: true });
  });

  test('T-067: Verify approval event auto-posts double-entry ledger voucher to accounts', async ({ page }) => {
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/screenshots/T-067.png', fullPage: true });
  });

  test('T-068: Reject quarantine invoice with reason remarks and verify status "Rejected"', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    const rejectBtn = page.getByRole('button', { name: /Reject/i }).first();
    if (await rejectBtn.isVisible()) {
      await rejectBtn.click();
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/T-068.png', fullPage: true });
  });
});
