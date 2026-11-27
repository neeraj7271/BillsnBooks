import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const SCREENS_DIR = path.resolve(process.cwd(), 'docs/ui-review-v4/screens');

test.describe('Section 4 - Dialogs Visibility & Screenshots', () => {
  test.setTimeout(120_000);

  test('Open and capture dialogs in light and dark mode', async ({ page }) => {
    // 1. Authenticate
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Party Dialog
    await page.goto('/parties');
    await page.waitForLoadState('networkidle');
    const newPartyBtn = page.getByRole('button', { name: /Add Party|New Party/i });
    if (await newPartyBtn.isVisible()) {
      await newPartyBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENS_DIR, 'dialog-party-light.png') });
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(SCREENS_DIR, 'dialog-party-dark.png') });
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // 2. Item Dialog
    await page.goto('/items');
    await page.waitForLoadState('networkidle');
    const newItemBtn = page.getByRole('button', { name: /Add Item|New Item/i });
    if (await newItemBtn.isVisible()) {
      await newItemBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENS_DIR, 'dialog-item-light.png') });
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(SCREENS_DIR, 'dialog-item-dark.png') });
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // 3. Unit Manager Dialog
    const manageUnitsBtn = page.getByRole('button', { name: /Units of Measure|Manage Units/i }).first();
    if (await manageUnitsBtn.isVisible()) {
      await manageUnitsBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENS_DIR, 'dialog-unit-manager-light.png') });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // 4. Ledger Dialog
    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');
    const newLedgerBtn = page.getByRole('button', { name: /New Ledger|Add Ledger/i });
    if (await newLedgerBtn.isVisible()) {
      await newLedgerBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENS_DIR, 'dialog-ledger-light.png') });
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(SCREENS_DIR, 'dialog-ledger-dark.png') });
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // 5. Payment Link Dialog
    await page.goto('/collections/payment-links');
    await page.waitForLoadState('networkidle');
    const newLinkBtn = page.getByRole('button', { name: /Create Payment Link|New Link/i });
    if (await newLinkBtn.isVisible()) {
      await newLinkBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENS_DIR, 'dialog-payment-link-light.png') });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // 6. Recurring Schedule Dialog
    await page.goto('/collections/recurring');
    await page.waitForLoadState('networkidle');
    const newRecurringBtn = page.getByRole('button', { name: /Create Schedule|New Schedule/i });
    if (await newRecurringBtn.isVisible()) {
      await newRecurringBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENS_DIR, 'dialog-recurring-light.png') });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    console.log('Dialog screenshots captured successfully!');
  });
});
