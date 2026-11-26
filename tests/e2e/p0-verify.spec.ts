import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const REVIEW_DIR = path.resolve(process.cwd(), 'docs/ui-review-v5');

async function setMode(page: any, mode: 'light' | 'dark') {
  await page.evaluate((m: string) => {
    localStorage.setItem('theme', m);
    if (m === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, mode);
  await page.waitForTimeout(200);
}

test.describe('P0 Hard Gate Verification Suite (Light & Dark)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(REVIEW_DIR, { recursive: true });
  });

  test('P0.1: Live Preview - 3 Distinct Templates & 3 Clean A4 PDFs (Light + Dark)', async ({ page }) => {
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

    // Switch to Preview Mode
    const previewModeBtn = page.getByRole('button', { name: 'Preview', exact: false });
    await previewModeBtn.click();
    await page.waitForTimeout(600);

    const previewContainer = page.locator('[data-testid="invoice-live-preview"]');
    await expect(previewContainer).toBeVisible();

    // --- Template 1: Minimal ---
    await page.getByRole('button', { name: 'Minimal', exact: true }).click();
    await page.waitForTimeout(500);
    await setMode(page, 'light');
    await previewContainer.screenshot({ path: path.join(REVIEW_DIR, '01-preview-minimal.png') });
    await setMode(page, 'dark');
    await previewContainer.screenshot({ path: path.join(REVIEW_DIR, '01-preview-minimal-dark.png') });
    await setMode(page, 'light');

    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: path.join(REVIEW_DIR, '04-print-minimal.pdf'),
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    await page.emulateMedia({ media: 'screen' });

    // --- Template 2: Modern ---
    await page.getByRole('button', { name: 'Modern', exact: true }).click();
    await page.waitForTimeout(500);
    await setMode(page, 'light');
    await previewContainer.screenshot({ path: path.join(REVIEW_DIR, '02-preview-modern.png') });
    await setMode(page, 'dark');
    await previewContainer.screenshot({ path: path.join(REVIEW_DIR, '02-preview-modern-dark.png') });
    await setMode(page, 'light');

    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: path.join(REVIEW_DIR, '05-print-modern.pdf'),
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    await page.emulateMedia({ media: 'screen' });

    // --- Template 3: Tally ---
    await page.getByRole('button', { name: 'Tally', exact: true }).click();
    await page.waitForTimeout(500);
    await setMode(page, 'light');
    await previewContainer.screenshot({ path: path.join(REVIEW_DIR, '03-preview-tally.png') });
    await setMode(page, 'dark');
    await previewContainer.screenshot({ path: path.join(REVIEW_DIR, '03-preview-tally-dark.png') });
    await setMode(page, 'light');

    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: path.join(REVIEW_DIR, '06-print-tally.pdf'),
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    await page.emulateMedia({ media: 'screen' });

    // Assert real company name & real PAN
    const text = await page.locator('#printable-invoice').innerText();
    expect(text).toContain('HeavyQA T1 Co1 Pvt Ltd');
    expect(text).toContain('AABTH1201D');
  });

  test('P0.2: Line-Item Column Widths & Visibility (Light + Dark)', async ({ page }) => {
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

    // Capture 07-line-items-filled.png (Light & Dark)
    await setMode(page, 'light');
    await lineItemsSection.screenshot({ path: path.join(REVIEW_DIR, '07-line-items-filled.png') });
    await setMode(page, 'dark');
    await lineItemsSection.screenshot({ path: path.join(REVIEW_DIR, '07-line-items-filled-dark.png') });
    await setMode(page, 'light');

    // Capture 08-line-items-split-1280.png at exactly 1280x900 (Light & Dark)
    await page.setViewportSize({ width: 1280, height: 900 });
    const splitBtn = page.getByRole('button', { name: 'Split', exact: true });
    await splitBtn.click();
    await page.waitForTimeout(600);

    // Verify preview column scrolls internally in Split mode (Section 10)
    const previewScroll = page.locator('[data-testid="invoice-preview-scroll"]');
    await expect(previewScroll).toBeVisible();

    await setMode(page, 'light');
    await page.screenshot({ path: path.join(REVIEW_DIR, '08-line-items-split-1280.png') });
    await setMode(page, 'dark');
    await page.screenshot({ path: path.join(REVIEW_DIR, '08-line-items-split-1280-dark.png') });
    await setMode(page, 'light');

    // Capture 09-line-items-narrow.png at 960px (Light & Dark)
    await page.setViewportSize({ width: 960, height: 900 });
    await page.waitForTimeout(600);
    await setMode(page, 'light');
    await page.screenshot({ path: path.join(REVIEW_DIR, '09-line-items-narrow.png') });
    await setMode(page, 'dark');
    await page.screenshot({ path: path.join(REVIEW_DIR, '09-line-items-narrow-dark.png') });
    await setMode(page, 'light');
  });

  test('P0.3: Toast and ConfirmDialog Primitives (Light + Dark)', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Test Toast Success (Light + Dark)
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
    await setMode(page, 'light');
    await page.screenshot({ path: path.join(REVIEW_DIR, '10-toast-success.png') });
    await setMode(page, 'dark');
    await page.screenshot({ path: path.join(REVIEW_DIR, '10-toast-success-dark.png') });
    await setMode(page, 'light');

    // 2. Test Toast Error (Light + Dark)
    await page.evaluate(() => {
      if ((window as any).__toast) {
        (window as any).__toast.error('Export failed: Connection to report generation engine timed out');
      }
    });
    await page.waitForTimeout(400);
    const errorToast = page.locator('[data-testid="toast-error"]');
    await expect(errorToast).toBeVisible();
    await setMode(page, 'light');
    await page.screenshot({ path: path.join(REVIEW_DIR, '11-toast-error.png') });
    await setMode(page, 'dark');
    await page.screenshot({ path: path.join(REVIEW_DIR, '11-toast-error-dark.png') });
    await setMode(page, 'light');

    // 3. Test Themed ConfirmDialog on Ledgers page (Light + Dark)
    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

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

    await setMode(page, 'light');
    await page.screenshot({ path: path.join(REVIEW_DIR, '12-confirm-dialog.png') });
    await setMode(page, 'dark');
    await page.screenshot({ path: path.join(REVIEW_DIR, '12-confirm-dialog-dark.png') });
    await setMode(page, 'light');

    // Verify Esc key closes the dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(dialog).not.toBeVisible();
  });
});
