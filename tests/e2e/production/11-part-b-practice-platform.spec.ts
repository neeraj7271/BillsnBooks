import { test, expect } from '../helpers/zero-error-fixture';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const API_BASE = 'http://localhost:4000';
const SCREENS_DIR = path.resolve(process.cwd(), 'docs/practice-screens');

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

test.describe('Part B: Modern Practice Management Platform (Phase 1)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENS_DIR, { recursive: true });
  });

  test('B.1 Jobs Kanban, Workflow Template creation, Checklist, Recurring Auto-Spawn', async ({ page }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/practice/jobs');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Practice Jobs & Workflow Pipeline')).toBeVisible();

    // Create Job from Monthly GST template via UI
    await page.getByRole('button', { name: /New Job from Template/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /^Create Job$/i }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/Monthly GST/i).first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENS_DIR, 'practice-kanban.png') });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: path.join(SCREENS_DIR, 'practice-kanban-dark.png') });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Open Job Detail Drawer
    await page.getByText(/Monthly GST/i).first().click();
    await expect(page.getByText('Workflow Checklist')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENS_DIR, 'practice-job-detail.png') });

    // Toggle first checklist item
    await page.getByText(/Collect outward sales register/i).first().click();
    await page.waitForTimeout(300);

    // Move to FILED -> verify recurring job auto-spawns next month's job
    await page.getByRole('button', { name: /^Filed$/i }).first().click();
    await expect(page.getByText(/Auto-spawned next period job/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Close job detail' }).click();
  });

  test('B.2 Client 360, Staff Workload & Practice Dashboard', async ({ page, request }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    const token = await page.evaluate(() => localStorage.getItem('antigravity_access_token'));
    const clientsRes = await request.get(`${API_BASE}/v1/practice/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const clientsRaw = await clientsRes.json();
    const clients = Array.isArray(clientsRaw) ? clientsRaw : clientsRaw.data || [];
    const clientId = clients[0].id;

    // 1. Client 360 Page
    await page.goto(`/practice/clients/${clientId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Active Jobs & Filings')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENS_DIR, 'practice-client360.png') });

    // Switch to Contacts tab and add contact
    await page.getByRole('button', { name: /Contacts/i }).click();
    await page.getByPlaceholder('Full Name').fill('Ramesh Sharma');
    await page.getByRole('button', { name: /Add Contact/i }).click();
    await expect(page.getByText('Ramesh Sharma')).toBeVisible({ timeout: 5000 });

    // 2. Staff Workload Page
    await page.goto('/practice/workload');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Staff Workload & Capacity')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENS_DIR, 'practice-workload.png') });

    // 3. Firm Practice Dashboard
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Firm Practice Hub')).toBeVisible();
    await expect(page.getByText('Jobs by Pipeline Stage')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENS_DIR, 'practice-dashboard.png') });
  });
});
