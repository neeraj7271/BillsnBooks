import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const API_URL = 'http://localhost:4000';
const SHOTS_DIR = path.resolve(process.cwd(), 'docs/ui-review-import');

const TEMPLATE_CASES = [
  { type: 'sales-invoices', importType: 'SALES_REGISTER', minRows: 20 },
  { type: 'purchase-bills', importType: 'PURCHASE_REGISTER', minRows: 20 },
  { type: 'bank-statement', importType: 'BANK_STATEMENT', minRows: 25 },
  { type: 'parties-master', importType: 'SALES_REGISTER', minRows: 20 },
  { type: 'items-master', importType: 'SALES_REGISTER', minRows: 20 },
];

async function captureThemePair(page: any, name: string) {
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOTS_DIR, `${name}-dark.png`), fullPage: false });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOTS_DIR, `${name}-light.png`), fullPage: false });
}

test.describe('Bulk Ingestion — All 5 Templates & 4-Step Flow', () => {
  test.setTimeout(180_000);

  test('Download & upload all 5 templates (rows > 0) and complete 4-step UI flow with screenshots', async ({ page }) => {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });

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

    // 1. Regression test: download -> upload -> assert detectedHeaders > 0 and rows >= minRows for all 5 templates
    for (const tc of TEMPLATE_CASES) {
      const tplRes = await fetch(`${API_URL}/v1/companies/${CO1_ID}/imports/templates/${tc.type}`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
      });
      expect(tplRes.status, `Download ${tc.type}`).toBe(200);
      const buf = Buffer.from(await tplRes.arrayBuffer());
      expect(buf.length).toBeGreaterThan(1000);

      const form = new FormData();
      form.append('file', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${tc.type}-${Date.now()}.xlsx`);
      form.append('importType', tc.importType);

      const upRes = await fetch(`${API_URL}/v1/companies/${CO1_ID}/imports/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
        body: form,
      });
      expect(upRes.status, `Upload ${tc.type}`).toBeLessThan(300);
      const upJson: any = await upRes.json();
      const data = upJson?.data ?? upJson;
      expect(data.detectedHeaders?.length, `${tc.type} headers`).toBeGreaterThan(0);
      expect(data.batch?.totalRows, `${tc.type} totalRows`).toBeGreaterThanOrEqual(tc.minRows);
    }

    // 2. Full 4-step UI flow on /imports/new with Sales Invoices template
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/imports/new', { waitUntil: 'networkidle' });

    await page.click('button:has-text("Download Excel Template")');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.click('button:has-text("Sales Invoices")'),
    ]);
    const tmpPath = `/tmp/e2e-sales-invoices-${Date.now()}.xlsx`;
    await download.saveAs(tmpPath);

    await page.setInputFiles('input[type="file"]', tmpPath);
    await page.waitForTimeout(250);
    await captureThemePair(page, 'step1');

    await page.click('button:has-text("Proceed to Header Mapping")');
    await page.waitForSelector('text=Step 2: Map Columns to Canonical Schema', { timeout: 15000 });
    await captureThemePair(page, 'step2');

    await page.click('button:has-text("Validate")');
    await page.waitForSelector('text=Step 3: Traffic Light Rule & GST Validation', { timeout: 15000 });

    // Resolve missing masters via 1-Click Create All with Defaults, then auto-fix tax/ledgers if needed
    const resolveBtn = page.locator('button:has-text("1-Click Create All with Defaults")').first();
    if (await resolveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await resolveBtn.click();
      await page.waitForTimeout(2000);
    }
    const autoFixGstBtn = page.locator('button:has-text("Auto-Fix Tax")').first();
    if (await autoFixGstBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await autoFixGstBtn.click();
      await page.waitForTimeout(1200);
    }
    const autoFixBtn = page.locator('button:has-text("Auto-Assign") , button:has-text("Bulk Map")').first();
    if (await autoFixBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await autoFixBtn.click();
      await page.waitForTimeout(1200);
    }
    await captureThemePair(page, 'step3');

    // Proceed to Step 4
    const step4Btn = page.locator('button:has-text("Proceed to Post")').first();
    await expect(step4Btn).toBeEnabled({ timeout: 10000 });
    await step4Btn.click();
    await page.waitForSelector('text=Step 4', { timeout: 10000 });
    await captureThemePair(page, 'step4');

    fs.unlinkSync(tmpPath);
  });
});
