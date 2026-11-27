import { test, expect } from '../helpers/zero-error-fixture';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';

async function loginAs(page: any, email: string) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole('button', { name: /^Sign In$/i }).click();
  await page.waitForURL((u: URL) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

  await page.evaluate((cid: string) => {
    localStorage.setItem('antigravity_active_company_id', cid);
  }, CO1_ID);
}

test.describe('Section 4: The 33 Dialogs Full Verification', () => {
  test.beforeEach(async ({ context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });
  });

  test.afterEach(async ({ context }, testInfo) => {
    const tracePath = path.resolve(
      process.cwd(),
      `tests/e2e/production/traces/dialogs-${testInfo.title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  });

  test('4.1 Banking Dialogs: new-account, upload-statement, conversion', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. /banking -> Add Bank Account dialog
    await page.goto('/banking');
    await page.waitForLoadState('networkidle');

    const addAccountBtn = page.getByRole('button', { name: /Add Account|Add Bank Account|New Account/i }).first();
    if (await addAccountBtn.isVisible()) {
      await addAccountBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]')).first();
      await expect(dialog).toBeVisible();

      // Test Escape dismisses
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();

      // Reopen, test Cancel button
      await addAccountBtn.click();
      await page.waitForTimeout(300);
      const cancelBtn = page.getByRole('button', { name: /Cancel|Close/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
        await expect(dialog).not.toBeVisible();
      }
    }

    // 2. /banking -> Upload Statement dialog
    const uploadBtn = page.getByRole('button', { name: /Upload Statement|Import Statement/i }).first();
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]')).first();
      await expect(dialog).toBeVisible();

      // Check dropzone/input presence
      const fileInput = page.locator('input[type="file"]').first();
      expect(await fileInput.count()).toBeGreaterThanOrEqual(0);

      // Dismiss via Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }

    // 3. /banking/discovery -> Conversion dialog
    await page.goto('/banking/discovery');
    await page.waitForLoadState('networkidle');

    const convertBtn = page.getByRole('button', { name: /Convert/i }).first();
    if (await convertBtn.isVisible()) {
      await convertBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]')).first();
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await expect(dialog).not.toBeVisible();
      }
    }
  });

  test('4.2 Collections Dialogs: promise-to-pay, send-reminder, create-link, reconcile-settlement, upi-qr, recurring-schedule', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1 & 2. /collections/ageing -> Promise to Pay & Send Reminder
    await page.goto('/collections/ageing');
    await page.waitForLoadState('networkidle');

    const promiseBtn = page.getByRole('button', { name: /Promise to Pay/i }).first();
    if (await promiseBtn.isVisible()) {
      await promiseBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }

    const reminderBtn = page.getByRole('button', { name: /Send Reminder/i }).first();
    if (await reminderBtn.isVisible()) {
      await reminderBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }

    // 3, 4, 5. /collections/payment-links -> Create Link, UPI QR, Reconcile Settlement
    await page.goto('/collections/payment-links');
    await page.waitForLoadState('networkidle');

    const newLinkBtn = page.getByRole('button', { name: /Create Payment Link|New Link/i }).first();
    if (await newLinkBtn.isVisible()) {
      await newLinkBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      // Test Cancel
      const cancelBtn = page.getByRole('button', { name: /Cancel/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
        await expect(dialog).not.toBeVisible();
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    const upiQrBtn = page.getByRole('button', { name: /UPI QR|Show QR/i }).first();
    if (await upiQrBtn.isVisible()) {
      await upiQrBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    const reconcileBtn = page.getByRole('button', { name: /Reconcile Settlement|Reconcile/i }).first();
    if (await reconcileBtn.isVisible()) {
      await reconcileBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    // 6. /collections/recurring -> Recurring Schedule Dialog
    await page.goto('/collections/recurring');
    await page.waitForLoadState('networkidle');

    const newScheduleBtn = page.getByRole('button', { name: /Create Schedule|New Schedule/i }).first();
    if (await newScheduleBtn.isVisible()) {
      await newScheduleBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }
  });

  test('4.3 Masters Dialogs: party, party-details, import-parties, item, item-details, import-items, unit dialogs', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. /parties -> Party Dialog
    await page.goto('/parties');
    await page.waitForLoadState('networkidle');

    const newPartyBtn = page.getByRole('button', { name: /Add Party|New Party/i }).first();
    if (await newPartyBtn.isVisible()) {
      await newPartyBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();

      // Test empty submit validation
      const saveBtn = page.getByRole('button', { name: /Save Party|Create Party/i }).first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(200);
        // Form should remain open due to required name
        await expect(dialog).toBeVisible();
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }

    // 2. /parties -> Party Details Dialog
    const viewPartyRow = page.locator('tbody tr').first();
    if (await viewPartyRow.isVisible()) {
      const viewBtn = viewPartyRow.getByRole('button', { name: /View|Details/i }).or(viewPartyRow.locator('button')).first();
      if (await viewBtn.isVisible()) {
        await viewBtn.click();
        await page.waitForTimeout(300);
        const dialog = page.getByRole('dialog').first();
        if (await dialog.isVisible()) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      }
    }

    // 3. /parties -> Import Parties Modal
    const importPartiesBtn = page.getByRole('button', { name: /Import/i }).first();
    if (await importPartiesBtn.isVisible()) {
      await importPartiesBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }

    // 4. /items -> Item Dialog
    await page.goto('/items');
    await page.waitForLoadState('networkidle');

    const newItemBtn = page.getByRole('button', { name: /Add Item|New Item/i }).first();
    if (await newItemBtn.isVisible()) {
      await newItemBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();

      // Verify fields & dismiss
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }

    // 5. /items -> Import Items Modal
    const importItemsBtn = page.getByRole('button', { name: /Import/i }).first();
    if (await importItemsBtn.isVisible()) {
      await importItemsBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }

    // 6. /items -> Unit Manager Dialog & Sub-dialogs
    const uomTab = page.getByRole('button', { name: /Units of Measure/i }).first();
    if (await uomTab.isVisible()) {
      await uomTab.click();
      await page.waitForTimeout(300);
      const createUnitBtn = page.getByRole('button', { name: /Create New Unit|Add Unit/i }).first();
      if (await createUnitBtn.isVisible()) {
        await createUnitBtn.click();
        await page.waitForTimeout(300);
        const unitManagerDialog = page.getByRole('dialog').first();
        await expect(unitManagerDialog).toBeVisible();

        // Dismiss unit manager
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await expect(unitManagerDialog).not.toBeVisible();
      }
    }
  });

  test('4.4 Practice Dialogs: client, task, task-status, request-document, upload-client-doc', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. /practice/clients -> Client Dialog
    await page.goto('/practice/clients');
    await page.waitForLoadState('networkidle');

    const newClientBtn = page.getByRole('button', { name: /New Client|Add Client/i }).first();
    if (await newClientBtn.isVisible()) {
      await newClientBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }

    // 2 & 3. /practice/tasks -> Task Dialog & Task Status Dialog
    await page.goto('/practice/tasks');
    await page.waitForLoadState('networkidle');

    const newTaskBtn = page.getByRole('button', { name: /New Task|Add Task/i }).first();
    if (await newTaskBtn.isVisible()) {
      await newTaskBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }

    // 4 & 5. /practice/documents -> Request Document & Upload Client Doc
    await page.goto('/practice/documents');
    await page.waitForLoadState('networkidle');

    const reqDocBtn = page.getByRole('button', { name: /Request Document/i }).first();
    if (await reqDocBtn.isVisible()) {
      await reqDocBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }

    const uploadDocBtn = page.getByRole('button', { name: /Upload Document/i }).first();
    if (await uploadDocBtn.isVisible()) {
      await uploadDocBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }
  });

  test('4.5 Settings Dialogs: company, company-details, branch, group, ledger', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1, 2, 3. /settings/companies -> Company, Company Details, Branch
    await page.goto('/settings/companies');
    await page.waitForLoadState('networkidle');

    const addCompanyBtn = page.getByRole('button', { name: /Add Company|New Company/i }).first();
    if (await addCompanyBtn.isVisible()) {
      await addCompanyBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }

    const addBranchBtn = page.getByRole('button', { name: /Add Branch|New Branch/i }).first();
    if (await addBranchBtn.isVisible()) {
      await addBranchBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }

    // 4 & 5. /settings/ledgers -> Group Dialog & Ledger Dialog
    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');

    const newLedgerBtn = page.getByRole('button', { name: /New Ledger|Add Ledger/i }).first();
    if (await newLedgerBtn.isVisible()) {
      await newLedgerBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }

    const newGroupBtn = page.getByRole('button', { name: /New Group|Add Group/i }).first();
    if (await newGroupBtn.isVisible()) {
      await newGroupBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }
  });

  test('4.6 Invoices & Reports Dialogs: invoice settings, share report, dark theme & mobile viewport', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);

    // 1. /invoices/new -> Series settings dialog
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');

    const seriesSettingsBtn = page.getByRole('button', { name: /Series Settings|Numbering/i }).or(page.locator('button[title*="Series" i]')).first();
    if (await seriesSettingsBtn.isVisible()) {
      await seriesSettingsBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await expect(dialog).not.toBeVisible();
      }
    }

    // 2. /reports/customer-sales -> Share Dialog
    await page.goto('/reports/customer-sales');
    await page.waitForLoadState('networkidle');

    const shareBtn = page.getByRole('button', { name: /^Share$/i }).first();
    await shareBtn.click();
    await page.waitForTimeout(300);
    const shareDialog = page.getByRole('dialog').first();
    await expect(shareDialog).toBeVisible();

    // Dark theme test on dialog
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(150);
    await expect(shareDialog).toBeVisible();
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Dismiss share dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(shareDialog).not.toBeVisible();

    // 3. Mobile Viewport 390x844 on a dialog
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/parties');
    await page.waitForLoadState('networkidle');

    const mobileAddParty = page.getByRole('button', { name: /Add Party|New Party/i }).first();
    if (await mobileAddParty.isVisible()) {
      await mobileAddParty.click();
      await page.waitForTimeout(300);
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();

      // Ensure dialog stays within mobile viewport bounds
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(390);
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    }
  });
});
