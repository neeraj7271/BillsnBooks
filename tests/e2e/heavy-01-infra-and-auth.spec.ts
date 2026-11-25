import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { attachConsoleAndNetworkGuards, makeValidPan, makeValidGstin } from './helpers/heavy-utils';

const RUN_ID = Date.now();
const PASS = 'HeavyQaPass@2026!';

test.describe('Heavy E2E Section 1 & 2: Infra Health, Real Signups, Lockout, Refresh, Roles & Cross-Tenant Isolation', () => {
  test('S1-01: Verify /v1/health via headless Playwright browser', async ({ page }) => {
    const guards = attachConsoleAndNetworkGuards(page);
    await page.goto('http://localhost:4000/v1/health');
    const bodyText = await page.textContent('body');
    const json = JSON.parse(bodyText || '{}');
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('HEALTHY');
    expect(json.data.database).toBe('UP');
    guards.assertClean();
  });

  test('S2-01: UI Signup validation, 3 real tenant signups (no SUPER_ADMIN), logout, login & token refresh', async ({
    page,
  }) => {
    // Allow deliberate 401 when we inject an expired token to test auto-refresh
    const guards = attachConsoleAndNetworkGuards(page, { allowStatus: [401] });

    // 1. Validation check on /auth/signup
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    // Short password -> expect visible validation error
    await page.locator('input[placeholder="e.g. Rajesh"]').fill('Aarav');
    await page.locator('input[placeholder="e.g. Kothari"]').fill('Mehta');
    await page.locator('input[type="email"]').fill(`aarav.${RUN_ID}@heavyqa.test`);
    await page.locator('input[type="password"]').fill('short');
    await page.getByRole('button', { name: /Create My Account/i }).click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();

    // 2. Register 3 real tenants via UI
    const registeredTenants: { email: string; tenantId: string; userId: string }[] = [];

    for (let i = 1; i <= 3; i++) {
      await page.goto('/auth/signup');
      await page.waitForLoadState('networkidle');
      const email = `partner${i}.${RUN_ID}@heavyqa.test`;
      await page.locator('input[placeholder="e.g. Rajesh"]').fill(`Partner${i}`);
      await page.locator('input[placeholder="e.g. Kothari"]').fill(`Tenant${i}`);
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(PASS);
      await page.locator('input[type="password"]').press('Enter');

      await page.waitForURL(/\/settings\/companies/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      const session = await page.evaluate(() => ({
        tenantId: localStorage.getItem('antigravity_tenant_id') || '',
        userId: localStorage.getItem('antigravity_user_id') || '',
        token: localStorage.getItem('antigravity_access_token') || '',
      }));

      expect(session.tenantId).toBeTruthy();
      expect(session.token).toBeTruthy();

      // Verify JWT role is FIRM_PARTNER and NOT SUPER_ADMIN
      const payload = JSON.parse(
        Buffer.from(session.token.split('.')[1]!, 'base64url').toString('utf8'),
      );
      expect(payload.role).toBe('FIRM_PARTNER');
      expect(payload.role).not.toBe('SUPER_ADMIN');

      registeredTenants.push({ email, tenantId: session.tenantId, userId: session.userId });

      // Logout via top header
      const profileBtn = page.locator('header button').filter({ hasText: `Partner${i}` }).first();
      await profileBtn.click();
      await page.getByRole('button', { name: /Sign Out & Clear Session/i }).click();
      await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
    }

    // 3. Log back in as Tenant 1 & test automatic access-token refresh
    await page.locator('input[type="email"]').fill(registeredTenants[0]!.email);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL(/\/settings\/companies/, { timeout: 15000 });

    // Simulate expired access token in localStorage and trigger an API call via UI Refresh
    await page.evaluate(() => {
      // Craft an expired JWT-shaped token (valid base64, expired signature)
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const body = btoa(JSON.stringify({ sub: 'expired', exp: 1000 }));
      localStorage.setItem('antigravity_access_token', `${header}.${body}.invalidsig`);
    });

    const refreshPromise = page.waitForResponse(
      (res) => res.url().includes('/v1/auth/refresh') && res.status() >= 200 && res.status() < 300,
    );
    await page.getByRole('button', { name: /^Refresh$/i }).click();
    const refreshRes = await refreshPromise;
    expect(refreshRes.ok()).toBe(true);

    guards.assertClean();
  });

  test('S2-02: Login brute-force lockout after 5 wrong passwords', async ({ page }) => {
    const guards = attachConsoleAndNetworkGuards(page, { allowStatus: [401, 429] });
    const email = `lockout.${RUN_ID}@heavyqa.test`;

    // Signup first
    await page.goto('/auth/signup');
    await page.locator('input[placeholder="e.g. Rajesh"]').fill('Lock');
    await page.locator('input[placeholder="e.g. Kothari"]').fill('Test');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(PASS);
    await page.locator('input[type="password"]').press('Enter');
    await page.waitForURL(/\/settings\/companies/, { timeout: 15000 });

    // Logout
    await page.locator('header button').filter({ hasText: 'Lock' }).first().click();
    await page.getByRole('button', { name: /Sign Out & Clear Session/i }).click();
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 });

    // 5 wrong attempts
    for (let attempt = 1; attempt <= 5; attempt++) {
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill('WrongPassword999!');
      await page.getByRole('button', { name: /^Sign In$/i }).click();
      await page.waitForTimeout(250);
    }

    // 6th attempt must show 429 lockout message
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await expect(page.getByText(/Too many failed login attempts/i)).toBeVisible();

    guards.assertClean();
  });

  test('S2-03: Role-based access (CLIENT_VIEWER) & Cross-tenant UI/API isolation', async ({
    browser,
  }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const guardsA = attachConsoleAndNetworkGuards(pageA);
    const guardsB = attachConsoleAndNetworkGuards(pageB, { allowStatus: [403, 404] });

    const emailA = `tenantA.${RUN_ID}@heavyqa.test`;
    const emailB = `tenantB.${RUN_ID}@heavyqa.test`;

    // Signup Tenant A & create a company through UI
    await pageA.goto('/auth/signup');
    await pageA.locator('input[placeholder="e.g. Rajesh"]').fill('TenantA');
    await pageA.locator('input[placeholder="e.g. Kothari"]').fill('Owner');
    await pageA.locator('input[type="email"]').fill(emailA);
    await pageA.locator('input[type="password"]').fill(PASS);
    await pageA.locator('input[type="password"]').press('Enter');
    await pageA.waitForURL(/\/settings\/companies/, { timeout: 15000 });

    const panA = makeValidPan(101);
    const gstinA = makeValidGstin('27', panA);
    await pageA.getByRole('button', { name: /Register Company/i }).click();
    await pageA.locator('#comp-legal-name').fill('Tenant A Alpha Pvt Ltd');
    await pageA.locator('#comp-pan').fill(panA);
    await pageA.locator('#comp-gstin').fill(gstinA);
    await pageA.locator('[role="dialog"]').getByRole('button', { name: /Register Company/i }).click();
    await expect(pageA.getByText('Tenant A Alpha Pvt Ltd').first()).toBeVisible({ timeout: 10000 });

    const sessionA = await pageA.evaluate(() => ({
      tenantId: localStorage.getItem('antigravity_tenant_id') || '',
      companyId: localStorage.getItem('antigravity_active_company_id') || '',
    }));

    // Signup Tenant B & downgrade Tenant B user to CLIENT_VIEWER via documented SQL backdoor
    await pageB.goto('/auth/signup');
    await pageB.locator('input[placeholder="e.g. Rajesh"]').fill('TenantB');
    await pageB.locator('input[placeholder="e.g. Kothari"]').fill('Viewer');
    await pageB.locator('input[type="email"]').fill(emailB);
    await pageB.locator('input[type="password"]').fill(PASS);
    await pageB.locator('input[type="password"]').press('Enter');
    await pageB.waitForURL(/\/settings\/companies/, { timeout: 15000 });

    // Cross-tenant check 1: Tenant B must NOT see Tenant A's company
    await expect(pageB.getByText('Tenant A Alpha Pvt Ltd')).toHaveCount(0);

    // Cross-tenant check 2: Tenant B sending x-tenant-id: <A_tenant> must get 403
    const spoofStatus = await pageB.evaluate(async (targetTenantId) => {
      const token = localStorage.getItem('antigravity_access_token');
      const res = await fetch('http://localhost:4000/v1/companies', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': targetTenantId,
        },
      });
      return res.status;
    }, sessionA.tenantId);
    expect(spoofStatus).toBe(403);

    // Documented SQL backdoor: update Tenant B user role to CLIENT_VIEWER, re-login via UI
    execSync(
      `psql -U neeraj -d accounting_platform -c "SET row_security = off; UPDATE users SET role = 'CLIENT_VIEWER' WHERE email = lower('${emailB}');"`,
    );
    await pageB.locator('header button').filter({ hasText: 'TenantB' }).first().click();
    await pageB.getByRole('button', { name: /Sign Out & Clear Session/i }).click();
    await pageB.waitForURL(/\/auth\/login/);
    await pageB.locator('input[type="email"]').fill(emailB);
    await pageB.locator('input[type="password"]').fill(PASS);
    await pageB.getByRole('button', { name: /^Sign In$/i }).click();
    await pageB.waitForURL(/\/settings\/companies/, { timeout: 15000 });

    const tokenB = await pageB.evaluate(() => localStorage.getItem('antigravity_access_token') || '');
    const payloadB = JSON.parse(Buffer.from(tokenB.split('.')[1]!, 'base64url').toString('utf8'));
    expect(payloadB.role).toBe('CLIENT_VIEWER');

    // Attempt to mutate company as CLIENT_VIEWER -> must be rejected (403)
    const mutateStatus = await pageB.evaluate(async () => {
      const token = localStorage.getItem('antigravity_access_token');
      const res = await fetch('http://localhost:4000/v1/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ legalName: 'Unauthorized Corp', pan: 'AABCA1234F', defaultCurrency: 'INR' }),
      });
      return res.status;
    });
    expect(mutateStatus).toBe(403);

    guardsA.assertClean();
    guardsB.assertClean();
    await ctxA.close();
    await ctxB.close();
  });
});
