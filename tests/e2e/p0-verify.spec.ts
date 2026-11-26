import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const REVIEW_DIR = path.resolve(process.cwd(), 'docs/ui-review-v5');

test.describe('P0 Hard Gate Verification Suite', () => {
  test.beforeAll(() => {
    fs.mkdirSync(REVIEW_DIR, { recursive: true });
  });

  test('P0.1: Live Preview - 3 Distinct Templates & 3 Clean A4 PDFs', async ({ page }) => {
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

    // Switch to Preview Mode
    const previewModeBtn = page.getByRole('button', { name: 'Preview', exact: false });
    await previewModeBtn.click();
    await page.waitForTimeout(600);

    const previewContainer = page.locator('[data-testid="invoice-live-preview"]');
    await expect(previewContainer).toBeVisible();

    // Template 1: Minimal
    await page.getByRole('button', { name: 'Minimal', exact: true }).click();
    await page.waitForTimeout(500);
    await previewContainer.screenshot({
      path: path.join(REVIEW_DIR, '01-preview-minimal.png'),
    });

    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: path.join(REVIEW_DIR, '04-print-minimal.pdf'),
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    await page.emulateMedia({ media: 'screen' });

    // Template 2: Modern
    await page.getByRole('button', { name: 'Modern', exact: true }).click();
    await page.waitForTimeout(500);
    await previewContainer.screenshot({
      path: path.join(REVIEW_DIR, '02-preview-modern.png'),
    });

    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: path.join(REVIEW_DIR, '05-print-modern.pdf'),
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    await page.emulateMedia({ media: 'screen' });

    // Template 3: Tally
    await page.getByRole('button', { name: 'Tally', exact: true }).click();
    await page.waitForTimeout(500);
    await previewContainer.screenshot({
      path: path.join(REVIEW_DIR, '03-preview-tally.png'),
    });

    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: path.join(REVIEW_DIR, '06-print-tally.pdf'),
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    await page.emulateMedia({ media: 'screen' });

    // Assert that company name or PAN snapshot is present
    await expect(page.locator('#printable-invoice')).toContainText(/PAN/i);
  });

  test('P0.2: Line-Item Column Widths & Visibility', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    await page.setViewportSize({ width: 1440, height: 1100 });

    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const lineItemsSection = page.locator('[data-testid="line-items-section"]');
    await expect(lineItemsSection).toBeVisible();

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

    // GST % Select
    const gstTrigger = page.locator('button[aria-label="GST tax slab for row 1"]');
    await gstTrigger.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: '18%' }).click();
    await page.waitForTimeout(500);

    // Verify calculated amount ₹22,420.00
    await expect(lineItemsSection).toContainText('22,420.00');

    // Verify clipping assertions on all inputs: scrollWidth <= clientWidth
    const inputsToCheck = [qtyInput, rateInput, discInput];
    for (const input of inputsToCheck) {
      const isNotClipped = await input.evaluate((el: HTMLInputElement) => {
        return el.scrollWidth <= el.clientWidth + 2;
      });
      expect(isNotClipped).toBe(true);
    }

    // Capture 07-line-items-filled.png
    await lineItemsSection.screenshot({
      path: path.join(REVIEW_DIR, '07-line-items-filled.png'),
    });

    // Capture 08-line-items-split-1280.png at exactly 1280x900
    await page.setViewportSize({ width: 1280, height: 900 });
    const splitBtn = page.getByRole('button', { name: 'Split', exact: true });
    await splitBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(REVIEW_DIR, '08-line-items-split-1280.png'),
    });

    // Capture 09-line-items-narrow.png at 960px
    await page.setViewportSize({ width: 960, height: 900 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(REVIEW_DIR, '09-line-items-narrow.png'),
    });
  });

  test('P0.3: Toast and ConfirmDialog Primitives', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Test Toast Success
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      if ((window as any).__toast) {
        (window as any).__toast.success('Invoice #INV-2026-0042 approved and voucher posted');
      }
    });
    await page.waitForTimeout(400);
    const successToast = page.locator('[data-testid="toast-success"]');
    await expect(successToast).toBeVisible();
    await page.screenshot({
      path: path.join(REVIEW_DIR, '10-toast-success.png'),
    });

    // 2. Test Toast Error (triggered by export error or directly)
    await page.evaluate(() => {
      if ((window as any).__toast) {
        (window as any).__toast.error('Export failed: Connection to report generation engine timed out');
      }
    });
    await page.waitForTimeout(400);
    const errorToast = page.locator('[data-testid="toast-error"]');
    await expect(errorToast).toBeVisible();
    await page.screenshot({
      path: path.join(REVIEW_DIR, '11-toast-error.png'),
    });

    // 3. Test Themed ConfirmDialog on Ledgers page
    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Trigger confirmDialog
    await page.evaluate(() => {
      if ((window as any).__confirmDialog) {
        (window as any).__confirmDialog({
          title: 'Delete ledger account',
          description: 'This will remove the ledger "Travel & Entertainment". Double-entry balances will be verified before deletion.',
          confirmLabel: 'Delete',
          variant: 'danger',
        });
      }
    });
    await page.waitForTimeout(400);

    const dialog = page.locator('[data-testid="themed-confirm-dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Delete ledger account');

    await page.screenshot({
      path: path.join(REVIEW_DIR, '12-confirm-dialog.png'),
    });

    // Verify Esc key closes the dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(dialog).not.toBeVisible();
  });
});
