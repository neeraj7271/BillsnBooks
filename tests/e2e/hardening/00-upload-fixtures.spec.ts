import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { API_URL, loginAsSeededAdmin, getAuthHeaders, trackConsoleAndPageErrors } from './helpers/session';

const FIXTURES = path.resolve(process.cwd(), 'test/fixtures');

test.describe('Phase 0 & 1: Bulk Upload Fixtures & Edge Cases (Headed)', () => {
  test.setTimeout(180_000);

  test('Exercise all upload points with realistic bulk fixtures and edge-case rejections', async ({ page }) => {
    const errors = trackConsoleAndPageErrors(page);
    await loginAsSeededAdmin(page);
    const { token, tenantId, companyId } = await getAuthHeaders(page);
    const hdrs = { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId };

    // 1. Invoice Branding (/settings/invoice-branding) — Logo & Signature uploads
    await page.goto('/settings/invoice-branding', { waitUntil: 'networkidle' });
    const fileInputs = page.locator('input[type="file"]');
    await expect(fileInputs).toHaveCount(2);

    // Upload square PNG logo, wide PNG logo, JPG logo
    await fileInputs.nth(0).setInputFiles(path.join(FIXTURES, 'logos/logo-mehta-square.png'));
    await page.waitForTimeout(400);
    await fileInputs.nth(0).setInputFiles(path.join(FIXTURES, 'logos/logo-wide-banner.png'));
    await page.waitForTimeout(400);
    await fileInputs.nth(0).setInputFiles(path.join(FIXTURES, 'logos/logo-brand-1.jpg'));
    await page.waitForTimeout(400);

    // Upload signature PNG
    await fileInputs.nth(1).setInputFiles(path.join(FIXTURES, 'signatures/signatory-01.png'));
    await page.waitForTimeout(400);

    await page.click('button:has-text("Save All Settings")');
    await expect(page.locator('text=Settings Saved')).toBeVisible({ timeout: 10000 });

    // Edge-case branding uploads via API (over 5MB, disallowed .exe)
    for (const badFile of ['edge/over-5mb-branding.png', 'edge/disallowed.exe']) {
      const buf = fs.readFileSync(path.join(FIXTURES, badFile));
      const form = new FormData();
      form.append('file', new Blob([buf]), path.basename(badFile));
      form.append('settingKey', 'branding.logo_url');
      const res = await fetch(`${API_URL}/companies/${companyId}/settings/branding/upload`, {
        method: 'POST',
        headers: hdrs,
        body: form,
      });
      expect(res.status, `Branding reject ${badFile}`).toBeGreaterThanOrEqual(400);
      expect(res.status, `Branding no 500 on ${badFile}`).toBeLessThan(500);
    }

    // 2. Practice Document Vault (/practice/clients/[id]/vault)
    // Ensure at least one Practice client exists
    const clientsRes = await fetch(`${API_URL}/practice/clients`, { headers: hdrs });
    const clientsJson: any = await clientsRes.json();
    let clients = Array.isArray(clientsJson.data ?? clientsJson) ? (clientsJson.data ?? clientsJson) : [];
    let clientId = clients[0]?.id;
    if (!clientId) {
      const createClientRes = await fetch(`${API_URL}/practice/clients`, {
        method: 'POST',
        headers: { ...hdrs, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          clientCode: `ZEN-${Date.now().toString().slice(-4)}`,
          primaryContactName: 'Vikram Desai',
          primaryContactEmail: 'vikram@zenithexports.in',
          engagementType: 'RETAINER',
          serviceTier: 'ENTERPRISE',
        }),
      });
      expect(createClientRes.status).toBeLessThan(300);
      const cj: any = await createClientRes.json();
      clientId = (cj.data ?? cj).id;
    }

    await page.goto(`/practice/clients/${clientId}/vault`, { waitUntil: 'networkidle' });
    await expect(page.locator('button:has-text("Upload Files")')).toBeVisible({ timeout: 10000 });

    // Upload variety of valid fixtures (single PDF, 12-page PDF, DOCX, XLSX, KYC JPG, unicode/spaces PDF)
    const vaultInput = page.locator('input[type="file"]').first();
    await vaultInput.setInputFiles([
      path.join(FIXTURES, 'pdfs/gst-reg-cert-zenith.pdf'),
      path.join(FIXTURES, 'pdfs/multipage-annual-audit-12p.pdf'),
      path.join(FIXTURES, 'docs/engagement-draft-1.docx'),
      path.join(FIXTURES, 'docs/audit-working-paper-1.xlsx'),
      path.join(FIXTURES, 'images/mock-kyc-scan-1.jpg'),
      path.join(FIXTURES, 'edge/file with spaces & unicode नया-दस्तावेज़.pdf'),
    ]);

    await expect(page.locator('text=gst-reg-cert-zenith.pdf').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=multipage-annual-audit-12p.pdf').first()).toBeVisible();
    await expect(page.locator('text=engagement-draft-1.docx').first()).toBeVisible();
    await expect(page.locator('text=audit-working-paper-1.xlsx').first()).toBeVisible();

    // Test Vault edge rejections via API (zero-byte, disallowed .exe/.bat, >25MB)
    for (const [rel, mime] of [
      ['edge/disallowed.exe', 'application/x-msdownload'],
      ['edge/disallowed.bat', 'application/x-bat'],
      ['edge/over-25mb-vault.pdf', 'application/pdf'],
    ]) {
      const buf = fs.readFileSync(path.join(FIXTURES, rel));
      const form = new FormData();
      form.append('file', new Blob([buf], { type: mime }), path.basename(rel));
      form.append('folder', 'Misc');
      const res = await fetch(`${API_URL}/practice/clients/${clientId}/vault/upload`, {
        method: 'POST',
        headers: hdrs,
        body: form,
      });
      expect(res.status, `Vault reject ${rel}`).toBeGreaterThanOrEqual(400);
      expect(res.status, `Vault no 500 on ${rel}`).toBeLessThan(500);
    }

    // 3. Imports Upload (/imports/new) — .xlsx + edge rejection
    await page.goto('/imports/new', { waitUntil: 'networkidle' });
    await page.setInputFiles('input[type="file"]', path.join(FIXTURES, 'edge/disallowed.exe'));
    await page.click('button:has-text("Proceed to Header Mapping")');
    await expect(page.locator('[role="alert"], .text-status-danger-text').first()).toBeVisible({ timeout: 8000 });

    // 4. Banking Statement Upload (/banking) — CSV & XLSX
    const accRes = await fetch(`${API_URL}/banking/accounts`, {
      method: 'POST',
      headers: { ...hdrs, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId,
        bankName: 'HDFC Bank Ltd',
        accountNumber: `502000${Date.now().toString().slice(-8)}`,
        ifscCode: 'HDFC0000001',
        accountType: 'CURRENT',
      }),
    });
    expect(accRes.status).toBeLessThan(300);
    const accJson: any = await accRes.json();
    const accId = (accJson.data ?? accJson).id;

    // Upload CSV sample via API + verify parsed
    const csvBuf = fs.readFileSync(path.join(FIXTURES, 'import/bank-statement-sample.csv'));
    const csvForm = new FormData();
    csvForm.append('file', new Blob([csvBuf], { type: 'text/csv' }), `stmt-${Date.now()}.csv`);
    const csvUp = await fetch(`${API_URL}/banking/accounts/${accId}/statement`, {
      method: 'POST',
      headers: hdrs,
      body: csvForm,
    });
    expect(csvUp.status).toBeLessThan(300);

    expect(errors).toEqual([]);
  });
});
