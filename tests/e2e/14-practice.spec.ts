import { test, expect } from '@playwright/test';
import * as path from 'path';
import { Client } from 'pg';
import { loginAsAdmin } from './helpers/auth';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'screenshots');

async function cleanupTestClients() {
  const client = new Client({ host: 'localhost', user: 'neeraj', database: 'accounting_platform' });
  try {
    await client.connect();
    await client.query("DELETE FROM compliance_tasks WHERE client_id IN (SELECT id FROM firm_clients WHERE client_code LIKE $1)", ['CL-E2E%']);
    await client.query("DELETE FROM client_document_requests WHERE client_id IN (SELECT id FROM firm_clients WHERE client_code LIKE $1)", ['CL-E2E%']);
    await client.query("DELETE FROM firm_clients WHERE client_code LIKE $1", ['CL-E2E%']);
  } catch (err) {
    console.error('Error during test cleanup:', err);
  } finally {
    await client.end();
  }
}

test.describe('Section 14: CA Practice Management & Multi-Client Portal (T-141 to T-151)', () => {
  test.beforeAll(async () => {
    await cleanupTestClients();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('T-141 to T-143: CA Practice Clients Directory, Onboarding & Health Status', async ({ page }) => {
    // T-141: Navigate to /practice/clients and inspect CA client cards
    await page.goto('/practice/clients');
    await page.waitForLoadState('networkidle');

    const header = page.getByRole('heading', { name: /CA Firm Practice Command/i });
    await expect(header).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Multi-client governance, statutory task allocation, and client document portal.')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-141.png'), fullPage: true });

    // T-142: Open "Onboard Client" dialog, fill client name, PAN, tier, and contact
    const onboardBtn = page.getByRole('button', { name: /Onboard Client/i }).first();
    await expect(onboardBtn).toBeVisible();
    await onboardBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /Onboard Practice Client/i })).toBeVisible();

    // Fill Client Code
    const clientCodeInput = dialog.getByPlaceholder(/CL-001/i);
    await clientCodeInput.clear();
    await clientCodeInput.pressSequentially('CL-E2E-999', { delay: 20 });

    // Fill Contact Name
    const contactNameInput = dialog.getByPlaceholder(/Ramesh Sharma/i);
    await contactNameInput.pressSequentially('Rajesh Kumar CA', { delay: 20 });

    // Fill Contact Email
    const contactEmailInput = dialog.getByPlaceholder(/finance@client.com/i);
    await contactEmailInput.pressSequentially('rajesh.kumar@cliente2e.test', { delay: 20 });

    // Fill Phone
    const phoneInput = dialog.getByPlaceholder(/\+91/i);
    if (await phoneInput.isVisible()) {
      await phoneInput.pressSequentially('+91 98200 12345', { delay: 20 });
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-142.png') });

    // T-143: Save client and verify card/table shows engagement health status
    const submitBtn = dialog.getByRole('button', { name: /Onboard Client/i });
    await submitBtn.click();

    await expect(dialog).toBeHidden({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify newly onboarded client in table/directory
    const clientEntry = page.getByText('rajesh.kumar@cliente2e.test');
    await expect(clientEntry).toBeVisible({ timeout: 10000 });

    const badge = page.getByText(/HEALTHY|ACTIVE|STANDARD|PRIORITY/i).first();
    await expect(badge).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-143.png'), fullPage: true });
  });

  test('T-144 to T-147: Compliance Tasks Kanban/Table, Creation & Status Audit', async ({ page }) => {
    // T-144: Navigate to /practice/tasks and inspect compliance board
    await page.goto('/practice/tasks');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: /Compliance & Statutory Tasks/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-144.png'), fullPage: true });

    // T-145: Open "New Task" dialog, set title "GSTR-1 Q3 Filing", due date, assignee
    const newTaskBtn = page.getByRole('button', { name: /New Task/i }).first();
    await expect(newTaskBtn).toBeVisible();
    await newTaskBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Create Compliance Task/i)).toBeVisible();

    // Select Client if needed
    const clientCombobox = dialog.getByRole('combobox').first();
    await clientCombobox.click();
    await page.getByRole('option').first().click();

    const taskTitleInput = dialog.getByPlaceholder(/GSTR-3B Monthly Return Filing/i);
    await taskTitleInput.pressSequentially('GSTR-1 Q3 Filing Statutory', { delay: 20 });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-145.png') });

    // T-146: Save task and verify appearance under table
    const createBtn = dialog.getByRole('button', { name: /Create Task/i });
    await createBtn.click();

    await expect(dialog).toBeHidden({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const createdTask = page.getByText('GSTR-1 Q3 Filing Statutory').first();
    await expect(createdTask).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-146.png'), fullPage: true });

    // T-147: Update task status to "FILED" and verify status/audit
    const updateStatusBtn = page.getByRole('button', { name: /Update Status/i }).first();
    await updateStatusBtn.click();

    const statusDialog = page.getByRole('dialog');
    await expect(statusDialog).toBeVisible();
    await expect(statusDialog.getByRole('heading', { name: /Update Task Status/i })).toBeVisible();

    // Select Filed / Completed via Radix UI Combobox
    const statusCombobox = statusDialog.getByRole('combobox').first();
    await statusCombobox.click();
    await page.getByRole('option', { name: /Filed \/ Completed|Filed/i }).click();

    // Save status
    const saveStatusBtn = statusDialog.getByRole('button', { name: /Save Status/i });
    await saveStatusBtn.click();

    await expect(statusDialog).toBeHidden({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Confirm FILED badge is visible
    const filedBadge = page.getByText(/FILED|COMPLETED/i).first();
    await expect(filedBadge).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-147.png'), fullPage: true });
  });

  test('T-148: Statutory Compliance Calendar Deadlines', async ({ page }) => {
    // Navigate to /practice/calendar and verify statutory tax due dates
    await page.goto('/practice/calendar');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: /Statutory Compliance Calendar/i });
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Verify statutory calendar indicators
    const calendarBadge = page.getByText(/Automated Schedule/i);
    await expect(calendarBadge).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-148.png'), fullPage: true });
  });

  test('T-149 to T-151: Document Requests Portal & Client Upload Simulation', async ({ page }) => {
    // T-149: Navigate to /practice/documents and click "Request Document"
    await page.goto('/practice/documents');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: /Client Document Vault & Requests/i });
    await expect(heading).toBeVisible({ timeout: 10000 });

    const reqDocBtn = page.getByRole('button', { name: /Request Document/i }).first();
    await expect(reqDocBtn).toBeVisible();
    await reqDocBtn.click();

    // T-150: Fill request details for "Form 26AS" and submit request to client
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /Request Source Documents/i })).toBeVisible();

    // Select Client
    const clientCombobox = dialog.getByRole('combobox').first();
    await clientCombobox.click();
    await page.getByRole('option').first().click();

    const titleInput = dialog.getByPlaceholder(/Document Description/i);
    await titleInput.pressSequentially('Form 26AS Tax Credit Statement Q3', { delay: 20 });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-149.png') });

    const submitReqBtn = dialog.getByRole('button', { name: /Send Document Request/i });
    await submitReqBtn.click();

    await expect(dialog).toBeHidden({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const createdReq = page.getByText('Form 26AS Tax Credit Statement Q3').first();
    await expect(createdReq).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-150.png'), fullPage: true });

    // T-151: Open "Upload Client Document" dialog and upload sample file
    const uploadBtn = page.getByRole('button', { name: /^Upload$/i }).first();
    await expect(uploadBtn).toBeVisible();
    await uploadBtn.click();

    const uploadDialog = page.getByRole('dialog');
    await expect(uploadDialog).toBeVisible();
    await expect(uploadDialog.getByRole('heading', { name: /Client Portal Document Upload/i })).toBeVisible();

    const fileNameInput = uploadDialog.locator('input').first();
    await expect(fileNameInput).toBeVisible();

    const confirmBtn = uploadDialog.getByRole('button', { name: /Submit to CA Vault/i });
    await confirmBtn.click();

    await expect(uploadDialog).toBeHidden({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify status updated to UPLOADED
    const uploadedBadge = page.getByText(/UPLOADED/i).first();
    await expect(uploadedBadge).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'T-151.png'), fullPage: true });
  });
});
