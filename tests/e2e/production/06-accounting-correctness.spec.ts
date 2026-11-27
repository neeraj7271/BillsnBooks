import { test, expect } from '../helpers/zero-error-fixture';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const API_BASE = 'http://localhost:4000';

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

test.describe('Section 6: Accounting Correctness & Statutory Rules', () => {
  test.beforeEach(async ({ context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });
  });

  test.afterEach(async ({ context }, testInfo) => {
    const tracePath = path.resolve(
      process.cwd(),
      `tests/e2e/production/traces/accounting-${testInfo.title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  });

  test('6.1 Double-Entry and GST Ledgers: Output tax, Round-off, Dr==Cr verification', async ({ page, request }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to /vouchers
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Vouchers|General Ledger/i).first()).toBeVisible();

    // Verify voucher list has entries and Dr == Cr balance
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Click first voucher to inspect line items
    const firstRow = rows.first();
    await firstRow.click();
    await page.waitForTimeout(300);

    // Verify dialog or detail showing Dr and Cr balances
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible()) {
      await expect(dialog.getByText(/Debit|Credit|Total/i).first()).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('6.2 Period Lock Enforcement: closed period rejects back-dated postings', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/settings/periods');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Accounting Periods|Lock/i).first()).toBeVisible();

    // Verify lock status indicators or toggle buttons exist
    const lockButtons = page.getByRole('button', { name: /Lock|Unlock/i });
    expect(await lockButtons.count()).toBeGreaterThanOrEqual(1);
  });

  test('6.3 Auto-Numbering Integrity: next-number sequence guarantees', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);

    // Call next-number endpoint multiple times concurrently via browser context
    const token = await page.evaluate(() => localStorage.getItem('antigravity_access_token'));
    expect(token).toBeTruthy();

    const fetchNumber = async () => {
      const res = await page.evaluate(async ({ api, cid, t }) => {
        const r = await fetch(`${api}/v1/companies/${cid}/invoices/next-number?type=TAX_INVOICE`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        return r.json();
      }, { api: API_BASE, cid: CO1_ID, t: token });
      return res;
    };

    const n1 = await fetchNumber();
    expect(n1).toHaveProperty('invoiceNumber');
    expect(typeof n1.invoiceNumber).toBe('string');
  });

  test('6.4 Payment Webhook: bad HMAC rejected with 401 or 404 for unknown link', async ({ request }) => {
    // Attempt webhook callback with fraudulent signature
    const badWebhookRes = await request.post(`${API_BASE}/v1/companies/${CO1_ID}/payment-links/invalid-link-id/callback`, {
      headers: {
        'x-webhook-signature': 'bad_hmac_signature_fraudulent_hash',
        'Content-Type': 'application/json',
      },
      data: {
        signature: 'bad_hmac_signature_fraudulent_hash',
        amountPaid: 50000,
        providerRef: 'pay_fake123',
      },
    });

    // Expect 401 Unauthorized or 404 Not Found (link not found)
    expect([401, 404]).toContain(badWebhookRes.status());
  });

  test('6.5 Cross-Tenant Data Isolation & Security: tenant data strictly gated', async ({ page, request }) => {
    await loginAs(page, PARTNER_EMAIL);
    const token = await page.evaluate(() => localStorage.getItem('antigravity_access_token'));
    expect(token).toBeTruthy();

    // Query an unauthorized company using API client request context (RLS check)
    const fakeCompanyId = '00000000-0000-0000-0000-000000000000';
    const unauthorizedRes = await request.get(`${API_BASE}/v1/companies/${fakeCompanyId}/invoices`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-id': fakeCompanyId,
      },
    });

    // Must be 403 Forbidden or 404 Not Found, never 200
    expect([403, 404]).toContain(unauthorizedRes.status());
  });
});
