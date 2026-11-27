import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const VIDEO_DIR = path.resolve(process.cwd(), 'tests/e2e/screencasts');

test.use({
  video: {
    mode: 'on',
    size: { width: 1440, height: 900 },
  },
  viewport: { width: 1440, height: 900 },
});

test.describe('One-Minute Demonstration Screencast', () => {
  test.beforeAll(() => {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
  });

  test('Record full invoice workflow: template switcher, line items typing, submission, detail view', async ({ page }) => {
    // 1. Authenticate
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    // 2. Open /invoices/new
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 3. Switch to Preview Mode
    const previewBtn = page.getByRole('button', { name: 'Preview', exact: false });
    await previewBtn.click();
    await page.waitForTimeout(1500);

    // Switch between templates to demonstrate distinct visual designs
    await page.getByRole('button', { name: 'Minimal', exact: true }).click();
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: 'Modern', exact: true }).click();
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: 'Tally', exact: true }).click();
    await page.waitForTimeout(2000);

    // 4. Switch back to Edit Mode
    const editBtn = page.getByRole('button', { name: 'Edit', exact: true });
    await editBtn.click();
    await page.waitForTimeout(1000);

    // Select Customer
    const partySelect = page.locator('button[aria-label="Select a customer..."]');
    if (await partySelect.isVisible()) {
      await partySelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await page.waitForTimeout(800);
      }
    }

    // 5. Type real values into line items across all columns
    const hsnInput = page.locator('input[aria-label="HSN or SAC code for row 1"]');
    await hsnInput.fill('998311');
    await page.waitForTimeout(300);

    const qtyInput = page.locator('input[aria-label="Quantity for row 1"]');
    await qtyInput.fill('2');
    await page.waitForTimeout(300);

    const uomTrigger = page.locator('button[aria-label="Unit of measure for row 1"]');
    await uomTrigger.click();
    await page.waitForTimeout(400);
    await page.getByRole('option', { name: 'PCS' }).click();
    await page.waitForTimeout(300);

    const rateInput = page.locator('input[aria-label="Unit rate for row 1"]');
    await rateInput.fill('10000');
    await page.waitForTimeout(300);

    const discInput = page.locator('input[aria-label="Discount percentage for row 1"]');
    await discInput.fill('5');
    await page.waitForTimeout(300);
    await discInput.blur();
    await page.waitForTimeout(1000);

    // Verify Amount
    const amountCell = page.locator('tbody tr').first().locator('td').nth(7);
    await expect(amountCell).toContainText('22,420');

    // 6. Submit the Invoice
    const submitBtn = page.getByRole('button', { name: /Save & Submit for Approval|Save as Draft/i }).last();
    await submitBtn.click();
    await page.waitForTimeout(3000);

    // Navigate to /invoices list to click the newly created invoice
    if (!page.url().includes('/invoices/')) {
      await page.goto('/invoices');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    // Open first invoice row if on list
    const firstInvoiceRow = page.locator('table tbody tr').first();
    if (await firstInvoiceRow.isVisible()) {
      await firstInvoiceRow.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
    }

    // 7. On Detail Page: verify and cycle 3 templates
    const modernBtn = page.getByRole('button', { name: /Modern/i }).first();
    const tallyBtn = page.getByRole('button', { name: /Tally/i }).first();
    const minimalBtn = page.getByRole('button', { name: /Minimal/i }).first();

    if (await modernBtn.isVisible()) {
      await modernBtn.click();
      await page.waitForTimeout(2000);
    }
    if (await tallyBtn.isVisible()) {
      await tallyBtn.click();
      await page.waitForTimeout(2000);
    }
    if (await minimalBtn.isVisible()) {
      await minimalBtn.click();
      await page.waitForTimeout(2000);
    }

    console.log('Screencast recording successfully finished!');
  });
});
