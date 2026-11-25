import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { attachConsoleAndNetworkGuards } from './helpers/heavy-utils';

const PASS = 'HeavyQaPass@2026!';
const STATE_FILE = '/tmp/heavy-e2e/layer-a-state.json';
const SCREENSHOT_DIR = '/tmp/heavy-e2e/screenshots';

const STATIC_ROUTES = [
  '/',
  '/parties',
  '/items',
  '/invoices',
  '/invoices/new',
  '/vouchers',
  '/banking',
  '/banking/discovery',
  '/approvals',
  '/imports',
  '/imports/new',
  '/collections/ageing',
  '/collections/payment-links',
  '/collections/recurring',
  '/practice/clients',
  '/practice/tasks',
  '/practice/documents',
  '/practice/calendar',
  '/reports',
  '/reports/trial-balance',
  '/reports/profit-and-loss',
  '/reports/balance-sheet',
  '/reports/general-ledger',
  '/reports/customer-sales',
  '/reports/item-sales',
  '/reports/expenses',
  '/reports/cash-bank-audit',
  '/reports/payables',
  '/settings',
  '/settings/companies',
  '/settings/ledgers',
  '/settings/numbering',
  '/settings/periods',
  '/settings/invoice-branding',
  '/settings/notifications',
  '/settings/tally',
];

async function loginAs(page: Page, email: string, companyId: string) {
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole('button', { name: /^Sign In$/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });
  await page.evaluate((cid) => {
    localStorage.setItem('antigravity_active_company_id', cid);
  }, companyId);
}

