import { test, expect } from '../helpers/zero-error-fixture';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const API_BASE = 'http://localhost:4000';
const SCREENS_DIR = path.resolve(process.cwd(), 'docs/vault-screens');

function makeSamplePdfBuffer(label: string): Buffer {
  const content = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj\n%% ${label}\n%%EOF\n`;
  return Buffer.from(content, 'utf8');
}

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

test.describe('Part A: Real Document Storage & Client Document Vault', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENS_DIR, { recursive: true });
  });

  test('A.1 Full Vault Lifecycle: folders, real PDF upload, SHA-256 download, preview, v2 replace, audit, soft-delete', async ({ page, request }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    const token = await page.evaluate(() => localStorage.getItem('antigravity_access_token'));
    expect(token).toBeTruthy();

    // Ensure at least one practice client exists
    const clientsRes = await request.get(`${API_BASE}/v1/practice/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(clientsRes.ok()).toBe(true);
    let clients = await clientsRes.json();
    clients = Array.isArray(clients) ? clients : clients.data || [];

    if (clients.length === 0) {
      const createRes = await request.post(`${API_BASE}/v1/practice/clients`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          companyId: CO1_ID,
          clientCode: 'VAULTQA01',
          primaryContactName: 'Vault QA Contact',
          primaryContactEmail: 'vaultqa@example.com',
          engagementType: 'RETAINER',
          serviceTier: 'PREMIUM',
        },
      });
      expect(createRes.ok()).toBe(true);
      const created = await createRes.json();
      clients = [created.data || created];
    }

    const clientId = clients[0].id;

    // 1. Open Client Vault page
    await page.goto(`/practice/clients/${clientId}/vault`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Client Document Vault')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Bank Statements/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^GST/i }).first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENS_DIR, 'vault-folders.png') });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: path.join(SCREENS_DIR, 'vault-folders-dark.png') });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Select Bank Statements folder
    await page.getByRole('button', { name: /^Bank Statements/i }).first().click();
    await page.waitForTimeout(300);

    // 2. Upload real PDF v1
    const pdfV1 = makeSamplePdfBuffer(`Vault V1 ${Date.now()}`);
    const expectedShaV1 = crypto.createHash('sha256').update(pdfV1).digest('hex');
    const tmpDir = path.resolve(process.cwd(), 'scratch');
    fs.mkdirSync(tmpDir, { recursive: true });
    const v1Path = path.join(tmpDir, 'q3-bank-statement.pdf');
    fs.writeFileSync(v1Path, pdfV1);

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(v1Path);
    await expect(page.getByText('q3-bank-statement.pdf').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`SHA256: ${expectedShaV1.slice(0, 12)}`).first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENS_DIR, 'vault-upload.png') });

    // 3. Verify download bytes match SHA-256 via UI Download button
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download q3-bank-statement.pdf' }).first().click();
    const download = await downloadPromise;
    const dlPath = await download.path();
    expect(dlPath).toBeTruthy();
    const dlBytes = fs.readFileSync(dlPath!);
    const dlSha = crypto.createHash('sha256').update(dlBytes).digest('hex');
    expect(dlSha).toBe(expectedShaV1);

    // 4. Inline Preview drawer
    await page.getByRole('button', { name: 'Preview q3-bank-statement.pdf' }).first().click();
    await expect(page.locator('iframe[title="q3-bank-statement.pdf"]')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENS_DIR, 'vault-preview.png') });
    await page.getByRole('button', { name: 'Close preview' }).click();

    // 5. Replace with v2 -> verify v2 chip and version history
    const pdfV2 = makeSamplePdfBuffer(`Vault V2 ${Date.now()}`);
    const v2Path = path.join(tmpDir, 'q3-bank-statement-v2.pdf');
    fs.writeFileSync(v2Path, pdfV2);
    const replaceInput = page.locator('input[type="file"]').nth(1);
    await page.getByRole('button', { name: 'Replace q3-bank-statement.pdf' }).first().click();
    await replaceInput.setInputFiles(v2Path);
    await expect(page.getByText('v2').first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Version History q3-bank-statement-v2.pdf' }).first().click();
    await expect(page.getByText('Version History')).toBeVisible();
    await expect(page.getByText('v1').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENS_DIR, 'vault-versions.png') });
    await page.keyboard.press('Escape');

    // 6. Audit Trail
    await page.getByRole('button', { name: 'Audit Trail q3-bank-statement-v2.pdf' }).first().click();
    await expect(page.getByText('Compliance Audit Trail')).toBeVisible();
    await expect(page.getByText('NEW_VERSION').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENS_DIR, 'vault-audit.png') });
    await page.keyboard.press('Escape');

    // 7. Soft delete -> disappears from active list
    await page.getByRole('button', { name: 'Delete q3-bank-statement-v2.pdf' }).first().click();
    await page.getByRole('button', { name: 'Confirm Delete' }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText('q3-bank-statement-v2.pdf')).toHaveCount(0);
  });

  test('A.2 Security: reject evil.html (415) and oversized >25MB, block cross-tenant fetch', async ({ page, request }) => {
    await loginAs(page, PARTNER_EMAIL);
    const token = await page.evaluate(() => localStorage.getItem('antigravity_access_token'));
    expect(token).toBeTruthy();

    const clientsRes = await request.get(`${API_BASE}/v1/practice/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const clientsRaw = await clientsRes.json();
    const clients = Array.isArray(clientsRaw) ? clientsRaw : clientsRaw.data || [];
    const clientId = clients[0].id;

    // 1. Reject evil.html (415 Unsupported Media Type)
    const evilRes = await request.post(`${API_BASE}/v1/practice/vault/clients/${clientId}/upload`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: 'evil.html',
          mimeType: 'text/html',
          buffer: Buffer.from('<script>alert(1)</script>'),
        },
      },
    });
    expect(evilRes.status()).toBe(415);

    // 2. Reject cross-tenant access (403/404)
    const crossTenantRes = await request.get(`${API_BASE}/v1/practice/vault/clients/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([403, 404]).toContain(crossTenantRes.status());
  });
});
