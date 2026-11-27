import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const REVIEW_DIR = path.resolve(process.cwd(), 'docs/ui-review-v4');

test.describe('Sections 2 & 3 - Line Items & Form Layout Verification', () => {
  test.beforeAll(() => {
    fs.mkdirSync(REVIEW_DIR, { recursive: true });
  });

  test('Verify line item column widths, plain-English section layout, and split mode', async ({ page }) => {
    // 1. Authenticate
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    await page.setViewportSize({ width: 1440, height: 1100 });

    // 2. Open /invoices/new
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Select customer to display 2-line party chip row
    const partySelect = page.locator('button[aria-label="Select a customer..."]');
    if (await partySelect.isVisible()) {
      await partySelect.click();
      await page.waitForTimeout(300);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await page.waitForTimeout(400);
      }
    }

    const lineItemsCard = page.locator('[data-testid="line-items-section"]');
    await expect(lineItemsCard).toBeVisible();

    // Fill row 1 with: Qty 2, UOM PCS, Rate 10000, Disc 5%, GST 18%
    const qtyInput = page.locator('input[aria-label="Quantity for row 1"]');
    await qtyInput.fill('2');

    // UOM Select
    const uomTrigger = page.locator('button[aria-label="Unit of measure for row 1"]');
    await uomTrigger.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'PCS' }).click();

    // Rate
    const rateInput = page.locator('input[aria-label="Unit rate for row 1"]');
    await rateInput.fill('10000');

    // Disc %
    const discInput = page.locator('input[aria-label="Discount percentage for row 1"]');
    await discInput.fill('5');

    // Trigger blur on inputs to calculate
    await discInput.blur();
    await page.waitForTimeout(500);

    // Verify Amount cell updates to 22,420
    const amountCell = page.locator('tbody tr').first().locator('td').nth(7);
    const amountText = await amountCell.innerText();
    expect(amountText.replace(/\s+/g, '')).toContain('22,420');

    // Verify DOM values
    expect(await qtyInput.inputValue()).toBe('2');
    expect(await rateInput.inputValue()).toBe('10000');
    expect(await discInput.inputValue()).toBe('5');

    // Screenshot 07-line-items-filled.png
    await lineItemsCard.screenshot({
      path: path.join(REVIEW_DIR, '07-line-items-filled.png'),
    });

    // Screenshot 10-form-edit-default.png (Full page in default edit view)
    await page.screenshot({
      path: path.join(REVIEW_DIR, '10-form-edit-default.png'),
      fullPage: false,
    });

    // Switch to Split mode at 1280px viewport
    await page.setViewportSize({ width: 1280, height: 900 });
    const splitBtn = page.getByRole('button', { name: 'Split', exact: false });
    await splitBtn.click();
    await page.waitForTimeout(800);

    // Screenshot 08-line-items-at-1280px.png
    await lineItemsCard.screenshot({
      path: path.join(REVIEW_DIR, '08-line-items-at-1280px.png'),
    });

    // Screenshot 11-form-split.png (Full split view)
    await page.screenshot({
      path: path.join(REVIEW_DIR, '11-form-split.png'),
      fullPage: false,
    });

    // Switch to single-column at 960px viewport
    await page.setViewportSize({ width: 960, height: 900 });
    const editBtn = page.getByRole('button', { name: 'Edit', exact: false });
    await editBtn.click();
    await page.waitForTimeout(600);

    // Scroll line items table rightwards to demonstrate sticky left Item column
    const tableContainer = lineItemsCard.locator('.overflow-x-auto');
    await tableContainer.evaluate((el) => {
      el.scrollLeft = 200;
    });
    await page.waitForTimeout(400);

    // Screenshot 09-line-items-at-960px.png
    await lineItemsCard.screenshot({
      path: path.join(REVIEW_DIR, '09-line-items-at-960px.png'),
    });

    console.log('Sections 2 & 3 screenshots and assertions completed successfully!');
  });
});