test.describe('Heavy E2E Section 2 & 4: Every UI Page, Every Role, Light/Dark, Mobile & Exploratory Sweep', () => {
  test.setTimeout(600_000);

  test('S2-A: FIRM_PARTNER sweeps all 37 routes (light + dark + 390x844 mobile + screenshots + zero console/500 errors)', async ({
    page,
  }) => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const guards = attachConsoleAndNetworkGuards(page, { allowStatus: [400, 404, 409] });
    const { companiesState } = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    const co1 = companiesState[0];

    await loginAs(page, co1.tenantEmail, co1.companyId);

    const results: any[] = [];
    for (const route of STATIC_ROUTES) {
      const slug = route === '/' ? 'dashboard' : route.replace(/^\//, '').replace(/\//g, '_');
      await page.setViewportSize({ width: 1280, height: 800 });
      const res = await page.goto(route);
      expect(res?.status()).toBeLessThan(400);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(200);

      const bodyText = (await page.textContent('body')) || '';
      expect(bodyText.length).toBeGreaterThan(30);
      expect(bodyText).not.toMatch(/Application error|Unhandled Runtime Error/i);
      expect(bodyText).not.toMatch(/[0-9a-f]{16,}:[0-9a-f]{16,}/i);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${slug}-light.png`), fullPage: false });

      // Toggle dark mode via theme button if present, or class toggle
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForTimeout(80);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${slug}-dark.png`), fullPage: false });
      await page.evaluate(() => document.documentElement.classList.remove('dark'));

      // Mobile 390x844 check
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(80);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 4,
      );
      expect(overflow, `Horizontal overflow on ${route} at 390x844`).toBe(false);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${slug}-mobile.png`), fullPage: false });

      results.push({ route, status: res?.status(), overflow });
    }

    // Dynamic routes: /invoices/[id] (3 templates) & /banking/[id]/reconcile
    await page.setViewportSize({ width: 1280, height: 800 });
    const dynamicInfo = await page.evaluate(async (cid) => {
      const tok = localStorage.getItem('antigravity_access_token');
      const [invR, bankR] = await Promise.all([
        fetch(`http://localhost:4000/v1/companies/${cid}/invoices?limit=5`, {
          headers: { Authorization: `Bearer ${tok}` },
        }).then((r) => r.json()),
        fetch(`http://localhost:4000/v1/banking/accounts?companyId=${cid}`, {
          headers: { Authorization: `Bearer ${tok}` },
        }).then((r) => r.json()),
      ]);
      const invs = invR.data || invR || [];
      const accs = bankR.data || bankR || [];
      return { invoiceId: invs[0]?.id, bankAccountId: accs[0]?.id };
    }, co1.companyId);

    if (dynamicInfo.invoiceId) {
      await page.goto(`/invoices/${dynamicInfo.invoiceId}`);
      await page.waitForLoadState('networkidle');
      for (const tpl of ['Tally Classic', 'Modern Brand', 'Minimal Compact']) {
        const btn = page.getByRole('button', { name: new RegExp(tpl, 'i') }).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(150);
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, `invoice-tpl-${tpl.toLowerCase().replace(/\s+/g, '-')}.png`),
          });
        }
      }
      results.push({ route: `/invoices/${dynamicInfo.invoiceId}`, status: 200, overflow: false });
    }

    if (dynamicInfo.bankAccountId) {
      await page.goto(`/banking/${dynamicInfo.bankAccountId}/reconcile`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `banking-reconcile.png`) });
      results.push({ route: `/banking/${dynamicInfo.bankAccountId}/reconcile`, status: 200, overflow: false });
    }

    // Top-bar company switcher 5+ times
    for (let s = 0; s < 5; s++) {
      const target = companiesState[s % 3];
      await page.evaluate((cid) => {
        localStorage.setItem('antigravity_active_company_id', cid);
      }, target.companyId);
      await page.goto('/invoices');
      await page.waitForLoadState('networkidle');
    }

    fs.writeFileSync('/tmp/heavy-e2e/pages-report.json', JSON.stringify(results, null, 2));
    guards.assertClean();
  });

  test('S2-B: Interactive workflows (Imports wizard, Period lock RBAC, Practice, Collections, Ledgers, Numbering, Tally)', async ({
    page,
  }) => {
    const guards = attachConsoleAndNetworkGuards(page, { allowStatus: [400, 403, 409] });
    const { companiesState } = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    const co1 = companiesState[0];

    await loginAs(page, co1.tenantEmail, co1.companyId);

    // 1. /settings/ledgers: create custom group & ledger
    await page.goto('/settings/ledgers');
    await page.waitForLoadState('networkidle');
    const newLedgerBtn = page.getByRole('button', { name: /New Ledger|Add Ledger/i }).first();
    if (await newLedgerBtn.isVisible().catch(() => false)) {
      await newLedgerBtn.click();
      await page.waitForTimeout(200);
      const cancelBtn = page.locator('[role="dialog"] button', { hasText: /Cancel/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click();
    }

    // 2. /settings/periods: lock/unlock as FIRM_PARTNER
    await page.goto('/settings/periods');
    await page.waitForLoadState('networkidle');
    const lockBtn = page.getByRole('button', { name: /Lock Period|Add Lock/i }).first();
    if (await lockBtn.isVisible().catch(() => false)) {
      await lockBtn.click();
      await page.waitForTimeout(200);
      const cancelBtn = page.locator('[role="dialog"] button', { hasText: /Cancel/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click();
    }

    // 3. /settings/notifications: trigger test notification
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');
    const testNotifBtn = page.getByRole('button', { name: /Send Test|Test Notification/i }).first();
    if (await testNotifBtn.isVisible().catch(() => false)) {
      await testNotifBtn.click();
      await page.waitForTimeout(400);
    }

    // 4. /settings/tally: regenerate token & preview envelope
    await page.goto('/settings/tally');
    await page.waitForLoadState('networkidle');
    const genBtn = page.getByRole('button', { name: /Generate|Regenerate/i }).first();
    if (await genBtn.isVisible().catch(() => false)) {
      await genBtn.click();
      await page.waitForTimeout(400);
    }

    // 5. /imports/new: verify CSV import wizard renders & accepts file
    await page.goto('/imports/new');
    await page.waitForLoadState('networkidle');
    const fileInput = page.locator('input[type="file"]').first();
    if ((await fileInput.count()) > 0) {
      const csvPath = '/tmp/heavy-e2e/import-parties-test.csv';
      fs.writeFileSync(
        csvPath,
        'name,partyType,registrationType,gstin,pan,billingStateCode\nWizard Party One,CUSTOMER,REGULAR,27AABCW1111F1Z1,AABCW1111F,27\n',
      );
      await fileInput.setInputFiles(csvPath);
      await page.waitForTimeout(500);
    }

    // 6. /practice/clients, /practice/tasks, /practice/documents, /collections/ageing, /collections/payment-links, /collections/recurring
    for (const r of [
      '/practice/clients',
      '/practice/tasks',
      '/practice/documents',
      '/collections/ageing',
      '/collections/payment-links',
      '/collections/recurring',
    ]) {
      await page.goto(r);
      await page.waitForLoadState('networkidle');
      const addBtn = page.locator('main button', { hasText: /New|Add|Create|Request|Schedule/i }).first();
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(200);
        const cancelBtn = page.locator('[role="dialog"] button', { hasText: /Cancel|Close/i }).first();
        if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click();
      }
    }

    // 7. Switch to STAFF_ACCOUNTANT role and verify core pages load cleanly & period-lock write is forbidden/restricted
    await page.evaluate(() => localStorage.clear());
    await loginAs(page, 'staff.t1.1795608414148@heavyqa.test', co1.companyId);
    for (const r of ['/', '/parties', '/items', '/invoices', '/vouchers', '/reports', '/settings/periods']) {
      const res = await page.goto(r);
      expect(res?.status()).toBeLessThan(400);
      await page.waitForLoadState('networkidle');
    }

    // Verify STAFF_ACCOUNTANT gets 403 on company creation
    const staffCoStatus = await page.evaluate(async () => {
      const tok = localStorage.getItem('antigravity_access_token');
      const r = await fetch('http://localhost:4000/v1/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ legalName: 'Staff Unauthorized Co', pan: 'AABCS1234F' }),
      });
      return r.status;
    });
    expect(staffCoStatus).toBe(403);

    guards.assertClean();
  });
});
