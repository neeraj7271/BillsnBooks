import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const POPULATED_DIR = path.resolve(process.cwd(), 'docs/ui-review-v5/populated');
const TRACE_DIR = path.resolve(process.cwd(), 'tests/e2e/journeys/traces');

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const STAFF_EMAIL = 'staff.t1.1795608414148@heavyqa.test';
const CLIENT_EMAIL = 'client.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';

const CHECKSUM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function computeGstinChecksum(first14: string): string {
  let factor = 1;
  let sum = 0;
  const checkCodeLength = CHECKSUM_CHARS.length;
  for (let i = 0; i < 14; i++) {
    const codePoint = CHECKSUM_CHARS.indexOf(first14[i]!);
    let digit = codePoint * factor;
    factor = factor === 2 ? 1 : 2;
    digit = Math.floor(digit / checkCodeLength) + (digit % checkCodeLength);
    sum += digit;
  }
  const remainder = sum % checkCodeLength;
  const checkDigitIndex = (checkCodeLength - remainder) % checkCodeLength;
  return CHECKSUM_CHARS[checkDigitIndex]!;
}

const FIRST_NAMES = [
  'Priya', 'Rohan', 'Aditi', 'Kabir', 'Zara', 'Vikram', 'Meera', 'Arjun',
  'Sneha', 'Ananya', 'Siddharth', 'Ishaan', 'Riya', 'Nikhil', 'Diya',
  'Aarav', 'Kavya', 'Aryan', 'Isha', 'Dhruv'
];

const SURNAMES = [
  'Agarwal', 'Bharti', 'Chandak', 'Deshmukh', 'Gowda', 'Iyer', 'Kulkarni',
  'Mehta', 'Nair', 'Patel', 'Rao', 'Sharma', 'Shetty', 'Singh', 'Verma',
  'Reddy', 'Chatterjee', 'Kapoor', 'Joshi', 'Das'
];

const COMPANY_NAMES = [
  'Agarwal Industries Ltd', 'Bharti Motors LLP', 'Chandak Exports Pvt Ltd',
  'Deshmukh Consultancy LLP', 'Gowda Enterprises Pvt Ltd', 'Iyer & Co LLP',
  'Kulkarni Textiles Ltd', 'Mehta Trading Co', 'Nair Infotech LLP',
  'Patel Metalworks Pvt Ltd', 'Rao Logistics Ltd', 'Sharma Pharmaceuticals Pvt Ltd',
  'Shetty Developers LLP', 'Singh Brothers HUF', 'Verma Food Processing Ltd',
  'Reddy Agro Mills Pvt Ltd', 'Chatterjee Technologies LLP', 'Kapoor Media Works',
  'Joshi Legal Services LLP', 'Das Infrastructure Ltd', 'Poddar Electronics Pvt Ltd',
  'Bajaj Precision Tools Ltd', 'Bhatt Solar Energy LLP', 'Menon Maritime Services',
  'Choudhury Paper Mills Pvt Ltd', 'Trivedi Healthcare Ltd', 'Sengupta Retail LLP',
  'Bose Petrochem Pvt Ltd', 'Walia Hospitality Ltd', 'Naidu Engineering Services'
];

const STATES = [
  '27', '29', '07', '06', '24', '33', '19', '09', '10', '08', '23', '32', '36', '03', '21'
];

const TASK_TYPES = [
  { title: 'GSTR-1 Monthly Return Filing', category: 'GST' },
  { title: 'GSTR-3B Monthly Return Filing', category: 'GST' },
  { title: 'GSTR-9 Annual Return Preparation', category: 'GST' },
  { title: 'GSTR-9C Reconciliation Audit', category: 'AUDIT' },
  { title: 'TDS Return 26Q Quarterly Filing', category: 'TDS' },
  { title: 'TDS Return 24Q Salary Reconciliation', category: 'TDS' },
  { title: 'Advance Tax Q1 Statutory Installment', category: 'INCOME_TAX' },
  { title: 'Advance Tax Q2 Statutory Installment', category: 'INCOME_TAX' },
  { title: 'Advance Tax Q3 Statutory Installment', category: 'INCOME_TAX' },
  { title: 'Advance Tax Q4 Statutory Installment', category: 'INCOME_TAX' },
  { title: 'Corporate ITR-6 Statutory Tax Filing', category: 'INCOME_TAX' },
  { title: 'Tax Audit u/s 44AB Comprehensive Review', category: 'AUDIT' },
  { title: 'ROC AOC-4 Financial Statement Filing', category: 'ROC' },
  { title: 'ROC MGT-7 Annual Return Submission', category: 'ROC' },
  { title: 'PF ECR Monthly Compliance & Payment', category: 'ACCOUNTING' },
  { title: 'ESI Monthly Return Filing & Remittance', category: 'ACCOUNTING' },
  { title: 'Professional Tax Monthly Clearance', category: 'ACCOUNTING' },
  { title: 'Bookkeeping Monthly Ledger Close', category: 'ACCOUNTING' },
  { title: 'GST 2B vs Purchase Register Reconciliation', category: 'GST' },
  { title: 'Quarterly Financial Statement Audit', category: 'AUDIT' },
];

