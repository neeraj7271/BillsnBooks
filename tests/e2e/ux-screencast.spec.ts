import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';

test.use({
  viewport: { width: 1280, height: 800 },
  video: { mode: 'on', size: { width: 1280, height: 800 } },
});

test.describe('UX Refresh Screencast Walkthrough', () => {

  test('Record walkthrough of refreshed dashboard, invoice create, reports, and docs', async ({ page, context }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });
    await page.evaluate((cid) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);

    for (const r of ['/', '/invoices/new', '/reports/trial-balance', '/settings', '/docs/components']) {
      await page.goto(r);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(600);
    }

    const video = page.video();
    await context.close();
    if (video) {
      const destDir = path.resolve(process.cwd(), 'tests/e2e/screencasts');
      fs.mkdirSync(destDir, { recursive: true });
      await video.saveAs(path.join(destDir, 'ux-refresh-v2-walkthrough.webm'));
    }
  });
});
