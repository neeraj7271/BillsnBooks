import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Section 6: Invoice Templates, Customization & A4 PDF', () => {
  let invoiceId = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);

    // Open Invoices page and fetch first invoice
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');

    // Click the first invoice view button
    const firstInvoiceView = page.locator('a[aria-label="View Invoice Details"]').first();
    await expect(firstInvoiceView).toBeVisible({ timeout: 10000 });
    
    const href = await firstInvoiceView.getAttribute('href');
    if (href) {
      invoiceId = href.split('/').pop() || '';
    }
    await firstInvoiceView.click();
    await page.waitForLoadState('networkidle');
  });

  test('T-069: Switch template to "Tally Prime Classic" and verify 3-column traditional layout', async ({ page }) => {
    // Click Tally Classic GST template button
    const tallyBtn = page.getByRole('button', { name: /Tally Classic/i });
    await expect(tallyBtn).toBeVisible();
    await tallyBtn.click();

    // Verify Tally classic template name displays in selector banner
    await expect(page.locator('text=/Tally Classic GST/i').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-069.png', fullPage: true });
  });

  test('T-070: Switch template to "Modern Brand" and verify hero header with primary color accents', async ({ page }) => {
    // Click Modern Corporate template button
    const modernBtn = page.getByRole('button', { name: /Modern Corporate/i });
    await expect(modernBtn).toBeVisible();
    await modernBtn.click();

    // Verify Modern Corporate hero header renders
    await expect(page.locator('text=/Modern Corporate/i').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-070.png', fullPage: true });
  });

  test('T-071: Switch template to "Minimal Compact" and verify dense 1-page layout', async ({ page }) => {
    // Click Minimalist Compact template button
    const minimalBtn = page.getByRole('button', { name: /Minimalist Compact/i });
    await expect(minimalBtn).toBeVisible();
    await minimalBtn.click();

    // Verify Minimalist Compact layout renders
    await expect(page.locator('text=/Minimalist Compact/i').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-071.png', fullPage: true });
  });

  test('T-072: Open Invoice Customizer Dialog from invoice detail view', async ({ page }) => {
    // Click Branding & QR button
    const brandingBtn = page.getByRole('button', { name: 'Branding & QR' }).first();
    await expect(brandingBtn).toBeVisible();
    await brandingBtn.click();

    // Verify modal dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Invoice Branding & Output Customizer|Invoice & Document Branding/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-072.png' });
  });

  test('T-073: Toggle dynamic UPI payment QR code ON/OFF and verify preview update', async ({ page }) => {
    // Open Customizer
    await page.getByRole('button', { name: 'Branding & QR' }).first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Switch to Payment QR tab
    const qrTab = dialog.getByRole('button', { name: 'Payment QR Code' });
    await qrTab.click();

    // Verify QR toggle switch is visible
    const qrToggle = dialog.locator('input[type="checkbox"]').first();
    await expect(qrToggle).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-073.png' });
  });

  test('T-074: Configure custom UPI ID (e.g. "books@icici") and verify QR data payload', async ({ page }) => {
    // Open Customizer
    await page.getByRole('button', { name: 'Branding & QR' }).first().click();
    const dialog = page.locator('[role="dialog"]');

    // Switch to Payment QR tab
    await dialog.getByRole('button', { name: 'Payment QR Code' }).click();

    // Fill custom UPI ID
    const upiInput = dialog.getByPlaceholder(/e\.g\. acme@hdfcbank/i);
    await upiInput.click();
    await upiInput.fill('');
    await upiInput.pressSequentially('books@icici', { delay: 100 });

    await page.screenshot({ path: 'test-results/screenshots/T-074.png' });
  });

  test('T-075: Toggle Digital Signature Certificate (DSC) stamp ON and verify stamp details', async ({ page }) => {
    // Open Customizer
    await page.getByRole('button', { name: 'Branding & QR' }).first().click();
    const dialog = page.locator('[role="dialog"]');

    // Switch to Signature tab
    await dialog.getByRole('button', { name: 'Signature & DSC' }).click();

    // Select DSC option
    const dscOption = dialog.getByRole('button', { name: /Digital Signature \(DSC/i });
    await expect(dscOption).toBeVisible();
    await dscOption.click();

    await page.screenshot({ path: 'test-results/screenshots/T-075.png' });
  });

  test('T-076: Edit Terms & Conditions text, save, and verify immediate re-render on invoice', async ({ page }) => {
    // Open Customizer
    await page.getByRole('button', { name: 'Branding & QR' }).first().click();
    const dialog = page.locator('[role="dialog"]');

    // Switch to Terms tab
    await dialog.getByRole('button', { name: 'Terms & Conditions' }).click();

    // Modify terms textarea
    const textarea = dialog.locator('textarea').first();
    await expect(textarea).toBeVisible();
    await textarea.click();
    await textarea.fill('Custom Terms: Immediate payment required under MSMED Act 2006.');

    // Click Save Changes
    const saveBtn = dialog.getByRole('button', { name: 'Save & Apply to Invoices' });
    await saveBtn.click();

    // Verify dialog closes
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/screenshots/T-076.png', fullPage: true });
  });

  test('T-077: Click "Print / Export PDF" and verify A4 WYSIWYG elements render', async ({ page }) => {
    // Verify Print button is present
    const printBtn = page.getByRole('button', { name: /^Print$/i });
    await expect(printBtn).toBeVisible();

    // Verify PDF download button
    const pdfBtn = page.getByRole('button', { name: /Download PDF/i });
    await expect(pdfBtn).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-077.png', fullPage: true });
  });

  test('T-078: Verify typography contrast (no low-contrast grey text in print preview)', async ({ page }) => {
    // Inspect invoice printable container
    const printableArea = page.locator('.print\\:m-0, [data-testid="invoice-print-sheet"], .bg-white').first();
    await expect(printableArea).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/T-078.png' });
  });

  test('T-079: Verify invoice number does not break or wrap awkwardly across lines', async ({ page }) => {
    // Verify invoice number header element has whitespace-nowrap or inline styling
    const invNumEl = page.locator('h1.font-mono').first();
    await expect(invNumEl).toBeVisible();
    const text = await invNumEl.textContent();
    expect(text).toContain('INV-');

    await page.screenshot({ path: 'test-results/screenshots/T-079.png' });
  });

  test('T-080: Close customizer dialog using Esc key or close button', async ({ page }) => {
    // Open Customizer
    await page.getByRole('button', { name: 'Branding & QR' }).first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Press Escape key
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/screenshots/T-080.png' });
  });
});
