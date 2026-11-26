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

test.describe('Recurring Schedule Dialog Verification', () => {
  test.beforeAll(() => {
    fs.mkdirSync(REVIEW_DIR, { recursive: true });
  });

  test('Verify labels, helper text, next-run preview, confirm step, and drawer (Light + Dark)', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    await page.setViewportSize({ width: 1440, height: 1000 });

    // Open /collections/recurring
    await page.goto('/collections/recurring');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Click "New Schedule" button
    await page.getByRole('button', { name: 'New Schedule' }).click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[data-testid="recurring-schedule-dialog"]');
    await expect(dialog).toBeVisible();

    // 1. Assert visible plain-English labels and accessible names
    await expect(page.getByLabel('Bill to Customer')).toBeVisible();
    await expect(page.getByLabel('Billing Frequency')).toBeVisible();
    await expect(page.getByLabel('First Invoice Date')).toBeVisible();
    await expect(page.getByLabel('Number of Invoices')).toBeVisible();
    await expect(page.getByLabel('Stop After (Optional)')).toBeVisible();
    await expect(page.getByLabel('Description').first()).toBeVisible();
    await expect(page.getByLabel('HSN / SAC Code').first()).toBeVisible();
    await expect(page.getByLabel('Unit Price (₹)').first()).toBeVisible();
    await expect(page.getByLabel('GST Rate (%)').first()).toBeVisible();

    // 2. Assert helper texts exist
    await expect(dialog).toContainText('Who receives the recurring invoice.');
    await expect(dialog).toContainText('How often an invoice is generated.');
    await expect(dialog).toContainText('The first invoice runs on this date.');
    await expect(dialog).toContainText('Total invoices this schedule will create.');
    await expect(dialog).toContainText('Appears on the printed invoice line.');

    // 3. Test adding second line item
    await page.getByRole('button', { name: '+ Add another line' }).click();
    await page.waitForTimeout(300);
    const line2Desc = page.getByLabel('Description').nth(1);
    await expect(line2Desc).toBeVisible();
    await line2Desc.fill('Cloud Infrastructure & Backup Management');
    await page.getByLabel('Unit Price (₹)').nth(1).fill('4500');

    // 4. Assert next-run preview updates
    const nextRunPreview = page.locator('[data-testid="recurring-next-run-preview"]');
    await expect(nextRunPreview).toBeVisible();
    await expect(nextRunPreview).toContainText('Next invoice:');
    await expect(nextRunPreview).toContainText('Total schedule:');
    await expect(nextRunPreview).toContainText('Per invoice:');

    // Screenshot 16: recurring dialog filled (Light & Dark)
    await setMode(page, 'light');
    await page.screenshot({ path: path.join(REVIEW_DIR, '16-recurring-dialog-filled.png') });
    await setMode(page, 'dark');
    await page.screenshot({ path: path.join(REVIEW_DIR, '16-recurring-dialog-filled-dark.png') });
    await setMode(page, 'light');

    // 5. Click "Activate Schedule" to enter Step 2 (Confirmation step)
    await page.getByRole('button', { name: 'Activate Schedule' }).click();
    await page.waitForTimeout(400);

    const confirmStep = page.locator('[data-testid="recurring-confirm-step"]');
    await expect(confirmStep).toBeVisible();
    await expect(confirmStep).toContainText('Invoice Line Items Summary');

    // Screenshot 17: recurring confirm (Light & Dark)
    await setMode(page, 'light');
    await page.screenshot({ path: path.join(REVIEW_DIR, '17-recurring-confirm.png') });
    await setMode(page, 'dark');
    await page.screenshot({ path: path.join(REVIEW_DIR, '17-recurring-confirm-dark.png') });
    await setMode(page, 'light');

    // 6. Test "Preview first invoice" opens drawer
    await page.getByRole('button', { name: 'Preview first invoice' }).click();
    await page.waitForTimeout(400);

    const drawer = page.locator('[data-testid="recurring-first-invoice-drawer"]');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('First Generated Invoice Preview');

    // Close preview drawer
    await page.getByRole('button', { name: 'Close Preview' }).click();
    await page.waitForTimeout(300);
    await expect(drawer).not.toBeVisible();

    // 7. Click "Back to edit" returns to Step 1
    await page.getByRole('button', { name: 'Back to edit' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="recurring-confirm-step"]')).not.toBeVisible();
    await expect(page.getByLabel('Bill to Customer')).toBeVisible();
  });
});
