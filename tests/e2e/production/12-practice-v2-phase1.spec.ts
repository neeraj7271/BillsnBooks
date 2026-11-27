import { test, expect } from '../helpers/zero-error-fixture';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CLIENT_EMAIL = 'client.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const API_BASE = 'http://localhost:4000';
const SCREENS_DIR = path.resolve(process.cwd(), 'docs/practice-v2-screens');

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

async function captureBothThemes(page: any, baseName: string) {
  await page.screenshot({ path: path.join(SCREENS_DIR, `${baseName}.png`), fullPage: false });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: path.join(SCREENS_DIR, `${baseName}-dark.png`), fullPage: false });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
}

test.describe('Practice Platform v2 — Phase 1 E2E', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENS_DIR, { recursive: true });
  });

  test('V2.1 Service Master CRUD, 21 Seeded Services, Custom Category & Clone', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/practice/settings/services');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Service Master (Work Types)')).toBeVisible();
    await expect(page.getByText('GSTR-1 Monthly Return')).toBeVisible();
    await expect(page.getByText('Tax Audit (Sec 44AB)')).toBeVisible();
    await expect(page.getByText('ROC AOC-4 (Financials)')).toBeVisible();

    await captureBothThemes(page, 'service-master-list');

    // Create custom service with custom category
    await page.getByRole('button', { name: /New Service/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const uniqueName = `FEMA ODI Filing ${Date.now().toString().slice(-4)}`;
    await page.getByPlaceholder('e.g. FEMA ODI Annual Filing').fill(uniqueName);
    await page.getByPlaceholder('e.g. FEMA / RBI, GST, Audit...').fill('FEMA / RBI');
    await page.getByPlaceholder('e.g. Form FC-GPR / GSTR-3B').fill('Form ODI');

    await captureBothThemes(page, 'service-create-custom');

    await page.getByRole('button', { name: /Create Service/i }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText(uniqueName)).toBeVisible();
    await expect(page.getByText('FEMA / RBI').first()).toBeVisible();
  });

  test('V2.2 Task Dialog uses Service Master (no hardcoded category enum) + Custom Kanban Statuses', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Verify /practice/tasks dialog uses Service Type picker
    await page.goto('/practice/tasks');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /New Task|Create Task/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Service Type (Work Type)')).toBeVisible();
    await page.getByRole('button', { name: /^Cancel$/i }).click();

    // Verify /practice/jobs Kanban renders custom stages when filtering by Tax Audit (Sec 44AB)
    await page.goto('/practice/jobs');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Practice Jobs & Workflow Pipeline')).toBeVisible();

    const svcFilter = page.getByLabel('Filter by service');
    const taxAuditOpt = await svcFilter.locator('option', { hasText: 'Tax Audit (Sec 44AB)' }).first().getAttribute('value');
    if (taxAuditOpt) {
      await svcFilter.selectOption(taxAuditOpt);
      await page.waitForTimeout(300);
      await expect(page.getByTestId('kanban-col-PLANNING')).toBeVisible();
      await expect(page.getByTestId('kanban-col-FIELDWORK')).toBeVisible();
      await expect(page.getByTestId('kanban-col-UDIN_GENERATED')).toBeVisible();
    }

    await captureBothThemes(page, 'kanban-custom-statuses');
  });

  test('V2.3 Client-Work Mapping, Recurrence Spawn Idempotency, Client Master & Encrypted Credentials Vault', async ({ page, request }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to first client
    await page.goto('/practice/clients');
    await page.waitForLoadState('networkidle');
    const clientLink = page.locator('a[href^="/practice/clients/"]').filter({ hasText: /Client 360|View|Ltd|Pvt|LLP|Enterprises/i }).first();
    await clientLink.click();
    await page.waitForURL(/\/practice\/clients\/[0-9a-f-]+/i, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    const clientUrl = page.url();
    const clientId = clientUrl.split('/practice/clients/')[1]?.split('/')[0];
    expect(clientId).toBeTruthy();

    // 1. Services & Engagements Tab
    await page.getByRole('button', { name: /^Services \(/i }).click();
    await expect(page.getByText('Client-Work Mapping (Subscribed Services)')).toBeVisible();
    await page.getByPlaceholder('5000').fill('6500');
    await page.getByRole('button', { name: /Add Service Mapping/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText(/₹6500/i).first()).toBeVisible();

    await captureBothThemes(page, 'client-services-mapping');

    // 2. Recurrence Spawn Due Jobs + Idempotency
    await page.goto('/practice/jobs');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Spawn Due Jobs/i }).click();
    await page.waitForTimeout(600);
    await expect(page.getByText(/Recurrence Engine:/i)).toBeVisible();

    // Second click must skip already-spawned jobs (0 spawned)
    await page.getByRole('button', { name: /Spawn Due Jobs/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/spawned 0 job\(s\)/i)).toBeVisible();

    // 3. Client Master Profile Extensions
    await page.goto(clientUrl);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Profile & Fields/i }).click();
    await page.getByPlaceholder('U72900MH2020PTC...').fill('U72900MH2021PTC123456');
    await page.getByPlaceholder('MUMT12345A').fill('MUMT99887B');
    await page.getByPlaceholder('XXXX-XXXX-1234').fill('123456789012');
    await page.getByRole('button', { name: /Save Client Profile/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText('XXXX-XXXX-9012').or(page.locator('input[value="XXXX-XXXX-9012"]'))).toBeVisible();

    // 4. Credentials Vault: create, verify masked, reveal + audit trail
    await page.getByRole('button', { name: /^Credentials \(/i }).click();
    await expect(page.getByText('Encrypted Portal Credentials Vault')).toBeVisible();
    await page.getByPlaceholder('e.g. GSTN Primary Login').fill('GSTN Portal Login');
    await page.getByPlaceholder('Username / PAN').fill('gst_admin_t1');
    await page.getByPlaceholder('••••••••').fill('VaultSecret@2026');
    await page.getByRole('button', { name: /Save Encrypted Login/i }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('GSTN Portal Login').first()).toBeVisible();
    await expect(page.getByText('••••••••').first()).toBeVisible();

    await page.getByRole('button', { name: /Reveal/i }).first().click();
    await page.waitForTimeout(400);
    await expect(page.getByText('VaultSecret@2026').first()).toBeVisible();
    await expect(page.getByText(/REVEAL_CREDENTIAL/i).first()).toBeVisible();

    await captureBothThemes(page, 'credentials-vault');

    // 5. Security check: CLIENT_VIEWER is blocked (403) from credentials vault
    const loginRes = await request.post(`${API_BASE}/v1/auth/login`, {
      data: { email: CLIENT_EMAIL, password: PASS },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = await loginRes.json();
    const clientToken =
      loginJson.data?.tokens?.accessToken || loginJson.accessToken || loginJson.token;
    expect(clientToken).toBeTruthy();

    const credRes = await request.get(`${API_BASE}/v1/practice/clients/${clientId}/credentials`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    expect(credRes.status()).toBe(403);
  });

  test('V2.4 Custom Fields & Labels Settings CRUD + Workflows CRUD', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/practice/settings/custom-fields');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Custom Fields & Labels')).toBeVisible();

    await page.getByPlaceholder('e.g. Tally Serial Number, Statutory Auditor...').fill('DSC Expiry Date');
    await page.getByRole('button', { name: /Add Custom Field/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText('DSC Expiry Date').first()).toBeVisible();

    await page.getByPlaceholder('e.g. VIP, MSME, Audit-Ready').fill('MSME-43Bh');
    await page.getByRole('button', { name: /Add Label/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText('MSME-43Bh').first()).toBeVisible();

    await page.goto('/practice/settings/workflows');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Workflow Templates & Custom Statuses')).toBeVisible();
    await page.getByRole('button', { name: /New Workflow Template/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByPlaceholder('e.g. Statutory Audit 6-Stage Flow').fill('Custom ROC Fast-Track');
    await page.getByRole('button', { name: /Save Workflow/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText('Custom ROC Fast-Track').first()).toBeVisible();
  });
});
