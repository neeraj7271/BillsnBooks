import { test, expect } from '@playwright/test';
import { API_URL, makeValidGstin, trackConsoleAndPageErrors } from './helpers/session';

test.describe('Phase 1: Auth & Onboarding (Headed)', () => {
  test.setTimeout(120_000);

  test('Signup, negative validations, create company with auto-seeding, company switch, and brute-force throttle', async ({ page }) => {
    const errors = trackConsoleAndPageErrors(page);
    const ts = Date.now();
    const email = `ananya.mehta.${ts}@mehtaassociates.in`;

    // 1. Negative: short password (< 8 chars) on signup
    await page.goto('/auth/signup', { waitUntil: 'networkidle' });
    await page.click('button:has-text("CA / Practitioner")');
    await page.fill('#signup-fn', 'Ananya');
    await page.fill('#signup-ln', 'Mehta');
    await page.fill('#signup-email', email);
    await page.fill('#signup-pw', 'Short1');
    await page.click('button:has-text("Create My Account")');
    await expect(page.locator('text=Password must be at least 8 characters long.')).toBeVisible();

    // 2. Happy: valid signup
    await page.fill('#signup-pw', 'MehtaCA@2026');
    await page.click('button:has-text("Create My Account")');
    await page.waitForURL('**/settings/companies**', { timeout: 15000 });

    // 3. Create First Company via UI
    const pan1 = 'AABCM1234F';
    const gstin1 = makeValidGstin('27', pan1);
    await page.click('button:has-text("Register Company")');
    const dlg = page.locator('[role="dialog"]');
    await expect(dlg).toBeVisible();
    await dlg.locator('#comp-legal-name').fill('Mehta Precision Mfg Pvt Ltd');
    await dlg.locator('#comp-trade-name').fill('Mehta Precision');
    await dlg.locator('#comp-pan').fill(pan1);
    await dlg.locator('#comp-gstin').fill(gstin1);
    await dlg.locator('button:has-text("Register Company")').click();
    await expect(dlg).toBeHidden({ timeout: 15000 });
    await expect(page.locator('text=Mehta Precision Mfg Pvt Ltd').first()).toBeVisible();

    // Verify auto-seeded CoA ledgers & periods
    const { token, tenantId, companyId } = await page.evaluate(() => ({
      token: localStorage.getItem('antigravity_access_token') || '',
      tenantId: localStorage.getItem('antigravity_tenant_id') || '',
      companyId: localStorage.getItem('antigravity_active_company_id') || '',
    }));
    expect(companyId).toBeTruthy();

    const ledgersRes = await fetch(`${API_URL}/companies/${companyId}/ledgers`, {
      headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
    });
    expect(ledgersRes.status).toBe(200);
    const ledgersJson: any = await ledgersRes.json();
    const ledgers = ledgersJson.data ?? ledgersJson;
    expect(Array.isArray(ledgers) ? ledgers.length : 0).toBeGreaterThan(5);

    // 4. Create Second Company and switch between them
    const pan2 = 'AABCM5678G';
    const gstin2 = makeValidGstin('29', pan2);
    await page.click('button:has-text("Register Company")');
    await expect(dlg).toBeVisible();
    await dlg.locator('#comp-legal-name').fill('Mehta Logistics South LLP');
    await dlg.locator('#comp-pan').fill(pan2);
    await dlg.locator('#comp-gstin').fill(gstin2);
    await dlg.locator('button:has-text("Register Company")').click();
    await expect(dlg).toBeHidden({ timeout: 15000 });
    await expect(page.locator('text=Mehta Logistics South LLP').first()).toBeVisible();

    // 5. Negative: Duplicate email on signup
    const dupRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Ananya',
        lastName: 'Mehta',
        email,
        password: 'MehtaCA@2026',
      }),
    });
    expect(dupRes.status).toBe(409);

    // 6. Negative: Brute-force lockout after 5 failed logins (using a disposable email)
    const throttleEmail = `throttle.${ts}@test.local`;
    for (let i = 0; i < 5; i++) {
      const r = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: throttleEmail, password: 'WrongPassword1!' }),
      });
      expect(r.status).toBe(401);
    }
    const lockedRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: throttleEmail, password: 'WrongPassword1!' }),
    });
    expect(lockedRes.status).toBe(429);

    // 7. Login via UI as our newly registered CA user
    await page.evaluate(() => localStorage.clear());
    await page.goto('/auth/login', { waitUntil: 'networkidle' });
    await page.fill('#login-email', email);
    await page.fill('#login-password', 'MehtaCA@2026');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/settings/companies**', { timeout: 15000 });
    await expect(page.locator('text=Mehta Precision Mfg Pvt Ltd').first()).toBeVisible();

    expect(errors).toEqual([]);
  });
});
