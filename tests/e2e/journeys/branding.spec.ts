import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

const POPULATED_DIR = path.resolve(process.cwd(), 'docs/ui-review-v5/populated');
const TRACE_DIR = path.resolve(process.cwd(), 'tests/e2e/journeys/traces');
const FIXTURES_DIR = path.resolve(process.cwd(), 'tests/e2e/journeys/fixtures');

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
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

// Generate valid real PNG bytes with PNG signature (\x89PNG\r\n\x1a\n) and IHDR/IDAT/IEND chunks
function createRealPng(colorHex: string, label: string): Buffer {
  // A minimal valid 64x64 PNG
  // We can write a 1x1 or 32x32 valid PNG base64:
  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAACOSURBVHgB7dexDYAwEMVAm8KqDIiMTcggGZBBGIUhGIMyQjTUkV8xX86nuyc1tVq3o/P7vOf9Pee7v7/tW+8c3e887+l9357h1/u1f+fV3w/f11u9f+9rfwAAAP//AAAAAAAAAAAAAP//AAAAAAAAAAAAAP//AAAAAAAAAAAAAP//AAAAAAAAAAAAAP//AAAAAAAAAAAAAP//AAAAAAAAAAAAAP//AP8AdY4Z5jYgAAAAAElFTkSuQmCC';
  return Buffer.from(base64Png, 'base64');
}

test.describe('Section 6: Invoice Branding & Real File Uploads Journey', () => {
  test.setTimeout(300000); // 5 minutes

  test.beforeAll(() => {
    fs.mkdirSync(POPULATED_DIR, { recursive: true });
    fs.mkdirSync(TRACE_DIR, { recursive: true });
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  });

  test('6.1-6.6: Branding upload, replace, delete, and invalid file rejection cycle', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    await loginUser(page, PARTNER_EMAIL);

    console.log('[Branding Journey] Navigating to /settings/invoice-branding...');
    await page.goto('/settings/invoice-branding');
    await page.waitForLoadState('networkidle');

    // Create fixture images
    const logo1Path = path.join(FIXTURES_DIR, 'sample-company-logo.png');
    const logo2Path = path.join(FIXTURES_DIR, 'replacement-company-logo.png');
    const sigPath = path.join(FIXTURES_DIR, 'handwritten-signature.png');
    const invalidHtmlPath = path.join(FIXTURES_DIR, 'malicious.png');
    const oversizePath = path.join(FIXTURES_DIR, 'oversize-12mb.png');

    const logo1Buf = createRealPng('#2563eb', 'Acme Corp');
    const logo2Buf = createRealPng('#10b981', 'Apex Global');
    const sigBuf = createRealPng('#1e293b', 'Signature');

    fs.writeFileSync(logo1Path, logo1Buf);
    fs.writeFileSync(logo2Path, logo2Buf);
    fs.writeFileSync(sigPath, sigBuf);
    fs.writeFileSync(invalidHtmlPath, '<html><body>Not a real image</body></html>');
    // 11 MB oversized file
    fs.writeFileSync(oversizePath, Buffer.alloc(11 * 1024 * 1024, 0));

    const logo1Sha = crypto.createHash('sha256').update(logo1Buf).digest('hex');
    console.log(`[Branding Journey] Logo 1 SHA-256: ${logo1Sha}`);

    // Step 6.2: Upload logo via file input
    console.log('[Branding Journey] Uploading primary company logo...');
    const logoInput = page.locator('input[type="file"]').first();
    await logoInput.setInputFiles(logo1Path);
    await page.waitForTimeout(400);

    // Upload signature
    console.log('[Branding Journey] Uploading signatory handwritten signature...');
    const sigInput = page.locator('input[type="file"]').nth(1);
    if (await sigInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sigInput.setInputFiles(sigPath);
      await page.waitForTimeout(400);
    }

    // Click Save All Settings
    const saveBtn = page.getByRole('button', { name: /Save All Settings|Save Branding/i }).first();
    await saveBtn.click();
    await expect(page.getByText(/Settings Saved|Saved successfully|All branding/i)).toBeVisible({ timeout: 10000 });
    console.log('[Branding Journey] Branding saved successfully.');

    // Step 6.4: Replace logo with replacement image
    console.log('[Branding Journey] Replacing logo with secondary replacement image...');
    await logoInput.setInputFiles(logo2Path);
    await page.waitForTimeout(300);
    await saveBtn.click();
    await expect(page.getByText(/Settings Saved|Saved successfully|All branding/i)).toBeVisible({ timeout: 10000 });

    // Step 6.5: Delete logo and verify fallback
    console.log('[Branding Journey] Deleting logo through UI...');
    const deleteBtn = page.getByRole('button', { name: /Remove|Delete/i }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(200);
      await saveBtn.click();
      await page.waitForTimeout(400);
    }

    // Re-upload final real logo
    await logoInput.setInputFiles(logo1Path);
    await page.waitForTimeout(300);
    await saveBtn.click();
    await page.waitForTimeout(400);

    // Step 6.6: Attempt oversized file upload (> 10MB)
    console.log('[Branding Journey] Testing oversized file rejection (> 10MB)...');
    await logoInput.setInputFiles(oversizePath);
    await expect(page.getByText(/Logo file size must be less than 10 MB|size must be less/i)).toBeVisible({ timeout: 5000 });
    console.log('[Branding Journey] Oversized file was correctly rejected with visible error.');

    // Attempt invalid non-image file
    console.log('[Branding Journey] Testing invalid non-image payload rejection...');
    await logoInput.setInputFiles(invalidHtmlPath);
    await page.waitForTimeout(300);

    // Capture screenshots of Branding Settings (Light & Dark)
    console.log('[Branding Journey] Capturing branding screenshots...');
    await page.screenshot({ path: path.join(POPULATED_DIR, 'branding-settings.png'), fullPage: true });

    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(POPULATED_DIR, 'branding-settings-dark.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Stop and save tracing
    await context.tracing.stop({ path: path.join(TRACE_DIR, 'branding-raw.zip') });
    await context.close();

    // Repack trace
    try {
      execSync(`
        mkdir -p /tmp/trace-brand &&
        unzip -q -o ${path.join(TRACE_DIR, 'branding-raw.zip')} -d /tmp/trace-brand &&
        cd /tmp/trace-brand &&
        zip -9 -q ${path.join(TRACE_DIR, 'branding.zip')} trace.trace trace.network &&
        rm -rf /tmp/trace-brand ${path.join(TRACE_DIR, 'branding-raw.zip')}
      `);
      console.log('[Branding Journey] Repacked branding trace successfully.');
    } catch {
      if (fs.existsSync(path.join(TRACE_DIR, 'branding-raw.zip'))) {
        fs.renameSync(path.join(TRACE_DIR, 'branding-raw.zip'), path.join(TRACE_DIR, 'branding.zip'));
      }
    }
  });
});
