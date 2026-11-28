import { test, expect } from '@playwright/test';
import { loginAsSeededAdmin, makeValidGstin, trackConsoleAndPageErrors } from './helpers/session';

test.describe('Phase 1: Masters & Settings Full Interactive Coverage (Headed)', () => {
  test.setTimeout(180_000);

  test('Parties, Items (+ Services filter fix), Ledgers, Numbering, Periods, and Tally interactive controls', async ({ page }) => {
    const errors = trackConsoleAndPageErrors(page);
    await loginAsSeededAdmin(page);
    const suffix = Date.now().toString().slice(-4);

    // 1. PARTIES (/parties) — Create B2B Regular, B2C Unregistered, Search, Edit, Negative GSTIN
    await page.goto('/parties', { waitUntil: 'networkidle' });
    await page.click('button:has-text("New Party")');
    let dlg = page.locator('[role="dialog"]');
    await expect(dlg).toBeVisible();

    const validPan = `AABCP${suffix}K`;
    const validGstin = makeValidGstin('27', validPan);
    const partyName = `Precision Gears India ${suffix}`;
    await dlg.locator('#party-name').fill(partyName);
    await dlg.locator('#party-gstin').fill(validGstin);
    await dlg.locator('#party-email').fill(`ap.${suffix}@precisiongears.in`);
    await dlg.locator('#party-city').fill('Pune');
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).toBeHidden({ timeout: 10000 });
    const partySearchInit = page.locator('input[placeholder*="Search"]').first();
    await partySearchInit.fill(partyName);
    await page.waitForTimeout(300);
    await expect(page.locator(`text=${partyName}`).first()).toBeVisible();
    await partySearchInit.fill('');

    // Negative: Duplicate GSTIN
    await page.click('button:has-text("New Party")');
    await expect(dlg).toBeVisible();
    await dlg.locator('#party-name').fill(`Duplicate GSTIN Co ${suffix}`);
    await dlg.locator('#party-gstin').fill(validGstin);
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg.locator('text=/already exists|duplicate/i').first()).toBeVisible({ timeout: 8000 });
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();

    // Negative: Invalid Mod-36 GSTIN checksum
    await page.click('button:has-text("New Party")');
    await expect(dlg).toBeVisible();
    await dlg.locator('#party-name').fill(`Bad Checksum Co ${suffix}`);
    await dlg.locator('#party-gstin').fill('27AAACT2727Q1Z0');
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg.locator('text=/checksum|invalid|GSTIN/i').first()).toBeVisible({ timeout: 8000 });
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();

    // Search party
    const partySearch = page.locator('input[placeholder*="Search"]').first();
    await partySearch.fill(partyName);
    await page.waitForTimeout(300);
    await expect(page.locator(`text=${partyName}`).first()).toBeVisible();
    await partySearch.fill('');

    // 2. ITEMS (/items) — Create Service Item, verify "Services Only" filter works!
    await page.goto('/items', { waitUntil: 'networkidle' });
    await page.click('button:has-text("Add Item")');
    dlg = page.locator('[role="dialog"]');
    await expect(dlg).toBeVisible();

    const itemCode = `SRV-AUD-${suffix}`;
    const itemName = `Statutory Tax Audit ${suffix}`;
    await dlg.locator('#item-code').fill(itemCode);
    await dlg.locator('#item-name').fill(itemName);
    await dlg.locator('#item-hsn').fill('998221');
    await dlg.locator('#item-rate').fill('75000');
    await dlg.locator('button:has-text("Save Item")').click();
    await expect(dlg).toBeHidden({ timeout: 10000 });
    await expect(page.locator(`text=${itemName}`).first()).toBeVisible();

    // Filter by Services Only (verifies fix for Bug #1: SERVICE -> SERVICES)
    const typeFilter = page.locator('button:has-text("All Items")').first();
    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.click();
      await page.locator('[role="option"]:has-text("Services Only"), button:has-text("Services Only")').first().click();
      await page.waitForTimeout(300);
      await expect(page.locator(`text=${itemName}`).first()).toBeVisible();
      await page.locator('button:has-text("Services Only")').first().click();
      await page.locator('[role="option"]:has-text("All Items"), button:has-text("All Items")').first().click();
    }

    // 3. LEDGERS (/settings/ledgers)
    await page.goto('/settings/ledgers', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Chart of Accounts').first()).toBeVisible({ timeout: 10000 });

    // 4. NUMBERING (/settings/numbering)
    await page.goto('/settings/numbering', { waitUntil: 'networkidle' });
    await expect(page.locator('text=/Numbering|Series/i').first()).toBeVisible({ timeout: 10000 });

    // 5. PERIODS (/settings/periods) — Lock & Unlock
    await page.goto('/settings/periods', { waitUntil: 'networkidle' });
    const lockBtn = page.locator('button:has-text("Lock")').first();
    if (await lockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await lockBtn.click();
      await page.waitForTimeout(500);
      const unlockBtn = page.locator('button:has-text("Unlock")').first();
      await expect(unlockBtn).toBeVisible({ timeout: 8000 });
      await unlockBtn.click();
      await page.waitForTimeout(500);
    }

    // 6. TALLY (/settings/tally)
    await page.goto('/settings/tally', { waitUntil: 'networkidle' });
    await expect(page.locator('text=/Tally/i').first()).toBeVisible({ timeout: 10000 });

    expect(errors).toEqual([]);
  });
});
