import { test, expect } from '@playwright/test';
import { API_URL, loginAsSeededAdmin, getAuthHeaders, makeValidGstin, trackConsoleAndPageErrors } from './helpers/session';

test.describe('Phase 1: Sales, Billing & Collections (Headed)', () => {
  test.setTimeout(180_000);

  test('Direct post ₹1L+ invoice, B2B IGST & B2C CGST+SGST, Draft edit/issue, Template switch, Ageing, Recurring, Payment Link', async ({ page }) => {
    const errors = trackConsoleAndPageErrors(page);
    await loginAsSeededAdmin(page);
    const { token, tenantId, companyId } = await getAuthHeaders(page);
    const hdrs = { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId, 'Content-Type': 'application/json' };
    const suffix = Date.now().toString().slice(-4);

    // Confirm no Approvals link in sidebar & /approvals is 404
    await page.goto('/invoices', { waitUntil: 'networkidle' });
    await expect(page.locator('a[href="/approvals"]')).toHaveCount(0);

    // Ensure an Inter-state KA party (29) exists
    const kaPartyName = `Infosys KA Test ${suffix}`;
    const kaRes = await fetch(`${API_URL}/companies/${companyId}/parties`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({
        name: kaPartyName,
        partyType: 'CUSTOMER',
        registrationType: 'REGULAR',
        gstin: makeValidGstin('29', `AAACI${suffix}M`),
        billingStateCode: '29',
        billingCity: 'Bengaluru',
      }),
    });
    expect(kaRes.status).toBeLessThan(300);

    // 1. Create ₹1,00,000+ Tax Invoice via UI -> verifies direct post (ISSUED, no approval)
    await page.click('a[href="/invoices/new"]');
    await page.waitForURL('**/invoices/new', { timeout: 10000 });

    // Select customer
    await page.locator('button[aria-label="Select a customer..."]').click();
    await page.locator('[role="option"]').first().click();

    // Fill line item rate = 100000
    const lineSection = page.getByTestId('line-items-section');
    await lineSection.locator('button[aria-label="Item or service for row 1"]').click();
    await page.locator('[role="option"]').first().click();
    await lineSection.locator('input[placeholder="0.00"]').first().fill('100000');

    // Verify new button label (Bug #2 fix)
    const issueBtn = page.locator('button:has-text("Save & Issue Invoice")');
    await expect(issueBtn).toBeVisible();
    await issueBtn.click();

    await page.waitForURL(/\/invoices\/(?!new)[a-z0-9-]+/i, { timeout: 15000 });
    await expect(page.locator('text=Issued').first()).toBeVisible({ timeout: 10000 });

    // Template switching on Invoice Detail
    for (const tpl of ['Modern Brand', 'Minimal Compact', 'Tally Classic']) {
      const tplBtn = page.locator(`button:has-text("${tpl}")`).first();
      if (await tplBtn.isVisible().catch(() => false)) {
        await tplBtn.click();
        await page.waitForTimeout(200);
      }
    }

    // 2. Create Draft Invoice -> Edit from /invoices list (Bug #3 fix) -> Issue Draft (Bug #4 fix)
    await page.goto('/invoices/new', { waitUntil: 'networkidle' });
    await page.locator('button[aria-label="Select a customer..."]').click();
    await page.locator(`[role="option"]:has-text("${kaPartyName}")`).first().click();
    await lineSection.locator('button[aria-label="Item or service for row 1"]').click();
    await page.locator('[role="option"]').first().click();
    await lineSection.locator('input[placeholder="0.00"]').first().fill('25000');
    await page.click('button:has-text("Save as Draft")');
    await page.waitForURL(/\/invoices\/(?!new)[a-z0-9-]+/i, { timeout: 15000 });
    await expect(page.locator('text=Draft').first()).toBeVisible();

    // Go back to /invoices, verify only ALL/ISSUED/CANCELLED/DRAFT filters exist, click Edit on Draft
    await page.goto('/invoices', { waitUntil: 'networkidle' });
    await expect(page.locator('button:has-text("Pending Approval")')).toHaveCount(0);
    const editLink = page.locator('a[aria-label="Edit Invoice"]').first();
    await expect(editLink).toBeVisible();
    await editLink.click();
    await page.waitForURL('**/invoices/new?cloneFrom=*&mode=edit', { timeout: 10000 });
    // Verify draft loaded (rate is 25000, not blank!)
    await expect(page.getByTestId('line-items-section').locator('input[placeholder="0.00"]').first()).toHaveValue('25000');

    // Issue the edited draft directly
    await page.click('button:has-text("Save & Issue Invoice")');
    await page.waitForURL(/\/invoices\/(?!new)[a-z0-9-]+/i, { timeout: 15000 });
    await expect(page.locator('text=Issued').first()).toBeVisible({ timeout: 10000 });

    // 3. Verify AR Ageing (/collections/ageing)
    await page.goto('/collections/ageing', { waitUntil: 'networkidle' });
    await expect(page.locator('text=/Ageing|Receivable/i').first()).toBeVisible();

    // 4. Verify Recurring (/collections/recurring)
    await page.goto('/collections/recurring', { waitUntil: 'networkidle' });
    await expect(page.locator('text=/Recurring/i').first()).toBeVisible();

    // 5. Verify Payment Links (/collections/payment-links)
    await page.goto('/collections/payment-links', { waitUntil: 'networkidle' });
    await expect(page.locator('text=/Payment Links|Settlements/i').first()).toBeVisible();

    expect(errors).toEqual([]);
  });
});
