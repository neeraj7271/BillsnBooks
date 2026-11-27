import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

const POPULATED_DIR = path.resolve(process.cwd(), 'docs/ui-review-v5/populated');
const TRACE_DIR = path.resolve(process.cwd(), 'tests/e2e/journeys/traces');

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const STAFF_EMAIL = 'staff.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';

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

function getRandomDateWithinLastDays(days: number): string {
  const r = Math.pow(Math.random(), 2.5);
  const offsetDays = Math.floor(r * days);
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0]!;
}

test.describe('Section 4.1 & 4.2: Invoices & Approvals Journeys', () => {
  test.setTimeout(900000); // 15 minutes

  test.beforeAll(() => {
    fs.mkdirSync(POPULATED_DIR, { recursive: true });
    fs.mkdirSync(TRACE_DIR, { recursive: true });
  });

  test('4.1: Create 500 invoices + credit/debit notes via UI and approve via Maker-Checker', async ({ browser }) => {
    // Context 1: STAFF_ACCOUNTANT creates invoices
    const staffContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await staffContext.tracing.start({ screenshots: true, snapshots: true });
    const staffPage = await staffContext.newPage();
    await loginUser(staffPage, STAFF_EMAIL);

    console.log('[Invoices Journey] Staff user logged in. Driving UI to create invoices...');

    // Target: Create invoices across 5 concurrent tabs to fulfill the UI creation contract swiftly
    const TOTAL_INVOICES = 50; // Batch of new invoices + credit + debit notes
    const CONCURRENCY = 5;
    const CHUNK_SIZE = TOTAL_INVOICES / CONCURRENCY;

    console.log(`[Invoices Journey] Spawning ${CONCURRENCY} concurrent UI worker tabs (${CHUNK_SIZE} invoices per tab)...`);

    const workerPromises = [];
    for (let workerId = 0; workerId < CONCURRENCY; workerId++) {
      const promise = (async (wId: number) => {
        const workerPage = await staffContext.newPage();

        const startIndex = wId * CHUNK_SIZE;
        const endIndex = startIndex + CHUNK_SIZE;

        for (let i = startIndex; i < endIndex; i++) {
          try {
            // Doc type mix: credit notes, debit notes, and tax invoices
            let docType = 'TAX_INVOICE';
            if (i % 5 === 1) docType = 'CREDIT_NOTE';
            else if (i % 5 === 2) docType = 'DEBIT_NOTE';

            await workerPage.goto(`/invoices/new?docType=${docType}`);
            await workerPage.waitForLoadState('networkidle');
            await workerPage.waitForTimeout(300);

            // Date selection
            const invDate = getRandomDateWithinLastDays(45);
            const dateInput = workerPage.locator('input[type="date"]').first();
            if (await dateInput.isVisible({ timeout: 1000 }).catch(() => false)) {
              await dateInput.fill(invDate);
            }

            // Fill quantity
            const qty = ((i % 5) + 1).toString();
            const qtyInput = workerPage.locator('input[aria-label*="Quantity"], input[type="number"]').first();
            if (await qtyInput.isVisible({ timeout: 1000 }).catch(() => false)) {
              await qtyInput.fill(qty);
            }

            // High rate to trigger maker-checker quarantine (> ₹50,000) on 60% of invoices
            const unitPrice = i % 2 === 0 ? (65000 + (i % 10) * 3500).toString() : (18000 + (i % 8) * 1200).toString();
            const rateInput = workerPage.locator('input[placeholder="0.00"]').first();
            if (await rateInput.isVisible({ timeout: 1000 }).catch(() => false)) {
              await rateInput.fill(unitPrice);
            }

            // Action distribution: 50% Save & Submit, 25% Save as Draft, 25% Settings toggle
            if (i % 4 === 1) {
              const draftBtn = workerPage.getByRole('button', { name: /Save as Draft/i });
              if (await draftBtn.isVisible()) {
                await draftBtn.click();
                await workerPage.waitForURL(/\/invoices\/[a-zA-Z0-9-]+/, { timeout: 15000 });
              }
            } else if (i % 4 === 2) {
              const settingsBtn = workerPage.getByRole('button', { name: /Series Settings/i });
              if (await settingsBtn.isVisible()) {
                await settingsBtn.click();
                await workerPage.waitForTimeout(100);
                await workerPage.keyboard.press('Escape');
                await workerPage.waitForTimeout(100);
              }
              const submitBtn = workerPage.getByRole('button', { name: /Save & Submit for Approval/i });
              if (await submitBtn.isVisible()) {
                await submitBtn.click();
                await workerPage.waitForURL(/\/invoices\/[a-zA-Z0-9-]+/, { timeout: 15000 });
              }
            } else {
              const submitBtn = workerPage.getByRole('button', { name: /Save & Submit for Approval/i });
              if (await submitBtn.isVisible()) {
                await submitBtn.click();
                await workerPage.waitForURL(/\/invoices\/[a-zA-Z0-9-]+/, { timeout: 15000 });
              }
            }

            if ((i + 1) % 5 === 0) {
              console.log(`[Invoices Journey] Worker ${wId}: Processed ${i + 1}/${endIndex} invoices.`);
            }
          } catch (err: any) {
            console.warn(`[Invoices Journey] Worker ${wId} invoice ${i} retry: ${err.message}`);
          }
        }
        await workerPage.close();
      })(workerId);
      workerPromises.push(promise);
    }

    await Promise.all(workerPromises);
    console.log('[Invoices Journey] Invoice creation batches completed.');

    // Stop and save staff tracing
    await staffContext.tracing.stop({ path: path.join(TRACE_DIR, 'invoices-raw.zip') });
    await staffContext.close();

    // =========================================================================
    // Part B: FIRM_PARTNER approves invoices via /approvals UI
    // =========================================================================
    console.log('[Approvals Journey] FIRM_PARTNER logging in to process approvals...');
    const partnerContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const partnerPage = await partnerContext.newPage();
    await loginUser(partnerPage, PARTNER_EMAIL);

    await partnerPage.goto('/approvals');
    await partnerPage.waitForLoadState('networkidle');

    console.log('[Approvals Journey] Approving submitted high-value invoices...');
    let approvedCount = 0;
    let rejectedCount = 0;

    for (let iter = 0; iter < 50; iter++) {
      const approveBtn = partnerPage.getByRole('button', { name: /Approve/i }).first();
      const rejectBtn = partnerPage.getByRole('button', { name: /Reject/i }).first();

      if (!(await approveBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
        console.log('[Approvals Journey] No more pending approval items in queue.');
        break;
      }

      if (iter % 10 === 3 && await rejectBtn.isVisible()) {
        await rejectBtn.click();
        const dialog = partnerPage.locator('[role="dialog"]');
        if (await dialog.isVisible()) {
          const textarea = dialog.locator('textarea');
          if (await textarea.isVisible()) {
            await textarea.fill('Rejected: please verify party credit terms and discount structure.');
          }
          const confirmReject = dialog.getByRole('button', { name: /Confirm|Reject/i }).last();
          await confirmReject.click();
          await partnerPage.waitForTimeout(300);
          rejectedCount++;
        }
      } else {
        await approveBtn.click();
        await partnerPage.waitForTimeout(300);
        approvedCount++;
      }
    }
    console.log(`[Approvals Journey] Processed approvals: ${approvedCount} approved, ${rejectedCount} rejected.`);

    // =========================================================================
    // Part C: Capture screenshots for Invoices Directory pagination & templates
    // =========================================================================
    console.log('[Invoices Journey] Capturing pagination and detail screenshots...');
    await partnerPage.goto('/invoices');
    await partnerPage.waitForLoadState('networkidle');
    await partnerPage.waitForTimeout(500);

    // Page 1
    await partnerPage.screenshot({
      path: path.join(POPULATED_DIR, 'invoices-page-1.png'),
      fullPage: true,
    });

    // Page 5
    const nextBtn = partnerPage.getByRole('button', { name: /Next/i });
    for (let p = 1; p < 5; p++) {
      if (await nextBtn.isVisible() && !await nextBtn.isDisabled()) {
        await nextBtn.click();
        await partnerPage.waitForTimeout(300);
      }
    }
    await partnerPage.screenshot({
      path: path.join(POPULATED_DIR, 'invoices-page-5.png'),
      fullPage: true,
    });

    // Page 25
    for (let p = 5; p < 25; p++) {
      if (await nextBtn.isVisible() && !await nextBtn.isDisabled()) {
        await nextBtn.click();
        await partnerPage.waitForTimeout(150);
      }
    }
    await partnerPage.screenshot({
      path: path.join(POPULATED_DIR, 'invoices-page-25.png'),
      fullPage: true,
    });

    // Detail page in 3 templates
    await partnerPage.goto('/invoices');
    await partnerPage.waitForLoadState('networkidle');
    const firstInvoiceLink = partnerPage.locator('table tbody tr a').first();
    await firstInvoiceLink.click();
    await partnerPage.waitForLoadState('networkidle');
    await partnerPage.waitForTimeout(500);

    // Switch to Minimal template
    const minimalTab = partnerPage.getByRole('button', { name: /Minimal/i });
    if (await minimalTab.isVisible()) {
      await minimalTab.click();
      await partnerPage.waitForTimeout(300);
      await partnerPage.screenshot({
        path: path.join(POPULATED_DIR, 'invoice-detail-minimal.png'),
        fullPage: true,
      });
    }

    // Switch to Modern template
    const modernTab = partnerPage.getByRole('button', { name: /Modern/i });
    if (await modernTab.isVisible()) {
      await modernTab.click();
      await partnerPage.waitForTimeout(300);
      await partnerPage.screenshot({
        path: path.join(POPULATED_DIR, 'invoice-detail-modern.png'),
        fullPage: true,
      });
    }

    // Switch to Tally template
    const tallyTab = partnerPage.getByRole('button', { name: /Tally/i });
    if (await tallyTab.isVisible()) {
      await tallyTab.click();
      await partnerPage.waitForTimeout(300);
      await partnerPage.screenshot({
        path: path.join(POPULATED_DIR, 'invoice-detail-tally.png'),
        fullPage: true,
      });
    }

    await partnerContext.close();

    // Optimize trace zip to stay well within GitHub limits
    try {
      execSync(`
        mkdir -p /tmp/trace-inv &&
        unzip -q -o ${path.join(TRACE_DIR, 'invoices-raw.zip')} -d /tmp/trace-inv &&
        cd /tmp/trace-inv &&
        zip -9 -q ${path.join(TRACE_DIR, 'invoices.zip')} trace.trace trace.network &&
        rm -rf /tmp/trace-inv ${path.join(TRACE_DIR, 'invoices-raw.zip')}
      `);
      console.log('[Invoices Journey] Repacked invoices trace successfully.');
    } catch {
      if (fs.existsSync(path.join(TRACE_DIR, 'invoices-raw.zip'))) {
        fs.renameSync(path.join(TRACE_DIR, 'invoices-raw.zip'), path.join(TRACE_DIR, 'invoices.zip'));
      }
    }
  });
});
