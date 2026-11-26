import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const SCREENS_DIR = path.resolve(process.cwd(), 'docs/ui-review-v4/screens');

const ROUTES = [
  { name: 'parties', path: '/parties' },
  { name: 'items', path: '/items' },
  { name: 'invoices', path: '/invoices' },
  { name: 'invoices-new', path: '/invoices/new' },
  { name: 'vouchers', path: '/vouchers' },
  { name: 'approvals', path: '/approvals' },
  { name: 'banking', path: '/banking' },
  { name: 'banking-reconcile', path: '/banking/d4c5b9f2-7cf2-41d0-afc2-f27c85d80636/reconcile' },
  { name: 'imports', path: '/imports' },
  { name: 'imports-review', path: '/imports/bce084e8-ea24-443b-b0df-5f30a4a4cb7e/review' },
  { name: 'payment-links', path: '/collections/payment-links' },
  { name: 'recurring', path: '/collections/recurring' },
  { name: 'practice-clients', path: '/practice/clients' },
  { name: 'practice-tasks', path: '/practice/tasks' },
  { name: 'practice-documents', path: '/practice/documents' },
  { name: 'reports-trial-balance', path: '/reports/trial-balance' },
  { name: 'reports-profit-and-loss', path: '/reports/profit-and-loss' },
  { name: 'reports-balance-sheet', path: '/reports/balance-sheet' },
  { name: 'reports-general-ledger', path: '/reports/general-ledger' },
  { name: 'reports-customer-sales', path: '/reports/customer-sales' },
  { name: 'reports-item-sales', path: '/reports/item-sales' },
  { name: 'reports-expenses', path: '/reports/expenses' },
  { name: 'reports-cash-bank-audit', path: '/reports/cash-bank-audit' },
  { name: 'reports-payables', path: '/reports/payables' },
  { name: 'settings-companies', path: '/settings/companies' },
  { name: 'settings-ledgers', path: '/settings/ledgers' },
  { name: 'settings-numbering', path: '/settings/numbering' },
  { name: 'settings-invoice-branding', path: '/settings/invoice-branding' },
  { name: 'settings-notifications', path: '/settings/notifications' },
  { name: 'settings-periods', path: '/settings/periods' },
  { name: 'settings-tally', path: '/settings/tally' },
];

test.describe('Section 4 - App-Wide Input & Number Visibility Audit', () => {
  test.setTimeout(300_000);

  test.beforeAll(() => {
    fs.mkdirSync(SCREENS_DIR, { recursive: true });
  });

  test('Verify input width, no horizontal clipping, and capture light + dark screenshots', async ({ page }) => {
    // 1. Authenticate
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    await page.setViewportSize({ width: 1440, height: 900 });

    for (const r of ROUTES) {
      await page.goto(r.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);

      // Section 4.3: Assert all visible inputs have rendered width >= 48px and no text clipping
      const inputs = await page.locator('input:visible').all();
      for (const input of inputs) {
        const box = await input.boundingBox();
        if (box && box.width > 0) {
          const type = (await input.getAttribute('type')) || 'text';
          if (type !== 'checkbox' && type !== 'radio' && type !== 'hidden') {
            expect(box.width).toBeGreaterThanOrEqual(48);
            const isClipped = await input.evaluate((el: HTMLElement) => {
              if (el instanceof HTMLInputElement) {
                // Ignore zero-width or empty inputs
                if (!el.value) return false;
                return el.scrollWidth > el.clientWidth + 2;
              }
              return false;
            });
            expect(isClipped).toBe(false);
          }
        }
      }

      // Light mode screenshot
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.waitForTimeout(200);
      await page.screenshot({
        path: path.join(SCREENS_DIR, `${r.name}-light.png`),
        fullPage: false,
      });

      // Dark mode screenshot
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForTimeout(200);
      await page.screenshot({
        path: path.join(SCREENS_DIR, `${r.name}-dark.png`),
        fullPage: false,
      });

      // Reset to light mode
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
    }

    console.log(`Successfully verified input visibility and captured light + dark screenshots for ${ROUTES.length} pages!`);
  });
});
