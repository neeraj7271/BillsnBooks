import { test, expect } from '../helpers/zero-error-fixture';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
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

test.describe('Practice Platform v2 — Phase 2 E2E', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENS_DIR, { recursive: true });
  });

  test('P2.7 Proposal (3 services) -> PDF -> Engagement -> Client e-Sign -> Firm Countersign -> Auto-Jobs', async ({ page, request }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/practice/proposals/new');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Proposal Builder')).toBeVisible();

    // Add 2 more service lines so total = 3 services with mixed pricing
    await page.getByRole('button', { name: /Add Service Line/i }).click();
    await page.getByRole('button', { name: /Add Service Line/i }).click();
    await expect(page.getByText('Service Lines (3)')).toBeVisible();

    await captureBothThemes(page, 'proposal-builder');

    await page.getByRole('button', { name: /Save Draft Proposal/i }).click();
    await page.waitForURL(/\/practice\/proposals$/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify proposal PDF endpoint returns real %PDF bytes
    const token = await page.evaluate(() => localStorage.getItem('antigravity_access_token'));
    const propsRes = await request.get(`${API_BASE}/v1/practice/proposals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const props = await propsRes.json();
    const latestProp = props.data?.[0] || props[0];
    expect(latestProp?.id).toBeTruthy();

    const pdfRes = await request.get(`${API_BASE}/v1/practice/proposals/${latestProp.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(pdfRes.ok()).toBeTruthy();
    const pdfBuf = await pdfRes.body();
    expect(pdfBuf.subarray(0, 4).toString()).toBe('%PDF');

    await captureBothThemes(page, 'proposal-pdf');

    // Convert to Engagement Letter
    await page.getByRole('button', { name: /Convert to Engagement/i }).first().click();
    await page.waitForURL(/\/practice\/engagements\/[0-9a-f-]+/i, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Client e-Sign
    await page.getByPlaceholder('Full Legal Name').fill('Rajesh Sharma (Director)');
    await page.getByPlaceholder('director@client.in').fill('rajesh@client.in');
    await page.locator('input[type="checkbox"]').check();
    await captureBothThemes(page, 'engagement-esign');
    await page.getByRole('button', { name: /Sign Engagement Letter/i }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByText(/e-Signature Audit Certificate/i)).toBeVisible();

    // Firm Counter-Sign -> auto-creates client_services & spawns jobs
    await page.getByRole('button', { name: /Firm Counter-Sign & Activate Jobs/i }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(/Engagement Activated!/i)).toBeVisible();

    await page.goto('/practice/jobs');
    await page.waitForLoadState('networkidle');
    await captureBothThemes(page, 'engagement-active-jobs');
  });

  test('P2.8 Time Tracking -> Timesheet Approval -> Bill -> GST Invoice -> Paid -> Profitability', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Log time directly on a job in the drawer
    await page.goto('/practice/jobs');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid^="kanban-col-"] .cursor-pointer').first().click();
    await expect(page.getByText('Time Tracking')).toBeVisible();
    await page.getByPlaceholder('Manual time note...').fill('GSTR-3B ITC reconciliation');
    await page.getByRole('button', { name: /^Log$/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('GSTR-3B ITC reconciliation').first()).toBeVisible();
    await captureBothThemes(page, 'timer-on-job');

    // Timesheet view + Partner Approve
    await page.goto('/practice/timesheets');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Timesheets & Time Tracking')).toBeVisible();
    await page.getByRole('button', { name: /Partner Approve Pending/i }).click();
    await page.waitForTimeout(400);
    await captureBothThemes(page, 'timesheet-week');

    // Billing: Generate Bill -> Convert to GST Invoice -> Mark Paid -> Profitability
    await page.goto('/practice/billing');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Unbilled WIP & Retainers by Client')).toBeVisible();
    await page.locator('button:has-text("Generate Bill"):not([disabled])').first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Generated Practice Bill/i)).toBeVisible();
    await captureBothThemes(page, 'generate-bill');

    await page.getByRole('button', { name: /Convert to GST Invoice/i }).first().click();
    await page.waitForTimeout(800);
    await expect(page.getByText(/Converted to GST Invoice/i)).toBeVisible();

    await page.getByRole('button', { name: /Mark Paid/i }).first().click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /^Profitability$/i }).click();
    await expect(page.getByText('Client Realization & Margin')).toBeVisible();
    await captureBothThemes(page, 'profitability');
  });

  test('P2.9-13 Capacity, Notices, Reminders, Firm/Business Mode & Command Center Dashboard', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    // §9 Capacity
    await page.goto('/practice/capacity');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Staff Capacity Planning & Compliance Heatmap')).toBeVisible();
    await captureBothThemes(page, 'capacity-heatmap');

    // §10 Notices
    await page.goto('/practice/notices');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Log Notice/i }).click();
    await page.getByPlaceholder('DIN / Reference No').fill(`GST-DRC-${Date.now().toString().slice(-4)}`);
    await page.getByRole('button', { name: /Save Notice/i }).click();
    await page.waitForTimeout(500);
    await captureBothThemes(page, 'notices-inbox');

    await page.getByText(/DRC-01 Show Cause Notice/i).first().click();
    await expect(page.getByText(/Response Notes & Submission Summary/i)).toBeVisible();
    await captureBothThemes(page, 'notice-detail');
    await page.getByRole('button', { name: /Mark Responded/i }).click();
    await page.waitForTimeout(400);

    // §11 Reminders & Notification Rules
    await page.goto('/practice/settings/templates');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('e.g. 3 days before GST due date').fill('3 days before GST due date');
    await page.getByRole('button', { name: /Add Rule/i }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /Evaluate & Dispatch Now/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Evaluated/i)).toBeVisible();
    await captureBothThemes(page, 'reminder-rules');

    // §12 & §13 Command Center + Business Mode vs Firm Mode
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Practice Command Center')).toBeVisible();
    await captureBothThemes(page, 'practice-dashboard-v2');
    await captureBothThemes(page, 'firm-mode-home');

    await page.getByRole('button', { name: /^Business Mode$/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Business Compliance Hub')).toBeVisible();
    await captureBothThemes(page, 'business-mode-home');

    // Switch back to Firm Mode so workspace stays in default Firm Mode
    await page.getByRole('button', { name: /^Firm Mode$/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Practice Command Center')).toBeVisible();
  });
});
