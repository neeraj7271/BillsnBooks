import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

const POPULATED_DIR = path.resolve(process.cwd(), 'docs/ui-review-v5/populated');
const TRACE_DIR = path.resolve(process.cwd(), 'tests/e2e/journeys/traces');
const FIXTURES_DIR = path.resolve(process.cwd(), 'tests/e2e/journeys/fixtures');

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';

const BANKS = [
  { name: 'HDFC Bank Corporate', ifsc: 'HDFC0000060', prefix: '5020' },
  { name: 'ICICI Bank Commercial', ifsc: 'ICIC0001234', prefix: '0002' },
  { name: 'State Bank of India Institutional', ifsc: 'SBIN0000300', prefix: '3001' },
  { name: 'Axis Bank Enterprise', ifsc: 'UTIB0000004', prefix: '9180' },
  { name: 'Kotak Mahindra Business', ifsc: 'KKBK0000180', prefix: '7812' },
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

function generateStatementCsv(accountIndex: number, rowCount = 50): string {
  const narrations = [
    'NEFT ACME ENTERPRISES',
    'UPI/P2M/PAYMENT/VENDOR',
    'NACH/AUTOPAY MANDATE',
    'RTGS SETTLEMENT CLEARED',
    'CMS CHQ CLEARING 44921',
    'INT CREDIT Q3',
    'DEBIT CARD POS PURCHASE',
    'SALARY BATCH DISBURSEMENT',
    'GST CHALLAN PAYMENT',
    'ADVANCE TAX REMITTANCE',
  ];

  let csv = 'Date,Description,Reference,Amount,Type\n';
  const now = Date.now();
  for (let i = 0; i < rowCount; i++) {
    const daysAgo = Math.floor(Math.random() * 45);
    const d = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const narration = `${narrations[i % narrations.length]} ACC${accountIndex}_TXN${i + 1}`;
    const ref = `TXN${accountIndex}${i}${now.toString().slice(-4)}`;
    const isCredit = i % 2 === 0;
    const amount = isCredit ? (15000 + (i * 1250) % 95000) : (4500 + (i * 850) % 45000);
    const type = isCredit ? 'CREDIT' : 'DEBIT';
    csv += `${d},${narration},${ref},${amount},${type}\n`;
  }
  return csv;
}

test.describe('Section 4.3 & 4.4: Banking & Statement Reconciliation Journey', () => {
  test.setTimeout(900000); // 15 minutes

  test.beforeAll(() => {
    fs.mkdirSync(POPULATED_DIR, { recursive: true });
    fs.mkdirSync(TRACE_DIR, { recursive: true });
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  });

  test('4.3 & 4.4: Create 100 bank accounts + ingest statement CSVs via UI', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    await loginUser(page, PARTNER_EMAIL);

    console.log('[Banking Journey] Navigating to /banking...');
    await page.goto('/banking');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // =========================================================================
    // Part A: 100 Bank Accounts via + Add Bank Account dialog
    // =========================================================================
    console.log('[Banking Journey] Creating 100 bank accounts across 5 Indian banks...');
    
    // Check how many bank accounts already exist
    const initialCardCount = await page.locator('[data-testid*="bank-card"], .rounded-2xl').count();
    const targetAccounts = 100;

    for (let i = 0; i < targetAccounts; i++) {
      const bank = BANKS[i % BANKS.length]!;
      const accNumber = `${bank.prefix}${Date.now().toString().slice(-6)}${String(i).padStart(4, '0')}`;
      const bankInstName = `${bank.name} - Branch ${String(i + 1).padStart(3, '0')}`;

      const addBtn = page.getByRole('button', { name: /Add Account/i });
      await addBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      await dialog.locator('#bank-inst').fill(bankInstName);
      await dialog.locator('#bank-acc-no').fill(accNumber);
      await dialog.locator('#bank-ifsc').fill(bank.ifsc);

      // Account type alternates CURRENT and SAVINGS
      const accTypeSelect = dialog.locator('select').first();
      if (await accTypeSelect.isVisible()) {
        await accTypeSelect.selectOption(i % 3 === 0 ? 'SAVINGS' : 'CURRENT');
      }

      // Opening balance
      const openBalInput = dialog.locator('#bank-open-bal, input[type="text"]').last();
      if (await openBalInput.isVisible()) {
        await openBalInput.fill((50000 + (i % 20) * 10000).toString());
      }

      const saveBtn = dialog.getByRole('button', { name: /Create Bank Account/i });
      await saveBtn.click();
      await expect(dialog).toBeHidden({ timeout: 10000 });

      if ((i + 1) % 20 === 0) {
        console.log(`[Banking Journey] Created ${i + 1}/100 bank accounts via UI.`);
      }
    }

    console.log('[Banking Journey] Finished creating 100 bank accounts.');
    await page.waitForTimeout(500);

    // =========================================================================
    // Part B: Statement Upload & Reconciliation
    // Ingest statement CSVs for accounts via Import Feed dialog
    // =========================================================================
    console.log('[Banking Journey] Ingesting bank statement CSVs via Import Feed dialog...');
    
    // For key active accounts, generate and upload 50 transactions each
    const sampleAccountsToUpload = 5;
    for (let accIdx = 0; accIdx < sampleAccountsToUpload; accIdx++) {
      const csvContent = generateStatementCsv(accIdx, 50);
      const csvFilePath = path.join(FIXTURES_DIR, `bank-statement-${accIdx + 1}.csv`);
      fs.writeFileSync(csvFilePath, csvContent, 'utf-8');

      const importBtn = page.getByRole('button', { name: /Import Feed/i });
      if (await importBtn.isVisible()) {
        await importBtn.click();
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        const fileInput = dialog.locator('input[type="file"]');
        await fileInput.setInputFiles(csvFilePath);

        const ingestBtn = dialog.getByRole('button', { name: /Parse & Ingest Feed/i });
        await ingestBtn.click();

        await expect(dialog).toBeHidden({ timeout: 15000 });
        await page.waitForTimeout(400);
        console.log(`[Banking Journey] Ingested 50 statement transactions for account ${accIdx + 1}.`);
      }
    }

    // =========================================================================
    // Part C: Reconciliation Workbench (/banking/[id]/reconcile)
    // =========================================================================
    console.log('[Banking Journey] Navigating to reconciliation workbench...');
    const reconcileLink = page.locator('a[href*="/reconcile"]').first();
    if (await reconcileLink.isVisible()) {
      await reconcileLink.click();
      await page.waitForLoadState('networkidle');

      // Check if match candidates exist
      const matchBtn = page.getByRole('button', { name: /Match/i }).first();
      if (await matchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await matchBtn.click();
        await page.waitForTimeout(400);
        console.log('[Banking Journey] Matched first suggested candidate on workbench.');
      }
    }

    // =========================================================================
    // Part D: Capture screenshots for Banking (light and dark)
    // =========================================================================
    console.log('[Banking Journey] Capturing 27-banking-populated.png (light and dark)...');
    await page.goto('/banking');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Light mode
    await page.screenshot({
      path: path.join(POPULATED_DIR, '27-banking-populated.png'),
      fullPage: true,
    });

    // Dark mode
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(POPULATED_DIR, '27-banking-populated-dark.png'),
      fullPage: true,
    });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Stop and save tracing
    await context.tracing.stop({ path: path.join(TRACE_DIR, 'banking-raw.zip') });
    await context.close();

    // Repack trace
    try {
      execSync(`
        mkdir -p /tmp/trace-bank &&
        unzip -q -o ${path.join(TRACE_DIR, 'banking-raw.zip')} -d /tmp/trace-bank &&
        cd /tmp/trace-bank &&
        zip -9 -q ${path.join(TRACE_DIR, 'banking.zip')} trace.trace trace.network &&
        rm -rf /tmp/trace-bank ${path.join(TRACE_DIR, 'banking-raw.zip')}
      `);
      console.log('[Banking Journey] Repacked banking trace successfully.');
    } catch {
      if (fs.existsSync(path.join(TRACE_DIR, 'banking-raw.zip'))) {
        fs.renameSync(path.join(TRACE_DIR, 'banking-raw.zip'), path.join(TRACE_DIR, 'banking.zip'));
      }
    }
  });
});
