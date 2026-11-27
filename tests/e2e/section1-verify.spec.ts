import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const REVIEW_DIR = path.resolve(process.cwd(), 'docs/ui-review-v4');

test.describe('Section 1 - Invoice Preview Templates & Print Verification', () => {
  test.beforeAll(() => {
    fs.mkdirSync(REVIEW_DIR, { recursive: true });
  });

  test('Generate 3 distinct preview screenshots and 3 print A4 PDFs', async ({ page }) => {
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
      path: path.join(REVIEW_DIR, '04-preview-print-minimal.pdf'),
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
      path: path.join(REVIEW_DIR, '05-preview-print-modern.pdf'),
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
      path: path.join(REVIEW_DIR, '06-preview-print-tally.pdf'),
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    await page.emulateMedia({ media: 'screen' });

    console.log('Successfully captured 3 preview screenshots and 3 print PDFs in docs/ui-review-v4/');
  });
});
