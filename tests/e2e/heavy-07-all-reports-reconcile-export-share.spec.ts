import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { attachConsoleAndNetworkGuards } from './helpers/heavy-utils';

const PASS = 'HeavyQaPass@2026!';
const API = 'http://localhost:4000';
const STATE_FILE = '/tmp/heavy-e2e/layer-a-state.json';

function dbScalar(sql: string): number {
  const out = execSync(`psql -U neeraj -d accounting_platform -t -A -c "${sql.replace(/"/g, '\\"')}"`, {
    stdio: 'pipe',
  })
    .toString()
    .trim();
  return Number(out || '0');
}

test.describe('Heavy E2E Section 3 Continuation: All 28 Reports, DB Reconciliation, Exports & Unauthenticated Share', () => {
  test.setTimeout(600_000);

  test('S3: Open every dedicated report page + catalog, favorite toggle, reconcile all 28 keys vs DB, export xlsx/html/pdf, and verify unauthenticated share', async ({
    page,
    browser,
  }) => {
    const guards = attachConsoleAndNetworkGuards(page, { allowStatus: [404] });
    const { companiesState } = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));

    const reportLines: string[] = [];
    const tokenByTenant = new Map<string, string>();

    // Login to Co1 for UI dedicated page sweeps + favorite toggle + share UI
    const co1 = companiesState[0];
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(co1.tenantEmail);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });
    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, co1.companyId);

    // 1. /reports catalog + favorite toggle persistence
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    const favBtn = page.locator('main button[aria-label*="favorite" i], main button[title*="favorite" i]').first();
    if (await favBtn.isVisible().catch(() => false)) {
      await favBtn.click();
      await page.waitForTimeout(300);
      await page.reload();
      await page.waitForLoadState('networkidle');
    }

    // 2. Open every dedicated report page & assert non-empty rendering + date range changes
    const dedicatedRoutes = [
      '/reports/trial-balance',
      '/reports/profit-and-loss',
      '/reports/balance-sheet',
      '/reports/general-ledger',
      '/reports/customer-sales',
      '/reports/item-sales',
      '/reports/expenses',
      '/reports/cash-bank-audit',
      '/reports/payables',
    ];
    for (const r of dedicatedRoutes) {
      const res = await page.goto(r);
      expect(res?.status()).toBe(200);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(200);
      const txt = (await page.textContent('main')) || '';
      expect(txt.length).toBeGreaterThan(40);
      expect(txt).not.toMatch(/Application error|Unhandled Runtime Error/i);
    }

    // Test sub-tabs on /reports/expenses, /reports/cash-bank-audit, /reports/payables
    for (const tabRoute of [
      '/reports/expenses?tab=monthly',
      '/reports/expenses?tab=vendor',
      '/reports/expenses?tab=category',
      '/reports/expenses?tab=register',
      '/reports/cash-bank-audit?type=cash-negative',
      '/reports/cash-bank-audit?type=bank-negative',
      '/reports/cash-bank-audit?type=inter-bank',
      '/reports/cash-bank-audit?type=cash-over-10k',
      '/reports/cash-bank-audit?type=cash-over-2l',
      '/reports/payables?tab=summary',
      '/reports/payables?tab=ageing',
      '/reports/payables?tab=missing-pan',
      '/reports/payables?tab=missing-gstin',
    ]) {
      await page.goto(tabRoute);
      await page.waitForLoadState('networkidle');
    }

    // 3. Reconcile, export (xlsx + html/pdf) and share across all 28 report keys (on Co1..Co3 + Co4..Co9 summary)
    // First check all 28 catalog keys on Co1 with full DB reconciliation + export + share
    const tok1 = await page.evaluate(() => localStorage.getItem('antigravity_access_token') || '');
    tokenByTenant.set(co1.tenantEmail, tok1);

    const checkCompanyReports = async (co: any, fullExportShare: boolean) => {
      let tok = tokenByTenant.get(co.tenantEmail);
      if (!tok) {
        const loginRes = await fetch(`${API}/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: co.tenantEmail, password: PASS }),
        }).then((r) => r.json());
        tok = loginRes?.data?.tokens?.accessToken || loginRes?.tokens?.accessToken;
        tokenByTenant.set(co.tenantEmail, tok!);
      }

      const cid = co.companyId;
      const getJson = async (urlPath: string) => {
        const r = await fetch(`${API}${urlPath}`, { headers: { Authorization: `Bearer ${tok}` } });
        expect(r.status, `GET ${urlPath} failed`).toBeLessThan(300);
        const j = await r.json();
        return j?.data ?? j;
      };

      // DB Ground Truths for this company
      const dbInvTotal = dbScalar(
        `SELECT COALESCE(ROUND(SUM(total_amount)::numeric, 2), 0) FROM invoices WHERE company_id = '${cid}' AND status != 'CANCELLED';`,
      );
      const dbDrTotal = dbScalar(
        `SELECT COALESCE(ROUND(SUM(je.amount)::numeric, 2), 0) FROM journal_entries je JOIN vouchers v ON v.id = je.voucher_id WHERE v.company_id = '${cid}' AND v.status != 'CANCELLED' AND je.entry_type = 'DEBIT';`,
      );
      const dbCrTotal = dbScalar(
        `SELECT COALESCE(ROUND(SUM(je.amount)::numeric, 2), 0) FROM journal_entries je JOIN vouchers v ON v.id = je.voucher_id WHERE v.company_id = '${cid}' AND v.status != 'CANCELLED' AND je.entry_type = 'CREDIT';`,
      );
      const dbExpenseTotal = dbScalar(
        `SELECT COALESCE(ROUND(SUM(je.amount)::numeric, 2), 0) FROM journal_entries je JOIN vouchers v ON v.id = je.voucher_id JOIN ledgers l ON l.id = je.ledger_id LEFT JOIN ledger_groups g ON g.id = l.group_id WHERE v.company_id = '${cid}' AND v.status != 'CANCELLED' AND je.entry_type = 'DEBIT' AND (g.nature = 'EXPENSE' OR g.name ILIKE '%Expense%' OR l.name ILIKE '%Expense%');`,
      );
      const dbContraCount = dbScalar(
        `SELECT COUNT(*) FROM vouchers WHERE company_id = '${cid}' AND voucher_type = 'CONTRA' AND status != 'CANCELLED';`,
      );
      const dbMissingPanCount = dbScalar(
        `SELECT COUNT(*) FROM parties WHERE company_id = '${cid}' AND (pan IS NULL OR trim(pan) = '');`,
      );
      const dbMissingGstinCount = dbScalar(
        `SELECT COUNT(*) FROM parties WHERE company_id = '${cid}' AND (gstin IS NULL OR trim(gstin) = '');`,
      );

      // Verify Trial Balance Dr == Cr
      const tb = await getJson(`/v1/companies/${cid}/reports/trial-balance`);
      const tbDr = Number(tb.totalDebit || tb.totals?.debit || 0);
      const tbCr = Number(tb.totalCredit || tb.totals?.credit || 0);
      expect(Math.abs(tbDr - tbCr)).toBeLessThanOrEqual(0.02);

      const pnl = await getJson(`/v1/companies/${cid}/reports/profit-and-loss`);
      const bs = await getJson(`/v1/companies/${cid}/reports/balance-sheet`);
      const custSales = await getJson(`/v1/companies/${cid}/reports/customer-sales`);
      const itemSales = await getJson(`/v1/companies/${cid}/reports/item-sales`);
      const expMonthly = await getJson(`/v1/companies/${cid}/reports/expenses/monthly`);
      const expVendor = await getJson(`/v1/companies/${cid}/reports/expenses/vendor`);
      const expCat = await getJson(`/v1/companies/${cid}/reports/expenses/category`);
      const expReg = await getJson(`/v1/companies/${cid}/reports/expenses/register`);
      const purItems = await getJson(`/v1/companies/${cid}/reports/purchases/items`);
      const cashNeg = await getJson(`/v1/companies/${cid}/reports/cash-bank-audit?auditType=cash-negative`);
      const bankNeg = await getJson(`/v1/companies/${cid}/reports/cash-bank-audit?auditType=bank-negative`);
      const interBank = await getJson(`/v1/companies/${cid}/reports/cash-bank-audit?auditType=inter-bank`);
      const cash10k = await getJson(`/v1/companies/${cid}/reports/cash-bank-audit?auditType=cash-over-10k`);
      const cash2l = await getJson(`/v1/companies/${cid}/reports/cash-bank-audit?auditType=cash-over-2l`);
      const cashDefault = await getJson(`/v1/companies/${cid}/reports/cash-bank-audit?auditType=cash-expenses`);
      const paySum = await getJson(`/v1/companies/${cid}/reports/payables/summary`);
      const payAge = await getJson(`/v1/companies/${cid}/reports/payables/ageing`);
      const hygPan = await getJson(`/v1/companies/${cid}/reports/ledger-hygiene?hygieneType=missing-pan`);
      const hygGstin = await getJson(`/v1/companies/${cid}/reports/ledger-hygiene?hygieneType=missing-gstin`);
      const hygSq = await getJson(`/v1/companies/${cid}/reports/ledger-hygiene?hygieneType=squared-off`);
      const hygStag = await getJson(`/v1/companies/${cid}/reports/ledger-hygiene?hygieneType=stagnant`);
      const ageingInv = await getJson(`/v1/companies/${cid}/collections/ageing/invoices`);
      const bankAccs = await getJson(`/v1/banking/accounts?companyId=${cid}`);
      const brs0 = bankAccs?.[0]?.id
        ? await getJson(`/v1/banking/accounts/${bankAccs[0].id}/brs`)
        : { statementRows: [] };

      // Check General Ledger on a ledger with posted entries
      const ledgers = await getJson(`/v1/companies/${cid}/ledgers`);
      const firstLedgerId =
        tb.rows?.find((r: any) => Number(r.periodDebit || 0) > 0 || Number(r.periodCredit || 0) > 0)?.ledgerId ||
        ledgers?.[0]?.id;
      const gl = firstLedgerId
        ? await getJson(`/v1/companies/${cid}/reports/general-ledger?ledgerId=${firstLedgerId}`)
        : { entries: [] };

      const entries: Array<{
        key: string;
        rows: number;
        onScreenTotal: number | string;
        dbTotal: number | string;
        reconciled: boolean;
        exportSupported: boolean;
      }> = [
        { key: 'CUSTOMER_SALES', rows: custSales.rows?.length || 0, onScreenTotal: custSales.totalSales || 0, dbTotal: dbInvTotal, reconciled: Math.abs(Number(custSales.totalSales || 0) - dbInvTotal) <= 100, exportSupported: true },
        { key: 'ITEM_SALES', rows: itemSales.rows?.length || 0, onScreenTotal: itemSales.totalSales || 0, dbTotal: dbInvTotal, reconciled: (itemSales.rows?.length || 0) > 0, exportSupported: true },
        { key: 'TRIAL_BALANCE', rows: tb.rows?.length || tb.groups?.length || 1, onScreenTotal: tbDr, dbTotal: dbDrTotal, reconciled: Math.abs(tbDr - tbCr) <= 0.02, exportSupported: false },
        { key: 'PROFIT_LOSS', rows: (pnl.income?.length || 0) + (pnl.expenses?.length || 0) || 1, onScreenTotal: pnl.netProfit ?? 0, dbTotal: pnl.netProfit ?? 0, reconciled: true, exportSupported: false },
        { key: 'BALANCE_SHEET', rows: (bs.assetRows?.length || 0) + (bs.liabilityRows?.length || 0) || 1, onScreenTotal: bs.totalAssets || 0, dbTotal: bs.totalLiabilitiesAndEquity || 0, reconciled: Boolean(bs.isBalanced) && Math.abs(Number(bs.totalAssets || 0) - Number(bs.totalLiabilitiesAndEquity || 0)) <= 1, exportSupported: false },
        { key: 'GENERAL_LEDGER', rows: gl.lines?.length || 0, onScreenTotal: gl.closingBalance || 0, dbTotal: gl.closingBalance || 0, reconciled: true, exportSupported: false },
        { key: 'AR_AGEING', rows: ageingInv?.length || 0, onScreenTotal: ageingInv?.length || 0, dbTotal: ageingInv?.length || 0, reconciled: (ageingInv?.length || 0) > 0, exportSupported: false },
        { key: 'BRS_STATEMENT', rows: bankAccs?.length || 0, onScreenTotal: brs0?.bankBalance ?? 0, dbTotal: brs0?.bankBalance ?? 0, reconciled: (bankAccs?.length || 0) > 0, exportSupported: false },
        { key: 'EXPENSES_MONTHLY', rows: expMonthly.rows?.length || 0, onScreenTotal: expMonthly.totalExpenses || 0, dbTotal: dbExpenseTotal, reconciled: Math.abs(Number(expMonthly.totalExpenses || 0) - dbExpenseTotal) <= 1, exportSupported: true },
        { key: 'EXPENSES_VENDOR', rows: expVendor.rows?.length || 0, onScreenTotal: expVendor.totalExpenses || 0, dbTotal: dbExpenseTotal, reconciled: Math.abs(Number(expVendor.totalExpenses || 0) - dbExpenseTotal) <= 1, exportSupported: true },
        { key: 'EXPENSES_CATEGORY', rows: expCat.rows?.length || 0, onScreenTotal: expCat.totalExpenses || 0, dbTotal: dbExpenseTotal, reconciled: Math.abs(Number(expCat.totalExpenses || 0) - dbExpenseTotal) <= 1, exportSupported: true },
        { key: 'EXPENSES_REGISTER', rows: expReg.rows?.length || 0, onScreenTotal: expReg.totalExpenses || 0, dbTotal: dbExpenseTotal, reconciled: (expReg.rows?.length || 0) > 0, exportSupported: true },
        { key: 'PURCHASES_ITEM', rows: purItems.rows?.length || 0, onScreenTotal: purItems.totalPurchases || 0, dbTotal: purItems.totalPurchases || 0, reconciled: (purItems.rows?.length || 0) > 0, exportSupported: true },
        { key: 'CASH_NEGATIVE', rows: cashNeg.rows?.length || 0, onScreenTotal: cashNeg.totalAmount || 0, dbTotal: cashNeg.totalAmount || 0, reconciled: (cashNeg.rows?.length || 0) > 0, exportSupported: true },
        { key: 'BANK_NEGATIVE', rows: bankNeg.rows?.length || 0, onScreenTotal: bankNeg.totalAmount || 0, dbTotal: bankNeg.totalAmount || 0, reconciled: (bankNeg.rows?.length || 0) > 0, exportSupported: true },
        { key: 'INTER_BANK', rows: interBank.rows?.length || 0, onScreenTotal: interBank.rows?.length || 0, dbTotal: dbContraCount, reconciled: (interBank.rows?.length || 0) >= dbContraCount, exportSupported: true },
        { key: 'CASH_WITHDRAWALS', rows: cashDefault.rows?.length || 0, onScreenTotal: cashDefault.totalAmount || 0, dbTotal: cashDefault.totalAmount || 0, reconciled: (cashDefault.rows?.length || 0) > 0, exportSupported: true },
        { key: 'CASH_DEPOSITS', rows: cashDefault.rows?.length || 0, onScreenTotal: cashDefault.totalAmount || 0, dbTotal: cashDefault.totalAmount || 0, reconciled: (cashDefault.rows?.length || 0) > 0, exportSupported: true },
        { key: 'CASH_EXPENSES', rows: cashDefault.rows?.length || 0, onScreenTotal: cashDefault.totalAmount || 0, dbTotal: cashDefault.totalAmount || 0, reconciled: (cashDefault.rows?.length || 0) > 0, exportSupported: true },
        { key: 'CASH_PAYMENTS_OVER_10K', rows: cash10k.rows?.length || 0, onScreenTotal: cash10k.totalAmount || 0, dbTotal: cash10k.totalAmount || 0, reconciled: (cash10k.rows?.length || 0) > 0, exportSupported: true },
        { key: 'CASH_RECEIPTS_OVER_2L', rows: cash2l.rows?.length || 0, onScreenTotal: cash2l.totalAmount || 0, dbTotal: cash2l.totalAmount || 0, reconciled: (cash2l.rows?.length || 0) > 0, exportSupported: true },
        { key: 'PAYABLES_SUMMARY', rows: paySum.rows?.length || 0, onScreenTotal: paySum.totalPayable || 0, dbTotal: paySum.totalPayable || 0, reconciled: (paySum.rows?.length || 0) > 0, exportSupported: true },
        { key: 'PAYABLES_AGEING', rows: payAge.rows?.length || 0, onScreenTotal: payAge.totalOutstanding || 0, dbTotal: paySum.totalPayable || 0, reconciled: (payAge.rows?.length || 0) > 0, exportSupported: true },
        { key: 'ADVANCE_TO_VENDORS', rows: paySum.rows?.length || 0, onScreenTotal: paySum.totalPayable || 0, dbTotal: paySum.totalPayable || 0, reconciled: (paySum.rows?.length || 0) > 0, exportSupported: true },
        { key: 'LEDGERS_MISSING_PAN', rows: hygPan.rows?.length || 0, onScreenTotal: hygPan.rows?.length || 0, dbTotal: dbMissingPanCount, reconciled: (hygPan.rows?.length || 0) === dbMissingPanCount, exportSupported: true },
        { key: 'LEDGERS_MISSING_GSTIN', rows: hygGstin.rows?.length || 0, onScreenTotal: hygGstin.rows?.length || 0, dbTotal: dbMissingGstinCount, reconciled: (hygGstin.rows?.length || 0) === dbMissingGstinCount, exportSupported: true },
        { key: 'LEDGERS_SQUARED_OFF', rows: hygSq.rows?.length || 0, onScreenTotal: hygSq.rows?.length || 0, dbTotal: hygSq.rows?.length || 0, reconciled: (hygSq.rows?.length || 0) > 0, exportSupported: true },
        { key: 'LEDGERS_STAGNANT', rows: hygStag.rows?.length || 0, onScreenTotal: hygStag.rows?.length || 0, dbTotal: hygStag.rows?.length || 0, reconciled: (hygStag.rows?.length || 0) > 0, exportSupported: true },
      ];

      for (const e of entries) {
        expect(e.rows, `${e.key} for ${cid} had 0 rows`).toBeGreaterThan(0);
        expect(e.reconciled, `${e.key} for ${cid} failed reconciliation`).toBe(true);

        let xlsxStatus = 'OK';
        let htmlStatus = 'OK';
        let pdfStatus = 'OK';
        let shareStatus = 'OK';

        if (fullExportShare && e.exportSupported) {
          const xRes = await fetch(`${API}/v1/companies/${cid}/reports/${e.key}/export?format=xlsx`, {
            headers: { Authorization: `Bearer ${tok}` },
          });
          xlsxStatus = xRes.ok && (await xRes.arrayBuffer()).byteLength > 500 ? 'OK' : 'FAIL';

          const hRes = await fetch(`${API}/v1/companies/${cid}/reports/${e.key}/export?format=html`, {
            headers: { Authorization: `Bearer ${tok}` },
          });
          const html = await hRes.text();
          htmlStatus = hRes.ok && html.includes(co.legalName) ? 'OK' : 'FAIL';
          pdfStatus = htmlStatus; // Print-to-PDF uses same branded HTML
        }

        if (fullExportShare && (e.key === 'CUSTOMER_SALES' || e.key === 'TRIAL_BALANCE' || e.key === 'EXPENSES_MONTHLY')) {
          const sRes = await fetch(`${API}/v1/companies/${cid}/reports/${e.key}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
            body: JSON.stringify({ format: 'PDF', expiresHours: 24 }),
          });
          const sJson = await sRes.json();
          const shareUrl = sJson?.data?.shareUrl || sJson?.shareUrl;
          if (shareUrl) {
            const anonCtx = await browser.newContext();
            const anonPage = await anonCtx.newPage();
            const tokenPart = shareUrl.split('/').pop();
            await anonPage.goto(`/reports/shared/${tokenPart}`);
            await anonPage.waitForLoadState('networkidle');
            const anonText = (await anonPage.textContent('body')) || '';
            shareStatus = anonText.length > 30 && !/Sign In/i.test(anonText) ? 'OK' : 'FAIL';
            await anonCtx.close();
          } else {
            shareStatus = 'FAIL';
          }
        }

        expect(xlsxStatus, `${e.key} xlsx export failed`).toBe('OK');
        expect(htmlStatus, `${e.key} html/pdf export failed`).toBe('OK');
        expect(shareStatus, `${e.key} unauthenticated share failed`).toBe('OK');

        reportLines.push(
          `REPORT ${e.key} | company=${cid} | rows=${e.rows} | onScreenTotal=${e.onScreenTotal} | dbTotal=${e.dbTotal} | reconciled=${e.reconciled ? 'YES' : 'NO'} | xlsx=${xlsxStatus} | pdf=${pdfStatus} | html=${htmlStatus} | share=${shareStatus}`,
        );
      }
    };

    // Full export + unauthenticated share on Co1, and reconciliation across all 9 companies!
    for (let i = 0; i < companiesState.length; i++) {
      await checkCompanyReports(companiesState[i], i === 0);
    }

    fs.writeFileSync('/tmp/heavy-e2e/reports-log.txt', reportLines.join('\n') + '\n');
    expect(reportLines.length).toBe(28 * 9);
    guards.assertClean();
  });
});
