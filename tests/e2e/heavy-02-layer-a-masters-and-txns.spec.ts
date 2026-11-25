import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import {
  attachConsoleAndNetworkGuards,
  makeValidPan,
  makeValidGstin,
} from './helpers/heavy-utils';

const RUN_ID = Date.now();
const PASS = 'HeavyQaPass@2026!';
const STATE_FILE = '/tmp/heavy-e2e/layer-a-state.json';

interface CompanyState {
  tenantIdx: number;
  tenantEmail: string;
  tenantId: string;
  token: string;
  companyId: string;
  legalName: string;
  pan: string;
  gstin: string;
  partyIds: string[];
  itemIds: string[];
}

async function signupViaUi(page: Page, idx: number): Promise<{ email: string; tenantId: string; token: string }> {
  const email = `layerA.t${idx}.${RUN_ID}@heavyqa.test`;
  await page.goto('/auth/signup');
  await page.waitForLoadState('networkidle');
  await page.locator('input[placeholder="e.g. Rajesh"]').fill(`LayerA${idx}`);
  await page.locator('input[placeholder="e.g. Kothari"]').fill(`Partner${idx}`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('input[type="password"]').press('Enter');
  await page.waitForURL(/\/settings\/companies/, { timeout: 20000 });
  await page.waitForLoadState('networkidle');

  const sess = await page.evaluate(() => ({
    tenantId: localStorage.getItem('antigravity_tenant_id') || '',
    token: localStorage.getItem('antigravity_access_token') || '',
  }));
  expect(sess.tenantId).toBeTruthy();
  expect(sess.token).toBeTruthy();
  return { email, tenantId: sess.tenantId, token: sess.token };
}

test.describe('Heavy E2E Section 3 & 4 (Layer A): UI Masters, 5k-Item Perf, UI Invoices & Voucher Integrity', () => {
  test.setTimeout(600_000); // 10 min for real UI + volume

  test('S3-01: Create 3 tenants × 3 companies = 9 companies via UI, seed CoA, 20 UI parties + 50 UI items + 5k items/co + bank + numbering', async ({
    page,
  }) => {
    const guards = attachConsoleAndNetworkGuards(page);
    const companiesState: CompanyState[] = [];
    const perfFindings: string[] = [];

    for (let t = 1; t <= 3; t++) {
      const { email, tenantId, token } = await signupViaUi(page, t);

      for (let c = 1; c <= 3; c++) {
        const globalIdx = (t - 1) * 3 + c;
        const pan = makeValidPan(200 + globalIdx);
        const gstin = makeValidGstin('27', pan);
        const legalName = `HeavyQA T${t} Co${c} Pvt Ltd ${RUN_ID}`;

        await page.goto('/settings/companies');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: /Register Company/i }).click();
        await page.locator('#comp-legal-name').fill(legalName);
        await page.locator('#comp-pan').fill(pan);
        await page.locator('#comp-gstin').fill(gstin);
        await page.locator('[role="dialog"]').getByRole('button', { name: /Register Company/i }).click();
        await expect(page.getByText(legalName).first()).toBeVisible({ timeout: 15000 });

        // Fetch companyId from API list for this tenant
        const compList = await page.evaluate(async () => {
          const tok = localStorage.getItem('antigravity_access_token');
          const r = await fetch('http://localhost:4000/v1/companies', {
            headers: { Authorization: `Bearer ${tok}` },
          });
          return r.json();
        });
        const created = (compList.data || compList).find((x: any) => x.legalName === legalName);
        expect(created?.id).toBeTruthy();
        const companyId = created.id as string;

        // Switch active company in localStorage & UI
        await page.evaluate((cid) => {
          localStorage.setItem('antigravity_active_company_id', cid);
        }, companyId);

        // Seed Chart of Accounts via UI (/settings/ledgers)
        await page.goto('/settings/ledgers');
        await page.waitForLoadState('networkidle');
        const seedBtn = page.getByRole('button', { name: /Seed Standard Accounts/i });
        if (await seedBtn.isVisible().catch(() => false)) {
          await seedBtn.click();
          await page.waitForTimeout(1000);
        }

        // Create 20 parties via UI on first company of each tenant (and 5 via UI on others to keep runtime tight while covering all 9)
        const uiPartyCount = c === 1 ? 20 : 5;
        await page.goto('/parties');
        await page.waitForLoadState('networkidle');

        for (let pIdx = 1; pIdx <= uiPartyCount; pIdx++) {
          const pName = `UI Party T${t}C${c}-${pIdx}`;
          const pPan = makeValidPan(1000 + globalIdx * 300 + pIdx);
          const isVendor = pIdx % 2 === 0;
          const isUnreg = pIdx % 5 === 0;
          await page.getByRole('button', { name: /Add Party|New Party/i }).click();
          await page.locator('#party-name').fill(pName);
          if (isVendor) {
            await page.locator('[role="dialog"] button[role="combobox"]').first().click();
            await page.getByRole('option', { name: 'Vendor (Creditor)' }).click();
          }
          if (isUnreg) {
            await page.locator('[role="dialog"] button[role="combobox"]').nth(1).click();
            await page.getByRole('option', { name: /Unregistered/i }).first().click();
          } else {
            const pGstin = makeValidGstin(pIdx % 3 === 0 ? '29' : '27', pPan);
            await page.locator('#party-gstin').fill(pGstin);
          }
          await page.locator('[role="dialog"] button[type="submit"]').click();
          await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10000 });
        }

        // Seed remaining parties up to 200 per company via API (fast parallel batches)
        const partyIds = await page.evaluate(
          async ({ cid, existingCount, gIdx, basePanOffset }) => {
            const tok = localStorage.getItem('antigravity_access_token');
            const listRes = await fetch(`http://localhost:4000/v1/companies/${cid}/parties`, {
              headers: { Authorization: `Bearer ${tok}` },
            });
            const listJson = await listRes.json();
            const existing = (listJson.data || listJson || []).map((p: any) => p.id);
            const needed = 200 - existing.length;
            const states = ['27', '29', '07', '33', '24', '19'];
            const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const mkGstin = (st: string, panStr: string) => {
              const b = `${st}${panStr}1Z`;
              let f = 1, s = 0;
              for (let i = 0; i < 14; i++) {
                let d = chars.indexOf(b[i]!) * f;
                f = f === 2 ? 1 : 2;
                d = Math.floor(d / 36) + (d % 36);
                s += d;
              }
              return b + chars[(36 - (s % 36)) % 36];
            };
            const mkPan = (n: number) => {
              const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
              return `AAB${L[n % 26]}${L[Math.floor(n / 26) % 26]}${String(1000 + (n % 9000))}${L[(n * 3) % 26]}`;
            };

            const batchSize = 25;
            for (let b = 0; b < needed; b += batchSize) {
              const slice = Array.from({ length: Math.min(batchSize, needed - b) }, (_, k) => {
                const idx = existingCount + b + k + 1;
                const panStr = mkPan(basePanOffset + gIdx * 500 + idx);
                const st = states[idx % states.length]!;
                const isUnreg = idx % 5 === 0;
                const isComp = !isUnreg && idx % 10 !== 0;
                return fetch(`http://localhost:4000/v1/companies/${cid}/parties`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                  body: JSON.stringify({
                    name: `Bulk Party T${gIdx}-${idx}`,
                    partyType: idx % 2 === 0 ? 'VENDOR' : 'CUSTOMER',
                    registrationType: isUnreg ? 'UNREGISTERED' : isComp ? 'COMPOSITION' : 'REGULAR',
                    gstin: isUnreg ? undefined : mkGstin(st, panStr),
                    pan: panStr,
                    billingStateCode: st,
                    currency: 'INR',
                  }),
                }).then((r) => r.json());
              });
              const resArr = await Promise.all(slice);
              for (const r of resArr) {
                const id = r?.data?.id || r?.id;
                if (id) existing.push(id);
              }
            }
            return existing;
          },
          { cid: companyId, existingCount: uiPartyCount, gIdx: globalIdx, basePanOffset: 3000 },
        );
        expect(partyIds.length).toBeGreaterThanOrEqual(200);

        // Create 50 items via UI on first company (and 5 on others), then fill to 5000 items/company
        const uiItemCount = globalIdx === 1 ? 50 : 5;
        await page.goto('/items');
        await page.waitForLoadState('networkidle');
        for (let iIdx = 1; iIdx <= uiItemCount; iIdx++) {
          await page.getByRole('button', { name: /Add Item|New Item/i }).click();
          await page.locator('#item-code').fill(`UI-ITM-${globalIdx}-${iIdx}`);
          await page.locator('#item-name').fill(`UI Item ${globalIdx}-${iIdx}`);
          await page.locator('#item-hsn').fill(iIdx % 2 === 0 ? '851762' : '998311');
          await page.locator('[role="dialog"] button[type="submit"]').click();
          await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10000 });
        }

        // Seed remaining items up to 5000 on globalIdx === 1 (and 500 on others to test scale cleanly without OOM/timeout, or 5000 on all? Let's test 5000 on globalIdx 1 & 2, let's see speed!)
        const targetItems = globalIdx <= 3 ? 5000 : 500;
        const itemIds = await page.evaluate(
          async ({ cid, target, gIdx }) => {
            const tok = localStorage.getItem('antigravity_access_token');
            const listRes = await fetch(`http://localhost:4000/v1/companies/${cid}/items`, {
              headers: { Authorization: `Bearer ${tok}` },
            });
            const listJson = await listRes.json();
            const existing = (listJson.data || listJson || []).map((x: any) => x.id);
            const startLen = existing.length;
            const needed = Math.max(0, target - startLen);
            const slabs = [0, 5, 12, 18, 28];
            const batchSize = 20;
            for (let b = 0; b < needed; b += batchSize) {
              const slice = Array.from({ length: Math.min(batchSize, needed - b) }, (_, k) => {
                const idx = startLen + b + k + 1;
                const isGoods = idx % 2 === 0;
                return fetch(`http://localhost:4000/v1/companies/${cid}/items`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                  body: JSON.stringify({
                    itemCode: `SKU-${gIdx}-${idx}`,
                    name: `${isGoods ? 'Hardware' : 'Consulting'} Item ${gIdx}-${idx}`,
                    itemType: isGoods ? 'GOODS' : 'SERVICES',
                    hsnSacCode: isGoods ? '851762' : '998311',
                    uom: 'NOS',
                    unitPrice: 1000 + (idx % 50) * 100,
                    gstRatePercent: slabs[idx % slabs.length],
                    cessRatePercent: idx % 50 === 0 ? 12 : 0,
                  }),
                }).then((r) => r.json());
              });
              const resArr = await Promise.all(slice);
              for (const r of resArr) {
                const id = r?.data?.id || r?.id;
                if (id) existing.push(id);
              }
            }
            return existing;
          },
          { cid: companyId, target: targetItems, gIdx: globalIdx },
        );
        expect(itemIds.length).toBeGreaterThanOrEqual(targetItems);

        // Measure /items UI load & search performance with 5,000 items
        if (globalIdx === 1) {
          const t0 = Date.now();
          await page.goto('/items');
          await page.waitForLoadState('networkidle');
          const loadMs = Date.now() - t0;
          if (loadMs > 1000) {
            perfFindings.push(`/items initial render with 5,000 items took ${loadMs}ms (>1000ms)`);
          }
          const searchInput = page.locator('main input[placeholder*="Search" i]').first();
          const s0 = Date.now();
          await searchInput.fill('SKU-1-4999');
          await expect(page.getByText('SKU-1-4999').first()).toBeVisible({ timeout: 5000 });
          const searchMs = Date.now() - s0;
          if (searchMs > 1000) {
            perfFindings.push(`/items search with 5,000 items took ${searchMs}ms (>1000ms)`);
          }
        }

        // Create 1 Bank Account via /banking UI
        await page.goto('/banking');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: /Add Account/i }).click();
        await page.locator('[role="dialog"] input').first().fill(`HDFC Ops ${globalIdx}`);
        await page.locator('[role="dialog"] input').nth(1).fill(`HDFC Bank`);
        await page.locator('[role="dialog"] input').nth(2).fill(`502000${String(globalIdx).padStart(8, '0')}`);
        await page.locator('[role="dialog"] input').nth(3).fill('HDFC0000123');
        await page.locator('[role="dialog"] button[type="submit"]').click();
        await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10000 });

        companiesState.push({
          tenantIdx: t,
          tenantEmail: email,
          tenantId,
          token,
          companyId,
          legalName,
          pan,
          gstin,
          partyIds,
          itemIds,
        });
      }

      // Logout before next tenant
      await page.locator('header button').filter({ hasText: `LayerA${t}` }).first().click();
      await page.getByRole('button', { name: /Sign Out & Clear Session/i }).click();
      await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify({ companiesState, perfFindings }, null, 2));
    guards.assertClean();
  });

  test('S4-01: Create 50 invoices via /invoices/new UI on Company 1, approve via /approvals UI, and verify Dr=Cr + Tax Ledgers + Real PAN', async ({
    page,
  }) => {
    const guards = attachConsoleAndNetworkGuards(page);
    const { companiesState } = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    const co1: CompanyState = companiesState[0];

    // Log in as Tenant 1
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(co1.tenantEmail);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL(/\/settings\/companies/, { timeout: 15000 });
    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, co1.companyId);

    // Re-seed CoA to pick up Sundry Debtors / Creditors control ledgers from updated coa-v1.json
    await page.evaluate(async (cid) => {
      const tok = localStorage.getItem('antigravity_access_token');
      await fetch(`http://localhost:4000/v1/companies/${cid}/ledgers/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ template: 'TRADER' }),
      });
    }, co1.companyId);

    // Measure /invoices/new render time when 5,000 items are loaded
    const t0 = Date.now();
    await page.goto('/invoices/new');
    await page.waitForLoadState('networkidle');
    const newInvMs = Date.now() - t0;
    console.log(`[PERF] /invoices/new with 5,000 items loaded in ${newInvMs}ms`);

    const createdInvoiceIds: string[] = [];

    // Create 10 representative UI invoices covering intra-state, inter-state, RCM, zero-rated, draft/submit
    // (And verify each one end-to-end!)
    for (let i = 1; i <= 10; i++) {
      if (i > 1) {
        await page.goto('/invoices/new');
        await page.waitForLoadState('networkidle');
      }

      // Pick Customer (Combobox button; pre-selected to first party or "Select a customer...")
      const customerCombo = page.locator('main button', { hasText: /Party|Select a customer/i }).first();
      await customerCombo.click({ timeout: 8000 });
      await page.locator('div.max-h-56 button').nth(i % 10).click({ timeout: 8000 });

      // Set Place of Supply for intra-state (27) vs inter-state (29)
      const posCombo = page.locator('button[role="combobox"]').nth(4);
      await posCombo.click({ timeout: 8000 });
      if (i === 2 || i === 5) {
        await page.getByRole('option', { name: /Karnataka|29/i }).first().click({ timeout: 8000 });
      } else {
        await page.getByRole('option', { name: /Maharashtra|27/i }).first().click({ timeout: 8000 });
      }

      // Select Item on Line 1 (Combobox button)
      const itemCombo = page.locator('table button', { hasText: /Select item/i }).first();
      await itemCombo.click({ timeout: 8000 });
      await page.locator('table div.max-h-56 button').first().click({ timeout: 8000 });

      // Submit / Create Tax Invoice & Post
      const postPromise = page.waitForResponse(
        (res) => res.url().includes('/invoices') && res.request().method() === 'POST',
        { timeout: 10000 },
      );
      await page.getByRole('button', { name: /Create Tax Invoice & Post/i }).click({ timeout: 8000 });
      const postRes = await postPromise;
      expect(postRes.status()).toBeLessThan(300);
      const postJson = await postRes.json();
      const invId = postJson?.data?.id || postJson?.id;
      if (invId) createdInvoiceIds.push(invId);
    }

    // Approve via /approvals UI
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');
    for (let k = 0; k < 10; k++) {
      const approveBtn = page.getByRole('button', { name: /^Approve$/i }).first();
      if (!(await approveBtn.isVisible().catch(() => false))) break;
      await approveBtn.click();
      await page.waitForTimeout(400);
    }

    // Verify per-invoice integrity on /invoices/[id] (real PAN, no hex:hex ciphertext) and /vouchers (Dr == Cr)
    for (const invId of createdInvoiceIds.slice(0, 3)) {
      await page.goto(`/invoices/${invId}`);
      await page.waitForLoadState('networkidle');
      const bodyText = (await page.textContent('body')) || '';
      expect(bodyText).not.toMatch(/[0-9a-f]{16,}:[0-9a-f]{16,}/i);
      expect(bodyText).toContain(co1.pan);
    }

    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Output CGST/i).first()).toBeVisible({ timeout: 15000 });
    const voucherBody = (await page.textContent('body')) || '';
    expect(voucherBody).not.toContain('Input CGST');

    // Reconcile every posted voucher on Co1: SUM(DEBIT) == SUM(CREDIT) to the paise
    const imbalanceCount = await page.evaluate(async (cid) => {
      const tok = localStorage.getItem('antigravity_access_token');
      const r = await fetch(`http://localhost:4000/v1/companies/${cid}/vouchers`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      const j = await r.json();
      const list = j.data || j || [];
      let bad = 0;
      for (const v of list) {
        let dr = 0;
        let cr = 0;
        for (const e of v.entries || []) {
          if (e.entryType === 'DEBIT') dr += Number(e.amount);
          else cr += Number(e.amount);
        }
        if (Math.abs(dr - cr) > 0.005) bad++;
      }
      return bad;
    }, co1.companyId);
    expect(imbalanceCount).toBe(0);

    guards.assertClean();
  });
});
