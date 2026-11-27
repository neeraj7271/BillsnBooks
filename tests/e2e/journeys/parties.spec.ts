import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const POPULATED_DIR = path.resolve(process.cwd(), 'docs/ui-review-v5/populated');
const TRACE_DIR = path.resolve(process.cwd(), 'tests/e2e/journeys/traces');
const FIXTURES_DIR = path.resolve(process.cwd(), 'tests/e2e/journeys/fixtures');

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
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

const SUFFIXES = [
  'Enterprises', 'Trading Co', 'Industries', 'Solutions', 'Logistics',
  'Technologies', 'Corporation', 'Global', 'Ventures', 'Associates'
];

const STATES = [
  '27', '29', '07', '06', '24', '33', '19', '09', '10', '08', '23', '32', '36', '03', '21'
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

test.describe('Parties Master Journey (§3.1)', () => {
  test.setTimeout(300000); // 5 minutes

  test.beforeAll(() => {
    fs.mkdirSync(POPULATED_DIR, { recursive: true });
    fs.mkdirSync(TRACE_DIR, { recursive: true });
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  });

  test('3.1: Create 20 parties via UI modal + 180 parties via Import Wizard', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    await loginUser(page, PARTNER_EMAIL);

    // =========================================================================
    // Part A: 20 Parties created via + New Party dialog character by character
    // =========================================================================
    console.log('[Parties Journey] Creating 20 parties via UI modal...');
    await page.goto('/parties');
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 20; i++) {
      const surname = SURNAMES[i % SURNAMES.length]!;
      const suffix = SUFFIXES[i % SUFFIXES.length]!;
      const pName = `${surname} ${suffix} ${Date.now().toString().slice(-4)}_${i + 1}`;
      const state = STATES[i % STATES.length]!;
      const isVendor = i % 3 === 0;
      const isUnregistered = i % 4 === 0;

      const newPartyBtn = page.getByRole('button', { name: 'New Party' });
      await newPartyBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Classification (Customer or Vendor)
      if (isVendor) {
        const classTrigger = dialog.getByRole('combobox').first();
        await classTrigger.click();
        const vendorOpt = page.getByRole('option', { name: 'Vendor (Creditor)' });
        if (await vendorOpt.isVisible()) {
          await vendorOpt.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }

      // Name
      await dialog.locator('#party-name').pressSequentially(pName, { delay: 10 });

      // GSTIN / PAN / Registration
      if (isUnregistered) {
        const regTrigger = dialog.getByRole('combobox').nth(1);
        await regTrigger.click();
        const unregOpt = page.getByRole('option', { name: /Unregistered/i });
        if (await unregOpt.isVisible()) {
          await unregOpt.click();
        } else {
          await page.keyboard.press('Escape');
        }
      } else {
        const panChars = `AABT${String.fromCharCode(65 + (i % 26))}${2000 + i}${String.fromCharCode(65 + ((i + 2) % 26))}`;
        const first14 = `${state}${panChars}1Z`;
        const chk = computeGstinChecksum(first14);
        const gstin = `${first14}${chk}`;

        const gstinInput = dialog.locator('#party-gstin');
        if (await gstinInput.isVisible()) {
          await gstinInput.pressSequentially(gstin, { delay: 10 });
        }
      }

      // Address fields
      const addrInput = dialog.locator('#party-addr');
      if (await addrInput.isVisible()) {
        await addrInput.pressSequentially(`${100 + i} Commercial Complex, MG Road`, { delay: 10 });
      }
      const cityInput = dialog.locator('#party-city');
      if (await cityInput.isVisible()) {
        await cityInput.pressSequentially('Mumbai', { delay: 10 });
      }

      // Save
      const saveBtn = dialog.getByRole('button', { name: 'Create Counterparty' });
      await saveBtn.click();

      await expect(dialog).toBeHidden({ timeout: 10000 });
      await page.waitForTimeout(100);
    }
    console.log('[Parties Journey] 20 parties successfully created via UI modal.');

    // =========================================================================
    // Part B: 180 Parties via Import Parties Wizard
    // =========================================================================
    console.log('[Parties Journey] Preparing CSV for 180 parties import...');
    const csvRows: string[] = [
      'Party Name,Party Type,GSTIN,PAN,State Code,Credit Limit,Email,Phone'
    ];

    for (let j = 0; j < 180; j++) {
      const first = FIRST_NAMES[j % FIRST_NAMES.length]!;
      const sur = SURNAMES[(j + 3) % SURNAMES.length]!;
      const suffix = SUFFIXES[(j + 2) % SUFFIXES.length]!;
      const name = `${first} & ${sur} ${suffix} ${Date.now().toString().slice(-4)}_${j + 1}`;
      const type = j % 3 === 0 ? 'VENDOR' : 'CUSTOMER';
      const state = STATES[j % STATES.length]!;
      const pan = `AABT${String.fromCharCode(65 + (j % 26))}${3000 + j}${String.fromCharCode(65 + ((j + 4) % 26))}`;
      const first14 = `${state}${pan}1Z`;
      const chk = computeGstinChecksum(first14);
      const gstin = `${first14}${chk}`;
      const creditLimit = Math.floor(Math.exp(9 + (j % 5))) * 10;
      const email = `contact.${j + 1}@${sur.toLowerCase()}corp.in`;
      const phone = `+91 99${10000000 + j}`;

      csvRows.push(`"${name}","${type}","${gstin}","${pan}","${state}","${creditLimit}","${email}","${phone}"`);
    }

    const csvPath = path.join(FIXTURES_DIR, 'parties_180.csv');
    fs.writeFileSync(csvPath, csvRows.join('\n'));
    console.log(`[Parties Journey] Wrote 180-party CSV to ${csvPath}`);

    // Open /parties and click "Import"
    await page.goto('/parties');
    await page.waitForLoadState('networkidle');

    const importBtn = page.getByRole('button', { name: /^Import$/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    const importModal = page.getByRole('dialog');
    await expect(importModal).toBeVisible();
    await expect(importModal.getByRole('heading', { name: /Import Parties Wizard/i })).toBeVisible();

    // Step 1: Upload CSV via file input
    const fileInput = importModal.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Proceed to Mapping
    const proceedBtn = importModal.getByRole('button', { name: /Proceed to Mapping/i });
    await proceedBtn.click();

    // Step 2: Mapping
    await expect(importModal.getByText(/Column Mapping Confirmation/i)).toBeVisible();
    const previewBtn = importModal.getByRole('button', { name: /Preview Rows/i });
    await previewBtn.click();

    // Step 3: Preview
    await expect(importModal.getByText(/Preview/i).first()).toBeVisible();
    const confirmImportBtn = importModal.getByRole('button', { name: /Confirm Import/i });
    await confirmImportBtn.click();

    // Step 4: Verify Status Report COMPLETED · 0 failed
    const statusBanner = importModal.locator('[data-testid="import-status-banner"]');
    await expect(statusBanner).toBeVisible({ timeout: 60000 });
    await expect(statusBanner).toHaveText(/COMPLETED · 0 failed/i);
    console.log('[Parties Journey] Import batch status: COMPLETED · 0 failed.');

    // Screenshot the import batch status
    await importModal.screenshot({
      path: path.join(POPULATED_DIR, 'parties-import-status.png'),
    });

    // Finish & Close
    const finishBtn = importModal.getByRole('button', { name: /Finish & Close/i });
    await finishBtn.click();
    await expect(importModal).toBeHidden({ timeout: 10000 });

    // =========================================================================
    // Part C: Verify pagination screenshots
    // =========================================================================
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Page 1
    await page.screenshot({ path: path.join(POPULATED_DIR, 'parties-page-1.png'), fullPage: true });

    // Page 5
    const nextBtn = page.getByRole('button', { name: /Next/i });
    for (let p = 1; p < 5; p++) {
      if (await nextBtn.isVisible() && !await nextBtn.isDisabled()) {
        await nextBtn.click();
        await page.waitForTimeout(200);
      }
    }
    await page.screenshot({ path: path.join(POPULATED_DIR, 'parties-page-5.png'), fullPage: true });

    // Last Page
    while (await nextBtn.isVisible() && !await nextBtn.isDisabled()) {
      await nextBtn.click();
      await page.waitForTimeout(200);
    }
    await page.screenshot({ path: path.join(POPULATED_DIR, 'parties-page-last.png'), fullPage: true });

    // Stop and save tracing
    await context.tracing.stop({ path: path.join(TRACE_DIR, 'parties.zip') });
    console.log('[Parties Journey] Parties journey completed successfully.');
    await context.close();
  });
});