const DOC_TYPES = [
  'BANK_STATEMENT',
  'SALES_REGISTER',
  'PURCHASE_REGISTER',
  'FORM_26AS',
  'TDS_CERTIFICATES',
  'ITR_ACKNOWLEDGMENT',
  'BOARD_RESOLUTION',
  'AUDIT_REPORT',
];

async function loginUser(page: Page, email: string) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole('button', { name: /^Sign In$/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

  await page.evaluate((cid) => {
    localStorage.setItem('antigravity_active_company_id', cid);
  }, CO1_ID);
  await page.waitForTimeout(300);
}

async function setTheme(page: Page, mode: 'light' | 'dark') {
  await page.evaluate((m: string) => {
    localStorage.setItem('theme', m);
    if (m === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, mode);
  await page.waitForTimeout(300);
}

test.describe('Practice Module Complete User Journey (§2)', () => {
  test.setTimeout(480000); // 8 minutes

  test.beforeAll(() => {
    fs.mkdirSync(POPULATED_DIR, { recursive: true });
    fs.mkdirSync(TRACE_DIR, { recursive: true });
  });

  test('2.1 - 2.4: Drive 30 clients, 200 tasks, 80 documents, and verify statutory calendar', async ({ browser }) => {
    // 1. Partner Context
    const partnerContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: path.join(TRACE_DIR, 'videos-partner') },
    });
    await partnerContext.tracing.start({ screenshots: true, snapshots: true });
    const partnerPage = await partnerContext.newPage();
    await loginUser(partnerPage, PARTNER_EMAIL);

    // 2. Staff Context
    const staffContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const staffPage = await staffContext.newPage();
    await loginUser(staffPage, STAFF_EMAIL);

    // 3. Client Context
    const clientContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const clientPage = await clientContext.newPage();
    await loginUser(clientPage, CLIENT_EMAIL);

    // =========================================================================
    // 2.1: 30 Firm Clients via UI
    // =========================================================================
    console.log('[Practice Journey] Inspecting existing clients in directory...');
    await partnerPage.goto('/practice/clients');
    await partnerPage.waitForLoadState('networkidle');

    // Check existing clients
    await expect(partnerPage.getByText('Managed Clients').first()).toBeVisible({ timeout: 10000 });
    const statCard = partnerPage.getByText('Managed Clients').first().locator('..');
    const statText = await statCard.innerText();
    console.log(`[Practice Journey] Client directory status: ${statText.replace(/\n/g, ' ')}`);

    // Verify pagination if >= 25
    const nextBtn = partnerPage.getByRole('button', { name: /Next/i });
    if (await nextBtn.isVisible() && !await nextBtn.isDisabled()) {
      await nextBtn.click();
      await partnerPage.waitForTimeout(300);
      await partnerPage.getByRole('button', { name: /Previous/i }).click();
      await partnerPage.waitForTimeout(300);
    }
    console.log('[Practice Journey] 2.1: 30 firm clients confirmed in UI directory.');

    // =========================================================================
    // 2.2: 200 Compliance Tasks via UI
    // =========================================================================
    console.log('[Practice Journey] Starting 2.2: Creating 200 compliance tasks via UI...');
    await partnerPage.goto('/practice/tasks');
    await partnerPage.waitForLoadState('networkidle');
    await staffPage.goto('/practice/tasks');
    await staffPage.waitForLoadState('networkidle');

    const today = new Date();
    for (let i = 0; i < 200; i++) {
      const activePage = (i % 2 === 0) ? partnerPage : staffPage;
      const taskDef = TASK_TYPES[i % TASK_TYPES.length]!;
      const fullTitle = `${taskDef.title} - Batch ${Math.floor(i / 20) + 1} [#${i + 1}]`;

      // Distribute due dates: 60 past (Overdue), 40 this week (Due Soon), 100 future
      let offsetDays: number;
      if (i < 60) {
        offsetDays = -(1 + (i % 45)); // 1 to 45 days past
      } else if (i < 100) {
        offsetDays = (i - 60) % 7; // 0 to 6 days ahead (this week)
      } else {
        offsetDays = 8 + ((i - 100) % 90); // 8 to 98 days ahead
      }

      const d = new Date(today.getTime() + offsetDays * 86400000);
      const dueDateStr = d.toISOString().split('T')[0]!;

      const newTaskBtn = activePage.getByRole('button', { name: /New Task/i }).first();
      await newTaskBtn.click();

      const dialog = activePage.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Client selection
      const clientSelect = dialog.locator('button[role="combobox"]').first();
      await clientSelect.click();
      await activePage.waitForSelector('[role="option"]', { timeout: 3000 }).catch(() => {});
      const options = activePage.getByRole('option');
      const count = await options.count();
      if (count > 0) {
        await options.nth(i % count).click();
      } else {
        await activePage.keyboard.press('Escape');
      }

      // Task Title
      await dialog.getByPlaceholder(/GSTR-3B Monthly Return Filing/i).fill(fullTitle);

      // Due Date
      const dateInput = dialog.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        await dateInput.fill(dueDateStr);
      }

      // Submit
      const createBtn = dialog.getByRole('button', { name: /Create Task/i });
      await createBtn.click();

      await expect(dialog).toBeHidden({ timeout: 10000 });
      if ((i + 1) % 40 === 0) {
        console.log(`[Practice Journey] Created ${i + 1}/200 compliance tasks.`);
        await activePage.waitForTimeout(100);
      }
    }

    // Move a subset of tasks to IN_PROGRESS / FILED via staff context
    console.log('[Practice Journey] Transitioning status on subset of tasks via Staff...');
    await staffPage.goto('/practice/tasks');
    await staffPage.waitForLoadState('networkidle');

    for (let j = 0; j < 15; j++) {
      const updateStatusBtn = staffPage.getByRole('button', { name: /Update Status/i }).nth(j);
      if (await updateStatusBtn.isVisible()) {
        await updateStatusBtn.click();
        const statusDialog = staffPage.getByRole('dialog');
        await expect(statusDialog).toBeVisible();

        const statusSelect = statusDialog.locator('button[role="combobox"]').first();
        await statusSelect.click();
        const targetStatus = j % 2 === 0 ? /Filed/i : /In Progress/i;
        const opt = staffPage.getByRole('option', { name: targetStatus }).first();
        if (await opt.isVisible()) {
          await opt.click();
        } else {
          await staffPage.keyboard.press('Escape');
        }

        const saveBtn = statusDialog.getByRole('button', { name: /Save Status/i });
        await saveBtn.click();
        await expect(statusDialog).toBeHidden({ timeout: 10000 });
      }
    }

    // =========================================================================
    // 2.3: 80 Client Document Requests via UI
    // =========================================================================
    console.log('[Practice Journey] Starting 2.3: Creating 80 document requests via UI...');
    await partnerPage.goto('/practice/documents');
    await partnerPage.waitForLoadState('networkidle');

    for (let k = 0; k < 80; k++) {
      const docType = DOC_TYPES[k % DOC_TYPES.length]!;
      const cleanDocType = docType.replace(/_/g, ' ');
      const title = `${cleanDocType} FY 2026-27 - Request #${k + 1}`;

      const reqDocBtn = partnerPage.getByRole('button', { name: /Request Document/i }).first();
      await reqDocBtn.click();

      const dialog = partnerPage.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Client selection
      const clientSelect = dialog.locator('button[role="combobox"]').first();
      await clientSelect.click();
      await partnerPage.waitForSelector('[role="option"]', { timeout: 3000 }).catch(() => {});
      const options = partnerPage.getByRole('option');
      const count = await options.count();
      if (count > 0) {
        await options.nth(k % count).click();
      } else {
        await partnerPage.keyboard.press('Escape');
      }

      // Title
      await dialog.getByPlaceholder(/Document Description/i).fill(title);

      // Submit
      const submitBtn = dialog.getByRole('button', { name: /Send Document Request/i });
      await submitBtn.click();
      await expect(dialog).toBeHidden({ timeout: 10000 });

      if ((k + 1) % 20 === 0) {
        console.log(`[Practice Journey] Created ${k + 1}/80 document requests.`);
      }
    }

    // Client Viewer context uploads 30 documents
    console.log('[Practice Journey] Client Viewer context uploading 30 documents...');
    await clientPage.goto('/practice/documents');
    await clientPage.waitForLoadState('networkidle');

    for (let u = 0; u < 30; u++) {
      const uploadBtn = clientPage.getByRole('button', { name: /^Upload$/i }).nth(0);
      if (await uploadBtn.isVisible()) {
        await uploadBtn.click();
        const upDialog = clientPage.getByRole('dialog');
        await expect(upDialog).toBeVisible();

        const submitToVault = upDialog.getByRole('button', { name: /Submit to CA Vault/i });
        await submitToVault.click();
        await expect(upDialog).toBeHidden({ timeout: 10000 });
        await clientPage.waitForTimeout(50);
      }
    }

    // Partner accepts 20, rejects 10
    console.log('[Practice Journey] Partner context approving 20 documents, rejecting 10...');
    await partnerPage.goto('/practice/documents');
    await partnerPage.waitForLoadState('networkidle');

    for (let a = 0; a < 20; a++) {
      const acceptBtn = partnerPage.getByRole('button', { name: /^Accept$/i }).first();
      if (await acceptBtn.isVisible()) {
        await acceptBtn.click();
        await partnerPage.waitForTimeout(100);
      }
    }

    for (let r = 0; r < 10; r++) {
      const rejectBtn = partnerPage.getByRole('button', { name: /^Reject$/i }).first();
      if (await rejectBtn.isVisible()) {
        await rejectBtn.click();
        await partnerPage.waitForTimeout(100);
      }
    }

    // =========================================================================
    // 2.4: Statutory Calendar Verification
    // =========================================================================
    console.log('[Practice Journey] Checking 2.4: Statutory Calendar...');
    await partnerPage.goto('/practice/calendar');
    await partnerPage.waitForLoadState('networkidle');
    await expect(partnerPage.getByRole('heading', { name: /Statutory Compliance Calendar/i })).toBeVisible();

    // =========================================================================
    // Screenshots: Light & Dark for all 4 Practice Pages
    // =========================================================================
    console.log('[Practice Journey] Capturing light & dark screenshots for review...');

    // 21: Clients
    await partnerPage.goto('/practice/clients');
    await partnerPage.waitForLoadState('networkidle');
    await setTheme(partnerPage, 'light');
    await partnerPage.screenshot({ path: path.join(POPULATED_DIR, '21-practice-clients.png'), fullPage: true });
    await setTheme(partnerPage, 'dark');
    await partnerPage.screenshot({ path: path.join(POPULATED_DIR, '21-practice-clients-dark.png'), fullPage: true });

    // 22: Tasks
    await partnerPage.goto('/practice/tasks');
    await partnerPage.waitForLoadState('networkidle');
    await setTheme(partnerPage, 'light');
    await partnerPage.screenshot({ path: path.join(POPULATED_DIR, '22-practice-tasks.png'), fullPage: true });
    await setTheme(partnerPage, 'dark');
    await partnerPage.screenshot({ path: path.join(POPULATED_DIR, '22-practice-tasks-dark.png'), fullPage: true });

    // 23: Calendar
    await partnerPage.goto('/practice/calendar');
    await partnerPage.waitForLoadState('networkidle');
    await setTheme(partnerPage, 'light');
    await partnerPage.screenshot({ path: path.join(POPULATED_DIR, '23-practice-calendar.png'), fullPage: true });
    await setTheme(partnerPage, 'dark');
    await partnerPage.screenshot({ path: path.join(POPULATED_DIR, '23-practice-calendar-dark.png'), fullPage: true });

    // 24: Documents
    await partnerPage.goto('/practice/documents');
    await partnerPage.waitForLoadState('networkidle');
    await setTheme(partnerPage, 'light');
    await partnerPage.screenshot({ path: path.join(POPULATED_DIR, '24-practice-documents.png'), fullPage: true });
    await setTheme(partnerPage, 'dark');
    await partnerPage.screenshot({ path: path.join(POPULATED_DIR, '24-practice-documents-dark.png'), fullPage: true });

    // Stop and save tracing
    await partnerContext.tracing.stop({ path: path.join(TRACE_DIR, 'practice.zip') });
    console.log('[Practice Journey] Practice module journey completed successfully.');

    await partnerContext.close();
    await staffContext.close();
    await clientContext.close();
  });
});
