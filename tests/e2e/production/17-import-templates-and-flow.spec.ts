import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const API_URL = 'http://localhost:4000';
const SHOTS_DIR = path.resolve(process.cwd(), 'docs/ui-review-import');

const GOLDEN_REGISTER_CASES = [
  {
    label: 'Sales Invoices',
    templateType: 'sales-invoices',
    radioValue: 'SALES_REGISTER',
    expectedRows: 24,
  },
  {
    label: 'Purchase Bills',
    templateType: 'purchase-bills',
    radioValue: 'PURCHASE_REGISTER',
    expectedRows: 22,
  },
  {
    label: 'Bank Statement',
    templateType: 'bank-statement',
    radioValue: 'BANK_STATEMENT',
    expectedRows: 30,
  },
];

const MASTER_TEMPLATES = [
  { type: 'parties-master', minRows: 20 },
  { type: 'items-master', minRows: 20 },
];

async function captureThemePair(page: any, name: string) {
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOTS_DIR, `${name}-dark.png`), fullPage: false });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOTS_DIR, `${name}-light.png`), fullPage: false });
}

test.describe('Bulk Ingestion — Unified Golden Path (Sales, Purchase, Bank + Masters)', () => {
  test.setTimeout(240_000);

  test('Golden path end-to-end for Sales, Purchase, and Bank + template downloads', async ({ page }) => {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });

    const consoleErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });

    await page.goto('/auth/login', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').fill(PARTNER_EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u: URL) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });
    await page.evaluate((cid: string) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    const { token, tenantId } = await page.evaluate(() => ({
      token: localStorage.getItem('antigravity_access_token') || '',
      tenantId: localStorage.getItem('antigravity_tenant_id') || 'a0000000-0000-4000-8000-000000000001',
    }));

    // Verify Parties & Items master templates download & upload with >= 20 rows
    for (const mt of MASTER_TEMPLATES) {
      const tplRes = await fetch(`${API_URL}/v1/companies/${CO1_ID}/imports/templates/${mt.type}`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
      });
      expect(tplRes.status).toBe(200);
      const buf = Buffer.from(await tplRes.arrayBuffer());
      const form = new FormData();
      form.append('file', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${mt.type}-${Date.now()}.xlsx`);
      form.append('importType', 'SALES_REGISTER');
      const upRes = await fetch(`${API_URL}/v1/companies/${CO1_ID}/imports/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
        body: form,
      });
      expect(upRes.status).toBeLessThan(300);
      const upJson: any = await upRes.json();
      const d = upJson?.data ?? upJson;
      expect(d.detectedHeaders?.length).toBeGreaterThan(0);
      expect(d.batch?.totalRows).toBeGreaterThanOrEqual(mt.minRows);
    }

    await page.setViewportSize({ width: 1440, height: 900 });

    // Run full UI golden path for Sales, Purchase, and Bank
    for (const gc of GOLDEN_REGISTER_CASES) {
      await page.goto('/imports', { waitUntil: 'networkidle' });
      await page.click('button:has-text("Upload Register")');
      await page.waitForURL('**/imports/new', { timeout: 10000 });

      await page.click(`input[name="importType"][value="${gc.radioValue}"]`);
      await page.click('button:has-text("Download Excel Template")');
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }),
        page.click(`button:has-text("${gc.label}")`),
      ]);
      const tmpPath = `/tmp/golden-${gc.templateType}-${Date.now()}.xlsx`;
      await download.saveAs(tmpPath);

      await page.setInputFiles('input[type="file"]', tmpPath);
      await page.waitForTimeout(200);
      if (gc.templateType === 'sales-invoices') {
        await captureThemePair(page, 'step1');
      }

      await page.click('button:has-text("Proceed to Header Mapping")');
      await page.waitForSelector('text=Step 2: Map Columns to Canonical Schema', { timeout: 15000 });
      if (gc.templateType === 'sales-invoices') {
        await captureThemePair(page, 'step2');
      }

      // Click Apply Mapping -> routes directly to /imports/[id]/review
      await page.click('button:has-text("Validate")');
      await page.waitForURL('**/imports/*/review', { timeout: 15000 });
      await page.waitForSelector('tbody tr', { timeout: 15000 });

      const renderedCount = await page.locator('tbody tr').count();
      expect(renderedCount, `${gc.label} rendered rows`).toBe(gc.expectedRows);

      // Resolve Missing Masters if present
      const resolveBtn = page.locator('button:has-text("Resolve Missing Masters")').first();
      if (await resolveBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await resolveBtn.click();
        const createAllBtn = page.locator('button:has-text("1-Click Create All with Defaults")').first();
        if (await createAllBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await createAllBtn.click();
          await page.waitForTimeout(2000);
        }
      }

      // Auto-Fix Tax Splits if any RED rows remain
      const autoFixBtn = page.locator('button:has-text("Auto-Fix Tax Splits")').first();
      if (await autoFixBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await autoFixBtn.click();
        await page.waitForTimeout(1500);
      }

      if (gc.templateType === 'sales-invoices') {
        await captureThemePair(page, 'review');
      }

      // Approve & Post
      const approveBtn = page.locator('button:has-text("Approve & Post")').first();
      await expect(approveBtn).toBeEnabled({ timeout: 10000 });
      await approveBtn.click();
      await page.waitForSelector('text=Batch Posted to General Ledger', { timeout: 20000 });

      if (gc.templateType === 'sales-invoices') {
        await captureThemePair(page, 'posted');
      }

      // Verify /imports list shows Posted for this batch
      await page.click('a[href="/imports"] button:has-text("Back to Imports")');
      await page.waitForURL('**/imports', { timeout: 10000 });
      await page.waitForSelector('text=Posted', { timeout: 10000 });

      fs.unlinkSync(tmpPath);
    }

    expect(consoleErrors, 'Uncaught console errors').toEqual([]);
  });
});
