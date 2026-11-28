import { test, expect } from '@playwright/test';
import { API_URL, loginAsSeededAdmin, getAuthHeaders, makeValidGstin, trackConsoleAndPageErrors } from './helpers/session';

test.describe('Phase 1d & 1e: Exploratory, Multi-User UI, RLS Isolation & API Race Conditions (Headed)', () => {
  test.setTimeout(180_000);

  test('Concurrent invoice/voucher numbering race + Multi-user UI & Tenant B RLS isolation + Boundary checks', async ({ browser }) => {
    // Context A: Seeded Acme Admin
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const errorsA = trackConsoleAndPageErrors(pageA);
    await loginAsSeededAdmin(pageA);
    const { token: tokenA, tenantId: tenantA, companyId: companyA } = await getAuthHeaders(pageA);
    const hdrsA = { Authorization: `Bearer ${tokenA}`, 'x-tenant-id': tenantA, 'Content-Type': 'application/json' };

    // 1. API Race Condition: 5 parallel Invoice creates -> zero duplicate numbers
    const compRes = await fetch(`${API_URL}/companies/${companyA}`, { headers: hdrsA });
    const compJson: any = await compRes.json();
    const comp = compJson.data ?? compJson;
    const branchId = comp.branches[0].id;
    const fyId = comp.financialYears[0].id;

    const pRes = await fetch(`${API_URL}/companies/${companyA}/parties`, { headers: hdrsA });
    const pJson: any = await pRes.json();
    const parties = pJson.data ?? pJson;
    const partyId = (Array.isArray(parties) ? parties : parties.items)[0].id;

    const parallelInvoices = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        fetch(`${API_URL}/companies/${companyA}/invoices`, {
          method: 'POST',
          headers: hdrsA,
          body: JSON.stringify({
            branchId,
            financialYearId: fyId,
            partyId,
            invoiceDate: '2024-05-20',
            dueDate: '2024-06-05',
            documentType: 'TAX_INVOICE',
            isDraft: false,
            items: [{ description: `Race Item ${i}`, hsnSacCode: '998314', quantity: 1, unitPrice: 1000 + i, gstRatePercent: 18 }],
          }),
        }).then(async (r) => ({ status: r.status, body: await r.json() }))
      )
    );
    for (const r of parallelInvoices) {
      expect(r.status).toBe(201);
      expect((r.body.data ?? r.body).status).toBe('ISSUED');
    }
    const invNumbers = parallelInvoices.map((r) => (r.body.data ?? r.body).invoiceNumber);
    expect(new Set(invNumbers).size).toBe(5);

    // 2. API Race Condition: 5 parallel Voucher posts -> zero duplicate numbers
    const ledRes = await fetch(`${API_URL}/companies/${companyA}/ledgers`, { headers: hdrsA });
    const ledJson: any = await ledRes.json();
    const ledgers = ledJson.data ?? ledJson;
    const l1 = ledgers[0].id;
    const l2 = ledgers[1].id;

    const parallelVouchers = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        fetch(`${API_URL}/companies/${companyA}/vouchers`, {
          method: 'POST',
          headers: hdrsA,
          body: JSON.stringify({
            branchId,
            financialYearId: fyId,
            voucherType: 'JOURNAL',
            voucherDate: '2024-05-21',
            narration: `Race JV ${i}`,
            entries: [
              { ledgerId: l1, entryType: 'DEBIT', amount: String(500 + i) },
              { ledgerId: l2, entryType: 'CREDIT', amount: String(500 + i) },
            ],
          }),
        }).then(async (r) => ({ status: r.status, body: await r.json() }))
      )
    );
    for (const r of parallelVouchers) {
      expect(r.status).toBe(201);
    }
    const vNumbers = parallelVouchers.map((r) => (r.body.data ?? r.body).voucherNumber);
    expect(new Set(vNumbers).size).toBe(5);

    // 3. Multi-User UI & RLS Isolation: Context B registers Tenant B
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    const ts = Date.now();
    await pageB.goto('/auth/signup', { waitUntil: 'networkidle' });
    await pageB.fill('#signup-fn', 'Rohan');
    await pageB.fill('#signup-ln', 'Rival');
    await pageB.fill('#signup-email', `rohan.rival.${ts}@rivalca.in`);
    await pageB.fill('#signup-pw', 'RivalCA@2026');
    await pageB.click('button:has-text("Create My Account")');
    await pageB.waitForURL('**/settings/companies**', { timeout: 15000 });

    const authB = await pageB.evaluate(() => ({
      token: localStorage.getItem('antigravity_access_token') || '',
      tenantId: localStorage.getItem('antigravity_tenant_id') || '',
    }));

    // Spoofing Tenant A x-tenant-id with Tenant B JWT -> 403 Forbidden
    const spoofRes = await fetch(`${API_URL}/companies`, {
      headers: { Authorization: `Bearer ${authB.token}`, 'x-tenant-id': tenantA },
    });
    expect(spoofRes.status).toBe(403);

    // Tenant B sees 0 companies from Tenant A
    const ownRes = await fetch(`${API_URL}/companies`, {
      headers: { Authorization: `Bearer ${authB.token}`, 'x-tenant-id': authB.tenantId },
    });
    expect(ownRes.status).toBe(200);
    const ownJson: any = await ownRes.json();
    expect(ownJson).toEqual([]);

    // 4. Exploratory: special-char search & back/forward navigation on Tenant A
    await pageA.goto('/parties', { waitUntil: 'networkidle' });
    const search = pageA.locator('input[placeholder*="Search"]').first();
    await search.fill(`'"<>&%$#@!`);
    await pageA.waitForTimeout(300);
    await search.fill('');
    await pageA.goto('/invoices', { waitUntil: 'networkidle' });
    await pageA.goBack();
    await pageA.waitForURL('**/parties', { timeout: 10000 });

    expect(errorsA).toEqual([]);
    await ctxA.close();
    await ctxB.close();
  });
});
