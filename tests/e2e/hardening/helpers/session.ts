import { Page, expect } from '@playwright/test';

export const API_URL = 'http://localhost:4000/v1';

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function makeValidGstin(stateCode: string, pan: string, entity = '1'): string {
  const base14 = `${stateCode}${pan}${entity}Z`.toUpperCase();
  let factor = 1;
  let sum = 0;
  const len = GSTIN_CHARS.length;
  for (let i = 0; i < 14; i++) {
    const cp = GSTIN_CHARS.indexOf(base14[i]!);
    let digit = cp * factor;
    factor = factor === 2 ? 1 : 2;
    digit = Math.floor(digit / len) + (digit % len);
    sum += digit;
  }
  const rem = sum % len;
  const checkIdx = (len - rem) % len;
  return `${base14}${GSTIN_CHARS[checkIdx]}`;
}

export async function loginAsSeededAdmin(page: Page) {
  await page.goto('/auth/login', { waitUntil: 'networkidle' });
  await page.fill('#login-email', 'admin@acme.com');
  await page.fill('#login-password', 'Password@123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });
  const cid = await page.evaluate(() => localStorage.getItem('antigravity_active_company_id'));
  if (!cid) {
    await page.evaluate(() => {
      localStorage.setItem('antigravity_active_company_id', 'c0000000-0000-4000-8000-000000000001');
    });
  }
}

export async function getAuthHeaders(page: Page) {
  return page.evaluate(() => {
    const token = localStorage.getItem('antigravity_access_token') || '';
    const tenantId = localStorage.getItem('antigravity_tenant_id') || 'a0000000-0000-4000-8000-000000000001';
    const companyId = localStorage.getItem('antigravity_active_company_id') || 'c0000000-0000-4000-8000-000000000001';
    return { token, tenantId, companyId };
  });
}

export function trackConsoleAndPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Ignore intentional 400/401/403/404/409 network console noise on negative tests
      if (!txt.includes('Failed to load resource: the server responded with a status of')) {
        errors.push(`console.error: ${txt}`);
      }
    }
  });
  return errors;
}
