import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const POPULATED_DIR = path.resolve(process.cwd(), 'docs/ui-review-v5/populated');
const TRACE_DIR = path.resolve(process.cwd(), 'tests/e2e/journeys/traces');
const FIXTURES_DIR = path.resolve(process.cwd(), 'tests/e2e/journeys/fixtures');

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';

const ITEM_NAMES = [
  'Ergonomic Executive Office Chair',
  'HP LaserJet High-Yield Toner Cartridge',
  'Statutory GST & Corporate Tax Advisory',
  'Dell Latitude 7440 Corporate Laptop',
  'Mechanical Backlit Keyboard Pro',
  'Dell UltraSharp 27 4K Monitor',
  'Enterprise Cloud Software Subscription',
  'Inter-State Freight & Transit Delivery',
  'Heavy-Duty Corrugated Packaging Boxes',
  'Industrial High-Tensile Steel Rod Grade A',
  'Cotton Combed Weaving Yarn 40s',
  'Refined Industrial Sugar Grade M30',
  'POS Thermal Receipt Paper Rolls',
  'Structural Aluminium Extrusion Sections',
  'Flame-Retardant Copper Armoured Cable',
  'Cisco Gigabit 24-Port Managed Switch',
  'Modular L-Shaped Executive Work Desk',
  'Zebra Rugged Barcode Handheld Scanner',
  'ERP Business Process Implementation Advisory',
  'Organic Bio-Chemical Soil Fertilizer'
];

const HSN_CODES = [
  '84713010', '998311', '998313', '94031000', '84439950',
  '72142090', '52051200', '17019990', '48119099', '76042990',
  '85444999', '85176290', '94033000', '84719000', '31052000'
];

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['NOS', 'PCS', 'KGS', 'MTR', 'BOX', 'SET', 'HRS', 'SQF'];

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

test.describe('Items Master Journey (§3.2)', () => {
  test.setTimeout(360000); // 6 minutes

  test.beforeAll(() => {
    fs.mkdirSync(POPULATED_DIR, { recursive: true });
    fs.mkdirSync(TRACE_DIR, { recursive: true });
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  });

  test('3.2: Create 50 items via UI modal + 450 items via Import Wizard', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    await loginUser(page, PARTNER_EMAIL);

    // =========================================================================
    // Part A: 50 Items created via + Add Item dialog one by one
    // =========================================================================
    console.log('[Items Journey] Creating 50 items via UI modal...');
    await page.goto('/items');
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 50; i++) {
      const baseName = ITEM_NAMES[i % ITEM_NAMES.length]!;
      const itemName = `${baseName} V${Math.floor(i / ITEM_NAMES.length) + 1} [#${i + 1}]`;
      const itemCode = `SKU-JOURNEY-${Date.now().toString().slice(-4)}-${i + 1}`;
      const hsn = HSN_CODES[i % HSN_CODES.length]!;
      const rate = 500 + (i * 250);

      const addItemBtn = page.getByRole('button', { name: 'Add Item' });
      await addItemBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // SKU
      await dialog.locator('#item-code').pressSequentially(itemCode, { delay: 10 });
      // Name
      await dialog.locator('#item-name').pressSequentially(itemName, { delay: 10 });
      // HSN
      await dialog.locator('#item-hsn').pressSequentially(hsn, { delay: 10 });
      // Rate
      await dialog.locator('#item-rate').fill(rate.toString());

      // Save
      const saveBtn = dialog.getByRole('button', { name: 'Save Item' });
      await saveBtn.click();

      await expect(dialog).toBeHidden({ timeout: 10000 });
      await page.waitForTimeout(50);

      if ((i + 1) % 25 === 0) {
        console.log(`[Items Journey] Created ${i + 1}/50 items via UI modal.`);
      }
    }

    // =========================================================================
    // Part B: 450 Items via Import Items Wizard
    // =========================================================================
    console.log('[Items Journey] Preparing CSV for 450 items import...');
    const csvRows: string[] = [
      'Item Name,SKU / Code,Item Type,HSN / SAC,Unit (UOM),Unit Price,GST %,Cess %'
    ];

    for (let j = 0; j < 450; j++) {
      const baseName = ITEM_NAMES[j % ITEM_NAMES.length]!;
      const isService = baseName.includes('Advisory') || baseName.includes('Delivery') || baseName.includes('Subscription');
      const itemType = isService ? 'SERVICES' : 'GOODS';
      const name = `${baseName} Model-${j + 1}`;
      const code = `SKU-IMP-450-${Date.now().toString().slice(-4)}-${j + 1}`;
      const hsn = isService ? '998311' : HSN_CODES[j % HSN_CODES.length]!;
      const uom = isService ? 'HRS' : UNITS[j % UNITS.length]!;
      const price = Math.floor(Math.exp(5 + (j % 6))) * 5;
      const gst = GST_RATES[j % GST_RATES.length]!;
      const cess = (gst === 28 && j % 5 === 0) ? 12 : 0;

      csvRows.push(`"${name}","${code}","${itemType}","${hsn}","${uom}","${price}","${gst}","${cess}"`);
    }

    const csvPath = path.join(FIXTURES_DIR, 'items_450.csv');
    fs.writeFileSync(csvPath, csvRows.join('\n'));
    console.log(`[Items Journey] Wrote 450-item CSV to ${csvPath}`);

    // Click "Import" on /items
    await page.goto('/items');
    await page.waitForLoadState('networkidle');

    const importBtn = page.getByRole('button', { name: /^Import$/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    const importModal = page.getByRole('dialog');
    await expect(importModal).toBeVisible();
    await expect(importModal.getByRole('heading', { name: /Import Items & Products Wizard/i })).toBeVisible();

    // Step 1: Upload CSV
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
    await expect(statusBanner).toBeVisible({ timeout: 90000 });
    await expect(statusBanner).toHaveText(/COMPLETED · 0 failed/i);
    console.log('[Items Journey] Import batch status: COMPLETED · 0 failed.');

    // Screenshot the import batch status
    await importModal.screenshot({
      path: path.join(POPULATED_DIR, 'items-import-status.png'),
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
    await page.screenshot({ path: path.join(POPULATED_DIR, 'items-page-1.png'), fullPage: true });

    // Page 5
    const nextBtn = page.getByRole('button', { name: /Next/i });
    for (let p = 1; p < 5; p++) {
      if (await nextBtn.isVisible() && !await nextBtn.isDisabled()) {
        await nextBtn.click();
        await page.waitForTimeout(200);
      }
    }
    await page.screenshot({ path: path.join(POPULATED_DIR, 'items-page-5.png'), fullPage: true });

    // Last Page
    for (let p = 0; p < 15; p++) {
      if (await nextBtn.isVisible() && !await nextBtn.isDisabled()) {
        await nextBtn.click();
        await page.waitForTimeout(100);
      } else {
        break;
      }
    }
    await page.screenshot({ path: path.join(POPULATED_DIR, 'items-page-last.png'), fullPage: true });

    // Stop and save tracing
    await context.tracing.stop({ path: path.join(TRACE_DIR, 'items.zip') });
    console.log('[Items Journey] Items journey completed successfully.');
    await context.close();
  });
});
